import { lazy, StrictMode, Suspense, useEffect, useState } from "react";
import "./index.css";
import {
  createBrowserRouter,
  Outlet,
  RouterProvider,
} from "react-router-dom";
import { createRoot } from "react-dom/client";
import { Configuration } from "@react-md/layout";
import Layout from "./components/layout/Layout.tsx";
import Loadscreen from "./pages/Loadscreen.tsx";
import { AuthProvider } from "./context/AuthContext.tsx";
import AuthCallback from "./pages/AuthCallback.tsx";
import ProtectedRoute from "./components/auth/ProtectedRoute.tsx";
import { SnackbarProvider } from "./context/SnackbarContext.tsx";
import { Provider } from "react-redux";
import { store } from "./store/store.ts";
import ErrorBoundary from "./components/error/ErrorBoundary.tsx";
import { setupGlobalErrorHandling } from "./utils/errorHandling";
import ReferralHandler from "./components/referrals/ReferralHandler.tsx";
import { CurrencyProvider } from "./context/CurrencyContext.tsx";
import SmartWalletProvider from "./components/wallet/smart/SmartWalletProvider.tsx";
import { SmartWalletContextProvider } from "./context/SmartWalletContext.tsx";
import { TermsProvider } from "./context/TermsContext.tsx";
import { WalkthroughProvider } from "./context/WalkthroughContext.tsx";
import Walkthrough from "./components/walkthrough/Walkthrough.tsx";
import { initSentry, captureError } from "./utils/sentry.config.ts";
import { registerErrorReporter } from "./utils/errors.ts";
import {
  initPerformanceMonitoring,
  monitorResourceTiming,
} from "./utils/performance.ts";
import { registerServiceWorker, triggerSWUpdate } from "./utils/pwa/index.ts";
import { initDebugTools } from "./utils/debug/index.ts";
import "./utils/dev/injectAuth.ts";
import { RampProvider } from "./components/rampp/RampContext.tsx";
import { FloatingRampButton } from "./components/rampp/FloatingRampButton.tsx";
import { RampModal } from "./components/rampp/RampModal.tsx";
import { RampMinimalProvider } from "./components/ramp/USAGE_EXAMPLE.tsx";
import { PAYMENTS_ENABLED } from "./config/features";

// ── Startup: version-based stale cache cleanup ──────────────────────────────
// When a new version is deployed, clear data that may be stale or reference
// old API shapes. RTK Query cache is in-memory (cleared on reload automatically).
// We only need to clear offline-sync queued requests from the previous build.
const APP_VERSION = import.meta.env.VITE_APP_VERSION as string | undefined;
const VERSION_STORE_KEY = "_app_build_v";

if (APP_VERSION) {
  const storedVersion = localStorage.getItem(VERSION_STORE_KEY);
  if (storedVersion && storedVersion !== APP_VERSION) {
    // New deployment detected - clear potentially stale offline queue
    localStorage.removeItem("pwa-sync-queue");
    // Reset the chunk-reload cooldown so the fresh build can reload if needed
    sessionStorage.removeItem("_chunk_reload_at");
  }
  localStorage.setItem(VERSION_STORE_KEY, APP_VERSION);
}

// ── Global fallback: catch chunk errors outside the React error boundary ────
// Covers dynamic imports that happen in event handlers, effects, etc.
const CHUNK_RELOAD_KEY = "_chunk_reload_at";
const RELOAD_COOLDOWN = 30_000;

function isChunkMessage(msg: string): boolean {
  return (
    msg.includes("Failed to fetch dynamically imported module") ||
    msg.includes("error loading dynamically imported module") ||
    msg.includes("Loading chunk") ||
    msg.includes("Importing a module script failed") ||
    msg.includes("Unable to preload CSS")
  );
}

