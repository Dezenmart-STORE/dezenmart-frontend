import { useCallback } from "react";
import { useSmartWallet } from "../context/SmartWalletContext";
import { useCosignTransactionMutation } from "../store/api";

/**
 * Transaction authorization for the embedded wallet.
 *
 * This is the integration seam for the payment/escrow flows: before signing a
 * transaction with the embedded wallet, call `authorize()` (or
 * `authorizeAndCosign()`), which prompts for the PIN, verifies it with the
 * backend, and returns a short-lived txAuthToken / the backend co-signature.
 *
 * When the feature is disabled (external wallet in use), `enabled` is false and
 * callers should sign as they do today - no PIN gate.
 */
export function useTransactionAuth() {
  const { enabled, phase, authorizeTransaction } = useSmartWallet();
  const [cosign] = useCosignTransactionMutation();

  /** Prompt for PIN and return the short-lived txAuthToken. */
  const authorize = useCallback(() => authorizeTransaction(), [authorizeTransaction]);

  /**
   * Prompt for PIN, then have the backend co-sign the given user operation.
   * Returns the co-signature (and userOpHash if provided).
   */
  const authorizeAndCosign = useCallback(
    async (userOp: Record<string, unknown>, chainId: number) => {
      const txAuthToken = await authorizeTransaction();
      return cosign({ txAuthToken, chainId, userOp }).unwrap();
    },
    [authorizeTransaction, cosign]
  );

  return {
    /** True when the embedded wallet feature is on and the user is using it. */
    enabled,
    /** True once the wallet + PIN are set up. */
    ready: phase === "ready",
    authorize,
    authorizeAndCosign,
  };
}
