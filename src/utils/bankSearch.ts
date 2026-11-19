import type { Bank } from "./validation/bankTransfer";

/**
 * Finding a bank among Pandascrow's ~800 by what people actually type.
 *
 * Names in the list are inconsistent ("GTBank Plc", "United Bank for Africa",
 * "Kuda Microfinance bank"), so matching ignores case, punctuation and filler
 * words, and knows the short names Nigerians use for the big banks.
 */

/** Short names people type, and words that appear in the bank's listed name. */
const ALIASES: Record<string, string> = {
  gtb: "gtbank",
  gtco: "gtbank",
  guaranty: "gtbank",
  uba: "united bank for africa",
  fcmb: "first city monument",
  fbn: "first bank",
  alat: "wema",
  moniepoint: "moniepoint",
  opay: "opay",
};

/** Words that carry no meaning when matching ("Access Bank Plc" ~ "access"). */
const FILLER = new Set(["plc", "ltd", "limited", "nigeria", "of", "the", "and"]);

const words = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter((w) => w && !FILLER.has(w));

/**
 * How well a bank's name answers a query: 0 is no match, higher is better.
 * Every typed word must start one of the name's words (or be inside the name);
 * a name that starts with the query beats one that only contains it.
 */
export function bankMatchScore(name: string, query: string): number {
  const typed = words(query).flatMap((w) => words(ALIASES[w] ?? w));
  if (typed.length === 0) return 1;
  const nameWords = words(name);
  const joined = nameWords.join(" ");
  let score = 0;
  for (const w of typed) {
    if (nameWords.some((n) => n.startsWith(w))) score += 2;
    else if (joined.includes(w)) score += 1;
    else return 0;
  }
  return joined.startsWith(typed.join(" ")) ? score + 3 : score;
}

/** Banks matching the query, best first; ties keep the list's own order (A to Z). */
export function searchBanks(banks: readonly Bank[], query: string): Bank[] {
  if (!query.trim()) return [...banks];
  return banks
    .map((bank, i) => ({ bank, i, score: bankMatchScore(bank.name, query) }))
    .filter((m) => m.score > 0)
    .sort((a, b) => b.score - a.score || a.i - b.i)
    .map((m) => m.bank);
}
