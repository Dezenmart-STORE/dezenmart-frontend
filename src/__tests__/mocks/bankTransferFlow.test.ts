import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from "vitest";
import { configureStore } from "@reduxjs/toolkit";
import { setupServer } from "msw/node";
import { http, HttpResponse } from "msw";

// The data layer driven through the shared mock backend (src/mocks), the same
// handlers `npm run dev:mock` and end-to-end runs use.

const API = "https://api.mock.local/api/v1";

let server: ReturnType<typeof setupServer>;
let baseApi: typeof import("../../store/api/baseApi").baseApi;
let api: typeof import("../../store/api/bankTransferApi").bankTransferApi;
let newIdempotencyKey: typeof import("../../store/api/bankTransferApi").newIdempotencyKey;
let resetMockState: typeof import("../../mocks/handlers").resetMockState;
let fixtures: typeof import("../../mocks/fixtures");

beforeAll(async () => {
  vi.stubEnv("VITE_API_URL", API);
  const handlers = await import("../../mocks/handlers");
  resetMockState = handlers.resetMockState;
  fixtures = await import("../../mocks/fixtures");
  server = setupServer(...handlers.createHandlers(API));
  server.listen({ onUnhandledRequest: "error" });
  ({ baseApi } = await import("../../store/api/baseApi"));
  ({ bankTransferApi: api, newIdempotencyKey } = await import("../../store/api/bankTransferApi"));
});

afterEach(() => {
  server.resetHandlers();
  resetMockState();
});

afterAll(() => {
  server.close();
  vi.unstubAllEnvs();
});

const makeStore = () =>
  configureStore({
    reducer: { [baseApi.reducerPath]: baseApi.reducer },
    middleware: (gdm) => gdm().concat(baseApi.middleware),
  });

describe("seller setup against the mock backend", () => {
  it("goes from no profile to a verified payout account", async () => {
    const store = makeStore();
    const before = await store.dispatch(api.endpoints.getMySellerProfile.initiate());
    expect(before.data).toBeNull();

    await store.dispatch(
      api.endpoints.applyAsSeller.initiate({ payout: { bankCode: "058", accountNumber: "0123456789" } })
    );
    const after = await store.dispatch(
      api.endpoints.getMySellerProfile.initiate(undefined, { forceRefetch: true })
    );
    expect(after.data?.payoutAccount).toMatchObject({ bankName: "GTBank", accountName: "ADA CHIOMA OBI" });
    expect(after.data?.payoutAccount?.accountNumber).toBe("******6789");
  });

  it("reports an account the bank can't find", async () => {
    const res = await makeStore().dispatch(
      api.endpoints.resolveBankAccount.initiate({
        bankCode: "058",
        accountNumber: fixtures.UNKNOWN_ACCOUNT_NUMBER,
      })
    );
    expect("error" in res && (res.error as { status: number }).status).toBe(422);
  });
});

describe("buying against the mock backend", () => {
  it("orders, gets a one-time account, and sees the order turn paid", async () => {
    const store = makeStore();
    const created = await store.dispatch(
      api.endpoints.createBankTransferOrder.initiate({
        order: {
          paymentMethod: "fiat",
          items: [{ product: fixtures.MOCK_PRODUCT_ID, quantity: 1 }],
          fulfilment: "pickup",
        },
        idempotencyKey: newIdempotencyKey(),
      })
    );
    const order = "data" in created ? created.data : undefined;
    expect(order?.status).toBe("awaiting_payment");

    const sub = store.dispatch(api.endpoints.getBankTransferOrder.initiate(order!._id));
    await sub;

    const started = await store.dispatch(
      api.endpoints.startBankTransferPayment.initiate({ orderId: order!._id })
    );
    const instructions = "data" in started ? started.data : undefined;
    expect(instructions?.amount).toBe(order!.totals.total);
    expect(instructions?.subjectRef).toBe(order!._id);

    // The mock reports pending twice, then paid, like a transfer landing.
    const statuses: string[] = [];
    for (let i = 0; i < 3; i++) {
      const res = await store.dispatch(
        api.endpoints.getBankTransferPaymentStatus.initiate(instructions!.reference, { forceRefetch: true })
      );
      statuses.push(res.data!.status);
    }
    expect(statuses).toEqual(["pending", "pending", "success"]);

    await vi.waitFor(() =>
      expect(api.endpoints.getBankTransferOrder.select(order!._id)(store.getState()).data?.status).toBe("paid")
    );
    sub.unsubscribe();
  });
});

describe("contract tolerance", () => {
  it("drops an order that breaks the contract instead of losing the whole list", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const good = fixtures.awaitingPaymentOrder();
    server.use(
      http.get(`${API}/orders`, () =>
        HttpResponse.json({ status: "success", data: { orders: [good, { ...good, _id: "x", status: "teleported" }] } })
      )
    );

    const res = await makeStore().dispatch(api.endpoints.getBankTransferOrders.initiate({ side: "buyer" }));

    expect(res.isError).toBe(false);
    expect(res.data?.map((o) => o._id)).toEqual([good._id]);
  });
});

describe("newIdempotencyKey", () => {
  it("still makes a v4 UUID where crypto.randomUUID doesn't exist (plain HTTP)", () => {
    const original = crypto.randomUUID;
    Object.defineProperty(crypto, "randomUUID", { value: undefined, configurable: true });
    try {
      const key = newIdempotencyKey();
      expect(key).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
      expect(newIdempotencyKey()).not.toBe(key);
    } finally {
      Object.defineProperty(crypto, "randomUUID", { value: original, configurable: true });
    }
  });
});
