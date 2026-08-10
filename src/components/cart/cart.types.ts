import type { Product, ProductVariant } from "../../utils/types";

// ─── Cart Item ────────────────────────────────────────────────────────────────
export interface CartItem {
  /** MongoDB product id */
  productId: string;
  /** On-chain tradeId from the DezenMart contract */
  tradeId: number;
  /** Quantity user wants to buy */
  quantity: number;
  /** Price per unit in USD at time of adding */
  unitPrice: number;
  /** Payment token symbol (forced to "CELO" for now) */
  paymentToken: string;
  /** Payment token contract address */
  paymentTokenAddress: string;
  /** The seller's on-chain address */
  sellerAddress: string;
  /** Denormalised product fields for display */
  name: string;
  image: string;
  /** Optional selected variant */
  variant?: ProductVariant | null;
  /** Timestamp when added */
  addedAt: number;
}

// ─── Checkout state ───────────────────────────────────────────────────────────
export interface CartTotals {
  subtotal: number;         // sum of (unitPrice × qty) for all items
  escrowFee: number;        // 2.5% of subtotal  (250 / 10000 bps from contract)
  deliveryCost: number;     // single logistics cost shared across all items
  total: number;            // subtotal + escrowFee + deliveryCost
}

// ─── Logistics ────────────────────────────────────────────────────────────────
export interface CartLogisticsProvider {
  address: string;          // on-chain wallet address of provider
  name: string;
  cost: number;             // in USD
  deliveryTime?: string;
  rating?: number;
}

// ─── Purchase result ──────────────────────────────────────────────────────────
export interface CartPurchaseResult {
  purchaseIds: bigint[];
  txHash: string;
}

// ─── Backend sync shapes (fire-and-forget, non-blocking) ─────────────────────
export interface BackendCartItem {
  productId: string;
  tradeId: number;
  quantity: number;
}

// ─── Context type ─────────────────────────────────────────────────────────────
export interface CartContextType {
  // State
  items: CartItem[];
  totals: CartTotals;
  selectedLogistics: CartLogisticsProvider | null;
  isOpen: boolean;
  isBuying: boolean;
  buyError: string | null;
  lastPurchase: CartPurchaseResult | null;

  // Item actions
  addToCart: (product: Product, quantity?: number, variant?: ProductVariant | null) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  incrementQty: (productId: string) => void;
  decrementQty: (productId: string) => void;
  clearCart: () => void;
  isInCart: (productId: string) => boolean;
  getItemQty: (productId: string) => number;

  // Logistics
  setLogistics: (provider: CartLogisticsProvider | null) => void;

  // Checkout
  buyCart: () => Promise<void>;

  // Modal
  openCart: () => void;
  closeCart: () => void;

  // Backend sync (non-blocking helpers)
  syncCartToBackend: () => Promise<void>;
}
