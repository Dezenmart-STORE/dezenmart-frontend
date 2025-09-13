import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import Button from "./Button";
import Modal from "./Modal";
import {
  FaSpinner,
  FaInfoCircle,
  FaExchangeAlt,
  FaRoute,
  FaCheckCircle,
  FaExclamationTriangle,
  FaArrowDown,
  FaClock,
  FaGasPump,
  FaShieldAlt,
} from "react-icons/fa";
import { formatUnits, parseUnits } from "viem";
import { useWeb3 } from "../../context/Web3Context";
import { STABLE_TOKENS } from "../../utils/config/web3.config";

interface SwapConfirmationModalProps {
  isOpen: boolean;
  fromToken: string;
  toToken: string;
  amountIn: number;
  onConfirm: () => Promise<void>;
  onClose: () => void;
  slippage?: number;
  recipientAddress?: string;
}

interface QuoteState {
  data: any | null;
  isLoading: boolean;
  error: string | null;
  lastUpdated: number;
}

// Removed SwapExecutionState - will use mento.isSwapping, mento.isApproving, mento.error

const QUOTE_REFRESH_INTERVAL = 15000; // 15 seconds
const QUOTE_EXPIRY_WARNING = 5000; // Show warning when 5s left

const SwapConfirmationModal: React.FC<SwapConfirmationModalProps> = ({
  isOpen,
  fromToken,
  toToken,
  amountIn,
  onConfirm,
  onClose,
  slippage = 1,
  recipientAddress,
}) => {
  const { mento, wallet } = useWeb3();

  // State management
  const [quote, setQuote] = useState<QuoteState>({
    data: null,
    isLoading: false,
    error: null,
    lastUpdated: 0,
  });

  // Removed execution state, using mento.isSwapping, mento.isApproving, mento.error instead

  const [countdown, setCountdown] = useState(15);
  const [mounted, setMounted] = useState(false);

  // Refs
  const quoteIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Memoized token data
  const fromTokenData = useMemo(
    () => STABLE_TOKENS.find((t) => t.symbol === fromToken),
    [fromToken]
  );

  const toTokenData = useMemo(
    () => STABLE_TOKENS.find((t) => t.symbol === toToken),
    [toToken]
  );

  // Fetch quote with error handling and retry logic
    const fetchQuote = useCallback(
      async (retryCount = 0): Promise<void> => {
        if (!mento?.isReady || amountIn <= 0 || !fromTokenData || !toTokenData) {
          return;
        }

        // Cancel previous request
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }
        abortControllerRef.current = new AbortController();

        setQuote((prev) => ({ ...prev, isLoading: true, error: null }));

        try {
          const quoteData = await mento.getSwapQuote(
            fromToken,
            toToken,
            amountIn,
            slippage / 100
          );

          if (!abortControllerRef.current?.signal.aborted) {
            setQuote({
              data: quoteData,
              isLoading: false,
              error: null,
              lastUpdated: Date.now(),
            });
            setCountdown(15); // Reset countdown
          }
        } catch (error: any) {
          if (error.name === "AbortError") return;

          const errorMessage = error.message || "Failed to get quote";

          // Retry logic for network errors
          if (
            retryCount < 2 &&
            (errorMessage.includes("network") ||
              errorMessage.includes("connection") ||
              errorMessage.includes("timeout"))
          ) {
            setTimeout(() => fetchQuote(retryCount + 1), 1000 * (retryCount + 1));
            return;
          }

          if (!abortControllerRef.current?.signal.aborted) {
            setQuote((prev) => ({
              ...prev,
              isLoading: false,
              error: errorMessage,
            }));
          }
        }
      },
      [mento, amountIn, fromToken, toToken, slippage, fromTokenData, toTokenData]
    );

  // Setup quote fetching and intervals
    useEffect(() => {
      setMounted(true);

      if (isOpen && mento?.isReady) {
        fetchQuote();

        // Setup quote refresh interval
        quoteIntervalRef.current = setInterval(
          fetchQuote,
          QUOTE_REFRESH_INTERVAL
        );

        return () => {
          if (quoteIntervalRef.current) {
            clearInterval(quoteIntervalRef.current);
          }
        };
      }
    }, [isOpen, mento?.isReady, fetchQuote]);

  // Countdown timer
  useEffect(() => {
    if (!isOpen || !quote.data || quote.isLoading) return;

    countdownIntervalRef.current = setInterval(() => {
      setCountdown((prev) => {
        const timeElapsed = (Date.now() - quote.lastUpdated) / 1000;
        const remaining = Math.max(0, 15 - timeElapsed);

        if (remaining <= 0) {
          fetchQuote(); // Auto-refresh when expired
          return 15;
        }

        return Math.ceil(remaining);
      });
    }, 1000);

    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, [
    isOpen,
    quote.data,
    quote.isLoading,
    quote.lastUpdated,
    //   fetchQuote
  ]);

  // Handle modal close
  const handleClose = useCallback(() => {
    // Check mento.isSwapping directly to prevent closing during transaction
    if (mento?.isSwapping) {
      return;
    }

    // Cleanup
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Removed execution state reset

    setQuote({
      data: null,
      isLoading: false,
      error: null,
      lastUpdated: 0,
    });

    onClose();
  }, [onClose, mento?.isSwapping]); // Added mento.isSwapping to dependency array

  // Execute swap with proper error handling
  const handleConfirm = useCallback(async () => {
    if (!mento?.isReady || !quote.data) return; // Removed execution.stage check

    try {
      // State is now managed by useMento internally
      const result = await mento.performSwap({
        fromSymbol: fromToken,
        toSymbol: toToken,
        amount: amountIn,
        slippageTolerance: slippage / 100,
        recipientAddress,
      });

      // On successful swap, call parent onConfirm and close modal
      await onConfirm();
      setTimeout(() => {
        handleClose();
      }, 3000);
    } catch (error: any) {
      // Error handled by useMento, which updates mento.error
      // No need to set local execution state for error
    }
  }, [
    mento,
    quote.data,
    fromToken,
    toToken,
    amountIn,
    slippage,
    recipientAddress,
    onConfirm,
    handleClose, // Added handleClose to dependency array
  ]);

  // Computed values
  const isQuoteExpired = countdown <= 0;
  const isQuoteExpiring = countdown <= 5 && countdown > 0;
  const isLoading = quote.isLoading || mento?.isSwapping; // Use mento.isSwapping directly
  const canConfirm =
    quote.data &&
    !isQuoteExpired &&
    !mento?.isSwapping &&
    !quote.error &&
    !mento?.error; // Use mento.isSwapping and mento.error

  const minReceive = useMemo(() => {
    if (!quote.data?.minAmountOut) return null;
    return parseFloat(quote.data.minAmountOut);
  }, [quote.data?.minAmountOut]);

  const priceImpact = useMemo(() => {
    if (!quote.data?.priceImpact) return null;
    return parseFloat(quote.data.priceImpact);
  }, [quote.data?.priceImpact]);

  // Format number utility
  const formatNumber = useCallback((value: number, decimals = 6) => {
    return value.toLocaleString("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: decimals,
    });
  }, []);

  if (!mounted || !isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Confirm Swap"
      maxWidth="md:max-w-xl"
    >
      <div className="space-y-6">
        {/* Quote Status Bar */}
        <AnimatePresence mode="wait">
          {quote.data && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={`flex items-center justify-between p-4 rounded-xl border transition-colors ${
                isQuoteExpired
                  ? "bg-red-900/20 border-red-500/30 text-red-300"
                  : isQuoteExpiring
                  ? "bg-yellow-900/20 border-yellow-500/30 text-yellow-300"
                  : "bg-green-900/20 border-green-500/30 text-green-300"
              }`}
            >
              <div className="flex items-center gap-3">
                {isQuoteExpired ? (
                  <FaExclamationTriangle className="w-4 h-4" />
                ) : (
                  <FaClock className="w-4 h-4" />
                )}
                <div>
                  <span className="text-sm font-medium">
                    {isQuoteExpired
                      ? "Quote Expired"
                      : `Quote expires in ${countdown}s`}
                  </span>
                  {quote.data.exchangeRate && (
                    <div className="text-xs opacity-80 mt-1">
                      1 {fromToken} ={" "}
                      {formatNumber(parseFloat(quote.data.exchangeRate), 6)}{" "}
                      {toToken}
                    </div>
                  )}
                </div>
              </div>
              <Button
                title="Refresh"
                onClick={() => fetchQuote()}
                disabled={quote.isLoading}
                className="text-xs px-3 py-1 bg-transparent hover:bg-current/10 border border-current/30 rounded-lg"
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Swap Preview Card */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 space-y-4 border border-gray-700/50">
          {/* From Token */}
          <div className="flex items-center justify-between p-4 bg-gray-700/30 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                {fromToken.charAt(0)}
              </div>
              <div>
                <div className="text-sm text-gray-400">From</div>
                <div className="font-medium text-white">{fromToken}</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-white">
                {formatNumber(amountIn, 4)}
              </div>
              <div className="text-sm text-gray-400">
                ${formatNumber(amountIn * 1, 2)}{" "}
                {/* Add price conversion here */}
              </div>
            </div>
          </div>

          {/* Swap Arrow */}
          <div className="flex justify-center">
            <motion.div
              animate={{ rotate: isLoading ? 360 : 0 }}
              transition={{
                duration: 2,
                repeat: isLoading ? Infinity : 0,
                ease: "linear",
              }}
              className="w-10 h-10 bg-gradient-to-r from-red-500 to-red-600 rounded-full flex items-center justify-center"
            >
              <FaArrowDown className="w-4 h-4 text-white" />
            </motion.div>
          </div>

          {/* To Token */}
          <div className="flex items-center justify-between p-4 bg-gray-700/30 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center text-white font-bold">
                {toToken.charAt(0)}
              </div>
              <div>
                <div className="text-sm text-gray-400">To (estimated)</div>
                <div className="font-medium text-white">{toToken}</div>
              </div>
            </div>
            <div className="text-right">
              {quote.data ? (
                <>
                  <div className="text-2xl font-bold text-white">
                    {formatNumber(parseFloat(quote.data.amountOut), 4)}
                  </div>
                  <div className="text-sm text-gray-400">
                    ${formatNumber(parseFloat(quote.data.amountOut) * 1, 2)}{" "}
                    {/* Add price conversion */}
                  </div>
                </>
              ) : quote.isLoading ? (
                <div className="flex items-center gap-2 text-gray-400">
                  <FaSpinner className="animate-spin w-4 h-4" />
                  <span className="text-sm">Calculating...</span>
                </div>
              ) : (
                <div className="text-gray-500">--</div>
              )}
            </div>
          </div>

          {/* Route Visualization */}
          {quote.data?.route && quote.data.route.length > 2 && (
            <div className="flex items-center justify-center gap-2 py-2">
              <FaRoute className="w-3 h-3 text-gray-500" />
              <div className="flex items-center gap-1">
                {quote.data.route.map((token: string, index: number) => (
                  <React.Fragment key={token + index}>
                    <span className="text-xs text-gray-400 px-2 py-1 bg-gray-700 rounded">
                      {token}
                    </span>
                    {index < quote.data.route.length - 1 && (
                      <FaArrowDown className="w-2 h-2 text-gray-500 rotate-90" />
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Transaction Details */}
        {quote.data && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="bg-gray-800/30 rounded-xl p-4 space-y-3"
          >
            <h4 className="font-medium text-white flex items-center gap-2">
              <FaInfoCircle className="w-4 h-4 text-blue-400" />
              Transaction Details
            </h4>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Slippage tolerance:</span>
                <span className="text-white font-medium">{slippage}%</span>
              </div>

              {priceImpact !== null && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Price impact:</span>
                  <span
                    className={`font-medium ${
                      priceImpact > 5
                        ? "text-red-400"
                        : priceImpact > 1
                        ? "text-yellow-400"
                        : "text-green-400"
                    }`}
                  >
                    {priceImpact.toFixed(2)}%
                  </span>
                </div>
              )}

              {minReceive !== null && (
                <div className="flex justify-between col-span-2">
                  <span className="text-gray-400">Minimum received:</span>
                  <span className="text-white font-medium">
                    {formatNumber(minReceive, 6)} {toToken}
                  </span>
                </div>
              )}

              {quote.data.gasEstimate && (
                <div className="flex justify-between col-span-2">
                  <span className="text-gray-400 flex items-center gap-1">
                    <FaGasPump className="w-3 h-3" />
                    Estimated gas:
                  </span>
                  <span className="text-white font-medium">
                    {quote.data.gasEstimate} CELO
                  </span>
                </div>
              )}
            </div>

            {/* Recipient Address */}
            {recipientAddress && (
              <div className="pt-3 border-t border-gray-700">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Recipient:</span>
                  <span className="text-white font-mono text-xs">
                    {recipientAddress.slice(0, 6)}...
                    {recipientAddress.slice(-4)}
                  </span>
                </div>
              </div>
            )}

            {/* Security Notice */}
            <div className="flex items-start gap-2 p-3 bg-blue-900/20 border border-blue-500/20 rounded-lg mt-4">
              <FaShieldAlt className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-blue-300 space-y-1">
                <p>• Swap executed through Mento Protocol</p>
                <p>• Transaction is irreversible once confirmed</p>
                <p>• Gas fees are paid in CELO</p>
                {quote.data.route?.length > 2 && (
                  <p>• Multi-hop routing for optimal rates</p>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* Error Display */}
        {quote.error && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-red-900/20 border border-red-500/30 rounded-xl p-4"
          >
            <div className="flex items-start gap-3">
              <FaExclamationTriangle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-red-400 font-medium">
                  Unable to get swap quote
                </p>
                <p className="text-red-300/80 text-sm mt-1">{quote.error}</p>
                <Button
                  title="Retry"
                    onClick={() => fetchQuote()}
                  className="mt-3 text-xs px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg"
                />
              </div>
            </div>
          </motion.div>
        )}

        {/* Execution State Display */}
        {mento?.isSwapping && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`rounded-xl p-4 border ${
              mento?.error
                ? "bg-red-900/20 border-red-500/30"
                : "bg-blue-900/20 border-blue-500/30"
            }`}
          >
            <div className="flex items-center gap-3">
              {mento?.error ? (
                <FaExclamationTriangle className="w-5 h-5 text-red-400" />
              ) : (
                <FaSpinner className="w-5 h-5 text-blue-400 animate-spin" />
              )}

              <div className="flex-1">
                <div
                  className={`font-medium ${
                    mento?.error ? "text-red-400" : "text-blue-400"
                  }`}
                >
                  {mento?.error ? "Swap failed" : "Executing swap..."}
                </div>

                {mento?.error && (
                  <div className="text-sm text-red-300 mt-1">
                    {mento?.error}
                  </div>
                )}

                {mento?.isSwapping && (
                  <div className="text-sm text-gray-400 mt-1">
                    Step {mento.currentStep} of {mento.totalSteps}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 pt-2">
          <Button
            title="Cancel"
            onClick={handleClose}
            disabled={mento?.isSwapping}
            className="flex-1 bg-transparent hover:bg-gray-700/50 text-gray-300 hover:text-white text-sm px-4 py-3 border border-gray-600 hover:border-gray-500 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          />

          <Button
            title={
              mento?.isSwapping ? (
                <div className="flex items-center justify-center gap-2">
                  <FaSpinner className="animate-spin w-4 h-4" />
                  <span>
                    {mento?.isSwapping ? "Swapping..." : "Approving..."}
                  </span>
                </div>
              ) : isQuoteExpired ? (
                "Get New Quote"
              ) : (
                "Confirm Swap"
              )
            }
            onClick={isQuoteExpired ? () => fetchQuote() : handleConfirm}
            // onClick={handleConfirm}
            disabled={!canConfirm || isLoading}
            className={`flex-1 ${
              mento?.isSwapping
                ? "bg-blue-600 hover:bg-blue-700"
                : isQuoteExpired
                ? "bg-yellow-600 hover:bg-yellow-700"
                : "bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600"
            } text-white text-sm px-4 py-3 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg`}
          />
        </div>
      </div>
    </Modal>
  );
};

export default SwapConfirmationModal;
