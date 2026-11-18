import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";

// The bank-transfer release switch: with VITE_ENABLE_BANK_TRANSFER unset (as in
// production today) sellers must not see the payout entry point at all.

vi.mock("../../context/AuthContext", () => ({ useAuth: () => ({ logout: vi.fn() }) }));

async function renderSettings() {
  vi.resetModules();
  const { default: Settings } = await import("../../components/account/settings/Settings");
  render(
    <MemoryRouter>
      <Settings setViewState={vi.fn()} />
    </MemoryRouter>
  );
}

afterEach(() => vi.unstubAllEnvs());

describe("bank transfer release switch", () => {
  it("hides the payout account entry when the flag is unset", async () => {
    vi.stubEnv("VITE_ENABLE_BANK_TRANSFER", "");
    await renderSettings();
    expect(screen.getByText("Delivery Addresses")).toBeInTheDocument();
    expect(screen.queryByText("Bank Account for Payouts")).not.toBeInTheDocument();
  });

  it("stays off for anything but the exact value \"true\"", async () => {
    vi.stubEnv("VITE_ENABLE_BANK_TRANSFER", "yes");
    await renderSettings();
    expect(screen.queryByText("Bank Account for Payouts")).not.toBeInTheDocument();
  });

  it("shows it when the flag is \"true\"", async () => {
    vi.stubEnv("VITE_ENABLE_BANK_TRANSFER", "true");
    await renderSettings();
    expect(screen.getByText("Bank Account for Payouts")).toBeInTheDocument();
  });
});
