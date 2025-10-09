import { LazyMotion, domAnimation, m } from "framer-motion";
import OrderHistoryItem from "./OrderHistoryItem";
import DisputeItem from "./DisputeItem";
import EmptyState from "./EmptyState";
import SavedItem from "./SavedItem";
import { TabType } from "../../../utils/types";
import ReferralsTab from "./referrals";
import React, {
  useEffect,
  useState,
  lazy,
  Suspense,
  useCallback,
  useRef,
} from "react";
import LoadingSpinner from "../../common/LoadingSpinner";
import { useOrderData } from "../../../utils/hooks/useOrder";
import { useWatchlist } from "../../../utils/hooks/useWatchlist";

const ProductContainer = lazy(() => import("./products/Container"));

interface TabContentProps {
  activeTab: TabType;
  milestones?: {
    sales: number;
    purchases: number;
  };
  referralCode?: string;
  referralCount?: number;
  points?: {
    total: number;
    available: number;
  };
}

const TabContent: React.FC<TabContentProps> = React.memo(({ activeTab }) => {
  const {
    fetchBuyerOrders,
    disputeOrders,
    nonDisputeOrders,
    loading: orderLoading,
    error: orderError,
  } = useOrderData();

  console.log("🎨 TabContent render", {
    activeTab,
    disputeOrdersCount: disputeOrders?.length,
    nonDisputeOrdersCount: nonDisputeOrders?.length,
    orderLoading,
    orderError,
  });

  const {
    watchlistItems,
    fetchUserWatchlist,
    removeProductFromWatchlist,
    isLoading: watchlistLoading,
    error: watchlistError,
  } = useWatchlist();

  const [tabInitialized, setTabInitialized] = useState<Record<string, boolean>>(
    {}
  );
  const [retryCount, setRetryCount] = useState<Record<string, number>>({});
  const abortControllerRef = useRef<AbortController | null>(null);
  const fetchingRef = useRef<Record<string, boolean>>({});
  const retryTimeoutRef = useRef<Record<string, NodeJS.Timeout>>({});

  // Cleanup function
  const cleanup = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    // Clear all retry timeouts
    Object.values(retryTimeoutRef.current).forEach((timeout) => {
      clearTimeout(timeout);
    });
    retryTimeoutRef.current = {};
  }, []);

  // Stable retry handler using refs to avoid recreating initializeTab
  const scheduleRetry = useCallback(
    (tabId: string, currentRetry: number) => {
      const maxRetries = 3;

      if (currentRetry >= maxRetries) {
        fetchingRef.current[tabId] = false;
        return;
      }

      // Clear existing timeout for this tab
      if (retryTimeoutRef.current[tabId]) {
        clearTimeout(retryTimeoutRef.current[tabId]);
      }

      const delay = Math.pow(2, currentRetry) * 1000;

      retryTimeoutRef.current[tabId] = setTimeout(() => {
        fetchingRef.current[tabId] = false;
        setRetryCount((prev) => ({ ...prev, [tabId]: currentRetry + 1 }));

        // Trigger fetch without recursion
        if (tabId === "1") {
          fetchUserWatchlist(false, true);
        } else if (tabId === "3" || tabId === "4") {
          fetchBuyerOrders(false, true);
        }

        delete retryTimeoutRef.current[tabId];
      }, delay);
    },
    [fetchUserWatchlist, fetchBuyerOrders]
  );

  // Initialize tab data - removed state dependencies
  const initializeTab = useCallback(
    async (tabId: string) => {
      // Prevent concurrent fetches for the same tab
      if (fetchingRef.current[tabId]) {
        console.log(`🔒 Tab ${tabId} already fetching, skipping...`);
        return;
      }

      // Check if already initialized
      if (tabInitialized[tabId]) {
        console.log(`✅ Tab ${tabId} already initialized, skipping...`);
        return;
      }

      console.log(`🚀 Initializing tab ${tabId}`);
      fetchingRef.current[tabId] = true;

      try {
        let success = false;
        const currentRetry = retryCount[tabId] || 0;

        switch (tabId) {
          case "1":
            success = await fetchUserWatchlist(false, true);
            break;
          case "3":
          case "4":
            const orders = await fetchBuyerOrders(false, true);
            success = Array.isArray(orders);
            break;
          default:
            success = true;
        }

        if (success) {
          console.log(`✅ Tab ${tabId} initialized successfully`);
          setTabInitialized((prev) => ({ ...prev, [tabId]: true }));
          setRetryCount((prev) => ({ ...prev, [tabId]: 0 }));
          fetchingRef.current[tabId] = false;
        } else {
          console.log(
            `⚠️ Tab ${tabId} initialization failed, scheduling retry`
          );
          scheduleRetry(tabId, currentRetry);
        }
      } catch (error: any) {
        console.error(`❌ Failed to initialize tab ${tabId}:`, error);

        if (error?.name !== "AbortError") {
          scheduleRetry(tabId, retryCount[tabId] || 0);
        } else {
          fetchingRef.current[tabId] = false;
        }
      }
    },
    [] // Empty dependency array - use refs and callbacks for dynamic values
  );

  // Effect to handle tab changes
  useEffect(() => {
    if (["1", "3", "4"].includes(activeTab)) {
      initializeTab(activeTab);
    }

    return cleanup;
  }, [activeTab, cleanup]); // Only depend on activeTab and cleanup

  // Reset initialization when component unmounts
  useEffect(() => {
    return () => {
      cleanup();
      setTabInitialized({});
      setRetryCount({});
      fetchingRef.current = {};
    };
  }, [cleanup]);

  const handleRetryWatchlist = useCallback(() => {
    console.log("🔄 Manual retry for watchlist");
    setTabInitialized((prev) => ({ ...prev, "1": false }));
    setRetryCount((prev) => ({ ...prev, "1": 0 }));
    fetchingRef.current["1"] = false;

    // Clear any pending retry
    if (retryTimeoutRef.current["1"]) {
      clearTimeout(retryTimeoutRef.current["1"]);
      delete retryTimeoutRef.current["1"];
    }

    initializeTab("1");
  }, [initializeTab]);

  const handleRetryOrders = useCallback(() => {
    const tabId = activeTab;
    console.log(`🔄 Manual retry for orders tab ${tabId}`);
    setTabInitialized((prev) => ({ ...prev, [tabId]: false }));
    setRetryCount((prev) => ({ ...prev, [tabId]: 0 }));
    fetchingRef.current[tabId] = false;

    // Clear any pending retry
    if (retryTimeoutRef.current[tabId]) {
      clearTimeout(retryTimeoutRef.current[tabId]);
      delete retryTimeoutRef.current[tabId];
    }

    initializeTab(tabId);
  }, [activeTab, initializeTab]);

  // loading state
  const isTabLoading = useCallback(
    (tabId: string) => {
      const hasData =
        (tabId === "1" && watchlistItems.length > 0) ||
        (tabId === "3" && nonDisputeOrders && nonDisputeOrders.length > 0) ||
        (tabId === "4" && disputeOrders && disputeOrders.length > 0);

      if (hasData) {
        return false;
      }

      const isFetching = fetchingRef.current[tabId];

      return isFetching || !tabInitialized[tabId];
    },
    [tabInitialized, watchlistItems, nonDisputeOrders, disputeOrders]
  );

  // Determine if error should be shown
  const shouldShowError = useCallback(
    (tabId: string) => {
      const hasError =
        (tabId === "1" && watchlistError) ||
        (["3", "4"].includes(tabId) && orderError);

      const hasData =
        (tabId === "1" && watchlistItems.length > 0) ||
        (tabId === "3" && nonDisputeOrders && nonDisputeOrders.length > 0) ||
        (tabId === "4" && disputeOrders && disputeOrders.length > 0);

      const isRetrying =
        (retryCount[tabId] || 0) > 0 && (retryCount[tabId] || 0) < 3;
      const isLoading = isTabLoading(tabId);
      return (
        hasError &&
        tabInitialized[tabId] &&
        !isLoading &&
        !isRetrying &&
        !hasData
      );
    },
    [
      watchlistError,
      orderError,
      isTabLoading,
      retryCount,
      tabInitialized,
      watchlistItems,
      nonDisputeOrders,
      disputeOrders,
    ]
  );

  return (
    <LazyMotion features={domAnimation}>
      {/* Watchlist Tab */}
      {activeTab === "1" && (
        <m.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          transition={{ duration: 0.3 }}
        >
          {isTabLoading("1") && (
            <div className="flex justify-center items-center py-12">
              <LoadingSpinner size="lg" />
              {retryCount["1"] > 0 && (
                <p className="text-gray-400 text-sm mt-4">
                  Retrying... (Attempt {retryCount["1"]}/3)
                </p>
              )}
            </div>
          )}

          {shouldShowError("1") && (
            <div className="text-center py-8">
              <p className="text-Red mb-2">Error loading saved items</p>
              <p className="text-gray-400 text-sm mb-4">{watchlistError}</p>
              <button
                onClick={handleRetryWatchlist}
                disabled={isTabLoading("1")}
                className="text-white underline hover:text-gray-300 disabled:opacity-50"
              >
                Try Again
              </button>
            </div>
          )}

          {!isTabLoading("1") &&
            !shouldShowError("1") &&
            (!watchlistItems || watchlistItems.length === 0) && (
              <EmptyState
                message="Your wishlist is empty."
                buttonText="Browse Products"
                buttonPath="/product"
              />
            )}

          {!isTabLoading("1") &&
            !shouldShowError("1") &&
            watchlistItems &&
            watchlistItems.length > 0 && (
              <div className="mt-6 space-y-4">
                {watchlistItems
                  .filter((item) => item?.product?._id)
                  .map((item, index) => (
                    <SavedItem
                      key={`${item._id}-${item.product._id}`}
                      item={item}
                      index={index}
                      onRemove={removeProductFromWatchlist}
                    />
                  ))}
              </div>
            )}
        </m.div>
      )}

      {/* Referrals Tab */}
      {activeTab === "2" && (
        <m.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          transition={{ duration: 0.3 }}
        >
          <ReferralsTab />
        </m.div>
      )}

      {/* Order History Tab */}
      {activeTab === "3" && (
        <m.div
          className="mt-6 space-y-4"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          transition={{ duration: 0.3 }}
        >
          {isTabLoading("3") && (
            <div className="flex justify-center items-center py-12">
              <LoadingSpinner size="lg" />
            </div>
          )}

          {!isTabLoading("3") && orderError && (
            <div className="text-center py-8">
              <p className="text-Red mb-2">Error loading orders</p>
              <p className="text-gray-400 text-sm mb-4">
                {retryCount["3"] > 0 && `Retry attempt ${retryCount["3"]}/3`}
              </p>
              <button
                onClick={handleRetryOrders}
                disabled={isTabLoading("3")}
                className="text-white underline hover:text-gray-300 disabled:opacity-50"
              >
                {isTabLoading("3") ? "Retrying..." : "Try Again"}
              </button>
            </div>
          )}

          {!isTabLoading("3") &&
            !orderError &&
            (!nonDisputeOrders || nonDisputeOrders.length === 0) && (
              <EmptyState
                message="You haven't placed any orders yet."
                buttonText="Browse Products"
                buttonPath="/product"
              />
            )}

          {!isTabLoading("3") &&
            !orderError &&
            nonDisputeOrders &&
            nonDisputeOrders.length > 0 && (
              <div className="space-y-4">
                {nonDisputeOrders
                  .filter((order) => order?._id && order?.product?._id)
                  .map((order, index) => (
                    <OrderHistoryItem
                      key={`order-${order._id}`}
                      {...order}
                      index={index}
                    />
                  ))}
              </div>
            )}
        </m.div>
      )}

      {/* Disputes Tab */}
      {activeTab === "4" && (
        <m.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          transition={{ duration: 0.3 }}
        >
          {isTabLoading("4") && (
            <div className="flex justify-center items-center py-12">
              <LoadingSpinner size="lg" />
            </div>
          )}

          {!isTabLoading("4") && orderError && (
            <div className="text-center py-8">
              <p className="text-Red mb-2">Error loading disputes</p>
              <p className="text-gray-400 text-sm mb-4">
                {retryCount["4"] > 0 && `Retry attempt ${retryCount["4"]}/3`}
              </p>
              <button
                onClick={handleRetryOrders}
                disabled={isTabLoading("4")}
                className="text-white underline hover:text-gray-300 disabled:opacity-50"
              >
                {isTabLoading("4") ? "Retrying..." : "Try Again"}
              </button>
            </div>
          )}

          {!isTabLoading("4") &&
            !orderError &&
            (!disputeOrders || disputeOrders.length === 0) && (
              <EmptyState
                message="You haven't raised any disputes yet."
                buttonText="View Orders"
                buttonPath="/account"
              />
            )}

          {!isTabLoading("4") &&
            !orderError &&
            disputeOrders &&
            disputeOrders.length > 0 && (
              <div className="mt-6 space-y-4">
                {disputeOrders
                  .filter((order) => order?._id && order?.product?._id)
                  .map((order) => (
                    <DisputeItem
                      key={`dispute-${order._id}`}
                      disputeStatus={
                        order.dispute?.resolved === false
                          ? "Under Review"
                          : "Resolved"
                      }
                      order={order}
                    />
                  ))}
              </div>
            )}
        </m.div>
      )}

      {/* Create Product Tab */}
      {activeTab === "5" && (
        <m.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          transition={{ duration: 0.3 }}
        >
          <Suspense
            fallback={
              <div className="flex justify-center items-center py-12">
                <LoadingSpinner size="lg" />
              </div>
            }
          >
            <ProductContainer />
          </Suspense>
        </m.div>
      )}
    </LazyMotion>
  );
});

TabContent.displayName = "TabContent";

export default TabContent;
