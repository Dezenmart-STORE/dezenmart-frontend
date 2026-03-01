import { useState, type ReactNode } from "react";
import { useConnect, type Connector } from "wagmi";

interface Props {
  onClose: () => void;
}

// ── Wallet identity helpers ───────────────────────────────────────────────

/**
 * Coinbase registers two connectors with identical names.
 * We rely on registration order: index 0 = Smart Wallet, index 1 = EOA.
 */
function classifyConnector(
  connector: Connector,
  allConnectors: Connector[]
): "smart_wallet" | "coinbase_eoa" | "metamask" | "walletconnect" | "unknown" {
  const name = connector.name.toLowerCase();
  if (name.includes("coinbase")) {
    const coinbaseGroup = allConnectors.filter((c) =>
      c.name.toLowerCase().includes("coinbase")
    );
    return coinbaseGroup[0]?.uid === connector.uid
      ? "smart_wallet"
      : "coinbase_eoa";
  }
  if (name.includes("metamask")) return "metamask";
  if (name.includes("walletconnect")) return "walletconnect";
  return "unknown";
}

interface WalletMeta {
  label: string;
  sublabel: string;
  mobileBadge?: string;
  icon: ReactNode;
}

function getWalletMeta(
  type: ReturnType<typeof classifyConnector>,
  connector: Connector
): WalletMeta {
  // Wagmi provides connector.icon as a data-URL for all standard wallets.
  // We use it as the primary icon, with a branded fallback SVG per wallet.
  const imgIcon = (alt: string, fallback: ReactNode) =>
    connector.icon ? (
      <img src={connector.icon} alt={alt} className="h-7 w-7 object-contain" />
    ) : (
      fallback
    );

  switch (type) {
    case "smart_wallet":
      return {
        label: "Email or Phone",
        sublabel: "No app or extension needed",
        mobileBadge: "Best for mobile",
        icon: imgIcon(
          "Coinbase Smart Wallet",
          <SmartWalletIcon />
        ),
      };

    case "coinbase_eoa":
      return {
        label: "Coinbase Wallet",
        sublabel: "App or browser extension",
        icon: imgIcon("Coinbase Wallet", <CoinbaseIcon />),
      };

    case "metamask":
      return {
        label: "MetaMask",
        sublabel: "Browser extension or mobile app",
        icon: imgIcon("MetaMask", <MetaMaskIcon />),
      };

    case "walletconnect":
      return {
        label: "WalletConnect",
        sublabel: "Any compatible wallet via QR code",
        icon: imgIcon("WalletConnect", <WalletConnectIcon />),
      };

    default:
      return {
        label: connector.name,
        sublabel: "Connect with this wallet",
        icon: (
          <span className="text-base font-bold text-gray-300">
            {connector.name.charAt(0)}
          </span>
        ),
      };
  }
}

// ── Education content ─────────────────────────────────────────────────────

const EDUCATION_STEPS = [
  {
    title: "What's a wallet?",
    body: "A digital wallet stores your money and lets you pay securely — like Apple Pay, but for crypto. You stay in control of your funds at all times.",
  },
  {
    title: "Is it safe?",
    body: "Your wallet is protected by your device's security (fingerprint, face ID, or password). Nobody can access your funds without your approval.",
  },
  {
    title: "Do I need crypto first?",
    body: "No — start with Email or Phone sign-in (Smart Wallet). You'll be guided through adding funds when you're ready to buy.",
  },
];

// ── Main component ────────────────────────────────────────────────────────

