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
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ErrorBoundary from "./components/error/ErrorBoundary.tsx";
import { setupGlobalErrorHandling } from "./utils/errorHandling";
import ReferralHandler from "./components/referrals/ReferralHandler.tsx";
import { CurrencyProvider } from "./context/CurrencyContext.tsx";
import { WagmiProvider } from "wagmi";
import { wagmiConfig } from "./config/chains.ts";
import TermsModal from "./components/common/TermsModal.tsx";
import { TermsProvider } from "./context/TermsContext.tsx";
import { WalkthroughProvider } from "./context/WalkthroughContext.tsx";
import Walkthrough from "./components/walkthrough/Walkthrough.tsx";
import { initSentry } from "./utils/sentry.config.ts";
import {
  initPerformanceMonitoring,
  monitorResourceTiming,
} from "./utils/performance.ts";
import { registerServiceWorker, triggerSWUpdate } from "./utils/pwa/index.ts";
import { initDebugTools } from "./utils/debug/index.ts";
import "./utils/dev/injectAuth.ts";

// ── Startup: version-based stale cache cleanup ──────────────────────────────
// When a new version is deployed, clear data that may be stale or reference
// old API shapes. RTK Query cache is in-memory (cleared on reload automatically).
// We only need to clear offline-sync queued requests from the previous build.
const APP_VERSION = import.meta.env.VITE_APP_VERSION as string | undefined;
const VERSION_STORE_KEY = "_app_build_v";

if (APP_VERSION) {
  const storedVersion = localStorage.getItem(VERSION_STORE_KEY);
  if (storedVersion && storedVersion !== APP_VERSION) {
    // New deployment detected — clear potentially stale offline queue
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

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30000,
      gcTime: 5 * 60 * 1000,
      refetchOnMount: false,
    },
  },
});
setupGlobalErrorHandling();

declare global {
  interface Window {
    __APP_IS_STANDALONE__?: boolean;
  }
}

const MIN_APP_LOAD_DURATION = 4600;

const detectStandaloneMode = () => {
  if (typeof window === "undefined") return false;
  const mediaQuery = window.matchMedia
    ? window.matchMedia("(display-mode: standalone)")
    : null;
  const iosStandalone = (
    window.navigator as Navigator & { standalone?: boolean }
  ).standalone;
  return Boolean(mediaQuery?.matches || iosStandalone);
};

const resolveStandaloneMode = () => {
  if (typeof window === "undefined") return false;
  if (typeof window.__APP_IS_STANDALONE__ === "boolean") {
    return window.__APP_IS_STANDALONE__;
  }
  const detected = detectStandaloneMode();
  window.__APP_IS_STANDALONE__ = detected;
  return detected;
};

const initialStandaloneMode = resolveStandaloneMode();

// ── Silent update banner ────────────────────────────────────────────────────
// Shown for 3 seconds when a new SW version is ready, then the page reloads.
// This is non-blocking and non-disruptive — no action required from the user.
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
          <WagmiProvider config={wagmiConfig}>
            <QueryClientProvider client={queryClient}>
              <AuthProvider>
                <TermsProvider>
                  <CurrencyProvider>
                    <WalkthroughProvider>
                      <Layout>
                        <Suspense
                          fallback={
                            initialStandaloneMode ? null : <Loadscreen />
                          }
                        >
                          <Outlet />
                        </Suspense>
                        <ReferralHandler />
                        <TermsModal />
                        <Walkthrough />
                      </Layout>
                    </WalkthroughProvider>
                  </CurrencyProvider>
                </TermsProvider>
              </AuthProvider>
            </QueryClientProvider>
          </WagmiProvider>
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
          { path: "/trades/viewtrades", element: <ComingSoon /> },
          { path: "/trades/buy/:productId", element: <ComingSoon /> },
          { path: "/trades/sell/:productId", element: <ComingSoon /> },
          { path: "/trades/viewtrades/:tradeId", element: <ComingSoon /> },
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
      { path: "/referral", element: <ReferralLanding /> },
      { path: "/load", element: <Loadscreen /> },
      { path: "/offline", element: <Offline /> },
      { path: "*", element: <NotFound /> },
    ],
  },
]);

const App = () => {
  const [isStandalone] = useState(initialStandaloneMode);
  const [isInitializing, setIsInitializing] = useState(
    () => !initialStandaloneMode
  );
  // true while the 3-second update banner is showing
  const [showUpdateBanner, setShowUpdateBanner] = useState(false);

  useEffect(() => {
    if (isStandalone) return;
    const timer = window.setTimeout(() => setIsInitializing(false), MIN_APP_LOAD_DURATION);
    return () => window.clearTimeout(timer);
  }, [isStandalone]);

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

  if (!isStandalone && isInitializing) {
    return <Loadscreen />;
  }

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
