import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";
import { configureStore } from "@reduxjs/toolkit";
import { setupServer } from "msw/node";
import { http, HttpResponse } from "msw";

// Order History with the flag on: bank-transfer orders appear beside crypto
// ones, newest first, and a failure to load them doesn't hide the rest.

const API = "https://api.mock.local/api/v1";

let server: ReturnType<typeof setupServer>;
let baseApi: typeof import("../../store/api/baseApi").baseApi;
let TabContent: typeof import("../../components/account/overview/TabContent").default;
let handlers: typeof import("../../mocks/handlers");
let fixtures: typeof import("../../mocks/fixtures");

beforeAll(async () => {
  vi.stubEnv("VITE_API_URL", API);
  vi.stubEnv("VITE_ENABLE_BANK_TRANSFER", "true");
  handlers = await import("../../mocks/handlers");
  fixtures = await import("../../mocks/fixtures");
  server = setupServer(...handlers.createHandlers(API));
  server.listen({ onUnhandledRequest: "bypass" });
  ({ baseApi } = await import("../../store/api/baseApi"));
  ({ default: TabContent } = await import("../../components/account/overview/TabContent"));
});

afterEach(() => {
  server.resetHandlers();
  handlers.resetMockState();
});

afterAll(() => {
  server.close();
  vi.unstubAllEnvs();
});

function renderHistory() {
  const store = configureStore({
    reducer: { [baseApi.reducerPath]: baseApi.reducer },
    middleware: (gdm) => gdm().concat(baseApi.middleware),
  });
  return render(
    <Provider store={store}>
      <MemoryRouter>
        <TabContent activeTab="3" />
      </MemoryRouter>
    </Provider>
  );
}

describe("Order History with bank-transfer orders", () => {
  it("lists bank-transfer purchases newest first and flags the ones waiting on the buyer", async () => {
    handlers.seedMockOrder(
      fixtures.awaitingPaymentOrder({ _id: "65fa0c2e9b1d4a0000000001", createdAt: "2026-11-10T09:00:00.000Z", status: "completed" })
    );
    handlers.seedMockOrder(
      fixtures.awaitingPaymentOrder({
        _id: "65fa0c2e9b1d4a0000000002",
        createdAt: "2026-11-17T09:00:00.000Z",
        items: [{ product: fixtures.MOCK_PRODUCT_ID, name: "Adire scarf", quantity: 1, unitPrice: 8000 }],
      })
    );
    renderHistory();

    expect(await screen.findByText("2 purchases")).toBeTruthy();
    const rows = screen.getAllByRole("button", { name: /^(Adire scarf|Ankara tote bag)/ });
    expect(rows).toHaveLength(2);
    expect(within(rows[0]).getByText("Adire scarf")).toBeTruthy();
    expect(within(rows[0]).getByText("Awaiting payment")).toBeTruthy();
    expect(within(rows[0]).getByText("Needs your action")).toBeTruthy();
    expect(within(rows[1]).getByText("Completed")).toBeTruthy();
  });

  it("shows the empty state only when there are no orders of either kind", async () => {
    renderHistory();
    expect(await screen.findByText("You haven't placed any orders yet.")).toBeTruthy();
  });

  it("says when bank-transfer orders couldn't load instead of claiming there are none", async () => {
    server.use(
      http.get(`${API}/orders`, ({ request }) =>
        new URL(request.url).searchParams.get("paymentMethod") === "fiat"
          ? HttpResponse.json({ message: "down" }, { status: 500 })
          : HttpResponse.json([])
      )
    );
    renderHistory();

    expect(await screen.findByText("Couldn't load your bank-transfer orders.")).toBeTruthy();
    expect(screen.queryByText("You haven't placed any orders yet.")).toBeNull();
  });
});
