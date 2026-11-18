import {
  bankSchema,
  bankTransferOrderSchema,
  paymentInstructionsSchema,
  paymentMethodSchema,
  sellerProfileSchema,
  type Bank,
  type BankTransferOrder,
  type PaymentInstructions,
  type SellerProfile,
} from "../utils/validation/bankTransfer";

/**
 * Sample data for the mock backend (tests, `npm run dev:mock`, end-to-end
 * runs). Every fixture is parsed through the same schema the app parses real
 * responses with, so the fixtures can't drift from the contract unnoticed.
 */

export const MOCK_USER_ID = "65fa0c2e9b1d4a0012340000";
export const MOCK_ORDER_ID = "65fa0c2e9b1d4a0012345678";
export const MOCK_PRODUCT_ID = "65fa0c2e9b1d4a00aaaaaaaa";
/** The account number the mock bank refuses, to exercise the failure path. */
export const UNKNOWN_ACCOUNT_NUMBER = "0000000000";

export const banks: Bank[] = bankSchema.array().parse([
  { code: "044", name: "Access Bank" },
  { code: "058", name: "GTBank" },
  { code: "035", name: "Wema Bank" },
  { code: "091019", name: "CIVIC MFB" },
]);

export const paymentMethods = paymentMethodSchema.array().parse([
  {
    provider: "pandascrow",
    enabled: true,
    label: "Bank transfer",
    blurb: "Pay into a one-time account number. We hold it until your order is completed.",
    currencies: ["NGN"],
  },
  { provider: "crypto", enabled: true, label: "Crypto wallet" },
]);

export const verifiedSeller = (bankName: string, accountNumber: string, address?: string): SellerProfile =>
  sellerProfileSchema.parse({
    _id: "65fa0c2e9b1d4a00cccccccc",
    businessName: "Ada Obi",
    marketplaceAccess: true,
    address,
    payoutAccount: {
      bankName,
      accountName: "ADA CHIOMA OBI",
      accountNumber: `******${accountNumber.slice(-4)}`,
    },
  });

export const awaitingPaymentOrder = (overrides: Partial<BankTransferOrder> = {}): BankTransferOrder =>
  bankTransferOrderSchema.parse({
    _id: MOCK_ORDER_ID,
    paymentMethod: "fiat",
    status: "awaiting_payment",
    fulfilment: "delivery",
    items: [{ product: MOCK_PRODUCT_ID, name: "Ankara tote bag", quantity: 1, unitPrice: 12500.5 }],
    totals: { subtotal: 12500.5, deliveryFee: 2000, serviceFee: 250, total: 14750.5 },
    currency: "NGN",
    expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    vendor: { _id: "65fa0c2e9b1d4a00cccccccc", businessName: "Ada Obi" },
    ...overrides,
  });

export const paymentInstructions = (order: BankTransferOrder): PaymentInstructions =>
  paymentInstructionsSchema.parse({
    reference: `pay_${order._id.slice(-6)}`,
    product: "dezenmart",
    subjectRef: order._id,
    virtualAccount: {
      bankName: "Wema Bank",
      accountNumber: "9912345678",
      accountName: "DEZENMART/ADA OBI",
      expiresAt: order.expiresAt ?? new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    },
    amount: order.totals.total,
    currency: "NGN",
  });

export const user = {
  _id: MOCK_USER_ID,
  name: "Ada Obi",
  email: "ada@example.com",
  milestones: { sales: 0, purchases: 0 },
  selfVerification: { isVerified: false },
  hasAcceptedTerms: true,
  totalPoints: 0,
  availablePoints: 0,
  referralCount: 0,
};
