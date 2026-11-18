import type { BankTransferOrder } from "../../../utils/validation/bankTransfer";
import type { OrderRole } from "../../../utils/bankTransferLifecycle";
import { formatNaira } from "../../../utils/format";

/** One line under the tracker saying what happens next, for the person looking. */
export function nextStepText(order: BankTransferOrder, role: OrderRole): string {
  const pickup = order.fulfilment === "pickup";
  if (role === "seller") {
    switch (order.status) {
      case "awaiting_payment":
        return "Waiting for the buyer to pay.";
      case "paid":
        return "The buyer has paid. Accept the order to start preparing it.";
      case "preparing":
        return pickup ? "Prepare the order, then mark it ready for pickup." : "Prepare the order, then mark it ready.";
      case "ready":
        return pickup ? "Waiting for the buyer to collect it." : "Mark it on the way once it leaves with the rider.";
      case "out_for_delivery":
        return "On the way to the buyer. Mark it delivered when it arrives.";
      case "delivered":
        return "Delivered. You'll be paid when the buyer confirms they have it.";
      case "completed":
        return order.payout?.status === "sent"
          ? "Complete. Your payment has been sent to your bank."
          : "Complete. Your payment is on its way to your bank.";
      default:
        return "";
    }
  }
  switch (order.status) {
    case "awaiting_payment":
      return "Pay by bank transfer to confirm your order.";
    case "paid":
      return "Payment received. Waiting for the seller to accept your order.";
    case "preparing":
      return "The seller is preparing your order.";
    case "ready":
      return pickup
        ? "Ready for pickup. Confirm below once you have it."
        : "Your order is ready and will be sent out soon.";
    case "out_for_delivery":
      return "Your order is on the way.";
    case "delivered":
      return "Delivered. Confirm you have it so the seller gets paid.";
    case "completed":
      return "Order complete. Thanks for shopping.";
    default:
      return "";
  }
}

export interface OffPathMessage {
  tone: "neutral" | "amber" | "red";
  title: string;
  text: string;
}

function refundLine(order: BankTransferOrder): string | undefined {
  const refund = order.refund?.amount !== undefined ? `Your refund of ${formatNaira(order.refund.amount)}` : "Your refund";
  switch (order.refund?.status) {
    case "awaiting_account":
      return "We need your bank account details to send your refund. Contact support to add them.";
    case "processing":
      return `${refund} is being sent to your bank.`;
    case "sent":
      return `${refund} has been sent to your bank.`;
    case "failed":
      return "Your refund didn't go through. Contact support and we'll sort it out.";
    default:
      return undefined;
  }
}

/** Words for the stages off the normal path, where a tracker would mislead. */
export function offPathMessage(order: BankTransferOrder, role: OrderRole): OffPathMessage | null {
  const refund = role === "buyer" ? refundLine(order) : undefined;
  switch (order.status) {
    case "cancelled":
      return {
        tone: "neutral",
        title: "Order cancelled",
        text: refund ?? (role === "buyer" ? "This order was cancelled." : "The buyer cancelled this order."),
      };
    case "rejected":
      return {
        tone: "red",
        title: role === "buyer" ? "The seller declined this order" : "You declined this order",
        text: refund ?? (role === "buyer" ? "Any payment you made will be refunded." : "The buyer will be refunded."),
      };
    case "refunded":
      return {
        tone: "neutral",
        title: "Refunded",
        text: role === "buyer" ? refund ?? "Your payment was refunded to your bank." : "The buyer was refunded.",
      };
    case "disputed":
      return {
        tone: "amber",
        title: "Problem reported",
        text: "Our team is looking into it. The payment stays on hold until it's sorted out.",
      };
    default:
      return null;
  }
}
