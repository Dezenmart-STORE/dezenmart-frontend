import { lazy, StrictMode, Suspense, useEffect, useState } from "react";
import "./index.css";
import {
  createBrowserRouter,
  Outlet,
  RouterProvider,
  useLocation,
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
// import { WalletProvider } from "./context/WalletContext.tsx";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ErrorBoundary from "./components/error/ErrorBoundary.tsx";
import { setupGlobalErrorHandling } from "./utils/errorHandling";
import ReferralHandler from "./components/referrals/ReferralHandler.tsx";
import { CurrencyProvider } from "./lean/context/CurrencyContext.tsx";
import { WagmiProvider } from "wagmi";
import { wagmiConfig } from "./lean/config/chains.ts";
import TermsModal from "./components/common/TermsModal.tsx";
import { TermsProvider } from "./context/TermsContext.tsx";
import { WalkthroughProvider } from "./context/WalkthroughContext.tsx";
import Walkthrough from "./components/walkthrough/Walkthrough.tsx";
import { initSentry } from "./utils/sentry.config.ts";
import {
  initPerformanceMonitoring,
  monitorResourceTiming,
} from "./utils/performance.ts";
import { registerServiceWorker } from "./utils/pwa/index.ts";
import { initDebugTools } from "./utils/debug/index.ts";
import "./utils/dev/injectAuth.ts"; // Auth injection for local testing

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
    console.log("[PWA] New version available");
  },
  onOfflineReady: () => {
    console.log("[PWA] App ready to work offline");
  },
});

// import GoogleCallback from "./pages/GoogleCallback.tsx";

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
      staleTime: 30000, // 30 seconds
      gcTime: 5 * 60 * 1000, // 5 minutes
      refetchOnMount: false, // Don't refetch on mount to improve navigation speed
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
  if (typeof window === "undefined") {
    return false;
  }

  const mediaQuery = window.matchMedia
    ? window.matchMedia("(display-mode: standalone)")
    : null;
  const iosStandalone = (
    window.navigator as Navigator & { standalone?: boolean }
  ).standalone;

  return Boolean(mediaQuery?.matches || iosStandalone);
};

const resolveStandaloneMode = () => {
  if (typeof window === "undefined") {
    return false;
  }

  if (typeof window.__APP_IS_STANDALONE__ === "boolean") {
    return window.__APP_IS_STANDALONE__;
  }

  const detected = detectStandaloneMode();
  window.__APP_IS_STANDALONE__ = detected;
  return detected;
};

const initialStandaloneMode = resolveStandaloneMode();

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
      {
        index: true,
        element: <Home />,
      },
      {
        path: "/login",
        element: <Login />,
      },
      {
        path: "/auth/google",
        element: <AuthCallback />,
      },
      // {
      //   path: "/api/v1/auth/google/callback",
      //   element: <GoogleCallback />,
      // },
      {
        element: <ProtectedRoute />,
        children: [
          {
            path: "/account",
            element: <Account />,
          },
          {
            path: "/notifications",
            element: <Notifications />,
          },
          {
            path: "/trades/viewtrades",
            element: <ComingSoon />,
          },
          {
            path: "/trades/buy/:productId",
            element: <ComingSoon />,
          },
          {
            path: "/trades/sell/:productId",
            element: <ComingSoon />,
          },
          {
            path: "/trades/viewtrades/:tradeId",
            element: <ComingSoon />,
          },
          {
            path: "/orders/:orderId",
            element: <ViewOrderDetail />,
          },
          {
            path: "/chat",
            element: <Chat />,
          },
          {
            path: "/chat/:userId",
            element: <ChatDetail />,
          },
        ],
      },

      {
        path: "/product",
        element: <Product />,
      },
      {
        path: "/product/category/:categoryName",
        element: <Product />,
      },
      {
        path: "/product/:productId",
        element: <SingleProduct />,
      },
      {
        path: "/trades",
        element: <ComingSoon />,
      },
      {
        path: "/community",
        element: <Community />,
      },
      {
        path: "/referral",
        element: <ReferralLanding />,
      },
      {
        path: "/load",
        element: <Loadscreen />,
      },
      {
        path: "/offline",
        element: <Offline />,
      },
      {
        path: "*",
        element: <NotFound />,
      },
    ],
  },
]);

const App = () => {
  const [isStandalone] = useState(initialStandaloneMode);
  const [isInitializing, setIsInitializing] = useState(
    () => !initialStandaloneMode
  );

  useEffect(() => {
    if (isStandalone) {
      return;
    }

    const timer = window.setTimeout(() => {
      setIsInitializing(false);
    }, MIN_APP_LOAD_DURATION);

    return () => {
      window.clearTimeout(timer);
    };
  }, [isStandalone]);

  if (!isStandalone && isInitializing) {
    return <Loadscreen />;
  }

  return <RouterProvider router={router} />;
};

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
