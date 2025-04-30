import { FC } from "react";
import { motion } from "framer-motion";
import { FaCheck } from "react-icons/fa";

interface SuccessNotificationProps {
  message: string;
  onClose?: () => void;
}

const SuccessNotification: FC<SuccessNotificationProps> = ({
  message,
  onClose,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-green-100 text-green-800 p-4 rounded-lg mb-6 flex items-center justify-between"
    >
      <div className="flex items-center gap-2">
        <div className="bg-green-500 rounded-full p-1">
          <FaCheck className="text-white" size={14} />
        </div>
        <span className="font-medium">{message}</span>
      </div>

      {onClose && (
        <button
          onClick={onClose}
          className="text-green-700 hover:text-green-900"
        >
          ✕
        </button>
      )}
    </motion.div>
  );
};

export default SuccessNotification;
