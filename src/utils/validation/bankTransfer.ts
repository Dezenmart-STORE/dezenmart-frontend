import { z } from "zod";
import { logError } from "../errors";

/**
 * Bank-transfer (naira) checkout: request and response contracts.
 *
 * Mirrors the backend's OpenAPI spec (Payments, Fiat Orders, Vendors, Products).
 * Request schemas are shared by the forms and the API layer, so a payload that
 * passes a form can't fail the server's own validation for the same rule.
 * Response schemas guard what the buyer acts on (the account to pay into, the
 * amount, the order state): a malformed reply becomes an error, never a wrong
 * account number on screen.
 */

// Shared primitives ---------------------------------------------------------

/** MongoDB ObjectId, the only id shape the order and product routes accept. */
export const objectIdSchema = z.string().regex(/^[a-fA-F0-9]{24}$/, "Invalid id");

export const bankCodeSchema = z.string().regex(/^\d{3,6}$/, "Choose your bank");

export const accountNumberSchema = z
  .string()
  .trim()
  .regex(/^\d{10}$/, "Account numbers are 10 digits");

/** Naira amount. The server prices everything, so this only checks shape. */
const nairaSchema = z.number().finite().nonnegative();

const isoDateSchema = z.string().datetime({ offset: true });

export const fulfilmentSchema = z.enum(["delivery", "pickup"]);
export type Fulfilment = z.infer<typeof fulfilmentSchema>;

// Banks and seller payout account --------------------------------------------

export const bankSchema = z.object({ code: z.string(), name: z.string() });
export type Bank = z.infer<typeof bankSchema>;

export const payoutAccountInputSchema = z.object({
  bankCode: bankCodeSchema,
  accountNumber: accountNumberSchema,
});
export type PayoutAccountInput = z.infer<typeof payoutAccountInputSchema>;

export const resolvedAccountSchema = z.object({ accountName: z.string().min(1) });
export type ResolvedAccount = z.infer<typeof resolvedAccountSchema>;

/** DezenMart sellers only need a verified payout account; the rest can follow later. */
export const sellerApplicationSchema = z.object({
  payout: payoutAccountInputSchema,
  businessName: z.string().trim().min(2).max(120).optional(),
  /** Pickup address. Without one, the seller's listings are delivery only. */
  address: z.string().trim().min(5, "Enter the full pickup address").optional(),
});
export type SellerApplication = z.infer<typeof sellerApplicationSchema>;

export const sellerProfileUpdateSchema = z
  .object({
    businessName: z.string().trim().min(2).max(120),
    address: z.string().trim().min(5, "Enter the full pickup address"),
    phone: z.string().trim(),
    state: z.string(),
    lga: z.string(),
    isOpen: z.boolean(),
  })
  .partial()
  .refine((v) => Object.keys(v).length > 0, "Nothing to update");
export type SellerProfileUpdate = z.infer<typeof sellerProfileUpdateSchema>;

/** The payout account comes back masked; only the parts the UI shows are kept. */
export const sellerProfileSchema = z.object({
  _id: z.string(),
  businessName: z.string().optional(),
  address: z.string().optional(),
  isOpen: z.boolean().optional(),
  /** True once the seller can take bank-transfer orders on DezenMart. */
  marketplaceAccess: z.boolean().optional(),
  payoutAccount: z
    .object({
      bankName: z.string().optional(),
      accountName: z.string().optional(),
      accountNumber: z.string().optional(),
    })
    .optional(),
});
export type SellerProfile = z.infer<typeof sellerProfileSchema>;

// Payment methods ------------------------------------------------------------

export const paymentMethodSchema = z.object({
  // Kept as a string so a provider added on the server doesn't break the list.
  provider: z.string(),
  enabled: z.boolean(),
  label: z.string().optional(),
  blurb: z.string().optional(),
  currencies: z.array(z.string()).optional(),
});
export type PaymentMethod = z.infer<typeof paymentMethodSchema>;

// Listings -------------------------------------------------------------------