window.addEventListener("unhandledrejection", (event: PromiseRejectionEvent) => {
  const err = event.reason as Error | undefined;
  if (!err) return;
  const isChunk =
    err.name === "ChunkLoadError" || isChunkMessage(err.message ?? "");
  if (isChunk) {
    event.preventDefault();
    const last = sessionStorage.getItem(CHUNK_RELOAD_KEY);
    const now = Date.now();
    if (!last || now - Number(last) > RELOAD_COOLDOWN) {
      sessionStorage.setItem(CHUNK_RELOAD_KEY, String(now));
      window.location.reload();
    }
  }
});

// Initialize Sentry error tracking
initSentry();
registerErrorReporter((error, context, parsed) =>
  captureError(error, { context, ...parsed })
);

// Initialize debug tools (available via browser console)
initDebugTools();

// Initialize performance monitoring
if (import.meta.env.PROD) {
  initPerformanceMonitoring();
  monitorResourceTiming();
}

// Register service worker for PWA functionality
registerServiceWorker({
  onNeedRefresh: () => {
    // Handled by pwa:update-ready event in the App component
  },
  onOfflineReady: () => {
    console.log("[PWA] App ready to work offline");
  },
});

const Login = lazy(() => import("./pages/Login.tsx"));
const Home = lazy(() => import("./pages/Home.tsx"));
const Product = lazy(() => import("./pages/Product.tsx"));
const SingleProduct = lazy(() => import("./pages/SingleProduct.tsx"));
const Account = lazy(() => import("./pages/Account.tsx"));
const ViewOrderDetail = lazy(() => import("./pages/ViewOrderDetail.tsx"));
const ComingSoon = lazy(() => import("./pages/ComingSoon.tsx"));
const Notifications = lazy(() => import("./pages/Notifications.tsx"));
const Community = lazy(() => import("./pages/Community.tsx"));
const ReferralLanding = lazy(() => import("./pages/ReferralLanding.tsx"));
const Chat = lazy(() => import("./pages/Chat.tsx"));
const ChatDetail = lazy(() => import("./pages/ChatDetail.tsx"));
const Offline = lazy(() => import("./pages/Offline.tsx"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));
const BuyCheckout = lazy(() => import("./pages/BuyCheckout.tsx"));
const SellCheckout = lazy(() => import("./pages/SellCheckout.tsx"));
const ViewTrade = lazy(() => import("./pages/Trade.tsx"));
const ViewTradeDetail = lazy(() => import("./pages/ViewTradeDetail.tsx"));
const Legal = lazy(() => import("./pages/Legal.tsx"));
const PaymentsHeld = lazy(() => import("./pages/PaymentsHeld.tsx"));

/**
 * Routes that exist only to move money, swapped out while payments are held
 * (config/features.ts). Doing it here means those pages are never reached, so
 * no payment control can render behind a guard someone forgot to add.
 */
const RampShell = ({ children }: { children: React.ReactNode }) =>
  PAYMENTS_ENABLED ? (
    <RampMinimalProvider>{children}</RampMinimalProvider>
  ) : (
    <>{children}</>
  );

const heldIfPaymentsOff = (element: React.ReactNode) =>
  PAYMENTS_ENABLED ? element : <PaymentsHeld />;

setupGlobalErrorHandling();

declare global {
  interface Window {
    __APP_IS_STANDALONE__?: boolean;
  }
}

const initialStandaloneMode: boolean =
  typeof window !== "undefined"
    ? Boolean(window.__APP_IS_STANDALONE__)
    : false;

// Fires app-ready once the full provider tree and layout are mounted.
// The HTML splash screen listens for this event and begins its fade-out.
const SplashDismisser = () => {
  useEffect(() => {
    window.dispatchEvent(new Event("app-ready"));
  }, []);
  return null;
};

