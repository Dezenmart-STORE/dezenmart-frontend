/**
 * USAGE EXAMPLE — DezenMart Cart System
 * ────────────────────────────────────────────────────────────────────────────
 */

// ═══════════════════════════════════════════════════════════════════════════════
// 1.  Wire up in App.tsx  (wrap once, renders CartModal + CartButton globally)
// ═══════════════════════════════════════════════════════════════════════════════
import { CartProvider, CartModal, CartButton } from "./index";

export const CartApp = ({ children }: { children: React.ReactNode }) => (
  <CartProvider>
    {/* Render modal + FAB once at root — they read from context */}
    <CartModal />
    <CartButton variant="floating" position="bottom-right" />
    {children}
  </CartProvider>
);


// ═══════════════════════════════════════════════════════════════════════════════
// 2.  Inline button in a Navbar (non-floating variant)
// ═══════════════════════════════════════════════════════════════════════════════
import { CartButton as CartNav } from "./index";

export const Navbar = () => (
  <nav>
    {/* other nav items… */}
    <CartNav variant="inline" />
  </nav>
);


// ═══════════════════════════════════════════════════════════════════════════════
// 3.  Add to cart from ProductCard
// ═══════════════════════════════════════════════════════════════════════════════
import { AddToCartButton } from "./index";
import type { Product } from "../../utils/types";

export const ProductCard = ({ product }: { product: Product }) => (
  <div className="product-card">
    <img src={product.images?.[0]} alt={product.name} />
    <p>{product.name}</p>
    <p>${product.price}</p>

    {/* Shows qty controls when already in cart */}
    <AddToCartButton product={product} showControls />
  </div>
);


// ═══════════════════════════════════════════════════════════════════════════════
// 4.  Add to cart from PurchaseSection (with selected variant + quantity)
// ═══════════════════════════════════════════════════════════════════════════════
import { AddToCartButton as CartAdd } from "./index";
import type { ProductVariant } from "../../utils/types";

export const PurchaseSectionCartIntegration = ({
  product,
  quantity,
  selectedVariant,
}: {
  product: Product;
  quantity: number;
  selectedVariant?: ProductVariant;
}) => (
  // Place alongside your existing "Buy Now" button
  <CartAdd product={product} quantity={quantity} variant={selectedVariant} />
);


// ═══════════════════════════════════════════════════════════════════════════════
// 5.  Open cart programmatically from anywhere
// ═══════════════════════════════════════════════════════════════════════════════
import { useCart } from "./index";

export const SomeOtherComponent = () => {
  const { openCart, addToCart, items, totals } = useCart();

  return (
    <div>
      <p>{items.length} items · ${totals.total.toFixed(2)} total</p>
      <button onClick={openCart}>View Cart</button>
    </div>
  );
};


// ═══════════════════════════════════════════════════════════════════════════════
// 6.  Product type extension needed in your types file
//     Add these fields to the existing Product type:
// ═══════════════════════════════════════════════════════════════════════════════
/*
  interface Product {
    // ...existing fields...
    tradeId?: number;                 // on-chain trade ID from DezenMart contract
    paymentTokenAddress?: string;     // ERC-20 address (default: CELO)
  }

  interface Seller {
    // ...existing fields...
    walletAddress?: string;           // seller's on-chain address
  }
*/
