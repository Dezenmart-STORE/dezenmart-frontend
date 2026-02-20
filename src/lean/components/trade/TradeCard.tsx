import type { TradeState } from "./TradeStatus";
import { truncateAddress } from "../../utils/format";
import { useCurrency } from "../../context/CurrencyContext";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface TradeData {
  id: string;
  tradeId?: string;
  productName: string;
  productImage?: string;
  amount: number;
  tokenSymbol: string;
  quantity: number;
  status: TradeState;
  counterparty: string; // Seller address (if buyer) or buyer address (if seller)
  role: "buyer" | "seller";
  createdAt: string;
  purchaseId?: string;
}

interface Props {
  trade: TradeData;
  onClick?: () => void;
}

// ---------------------------------------------------------------------------
// Status badge config
// ---------------------------------------------------------------------------
const STATUS_BADGE: Record<
  TradeState,
  { label: string; bg: string; text: string; dot: string }
> = {
  pending_payment: {
    label: "Pending",
    bg: "bg-yellow-50",
    text: "text-yellow-700",
    dot: "bg-yellow-500",
  },
  paid: {
    label: "Paid",
    bg: "bg-blue-50",
    text: "text-blue-700",
    dot: "bg-blue-500",
  },
  shipped: {
    label: "Shipped",
    bg: "bg-indigo-50",
    text: "text-indigo-700",
    dot: "bg-indigo-500",
  },
  delivered: {
    label: "Delivered",
    bg: "bg-purple-50",
    text: "text-purple-700",
    dot: "bg-purple-500",
  },
  completed: {
    label: "Complete",
    bg: "bg-green-50",
    text: "text-green-700",
    dot: "bg-green-500",
  },
  disputed: {
    label: "Disputed",
    bg: "bg-amber-50",
    text: "text-amber-700",
    dot: "bg-amber-500",
  },
  cancelled: {
    label: "Cancelled",
    bg: "bg-gray-50",
    text: "text-gray-500",
    dot: "bg-gray-400",
  },
};

/**
 * Single trade card component. Handles all states via props — not separate components.
 */
export default function TradeCard({ trade, onClick }: Props) {
  const { formatAmount } = useCurrency();
  const badge = STATUS_BADGE[trade.status];

  const date = new Date(trade.createdAt);
  const formattedDate = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <button
      onClick={onClick}
      className="flex w-full gap-3 rounded-2xl border border-gray-100 bg-white p-4 text-left shadow-sm transition-all hover:border-gray-200 hover:shadow-md active:scale-[0.99]"
    >
      {/* Product image */}
      <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gray-100">
        {trade.productImage ? (
          <img
            src={trade.productImage}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
        )}
      </div>

      {/* Details */}
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between">
          <p className="truncate text-sm font-semibold text-gray-900">
            {trade.productName}
          </p>
          {/* Status badge */}
          <span
            className={`ml-2 flex flex-shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${badge.bg} ${badge.text}`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${badge.dot}`} />
            {badge.label}
          </span>
        </div>

        <p className="mt-0.5 text-sm font-bold text-gray-900">
          {trade.amount.toFixed(2)} {trade.tokenSymbol}
          <span className="ml-1 text-xs font-normal text-gray-400">
            {formatAmount(trade.amount, trade.tokenSymbol)}
          </span>
        </p>

        <div className="mt-1 flex items-center gap-3 text-xs text-gray-400">
          <span>Qty: {trade.quantity}</span>
          <span>
            {trade.role === "buyer" ? "Seller" : "Buyer"}:{" "}
            {truncateAddress(trade.counterparty, 3)}
          </span>
          <span>{formattedDate}</span>
        </div>
      </div>

      {/* Chevron */}
      <svg
        className="mt-2 h-4 w-4 flex-shrink-0 text-gray-300"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </button>
  );
}
