import { http, HttpResponse, type HttpHandler } from "msw";
import type { BankTransferOrder, SellerProfile } from "../utils/validation/bankTransfer";
import {
  UNKNOWN_ACCOUNT_NUMBER,
  awaitingPaymentOrder,
  banks,
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
}

const state: MockState = { seller: null, orders: new Map(), pollsUntilPaid: 2 };

export function resetMockState() {
  state.seller = null;
  state.orders.clear();
  state.pollsUntilPaid = 2;
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

    // Listings.
    http.post(api("/products"), () => ok({ product: { _id: "65fa0c2e9b1d4a00dddddddd" } }, 201)),

    // Bank-transfer orders and payment.
    http.post(api("/orders"), async ({ request }) => {
      const body = (await request.json()) as { paymentMethod?: string; fulfilment?: "delivery" | "pickup" };
      if (body.paymentMethod !== "fiat") return fail(422, "Only bank-transfer orders are mocked");
      const order = awaitingPaymentOrder({ fulfilment: body.fulfilment ?? "delivery" });
      state.orders.set(order._id, order);
      return ok({ order }, 201);
    }),
    http.get(api("/orders"), ({ request }) => {
      const url = new URL(request.url);
      if (url.searchParams.get("paymentMethod") !== "fiat") return HttpResponse.json([]);
      return ok({ orders: [...state.orders.values()] });
    }),
    http.get(api("/orders/:id"), ({ params }) => {
      const order = state.orders.get(String(params.id));
      return order ? ok({ order }) : fail(404, "Order not found");
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
