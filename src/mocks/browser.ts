import { setupWorker } from "msw/browser";
import {
  createHandlers,
  resetMockState,
  restoreMockState,
  seedMockListing,
  seedMockOrder,
  seedMockSeller,
  setMockPollsUntilPaid,
  snapshotMockState,
  type MockSnapshot,
} from "./handlers";
import { MOCK_USER_ID, awaitingPaymentOrder, bankListing, user, verifiedSeller } from "./fixtures";

const STATE_KEY = "dezen-mock-state";

/** Test hooks for end-to-end runs; only ever defined in the "mock" build mode. */
export interface MockControls {
  /** A bank-transfer order with the fixture's defaults, changed by `overrides`. */
  seedOrder: (overrides?: Parameters<typeof awaitingPaymentOrder>[0]) => void;
  /** Make the signed-in user a seller whose shop matches the fixture orders. */
  seedSeller: () => void;
  setPollsUntilPaid: (polls: number) => void;
  /** Make the fixture listing belong to the signed-in user, so it can be edited. */
  ownListing: () => void;
  reset: () => void;
}

declare global {
  interface Window {
    __dezenMock?: MockControls;
  }
}

function persist() {
  try {
    sessionStorage.setItem(STATE_KEY, JSON.stringify(snapshotMockState()));
  } catch {
    // Storage full or blocked: the mock still works, it just forgets on reload.
  }
}

/**
 * `npm run dev:mock`: run the app against the mock backend in the browser.
 * Loaded only in the "mock" build mode (see main.tsx), never in production.
 * Unmocked requests (prices, fonts, wallets) go to the network as normal.
 * Its state lives in sessionStorage, so a reload keeps orders as a server would.
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

  try {
    const saved = sessionStorage.getItem(STATE_KEY);
    if (saved) restoreMockState(JSON.parse(saved) as MockSnapshot);
  } catch {
    // A corrupt snapshot starts the mock afresh.
  }

  window.__dezenMock = {
    seedOrder: (overrides) => {
      seedMockOrder(awaitingPaymentOrder(overrides));
      persist();
    },
    seedSeller: () => {
      seedMockSeller(verifiedSeller("GTBank", "0123456789"));
      persist();
    },
    setPollsUntilPaid: (polls) => {
      setMockPollsUntilPaid(polls);
      persist();
    },
    ownListing: () => {
      seedMockListing(bankListing({ seller: { _id: MOCK_USER_ID, name: user.name, rating: 0, profileImage: "" } }));
      persist();
    },
    reset: () => {
      resetMockState();
      persist();
    },
  };

  const worker = setupWorker(...createHandlers(import.meta.env.VITE_API_URL));
  // Save after every mocked reply, since replies are what change the store.
  worker.events.on("response:mocked", persist);
  await worker.start({ onUnhandledRequest: "bypass", quiet: true });
}
