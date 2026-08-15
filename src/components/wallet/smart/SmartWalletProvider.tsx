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
export default function SmartWalletProvider({ children }: { children: ReactNode }) {
  if (!DYNAMIC_MOUNTED) {
    return (
      <WagmiProvider config={wagmiConfig}>
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      </WagmiProvider>
    );
  }

  // Fallback keeps the original tree mounted while Dynamic's chunk loads, so
  // wagmi context is always available and there's no flash.
  return (
    <Suspense
      fallback={
        <WagmiProvider config={wagmiConfig}>
          <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        </WagmiProvider>
      }
    >
      <DynamicRoot>{children}</DynamicRoot>
    </Suspense>
  );
}
