import { useCallback, useReducer } from "react";
import { useAccount, useSwitchChain } from "wagmi";
import { parseUnits } from "viem";
import { useTokenBalances } from "./useTokenBalances";
import { useSwap } from "./useSwap";
import { useEscrow } from "./useEscrow";
import { getToken, getTokenAddress } from "../config/tokens";
import { paymentDebug } from "../utils/debug";
import { getErrorMessage } from "../utils/errors";
import { wagmiConfig, CHAIN_IDS } from "../config/chains";

// ---------------------------------------------------------------------------
// State machine
// ---------------------------------------------------------------------------
export type PaymentStep =
  | "idle"
  | "switching-network"
  | "checking-balance"
  | "insufficient-balance"
  | "swapping"
  | "approving"
  | "executing"
  | "confirming"
  | "success"
  | "error";

interface PaymentState {
  step: PaymentStep;
  /** User-facing message for the current step */
  message: string;
  /** Error details when step === "error" */
  error: string | null;
  /** Transaction hash when step === "success" */
  txHash: string | null;
  /** Extracted purchaseId from event logs */
  purchaseId: string | null;
  /** Swap hash if a conversion happened */
  swapHash: string | null;
}

type Action =
  | { type: "SET_STEP"; step: PaymentStep; message: string }
  | { type: "SUCCESS"; txHash: string; purchaseId?: string; swapHash?: string }
  | { type: "ERROR"; error: string }
  | { type: "RESET" };

const initialState: PaymentState = {
  step: "idle",
  message: "",
  error: null,
  txHash: null,
  purchaseId: null,
  swapHash: null,
};

function reducer(state: PaymentState, action: Action): PaymentState {
  switch (action.type) {
    case "SET_STEP":
      return { ...state, step: action.step, message: action.message, error: null };
    case "SUCCESS":
      return {
        ...state,
        step: "success",
        message: "Payment complete!",
        txHash: action.txHash,
        purchaseId: action.purchaseId ?? null,
        swapHash: action.swapHash ?? null,
        error: null,
      };
    case "ERROR":
      return { ...state, step: "error", error: action.error, message: action.error };
    case "RESET":
      return initialState;
  }
}

// ---------------------------------------------------------------------------
// Payment params
// ---------------------------------------------------------------------------
export interface PaymentParams {
  tradeId: string;
  quantity: number;
  /** Token symbol the product is priced in (from contract) */
  productToken: string;
  /** Human-readable total amount in productToken (product cost + escrow fee) */
  totalAmount: number;
  /** Token symbol the buyer wants to pay with */
  paymentToken: string;
  /** Logistics provider wallet address */
  logisticsProvider: `0x${string}`;
  /** Logistics cost in token units (as bigint-compatible string) */
  logisticsCost: string;
}

const SUPPORTED_CHAIN_IDS = [CHAIN_IDS.CELO, CHAIN_IDS.ALFAJORES] as number[];

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Orchestrates the full payment flow as a state machine:
 *
 *   idle -> switching-network -> checking-balance -> [swapping] -> approving -> executing -> confirming -> success
 *                                                                                                   ↘ error
 *
 * Components simply call `startPayment(params)` and render based on `state.step`.
 */
