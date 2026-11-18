import type { BankTransferOrderStatus } from "../../../utils/validation/bankTransfer";
import type { ProgressStep } from "../../../utils/bankTransferLifecycle";

/** Labels short enough for seven steps on a phone. */
const SHORT_LABEL: Partial<Record<BankTransferOrderStatus, string>> = {
  awaiting_payment: "Pay",
  preparing: "Prep",
  out_for_delivery: "Sent",
  completed: "Done",
};

const STATE_TEXT: Record<ProgressStep["state"], string> = {
  done: "done",
  current: "current step",
  upcoming: "not yet",
};

interface Props {
  steps: ProgressStep[];
  /** What happens next, shown under the tracker. */
  description: string;
}

/** The order tracker, drawn like the crypto order's TradeStatus. */
export default function OrderProgress({ steps, description }: Props) {
  return (
    <div>
      <ol className="flex items-start">
        {steps.map((step, i) => {
          const isDone = step.state === "done";
          const isCurrent = step.state === "current";
          // A line is green once the step it leads into has been reached.
          const reached = (step: ProgressStep) => step.state !== "upcoming";
          const line = (on: boolean) => (on ? "bg-green-600" : "bg-[#292B30]");
          return (
            <li
              key={step.key}
              aria-current={isCurrent ? "step" : undefined}
              className="flex flex-1 flex-col items-center"
            >
              <div className="flex w-full items-center" aria-hidden>
                <div className={`h-0.5 flex-1 ${i > 0 ? line(reached(step)) : "bg-transparent"}`} />
                <div
                  className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold sm:h-8 sm:w-8 ${
                    isDone
                      ? "bg-green-600 text-white"
                      : isCurrent
                        ? "border-2 border-red-600 bg-[#212428] text-red-400"
                        : "border-2 border-[#292B30] bg-[#212428] text-gray-400"
                  }`}
                >
                  {isDone ? (
                    <svg className="h-3.5 w-3.5 sm:h-4 sm:w-4" fill="currentColor" viewBox="0 0 20 20">
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
                <div className={`h-0.5 flex-1 ${i < steps.length - 1 ? line(reached(steps[i + 1])) : "bg-transparent"}`} />
              </div>
              <p
                className={`mt-2 text-center text-[10px] font-medium sm:text-xs ${
                  isDone ? "text-green-500" : isCurrent ? "text-red-400" : "text-gray-400"
                }`}
              >
                <span className="sm:hidden" aria-hidden>
                  {SHORT_LABEL[step.key] ?? step.label}
                </span>
                <span className="hidden sm:inline">{step.label}</span>
                <span className="sr-only">
                  {/* Phones see the short label; screen readers always get the full one. */}
                  <span className="sm:hidden">{step.label}</span>, {STATE_TEXT[step.state]}
                </span>
              </p>
            </li>
          );
        })}
      </ol>

      <div className="mt-4 rounded-xl border border-[#292B30] bg-[#292B30] p-3 text-center">
        <p className="text-sm text-gray-300">{description}</p>
      </div>
    </div>
  );
}
