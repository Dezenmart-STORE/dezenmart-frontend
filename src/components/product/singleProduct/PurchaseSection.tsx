import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  memo,
  startTransition,
  createContext,
  useContext,
} from "react";
import { FaWallet, FaSpinner, FaExchangeAlt } from "react-icons/fa";
import {
  HiCurrencyDollar,
  HiSignal,
  HiExclamationTriangle,
  HiCheckCircle,
  HiArrowPath,
} from "react-icons/hi2";
import { Product, ProductVariant } from "../../../utils/types";
import { useCreateOrderMutation } from "../../../store/api";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import { useAccount, useChainId } from "wagmi";
import { useCurrency } from "../../../context/CurrencyContext";
import { useSwap } from "../../../hooks/useSwap";
import { useTokenBalances } from "../../../hooks/useTokenBalances";
import ConnectModal from "../../wallet/ConnectModal";
import { TOKENS } from "../../../config/tokens";
import type { StableToken } from "../../../config/tokens";
import { DEMO_FALLBACK_PROVIDER_ID } from "../../../config/logistics";
import { debounce } from "lodash-es";

import QuantitySelector from "./QuantitySelector";
import DeliveryAddressSelector from "./DeliveryAddressSelector";
import LogisticsProviderSelector from "./LogisticsProviderSelector";
import type { DeliveryAddress, AvailableProvider, CreateOrderParams } from "../../../utils/types";

// ── Types ─────────────────────────────────────────────────────────────────────
interface FormattedProduct extends Product {
  celoPrice: number;
  fiatPrice: number;
  tokenPrice: number;
  formattedTokenPrice: string;
  formattedUsdtPrice: string;
  formattedCeloPrice: string;
  formattedFiatPrice: string;
}

interface PurchaseSectionProps {
  product?: FormattedProduct;
  selectedVariant?: ProductVariant;
}

// ── Constants ─────────────────────────────────────────────────────────────────
const BALANCE_PRECISION = 6;
const QUOTE_DEBOUNCE_MS = 800;
const SWAP_CONFIRMATION_DELAY = 1000;
const MIN_STOCK_THRESHOLD = 10;

// ── Internal state hook ───────────────────────────────────────────────────────
const usePurchaseState = () => {
  const [state, setState] = useState({
    quantity: 1,
    selectedAddress: null as DeliveryAddress | null,
    selectedLogistics: null as AvailableProvider | null,
    isProcessing: false,
    purchaseError: null as string | null,
    showWalletModal: false,
    showSwapModal: false,
    swapQuote: "",
    isGettingQuote: false,
    mounted: false,
  });

  const updateState = useCallback((updates: Partial<typeof state>) => {
    setState((prev) => ({ ...prev, ...updates }));
  }, []);

  return [state, updateState] as const;
};

// ── Calculated totals hook ────────────────────────────────────────────────────
const useCalculatedTotals = ({
  product,
  selectedLogistics,
  quantity,
  convertPrice,
  walletSelectedToken,
}: {
  product?: FormattedProduct;
  selectedLogistics: AvailableProvider | null;
  quantity: number;
  convertPrice: (amount: number, from: string, to: string) => number;
  walletSelectedToken: StableToken;
}) => {
  return useMemo(() => {
    if (!product) {
      return {
        grandTotalUsd: 0,
        totalInSelected: 0,
        totalInPayment: 0,
        subtotal: 0,
        logisticsCost: 0,
      };
    }

    const subtotal = product.price * quantity;
    const logisticsCost = selectedLogistics?.cost || 0;
    const grandTotalUsd = subtotal + logisticsCost;

    const totalInSelected = convertPrice(grandTotalUsd, "USDT", walletSelectedToken.symbol);
    const totalInPayment = convertPrice(grandTotalUsd, "USDT", product.paymentToken);

    return { grandTotalUsd, totalInSelected, totalInPayment, subtotal, logisticsCost };
  }, [product, selectedLogistics, quantity, convertPrice, walletSelectedToken]);
};

