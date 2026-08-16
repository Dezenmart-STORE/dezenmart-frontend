import type { ReactNode } from "react";
import { DynamicContextProvider } from "@dynamic-labs/sdk-react-core";
import { EthereumWalletConnectors } from "@dynamic-labs/ethereum";
import { DynamicWagmiConnector } from "@dynamic-labs/wagmi-connector";
import { WagmiProvider } from "wagmi";
import { QueryClientProvider } from "@tanstack/react-query";
import { wagmiConfig, TARGET_CHAIN } from "../../../config/chains";
import { queryClient } from "../../../config/queryClient";
import { DYNAMIC_ENV_ID } from "../../../config/smartWallet";
import { DynamicReadyContext } from "./dynamicReady";
import { useWalletMode } from "../../../config/walletMode";
import { RainbowKitProvider, darkTheme } from "@rainbow-me/rainbowkit";
import "@rainbow-me/rainbowkit/styles.css";

// RainbowKit's modal, themed to DezenMart (dark + brand red).
const rkTheme = darkTheme({
  accentColor: "#dc2626",
  accentColorForeground: "#ffffff",
  borderRadius: "large",
  overlayBlur: "small",
});

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
// Celo mainnet is the ONLY network DezenMart settles on. Filter the dashboard's
// list so external wallets can't be pointed at Ethereum or a Celo testnet from
// Dynamic's network switcher. Declared at module scope so its identity is stable
// (see DYNAMIC_SETTINGS below).
const onlyTargetChain = <T extends { chainId: number | string }>(dashboardNetworks: T[]): T[] =>
  dashboardNetworks.filter((n) => Number(n.chainId) === TARGET_CHAIN.id);

/**
 * Frozen at module scope, NOT rebuilt per render.
 *
 * This object used to be an inline literal. Every DynamicRoot render produced a
 * new `settings` (and a new `overrides.evmNetworks` closure), so
 * DynamicContextProvider saw changed props every time and re-ran its
 * initialisation, which re-rendered DynamicRoot, which built another new object.
 * That self-sustaining loop re-rendered the whole app several times a second:
 * it reset transient UI state (the connect modal closed the instant it opened),
 * and it re-requested the user's avatar continuously until Google replied 429.
 *
 * Nothing here depends on props or state, so a module constant is the simplest
 * way to guarantee referential stability.
 */
const DYNAMIC_SETTINGS = {
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
  // DISABLED because it made payments impossible on the Dezen wallet.
  //
  // With this on, Dynamic intercepts every write and renders its own confirm
  // dialog. Pressing Send there (`onClickSend` in the stack trace) makes Dynamic
  // REBUILD the transaction from its own state rather than forwarding ours, and
  // on Celo it produces one carrying both gasPrice and maxFeePerGas. viem then
  // refuses it before signing:
  //   `maxFeePerGas`/`maxPriorityFeePerGas` is not a valid Legacy Transaction
  //   attribute
  // Because the rebuild happens inside the SDK, no call-site parameter can
  // prevent it - pinning type:"legacy" and type:"eip1559" at both write sites
  // were each tried and each failed with the identical error.
  //
  // Passcode enforcement is NOT lost: that is a dashboard policy (Embedded
  // wallet -> Security -> require passcode per transaction), which Dynamic
  // applies when signing regardless of this flag. This flag only controlled
  // whether Dynamic's own confirmation view was force-shown.
  transactionConfirmation: { required: false },
  // Connecting a wallet must NOT sign it up as a Dynamic user. Dynamic's
  // information-capture step then demands an email ("We need a bit of
  // information" -> "Email already exists"), which is meaningless here: the
  // person is already signed in to DezenMart with Google, and we only need the
  // wallet as a signer. The Dezen embedded wallet is unaffected - it
  // authenticates explicitly through the email OTP flow.
  initialAuthenticationMode: "connect-only" as const,
  overrides: { evmNetworks: onlyTargetChain },
};

export default function DynamicRoot({ children }: { children: ReactNode }) {
  const mode = useWalletMode();

  // NOTE: we deliberately do NOT swap wagmi's connectors at runtime any more.
  // Replacing the list mid-session detached the live connection from its
  // connector, so disconnecting threw "n.disconnect is not a function". The mode
  // is persisted and switching reloads the page, so each stack owns wagmi from
  // boot and no swapping is needed.

  return (
    <DynamicContextProvider theme="dark" settings={DYNAMIC_SETTINGS}>
      <WagmiProvider config={wagmiConfig}>
        <QueryClientProvider client={queryClient}>
          {/* Only bridge Dynamic into wagmi for the embedded Dezen wallet. For a
              third-party wallet we leave wagmi alone: DynamicWagmiConnector
              replaces wagmi's connector list with its own and disconnects wagmi
              whenever Dynamic holds no wallet, which turned every external
              wallet into a Dynamic identity (email capture, elevated-token
              guard) and dropped it on reload. Dynamic's context stays mounted
              either way, so the Dezen wallet flows remain available. */}
          {/* RainbowKit is mounted in both modes: unlike DynamicWagmiConnector
              it doesn't take over wagmi, it just provides the connect modal, so
              useConnectModal() is available even while the Dezen wallet holds
              the connection. */}
          <RainbowKitProvider theme={rkTheme} modalSize="compact" initialChain={TARGET_CHAIN}>
            {mode === "dezen" ? (
              <DynamicWagmiConnector>
                <DynamicReadyContext.Provider value={true}>
                  {children}
                </DynamicReadyContext.Provider>
              </DynamicWagmiConnector>
            ) : (
              <DynamicReadyContext.Provider value={true}>
                {children}
              </DynamicReadyContext.Provider>
            )}
          </RainbowKitProvider>
        </QueryClientProvider>
      </WagmiProvider>
    </DynamicContextProvider>
  );
}
