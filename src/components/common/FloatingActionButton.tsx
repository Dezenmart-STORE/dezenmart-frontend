import { FC, ReactNode } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";

interface FloatingActionButtonProps {
  icon: ReactNode;
  to: string;
  label?: string;
  position?: "bottom-right" | "bottom-center";
  color?: "primary" | "secondary";
}

const FloatingActionButton: FC<FloatingActionButtonProps> = ({
  icon,
  to,
  label,
  position = "bottom-right",
  color = "primary",
}) => {
  const positionClasses = {
    "bottom-right": "bottom-20 right-4 md:right-6",
    "bottom-center": "bottom-20 left-1/2 transform -translate-x-1/2",
  };

  const colorClasses = {
    primary: "bg-Red text-white hover:bg-[#e02d37]",
    secondary: "bg-[#212428] text-white hover:bg-[#292B30]",
  };

  return (
    <motion.div
      className={`fixed z-50 ${positionClasses[position]}`}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{
        type: "spring",
        stiffness: 260,
        damping: 20,
      }}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
    >
      <Link
        to={to}
        className={`flex items-center justify-center ${colorClasses[color]} rounded-full shadow-lg p-4`}
        aria-label={label || "Action button"}
      >
        <div className="text-xl">{icon}</div>
      </Link>
      {label && (
        <motion.span
          className="absolute top-full left-1/2 -translate-x-1/2 mt-1 text-xs bg-[#292B30] text-white px-2 py-1 rounded whitespace-nowrap"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          {label}
        </motion.span>
      )}
    </motion.div>
  );
};

export default FloatingActionButton;
