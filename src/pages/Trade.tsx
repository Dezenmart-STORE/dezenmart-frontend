import { useState, useEffect, FC, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FaExchangeAlt } from "react-icons/fa";
import Container from "../components/common/Container";
import Title from "../components/common/Title";
import BannerCarousel from "../components/common/BannerCarousel";
import FloatingActionButton from "../components/common/FloatingActionButton";
import { Pen, Pen2 } from ".";
import { useWallet } from "../utils/hooks/useWallet";
import { Product, TradeTab } from "../utils/types";
import ProductListingSkeleton from "../components/trade/ProductListingSkeleton";
import IncomingOrderCard from "../components/trade/IncomingOrderCard";
import OrderSummaryModal from "../components/trade/OrderSummary";
import ProductCard from "../components/trade/ProductCard";
import ConnectWallet from "../components/trade/ConnectWallet";
import Tab from "../components/trade/Tab";

const ButtonPlaceholder: FC = () => (
  <motion.div
    className="fixed bottom-20 right-4 z-50 w-12 h-12 rounded-full bg-[#292B30]"
    animate={{ opacity: [0.5, 1, 0.5] }}
    transition={{ repeat: Infinity, duration: 1.5 }}
  />
);

const Trade = () => {
  const [activeTab, setActiveTab] = useState<TradeTab>("buy");
  const [isLoading, setIsLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showOrderSummary, setShowOrderSummary] = useState(false);
  const { isConnected, connect, isConnecting } = useWallet(); // Custom hook for wallet management

  // Sample data for products
  const products: Product[] = [
    {
      id: "1",
      name: "FemiMark",
      image: "/images/product1.svg",
      price: "₦1,200",
      quantity: "100 Cars",
      minCost: "1M - 20M NGN",
      description: "A wine Benz",
      orders: 129,
      rating: 99,
      seller: "DanBike",
    },
    {
      id: "2",
      name: "FemiMark",
      image: "/images/product2.svg",
      price: "₦1,200",
      quantity: "100 Cars",
      minCost: "1M - 20M NGN",
      description: "A white PS5 Console",
      orders: 129,
      rating: 99,
      seller: "DanBike",
    },
  ];

  // Sample data for incoming orders (sell)
  const incomingOrders: Product[] = [
    {
      id: "5",
      name: "FemiMark",
      image: "/images/product1.svg",
      price: "₦1,350",
      quantity: "35 Cars",
      minCost: "800K - 8M NGN",
      description: "A wine Benz",
      orders: 53,
      rating: 97,
      seller: "You",
      status: "Pending acceptance",
    },
  ];

  // Banner data for the carousel
  const banners = [
    {
      title: "Smart Ecommerce for",
      subtitle: "creators",
      primaryImage: Pen,
      secondaryImage: Pen2,
      backgroundColor: "#ff3b3b",
      textColor: "white",
      isUppercase: true,
    },
    {
      title: "Special Offers for",
      subtitle: "new users",
      primaryImage: Pen,
      backgroundColor: "#3b82f6",
      textColor: "white",
      isUppercase: true,
    },
    {
      title: "Smart Ecommerce for",
      subtitle: "creators",
      primaryImage: Pen,
      secondaryImage: Pen2,
      backgroundColor: "#ff3b3b",
      textColor: "white",
      isUppercase: true,
    },
    {
      title: "Special Offers for",
      subtitle: "new users",
      primaryImage: Pen,
      backgroundColor: "#3b82f6",
      textColor: "white",
      isUppercase: true,
    },
    {
      title: "Smart Ecommerce for",
      subtitle: "creators",
      primaryImage: Pen,
      secondaryImage: Pen2,
      backgroundColor: "#ff3b3b",
      textColor: "white",
      isUppercase: true,
    },
    {
      title: "Special Offers for",
      subtitle: "new users",
      primaryImage: Pen,
      backgroundColor: "#3b82f6",
      textColor: "white",
      isUppercase: true,
    },
    {
      title: "Smart Ecommerce for",
      subtitle: "creators",
      primaryImage: Pen,
      secondaryImage: Pen2,
      backgroundColor: "#ff3b3b",
      textColor: "white",
      isUppercase: true,
    },
    {
      title: "Special Offers for",
      subtitle: "new users",
      primaryImage: Pen,
      backgroundColor: "#3b82f6",
      textColor: "white",
      isUppercase: true,
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

  // Handle product selection and order summary display
  const handleBuyClick = (product: Product) => {
    if (!isConnected) {
      return;
    }
    setSelectedProduct(product);
    setShowOrderSummary(true);
  };

  // Handle order acceptance (for sellers)
  const handleAcceptOrder = (product: Product) => {
    // Implementation for accepting an order
    console.log("Order accepted:", product);
    // Logic to update order status
  };

  // Handle order rejection (for sellers)
  const handleRejectOrder = (product: Product) => {
    // Implementation for rejecting an order
    console.log("Order rejected:", product);
    // Logic to reject order
  };

  // Close order summary modal
  const handleCloseOrderSummary = () => {
    setShowOrderSummary(false);
    setSelectedProduct(null);
  };

  // Confirm order purchase
  const handleConfirmPurchase = () => {
    // Logic to process purchase
    console.log("Purchase confirmed for:", selectedProduct);
    setShowOrderSummary(false);
    setActiveTab("active");
  };

  if (!isConnected) {
    return (
      <div className="bg-Dark min-h-screen text-white">
        <Container>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            <Title text="P2P Trading" className="text-center my-8 text-3xl" />
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
          <Title text="P2P Trading" className="text-center my-8 text-3xl" />
        </motion.div>

        {/* Banner */}
        <BannerCarousel
          banners={banners}
          autoRotate={true}
          className="mb-8"
          rotationInterval={6000}
        />

        {/* Tab Navigation */}
        <div className="max-w-screen-lg mx-auto bg-[#212428] rounded-lg overflow-hidden">
          <div className="flex flex-wrap border-b border-[#292B30]">
            <Tab
              text="Buy"
              isActive={activeTab === "buy"}
              onClick={() => setActiveTab("buy")}
            />
            <Tab
              text="Sell"
              isActive={activeTab === "sell"}
              onClick={() => setActiveTab("sell")}
              count={incomingOrders.length}
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
                  {activeTab === "buy" &&
                    products.map((product) => (
                      <ProductCard
                        key={product.id}
                        product={product}
                        onBuyClick={() => handleBuyClick(product)}
                        actionType="buy"
                      />
                    ))}

                  {activeTab === "sell" &&
                    incomingOrders.map((order) => (
                      <IncomingOrderCard
                        key={order.id}
                        product={order}
                        onAccept={() => handleAcceptOrder(order)}
                        onReject={() => handleRejectOrder(order)}
                      />
                    ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </Container>

      {/* Order Summary Modal */}
      <AnimatePresence>
        {showOrderSummary && selectedProduct && (
          <OrderSummaryModal
            product={selectedProduct}
            onClose={handleCloseOrderSummary}
            onConfirm={handleConfirmPurchase}
          />
        )}
      </AnimatePresence>

      <Suspense fallback={<ButtonPlaceholder />}>
        <FloatingActionButton
          icon={<FaExchangeAlt />}
          to="/trades/viewtrades"
          label="View Trades"
          position="bottom-right"
          color="primary"
        />
      </Suspense>
    </div>
  );
};

export default Trade;
