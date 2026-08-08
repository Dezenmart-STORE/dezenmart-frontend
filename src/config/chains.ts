import { http, createConfig, fallback } from "wagmi";
import { celo, celoSepolia } from "wagmi/chains";
import { coinbaseWallet, metaMask, walletConnect } from "wagmi/connectors";

// ---------------------------------------------------------------------------
// RPC endpoints with fallbacks for reliability
// ---------------------------------------------------------------------------
const RPC_ENDPOINTS = {
  [celo.id]: [
    "https://rpc.ankr.com/celo",
    "https://forno.celo.org",
    "https://celo-mainnet.public.blastapi.io",
  ],
  [celoSepolia.id]: ["https://forno.celo-sepolia.celo-testnet.org"],
} as const;

// ---------------------------------------------------------------------------
// Escrow contract addresses (per chain)
// ---------------------------------------------------------------------------
export const ESCROW_ADDRESSES: Record<number, string> = {
  [celo.id]: import.meta.env.VITE_ESCROW_CONTRACT_MAINNET ?? "",
  [celoSepolia.id]: import.meta.env.VITE_ESCROW_CONTRACT_TESTNET ?? "",
};

export function getEscrowAddress(chainId: number): string {
  const addr = ESCROW_ADDRESSES[chainId];
  if (!addr) throw new Error(`No escrow address for chain ${chainId}`);
  return addr;
}

// ---------------------------------------------------------------------------
// Block explorer URLs
// ---------------------------------------------------------------------------
const EXPLORER_URLS: Record<number, string> = {
  [celo.id]: "https://celo.blockscout.com",
  [celoSepolia.id]: "https://celo-sepolia.blockscout.com",
};

export function getExplorerUrl(
  chainId: number,
  hash: string,
  type: "tx" | "address" = "tx"
): string {
  const base = EXPLORER_URLS[chainId] ?? EXPLORER_URLS[celo.id];
  return `${base}/${type}/${hash}`;
}

// ---------------------------------------------------------------------------
// Target chain (production default)
// ---------------------------------------------------------------------------
export const TARGET_CHAIN = celo;
export const SUPPORTED_CHAINS = [celo, celoSepolia] as const;

// ---------------------------------------------------------------------------
// Wagmi config - single source of truth for wallet connectivity
// ---------------------------------------------------------------------------
export const appMeta = {
  name: "Dezenmart",
  url: typeof window !== "undefined" ? window.location.origin : "",
  logo: typeof window !== "undefined"
    ? `${window.location.origin}/images/logo-full.png`
    : "",
};

export const wagmiConfig = createConfig({
  chains: [celo, celoSepolia],
  connectors: [
    // Smart Wallet - email / passkey / phone (best for Web2 users)
    coinbaseWallet({
      appName: appMeta.name,
      appLogoUrl: appMeta.logo,
      preference: "smartWalletOnly",
    }),
    // Coinbase Wallet - traditional browser extension / mobile app
    coinbaseWallet({
      appName: appMeta.name,
      appLogoUrl: appMeta.logo,
      preference: "eoaOnly",
    }),
    metaMask({
      dappMetadata: { name: appMeta.name, url: appMeta.url },
      enableAnalytics: false,
    }),
    ...(import.meta.env.VITE_WALLETCONNECT_PROJECT_ID
      ? [
          walletConnect({
            projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID,
            metadata: {
              name: appMeta.name,
              description:
                "Decentralized marketplace for secure crypto payments",
              url: appMeta.url,
              icons: [appMeta.logo],
            },
            showQrModal: true,
            qrModalOptions: {
              themeMode: "dark" as const,
              themeVariables: {
                "--wcm-z-index": "9999",
                "--wcm-accent-color": "#FF3B30",
              },
              explorerRecommendedWalletIds: [
                "c57ca95b47569778a828d19178114f4db188b89b763c899ba0be274e97267d96",
                "fd20dc426fb37566d803205b19bbc1d4096b248ac04548e3cfb6b3a38bd033aa",
                "4622a2b2d6af1c9844944291e5e7351a6aa24cd7b23099efac1b2fd875da31a0",
              ],
              enableExplorer: true,
            },
            isNewChainsStale: false,
          }),
        ]
      : []),
  ],
  transports: {
    [celo.id]: fallback(
      RPC_ENDPOINTS[celo.id].map((url) =>
        http(url, { batch: { wait: 100 }, retryCount: 2, retryDelay: 1000, timeout: 30_000 })
      )
    ),
    [celoSepolia.id]: fallback(
      RPC_ENDPOINTS[celoSepolia.id].map((url) =>
        http(url, { batch: { wait: 100 }, retryCount: 2, retryDelay: 1000, timeout: 30_000 })
      )
    ),
  },
  pollingInterval: 12_000,
  syncConnectedChain: true,
});


export const CHAIN_IDS = {
  CELO: celo.id,
  CELO_SEPOLIA: celoSepolia.id,
} as const;

// ---------------------------------------------------------------------------
// Default registered logistics provider
// This address is registered on-chain via registerLogisticsProvider.
// Used as fallback when an order has no logistics provider set.
// ---------------------------------------------------------------------------
export const DEFAULT_LOGISTICS_PROVIDER =
  "0x0c9db90a95a78bf6d9b2448fde00210f36ba61e4" as `0x${string}`;
