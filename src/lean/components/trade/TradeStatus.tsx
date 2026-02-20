/**
 * Trade status as a visual state machine (stepper).
 */

// ---------------------------------------------------------------------------
// Status definitions
// ---------------------------------------------------------------------------
export type TradeState =
  | "pending_payment"
  | "paid"
  | "shipped"
  | "delivered"
  | "completed"
  | "disputed"
  | "cancelled";

interface StepDef {
  label: string;
  description: string;
}

const STEPS: StepDef[] = [
  { label: "Ordered", description: "Payment is being processed" },
  { label: "Paid", description: "Payment confirmed in escrow" },
  { label: "Shipped", description: "Seller has shipped the item" },
  { label: "Delivered", description: "Item delivered to you" },
  { label: "Complete", description: "Funds released to seller" },
];

const STATE_TO_STEP: Record<TradeState, number> = {
  pending_payment: 0,
  paid: 1,
  shipped: 2,
  delivered: 3,
  completed: 4,
  disputed: -1,
  cancelled: -1,
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
interface Props {
  status: TradeState;
  className?: string;
}

export default function TradeStatus({ status, className = "" }: Props) {
  const currentStep = STATE_TO_STEP[status];

  // Special states
  if (status === "disputed") {
    return (
      <div className={`rounded-xl bg-amber-50 p-4 ${className}`}>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100">
            <svg className="h-5 w-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p className="font-semibold text-amber-800">Under Review</p>
            <p className="text-sm text-amber-600">
              A dispute has been raised. Our team is reviewing this order.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (status === "cancelled") {
    return (
      <div className={`rounded-xl bg-gray-50 p-4 ${className}`}>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100">
            <svg className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <div>
            <p className="font-semibold text-gray-700">Cancelled</p>
            <p className="text-sm text-gray-500">
              This order has been cancelled. Funds have been returned.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Normal progress stepper
  return (
    <div className={`${className}`}>
      <div className="flex items-center justify-between">
        {STEPS.map((step, i) => {
          const isDone = i < currentStep;
          const isCurrent = i === currentStep;
          const isFuture = i > currentStep;

          return (
            <div key={step.label} className="flex flex-1 flex-col items-center">
              {/* Connector line */}
              <div className="flex w-full items-center">
                {i > 0 && (
                  <div
                    className={`h-0.5 flex-1 transition-colors ${
                      isDone ? "bg-green-500" : "bg-gray-200"
                    }`}
                  />
                )}

                {/* Step dot */}
                <div
                  className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold transition-all ${
                    isDone
                      ? "bg-green-500 text-white"
                      : isCurrent
                      ? "border-2 border-red-500 bg-white text-red-600"
                      : "border-2 border-gray-200 bg-white text-gray-400"
                  }`}
                >
                  {isDone ? (
                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  ) : (
                    i + 1
                  )}
                </div>

                {i < STEPS.length - 1 && (
                  <div
                    className={`h-0.5 flex-1 transition-colors ${
                      isDone ? "bg-green-500" : "bg-gray-200"
                    }`}
                  />
                )}
              </div>

              {/* Label */}
              <p
                className={`mt-2 text-center text-xs font-medium ${
                  isDone
                    ? "text-green-600"
                    : isCurrent
                    ? "text-red-600"
                    : "text-gray-400"
                }`}
              >
                {step.label}
              </p>
            </div>
          );
        })}
      </div>

      {/* Current step description */}
      <div className="mt-4 rounded-xl bg-gray-50 p-3 text-center">
        <p className="text-sm text-gray-600">
          {STEPS[currentStep]?.description ?? "Processing..."}
        </p>
      </div>
    </div>
  );
}
