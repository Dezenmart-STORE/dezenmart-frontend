import { useNavigate } from "react-router-dom";

/**
 * Full-page stand-in for routes that exist only to move money: the trade
 * buy/sell checkouts and the trade views, which settle through the escrow
 * contract on-chain.
 *
 * Routed in place of those pages while PAYMENTS_ENABLED is off
 * (see config/features.ts). Swapping at the router rather than inside each
 * page means the payment components on those routes are never reached at all,
 * and there is no chance of a stray control rendering behind a guard someone
 * forgot to add.
 *
 * Modelled on ComingSoon, which is the existing precedent here for a route
 * that is deliberately not available yet.
 */
export default function PaymentsHeld() {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4">
      <div className="mx-auto max-w-sm text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full border border-[#373A3F] bg-[#292B30]">
          <svg
            className="h-10 w-10 text-gray-500"
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

        <h1 className="text-2xl font-bold text-white">
          Temporarily unavailable
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-gray-400">
          Payments are temporarily unavailable. You can still browse products
          and place orders, and we'll let you know as soon as this is back.
        </p>

        <div className="mt-8 flex flex-col gap-3">
          <button
            onClick={() => navigate("/product")}
            className="w-full rounded-xl bg-red-600 py-3 text-sm font-bold text-white transition-colors hover:bg-red-700 active:scale-[0.98]"
          >
            Browse Products
          </button>
          <button
            onClick={() => navigate("/account")}
            className="w-full rounded-xl border border-[#292B30] bg-[#292B30] py-3 text-sm font-medium text-gray-300 transition-colors hover:bg-[#373A3F] hover:text-white"
          >
            My Orders
          </button>
        </div>
      </div>
    </div>
  );
}
