import React, { useState, useEffect, useMemo, useCallback } from "react";
import Button from "./Button";
import Modal from "./Modal";
import {
  FaSpinner,
  FaInfoCircle,
  FaExchangeAlt,
  FaRoute,
  FaCheckCircle,
  FaExclamationTriangle,
} from "react-icons/fa";
import { formatUnits } from "viem";

interface SwapConfirmationModalProps {
  isOpen: boolean;
  fromToken: string;
  toToken: string;
  amountIn: number;
  amountOut?: string;
  onConfirm: () => Promise<void>;
  onClose: () => void;
  isProcessing: boolean;
  error?: string;
  slippage?: number;
  estimatedGasFee?: string;
  route?: string[];
  exchangeRate?: string;
  priceImpact?: string;
}

const SwapConfirmationModal: React.FC<SwapConfirmationModalProps> = ({
  isOpen,
  fromToken,
  toToken,
  amountIn,
  amountOut,
  onConfirm,
  onClose,
  isProcessing,
  error,
  slippage = 5,
  estimatedGasFee,
  route = [fromToken, toToken],
  exchangeRate,
  priceImpact,
}) => {
  const [isConfirming, setIsConfirming] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [countdown, setCountdown] = useState(15); // Quote expires in 15 seconds

  useEffect(() => {
    setMounted(true);
  }, []);

  // Quote countdown timer
  useEffect(() => {
    if (!isOpen || !amountOut) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, amountOut]);

  // Reset countdown when quote updates
  useEffect(() => {
    if (amountOut) {
      setCountdown(15);
    }
  }, [amountOut]);

  const errorStates = useMemo(() => {
    if (!error) return null;

    if (error.includes("Token approval required")) {
      return {
        type: "allowance",
        message: "Token approval required",
        suggestion: "Please approve the token spend and try again.",
        severity: "warning" as const,
      };
    }

    if (error.includes("Trading pair not available")) {
      return {
        type: "routing",
        message: "Trading pair not available",
        suggestion: "This pair may not be supported. Try a different route.",
        severity: "error" as const,
      };
    }

    if (error.includes("Insufficient")) {
      return {
        type: "balance",
        message: "Insufficient balance",
        suggestion: "Please ensure you have enough tokens for the swap.",
        severity: "error" as const,
      };
    }

    return {
      type: "general",
      message: "Swap failed",
      suggestion: error,
      severity: "error" as const,
    };
  }, [error]);

  const minReceive = useMemo(() => {
    if (!amountOut || !mounted) return undefined;
    const numericAmountOut = parseFloat(amountOut);
    return numericAmountOut * (1 - slippage / 100);
  }, [amountOut, slippage, mounted]);

  const formatNumber = useCallback((value: number, decimals = 6) => {
    return value.toLocaleString("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: decimals,
    });
  }, []);

  const handleConfirm = async () => {
    if (isConfirming || isProcessing) return;

    setIsConfirming(true);
    try {
      await onConfirm();
    } catch (err) {
      console.error("Swap confirmation failed:", err);
    } finally {
      setIsConfirming(false);
    }
  };

  const handleClose = () => {
    if (isProcessing || isConfirming) return;
    onClose();
  };

  if (!mounted || !isOpen) return null;

  const isLoading = isProcessing || isConfirming;
  const hasValidAmounts =
    amountIn > 0 && amountOut && parseFloat(amountOut) > 0;
  const isQuoteExpired = countdown <= 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Review Swap"
      maxWidth="md:max-w-lg"
    >
      <div className="space-y-6">
        {/* Quote Status */}
        {hasValidAmounts && (
          <div
            className={`flex items-center justify-between p-3 rounded-lg border ${
              isQuoteExpired
                ? "bg-red-900/20 border-red-500/30 text-red-300"
                : countdown <= 5
                ? "bg-yellow-900/20 border-yellow-500/30 text-yellow-300"
                : "bg-green-900/20 border-green-500/30 text-green-300"
            }`}
          >
            <div className="flex items-center gap-2">
              {isQuoteExpired ? (
                <FaExclamationTriangle className="w-4 h-4" />
              ) : (
                <FaCheckCircle className="w-4 h-4" />
              )}
              <span className="text-sm font-medium">
                {isQuoteExpired
                  ? "Quote Expired"
                  : `Quote expires in ${countdown}s`}
              </span>
            </div>
            {exchangeRate && (
              <span className="text-xs">
                1 {fromToken} = {parseFloat(exchangeRate).toFixed(6)} {toToken}
              </span>
            )}
          </div>
        )}

        {/* Swap Details Card */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 space-y-4 border border-gray-700/50">
          {/* From Token */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-gray-400 text-sm font-medium">From</span>
            </div>
            <div className="text-right">
              <div className="text-lg font-semibold text-white">
                {formatNumber(amountIn, 4)} {fromToken}
              </div>
            </div>
          </div>

          {/* Route Visualization */}
          <div className="flex justify-center py-2">
            <div className="flex items-center gap-2">
              {route.map((token, index) => (
                <React.Fragment key={token + index}>
                  <div className="px-2 py-1 bg-gray-700 rounded text-xs text-gray-300">
                    {token}
                  </div>
                  {index < route.length - 1 && (
                    <FaRoute className="w-3 h-3 text-gray-500" />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* To Token */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-gray-400 text-sm font-medium">
                To (estimated)
              </span>
            </div>
            <div className="text-right">
              {hasValidAmounts ? (
                <>
                  <div className="text-lg font-semibold text-white">
                    {formatNumber(parseFloat(amountOut), 4)} {toToken}
                  </div>
                  {minReceive && (
                    <div className="text-xs text-gray-500 mt-1">
                      Minimum: {formatNumber(minReceive, 6)} {toToken}
                    </div>
                  )}
                </>
              ) : (
                <div className="flex items-center gap-2 text-gray-400">
                  <FaSpinner className="animate-spin w-4 h-4" />
                  <span className="text-sm">Calculating...</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Swap Details Info */}
        <div className="bg-red-900/10 border border-red-500/20 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <FaInfoCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-red-300 space-y-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex justify-between">
                  <span>Slippage tolerance:</span>
                  <span className="font-medium">{slippage}%</span>
                </div>
                {priceImpact && (
                  <div className="flex justify-between">
                    <span>Price impact:</span>
                    <span
                      className={`font-medium ${
                        parseFloat(priceImpact) > 5
                          ? "text-red-400"
                          : parseFloat(priceImpact) > 1
                          ? "text-yellow-400"
                          : "text-green-400"
                      }`}
                    >
                      {priceImpact}%
                    </span>
                  </div>
                )}
                {estimatedGasFee && (
                  <div className="flex justify-between col-span-2">
                    <span>Estimated gas fee:</span>
                    <span className="font-medium">{estimatedGasFee} CELO</span>
                  </div>
                )}
              </div>
              <div className="text-xs text-red-400/80 pt-2 border-t border-red-500/20">
                <p>• Swap executed through Mento Protocol</p>
                <p>• Gas fees paid in CELO</p>
                <p>• Transaction may fail if price moves beyond slippage</p>
                {route.length > 2 && <p>• Multi-hop swap via {route[1]}</p>}
              </div>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {errorStates && (
          <div
            className={`border rounded-xl p-4 ${
              errorStates.severity === "error"
                ? "bg-red-900/20 border-red-500/30"
                : "bg-yellow-900/20 border-yellow-500/30"
            }`}
          >
            <div className="flex items-start gap-3">
              <svg
                className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                  errorStates.severity === "error"
                    ? "text-red-400"
                    : "text-yellow-400"
                }`}
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              <div>
                <p
                  className={`text-sm font-medium ${
                    errorStates.severity === "error"
                      ? "text-red-400"
                      : "text-yellow-400"
                  }`}
                >
                  {errorStates.message}
                </p>
                <p
                  className={`text-xs mt-1 ${
                    errorStates.severity === "error"
                      ? "text-red-300"
                      : "text-yellow-300"
                  }`}
                >
                  {errorStates.suggestion}
                </p>
                {errorStates.type === "routing" && (
                  <div
                    className={`mt-2 text-xs ${
                      errorStates.severity === "error"
                        ? "text-red-300/80"
                        : "text-yellow-300/80"
                    }`}
                  >
                    <p>
                      • Try: {fromToken} → CELO → {toToken}
                    </p>
                    <p>• Or select a different token pair</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 pt-2">
          <Button
            title="Cancel"
            onClick={handleClose}
            disabled={isLoading}
            className="flex-1 bg-transparent hover:bg-gray-700/50 text-gray-300 hover:text-white text-sm px-4 py-3 border border-gray-600 hover:border-gray-500 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <Button
            title={
              isLoading ? (
                <div className="flex items-center justify-center gap-2">
                  <FaSpinner className="animate-spin w-4 h-4" />
                  <span>Swapping...</span>
                </div>
              ) : isQuoteExpired ? (
                "Get New Quote"
              ) : (
                "Confirm Swap"
              )
            }
            onClick={
              isQuoteExpired ? () => window.location.reload() : handleConfirm
            }
            disabled={isLoading || !hasValidAmounts || !!error}
            className={`flex-1 ${
              isQuoteExpired
                ? "bg-yellow-600 hover:bg-yellow-700"
                : "bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600"
            } text-white text-sm px-4 py-3 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-red-500/25`}
          />
        </div>
      </div>
    </Modal>
  );
};

export default SwapConfirmationModal;
