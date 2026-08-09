import { useEffect, useMemo, useState, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { lazyWithReload } from "../../utils/lazyWithReload";
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { useAccount, useDisconnect } from "wagmi";
import { WalletButton } from "@rainbow-me/rainbowkit";
import { setWalletMode } from "../../config/walletMode";
import {
  RiShieldCheckLine,
  RiCheckLine,
  RiLoader4Line,
  RiErrorWarningLine,
  RiArrowLeftLine,
  RiInformationLine,
} from "react-icons/ri";
import { useModalPresence } from "../../utils/modalPresence";
import { useAuth } from "../../context/AuthContext";
import { useSmartWallet } from "../../context/SmartWalletContext";
import { TARGET_CHAIN } from "../../config/chains";
import { getFundGuide } from "./walletFundGuides";
import DezenWalletIcon from "./DezenWalletIcon";

interface Props {
  onClose: () => void;
}

// In-app bridge (heavy) - lazy, its own chunk, only when a user chooses to move
// funds. Env-gated so it's inert until VITE_SQUID_INTEGRATOR_ID is set.
const SQUID_ENABLED = !!(import.meta.env.VITE_SQUID_INTEGRATOR_ID as string | undefined)?.trim();
const SquidBridgeModal = lazyWithReload(() => import("./SquidBridgeModal"), "SquidBridgeModal");

// RainbowKit wallet ids, matching what config/chains.ts registers. We render
// these inside our own modal (via WalletButton.Custom) rather than opening
// RainbowKit's picker: that keeps our copy and layout, and avoids its "Get a
// Wallet" page, which shipped empty.
const WALLET_IDS = ["metaMask", "coinbase", "valora", "trust", "walletConnect"];

/** RainbowKit gives iconUrl as either a string or a lazy async loader. */
type RkIcon = string | (() => Promise<string>) | undefined;

function useResolvedIcon(icon: RkIcon): string | undefined {
  const [src, setSrc] = useState<string | undefined>(
    typeof icon === "string" ? icon : undefined
  );
  useEffect(() => {
    let alive = true;
    if (typeof icon === "string") {
      setSrc(icon);
    } else if (typeof icon === "function") {
      // Most wallets ship the icon as a lazy import, which is why rendering
      // iconUrl directly left the tiles blank.
      Promise.resolve(icon())
        .then((url) => alive && setSrc(url))
        .catch(() => {});
    }
    return () => {
      alive = false;
    };
  }, [icon]);
  return src;
}

/** Wallet logo with a lettered fallback while it resolves. */
function WalletIcon({ icon, name, className = "h-7 w-7" }: { icon: RkIcon; name: string; className?: string }) {
  const src = useResolvedIcon(icon);
  if (!src) {
    return (
      <span className={`flex ${className} items-center justify-center rounded-md bg-[#3A3A3C] text-xs font-bold text-gray-200`}>
        {name.charAt(0)}
      </span>
    );
  }
  return <img src={src} alt="" className={`${className} rounded-md object-contain`} />;
}


type Step =
  | { kind: "list" }
  | { kind: "connecting"; name: string }
  | { kind: "wallets" }
  | { kind: "guide"; walletKey: string; name: string }
  | { kind: "error"; message: string };

export default function DynamicConnectModal({ onClose }: Props) {
  useModalPresence();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { openWalletSetup } = useSmartWallet();
  const { sdkHasLoaded, user, handleLogOut } = useDynamicContext();
  const { isConnected } = useAccount();
  const { disconnectAsync } = useDisconnect();

  const [step, setStep] = useState<Step>({ kind: "list" });

  const chooseDezenWallet = () => {
    if (!isAuthenticated) {
      onClose();
      navigate("/login");
      return;
    }
    // Hand wagmi back to Dynamic so it can bridge the embedded wallet in.
    setWalletMode("dezen");
    onClose();
    openWalletSetup();
  };

  /**
   * Hand off to RainbowKit for third-party wallets. It owns the whole
   * experience from here: wallet list, install prompts, QR and mobile
   * deep-links, and connection errors.
   */
  const useAnotherWallet = async () => {
    // End the Dezen (Dynamic) wallet session first. While one is authenticated,
    // attaching another wallet counts as LINKING it to the Dynamic account,
    // which triggers the information-capture email prompt and the "Elevated
    // access token required" guard. The DezenMart login is untouched and the
    // Dezen Wallet stays on the account, so it can be reconnected any time.
    if (user) {
      try {
        await handleLogOut();
      } catch {
        /* non-fatal */
      }
    } else if (isConnected) {
      try {
        await disconnectAsync();
      } catch {
        /* non-fatal */
      }
    }

    // Unmounts DynamicWagmiConnector and restores our own connectors, so the
    // external wallet is a plain wagmi connection that persists on its own.
    setWalletMode("external");
    setStep({ kind: "wallets" });
  };

  return (
    <Shell
      onClose={onClose}
      title={
        step.kind === "guide"
          ? "Almost done"
          : step.kind === "wallets"
          ? "Choose your wallet"
          : "Connect a wallet"
      }
      subtitle={
        step.kind === "guide"
          ? undefined
          : step.kind === "wallets"
          ? "We'll switch it to Celo once it's connected"
          : "Choose how you'd like to connect"
      }
      onBack={
        step.kind === "connecting" || step.kind === "error" || step.kind === "wallets"
          ? () => setStep({ kind: "list" })
          : undefined
      }
    >
      {step.kind === "wallets" ? (
        <div className="space-y-2">
          {WALLET_IDS.map((id) => (
            <WalletButton.Custom key={id} wallet={id}>
              {({ ready, connect, connector: rawConnector }) => {
                // RainbowKit's public type omits the display fields it actually
                // provides at runtime.
                const connector = rawConnector as unknown as {
                  name?: string;
                  iconUrl?: string | (() => Promise<string>);
                  installed?: boolean;
                };
                return (
                <button
                  onClick={() => {
                    void connect();
                    onClose();
                  }}
                  disabled={!ready}
                  className="group flex w-full items-center gap-3 rounded-xl border border-[#292B30] bg-[#292B30] p-3.5 text-left transition-all hover:border-[#373A3F] hover:bg-[#373A3F] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#1a1c20]">
                    <WalletIcon icon={connector?.iconUrl} name={connector?.name ?? id} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-white">{connector?.name ?? id}</p>
                    <p className="text-xs text-gray-500">
                      {connector?.installed ? "Detected, tap to connect" : "Connect this wallet"}
                    </p>
                  </div>
                  <svg className="h-4 w-4 flex-shrink-0 text-gray-600 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
                );
              }}
            </WalletButton.Custom>
          ))}
        </div>
      ) : step.kind === "guide" ? (
        <GuideView name={step.name} walletKey={step.walletKey} onDone={onClose} />
      ) : step.kind === "connecting" ? (
        <Centered>
          <RiLoader4Line className="animate-spin text-2xl text-red-500" />
          <p className="text-sm text-gray-300">Connecting {step.name}…</p>
          <p className="text-xs text-gray-500">
            Approve the request in your wallet, then we'll switch it to Celo. Your Dezen Wallet stays on your
            account and you can switch back any time.
          </p>
        </Centered>
      ) : step.kind === "error" ? (
        <Centered>
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/15">
            <RiErrorWarningLine className="text-2xl text-red-400" />
          </div>
          <p className="text-sm text-gray-400">{step.message}</p>
          <button onClick={() => setStep({ kind: "list" })} className="mt-1 text-sm font-medium text-red-400 hover:text-red-300">
            Back to wallets
          </button>
        </Centered>
      ) : (
        <div className="space-y-4">
          {/* Hero: Dezen Wallet (recommended) */}
          <button
            onClick={chooseDezenWallet}
            className="group w-full rounded-2xl border-2 border-red-700/50 bg-gradient-to-br from-red-900/20 to-[#292B30] p-4 text-left transition-all hover:border-red-600/70 hover:from-red-900/30"
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-[#1a1c20] ring-1 ring-red-800/40">
                <DezenWalletIcon className="h-8 w-8" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-bold text-white">Dezen Wallet</span>
                  <span className="inline-flex items-center gap-1 rounded-full border border-red-700/50 bg-red-900/40 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-red-300">
                    <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
                    Recommended
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-gray-400">Your secure in-app wallet. No app or extension, already on Celo.</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {["No seed phrase", "Works in-browser", "Email confirm"].map((p) => (
                    <span key={p} className="rounded-full bg-[#1a1c20] px-2 py-0.5 text-[10px] text-gray-500">{p}</span>
                  ))}
                </div>
              </div>
              <RiShieldCheckLine className="mt-1 flex-shrink-0 text-lg text-red-500" />
            </div>
          </button>

          {/* Celo network notice */}
          <div className="flex items-start gap-2.5 rounded-xl border border-amber-800/40 bg-amber-900/15 p-3">
            <RiInformationLine className="mt-0.5 flex-shrink-0 text-amber-400" />
            <p className="text-xs leading-relaxed text-amber-200/90">
              DezenMart runs on the <span className="font-semibold">Celo</span> network. When you connect an external
              wallet we'll switch it to Celo. Funds on other networks won't be usable here until you move them to Celo,
              and we'll show you how right after.
            </p>
          </div>

          {/* Third-party wallets: RainbowKit owns this list and its edge cases
              (installed vs not, QR, mobile deep-links, real wallet icons). */}
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-[#292B30]" />
            <span className="text-[11px] font-medium text-gray-600">Or use another wallet</span>
            <div className="h-px flex-1 bg-[#292B30]" />
          </div>
          <button
            onClick={useAnotherWallet}
            className="group flex w-full items-center gap-3 rounded-xl border border-[#292B30] bg-[#292B30] p-3.5 text-left transition-all hover:border-[#373A3F] hover:bg-[#373A3F]"
          >
            {/* Stacked real wallet logos, so the supported wallets are obvious
                before opening the list. */}
            <div className="flex flex-shrink-0 -space-x-2.5">
              {WALLET_IDS.slice(0, 4).map((id) => (
                <WalletButton.Custom key={id} wallet={id}>
                  {({ connector }) => {
                    const c = connector as unknown as { name?: string; iconUrl?: RkIcon };
                    return (
                      <span className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-[#1a1c20] ring-2 ring-[#292B30]">
                        <WalletIcon icon={c?.iconUrl} name={c?.name ?? id} className="h-6 w-6" />
                      </span>
                    );
                  }}
                </WalletButton.Custom>
              ))}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white">Connect another wallet</p>
              <p className="text-xs text-gray-500">MetaMask, Coinbase, Valora, Trust and more</p>
            </div>
            <svg className="h-4 w-4 flex-shrink-0 text-gray-600 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          {!sdkHasLoaded && (
            <p className="text-center text-xs text-gray-600">Loading wallets…</p>
          )}
        </div>
      )}
    </Shell>
  );
}