// ── Context ───────────────────────────────────────────────────────────────────
type PurchaseState = ReturnType<typeof usePurchaseState>[0];
type UpdateState = ReturnType<typeof usePurchaseState>[1];
type ComputedTotals = ReturnType<typeof useCalculatedTotals>;

interface PurchaseContextValue {
  product: FormattedProduct | undefined;
  selectedVariant: ProductVariant | undefined;
  state: PurchaseState;
  updateState: UpdateState;
  availableQty: number;
  stockStatus: { isOutOfStock: boolean; isLowStock: boolean };
  computedTotals: ComputedTotals;
  hasSufficientBalance: boolean;
  needsSwap: boolean;
  swapOutputAmount: number;
  isLoading: boolean;
  walletSelectedToken: StableToken;
  isConnected: boolean;
  address: `0x${string}` | undefined;
  isAuthenticated: boolean;
  isSwapping: boolean;
  isLoadingBalance: boolean;
  celoBalance: string | undefined;
  formatPrice: (price: number, currency: string) => string;
  formatBalance: (balance: string | undefined) => string;
  getBalance: (symbol: string) => { numeric: number; formatted: string } | undefined;
  handleButtonClick: () => Promise<void>;
  handleConfirmSwap: () => Promise<void>;
  refreshQuote: () => void;
}

const PurchaseContext = createContext<PurchaseContextValue | null>(null);

const usePurchaseContext = (): PurchaseContextValue => {
  const ctx = useContext(PurchaseContext);
  if (!ctx) throw new Error("Must be used within PurchaseSectionProvider");
  return ctx;
};

// ── Mini display components ───────────────────────────────────────────────────
const ErrorDisplay = memo(({ error }: { error: string | null }) => {
  if (!error) return null;
  return (
    <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-lg text-sm flex items-center gap-2">
      <HiExclamationTriangle className="w-4 h-4 flex-shrink-0" />
      <span>{error}</span>
    </div>
  );
});

const StockStatus = memo(({ availableQty }: { availableQty: number }) => {
  const isOutOfStock = availableQty <= 0;
  const isLowStock = availableQty > 0 && availableQty < MIN_STOCK_THRESHOLD;
  return (
    <div className="text-xs">
      {isOutOfStock ? (
        <span className="text-red-500 font-medium flex items-center gap-1">
          <HiExclamationTriangle className="w-3 h-3" /> Out of stock
        </span>
      ) : isLowStock ? (
        <span className="text-yellow-500 flex items-center gap-1">
          <HiSignal className="w-3 h-3" /> Only {availableQty} left
        </span>
      ) : (
        <span className="text-green-500 flex items-center gap-1">
          <HiCheckCircle className="w-3 h-3" /> {availableQty} available
        </span>
      )}
    </div>
  );
});

const BalanceWarning = memo(
  ({ isConnected, hasSufficientBalance }: { isConnected: boolean; hasSufficientBalance: boolean }) => {
    if (!isConnected || hasSufficientBalance) return null;
    return (
      <div className="bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 p-3 rounded-lg text-sm flex items-center gap-2">
        <HiSignal className="w-4 h-4 flex-shrink-0" />
        <span>Insufficient balance for this purchase</span>
      </div>
    );
  }
);

