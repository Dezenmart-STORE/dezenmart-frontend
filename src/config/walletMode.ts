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

/**
 * Switching stacks is done with a reload rather than by swapping wagmi's
 * connectors in place.
 *
 * DynamicWagmiConnector rewrites `config._internal.connectors` on every render
 * and never restores them, so hot-swapping raced it: the picker rendered
 * against a stale or empty list ("Connector not found", every wallet greyed
 * out). Reloading lets the app boot cleanly into one stack or the other, since
 * the mode is already persisted. This flag survives the reload so we can drop
 * the user straight back into the wallet picker.
 */
const PICKER_KEY = "dezen_open_wallet_picker";

export function requestExternalPicker(): void {
  try {
    sessionStorage.setItem(PICKER_KEY, "1");
  } catch {
    /* private mode */
  }
}

/** Peek without consuming, so an opener can decide to show the modal. */
export function hasExternalPickerRequest(): boolean {
  try {
    return sessionStorage.getItem(PICKER_KEY) === "1";
  } catch {
    return false;
  }
}

/** True once, if a picker was requested before the reload. */
export function consumeExternalPickerRequest(): boolean {
  try {
    if (sessionStorage.getItem(PICKER_KEY) !== "1") return false;
    sessionStorage.removeItem(PICKER_KEY);
    return true;
  } catch {
    return false;
  }
}

export const useWalletMode = (): WalletMode =>
  useSyncExternalStore(
    subscribe,
    () => current,
    () => "dezen" as WalletMode
  );
