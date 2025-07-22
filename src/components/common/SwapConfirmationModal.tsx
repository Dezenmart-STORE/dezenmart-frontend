import React, { useState, useEffect } from "react";
import Button from "./Button";
import Modal from "./Modal";
import { FaSpinner, FaInfoCircle } from "react-icons/fa";

interface SwapConfirmationModalProps {
  isOpen: boolean;
  fromToken: string;
  toToken: string;
  amountIn: number;
  amountOut?: number;
  onConfirm: () => Promise<void>;
  onClose: () => void;
  isProcessing: boolean;
  error?: string;
  slippage?: number;
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
}) => {
  const [isConfirming, setIsConfirming] = useState(false);

  const handleConfirm = async () => {
    setIsConfirming(true);
    try {
      await onConfirm();
    } catch (err) {
      console.error("Swap confirmation failed:", err);
    } finally {
      setIsConfirming(false);
    }
  };

  const minReceive = amountOut ? amountOut * (1 - slippage / 100) : undefined;

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={isProcessing ? () => {} : onClose}
      title="Confirm Token Swap"
      maxWidth="md:max-w-lg"
    >
      <div className="space-y-6">
        {/* Swap Details */}
        <div className="bg-gray-800 rounded-lg p-4 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-gray-400">From</span>
            <div className="text-right">
              <div className="text-lg font-semibold">
                {amountIn.toLocaleString()} {fromToken}
              </div>
            </div>
          </div>

          <div className="flex justify-center py-2">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">
              <svg
                className="w-4 h-4 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 14l-7 7m0 0l-7-7m7 7V3"
                />
              </svg>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-gray-400">To (estimated)</span>
            <div className="text-right">
              <div className="text-lg font-semibold">
                {amountOut
                  ? `${amountOut.toLocaleString()} ${toToken}`
                  : "Calculating..."}
              </div>
              {minReceive && (
                <div className="text-sm text-gray-500">
                  Minimum: {minReceive.toFixed(6)} {toToken}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Swap Info */}
        <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <FaInfoCircle className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-300 space-y-1">
              <p>Slippage tolerance: {slippage}%</p>
              <p>This swap will be executed through Mento Protocol</p>
              <p>Gas fees will be paid in CELO</p>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-3">
            <div className="flex items-start gap-2">
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
              <p className="text-sm text-red-400">{error}</p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button
            title="Cancel"
            onClick={onClose}
            disabled={isProcessing || isConfirming}
            className="flex-1 bg-transparent hover:bg-gray-700 text-white text-sm px-4 py-3 border border-gray-600 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <Button
            title={
              isProcessing || isConfirming ? (
                <div className="flex items-center justify-center gap-2">
                  <FaSpinner className="animate-spin" />
                  Swapping...
                </div>
              ) : (
                "Confirm Swap"
              )
            }
            onClick={handleConfirm}
            disabled={isProcessing || isConfirming || !amountOut || !!error}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-3 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>
      </div>
    </Modal>
  );
};

export default SwapConfirmationModal;
