import { http, HttpResponse, type HttpHandler } from "msw";
import type { BankTransferOrder, SellerProfile } from "../utils/validation/bankTransfer";
import type { Product } from "../utils/types";
import {
  UNKNOWN_ACCOUNT_NUMBER,
  awaitingPaymentOrder,
  bankListing,
  banks,
  deliveryAddress,
  deliveryQuotes,
  paymentInstructions,
  paymentMethods,
  user,
  verifiedSeller,
} from "./fixtures";

/**
 * A stand-in for the backend endpoints the bank-transfer flow uses, shared by
 * unit tests (msw/node), `npm run dev:mock` (service worker) and end-to-end
 * runs. Envelopes match the real API: `{ status, data: { ... } }`.
 *
 * State lives in a small in-memory store so a flow (apply, then read the
 * profile; order, then pay) behaves like the server would. `resetMockState`
 * puts it back between tests.
 */

interface MockState {
  seller: SellerProfile | null;
  orders: Map<string, BankTransferOrder>;
  /** Payment status polls left before a pending payment is reported paid. */
  pollsUntilPaid: number;
  /** The one listing the mock serves; null means the fixture as it is. */
  listing: Product | null;
}

const state: MockState = { seller: null, orders: new Map(), pollsUntilPaid: 2, listing: null };

export function resetMockState() {
  state.seller = null;
  state.orders.clear();
  state.pollsUntilPaid = 2;
  state.listing = null;
}

/** The store as plain data, so the browser mock can keep it across reloads. */
export interface MockSnapshot {
  seller: SellerProfile | null;
  orders: BankTransferOrder[];
  pollsUntilPaid: number;
  listing?: Product | null;
}

export function snapshotMockState(): MockSnapshot {
  return {
    seller: state.seller,
    orders: [...state.orders.values()],
    pollsUntilPaid: state.pollsUntilPaid,
    listing: state.listing,
  };
}

export function restoreMockState(snapshot: MockSnapshot) {
  state.seller = snapshot.seller;
  state.orders = new Map(snapshot.orders.map((o) => [o._id, o]));
  state.pollsUntilPaid = snapshot.pollsUntilPaid;
  state.listing = snapshot.listing ?? null;
}

/** Serve this listing in place of the fixture, e.g. one the signed-in user owns. */
export function seedMockListing(listing: Product) {
  state.listing = listing;
}

/** Seller moves the server allows, as `${from}:${action}` -> to. */
const VENDOR_TRANSITIONS: Record<string, BankTransferOrder["status"]> = {
  "paid:accept": "preparing",
  "paid:reject": "rejected",
  "preparing:ready": "ready",
  "ready:out_for_delivery": "out_for_delivery",
  "ready:delivered": "delivered",
  "out_for_delivery:delivered": "delivered",
};

const save = (order: BankTransferOrder) => {
  state.orders.set(order._id, order);
  return order;
};

/** Put an order into the store as-is, for tests and dev pages that start mid-flow. */
export function seedMockOrder(order: BankTransferOrder) {
  save(order);
}

/** Make the viewer a seller with this shop, as if they had applied. */
export function seedMockSeller(seller: SellerProfile) {
  state.seller = seller;
}

/** How many status checks report pending before a transfer lands. */
export function setMockPollsUntilPaid(polls: number) {
  state.pollsUntilPaid = polls;
}

const ok = (data: unknown, status = 200) => HttpResponse.json({ status: "success", data }, { status });
const fail = (status: number, message: string) => HttpResponse.json({ status: "fail", message }, { status });

