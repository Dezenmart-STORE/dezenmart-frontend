import { useState, useEffect } from "react";
import { FaExchangeAlt, FaSpinner } from "react-icons/fa";
import { HiMiniXMark, HiExclamationTriangle } from "react-icons/hi2";
import { useCurrencyConverter } from "../../utils/hooks/useCurrencyConverter";
import { useSwap } from "../../utils/hooks/useSwap";

interface SwapConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  fromToken: string;
  toToken: string;
  usdAmount: string;
  productName: string;
  loading?: boolean;
}

const SwapConfirmationModal = ({
  isOpen,
  onClose,
  onConfirm,
  fromToken,
  toToken,
  usdAmount,
  productName,
  loading = false,
}: SwapConfirmationModalProps) => {
  const { convertPrice, formatPrice } = useCurrencyConverter();
  const { getSwapQuote } = useSwap();
  const [quote, setQuote] = useState<any>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);

  const fromAmount = convertPrice(parseFloat(usdAmount), "FIAT", fromToken);
  const toAmount = convertPrice(parseFloat(usdAmount), "FIAT", toToken);

  useEffect(() => {
    if (isOpen && fromToken && toToken && usdAmount) {
      setQuoteLoading(true);
      getSwapQuote({
        fromToken,
        toToken,
        amount: usdAmount,
        slippageTolerance: 1,
      })
        .then(setQuote)
        .finally(() => setQuoteLoading(false));
    }
  }, [isOpen, fromToken, toToken, usdAmount, getSwapQuote]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-Dark border border-Red/20 rounded-lg max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-white">Swap Required</h3>
          <button
            onClick={onClose}
            disabled={loading}
            className="text-gray-400 hover:text-white"
          >
            <HiMiniXMark className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="bg-yellow-500/10 border border-yellow-500/30 p-3 rounded-md">
            <div className="flex items-start gap-2">
              <HiExclamationTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-yellow-200">
                <p className="font-medium">Payment Token Mismatch</p>
                <p>
                  "{productName}" requires payment in {toToken}, but you have{" "}
                  {fromToken} selected.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-[#1a1d21] rounded-md">
              <div>
                <p className="text-sm text-gray-400">From</p>
                <p className="text-white font-medium">
                  {formatPrice(fromAmount, fromToken)}
                </p>
              </div>
              <FaExchangeAlt className="text-Red mx-3" />
              <div>
                <p className="text-sm text-gray-400">To</p>
                <p className="text-white font-medium">
                  {formatPrice(toAmount, toToken)}
                </p>
              </div>
            </div>

            {quoteLoading ? (
              <div className="flex items-center justify-center p-4">
                <FaSpinner className="animate-spin mr-2" />
                <span className="text-gray-400">Getting swap quote...</span>
              </div>
            ) : quote ? (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Expected output:</span>
                  <span className="text-white">
                    {parseFloat(quote.estimatedOutput).toFixed(4)} {toToken}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Minimum received:</span>
                  <span className="text-white">
                    {parseFloat(quote.minimumOutput).toFixed(4)} {toToken}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Price impact:</span>
                  <span
                    className={`${
                      quote.priceImpact > 5 ? "text-red-400" : "text-green-400"
                    }`}
                  >
                    {quote.priceImpact.toFixed(2)}%
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-center p-4 text-red-400">
                Failed to get swap quote
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-4">
            <button
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-2 border border-gray-600 text-gray-300 rounded-md hover:bg-gray-800 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={loading || quoteLoading || !quote}
              className="flex-1 px-4 py-2 bg-Red text-white rounded-md hover:bg-Red/80 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <FaSpinner className="animate-spin" />
                  Swapping...
                </>
              ) : (
                "Swap & Purchase"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SwapConfirmationModal;
