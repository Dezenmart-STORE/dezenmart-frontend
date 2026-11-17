import { http, createConfig, fallback } from "wagmi";
import { celo, celoSepolia } from "wagmi/chains";
import { coinbaseWallet } from "wagmi/connectors";
import { connectorsForWallets } from "@rainbow-me/rainbowkit";
import {
  metaMaskWallet,
  coinbaseWallet as rkCoinbaseWallet,
  trustWallet,
  valoraWallet,
  walletConnectWallet,
} from "@rainbow-me/rainbowkit/wallets";

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

const WC_PROJECT_ID = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID as string | undefined;

/**
 * External wallet connectors, built by RainbowKit.
 *
 * RainbowKit owns the third-party connect experience (install/QR/mobile
 * deep-links, real wallet icons, "not installed" states) - hand-rolling that
 * list was where our own version kept breaking. RainbowKit is now the only
 * way to connect - the Dynamic embedded wallet has been removed.
 *
 * WalletConnect-backed wallets need a project id, so they're only offered when
 * one is configured. Coinbase works without it via its own SDK.
 */
const rkOptions = {
  appName: appMeta.name,
  appUrl: appMeta.url,
  appIcon: appMeta.logo,
  // RainbowKit requires the field; wallets that don't need it ignore it.
  projectId: WC_PROJECT_ID ?? "",
};

/**
 * MetaMask runs on its injected provider when the extension (or MetaMask's own
 * browser) is present. Everywhere else - most phones - RainbowKit's MetaMask
 * option connects over WalletConnect, so it is deferred with the WalletConnect
 * wallets below. Without a project id it can't use WalletConnect at all, so it
 * stays in the startup list as before.
 */
const metaMaskInjected = (() => {
  if (typeof window === "undefined") return false;
  const eth = window.ethereum as
    | { isMetaMask?: boolean; providers?: { isMetaMask?: boolean }[] }
    | undefined;
  return Boolean(eth?.isMetaMask || eth?.providers?.some((p) => p?.isMetaMask));
})();
const deferMetaMask = !metaMaskInjected && !!WC_PROJECT_ID;

const externalConnectors = connectorsForWallets(
  [
    {
      groupName: "Recommended",
      wallets: deferMetaMask ? [rkCoinbaseWallet] : [metaMaskWallet, rkCoinbaseWallet],
    },
  ],
  rkOptions
);

/**
 * WalletConnect-backed wallets (MetaMask without its extension, Valora, Trust,
 * the QR option) are NOT in the initial config. wagmi's WalletConnect connector
 * starts its provider in setup(), the moment it is registered: ~245 KB gzipped
 * of JavaScript and a relay connection on every page load, for every visitor.
 * They are registered on demand by ensureWalletConnectWallets() instead - when
 * the wallet picker opens, or at startup only for a visitor whose last wallet
 * was one of them.
 */
const deferredMetaMaskFns = deferMetaMask
  ? connectorsForWallets([{ groupName: "Recommended", wallets: [metaMaskWallet] }], rkOptions)
  : [];
const walletConnectConnectorFns = WC_PROJECT_ID
  ? connectorsForWallets(
      [{ groupName: "Recommended", wallets: [valoraWallet, trustWallet, walletConnectWallet] }],
      rkOptions
    )
  : [];

/**
 * The connector id a WalletConnect-based wallet is saved under as the
 * last-used one. RainbowKit builds every such wallet on wagmi's walletConnect
 * connector and only adds rkDetails, so they all share this id.
 */
export const WALLETCONNECT_CONNECTOR_IDS: ReadonlySet<string> = new Set(["walletConnect"]);

let walletConnectRegistered = false;

/**
 * Register the deferred wallets with wagmi, once. Safe to call repeatedly.
 * Uses the same internal registry wagmi uses for wallets it discovers itself
 * (EIP-6963), and RainbowKit reads the connector list reactively, so the
 * wallets appear in an open picker straight away. MetaMask goes back to the
 * front of the RainbowKit group and the rest after it, so the picker keeps its
 * original order: MetaMask, Coinbase, Valora, Trust, WalletConnect.
 */
export function ensureWalletConnectWallets(): void {
  if (walletConnectRegistered) return;
  if (deferredMetaMaskFns.length === 0 && walletConnectConnectorFns.length === 0) return;
  walletConnectRegistered = true;
  const registry = wagmiConfig._internal.connectors;
  const metaMask = deferredMetaMaskFns.map((fn) => registry.setup(fn));
  const rest = walletConnectConnectorFns.map((fn) => registry.setup(fn));
  registry.setState((current) => {
    const firstRk = current.findIndex((c) => "rkDetails" in c);
    const at = firstRk === -1 ? current.length : firstRk;
    return [...current.slice(0, at), ...metaMask, ...current.slice(at), ...rest];
  });
}

export const wagmiConfig = createConfig({
  chains: [celo, celoSepolia],
  connectors: [
    // Coinbase Smart Wallet - email / passkey, kept for the Web2 path.
    coinbaseWallet({
      appName: appMeta.name,
      appLogoUrl: appMeta.logo,
      preference: "smartWalletOnly",
    }),
    ...externalConnectors,
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