const SwapPreview = memo(
  ({
    isVisible,
    fromAmount,
    fromToken,
    toAmount,
    toToken,
    isGettingQuote,
    onRefresh,
  }: {
    isVisible: boolean;
    fromAmount: number;
    fromToken: string;
    toAmount: number;
    toToken: string;
    isGettingQuote: boolean;
    onRefresh: () => void;
  }) => {
    if (!isVisible) return null;

    const exchangeRate = useMemo(() => {
      if (toAmount > 0 && fromAmount > 0) return (toAmount / fromAmount).toFixed(6);
      return null;
    }, [toAmount, fromAmount]);

    const priceImpact = useMemo(() => {
      if (!exchangeRate) return null;
      return parseFloat(((1 - parseFloat(exchangeRate)) * 100).toFixed(2));
    }, [exchangeRate]);

    return (
      <div className="bg-red-900/10 border border-red-500/20 rounded-lg p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 text-red-400 text-sm font-medium mb-3">
              <FaExchangeAlt className="w-4 h-4" />
              <span>Token Swap Required</span>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">You'll swap:</span>
                <span className="text-white font-medium">{fromAmount.toFixed(4)} {fromToken}</span>
              </div>
              {isGettingQuote ? (
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">To receive:</span>
                  <div className="flex items-center gap-2">
                    <FaSpinner className="animate-spin w-3 h-3 text-red-400" />
                    <span className="text-gray-400">Calculating...</span>
                  </div>
                </div>
              ) : toAmount > 0 ? (
                <>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">To receive:</span>
                    <span className="text-green-400 font-medium">≈ {toAmount.toFixed(4)} {toToken}</span>
                  </div>
                  {exchangeRate && (
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-gray-500">Rate:</span>
                      <span className="text-gray-400">1 {fromToken} = {exchangeRate} {toToken}</span>
                    </div>
                  )}
                  {priceImpact !== null && Math.abs(priceImpact) > 1 && (
                    <div className="flex items-center gap-1 text-xs text-yellow-400">
                      <HiExclamationTriangle className="w-3 h-3" />
                      <span>Price impact: {Math.abs(priceImpact).toFixed(2)}%</span>
                    </div>
                  )}
                </>
              ) : null}
            </div>
          </div>
          <button
            onClick={onRefresh}
            disabled={isGettingQuote}
            className="p-2 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"
            aria-label="Refresh swap quote"
          >
            <HiArrowPath className={`w-4 h-4 text-red-400 ${isGettingQuote ? "animate-spin" : ""}`} />
          </button>
        </div>
        <div className="mt-3 pt-3 border-t border-red-500/20 text-xs space-y-1">
          <div className="flex items-center gap-1 text-red-300/80">
            <HiCheckCircle className="w-3 h-3" />
            <span>Swap will be executed before purchase</span>
          </div>
          <div className="flex items-center gap-1 text-yellow-400/80">
            <HiExclamationTriangle className="w-3 h-3" />
            <span>Additional gas fees apply for swap</span>
          </div>
        </div>
      </div>
    );
  }
);

const PriceBreakdown = memo(
  ({ totals, formatPrice }: { totals: ComputedTotals; formatPrice: (p: number, c: string) => string }) => (
    <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-3 space-y-2 text-sm">
      <div className="flex justify-between text-gray-400">
        <span>Subtotal:</span>
        <span>{formatPrice(totals.subtotal, "USDT")}</span>
      </div>
      {totals.logisticsCost > 0 && (
        <div className="flex justify-between text-gray-400">
          <span>Delivery:</span>
          <span>{formatPrice(totals.logisticsCost, "USDT")}</span>
        </div>
      )}
      <div className="flex justify-between text-white font-semibold pt-2 border-t border-gray-700">
        <span>Total:</span>
        <span>{formatPrice(totals.grandTotalUsd, "USDT")}</span>
      </div>
    </div>
  )
);

// ── Provider - all logic lives here ──────────────────────────────────────────
export const PurchaseSectionProvider: React.FC<
  PurchaseSectionProps & { children: React.ReactNode }
