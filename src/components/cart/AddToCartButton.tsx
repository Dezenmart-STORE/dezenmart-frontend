import { useCallback } from "react";
import { motion } from "framer-motion";
import { FiShoppingCart, FiCheck } from "react-icons/fi";
import type { Product, ProductVariant } from "../../utils/types";
import { useCart } from "./CartContext";

interface AddToCartButtonProps {
  product: Product;
  quantity?: number;
  variant?: ProductVariant | null;
  /** Show quantity controls when item is already in cart */
  showControls?: boolean;
  className?: string;
}

/**
 * AddToCartButton
 *
 * Drop this onto any ProductCard or PurchaseSection.
 * When `showControls` is true and the item is already in cart, it renders
 * inline +/- controls instead of the "Add" button.
 */
export const AddToCartButton = ({
  product,
  quantity = 1,
  variant,
  showControls = true,
  className = "",
}: AddToCartButtonProps) => {
  const { addToCart, incrementQty, decrementQty, isInCart, getItemQty, openCart } = useCart();
  const inCart = isInCart(product._id);
  const qty = getItemQty(product._id);

  const handleAdd = useCallback(() => {
    addToCart(product, quantity, variant);
  }, [addToCart, product, quantity, variant]);

  // If already in cart and showControls → show qty row
  if (inCart && showControls) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <button
          onClick={() => decrementQty(product._id)}
          className="w-8 h-8 flex items-center justify-center bg-[#292B30] hover:bg-[#31333a] text-white rounded-lg transition-colors text-lg font-bold"
          aria-label="Remove one"
        >
          −
        </button>
        <span className="text-white font-semibold w-6 text-center">{qty}</span>
        <button
          onClick={() => incrementQty(product._id)}
          className="w-8 h-8 flex items-center justify-center bg-[#292B30] hover:bg-[#31333a] text-white rounded-lg transition-colors text-lg font-bold"
          aria-label="Add one more"
        >
          +
        </button>
        <button
          onClick={openCart}
          className="ml-1 text-xs text-[#E23B3B] hover:underline flex items-center gap-1"
        >
          <FiCheck size={12} /> View cart
        </button>
      </div>
    );
  }

  return (
    <motion.button
      onClick={handleAdd}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.97 }}
      className={`flex items-center justify-center gap-2 bg-[#292B30] hover:bg-[#31333a] border border-[#2F3136] hover:border-[#E23B3B] text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${className}`}
    >
      <FiShoppingCart size={15} />
      {/* Add to Cart */}
    </motion.button>
  );
};
