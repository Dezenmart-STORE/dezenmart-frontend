import { useCallback } from "react";
import {
  useAccount,
  useChainId,
  useWriteContract,
} from "wagmi";
import { decodeEventLog, type Log } from "viem";
import { simulateContract, waitForTransactionReceipt, getChainId } from "@wagmi/core";
import { getEscrowContract, ESCROW_ABI } from "../abi/escrow";
import { wagmiConfig } from "../config/chains";
import { parseError, logError } from "../utils/errors";
import { paymentDebug } from "../utils/paymentDebug";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface EscrowResult {
  success: boolean;
  hash?: `0x${string}`;
  purchaseId?: string;
  error?: string;
  message: string;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * All escrow smart-contract operations in one hook.
 *
 * Each method validates wallet state, simulates the tx for gas estimation,
 * executes, waits for receipt, and extracts event data.
 */
export function useEscrow() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { writeContractAsync, isPending } = useWriteContract();

  // ── shared executor ──────────────────────────────────────────────
  const execute = useCallback(
    async (
      functionName: string,
      args: readonly unknown[],
      eventName?: string,
      feeCurrency?: `0x${string}`
    ): Promise<EscrowResult> => {
      // Validate
      if (!isConnected || !address) {
        return { success: false, message: "Please connect your wallet first." };
      }

      // Read chain at call time (not from hook closure which may be stale).
      // After usePayment's switchChainAsync succeeds, wagmiConfig state is
      // updated synchronously, so getChainId is reliable here.
      const liveChainId = getChainId(wagmiConfig);
      const contract = getEscrowContract(liveChainId);

      paymentDebug.log(`escrow:${functionName}:start`, {
        args: args.map(String),
      });

      try {
        // Gas estimation via simulation
        let gas = 800_000n;
        try {
          const { request } = await simulateContract(wagmiConfig, {
            ...contract,
            functionName,
            args,
            account: address,
            chainId: liveChainId,
          });
          if (request.gas) gas = (request.gas * 120n) / 100n;
        } catch (simErr) {
          // Distinguish real contract reverts from transient RPC issues.
          // A revert means the tx WILL fail — don't submit and waste gas.
          const simMsg = ((simErr as any)?.message ?? "").toLowerCase();
          const isRevert =
            simMsg.includes("revert") ||
            simMsg.includes("execution reverted") ||
            simMsg.includes("contract function") ||
            simMsg.includes("reason:");
          if (isRevert) throw simErr;
          // Network/RPC issue: proceed with default gas and let the wallet decide.
        }

        // Execute — liveChainId (read at call time, not from stale closure)
        // feeCurrency (Celo-specific): when set, gas is deducted from that token
        const hash = await writeContractAsync({
          ...contract,
          functionName,
          args,
          gas,
          chainId: liveChainId,
          ...(feeCurrency ? { feeCurrency } : {}),
        } as any);

        if (!hash) {
          return { success: false, message: "Transaction failed to submit." };
        }

        // Wait for receipt — 120s timeout, poll every 4s (Celo blocks ~5s)
        const receipt = await waitForTransactionReceipt(wagmiConfig, {
          hash,
          timeout: 120_000,
          pollingInterval: 4_000,
        });

        if (receipt.status === "reverted") {
          return {
            success: false,
            error: "Transaction reverted",
            message: "The transaction was rejected by the contract. Check your balance and try again.",
          };
        }

        // Extract purchase/trade ID from event logs
        let purchaseId: string | undefined;
        if (eventName && receipt.logs) {
          try {
            for (const log of receipt.logs) {
              try {
                const decoded = decodeEventLog({
                  abi: ESCROW_ABI,
                  data: (log as Log).data,
                  topics: (log as Log).topics,
                });
                if (decoded.eventName === eventName && decoded.args) {
                  const a = decoded.args as unknown as Record<string, unknown>;
                  purchaseId =
                    (a.purchaseId ?? a.tradeId)?.toString() ?? undefined;
                  break;
                }
              } catch {
                // Not our event — skip
              }
            }
          } catch {
            // Log decoding is best-effort
          }
        }

        paymentDebug.log(`escrow:${functionName}:success`, { hash, purchaseId });

        return {
          success: true,
          hash,
          purchaseId,
          message: "Transaction confirmed.",
        };
      } catch (err) {
        const parsed = parseError(err);
        logError(err, `escrow:${functionName}`);
        paymentDebug.error(`escrow:${functionName}`, err);

        return {
          success: false,
          error: parsed.title,
          message: parsed.suggestion
            ? `${parsed.message} ${parsed.suggestion}`
            : parsed.message,
        };
      }
    },
    [isConnected, address, writeContractAsync]
  );

  // ── public methods ───────────────────────────────────────────────

  const createTrade = useCallback(
    (
      seller: `0x${string}`,
      productCost: bigint,
      totalQuantity: bigint,
      tokenAddress: `0x${string}`
    ) =>
      execute(
        "createTrade",
        [seller, productCost, totalQuantity, tokenAddress],
        "TradeCreated"
      ),
    [execute]
  );

  const buyTrade = useCallback(
    (
      tradeId: bigint,
      quantity: bigint,
      logisticsProvider: `0x${string}`,
      logisticsCost: bigint,
      feeCurrency?: `0x${string}`
    ) =>
      execute(
        "buyTrade",
        [tradeId, quantity, logisticsProvider, logisticsCost],
        "PurchaseCreated",
        feeCurrency
      ),
    [execute]
  );

  const confirmDelivery = useCallback(
    (purchaseId: bigint) =>
      execute(
        "confirmDeliveryAndPurchase",
        [purchaseId],
        "PurchaseCompletedAndConfirmed"
      ),
    [execute]
  );

  const raiseDispute = useCallback(
    (purchaseId: bigint) =>
      execute("raiseDispute", [purchaseId], "DisputeRaised"),
    [execute]
  );

  const cancelPurchase = useCallback(
    (purchaseId: bigint) => execute("cancelPurchase", [purchaseId]),
    [execute]
  );

  return {
    createTrade,
    buyTrade,
    confirmDelivery,
    raiseDispute,
    cancelPurchase,
    isPending,
  };
}
