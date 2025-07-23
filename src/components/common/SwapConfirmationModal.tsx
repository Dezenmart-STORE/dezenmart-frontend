import React, { useState, useEffect, useMemo } from "react";
import Button from "./Button";
import Modal from "./Modal";
import { FaSpinner, FaInfoCircle, FaExchangeAlt } from "react-icons/fa";
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
}) => {
  const [isConfirming, setIsConfirming] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // Calculate minimum receive amount with proper decimal handling
  const minReceive = useMemo(() => {
    if (!amountOut || !mounted) return undefined;
    const numericAmountOut = parseFloat(amountOut);
    return numericAmountOut * (1 - slippage / 100);
  }, [amountOut, slippage, mounted]);

  // Format numbers with proper localization
  const formatNumber = (value: number, decimals = 6) => {
    return value.toLocaleString("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: decimals,
    });
  };

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

  // Prevent render during SSR
  if (!mounted || !isOpen) return null;

  const isLoading = isProcessing || isConfirming;
  const hasValidAmounts =
    amountIn > 0 && amountOut && parseFloat(amountOut) > 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Confirm Token Swap"
      maxWidth="md:max-w-lg"
    >
      <div className="space-y-6">
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

          {/* Swap Direction Indicator */}
          <div className="flex justify-center py-2">
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-600 to-blue-500 flex items-center justify-center shadow-lg">
              <FaExchangeAlt className="w-4 h-4 text-white" />
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
        <div className="bg-blue-900/10 border border-blue-500/20 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <FaInfoCircle className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-300 space-y-2">
              <div className="flex justify-between items-center">
                <span>Slippage tolerance:</span>
                <span className="font-medium">{slippage}%</span>
              </div>
              {estimatedGasFee && (
                <div className="flex justify-between items-center">
                  <span>Estimated gas fee:</span>
                  <span className="font-medium">{estimatedGasFee} CELO</span>
                </div>
              )}
              <div className="text-xs text-blue-400/80 pt-2 border-t border-blue-500/20">
                <p>• Swap executed through Mento Protocol</p>
                <p>• Gas fees paid in CELO</p>
                <p>• Transaction may fail if price moves beyond slippage</p>
              </div>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <svg
                className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0"
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
                <p className="text-sm text-red-400 font-medium">{error}</p>
                {error.includes("pair not available") && (
                  <p className="text-xs text-red-300 mt-1">
                    Try converting to CELO first, then to your desired token.
                  </p>
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
              ) : (
                "Confirm Swap"
              )
            }
            onClick={handleConfirm}
            disabled={isLoading || !hasValidAmounts || !!error}
            className="flex-1 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white text-sm px-4 py-3 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-blue-500/25"
          />
        </div>
      </div>
    </Modal>
  );
};

export default SwapConfirmationModal;
