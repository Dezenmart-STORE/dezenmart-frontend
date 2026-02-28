import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Order } from "../../../utils/types";
import { useCurrency } from "../../../lean";

const DISPUTE_STATUS_STYLES: Record<string, string> = {
  "pending":      "bg-yellow-900/40 text-yellow-300",
  "under review": "bg-blue-900/40 text-blue-300",
  "resolved":     "bg-green-900/40 text-green-300",
  "rejected":     "bg-red-900/40 text-red-300",
};

interface Props {
  order: Order;
  disputeStatus: string;
}

const DisputeItem: React.FC<Props> = React.memo(({ order, disputeStatus }) => {
  const navigate = useNavigate();
  const { formatAmount } = useCurrency();

  const sellerName = useMemo(
    () =>
      (typeof order.seller === "object" ? order.seller?.name : order.seller) ||
      "Unknown Seller",
    [order.seller]
  );

  const productImage = useMemo(
    () => order.product?.images?.[0] || "https://placehold.co/64x64?text=?",
    [order.product?.images]
  );

  const date = useMemo(() => {
    const raw = order.dispute?.createdAt ?? order.createdAt;
    return new Date(raw).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }, [order.dispute?.createdAt, order.createdAt]);

  const statusStyle =
    DISPUTE_STATUS_STYLES[disputeStatus.toLowerCase()] ??
    "bg-amber-900/40 text-amber-300";

  return (
    <button
      onClick={() => navigate(`/orders/${order._id}`)}
      className="w-full text-left bg-[#292B30] rounded-xl p-3 flex items-center gap-3 hover:bg-[#32353A] active:bg-[#3A3D42] transition-colors"
    >
      <img
        src={productImage}
        alt={order.product?.name ?? "Product"}
        loading="lazy"
        className="w-16 h-16 rounded-lg object-cover flex-shrink-0 bg-[#1a1c20]"
      />

      <div className="flex-1 min-w-0">
        <p className="font-semibold text-white text-sm truncate">
          {order.product?.name ?? "Unknown Product"}
        </p>
        <p className="text-xs text-gray-400 mt-0.5 truncate">by {sellerName}</p>
        <p className="text-sm font-medium text-white mt-1.5">
          {formatAmount(order.amount ?? 0, order.product?.paymentToken ?? "cUSD")}
        </p>
      </div>

      <div className="flex flex-col items-end gap-2 flex-shrink-0">
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${statusStyle}`}>
          {disputeStatus}
        </span>
        <span className="text-xs text-gray-500">{date}</span>
        <svg className="h-4 w-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </button>
  );
});

DisputeItem.displayName = "DisputeItem";
export default DisputeItem;
