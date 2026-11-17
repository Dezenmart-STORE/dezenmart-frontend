import { describe, it, expect, vi, beforeAll, beforeEach, afterAll } from "vitest";
import { configureStore } from "@reduxjs/toolkit";

// Tests the real RTK Query layer (auth header, 401 handling, order endpoints)
// against a stubbed fetch. Only the network and storage are faked.

const API = "https://api.test";

// Working in-memory localStorage; the global test setup only provides no-op mocks.
const storage = new Map<string, string>();
const memoryStorage = {
  getItem: (k: string) => storage.get(k) ?? null,
  setItem: (k: string, v: string) => void storage.set(k, String(v)),
  removeItem: (k: string) => void storage.delete(k),
  clear: () => storage.clear(),
};

type Reply = { status?: number; body: unknown };
const fetchMock = vi.fn<(req: Request) => Promise<Response>>();

function reply({ status = 200, body }: Reply) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// Loaded after VITE_API_URL is stubbed, because baseApi reads it at import time.
let baseApi: typeof import("../../store/api/baseApi").baseApi;
let ordersApi: typeof import("../../store/api/ordersApi").ordersApi;

beforeAll(async () => {
  vi.stubEnv("VITE_API_URL", API);
  vi.stubGlobal("localStorage", memoryStorage);
  vi.stubGlobal("fetch", fetchMock);
  ({ baseApi } = await import("../../store/api/baseApi"));
  ({ ordersApi } = await import("../../store/api/ordersApi"));
});

afterAll(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

function makeStore() {
  return configureStore({
    reducer: { [baseApi.reducerPath]: baseApi.reducer },
    middleware: (gdm) => gdm().concat(baseApi.middleware),
  });
}

// A fresh Response per call: a body can only be read once.
function respond(r: Reply) {
  fetchMock.mockImplementation(async () => reply(r));
}

function lastRequest(): Request {
  const calls = fetchMock.mock.calls;
  const call = calls[calls.length - 1];
  if (!call) throw new Error("fetch was not called");
  return call[0];
}

beforeEach(() => {
  storage.clear();
  fetchMock.mockReset();
  vi.spyOn(console, "log").mockImplementation(() => {});
});

describe("API auth", () => {
  it("sends the saved login token as a Bearer header", async () => {
    storage.set("auth_token", "jwt-123");
    respond({ body: [] });

    await makeStore().dispatch(ordersApi.endpoints.getOrders.initiate());

    expect(lastRequest().headers.get("Authorization")).toBe("Bearer jwt-123");
  });

  it("sends no Authorization header when logged out", async () => {
    respond({ body: [] });

    await makeStore().dispatch(ordersApi.endpoints.getOrders.initiate());

    expect(lastRequest().headers.has("Authorization")).toBe(false);
  });

  it("clears the expired login when the server answers 401", async () => {
    storage.set("auth_token", "expired");
    storage.set("auth_user", "{}");
    respond({ status: 401, body: { message: "jwt expired" } });

    const res = await makeStore().dispatch(ordersApi.endpoints.getOrders.initiate());

    expect(res.isError).toBe(true);
    expect(storage.has("auth_token")).toBe(false);
    expect(storage.has("auth_user")).toBe(false);
  });

  it("leaves storage alone on other errors", async () => {
    storage.set("auth_token", "jwt-123");
    respond({ status: 500, body: { message: "boom" } });

    await makeStore().dispatch(ordersApi.endpoints.getOrders.initiate());

    expect(storage.get("auth_token")).toBe("jwt-123");
  });
});

describe("orders API", () => {
  it("asks for the buyer's orders and drops ones whose product was deleted", async () => {
    fetchMock.mockResolvedValue(
      reply({
        body: {
          data: [
            { _id: "o1", product: { _id: "p1" } },
            { _id: "o2", product: null },
          ],
        },
      })
    );

    const res = await makeStore().dispatch(
      ordersApi.endpoints.getUserOrders.initiate({ type: "buyer" })
    );

    expect(lastRequest().url).toBe(`${API}/orders?type=buyer`);
    expect(res.data?.map((o) => o._id)).toEqual(["o1"]);
  });

  it("unwraps a single order from the { data: { order } } envelope", async () => {
    respond({ body: { data: { order: { _id: "o9" } } } });

    const res = await makeStore().dispatch(ordersApi.endpoints.getOrderById.initiate("o9"));

    expect(lastRequest().url).toBe(`${API}/orders/o9`);
    expect(res.data?._id).toBe("o9");
  });

  it("creates an order with a POST and returns the order itself", async () => {
    respond({ status: 201, body: { data: { order: { _id: "new" } } } });
    const params = { product: "p1", quantity: 2 } as unknown as Parameters<
      typeof ordersApi.endpoints.createOrder.initiate
    >[0];

    const res = await makeStore().dispatch(ordersApi.endpoints.createOrder.initiate(params));

    const req = lastRequest();
    expect(req.method).toBe("POST");
    expect(req.url).toBe(`${API}/orders`);
    expect(await req.json()).toEqual({ product: "p1", quantity: 2 });
    expect("data" in res && res.data?._id).toBe("new");
  });

  it("refreshes the buyer's order list after a new order is placed", async () => {
    const store = makeStore();
    respond({ body: [] });
    const sub = store.dispatch(ordersApi.endpoints.getUserOrders.initiate({ type: "buyer" }));
    await sub;
    const listFetches = () =>
      fetchMock.mock.calls.filter(([r]) => r.url === `${API}/orders?type=buyer`).length;
    expect(listFetches()).toBe(1);

    respond({ body: { data: { order: { _id: "new" } } } });
    await store.dispatch(
      ordersApi.endpoints.createOrder.initiate({ product: "p1" } as unknown as Parameters<
        typeof ordersApi.endpoints.createOrder.initiate
      >[0])
    );

    await vi.waitFor(() => expect(listFetches()).toBe(2));
    sub.unsubscribe();
  });

  it("sends a dispute reason to the order's dispute endpoint", async () => {
    respond({ body: { _id: "o1" } });

    await makeStore().dispatch(
      ordersApi.endpoints.raiseDispute.initiate({ orderId: "o1", reason: "Never arrived" })
    );

    const req = lastRequest();
    expect(req.method).toBe("POST");
    expect(req.url).toBe(`${API}/orders/o1/dispute`);
    expect(await req.json()).toEqual({ reason: "Never arrived" });
  });
});
