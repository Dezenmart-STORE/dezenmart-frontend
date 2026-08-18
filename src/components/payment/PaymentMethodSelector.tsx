export type PaymentMethod = "crypto" | "fiat";

interface Props {
  onSelect: (method: PaymentMethod) => void;
  /** e.g. "1.28 USDT" — shown under the crypto option */
  cryptoSummary?: string;
  /** e.g. "NGN 1,738.46" — shown under the fiat option */
  fiatSummary?: string;
}

/**
 * First step of checkout — let the buyer choose how they want to pay.
 * Dark themed to match PaymentFlow / TradeStatus.
 */
export default function PaymentMethodSelector({
  onSelect,
  cryptoSummary,
  fiatSummary,
}: Props) {
  return (
    <div className="space-y-3">
      <p className="text-center text-sm text-gray-400">
        How would you like to pay?
      </p>

      <button
        onClick={() => onSelect("crypto")}
        className="flex w-full items-center gap-3 rounded-xl border border-[#292B30] bg-[#292B30] p-4 text-left transition-colors hover:border-red-900/50 hover:bg-[#31343a]"
      >
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border border-[#373A3F] bg-[#1a1c20]">
          <svg
            className="h-5 w-5 text-red-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8c-1.657 0-3 .672-3 1.5S10.343 11 12 11s3 .672 3 1.5S13.657 14 12 14m0-6c1.11 0 2.08.402 2.599 1M12 8V6.5M12 14v1.5m0-1.5c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-white">Pay with Crypto</p>
          <p className="text-xs text-gray-500">
            {cryptoSummary
              ? `${cryptoSummary} · Wallet, escrow-protected`
              : "Wallet, escrow-protected"}
          </p>
        </div>
        <svg
          className="h-4 w-4 flex-shrink-0 text-gray-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5l7 7-7 7"
          />
        </svg>
      </button>

      <button
        onClick={() => onSelect("fiat")}
        className="flex w-full items-center gap-3 rounded-xl border border-[#292B30] bg-[#292B30] p-4 text-left transition-colors hover:border-red-900/50 hover:bg-[#31343a]"
      >
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border border-[#373A3F] bg-[#1a1c20]">
          <svg
            className="h-5 w-5 text-green-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
            />
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-white">
            Pay with Card / Bank
          </p>
          <p className="text-xs text-gray-500">
            {fiatSummary
              ? `${fiatSummary} · Paystack, Flutterwave, Stripe`
              : "Paystack, Flutterwave, Stripe"}
          </p>
        </div>
        <svg
          className="h-4 w-4 flex-shrink-0 text-gray-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5l7 7-7 7"
          />
        </svg>
      </button>
    </div>
  );
}
