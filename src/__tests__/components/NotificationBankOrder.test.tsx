import { it, expect, vi, beforeAll, afterAll, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { configureStore } from "@reduxjs/toolkit";
import { setupServer } from "msw/node";

// A sale notification for a bank-transfer order skips the crypto sale sheet
// (token amounts, escrow wording) and opens the order itself.

vi.mock("../../context/CurrencyContext", () => ({ useCurrency: () => ({ formatAmount: () => "" }) }));

const API = "https://api.mock.local/api/v1";

let server: ReturnType<typeof setupServer>;
let baseApi: typeof import("../../store/api/baseApi").baseApi;
let Sheet: typeof import("../../components/notifications/NotificationActionSheet").default;
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
  ({ default: Sheet } = await import("../../components/notifications/NotificationActionSheet"));
});

afterEach(() => handlers.resetMockState());
afterAll(() => {
  server.close();
  vi.unstubAllEnvs();
});

it("opens a bank-transfer order straight from its sale notification", async () => {
  handlers.seedMockOrder(fixtures.awaitingPaymentOrder({ status: "paid" }));
  const store = configureStore({
    reducer: { [baseApi.reducerPath]: baseApi.reducer },
    middleware: (gdm) => gdm().concat(baseApi.middleware),
  });
  const onClose = vi.fn();
  render(
    <Provider store={store}>
      <MemoryRouter initialEntries={["/notifications"]}>
        <Routes>
          <Route
            path="/notifications"
            element={
              <Sheet
                variant="sale"
                onClose={onClose}
                notification={{
                  _id: "n1",
                  recipient: fixtures.MOCK_USER_ID,
                  type: "ORDER_PLACED",
                  message: "New order placed for Ankara tote bag",
                  read: false,
                  metadata: { orderId: fixtures.MOCK_ORDER_ID },
                  createdAt: "2026-11-18T09:00:00.000Z",
                  updatedAt: "2026-11-18T09:00:00.000Z",
                }}
              />
            }
          />
          <Route path="/orders/:orderId" element={<p>Order page</p>} />
        </Routes>
      </MemoryRouter>
    </Provider>
  );

  expect(await screen.findByText("Order page")).toBeTruthy();
  expect(onClose).toHaveBeenCalled();
  expect(screen.queryByText(/escrow/)).toBeNull();
});

