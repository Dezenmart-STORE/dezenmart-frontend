import { AnimatePresence, motion } from "framer-motion";
import { IoClose } from "react-icons/io5";
import type { ReactNode } from "react";

interface Props {
  title: string;
  subtitle?: string;
  onClose?: () => void;
  /** Hide the close button (e.g. mandatory onboarding). */
  dismissible?: boolean;
  children: ReactNode;
  footer?: ReactNode;
}

/** Centered dark-theme modal shell shared by the smart-wallet dialogs. */
export default function ModalShell({
  title,
  subtitle,
  onClose,
  dismissible = true,
  children,
  footer,
}: Props) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={dismissible ? onClose : undefined}
        className="fixed inset-0 z-[70] flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center"
      >
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 40, scale: 0.98 }}
          transition={{ type: "spring", damping: 24, stiffness: 280 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-sm overflow-hidden rounded-t-3xl border border-[#2F3136] bg-[#1A1C20] shadow-2xl sm:rounded-3xl"
        >
          <div className="flex items-start justify-between gap-3 px-5 pt-5">
            <div>
              <h2 className="text-lg font-bold text-white">{title}</h2>
              {subtitle && <p className="mt-1 text-sm text-gray-400">{subtitle}</p>}
            </div>
            {dismissible && onClose && (
              <button
                onClick={onClose}
                aria-label="Close"
                className="rounded-full p-1 text-gray-500 transition-colors hover:bg-[#292B30] hover:text-white"
              >
                <IoClose className="h-5 w-5" />
              </button>
            )}
          </div>

          <div className="px-5 py-5">{children}</div>

          {footer && <div className="border-t border-[#2F3136] px-5 py-4">{footer}</div>}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
