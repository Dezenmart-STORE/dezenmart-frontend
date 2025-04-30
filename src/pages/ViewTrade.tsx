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
import { useNavigate } from "react-router-dom";

const ViewTrade = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TradeTab>("active");
  const [isLoading, setIsLoading] = useState(true);
  const { isConnected } = useWallet();

  // Sample data for active trades
  const activeTrades: Product[] = [
    {
      _id: "68082f7a7d3f057ab0fafd5c",
      name: "Wood Carving",
      description: "Neat carved wood art works",
      price: 20000,
      category: "Art Work",
      seller: "680821b06eda53ead327e0ea",
      images: [
        "images-1745366906480-810449189.jpeg",
        "images-1745366906494-585992412.jpeg",
      ],
      isSponsored: false,
      isActive: true,
      createdAt: "2025-04-23T00:08:26.519Z",
      updatedAt: "2025-04-23T00:08:26.519Z",
    },
  ];

  // Sample data for completed trades
  const completedTrades: Product[] = [
    {
      _id: "68082c3efae576e05502c04b",
      name: "Test Product",
      description: "Testing product endpoint",
      price: 20000,
      category: "Item",
      seller: "680821b06eda53ead327e0ea",
      images: [],
      isSponsored: false,
      isActive: true,
      createdAt: "2025-04-22T23:54:38.445Z",
      updatedAt: "2025-04-22T23:54:38.445Z",
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
          <ConnectWallet showAlternatives={true} />
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
              // count={completedTrades.length}
              count={0}
              className="w-full"
            />
          </div>

          {/* Content Area */}
          <div className="py-4">
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
                        <div
                          key={trade._id}
                          onClick={() =>
                            navigate(
                              `/trades/viewtrades/${trade._id}?status=pending`
                            )
                          }
                        >
                          <ActiveTradeCard />
                        </div>
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
                        <div
                          key={trade._id}
                          onClick={() =>
                            navigate(
                              `/trades/viewtrades/${trade._id}?status=completed`
                            )
                          }
                        >
                          <CompletedTradeCard
                          // trade={trade}
                          />
                        </div>
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
