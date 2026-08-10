import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  ReactNode,
} from "react";
import { ethers } from "ethers";
import type { Product, ProductVariant } from "../../utils/types";
import type {
  CartItem,
  CartTotals,
  CartLogisticsProvider,
  CartContextType,
  CartPurchaseResult,
} from "./cart.types";
import { loadCart, saveCart, clearPersistedCart } from "./cart.storage";
import {
  backendAddToCart,
  backendUpdateCartItem,
  backendRemoveCartItem,
  syncCartToBackend,
} from "./cart.backendSync";
// import { useWeb3 } from "../../context/Web3Context"; // adjust path
import { useAuth } from "../../context/AuthContext";   // adjust path
import { useAccount } from "wagmi";

// ─── Contract constants ───────────────────────────────────────────────────────
const CONTRACT_ADDRESS = "0xe7f59DC77ee3f641Ef8695F6c91565e26088d686";
const ESCROW_FEE_BPS = 250; // 2.5% = 250 / 10000
const MAX_CART_SIZE = 20;

/**
 * Minimal ABI — only what the cart needs:
 *  • buyCart(CartItem[], logisticsProvider, logisticsCost) → purchaseIds[]
 *  • registerBuyer()
 */
const CONTRACT_ABI = [
  // buyCart
  {
    inputs: [
      {
        components: [
          { internalType: "uint256", name: "tradeId", type: "uint256" },
          { internalType: "uint256", name: "quantity", type: "uint256" },
        ],
        internalType: "struct DezenMartLogistics.CartItem[]",
        name: "items",
        type: "tuple[]",
      },
      { internalType: "address", name: "logisticsProvider", type: "address" },
      { internalType: "uint256", name: "logisticsCost", type: "uint256" },
    ],
    name: "buyCart",
    outputs: [{ internalType: "uint256[]", name: "purchaseIds", type: "uint256[]" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  // registerBuyer
  {
    inputs: [],
    name: "registerBuyer",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  // buyers mapping
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "buyers",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  // CartPurchaseCreated event
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "buyer", type: "address" },
      { indexed: false, internalType: "uint256[]", name: "purchaseIds", type: "uint256[]" },
      { indexed: false, internalType: "address", name: "logisticsProvider", type: "address" },
      { indexed: false, internalType: "address[]", name: "tokensUsed", type: "address[]" },
      { indexed: false, internalType: "uint256[]", name: "tokenAmounts", type: "uint256[]" },
    ],
    name: "CartPurchaseCreated",
    type: "event",
  },
] as const;

// Minimal ERC-20 ABI for approve + allowance
const ERC20_ABI = [
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
];

// ─── Context ──────────────────────────────────────────────────────────────────
const CartContext = createContext<CartContextType | null>(null);

export const useCart = (): CartContextType => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside <CartProvider>");
  return ctx;
};

