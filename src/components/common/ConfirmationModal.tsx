import { FC, useState } from "react";
import Modal from "./Modal";
import Button from "./Button";
import { BsShieldExclamation } from "react-icons/bs";

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  type: "delivery" | "purchase";
  amount?: string;
  currency?: string;
  recipientName?: string;
  isProcessing?: boolean;
}

const ConfirmationModal: FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  type,
  amount,
  currency = "btc",
  recipientName,
  isProcessing = false,
}) => {
  const [hasCheckedWallet, setHasCheckedWallet] = useState(false);
  const [hasConfirmedCredit, setHasConfirmedCredit] = useState(false);

  const isDelivery = type === "delivery";
  const title = isDelivery
    ? "Please Confirm Receipt of payment"
    : "Please Confirm Payment";

  const warningMessage = isDelivery
    ? `Never release funds before confirming payment receipt. Dezmart does hold your fiat assets. Be cautious and protect yourself from scams.`
    : `Never release funds before confirming payment receipt. Dezmart does hold your fiat assets. Be cautious and protect yourself from scams.`;

  const walletCheckText = isDelivery
    ? `I have checked my bank e-wallet and confirmed that ${amount}${currency} has been credited to my available balance.`
    : `I have checked my payment method and confirmed that ${amount}${currency} has been debited from my account.`;

  const creditConfirmText = isDelivery
    ? `I confirm that ${
        recipientName || "Femi cole"
      } has credited to my available balance.`
    : `I confirm that ${
        recipientName || "Femi cole"
      } has received the payment.`;

  const buttonText = isDelivery ? "Release Now" : "Confirm Payment";

  const canConfirm = hasCheckedWallet && hasConfirmedCredit && !isProcessing;

  const handleConfirm = async () => {
    if (!canConfirm) return;

    try {
      await onConfirm();
    } catch (error) {}
  };

  const handleClose = () => {
    if (isProcessing) return;
    setHasCheckedWallet(false);
    setHasConfirmedCredit(false);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={title}
      maxWidth="md:max-w-md"
      showCloseButton={!isProcessing}
    >
      <div className="space-y-6 mt-4">
        {/* Warning Alert */}
        <div className="flex items-start gap-3 p-4 bg-yellow-900/20 border border-yellow-600/30 rounded-lg">
          <BsShieldExclamation
            className="text-yellow-600 mt-0.5 flex-shrink-0"
            size={18}
          />
          <p className="text-yellow-100 text-sm leading-relaxed">
            {warningMessage}
          </p>
        </div>

        {/* Confirmation Text */}
        <div className="text-gray-300 text-sm">
          Please carefully confirm the following:
        </div>

        {/* Checkboxes */}
        <div className="space-y-4 p-4 border border-red-600/50 rounded-lg bg-red-900/10">
          <label className="flex items-start gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={hasCheckedWallet}
              onChange={(e) => setHasCheckedWallet(e.target.checked)}
              disabled={isProcessing}
              className="mt-1 h-4 w-4 rounded border-gray-600 bg-gray-800 text-red-600 focus:ring-red-500 focus:ring-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <span className="text-gray-300 text-sm leading-relaxed select-none group-hover:text-gray-200 transition-colors">
              {walletCheckText}
            </span>
          </label>

          <label className="flex items-start gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={hasConfirmedCredit}
              onChange={(e) => setHasConfirmedCredit(e.target.checked)}
              disabled={isProcessing}
              className="mt-1 h-4 w-4 rounded border-gray-600 bg-gray-800 text-red-600 focus:ring-red-500 focus:ring-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <span className="text-gray-300 text-sm leading-relaxed select-none group-hover:text-gray-200 transition-colors">
              {creditConfirmText}
            </span>
          </label>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-2">
          <Button
            title="Cancel"
            onClick={handleClose}
            disabled={isProcessing}
            className="flex-1 bg-transparent hover:bg-gray-700 text-white text-sm px-4 py-3 border border-gray-600 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          />

          <Button
            title={
              isProcessing ? (
                <div className="flex items-center justify-center">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Processing...
                </div>
              ) : (
                buttonText
              )
            }
            onClick={handleConfirm}
            disabled={!canConfirm}
            className={`flex-1 text-white text-sm px-4 py-3 border-none rounded transition-colors ${
              !canConfirm
                ? "bg-gray-600 cursor-not-allowed opacity-50"
                : "bg-Red hover:bg-[#e02d37]"
            }`}
          />
        </div>
      </div>
    </Modal>
  );
};

export default ConfirmationModal;
