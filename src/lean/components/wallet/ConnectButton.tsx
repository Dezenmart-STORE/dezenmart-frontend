import { useState, useRef, useEffect } from "react";
import {
  useAccount,
  useBalance,
  useDisconnect,
  useChainId,
  useSwitchChain,
} from "wagmi";
import { truncateAddress, copyToClipboard } from "../../utils/format";
import { TARGET_CHAIN, getExplorerUrl } from "../../config/chains";
import { useTokenBalances } from "../../hooks/useTokenBalances";
import { useCurrency } from "../../context/CurrencyContext";
import ConnectModal from "./ConnectModal";

/**
 * Wallet connect/disconnect button with inline dropdown.
 *
 * - Disconnected: shows "Connect Wallet" -> opens ConnectModal
 * - Connected: shows truncated address -> dropdown with balance, chain, copy, disconnect
 */
export default function ConnectButton() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();
  const { data: celoBalance } = useBalance({ address });
  const { getBalance } = useTokenBalances();
  const { selectedToken, formatAmount } = useCurrency();

  const [showModal, setShowModal] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [copied, setCopied] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isCorrectChain = chainId === TARGET_CHAIN.id;
  const balance = getBalance(selectedToken.symbol);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    if (showDropdown) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showDropdown]);

  const handleCopy = async () => {
    if (!address) return;
    await copyToClipboard(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ── Not connected ────────────────────────────────────────────────
  if (!isConnected) {
    return (
      <>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 rounded-full bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-red-700 active:scale-95"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          Connect Wallet
        </button>
        {showModal && <ConnectModal onClose={() => setShowModal(false)} />}
      </>
    );
  }

  // ── Connected ────────────────────────────────────────────────────
  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger button */}
      <button
        onClick={() => setShowDropdown((v) => !v)}
        className="flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-800 shadow-sm transition-all hover:bg-gray-50 active:scale-[0.98]"
      >
        {/* Status dot */}
        <span
          className={`h-2 w-2 rounded-full ${
            isCorrectChain ? "bg-green-500" : "bg-amber-500"
          }`}
        />
        {/* Balance (if available) */}
        {balance && (
          <span className="hidden text-gray-600 sm:inline">
            {balance.numeric.toFixed(2)} {selectedToken.symbol}
          </span>
        )}
        {/* Address */}
        <span className="font-mono">{truncateAddress(address!, 4)}</span>
        {/* Chevron */}
        <svg
          className={`h-4 w-4 text-gray-400 transition-transform ${
            showDropdown ? "rotate-180" : ""
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown */}
      {showDropdown && (
        <div className="absolute right-0 z-50 mt-2 w-72 rounded-2xl border border-gray-100 bg-white p-4 shadow-xl">
          {/* Chain indicator */}
          {!isCorrectChain && (
            <button
              onClick={() => switchChain({ chainId: TARGET_CHAIN.id })}
              className="mb-3 flex w-full items-center gap-2 rounded-xl bg-amber-50 p-3 text-left text-sm text-amber-800 transition-colors hover:bg-amber-100"
            >
              <svg className="h-5 w-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="font-medium">Wrong network</p>
                <p className="text-xs text-amber-600">Tap to switch to {TARGET_CHAIN.name}</p>
              </div>
            </button>
          )}

          {/* Balance section */}
          <div className="mb-3 rounded-xl bg-gray-50 p-3">
            <p className="text-xs font-medium uppercase tracking-wider text-gray-500">
              Balance
            </p>
            {balance ? (
              <div className="mt-1">
                <p className="text-lg font-bold text-gray-900">
                  {balance.numeric.toFixed(2)} {selectedToken.symbol}
                </p>
                <p className="text-sm text-gray-500">
                  {formatAmount(balance.numeric)}
                </p>
              </div>
            ) : (
              <p className="mt-1 text-sm text-gray-400">Loading...</p>
            )}
            {celoBalance && (
              <p className="mt-1 text-xs text-gray-400">
                Gas: {parseFloat(celoBalance.formatted).toFixed(4)} CELO
              </p>
            )}
          </div>

          {/* Address + copy */}
          <button
            onClick={handleCopy}
            className="mb-3 flex w-full items-center justify-between rounded-xl p-3 text-sm transition-colors hover:bg-gray-50"
          >
            <span className="font-mono text-gray-600">
              {truncateAddress(address!, 6)}
            </span>
            <span className="text-xs text-gray-400">
              {copied ? "Copied!" : "Copy"}
            </span>
          </button>

          {/* View on explorer */}
          <a
            href={getExplorerUrl(chainId, address!, "address")}
            target="_blank"
            rel="noopener noreferrer"
            className="mb-3 flex w-full items-center gap-2 rounded-xl p-3 text-sm text-gray-600 transition-colors hover:bg-gray-50"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            View on Explorer
          </a>

          {/* Disconnect */}
          <button
            onClick={() => {
              disconnect();
              setShowDropdown(false);
            }}
            className="flex w-full items-center gap-2 rounded-xl p-3 text-sm text-red-600 transition-colors hover:bg-red-50"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Disconnect
          </button>
        </div>
      )}
    </div>
  );
}
