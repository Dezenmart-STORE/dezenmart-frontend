import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { parseUnits } from "viem";

// ── Mocks ────────────────────────────────────────────────────────────────────
// usePayment talks to the wallet (wagmi), the chain (@wagmi/core), the swap
// router and the escrow contract. Every one of those is replaced here so the
// tests exercise only the payment state machine and its safety checks.

const BUYER = "0x1111111111111111111111111111111111111111" as const;
const SELLER = "0x2222222222222222222222222222222222222222" as const;
const PROVIDER = "0x3333333333333333333333333333333333333333" as const;
const ESCROW = "0x4444444444444444444444444444444444444444" as const;
const CELO_ID = 42220;

const mocks = vi.hoisted(() => ({
  address: undefined as string | undefined,
  readContract: vi.fn(),
  writeContract: vi.fn(),
  waitForTransactionReceipt: vi.fn(),
  getChainId: vi.fn(),
  switchChainAsync: vi.fn(),
  buyTrade: vi.fn(),
  swap: vi.fn(),
  getQuote: vi.fn(),
  refetchBalances: vi.fn(),
}));

vi.mock("wagmi", () => ({
  useAccount: () => ({ address: mocks.address }),
  useSwitchChain: () => ({ switchChainAsync: mocks.switchChainAsync }),
}));

vi.mock("@wagmi/core", () => ({
  readContract: mocks.readContract,
  writeContract: mocks.writeContract,
  waitForTransactionReceipt: mocks.waitForTransactionReceipt,
  getChainId: mocks.getChainId,
}));

vi.mock("../../config/chains", () => ({
  wagmiConfig: {},
  CHAIN_IDS: { CELO: 42220, CELO_SEPOLIA: 11142220 },
  getEscrowAddress: (chainId: number) => {
    if (chainId !== 42220 && chainId !== 11142220) {
      throw new Error(`No escrow address for chain ${chainId}`);
    }
    return "0x4444444444444444444444444444444444444444";
  },
}));

vi.mock("../../hooks/useTokenBalances", () => ({
  useTokenBalances: () => ({ refetch: mocks.refetchBalances }),
}));

vi.mock("../../hooks/useSwap", () => ({
  useSwap: () => ({ swap: mocks.swap, getQuote: mocks.getQuote }),
}));

vi.mock("../../hooks/useEscrow", () => ({
  useEscrow: () => ({ buyTrade: mocks.buyTrade }),
}));

import { usePayment, type PaymentParams } from "../../hooks/usePayment";

// ── Helpers ──────────────────────────────────────────────────────────────────

const baseParams: PaymentParams = {
  tradeId: "7",
  quantity: 1,
  productToken: "USDT",
  totalAmount: 25,
  paymentToken: "USDT",
  logisticsProvider: PROVIDER,
  logisticsCost: "2",
};

interface ChainState {
  balance: bigint;
  allowance: bigint;
  providerRegistered: boolean;
  trade: Record<string, unknown>;
}

function chain(overrides: Partial<ChainState> = {}): ChainState {
  return {
    balance: parseUnits("100", 6),
    allowance: 0n,
    providerRegistered: true,
    trade: {
      seller: SELLER,
      productCost: parseUnits("23", 6),
      escrowFee: 0n,
      totalQuantity: 10n,
      remainingQuantity: 5n,
      active: true,
      purchaseIds: [],
      tokenAddress: ESCROW,
    },
    ...overrides,
  };
}

function wireChain(state: ChainState) {
  mocks.readContract.mockImplementation(
    async (_config: unknown, req: { functionName: string }) => {
      switch (req.functionName) {
        case "balanceOf":
          return state.balance;
        case "allowance":
          return state.allowance;
        case "logisticsProviders":
          return state.providerRegistered;
        case "getTrade":
          return state.trade;
        default:
          throw new Error(`unexpected read ${req.functionName}`);
      }
    }
  );
}

beforeEach(() => {
  vi.resetAllMocks();
  mocks.address = BUYER;
  mocks.getChainId.mockReturnValue(CELO_ID);
  mocks.switchChainAsync.mockResolvedValue(undefined);
  mocks.writeContract.mockResolvedValue("0xapprove");
  mocks.waitForTransactionReceipt.mockResolvedValue({ status: "success" });
  mocks.buyTrade.mockResolvedValue({ success: true, hash: "0xbuy", purchaseId: "99" });
  vi.spyOn(console, "info").mockImplementation(() => {});
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
  wireChain(chain());
});

