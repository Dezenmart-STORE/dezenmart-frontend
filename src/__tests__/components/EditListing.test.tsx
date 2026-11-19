import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Provider } from "react-redux";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { configureStore } from "@reduxjs/toolkit";
import { setupServer } from "msw/node";
import { File as NodeFile } from "node:buffer";

// Editing a listing against the shared mock backend: what a naira listing can
// change, what a wallet listing can't, and who may edit at all.

const API = "https://api.mock.local/api/v1";
const OWNER = { _id: "65fa0c2e9b1d4a0012340000", name: "Ada Obi", rating: 0, profileImage: "" };

vi.mock("../../context/AuthContext", () => ({
  useAuth: () => ({ user: { _id: "65fa0c2e9b1d4a0012340000" }, isAuthenticated: true }),
}));

// jsdom has no object URLs; the photo previews only need a string.
URL.createObjectURL = vi.fn(() => "blob:preview");
URL.revokeObjectURL = vi.fn();

let server: ReturnType<typeof setupServer>;
let baseApi: typeof import("../../store/api/baseApi").baseApi;
let EditListing: typeof import("../../pages/EditListing").default;
let SnackbarProvider: typeof import("../../context/SnackbarContext").SnackbarProvider;
let handlers: typeof import("../../mocks/handlers");
let fixtures: typeof import("../../mocks/fixtures");

/** Every PUT /products/{id} body the server saw, as plain fields. */
let saves: Record<string, string>[] = [];
/** How many photos each save carried. */
let photosSent: number[] = [];

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
      photosSent.push(form.getAll("images").length);
      saves.push(Object.fromEntries([...form.entries()].filter(([k]) => k !== "images").map(([k, v]) => [k, String(v)])));
    }
  });
  ({ baseApi } = await import("../../store/api/baseApi"));
  ({ default: EditListing } = await import("../../pages/EditListing"));
  ({ SnackbarProvider } = await import("../../context/SnackbarContext"));
});

afterEach(() => {
  handlers.resetMockState();
  saves = [];
  photosSent = [];
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

  it("lets a listing with options change its total stock", async () => {
    handlers.seedMockListing(fixtures.bankListing({ seller: OWNER, type: [{ size: "S", quantity: 4 }, { size: "L", quantity: 6 }] }));
    renderEdit();

    const stock = await screen.findByLabelText(/^Stock/);
    expect(screen.getByText(/across all options/)).toBeTruthy();
    fireEvent.change(stock, { target: { value: "12" } });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    expect(await screen.findByText("Product page")).toBeTruthy();
    expect(saves[0]).toMatchObject({ stock: "12" });
  });

  it("sends new photos only when the seller replaces them", async () => {
    handlers.seedMockListing(fixtures.bankListing({ seller: OWNER }));
    renderEdit();

    expect(await screen.findByAltText("Current photo 1")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Replace photos" }));
    const input = document.querySelector<HTMLInputElement>('input[type="file"]');
    if (!input) throw new Error("no file input");
    // Node's own File: the request goes out through Node's fetch, which can't send jsdom's.
    const photo = new NodeFile(["x"], "tote-front.jpg", { type: "image/jpeg" }) as unknown as File;
    fireEvent.change(input, { target: { files: [photo] } });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    expect(await screen.findByText("Product page")).toBeTruthy();
    expect(photosSent).toEqual([1]);
  });

  it("won't save an empty photo replacement, and keeps the photos when asked", async () => {
    handlers.seedMockListing(fixtures.bankListing({ seller: OWNER }));
    renderEdit();

    fireEvent.click(await screen.findByRole("button", { name: "Replace photos" }));
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    expect(await screen.findByText("Add at least one photo, or keep the current ones.")).toBeTruthy();
    expect(saves).toHaveLength(0);

    fireEvent.click(screen.getByRole("button", { name: "Keep the current photos" }));
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    expect(await screen.findByText("Product page")).toBeTruthy();
    expect(photosSent).toEqual([0]);
  });

  it("asks for a name the server will accept", async () => {
    handlers.seedMockListing(fixtures.bankListing({ seller: OWNER }));
    renderEdit();

    fireEvent.change(await screen.findByLabelText(/^Name/), { target: { value: "Ab" } });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    expect(await screen.findByText("Give it a name of at least 3 characters")).toBeTruthy();
    expect(saves).toHaveLength(0);
  });

  it("refuses to edit someone else's listing", async () => {
    renderEdit();

    expect(await screen.findByText("You can only edit listings you created.")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Save changes" })).toBeNull();
  });
});
