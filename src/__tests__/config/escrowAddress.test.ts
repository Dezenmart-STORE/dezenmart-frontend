import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";

// Payments must fail closed: an unknown network must never resolve to an
// empty or zero escrow address that funds could be sent to.

const MAINNET = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const TESTNET = "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";

let chains: typeof import("../../config/chains");

beforeAll(async () => {
  vi.stubEnv("VITE_ESCROW_CONTRACT_MAINNET", MAINNET);
  vi.stubEnv("VITE_ESCROW_CONTRACT_TESTNET", TESTNET);
  // The wallet config refuses to load without one; CI has no .env to supply it.
  vi.stubEnv("VITE_WALLETCONNECT_PROJECT_ID", "test-project-id");
  chains = await import("../../config/chains");
});

afterAll(() => vi.unstubAllEnvs());

describe("getEscrowAddress", () => {
  it("returns the mainnet escrow on Celo", () => {
    expect(chains.getEscrowAddress(chains.CHAIN_IDS.CELO)).toBe(MAINNET);
  });

  it("returns the testnet escrow on Celo Sepolia", () => {
    expect(chains.getEscrowAddress(chains.CHAIN_IDS.CELO_SEPOLIA)).toBe(TESTNET);
  });

  it("throws on any other network instead of returning an address", () => {
    expect(() => chains.getEscrowAddress(1)).toThrow(/No escrow address for chain 1/);
    expect(() => chains.getEscrowAddress(8453)).toThrow();
  });
});
