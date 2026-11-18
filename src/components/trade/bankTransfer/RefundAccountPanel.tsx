import { useSubmitRefundAccountMutation } from "../../../store/api";
import type { BankTransferOrder } from "../../../utils/validation/bankTransfer";
import { formatNaira } from "../../../utils/format";
import PayoutAccountForm from "../../account/payout/PayoutAccountForm";

const refundFailure = (status: number | undefined) =>
  status === 409
    ? "This refund already has an account. Refresh the page to see where it stands."
    : status === 422
      ? "Your bank couldn't verify this account. Check the number and the bank."
      : status === 404
        ? "We couldn't find this order. Refresh the page and try again."
        : "Couldn't save your bank account. Try again.";

/** Asks the buyer where to send money owed back to them. */
export default function RefundAccountPanel({ order }: { order: BankTransferOrder }) {
  const [submitRefundAccount] = useSubmitRefundAccountMutation();
  const amount = order.refund?.amount;

  return (
    <section className="rounded-2xl border border-[#292B30] bg-[#212428] p-5">
      <h2 className="text-base font-semibold text-white">Where should we send your refund?</h2>
      <p className="mt-1 mb-4 text-sm text-gray-300">
        {amount !== undefined ? `Your refund of ${formatNaira(amount)}` : "Your refund"} goes to this account. It
        must be in your name.
      </p>
      <PayoutAccountForm
        askPickupAddress={false}
        submit={(account) => submitRefundAccount({ orderId: order._id, ...account }).unwrap()}
        submitLabel="Send my refund here"
        successMessage="Thanks. Your refund is on its way."
        failureMessage={refundFailure}
        numberHint="We'll check the name with your bank before sending anything."
      />
    </section>
  );
}
