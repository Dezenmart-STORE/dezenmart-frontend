import { useState } from "react";
import { useAccount } from "wagmi";
import { usePayment, type PaymentParams, type PaymentStep } from "../../hooks/usePayment";
import { useTokenBalances } from "../../hooks/useTokenBalances";
import { useCurrency } from "../../context/CurrencyContext";
import { getExplorerUrl } from "../../config/chains";
import { useChainId } from "wagmi";
import TokenSelect from "./TokenSelect";
import type { StableToken } from "../../config/tokens";
import ConnectModal from "../wallet/ConnectModal";

// ---------------------------------------------------------------------------
// Step config — maps state machine steps to UI
// ---------------------------------------------------------------------------
const STEP_CONFIG: Record<
  PaymentStep,
  { label: string; icon: string; progress: number }
> = {
  idle: { label: "Ready", icon: "", progress: 0 },
  "checking-balance": { label: "Checking balance", icon: "search", progress: 15 },
  "insufficient-balance": { label: "Insufficient balance", icon: "warning", progress: 15 },
  swapping: { label: "Converting tokens", icon: "swap", progress: 30 },
  approving: { label: "Approving payment", icon: "lock", progress: 50 },
  executing: { label: "Processing purchase", icon: "cart", progress: 70 },
  confirming: { label: "Confirming", icon: "check", progress: 90 },
  success: { label: "Complete!", icon: "check", progress: 100 },
  error: { label: "Failed", icon: "x", progress: 0 },
};

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
interface Props {
  /** Product/trade details needed for payment */
  tradeId: string;
  quantity: number;
  productToken: string;
  totalAmount: number;
  logisticsProvider: `0x${string}`;
  logisticsCost: string;
  /** Called after successful payment */
  onSuccess?: (txHash: string, purchaseId?: string) => void;
  /** Called when user closes/cancels */
  onClose?: () => void;
  /** Product info for display */
  productName?: string;
  productImage?: string;
}

/**
 * Complete payment flow component.
 *
 * Renders the usePayment state machine as a visual flow:
 * Token select -> progress indicator -> result screen
 *
 * Designed for Web2 users:
 * - Clear step-by-step progress
 * - No blockchain jargon
 * - Friendly error messages with recovery actions
 * - Token conversion explained simply
 */
