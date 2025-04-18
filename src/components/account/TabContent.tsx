import { LazyMotion, domAnimation, m } from "framer-motion";
import OrderHistoryItem from "./OrderHistoryItem";
import DisputeItem from "./DisputeItem";
import EmptyState from "./EmptyState";

type TabType = "1" | "2" | "3";

interface TabContentProps {
  activeTab: TabType;
  productImage: string;
}

const TabContent: React.FC<TabContentProps> = ({ activeTab, productImage }) => {
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
          <OrderHistoryItem
            productImage={productImage}
            productName="Vaseline Lotion"
            vendor="DanBike"
            quantity={300}
            price="0.0002"
            orderDate="Jan 20, 2025"
            status="In Escrow"
            index={0}
          />
          <OrderHistoryItem
            productImage={productImage}
            productName="Vaseline Lotion"
            vendor="DanBike"
            quantity={300}
            price="0.0002"
            orderDate="Jan 20, 2025"
            status="Shipped"
            index={1}
          />
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
    </LazyMotion>
  );
};

export default TabContent;
