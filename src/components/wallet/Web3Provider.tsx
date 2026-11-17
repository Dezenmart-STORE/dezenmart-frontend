import { useEffect, type ReactNode } from "react";
import { WagmiProvider } from "wagmi";
import { reconnect } from "@wagmi/core";
import { QueryClientProvider } from "@tanstack/react-query";
import { RainbowKitProvider, darkTheme } from "@rainbow-me/rainbowkit";
import "@rainbow-me/rainbowkit/styles.css";
import {
  wagmiConfig,
  TARGET_CHAIN,
  ensureWalletConnectWallets,
  WALLETCONNECT_CONNECTOR_IDS,
} from "../../config/chains";
import { queryClient } from "../../config/queryClient";

/**
 * The whole web3 provider tree: wagmi, React Query, RainbowKit.
 *
 * Replaces the former SmartWalletProvider/DynamicRoot pair. Dynamic (the Dezen
 * embedded wallet) has been removed, so third-party wallets through RainbowKit
 * are the only way to connect.
 *
 * Note where RainbowKitProvider now sits. It used to live INSIDE DynamicRoot,
 * which was lazy-loaded and mounted only for signed-in users with the feature
 * on - so the external wallet picker quietly depended on Dynamic being present,
 * and turning Dynamic off would have taken RainbowKit down with it. It is
 * mounted unconditionally here, which is what makes the removal safe.
 *
 * There is no longer a lazy boundary or a boot-time session gate: the tree is
 * the same for every visitor, signed in or not, so nothing can remount the app
 * mid-session the way swapping trees used to.
 */
const rkTheme = darkTheme({
  accentColor: "#dc2626",
  accentColorForeground: "#ffffff",
  borderRadius: "large",
  overlayBlur: "small",
});

/**
 * Restore a returning visitor's wallet without waking every wallet SDK.
 *
 * wagmi's default `reconnectOnMount` calls getProvider() on EVERY connector to
 * see which one is authorized. That boots the Coinbase SDK and a WalletConnect
 * client per WalletConnect-based wallet (Trust, Valora, QR) on every page load,
 * for every visitor - network calls to Coinbase and Reown/WalletConnect before
 * anyone has touched "Connect", and the "WalletConnect Core is already
 * initialized" warning.
 *
 * Instead only two kinds of connector are checked:
 *  - the one this browser last connected with (wagmi stores its id), and
 *  - injected wallets (extensions and in-wallet browsers), which only read
 *    window.ethereum and load nothing.
 * A first-time visitor therefore starts no wallet SDK at all.
 */
async function reconnectLastWallet() {
  let recentId: string | null | undefined;
  try {
    recentId = await wagmiConfig.storage?.getItem("recentConnectorId");
  } catch {
    recentId = undefined;
  }
  // A returning WalletConnect user needs those connectors to exist to restore
  // the session; everyone else never loads them at startup.
  if (recentId && WALLETCONNECT_CONNECTOR_IDS.has(recentId)) {
    ensureWalletConnectWallets();
  }
  const connectors = wagmiConfig.connectors.filter(
    (c) => c.id === recentId || c.type === "injected"
  );
  // An empty list would make wagmi fall back to checking every connector.
  if (connectors.length === 0) return;
  await reconnect(wagmiConfig, { connectors });
}

function ReconnectLastWallet() {
  useEffect(() => {
    // Child effects run before WagmiProvider's own mount effect, which resets
    // hydrated connections when reconnectOnMount is off. Defer one task so the
    // reconnect lands after that reset, not before it.
    const id = setTimeout(() => {
      reconnectLastWallet().catch(() => {});
    }, 0);
    return () => clearTimeout(id);
  }, []);
  return null;
}

export default function Web3Provider({ children }: { children: ReactNode }) {
  return (
    <WagmiProvider config={wagmiConfig} reconnectOnMount={false}>
      <ReconnectLastWallet />
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={rkTheme}
          modalSize="compact"
          initialChain={TARGET_CHAIN}
        >
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
