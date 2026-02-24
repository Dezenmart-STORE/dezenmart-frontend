import { useState } from "react";
import { useAccount } from "wagmi";
import PaymentFlow from "../payment/PaymentFlow";
import { useCurrency } from "../../context/CurrencyContext";
import { calculateOrderTotal } from "../../utils/format";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface Product {
  id: string;
  name: string;
  price: number;
  image?: string;
  tradeId: string;
  tokenSymbol: string;
}

interface LogisticsOption {
  provider: `0x${string}`;
  name: string;
  cost: number;
  /** Cost as bigint-compatible string (in token smallest units) */
  costRaw: string;
}

interface Props {
  mode: "buy" | "sell";
  product: Product;
  logisticsOptions: LogisticsOption[];
  /** Called after successful checkout */
  onSuccess?: (txHash: string, purchaseId?: string) => void;
  onBack?: () => void;
}

/**
 * Unified checkout page — handles both buy and sell flows.
 */
export default function Checkout({
  mode,
  product,
  logisticsOptions,
  onSuccess,
  onBack,
}: Props) {
  const { isConnected } = useAccount();
  const { formatAmount } = useCurrency();

  const [quantity, setQuantity] = useState(1);
  const [selectedLogistics, setSelectedLogistics] = useState<LogisticsOption | null>(
    logisticsOptions[0] ?? null
  );
  const [showPayment, setShowPayment] = useState(false);

  const logisticsCost = selectedLogistics?.cost ?? 0;
  const orderTotal = calculateOrderTotal(product.price, quantity, logisticsCost);

  if (showPayment && selectedLogistics) {
    return (
      <div className="mx-auto max-w-lg">
        <button
          onClick={() => setShowPayment(false)}
          className="mb-4 flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to order
        </button>

        <PaymentFlow
          tradeId={product.tradeId}
          quantity={quantity}
          productToken={product.tokenSymbol}
          totalAmount={orderTotal.total}
          logisticsProvider={selectedLogistics.provider}
          logisticsCost={parseFloat(selectedLogistics.costRaw) > 0 ? selectedLogistics.costRaw : "0.1"}
          onSuccess={onSuccess}
          onClose={() => setShowPayment(false)}
          productName={product.name}
          productImage={product.image}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        {onBack && (
          <button
            onClick={onBack}
            className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}
        <h1 className="text-xl font-bold text-gray-900">
          {mode === "buy" ? "Checkout" : "List for Sale"}
        </h1>
      </div>

      {/* Product card */}
      <div className="flex gap-4 rounded-2xl border border-gray-100 bg-white p-4">
        {product.image && (
          <img
            src={product.image}
            alt={product.name}
            className="h-20 w-20 rounded-xl object-cover"
          />
        )}
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold text-gray-900">
            {product.name}
          </h2>
          <p className="mt-1 text-lg font-bold text-gray-900">
            {product.price.toFixed(2)} {product.tokenSymbol}
          </p>
          <p className="text-xs text-gray-500">
            {formatAmount(product.price, product.tokenSymbol)}
          </p>
        </div>
      </div>

      {/* Quantity */}
      {mode === "buy" && (
        <div className="rounded-2xl border border-gray-100 bg-white p-4">
          <label className="text-sm font-medium text-gray-700">Quantity</label>
          <div className="mt-2 flex items-center gap-3">
            <button
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 text-gray-600 transition-colors hover:bg-gray-50"
            >
              -
            </button>
            <span className="min-w-[3rem] text-center text-lg font-bold text-gray-900">
              {quantity}
            </span>
            <button
              onClick={() => setQuantity((q) => q + 1)}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 text-gray-600 transition-colors hover:bg-gray-50"
            >
              +
            </button>
          </div>
        </div>
      )}

      {/* Delivery options */}
      {mode === "buy" && logisticsOptions.length > 0 && (
        <div className="rounded-2xl border border-gray-100 bg-white p-4">
          <label className="text-sm font-medium text-gray-700">
            Delivery Option
          </label>
          <div className="mt-2 space-y-2">
            {logisticsOptions.map((opt) => (
              <button
                key={opt.provider}
                onClick={() => setSelectedLogistics(opt)}
                className={`flex w-full items-center justify-between rounded-xl border p-3 text-left transition-all ${
                  selectedLogistics?.provider === opt.provider
                    ? "border-red-300 bg-red-50 ring-1 ring-red-200"
                    : "border-gray-100 hover:border-gray-200"
                }`}
              >
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    {opt.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatAmount(opt.cost, product.tokenSymbol)}
                  </p>
                </div>
                <span className="text-sm font-bold text-gray-900">
                  {opt.cost.toFixed(2)} {product.tokenSymbol}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Order summary */}
      <div className="rounded-2xl border border-gray-100 bg-white p-4">
        <h3 className="text-sm font-medium text-gray-700">Order Summary</h3>
        <div className="mt-3 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">
              Subtotal ({quantity} item{quantity > 1 ? "s" : ""})
            </span>
            <span className="text-gray-900">
              {orderTotal.subtotal.toFixed(2)} {product.tokenSymbol}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Escrow fee (2.5%)</span>
            <span className="text-gray-900">
              {orderTotal.escrowFee.toFixed(2)} {product.tokenSymbol}
            </span>
          </div>
          {logisticsCost > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Delivery</span>
              <span className="text-gray-900">
                {logisticsCost.toFixed(2)} {product.tokenSymbol}
              </span>
            </div>
          )}
          <div className="border-t border-gray-100 pt-2">
            <div className="flex justify-between">
              <span className="text-base font-bold text-gray-900">Total</span>
              <div className="text-right">
                <p className="text-base font-bold text-gray-900">
                  {orderTotal.total.toFixed(2)} {product.tokenSymbol}
                </p>
                <p className="text-xs text-gray-500">
                  {formatAmount(orderTotal.total, product.tokenSymbol)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Escrow notice */}
      <div className="flex items-start gap-2 rounded-xl bg-green-50 p-3 text-sm text-green-700">
        <svg className="mt-0.5 h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
        <span>
          Your payment is held in a secure escrow contract until you confirm
          delivery. You're protected throughout the process.
        </span>
      </div>

      {/* Pay button */}
      <button
        onClick={() => setShowPayment(true)}
        disabled={!selectedLogistics && mode === "buy"}
        className="w-full rounded-xl bg-red-600 py-3.5 text-sm font-bold text-white transition-all hover:bg-red-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {mode === "buy"
          ? `Pay ${orderTotal.total.toFixed(2)} ${product.tokenSymbol}`
          : "List Item"}
      </button>
    </div>
  );
}
