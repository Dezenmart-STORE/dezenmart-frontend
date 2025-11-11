import { lazy, StrictMode, Suspense } from "react";
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
import { CurrencyProvider } from "./context/CurrencyContext.tsx";
import { WagmiProvider } from "wagmi";
import { Web3Provider } from "./context/Web3Context.tsx";
import { wagmiConfig } from "./utils/config/web3.config.ts";
import TermsModal from "./components/common/TermsModal.tsx";
import { TermsProvider } from "./context/TermsContext.tsx";
import { initSentry } from "./utils/sentry.config.ts";
import {
  initPerformanceMonitoring,
  monitorResourceTiming,
} from "./utils/performance.ts";
import { registerServiceWorker } from "./utils/pwa/index.ts";

// Initialize Sentry error tracking
initSentry();

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
const Trade = lazy(() => import("./pages/Trade.tsx"));
const BuyCheckout = lazy(() => import("./pages/BuyCheckout.tsx"));
const SellCheckout = lazy(() => import("./pages/SellCheckout.tsx"));
const ViewTrade = lazy(() => import("./pages/ViewTrade.tsx"));
const ViewTradeDetail = lazy(() => import("./pages/ViewTradeDetail.tsx"));
const ViewOrderDetail = lazy(() => import("./pages/ViewOrderDetail.tsx"));
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

const RouterLayout = () => {
  return (
    <Configuration>
      <SnackbarProvider>
        <Provider store={store}>
          <WagmiProvider config={wagmiConfig}>
            <QueryClientProvider client={queryClient}>
              <Web3Provider>
                <AuthProvider>
                  <TermsProvider>
                    <CurrencyProvider>
                      <Layout>
                        <Suspense fallback={<Loadscreen />}>
                          <Outlet />
                        </Suspense>
                        <ReferralHandler />
                        <TermsModal />
                      </Layout>
                    </CurrencyProvider>
                  </TermsProvider>
                </AuthProvider>
              </Web3Provider>
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
        <Suspense fallback={<Loadscreen />}>
          <NotFound />
        </Suspense>
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
            element: <ViewTrade />,
          },
          {
            path: "/trades/buy/:productId",
            element: <BuyCheckout />,
          },
          {
            path: "/trades/sell/:productId",
            element: <SellCheckout />,
          },
          {
            path: "/trades/viewtrades/:tradeId",
            element: <ViewTradeDetail />,
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
        element: <Trade />,
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

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>
);
