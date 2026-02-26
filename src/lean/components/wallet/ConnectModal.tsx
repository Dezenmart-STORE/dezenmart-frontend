import { useState } from "react";
import { useConnect, type Connector } from "wagmi";

interface Props {
  onClose: () => void;
}

interface ConnectorMeta {
  label: string;
  description: string;
  tag?: string;
  icon: string;
}

function getConnectorMeta(connector: Connector): ConnectorMeta {
  const name = connector.name.toLowerCase();

  if (name.includes("coinbase") && (connector as any).preference === "smartWalletOnly") {
    return {
      label: "Email or Phone",
      description: "Sign in with your email — no extension needed",
      tag: "Easiest",
      icon: "C",
    };
  }
  if (name.includes("coinbase")) {
    return {
      label: "Coinbase Wallet",
      description: "Use the Coinbase Wallet app or extension",
      icon: "C",
    };
  }
  if (name.includes("metamask")) {
    return {
      label: "MetaMask",
      description: "Connect using MetaMask browser extension",
      icon: "M",
    };
  }
  if (name.includes("walletconnect")) {
    return {
      label: "WalletConnect",
      description: "Scan a QR code with your mobile wallet",
      icon: "W",
    };
  }
  return {
    label: connector.name,
    description: "Connect with this wallet",
    icon: connector.name.charAt(0),
  };
}

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
    body: "You can start with email sign-in (Coinbase Smart Wallet). You'll be guided through adding funds when you're ready to buy.",
  },
];

/**
 * Full-screen modal for wallet connection.
 * Dark theme, education section for first-time users, responsive.
 */
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

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="relative w-full max-h-[90dvh] overflow-y-auto rounded-t-3xl border border-[#292B30] bg-[#212428] shadow-2xl shadow-black/80 sm:max-w-md sm:rounded-2xl">
        {/* Drag handle on mobile */}
        <div className="flex justify-center pt-3 sm:hidden">
          <div className="h-1 w-10 rounded-full bg-[#373A3F]" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#292B30] px-5 py-4">
          <div>
            <h2 className="text-base font-bold text-white">Connect Wallet</h2>
            <p className="mt-0.5 text-xs text-gray-500">Choose how you'd like to connect</p>
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

        <div className="px-5 py-4">
          {/* Education toggle */}
          {!showEducation && (
            <button
              onClick={() => setShowEducation(true)}
              className="mb-4 flex w-full items-center gap-2 rounded-xl border border-blue-900/50 bg-blue-900/20 p-3 text-left text-sm text-blue-300 transition-colors hover:bg-blue-900/30"
            >
              <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="font-medium">New to wallets? Learn how it works →</span>
            </button>
          )}

          {/* Education section */}
          {showEducation && (
            <div className="mb-4 space-y-2">
              {EDUCATION_STEPS.map((step, i) => (
                <div key={i} className="rounded-xl border border-[#292B30] bg-[#292B30] p-3">
                  <p className="text-sm font-semibold text-white">{step.title}</p>
                  <p className="mt-1 text-xs leading-relaxed text-gray-400">{step.body}</p>
                </div>
              ))}
              <button
                onClick={() => setShowEducation(false)}
                className="text-sm font-medium text-red-500 hover:text-red-400"
              >
                Got it, show me the options →
              </button>
            </div>
          )}

          {/* Connector list */}
          <div className="space-y-2">
            {connectors.map((connector: Connector) => {
              const meta = getConnectorMeta(connector);
              const isConnecting = connectingId === connector.uid;

              return (
                <button
                  key={connector.uid}
                  onClick={() => handleConnect(connector)}
                  disabled={isPending}
                  className={`flex w-full items-center gap-3 rounded-xl border p-4 text-left transition-all disabled:cursor-not-allowed disabled:opacity-60 ${
                    isConnecting
                      ? "border-red-700/60 bg-red-900/20"
                      : meta.tag
                      ? "border-red-700/40 bg-[#292B30] ring-1 ring-red-900/40 hover:bg-[#373A3F]"
                      : "border-[#292B30] bg-[#292B30] hover:border-[#373A3F] hover:bg-[#373A3F]"
                  }`}
                >
                  {/* Icon */}
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-[#1a1c20] text-base font-bold text-gray-300">
                    {connector.icon ? (
                      <img src={connector.icon} alt="" className="h-6 w-6 rounded-md" />
                    ) : (
                      meta.icon
                    )}
                  </div>

                  {/* Labels */}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-white">
                        {meta.label}
                      </span>
                      {meta.tag && (
                        <span className="rounded-full bg-red-900/50 px-2 py-0.5 text-[10px] font-bold uppercase text-red-400 border border-red-800/50">
                          {meta.tag}
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-gray-500">
                      {isConnecting ? "Connecting…" : meta.description}
                    </p>
                  </div>

                  {/* Loading spinner / chevron */}
                  {isConnecting ? (
                    <svg
                      className="h-4 w-4 flex-shrink-0 animate-spin text-red-500"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  ) : (
                    <svg className="h-4 w-4 flex-shrink-0 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  )}
                </button>
              );
            })}
          </div>

          {/* Error */}
          {error && (
            <div className="mt-3 rounded-xl border border-red-800/50 bg-red-900/20 p-3 text-sm text-red-400">
              {error.message.includes("rejected")
                ? "Connection was cancelled."
                : "Failed to connect. Please try again."}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-[#292B30] px-5 py-3">
          <p className="text-center text-xs text-gray-600">
            By connecting, you agree to our{" "}
            <span className="text-gray-500">Terms of Service</span>
          </p>
        </div>
      </div>
    </div>
  );
}
