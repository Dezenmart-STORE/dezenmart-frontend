import { test, expect, type Page } from "@playwright/test";

// The bank-transfer money paths in a real browser, against the mock backend
// that `npm run dev:mock` runs in a service worker. Each test starts from an
// empty mock store and seeds only what it needs.

const PRODUCT_ID = "65fa0c2e9b1d4a00aaaaaaaa";
const ORDER_ID = "65fa0c2e9b1d4a0012345678";

type Seed = (mock: NonNullable<Window["__dezenMock"]>) => void;

/** Open the app with a fresh mock store, seed it, then go to `path`. */
async function start(page: Page, path: string, seed?: Seed) {
  // Skip the first-visit tour so it never covers what the test clicks.
  await page.addInitScript(() => localStorage.setItem("dezenmart_walkthrough_completed", "true"));
  await page.goto("/");
  await page.waitForFunction(() => Boolean(window.__dezenMock));
  await page.evaluate(() => window.__dezenMock?.reset());
  // The seed runs in the page, where the mock's controls live.
  if (seed) await page.evaluate(`(${seed.toString()})(window.__dezenMock)`);
  await page.goto(path);
}

test("a buyer orders a naira listing, pays by transfer and sees it confirmed", async ({ page }) => {
  await start(page, `/product/${PRODUCT_ID}`, (mock) => mock.setPollsUntilPaid(1));

  await expect(page.getByRole("heading", { name: "Ankara tote bag" })).toBeVisible();
  await expect(page.getByText("₦12,500.50").first()).toBeVisible();

  await page.getByRole("button", { name: /Swift Riders/ }).click();
  await page.getByRole("button", { name: "Place order" }).click();

  await expect(page).toHaveURL(new RegExp(`/orders/${ORDER_ID}$`));
  await expect(page.getByRole("heading", { name: "Order details" })).toBeVisible();

  await page.getByRole("button", { name: "Show account details" }).click();
  await expect(page.getByText("9912345678")).toBeVisible();
  await expect(page.getByRole("button", { name: "Copy amount" })).toBeVisible();

  // The mock reports the transfer on its second status check, one poll later.
  await expect(page.getByText(/Waiting for the seller to accept/)).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText("9912345678")).toBeHidden();
});

test("a reload keeps the order and its payment details", async ({ page }) => {
  await start(page, `/orders/${ORDER_ID}`, (mock) => mock.seedOrder());

  await page.getByRole("button", { name: "Show account details" }).click();
  await expect(page.getByText("9912345678")).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: "Order details" })).toBeVisible();
  await page.getByRole("button", { name: "Show account details" }).click();
  await expect(page.getByText("9912345678")).toBeVisible();
});

test("a buyer confirms delivery after being asked once more", async ({ page }) => {
  await start(page, `/orders/${ORDER_ID}`, (mock) => mock.seedOrder({ status: "delivered" }));

  await page.getByRole("button", { name: "I have my order" }).click();
  await expect(page.getByText(/can't undo it/)).toBeVisible();
  await page.getByRole("button", { name: "Yes, I have it" }).click();

  await expect(page.getByText("Order complete. Thanks for shopping.")).toBeVisible();
});

test("a seller takes a paid order from accepted to delivered", async ({ page }) => {
  await start(page, `/orders/${ORDER_ID}`, (mock) => {
    mock.seedSeller();
    mock.seedOrder({ status: "paid" });
  });

  await expect(page.getByRole("heading", { name: "Sale details" })).toBeVisible();
  await page.getByRole("button", { name: "Accept order" }).click();
  await page.getByRole("button", { name: "Mark as ready" }).click();
  await page.getByRole("button", { name: "Mark as on the way" }).click();
  await page.getByRole("button", { name: "Mark as delivered" }).click();

  await expect(page.getByText("You'll be paid when the buyer confirms they have it.")).toBeVisible();
});

test("a seller finds a new paid order in Order History", async ({ page }) => {
  await start(page, "/account?tab=3&orders=sales", (mock) => {
    mock.seedSeller();
    mock.seedOrder({ status: "paid" });
  });

  const row = page.getByRole("button", { name: /Ankara tote bag/ });
  await expect(row.getByText("Needs your action")).toBeVisible();
  await row.click();
  await expect(page).toHaveURL(new RegExp(`/orders/${ORDER_ID}$`));
});

test("a buyer gives a bank account for a refund", async ({ page }) => {
  await start(page, `/orders/${ORDER_ID}`, (mock) =>
    mock.seedOrder({ status: "cancelled", refund: { status: "awaiting_account", amount: 14750.5 } })
  );

  await expect(page.getByRole("heading", { name: "Where should we send your refund?" })).toBeVisible();
  await page.getByLabel(/^Bank/).selectOption({ label: "GTBank" });
  await page.getByLabel(/^Account number/).fill("0123456789");
  await expect(page.getByText("ADA CHIOMA OBI")).toBeVisible();
  await page.getByRole("button", { name: "Send my refund here" }).click();

  await expect(page.getByText("Your refund of ₦14,750.50 is being sent to your bank.")).toBeVisible();
});

test("a seller edits a naira listing's price from its product page", async ({ page }) => {
  await start(page, `/product/${PRODUCT_ID}`, (mock) => mock.ownListing());

  await page.getByRole("link", { name: "Edit listing" }).click();
  await expect(page.getByRole("heading", { name: "Edit listing" })).toBeVisible();
  await page.getByLabel(/^Price/).fill("15,000");
  await page.getByRole("button", { name: "Save changes" }).click();

  await expect(page).toHaveURL(new RegExp(`/product/${PRODUCT_ID}$`));
  await expect(page.getByText("₦15,000.00").first()).toBeVisible();
});
