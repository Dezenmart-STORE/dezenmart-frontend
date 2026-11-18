/**
 * Shared field styles. Contrast is measured, not guessed: the input edge is
 * FIELD_BORDER (3.4:1 against both surfaces, so a field is visible without a
 * fill difference) and focus is a red-400 ring (3:1+). Two surfaces exist
 * because inputs sit on the page (#212428) or inside a card (#292B30).
 */
export type FieldSurface = "page" | "card";

/** Field edge colour, 3:1 or better against both surfaces. */
const FIELD_BORDER = "border-[#767C87]";

export function inputClass(surface: FieldSurface, hasError: boolean): string {
  const fill = surface === "card" ? "bg-[#3A3C41]" : "bg-[#1a1c20]";
  const edge = hasError ? "border-red-400" : `${FIELD_BORDER} focus:border-red-400`;
  return `w-full ${fill} text-white px-3 py-2.5 rounded-xl border ${edge} text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-400/60 transition-colors disabled:opacity-50 disabled:cursor-not-allowed`;
}

export const optionClass = (surface: FieldSurface) =>
  surface === "card" ? "text-white bg-[#3A3C41]" : "text-white bg-[#1a1c20]";
