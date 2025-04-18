import { useState } from "react";
import { FaWallet } from "react-icons/fa";

const PurchaseSection = () => {
  const [isProcessing, setIsProcessing] = useState(false);

  const handlePurchase = () => {
    setIsProcessing(true);
    // future: API call
    setTimeout(() => {
      setIsProcessing(false);
      // Show success notification
    }, 1500);
  };

  return (
    <div className="bg-[#212428] p-4 md:p-6 flex flex-col md:flex-row justify-between items-center gap-4">
      <div className="flex gap-3 w-full">
        <button
          className="bg-Red text-white py-3 px-6 md:px-10 font-bold flex-1 rounded-md transition-all hover:bg-[#d52a33] disabled:opacity-70 flex items-center justify-center gap-2"
          onClick={handlePurchase}
          disabled={isProcessing}
        >
          <FaWallet className="text-lg" />
          <span>
            {isProcessing ? "Processing..." : "Connect wallet to buy"}
          </span>
        </button>
        {/* <button className="border border-Red text-Red py-3 px-6 flex-1 rounded-md transition-all hover:bg-Red/10 flex items-center justify-center gap-2">
          <FaShoppingCart className="text-lg" />
          <span className="hidden sm:inline">Add to Cart</span>
        </button> */}
      </div>
    </div>
  );
};

export default PurchaseSection;
