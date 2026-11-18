import { describe, it, expect } from "vitest";
import {
  buyerActions,
  instructionsMismatch,
  isPaymentWindowClosed,
  progressSteps,
  sellerActions,
} from "../../utils/bankTransferLifecycle";
import { awaitingPaymentOrder, paymentInstructions } from "../../mocks/fixtures";
import type { BankTransferOrder, BankTransferOrderStatus } from "../../utils/validation/bankTransfer";

const at = (status: BankTransferOrderStatus, extra: Partial<BankTransferOrder> = {}) =>
  awaitingPaymentOrder({ status, ...extra });

const NOW = new Date("2026-11-18T12:00:00Z");

describe("buyer actions", () => {
  it("offers pay and cancel while awaiting payment", () => {
    const order = at("awaiting_payment", { expiresAt: "2026-11-18T13:00:00.000Z" });
    expect(buyerActions(order, NOW)).toEqual(["pay", "cancel"]);
  });

  it("stops offering pay once the payment window has closed", () => {
    const order = at("awaiting_payment", { expiresAt: "2026-11-18T11:59:00.000Z" });
    expect(isPaymentWindowClosed(order, NOW)).toBe(true);
    expect(buyerActions(order, NOW)).not.toContain("pay");
  });

  it("allows cancel after payment only until the seller starts", () => {
    expect(buyerActions(at("paid"), NOW)).toContain("cancel");
    expect(buyerActions(at("preparing"), NOW)).not.toContain("cancel");
  });

  it.each<[BankTransferOrder["fulfilment"], BankTransferOrderStatus, boolean]>([
    ["delivery", "ready", false],
    ["delivery", "out_for_delivery", true],
    ["delivery", "delivered", true],
    ["pickup", "ready", true],
    ["pickup", "delivered", true],
    ["delivery", "paid", false],
    ["delivery", "completed", false],
  ])("%s order at %s: confirm delivery offered = %s", (fulfilment, status, expected) => {
    expect(buyerActions(at(status, { fulfilment }), NOW).includes("confirmDelivery")).toBe(expected);
  });

  it("offers dispute from paid to delivered, never before or after", () => {
    expect(buyerActions(at("awaiting_payment"), NOW)).not.toContain("dispute");
    for (const s of ["paid", "preparing", "ready", "out_for_delivery", "delivered"] as const) {
      expect(buyerActions(at(s), NOW)).toContain("dispute");
    }
    expect(buyerActions(at("completed"), NOW)).not.toContain("dispute");
  });

  it("asks for a refund account when one is owed", () => {
    const order = at("cancelled", { refund: { status: "awaiting_account", amount: 14750.5 } });
    expect(buyerActions(order, NOW)).toEqual(["addRefundAccount"]);
  });
});

describe("seller actions", () => {
  it("accepts or declines a paid order", () => {
    expect(sellerActions(at("paid"))).toEqual(["accept", "reject", "dispute"]);
  });

  it("moves a delivery order through ready and out for delivery", () => {
    expect(sellerActions(at("preparing"))).toContain("markReady");
    expect(sellerActions(at("ready", { fulfilment: "delivery" }))).toContain("markOutForDelivery");
    expect(sellerActions(at("ready", { fulfilment: "delivery" }))).not.toContain("markDelivered");
    expect(sellerActions(at("out_for_delivery"))).toContain("markDelivered");
  });

  it("lets a pickup order go straight from ready to delivered", () => {
    const actions = sellerActions(at("ready", { fulfilment: "pickup" }));
    expect(actions).toContain("markDelivered");
    expect(actions).not.toContain("markOutForDelivery");
  });

  it("offers nothing on unpaid or finished orders", () => {
    expect(sellerActions(at("awaiting_payment"))).toEqual([]);
    expect(sellerActions(at("completed"))).toEqual([]);
    expect(sellerActions(at("cancelled"))).toEqual([]);
  });
});

describe("progress steps", () => {
  it("skips 'On the way' for pickup and labels ready for pickup", () => {
    const steps = progressSteps(at("ready", { fulfilment: "pickup" }))!;
    expect(steps.map((s) => s.label)).toEqual([
      "Payment",
      "Paid",
      "Being prepared",
      "Ready for pickup",
      "Delivered",
      "Completed",
    ]);
    expect(steps.find((s) => s.state === "current")?.key).toBe("ready");
  });

  it("marks a completed order fully done", () => {
    const steps = progressSteps(at("completed"))!;
    expect(steps.every((s) => s.state === "done")).toBe(true);
  });

  it("returns null for off-path states so the screen explains them in words", () => {
    for (const s of ["cancelled", "rejected", "refunded", "disputed"] as const) {
      expect(progressSteps(at(s))).toBeNull();
    }
  });
});

describe("payment instructions check", () => {
  const order = at("awaiting_payment");

  it("accepts instructions for this order's exact total, to the kobo", () => {
    expect(instructionsMismatch(paymentInstructions(order), order)).toBeUndefined();
    // 14750.5 and 14750.50000001 are the same number of kobo.
    expect(instructionsMismatch({ ...paymentInstructions(order), amount: 14750.50000001 }, order)).toBeUndefined();
  });

  it("rejects instructions for another order or another amount", () => {
    expect(instructionsMismatch({ ...paymentInstructions(order), subjectRef: "65fa0c2e9b1d4a0000000000" }, order)).toMatch(
      /another order/
    );
    expect(instructionsMismatch({ ...paymentInstructions(order), amount: 14750.49 }, order)).toMatch(/differs/);
  });
});
