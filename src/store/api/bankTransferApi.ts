import { baseApi } from "./baseApi";
import {
  bankSchema,
  FINAL_PAYMENT_STATES,
  bankTransferOrderInputSchema,
  bankTransferOrderSchema,
  cancelOrderInputSchema,
  disputeInputSchema,
  parseData,
  parseEnvelope,
  parseEnvelopeList,
  paymentInstructionsSchema,
  paymentMethodSchema,
  paymentStatusSchema,
  payoutAccountInputSchema,
  resolvedAccountSchema,
  sellerApplicationSchema,
  sellerOrderActionSchema,
  sellerProfileSchema,
  sellerProfileUpdateSchema,
  type Bank,
  type BankTransferOrder,
  type BankTransferOrderInput,
  type BankTransferOrderStatus,
  type PaymentInstructions,
  type PaymentMethod,
  type PaymentStatus,
  type PayoutAccountInput,
  type ResolvedAccount,
  type SellerApplication,
  type SellerOrderAction,
  type SellerProfile,
  type SellerProfileUpdate,
} from "../../utils/validation/bankTransfer";

/**
 * Bank-transfer (Pandascrow) checkout for naira listings.
 *
 * Flow: create the order (server prices it and reserves stock) -> start the
 * payment to get a one-time bank account -> poll the payment status until the
 * deposit webhook confirms it. The money is held until the buyer confirms
 * delivery; the seller and buyer actions below move the order along.
 */

/** Which storefront the shared payments routes act for. */
const PRODUCT = "dezenmart";
const PROVIDER = "pandascrow";
const json = { "Content-Type": "application/json" } as const;

export type OrderSide = "buyer" | "seller";