// ---------- Post-connect fund guide ----------

function GuideView({ name, walletKey, onDone }: { name: string; walletKey: string; onDone: () => void }) {
  const guide = getFundGuide(walletKey || name);
  const [showBridge, setShowBridge] = useState(false);
  const canBridge = SQUID_ENABLED && !guide.alreadyOnCelo;
  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <div className={`flex h-9 w-9 items-center justify-center rounded-full ${guide.alreadyOnCelo ? "bg-green-500/15" : "bg-amber-500/15"}`}>
          {guide.alreadyOnCelo ? <RiCheckLine className="text-green-400" /> : <RiInformationLine className="text-amber-400" />}
        </div>
        <h3 className="text-sm font-bold text-white">{guide.title}</h3>
      </div>
      <p className="text-sm text-gray-400">{guide.intro}</p>

      <ol className="mt-4 space-y-2.5">
        {guide.steps.map((s, i) => (
          <li key={i} className="flex gap-3">
            <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-[#292B30] text-[11px] font-bold text-gray-300">
              {i + 1}
            </span>
            <span className="text-sm text-gray-300">{s}</span>
          </li>
        ))}
      </ol>

      {canBridge && (
        <button
          onClick={() => setShowBridge(true)}
          className="mt-5 w-full rounded-xl bg-red-600 py-3 text-sm font-bold text-white transition-colors hover:bg-red-700"
        >
          Move funds to Celo
        </button>
      )}
      <button
        onClick={onDone}
        className={`w-full rounded-xl py-3 text-sm font-bold transition-colors ${
          canBridge
            ? "mt-2 bg-[#292B30] text-gray-200 hover:bg-[#333940]"
            : "mt-5 bg-red-600 text-white hover:bg-red-700"
        }`}
      >
        {guide.alreadyOnCelo ? "Start using DezenMart" : canBridge ? "I'll do it later" : "Got it"}
      </button>

      {showBridge && (
        <Suspense fallback={null}>
          <SquidBridgeModal onClose={() => setShowBridge(false)} />
        </Suspense>
      )}
    </div>
  );
}

