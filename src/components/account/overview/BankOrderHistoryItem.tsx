import React from "react";
import { useNavigate } from "react-router-dom";
import type { BankTransferOrder, BankTransferOrderStatus } from "../../../utils/validation/bankTransfer";
import { formatNaira } from "../../../utils/format";

/** Same badge colours as the crypto order rows, by meaning. */
const STATUS: Record<BankTransferOrderStatus, { label: string; style: string }> = {
  awaiting_payment: { label: "Awaiting payment", style: "bg-blue-900/40 text-blue-300" },
  paid: { label: "Paid", style: "bg-green-900/40 text-green-300" },
  preparing: { label: "Preparing", style: "bg-amber-900/40 text-amber-300" },
  ready: { label: "Ready", style: "bg-amber-900/40 text-amber-300" },
  out_for_delivery: { label: "On the way", style: "bg-amber-900/40 text-amber-300" },
  delivered: { label: "Delivered", style: "bg-amber-900/40 text-amber-300" },
  completed: { label: "Completed", style: "bg-green-900/40 text-green-300" },
  disputed: { label: "Problem reported", style: "bg-red-900/40 text-red-300" },
  rejected: { label: "Declined", style: "bg-red-900/40 text-red-300" },
  cancelled: { label: "Cancelled", style: "bg-red-900/40 text-red-300" },
  refunded: { label: "Refunded", style: "bg-yellow-900/40 text-yellow-300" },
};

/** Orders waiting on this person, so they stand out in the list. */
function needsYou(order: BankTransferOrder, role: "buyer" | "seller"): boolean {
  if (role === "seller") return order.status === "paid" || order.status === "preparing";
  return order.status === "awaiting_payment" || order.status === "delivered";
}

interface Props {
  order: BankTransferOrder;
  role: "buyer" | "seller";
  viewMode?: "list" | "grid";
}

/** A bank-transfer order in Order History, drawn like the crypto OrderHistoryItem. */
const BankOrderHistoryItem: React.FC<Props> = React.memo(({ order, role, viewMode = "list" }) => {
  const navigate = useNavigate();
  const isSale = role === "seller";
  const first = order.items[0];
  const name = first?.name ?? "Order";
  const more = order.items.length - 1;
  const title = more > 0 ? `${name} and ${more} more` : name;
  const counterparty = isSale ? "Paid by bank transfer" : `by ${order.vendor?.businessName ?? "the seller"}`;
  const image = first?.image || "https://placehold.co/200x200?text=?";
  const date = order.createdAt
    ? new Date(order.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : undefined;
  const status = STATUS[order.status];
  const statusLabel =
    order.status === "ready" && order.fulfilment === "pickup" ? "Ready for pickup" : status.label;
  const attention = needsYou(order, role);
  const open = () => navigate(`/orders/${order._id}`);
  const focusRing = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400";

  if (viewMode === "grid") {
    return (
      <button
        type="button"
        onClick={open}
        className={`w-full text-left bg-[#292B30] rounded-xl overflow-hidden hover:bg-[#32353A] active:bg-[#3A3D42] transition-colors ${focusRing}`}
      >
        <img src={image} alt="" loading="lazy" className="w-full aspect-square object-cover bg-[#1a1c20]" />
        <div className="p-2.5">
          <p className="font-semibold text-white text-xs truncate">{title}</p>
          <p className="text-xs text-gray-400 mt-0.5 truncate">{counterparty}</p>
          <div className="flex items-center justify-between mt-1.5 gap-1">
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium whitespace-nowrap ${status.style}`}>
              {statusLabel}
            </span>
            {date && <span className="text-[10px] text-gray-400 truncate">{date}</span>}
          </div>
        </div>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={open}
      className={`w-full text-left bg-[#292B30] rounded-xl p-3 flex items-center gap-2 xxs:gap-3 hover:bg-[#32353A] active:bg-[#3A3D42] transition-colors ${
        attention ? "ring-1 ring-red-500/60" : ""
      } ${focusRing}`}
    >
      <img
        src={image}
        alt=""
        loading="lazy"
        className="w-14 h-14 xxs:w-16 xxs:h-16 rounded-lg object-cover flex-shrink-0 bg-[#1a1c20]"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-semibold text-white text-sm truncate">{title}</p>
          <span
            className={`flex-shrink-0 text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
              isSale ? "bg-green-900/40 text-green-300" : "bg-blue-900/40 text-blue-300"
            }`}
          >
            {isSale ? "Sale" : "Purchase"}
          </span>
        </div>
        <p className="text-xs text-gray-400 mt-0.5 truncate">{counterparty}</p>
        <p className="text-sm font-medium text-white mt-1.5">{formatNaira(order.totals.total)}</p>
        {attention && <p className="text-xs font-medium text-red-300 mt-0.5">Needs your action</p>}
      </div>
      <div className="flex flex-col items-end gap-2 flex-shrink-0">
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${status.style}`}>
          {statusLabel}
        </span>
        {date && <span className="text-xs text-gray-400">{date}</span>}
        <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </button>
  );
});

BankOrderHistoryItem.displayName = "BankOrderHistoryItem";
export default BankOrderHistoryItem;
