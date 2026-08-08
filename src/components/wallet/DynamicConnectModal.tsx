import { useMemo, useState, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { lazyWithReload } from "../../utils/lazyWithReload";
import { useWalletOptions, useDynamicContext, useSwitchNetwork } from "@dynamic-labs/sdk-react-core";
import { useAccount, useDisconnect, useConnect, useSwitchChain, type Connector } from "wagmi";
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

// Curated external wallets (quality over quantity, all Celo-capable). Dynamic
// handles the actual connection; we just surface a tidy, branded shortlist.
const CURATED = ["valora", "metamask", "coinbase", "trust"];

const matchCurated = (keyOrName: string): string | null => {
  const s = (keyOrName || "").toLowerCase();
  return CURATED.find((c) => s.includes(c)) ?? null;
};

// Brand-coloured fallback tile (only used if Dynamic doesn't supply an icon).
const BRAND: Record<string, string> = {
  valora: "#35d07f",
  metamask: "#f6851b",
  coinbase: "#0052ff",
  trust: "#3375bb",
};

type WalletOpt = { key: string; name: string; metadata?: unknown; isInstalledOnBrowser?: boolean };

const iconUrlOf = (o: WalletOpt): string | undefined => {
  const m = o.metadata as { icon?: string; iconUrl?: string } | undefined;
  return m?.icon ?? m?.iconUrl;
};

type Step =
  | { kind: "list" }
  | { kind: "connecting"; name: string }
  | { kind: "guide"; walletKey: string; name: string }
  | { kind: "error"; message: string };

export default function DynamicConnectModal({ onClose }: Props) {
  useModalPresence();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { openWalletSetup } = useSmartWallet();
  const { walletOptions, selectWalletOption } = useWalletOptions();
  const { sdkHasLoaded, user, handleLogOut } = useDynamicContext();
  const switchNetwork = useSwitchNetwork();
  const { isConnected } = useAccount();
  const { disconnectAsync } = useDisconnect();
  const { connectors: wagmiConnectors, connectAsync } = useConnect();
  const { switchChainAsync } = useSwitchChain();

  /** Our own wagmi connector for this wallet, if we ship one. */
  const wagmiConnectorFor = (o: WalletOpt): Connector | undefined => {
    const brand = matchCurated(o.key) || matchCurated(o.name);
    if (!brand) return undefined;
    return (wagmiConnectors as Connector[]).find((c) => {
      const id = `${c.id} ${c.name}`.toLowerCase();
      // Coinbase registers twice (smart wallet + EOA); take the EOA one.
      if (brand === "coinbase") return id.includes("coinbase") && !id.includes("smart");
      return id.includes(brand);
    });
  };

  const [step, setStep] = useState<Step>({ kind: "list" });

  // Curated list, de-duplicated by matched brand, installed wallets first.
  const externals = useMemo(() => {
    const seen = new Set<string>();
    return (walletOptions as WalletOpt[])
      .map((o) => ({ o, brand: matchCurated(o.key) || matchCurated(o.name) }))
      .filter((x): x is { o: WalletOpt; brand: string } => {
        if (!x.brand || seen.has(x.brand)) return false;
        seen.add(x.brand);
        return true;
      })
      .sort((a, b) => Number(b.o.isInstalledOnBrowser) - Number(a.o.isInstalledOnBrowser))
      .map((x) => x.o)
      // Only offer what we can actually connect through wagmi, so a wallet
      // never appears and then fails.
      .filter((o) => !!wagmiConnectorFor(o));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walletOptions, wagmiConnectors]);

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

  const connectExternal = async (o: WalletOpt) => {
    setStep({ kind: "connecting", name: o.name });
    try {
      // End the Dezen (Dynamic) wallet session first. While a wallet session is
      // authenticated, attaching another wallet counts as LINKING it to the
      // account, which Dynamic guards behind step-up re-auth ("Elevated access
      // token required") - an emailed code just to connect MetaMask. Ending the
      // wallet session makes this a plain wallet connect instead: no linking, no
      // code. The DezenMart login is untouched, and the Dezen Wallet stays on
      // the account, so it can be reconnected any time.
      if (user) {
        try {
          await handleLogOut();
        } catch {
          /* non-fatal - fall through and let the connect attempt report the truth */
        }
      } else if (isConnected) {
        try {
          await disconnectAsync();
        } catch {
          /* non-fatal */
        }
      }

      // Hand wagmi back to our own connectors. This unmounts
      // DynamicWagmiConnector, so Dynamic stops replacing wagmi's connector list
      // and stops disconnecting it - the external wallet is then a plain wagmi
      // connection that persists on its own and never becomes a Dynamic identity.
      setWalletMode("external");
      // Let the provider tree re-render without DynamicWagmiConnector before
      // connecting, otherwise the connector list is still Dynamic's.
      await new Promise((r) => setTimeout(r, 0));

      const direct = wagmiConnectorFor(o);
      if (!direct) {
        setStep({
          kind: "error",
          message: `${o.name} isn't available on this device. Try MetaMask or Coinbase Wallet.`,
        });
        return;
      }
      await connectAsync({ connector: direct, chainId: TARGET_CHAIN.id });
      try {
        await switchChainAsync({ chainId: TARGET_CHAIN.id });
      } catch {
        /* keep going - the wrong-network guard elsewhere will prompt again */
      }
      setStep({ kind: "guide", walletKey: o.key, name: o.name });
    } catch (e) {
      const raw = (e as Error)?.message ?? "";
      const msg = raw.toLowerCase();
      let message: string;
      if (msg.includes("reject") || msg.includes("cancel")) {
        message = "Connection was cancelled.";
      } else if (msg.includes("not installed") || msg.includes("no provider")) {
        message = `${o.name} isn't installed on this device. Install it, then try again.`;
      } else if (msg.includes("elevated") || msg.includes("scope")) {
        message = `Your Dezen Wallet is still active. Disconnect it from the wallet menu, then connect ${o.name}.`;
      } else if (msg.includes("already") || msg.includes("multi")) {
        message = `Your Dezen Wallet is already connected. Disconnect it first, then connect ${o.name}.`;
      } else {
        // Surface the real reason - a generic message made this undiagnosable.
        message = raw
          ? `Couldn't connect ${o.name}: ${raw}`
          : `Couldn't connect ${o.name}. Please try again.`;
      }
      setStep({ kind: "error", message });
    }
  };

  return (
    <Shell onClose={onClose} title={step.kind === "guide" ? "Almost done" : "Connect a wallet"}
      subtitle={step.kind === "guide" ? undefined : "Choose how you'd like to connect"}
      onBack={step.kind === "connecting" || step.kind === "error" ? () => setStep({ kind: "list" }) : undefined}
    >
      {step.kind === "guide" ? (
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

          {/* Curated external wallets */}
          {externals.length > 0 && (
            <>
              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-[#292B30]" />
                <span className="text-[11px] font-medium text-gray-600">Or use another wallet</span>
                <div className="h-px flex-1 bg-[#292B30]" />
              </div>
              <div className="space-y-2">
                {externals.map((o) => {
                  const url = iconUrlOf(o);
                  const brand = matchCurated(o.key) || matchCurated(o.name) || "";
                  return (
                    <button
                      key={o.key}
                      onClick={() => connectExternal(o)}
                      disabled={!sdkHasLoaded}
                      className="group flex w-full items-center gap-3 rounded-xl border border-[#292B30] bg-[#292B30] p-3.5 text-left transition-all hover:border-[#373A3F] hover:bg-[#373A3F] disabled:opacity-60"
                    >
                      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#1a1c20]">
                        {url ? (
                          <img src={url} alt="" className="h-7 w-7 object-contain" />
                        ) : (
                          <span
                            className="flex h-7 w-7 items-center justify-center rounded-lg text-sm font-bold text-white"
                            style={{ backgroundColor: BRAND[brand] || "#3A3A3C" }}
                          >
                            {o.name.charAt(0)}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-white">{o.name}</p>
                        <p className="text-xs text-gray-500">
                          {o.isInstalledOnBrowser ? "Detected, tap to connect" : "Connect this wallet"}
                        </p>
                      </div>
                      <svg className="h-4 w-4 flex-shrink-0 text-gray-600 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  );
                })}
              </div>
            </>
          )}

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
