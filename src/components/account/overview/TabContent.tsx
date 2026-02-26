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
import { useGetUserOrdersQuery } from "../../../store/api/ordersApi";
import { useGetWatchlistQuery, useRemoveFromWatchlistMutation } from "../../../store/api/watchlistApi";
import { Order } from "../../../utils/types";

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
  // RTK Query hooks
  const { data: ordersData, isLoading: isOrdersLoading, error: orderError, refetch: refetchOrders } = useGetUserOrdersQuery(
    { type: 'buyer' },
    {
      skip: !["3", "4"].includes(activeTab),
    }
  );

  const { data: watchlistData, isLoading: isWatchlistLoading, error: watchlistError, refetch: refetchWatchlist } = useGetWatchlistQuery(undefined, {
    skip: activeTab !== "1",
  });

  const [removeFromWatchlist] = useRemoveFromWatchlistMutation();

  // Process orders data
  const disputeOrders = ordersData?.filter((order: Order) => order.dispute?.raisedBy) || [];
  const nonDisputeOrders = ordersData?.filter((order: Order) => !order.dispute?.raisedBy) || [];
  const watchlistItems = watchlistData || [];

  // Manual retry handlers with RTK Query
  const handleRetryWatchlist = useCallback(() => {
    console.log("🔄 Manual retry for watchlist");
    refetchWatchlist();
  }, [refetchWatchlist]);

  const handleRetryOrders = useCallback(() => {
    console.log(`🔄 Manual retry for orders tab ${activeTab}`);
    refetchOrders();
  }, [activeTab, refetchOrders]);

  // Handle remove from watchlist
  const removeProductFromWatchlist = useCallback(async (productId: string): Promise<boolean> => {
    try {
      await removeFromWatchlist(productId).unwrap();
      return true;
    } catch (error) {
      console.error("Failed to remove from watchlist:", error);
      return false;
    }
  }, [removeFromWatchlist]);

  // Check if tab is loading - simplified with RTK Query
  const isTabLoading = useCallback(
    (tabId: string) => {
      if (tabId === "1") return isWatchlistLoading;
      if (tabId === "3" || tabId === "4") return isOrdersLoading;
      return false;
    },
    [isWatchlistLoading, isOrdersLoading]
  );

  // Check if should show error - simplified with RTK Query
  const shouldShowError = useCallback(
    (tabId: string) => {
      const hasError =
        (tabId === "1" && watchlistError) ||
        (["3", "4"].includes(tabId) && orderError);

      const hasData =
        (tabId === "1" && watchlistItems.length > 0) ||
        (tabId === "3" && nonDisputeOrders && nonDisputeOrders.length > 0) ||
        (tabId === "4" && disputeOrders && disputeOrders.length > 0);

      return hasError && !hasData;
    },
    [
      watchlistError,
      orderError,
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
              <p className="text-gray-400 text-sm mb-4">Failed to load watchlist. Please try again.</p>
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
              <p className="text-gray-400 text-sm mb-4">Failed to load orders. Please try again.</p>
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
                  .filter((order: Order) => order?._id && order?.product?._id)
                  .map((order: Order, index: number) => (
                    <OrderHistoryItem
                      key={`order-${order.orderId}`}
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
              <p className="text-gray-400 text-sm mb-4">Failed to load disputes. Please try again.</p>
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
                  .filter((order: Order) => order?._id && order?.product?._id)
                  .map((order: Order) => (
                    <DisputeItem
                      key={`dispute-${order.orderId}`}
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
