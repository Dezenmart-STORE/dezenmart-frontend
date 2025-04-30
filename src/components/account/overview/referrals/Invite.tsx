import React, {
  useState,
  useCallback,
  lazy,
  Suspense,
  forwardRef,
  useImperativeHandle,
} from "react";
import { motion } from "framer-motion";
import { FiCopy } from "react-icons/fi";

const ShareModal = lazy(() => import("./ShareModal"));

interface ReferralInviteProps {
  promoCode: string;
  isShareModalOpen?: boolean;
  setIsShareModalOpen?: (isOpen: boolean) => void;
}
const ReferralInvite = forwardRef<any, ReferralInviteProps>(
  (
    {
      promoCode,
      isShareModalOpen: externalShareModalOpen,
      setIsShareModalOpen: setExternalShareModalOpen,
    },
    ref
  ) => {
    const [copied, setCopied] = useState(false);
    const [internalShareModalOpen, setInternalShareModalOpen] = useState(false);

    const isShareModalOpen =
      externalShareModalOpen !== undefined
        ? externalShareModalOpen
        : internalShareModalOpen;

    const setIsShareModalOpen =
      setExternalShareModalOpen || setInternalShareModalOpen;

    // Expose the openShareModal method to parent components
    useImperativeHandle(ref, () => ({
      openShareModal: () => setIsShareModalOpen(true),
    }));

    const handleCopyCode = useCallback(() => {
      navigator.clipboard.writeText(promoCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }, [promoCode]);

    const openShareModal = useCallback(() => {
      setIsShareModalOpen(true);
    }, [setIsShareModalOpen]);

    const closeShareModal = useCallback(() => {
      setIsShareModalOpen(false);
    }, [setIsShareModalOpen]);

    return (
      <>
        <motion.div
          className="w-full bg-[#292B30] rounded-lg p-6 my-6 "
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <div className="max-w-md mx-auto">
            <h3 className="text-white text-center text-lg font-medium mb-2">
              Invite a friend and get 1 Point(s)
            </h3>
            <p className="text-gray-400 text-center text-sm mb-4">
              Give a friend promo code on Points and you'll get 5 points off
              your next purchase.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 items-center">
              <motion.div
                className="flex-1 w-full bg-[#333] p-3 rounded-lg flex items-center gap-2 cursor-pointer"
                onClick={handleCopyCode}
                whileHover={{ backgroundColor: "#3a3a3a" }}
                whileTap={{ scale: 0.98 }}
              >
                <span className="text-gray-400">
                  <FiCopy size={18} />
                </span>
                <span className="text-white font-medium">{promoCode}</span>
              </motion.div>

              <motion.button
                className="bg-Red text-white py-3 px-4 rounded-lg whitespace-nowrap w-full sm:w-auto"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={openShareModal}
              >
                Invite Friends
              </motion.button>
            </div>
          </div>

          {copied && (
            <motion.p
              className="text-green-400 text-center mt-2 text-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              Code copied to clipboard!
            </motion.p>
          )}
        </motion.div>

        {isShareModalOpen && (
          <Suspense
            fallback={
              <div className="fixed inset-0 bg-black bg-opacity-50 z-50" />
            }
          >
            <ShareModal
              isOpen={isShareModalOpen}
              onClose={closeShareModal}
              promoCode={promoCode}
            />
          </Suspense>
        )}
      </>
    );
  }
);

export default React.memo(ReferralInvite);
