import { motion, AnimatePresence } from "framer-motion";
import { FiShoppingCart } from "react-icons/fi";
import { useCart } from "./CartContext";

/**
 * CartButton
 *
 * A floating action button that shows the cart item count badge and opens the
 * CartModal on click. Drop this once in your layout (e.g. inside your Navbar
 * or at the root, beside <CartModal />).
 *
 * It can also be used inline (non-floating) by passing `variant="inline"`.
 */
interface CartButtonProps {
  variant?: "floating" | "inline";
  position?: "bottom-right" | "bottom-left" | "top-right";
}

const posClass = {
  "bottom-right": "bottom-6 right-6",
  "bottom-left": "bottom-6 left-6",
  "top-right": "top-20 right-6",
};

export const CartButton = ({
  variant = "floating",
  position = "bottom-right",
}: CartButtonProps) => {
  const { items, openCart } = useCart();
  const count = items.reduce((acc, i) => acc + i.quantity, 0);

  const button = (
    <motion.button
      onClick={openCart}
      whileHover={{ scale: 1.06 }}
      whileTap={{ scale: 0.94 }}
      className={
        variant === "floating"
          ? `fixed ${posClass[position]} z-40 w-14 h-14 bg-[#E23B3B] hover:bg-red-600 text-white rounded-full shadow-xl shadow-red-900/30 flex items-center justify-center transition-colors`
          : "relative p-2 text-white hover:text-[#E23B3B] transition-colors"
      }
      aria-label={`Open cart (${count} items)`}
    >
      <FiShoppingCart size={variant === "floating" ? 22 : 20} />

      {/* Badge */}
      <AnimatePresence>
        {count > 0 && (
          <motion.span
            key="badge"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            className="absolute -top-1 -right-1 bg-white text-[#E23B3B] text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center shadow"
          >
            {count > 99 ? "99+" : count}
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );

  return button;
};
