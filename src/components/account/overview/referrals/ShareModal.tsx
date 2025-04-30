import { motion, AnimatePresence } from "framer-motion";
import { FiX, FiCopy } from "react-icons/fi";
import {
  FaFacebook,
  FaTwitter,
  FaWhatsapp,
  FaTelegram,
  FaEnvelope,
} from "react-icons/fa";

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  promoCode: string;
}

const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  promoCode,
}) => {
  const shareText = `Use my promo code ${promoCode} to get points on your first purchase!`;

  const socialLinks = [
    {
      name: "Facebook",
      icon: <FaFacebook size={24} />,
      color: "#1877F2",
      url: `https://www.facebook.com/sharer/sharer.php?u=${
        window.location.href
      }&quote=${encodeURIComponent(shareText)}`,
    },
    {
      name: "Twitter",
      icon: <FaTwitter size={24} />,
      color: "#1DA1F2",
      url: `https://twitter.com/intent/tweet?text=${encodeURIComponent(
        shareText
      )}&url=${window.location.href}`,
    },
    {
      name: "WhatsApp",
      icon: <FaWhatsapp size={24} />,
      color: "#25D366",
      url: `https://wa.me/?text=${encodeURIComponent(
        shareText + " " + window.location.href
      )}`,
    },
    {
      name: "Telegram",
      icon: <FaTelegram size={24} />,
      color: "#0088cc",
      url: `https://t.me/share/url?url=${
        window.location.href
      }&text=${encodeURIComponent(shareText)}`,
    },
    {
      name: "Email",
      icon: <FaEnvelope size={24} />,
      color: "#D44638",
      url: `mailto:?subject=Check out this promo code&body=${encodeURIComponent(
        shareText + " " + window.location.href
      )}`,
    },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 bg-black bg-opacity-80 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="bg-[#292B30] rounded-lg max-w-md w-full p-6 relative"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
          >
            <motion.button
              className="absolute right-4 top-4 text-gray-400 hover:text-white"
              onClick={onClose}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <FiX size={24} />
            </motion.button>

            <h3 className="text-xl font-bold text-white mb-4">
              Share your code
            </h3>

            <div className="p-3 bg-[#333] rounded-lg mb-6 flex items-center justify-between">
              <span className="text-white font-medium">{promoCode}</span>
              <motion.button
                className="text-gray-400 hover:text-white"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => {
                  navigator.clipboard.writeText(promoCode);
                }}
              >
                <FiCopy size={20} />
              </motion.button>
            </div>

            <div className="grid grid-cols-5 gap-4">
              {socialLinks.map((social) => (
                <motion.a
                  key={social.name}
                  href={social.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col items-center gap-2"
                  whileHover={{ y: -3 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: social.color }}
                  >
                    {social.icon}
                  </div>
                  <span className="text-xs text-gray-300">{social.name}</span>
                </motion.a>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ShareModal;
