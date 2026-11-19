import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from "vitest";
import { render, screen, fireEvent, within, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";
import { configureStore } from "@reduxjs/toolkit";
import { setupServer } from "msw/node";
import { http, HttpResponse } from "msw";
import type { BankTransferOrder } from "../../utils/validation/bankTransfer";

// The bank-transfer order screen against the shared mock backend: paying,
// the seller moving the order on, and the buyer confirming delivery.

const API = "https://api.mock.local/api/v1";

let server: ReturnType<typeof setupServer>;
let baseApi: typeof import("../../store/api/baseApi").baseApi;
let View: typeof import("../../pages/BankTransferOrderView").default;
let SnackbarProvider: typeof import("../../context/SnackbarContext").SnackbarProvider;
let handlers: typeof import("../../mocks/handlers");
let fixtures: typeof import("../../mocks/fixtures");

beforeAll(async () => {
  vi.stubEnv("VITE_API_URL", API);
  handlers = await import("../../mocks/handlers");
  fixtures = await import("../../mocks/fixtures");
  server = setupServer(...handlers.createHandlers(API));
  server.listen({ onUnhandledRequest: "bypass" });
  ({ baseApi } = await import("../../store/api/baseApi"));
  ({ default: View } = await import("../../pages/BankTransferOrderView"));
  ({ SnackbarProvider } = await import("../../context/SnackbarContext"));
});

afterEach(() => {
  server.resetHandlers();
  handlers.resetMockState();
});

afterAll(() => {
  server.close();
  vi.unstubAllEnvs();
});

function renderOrder(order: Partial<BankTransferOrder> = {}, asSeller = false) {
  const seeded = fixtures.awaitingPaymentOrder(order);
  handlers.seedMockOrder(seeded);
  if (asSeller) handlers.seedMockSeller(fixtures.verifiedSeller("GTBank", "0123456789"));
  const store = configureStore({
    reducer: { [baseApi.reducerPath]: baseApi.reducer },
    middleware: (gdm) => gdm().concat(baseApi.middleware),
  });
  return render(
    <Provider store={store}>
      <SnackbarProvider>
        <MemoryRouter>
          <View orderId={seeded._id} />
        </MemoryRouter>
      </SnackbarProvider>
    </Provider>
  );
}

describe("BankTransferOrderView, buyer", () => {
  it("shows the account to pay into, then moves on once the transfer lands", async () => {
    // Pending on the first check, paid on the next (one 5-second poll later).
    handlers.setMockPollsUntilPaid(1);
    renderOrder();

    expect(await screen.findByRole("heading", { name: "Order details" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Show account details" }));

    expect(await screen.findByText("9912345678")).toBeTruthy();
    // The exact amount, kobo included, and a copy button that copies digits only.
    expect(screen.getAllByText("₦14,750.50").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Copy amount" })).toBeTruthy();

    expect(await screen.findByText(/Waiting for your transfer/)).toBeTruthy();

    // The next check reports it paid; the order refreshes and the payment panel goes.
    expect(await screen.findByText(/Waiting for the seller to accept/, undefined, { timeout: 8000 })).toBeTruthy();
    expect(screen.queryByText("9912345678")).toBeNull();
  }, 15_000);

  it("refuses to show payment details that don't match the order", async () => {
    server.use(
      http.post(`${API}/payments/fiat/initialize`, () =>
        HttpResponse.json(
          {
            status: "success",
            data: {
              ...fixtures.paymentInstructions(fixtures.awaitingPaymentOrder()),
              amount: 99999,
            },
          },
          { status: 201 }
        )
      )
    );
    renderOrder();
    fireEvent.click(await screen.findByRole("button", { name: "Show account details" }));

    expect(await screen.findByText("Don't send money yet")).toBeTruthy();
    expect(screen.queryByText("9912345678")).toBeNull();
  });

  it("stops offering payment once the time to pay has passed", async () => {
    renderOrder({ expiresAt: new Date(Date.now() - 60_000).toISOString() });

    expect(await screen.findByText("The time to pay has passed")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Show account details" })).toBeNull();
  });

  it("asks once more before releasing the money, then completes the order", async () => {
    renderOrder({ status: "delivered" });

    fireEvent.click(await screen.findByRole("button", { name: "I have my order" }));
    const box = screen.getByRole("group", { name: "Do you have your order?" });
    expect(within(box).getByText(/can't undo it/)).toBeTruthy();
    fireEvent.click(within(box).getByRole("button", { name: "Yes, I have it" }));

    expect(await screen.findByText("Order complete. Thanks for shopping.")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "I have my order" })).toBeNull();
  });
});

describe("BankTransferOrderView, refunds", () => {
  it("takes the buyer's bank account for a refund once the bank confirms the name", async () => {
    renderOrder({ status: "cancelled", refund: { status: "awaiting_account", amount: 14750.5 } });

    expect(await screen.findByRole("heading", { name: "Where should we send your refund?" })).toBeTruthy();
    const bank = screen.getByRole("combobox", { name: /^Bank/ });
    await waitFor(() => expect(bank).toBeEnabled());
    fireEvent.change(bank, { target: { value: "gtb" } });
    fireEvent.mouseDown(await screen.findByRole("option", { name: "GTBank" }));
    fireEvent.change(screen.getByLabelText(/^Account number/), { target: { value: "0123456789" } });
    expect(await screen.findByText("ADA CHIOMA OBI")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Send my refund here" }));

    expect(await screen.findByText("Your refund of ₦14,750.50 is being sent to your bank.")).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "Where should we send your refund?" })).toBeNull();
  });

  it("doesn't ask for an account when no refund is waiting on one", async () => {
    renderOrder({ status: "cancelled", refund: { status: "processing", amount: 14750.5 } });

    expect(await screen.findByText(/is being sent to your bank/)).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "Where should we send your refund?" })).toBeNull();
  });
});

describe("BankTransferOrderView, focus and failures", () => {
  it("puts focus back on the button that opened a confirm box when it closes", async () => {
    renderOrder({ status: "delivered" });

    fireEvent.click(await screen.findByRole("button", { name: "I have my order" }));
    fireEvent.click(screen.getByRole("button", { name: "Not yet" }));

    expect(document.activeElement).toBe(screen.getByRole("button", { name: "I have my order" }));
  });

  it("shows an error instead of guessing the viewer's role when the shop lookup fails", async () => {
    server.use(http.get(`${API}/vendors/me`, () => HttpResponse.json({ message: "down" }, { status: 500 })));
    renderOrder({ status: "paid" }, true);

    expect(await screen.findByText("We couldn't load this order")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Cancel order" })).toBeNull();
  });
});

describe("BankTransferOrderView, seller", () => {
  it("accepts a paid order and offers the next step", async () => {
    renderOrder({ status: "paid" }, true);

    expect(await screen.findByRole("heading", { name: "Sale details" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Accept order" }));

    expect(await screen.findByRole("button", { name: "Mark as ready" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Accept order" })).toBeNull();
  });

  it("won't decline an order without a reason for the buyer", async () => {
    renderOrder({ status: "paid" }, true);

    fireEvent.click(await screen.findByRole("button", { name: "Decline" }));
    fireEvent.click(screen.getByRole("button", { name: "Yes, decline order" }));

    expect(await screen.findByText("Tell the buyer why you're declining")).toBeTruthy();
    fireEvent.change(screen.getByLabelText(/Reason for the buyer/), { target: { value: "Out of stock" } });
    fireEvent.click(screen.getByRole("button", { name: "Yes, decline order" }));

    expect(await screen.findByText("You declined this order")).toBeTruthy();
  });

  it("goes from ready straight to collected for a pickup order", async () => {
    renderOrder({ status: "ready", fulfilment: "pickup" }, true);

    expect(await screen.findByRole("button", { name: "Mark as collected" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Mark as on the way" })).toBeNull();
  });
});
