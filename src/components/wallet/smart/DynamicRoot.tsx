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
// !important so these win over the accent colour the Dynamic dashboard injects
// at runtime. NOTE: the password-setup illustrations (shield/key/checkmark) are
// baked SVGs tinted by the dashboard brand colour - to turn those red as well,
// set the accent colour to #dc2626 in the Dynamic dashboard's Design tab. These
// overrides recolour the buttons, links and badges.
const DYNAMIC_CSS_OVERRIDES = `
  :host, .dynamic-shadow-dom, .dynamic-shadow-dom *, .dynamic-widget-inline-controls {
    --dynamic-brand-primary-color: ${RED} !important;
    --dynamic-brand-hover-color: ${RED_HOVER} !important;
    --dynamic-brand-secondary-color: ${RED_SOFT} !important;
    --dynamic-button-primary-background: ${RED} !important;
    --dynamic-button-primary-hover: ${RED_HOVER} !important;
    --dynamic-button-primary-border: ${RED} !important;
    --dynamic-button-secondary-hover: ${RED_HOVER} !important;
    --dynamic-connect-button-background: ${RED} !important;
    --dynamic-connect-button-background-hover: ${RED_HOVER} !important;
    --dynamic-connect-button-color: #ffffff !important;
    --dynamic-text-link: ${RED_SOFT} !important;
    --dynamic-badge-background: rgba(220, 38, 38, 0.15) !important;
    --dynamic-badge-dot-background: ${RED} !important;
    --dynamic-badge-primary-background: rgba(220, 38, 38, 0.15) !important;
    --dynamic-badge-primary-color: #f87171 !important;
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
        // Require an explicit confirmation on EVERY transaction. For the Dezen
        // (embedded) wallet, Dynamic gates that confirmation behind the user's
        // passcode per the dashboard security policy - so every payment must be
        // passcode-authorised. Dynamic verifies the passcode itself and only
        // signs on success; a wrong/cancelled passcode rejects the transaction.
        // NOTE: the passcode requirement itself is turned on in the Dynamic
        // dashboard (Embedded wallet -> Security -> require passcode per
        // transaction). This flag ensures the confirmation view always appears.
        transactionConfirmation: { required: true },
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