> = ({ product, selectedVariant, children }) => {
  const navigate = useNavigate();
  const [createOrder] = useCreateOrderMutation();
  const {
    convertPrice,
    formatPrice,
    selectedToken: walletSelectedToken,
    setSelectedToken,
  } = useCurrency();
  const { isConnected, address } = useAccount();
  useChainId(); // keep for chain awareness
  const { getQuote, swap, isSwapping, isReady: swapReady } = useSwap();
  const {
    isLoading: isLoadingBalance,
    refetch: refreshTokenBalance,
    getBalance,
    hasSufficient,
    celoBalance,
  } = useTokenBalances();
  const { isAuthenticated } = useAuth();

  const [state, updateState] = usePurchaseState();
  const abortControllerRef = useRef<AbortController | null>(null);
  const quoteTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => { updateState({ mounted: true }); }, [updateState]);

  useEffect(() => {
    startTransition(() => { updateState({ quantity: 1, purchaseError: null }); });
  }, [selectedVariant, updateState]);

  const availableQty = useMemo(() => {
    if (selectedVariant) return selectedVariant.quantity;
    return Number(product?.stock) || 0;
  }, [selectedVariant, product?.stock]);

  const stockStatus = useMemo(() => ({
    isOutOfStock: availableQty <= 0,
    isLowStock: availableQty > 0 && availableQty < MIN_STOCK_THRESHOLD,
  }), [availableQty]);

  const computedTotals = useCalculatedTotals({
    product,
    selectedLogistics: state.selectedLogistics,
    quantity: state.quantity,
    convertPrice,
    walletSelectedToken,
  });

  const hasSufficientBalance = useMemo(() => {
    if (!isConnected || !state.mounted) return false;
    const required =
      walletSelectedToken.symbol === product?.paymentToken
        ? computedTotals.totalInPayment
        : computedTotals.totalInSelected;
    const current = getBalance(walletSelectedToken.symbol);
    if (!current) return false;
    return current.numeric >= required;
  }, [isConnected, walletSelectedToken, product, computedTotals, state.mounted, getBalance]);

  const isSwapSupported = useCallback(async () => {
    if (!isConnected || !product || walletSelectedToken.symbol === product.paymentToken) return true;
    try {
      await getQuote(walletSelectedToken.symbol, product.paymentToken, 0.1);
      return true;
    } catch {
      return false;
    }
  }, [walletSelectedToken.symbol, product?.paymentToken, getQuote, isConnected]);

  const updateSwapQuote = useCallback(
    debounce(async () => {
      if (!product || !isConnected || walletSelectedToken.symbol === product.paymentToken) {
        updateState({ swapQuote: "", isGettingQuote: false });
        return;
      }
      if (computedTotals.totalInSelected <= 0) return;
      if (abortControllerRef.current) abortControllerRef.current.abort();
      abortControllerRef.current = new AbortController();
      startTransition(() => { updateState({ isGettingQuote: true }); });
      try {
        const quote = await getQuote(walletSelectedToken.symbol, product.paymentToken, computedTotals.totalInSelected);
        if (!abortControllerRef.current.signal.aborted) {
          startTransition(() => { updateState({ swapQuote: quote?.amountOut ?? "", isGettingQuote: false }); });
        }
      } catch {
        if (!abortControllerRef.current?.signal.aborted) {
          startTransition(() => { updateState({ swapQuote: "", isGettingQuote: false }); });
        }
      }
    }, QUOTE_DEBOUNCE_MS),
    [product, isConnected, walletSelectedToken.symbol, computedTotals.totalInSelected, getQuote, updateState]
  );

  useEffect(() => {
    if (quoteTimeoutRef.current) clearTimeout(quoteTimeoutRef.current);
    quoteTimeoutRef.current = setTimeout(() => { updateSwapQuote(); }, 100);
    return () => { if (quoteTimeoutRef.current) clearTimeout(quoteTimeoutRef.current); };
  }, [updateSwapQuote]);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) abortControllerRef.current.abort();
      updateSwapQuote.cancel();
    };
  }, [updateSwapQuote]);

  const validateSwapRequirements = useCallback(async () => {
    if (!isConnected || !product) return false;
    try {
      if (!swapReady) {
        updateState({ purchaseError: "Swap functionality not available. Please try again." });
        return false;
      }
      const balance = getBalance(walletSelectedToken.symbol);
      if (!balance || balance.numeric < computedTotals.totalInSelected) {
        updateState({ purchaseError: `Insufficient ${walletSelectedToken.symbol} balance for swap` });
        return false;
      }
      const supported = await isSwapSupported();
      if (!supported) {
        updateState({ purchaseError: `${walletSelectedToken.symbol}/${product.paymentToken} swap not supported` });
        return false;
      }
      return true;
    } catch {
      updateState({ purchaseError: "Failed to validate swap requirements" });
      return false;
    }
  }, [isConnected, walletSelectedToken, product, computedTotals, swapReady, getBalance, isSwapSupported, updateState]);

  const executeOrder = useCallback(async () => {
    if (!product) return;
    if (!state.selectedAddress) {
      updateState({ purchaseError: "Please select a delivery address." });
      return;
    }
    updateState({ isProcessing: true, purchaseError: null });
    try {
      const addr = state.selectedAddress;
      // Use the chosen provider's quote when we have one; otherwise fall back to
      // a static real provider id so the demo purchase can still complete.
      const lp = state.selectedLogistics;
      const hasQuote = !!lp?.quoteId;
      const orderData: CreateOrderParams = {
        product: product._id,
        quantity: state.quantity,
        logisticsProvider: hasQuote ? lp._id : DEMO_FALLBACK_PROVIDER_ID,
        quoteId: hasQuote ? lp.quoteId! : "",
        deliveryAddress: {
          label: addr.label,
          fullName: addr.fullName,
          phone: addr.phone,
          country: addr.country,
          state: addr.state,
          lga: addr.lga,
          street: addr.street,
          zipCode: addr.zipCode,
          isDefault: addr.isDefault,
        },
      };
      const order = await createOrder(orderData).unwrap();
      if (!order?._id) throw new Error("Order creation failed");
      refreshTokenBalance();
      startTransition(() => { navigate(`/orders/${order._id}?status=pending`); });
    } catch (err: any) {
      updateState({ purchaseError: err.message || "Purchase failed. Please try again." });
    } finally {
      updateState({ isProcessing: false });
    }
  }, [product, state.selectedAddress, state.selectedLogistics, state.quantity, createOrder, refreshTokenBalance, navigate, updateState]);

  const handleButtonClick = useCallback(async () => {
    updateState({ purchaseError: null });
    if (!isAuthenticated) return startTransition(() => navigate("/login"));
    if (!product) { updateState({ purchaseError: "Product information is missing" }); return; }
    if (!isConnected) { updateState({ showWalletModal: true }); return; }
    if (!hasSufficientBalance) {
      updateState({ purchaseError: `Insufficient ${walletSelectedToken.symbol} balance` });
      return;
    }
    if (walletSelectedToken.symbol !== product.paymentToken) {
      const canSwap = await validateSwapRequirements();
      if (!canSwap) return;
      updateState({ showSwapModal: true });
      return;
    }
    await executeOrder();
  }, [isAuthenticated, product, isConnected, walletSelectedToken, hasSufficientBalance, validateSwapRequirements, executeOrder, navigate, updateState]);

  const handleConfirmSwap = useCallback(async () => {
    if (!product) return;
    updateState({ purchaseError: null });
    try {
      await swap(walletSelectedToken.symbol, product.paymentToken, computedTotals.totalInSelected);
      const targetToken = TOKENS.find((t: StableToken) => t.symbol === product.paymentToken);
      if (targetToken) setSelectedToken(targetToken);
      updateState({ showSwapModal: false });
      setTimeout(() => { executeOrder(); }, SWAP_CONFIRMATION_DELAY);
    } catch (err: any) {
      updateState({ purchaseError: err.message || "Swap failed. Please try again." });
    }
  }, [product, swap, walletSelectedToken.symbol, computedTotals, setSelectedToken, executeOrder, updateState]);

  const formatBalance = useCallback(
    (balance: string | undefined) => {
      if (!balance || !state.mounted) return "Loading...";
      return parseFloat(balance).toLocaleString("en-US", {
        minimumFractionDigits: 0,
        maximumFractionDigits: BALANCE_PRECISION,
      });
    },
    [state.mounted]
  );

  const needsSwap = Boolean(
    isConnected && product && walletSelectedToken.symbol !== product.paymentToken && computedTotals.totalInSelected > 0
  );

  const ctxValue: PurchaseContextValue = {
    product,
    selectedVariant,
    state,
    updateState,
    availableQty,
    stockStatus,
    computedTotals,
    hasSufficientBalance,
    needsSwap,
    swapOutputAmount: state.swapQuote ? parseFloat(state.swapQuote) : 0,
    isLoading: state.isProcessing || isSwapping,
    walletSelectedToken,
    isConnected,
    address,
    isAuthenticated,
    isSwapping,
    isLoadingBalance,
    celoBalance,
    formatPrice,
    formatBalance,
    getBalance,
    handleButtonClick,
    handleConfirmSwap,
    refreshQuote: () => updateSwapQuote(),
  };

  if (!state.mounted) {
    return (
      <div className="bg-[#212428] p-4 md:p-6 animate-pulse">
        <div className="space-y-4">
          <div className="h-12 bg-gray-700 rounded" />
          <div className="h-16 bg-gray-700 rounded" />
          <div className="h-8 bg-gray-700 rounded" />
          <div className="h-12 bg-gray-700 rounded" />
        </div>
      </div>
    );
  }

  return <PurchaseContext.Provider value={ctxValue}>{children}</PurchaseContext.Provider>;
};