export default function PaymentFlow({
  tradeId,
  quantity,
  productToken,
  totalAmount,
  logisticsProvider,
  logisticsCost,
  onSuccess,
  onClose,
  productName,
  productImage,
}: Props) {
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const { state, startPayment, reset, isActive } = usePayment();
  const { getBalance } = useTokenBalances();
  const { selectedToken, setSelectedToken, formatAmount } = useCurrency();

  const [paymentToken, setPaymentToken] = useState(selectedToken.symbol);
  const [showConnectModal, setShowConnectModal] = useState(false);

  const balance = getBalance(paymentToken);
  const needsSwap = paymentToken !== productToken;
  const stepConfig = STEP_CONFIG[state.step];

  const handleTokenChange = (token: StableToken) => {
    setPaymentToken(token.symbol);
    setSelectedToken(token);
  };

  const handlePay = () => {
    if (!isConnected) {
      setShowConnectModal(true);
      return;
    }

    const params: PaymentParams = {
      tradeId,
      quantity,
      productToken,
      totalAmount,
      paymentToken,
      logisticsProvider,
      logisticsCost,
    };

    startPayment(params);
  };

  // Notify parent on success
  if (state.step === "success" && state.txHash && onSuccess) {
    // Use setTimeout to avoid calling during render
    setTimeout(() => onSuccess(state.txHash!, state.purchaseId ?? undefined), 0);
  }

  // ── Idle: show payment form ──────────────────────────────────────
  if (state.step === "idle") {
    return (
      <div className="space-y-4">
        {/* Product summary */}
        <div className="flex items-center gap-3 rounded-xl bg-gray-50 p-3">
          {productImage && (
            <img
              src={productImage}
              alt=""
              className="h-12 w-12 rounded-lg object-cover"
            />
          )}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-gray-900">
              {productName ?? "Purchase"}
            </p>
            <p className="text-lg font-bold text-gray-900">
              {totalAmount.toFixed(2)} {productToken}
            </p>
            <p className="text-xs text-gray-500">
              {formatAmount(totalAmount, productToken)}
            </p>
          </div>
        </div>

        {/* Token selector */}
        <TokenSelect
          value={paymentToken}
          onChange={handleTokenChange}
          label="Pay with"
        />

        {/* Balance indicator */}
        {balance && (
          <div className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2">
            <span className="text-xs text-gray-500">Your balance</span>
            <span
              className={`text-sm font-semibold ${
                balance.numeric >= totalAmount
                  ? "text-green-600"
                  : "text-red-600"
              }`}
            >
              {balance.numeric.toFixed(2)} {paymentToken}
            </span>
          </div>
        )}

        {/* Swap notice */}
        {needsSwap && (
          <div className="flex items-start gap-2 rounded-xl bg-blue-50 p-3 text-sm text-blue-700">
            <svg className="mt-0.5 h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>
              Your {paymentToken} will be automatically converted to{" "}
              {productToken} at the best available rate.
            </span>
          </div>
        )}

        {/* Pay button */}
        <button
          onClick={handlePay}
          className="w-full rounded-xl bg-red-600 py-3.5 text-sm font-bold text-white transition-all hover:bg-red-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {!isConnected
            ? "Connect Wallet to Pay"
            : `Pay ${totalAmount.toFixed(2)} ${productToken}`}
        </button>

        {showConnectModal && (
          <ConnectModal onClose={() => setShowConnectModal(false)} />
        )}
      </div>
    );
  }

  // ── Active: show progress ────────────────────────────────────────
  if (isActive) {
    return (
      <div className="flex flex-col items-center py-8">
        {/* Progress ring */}
        <div className="relative mb-6">
          <svg className="h-24 w-24 -rotate-90" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="42"
              fill="none"
              stroke="#f3f4f6"
              strokeWidth="6"
            />
            <circle
              cx="50"
              cy="50"
              r="42"
              fill="none"
              stroke="#ef4444"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={`${stepConfig.progress * 2.64} 264`}
              className="transition-all duration-700"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-200 border-t-red-600" />
          </div>
        </div>

        {/* Step label */}
        <p className="text-lg font-bold text-gray-900">{stepConfig.label}</p>
        <p className="mt-2 max-w-xs text-center text-sm text-gray-500">
          {state.message}
        </p>

        {/* Step dots */}
        <div className="mt-6 flex gap-2">
          {["checking-balance", "approving", "executing", "confirming"].map(
            (s, i) => (
              <div
                key={s}
                className={`h-2 w-2 rounded-full transition-colors ${
                  stepConfig.progress >= (i + 1) * 25
                    ? "bg-red-500"
                    : "bg-gray-200"
                }`}
              />
            )
          )}
        </div>

        <p className="mt-4 text-xs text-gray-400">
          Please confirm in your wallet when prompted
        </p>
      </div>
    );
  }

  // ── Success ──────────────────────────────────────────────────────
  if (state.step === "success") {
    return (
      <div className="flex flex-col items-center py-8">
        {/* Success animation */}
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <h3 className="text-xl font-bold text-gray-900">Payment Successful!</h3>
        <p className="mt-2 text-sm text-gray-500">
          Your purchase has been confirmed on the blockchain.
        </p>

        {/* Transaction details */}
        <div className="mt-6 w-full space-y-2 rounded-xl bg-gray-50 p-4">
          {state.txHash && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">Transaction</span>
              <a
                href={getExplorerUrl(chainId, state.txHash)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-medium text-red-600 hover:text-red-700"
              >
                View on Explorer
              </a>
            </div>
          )}
          {state.purchaseId && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">Order ID</span>
              <span className="text-xs font-mono font-medium text-gray-900">
                #{state.purchaseId}
              </span>
            </div>
          )}
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="mt-6 w-full rounded-xl bg-gray-900 py-3 text-sm font-bold text-white transition-colors hover:bg-gray-800"
          >
            Done
          </button>
        )}
      </div>
    );
  }

  // ── Error ────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col items-center py-8">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
        <svg className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </div>

      <h3 className="text-xl font-bold text-gray-900">Payment Failed</h3>
      <p className="mt-2 max-w-xs text-center text-sm text-gray-500">
        {state.error}
      </p>

      <div className="mt-6 flex w-full gap-3">
        <button
          onClick={reset}
          className="flex-1 rounded-xl bg-red-600 py-3 text-sm font-bold text-white transition-colors hover:bg-red-700"
        >
          Try Again
        </button>
        {onClose && (
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-gray-200 py-3 text-sm font-bold text-gray-700 transition-colors hover:bg-gray-50"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}