// The hook pauses between steps (RPC propagation, swap settling). Run those
// pauses on the next tick instead of really waiting seconds per test.
const realSetTimeout = globalThis.setTimeout;
beforeEach(() => {
  vi.spyOn(globalThis, "setTimeout").mockImplementation(((fn: () => void) =>
    realSetTimeout(fn, 0)) as unknown as typeof setTimeout);
});

/** Poll on the real timer (the setTimeout shim above would break waitFor's timeout). */
async function until(check: () => boolean, tries = 100) {
  for (let i = 0; i < tries; i++) {
    if (check()) return;
    await new Promise((r) => realSetTimeout(r, 5));
  }
  throw new Error("condition never became true");
}

async function run(params: PaymentParams = baseParams) {
  const hook = renderHook(() => usePayment());
  await act(async () => {
    await hook.result.current.startPayment(params);
  });
  return hook;
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe("usePayment", () => {
  it("asks the buyer to connect a wallet when none is connected", async () => {
    mocks.address = undefined;
    const { result } = await run();

    expect(result.current.state.step).toBe("error");
    expect(result.current.state.error).toMatch(/connect your wallet/i);
    expect(mocks.buyTrade).not.toHaveBeenCalled();
  });

  it("pays the escrow and approves only the order amount plus 5%", async () => {
    const { result } = await run();

    expect(result.current.state.step).toBe("success");
    expect(result.current.state.txHash).toBe("0xbuy");
    expect(result.current.state.purchaseId).toBe("99");

    // Approval is for the exact amount + 5% buffer, never unlimited.
    expect(mocks.writeContract).toHaveBeenCalledTimes(1);
    const approveReq = mocks.writeContract.mock.calls[0][1];
    expect(approveReq.functionName).toBe("approve");
    const [spender, amount] = approveReq.args;
    expect(spender).toBe(ESCROW);
    expect(amount).toBe((parseUnits("25", 6) * 105n) / 100n);

    // buyTrade gets the trade id, quantity, provider and logistics cost in token units.
    expect(mocks.buyTrade).toHaveBeenCalledTimes(1);
    const [tradeId, qty, provider, logisticsWei] = mocks.buyTrade.mock.calls[0];
    expect(tradeId).toBe(7n);
    expect(qty).toBe(1n);
    expect(provider).toBe(PROVIDER);
    expect(logisticsWei).toBe(parseUnits("2", 6));
  }, 10_000);

  it("skips the approval when the allowance already covers the order", async () => {
    wireChain(chain({ allowance: parseUnits("1000", 6) }));
    const { result } = await run();

    expect(result.current.state.step).toBe("success");
    expect(mocks.writeContract).not.toHaveBeenCalled();
  });

  it("starts only one payment when Pay is clicked twice quickly", async () => {
    // Hold the first payment at the wallet's network-switch prompt, which is
    // where it sits while the Pay button is still on screen.
    let releaseWallet!: () => void;
    mocks.switchChainAsync.mockImplementationOnce(
      () => new Promise<void>((resolve) => { releaseWallet = resolve; })
    );
    const { result } = renderHook(() => usePayment());

    let first!: Promise<void>;
    await act(async () => {
      first = result.current.startPayment(baseParams);
      await until(() => mocks.switchChainAsync.mock.calls.length === 1);
    });

    // Second click lands while the first is still waiting on the wallet.
    await act(async () => {
      await result.current.startPayment(baseParams);
    });

    await act(async () => {
      releaseWallet();
      await first;
    });

    expect(result.current.state.step).toBe("success");
    expect(mocks.switchChainAsync).toHaveBeenCalledTimes(1);
    expect(mocks.buyTrade).toHaveBeenCalledTimes(1);
    expect(mocks.writeContract).toHaveBeenCalledTimes(1);
  }, 10_000);

  it("lets the buyer try again after a payment fails", async () => {
    mocks.buyTrade.mockResolvedValueOnce({ success: false, message: "user rejected" });
    const { result } = renderHook(() => usePayment());

    await act(async () => {
      await result.current.startPayment(baseParams);
    });
    expect(result.current.state.step).toBe("error");

    await act(async () => {
      await result.current.startPayment(baseParams);
    });
    expect(result.current.state.step).toBe("success");
    expect(mocks.buyTrade).toHaveBeenCalledTimes(2);
  }, 10_000);

  it("stops before paying when the balance is too low", async () => {
    wireChain(chain({ balance: parseUnits("10", 6) }));
    const { result } = await run();

    expect(result.current.state.step).toBe("error");
    expect(result.current.state.error).toMatch(/at least 25\.00 USDT/);
    expect(mocks.writeContract).not.toHaveBeenCalled();
    expect(mocks.buyTrade).not.toHaveBeenCalled();
  });

  it("refuses to let a seller buy their own listing", async () => {
    const state = chain();
    state.trade = { ...state.trade, seller: BUYER };
    wireChain(state);
    const { result } = await run();

    expect(result.current.state.error).toMatch(/can't buy your own listing/i);
    expect(mocks.buyTrade).not.toHaveBeenCalled();
  });

  it("stops when the delivery provider is not registered on-chain", async () => {
    wireChain(chain({ providerRegistered: false }));
    const { result } = await run();

    expect(result.current.state.error).toMatch(/delivery provider/i);
    expect(mocks.buyTrade).not.toHaveBeenCalled();
  });

  it("stops when the listing is no longer active", async () => {
    const state = chain();
    state.trade = { ...state.trade, active: false };
    wireChain(state);
    const { result } = await run();

    expect(result.current.state.error).toMatch(/no longer active/i);
    expect(mocks.buyTrade).not.toHaveBeenCalled();
  });

  it("stops when the buyer asks for more items than remain", async () => {
    const { result } = await run({ ...baseParams, quantity: 6 });

    expect(result.current.state.error).toMatch(/Only 5 item\(s\)/);
    expect(mocks.buyTrade).not.toHaveBeenCalled();
  });

  it("rejects a non-numeric trade id before touching the chain", async () => {
    const { result } = await run({ ...baseParams, tradeId: "65fa0c2e9b1d" });

    expect(result.current.state.step).toBe("error");
    expect(mocks.writeContract).not.toHaveBeenCalled();
    expect(mocks.buyTrade).not.toHaveBeenCalled();
  });

  it("treats a submitted-but-unconfirmed purchase as success", async () => {
    mocks.buyTrade.mockResolvedValueOnce({ success: false, pending: true, hash: "0xslow" });
    const { result } = await run();

    expect(result.current.state.step).toBe("success");
    expect(result.current.state.txHash).toBe("0xslow");
  });

  it("errors when the wallet stays on another network", async () => {
    mocks.getChainId.mockReturnValue(1);
    mocks.switchChainAsync.mockRejectedValue(new Error("user rejected"));
    const { result } = await run();

    expect(result.current.state.error).toMatch(/Celo network/i);
    expect(mocks.buyTrade).not.toHaveBeenCalled();
  });

  it("swaps first when paying with a different token, and keeps the swap for a retry", async () => {
    mocks.getQuote.mockResolvedValue({ amountOut: "25" });
    mocks.swap.mockResolvedValue({ success: true, hash: "0xswap" });
    mocks.buyTrade.mockResolvedValueOnce({ success: false, message: "execution reverted" });
    const state = chain({ balance: parseUnits("100", 18) });
    wireChain(state);

    const { result } = await run({ ...baseParams, paymentToken: "USDm" });

    expect(mocks.swap).toHaveBeenCalledTimes(1);
    expect(result.current.state.step).toBe("error");
    expect(result.current.state.swapHash).toBe("0xswap");
    expect(result.current.state.swappedAmount).toBe("25");

    // Retrying skips the swap and goes straight to the escrow.
    await act(async () => {
      await result.current.retryEscrow({ ...baseParams, paymentToken: "USDm" });
    });
    await until(() => result.current.state.step === "success");
    expect(result.current.state.step).toBe("success");
    expect(mocks.swap).toHaveBeenCalledTimes(1);
    expect(mocks.buyTrade).toHaveBeenCalledTimes(2);
  }, 15_000);
});
