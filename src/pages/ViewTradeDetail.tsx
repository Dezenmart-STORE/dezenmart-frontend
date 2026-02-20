import { useParams, useNavigate } from "react-router-dom";
import { useGetOrderByIdQuery } from "../store/api";
import { TradeStatus, TradeActions, TransactionResult } from "../lean";
import type { TradeState } from "../lean";
import { useCurrency } from "../lean";

const ViewTradeDetail = () => {
  const { tradeId } = useParams<{ tradeId: string }>();
  const navigate = useNavigate();
  const { formatAmount } = useCurrency();

  const {
    data: order,
    isLoading,
    error,
    refetch,
  } = useGetOrderByIdQuery(tradeId!, { skip: !tradeId });

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
          onDone={() => navigate("/trades/viewtrades")}
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  const status = mapStatus(order.status);
  const tokenSymbol = order.product?.paymentToken ?? "cUSD";

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6">
      <div className="mx-auto max-w-lg space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/trades/viewtrades")}
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
              alt={order.product.name}
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
            {typeof order.seller === "object" && order.seller?.name && (
              <DetailRow label="Seller" value={order.seller.name} />
            )}
          </div>
        </div>

        {/* Actions */}
        {order.purchaseId && (
          <TradeActions
            purchaseId={order.purchaseId}
            status={status}
            onActionComplete={(action) => {
              refetch();
              if (action === "cancel") {
                navigate("/trades/viewtrades");
              }
            }}
          />
        )}

        {/* Chat with seller/buyer */}
        {typeof order.seller === "object" && order.seller?._id && (
          <button
            onClick={() => navigate(`/chat/${(order.seller as { _id: string })._id}`)}
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
    <div className="flex items-center justify-between">
      <span className="text-sm text-gray-500">{label}</span>
      <span
        className={`text-sm font-medium text-gray-900 ${
          mono ? "font-mono" : ""
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function mapStatus(status: string): TradeState {
  const map: Record<string, TradeState> = {
    pending: "pending_payment",
    paid: "paid",
    shipped: "shipped",
    delivered: "delivered",
    completed: "completed",
    disputed: "disputed",
    cancelled: "cancelled",
    release: "completed",
  };
  return map[status] ?? "pending_payment";
}

export default ViewTradeDetail;
