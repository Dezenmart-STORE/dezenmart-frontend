import { useChainGuard } from "../../hooks/useChainGuard";

/**
 * Full-width banner that appears when the user's wallet is connected to
 * a non-Celo network.
 *
 * - Mounts in Layout so it's always rendered (even when hidden) — this
 *   is what triggers the auto-switch useEffect in useChainGuard.
 * - Returns null silently when not needed (disconnected or correct chain).
 * - Non-dismissible: the wrong network blocks purchases, so the user must
 *   resolve it before proceeding.
 *
 * Web2-friendly copy: no blockchain jargon, clear single action.
 */
export default function WrongNetworkBanner() {
  const { isConnected, isOnCelo, isSwitching, switchToCelo } = useChainGuard();

  if (!isConnected || isOnCelo) return null;

  return (
    <div className="w-full bg-amber-500 px-4 py-3 shadow-sm">
      <div className="mx-auto flex max-w-5xl items-center gap-3">
        {/* Warning icon */}
        <svg
          className="h-5 w-5 flex-shrink-0 text-white"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
          />
        </svg>

        {/* Message */}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-white">
            Your wallet is on the wrong network
          </p>
          <p className="text-xs text-amber-100">
            Dezenmart runs on Celo — switch to continue shopping
          </p>
        </div>

        {/* CTA */}
        <button
          onClick={switchToCelo}
          disabled={isSwitching}
          className="flex-shrink-0 rounded-lg bg-white px-4 py-1.5 text-xs font-bold text-amber-700 transition-opacity hover:opacity-90 active:scale-[0.98] disabled:opacity-60"
        >
          {isSwitching ? (
            <span className="flex items-center gap-1.5">
              <svg className="h-3 w-3 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Switching…
            </span>
          ) : (
            "Switch to Celo"
          )}
        </button>
      </div>
    </div>
  );
}
