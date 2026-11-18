import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { HiBuildingLibrary } from "react-icons/hi2";
import type { AvailableProvider, DeliveryAddress, Product, ProductVariant } from "../../../utils/types";
import {
  newIdempotencyKey,
  useCreateBankTransferOrderMutation,
  useGetBankTransferOrdersQuery,
} from "../../../store/api";
import { bankTransferOrderInputSchema, type BankTransferOrderInput } from "../../../utils/validation/bankTransfer";
import { apiErrorStatus } from "../../../utils/errors";
import { formatNaira } from "../../../utils/format";
import { useAuth } from "../../../context/AuthContext";
import { useListingPrice } from "../../../hooks/useListingPrice";
import Button from "../../common/Button";
import StatusBox from "../../common/StatusBox";
import QuantitySelector from "./QuantitySelector";
import DeliveryAddressSelector from "./DeliveryAddressSelector";
import LogisticsProviderSelector from "./LogisticsProviderSelector";
import StockStatus from "./StockStatus";

type Fulfilment = BankTransferOrderInput["fulfilment"];

interface Props {
  product?: Product;
  selectedVariant?: ProductVariant;
}

interface State {
  quantity: number;
  fulfilment: Fulfilment;
  address: DeliveryAddress | null;
  logistics: AvailableProvider | null;
}

interface Ctx {
  product: Product;
  state: State;
  update: (patch: Partial<State>) => void;
  availableQty: number;
  subtotal: number;
  offersPickup: boolean;
  offersDelivery: boolean;
  /** An unpaid order this buyer already has for this item. */
  openOrderId?: string;
  error?: string;
  placing: boolean;
  placeOrder: () => Promise<void>;
  isAuthenticated: boolean;
}

const PurchaseContext = createContext<Ctx | null>(null);
const usePurchase = () => {
  const ctx = useContext(PurchaseContext);
  if (!ctx) throw new Error("Must be used within BankTransferPurchaseProvider");
  return ctx;
};

/** Words for a refused order, by the server's status code. */
function placeOrderFailure(status: number | undefined, fulfilment: Fulfilment): string {
  switch (status) {
    case 403:
      return "You can't buy this item. If it's your own listing, buy from another account.";
    case 404:
      return "This item is no longer for sale.";
    case 409:
      return "There isn't enough left. Lower the quantity and try again.";
    case 422:
      return fulfilment === "pickup"
        ? "Pickup isn't available for this item right now. Choose delivery instead."
        : "Your delivery price has run out. Choose a delivery option again.";
    case 429:
      return "Too many tries in a row. Wait a minute, then try again.";
    default:
      return "We couldn't place your order. Try again.";
  }
}

/** What the order is, so a retry of the same order reuses its key and a changed one doesn't. */
const orderFingerprint = (order: BankTransferOrderInput) => JSON.stringify(order);

/**
 * Checkout for a listing paid in naira by bank transfer. Placing the order
 * reserves the stock; paying happens on the order page.
 */
