/**
 * Shown wherever a payment or escrow control used to be, while
 * PAYMENTS_ENABLED is off (see config/features.ts).
 *
 * There is a notice rather than an empty space because people already have
 * orders awaiting payment. Removing the button silently would leave them on a
 * screen that lost its only action with no explanation, which reads as a bug
 * and becomes a support ticket.
 *
 * The copy gives no reason. Saying "pending our refund and escrow policies"
 * would advertise a compliance gap to every buyer, so it states the fact and
 * stops.
 */
interface Props {
  /** Overrides the default line where a surface needs to be specific. */
  message?: string;
  /** Tightens spacing for use inside an existing card. */
  compact?: boolean;
}

export default function PaymentsUnavailable({ message, compact = false }: Props) {
  return (
    <div
      role="status"
      className={`rounded-xl border border-[#373A3F] bg-[#1a1c20] text-center ${
        compact ? "p-3" : "p-5"
      }`}
    >
      <div className="mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-full border border-[#373A3F] bg-[#212428]">
        <svg
          className="h-4 w-4 text-gray-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </div>
      <p className={`font-medium text-gray-300 ${compact ? "text-xs" : "text-sm"}`}>
        {message ?? "Payments are temporarily unavailable."}
      </p>
      <p className="mt-1 text-xs text-gray-500">
        We'll let you know as soon as this is back.
      </p>
    </div>
  );
}
