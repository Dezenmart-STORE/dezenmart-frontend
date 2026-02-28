import React, { lazy, Suspense, useCallback, useState } from "react";
import { LazyMotion, domAnimation, m } from "framer-motion";
import { RiListCheck2, RiGridFill } from "react-icons/ri";
import OrderHistoryItem from "./OrderHistoryItem";
import DisputeItem from "./DisputeItem";
import EmptyState from "./EmptyState";
import SavedItem from "./SavedItem";
import { TabType, Order } from "../../../utils/types";
import ReferralsTab from "./referrals";
import LoadingSpinner from "../../common/LoadingSpinner";
import { useGetUserOrdersQuery } from "../../../store/api/ordersApi";
import {
  useGetWatchlistQuery,
  useRemoveFromWatchlistMutation,
} from "../../../store/api/watchlistApi";

const ProductContainer = lazy(() => import("./products/Container"));

type ViewMode = "list" | "grid";

interface TabContentProps {
  activeTab: TabType;
  milestones?: { sales: number; purchases: number };
  referralCode?: string;
  referralCount?: number;
  points?: { total: number; available: number };
}

// ── Persisted view-mode hook ──────────────────────────────────────────
function useViewMode(key: string): [ViewMode, (m: ViewMode) => void] {
  const storageKey = `account_view_${key}`;
  const [mode, setMode] = useState<ViewMode>(() => {
    try {
      return (localStorage.getItem(storageKey) as ViewMode) ?? "list";
    } catch {
      return "list";
    }
  });

  const update = useCallback(
    (next: ViewMode) => {
      setMode(next);
      try { localStorage.setItem(storageKey, next); } catch { /* noop */ }
    },
    [storageKey]
  );

  return [mode, update];
}

// ── View toggle buttons ───────────────────────────────────────────────
function ViewToggle({
  mode,
  onChange,
}: {
  mode: ViewMode;
  onChange: (m: ViewMode) => void;
}) {
  return (
    <div className="flex items-center gap-1 bg-[#292B30] rounded-lg p-1">
      <button
        onClick={() => onChange("list")}
        aria-label="List view"
        className={`p-1.5 rounded-md transition-colors ${
          mode === "list"
            ? "bg-[#3A3C41] text-white"
            : "text-gray-500 hover:text-gray-300"
        }`}
      >
        <RiListCheck2 size={14} />
      </button>
      <button
        onClick={() => onChange("grid")}
        aria-label="Grid view"
        className={`p-1.5 rounded-md transition-colors ${
          mode === "grid"
            ? "bg-[#3A3C41] text-white"
            : "text-gray-500 hover:text-gray-300"
        }`}
      >
        <RiGridFill size={14} />
      </button>
    </div>
  );
}

// ── Content header: count + view toggle ──────────────────────────────
function ContentHeader({
  count,
  label,
  mode,
  onModeChange,
}: {
  count: number;
  label: string;
  mode: ViewMode;
  onModeChange: (m: ViewMode) => void;
}) {
  return (
    <div className="flex items-center justify-between mt-4 mb-3">
      <p className="text-xs text-gray-400">
        {count} {label}
      </p>
      <ViewToggle mode={mode} onChange={onModeChange} />
    </div>
  );
}

// ── Shared tab panel: handles loading / error / empty uniformly ───────
function TabPanel({
  isLoading,
  hasError,
  onRetry,
  isEmpty,
  emptyMessage,
  emptyButtonText,
  emptyButtonPath,
  children,
}: {
  isLoading: boolean;
  hasError: boolean;
  onRetry: () => void;
  isEmpty: boolean;
  emptyMessage: string;
  emptyButtonText: string;
  emptyButtonPath: string;
  children: React.ReactNode;
}) {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="text-center py-12 bg-[#292B30] rounded-xl mt-4">
        <p className="text-sm text-gray-400 mb-3">Something went wrong.</p>
        <button
          onClick={onRetry}
          className="text-sm text-red-400 underline hover:text-red-300 transition-colors"
        >
          Try again
        </button>
      </div>
    );
  }

  if (isEmpty) {
    return (
      <EmptyState
        message={emptyMessage}
        buttonText={emptyButtonText}
        buttonPath={emptyButtonPath}
      />
    );
  }

  return <>{children}</>;
}

// ── Slide animation shared config ────────────────────────────────────
const slideProps = {
  initial: { opacity: 0, x: -12 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 12 },
  transition: { duration: 0.2 },
};

