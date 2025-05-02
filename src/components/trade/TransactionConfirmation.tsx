// src/components/trade/TransactionConfirmation.tsx

import { FC, useState, useEffect } from "react";
import { FaSpinner, FaCheckCircle, FaTimesCircle } from "react-icons/fa";
import { motion } from "framer-motion";
import { useContractData } from "../../utils/hooks/useContractData";

interface TransactionConfirmationProps {
  contractAddress: string;
  amount: string;
  isUSDT?: boolean;
  usdtAddress?: string;
  onComplete: (success: boolean) => void;
}

const TransactionConfirmation: FC<TransactionConfirmationProps> = ({
  contractAddress,
  amount,
  isUSDT = false,
  usdtAddress,
  onComplete,
}) => {
  const { sendFundsToEscrow, isTransactionPending, transactionHash } =
    useContractData();
  const [status, setStatus] = useState<"pending" | "success" | "error">(
    "pending"
  );
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const handleTransaction = async () => {
      setIsProcessing(true);
      try {
        const result = await sendFundsToEscrow(
          contractAddress,
          amount,
          isUSDT,
          usdtAddress
        );
        if (result.success) {
          setStatus("success");
          onComplete(true);
        } else {
          setStatus("error");
          onComplete(false);
        }
      } catch (error) {
        console.error("Transaction error:", error);
        setStatus("error");
        onComplete(false);
      } finally {
        setIsProcessing(false);
      }
    };

    handleTransaction();
  }, [
    contractAddress,
    amount,
    isUSDT,
    usdtAddress,
    sendFundsToEscrow,
    onComplete,
  ]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="max-w-md mx-auto bg-[#212428] p-6 md:p-8 rounded-lg shadow-lg"
    >
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4">
          {status === "pending" && (
            <FaSpinner className="text-4xl text-yellow-500 animate-spin" />
          )}
          {status === "success" && (
            <FaCheckCircle className="text-4xl text-green-500" />
          )}
          {status === "error" && (
            <FaTimesCircle className="text-4xl text-red-500" />
          )}
        </div>
        <h2 className="text-xl font-semibold mb-2">
          {status === "pending" && "Confirming Transaction"}
          {status === "success" && "Transaction Complete"}
          {status === "error" && "Transaction Failed"}
        </h2>
        <p className="text-gray-400 text-sm">
          {status === "pending" &&
            `Sending ${amount} ${isUSDT ? "USDT" : "ETH"} to escrow...`}
          {status === "success" &&
            `Successfully sent ${amount} ${isUSDT ? "USDT" : "ETH"} to escrow.`}
          {status === "error" &&
            "There was an error processing your transaction."}
        </p>
      </div>

      <div className="bg-[#2A2D35] p-4 rounded-lg mb-4">
        <p className="text-gray-400 text-sm">Contract Address</p>
        <p className="text-white font-mono text-sm break-all">
          {contractAddress}
        </p>
      </div>

      <div className="bg-[#2A2D35] p-4 rounded-lg mb-4">
        <p className="text-gray-400 text-sm">Amount</p>
        <p className="text-white">
          {amount} {isUSDT ? "USDT" : "ETH"}
        </p>
      </div>

      {transactionHash && (
        <div className="bg-[#2A2D35] p-4 rounded-lg mb-4">
          <p className="text-gray-400 text-sm">Transaction Hash</p>
          <p className="text-white font-mono text-sm break-all">
            {transactionHash}
          </p>
        </div>
      )}

      {status === "error" && (
        <button
          onClick={() => window.location.reload()}
          className="w-full py-3 bg-Red hover:bg-[#e02d37] text-white rounded transition-colors mt-4"
        >
          Try Again
        </button>
      )}
    </motion.div>
  );
};

export default TransactionConfirmation;