export const BankTransferPurchaseProvider: React.FC<Props & { children: React.ReactNode }> = ({
  product,
  selectedVariant,
  children,
}) => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [createOrder, { isLoading: placing }] = useCreateBankTransferOrderMutation();
  const { data: unpaid = [] } = useGetBankTransferOrdersQuery(
    { side: "buyer", status: "awaiting_payment" },
    { skip: !isAuthenticated }
  );

  const offersPickup = product?.fulfilment?.includes("pickup") ?? false;
  const offersDelivery = product?.fulfilment ? product.fulfilment.includes("delivery") : true;
  const [state, setState] = useState<State>({
    quantity: 1,
    fulfilment: offersDelivery ? "delivery" : "pickup",
    address: null,
    logistics: null,
  });
  const [error, setError] = useState<string>();
  const update = useCallback((patch: Partial<State>) => {
    setState((s) => ({ ...s, ...patch }));
    setError(undefined);
  }, []);

  // A different variant has its own stock, so start its quantity again.
  useEffect(() => update({ quantity: 1 }), [selectedVariant, update]);

  // One key per distinct order, kept across a reload so a retry can't order twice.
  const keys = useRef(new Map<string, string>());
  const keyFor = (fingerprint: string) => {
    const storageKey = `bank-order-key:${product?._id}`;
    try {
      const saved = JSON.parse(sessionStorage.getItem(storageKey) ?? "null") as { fp: string; key: string } | null;
      if (saved?.fp === fingerprint) return saved.key;
    } catch {
      // Storage can be blocked; the in-memory key still covers double taps.
    }
    const key = keys.current.get(fingerprint) ?? newIdempotencyKey();
    keys.current.set(fingerprint, key);
    try {
      sessionStorage.setItem(storageKey, JSON.stringify({ fp: fingerprint, key }));
    } catch {
      // As above.
    }
    return key;
  };

  const availableQty = selectedVariant ? Number(selectedVariant.quantity) : Number(product?.stock) || 0;
  const subtotal = (product?.price ?? 0) * state.quantity;
  const openOrderId = unpaid.find((o) => o.items.some((i) => i.product === product?._id))?._id;

  const placeOrder = async () => {
    if (!product || placing) return;
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }
    const variantIndex = selectedVariant && product.type ? product.type.indexOf(selectedVariant) : -1;
    const parsed = bankTransferOrderInputSchema.safeParse({
      paymentMethod: "fiat",
      items: [{ product: product._id, quantity: state.quantity, ...(variantIndex >= 0 ? { variantIndex } : {}) }],
      fulfilment: state.fulfilment,
      quoteId: state.fulfilment === "delivery" ? state.logistics?.quoteId : undefined,
    });
    if (!parsed.success) {
      setError(
        state.fulfilment === "delivery" && !state.address
          ? "Add a delivery address."
          : parsed.error.issues[0]?.message ?? "Check your order and try again."
      );
      return;
    }
    if (product.minOrderQty && state.quantity < product.minOrderQty) {
      setError(`The seller sells at least ${product.minOrderQty} of this item.`);
      return;
    }

    try {
      const order = await createOrder({ order: parsed.data, idempotencyKey: keyFor(orderFingerprint(parsed.data)) }).unwrap();
      try {
        sessionStorage.removeItem(`bank-order-key:${product._id}`);
      } catch {
        // Nothing to clear.
      }
      navigate(`/orders/${order._id}`);
    } catch (err) {
      const status = apiErrorStatus(err);
      // A spent delivery price can't be reused: ask for a fresh one.
      if (status === 422 && state.fulfilment === "delivery") setState((s) => ({ ...s, logistics: null }));
      setError(placeOrderFailure(status, state.fulfilment));
    }
  };

  if (!product) return null;

  return (
    <PurchaseContext.Provider
      value={{
        product,
        state,
        update,
        availableQty,
        subtotal,
        offersPickup,
        offersDelivery,
        openOrderId,
        error,
        placing,
        placeOrder,
        isAuthenticated,
      }}
    >
      {children}
    </PurchaseContext.Provider>
  );
};

