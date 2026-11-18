import { describe, it, expect, vi, beforeAll, beforeEach, afterAll } from "vitest";
import { configureStore } from "@reduxjs/toolkit";

// Exercises the real RTK Query endpoints against a stubbed fetch, so the URLs,
// headers, bodies and response contracts are tested as the app will send them.

const API = "https://api.test";
const ORDER_ID = "65fa0c2e9b1d4a0012345678";
const PRODUCT_ID = "65fa0c2e9b1d4a00aaaaaaaa";
const QUOTE_ID = "65fa0c2e9b1d4a00bbbbbbbb";

const storage = new Map<string, string>();
const memoryStorage = {
  getItem: (k: string) => storage.get(k) ?? null,
  setItem: (k: string, v: string) => void storage.set(k, String(v)),
  removeItem: (k: string) => void storage.delete(k),
  clear: () => storage.clear(),
};

const fetchMock = vi.fn<(req: Request) => Promise<Response>>();

type Route = { status?: number; body: unknown };
/** Answer by "METHOD path" so one test can serve several endpoints; a fresh Response each time. */
function routes(table: Record<string, Route | Route[]>) {
  const queues = new Map(Object.entries(table).map(([k, v]) => [k, Array.isArray(v) ? [...v] : [v]]));
  fetchMock.mockImplementation(async (req) => {
    const url = new URL(req.url);
    const key = `${req.method} ${url.pathname.replace("/v1", "")}`;
    const queue = queues.get(key);
    if (!queue) throw new Error(`No stub for ${key}`);
    const route = queue.length > 1 ? queue.shift()! : queue[0];
    return new Response(JSON.stringify(route.body), {
      status: route.status ?? 200,
      headers: { "Content-Type": "application/json" },
    });
  });
}

const calls = (key: string) =>
  fetchMock.mock.calls.filter(([r]) => `${r.method} ${new URL(r.url).pathname.replace("/v1", "")}` === key);

let baseApi: typeof import("../../store/api/baseApi").baseApi;
let api: typeof import("../../store/api/bankTransferApi").bankTransferApi;

beforeAll(async () => {
  vi.stubEnv("VITE_API_URL", API);
  vi.stubGlobal("localStorage", memoryStorage);
  vi.stubGlobal("fetch", fetchMock);
  ({ baseApi } = await import("../../store/api/baseApi"));
  ({ bankTransferApi: api } = await import("../../store/api/bankTransferApi"));
});

