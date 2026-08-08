import { useSyncExternalStore } from "react";

/**
 * Which wallet stack owns wagmi.
 *
 *  - "dezen"    the Dezen embedded wallet. Dynamic must bridge it into wagmi,
 *               so DynamicWagmiConnector is mounted.
 *  - "external" a third-party wallet (MetaMask, Coinbase, ...). Plain wagmi with
 *               our own connectors; Dynamic stays out of the way.
 *
 * Why this exists: DynamicWagmiConnector is not a passive bridge. It overwrites
 * wagmi's connector list on every render
 * (`config._internal.connectors.setState(connector ? [connector] : [])`) and
 * force-disconnects wagmi whenever Dynamic holds no wallet. That makes every
 * wallet a Dynamic *identity*, which is what produced the information-capture
 * email prompt, the "Elevated access token required" guard, and third-party
 * wallets dropping on reload. Mounting it only for the embedded wallet removes
 * that whole class of problem instead of patching each symptom.
 */
export type WalletMode = "dezen" | "external";

const KEY = "dezen_wallet_mode";

const read = (): WalletMode => {
  try {
    return localStorage.getItem(KEY) === "external" ? "external" : "dezen";
  } catch {
    return "dezen";
  }
};

let current: WalletMode = read();
const listeners = new Set<() => void>();

export const getWalletMode = (): WalletMode => current;

export function setWalletMode(mode: WalletMode): void {
  if (mode === current) return;
  current = mode;
  try {
    localStorage.setItem(KEY, mode);
  } catch {
    /* private mode - in-memory only */
  }
  listeners.forEach((l) => l());
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};

export const useWalletMode = (): WalletMode =>
  useSyncExternalStore(
    subscribe,
    () => current,
    () => "dezen" as WalletMode
  );
