import { useState } from "react";
import { FaWallet, FaSpinner } from "react-icons/fa";
import { Product } from "../../../utils/types";
import { useWallet } from "../../../context/WalletContext";

interface PurchaseSectionProps {
  product?: Product;
}

const PurchaseSection = ({ product }: PurchaseSectionProps) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { isConnected, connectMetaMask, balance, account } = useWallet();
  const handleConnectWallet = async () => {
    setIsProcessing(true);
    setError(null);

    try {
      await connectMetaMask();
    } catch (err: any) {
      console.error("Error connecting wallet:", err);
      setError(`Failed to connect wallet: ${err.message || "Unknown error"}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePurchase = async () => {
    if (!product) return;

    setIsProcessing(true);
    setError(null);

    try {
      // Simulating purchase process
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // In a real implementation this would send a transaction
      // Show success notification or redirect
    } catch (err) {
      setError(`Transaction failed: ${(err as string) || "Please try again"}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="bg-[#212428] p-4 md:p-6 space-y-4">
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-2 rounded-md text-sm mb-3">
          {error}
        </div>
      )}

      <div className="flex gap-3 w-full">
        <button
          className="bg-Red text-white py-3 px-6 md:px-10 font-bold flex-1 rounded-md transition-all hover:bg-[#d52a33] disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:bg-Red flex items-center justify-center gap-2"
          onClick={isConnected ? handlePurchase : handleConnectWallet}
          disabled={isProcessing || !product}
        >
          {isProcessing ? (
            <span className="flex items-center justify-center gap-2">
              <FaSpinner className="animate-spin text-lg" />
              Processing...
            </span>
          ) : (
            <>
              <FaWallet className="text-lg" />
              <span>{isConnected ? "Buy Now" : "Connect wallet to buy"}</span>
            </>
          )}
        </button>
      </div>

      {isConnected && (
        <div className="text-center text-xs text-gray-400">
          {balance ? `Balance: ${balance}` : "Checking balance..."} ·{" "}
          {account
            ? `${account.substring(0, 6)}...${account.substring(
                account.length - 4
              )}`
            : ""}
        </div>
      )}
    </div>
  );
};

export default PurchaseSection;
