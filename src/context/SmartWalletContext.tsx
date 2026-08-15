import {
  createContext,
  lazy,
  Suspense,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useAccount } from "wagmi";
import { useAuth } from "./AuthContext";
import {
  useGetWalletStatusQuery,
  useSetupWalletMutation,
  type WalletStatus,
} from "../store/api";
import { SMART_WALLET_ENABLED } from "../config/smartWallet";
import { TARGET_CHAIN } from "../config/chains";
import { useDynamicReady } from "../components/wallet/smart/dynamicReady";
import { lazyWithReload } from "../utils/lazyWithReload";
import { getWalletMode, consumeDezenSetupRequest } from "../config/walletMode";

/** Guards the once-per-session "Welcome back" reconnect prompt. */
const RECONNECT_ASKED_KEY = "dezen_reconnect_asked";

// Dynamic-importing pieces are lazy so the SDK stays out of the default bundle.
// lazyWithReload recovers from stale-deploy chunk 404s (e.g. after a redeploy a
// returning user's cached index.html points at an old DynamicWalletBridge hash).
const DynamicWalletBridge = lazyWithReload(
  () => import("../components/wallet/smart/DynamicWalletBridge"),
  "DynamicWalletBridge"
);
const WalletSetupModal = lazyWithReload(
  () => import("../components/wallet/smart/WalletSetupModal"),
  "WalletSetupModal"
);
const DynamicLogoutSync = lazyWithReload(
  () => import("../components/wallet/smart/DynamicLogoutSync"),
  "DynamicLogoutSync"
);

/**
 * Phases:
 *  - "disabled"    feature off (no env id) or signed out
 *  - "loading"     fetching wallet status
 *  - "needs-setup" authenticated but the embedded wallet isn't linked yet
 *                  (Dynamic provisions it, then the bridge links it - automatic)
 *  - "ready"       wallet linked; sign transactions via the embedded wallet
 *
 * Security & recovery are handled by Dynamic's passcode (per session), so there
 * is no PIN prompt here - the embedded wallet is just the active wagmi signer.
 */
export type SmartWalletPhase = "disabled" | "loading" | "needs-setup" | "ready";

interface SmartWalletContextValue {
  enabled: boolean;
  status: WalletStatus | undefined;
  phase: SmartWalletPhase;
  walletAddress: string | null;
  /** Called by the Dynamic bridge once the embedded wallet is available. */
  registerEmbeddedWallet: (address: string, dynamicUserId?: string) => void;
  /** True when the CURRENTLY connected wallet is the Dezen embedded wallet.
   *  Reported by the Dynamic bridge, so consumers (header, quick action) can
   *  tell Dezen from an external wallet without importing the Dynamic SDK. */
  isDezenWalletActive: boolean;
  /** Bridge-only: report whether the connected wallet is the embedded one. */
  setDezenWalletActive: (active: boolean) => void;
  refetchStatus: () => void;
  /** Re-open the "confirm it's you" wallet setup flow (e.g. from Settings). */
  openWalletSetup: () => void;
}

const SmartWalletContext = createContext<SmartWalletContextValue | null>(null);

export const useSmartWallet = (): SmartWalletContextValue => {
  const ctx = useContext(SmartWalletContext);
  if (!ctx) throw new Error("useSmartWallet must be used within SmartWalletContextProvider");
  return ctx;
};

