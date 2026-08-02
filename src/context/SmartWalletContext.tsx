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
import WalletWelcomeModal from "../components/wallet/smart/WalletWelcomeModal";

// Dynamic-importing bridge is lazy so the SDK stays out of the default bundle.
const DynamicWalletBridge = lazy(
  () => import("../components/wallet/smart/DynamicWalletBridge")
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
}

const SmartWalletContext = createContext<SmartWalletContextValue | null>(null);

export const useSmartWallet = (): SmartWalletContextValue => {
  const ctx = useContext(SmartWalletContext);
  if (!ctx) throw new Error("useSmartWallet must be used within SmartWalletContextProvider");
  return ctx;
};

export function SmartWalletContextProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
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

  // Welcome is shown to genuinely new users only: those who pass through
  // "needs-setup" this session. Returning users start at "ready" and never see it.
  const wasNew = useRef(false);
  const [showWelcome, setShowWelcome] = useState(false);
  useEffect(() => {
    if (phase === "needs-setup") {
      wasNew.current = true;
      setShowWelcome(true);
    }
  }, [phase]);

  const value: SmartWalletContextValue = {
    enabled: SMART_WALLET_ENABLED,
    status,
    phase,
    walletAddress: status?.walletAddress ?? null,
    registerEmbeddedWallet,
    refetchStatus: () => void refetch(),
  };

  return (
    <SmartWalletContext.Provider value={value}>
      {children}

      {active && dynamicReady && (
        <Suspense fallback={null}>
          <DynamicWalletBridge />
        </Suspense>
      )}

      {active && showWelcome && wasNew.current && (phase === "needs-setup" || phase === "ready") && (
        <WalletWelcomeModal
          provisioning={phase !== "ready"}
          walletAddress={status?.walletAddress ?? null}
          onClose={() => setShowWelcome(false)}
        />
      )}
    </SmartWalletContext.Provider>
  );
}
