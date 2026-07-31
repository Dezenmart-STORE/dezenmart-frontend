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
import WalletOnboardingModal from "../components/wallet/smart/WalletOnboardingModal";
import PinPromptModal from "../components/wallet/smart/PinPromptModal";
import PinResetModal from "../components/wallet/smart/PinResetModal";

// Dynamic-importing bridge is lazy so the SDK stays out of the default bundle.
const DynamicWalletBridge = lazy(
  () => import("../components/wallet/smart/DynamicWalletBridge")
);

/**
 * Phases:
 *  - "disabled"    feature off (no env id) or user signed out
 *  - "loading"     fetching wallet status
 *  - "needs-setup" authenticated but no embedded wallet linked yet (new user)
 *  - "needs-pin"   wallet exists but no PIN set (resume onboarding)
 *  - "ready"       wallet + PIN set
 */
export type SmartWalletPhase =
  | "disabled"
  | "loading"
  | "needs-setup"
  | "needs-pin"
  | "ready";

interface SmartWalletContextValue {
  enabled: boolean;
  status: WalletStatus | undefined;
  phase: SmartWalletPhase;
  walletAddress: string | null;
  /** Called by the Dynamic bridge once the embedded wallet is available. */
  registerEmbeddedWallet: (address: string, dynamicUserId?: string) => void;
  /** Open the set-PIN onboarding UI. */
  startOnboarding: () => void;
  /** Open the forgot-PIN reset flow. */
  startPinReset: () => void;
  /**
   * Require the user's PIN before a transaction. Resolves with a short-lived
   * txAuthToken from the backend, or rejects if the user cancels.
   */
  authorizeTransaction: () => Promise<string>;
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

  const {
    data: status,
    isLoading,
    isFetching,
    refetch,
  } = useGetWalletStatusQuery(undefined, { skip: !active });

  const [setupWallet] = useSetupWalletMutation();

  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [pinPromptOpen, setPinPromptOpen] = useState(false);

  // Promise plumbing for the imperative authorizeTransaction() flow.
  const pinResolver = useRef<{ resolve: (t: string) => void; reject: (e: unknown) => void } | null>(
    null
  );

  const phase: SmartWalletPhase = useMemo(() => {
    if (!active) return "disabled";
    if (isLoading || (!status && isFetching)) return "loading";
    if (!status?.hasWallet) return "needs-setup";
    if (!status.walletPinSet) return "needs-pin";
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
          /* surfaced via wallet status; keep silent here */
        });
    },
    [active, status?.walletAddress, setupWallet]
  );

  // Nudge the user through setup once their wallet needs a PIN or linking.
  useEffect(() => {
    if (phase === "needs-setup" || phase === "needs-pin") {
      setShowOnboarding(true);
    } else if (phase === "ready" || phase === "disabled") {
      setShowOnboarding(false);
    }
  }, [phase]);

  const authorizeTransaction = useCallback(
    () =>
      new Promise<string>((resolve, reject) => {
        pinResolver.current = { resolve, reject };
        setPinPromptOpen(true);
      }),
    []
  );

  const handlePinVerified = useCallback((txAuthToken: string) => {
    setPinPromptOpen(false);
    pinResolver.current?.resolve(txAuthToken);
    pinResolver.current = null;
  }, []);

  const handlePinCancelled = useCallback(() => {
    setPinPromptOpen(false);
    pinResolver.current?.reject(new Error("PIN entry cancelled"));
    pinResolver.current = null;
  }, []);

  const value: SmartWalletContextValue = {
    enabled: SMART_WALLET_ENABLED,
    status,
    phase,
    walletAddress: status?.walletAddress ?? null,
    registerEmbeddedWallet,
    startOnboarding: () => setShowOnboarding(true),
    startPinReset: () => setShowReset(true),
    authorizeTransaction,
    refetchStatus: () => void refetch(),
  };

  return (
    <SmartWalletContext.Provider value={value}>
      {children}

      {active && (
        <Suspense fallback={null}>
          <DynamicWalletBridge />
        </Suspense>
      )}

      {active && (showOnboarding && phase !== "ready") && (
        <WalletOnboardingModal
          phase={phase}
          securityQuestion={status?.securityQuestion}
          onClose={() => setShowOnboarding(false)}
          onDone={() => {
            setShowOnboarding(false);
            refetch();
          }}
        />
      )}

      {active && pinPromptOpen && (
        <PinPromptModal
          onVerified={handlePinVerified}
          onCancel={handlePinCancelled}
          onForgot={() => {
            handlePinCancelled();
            setShowReset(true);
          }}
        />
      )}

      {active && showReset && (
        <PinResetModal
          securityQuestion={status?.securityQuestion}
          onClose={() => setShowReset(false)}
          onDone={() => {
            setShowReset(false);
            refetch();
          }}
        />
      )}
    </SmartWalletContext.Provider>
  );
}