export function SmartWalletContextProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, user } = useAuth();
  const active = SMART_WALLET_ENABLED && isAuthenticated;
  // True only once DynamicRoot (and its <DynamicContextProvider>) has mounted.
  // The bridge calls a Dynamic hook, so it must not render before this is true -
  // during the lazy-load Suspense fallback there is no provider and it throws.
  const dynamicReady = useDynamicReady();

  const {
    data: status,
    isLoading,
    isFetching,
    refetch,
  } = useGetWalletStatusQuery(undefined, { skip: !active });

  const [setupWallet] = useSetupWalletMutation();

  const phase: SmartWalletPhase = useMemo(() => {
    if (!active) return "disabled";
    if (isLoading || (!status && isFetching)) return "loading";
    if (!status?.hasWallet) return "needs-setup";
    return "ready";
  }, [active, isLoading, isFetching, status]);

  // Link the embedded wallet to the backend the first time it appears.
  const registerEmbeddedWallet = useCallback(
    (address: string, dynamicUserId?: string) => {
      if (!active || !address) return;
      if (status?.walletAddress?.toLowerCase() === address.toLowerCase()) return;
      setupWallet({
        walletAddress: address,
        chainId: TARGET_CHAIN.id,
        provider: "dynamic",
        dynamicUserId,
      })
        .unwrap()
        .catch(() => {
          /* reflected in wallet status; stay silent */
        });
    },
    [active, status?.walletAddress, setupWallet]
  );

  // Once per session, surface the wallet modal: "setup" (confirm it's you) for a
  // new user with no wallet, or "reconnect" (connecting to your existing wallet)
  // for a returning user whose wallet is already on the backend. Either can be
  // reopened later via openWalletSetup() (Settings / the Dezen Wallet option).
  // Whether the connected wallet is the Dezen embedded one (set by the bridge).
  const [isDezenWalletActive, setDezenWalletActive] = useState(false);
  const { isConnected, isConnecting, isReconnecting } = useAccount();

  const autoPrompted = useRef(false);
  const [modal, setModal] = useState<null | "setup" | "reconnect" | "connect">(null);
  // Manual open (Settings / the Dezen Wallet option after a disconnect) is a
  // deliberate "connect", distinct from the automatic "reconnect" at login.
  const openWalletSetup = useCallback(
    () => setModal(status?.hasWallet ? "connect" : "setup"),
    [status?.hasWallet]
  );
  useEffect(() => {
    if (autoPrompted.current) return;
    // Deliberate switch back to the Dezen wallet (we reloaded to get here), so
    // open the flow regardless of the once-per-session guard below.
    if (consumeDezenSetupRequest()) {
      autoPrompted.current = true;
      setModal(status?.hasWallet ? "connect" : "setup");
      return;
    }
    // Never auto-prompt while a wallet is connected or wagmi is still restoring
    // one. On reload wagmi reconnects the last wallet asynchronously; firing the
    // Dezen reconnect flow into that window hijacked an external wallet
    // (MetaMask) by connecting the embedded connector over it, which is why a
    // third-party wallet appeared to disconnect on every refresh.
    if (isConnecting || isReconnecting || isConnected) return;
    // Someone who chose a third-party wallet isn't waiting to be pulled back
    // into the Dezen wallet.
    if (getWalletMode() !== "dezen") return;

    if (phase === "needs-setup") {
      autoPrompted.current = true;
      setModal("setup");
    } else if (phase === "ready") {
      // "Welcome back" was reappearing on every refresh because the guard was
      // only a ref, which resets on reload. Ask at most once per browser
      // session; the wallet stays reachable from the wallet menu.
      autoPrompted.current = true;
      let askedAlready = false;
      try {
        askedAlready = sessionStorage.getItem(RECONNECT_ASKED_KEY) === "1";
      } catch {
        /* private mode */
      }
      if (askedAlready) return;
      try {
        sessionStorage.setItem(RECONNECT_ASKED_KEY, "1");
      } catch {
        /* private mode */
      }
      setModal("reconnect");
    }
  }, [phase, isConnected, isConnecting, isReconnecting]);

  const value: SmartWalletContextValue = {
    enabled: SMART_WALLET_ENABLED,
    status,
    phase,
    walletAddress: status?.walletAddress ?? null,
    registerEmbeddedWallet,
    isDezenWalletActive,
    setDezenWalletActive,
    refetchStatus: () => void refetch(),
    openWalletSetup,
  };

  return (
    <SmartWalletContext.Provider value={value}>
      {children}

      {active && dynamicReady && (
        <Suspense fallback={null}>
          <DynamicWalletBridge />
        </Suspense>
      )}

      {/* Not gated on auth: it must survive the authenticated -> logged-out
          transition to end the Dynamic session. */}
      {dynamicReady && (
        <Suspense fallback={null}>
          <DynamicLogoutSync />
        </Suspense>
      )}

      {active && dynamicReady && modal && (
        <Suspense fallback={null}>
          <WalletSetupModal
            mode={modal}
            email={user?.email}
            walletAddress={status?.walletAddress ?? null}
            onClose={() => setModal(null)}
          />
        </Suspense>
      )}
    </SmartWalletContext.Provider>
  );
}