export default function ConnectModal({ onClose }: Props) {
  const { connect, connectors, isPending, error } = useConnect();
  const [showEducation, setShowEducation] = useState(false);
  const [connectingId, setConnectingId] = useState<string | null>(null);

  const handleConnect = async (connector: Connector) => {
    setConnectingId(connector.uid);
    try {
      await connect({ connector });
      onClose();
    } catch {
      setConnectingId(null);
    }
  };

  // Split: Smart Wallet gets hero treatment; the rest go in "More options"
  const smartWallet = connectors.find(
    (c: Connector) => classifyConnector(c, connectors) === "smart_wallet"
  );
  const otherConnectors = connectors.filter(
    (c: Connector) => classifyConnector(c, connectors) !== "smart_wallet"
  );

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="relative w-full max-h-[92dvh] overflow-y-auto rounded-t-3xl border border-[#292B30] bg-[#212428] shadow-2xl shadow-black/80 sm:max-w-md sm:rounded-2xl">

        {/* Drag handle — mobile only */}
        <div className="flex justify-center pt-3 sm:hidden">
          <div className="h-1 w-10 rounded-full bg-[#373A3F]" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#292B30] px-5 py-4">
          <div>
            <h2 className="text-base font-bold text-white">Connect Wallet</h2>
            <p className="mt-0.5 text-xs text-gray-500">
              Choose how you'd like to connect
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-gray-500 transition-colors hover:bg-[#292B30] hover:text-gray-300"
            aria-label="Close"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">

          {/* ── Hero: Smart Wallet ──────────────────────────────────── */}
          {smartWallet && (() => {
            const meta = getWalletMeta("smart_wallet", smartWallet);
            const isConnecting = connectingId === smartWallet.uid;
            return (
              <button
                onClick={() => handleConnect(smartWallet)}
                disabled={isPending}
                className={`group w-full rounded-2xl border-2 p-4 text-left transition-all disabled:cursor-not-allowed disabled:opacity-60 ${
                  isConnecting
                    ? "border-blue-600 bg-blue-900/20"
                    : "border-blue-700/50 bg-gradient-to-br from-blue-900/20 to-[#292B30] hover:border-blue-600/70 hover:from-blue-900/30"
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Icon */}
                  <div className="mt-0.5 flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-[#1a1c20] ring-1 ring-blue-800/40">
                    {meta.icon}
                  </div>

                  {/* Text */}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-bold text-white">
                        {meta.label}
                      </span>
                      {/* "Best for mobile" badge */}
                      <span className="inline-flex items-center gap-1 rounded-full border border-blue-700/50 bg-blue-900/40 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-blue-300">
                        <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />
                        {meta.mobileBadge}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-gray-400">
                      {isConnecting ? "Connecting…" : meta.sublabel}
                    </p>

                    {/* Feature pills — hide while connecting */}
                    {!isConnecting && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {["Works in-browser", "No app switching", "Email or passkey"].map(
                          (pill) => (
                            <span
                              key={pill}
                              className="rounded-full bg-[#1a1c20] px-2 py-0.5 text-[10px] text-gray-500"
                            >
                              {pill}
                            </span>
                          )
                        )}
                      </div>
                    )}
                  </div>

                  {/* Spinner / arrow */}
                  <div className="mt-1 flex-shrink-0">
                    {isConnecting ? (
                      <svg className="h-5 w-5 animate-spin text-blue-400" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    ) : (
                      <svg className="h-5 w-5 text-blue-500 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    )}
                  </div>
                </div>
              </button>
            );
          })()}

          {/* ── Divider ──────────────────────────────────────────────── */}
          {otherConnectors.length > 0 && (
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-[#292B30]" />
              <span className="text-[11px] font-medium text-gray-600">
                More options
              </span>
              <div className="h-px flex-1 bg-[#292B30]" />
            </div>
          )}

          {/* ── Other connectors ─────────────────────────────────────── */}
          <div className="space-y-2">
            {otherConnectors.map((connector: Connector) => {
              const type = classifyConnector(connector, connectors);
              const meta = getWalletMeta(type, connector);
              const isConnecting = connectingId === connector.uid;

              return (
                <button
                  key={connector.uid}
                  onClick={() => handleConnect(connector)}
                  disabled={isPending}
                  className={`group flex w-full items-center gap-3 rounded-xl border p-3.5 text-left transition-all disabled:cursor-not-allowed disabled:opacity-60 ${
                    isConnecting
                      ? "border-red-700/60 bg-red-900/20"
                      : "border-[#292B30] bg-[#292B30] hover:border-[#373A3F] hover:bg-[#373A3F]"
                  }`}
                >
                  {/* Icon */}
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-[#1a1c20]">
                    {meta.icon}
                  </div>

                  {/* Labels */}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-white">
                      {meta.label}
                    </p>
                    <p className="text-xs text-gray-500">
                      {isConnecting ? "Connecting…" : meta.sublabel}
                    </p>
                  </div>

                  {/* Spinner / chevron */}
                  {isConnecting ? (
                    <svg className="h-4 w-4 flex-shrink-0 animate-spin text-red-400" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  ) : (
                    <svg className="h-4 w-4 flex-shrink-0 text-gray-600 transition-transform group-hover:translate-x-0.5 group-hover:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  )}
                </button>
              );
            })}
          </div>

          {/* ── Error ────────────────────────────────────────────────── */}
          {error && (
            <div className="rounded-xl border border-red-800/50 bg-red-900/20 p-3 text-sm text-red-400">
              {error.message.toLowerCase().includes("reject") ||
               error.message.toLowerCase().includes("cancel")
                ? "Connection was cancelled."
                : "Failed to connect. Please try again."}
            </div>
          )}

          {/* ── Education toggle ─────────────────────────────────────── */}
          {!showEducation ? (
            <button
              onClick={() => setShowEducation(true)}
              className="flex w-full items-center gap-2 rounded-xl border border-[#292B30] bg-[#292B30] p-3 text-left text-xs text-gray-500 transition-colors hover:bg-[#373A3F] hover:text-gray-300"
            >
              <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>New to wallets? Learn how it works</span>
              <svg className="ml-auto h-3.5 w-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          ) : (
            <div className="space-y-2">
              {EDUCATION_STEPS.map((step, i) => (
                <div key={i} className="rounded-xl border border-[#292B30] bg-[#292B30] p-3">
                  <p className="text-sm font-semibold text-white">{step.title}</p>
                  <p className="mt-1 text-xs leading-relaxed text-gray-400">
                    {step.body}
                  </p>
                </div>
              ))}
              <button
                onClick={() => setShowEducation(false)}
                className="text-xs font-medium text-red-500 hover:text-red-400"
              >
                Got it, show me the options →
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-[#292B30] px-5 py-3">
          <p className="text-center text-xs text-gray-600">
            By connecting you agree to our{" "}
            <span className="text-gray-500 underline-offset-2 hover:underline cursor-pointer">
              Terms of Service
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Wallet brand SVG icons (fallbacks when connector.icon is unavailable) ──

function SmartWalletIcon() {
  // Coinbase blue gradient "C"
  return (
    <svg viewBox="0 0 32 32" className="h-7 w-7" fill="none">
      <rect width="32" height="32" rx="8" fill="#0052FF" />
      <path
        d="M16 6C10.477 6 6 10.477 6 16s4.477 10 10 10 10-4.477 10-10S21.523 6 16 6zm0 3.2a6.8 6.8 0 110 13.6A6.8 6.8 0 0116 9.2zm-2.4 4.4v4.8h4.8v-4.8h-4.8z"
        fill="white"
      />
    </svg>
  );
}

function CoinbaseIcon() {
  return (
    <svg viewBox="0 0 32 32" className="h-7 w-7" fill="none">
      <rect width="32" height="32" rx="8" fill="#0052FF" />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M16 5C9.925 5 5 9.925 5 16s4.925 11 11 11 11-4.925 11-11S22.075 5 16 5zm-2.75 8.25a2.75 2.75 0 015.5 0v5.5a2.75 2.75 0 01-5.5 0v-5.5z"
        fill="white"
      />
    </svg>
  );
}

function MetaMaskIcon() {
  // Simplified MetaMask fox in orange
  return (
    <svg viewBox="0 0 32 32" className="h-7 w-7" fill="none">
      <rect width="32" height="32" rx="8" fill="#F6851B" />
      <path
        d="M27 5L18.1 11.6l1.7-3.9L27 5z"
        fill="#E2761B" stroke="#E2761B" strokeLinecap="round" strokeLinejoin="round"
      />
      <path
        d="M5 5l8.8 6.7-1.6-4L5 5zM23.7 21.6l-2.4 3.6 5.1 1.4 1.5-4.9-4.2-.1zM3.7 21.7l1.4 4.9 5.1-1.4-2.4-3.6-4.1.1z"
        fill="#E4761B" stroke="#E4761B" strokeLinecap="round" strokeLinejoin="round"
      />
      <path
        d="M9.9 14.2l-1.4 2.1 5 .2-.2-5.4-3.4 3.1zM22.1 14.2l-3.5-3.2-.1 5.5 5-.2-1.4-2.1zM10.2 25.2l3-1.4-2.6-2-.4 3.4zM18.8 23.8l3 1.4-.4-3.4-2.6 2z"
        fill="#E4761B" stroke="#E4761B" strokeLinecap="round" strokeLinejoin="round"
      />
      <path
        d="M21.8 25.2l-3-1.4.2 1.7v.9l2.8-.7v-.5zM10.2 25.2l2.8.7v-.9l.2-1.7-3 1.4v.5z"
        fill="#D7C1B3" stroke="#D7C1B3" strokeLinecap="round" strokeLinejoin="round"
      />
      <path
        d="M13.1 20.2l-2.5-.7 1.8-.8.7 1.5zM18.9 20.2l.7-1.5 1.8.8-2.5.7z"
        fill="#233447" stroke="#233447" strokeLinecap="round" strokeLinejoin="round"
      />
      <path
        d="M10.2 25.2l.4-3.6-2.8.1 2.4 3.5zM21.4 21.6l.4 3.6 2.4-3.5-2.8-.1zM24.2 16.3l-5-.2.5 2.6.7-1.5 1.8.8 2-1.7zM11.6 19.5l1.8-.8.7 1.5.5-2.6-5-.2 2 2.1z"
        fill="#CD6116" stroke="#CD6116" strokeLinecap="round" strokeLinejoin="round"
      />
      <path
        d="M8.5 16.3l2.1 4.1-.1-2.4-2-1.7zM21.5 18l-.1 2.4 2.1-4.1-2 1.7zM13.5 16.1l-.5 2.6.6 3.2.1-4.2-.2-1.6zM18.5 16.1l-.2 1.6.1 4.2.6-3.2-.5-2.6z"
        fill="#E4751F" stroke="#E4751F" strokeLinecap="round" strokeLinejoin="round"
      />
      <path
        d="M19 20.2l-.6 3.2.4.3 2.6-2 .1-2.4-2.5.9zM11 19.5l.1 2.4 2.6 2 .4-.3-.6-3.2-2.5-.9z"
        fill="#F6851B" stroke="#F6851B" strokeLinecap="round" strokeLinejoin="round"
      />
      <path
        d="M19 25.7v-.9l-.2-.2h-2.6l-.2.2v.9l-2.8-.7 1 .8h3.5l1-.8-2.7.7z"
        fill="#C0AD9E" stroke="#C0AD9E" strokeLinecap="round" strokeLinejoin="round"
      />
      <path
        d="M18.8 23.8l-.4-.3h-2.6l-.4.3-.2 1.7.2-.2h2.6l.2.2.6-1.7z"
        fill="#161616" stroke="#161616" strokeLinecap="round" strokeLinejoin="round"
      />
      <path
        d="M27.4 11.8l.6-3.5L27 5l-8.2 6.1 3.2 2.7 4.4 1.3 1-1.1-.4-.3.7-.6-.5-.4.7-.5-.5-.5zM4 8.3l.6 3.5-.5.5.7.5-.5.4.7.6-.4.3 1 1.1 4.4-1.3 3.2-2.7L5 5 4 8.3z"
        fill="#763D16" stroke="#763D16" strokeLinecap="round" strokeLinejoin="round"
      />
      <path
        d="M26.4 13.1l-4.4-1.3 1.4 2.1-2.1 4.1 2.7-.1h4.1l-1.7-4.8zM9.9 11.8l-4.4 1.3-1.6 4.8H8l2.7.1-2.1-4.1 1.3-2.1zM18.5 16.1l.3-4.9-1.3-3.5h-3l-1.2 3.5.3 4.9.1 1.6v4.2h2.7v-4.2l.1-1.6z"
        fill="#F6851B" stroke="#F6851B" strokeLinecap="round" strokeLinejoin="round"
      />
    </svg>
  );
}

function WalletConnectIcon() {
  return (
    <svg viewBox="0 0 32 32" className="h-7 w-7" fill="none">
      <rect width="32" height="32" rx="8" fill="#3B99FC" />
      <path
        d="M9.6 12.8c3.5-3.4 9.3-3.4 12.8 0l.4.4c.2.2.2.5 0 .6l-1.4 1.4c-.1.1-.3.1-.4 0l-.6-.6c-2.5-2.4-6.4-2.4-8.9 0l-.6.6c-.1.1-.3.1-.4 0L9.1 13.8c-.2-.2-.2-.5 0-.6l.5-.4zm15.8 2.9l1.3 1.2c.2.2.2.5 0 .6l-5.7 5.5c-.2.2-.5.2-.7 0l-4-3.9c-.1-.1-.2-.1-.3 0l-4 3.9c-.2.2-.5.2-.7 0L5.6 17.5c-.2-.2-.2-.5 0-.6l1.3-1.2c.2-.2.5-.2.7 0l4 3.9c.1.1.2.1.3 0l4-3.9c.2-.2.5-.2.7 0l4 3.9c.1.1.2.1.3 0l4-3.9c.2-.2.5-.2.7 0z"
        fill="white"
      />
    </svg>
  );
}
