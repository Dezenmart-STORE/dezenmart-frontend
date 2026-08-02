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
import { useAuth } from "./AuthContext";
import {
  useGetWalletStatusQuery,
  useSetupWalletMutation,
  type WalletStatus,
} from "../store/api";
import { SMART_WALLET_ENABLED } from "../config/smartWallet";
import { TARGET_CHAIN } from "../config/chains";
import { useDynamicReady } from "../components/wallet/smart/dynamicReady";

// Dynamic-importing pieces are lazy so the SDK stays out of the default bundle.
const DynamicWalletBridge = lazy(
  () => import("../components/wallet/smart/DynamicWalletBridge")
);
const WalletSetupModal = lazy(
  () => import("../components/wallet/smart/WalletSetupModal")
);
const DynamicLogoutSync = lazy(
  () => import("../components/wallet/smart/DynamicLogoutSync")
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

  // Auto-open the "confirm it's you" setup once per session when a signed-in
  // user has no wallet yet. If they dismiss it, they can reopen it from Settings
  // via openWalletSetup(); we don't nag them on every render.
  const autoPrompted = useRef(false);
  const [setupOpen, setSetupOpen] = useState(false);
  const openWalletSetup = useCallback(() => setSetupOpen(true), []);
  useEffect(() => {
    if (phase === "needs-setup" && !autoPrompted.current) {
      autoPrompted.current = true;
      setSetupOpen(true);
    }
    // Once a wallet exists there's nothing to set up.
    if (phase === "ready") setSetupOpen(false);
  }, [phase]);

  const value: SmartWalletContextValue = {
    enabled: SMART_WALLET_ENABLED,
    status,
    phase,
    walletAddress: status?.walletAddress ?? null,
    registerEmbeddedWallet,
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

      {active && dynamicReady && setupOpen && (
        <Suspense fallback={null}>
          <WalletSetupModal email={user?.email} onClose={() => setSetupOpen(false)} />
        </Suspense>
      )}
    </SmartWalletContext.Provider>
  );
}