/** Text fields of a naira listing. Images travel separately as files. */
export const bankTransferListingInputSchema = z
  .object({
    // Messages are written for the listing form, which shows them as they are.
    name: z.string().trim().min(3, "Give it a name of at least 3 characters").max(100, "Keep the name under 100 characters"),
    description: z
      .string()
      .trim()
      .min(10, "Describe it in at least 10 characters")
      .max(1000, "Keep the description under 1,000 characters"),
    category: z.string().min(1, "Choose a category"),
    price: z.number({ invalid_type_error: "Enter a price" }).positive("Enter a price above zero"),
    stock: z
      .number({ invalid_type_error: "Enter how many you have" })
      .int("Stock must be a whole number")
      .min(1, "Stock must be at least 1"),
    /** Unit weight in kg; delivery quotes are priced from weight x quantity. */
    weight: z.number({ invalid_type_error: "Enter the weight of one item" }).min(0.1, "Weight must be at least 0.1 kg"),
    state: z.string().min(1, "Choose the state it ships from"),
    lga: z.string().min(1, "Choose the area it ships from"),
    minOrderQty: z.number().int().min(1).optional(),
    fulfilment: z.array(fulfilmentSchema).min(1, "Choose at least one way for buyers to get it").optional(),
    // Variant objects as the listing form builds them, e.g. { color: "black", quantity: 2 }.
    type: z.array(z.record(z.union([z.string(), z.number()]))).optional(),
  })
  .refine((v) => v.minOrderQty === undefined || v.minOrderQty <= v.stock, {
    message: "Minimum order can't be more than the stock",
    path: ["minOrderQty"],
  });
export type BankTransferListingInput = z.infer<typeof bankTransferListingInputSchema>;

export const LISTING_IMAGE_LIMITS = { min: 1, max: 5 } as const;

/** Multipart body for POST /products as a naira listing (acceptedPayments: pandascrow). */
export function toBankTransferListingFormData(
  input: BankTransferListingInput,
  images: readonly File[]
): FormData {
  const listing = bankTransferListingInputSchema.parse(input);
  if (images.length < LISTING_IMAGE_LIMITS.min || images.length > LISTING_IMAGE_LIMITS.max) {
    throw new Error(`Add between ${LISTING_IMAGE_LIMITS.min} and ${LISTING_IMAGE_LIMITS.max} photos`);
  }

  const form = new FormData();
  form.append("acceptedPayments", JSON.stringify(["pandascrow"]));
  form.append("name", listing.name);
  form.append("description", listing.description);
  form.append("category", listing.category);
  form.append("price", String(listing.price));
  form.append("stock", String(listing.stock));
  form.append("weight", String(listing.weight));
  form.append("state", listing.state);
  form.append("lga", listing.lga);
  if (listing.minOrderQty !== undefined) form.append("minOrderQty", String(listing.minOrderQty));
  if (listing.fulfilment) form.append("fulfilment", JSON.stringify(listing.fulfilment));
  if (listing.type?.length) form.append("type", JSON.stringify(listing.type));
  for (const image of images) form.append("images", image);
  return form;
}

// Orders ---------------------------------------------------------------------

export const bankTransferOrderInputSchema = z
  .object({
    paymentMethod: z.literal("fiat"),
    items: z
      .array(
        z.object({
          product: objectIdSchema,
          quantity: z.number().int().min(1).max(100),
          variantIndex: z.number().int().min(0).optional(),
          note: z.string().max(200).optional(),
        })
      )
      .min(1)
      .max(30),
    fulfilment: fulfilmentSchema,
    /** A delivery quote, used once; the server takes the fee from it, never from us. */
    quoteId: objectIdSchema.optional(),
    buyerNote: z.string().max(500).optional(),
  })
  .refine((v) => v.fulfilment !== "delivery" || !!v.quoteId, {
    message: "Choose a delivery option",
    path: ["quoteId"],
  });
export type BankTransferOrderInput = z.infer<typeof bankTransferOrderInputSchema>;

export const bankTransferOrderStatusSchema = z.enum([
  "awaiting_payment",
  "paid",
  "preparing",
  "ready",
  "out_for_delivery",
  "delivered",
  "completed",
  "disputed",
  "rejected",
  "cancelled",
  "refunded",
]);
export type BankTransferOrderStatus = z.infer<typeof bankTransferOrderStatusSchema>;

export const bankTransferOrderSchema = z.object({
  _id: z.string(),
  orderId: z.string().optional(),
  paymentMethod: z.literal("fiat").optional(),
  status: bankTransferOrderStatusSchema,
  fulfilment: fulfilmentSchema,
  items: z.array(
    z.object({
      product: z.string(),
      name: z.string(),
      image: z.string().optional(),
      quantity: z.number().int(),
      unitPrice: nairaSchema,
      variantLabel: z.string().optional(),
      note: z.string().optional(),
    })
  ),
  totals: z.object({
    subtotal: nairaSchema,
    deliveryFee: nairaSchema,
    serviceFee: nairaSchema,
    total: nairaSchema,
  }),
  currency: z.string(),
  /** While awaiting_payment: after this the reservation lapses. */
  expiresAt: isoDateSchema.optional(),
  paidAt: isoDateSchema.optional(),
  createdAt: isoDateSchema.optional(),
  vendor: z
    .object({
      _id: z.string(),
      businessName: z.string().optional(),
      logo: z.string().optional(),
      // Only present once a pickup order is being prepared.
      address: z.string().optional(),
      phone: z.string().optional(),
    })
    .optional(),
  payout: z.object({ status: z.enum(["none", "processing", "sent", "failed"]) }).optional(),
  refund: z
    .object({
      status: z.enum(["awaiting_account", "processing", "sent", "failed"]),
      amount: nairaSchema.optional(),
    })
    .optional(),
});
export type BankTransferOrder = z.infer<typeof bankTransferOrderSchema>;

