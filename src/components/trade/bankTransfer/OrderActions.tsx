import { useEffect, useRef, useState } from "react";
import {
  useCancelBankTransferOrderMutation,
  useConfirmBankTransferDeliveryMutation,
  useRaiseBankTransferDisputeMutation,
  useSellerOrderActionMutation,
} from "../../../store/api";
import {
  disputeInputSchema,
  sellerOrderActionSchema,
  type BankTransferOrder,
} from "../../../utils/validation/bankTransfer";
import {
  SELLER_ACTION_TO_API,
  buyerActions,
  sellerActions,
  type OrderRole,
  type SellerAction,
} from "../../../utils/bankTransferLifecycle";
import { apiErrorStatus } from "../../../utils/errors";
import { useSnackbar } from "../../../context/SnackbarContext";
import Button from "../../common/Button";
import StatusBox from "../../common/StatusBox";
import InlineConfirm from "./InlineConfirm";
import ReasonField from "./ReasonField";

type Open = "confirm" | "cancel" | "reject" | "dispute" | null;

/** Why an action was refused, in words the person can act on. */
function actionFailureMessage(status: number | undefined): string {
  if (status === 409) return "This order has changed since you opened it. We've refreshed it, so check it and try again.";
  if (status === 403) return "You can't do that on this order.";
  if (status === 429) return "Too many tries in a row. Wait a minute, then try again.";
  return "That didn't go through. Try again.";
}

const FORWARD_LABEL: Record<Exclude<SellerAction, "accept" | "reject" | "dispute">, (pickup: boolean) => string> = {
  markReady: (pickup) => (pickup ? "Mark ready for pickup" : "Mark as ready"),
  markOutForDelivery: () => "Mark as on the way",
  markDelivered: (pickup) => (pickup ? "Mark as collected" : "Mark as delivered"),
};

interface Props {
  order: BankTransferOrder;
  role: OrderRole;
  onOrderStale: () => void;
}

