import { useState } from "react";
import { RiWallet3Line, RiFileCopyLine, RiCheckLine, RiLoader4Line } from "react-icons/ri";
import { useSmartWallet } from "../../../context/SmartWalletContext";

const short = (addr: string) => `${addr.slice(0, 6)}…${addr.slice(-4)}`;

/**
 * "My Wallet" card for the account settings screen. Renders only when the
 * embedded-wallet feature is enabled.
 */
export default function SmartWalletCard() {
  const { enabled, phase, walletAddress } = useSmartWallet();
  const [copied, setCopied] = useState(false);

  if (!enabled || phase === "disabled" || phase === "loading") return null;

  const copy = () => {
    if (!walletAddress) return;
    navigator.clipboard.writeText(walletAddress).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="mb-4 rounded-2xl border border-[#3A3A3C] bg-gradient-to-br from-[#292B30] to-[#212428] p-4">
      <div className="mb-3 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-600/15">
          <RiWallet3Line className="text-red-500" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-white">My Wallet</h3>
          <p className="text-xs text-gray-500">Your in-app DezenMart wallet</p>
        </div>
      </div>

      {phase === "needs-setup" ? (
        <div className="flex items-center gap-2 rounded-xl bg-[#1a1c20] px-3 py-2.5 text-xs text-gray-400">
          <RiLoader4Line className="animate-spin text-red-500" />
          Setting up your wallet…
        </div>
      ) : (
        <>
          {walletAddress && (
            <button
              onClick={copy}
              className="flex w-full items-center justify-between rounded-xl bg-[#1a1c20] px-3 py-2.5 text-left transition-colors hover:bg-[#171a1e]"
            >
              <span className="font-mono text-sm text-gray-300">{short(walletAddress)}</span>
              {copied ? (
                <span className="flex items-center gap-1 text-xs text-green-400">
                  <RiCheckLine /> Copied
                </span>
              ) : (
                <span className="flex items-center gap-1 text-xs text-gray-500">
                  <RiFileCopyLine /> Copy
                </span>
              )}
            </button>
          )}
          <p className="mt-2 text-xs text-gray-500">
            Self-custodial and secured by a passcode on new devices.
          </p>
        </>
      )}
    </div>
  );
}
