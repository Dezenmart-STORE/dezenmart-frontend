import { Suspense, type ReactNode } from "react";
import { WagmiProvider } from "wagmi";
import { QueryClientProvider } from "@tanstack/react-query";
import { wagmiConfig } from "../../../config/chains";
import { queryClient } from "../../../config/queryClient";
import { SMART_WALLET_ENABLED } from "../../../config/smartWallet";
import { lazyWithReload } from "../../../utils/lazyWithReload";

// Dynamic (and its SDK) only load when the feature is enabled. lazyWithReload
// recovers from a stale-deploy 404 on the DynamicRoot chunk after a redeploy.
const DynamicRoot = lazyWithReload(() => import("./DynamicRoot"), "DynamicRoot");

/**
 * Owns the web3 provider tree (Wagmi + React Query).
 *
 * - Feature OFF (no VITE_DYNAMIC_ENV_ID): renders the exact original tree, so
 *   the app is byte-for-byte unchanged.
 * - Feature ON: lazy-loads the Dynamic-wrapped tree (embedded wallets).
 */
export default function SmartWalletProvider({ children }: { children: ReactNode }) {
  if (!SMART_WALLET_ENABLED) {
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