/** One key per checkout attempt, so a retried "Place order" returns the same order. */
export function newIdempotencyKey(): string {
  // randomUUID only exists in secure contexts (HTTPS, localhost); a phone on the
  // LAN or a plain-HTTP preview needs the getRandomValues fallback.
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

const orderTags = (id: string) =>
  [
    { type: "BankTransferOrder" as const, id },
    { type: "BankTransferOrders" as const, id: "buyer" },
    { type: "BankTransferOrders" as const, id: "seller" },
  ];

/** Cancelling or declining returns stock, so the listings in the order go stale too. */
const orderAndStockTags = (id: string, order?: BankTransferOrder) => [
  ...orderTags(id),
  ...(order?.items ?? []).map((item) => ({ type: "Product" as const, id: item.product })),
];

export const bankTransferApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // --- Reference data ----------------------------------------------------

    getPaymentMethods: builder.query<PaymentMethod[], void>({
      query: () => `/payments/methods?product=${PRODUCT}`,
      transformResponse: (res: unknown) =>
        parseEnvelope(paymentMethodSchema.array(), res, "methods", "GET /payments/methods"),
      keepUnusedDataFor: 300,
    }),

    getBanks: builder.query<Bank[], void>({
      query: () => "/vendors/banks",
      transformResponse: (res: unknown) =>
        parseEnvelope(bankSchema.array(), res, "banks", "GET /vendors/banks").sort((a, b) =>
          a.name.localeCompare(b.name)
        ),
      // The server caches this for a day too.
      keepUnusedDataFor: 86400,
    }),

    /** A mutation, not a query: the server rate-limits lookups and they must never auto-refetch. */
    resolveBankAccount: builder.mutation<ResolvedAccount, PayoutAccountInput>({
      query: (account) => ({
        url: "/vendors/banks/resolve",
        method: "POST",
        headers: json,
        body: payoutAccountInputSchema.parse(account),
      }),
      transformResponse: (res: unknown) =>
        parseData(resolvedAccountSchema, res, "POST /vendors/banks/resolve"),
    }),

    // --- Seller profile ----------------------------------------------------

    /** `null` when the user hasn't set up a payout account yet (the server answers 404). */
    getMySellerProfile: builder.query<SellerProfile | null, void>({
      async queryFn(_arg, _api, _extra, baseQuery) {
        const result = await baseQuery("/vendors/me");
        if (result.error) {
          if (result.error.status === 404) return { data: null };
          return { error: result.error };
        }
        try {
          return { data: parseEnvelope(sellerProfileSchema, result.data, "vendor", "GET /vendors/me") };
        } catch (err) {
          return { error: { status: "CUSTOM_ERROR", error: (err as Error).message } };
        }
      },
      providesTags: [{ type: "SellerProfile", id: "ME" }],
    }),

    applyAsSeller: builder.mutation<SellerProfile, SellerApplication>({
      query: (application) => ({
        url: "/vendors/apply",
        method: "POST",
        headers: json,
        body: sellerApplicationSchema.parse(application),
      }),
      transformResponse: (res: unknown) =>
        parseEnvelope(sellerProfileSchema, res, "vendor", "POST /vendors/apply"),
      invalidatesTags: [{ type: "SellerProfile", id: "ME" }],
    }),

    updateMySellerProfile: builder.mutation<SellerProfile, SellerProfileUpdate>({
      query: (changes) => ({
        url: "/vendors/me",
        method: "PUT",
        headers: json,
        body: sellerProfileUpdateSchema.parse(changes),
      }),
      transformResponse: (res: unknown) =>
        parseEnvelope(sellerProfileSchema, res, "vendor", "PUT /vendors/me"),
      invalidatesTags: [{ type: "SellerProfile", id: "ME" }],
    }),

    // --- Orders --------------------------------------------------------------

    createBankTransferOrder: builder.mutation<
      BankTransferOrder,
      { order: BankTransferOrderInput; idempotencyKey: string }
    >({
      query: ({ order, idempotencyKey }) => ({
        url: "/orders",
        method: "POST",
        headers: { ...json, "Idempotency-Key": idempotencyKey },
        body: bankTransferOrderInputSchema.parse(order),
      }),
      transformResponse: (res: unknown) =>
        parseEnvelope(bankTransferOrderSchema, res, "order", "POST /orders"),
      // Stock is reserved on create, so the listings' counts are stale too.
      invalidatesTags: (_result, error, { order }) =>
        error
          ? []
          : [
              { type: "BankTransferOrders", id: "buyer" },
              ...order.items.map((item) => ({ type: "Product" as const, id: item.product })),
            ],
    }),

    getBankTransferOrders: builder.query<
      BankTransferOrder[],
      { side: OrderSide; status?: BankTransferOrderStatus }
    >({
      query: ({ side, status }) => {
        const params = new URLSearchParams({ paymentMethod: "fiat", type: side });
        if (status) params.set("status", status);
        return `/orders?${params.toString()}`;
      },
      transformResponse: (res: unknown) =>
        parseEnvelopeList(bankTransferOrderSchema, res, "orders", "GET /orders?paymentMethod=fiat"),
      providesTags: (result, _error, { side }) => [
        { type: "BankTransferOrders", id: side },
        ...(result ?? []).map((o) => ({ type: "BankTransferOrder" as const, id: o._id })),
      ],
    }),

    getBankTransferOrder: builder.query<BankTransferOrder, string>({
      query: (orderId) => `/orders/${encodeURIComponent(orderId)}`,
      transformResponse: (res: unknown) =>
        parseEnvelope(bankTransferOrderSchema, res, "order", "GET /orders/{id}"),
      providesTags: (_result, _error, orderId) => [{ type: "BankTransferOrder", id: orderId }],
    }),

    sellerOrderAction: builder.mutation<BankTransferOrder, { orderId: string } & SellerOrderAction>({
      query: ({ orderId, ...action }) => ({
        url: `/orders/${encodeURIComponent(orderId)}/vendor-action`,
        method: "POST",
        headers: json,
        body: sellerOrderActionSchema.parse(action),
      }),
      transformResponse: (res: unknown) =>
        parseEnvelope(bankTransferOrderSchema, res, "order", "POST /orders/{id}/vendor-action"),
      invalidatesTags: (result, _error, { orderId }) => orderAndStockTags(orderId, result),
    }),

    cancelBankTransferOrder: builder.mutation<BankTransferOrder, { orderId: string; reason?: string }>({
      query: ({ orderId, ...body }) => ({
        url: `/orders/${encodeURIComponent(orderId)}/cancel`,
        method: "POST",
        headers: json,
        body: cancelOrderInputSchema.parse(body),
      }),
      transformResponse: (res: unknown) =>
        parseEnvelope(bankTransferOrderSchema, res, "order", "POST /orders/{id}/cancel"),
      invalidatesTags: (result, _error, { orderId }) => orderAndStockTags(orderId, result),
    }),

    /** Releases the held money to the seller. */
    confirmBankTransferDelivery: builder.mutation<BankTransferOrder, string>({
      query: (orderId) => ({
        url: `/orders/${encodeURIComponent(orderId)}/confirm-delivery`,
        method: "POST",
      }),
      transformResponse: (res: unknown) =>
        parseEnvelope(bankTransferOrderSchema, res, "order", "POST /orders/{id}/confirm-delivery"),
      invalidatesTags: (_result, _error, orderId) => orderTags(orderId),
    }),

    submitRefundAccount: builder.mutation<BankTransferOrder, { orderId: string } & PayoutAccountInput>({
      query: ({ orderId, ...account }) => ({
        url: `/orders/${encodeURIComponent(orderId)}/refund-account`,
        method: "POST",
        headers: json,
        body: payoutAccountInputSchema.parse(account),
      }),
      transformResponse: (res: unknown) =>
        parseEnvelope(bankTransferOrderSchema, res, "order", "POST /orders/{id}/refund-account"),
      invalidatesTags: (_result, _error, { orderId }) => orderTags(orderId),
    }),

    /** Freezes the payout until an admin resolves it. Open to the buyer and the seller. */
    raiseBankTransferDispute: builder.mutation<void, { orderId: string; reason: string }>({
      query: ({ orderId, ...body }) => ({
        url: `/orders/${encodeURIComponent(orderId)}/dispute`,
        method: "POST",
        headers: json,
        body: disputeInputSchema.parse(body),
      }),
      invalidatesTags: (_result, _error, { orderId }) => orderTags(orderId),
    }),

    // --- Payment -------------------------------------------------------------

    /**
     * Get the one-time bank account for an order. The server returns the same
     * open account if one exists, so calling this again after a reload is safe.
     */
    startBankTransferPayment: builder.mutation<PaymentInstructions, { orderId: string }>({
      query: ({ orderId }) => ({
        url: "/payments/fiat/initialize",
        method: "POST",
        headers: json,
        body: { product: PRODUCT, provider: PROVIDER, reference: orderId },
      }),
      transformResponse: (res: unknown) =>
        parseData(paymentInstructionsSchema, res, "POST /payments/fiat/initialize"),
    }),

    /**
     * Payment state as verified by the deposit webhook. Poll with
     * `pollingInterval` until FINAL_PAYMENT_STATES; never cache a stale answer.
     */
    getBankTransferPaymentStatus: builder.query<PaymentStatus, string>({
      query: (reference) => `/payments/${encodeURIComponent(reference)}/status`,
      transformResponse: (res: unknown) =>
        parseData(paymentStatusSchema, res, "GET /payments/{reference}/status"),
      keepUnusedDataFor: 0,
      // Any final state (paid, failed, expired) changes the order: refresh it.
      async onQueryStarted(_reference, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          if (FINAL_PAYMENT_STATES.has(data.status)) {
            dispatch(bankTransferApi.util.invalidateTags(orderTags(data.subjectRef)));
          }
        } catch {
          // The query's own error state reports this.
        }
      },
    }),
  }),
});

export const {
  useGetPaymentMethodsQuery,
  useGetBanksQuery,
  useResolveBankAccountMutation,
  useGetMySellerProfileQuery,
  useApplyAsSellerMutation,
  useUpdateMySellerProfileMutation,
  useCreateBankTransferOrderMutation,
  useGetBankTransferOrdersQuery,
  useGetBankTransferOrderQuery,
  useSellerOrderActionMutation,
  useCancelBankTransferOrderMutation,
  useConfirmBankTransferDeliveryMutation,
  useSubmitRefundAccountMutation,
  useRaiseBankTransferDisputeMutation,
  useStartBankTransferPaymentMutation,
  useGetBankTransferPaymentStatusQuery,
} = bankTransferApi;
