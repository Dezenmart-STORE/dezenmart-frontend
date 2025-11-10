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
  FaRoute,
  FaExclamationTriangle,
  FaArrowDown,
  FaClock,
  FaGasPump,
  FaShieldAlt,
} from "react-icons/fa";
import { useWeb3 } from "../../context/Web3Context";
import { STABLE_TOKENS } from "../../utils/config/web3.config";
import { useSnackbar } from "../../context/SnackbarContext";

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

interface QuoteData {
  amountOut?: string;
  outputAmount?: string;
  priceImpact?: number | string;
  estimatedGas?: string;
  gasEstimate?: string;
  route?: string[];
  exchangeRate?: string;
  minAmountOut?: string;
  fees?: {
    networkFee?: string;
    protocolFee?: string;
  };
  [key: string]: unknown;
}

interface QuoteState {
  data: QuoteData | null;
  isLoading: boolean;
  error: string | null;
  lastUpdated: number;
}

const QUOTE_REFRESH_INTERVAL = 10000; // 10 seconds - shorter for better security

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
  const { uniswap } = useWeb3();
  const { showSnackbar } = useSnackbar();
  // State management
  const [quote, setQuote] = useState<QuoteState>({
    data: null,
    isLoading: false,
    error: null,
    lastUpdated: 0,
  });

  const [countdown, setCountdown] = useState(10);
  const [mounted, setMounted] = useState(false);

  // Refs
  const quoteIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // token data
  const fromTokenData = useMemo(
    () => STABLE_TOKENS.find((t) => t.symbol === fromToken),
    [fromToken]
  );

  const toTokenData = useMemo(
    () => STABLE_TOKENS.find((t) => t.symbol === toToken),
    [toToken]
  );

  // Fetch quote
  const fetchQuote = useCallback(
    async (retryCount = 0): Promise<void> => {
      if (
        !uniswap?.isReady ||
        amountIn <= 0 ||
        !fromTokenData ||
        !toTokenData
      ) {
        return;
      }

      // Cancel previous request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      setQuote((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        const quoteData = await uniswap.getSwapQuote(
          fromToken,
          toToken,
          amountIn,
          slippage / 100
        );

        if (!abortControllerRef.current?.signal.aborted) {
          setQuote({
            data: quoteData as unknown as QuoteData,
            isLoading: false,
            error: null,
            lastUpdated: Date.now(),
          });
          setCountdown(10); // Reset countdown
        }
      } catch (error: unknown) {
        const err = error as Error;
        if (err.name === "AbortError") return;

        let errorMessage = err.message || "Failed to get quote";

        // Make errors more user-friendly
        if (errorMessage.includes("network") || errorMessage.includes("connection")) {
          errorMessage = "Network connection issue. Please check your internet and try again.";
        } else if (errorMessage.includes("timeout")) {
          errorMessage = "Request timed out. The network may be congested. Please try again.";
        } else if (errorMessage.includes("liquidity")) {
          errorMessage = "Insufficient liquidity for this trade. Try a smaller amount or different tokens.";
        } else if (errorMessage.includes("invalid") || errorMessage.includes("unsupported")) {
          errorMessage = "This token pair is not currently supported. Please select different tokens.";
        } else if (errorMessage.includes("initialization")) {
          errorMessage = "Swap service is starting up. Please wait a moment and try again.";
        }

        if (
          retryCount < 2 &&
          (err.message?.includes("network") ||
            err.message?.includes("connection") ||
            err.message?.includes("timeout"))
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
    [
      uniswap,
      amountIn,
      fromToken,
      toToken,
      slippage,
      fromTokenData,
      toTokenData,
    ]
  );

  // Setup quote fetching
  useEffect(() => {
    setMounted(true);

    if (isOpen && uniswap?.isReady) {
      fetchQuote();

      // quote refresh interval
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
  }, [isOpen, uniswap?.isReady, fetchQuote]);

  // Countdown timer
  useEffect(() => {
    if (!isOpen || !quote.data || quote.isLoading) return;

    countdownIntervalRef.current = setInterval(() => {
      setCountdown(() => {
        const timeElapsed = (Date.now() - quote.lastUpdated) / 1000;
        const remaining = Math.max(0, 10 - timeElapsed);

        if (remaining <= 0) {
          fetchQuote(); // Auto-refresh when expired
          return 10;
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
    if (uniswap?.isSwapping) {
      return;
    }

    // Cleanup
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    setQuote({
      data: null,
      isLoading: false,
      error: null,
      lastUpdated: 0,
    });

    onClose();
  }, [onClose, uniswap?.isSwapping]);

  // Computed values
  const isQuoteExpired = countdown <= 0;
  const isQuoteExpiring = countdown <= 3 && countdown > 0; // Warn when 3s or less remaining
  const isLoading = quote.isLoading || uniswap?.isSwapping;
  const canConfirm = useMemo(() => {
    if (!quote.data) return false;
    if (isQuoteExpired) return false;

    if (uniswap?.isSwapping) return false;

    if (quote.error || uniswap?.error) return false;

    if (quote.isLoading || uniswap?.isInitializing) return false;

    return true;
  }, [
    quote.data,
    quote.error,
    quote.isLoading,
    isQuoteExpired,
    uniswap?.isSwapping,
    uniswap?.error,
    uniswap?.isInitializing,
  ]);

  useEffect(() => {
    console.log("🔘 Swap Button State:", {
      hasQuote: !!quote.data,
      isExpired: isQuoteExpired,
      isSwapping: uniswap?.isSwapping,
      hasError: !!(quote.error || uniswap?.error),
      isLoading: quote.isLoading || uniswap?.isInitializing,
      canConfirm,
    });
  }, [
    quote.data,
    isQuoteExpired,
    uniswap?.isSwapping,
    quote.error,
    uniswap?.error,
    quote.isLoading,
    uniswap?.isInitializing,
    canConfirm,
  ]);

  const minReceive = useMemo(() => {
    if (!quote.data?.minAmountOut) return null;
    const minAmountStr = String(quote.data.minAmountOut);
    const parsed = parseFloat(minAmountStr);
    return isNaN(parsed) ? null : parsed;
  }, [quote.data?.minAmountOut]);

  const priceImpact = useMemo(() => {
    if (!quote.data?.priceImpact) return null;
    const impact = typeof quote.data.priceImpact === 'number'
      ? quote.data.priceImpact
      : parseFloat(String(quote.data.priceImpact));
    return isNaN(impact) ? null : impact;
  }, [quote.data?.priceImpact]);

  // Execute swap
  const handleConfirm = useCallback(async () => {
    if (!uniswap?.isReady || !quote.data) return;

    try {
      // Validate quote freshness before swapping
      if (isQuoteExpired) {
        showSnackbar("Quote expired. Please get a new quote.", "error");
        await fetchQuote();
        return;
      }

      // Check slippage tolerance
      if (quote.data.priceImpact) {
        const impactValue = typeof quote.data.priceImpact === 'number'
          ? quote.data.priceImpact
          : parseFloat(String(quote.data.priceImpact));
        if (!isNaN(impactValue) && impactValue > 10) {
          showSnackbar(
            `High price impact (${impactValue.toFixed(
              2
            )}%). Please confirm you want to proceed.`,
            "warning"
          );
        }
      }

      const result = await uniswap.performSwap({
        fromSymbol: fromToken,
        toSymbol: toToken,
        amount: amountIn,
        slippageTolerance: slippage / 100,
        recipientAddress,
      });

      if (result.success) {
        await onConfirm();
        showSnackbar("Swap completed successfully!", "success");
        setTimeout(() => {
          handleClose();
        }, 2000);
      }
    } catch (error: unknown) {
      const err = error as Error;
      console.error("Swap execution failed:", err);

      // Provide user-friendly error messages
      let errorMessage = err.message || "Swap failed. Please try again.";

      if (errorMessage.includes("user rejected") || errorMessage.includes("denied")) {
        errorMessage = "Transaction was cancelled. No funds were transferred.";
      } else if (errorMessage.includes("insufficient funds") || errorMessage.includes("balance")) {
        errorMessage = "Insufficient balance to complete the swap. Please check your wallet balance.";
      } else if (errorMessage.includes("slippage")) {
        errorMessage = "Price moved too much during the swap. Try increasing slippage tolerance or refreshing the quote.";
      } else if (errorMessage.includes("gas") || errorMessage.includes("fee")) {
        errorMessage = "Insufficient CELO for gas fees. Please add CELO to your wallet.";
      } else if (errorMessage.includes("liquidity")) {
        errorMessage = "Insufficient liquidity for this trade size. Try a smaller amount.";
      } else if (errorMessage.includes("network") || errorMessage.includes("timeout")) {
        errorMessage = "Network issue encountered. Please check your connection and try again.";
      }

      showSnackbar(errorMessage, "error");
    }
  }, [
    uniswap,
    quote.data,
    isQuoteExpired,
    fromToken,
    toToken,
    amountIn,
    slippage,
    recipientAddress,
    onConfirm,
    handleClose,
    fetchQuote,
    showSnackbar,
  ]);

  // Format number utility
  const formatNumber = useCallback((value: number, decimals = 6) => {
    return value.toLocaleString("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: decimals,
    });
  }, []);

  // Skeleton loader component
  const SkeletonLoader = () => (
    <div className="animate-pulse space-y-4">
      <div className="h-4 bg-gray-700 rounded w-3/4"></div>
      <div className="h-8 bg-gray-700 rounded"></div>
      <div className="h-4 bg-gray-700 rounded w-1/2"></div>
    </div>
  );

  if (!mounted || !isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Confirm Swap"
      maxWidth="md:max-w-xl max-h-[90vh] overflow-y-auto"
    >
      <div className="space-y-4 md:space-y-6">
        {/* Initial Loading State */}
        {!quote.data && quote.isLoading && !quote.error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 space-y-4 border border-gray-700/50"
          >
            <div className="flex items-center justify-center gap-3 py-8">
              <FaSpinner className="animate-spin w-6 h-6 text-blue-400" />
              <div>
                <p className="text-white font-medium">Fetching best swap rate...</p>
                <p className="text-gray-400 text-sm mt-1">This may take a few seconds</p>
              </div>
            </div>
            <SkeletonLoader />
          </motion.div>
        )}

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
                  {quote.data?.exchangeRate && (
                    <div className="text-xs opacity-80 mt-1">
                      1 {fromToken} ={" "}
                      {(() => {
                        const rate = parseFloat(String(quote.data.exchangeRate));
                        return isNaN(rate) ? "--" : formatNumber(rate, 6);
                      })()}{" "}
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
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-4 md:p-6 space-y-3 md:space-y-4 border border-gray-700/50">
          {/* From Token */}
          <div className="flex items-center justify-between p-3 md:p-4 bg-gray-700/30 rounded-xl">
            <div className="flex items-center gap-2 md:gap-3">
              <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm md:text-base">
                {fromToken.charAt(0)}
              </div>
              <div>
                <div className="text-xs md:text-sm text-gray-400">From</div>
                <div className="font-medium text-white text-sm md:text-base">{fromToken}</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xl md:text-2xl font-bold text-white">
                {formatNumber(amountIn, 4)}
              </div>
              <div className="text-xs md:text-sm text-gray-400">
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
          <div className="flex items-center justify-between p-3 md:p-4 bg-gray-700/30 rounded-xl">
            <div className="flex items-center gap-2 md:gap-3">
              <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center text-white font-bold text-sm md:text-base">
                {toToken.charAt(0)}
              </div>
              <div>
                <div className="text-xs md:text-sm text-gray-400">To (estimated)</div>
                <div className="font-medium text-white text-sm md:text-base">{toToken}</div>
              </div>
            </div>
            <div className="text-right">
              {quote.data ? (
                <>
                  <div className="text-xl md:text-2xl font-bold text-white">
                    {(() => {
                      const amountStr = String(quote.data.amountOut || quote.data.outputAmount || '0');
                      const amount = parseFloat(amountStr);
                      return isNaN(amount) ? "--" : formatNumber(amount, 4);
                    })()}
                  </div>
                  <div className="text-xs md:text-sm text-gray-400">
                    ${(() => {
                      const amountStr = String(quote.data.amountOut || quote.data.outputAmount || '0');
                      const amount = parseFloat(amountStr);
                      return isNaN(amount) ? "--" : formatNumber(amount * 1, 2);
                    })()}{" "}
                    {/* Add price conversion */}
                  </div>
                </>
              ) : quote.isLoading ? (
                <div className="flex items-center gap-2 text-gray-400">
                  <FaSpinner className="animate-spin w-3 h-3 md:w-4 md:h-4" />
                  <span className="text-xs md:text-sm">Calculating...</span>
                </div>
              ) : (
                <div className="text-gray-500 text-sm md:text-base">--</div>
              )}
            </div>
          </div>

          {/* Route Visualization */}
          {quote.data?.route && Array.isArray(quote.data.route) && quote.data.route.length > 2 && (() => {
            const route = quote.data.route!;
            return (
              <div className="flex items-center justify-center gap-2 py-2">
                <FaRoute className="w-3 h-3 text-gray-500" />
                <div className="flex items-center gap-1">
                  {route.map((token: string, index: number) => (
                    <React.Fragment key={token + index}>
                      <span className="text-xs text-gray-400 px-2 py-1 bg-gray-700 rounded">
                        {token}
                      </span>
                      {index < route.length - 1 && (
                        <FaArrowDown className="w-2 h-2 text-gray-500 rotate-90" />
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            );
          })()}
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
                <p>• Swap executed through Uniswap Protocol</p>
                <p>• Transaction is irreversible once confirmed</p>
                <p>• Gas fees are paid in CELO</p>
                <p>• 5-minute deadline for MEV protection</p>
                {quote.data?.route && Array.isArray(quote.data.route) && quote.data.route.length > 2 && (
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
        {uniswap?.isSwapping && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`rounded-xl p-4 border ${
              uniswap?.error
                ? "bg-red-900/20 border-red-500/30"
                : "bg-blue-900/20 border-blue-500/30"
            }`}
          >
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                {uniswap?.error ? (
                  <FaExclamationTriangle className="w-5 h-5 text-red-400" />
                ) : (
                  <FaSpinner className="w-5 h-5 text-blue-400 animate-spin" />
                )}

                <div className="flex-1">
                  <div
                    className={`font-medium ${
                      uniswap?.error ? "text-red-400" : "text-blue-400"
                    }`}
                  >
                    {uniswap?.error ? "Swap failed" : "Executing swap..."}
                  </div>

                  {uniswap?.error && (
                    <div className="text-sm text-red-300 mt-1">
                      {uniswap?.error}
                    </div>
                  )}

                  {uniswap?.isSwapping && uniswap.totalSteps > 0 && (
                    <div className="text-sm text-gray-400 mt-1">
                      Step {uniswap.currentStep} of {uniswap.totalSteps}
                    </div>
                  )}
                </div>
              </div>

              {/* Progress Bar */}
              {uniswap?.isSwapping && uniswap.totalSteps > 0 && (
                <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-blue-500 to-blue-400"
                    initial={{ width: 0 }}
                    animate={{
                      width: `${(uniswap.currentStep / uniswap.totalSteps) * 100}%`,
                    }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 pt-2">
          <Button
            title="Cancel"
            onClick={handleClose}
            disabled={uniswap?.isSwapping}
            className="flex-1 bg-transparent hover:bg-gray-700/50 text-gray-300 hover:text-white text-sm px-4 py-3 border border-gray-600 hover:border-gray-500 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          />

          <Button
            title={
              uniswap?.isSwapping ? (
                <div className="flex items-center justify-center gap-2">
                  <FaSpinner className="animate-spin w-4 h-4" />
                  <span>
                    {uniswap?.currentStep && uniswap?.totalSteps
                      ? `Step ${uniswap.currentStep}/${uniswap.totalSteps}`
                      : "Swapping..."}
                  </span>
                </div>
              ) : isQuoteExpired ? (
                "Get New Quote"
              ) : (
                "Confirm Swap"
              )
            }
            onClick={isQuoteExpired ? () => fetchQuote() : handleConfirm}
            disabled={!canConfirm && !isQuoteExpired}
            className={`flex-1 ${
              uniswap?.isSwapping
                ? "bg-blue-600 hover:bg-blue-700"
                : isQuoteExpired
                ? "bg-yellow-600 hover:bg-yellow-700"
                : "bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600"
            } text-white text-sm px-4 py-3 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg ${
              !canConfirm && !isQuoteExpired && !uniswap?.isSwapping
                ? "cursor-not-allowed opacity-50"
                : ""
            }`}
          />
        </div>
        {/* Debug info in development */}
        {import.meta.env.DEV && (
          <div className="text-xs text-gray-500 p-2 bg-gray-800 rounded">
            <div>Quote: {quote.data ? "✓" : "✗"}</div>
            <div>Expired: {isQuoteExpired ? "✓" : "✗"}</div>
            <div>Swapping: {uniswap?.isSwapping ? "✓" : "✗"}</div>
            <div>Error: {quote.error || uniswap?.error || "none"}</div>
            <div>Can Confirm: {canConfirm ? "✓" : "✗"}</div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default SwapConfirmationModal;