/** The next things this person can do to the order; nothing when there is nothing to do. */
export default function OrderActions({ order, role, onOrderStale }: Props) {
  const { showSnackbar } = useSnackbar();
  const [open, setOpen] = useState<Open>(null);
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState<string>();
  const [failure, setFailure] = useState<string>();
  // One action at a time, even across a fast double tap.
  const busyRef = useRef(false);
  // When a confirm box closes, focus goes back to the button that opened it,
  // or to this section when that button is gone (the order moved on).
  const sectionRef = useRef<HTMLElement>(null);
  const triggers = useRef(new Map<Exclude<Open, null>, HTMLElement | null>());
  const lastOpen = useRef<Open>(null);
  useEffect(() => {
    const closed = lastOpen.current;
    lastOpen.current = open;
    if (open !== null || closed === null) return;
    (triggers.current.get(closed) ?? sectionRef.current)?.focus();
  }, [open]);
  // Null while the box is open (the trigger is unmounted), set again as it returns.
  const triggerRef = (box: Exclude<Open, null>) => (el: HTMLElement | null) => {
    triggers.current.set(box, el);
  };

  const [sellerAction, sellerState] = useSellerOrderActionMutation();
  const [cancelOrder, cancelState] = useCancelBankTransferOrderMutation();
  const [confirmDelivery, confirmState] = useConfirmBankTransferDeliveryMutation();
  const [raiseDispute, disputeState] = useRaiseBankTransferDisputeMutation();
  const busy = sellerState.isLoading || cancelState.isLoading || confirmState.isLoading || disputeState.isLoading;

  const pickup = order.fulfilment === "pickup";
  const buyer = role === "buyer" ? buyerActions(order) : [];
  const seller = role === "seller" ? sellerActions(order) : [];
  // Paying has its own panel; everything else is handled here.
  const canConfirm = buyer.includes("confirmDelivery");
  const canCancel = buyer.includes("cancel");
  const canDispute = buyer.includes("dispute") || seller.includes("dispute");
  const forward = seller.filter(
    (a): a is keyof typeof FORWARD_LABEL => a === "markReady" || a === "markOutForDelivery" || a === "markDelivered"
  );
  const canAccept = seller.includes("accept");

  if (!canConfirm && !canCancel && !canDispute && !canAccept && forward.length === 0) return null;

  const openBox = (box: Open) => {
    setOpen(box);
    setReason("");
    setReasonError(undefined);
    setFailure(undefined);
  };

  const run = async (work: () => Promise<unknown>, success: string) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setFailure(undefined);
    try {
      await work();
      setOpen(null);
      showSnackbar(success, "success");
    } catch (err) {
      const status = apiErrorStatus(err);
      if (status === 409) onOrderStale();
      setFailure(actionFailureMessage(status));
    } finally {
      busyRef.current = false;
    }
  };

  const runSeller = (action: Exclude<SellerAction, "dispute" | "reject">, success: string) =>
    run(() => sellerAction({ orderId: order._id, action: SELLER_ACTION_TO_API[action] }).unwrap(), success);

  const submitReject = () => {
    const parsed = sellerOrderActionSchema.safeParse({ action: "reject", reason });
    if (!parsed.success) {
      setReasonError(parsed.error.issues[0]?.message);
      return;
    }
    void run(() => sellerAction({ orderId: order._id, ...parsed.data }).unwrap(), "Order declined");
  };

  const submitDispute = () => {
    const parsed = disputeInputSchema.safeParse({ reason });
    if (!parsed.success) {
      setReasonError(parsed.error.issues[0]?.message);
      return;
    }
    void run(() => raiseDispute({ orderId: order._id, ...parsed.data }).unwrap(), "Problem reported");
  };

  const reasonInput = (label: string, hint: string, max: number) => (
    <ReasonField
      label={label}
      hint={hint}
      value={reason}
      maxLength={max}
      error={reasonError}
      onChange={(value) => {
        setReason(value);
        setReasonError(undefined);
      }}
    />
  );

  return (
    <section ref={sectionRef} tabIndex={-1} aria-label="What you can do" className="space-y-3 outline-none">
      {failure && <StatusBox tone="danger">{failure}</StatusBox>}

      {canAccept &&
        (open === "reject" ? (
          <InlineConfirm
            tone="red"
            question="Decline this order?"
            detail="The buyer gets a full refund, and the item goes back on sale."
            confirmLabel="Yes, decline order"
            keepLabel="Keep order"
            busy={busy}
            onConfirm={submitReject}
            onKeep={() => openBox(null)}
          >
            {reasonInput("Reason for the buyer", "For example: out of stock.", 300)}
          </InlineConfirm>
        ) : (
          <div className="flex gap-3">
            <Button
              variant="primary"
              title="Accept order"
              className="flex-1"
              loading={sellerState.isLoading}
              loadingTitle="Accepting…"
              disabled={busy}
              onClick={() => void runSeller("accept", "Order accepted")}
            />
            <Button
              ref={triggerRef("reject")}
              variant="secondary"
              title="Decline"
              disabled={busy}
              onClick={() => openBox("reject")}
            />
          </div>
        ))}

      {forward.map((action) => (
        <Button
          key={action}
          variant="primary"
          title={FORWARD_LABEL[action](pickup)}
          loading={sellerState.isLoading}
          loadingTitle="Updating…"
          disabled={busy}
          onClick={() => void runSeller(action, "Order updated")}
        />
      ))}

      {canConfirm &&
        (open === "confirm" ? (
          <InlineConfirm
            tone="green"
            question="Do you have your order?"
            detail="This pays the seller. You can't undo it, so check the item first."
            confirmLabel="Yes, I have it"
            keepLabel="Not yet"
            busy={busy}
            onConfirm={() => void run(() => confirmDelivery(order._id).unwrap(), "Thanks. The seller is being paid.")}
            onKeep={() => openBox(null)}
          />
        ) : (
          <button
            ref={triggerRef("confirm")}
            type="button"
            onClick={() => openBox("confirm")}
            disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-green-700 py-3.5 text-sm font-bold text-white transition-colors hover:bg-green-600 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            I have my order
          </button>
        ))}

      {canDispute &&
        (open === "dispute" ? (
          <InlineConfirm
            tone="amber"
            question="Report a problem?"
            detail="Our team will look into it. The payment stays on hold until it's sorted out."
            confirmLabel="Send report"
            keepLabel="Cancel"
            busy={busy}
            onConfirm={submitDispute}
            onKeep={() => openBox(null)}
          >
            {reasonInput("What went wrong?", "At least 10 characters.", 500)}
          </InlineConfirm>
        ) : (
          <button
            ref={triggerRef("dispute")}
            type="button"
            onClick={() => openBox("dispute")}
            disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-amber-800/50 bg-amber-900/20 py-3.5 text-sm font-bold text-amber-300 transition-colors hover:bg-amber-900/40 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
          >
            Report a problem
          </button>
        ))}

      {canCancel &&
        (open === "cancel" ? (
          <InlineConfirm
            tone="red"
            question="Cancel this order?"
            detail={
              order.status === "paid"
                ? "Your payment will be refunded to your bank."
                : "Nothing has been paid yet. If you've just sent the money, wait a few minutes instead."
            }
            confirmLabel="Yes, cancel order"
            keepLabel="Keep order"
            busy={busy}
            onConfirm={() => void run(() => cancelOrder({ orderId: order._id }).unwrap(), "Order cancelled")}
            onKeep={() => openBox(null)}
          />
        ) : (
          <button
            ref={triggerRef("cancel")}
            type="button"
            onClick={() => openBox("cancel")}
            disabled={busy}
            className="flex w-full items-center justify-center rounded-xl border border-[#292B30] bg-[#292B30] py-3.5 text-sm font-medium text-gray-300 transition-colors hover:border-red-900/40 hover:bg-red-900/10 hover:text-red-300 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
          >
            Cancel order
          </button>
        ))}
    </section>
  );
}
