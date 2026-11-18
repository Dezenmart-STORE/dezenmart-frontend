import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { setupServer } from "msw/node";
import { http, HttpResponse, delay } from "msw";

// The payout form against the shared mock backend, with one lookup made slow
// on purpose: a late reply for an old account number must not replace the
// result for the number the seller is looking at now.

const API = "https://api.mock.local/api/v1";
const SLOW_NUMBER = "1111111111";
const FAST_NUMBER = "2222222222";

let server: ReturnType<typeof setupServer>;
let baseApi: typeof import("../../store/api/baseApi").baseApi;
let PayoutAccountForm: typeof import("../../components/account/payout/PayoutAccountForm").default;
let SnackbarProvider: typeof import("../../context/SnackbarContext").SnackbarProvider;
let resetMockState: () => void;

beforeAll(async () => {
  vi.stubEnv("VITE_API_URL", API);
  const handlers = await import("../../mocks/handlers");
  resetMockState = handlers.resetMockState;
  server = setupServer(...handlers.createHandlers(API));
  server.listen({ onUnhandledRequest: "bypass" });
  ({ baseApi } = await import("../../store/api/baseApi"));
  ({ default: PayoutAccountForm } = await import("../../components/account/payout/PayoutAccountForm"));
  ({ SnackbarProvider } = await import("../../context/SnackbarContext"));
});

afterEach(() => {
  server.resetHandlers();
  resetMockState();
});

afterAll(() => {
  server.close();
  vi.unstubAllEnvs();
});

function renderForm() {
  const store = configureStore({
    reducer: { [baseApi.reducerPath]: baseApi.reducer },
    middleware: (gdm) => gdm().concat(baseApi.middleware),
  });
  return render(
    <Provider store={store}>
      <SnackbarProvider>
        <PayoutAccountForm />
      </SnackbarProvider>
    </Provider>
  );
}

describe("PayoutAccountForm", () => {
  it("shows the bank's name for the account and only then allows saving", async () => {
    renderForm();
    const bank = await screen.findByLabelText(/^Bank/);
    await waitFor(() => expect(screen.getByRole("option", { name: "GTBank" })).toBeInTheDocument());
    fireEvent.change(bank, { target: { value: "058" } });

    const save = screen.getByRole("button", { name: /save bank account/i });
    expect(save).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/^Account number/), { target: { value: "0123-456-789" } });

    expect(await screen.findByText("ADA CHIOMA OBI")).toBeInTheDocument();
    expect(screen.getByLabelText(/^Account number/)).toHaveValue("0123456789");
    expect(save).toBeEnabled();
  });

  it("ignores a late reply for an account number the seller has already changed", async () => {
    server.use(
      http.post(`${API}/vendors/banks/resolve`, async ({ request }) => {
        const { accountNumber } = (await request.json()) as { accountNumber: string };
        if (accountNumber === SLOW_NUMBER) {
          await delay(150);
          return HttpResponse.json({ status: "success", data: { accountName: "OLD NAME" } });
        }
        return HttpResponse.json({ status: "success", data: { accountName: "NEW NAME" } });
      })
    );
    renderForm();
    const bank = await screen.findByLabelText(/^Bank/);
    await waitFor(() => expect(screen.getByRole("option", { name: "GTBank" })).toBeInTheDocument());
    fireEvent.change(bank, { target: { value: "058" } });

    const number = screen.getByLabelText(/^Account number/);
    fireEvent.change(number, { target: { value: SLOW_NUMBER } });
    fireEvent.change(number, { target: { value: FAST_NUMBER } });

    expect(await screen.findByText("NEW NAME")).toBeInTheDocument();
    // Give the slow reply time to land; it must change nothing.
    await new Promise((r) => setTimeout(r, 250));
    expect(screen.queryByText("OLD NAME")).not.toBeInTheDocument();
    expect(screen.getByText("NEW NAME")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /save bank account/i })).toBeEnabled();
  });

  it("says plainly when the bank can't find the account", async () => {
    renderForm();
    const bank = await screen.findByLabelText(/^Bank/);
    await waitFor(() => expect(screen.getByRole("option", { name: "GTBank" })).toBeInTheDocument());
    fireEvent.change(bank, { target: { value: "058" } });
    fireEvent.change(screen.getByLabelText(/^Account number/), { target: { value: "0000000000" } });

    expect(await screen.findByText(/couldn't find this account/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /save bank account/i })).toBeDisabled();
  });
});
