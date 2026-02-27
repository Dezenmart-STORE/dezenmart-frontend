import { useState } from "react";
import { useEscrow } from "../../hooks/useEscrow";
import type { TradeState } from "./TradeStatus";

interface Props {
  purchaseId: string;
  status: TradeState;
  onActionComplete?: (action: string, result: { hash?: string }) => void;
}

/**
 * Contextual action buttons based on trade status — dark themed.
 * Shows only relevant actions for the current state.
 */
export default function TradeActions({
  purchaseId,
  status,
  onActionComplete,
}: Props) {
  const { confirmDelivery, raiseDispute, cancelPurchase, isPending } = useEscrow();
  const [confirming, setConfirming] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const handleAction = async (
    action: "confirm" | "dispute" | "cancel",
    fn: (id: bigint) => ReturnType<typeof confirmDelivery>
  ) => {
    setFeedback(null);
    const result = await fn(BigInt(purchaseId));

    if (result.success) {
      setFeedback({ type: "success", message: result.message });
      onActionComplete?.(action, { hash: result.hash });
    } else {
      setFeedback({ type: "error", message: result.message });
    }
    setConfirming(null);
  };

  // "paid" included here because buyer self-reports receipt (no seller/logistics side yet).
  // Once seller side is built, remove "paid" and let seller push to "delivered" first.
  const canConfirmDelivery = status === "paid" || status === "delivered" || status === "shipped";
  const canDispute = status === "paid" || status === "shipped" || status === "delivered";
  const canCancel = status === "pending_payment" || status === "paid";

  if (!canConfirmDelivery && !canDispute && !canCancel) return null;

  return (
    <div className="space-y-3">
      {/* Feedback message */}
      {feedback && (
        <div
          className={`rounded-xl border p-3 text-sm ${
            feedback.type === "success"
              ? "border-green-800/50 bg-green-900/20 text-green-400"
              : "border-red-800/50 bg-red-900/20 text-red-400"
          }`}
        >
          {feedback.message}
        </div>
      )}

      {/* Confirm Delivery */}
      {canConfirmDelivery && (
        <>
          {confirming === "confirm" ? (
            <div className="rounded-xl border border-green-800/50 bg-green-900/20 p-4">
              <p className="text-sm font-semibold text-green-300">
                Confirm you received the item?
              </p>
              <p className="mt-1 text-xs text-green-500">
                This will release payment to the seller. Only confirm after inspecting your item.
              </p>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => handleAction("confirm", confirmDelivery)}
                  disabled={isPending}
                  className="flex-1 rounded-lg bg-green-700 py-2.5 text-sm font-bold text-white transition-colors hover:bg-green-600 disabled:opacity-50"
                >
                  {isPending ? "Processing…" : "Yes, I Received It"}
                </button>
                <button
                  onClick={() => setConfirming(null)}
                  className="rounded-lg border border-green-800/50 bg-green-900/20 px-4 py-2.5 text-sm font-medium text-green-400 hover:bg-green-900/40"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setConfirming("confirm")}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-green-700 py-3.5 text-sm font-bold text-white transition-colors hover:bg-green-600"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
              I Received My Item
            </button>
          )}
        </>
      )}

      {/* Raise Dispute */}
      {canDispute && (
        <>
          {confirming === "dispute" ? (
            <div className="rounded-xl border border-amber-800/50 bg-amber-900/20 p-4">
              <p className="text-sm font-semibold text-amber-300">
                Raise a dispute?
              </p>
              <p className="mt-1 text-xs text-amber-500">
                This will flag the order for review. Use this if there's an issue — we'll help resolve it.
              </p>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => handleAction("dispute", raiseDispute)}
                  disabled={isPending}
                  className="flex-1 rounded-lg bg-amber-700 py-2.5 text-sm font-bold text-white transition-colors hover:bg-amber-600 disabled:opacity-50"
                >
                  {isPending ? "Processing…" : "Yes, Raise Dispute"}
                </button>
                <button
                  onClick={() => setConfirming(null)}
                  className="rounded-lg border border-amber-800/50 bg-amber-900/20 px-4 py-2.5 text-sm font-medium text-amber-400 hover:bg-amber-900/40"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setConfirming("dispute")}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-amber-800/50 bg-amber-900/20 py-3.5 text-sm font-bold text-amber-300 transition-colors hover:bg-amber-900/40"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Report an Issue
            </button>
          )}
        </>
      )}

      {/* Cancel */}
      {canCancel && (
        <>
          {confirming === "cancel" ? (
            <div className="rounded-xl border border-red-800/50 bg-red-900/20 p-4">
              <p className="text-sm font-semibold text-red-300">
                Cancel this order?
              </p>
              <p className="mt-1 text-xs text-red-500">
                Your payment will be refunded to your wallet.
              </p>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => handleAction("cancel", cancelPurchase)}
                  disabled={isPending}
                  className="flex-1 rounded-lg bg-red-700 py-2.5 text-sm font-bold text-white transition-colors hover:bg-red-600 disabled:opacity-50"
                >
                  {isPending ? "Processing…" : "Yes, Cancel Order"}
                </button>
                <button
                  onClick={() => setConfirming(null)}
                  className="rounded-lg border border-red-800/50 bg-red-900/20 px-4 py-2.5 text-sm font-medium text-red-400 hover:bg-red-900/40"
                >
                  Keep Order
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setConfirming("cancel")}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#292B30] bg-[#292B30] py-3.5 text-sm font-medium text-gray-400 transition-colors hover:border-red-900/40 hover:bg-red-900/10 hover:text-red-400"
            >
              Cancel Order
            </button>
          )}
        </>
      )}
    </div>
  );
}
