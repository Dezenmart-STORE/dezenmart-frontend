import type {
  BankTransferOrder,
  BankTransferOrderStatus,
  PaymentInstructions,
} from "./validation/bankTransfer";

/**
 * Who may do what to a bank-transfer order, at each stage.
 *
 * Mirrors the backend's lifecycle (OpenAPI "Fiat Orders"):
 *   awaiting_payment -> paid -> preparing -> ready -> out_for_delivery -> delivered -> completed
 *   (pickup orders skip out_for_delivery)
 * The server enforces every rule again; this only decides what the screen
 * offers, so nobody is shown a button the server would refuse.
 */

export type OrderRole = "buyer" | "seller";

export type BuyerAction = "pay" | "cancel" | "confirmDelivery" | "dispute" | "addRefundAccount";
export type SellerAction = "accept" | "reject" | "markReady" | "markOutForDelivery" | "markDelivered" | "dispute";

/** Stages a dispute can be opened from, by either side. */
const DISPUTABLE: ReadonlySet<BankTransferOrderStatus> = new Set([
  "paid",
  "preparing",
  "ready",
  "out_for_delivery",
  "delivered",
]);

/** An unpaid order whose reservation has lapsed; the server will expire it. */
export function isPaymentWindowClosed(order: BankTransferOrder, now: Date = new Date()): boolean {
  if (order.status !== "awaiting_payment" || !order.expiresAt) return false;
  return new Date(order.expiresAt).getTime() <= now.getTime();
}

export function buyerActions(order: BankTransferOrder, now: Date = new Date()): BuyerAction[] {
  const actions: BuyerAction[] = [];
  const { status, fulfilment } = order;

  if (status === "awaiting_payment" && !isPaymentWindowClosed(order, now)) actions.push("pay");

  // Cancelling is allowed until the seller starts the order.
  if (status === "awaiting_payment" || status === "paid") actions.push("cancel");

  // Confirming releases the money, so it is offered only once the item can be in hand.
  const canConfirm =
    status === "delivered" ||
    (fulfilment === "pickup" && status === "ready") ||
    (fulfilment === "delivery" && status === "out_for_delivery");
  if (canConfirm) actions.push("confirmDelivery");

  if (DISPUTABLE.has(status)) actions.push("dispute");

  if (order.refund?.status === "awaiting_account") actions.push("addRefundAccount");

  return actions;
}

export function sellerActions(order: BankTransferOrder): SellerAction[] {
  const { status, fulfilment } = order;
  const actions: SellerAction[] = [];

  if (status === "paid") actions.push("accept", "reject");
  if (status === "preparing") actions.push("markReady");
  if (status === "ready" && fulfilment === "delivery") actions.push("markOutForDelivery");
  if ((status === "ready" && fulfilment === "pickup") || status === "out_for_delivery") {
    actions.push("markDelivered");
  }
  if (DISPUTABLE.has(status)) actions.push("dispute");

  return actions;
}

/** The vendor-action the server expects for each seller action. */
export const SELLER_ACTION_TO_API = {
  accept: "accept",
  reject: "reject",
  markReady: "ready",
  markOutForDelivery: "out_for_delivery",
  markDelivered: "delivered",
} as const;

export interface ProgressStep {
  key: BankTransferOrderStatus;
  label: string;
  state: "done" | "current" | "upcoming";
}

const STEP_LABELS: Partial<Record<BankTransferOrderStatus, string>> = {
  awaiting_payment: "Payment",
  paid: "Paid",
  preparing: "Being prepared",
  ready: "Ready",
  out_for_delivery: "On the way",
  delivered: "Delivered",
  completed: "Completed",
};

/**
 * The happy-path steps for this order, marked done, current or upcoming.
 * Off-path states (cancelled, rejected, refunded, disputed) return null: the
 * screen explains those in words instead of a half-filled tracker.
 */
export function progressSteps(order: BankTransferOrder): ProgressStep[] | null {
  const path: BankTransferOrderStatus[] =
    order.fulfilment === "pickup"
      ? ["awaiting_payment", "paid", "preparing", "ready", "delivered", "completed"]
      : ["awaiting_payment", "paid", "preparing", "ready", "out_for_delivery", "delivered", "completed"];

  const index = path.indexOf(order.status);
  if (index === -1) return null;

  return path.map((key, i) => ({
    key,
    label: key === "ready" && order.fulfilment === "pickup" ? "Ready for pickup" : STEP_LABELS[key] ?? key,
    // The last stage is complete in itself, so it reads as done, not "current".
    state: i < index || (i === index && key === "completed") ? "done" : i === index ? "current" : "upcoming",
  }));
}

/** Why these instructions can't be trusted for this order, if they can't. */
export function instructionsMismatch(instructions: PaymentInstructions, order: BankTransferOrder): string | undefined {
  if (instructions.subjectRef !== order._id) return "Payment instructions are for another order";
  if (instructions.currency !== "NGN") return "Payment instructions are not in naira";
  // Compare in kobo so 14750.5 and 14750.50 match and float noise doesn't.
  if (Math.round(instructions.amount * 100) !== Math.round(order.totals.total * 100)) {
    return "Payment amount differs from the order total";
  }
  return undefined;
}
