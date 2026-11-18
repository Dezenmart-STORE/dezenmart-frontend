import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { setupServer } from "msw/node";

// The address picker on a product page, for a visitor who is and isn't signed in.

const API = "https://api.mock.local/api/v1";

const auth = { isAuthenticated: false };
vi.mock("../../context/AuthContext", () => ({
  useAuth: () => ({ user: auth.isAuthenticated ? { _id: "u1" } : null, isAuthenticated: auth.isAuthenticated }),
}));

let server: ReturnType<typeof setupServer>;
let baseApi: typeof import("../../store/api/baseApi").baseApi;
let DeliveryAddressSelector: typeof import("../../components/product/singleProduct/DeliveryAddressSelector").default;

/** Every delivery-address request the server saw. */
let addressRequests = 0;

beforeAll(async () => {
  vi.stubEnv("VITE_API_URL", API);
  const handlers = await import("../../mocks/handlers");
  server = setupServer(...handlers.createHandlers(API));
  server.listen({ onUnhandledRequest: "bypass" });
  server.events.on("request:start", ({ request }) => {
    if (new URL(request.url).pathname.endsWith("/delivery-addresses")) addressRequests += 1;
  });
  ({ baseApi } = await import("../../store/api/baseApi"));
  ({ default: DeliveryAddressSelector } = await import(
    "../../components/product/singleProduct/DeliveryAddressSelector"
  ));
});

afterEach(() => {
  addressRequests = 0;
});

afterAll(() => {
  server.close();
  vi.unstubAllEnvs();
});

function renderSelector() {
  const store = configureStore({
    reducer: { [baseApi.reducerPath]: baseApi.reducer },
    middleware: (gdm) => gdm().concat(baseApi.middleware),
  });
  const onAddressSelect = vi.fn();
  render(
    <Provider store={store}>
      <DeliveryAddressSelector selectedAddress={null} onAddressSelect={onAddressSelect} />
    </Provider>
  );
  return { onAddressSelect };
}

describe("DeliveryAddressSelector", () => {
  it("asks a signed-out visitor to sign in instead of showing a load error", async () => {
    auth.isAuthenticated = false;
    renderSelector();

    expect(screen.getByText("Sign in to choose where we deliver.")).toBeTruthy();
    // Give a stray request time to start before checking none went out.
    await new Promise((r) => setTimeout(r, 50));
    expect(addressRequests).toBe(0);
    expect(screen.queryByText("Couldn't load your addresses")).toBeNull();
  });

  it("loads and picks the saved address once signed in", async () => {
    auth.isAuthenticated = true;
    const { onAddressSelect } = renderSelector();

    await waitFor(() => expect(onAddressSelect).toHaveBeenCalledTimes(1));
    expect((await screen.findAllByText(/Ikeja/)).length).toBeGreaterThan(0);
    expect(addressRequests).toBe(1);
  });
});
