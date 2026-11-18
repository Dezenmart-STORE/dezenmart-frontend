import { useEffect, useMemo, useState, type ReactNode } from "react";
import { HiBuildingLibrary } from "react-icons/hi2";
import {
  useGetBankTransferPaymentStatusQuery,
  useStartBankTransferPaymentMutation,
} from "../../../store/api";
import { FINAL_PAYMENT_STATES, type BankTransferOrder } from "../../../utils/validation/bankTransfer";
import { instructionsMismatch, isPaymentWindowClosed } from "../../../utils/bankTransferLifecycle";
import { apiErrorStatus, logError } from "../../../utils/errors";
import { formatDeadline, formatNaira } from "../../../utils/format";
import Button from "../../common/Button";
import LoadingSpinner from "../../common/LoadingSpinner";
import StatusBox from "../../common/StatusBox";
import CopyRow from "./CopyRow";

const POLL_EVERY_MS = 5000;

interface Props {
  order: BankTransferOrder;
  /** Ask for the order again, e.g. when the server says it is no longer awaiting payment. */
  onOrderStale: () => void;
}

/**
 * The account details for paying an order, checked against the order before
 * they are shown, then a watch on the payment until the bank confirms it.
 */
export default function PaymentPanel({ order, onOrderStale }: Props) {
  // A shared key, so a reload of the view (or a second mount) reuses the same reply.
  const [startPayment, { data: instructions, isLoading: starting, error: startError, reset }] =
    useStartBankTransferPaymentMutation({ fixedCacheKey: `pay-${order._id}` });

  const [now, setNow] = useState(() => new Date());
  const closed = isPaymentWindowClosed(order, now);

  // Re-check the deadline every 30 seconds so an open screen stops offering payment on time.
  useEffect(() => {
    if (!order.expiresAt) return;
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, [order.expiresAt]);

  const mismatch = useMemo(() => (instructions ? instructionsMismatch(instructions, order) : undefined), [instructions, order]);
  useEffect(() => {
    if (mismatch) logError(new Error(mismatch), "api-contract", { endpoint: "POST /payments/fiat/initialize", orderId: order._id });
  }, [mismatch, order._id]);

  const startStatus = apiErrorStatus(startError);
  useEffect(() => {
    // 409: the order moved on (paid, or expired) while this screen was open.
    if (startStatus === 409) onOrderStale();
  }, [startStatus, onOrderStale]);

  const watchable = instructions && !mismatch && !closed;
  const [settled, setSettled] = useState(false);
  const { data: payment, isError: statusFailed } = useGetBankTransferPaymentStatusQuery(instructions?.reference ?? "", {
    skip: !watchable,
    // Stop asking once the bank has given a final answer.
    pollingInterval: settled ? 0 : POLL_EVERY_MS,
    skipPollingIfUnfocused: true,
  });
  useEffect(() => {
    if (payment && FINAL_PAYMENT_STATES.has(payment.status)) setSettled(true);
  }, [payment]);

  if (closed) {
    return (
      <Section>
        <StatusBox tone="warning" title="The time to pay has passed">
          This order was held for you until {formatDeadline(order.expiresAt ?? "", now)}. If you already sent the money,
          it will be refunded. You can place the order again from the product page.
        </StatusBox>
      </Section>
    );
  }

  if (!instructions) {
    return (
      <Section>
        <div className="text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-amber-800/50 bg-amber-900/30">
            <HiBuildingLibrary className="h-6 w-6 text-amber-400" aria-hidden />
          </div>
          <h2 className="text-base font-semibold text-white">Payment pending</h2>
          <p className="mt-1 text-sm text-gray-300">
            Pay {formatNaira(order.totals.total)} by bank transfer
            {order.expiresAt ? ` by ${formatDeadline(order.expiresAt, now)}` : ""} to confirm this order.
          </p>
        </div>
        {startError && startStatus !== 409 && (
          <div className="mt-4">
            <StatusBox tone="danger">We couldn't get the account details. Try again.</StatusBox>
          </div>
        )}
        <div className="mt-4">
          <Button
            variant="primary"
            title="Show account details"
            loading={starting}
            loadingTitle="Getting account details…"
            onClick={() => {
              reset();
              void startPayment({ orderId: order._id });
            }}
          />
        </div>
      </Section>
    );
  }

  if (mismatch) {
    return (
      <Section>
        <StatusBox tone="danger" title="Don't send money yet">
          These payment details don't match your order. Refresh the page to get new ones, or contact support if this
          happens again.
        </StatusBox>
      </Section>
    );
  }

  const { virtualAccount } = instructions;
  return (
    <Section>
      <h2 className="text-base font-semibold text-white">Pay by bank transfer</h2>
      <p className="mt-1 text-sm text-gray-300">
        Send exactly this amount from your banking app by {formatDeadline(virtualAccount.expiresAt, now)}.
      </p>

      <div className="mt-3 divide-y divide-[#3A3C41] rounded-xl bg-[#292B30] px-4">
        <CopyRow
          label="Amount"
          display={formatNaira(instructions.amount)}
          copyValue={instructions.amount.toFixed(2)}
          hint="Send the exact amount, kobo included, or the payment can't be matched."
          emphasis
        />
        <CopyRow label="Account number" display={virtualAccount.accountNumber} copyValue={virtualAccount.accountNumber} />
        <CopyRow label="Bank" display={virtualAccount.bankName} />
        <CopyRow
          label="Account name"
          display={virtualAccount.accountName}
          hint="This account is opened just for this order. Your money is held safely until you confirm you have your item."
        />
      </div>

      <div className="mt-4">
        <PaymentWatch status={payment?.status} failed={statusFailed} />
      </div>
    </Section>
  );
}

function PaymentWatch({ status, failed }: { status?: string; failed: boolean }) {
  if (status === "success") {
    return <StatusBox tone="success" title="Payment received">Updating your order…</StatusBox>;
  }
  if (status === "failed") {
    return (
      <StatusBox tone="danger" title="This payment didn't go through">
        If money left your account, your bank will return it. Contact support if it doesn't arrive.
      </StatusBox>
    );
  }
  if (status === "expired") {
    return (
      <StatusBox tone="warning" title="These account details have expired">
        Don't send money to this account. Refresh the page to see where your order stands.
      </StatusBox>
    );
  }
  return (
    <div role="status" className="flex items-center gap-2 text-sm text-gray-300">
      <LoadingSpinner size="sm" />
      {failed
        ? "We can't check your payment right now. We'll keep trying."
        : "Waiting for your transfer. This page updates once it arrives."}
    </div>
  );
}

function Section({ children }: { children: ReactNode }) {
  return <section className="rounded-2xl border border-[#292B30] bg-[#212428] p-5">{children}</section>;
}