/** What the seller can do next, by the server's own lifecycle rules. */
export const sellerOrderActionSchema = z
  .object({
    action: z.enum(["accept", "reject", "preparing", "ready", "out_for_delivery", "delivered"]),
    reason: z.string().trim().max(300).optional(),
    prepTimeMinutes: z.number().int().min(1).max(1440).optional(),
  })
  .refine((v) => v.action !== "reject" || !!v.reason, {
    message: "Tell the buyer why you're declining",
    path: ["reason"],
  });
export type SellerOrderAction = z.infer<typeof sellerOrderActionSchema>;

export const cancelOrderInputSchema = z.object({ reason: z.string().trim().max(300).optional() });

export const disputeInputSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(10, "Describe the problem in at least 10 characters")
    .max(500),
});

// Payments -------------------------------------------------------------------

export const paymentInstructionsSchema = z.object({
  /** Payment reference; poll its status with GET /payments/{reference}/status. */
  reference: z.string().min(1),
  product: z.string(),
  subjectRef: z.string(),
  virtualAccount: z.object({
    bankName: z.string().min(1),
    accountNumber: z.string().regex(/^\d{10}$/),
    accountName: z.string().min(1),
    expiresAt: isoDateSchema,
  }),
  amount: z.number().finite().positive(),
  currency: z.literal("NGN"),
});
export type PaymentInstructions = z.infer<typeof paymentInstructionsSchema>;

export const paymentStatusSchema = z.object({
  status: z.enum(["pending", "success", "failed", "expired"]),
  product: z.string(),
  subjectRef: z.string(),
  subjectStatus: z.string().optional(),
  amount: nairaSchema,
  currency: z.string(),
  orderId: z.string().optional(),
  orderStatus: z.string().optional(),
});
export type PaymentStatus = z.infer<typeof paymentStatusSchema>;

/** Payment states after which polling must stop. */
export const FINAL_PAYMENT_STATES: ReadonlySet<PaymentStatus["status"]> = new Set([
  "success",
  "failed",
  "expired",
]);

// Envelope -------------------------------------------------------------------

/** The server's reply didn't match its documented contract. */
export class UnexpectedResponseError extends Error {
  constructor(
    readonly endpoint: string,
    readonly issues: z.ZodIssue[]
  ) {
    super(`Unexpected response from ${endpoint}`);
    this.name = "UnexpectedResponseError";
  }
}

function parseOrThrow<T extends z.ZodTypeAny>(schema: T, value: unknown, endpoint: string): z.infer<T> {
  const parsed = schema.safeParse(value);
  if (!parsed.success) {
    const error = new UnexpectedResponseError(endpoint, parsed.error.issues);
    // Reported, not just thrown: a drifted contract should reach monitoring with its details.
    logError(error, "api-contract", { endpoint, issues: parsed.error.issues });
    throw error;
  }
  return parsed.data;
}

/** Validate `data[key]` from the backend's `{ status, data: { ... } }` envelope. */
export function parseEnvelope<T extends z.ZodTypeAny>(
  schema: T,
  response: unknown,
  key: string,
  endpoint: string
): z.infer<T> {
  const data = (response as { data?: Record<string, unknown> } | null)?.data;
  return parseOrThrow(schema, data?.[key], endpoint);
}

/**
 * Validate a list at `data[key]` item by item. An item that breaks the contract
 * is reported and left out, so one odd order can't blank the whole list.
 */
export function parseEnvelopeList<T extends z.ZodTypeAny>(
  itemSchema: T,
  response: unknown,
  key: string,
  endpoint: string
): z.infer<T>[] {
  const data = (response as { data?: Record<string, unknown> } | null)?.data;
  const items = parseOrThrow(z.array(z.unknown()), data?.[key], endpoint);
  const valid: z.infer<T>[] = [];
  items.forEach((item, index) => {
    const parsed = itemSchema.safeParse(item);
    if (parsed.success) valid.push(parsed.data);
    else logError(new UnexpectedResponseError(endpoint, parsed.error.issues), "api-contract", { endpoint, index });
  });
  return valid;
}

/** Same as parseEnvelope for endpoints whose fields sit directly on `data`. */
export function parseData<T extends z.ZodTypeAny>(
  schema: T,
  response: unknown,
  endpoint: string
): z.infer<T> {
  return parseOrThrow(schema, (response as { data?: unknown } | null)?.data, endpoint);
}