// ─── Provider ─────────────────────────────────────────────────────────────────
export const CartProvider = ({ children }: { children: ReactNode }) => {
  // const { wallet } = useWeb3();
    const wallet = useAccount()
  const { isAuthenticated, user } = useAuth();

  // ── Core state ──────────────────────────────────────────────────────────────
  const [items, setItems] = useState<CartItem[]>(() => loadCart());
  const [selectedLogistics, setSelectedLogistics] = useState<CartLogisticsProvider | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isBuying, setIsBuying] = useState(false);
  const [buyError, setBuyError] = useState<string | null>(null);
  const [lastPurchase, setLastPurchase] = useState<CartPurchaseResult | null>(null);

  // Track whether we already synced on this login session
  const hasSyncedRef = useRef(false);

  // ── Persist to localStorage whenever items change ───────────────────────────
  useEffect(() => {
    saveCart(items);
  }, [items]);

  // ── Sync local cart to backend when user logs in ────────────────────────────
  useEffect(() => {
    if (isAuthenticated && !hasSyncedRef.current && items.length > 0) {
      hasSyncedRef.current = true;
      // Fire-and-forget — never awaited, never blocks UI
      syncCartToBackend(
        items.map((i) => ({
          productId: i.productId,
          tradeId: i.tradeId,
          quantity: i.quantity,
        }))
      );
    }
    if (!isAuthenticated) {
      hasSyncedRef.current = false;
    }
  }, [isAuthenticated, items]);

  // ── Totals ─────────────────────────────────────────────────────────────────
  const totals = useMemo<CartTotals>(() => {
    const subtotal = items.reduce((acc, i) => acc + i.unitPrice * i.quantity, 0);
    const escrowFee = (subtotal * ESCROW_FEE_BPS) / 10_000;
    const deliveryCost = selectedLogistics?.cost ?? 0;
    return {
      subtotal,
      escrowFee,
      deliveryCost,
      total: subtotal + escrowFee + deliveryCost,
    };
  }, [items, selectedLogistics]);

  // ── Helpers ────────────────────────────────────────────────────────────────
  const isInCart = useCallback(
    (productId: string) => items.some((i) => i.productId === productId),
    [items]
  );

  const getItemQty = useCallback(
    (productId: string) => items.find((i) => i.productId === productId)?.quantity ?? 0,
    [items]
  );

  // ── Add to cart ─────────────────────────────────────────────────────────────
  const addToCart = useCallback(
    (product: Product, quantity = 1, variant?: ProductVariant | null) => {
      if (items.length >= MAX_CART_SIZE) {
        console.warn("Cart is full (max 20 items)");
        return;
      }

      setItems((prev) => {
        const existing = prev.find((i) => i.productId === product._id);
        if (existing) {
          const updated = prev.map((i) =>
            i.productId === product._id
              ? { ...i, quantity: i.quantity + quantity }
              : i
          );
          // fire-and-forget backend sync
          backendUpdateCartItem(product._id, existing.quantity + quantity);
          return updated;
        }

        const newItem: CartItem = {
          productId: product._id,
          tradeId: product.tradeId ?? 0, // products should have tradeId from contract
          quantity,
          unitPrice: product.price,
          paymentToken: "CELO",            // forced for now
          paymentTokenAddress:
            product.paymentTokenAddress ??
            "0x471EcE3750Da237f93B8E339c536989b8978a438", // mainnet CELO token
          sellerAddress: typeof product.seller === "object"
            ? product.seller.walletAddress ?? ""
            : "",
          name: product.name,
          image: Array.isArray(product.images) ? product.images[0] : "",
          variant: variant ?? null,
          addedAt: Date.now(),
        };

        backendAddToCart(product._id, quantity, newItem.tradeId);
        return [...prev, newItem];
      });
    },
    [items.length]
  );

  // ── Remove ─────────────────────────────────────────────────────────────────
  const removeFromCart = useCallback((productId: string) => {
    setItems((prev) => prev.filter((i) => i.productId !== productId));
    backendRemoveCartItem(productId);
  }, []);

  // ── Update quantity ────────────────────────────────────────────────────────
  const updateQuantity = useCallback((productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setItems((prev) =>
      prev.map((i) => (i.productId === productId ? { ...i, quantity } : i))
    );
    backendUpdateCartItem(productId, quantity);
  }, [removeFromCart]);

  const incrementQty = useCallback((productId: string) => {
    setItems((prev) =>
      prev.map((i) => {
        if (i.productId !== productId) return i;
        const updated = { ...i, quantity: i.quantity + 1 };
        backendUpdateCartItem(productId, updated.quantity);
        return updated;
      })
    );
  }, []);

  const decrementQty = useCallback((productId: string) => {
    setItems((prev) => {
      const item = prev.find((i) => i.productId === productId);
      if (!item) return prev;
      if (item.quantity <= 1) {
        backendRemoveCartItem(productId);
        return prev.filter((i) => i.productId !== productId);
      }
      const qty = item.quantity - 1;
      backendUpdateCartItem(productId, qty);
      return prev.map((i) => (i.productId === productId ? { ...i, quantity: qty } : i));
    });
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
    clearPersistedCart();
  }, []);

  // ── Logistics ──────────────────────────────────────────────────────────────
  const setLogistics = useCallback((provider: CartLogisticsProvider | null) => {
    setSelectedLogistics(provider);
  }, []);

  // ── Modal ─────────────────────────────────────────────────────────────────
  const openCart = useCallback(() => setIsOpen(true), []);
  const closeCart = useCallback(() => {
    setIsOpen(false);
    setBuyError(null);
  }, []);

  // ── Backend sync (public, can be called after login) ──────────────────────
  const syncCartToBackendPublic = useCallback(async () => {
    await syncCartToBackend(
      items.map((i) => ({
        productId: i.productId,
        tradeId: i.tradeId,
        quantity: i.quantity,
      }))
    );
  }, [items]);

  // ── buyCart — the main blockchain transaction ──────────────────────────────
  const buyCart = useCallback(async () => {
    setBuyError(null);

    if (!wallet.isConnected || !wallet.address) {
      setBuyError("Please connect your wallet first.");
      return;
    }

    if (items.length === 0) {
      setBuyError("Your cart is empty.");
      return;
    }

    if (!selectedLogistics) {
      setBuyError("Please select a delivery provider.");
      return;
    }

    setIsBuying(true);

    try {
      // 1. Get signer from the web3 context provider
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const signer = await provider.getSigner();

      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

      // 2. Ensure buyer is registered
      const isRegistered: boolean = await contract.buyers(wallet.address);
      if (!isRegistered) {
        const regTx = await contract.registerBuyer();
        await regTx.wait();
      }

      // 3. Group items by payment token (all CELO for now)
      //    Contract: buyCart takes items[] with {tradeId, quantity}
      //    It internally handles multi-token via tokensUsed[]
      const contractItems = items.map((i) => ({
        tradeId: BigInt(i.tradeId),
        quantity: BigInt(i.quantity),
      }));

      // 4. Calculate total amount to approve (subtotal + escrow, in token decimals)
      //    All items forced to CELO (18 decimals)
      const totalInToken = ethers.parseEther(totals.total.toFixed(18));
      const logisticsCostInToken = ethers.parseEther(
        selectedLogistics.cost.toFixed(18)
      );

      // 5. Approve contract to spend CELO token
      const celoTokenAddress = items[0].paymentTokenAddress;
      const tokenContract = new ethers.Contract(celoTokenAddress, ERC20_ABI, signer);

      const currentAllowance: bigint = await tokenContract.allowance(
        wallet.address,
        CONTRACT_ADDRESS
      );

      if (currentAllowance < totalInToken) {
        const approveTx = await tokenContract.approve(CONTRACT_ADDRESS, totalInToken);
        await approveTx.wait();
      }

      // 6. Call buyCart on the contract
      const tx = await contract.buyCart(
        contractItems,
        selectedLogistics.address,
        logisticsCostInToken
      );

      const receipt = await tx.wait();

      // 7. Parse CartPurchaseCreated event to get purchaseIds
      const iface = new ethers.Interface(CONTRACT_ABI as any);
      let purchaseIds: bigint[] = [];
      for (const log of receipt.logs) {
        try {
          const parsed = iface.parseLog(log);
          if (parsed?.name === "CartPurchaseCreated") {
            purchaseIds = parsed.args.purchaseIds as bigint[];
          }
        } catch {
          // not our event
        }
      }

      setLastPurchase({ purchaseIds, txHash: receipt.hash });
      clearCart();

    } catch (err: any) {
      console.error("[CartProvider] buyCart error:", err);
      const msg =
        err?.reason ??
        err?.data?.message ??
        err?.message ??
        "Transaction failed. Please try again.";
      setBuyError(msg);
    } finally {
      setIsBuying(false);
    }
  }, [
    wallet.isConnected,
    wallet.address,
    items,
    selectedLogistics,
    totals.total,
    clearCart,
  ]);

  // ── Context value ──────────────────────────────────────────────────────────
  const value = useMemo<CartContextType>(
    () => ({
      items,
      totals,
      selectedLogistics,
      isOpen,
      isBuying,
      buyError,
      lastPurchase,
      addToCart,
      removeFromCart,
      updateQuantity,
      incrementQty,
      decrementQty,
      clearCart,
      isInCart,
      getItemQty,
      setLogistics,
      buyCart,
      openCart,
      closeCart,
      syncCartToBackend: syncCartToBackendPublic,
    }),
    [
      items,
      totals,
      selectedLogistics,
      isOpen,
      isBuying,
      buyError,
      lastPurchase,
      addToCart,
      removeFromCart,
      updateQuantity,
      incrementQty,
      decrementQty,
      clearCart,
      isInCart,
      getItemQty,
      setLogistics,
      buyCart,
      openCart,
      closeCart,
      syncCartToBackendPublic,
    ]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};
