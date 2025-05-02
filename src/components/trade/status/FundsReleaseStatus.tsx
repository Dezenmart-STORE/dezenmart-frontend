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
import { useContractData } from "../../../utils/hooks/useContractData";
import Modal from "../../common/Modal";
import ConnectWallet from "../ConnectWallet";
import { useWallet } from "../../../utils/hooks/useWallet";

interface FundsReleaseStatusProps {
  tradeDetails: TradeDetails;
  orderDetails?: OrderDetails;
  transactionInfo: TradeTransactionInfo;
  onContactSeller?: () => void;
  onOrderDispute?: () => void;
  onConfirmDelivery?: () => void;
  orderId?: string;
}

const FundsReleaseStatus: FC<FundsReleaseStatusProps> = ({
  tradeDetails,
  transactionInfo,
  onContactSeller,
  onOrderDispute,
  onConfirmDelivery,
  orderId,
}) => {
  const [timeRemaining, setTimeRemaining] = useState({
    minutes: 9,
    seconds: 59,
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const { confirmTradeDelivery, raiseTradeDispute } = useContractData();
  const { isConnected } = useWallet();

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

  const handleConfirmDelivery = async () => {
    if (!isConnected) {
      setIsWalletModalOpen(true);
      return;
    }

    if (!orderId) {
      toast.error("Order ID is missing. Cannot confirm delivery.");
      return;
    }

    setIsProcessing(true);
    try {
      const result = await confirmTradeDelivery(orderId);

      if (!result.success) {
        throw new Error(result.message || "Failed to confirm delivery");
      }

      if (onConfirmDelivery) {
        onConfirmDelivery();
      }

      toast.success(
        "Delivery confirmed successfully! Funds released to seller."
      );
    } catch (error: any) {
      console.error("Error during delivery confirmation:", error);
      toast.error(
        error.message || "Failed to confirm delivery. Please try again."
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDispute = async () => {
    if (!isConnected) {
      setIsWalletModalOpen(true);
      return;
    }

    if (!orderId) {
      toast.error("Order ID is missing. Cannot raise dispute.");
      return;
    }

    setIsProcessing(true);
    try {
      const result = await raiseTradeDispute(
        orderId,
        "Issue with received item"
      );

      if (!result.success) {
        throw new Error(result.message || "Failed to raise dispute");
      }

      if (onOrderDispute) {
        onOrderDispute();
      }

      toast.success(
        "Dispute raised successfully! Admin will review your case."
      );
    } catch (error: any) {
      console.error("Error raising dispute:", error);
      toast.error(
        error.message || "Failed to raise dispute. Please try again."
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleWalletConnected = (success: boolean) => {
    setIsWalletModalOpen(false);
  };

  return (
    <>
      <BaseStatus
        statusTitle="Funds Release"
        statusDescription="The buyer has confirmed payment for this order. Please release the funds."
        statusAlert={
          <StatusAlert
            icon={<BsShieldExclamation size={18} />}
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
                onClick={handleDispute}
                disabled={isProcessing}
              />
            )}

            <Button
              title={
                isProcessing ? (
                  <div className="flex items-center">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Processing...
                  </div>
                ) : (
                  "Confirm Delivery"
                )
              }
              className={`w-fit text-white text-sm px-6 py-3 border-none rounded transition-colors ${
                isProcessing
                  ? "bg-gray-600 cursor-not-allowed"
                  : "bg-Red hover:bg-[#e02d37]"
              }`}
              onClick={handleConfirmDelivery}
              disabled={isProcessing}
            />
          </div>
        }
      />

      <Modal
        isOpen={isWalletModalOpen}
        onClose={() => setIsWalletModalOpen(false)}
        title="Connect Wallet"
        maxWidth="md:max-w-lg"
      >
        <ConnectWallet
          showAlternatives={true}
          onTransactionComplete={handleWalletConnected}
        />
      </Modal>
    </>
  );
};

export default FundsReleaseStatus;