/** Handlers for an API at `baseUrl` (the app's VITE_API_URL). */
export function createHandlers(baseUrl: string): HttpHandler[] {
  const api = (path: string) => `${baseUrl.replace(/\/$/, "")}${path}`;

  return [
    // Session and shell the app loads on every page.
    http.get(api("/users/profile"), () => HttpResponse.json({ status: "success", data: user })),
    http.get(api("/messages"), () => HttpResponse.json([])),
    http.get(api("/notifications"), () => HttpResponse.json([])),
    http.get(api("/notifications/unread-count"), () => ok({ count: 0 })),
    http.get(api("/logistics/locations/states"), () => ok({ states: ["Lagos", "Abuja (FCT)", "Oyo"] })),
    http.get(api("/logistics/locations/states/:state/lgas"), () => ok({ lgas: ["Ikeja", "Lekki", "Surulere"] })),

    // Seller payout account.
    http.get(api("/payments/methods"), () => ok({ methods: paymentMethods })),
    http.get(api("/vendors/banks"), () => ok({ banks })),
    http.post(api("/vendors/banks/resolve"), async ({ request }) => {
      const body = (await request.json()) as { accountNumber?: string };
      if (body.accountNumber === UNKNOWN_ACCOUNT_NUMBER) return fail(422, "Could not resolve account");
      return ok({ accountName: "ADA CHIOMA OBI" });
    }),
    http.get(api("/vendors/me"), () => (state.seller ? ok({ vendor: state.seller }) : fail(404, "Not a vendor"))),
    http.post(api("/vendors/apply"), async ({ request }) => {
      const body = (await request.json()) as { payout: { bankCode: string; accountNumber: string }; address?: string };
      const bank = banks.find((b) => b.code === body.payout.bankCode);
      state.seller = verifiedSeller(bank?.name ?? "Bank", body.payout.accountNumber, body.address);
      return ok({ vendor: state.seller }, 201);
    }),
    http.put(api("/vendors/me"), async ({ request }) => {
      if (!state.seller) return fail(404, "Not a vendor");
      state.seller = { ...state.seller, ...((await request.json()) as Partial<SellerProfile>) };
      return ok({ vendor: state.seller });
    }),

    // Listings, and what the product page loads around one.
    http.post(api("/products"), () => ok({ product: { _id: "65fa0c2e9b1d4a00dddddddd" } }, 201)),
    http.get(api("/products"), () => HttpResponse.json([state.listing ?? bankListing()])),
    http.get(api("/products/sponsored"), () => HttpResponse.json([])),
    http.get(api("/products/:id"), ({ params }) => {
      const listing = state.listing ?? bankListing();
      return params.id === listing._id ? HttpResponse.json(listing) : fail(404, "Product not found");
    }),
    // Applies the fields the real endpoint documents; the owner check uses the mock user.
    http.put(api("/products/:id"), async ({ params, request }) => {
      const listing = state.listing ?? bankListing();
      if (params.id !== listing._id) return fail(404, "Product not found");
      if (listing.seller._id !== user._id) return fail(403, "Not the owner");
      const form = await request.formData();
      const text = (key: string) => {
        const value = form.get(key);
        return typeof value === "string" ? value : undefined;
      };
      const updated: Product = { ...listing };
      if (text("name") !== undefined) updated.name = text("name") ?? listing.name;
      if (text("description") !== undefined) updated.description = text("description") ?? listing.description;
      if (text("category") !== undefined) updated.category = text("category") ?? listing.category;
      if (text("isActive") !== undefined) updated.isActive = text("isActive") === "true";
      if (text("price") !== undefined) updated.price = Number(text("price"));
      if (text("stock") !== undefined) updated.stock = Number(text("stock"));
      const fulfilment = text("fulfilment");
      if (fulfilment) updated.fulfilment = JSON.parse(fulfilment) as Product["fulfilment"];
      // Like the server, new photos replace all the old ones.
      const photos = form.getAll("images").filter((f): f is File => typeof f !== "string");
      if (photos.length > 5) return fail(400, "Too many files");
      if (photos.length > 0) {
        updated.images = photos.map((p, i) => `https://placehold.co/600x600?text=${encodeURIComponent(p.name || `Photo ${i + 1}`)}`);
      }
      state.listing = updated;
      return ok({ product: updated });
    }),
    http.get(api("/watchlist"), () => ok({ watchlist: [] })),
    http.get(api("/watchlist/:id/check"), () => ok({ isWatchlist: false })),
    http.get(api("/reviews/:kind/:id"), () => ok({ reviews: [] })),
    http.get(api("/delivery-addresses"), () => ok({ addresses: [deliveryAddress] })),
    http.post(api("/logistics/quotes"), () => ok({ quotes: deliveryQuotes })),

    // Bank-transfer orders and payment.
    http.post(api("/orders"), async ({ request }) => {
      const body = (await request.json()) as { paymentMethod?: string; fulfilment?: "delivery" | "pickup" };
      if (body.paymentMethod !== "fiat") return fail(422, "Only bank-transfer orders are mocked");
      const fulfilment = body.fulfilment ?? "delivery";
      const order = awaitingPaymentOrder(
        fulfilment === "pickup"
          ? { fulfilment, totals: { subtotal: 12500.5, deliveryFee: 0, serviceFee: 250, total: 12750.5 } }
          : { fulfilment }
      );
      state.orders.set(order._id, order);
      return ok({ order }, 201);
    }),
    http.get(api("/orders"), ({ request }) => {
      const url = new URL(request.url);
      if (url.searchParams.get("paymentMethod") !== "fiat") return HttpResponse.json([]);
      const status = url.searchParams.get("status");
      return ok({ orders: [...state.orders.values()].filter((o) => !status || o.status === status) });
    }),
    http.get(api("/orders/:id"), ({ params }) => {
      const order = state.orders.get(String(params.id));
      return order ? ok({ order }) : fail(404, "Order not found");
    }),
    http.post(api("/orders/:id/vendor-action"), async ({ params, request }) => {
      const order = state.orders.get(String(params.id));
      if (!order) return fail(404, "Order not found");
      const { action } = (await request.json()) as { action: string };
      const next = VENDOR_TRANSITIONS[`${order.status}:${action}`];
      if (!next) return fail(409, `Can't ${action} an order that is ${order.status}`);
      return ok({ order: save({ ...order, status: next }) });
    }),
    http.post(api("/orders/:id/cancel"), ({ params }) => {
      const order = state.orders.get(String(params.id));
      if (!order) return fail(404, "Order not found");
      if (order.status !== "awaiting_payment" && order.status !== "paid") return fail(409, "Too late to cancel");
      const refund = order.status === "paid" ? { status: "processing" as const, amount: order.totals.total } : undefined;
      return ok({ order: save({ ...order, status: "cancelled", refund }) });
    }),
    http.post(api("/orders/:id/confirm-delivery"), ({ params }) => {
      const order = state.orders.get(String(params.id));
      if (!order) return fail(404, "Order not found");
      const inHand =
        order.status === "delivered" ||
        (order.fulfilment === "pickup" && order.status === "ready") ||
        (order.fulfilment === "delivery" && order.status === "out_for_delivery");
      if (!inHand) return fail(409, "Not delivered yet");
      return ok({ order: save({ ...order, status: "completed", payout: { status: "processing" } }) });
    }),
    http.post(api("/orders/:id/refund-account"), async ({ params, request }) => {
      const order = state.orders.get(String(params.id));
      if (!order) return fail(404, "Order not found");
      if (order.refund?.status !== "awaiting_account") return fail(409, "No refund is waiting for an account");
      const { accountNumber } = (await request.json()) as { accountNumber: string };
      if (accountNumber === UNKNOWN_ACCOUNT_NUMBER) return fail(422, "Could not verify the account");
      return ok({ order: save({ ...order, refund: { ...order.refund, status: "processing" } }) });
    }),
    http.post(api("/orders/:id/dispute"), ({ params }) => {
      const order = state.orders.get(String(params.id));
      if (!order) return fail(404, "Order not found");
      save({ ...order, status: "disputed" });
      return ok({ dispute: { status: "open" } }, 201);
    }),
    http.post(api("/payments/fiat/initialize"), async ({ request }) => {
      const body = (await request.json()) as { reference?: string };
      const order = state.orders.get(String(body.reference));
      if (!order) return fail(404, "Order not found");
      if (order.status !== "awaiting_payment") return fail(409, "Not awaiting payment");
      return ok(paymentInstructions(order), 201);
    }),
    http.get(api("/payments/:reference/status"), ({ params }) => {
      const order = [...state.orders.values()].find((o) => `pay_${o._id.slice(-6)}` === params.reference);
      if (!order) return fail(404, "Payment not found");
      // Report pending for a couple of polls, then paid, like a real transfer landing.
      if (order.status === "awaiting_payment") {
        if (state.pollsUntilPaid > 0) state.pollsUntilPaid -= 1;
        else state.orders.set(order._id, { ...order, status: "paid", paidAt: new Date().toISOString() });
      }
      const current = state.orders.get(order._id) ?? order;
      return ok({
        status: current.status === "paid" ? "success" : "pending",
        product: "dezenmart",
        subjectRef: current._id,
        subjectStatus: current.status,
        amount: current.totals.total,
        currency: "NGN",
      });
    }),
  ];
}
