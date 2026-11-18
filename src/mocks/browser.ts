import { setupWorker } from "msw/browser";
import { createHandlers } from "./handlers";
import { MOCK_USER_ID, user } from "./fixtures";

/**
 * `npm run dev:mock`: run the app against the mock backend in the browser.
 * Loaded only in the "mock" build mode (see main.tsx), never in production.
 * Unmocked requests (prices, fonts, wallets) go to the network as normal.
 */
export async function startMockBackend() {
  // Sign in as the fixture user so account screens are reachable. The token is
  // unsigned; only the mock backend ever sees it.
  if (!localStorage.getItem("auth_token")) {
    const b64 = (o: object) =>
      btoa(JSON.stringify(o)).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
    const exp = Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60;
    localStorage.setItem("auth_token", `${b64({ alg: "none", typ: "JWT" })}.${b64({ id: MOCK_USER_ID, exp })}.mock`);
    localStorage.setItem("auth_user", JSON.stringify(user));
  }

  const worker = setupWorker(...createHandlers(import.meta.env.VITE_API_URL));
  await worker.start({ onUnhandledRequest: "bypass", quiet: true });
}