// ── Body - scrollable content ──────────────────────────────────────────────────
export const PurchaseSectionBody: React.FC = () => {
  const {
    state,
    updateState,
    availableQty,
    stockStatus,
    computedTotals,
    hasSufficientBalance,
    needsSwap,
    swapOutputAmount,
    isLoading,
    walletSelectedToken,
    isConnected,
    address,
    isLoadingBalance,
    celoBalance,
    formatPrice,
    formatBalance,
    getBalance,
    product,
    refreshQuote,
  } = usePurchaseContext();

  return (
    <div className="bg-[#212428] px-4 py-4 md:px-6 space-y-4 border-t border-gray-700/30">
      {/* Quantity + stock */}
      <div className="flex justify-between items-center">
        <QuantitySelector
          min={1}
          max={Math.min(99, availableQty)}
          availableQuantity={availableQty}
          onChange={(qty) => updateState({ quantity: qty })}
        />
        <StockStatus availableQty={availableQty} />
      </div>

      {/* Price breakdown */}
      {product && <PriceBreakdown totals={computedTotals} formatPrice={formatPrice} />}

      {/* Delivery address */}
      <DeliveryAddressSelector
        selectedAddress={state.selectedAddress}
        onAddressSelect={(addr) => updateState({ selectedAddress: addr, selectedLogistics: null })}
      />

      {/* Logistics */}
      {state.selectedAddress && product && (
        <LogisticsProviderSelector
          product={product}
          deliveryAddress={state.selectedAddress}
          quantity={state.quantity}
          selectedProvider={state.selectedLogistics}
          onProviderSelect={(p) => updateState({ selectedLogistics: p })}
        />
      )}

      {/* Balance warning */}
      <BalanceWarning isConnected={isConnected} hasSufficientBalance={hasSufficientBalance} />

      {/* Swap preview */}
      <SwapPreview
        isVisible={needsSwap}
        fromAmount={computedTotals.totalInSelected}
        fromToken={walletSelectedToken.symbol}
        toAmount={swapOutputAmount}
        toToken={product?.paymentToken || ""}
        isGettingQuote={state.isGettingQuote}
        onRefresh={refreshQuote}
      />

      {/* Wallet info - shown when connected */}
      {isConnected && (
        <div className="bg-gray-800/60 border border-gray-700/50 rounded-lg p-3 text-xs space-y-2">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-1 text-gray-400">
              <HiCurrencyDollar className="text-red-500 w-3 h-3" />
              <span>{walletSelectedToken.symbol} balance:</span>
            </div>
            <div className="text-white font-mono font-medium flex items-center gap-2">
              {isLoadingBalance ? (
                <>
                  <FaSpinner className="animate-spin w-3 h-3 text-red-500" />
                  <span className="text-gray-400">Updating...</span>
                </>
              ) : (
                formatBalance(getBalance(walletSelectedToken.symbol)?.formatted)
              )}
            </div>
          </div>
          <div className="flex justify-between items-center text-gray-500">
            <span>Gas (CELO):</span>
            <span className="font-mono">{celoBalance ? parseFloat(celoBalance).toFixed(4) : "0.0000"}</span>
          </div>
          {address && (
            <div className="text-gray-500 text-center pt-1 border-t border-gray-700/50 font-mono">
              {address.slice(0, 6)}…{address.slice(-4)}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ── Footer - always-visible buy button + modals ───────────────────────────────
export const PurchaseSectionFooter: React.FC = () => {
  const {
    state,
    updateState,
    stockStatus,
    isLoading,
    isAuthenticated,
    isConnected,
    needsSwap,
    computedTotals,
    walletSelectedToken,
    handleButtonClick,
    handleConfirmSwap,
    product,
  } = usePurchaseContext();

  return (
    <>
      <div className="bg-[#212428] px-4 pb-4 pt-3 md:px-6 md:pb-6 xl:flex-shrink-0 border-t border-gray-700/40">
        {/* Error shown right by the button so it's visible on tap */}
        {state.purchaseError && (
          <div className="mb-3">
            <ErrorDisplay error={state.purchaseError} />
          </div>
        )}
        <button
          onClick={handleButtonClick}
          disabled={isLoading || stockStatus.isOutOfStock}
          className="bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 disabled:from-gray-600 disabled:to-gray-600 text-white py-3.5 px-6 rounded-xl w-full flex justify-center items-center gap-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-sm shadow-lg hover:shadow-xl"
          aria-label={
            !isAuthenticated
              ? "Login to buy this product"
              : !isConnected
              ? "Connect wallet to purchase"
              : "Complete purchase"
          }
        >
          {isLoading ? (
            <>
              <FaSpinner className="animate-spin w-4 h-4" />
              <span>Processing...</span>
            </>
          ) : (
            <>
              <FaWallet className="w-4 h-4" />
              <span>
                {!isAuthenticated
                  ? "Login to Buy"
                  : !isConnected
                  ? "Connect Wallet"
                  : stockStatus.isOutOfStock
                  ? "Out of Stock"
                  : needsSwap
                  ? "Swap & Buy Now"
                  : "Buy Now"}
              </span>
            </>
          )}
        </button>
      </div>

      {/* Connect Wallet modal */}
      {state.showWalletModal && (
        <ConnectModal onClose={() => updateState({ showWalletModal: false })} />
      )}

      {/* Swap confirmation modal */}
      {state.showSwapModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-[#212428] rounded-xl p-6 max-w-sm w-full space-y-4">
            <h3 className="text-white text-lg font-semibold">Confirm Swap</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-gray-400">
                <span>From:</span>
                <span className="text-white">
                  {computedTotals.totalInSelected.toFixed(4)} {walletSelectedToken.symbol}
                </span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>To:</span>
                <span className="text-green-400">
                  ≈ {state.swapQuote || "..."} {product?.paymentToken}
                </span>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => updateState({ showSwapModal: false })}
                className="flex-1 py-2.5 rounded-xl border border-gray-600 text-gray-300 hover:bg-gray-700 transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmSwap}
                className="flex-1 py-2.5 rounded-xl bg-red-600 text-white hover:bg-red-700 transition-colors text-sm font-medium"
              >
                Confirm Swap
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// ── Default export - convenience wrapper (non-xl / simple usage) ──────────────
const PurchaseSection: React.FC<PurchaseSectionProps> = memo(({ product, selectedVariant }) => (
  <PurchaseSectionProvider product={product} selectedVariant={selectedVariant}>
    <PurchaseSectionBody />
    <PurchaseSectionFooter />
  </PurchaseSectionProvider>
));

PurchaseSection.displayName = "PurchaseSection";
export default PurchaseSection;
