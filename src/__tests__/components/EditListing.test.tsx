import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Provider } from "react-redux";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { configureStore } from "@reduxjs/toolkit";
import { setupServer } from "msw/node";

// Editing a listing against the shared mock backend: what a naira listing can
// change, what a wallet listing can't, and who may edit at all.

const API = "https://api.mock.local/api/v1";
const OWNER = { _id: "65fa0c2e9b1d4a0012340000", name: "Ada Obi", rating: 0, profileImage: "" };

vi.mock("../../context/AuthContext", () => ({
  useAuth: () => ({ user: { _id: "65fa0c2e9b1d4a0012340000" }, isAuthenticated: true }),
}));

let server: ReturnType<typeof setupServer>;
let baseApi: typeof import("../../store/api/baseApi").baseApi;
let EditListing: typeof import("../../pages/EditListing").default;
let SnackbarProvider: typeof import("../../context/SnackbarContext").SnackbarProvider;
let handlers: typeof import("../../mocks/handlers");
let fixtures: typeof import("../../mocks/fixtures");

/** Every PUT /products/{id} body the server saw, as plain fields. */
let saves: Record<string, string>[] = [];

beforeAll(async () => {
  vi.stubEnv("VITE_API_URL", API);
  vi.stubEnv("VITE_ENABLE_BANK_TRANSFER", "true");
  handlers = await import("../../mocks/handlers");
  fixtures = await import("../../mocks/fixtures");
  server = setupServer(...handlers.createHandlers(API));
  server.listen({ onUnhandledRequest: "bypass" });
  server.events.on("request:start", async ({ request }) => {
    if (request.method === "PUT") {
      const form = await request.clone().formData();
      saves.push(Object.fromEntries([...form.entries()].map(([k, v]) => [k, String(v)])));
    }
  });
  ({ baseApi } = await import("../../store/api/baseApi"));
  ({ default: EditListing } = await import("../../pages/EditListing"));
  ({ SnackbarProvider } = await import("../../context/SnackbarContext"));
});

afterEach(() => {
  handlers.resetMockState();
  saves = [];
});

afterAll(() => {
  server.close();
  vi.unstubAllEnvs();
});

function renderEdit() {
  const store = configureStore({
    reducer: { [baseApi.reducerPath]: baseApi.reducer },
    middleware: (gdm) => gdm().concat(baseApi.middleware),
  });
  return render(
    <Provider store={store}>
      <SnackbarProvider>
        <MemoryRouter initialEntries={[`/product/${fixtures.MOCK_PRODUCT_ID}/edit`]}>
          <Routes>
            <Route path="/product/:productId/edit" element={<EditListing />} />
            <Route path="/product/:productId" element={<p>Product page</p>} />
          </Routes>
        </MemoryRouter>
      </SnackbarProvider>
    </Provider>
  );
}

describe("EditListing", () => {
  it("saves a naira listing's new price, stock and visibility", async () => {
    handlers.seedMockListing(fixtures.bankListing({ seller: OWNER }));
    renderEdit();

    const price = await screen.findByLabelText(/^Price/);
    expect(price).toHaveValue("12500.5");
    fireEvent.change(price, { target: { value: "15,000" } });
    fireEvent.change(screen.getByLabelText(/^Stock/), { target: { value: "3" } });
    fireEvent.click(screen.getByRole("checkbox", { name: /Show this listing to buyers/ }));
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    expect(await screen.findByText("Product page")).toBeTruthy();
    expect(saves).toHaveLength(1);
    expect(saves[0]).toMatchObject({
      name: "Ankara tote bag",
      price: "15000",
      stock: "3",
      isActive: "false",
      fulfilment: JSON.stringify(["delivery", "pickup"]),
    });
  });

  it("explains a bad price instead of saving", async () => {
    handlers.seedMockListing(fixtures.bankListing({ seller: OWNER }));
    renderEdit();

    fireEvent.change(await screen.findByLabelText(/^Price/), { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    expect(await screen.findByText("Enter a price in naira, like 25,000")).toBeTruthy();
    expect(saves).toHaveLength(0);
  });

  it("never offers or sends price and stock for a wallet listing", async () => {
    handlers.seedMockListing(fixtures.bankListing({ seller: OWNER, acceptedPayments: [], paymentToken: "USDm" }));
    renderEdit();

    expect(await screen.findByText(/fixed once it's listed/)).toBeTruthy();
    expect(screen.queryByLabelText(/^Price/)).toBeNull();
    fireEvent.change(screen.getByLabelText(/^Name/), { target: { value: "Ankara tote bag (large)" } });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    expect(await screen.findByText("Product page")).toBeTruthy();
    expect(saves[0]).toMatchObject({ name: "Ankara tote bag (large)" });
    expect(saves[0]).not.toHaveProperty("price");
    expect(saves[0]).not.toHaveProperty("stock");
  });

  it("refuses to edit someone else's listing", async () => {
    renderEdit();

    expect(await screen.findByText("You can only edit listings you created.")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Save changes" })).toBeNull();
  });
});
