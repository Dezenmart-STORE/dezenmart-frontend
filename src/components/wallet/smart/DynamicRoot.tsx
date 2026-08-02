import type { ReactNode } from "react";
import { DynamicContextProvider } from "@dynamic-labs/sdk-react-core";
import { EthereumWalletConnectors } from "@dynamic-labs/ethereum";
import { DynamicWagmiConnector } from "@dynamic-labs/wagmi-connector";
import { WagmiProvider } from "wagmi";
import { QueryClientProvider } from "@tanstack/react-query";
import { wagmiConfig } from "../../../config/chains";
import { queryClient } from "../../../config/queryClient";
import { DYNAMIC_ENV_ID } from "../../../config/smartWallet";
import { DynamicReadyContext } from "./dynamicReady";

// Theme Dynamic's built-in screens (passcode, embedded-wallet dialogs) to match
// DezenMart: dark surface + red accent instead of the default light/blue. These
// are Dynamic's documented CSS variables; `theme: "dark"` handles the surfaces,
// the overrides recolor the brand/button accent. For belt-and-suspenders you can
// also set Theme=Dark and the accent colour in the Dynamic dashboard's Design tab.
const RED = "#dc2626";
const RED_HOVER = "#b91c1c";
const RED_SOFT = "#ef4444";
const DYNAMIC_CSS_OVERRIDES = `
  :host, .dynamic-shadow-dom, .dynamic-widget-inline-controls {
    --dynamic-brand-primary-color: ${RED};
    --dynamic-brand-hover-color: ${RED_HOVER};
    --dynamic-brand-secondary-color: ${RED_SOFT};
    --dynamic-button-primary-background: ${RED};
    --dynamic-button-primary-hover: ${RED_HOVER};
    --dynamic-button-primary-border: ${RED};
    --dynamic-connect-button-background: ${RED};
    --dynamic-connect-button-background-hover: ${RED_HOVER};
    --dynamic-badge-primary-background: rgba(220, 38, 38, 0.15);
    --dynamic-badge-primary-color: #f87171;
  }
`;

/**
 * The Dynamic-enabled web3 provider tree. Loaded lazily and ONLY when
 * VITE_DYNAMIC_ENV_ID is set, so the SDK never enters the default bundle.
 *
 * Dynamic must wrap Wagmi for the wagmi connector to bridge the embedded wallet
 * into the app's existing useAccount / signing flows.
 */
export default function DynamicRoot({ children }: { children: ReactNode }) {
  return (
    <DynamicContextProvider
      theme="dark"
      settings={{
        environmentId: DYNAMIC_ENV_ID,
        walletConnectors: [EthereumWalletConnectors],
        cssOverrides: DYNAMIC_CSS_OVERRIDES,
        // Align any Dynamic-native surface with our curated shortlist. The
        // authoritative curation (enabled networks = Celo only, embedded wallets
        // on, wallet allow-list) is set in the Dynamic dashboard.
        recommendedWallets: [
          { walletKey: "valora", label: "Celo-native" },
          { walletKey: "metamask" },
          { walletKey: "coinbase" },
          { walletKey: "trust" },
        ],
      }}
    >
      <WagmiProvider config={wagmiConfig}>
        <QueryClientProvider client={queryClient}>
          <DynamicWagmiConnector>
            <DynamicReadyContext.Provider value={true}>
              {children}
            </DynamicReadyContext.Provider>
          </DynamicWagmiConnector>
        </QueryClientProvider>
      </WagmiProvider>
    </DynamicContextProvider>
  );
}
