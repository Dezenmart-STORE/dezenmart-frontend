import { useCallback } from "react";
import {
  useAccount,
  useChainId,
  useWriteContract,
} from "wagmi";
import { decodeEventLog, type Log } from "viem";
import { simulateContract, waitForTransactionReceipt } from "@wagmi/core";
import { getEscrowContract, ESCROW_ABI } from "../abi/escrow";
import { wagmiConfig } from "../config/chains";
import { parseError, logError } from "../utils/errors";
import { paymentDebug } from "../utils/debug";

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
      eventName?: string
    ): Promise<EscrowResult> => {
      // Validate
      if (!isConnected || !address) {
        return { success: false, message: "Please connect your wallet first." };
      }

      const contract = getEscrowContract(chainId);

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
          });
          if (request.gas) gas = (request.gas * 120n) / 100n;
        } catch {
          // Simulation may fail for view restrictions; use safe default
        }

        // Execute
        const hash = await writeContractAsync({
          ...contract,
          functionName,
          args,
          gas,
        });

        if (!hash) {
          return { success: false, message: "Transaction failed to submit." };
        }

        // Wait for receipt
        const receipt = await waitForTransactionReceipt(wagmiConfig, {
          hash,
          timeout: 60_000,
        });

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
    [isConnected, address, chainId, writeContractAsync]
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
      logisticsCost: bigint
    ) =>
      execute(
        "buyTrade",
        [tradeId, quantity, logisticsProvider, logisticsCost],
        "PurchaseCreated"
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
