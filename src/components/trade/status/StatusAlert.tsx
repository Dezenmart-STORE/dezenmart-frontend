import { FC, ReactNode } from "react";
import { motion } from "framer-motion";

interface StatusAlertProps {
  icon: ReactNode;
  message: string;
  verificationMessage?: string;
  type?: "warning" | "info" | "error";
}

const StatusAlert: FC<StatusAlertProps> = ({
  icon,
  message,
  verificationMessage,
  type = "warning",
}) => {
  const bgColor = {
    warning: "bg-Red/10 border-l-4 border-Red",
    info: "bg-blue-50 border-l-4 border-blue-500",
    error: "bg-red-50 border-l-4 border-red-500",
  }[type];

  const textColor = {
    warning: "text-Red",
    info: "text-blue-700",
    error: "text-red-700",
  }[type];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`${bgColor} p-4 rounded-lg mb-6`}
    >
      <div className="flex items-center mb-2">
        <span className={textColor}>{icon}</span>
      </div>
      <div className="ml-2">
        <p className="text-sm text-gray-700">{message}</p>
        {verificationMessage && (
          <p className="text-sm font-medium mt-2 text-gray-800">
            {verificationMessage}
          </p>
        )}
      </div>
    </motion.div>
  );
};

export default StatusAlert;
