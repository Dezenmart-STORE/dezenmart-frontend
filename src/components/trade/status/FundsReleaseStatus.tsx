import { FC, useState, useEffect } from "react";
import {
  OrderDetails,
  TradeDetails,
  TradeTransactionInfo,
} from "../../../utils/types";
import BaseStatus from "./BaseStatus";
import StatusAlert from "./StatusAlert";
import Button from "../../common/Button";
import { BsShieldExclamation } from "react-icons/bs";
import { toast } from "react-toastify";
import { useTradeService } from "../../../utils/services/tradeService";

interface FundsReleaseStatusProps {
  tradeDetails: TradeDetails;
  orderDetails?: OrderDetails;
  transactionInfo: TradeTransactionInfo;
  onContactSeller?: () => void;
  onOrderDispute?: () => void;
  onReleaseNow?: () => void;
  orderId?: string;
}

const FundsReleaseStatus: FC<FundsReleaseStatusProps> = ({
  tradeDetails,
  //   orderDetails,
  transactionInfo,
  onContactSeller,
  onOrderDispute,
  onReleaseNow,
  orderId,
}) => {
  const [timeRemaining, setTimeRemaining] = useState({
    minutes: 9,
    seconds: 59,
  });
  const [isCreatingTrade, setIsCreatingTrade] = useState(false);
  const { createTrade } = useTradeService();

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev.seconds > 0) return { ...prev, seconds: prev.seconds - 1 };
        if (prev.minutes > 0) return { minutes: prev.minutes - 1, seconds: 59 };
        clearInterval(timer);
        return { minutes: 0, seconds: 0 };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleReleaseNow = async () => {
    try {
      setIsCreatingTrade(true);
      const tradeResponse = await createTrade({
        orderId: orderId || "",
        seller: tradeDetails.sellerId || "",
        buyer: tradeDetails.buyerId || "",
        amount: tradeDetails.amount || 0,
        status: "completed",
      });

      if (!tradeResponse.ok) {
        throw new Error(
          tradeResponse.data?.message || "Failed to complete trade"
        );
      }

      toast.success("Trade completed successfully!");
      if (onReleaseNow) onReleaseNow();
    } catch (error) {
      console.error("Error during release process:", error);
      toast.error("Failed to complete trade. Please try again.");
    } finally {
      setIsCreatingTrade(false);
    }
  };

  return (
    <BaseStatus
      statusTitle="Funds Release"
      statusDescription="The buyer has confirmed payment for this order. Please release the funds."
      statusAlert={
        <StatusAlert
          icon={<BsShieldExclamation size={20} className="text-yellow-600" />}
          message="To ensure the safety of your funds, please verify the real name of the payer: Femi Cole"
          type="warning"
        />
      }
      tradeDetails={tradeDetails}
      transactionInfo={transactionInfo}
      contactLabel="Contact Buyer"
      onContact={onContactSeller}
      showTimer={true}
      timeRemaining={timeRemaining}
      actionButtons={
        <div className="w-full flex justify-evenly flex-row flex-wrap gap-4">
          {onOrderDispute && (
            <Button
              title="Order Dispute?"
              className="w-fit bg-transparent hover:bg-gray-700 text-white text-sm px-6 py-3 border border-gray-600 rounded transition-colors"
              onClick={onOrderDispute}
              disabled={isCreatingTrade}
            />
          )}

          <Button
            title={
              isCreatingTrade ? (
                <div className="flex items-center">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Processing...
                </div>
              ) : (
                "Release Now"
              )
            }
            className={`w-fit text-white text-sm px-6 py-3 border-none rounded transition-colors ${
              isCreatingTrade
                ? "bg-gray-600 cursor-not-allowed"
                : "bg-Red hover:bg-[#e02d37]"
            }`}
            onClick={handleReleaseNow}
            disabled={isCreatingTrade}
          />
        </div>
      }
    />
  );
};

export default FundsReleaseStatus;
