import { Fragment, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiMinus, FiPlus, FiTrash2, FiShoppingCart, FiX, FiTruck, FiCheck } from "react-icons/fi";
import { HiExclamationTriangle, HiCheckCircle } from "react-icons/hi2";
import { FaSpinner, FaWallet } from "react-icons/fa";
import { useCart } from "./CartContext";
// import { useWeb3 } from "../../context/Web3Context";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import type { CartLogisticsProvider } from "./cart.types";
import { useAccount } from "wagmi";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (n: number) =>
  n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 4 });

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Single cart row */
const CartRow = ({ item }: { item: ReturnType<typeof useCart>["items"][0] }) => {
  const { incrementQty, decrementQty, removeFromCart } = useCart();

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="flex gap-3 py-3 border-b border-[#2F3136] last:border-0"
    >
      {/* Image */}
      <div className="w-16 h-16 rounded-lg overflow-hidden bg-[#292B30] flex-shrink-0">
        {item.image ? (
          <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[#545456]">
            <FiShoppingCart size={20} />
          </div>
        )}
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm font-medium truncate">{item.name}</p>

        {/* Variant */}
        {item.variant && (
          <p className="text-xs text-[#C6C6C8] mt-0.5">
            {Object.entries(item.variant)
              .filter(([k]) => k !== "quantity")
              .map(([k, v]) => `${k}: ${v}`)
              .join(" · ")}
          </p>
        )}

        {/* Token badge */}
        <div className="flex items-center gap-1.5 mt-1">
          <span className="text-xs bg-[#292B30] border border-[#2F3136] text-[#C6C6C8] px-2 py-0.5 rounded-full">
            {item.paymentToken}
          </span>
          <span className="text-xs text-[#C6C6C8]">
            {fmt(item.unitPrice)} / unit
          </span>
        </div>

        {/* Qty controls + line total */}
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center bg-[#212428] rounded-lg">
            <button
              onClick={() => decrementQty(item.productId)}
              className="p-1.5 text-[#C6C6C8] hover:text-white transition-colors disabled:opacity-40"
              aria-label="Decrease quantity"
            >
              <FiMinus size={12} />
            </button>
            <span className="w-7 text-center text-white text-sm">{item.quantity}</span>
            <button
              onClick={() => incrementQty(item.productId)}
              className="p-1.5 text-[#C6C6C8] hover:text-white transition-colors"
              aria-label="Increase quantity"
            >
              <FiPlus size={12} />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[#E23B3B] font-semibold text-sm">
              {fmt(item.unitPrice * item.quantity)} {item.paymentToken}
            </span>
            <button
              onClick={() => removeFromCart(item.productId)}
              className="text-[#545456] hover:text-red-400 transition-colors p-1"
              aria-label="Remove item"
            >
              <FiTrash2 size={13} />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

/** Logistics selector inside cart */
const LogisticsPanel = () => {
  const { selectedLogistics, setLogistics } = useCart();

  // Hardcoded demo providers — replace with useGetLogisticsProvidersQuery() data
  const DEMO_PROVIDERS: CartLogisticsProvider[] = [
    {
      address: "0x0000000000000000000000000000000000000001",
      name: "Swift Logistics",
      cost: 5,
      deliveryTime: "1-2 days",
      rating: 4.8,
    },
    {
      address: "0x0000000000000000000000000000000000000002",
      name: "Express Courier",
      cost: 12,
      deliveryTime: "Same day",
      rating: 4.9,
    },
    {
      address: "0x0000000000000000000000000000000000000003",
      name: "Standard Delivery",
      cost: 2,
      deliveryTime: "3-5 days",
      rating: 4.5,
    },
  ];

  return (
    <div className="mt-4">
      <div className="flex items-center gap-2 mb-3">
        <FiTruck className="text-[#C6C6C8]" size={14} />
        <span className="text-sm text-[#C6C6C8] font-medium">Delivery (shared for all items)</span>
      </div>

      <div className="space-y-2">
        {DEMO_PROVIDERS.map((p) => (
          <button
            key={p.address}
            onClick={() => setLogistics(p)}
            className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all ${
              selectedLogistics?.address === p.address
                ? "border-[#E23B3B] bg-[#E23B3B]/10"
                : "border-[#2F3136] bg-[#212428] hover:border-[#545456]"
            }`}
          >
            <div>
              <p className="text-white text-sm font-medium">{p.name}</p>
              <p className="text-xs text-[#C6C6C8]">
                {p.deliveryTime} · ★ {p.rating}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[#E23B3B] font-semibold text-sm">
                ${fmt(p.cost)}
              </span>
              {selectedLogistics?.address === p.address && (
                <FiCheck className="text-[#E23B3B]" size={14} />
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

/** Price breakdown row */
const BreakdownRow = ({
  label,
  value,
  bold,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) => (
  <div
    className={`flex justify-between ${bold ? "text-white font-semibold" : "text-[#C6C6C8]"} text-sm`}
  >
    <span>{label}</span>
    <span>{value}</span>
  </div>
);

/** Success screen */
const SuccessScreen = () => {
  const { lastPurchase, closeCart } = useCart();
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center gap-4 py-8 px-4 text-center">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", damping: 10 }}
      >
        <HiCheckCircle className="text-green-400 w-16 h-16" />
      </motion.div>
      <h3 className="text-white font-bold text-xl">Order Placed!</h3>
      <p className="text-[#C6C6C8] text-sm">
        Your cart purchase was submitted to the blockchain.
      </p>
      {lastPurchase && (
        <div className="w-full bg-[#212428] rounded-xl p-4 text-left space-y-2">
          <p className="text-xs text-[#C6C6C8] font-medium uppercase tracking-wide">
            Purchase IDs
          </p>
          {lastPurchase.purchaseIds.map((id, i) => (
            <p key={i} className="text-white text-sm font-mono">
              #{id.toString()}
            </p>
          ))}
          <p className="text-xs text-[#545456] font-mono mt-2 truncate">
            Tx: {lastPurchase.txHash}
          </p>
        </div>
      )}
      <div className="flex gap-2 w-full mt-2">
        <button
          onClick={() => { closeCart(); navigate("/orders"); }}
          className="flex-1 bg-[#E23B3B] hover:bg-red-600 text-white py-3 rounded-xl text-sm font-semibold transition-colors"
        >
          View Orders
        </button>
        <button
          onClick={closeCart}
          className="flex-1 bg-[#292B30] text-[#C6C6C8] hover:text-white py-3 rounded-xl text-sm font-medium transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  );
};

// ─── Main CartModal ───────────────────────────────────────────────────────────
export const CartModal = () => {
  const {
    items,
    totals,
    selectedLogistics,
    isOpen,
    isBuying,
    buyError,
    lastPurchase,
    clearCart,
    buyCart,
    closeCart,
  } = useCart();

  // const { wallet } = useWeb3();
  const wallet = useAccount()
  // wallet.
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const handleCheckout = useCallback(async () => {
    if (!isAuthenticated) {
      closeCart();
      navigate("/login");
      return;
    }
    if (!wallet.isConnected) {
      // trigger wallet modal via web3 context if available
      return;
    }
    await buyCart();
  }, [isAuthenticated, wallet.isConnected, buyCart, closeCart, navigate]);

  const btnLabel = () => {
    if (!isAuthenticated) return "Login to Checkout";
    if (!wallet.isConnected) return "Connect Wallet";
    if (!selectedLogistics) return "Select Delivery First";
    if (isBuying) return "Processing…";
    return `Pay ${fmt(totals.total)} CELO`;
  };

  const btnDisabled =
    isBuying ||
    items.length === 0 ||
    (!lastPurchase && !!selectedLogistics && !selectedLogistics);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeCart}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 26, stiffness: 260 }}
            className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md bg-[#1A1C20] flex flex-col shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#2F3136]">
              <div className="flex items-center gap-2">
                <FiShoppingCart className="text-white" size={18} />
                <h2 className="text-white font-bold text-lg">Cart</h2>
                {items.length > 0 && (
                  <span className="bg-[#E23B3B] text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                    {items.length}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {items.length > 0 && !lastPurchase && (
                  <button
                    onClick={clearCart}
                    className="text-xs text-[#545456] hover:text-red-400 transition-colors"
                  >
                    Clear all
                  </button>
                )}
                <button
                  onClick={closeCart}
                  className="text-[#545456] hover:text-white transition-colors p-1"
                >
                  <FiX size={18} />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-5 py-4">
              {lastPurchase ? (
                <SuccessScreen />
              ) : items.length === 0 ? (
                /* Empty state */
                <div className="flex flex-col items-center justify-center h-full gap-4 py-12">
                  <div className="w-20 h-20 rounded-full bg-[#292B30] flex items-center justify-center">
                    <FiShoppingCart className="text-[#545456]" size={32} />
                  </div>
                  <p className="text-white font-semibold text-lg">Your cart is empty</p>
                  <p className="text-[#C6C6C8] text-sm text-center">
                    Browse products and add them to your cart to get started.
                  </p>
                  <button
                    onClick={closeCart}
                    className="bg-[#E23B3B] hover:bg-red-600 text-white px-6 py-2.5 rounded-xl text-sm font-semibold transition-colors"
                  >
                    Browse Products
                  </button>
                </div>
              ) : (
                <>
                  {/* Items */}
                  <AnimatePresence>
                    {items.map((item) => (
                      <CartRow key={item.productId} item={item} />
                    ))}
                  </AnimatePresence>

                  {/* Delivery */}
                  <LogisticsPanel />

                  {/* Price breakdown */}
                  <div className="mt-4 bg-[#212428] rounded-xl p-4 space-y-2">
                    <BreakdownRow label="Subtotal" value={`${fmt(totals.subtotal)} CELO`} />
                    <BreakdownRow
                      label="Escrow Fee (2.5%)"
                      value={`${fmt(totals.escrowFee)} CELO`}
                    />
                    {selectedLogistics && (
                      <BreakdownRow
                        label={`Delivery (${selectedLogistics.name})`}
                        value={`${fmt(totals.deliveryCost)} CELO`}
                      />
                    )}
                    <div className="border-t border-[#2F3136] pt-2">
                      <BreakdownRow
                        label="Total"
                        value={`${fmt(totals.total)} CELO`}
                        bold
                      />
                    </div>
                  </div>

                  {/* Token notice */}
                  <p className="text-xs text-[#545456] text-center mt-3">
                    All payments processed in{" "}
                    <span className="text-[#C6C6C8]">CELO</span> via DezenMart
                    escrow contract
                  </p>

                  {/* Wallet info */}
                  {wallet.isConnected && wallet.address && (
                    <div className="mt-3 bg-[#292B30] rounded-xl px-4 py-2.5 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                        <span className="text-xs text-[#C6C6C8]">
                          {wallet.address.slice(0, 6)}…{wallet.address.slice(-4)}
                        </span>
                      </div>
                      <span className="text-xs text-white font-mono">
                        {wallet.tokenBalances?.["CELO"]?.formatted ?? "—"} CELO
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Footer checkout */}
            {!lastPurchase && items.length > 0 && (
              <div className="px-5 py-4 border-t border-[#2F3136] space-y-3">
                {/* Error */}
                {buyError && (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-start gap-2 bg-red-500/10 border border-red-500/30 rounded-xl p-3"
                  >
                    <HiExclamationTriangle className="text-red-400 w-4 h-4 mt-0.5 flex-shrink-0" />
                    <p className="text-red-400 text-xs">{buyError}</p>
                  </motion.div>
                )}

                <button
                  onClick={handleCheckout}
                  disabled={isBuying || !isAuthenticated ? false : !wallet.isConnected || !selectedLogistics}
                  className="w-full bg-[#E23B3B] hover:bg-red-600 disabled:bg-[#3A3C40] disabled:cursor-not-allowed text-white py-3.5 rounded-xl font-semibold text-sm transition-colors flex items-center justify-center gap-2"
                >
                  {isBuying ? (
                    <>
                      <FaSpinner className="animate-spin w-4 h-4" />
                      Processing…
                    </>
                  ) : (
                    <>
                      <FaWallet className="w-4 h-4" />
                      {btnLabel()}
                    </>
                  )}
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
