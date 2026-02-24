import { useCallback, useReducer } from "react";
import { useAccount, useChainId } from "wagmi";
import { parseUnits } from "viem";
import { useTokenBalances } from "./useTokenBalances";
import { useApproval } from "./useApproval";
import { useSwap } from "./useSwap";
import { useEscrow } from "./useEscrow";
import { getToken, getTokenAddress } from "../config/tokens";
import { paymentDebug } from "../utils/debug";
import { getErrorMessage } from "../utils/errors";

// ---------------------------------------------------------------------------
// State machine
// ---------------------------------------------------------------------------
export type PaymentStep =
  | "idle"
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

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Orchestrates the full payment flow as a state machine:
 *
 *   idle -> checking-balance -> [swapping] -> approving -> executing -> confirming -> success
 *                                                                              ↘ error
 *
 * Components simply call `startPayment(params)` and render based on `state.step`.
 */
export function usePayment() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const { address } = useAccount();
  const chainId = useChainId();
  const { balances, refetch: refetchBalances, hasSufficient } = useTokenBalances();
  const { swap, getQuote, isReady: swapReady } = useSwap();
  const escrow = useEscrow();

  // Approval is checked at call-time since requiredAmount is dynamic
  // We'll use useApproval reactively with current state, but call approve imperatively

  const reset = useCallback(() => dispatch({ type: "RESET" }), []);

  const startPayment = useCallback(
    async (params: PaymentParams) => {
      const sessionId = paymentDebug.startSession("usePayment");

      if (!address) {
        dispatch({ type: "ERROR", error: "Please connect your wallet first." });
        return;
      }

      try {
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

        const payTokenAddress = getTokenAddress(payTokenSymbol, chainId);
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

          // Check balance in payment token
          if (!hasSufficient(payTokenSymbol, params.totalAmount)) {
            dispatch({
              type: "ERROR",
              error: `You need at least ${params.totalAmount.toFixed(2)} ${payTokenSymbol} to complete this purchase.`,
            });
            return;
          }

          // Get quote first
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
          // Direct payment — check balance in product token
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
        const productTokenAddress = getTokenAddress(params.productToken, chainId);

        if (!productTokenInfo || !productTokenAddress) {
          throw new Error(`${params.productToken} configuration missing.`);
        }

        // Import and use approval inline (we need dynamic amount)
        const { readContract } = await import("@wagmi/core");
        const { erc20Abi } = await import("viem");
        const { getEscrowAddress } = await import("../config/chains");

        const escrowAddr = getEscrowAddress(chainId) as `0x${string}`;
        const requiredRaw = parseUnits(
          String(effectiveAmount),
          productTokenInfo.decimals
        );

        // Check current allowance
        const currentAllowance = await readContract(wagmiConfig, {
          address: productTokenAddress,
          abi: erc20Abi,
          functionName: "allowance",
          args: [address, escrowAddr],
        });

        if ((currentAllowance as bigint) < requiredRaw) {
          // Need approval
          const { writeContract } = await import("@wagmi/core");
          const approvalAmount = (requiredRaw * 105n) / 100n; // 5% buffer

          const approveHash = await writeContract(wagmiConfig, {
            address: productTokenAddress,
            abi: erc20Abi,
            functionName: "approve",
            args: [escrowAddr, approvalAmount],
            gas: 150_000n,
            chainId, // explicit Celo chain → CELO shown as fee token in wallet
          });

          // Wait for approval tx
          const { waitForTransactionReceipt } = await import("@wagmi/core");
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

        // ── 5. Success! ───────────────────────────────────────────
        dispatch({
          type: "SET_STEP",
          step: "confirming",
          message: "Confirming on chain...",
        });

        // Short delay for UX — the receipt was already waited on inside useEscrow
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

        // Refresh balances after purchase
        setTimeout(() => refetchBalances(), 2000);
      } catch (err) {
        paymentDebug.error("payment:unexpected", err);
        dispatch({ type: "ERROR", error: getErrorMessage(err) });
      }
    },
    [
      address,
      chainId,
      hasSufficient,
      refetchBalances,
      swap,
      getQuote,
      escrow,
    ]
  );

  return {
    state,
    startPayment,
    reset,
    /** is the payment flow active? */
    isActive: state.step !== "idle" && state.step !== "success" && state.step !== "error",
  };
}

// Wagmi config import for readContract/writeContract
import { wagmiConfig } from "../config/chains";
