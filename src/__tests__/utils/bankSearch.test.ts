import { describe, it, expect } from "vitest";
import { searchBanks } from "../../utils/bankSearch";

// Names as Pandascrow lists them, inconsistencies included, A to Z like the app shows them.
const banks = [
  "ACCESS BANK PLC (DIAMOND)",
  "Access Bank",
  "BUBAYERO MFB",
  "First Bank of Nigeria",
  "First City Monument Bank",
  "GTBank Plc",
  "Kuda Microfinance bank",
  "Moniepoint Microfinance Bank",
  "Opay Digital Services",
  "UBA MONI",
  "United Bank for Africa",
  "Wema/ALAT",
  "Zenith Bank",
  "ZenithMobile",
].map((name, i) => ({ code: String(i), name }));

const names = (query: string) => searchBanks(banks, query).map((b) => b.name);

describe("searchBanks", () => {
  it("shows every bank before anything is typed", () => {
    expect(names("  ")).toHaveLength(banks.length);
  });

  it("ignores case, punctuation and words like Plc", () => {
    expect(names("gtbank")).toEqual(["GTBank Plc"]);
    expect(names("wema")).toEqual(["Wema/ALAT"]);
  });

  it("knows the short names people use", () => {
    expect(names("gtb")[0]).toBe("GTBank Plc");
    expect(names("UBA")[0]).toBe("United Bank for Africa");
    expect(names("fcmb")).toEqual(["First City Monument Bank"]);
  });

  it("puts names that start with what was typed first", () => {
    expect(names("zenith")).toEqual(["Zenith Bank", "ZenithMobile"]);
    expect(names("access")[0]).toBe("ACCESS BANK PLC (DIAMOND)");
  });

  it("needs every typed word to match", () => {
    expect(names("first bank")).toEqual(["First Bank of Nigeria", "First City Monument Bank"]);
    expect(names("kuda")).toEqual(["Kuda Microfinance bank"]);
    expect(names("kuda zenith")).toEqual([]);
  });

  it("finds nothing for a bank that isn't listed", () => {
    expect(names("barclays")).toEqual([]);
  });
});
