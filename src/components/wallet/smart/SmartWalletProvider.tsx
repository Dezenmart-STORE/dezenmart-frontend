import { Suspense, type ReactNode } from "react";
import { WagmiProvider } from "wagmi";
import { QueryClientProvider } from "@tanstack/react-query";
import { wagmiConfig } from "../../../config/chains";
import { queryClient } from "../../../config/queryClient";
import { DYNAMIC_MOUNTED } from "../../../config/smartWallet";
import { lazyWithReload } from "../../../utils/lazyWithReload";

// Dynamic (and its SDK) only load when the feature is enabled AND someone is
// signed in. lazyWithReload recovers from a stale-deploy 404 on the DynamicRoot
// chunk after a redeploy.
const DynamicRoot = lazyWithReload(() => import("./DynamicRoot"), "DynamicRoot");

/**
 * Owns the web3 provider tree (Wagmi + React Query).
 *
 * - No session, or feature OFF (no VITE_DYNAMIC_ENV_ID): renders the plain
 *   wagmi tree. External wallets still work through it (MiniPay auto-connect
 *   included); only the Dezen embedded wallet is unavailable, which is correct
 *   because that wallet belongs to an account.
 * - Signed in with the feature ON: lazy-loads the Dynamic-wrapped tree.
 *
 * DYNAMIC_MOUNTED is fixed for the page's lifetime, so this never swaps trees
 * mid-session (that would remount the whole app). Signing in reloads instead.
 */
/** Matches the app background so the hand-off to the real tree is invisible. */
function BootSplash() {
  return <div className="fixed inset-0 bg-[#212428]" aria-hidden="true" />;
}

export default function SmartWalletProvider({ children }: { children: ReactNode }) {
  if (!DYNAMIC_MOUNTED) {
    return (
      <WagmiProvider config={wagmiConfig}>
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      </WagmiProvider>
    );
  }

  // The fallback deliberately does NOT render {children}.
  //
  // It used to render them inside a plain WagmiProvider, to avoid a flash while
  // Dynamic's chunk loaded. But that put {children} at a different position in
  // the tree than the DynamicRoot branch, so the moment the chunk resolved React
  // unmounted the whole app and mounted it again - AuthProvider reset to its
  // initial null user, and any transient state went with it. It traded a brief
  // flash for a guaranteed full remount on every single page load.
  //
  // Showing a splash instead means {children} mount exactly once, under
  // DynamicRoot, and never move.
  return (
    <Suspense fallback={<BootSplash />}>
      <DynamicRoot>{children}</DynamicRoot>
    </Suspense>
  );
}
