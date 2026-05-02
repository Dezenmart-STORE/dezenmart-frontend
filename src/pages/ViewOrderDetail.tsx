import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useChainId, useSwitchChain } from "wagmi";
import {
  useGetOrderByIdQuery,
  useUpdateOrderStatusMutation,
  useCreateReviewMutation,
  useGetOrderReviewQuery,
} from "../store/api";
import TradeStatus from "../components/trade/TradeStatus";
import TradeActions from "../components/trade/TradeActions";
import TransactionResult from "../components/trade/TransactionResult";
import PaymentFlow from "../components/payment/PaymentFlow";
import type { TradeState } from "../components/trade/TradeStatus";
import type { OrderStatus } from "../utils/types";
import { useCurrency } from "../context/CurrencyContext";
import { calculateOrderTotal } from "../utils/format";
import { CHAIN_IDS, DEFAULT_LOGISTICS_PROVIDER, getExplorerUrl } from "../config/chains";

const ViewOrderDetail = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { formatAmount, convertPrice } = useCurrency();

  const chainId = useChainId();
  const { switchChainAsync } = useSwitchChain();
  const [isSwitching, setIsSwitching] = useState(false);
  const isOnCelo = chainId === CHAIN_IDS.CELO || chainId === CHAIN_IDS.ALFAJORES;

  const switchToCelo = async () => {
    setIsSwitching(true);
    try {
      await switchChainAsync({ chainId: CHAIN_IDS.CELO });
    } catch {
      // User rejected — banner will remain visible
    } finally {
      setIsSwitching(false);
    }
  };

  const {
    data: order,
    isLoading,
    error,
    refetch,
  } = useGetOrderByIdQuery(orderId!, { skip: !orderId });

  const [updateOrderStatus] = useUpdateOrderStatusMutation();
  const [showPayment, setShowPayment] = useState(false);
  const [isMarkingReceived, setIsMarkingReceived] = useState(false);
  const [checklistComplete, setChecklistComplete] = useState(false);

  const handleMarkReceived = async () => {
    if (!orderId) return;
    setIsMarkingReceived(true);
    try {
      await updateOrderStatus({ orderId, details: { status: "delivered" } });
      await refetch();
    } finally {
      setIsMarkingReceived(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-[#212428]">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-[#292B30] border-t-red-600" />
          <p className="mt-4 text-sm text-gray-500">Loading order details…</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-[#1a1c20] px-4 py-12">
        <div className="mx-auto max-w-lg">
          <TransactionResult
            success={false}
            message="Could not load this order. It may not exist or you may not have access."
            onDone={() => navigate("/account")}
            onRetry={() => refetch()}
          />
        </div>
      </div>
    );
  }

  const status = mapStatus(order.status);
  const tokenSymbol = order.product?.paymentToken ?? "cUSD";

  const sellerName =
    typeof order.seller === "object" ? order.seller?.name : order.seller;
  const sellerId =
    typeof order.seller === "object" ? order.seller?._id : order.seller;

  const tradeId = order.product?.tradeId ?? "";
  const canPay =
    status === "pending_payment" &&
    !order.purchaseId &&
    /^\d+$/.test(tradeId);

  const providerAddr = DEFAULT_LOGISTICS_PROVIDER;

  const _providerList = order.product?.logisticsProviders as string[] | undefined;
  const _costList = order.product?.logisticsCost as string[] | undefined;
  const _providerIdx = _providerList?.findIndex(
    (addr: string) => addr?.toLowerCase() === DEFAULT_LOGISTICS_PROVIDER.toLowerCase()
  ) ?? -1;
  const logisticsCostRaw =
    (_providerIdx >= 0 && _costList?.[_providerIdx] && parseFloat(_costList[_providerIdx]) > 0)
      ? _costList[_providerIdx]
      : (_costList?.[0] && parseFloat(_costList[0]) > 0)
      ? _costList[0]
      : "0.1";

  const logisticsCostNumeric = parseFloat(logisticsCostRaw) || 0.1;

  // order.product.price is stored in USD — convert to payment token for correct amounts.
  // Fall back to order.amount (actual on-chain token amount) if product price unavailable.
  const productPriceInToken = order.product?.price
    ? convertPrice(order.product.price, "USD", tokenSymbol)
    : (order.amount ?? 0);

  const orderTotal = calculateOrderTotal(
    productPriceInToken,
    order.quantity ?? 1,
    logisticsCostNumeric
  );

  return (
    <div className="min-h-screen bg-[#212428] px-4 py-6">
      <div className="mx-auto max-w-lg space-y-4">
        {/* Back + title */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/account")}
            className="rounded-full p-2 text-gray-500 transition-colors hover:bg-[#292B30] hover:text-white"
            aria-label="Go back"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-xl font-bold text-white">Order Details</h1>
        </div>

        {/* Product info card */}
        <div className="flex gap-4 rounded-2xl border border-[#292B30] bg-[#292B30] p-4">
          {order.product?.images?.[0] && (
            <img
              src={order.product.images[0]}
              alt={order.product?.name}
              className="h-20 w-20 flex-shrink-0 rounded-xl object-cover"
            />
          )}
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold text-white">
              {order.product?.name ?? "Product"}
            </h2>
            <p className="mt-1 text-xl font-bold text-white">
              {(order.amount || productPriceInToken).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{" "}
              <span className="text-base font-medium text-gray-400">{tokenSymbol}</span>
            </p>
            <p className="text-xs text-gray-500">
              {formatAmount(order.amount || productPriceInToken, tokenSymbol)}
            </p>
          </div>
        </div>

        {/* Status stepper */}
        <div className="rounded-2xl border border-[#292B30] bg-[#212428] p-5">
          <h3 className="mb-4 text-sm font-semibold text-gray-400 uppercase tracking-wide">
            Order Status
          </h3>
          <TradeStatus status={status} />
        </div>

        {/* Status-contextual info panel */}
        <StatusInfoPanel
          status={status}
          order={order}
          orderTotal={orderTotal}
          tokenSymbol={tokenSymbol}
          logisticsCostNumeric={logisticsCostNumeric}
          chainId={chainId}
          onMarkReceived={handleMarkReceived}
          isMarkingReceived={isMarkingReceived}
          onChecklistChange={setChecklistComplete}
        />

        {/* Wrong network warning (payment pending, wrong chain) */}
        {canPay && !isOnCelo && (
          <div className="rounded-2xl border border-amber-800/40 bg-amber-900/20 p-5">
            <div className="text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-amber-800/50 bg-amber-900/30">
                <svg className="h-6 w-6 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
                </svg>
              </div>
              <h3 className="text-base font-semibold text-amber-300">Wrong Network</h3>
              <p className="mt-1 text-sm text-amber-500">
                Your wallet needs to be on Celo to complete this payment.
              </p>
              <button
                onClick={switchToCelo}
                disabled={isSwitching}
                className="mt-4 w-full rounded-xl bg-amber-600 py-3 text-sm font-bold text-white transition-colors hover:bg-amber-500 active:scale-[0.98] disabled:opacity-60"
              >
                {isSwitching ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Switching…
                  </span>
                ) : (
                  "Switch to Celo"
                )}
              </button>
            </div>
          </div>
        )}

        {/* Payment section (pending + correct chain) */}
        {(canPay || showPayment) && isOnCelo && (
          <div className="rounded-2xl border border-[#292B30] bg-[#212428] p-5">
            {!showPayment ? (
              <div className="text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-amber-800/50 bg-amber-900/30">
                  <svg className="h-6 w-6 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                </div>
                <h3 className="text-base font-semibold text-white">Payment Pending</h3>
                <p className="mt-1 text-sm text-gray-400">
                  Complete your payment to confirm this order.
                </p>
                <div className="mt-3 rounded-lg border border-[#292B30] bg-[#292B30] px-3 py-2.5">
                  <p className="text-sm font-bold text-white">
                    Total:{" "}
                    <span className="text-red-400">
                      {orderTotal.total.toFixed(2)} {tokenSymbol}
                    </span>
                  </p>
                </div>
                <button
                  onClick={() => setShowPayment(true)}
                  className="mt-4 w-full rounded-xl bg-red-600 py-3 text-sm font-bold text-white transition-colors hover:bg-red-700 active:scale-[0.98]"
                >
                  Pay Now
                </button>
              </div>
            ) : (
              <>
                <div className="mb-4 flex items-center gap-2">
                  <button
                    onClick={() => setShowPayment(false)}
                    className="rounded-full p-1 text-gray-500 transition-colors hover:bg-[#292B30] hover:text-white"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <span className="text-sm font-medium text-gray-300">Complete Payment</span>
                </div>
                <PaymentFlow
                  tradeId={tradeId}
                  quantity={order.quantity || 1}
                  productToken={tokenSymbol}
                  totalAmount={orderTotal.total}
                  logisticsProvider={providerAddr}
                  logisticsCost={logisticsCostRaw}
                  onSuccess={async (txHash, purchaseId) => {
                    if (orderId) {
                      try {
                        await updateOrderStatus({
                          orderId,
                          details: {
                            status: "accepted",
                            // Only store the numeric on-chain purchaseId.
                            // Never fall back to txHash — it is not a valid
                            // purchaseId and would break confirmDelivery.
                            ...(purchaseId ? { purchaseId } : {}),
                            txHash,
                          },
                        }).unwrap();
                      } catch {
                        await refetch();
                      }
                    }
                    // Do NOT close here — let the user read the success screen
                    // (which shows the txHash and purchaseId) and click Done.
                  }}
                  onClose={() => setShowPayment(false)}
                  productName={order.product?.name}
                  productImage={order.product?.images?.[0]}
                />
              </>
            )}
          </div>
        )}

        {/* Order information */}
        <div className="rounded-2xl border border-[#292B30] bg-[#212428] p-4">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-400">
            Order Information
          </h3>
          <div className="space-y-3">
            <DetailRow label="Order ID" value={`#${order.orderId}`} mono />
            {order.purchaseId && (
              <DetailRow label="Purchase ID" value={`#${order.purchaseId}`} mono />
            )}
            <DetailRow
              label="Date"
              value={
                order.createdAt
                  ? new Date(order.createdAt).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "—"
              }
            />
            {order.quantity && (
              <DetailRow label="Quantity" value={String(order.quantity)} />
            )}
            {sellerName && <DetailRow label="Seller" value={sellerName} />}
          </div>
        </div>

        {/* Post-payment actions — only when purchaseId is a valid numeric on-chain ID */}
        {order.purchaseId && /^\d+$/.test(order.purchaseId) && (
          <TradeActions
            purchaseId={order.purchaseId}
            status={status}
            checklistComplete={checklistComplete}
            onActionComplete={async (action) => {
              if (!orderId) return;

              const statusMap: Record<string, OrderStatus> = {
                confirm: "completed",
                dispute: "disputed",
                cancel: "rejected",
              };
              const newStatus = statusMap[action];
              if (newStatus) {
                try {
                  await updateOrderStatus({
                    orderId,
                    details: { status: newStatus },
                  }).unwrap();
                } catch {
                  // Mutation failed — invalidatesTags didn't fire, so manually
                  // refetch to keep the UI in sync with the server.
                  refetch();
                }
              }

              if (action === "cancel") navigate("/account");
            }}
          />
        )}

        {/* Review — only after order is completed */}
        {status === "completed" && sellerId && orderId && (
          <ReviewForm orderId={orderId} reviewed={sellerId} />
        )}

        {/* Contact seller */}
        {sellerId && (
          <button
            onClick={() => navigate(`/chat/${sellerId}`)}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#292B30] bg-[#292B30] py-3 text-sm font-medium text-gray-300 transition-colors hover:bg-[#373A3F] hover:text-white"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            Contact Seller
          </button>
        )}
      </div>
    </div>
  );
};

// ── Helpers ──────────────────────────────────────────────────────────

function DetailRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-sm text-gray-500 flex-shrink-0">{label}</span>
      <span
        className={`text-sm font-medium text-white text-right break-all ${mono ? "font-mono text-xs" : ""}`}
      >
        {value}
      </span>
    </div>
  );
}

// ── Status-contextual information panel ──────────────────────────────

const DELIVERY_CHECKS = [
  { id: "received",     label: "I have received the package" },
  { id: "matches",      label: "The item matches the listing description" },
  { id: "condition",    label: "There is no damage or visible defects" },
  { id: "complete",     label: "All parts and accessories are included" },
  { id: "acknowledge",  label: "I understand this will release payment to the seller" },
];

function StatusInfoPanel({
  status,
  order,
  orderTotal,
  tokenSymbol,
  logisticsCostNumeric,
  chainId,
  onMarkReceived,
  isMarkingReceived = false,
  onChecklistChange,
}: {
  status: TradeState;
  order: any;
  orderTotal: { subtotal: number; total: number };
  tokenSymbol: string;
  logisticsCostNumeric: number;
  chainId: number;
  onMarkReceived?: () => Promise<void>;
  isMarkingReceived?: boolean;
  onChecklistChange?: (complete: boolean) => void;
}) {
  const [checked, setChecked] = useState<Record<string, boolean>>(
    () => Object.fromEntries(DELIVERY_CHECKS.map((c) => [c.id, false]))
  );
  const allChecked = DELIVERY_CHECKS.every((c) => checked[c.id]);

  const toggle = (id: string) => {
    const next = { ...checked, [id]: !checked[id] };
    setChecked(next);
    onChecklistChange?.(DELIVERY_CHECKS.every((c) => next[c.id]));
  };

  const toggleAll = () => {
    const next = Object.fromEntries(DELIVERY_CHECKS.map((c) => [c.id, !allChecked]));
    setChecked(next);
    onChecklistChange?.(!allChecked);
  };

  const purchaseId = order.purchaseId as string | undefined;
  const isTxHash = typeof purchaseId === "string" && purchaseId.startsWith("0x") && purchaseId.length === 66;

  if (status === "pending_payment") {
    return (
      <div className="rounded-2xl border border-[#292B30] bg-[#212428] p-5">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[#292B30]">
            <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Order Placed</h3>
            <p className="text-xs text-gray-500">Awaiting your payment</p>
          </div>
        </div>

        <div className="rounded-xl bg-[#292B30] p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
            Price Breakdown
          </p>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">
                {order.product?.name ?? "Product"} × {order.quantity ?? 1}
              </span>
              <span className="text-sm text-white">
                {orderTotal.subtotal.toFixed(2)} {tokenSymbol}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Delivery</span>
              <span className="text-sm text-white">
                {logisticsCostNumeric.toFixed(2)} {tokenSymbol}
              </span>
            </div>
            <div className="flex items-center justify-between border-t border-[#373A3F] pt-2.5">
              <span className="text-sm font-semibold text-white">Total Due</span>
              <span className="text-sm font-bold text-red-400">
                {orderTotal.total.toFixed(2)} {tokenSymbol}
              </span>
            </div>
          </div>
        </div>

        <p className="mt-3 text-center text-xs text-gray-500">
          Your order is reserved — complete payment to confirm it.
        </p>
      </div>
    );
  }

  if (status === "paid") {
    return (
      <div className="rounded-2xl border border-green-900/40 bg-green-900/10 p-5">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-green-800/50 bg-green-900/40">
            <svg className="h-4 w-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Payment Confirmed</h3>
            <p className="text-xs text-green-500">Funds secured in escrow</p>
          </div>
        </div>

        <div className="space-y-3 rounded-xl bg-[#292B30] p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">Amount in Escrow</span>
            <span className="text-sm font-bold text-white">
              {orderTotal.total.toFixed(2)} {tokenSymbol}
            </span>
          </div>
          {purchaseId && (
            <div className="space-y-1">
              <span className="text-xs text-gray-500">Purchase ID</span>
              <p className="break-all font-mono text-xs text-gray-300">{purchaseId}</p>
            </div>
          )}
        </div>

        <div className="mt-3 flex items-start gap-2.5 rounded-xl border border-[#373A3F] bg-[#292B30] p-3">
          <svg className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <p className="text-xs text-gray-400">
            Payment is held in a smart contract escrow and will only be released once you confirm delivery.
          </p>
        </div>

        {onMarkReceived && (
          <button
            onClick={onMarkReceived}
            disabled={isMarkingReceived}
            className="mt-4 w-full rounded-xl bg-[#292B30] py-3 text-sm font-semibold text-white transition-colors hover:bg-[#373A3F] active:scale-[0.98] disabled:opacity-60"
          >
            {isMarkingReceived ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Updating…
              </span>
            ) : (
              "I've Received My Order"
            )}
          </button>
        )}
      </div>
    );
  }

  // Shipped panel — commented out until logistics provider management system is ready.
  // To restore: uncomment this block and revert STATE_TO_STEP["shipped"] in TradeStatus.tsx.
  // if (status === "shipped") { ... }

  if (status === "delivered") {
    return (
      <div className="rounded-2xl border border-amber-800/40 bg-amber-900/10 p-5">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-amber-800/50 bg-amber-900/40">
            <svg className="h-4 w-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Inspect Your Delivery</h3>
            <p className="text-xs text-amber-400">Check each item before confirming</p>
          </div>
        </div>

        <div className="rounded-xl bg-[#292B30] p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Delivery checklist
            </p>
            <button
              onClick={toggleAll}
              className="text-xs font-medium text-amber-400 transition-colors hover:text-amber-300"
            >
              {allChecked ? "Deselect all" : "Select all"}
            </button>
          </div>

          <div className="space-y-3">
            {DELIVERY_CHECKS.map((item) => (
              <button
                key={item.id}
                onClick={() => toggle(item.id)}
                className="flex w-full items-center gap-3 text-left"
              >
                <div
                  className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded border transition-all ${
                    checked[item.id]
                      ? "border-green-600 bg-green-600"
                      : "border-[#373A3F] bg-[#1a1c20] hover:border-gray-500"
                  }`}
                >
                  {checked[item.id] && (
                    <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <span
                  className={`text-sm transition-colors ${
                    checked[item.id] ? "text-white" : "text-gray-400"
                  }`}
                >
                  {item.label}
                </span>
              </button>
            ))}
          </div>

          {/* Progress indicator */}
          <div className="mt-4">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-xs text-gray-500">
                {DELIVERY_CHECKS.filter((c) => checked[c.id]).length} of {DELIVERY_CHECKS.length} completed
              </span>
              {allChecked && (
                <span className="text-xs font-medium text-green-400">Ready to confirm</span>
              )}
            </div>
            <div className="h-1 w-full overflow-hidden rounded-full bg-[#1a1c20]">
              <div
                className="h-full rounded-full bg-green-600 transition-all duration-300"
                style={{
                  width: `${(DELIVERY_CHECKS.filter((c) => checked[c.id]).length / DELIVERY_CHECKS.length) * 100}%`,
                }}
              />
            </div>
          </div>
        </div>

        <div className="mt-3 flex items-start gap-2.5 rounded-xl border border-red-900/40 bg-red-900/20 p-3">
          <svg className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-xs text-red-300">
            Confirming delivery <strong>permanently releases payment</strong> from escrow to the seller. This cannot be undone.
          </p>
        </div>
      </div>
    );
  }

  if (status === "completed") {
    const explorerHref = isTxHash && purchaseId
      ? getExplorerUrl(chainId, purchaseId, "tx")
      : null;
    const completedDate = order.updatedAt ?? order.createdAt;

    return (
      <div className="rounded-2xl border border-green-900/40 bg-green-900/10 p-5">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-green-800/50 bg-green-900/40">
            <svg className="h-5 w-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Order Complete</h3>
            <p className="text-xs text-green-500">Successfully delivered</p>
          </div>
        </div>

        <div className="rounded-xl bg-[#292B30] p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
            Order Summary
          </p>
          <div className="space-y-2.5">
            <DetailRow label="Product" value={order.product?.name ?? "—"} />
            <DetailRow label="Quantity" value={String(order.quantity ?? 1)} />
            <DetailRow
              label="Total Paid"
              value={`${orderTotal.total.toFixed(2)} ${tokenSymbol}`}
            />
            {completedDate && (
              <DetailRow
                label="Completed"
                value={new Date(completedDate).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              />
            )}
            {purchaseId && (
              <DetailRow label="Purchase ID" value={purchaseId} mono />
            )}
          </div>

          {explorerHref && (
            <a
              href={explorerHref}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-lg border border-[#373A3F] bg-[#1a1c20] py-2.5 text-xs font-medium text-gray-400 transition-colors hover:text-white"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              View on Blockchain Explorer
            </a>
          )}
        </div>
      </div>
    );
  }

  if (status === "disputed") {
    return (
      <div className="rounded-2xl border border-amber-800/40 bg-amber-900/10 p-5">
        <div className="mb-3 flex items-center gap-3">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-amber-800/50 bg-amber-900/40">
            <svg className="h-4 w-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Order Under Dispute</h3>
            <p className="text-xs text-amber-400">Under review</p>
          </div>
        </div>
        <p className="text-sm text-gray-400">
          This order is currently under dispute. Our team will review the situation and mediate a fair resolution. Funds remain safely in escrow until the dispute is resolved.
        </p>
        <p className="mt-2 text-xs text-gray-500">
          Please avoid taking any action until you hear from us.
        </p>
      </div>
    );
  }

  if (status === "cancelled") {
    return (
      <div className="rounded-2xl border border-[#292B30] bg-[#212428] p-5">
        <div className="mb-3 flex items-center gap-3">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[#292B30]">
            <svg className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Order Cancelled</h3>
            <p className="text-xs text-gray-500">No further action needed</p>
          </div>
        </div>
        <p className="text-sm text-gray-400">
          This order has been cancelled. If a payment was made, a refund will be processed to your wallet.
        </p>
      </div>
    );
  }

  return null;
}

// ── Review form (shown after order is completed) ──────────────────────

function ReviewForm({ orderId, reviewed }: { orderId: string; reviewed: string }) {
  const { data: existingReview, isLoading: reviewLoading } = useGetOrderReviewQuery(orderId);
  const [createReview, { isLoading: submitting }] = useCreateReviewMutation();

  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  if (reviewLoading) return null;

  // Already reviewed — show the submitted review
  if (existingReview || done) {
    const r = existingReview;
    const displayRating = r?.rating ?? rating;
    const displayComment = r?.comment ?? comment;
    return (
      <div className="rounded-2xl border border-[#292B30] bg-[#212428] p-5">
        <div className="mb-3 flex items-center gap-3">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-green-800/50 bg-green-900/40">
            <svg className="h-4 w-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Review Submitted</h3>
            <p className="text-xs text-gray-500">Thank you for your feedback</p>
          </div>
        </div>
        <div className="rounded-xl bg-[#292B30] p-4">
          <div className="mb-2 flex gap-0.5">
            {[1, 2, 3, 4, 5].map((s) => (
              <svg
                key={s}
                className={`h-5 w-5 ${s <= displayRating ? "text-amber-400" : "text-gray-600"}`}
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            ))}
          </div>
          {displayComment && (
            <p className="text-sm text-gray-300">{displayComment}</p>
          )}
        </div>
      </div>
    );
  }

  const handleSubmit = async () => {
    if (rating === 0) { setError("Please select a star rating."); return; }
    if (!comment.trim()) { setError("Please write a short comment."); return; }
    setError("");
    const result = await createReview({ reviewed, order: orderId, rating: rating as 1|2|3|4|5, comment: comment.trim() });
    if ("data" in result) {
      setDone(true);
    } else {
      setError("Couldn't submit your review. Please try again.");
    }
  };

  return (
    <div className="rounded-2xl border border-[#292B30] bg-[#212428] p-5">
      <h3 className="mb-1 text-sm font-semibold text-white">Rate Your Experience</h3>
      <p className="mb-4 text-xs text-gray-500">How was the product and seller?</p>

      {/* Star picker */}
      <div className="mb-4 flex gap-1">
        {[1, 2, 3, 4, 5].map((s) => (
          <button
            key={s}
            onClick={() => setRating(s)}
            onMouseEnter={() => setHovered(s)}
            onMouseLeave={() => setHovered(0)}
            className="transition-transform active:scale-90"
            aria-label={`Rate ${s} star${s > 1 ? "s" : ""}`}
          >
            <svg
              className={`h-8 w-8 transition-colors ${
                s <= (hovered || rating) ? "text-amber-400" : "text-gray-600"
              }`}
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          </button>
        ))}
        {rating > 0 && (
          <span className="ml-2 self-center text-xs text-gray-400">
            {["", "Poor", "Fair", "Good", "Very Good", "Excellent"][rating]}
          </span>
        )}
      </div>

      {/* Comment */}
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Share your experience with this product and seller…"
        rows={3}
        className="w-full resize-none rounded-xl border border-[#292B30] bg-[#1a1c20] px-3 py-2.5 text-sm text-white placeholder-gray-600 outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600"
      />

      {error && (
        <p className="mt-2 text-xs text-red-400">{error}</p>
      )}

      <button
        onClick={handleSubmit}
        disabled={submitting}
        className="mt-3 w-full rounded-xl bg-red-600 py-3 text-sm font-bold text-white transition-colors hover:bg-red-700 active:scale-[0.98] disabled:opacity-60"
      >
        {submitting ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Submitting…
          </span>
        ) : (
          "Submit Review"
        )}
      </button>
    </div>
  );
}

function mapStatus(status: string): TradeState {
  const map: Record<string, TradeState> = {
    pending: "pending_payment",
    accepted: "paid",
    paid: "paid",
    shipped: "paid", // logistics system not ready — show as paid until delivered
    delivered: "delivered",
    completed: "completed",
    disputed: "disputed",
    cancelled: "cancelled",
    rejected: "cancelled",
    refunded: "pending_payment",
    release: "completed",
  };
  return map[status?.toLowerCase()] ?? "pending_payment";
}

export default ViewOrderDetail;