// ---------- Shell + bits ----------

function Shell({
  title,
  subtitle,
  onClose,
  onBack,
  children,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  onBack?: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="relative w-full max-h-[92dvh] overflow-y-auto rounded-t-3xl border border-[#292B30] bg-[#212428] shadow-2xl shadow-black/80 sm:max-w-md sm:rounded-2xl">
        <div className="flex justify-center pt-3 sm:hidden">
          <div className="h-1 w-10 rounded-full bg-[#373A3F]" />
        </div>
        <div className="flex items-center justify-between border-b border-[#292B30] px-5 py-4">
          <div className="flex items-center gap-2">
            {onBack && (
              <button onClick={onBack} aria-label="Back" className="rounded-full p-1.5 text-gray-400 hover:bg-[#292B30] hover:text-white">
                <RiArrowLeftLine />
              </button>
            )}
            <div>
              <h2 className="text-base font-bold text-white">{title}</h2>
              {subtitle && <p className="mt-0.5 text-xs text-gray-500">{subtitle}</p>}
            </div>
          </div>
          <button onClick={onClose} aria-label="Close" className="rounded-full p-2 text-gray-500 transition-colors hover:bg-[#292B30] hover:text-gray-300">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col items-center gap-3 py-8 text-center">{children}</div>;
}