export const BankTransferPurchaseBody: React.FC = () => {
  const { product, state, update, availableQty, subtotal, offersPickup, offersDelivery } = usePurchase();
  const { usdToNaira } = useListingPrice();
  // Quotes are priced in US dollars; the server sets the order's fee in naira.
  const formatFeeInNaira = useCallback(
    (usd: number) => {
      const naira = usdToNaira(usd);
      return naira === undefined ? "Priced at checkout" : `about ${formatNaira(naira)}`;
    },
    [usdToNaira]
  );
  const chooseBoth = offersPickup && offersDelivery;

  return (
    <div className="bg-[#212428] px-4 py-4 md:px-6 space-y-4 border-t border-gray-700/30">
      <div className="flex justify-between items-center">
        <QuantitySelector
          min={1}
          max={Math.min(99, availableQty)}
          availableQuantity={availableQty}
          onChange={(quantity) => update({ quantity, logistics: null })}
        />
        <StockStatus availableQty={availableQty} />
      </div>

      {chooseBoth && (
        <fieldset>
          <legend className="text-xs font-medium text-gray-400 mb-1.5">How do you want it?</legend>
          <div className="grid grid-cols-2 gap-2">
            {(["delivery", "pickup"] as const).map((option) => (
              <label
                key={option}
                className={`flex cursor-pointer items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors focus-within:ring-2 focus-within:ring-red-400 ${
                  state.fulfilment === option
                    ? "border-red-500 bg-red-900/20 text-white"
                    : "border-[#767C87] bg-[#1a1c20] text-gray-300 hover:text-white"
                }`}
              >
                <input
                  type="radio"
                  name="fulfilment"
                  value={option}
                  checked={state.fulfilment === option}
                  onChange={() => update({ fulfilment: option })}
                  className="sr-only"
                />
                {option === "delivery" ? "Delivery" : "Pickup"}
              </label>
            ))}
          </div>
        </fieldset>
      )}

      {state.fulfilment === "delivery" ? (
        <>
          <DeliveryAddressSelector
            selectedAddress={state.address}
            onAddressSelect={(address) => update({ address, logistics: null })}
          />
          {state.address && (
            <LogisticsProviderSelector
              product={product}
              deliveryAddress={state.address}
              quantity={state.quantity}
              selectedProvider={state.logistics}
              onProviderSelect={(logistics) => update({ logistics })}
              formatCost={formatFeeInNaira}
            />
          )}
        </>
      ) : (
        <p className="text-sm text-gray-300">
          You'll collect it from the seller. Their address shows on your order once it's being prepared.
        </p>
      )}

      <div className="rounded-lg border border-gray-700/50 bg-[#292B30] p-3 space-y-2 text-sm">
        <div className="flex justify-between text-gray-300">
          <span>Items</span>
          <span>{formatNaira(subtotal)}</span>
        </div>
        {state.fulfilment === "delivery" && (
          <div className="flex justify-between text-gray-300">
            <span>Delivery</span>
            <span>
              {state.logistics?.cost != null ? formatFeeInNaira(state.logistics.cost) : "Choose an option"}
            </span>
          </div>
        )}
        <p className="pt-2 border-t border-gray-700 text-xs text-gray-400">
          Your exact total, with any service fee, is shown before you pay.
        </p>
      </div>
    </div>
  );
};

export const BankTransferPurchaseFooter: React.FC = () => {
  const { state, availableQty, openOrderId, error, placing, placeOrder, isAuthenticated } = usePurchase();
  const outOfStock = availableQty <= 0;
  const needsDeliveryChoice = state.fulfilment === "delivery" && !state.logistics?.quoteId;

  return (
    <div className="bg-[#212428] px-4 pb-4 pt-3 md:px-6 md:pb-6 xl:flex-shrink-0 border-t border-gray-700/40 space-y-3">
      {openOrderId && (
        <StatusBox tone="info" title="You have an unpaid order for this item">
          <Link to={`/orders/${openOrderId}`} className="font-medium text-white underline hover:text-gray-200">
            Go to that order
          </Link>{" "}
          to pay for it, or place a new one below.
        </StatusBox>
      )}
      {error && <StatusBox tone="danger">{error}</StatusBox>}

      <p className="flex items-start gap-2 text-xs text-gray-300">
        <HiBuildingLibrary className="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-400" aria-hidden />
        <span>
          You'll pay by bank transfer. Pandascrow, our payment partner, holds your money until you confirm you have
          your item.
        </span>
      </p>

      <Button
        variant="primary"
        title={!isAuthenticated ? "Log in to buy" : outOfStock ? "Out of stock" : "Place order"}
        loading={placing}
        loadingTitle="Placing order…"
        disabled={isAuthenticated && (outOfStock || needsDeliveryChoice)}
        onClick={() => void placeOrder()}
      />
      {isAuthenticated && !outOfStock && needsDeliveryChoice && (
        <p className="text-center text-xs text-gray-400">
          {state.address ? "Choose a delivery option to continue." : "Add a delivery address to continue."}
        </p>
      )}
    </div>
  );
};