afterAll(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

beforeEach(() => {
  storage.clear();
  storage.set("auth_token", "jwt-123");
  fetchMock.mockReset();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

const makeStore = () =>
  configureStore({
    reducer: { [baseApi.reducerPath]: baseApi.reducer },
    middleware: (gdm) => gdm().concat(baseApi.middleware),
  });

const order = (overrides: Record<string, unknown> = {}) => ({
  _id: ORDER_ID,
  status: "awaiting_payment",
  fulfilment: "delivery",
  items: [{ product: PRODUCT_ID, name: "Tote bag", quantity: 1, unitPrice: 12500 }],
  totals: { subtotal: 12500, deliveryFee: 2000, serviceFee: 500, total: 15000 },
  currency: "NGN",
  expiresAt: "2026-11-17T13:00:00.000Z",
  ...overrides,
});

const instructions = {
  reference: "pay_123",
  product: "dezenmart",
  subjectRef: ORDER_ID,
  virtualAccount: {
    bankName: "Wema Bank",
    accountNumber: "9912345678",
    accountName: "DEZENMART/ADA OBI",
    expiresAt: "2026-11-17T13:00:00.000Z",
  },
  amount: 15000,
  currency: "NGN",
};

describe("reference data", () => {
  it("lists payment methods for the shopping storefront", async () => {
    routes({
      "GET /payments/methods": {
        body: { status: "success", data: { methods: [{ provider: "pandascrow", enabled: true, label: "Bank transfer" }] } },
      },
    });

    const res = await makeStore().dispatch(api.endpoints.getPaymentMethods.initiate());

    expect(new URL(fetchMock.mock.calls[0][0].url).searchParams.get("product")).toBe("dezenmart");
    expect(res.data?.[0]).toMatchObject({ provider: "pandascrow", enabled: true });
  });

  it("returns banks sorted by name", async () => {
    routes({
      "GET /vendors/banks": {
        body: { data: { banks: [{ code: "058", name: "GTBank" }, { code: "044", name: "Access Bank" }] } },
      },
    });

    const res = await makeStore().dispatch(api.endpoints.getBanks.initiate());

    expect(res.data?.map((b) => b.name)).toEqual(["Access Bank", "GTBank"]);
  });

  it("looks up an account holder's name", async () => {
    routes({ "POST /vendors/banks/resolve": { body: { data: { accountName: "ADA OBI" } } } });

    const res = await makeStore().dispatch(
      api.endpoints.resolveBankAccount.initiate({ bankCode: "058", accountNumber: "0123456789" })
    );

    expect("data" in res && res.data).toEqual({ accountName: "ADA OBI" });
    expect(await calls("POST /vendors/banks/resolve")[0][0].json()).toEqual({
      bankCode: "058",
      accountNumber: "0123456789",
    });
  });
});

describe("seller profile", () => {
  it("treats 'not a seller yet' (404) as no profile, not an error", async () => {
    routes({ "GET /vendors/me": { status: 404, body: { status: "fail", message: "Not a vendor" } } });

    const res = await makeStore().dispatch(api.endpoints.getMySellerProfile.initiate());

    expect(res.isError).toBe(false);
    expect(res.data).toBeNull();
  });

  it("still reports real failures", async () => {
    routes({ "GET /vendors/me": { status: 500, body: { message: "boom" } } });

    const res = await makeStore().dispatch(api.endpoints.getMySellerProfile.initiate());

    expect(res.isError).toBe(true);
  });

  it("refreshes the profile after a seller sets up their payout account", async () => {
    const vendor = { _id: "v1", marketplaceAccess: true, payoutAccount: { bankName: "GTBank", accountNumber: "******6789" } };
    routes({
      "GET /vendors/me": [{ status: 404, body: {} }, { body: { data: { vendor } } }],
      "POST /vendors/apply": { status: 201, body: { data: { vendor } } },
    });
    const store = makeStore();
    const sub = store.dispatch(api.endpoints.getMySellerProfile.initiate());
    await sub;

    await store.dispatch(
      api.endpoints.applyAsSeller.initiate({ payout: { bankCode: "058", accountNumber: "0123456789" } })
    );

    await vi.waitFor(() => expect(calls("GET /vendors/me")).toHaveLength(2));
    await vi.waitFor(() =>
      expect(api.endpoints.getMySellerProfile.select()(store.getState()).data?.marketplaceAccess).toBe(true)
    );
    sub.unsubscribe();
  });
});

describe("orders", () => {
  const input = {
    paymentMethod: "fiat" as const,
    items: [{ product: PRODUCT_ID, quantity: 1 }],
    fulfilment: "delivery" as const,
    quoteId: QUOTE_ID,
  };

  it("places the order with an idempotency key and returns the server-priced order", async () => {
    routes({ "POST /orders": { status: 201, body: { data: { order: order() } } } });

    const res = await makeStore().dispatch(
      api.endpoints.createBankTransferOrder.initiate({ order: input, idempotencyKey: "key-1" })
    );

    const req = calls("POST /orders")[0][0];
    expect(req.headers.get("Idempotency-Key")).toBe("key-1");
    expect(req.headers.get("Authorization")).toBe("Bearer jwt-123");
    expect(await req.json()).toEqual(input);
    expect("data" in res && res.data?.totals.total).toBe(15000);
  });

  it("never sends an order the server would reject (delivery without a quote)", async () => {
    routes({});

    const res = await makeStore().dispatch(
      api.endpoints.createBankTransferOrder.initiate({
        order: { ...input, quoteId: undefined },
        idempotencyKey: "key-2",
      })
    );

    expect("error" in res).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("lists the buyer's bank-transfer orders, never the crypto ones", async () => {
    routes({ "GET /orders": { body: { data: { orders: [order()] } } } });

    const res = await makeStore().dispatch(api.endpoints.getBankTransferOrders.initiate({ side: "buyer" }));

    const url = new URL(calls("GET /orders")[0][0].url);
    expect(url.searchParams.get("paymentMethod")).toBe("fiat");
    expect(url.searchParams.get("type")).toBe("buyer");
    expect(res.data).toHaveLength(1);
  });

  it("refreshes the seller's list after they act on an order", async () => {
    routes({
      "GET /orders": { body: { data: { orders: [order({ status: "paid" })] } } },
      [`POST /orders/${ORDER_ID}/vendor-action`]: { body: { data: { order: order({ status: "preparing" }) } } },
    });
    const store = makeStore();
    const sub = store.dispatch(api.endpoints.getBankTransferOrders.initiate({ side: "seller" }));
    await sub;

    await store.dispatch(api.endpoints.sellerOrderAction.initiate({ orderId: ORDER_ID, action: "accept" }));

    await vi.waitFor(() => expect(calls("GET /orders")).toHaveLength(2));
    sub.unsubscribe();
  });

  it("sends the dispute reason to the order's dispute route", async () => {
    routes({ [`POST /orders/${ORDER_ID}/dispute`]: { body: { status: "success" } } });

    await makeStore().dispatch(
      api.endpoints.raiseBankTransferDispute.initiate({ orderId: ORDER_ID, reason: "Item never arrived" })
    );

    expect(await calls(`POST /orders/${ORDER_ID}/dispute`)[0][0].json()).toEqual({ reason: "Item never arrived" });
  });

  it("surfaces an order whose shape breaks the contract as an error", async () => {
    routes({ [`GET /orders/${ORDER_ID}`]: { body: { data: { order: order({ status: "teleported" }) } } } });

    const res = await makeStore().dispatch(api.endpoints.getBankTransferOrder.initiate(ORDER_ID));

    expect(res.isError).toBe(true);
  });
});

describe("order kind", () => {
  it("routes a bank-transfer order to its screen and seeds it, so it isn't fetched twice", async () => {
    routes({ [`GET /orders/${ORDER_ID}`]: { body: { data: { order: order({ paymentMethod: "fiat" }) } } } });
    const store = makeStore();

    const kind = await store.dispatch(api.endpoints.getOrderKind.initiate(ORDER_ID));
    expect(kind.data?.kind).toBe("bank");

    // The order screen reads the seeded order instead of asking the server again.
    const sub = store.dispatch(api.endpoints.getBankTransferOrder.initiate(ORDER_ID));
    await vi.waitFor(() =>
      expect(api.endpoints.getBankTransferOrder.select(ORDER_ID)(store.getState()).data?._id).toBe(ORDER_ID)
    );
    sub.unsubscribe();
    expect(calls(`GET /orders/${ORDER_ID}`)).toHaveLength(1);
  });

  it("leaves crypto orders to the crypto screen", async () => {
    routes({ [`GET /orders/${ORDER_ID}`]: { body: { data: { order: { _id: ORDER_ID, status: "pending" } } } } });

    const kind = await makeStore().dispatch(api.endpoints.getOrderKind.initiate(ORDER_ID));

    expect(kind.data).toEqual({ kind: "crypto" });
  });
});

describe("payment", () => {
  it("asks for a one-time account for the order", async () => {
    routes({ "POST /payments/fiat/initialize": { status: 201, body: { data: instructions } } });

    const res = await makeStore().dispatch(api.endpoints.startBankTransferPayment.initiate({ orderId: ORDER_ID }));

    expect(await calls("POST /payments/fiat/initialize")[0][0].json()).toEqual({
      product: "dezenmart",
      provider: "pandascrow",
      reference: ORDER_ID,
    });
    expect("data" in res && res.data?.virtualAccount.accountNumber).toBe("9912345678");
  });

  it("refuses to show account details that fail the contract", async () => {
    routes({
      "POST /payments/fiat/initialize": {
        status: 201,
        body: { data: { ...instructions, virtualAccount: { ...instructions.virtualAccount, accountNumber: "" } } },
      },
    });

    const res = await makeStore().dispatch(api.endpoints.startBankTransferPayment.initiate({ orderId: ORDER_ID }));

    expect("error" in res).toBe(true);
  });

  it("refreshes the order once the payment is confirmed", async () => {
    const status = (s: string) => ({ data: { status: s, product: "dezenmart", subjectRef: ORDER_ID, amount: 15000, currency: "NGN" } });
    routes({
      [`GET /orders/${ORDER_ID}`]: [
        { body: { data: { order: order() } } },
        { body: { data: { order: order({ status: "paid" }) } } },
      ],
      "GET /payments/pay_123/status": [{ body: status("pending") }, { body: status("success") }],
    });
    const store = makeStore();
    const orderSub = store.dispatch(api.endpoints.getBankTransferOrder.initiate(ORDER_ID));
    await orderSub;

    // Still pending: the order is left alone.
    await store.dispatch(api.endpoints.getBankTransferPaymentStatus.initiate("pay_123", { forceRefetch: true }));
    expect(calls(`GET /orders/${ORDER_ID}`)).toHaveLength(1);

    // Confirmed: the order is fetched again and moves to paid.
    await store.dispatch(api.endpoints.getBankTransferPaymentStatus.initiate("pay_123", { forceRefetch: true }));
    await vi.waitFor(() =>
      expect(api.endpoints.getBankTransferOrder.select(ORDER_ID)(store.getState()).data?.status).toBe("paid")
    );
    orderSub.unsubscribe();
  });
});
