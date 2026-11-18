import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useGetBankTransferOrderQuery, useGetMySellerProfileQuery } from "../store/api";
import type { BankTransferOrder } from "../utils/validation/bankTransfer";
import { progressSteps, type OrderRole } from "../utils/bankTransferLifecycle";
import { formatNaira } from "../utils/format";
import StatusBox from "../components/common/StatusBox";
import OrderProgress from "../components/trade/bankTransfer/OrderProgress";
import PaymentPanel from "../components/trade/bankTransfer/PaymentPanel";
import OrderActions from "../components/trade/bankTransfer/OrderActions";
import { nextStepText, offPathMessage, type OffPathMessage } from "../components/trade/bankTransfer/orderCopy";

const OFF_PATH_TONE: Record<OffPathMessage["tone"], string> = {
  neutral: "border-[#292B30] bg-[#292B30]",
  amber: "border-amber-800/40 bg-amber-900/20",
  red: "border-red-900/40 bg-red-900/10",
};

/** A bank-transfer order, for its buyer or its seller. Laid out like the crypto order screen. */
export default function BankTransferOrderView({ orderId }: { orderId: string }) {
  const navigate = useNavigate();
  const { data: order, isLoading, isError, refetch } = useGetBankTransferOrderQuery(orderId);
  // The order names its seller's shop, not a user, so the viewer is the seller
  // when that shop is theirs. A buyer without a shop gets null here.
  const {
    data: myShop,
    isLoading: shopLoading,
    isError: shopFailed,
    refetch: refetchShop,
  } = useGetMySellerProfileQuery();
  const refresh = useCallback(() => void refetch(), [refetch]);
  const retryAll = useCallback(() => {
    void refetch();
    void refetchShop();
  }, [refetch, refetchShop]);

  if (isLoading || shopLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-[#212428]" role="status">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-[#292B30] border-t-red-600" aria-hidden />
          <p className="mt-4 text-sm text-gray-400">Loading order…</p>
        </div>
      </div>
    );
  }

  const role: OrderRole = myShop && order?.vendor && myShop._id === order.vendor._id ? "seller" : "buyer";

  return (
    <div className="min-h-screen bg-[#212428] px-4 py-6">
      <div className="mx-auto max-w-lg space-y-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate("/account")}
            className="rounded-full p-2 text-gray-400 transition-colors hover:bg-[#292B30] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
            aria-label="Go back"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-xl font-bold text-white">{role === "seller" ? "Sale details" : "Order details"}</h1>
        </div>

        {isError || !order || shopFailed ? (
          <StatusBox
            tone="danger"
            title="We couldn't load this order"
            action={
              <button
                type="button"
                onClick={retryAll}
                className="rounded text-sm font-medium text-red-300 underline hover:text-red-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
              >
                Retry
              </button>
            }
          >
            Check your connection. If it keeps happening, the order may not be yours to view.
          </StatusBox>
        ) : (
          <OrderBody order={order} role={role} onOrderStale={refresh} />
        )}
      </div>
    </div>
  );
}

function OrderBody({ order, role, onOrderStale }: { order: BankTransferOrder; role: OrderRole; onOrderStale: () => void }) {
  const steps = progressSteps(order);
  const offPath = offPathMessage(order, role);
  const first = order.items[0];
  const more = order.items.length - 1;
  const shopName = order.vendor?.businessName;

  return (
    <>
      <div className="flex gap-4 rounded-2xl border border-[#292B30] bg-[#292B30] p-4">
        {first?.image ? (
          <img src={first.image} alt="" className="h-20 w-20 flex-shrink-0 rounded-xl object-cover" />
        ) : (
          <div className="h-20 w-20 flex-shrink-0 rounded-xl bg-[#3A3C41]" aria-hidden />
        )}
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-base font-semibold text-white">{first?.name ?? "Order"}</h2>
          {first?.variantLabel && <p className="text-xs text-gray-400">{first.variantLabel}</p>}
          <p className="mt-1 text-xs text-gray-400">
            Qty {first?.quantity ?? 1}
            {more > 0 ? ` and ${more} more item${more > 1 ? "s" : ""}` : ""}
          </p>
          {role === "buyer" && shopName && <p className="text-xs text-gray-400">Sold by {shopName}</p>}
          <p className="mt-1 text-sm font-bold text-white">{formatNaira(order.totals.total)}</p>
        </div>
      </div>

      <section className="rounded-2xl border border-[#292B30] bg-[#212428] p-5">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-400">Order status</h2>
        {steps ? (
          <OrderProgress steps={steps} description={nextStepText(order, role)} />
        ) : offPath ? (
          <div className={`rounded-xl border p-4 ${OFF_PATH_TONE[offPath.tone]}`}>
            <h3 className="text-sm font-semibold text-white">{offPath.title}</h3>
            <p className="mt-1 text-sm text-gray-300">{offPath.text}</p>
          </div>
        ) : (
          <p className="text-sm text-gray-300">We'll show this order's progress here as soon as it updates.</p>
        )}
      </section>

      {role === "buyer" && order.status === "awaiting_payment" && (
        <PaymentPanel order={order} onOrderStale={onOrderStale} />
      )}

      <OrderActions order={order} role={role} onOrderStale={onOrderStale} />

      <section className="rounded-2xl border border-[#292B30] bg-[#212428] p-5">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-400">Summary</h2>
        <dl className="space-y-2 text-sm">
          <SummaryRow label="Items" value={formatNaira(order.totals.subtotal)} />
          <SummaryRow
            label={order.fulfilment === "pickup" ? "Pickup" : "Delivery"}
            // Shown as charged, never assumed: the server sets every line of the total.
            value={order.totals.deliveryFee > 0 ? formatNaira(order.totals.deliveryFee) : "Free"}
          />
          {order.totals.serviceFee > 0 && <SummaryRow label="Service fee" value={formatNaira(order.totals.serviceFee)} />}
          <div className="flex justify-between border-t border-[#292B30] pt-2 font-bold text-white">
            <dt>Total</dt>
            <dd>{formatNaira(order.totals.total)}</dd>
          </div>
        </dl>
        {order.fulfilment === "pickup" && order.vendor?.address && (
          <p className="mt-3 text-sm text-gray-300">
            <span className="text-gray-400">Pick up from: </span>
            {order.vendor.address}
            {order.vendor.phone ? ` · ${order.vendor.phone}` : ""}
          </p>
        )}
      </section>
    </>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-gray-400">{label}</dt>
      <dd className="text-gray-200">{value}</dd>
    </div>
  );
}
