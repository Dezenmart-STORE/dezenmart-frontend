import { LazyMotion, domAnimation, m } from "framer-motion";
import OrderHistoryItem from "./OrderHistoryItem";
import DisputeItem from "./DisputeItem";
import EmptyState from "./EmptyState";
import { TabType } from "../../../utils/types";
import ReferralsTab from "./referrals";
import { useEffect, useState } from "react";
import LoadingSpinner from "../../common/LoadingSpinner";
import { useOrderData } from "../../../utils/hooks/useOrderData";

interface TabContentProps {
  activeTab: TabType;
  productImage: string;
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

const TabContent: React.FC<TabContentProps> = ({ activeTab, productImage }) => {
  const { fetchBuyerOrders, formattedOrders, loading, error } = useOrderData();
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Fetch orders when component mounts or when the active tab is "1" (Orders)
  useEffect(() => {
    if (activeTab === "1") {
      const loadOrders = async () => {
        await fetchBuyerOrders(false, isInitialLoad);
        setIsInitialLoad(false);
      };

      loadOrders();
    }

    // Cleanup function
    return () => {
      // No need to cleanup since the API cancel is handled in useOrderData hook
    };
  }, [activeTab, fetchBuyerOrders, isInitialLoad]);

  return (
    <LazyMotion features={domAnimation}>
      {activeTab === "1" && (
        <m.div
          className="mt-6 space-y-4"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          transition={{ duration: 0.3 }}
        >
          {loading && (
            <div className="flex justify-center items-center py-12">
              <LoadingSpinner size="lg" />
            </div>
          )}

          {!loading && error && (
            <div className="text-center py-8">
              <p className="text-Red mb-2">Error loading orders</p>
              <button
                onClick={() => fetchBuyerOrders(false, true)}
                className="text-white underline hover:text-gray-300"
              >
                Try Again
              </button>
            </div>
          )}

          {!loading && !error && formattedOrders?.length === 0 && (
            <EmptyState
              message="You haven't placed any orders yet."
              buttonText="Browse Products"
              buttonPath="/product"
            />
          )}

          {!loading &&
            !error &&
            formattedOrders?.length > 0 &&
            formattedOrders.map((order, index) => (
              <OrderHistoryItem key={order._id} {...order} index={index} />
            ))}
        </m.div>
      )}

      {activeTab === "2" && (
        <m.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          transition={{ duration: 0.3 }}
        >
          <EmptyState
            message="Your wishlist is empty."
            buttonText="Browse Products"
            buttonPath="/product"
          />
        </m.div>
      )}

      {activeTab === "3" && (
        <m.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          transition={{ duration: 0.3 }}
        >
          <DisputeItem
            productImage={productImage}
            productName="Vaseline Lotion"
            vendor="DanBike"
            disputeDate="Jan 15, 2025"
            disputeStatus="Under Review"
          />
        </m.div>
      )}

      {activeTab === "4" && (
        <m.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          transition={{ duration: 0.3 }}
        >
          <ReferralsTab />
        </m.div>
      )}
    </LazyMotion>
  );
};

export default TabContent;
