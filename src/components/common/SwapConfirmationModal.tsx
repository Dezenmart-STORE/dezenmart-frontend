import React from "react";

interface SwapConfirmationModalProps {
  isOpen: boolean;
  fromToken: string;
  toToken: string;
  amountIn: number; // in fromToken
  amountOut?: number; // optional estimated
  onConfirm: () => Promise<void>;
  onClose: () => void;
  isProcessing: boolean;
  error?: string;
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
}) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md space-y-4">
        <h3 className="text-lg font-semibold">Confirm Token Swap</h3>
        <p>
          Swap <strong>{amountIn.toLocaleString()}</strong> {fromToken} →{" "}
          {toToken} for purchase.
        </p>
        {amountOut != null && (
          <p>
            Estimated receive: <strong>{amountOut.toLocaleString()}</strong>{" "}
            {toToken}.
          </p>
        )}
        {error && <p className="text-sm text-red-500">{error}</p>}
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="px-4 py-2 rounded-md border"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isProcessing}
            className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {isProcessing ? "Swapping..." : "Confirm Swap"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SwapConfirmationModal;
