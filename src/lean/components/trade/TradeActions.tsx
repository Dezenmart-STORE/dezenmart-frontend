import { useState } from "react";
import { useEscrow } from "../../hooks/useEscrow";
import type { TradeState } from "./TradeStatus";

interface Props {
  purchaseId: string;
  status: TradeState;
  /** Called after any successful action */
  onActionComplete?: (action: string, result: { hash?: string }) => void;
}

/**
 * Contextual action buttons based on trade status.
 * Shows only relevant actions for the current state.
 */
export default function TradeActions({
  purchaseId,
  status,
  onActionComplete,
}: Props) {
  const { confirmDelivery, raiseDispute, cancelPurchase, isPending } =
    useEscrow();
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

  // Determine available actions
  const canConfirmDelivery = status === "delivered" || status === "shipped";
  const canDispute = status === "paid" || status === "shipped" || status === "delivered";
  const canCancel = status === "pending_payment" || status === "paid";

  if (!canConfirmDelivery && !canDispute && !canCancel) {
    return null;
  }

  return (
    <div className="space-y-3">
      {/* Feedback message */}
      {feedback && (
        <div
          className={`rounded-xl p-3 text-sm ${
            feedback.type === "success"
              ? "bg-green-50 text-green-700"
              : "bg-red-50 text-red-700"
          }`}
        >
          {feedback.message}
        </div>
      )}

      {/* Confirm Delivery */}
      {canConfirmDelivery && (
        <>
          {confirming === "confirm" ? (
            <div className="rounded-xl border border-green-200 bg-green-50 p-4">
              <p className="text-sm font-semibold text-green-800">
                Confirm you received the item?
              </p>
              <p className="mt-1 text-xs text-green-600">
                This will release payment to the seller. Only confirm if you've
                received and inspected your item.
              </p>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() =>
                    handleAction("confirm", confirmDelivery)
                  }
                  disabled={isPending}
                  className="flex-1 rounded-lg bg-green-600 py-2 text-sm font-bold text-white transition-colors hover:bg-green-700 disabled:opacity-50"
                >
                  {isPending ? "Processing..." : "Yes, I Received It"}
                </button>
                <button
                  onClick={() => setConfirming(null)}
                  className="rounded-lg border border-green-200 px-4 py-2 text-sm font-medium text-green-700 hover:bg-green-100"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setConfirming("confirm")}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-green-600 py-3 text-sm font-bold text-white transition-colors hover:bg-green-700"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
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
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm font-semibold text-amber-800">
                Raise a dispute?
              </p>
              <p className="mt-1 text-xs text-amber-600">
                This will flag the order for review. Use this if there's an issue
                with your order — we'll help resolve it.
              </p>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => handleAction("dispute", raiseDispute)}
                  disabled={isPending}
                  className="flex-1 rounded-lg bg-amber-600 py-2 text-sm font-bold text-white transition-colors hover:bg-amber-700 disabled:opacity-50"
                >
                  {isPending ? "Processing..." : "Yes, Raise Dispute"}
                </button>
                <button
                  onClick={() => setConfirming(null)}
                  className="rounded-lg border border-amber-200 px-4 py-2 text-sm font-medium text-amber-700 hover:bg-amber-100"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setConfirming("dispute")}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-amber-300 py-3 text-sm font-bold text-amber-700 transition-colors hover:bg-amber-50"
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
            <div className="rounded-xl border border-red-200 bg-red-50 p-4">
              <p className="text-sm font-semibold text-red-800">
                Cancel this order?
              </p>
              <p className="mt-1 text-xs text-red-600">
                Your payment will be refunded to your wallet.
              </p>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() =>
                    handleAction("cancel", cancelPurchase)
                  }
                  disabled={isPending}
                  className="flex-1 rounded-lg bg-red-600 py-2 text-sm font-bold text-white transition-colors hover:bg-red-700 disabled:opacity-50"
                >
                  {isPending ? "Processing..." : "Yes, Cancel Order"}
                </button>
                <button
                  onClick={() => setConfirming(null)}
                  className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100"
                >
                  Keep Order
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setConfirming("cancel")}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 py-3 text-sm font-medium text-gray-500 transition-colors hover:bg-gray-50"
            >
              Cancel Order
            </button>
          )}
        </>
      )}
    </div>
  );
}
