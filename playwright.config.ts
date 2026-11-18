import { defineConfig, devices } from "@playwright/test";

/**
 * Browser tests of the money paths against the mock backend (`npm run
 * dev:mock`), so they run anywhere without a real server or bank. Run with
 * `npm run test:e2e`. Locally they use the installed Chrome; CI installs
 * Playwright's own Chromium first.
 */
const PORT = 5175;

export default defineConfig({
  testDir: "./e2e",
  // `.e2e.ts`, so Vitest's `*.test.ts` / `*.spec.ts` pattern never picks these up.
  testMatch: "**/*.e2e.ts",
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "phone",
      use: { ...devices["Pixel 7"], channel: process.env.CI ? undefined : "chrome" },
    },
  ],
  webServer: {
    command: `npm run dev:mock -- --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