// ── Silent update banner ────────────────────────────────────────────────────
// Shown for 3 seconds when a new SW version is ready, then the page reloads.
// This is non-blocking and non-disruptive - no action required from the user.
const UpdateBanner = () => (
  <div
    role="status"
    aria-live="polite"
    className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-2.5 bg-[#292B30] border border-white/10 rounded-xl px-4 py-3 shadow-xl text-sm text-white select-none pointer-events-none"
  >
    <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse flex-shrink-0" />
    Updating to latest version…
  </div>
);

const RouterLayout = () => {
  return (
    <Configuration>
      <SnackbarProvider>
        <Provider store={store}>
          <SmartWalletProvider>
              <AuthProvider>
                <SmartWalletContextProvider>
                    {/* RampMinimalProvider renders the Quidax "Buy / Sell
                        Crypto" button and its modal - buying and selling
                        crypto, so it is held with the rest. RampShell drops to
                        a passthrough when payments are off, which unmounts
                        both without disturbing the provider tree below.

                        Worth knowing: this provider comes from a file named
                        USAGE_EXAMPLE.tsx. The example got wired into
                        production. */}
                    <RampShell>
                            {/* <FloatingRampButton
                              defaultMode="onramp"
                              position="bottom-right"
                              label="Buy / Sell Crypto"
                            /> */}
                                {/* <RampModal /> */}
                <TermsProvider>
                  <CurrencyProvider>
                    <WalkthroughProvider>
                      <Layout>
                        <SplashDismisser />
                        <Suspense
                          fallback={
                            initialStandaloneMode ? null : <Loadscreen />
                          }
                        >
                          <Outlet />
                        </Suspense>
                        <ReferralHandler />
                        <Walkthrough />
                      </Layout>
                    </WalkthroughProvider>
                  </CurrencyProvider>
                </TermsProvider>
                     </RampShell>
                </SmartWalletContextProvider>
              </AuthProvider>
          </SmartWalletProvider>
        </Provider>
      </SnackbarProvider>
    </Configuration>
  );
};

const router = createBrowserRouter([
  {
    path: "/",
    element: <RouterLayout />,
    errorElement: (
      <ErrorBoundary>
        <NotFound />
      </ErrorBoundary>
    ),
    children: [
      { index: true, element: <Home /> },
      { path: "/login", element: <Login /> },
      { path: "/auth/google", element: <AuthCallback /> },
      {
        element: <ProtectedRoute />,
        children: [
          { path: "/account", element: <Account /> },
          { path: "/notifications", element: <Notifications /> },
          { path: "/trades/viewtrades", element: heldIfPaymentsOff(<ViewTrade />) },
          { path: "/trades/buy/:productId", element: heldIfPaymentsOff(<BuyCheckout />) },
          { path: "/trades/sell/:productId", element: heldIfPaymentsOff(<SellCheckout />) },
          { path: "/trades/viewtrades/:tradeId", element: heldIfPaymentsOff(<ViewTradeDetail />) },
          { path: "/orders/:orderId", element: <ViewOrderDetail /> },
          { path: "/chat", element: <Chat /> },
          { path: "/chat/:userId", element: <ChatDetail /> },
        ],
      },
      { path: "/product", element: <Product /> },
      { path: "/product/category/:categoryName", element: <Product /> },
      { path: "/product/:productId", element: <SingleProduct /> },
      { path: "/trades", element: <ComingSoon /> },
      { path: "/community", element: <Community /> },
      { path: "/terms", element: <Legal type="terms_of_use" /> },
      { path: "/privacy", element: <Legal type="privacy_policy" /> },
      { path: "/cookies", element: <Legal type="cookie_policy" /> },
      { path: "/referral", element: <ReferralLanding /> },
      { path: "/load", element: <Loadscreen /> },
      { path: "/offline", element: <Offline /> },
      { path: "*", element: <NotFound /> },
    ],
  },
]);

const App = () => {
  // true while the 3-second update banner is showing
  const [showUpdateBanner, setShowUpdateBanner] = useState(false);

  // Listen for the SW update-ready event fired by serviceWorkerRegistration.ts
  useEffect(() => {
    const handler = () => {
      setShowUpdateBanner(true);
      // Give the user 3 seconds to notice, then silently reload
      setTimeout(() => {
        triggerSWUpdate(true);
      }, 3000);
    };
    window.addEventListener("pwa:update-ready", handler);
    return () => window.removeEventListener("pwa:update-ready", handler);
  }, []);

  return (
    <>
      <RouterProvider router={router} />
      {showUpdateBanner && <UpdateBanner />}
    </>
  );
};

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
