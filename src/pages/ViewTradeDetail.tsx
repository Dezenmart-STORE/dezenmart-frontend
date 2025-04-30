import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
// import { motion } from "framer-motion";
import Container from "../components/common/Container";
import {
  TradeDetails,
  TradeTransactionInfo,
  TradeStatusType,
} from "../utils/types";
import TradeStatus from "../components/trade/status/TradeStatus";
import { toast } from "react-toastify";
import LoadingSpinner from "../components/common/LoadingSpinner";

const ViewTradeDetail = () => {
  const { tradeId } = useParams<{ tradeId: string }>();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [tradeStatus, setTradeStatus] = useState<TradeStatusType>("pending");
  const [isProcessing, setIsProcessing] = useState(false);

  // Mock data - future: from API
  const tradeDetails: TradeDetails = {
    productName: "IPHONE 16",
    productId: "trade1",
    amount: 1600000,
    quantity: 2,
    orderTime: "2025-01-24 10:34:22",
    orderNo: "23435461580011",
    paymentMethod: "CRYPTO",
    tradeType: "SELL",
    sellerId: "608021b86eda53ead327e0ea",
    buyerId: "60804386704fcfe10f451cf",
  };

  const transactionInfo: TradeTransactionInfo = {
    buyerName: "Femi Cole",
    goodRating: 88,
    completedOrders: 456,
    completionRate: 99,
    avgPaymentTime: 20,
  };

  useEffect(() => {
    const fetchTradeDetails = async () => {
      try {
        // if (tradeId) {
        //   await getOrderById(tradeId);
        // }
        // fetch from API
        // const response = await fetch(`${API_URL}/trades/${tradeId}`);
        // const data = await response.json();
        // setTradeDetails(data);

        setTimeout(() => {
          setIsLoading(false);

          if (location.search.includes("status=")) {
            const statusParam = new URLSearchParams(location.search).get(
              "status"
            );
            if (
              statusParam &&
              ["cancelled", "pending", "release", "completed"].includes(
                statusParam
              )
            ) {
              setTradeStatus(statusParam as TradeStatusType);
            }
          }
        }, 800);
      } catch (error) {
        console.error("Error fetching trade details:", error);
        toast.error("Failed to load trade details");
        setIsLoading(false);
      }
    };

    fetchTradeDetails();
  }, [tradeId]);

  const handleContactSeller = () => {
    toast.info("Opening chat with seller...");
  };

  const handleContactBuyer = () => {
    toast.info("Opening chat with buyer...");
  };

  const handleOrderDispute = () => {
    toast.info("Dispute request has been sent");
  };

  const handleReleaseNow = () => {
    setIsProcessing(true);

    // Simulate API call
    setTimeout(() => {
      setTradeStatus("completed");
      navigate(`/trades/viewtrades/${tradeId}?status=completed`, {
        replace: true,
      });
      setIsProcessing(false);
      toast.success("Trade completed successfully!");
    }, 1500);
  };

  if (isLoading) {
    return (
      <Container>
        <div className="flex flex-col items-center justify-center h-[70vh]">
          <LoadingSpinner />
          <p className="mt-4 text-lg">Loading trade details...</p>
        </div>
      </Container>
    );
  }

  return (
    <Container>
      <div className="py-6">
        {/* Demo buttons */}
        <div className="flex gap-2 mb-6 flex-wrap">
          <button
            className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded"
            onClick={() => {
              setTradeStatus("cancelled");
              navigate(`/trades/viewtrades/${tradeId}?status=cancelled`, {
                replace: true,
              });
            }}
            disabled={isProcessing}
          >
            Show Cancelled
          </button>

          <button
            className="bg-yellow-200 hover:bg-yellow-300 text-yellow-800 px-4 py-2 rounded"
            onClick={() => {
              setTradeStatus("pending");
              navigate(`/trades/viewtrades/${tradeId}?status=pending`, {
                replace: true,
              });
            }}
            disabled={isProcessing}
          >
            Show Pending
          </button>

          <button
            className="bg-blue-200 hover:bg-blue-300 text-blue-800 px-4 py-2 rounded"
            onClick={() => {
              setTradeStatus("release");
              navigate(`/trades/viewtrades/${tradeId}?status=release`, {
                replace: true,
              });
            }}
            disabled={isProcessing}
          >
            Show Release
          </button>

          <button
            className="bg-green-200 hover:bg-green-300 text-green-800 px-4 py-2 rounded"
            onClick={() => {
              setTradeStatus("completed");
              navigate(`/trades/viewtrades/${tradeId}?status=completed`, {
                replace: true,
              });
            }}
            disabled={isProcessing}
          >
            Show Completed
          </button>
        </div>

        <TradeStatus
          status={tradeStatus}
          tradeDetails={tradeDetails}
          transactionInfo={transactionInfo}
          onContactSeller={handleContactSeller}
          onContactBuyer={handleContactBuyer}
          onOrderDispute={handleOrderDispute}
          onReleaseNow={handleReleaseNow}
          orderId={tradeId}
        />
      </div>
    </Container>
  );
};

export default ViewTradeDetail;
