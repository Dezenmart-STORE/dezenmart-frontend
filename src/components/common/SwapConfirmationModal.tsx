import React, { useState } from "react";
import Button from "./Button";
import Modal from "./Modal";

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
  //   const [isOpen, setIsOpen] = useState<boolean>(false);
  if (!isOpen) return null;
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Swap Token"
      maxWidth="md:max-w-lg"
    >
      <div>
        <div className="space-y-4">
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
            <Button
              title="Cancel"
              onClick={onClose}
              disabled={isProcessing}
              className="bg-transparent hover:bg-gray-700 text-white text-sm px-4 py-2 border border-gray-600 rounded transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <Button
              title={isProcessing ? "Swapping..." : "Confirm Swap"}
              onClick={onConfirm}
              disabled={isProcessing}
              className="flex items-center justify-center px-4 py-2 rounded-md bg-blue-600 text-white bg-Red hover:bg-[#e02d37] disabled:opacity-50"
            />

            {/* </button> */}
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default SwapConfirmationModal;
