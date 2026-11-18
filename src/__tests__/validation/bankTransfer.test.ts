import { describe, it, expect } from "vitest";
import {
  bankTransferListingInputSchema,
  bankTransferOrderInputSchema,
  parseData,
  parseEnvelope,
  paymentInstructionsSchema,
  payoutAccountInputSchema,
  sellerOrderActionSchema,
  toBankTransferListingFormData,
  UnexpectedResponseError,
} from "../../utils/validation/bankTransfer";
import { isBankTransferListing } from "../../utils/types";

const PRODUCT_ID = "65fa0c2e9b1d4a0012345678";
const QUOTE_ID = "65fa0c2e9b1d4a0087654321";

describe("payout account", () => {
  it("accepts a 6-digit bank code and a 10-digit account number", () => {
    expect(payoutAccountInputSchema.safeParse({ bankCode: "091019", accountNumber: "0123456789" }).success).toBe(true);
  });

  it("trims spaces around the account number", () => {
    expect(payoutAccountInputSchema.parse({ bankCode: "058", accountNumber: " 0123456789 " }).accountNumber).toBe(
      "0123456789"
    );
  });

  it.each(["012345678", "01234567890", "01234abcde"])("rejects account number %s", (accountNumber) => {
    expect(payoutAccountInputSchema.safeParse({ bankCode: "058", accountNumber }).success).toBe(false);
  });
});

describe("bank-transfer order input", () => {
  const base = { paymentMethod: "fiat" as const, items: [{ product: PRODUCT_ID, quantity: 1 }] };

  it("needs a delivery quote for delivery", () => {
    const res = bankTransferOrderInputSchema.safeParse({ ...base, fulfilment: "delivery" });
    expect(res.success).toBe(false);
    expect(res.error?.issues[0].path).toEqual(["quoteId"]);
  });

  it("accepts delivery with a quote, and pickup without one", () => {
    expect(bankTransferOrderInputSchema.safeParse({ ...base, fulfilment: "delivery", quoteId: QUOTE_ID }).success).toBe(true);
    expect(bankTransferOrderInputSchema.safeParse({ ...base, fulfilment: "pickup" }).success).toBe(true);
  });

  it("rejects a product id that isn't an ObjectId", () => {
    const res = bankTransferOrderInputSchema.safeParse({
      ...base,
      items: [{ product: "not-an-id", quantity: 1 }],
      fulfilment: "pickup",
    });
    expect(res.success).toBe(false);
  });
});

describe("seller order action", () => {
  it("requires a reason to decline", () => {
    expect(sellerOrderActionSchema.safeParse({ action: "reject" }).success).toBe(false);
    expect(sellerOrderActionSchema.safeParse({ action: "reject", reason: "Out of stock" }).success).toBe(true);
    expect(sellerOrderActionSchema.safeParse({ action: "accept" }).success).toBe(true);
  });
});

describe("naira listing", () => {
  const listing = {
    name: "Ankara tote bag",
    description: "Hand-stitched tote in Ankara fabric.",
    category: "Accessories",
    price: 12500.5,
    stock: 4,
    weight: 0.5,
    state: "Lagos",
    lga: "Ikeja",
    fulfilment: ["delivery" as const],
  };

  it("refuses a minimum order above the stock", () => {
    const res = bankTransferListingInputSchema.safeParse({ ...listing, minOrderQty: 5 });
    expect(res.success).toBe(false);
    expect(res.error?.issues[0].path).toEqual(["minOrderQty"]);
  });

  it("builds the multipart body the server expects for a naira listing", () => {
    const image = new File(["x"], "bag.jpg", { type: "image/jpeg" });
    const form = toBankTransferListingFormData(listing, [image]);

    expect(form.get("acceptedPayments")).toBe('["pandascrow"]');
    expect(form.get("price")).toBe("12500.5");
    expect(form.get("fulfilment")).toBe('["delivery"]');
    expect(form.getAll("images")).toHaveLength(1);
    // A naira listing must not carry crypto fields.
    expect(form.has("sellerWalletAddress")).toBe(false);
    expect(form.has("paymentToken")).toBe(false);
  });

  it("needs between 1 and 5 photos", () => {
    expect(() => toBankTransferListingFormData(listing, [])).toThrow(/between 1 and 5 photos/);
  });

  it("is told apart from a crypto listing by acceptedPayments", () => {
    expect(isBankTransferListing({ acceptedPayments: ["pandascrow"] })).toBe(true);
    expect(isBankTransferListing({ acceptedPayments: [] })).toBe(false);
    expect(isBankTransferListing({})).toBe(false);
  });
});

describe("response parsing", () => {
  const instructions = {
    reference: "pay_123",
    product: "dezenmart",
    subjectRef: PRODUCT_ID,
    virtualAccount: {
      bankName: "Wema Bank",
      accountNumber: "9912345678",
      accountName: "DEZENMART/ADA OBI",
      expiresAt: "2026-11-17T13:00:00.000Z",
    },
    amount: 15000,
    currency: "NGN",
  };

  it("returns the validated payload from the envelope", () => {
    expect(parseData(paymentInstructionsSchema, { status: "success", data: instructions }, "init")).toEqual(instructions);
  });

  it("refuses an account number the buyer can't pay into", () => {
    const bad = { data: { ...instructions, virtualAccount: { ...instructions.virtualAccount, accountNumber: "99-123" } } };
    expect(() => parseData(paymentInstructionsSchema, bad, "POST /payments/fiat/initialize")).toThrow(
      UnexpectedResponseError
    );
  });

  it("names the endpoint when the envelope key is missing", () => {
    expect(() => parseEnvelope(paymentInstructionsSchema, { data: {} }, "payment", "GET /x")).toThrow(
      "Unexpected response from GET /x"
    );
  });
});
