import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Container from "../components/common/Container";
import Title from "../components/common/Title";
import { useWallet } from "../utils/hooks/useWallet";
import { Product, TradeTab } from "../utils/types";
import ProductListingSkeleton from "../components/trade/ProductListingSkeleton";
import ActiveTradeCard from "../components/trade/view/ActiveTradeCard";
import CompletedTradeCard from "../components/trade/view/CompletedTradeCard";
import ConnectWallet from "../components/trade/ConnectWallet";
import Tab from "../components/trade/Tab";
import EmptyState from "../components/trade/view/EmptyState";

const ViewTrade = () => {
  const [activeTab, setActiveTab] = useState<TradeTab>("active");
  const [isLoading, setIsLoading] = useState(true);
  const { isConnected, connect, isConnecting } = useWallet();

  // Sample data for active trades
  const activeTrades: Product[] = [
    {
      id: "3",
      name: "FemiMark",
      image: "/images/product1.svg",
      price: "₦1,200",
      quantity: "50 Cars",
      minCost: "1M - 10M NGN",
      description: "A wine Benz",
      orders: 45,
      rating: 98,
      seller: "JohnDoe",
      status: "Waiting for payment",
      timeRemaining: "28:43",
    },
  ];

  // Sample data for completed trades
  const completedTrades: Product[] = [
    {
      id: "4",
      name: "FemiMark",
      image: "/images/product2.svg",
      price: "₦1,500",
      quantity: "20 Cars",
      minCost: "500K - 5M NGN",
      description: "A white PS5 Console",
      orders: 78,
      rating: 95,
      seller: "SarahT",
      status: "Completed",
      paymentStatus: "Paid",
      escrowStatus: "Released",
    },
  ];

  useEffect(() => {
    const loadTimer = window.setTimeout(() => {
      window.requestAnimationFrame(() => {
        setIsLoading(false);
      });
    }, 600);

    return () => window.clearTimeout(loadTimer);
  }, []);

  if (!isConnected) {
    return (
      <div className="bg-Dark min-h-screen text-white">
        <Container>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            <Title text="Trade" className="text-center my-8 text-3xl" />
          </motion.div>
          <ConnectWallet onConnect={connect} isConnecting={isConnecting} />
        </Container>
      </div>
    );
  }

  return (
    <div className="bg-Dark min-h-screen text-white relative">
      <Container>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <Title text="Trade" className="text-center my-8 text-3xl" />
        </motion.div>

        {/* Tab Navigation */}
        <div className="max-w-screen-lg mx-auto bg-[#212428] rounded-lg overflow-hidden">
          <div className="flex max-xxs:flex-wrap border-b border-[#292B30] bg-[#292B30] w-full items-center">
            <Tab
              text="Active Trades"
              isActive={activeTab === "active"}
              onClick={() => setActiveTab("active")}
              count={activeTrades.length}
              className="w-full"
            />
            <Tab
              text="Completed"
              isActive={activeTab === "completed"}
              onClick={() => setActiveTab("completed")}
              count={completedTrades.length}
              className="w-full"
            />
          </div>

          {/* Content Area */}
          <div className="p-4">
            <AnimatePresence mode="wait">
              {isLoading ? (
                <ProductListingSkeleton />
              ) : (
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-6"
                >
                  {activeTab === "active" &&
                    (activeTrades.length > 0 ? (
                      activeTrades.map((trade) => (
                        <ActiveTradeCard key={trade.id} trade={trade} />
                      ))
                    ) : (
                      <EmptyState
                        title="No Active Trades"
                        message="Once you start a trade, you'll see it here."
                      />
                    ))}

                  {activeTab === "completed" &&
                    (!(completedTrades.length > 0) ? (
                      completedTrades.map((trade) => (
                        <CompletedTradeCard key={trade.id} trade={trade} />
                      ))
                    ) : (
                      <EmptyState
                        title="No Completed Trades"
                        message="Once you start a trade, you'll see it here."
                      />
                    ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </Container>
    </div>
  );
};

export default ViewTrade;