export function usePayment() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const { address } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const { refetch: refetchBalances, hasSufficient } = useTokenBalances();
  const { swap, getQuote } = useSwap();
  const escrow = useEscrow();

  const reset = useCallback(() => dispatch({ type: "RESET" }), []);

  const startPayment = useCallback(
    async (params: PaymentParams) => {
      paymentDebug.startSession("usePayment");

      if (!address) {
        dispatch({ type: "ERROR", error: "Please connect your wallet first." });
        return;
      }

      try {
        // ── 0. Ensure wallet is on a Celo network ────────────────
        // Read the LIVE chainId from wagmi config (not the React hook closure,
        // which may be a render-cycle behind). This is the ground truth.
        const { getChainId } = await import("@wagmi/core");
        const liveChainId = getChainId(wagmiConfig);

        if (!SUPPORTED_CHAIN_IDS.includes(liveChainId)) {
          dispatch({
            type: "SET_STEP",
            step: "switching-network",
            message: "Switching to Celo network...",
          });

          try {
            await switchChainAsync({ chainId: CHAIN_IDS.CELO });
          } catch {
            dispatch({
              type: "ERROR",
              error: "Please switch your wallet to the Celo network and try again.",
            });
            return;
          }

          // Allow the connector state to propagate
          await new Promise((r) => setTimeout(r, 800));
        }

        // Verify the switch actually happened — some wallets resolve the
        // promise without switching (WalletConnect, certain mobile wallets).
        const activeChainId = getChainId(wagmiConfig);
        if (!SUPPORTED_CHAIN_IDS.includes(activeChainId)) {
          dispatch({
            type: "ERROR",
            error: "Your wallet is still on the wrong network. Please switch to Celo manually and try again.",
          });
          return;
        }

        // ── 1. Check balance ──────────────────────────────────────
        dispatch({
          type: "SET_STEP",
          step: "checking-balance",
          message: "Checking your balance...",
        });

        refetchBalances();
        // Small delay for refetch to complete
        await new Promise((r) => setTimeout(r, 1000));

        const needsSwap = params.paymentToken !== params.productToken;
        const payTokenSymbol = params.paymentToken;
        const payTokenInfo = getToken(payTokenSymbol);

        if (!payTokenInfo) {
          throw new Error(`Token ${payTokenSymbol} not recognized.`);
        }

        const payTokenAddress = getTokenAddress(payTokenSymbol, activeChainId);
        if (!payTokenAddress) {
          throw new Error(`${payTokenSymbol} is not available on this network.`);
        }

        let effectiveAmount = params.totalAmount;
        let swapHash: string | undefined;

        // ── 2. Swap if paying with different token ────────────────
        if (needsSwap) {
          paymentDebug.log("swap:needed", {
            from: payTokenSymbol,
            to: params.productToken,
            amount: params.totalAmount,
          });

          if (!hasSufficient(payTokenSymbol, params.totalAmount)) {
            dispatch({
              type: "ERROR",
              error: `You need at least ${params.totalAmount.toFixed(2)} ${payTokenSymbol} to complete this purchase.`,
            });
            return;
          }

          const quote = await getQuote(
            payTokenSymbol,
            params.productToken,
            params.totalAmount
          );

          if (!quote) {
            dispatch({
              type: "ERROR",
              error: `Can't convert ${payTokenSymbol} to ${params.productToken} right now. Try another token.`,
            });
            return;
          }

          dispatch({
            type: "SET_STEP",
            step: "swapping",
            message: `Converting ${params.totalAmount.toFixed(2)} ${payTokenSymbol} to ~${parseFloat(quote.amountOut).toFixed(2)} ${params.productToken}...`,
          });

          const swapResult = await swap(
            payTokenSymbol,
            params.productToken,
            params.totalAmount
          );

          if (!swapResult.success) {
            dispatch({ type: "ERROR", error: swapResult.error ?? "Swap failed." });
            return;
          }

          swapHash = swapResult.hash;
          effectiveAmount = parseFloat(quote.amountOut);

          // Wait for swap to settle
          await new Promise((r) => setTimeout(r, 3000));
          refetchBalances();
        } else {
          if (!hasSufficient(params.productToken, params.totalAmount)) {
            dispatch({
              type: "ERROR",
              error: `You need at least ${params.totalAmount.toFixed(2)} ${params.productToken}. Check your balance.`,
            });
            return;
          }
        }

        // ── 3. Approve token spending ─────────────────────────────
        dispatch({
          type: "SET_STEP",
          step: "approving",
          message: `Approving ${params.productToken} for payment...`,
        });

        const productTokenInfo = getToken(params.productToken);
        const productTokenAddress = getTokenAddress(params.productToken, activeChainId);

        if (!productTokenInfo || !productTokenAddress) {
          throw new Error(`${params.productToken} configuration missing.`);
        }

        const { readContract, writeContract, waitForTransactionReceipt } =
          await import("@wagmi/core");
        const { erc20Abi } = await import("viem");
        const { getEscrowAddress } = await import("../config/chains");

        const escrowAddr = getEscrowAddress(activeChainId) as `0x${string}`;
        const requiredRaw = parseUnits(
          String(effectiveAmount),
          productTokenInfo.decimals
        );

        const currentAllowance = await readContract(wagmiConfig, {
          address: productTokenAddress,
          abi: erc20Abi,
          functionName: "allowance",
          args: [address, escrowAddr],
          chainId: activeChainId,
        });

        if ((currentAllowance as bigint) < requiredRaw) {
          const approvalAmount = (requiredRaw * 105n) / 100n; // 5% buffer

          const approveHash = await writeContract(wagmiConfig, {
            address: productTokenAddress,
            abi: erc20Abi,
            functionName: "approve",
            args: [escrowAddr, approvalAmount],
            gas: 150_000n,
            chainId: activeChainId,
          });

          await waitForTransactionReceipt(wagmiConfig, {
            hash: approveHash,
            timeout: 30_000,
          });

          paymentDebug.log("approval:confirmed", { hash: approveHash });
        } else {
          paymentDebug.log("approval:sufficient");
        }

        // ── 4. Execute buyTrade on escrow contract ────────────────
        dispatch({
          type: "SET_STEP",
          step: "executing",
          message: "Processing your purchase...",
        });

        const result = await escrow.buyTrade(
          BigInt(params.tradeId),
          BigInt(params.quantity),
          params.logisticsProvider,
          BigInt(params.logisticsCost)
        );

        if (!result.success) {
          dispatch({ type: "ERROR", error: result.message });
          return;
        }

        // ── 5. Success ────────────────────────────────────────────
        dispatch({
          type: "SET_STEP",
          step: "confirming",
          message: "Confirming on chain...",
        });

        await new Promise((r) => setTimeout(r, 1500));

        dispatch({
          type: "SUCCESS",
          txHash: result.hash!,
          purchaseId: result.purchaseId,
          swapHash,
        });

        paymentDebug.log("payment:complete", {
          txHash: result.hash,
          purchaseId: result.purchaseId,
          duration: paymentDebug.getDuration(),
        });

        setTimeout(() => refetchBalances(), 2000);
      } catch (err) {
        paymentDebug.error("payment:unexpected", err);
        dispatch({ type: "ERROR", error: getErrorMessage(err) });
      }
    },
    [address, switchChainAsync, hasSufficient, refetchBalances, swap, getQuote, escrow]
  );

  return {
    state,
    startPayment,
    reset,
    /** is the payment flow active? */
    isActive: state.step !== "idle" && state.step !== "success" && state.step !== "error",
  };
}
