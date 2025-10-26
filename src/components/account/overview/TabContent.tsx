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

  const {
    watchlistItems,
    fetchUserWatchlist,
    removeProductFromWatchlist,
    isLoading: watchlistLoading,
    error: watchlistError,
  } = useWatchlist();

  // Track initialization per tab
  const [tabInitialized, setTabInitialized] = useState<Record<string, boolean>>(
    {}
  );
  const [isInitializing, setIsInitializing] = useState<Record<string, boolean>>(
    {}
  );

  // Refs to prevent concurrent fetches
  const initializationInProgressRef = useRef<Set<string>>(new Set());
  const mountedRef = useRef(true);

  // Initialize tab data
  const initializeTab = useCallback(
    async (tabId: string) => {
      // Prevent concurrent initialization
      if (
        initializationInProgressRef.current.has(tabId) ||
        tabInitialized[tabId]
      ) {
        console.log(`Tab ${tabId} already initialized or in progress`);
        return;
      }

      console.log(`Initializing tab ${tabId}`);
      initializationInProgressRef.current.add(tabId);
      setIsInitializing((prev) => ({ ...prev, [tabId]: true }));

      try {
        let success = false;

        switch (tabId) {
          case "1":
            success = await fetchUserWatchlist(false, true);
            break;
          case "3":
          case "4":
            const orders = await fetchBuyerOrders(false, true);
            success = Array.isArray(orders) && orders.length >= 0;
            break;
          default:
            success = true;
        }

        if (success && mountedRef.current) {
          console.log(`Tab ${tabId} initialized successfully`);
          setTabInitialized((prev) => ({ ...prev, [tabId]: true }));
        }
      } catch (error: any) {
        console.error(`Failed to initialize tab ${tabId}:`, error);
        if (error?.name !== "AbortError") {
          setTabInitialized((prev) => ({ ...prev, [tabId]: false }));
        }
      } finally {
        if (mountedRef.current) {
          initializationInProgressRef.current.delete(tabId);
          setIsInitializing((prev) => ({ ...prev, [tabId]: false }));
        }
      }
    },
    [tabInitialized, fetchUserWatchlist, fetchBuyerOrders]
  );

  // Effect to handle tab changes
  useEffect(() => {
    if (["1", "3", "4"].includes(activeTab) && !tabInitialized[activeTab]) {
      initializeTab(activeTab);
    }
  }, [activeTab]);

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      initializationInProgressRef.current.clear();
    };
  }, []);

  // Manual retry handlers
  const handleRetryWatchlist = useCallback(() => {
    console.log("🔄 Manual retry for watchlist");
    setTabInitialized((prev) => ({ ...prev, "1": false }));
    initializeTab("1");
  }, [initializeTab]);

  const handleRetryOrders = useCallback(() => {
    const tabId = activeTab;
    console.log(`🔄 Manual retry for orders tab ${tabId}`);
    setTabInitialized((prev) => ({ ...prev, [tabId]: false }));
    initializeTab(tabId);
  }, [activeTab, initializeTab]);

  // Check if tab is loading
  const isTabLoading = useCallback(
    (tabId: string) => {
      const hasData =
        (tabId === "1" && watchlistItems.length > 0) ||
        (tabId === "3" && nonDisputeOrders && nonDisputeOrders.length > 0) ||
        (tabId === "4" && disputeOrders && disputeOrders.length > 0);

      if (hasData) return false;

      return isInitializing[tabId] || !tabInitialized[tabId];
    },
    [
      isInitializing,
      tabInitialized,
      watchlistItems,
      nonDisputeOrders,
      disputeOrders,
    ]
  );

  // Check if should show error
  const shouldShowError = useCallback(
    (tabId: string) => {
      const hasError =
        (tabId === "1" && watchlistError) ||
        (["3", "4"].includes(tabId) && orderError);

      const hasData =
        (tabId === "1" && watchlistItems.length > 0) ||
        (tabId === "3" && nonDisputeOrders && nonDisputeOrders.length > 0) ||
        (tabId === "4" && disputeOrders && disputeOrders.length > 0);

      return (
        hasError && tabInitialized[tabId] && !isInitializing[tabId] && !hasData
      );
    },
    [
      watchlistError,
      orderError,
      tabInitialized,
      isInitializing,
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
            <div className="flex flex-col justify-center items-center py-12">
              <LoadingSpinner size="lg" />
              <p className="text-gray-400 text-sm mt-4">
                Loading saved items...
              </p>
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
            <div className="flex flex-col justify-center items-center py-12">
              <LoadingSpinner size="lg" />
              <p className="text-gray-400 text-sm mt-4">Loading orders...</p>
            </div>
          )}

          {shouldShowError("3") && (
            <div className="text-center py-8">
              <p className="text-Red mb-2">Error loading orders</p>
              <p className="text-gray-400 text-sm mb-4">{orderError}</p>
              <button
                onClick={handleRetryOrders}
                disabled={isTabLoading("3")}
                className="text-white underline hover:text-gray-300 disabled:opacity-50"
              >
                Try Again
              </button>
            </div>
          )}

          {!isTabLoading("3") &&
            !shouldShowError("3") &&
            (!nonDisputeOrders || nonDisputeOrders.length === 0) && (
              <EmptyState
                message="You haven't placed any orders yet."
                buttonText="Browse Products"
                buttonPath="/product"
              />
            )}

          {!isTabLoading("3") &&
            !shouldShowError("3") &&
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
            <div className="flex flex-col justify-center items-center py-12">
              <LoadingSpinner size="lg" />
              <p className="text-gray-400 text-sm mt-4">Loading disputes...</p>
            </div>
          )}

          {shouldShowError("4") && (
            <div className="text-center py-8">
              <p className="text-Red mb-2">Error loading disputes</p>
              <p className="text-gray-400 text-sm mb-4">{orderError}</p>
              <button
                onClick={handleRetryOrders}
                disabled={isTabLoading("4")}
                className="text-white underline hover:text-gray-300 disabled:opacity-50"
              >
                Try Again
              </button>
            </div>
          )}

          {!isTabLoading("4") &&
            !shouldShowError("4") &&
            (!disputeOrders || disputeOrders.length === 0) && (
              <EmptyState
                message="You haven't raised any disputes yet."
                buttonText="View Orders"
                buttonPath="/account"
              />
            )}

          {!isTabLoading("4") &&
            !shouldShowError("4") &&
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
