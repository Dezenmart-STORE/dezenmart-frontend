import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useChainId, useSwitchChain } from "wagmi";
import { useGetOrderByIdQuery, useUpdateOrderStatusMutation } from "../store/api";
import { TradeStatus, TradeActions, TransactionResult, PaymentFlow } from "../lean";
import type { TradeState } from "../lean";
import { useCurrency } from "../lean";
import { calculateOrderTotal } from "../lean/utils/format";
import { CHAIN_IDS, DEFAULT_LOGISTICS_PROVIDER } from "../lean/config/chains";

const ViewOrderDetail = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { formatAmount } = useCurrency();

  // Chain state — read directly from wagmi (no auto-switch; WrongNetworkBanner
  // in Layout already handles the one-time auto-switch on connect).
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

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-3 border-gray-200 border-t-red-600" />
          <p className="mt-4 text-sm text-gray-500">Loading order details...</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="mx-auto max-w-lg px-4 py-12">
        <TransactionResult
          success={false}
          message="Could not load this order. It may not exist or you may not have access."
          onDone={() => navigate("/account")}
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  const status = mapStatus(order.status);
  const tokenSymbol = order.product?.paymentToken ?? "cUSD";

  const sellerName =
    typeof order.seller === "object" ? order.seller?.name : order.seller;
  const sellerId =
    typeof order.seller === "object" ? order.seller?._id : order.seller;

  // ── Payment params (for pending orders without a purchaseId) ──────────
  const tradeId = order.product?.tradeId ?? "";
  const canPay =
    status === "pending_payment" &&
    !order.purchaseId &&
    /^\d+$/.test(tradeId); // tradeId must be a valid on-chain integer

  // Always use the registered on-chain provider — it's the only one registered.
  // The DB-stored address may differ or be unregistered.
  const providerAddr = DEFAULT_LOGISTICS_PROVIDER;

  // Resolve logistics cost from product data. The contract requires non-zero
  // logisticsCost, so we look up the cost for DEFAULT_LOGISTICS_PROVIDER from
  // the product's logistics list, then fall back to the first available cost,
  // then to "1" (matching the CreateProduct default).
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
      : "0.1"; // contract requires non-zero; small default to avoid overcharging

  const logisticsCostNumeric = parseFloat(logisticsCostRaw) || 0.1;

  const orderTotal = calculateOrderTotal(
    order.product?.price ?? order.amount,
    order.quantity ?? 1,
    logisticsCostNumeric
  );

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6">
      <div className="mx-auto max-w-lg space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/account")}
            className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-xl font-bold text-gray-900">Order Details</h1>
        </div>

        {/* Product info card */}
        <div className="flex gap-4 rounded-2xl bg-white p-4 shadow-sm">
          {order.product?.images?.[0] && (
            <img
              src={order.product.images[0]}
              alt={order.product?.name}
              className="h-20 w-20 rounded-xl object-cover"
            />
          )}
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold text-gray-900">
              {order.product?.name ?? "Product"}
            </h2>
            <p className="mt-1 text-lg font-bold text-gray-900">
              {(order.amount ?? 0).toFixed(2)} {tokenSymbol}
            </p>
            <p className="text-xs text-gray-500">
              {formatAmount(order.amount ?? 0, tokenSymbol)}
            </p>
          </div>
        </div>

        {/* Status stepper */}
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-medium text-gray-700">
            Order Status
          </h3>
          <TradeStatus status={status} />
        </div>

        {/* ── Payment section (pending orders only) ─────────────────── */}
        {canPay && !isOnCelo && (
          /* User needs to switch to Celo before they can pay */
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <div className="text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-amber-50">
                <svg className="h-6 w-6 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
                </svg>
              </div>
              <h3 className="text-base font-semibold text-gray-900">
                Wrong Network
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Your wallet needs to be on Celo to complete this payment.
              </p>
              <button
                onClick={switchToCelo}
                disabled={isSwitching}
                className="mt-4 w-full rounded-xl bg-amber-500 py-3 text-sm font-bold text-white transition-colors hover:bg-amber-600 active:scale-[0.98] disabled:opacity-60"
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

        {canPay && isOnCelo && (
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            {!showPayment ? (
              <div className="text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-amber-50">
                  <svg className="h-6 w-6 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                </div>
                <h3 className="text-base font-semibold text-gray-900">
                  Payment Pending
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Complete your payment to confirm this order.
                </p>
                <div className="mt-2 rounded-lg bg-gray-50 px-3 py-2">
                  <p className="text-sm font-bold text-gray-900">
                    Total: {orderTotal.total.toFixed(2)} {tokenSymbol}
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
                    className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <span className="text-sm font-medium text-gray-700">Complete Payment</span>
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
                      await updateOrderStatus({
                        orderId,
                        details: {
                          status: "accepted",
                          purchaseId: purchaseId ?? txHash,
                        },
                      }).catch(() => {});
                    }
                    await refetch();
                    setShowPayment(false);
                  }}
                  onClose={() => setShowPayment(false)}
                  productName={order.product?.name}
                  productImage={order.product?.images?.[0]}
                />
              </>
            )}
          </div>
        )}

        {/* Order details */}
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <h3 className="mb-3 text-sm font-medium text-gray-700">
            Order Information
          </h3>
          <div className="space-y-2">
            <DetailRow label="Order ID" value={`#${order._id}`} mono />
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

        {/* Post-payment actions (confirm delivery, dispute, cancel) */}
        {order.purchaseId && (
          <TradeActions
            purchaseId={order.purchaseId}
            status={status}
            onActionComplete={async (action) => {
              if (action === "confirm" && orderId) {
                await updateOrderStatus({
                  orderId,
                  details: { status: "completed", purchaseId: order.purchaseId },
                }).catch(() => {});
              }
              if (action === "dispute" && orderId) {
                await updateOrderStatus({
                  orderId,
                  details: { status: "disputed" },
                }).catch(() => {});
              }
              if (action === "cancel" && orderId) {
                await updateOrderStatus({
                  orderId,
                  details: { status: "rejected" },
                }).catch(() => {});
              }

              refetch();
              if (action === "cancel") {
                navigate("/account");
              }
            }}
          />
        )}

        {/* Contact seller */}
        {sellerId && (
          <button
            onClick={() => navigate(`/chat/${sellerId}`)}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
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
    <div className="flex items-center justify-between">
      <span className="text-sm text-gray-500">{label}</span>
      <span
        className={`text-sm font-medium text-gray-900 ${mono ? "font-mono" : ""}`}
      >
        {value}
      </span>
    </div>
  );
}

function mapStatus(status: string): TradeState {
  const map: Record<string, TradeState> = {
    pending: "pending_payment",
    accepted: "paid",
    paid: "paid",
    shipped: "shipped",
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
