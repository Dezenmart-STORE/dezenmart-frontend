import { lazy } from "react";
import { useParams } from "react-router-dom";
import { BANK_TRANSFER_ENABLED } from "../config/features";
import { useGetOrderKindQuery } from "../store/api";

const ViewOrderDetail = lazy(() => import("./ViewOrderDetail"));
const BankTransferOrderView = lazy(() => import("./BankTransferOrderView"));

/**
 * /orders/:orderId serves crypto and bank-transfer orders. With bank transfer
 * off, nothing changes: the crypto screen loads straight away.
 */
export default function OrderDetailRoute() {
  if (!BANK_TRANSFER_ENABLED) return <ViewOrderDetail />;
  return <OrderKindSwitch />;
}

function OrderKindSwitch() {
  const { orderId = "" } = useParams<{ orderId: string }>();
  const { data, isLoading } = useGetOrderKindQuery(orderId, { skip: !orderId });

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-[#212428]" role="status">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-[#292B30] border-t-red-600" aria-hidden />
          <p className="mt-4 text-sm text-gray-400">Loading order…</p>
        </div>
      </div>
    );
  }
  // On an error the crypto screen asks again and shows its own error and retry.
  return data?.kind === "bank" ? <BankTransferOrderView orderId={orderId} /> : <ViewOrderDetail />;
}