// ── Main component ────────────────────────────────────────────────────
const TabContent: React.FC<TabContentProps> = React.memo(({ activeTab }) => {
  const [savedMode, setSavedMode] = useViewMode("saved");
  const [ordersMode, setOrdersMode] = useViewMode("orders");
  const [disputesMode, setDisputesMode] = useViewMode("disputes");

  const {
    data: ordersData,
    isLoading: ordersLoading,
    error: orderError,
    refetch: refetchOrders,
  } = useGetUserOrdersQuery(
    { type: "buyer" },
    { skip: !["3", "4"].includes(activeTab) }
  );

  const {
    data: watchlistData,
    isLoading: watchlistLoading,
    error: watchlistError,
    refetch: refetchWatchlist,
  } = useGetWatchlistQuery(undefined, { skip: activeTab !== "1" });

  const [removeFromWatchlist] = useRemoveFromWatchlistMutation();

  const disputeOrders = ordersData?.filter((o: Order) => o.dispute?.raisedBy) ?? [];
  const regularOrders = ordersData?.filter((o: Order) => !o.dispute?.raisedBy) ?? [];
  const watchlistItems = watchlistData ?? [];

  const handleRemove = useCallback(
    async (productId: string) => {
      try {
        await removeFromWatchlist(productId).unwrap();
        return true;
      } catch {
        return false;
      }
    },
    [removeFromWatchlist]
  );

  return (
    <LazyMotion features={domAnimation}>
      {/* Saved Items */}
      {activeTab === "1" && (
        <m.div {...slideProps}>
          <TabPanel
            isLoading={watchlistLoading}
            hasError={!!watchlistError && watchlistItems.length === 0}
            onRetry={refetchWatchlist}
            isEmpty={!watchlistLoading && !watchlistError && watchlistItems.length === 0}
            emptyMessage="Your wishlist is empty."
            emptyButtonText="Browse Products"
            emptyButtonPath="/product"
          >
            <ContentHeader
              count={watchlistItems.filter((i) => i?.product?._id).length}
              label="saved"
              mode={savedMode}
              onModeChange={setSavedMode}
            />
            <div
              className={
                savedMode === "grid"
                  ? "grid grid-cols-2 sm:grid-cols-3 gap-3"
                  : "space-y-3"
              }
            >
              {watchlistItems
                .filter((item) => item?.product?._id)
                .map((item, i) => (
                  <SavedItem
                    key={item._id}
                    item={item}
                    index={i}
                    onRemove={handleRemove}
                    viewMode={savedMode}
                  />
                ))}
            </div>
          </TabPanel>
        </m.div>
      )}

      {/* Rewards */}
      {activeTab === "2" && (
        <m.div {...slideProps}>
          <ReferralsTab />
        </m.div>
      )}

      {/* Order History */}
      {activeTab === "3" && (
        <m.div {...slideProps}>
          <TabPanel
            isLoading={ordersLoading}
            hasError={!!orderError && regularOrders.length === 0}
            onRetry={refetchOrders}
            isEmpty={!ordersLoading && !orderError && regularOrders.length === 0}
            emptyMessage="You haven't placed any orders yet."
            emptyButtonText="Browse Products"
            emptyButtonPath="/product"
          >
            <ContentHeader
              count={regularOrders.filter((o: Order) => o?._id && o?.product?._id).length}
              label="orders"
              mode={ordersMode}
              onModeChange={setOrdersMode}
            />
            <div
              className={
                ordersMode === "grid"
                  ? "grid grid-cols-2 sm:grid-cols-3 gap-3"
                  : "space-y-3"
              }
            >
              {regularOrders
                .filter((o: Order) => o?._id && o?.product?._id)
                .map((o: Order, i: number) => (
                  <OrderHistoryItem
                    key={o.orderId}
                    {...o}
                    index={i}
                    viewMode={ordersMode}
                  />
                ))}
            </div>
          </TabPanel>
        </m.div>
      )}

      {/* Disputes */}
      {activeTab === "4" && (
        <m.div {...slideProps}>
          <TabPanel
            isLoading={ordersLoading}
            hasError={!!orderError && disputeOrders.length === 0}
            onRetry={refetchOrders}
            isEmpty={!ordersLoading && !orderError && disputeOrders.length === 0}
            emptyMessage="No disputes raised yet."
            emptyButtonText="View Orders"
            emptyButtonPath="/account"
          >
            <ContentHeader
              count={disputeOrders.filter((o: Order) => o?._id && o?.product?._id).length}
              label="disputes"
              mode={disputesMode}
              onModeChange={setDisputesMode}
            />
            <div
              className={
                disputesMode === "grid"
                  ? "grid grid-cols-2 sm:grid-cols-3 gap-3"
                  : "space-y-3"
              }
            >
              {disputeOrders
                .filter((o: Order) => o?._id && o?.product?._id)
                .map((o: Order) => (
                  <DisputeItem
                    key={o.orderId}
                    order={o}
                    disputeStatus={
                      o.dispute?.resolved === false ? "Under Review" : "Resolved"
                    }
                    viewMode={disputesMode}
                  />
                ))}
            </div>
          </TabPanel>
        </m.div>
      )}

      {/* My Products */}
      {activeTab === "5" && (
        <m.div {...slideProps}>
          <Suspense
            fallback={
              <div className="flex justify-center py-12">
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
