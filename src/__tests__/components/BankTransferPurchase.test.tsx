import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { configureStore } from "@reduxjs/toolkit";
import { setupServer } from "msw/node";
import { http, HttpResponse } from "msw";

// Checkout for a naira listing against the shared mock backend: the order the
// server receives, a retried order keeping its key, and refused orders.

vi.mock("../../context/AuthContext", () => ({ useAuth: () => ({ isAuthenticated: true }) }));
// One US dollar = ₦1,600 here, so a $1.30 delivery quote reads "about ₦2,080.00".
vi.mock("../../context/CurrencyContext", () => ({
  useCurrency: () => ({
    convertPrice: (amount: number, from: string, to: string) => (from === "USD" && to === "NGNm" ? amount * 1600 : amount),
    formatDisplayPrice: (usd: number) => `$${usd}`,
  }),
}));

const API = "https://api.mock.local/api/v1";

let server: ReturnType<typeof setupServer>;
let baseApi: typeof import("../../store/api/baseApi").baseApi;
let purchase: typeof import("../../components/product/singleProduct/BankTransferPurchase");
let handlers: typeof import("../../mocks/handlers");
let fixtures: typeof import("../../mocks/fixtures");

/** Every POST /orders the server saw: its body and Idempotency-Key. */
let orderRequests: { body: Record<string, unknown>; key: string | null }[] = [];

beforeAll(async () => {
  vi.stubEnv("VITE_API_URL", API);
  handlers = await import("../../mocks/handlers");
  fixtures = await import("../../mocks/fixtures");
  server = setupServer(...handlers.createHandlers(API));
  server.listen({ onUnhandledRequest: "bypass" });
  server.events.on("request:start", async ({ request }) => {
    if (request.method === "POST" && new URL(request.url).pathname.endsWith("/orders")) {
      orderRequests.push({ body: await request.clone().json(), key: request.headers.get("Idempotency-Key") });
    }
  });
  ({ baseApi } = await import("../../store/api/baseApi"));
  purchase = await import("../../components/product/singleProduct/BankTransferPurchase");
});

afterEach(() => {
  server.resetHandlers();
  handlers.resetMockState();
  orderRequests = [];
  sessionStorage.clear();
});

afterAll(() => {
  server.close();
  vi.unstubAllEnvs();
});

function renderCheckout(product = fixtures.bankListing()) {
  const store = configureStore({
    reducer: { [baseApi.reducerPath]: baseApi.reducer },
    middleware: (gdm) => gdm().concat(baseApi.middleware),
  });
  const { BankTransferPurchaseProvider, BankTransferPurchaseBody, BankTransferPurchaseFooter } = purchase;
  return render(
    <Provider store={store}>
      <MemoryRouter initialEntries={["/product"]}>
        <Routes>
          <Route
            path="/product"
            element={
              <BankTransferPurchaseProvider product={product}>
                <BankTransferPurchaseBody />
                <BankTransferPurchaseFooter />
              </BankTransferPurchaseProvider>
            }
          />
          <Route path="/orders/:orderId" element={<p>Order page</p>} />
        </Routes>
      </MemoryRouter>
    </Provider>
  );
}

const placeOrder = () => screen.getByRole("button", { name: "Place order" });

async function chooseDelivery() {
  fireEvent.click(await screen.findByRole("button", { name: /Swift Riders/ }));
}

describe("BankTransferPurchase", () => {
  it("places a delivery order with the chosen quote and opens it", async () => {
    renderCheckout();

    expect(placeOrder()).toHaveProperty("disabled", true);
    await chooseDelivery();
    expect(screen.getAllByText("about ₦2,080.00").length).toBeGreaterThan(0);
    await waitFor(() => expect(placeOrder()).toHaveProperty("disabled", false));
    fireEvent.click(placeOrder());

    expect(await screen.findByText("Order page")).toBeTruthy();
    expect(orderRequests).toHaveLength(1);
    expect(orderRequests[0].body).toEqual({
      paymentMethod: "fiat",
      items: [{ product: fixtures.MOCK_PRODUCT_ID, quantity: 1 }],
      fulfilment: "delivery",
      quoteId: fixtures.deliveryQuotes[0].quoteId,
    });
    expect(orderRequests[0].key).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("sends the same key when the same order is retried, so it can't be placed twice", async () => {
    let calls = 0;
    server.use(
      http.post(`${API}/orders`, () => {
        calls += 1;
        return calls === 1 ? HttpResponse.json({ message: "Server busy" }, { status: 503 }) : undefined;
      })
    );
    renderCheckout();
    await chooseDelivery();
    await waitFor(() => expect(placeOrder()).toHaveProperty("disabled", false));

    fireEvent.click(placeOrder());
    expect(await screen.findByText("We couldn't place your order. Try again.")).toBeTruthy();
    fireEvent.click(placeOrder());

    expect(await screen.findByText("Order page")).toBeTruthy();
    expect(orderRequests).toHaveLength(2);
    expect(orderRequests[1].key).toBe(orderRequests[0].key);
  });

  it("places a pickup order without an address or delivery quote", async () => {
    renderCheckout();

    fireEvent.click(await screen.findByRole("radio", { name: "Pickup" }));
    expect(screen.getByText(/collect it from the seller/)).toBeTruthy();
    fireEvent.click(placeOrder());

    expect(await screen.findByText("Order page")).toBeTruthy();
    expect(orderRequests[0].body).toMatchObject({ fulfilment: "pickup" });
    expect(orderRequests[0].body).not.toHaveProperty("quoteId");
  });

  it("asks for a new delivery option when the quote has run out", async () => {
    server.use(http.post(`${API}/orders`, () => HttpResponse.json({ message: "Quote expired" }, { status: 422 })));
    renderCheckout();
    await chooseDelivery();
    await waitFor(() => expect(placeOrder()).toHaveProperty("disabled", false));

    fireEvent.click(placeOrder());

    expect(await screen.findByText("Your delivery price has run out. Choose a delivery option again.")).toBeTruthy();
    expect(placeOrder()).toHaveProperty("disabled", true);
  });

  it("points to an unpaid order the buyer already has for this item", async () => {
    handlers.seedMockOrder(fixtures.awaitingPaymentOrder());
    renderCheckout();

    expect(await screen.findByText("You have an unpaid order for this item")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Go to that order" }).getAttribute("href")).toBe(
      `/orders/${fixtures.MOCK_ORDER_ID}`
    );
  });
});
