import { useMemo } from "react";
import { useModalPresence } from "../../utils/modalPresence";
import { TARGET_CHAIN } from "../../config/chains";

interface Props {
  onClose: () => void;
  /** "bridge" = move funds from another chain to Celo (post-connect guide).
   *  "swap"   = swap tokens inside the Dezen Wallet (wallet menu). */
  variant?: "bridge" | "swap";
}

const INTEGRATOR_ID = (import.meta.env.VITE_SQUID_INTEGRATOR_ID as string | undefined)?.trim();
export const SQUID_ENABLED = !!INTEGRATOR_ID;

// CELO token on Celo mainnet - a sensible default destination asset.
const CELO_TOKEN = "0x471EcE3750Da237f93B8E339c536989b8978a438";

/**
 * In-app cross-chain bridge, Dezen-branded, destination locked to Celo.
 *
 * We embed Squid's HOSTED widget via an iframe rather than bundling
 * @0xsquid/widget: the npm package's module volume OOM-kills the build's
 * transform phase (over the 4GB Netlify budget), and the iframe adds zero to our
 * bundle or build - it only loads when a user opens this modal.
 *
 * Requires studio.squidrouter.com in the CSP frame-src (see netlify.toml).
 */
export default function SquidBridgeModal({ onClose, variant = "bridge" }: Props) {
  useModalPresence();
  const isSwap = variant === "swap";

  const src = useMemo(() => {
    const config = {
      integratorId: INTEGRATOR_ID,
      themeType: "dark",
      // Funds always end up on Celo, the only chain DezenMart settles on.
      availableChains: { destination: [String(TARGET_CHAIN.id)] },
      initialAssets: {
        // Swapping starts from a Celo asset; bridging starts wherever the user is.
        ...(isSwap ? { from: { chainId: String(TARGET_CHAIN.id), address: CELO_TOKEN } } : {}),
        to: { chainId: String(TARGET_CHAIN.id), address: CELO_TOKEN },
      },
    };
    return `https://studio.squidrouter.com/iframe?config=${encodeURIComponent(JSON.stringify(config))}`;
  }, [isSwap]);

  return (
    <div
      className="fixed inset-0 z-[110] flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-3xl border border-[#292B30] bg-[#212428] shadow-2xl sm:max-w-md sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-[#292B30] px-5 py-4">
          <div>
            <h2 className="text-base font-bold text-white">
              {isSwap ? "Swap tokens" : "Move funds to Celo"}
            </h2>
            <p className="mt-0.5 text-xs text-gray-500">
              {isSwap
                ? "Swap inside your Dezen Wallet, powered by Squid"
                : "Bridge from any chain into your Dezen Wallet"}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-full p-2 text-gray-500 transition-colors hover:bg-[#292B30] hover:text-gray-300"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <iframe
          title={isSwap ? "Swap tokens" : "Move funds to Celo"}
          src={src}
          className="h-[640px] max-h-[75dvh] w-full border-0 bg-[#212428]"
          allow="clipboard-read; clipboard-write; accelerometer; gyroscope; payment"
        />
      </div>
    </div>
  );
}
