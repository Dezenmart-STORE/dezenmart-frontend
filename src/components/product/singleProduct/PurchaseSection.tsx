import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  memo,
  Suspense,
  lazy,
  startTransition,
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
import { useWeb3 } from "../../../context/Web3Context";
import { useCreateOrderMutation } from "../../../store/api";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import { useCurrencyConverter } from "../../../utils/hooks/useCurrencyConverter";
import { STABLE_TOKENS } from "../../../utils/config/web3.config";
import { debounce } from "lodash-es";

// Lazy load heavy modals
const WalletConnectionModal = lazy(
  () => import("../../web3/WalletConnectionModal")
);
const SwapConfirmationModal = lazy(
  () => import("../../common/SwapConfirmationModal")
);

import QuantitySelector from "./QuantitySelector";
import DeliveryAddressSelector from "./DeliveryAddressSelector";
import FilteredLogisticsSelector from "./FilteredLogisticsSelector";
import type { FilteredLogisticsProvider } from "./FilteredLogisticsSelector";
import type { DeliveryAddress } from "../../../utils/types";

// Types
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

// Constants
const TRANSACTION_FEE_RATE = 0.025; // 2.5%
const BALANCE_PRECISION = 6;
const QUOTE_DEBOUNCE_MS = 800;
const SWAP_CONFIRMATION_DELAY = 1000;
const MIN_STOCK_THRESHOLD = 10;

// Custom hooks for state management
const usePurchaseState = () => {
  const [state, setState] = useState({
    quantity: 1,
    selectedAddress: null as DeliveryAddress | null,
    selectedLogistics: null as FilteredLogisticsProvider | null,
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

// Custom hook for calculations
const useCalculatedTotals = ({
  product,
  selectedLogistics,
  quantity,
  convertPrice,
  walletSelectedToken,
}: {
  product?: FormattedProduct;
  selectedLogistics: FilteredLogisticsProvider | null;
  quantity: number;
  convertPrice: (amount: number, from: string, to: string) => number;
  walletSelectedToken: any;
}) => {
  return useMemo(() => {
    if (!product) {
      return {
        grandTotalUsd: 0,
        totalInSelected: 0,
        totalInPayment: 0,
        subtotal: 0,
        escrowFee: 0,
        logisticsCost: 0,
      };
    }

    // Product price is in USD
    const subtotal = product.price * quantity;
    const escrowFee = subtotal * TRANSACTION_FEE_RATE;
    const logisticsCost = selectedLogistics?.cost || 0;
    const grandTotalUsd = subtotal + escrowFee + logisticsCost;

    const selectedTokenSymbol = walletSelectedToken.symbol;
    const paymentTokenSymbol = product.paymentToken;

    // Convert from USD to selected wallet token
    const totalInSelected = convertPrice(
      grandTotalUsd,
      "USDT", // Use USDT as proxy for USD
      selectedTokenSymbol
    );

    // Convert from USD to payment token
    const totalInPayment = convertPrice(
      grandTotalUsd,
      "USDT", // Use USDT as proxy for USD
      paymentTokenSymbol
    );

    console.log("💰 Total Calculation:", {
      productPrice: product.price,
      quantity,
      subtotal,
      escrowFee,
      logisticsCost,
      grandTotalUsd,
      selectedTokenSymbol,
      paymentTokenSymbol,
      totalInSelected,
      totalInPayment,
    });

    return {
      grandTotalUsd,
      totalInSelected,
      totalInPayment,
      subtotal,
      escrowFee,
      logisticsCost,
    };
  }, [product, selectedLogistics, quantity, convertPrice, walletSelectedToken]);
};

// Error display component
const ErrorDisplay = memo(({ error }: { error: string | null }) => {
  if (!error) return null;

  return (
    <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-lg text-sm flex items-center gap-2 animate-in slide-in-from-top-2 duration-300">
      <HiExclamationTriangle className="w-4 h-4 flex-shrink-0" />
      <span>{error}</span>
    </div>
  );
});

// Stock status component
const StockStatus = memo(({ availableQty }: { availableQty: number }) => {
  const isOutOfStock = availableQty <= 0;
  const isLowStock = availableQty > 0 && availableQty < MIN_STOCK_THRESHOLD;

  return (
    <div className="text-xs">
      {isOutOfStock ? (
        <span className="text-red-500 font-medium flex items-center gap-1">
          <HiExclamationTriangle className="w-3 h-3" />
          Out of stock
        </span>
      ) : isLowStock ? (
        <span className="text-yellow-500 flex items-center gap-1">
          <HiSignal className="w-3 h-3" />
          Only {availableQty} left
        </span>
      ) : (
        <span className="text-green-500 flex items-center gap-1">
          <HiCheckCircle className="w-3 h-3" />
          {availableQty} available
        </span>
      )}
    </div>
  );
});

// Balance warning component
const BalanceWarning = memo(
  ({
    isConnected,
    hasSufficientBalance,
  }: {
    isConnected: boolean;
    hasSufficientBalance: boolean;
  }) => {
    if (!isConnected || hasSufficientBalance) return null;

    return (
      <div className="bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 p-3 rounded-lg text-sm flex items-center gap-2 animate-in slide-in-from-left-2 duration-300">
        <HiSignal className="w-4 h-4 flex-shrink-0" />
        <span>Insufficient balance for this purchase</span>
      </div>
    );
  }
);

// Swap preview component with enhanced UX
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

    // Calculate exchange rate
    const exchangeRate = useMemo(() => {
      if (toAmount > 0 && fromAmount > 0) {
        return (toAmount / fromAmount).toFixed(6);
      }
      return null;
    }, [toAmount, fromAmount]);

    // Calculate price impact (simplified)
    const priceImpact = useMemo(() => {
      if (!exchangeRate) return null;
      const impact = ((1 - parseFloat(exchangeRate)) * 100).toFixed(2);
      return parseFloat(impact);
    }, [exchangeRate]);

    return (
      <div className="bg-red-900/10 border border-red-500/20 rounded-lg p-4 animate-in fade-in-0 duration-300">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 text-red-400 text-sm font-medium mb-3">
              <FaExchangeAlt className="w-4 h-4" />
              <span>Token Swap Required</span>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">You'll swap:</span>
                <span className="text-white font-medium">
                  {fromAmount.toFixed(4)} {fromToken}
                </span>
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
                    <span className="text-green-400 font-medium">
                      ≈ {toAmount.toFixed(4)} {toToken}
                    </span>
                  </div>

                  {/* Exchange Rate */}
                  {exchangeRate && (
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-gray-500">Rate:</span>
                      <span className="text-gray-400">
                        1 {fromToken} = {exchangeRate} {toToken}
                      </span>
                    </div>
                  )}

                  {/* Price Impact Warning */}
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
            title="Refresh quote"
            aria-label="Refresh swap quote"
          >
            <HiArrowPath
              className={`w-4 h-4 text-red-400 ${
                isGettingQuote ? "animate-spin" : ""
              }`}
            />
          </button>
        </div>

        <div className="mt-3 pt-3 border-t border-red-500/20 text-xs space-y-1">
          <div className="flex items-center gap-1 text-red-300/80">
            <HiCheckCircle className="w-3 h-3" />
            <span>Swap will be executed before purchase</span>
          </div>
          <div className="flex items-center gap-1 text-red-300/80">
            <HiCheckCircle className="w-3 h-3" />
            <span>Using Mento/Uniswap protocol</span>
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

// Wallet info component - Enhanced with more details
const WalletInfo = memo(
  ({
    wallet,
    formatBalance,
    isLoadingBalance,
  }: {
    wallet: any;
    formatBalance: (balance: string | undefined) => string;
    isLoadingBalance: boolean;
  }) => {
    if (!wallet.isConnected) return null;

    const lastUpdated = useMemo(() => {
      const now = new Date();
      return now.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      });
    }, [wallet.tokenBalances[wallet.selectedToken.symbol]?.raw]);

    return (
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 text-xs space-y-2">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-1 text-gray-400">
            <HiCurrencyDollar className="text-red-500 w-3 h-3" />
            <span>{wallet.selectedToken.symbol} Balance:</span>
          </div>
          <div className="text-white font-mono font-medium flex items-center gap-2">
            {isLoadingBalance ? (
              <>
                <FaSpinner className="animate-spin w-3 h-3 text-red-500" />
                <span className="text-gray-400">Updating...</span>
              </>
            ) : (
              formatBalance(
                wallet.tokenBalances[wallet.selectedToken.symbol]?.raw
              )
            )}
          </div>
        </div>

        {/* Gas Balance */}
        <div className="flex justify-between items-center text-gray-500">
          <span>Gas (CELO):</span>
          <span className="font-mono">
            {wallet.balance ? parseFloat(wallet.balance).toFixed(4) : '0.0000'}
          </span>
        </div>

        {/* Wallet Address & Last Updated */}
        {wallet.address && (
          <div className="text-gray-500 text-center pt-1 border-t border-gray-700 space-y-1">
            <div className="font-mono">
              {`${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)}`}
            </div>
            <div className="text-[10px] flex items-center justify-center gap-1">
              <span>Updated: {lastUpdated}</span>
              {!isLoadingBalance && (
                <div className="w-1 h-1 bg-green-500 rounded-full animate-pulse"></div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }
);

// Price breakdown component
const PriceBreakdown = memo(
  ({
    totals,
    formatPrice,
  }: {
    totals: any;
    formatPrice: (price: number, currency: string) => string;
  }) => {
    return (
      <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-3 space-y-2 text-sm">
        <div className="flex justify-between text-gray-400">
          <span>Subtotal:</span>
          <span>{formatPrice(totals.subtotal, "USDT")}</span>
        </div>

        <div className="flex justify-between text-gray-400">
          <span>Escrow Fee (2.5%):</span>
          <span>{formatPrice(totals.escrowFee, "USDT")}</span>
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
    );
  }
);

// Main component
const PurchaseSection: React.FC<PurchaseSectionProps> = memo(
  ({ product, selectedVariant }) => {
    const navigate = useNavigate();
    const [createOrder] = useCreateOrderMutation();
    const { convertPrice, formatPrice, fetchLivePrices } =
      useCurrencyConverter();
    const {
      wallet,
      performSwap,
      setSelectedToken,
      getSwapQuote,
      swapState,
      refreshTokenBalance,
      approveToken,
      getTokenAllowance,
      initializeUniswap,
    } = useWeb3();
    const { isAuthenticated } = useAuth();

    // State management
    const [state, updateState] = usePurchaseState();

    // Refs for cleanup and optimization
    const abortControllerRef = useRef<AbortController | null>(null);
    const quoteTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Prevent hydration mismatch
    useEffect(() => {
      updateState({ mounted: true });
    }, [updateState]);

    // Reset quantity when variant changes
    useEffect(() => {
      startTransition(() => {
        updateState({
          quantity: 1,
          purchaseError: null,
        });
      });
    }, [selectedVariant, updateState]);

    // Calculate available quantity
    const availableQty = useMemo(() => {
      if (selectedVariant) return selectedVariant.quantity;
      if (product?.logisticsCost.length)
        return parseFloat(product.logisticsCost[0]);
      return 0;
    }, [selectedVariant, product?.logisticsCost]);

    // Stock status flags
    const stockStatus = useMemo(
      () => ({
        isOutOfStock: availableQty <= 0,
        isLowStock: availableQty > 0 && availableQty < MIN_STOCK_THRESHOLD,
      }),
      [availableQty]
    );

    // total calculations
    const computedTotals = useCalculatedTotals({
      product: product,
      selectedLogistics: state.selectedLogistics,
      quantity: state.quantity,
      convertPrice: convertPrice,
      walletSelectedToken: wallet.selectedToken,
    });

    // Balance validation
    const hasSufficientBalance = useMemo(() => {
      if (!wallet.isConnected || !state.mounted) return false;

      const requiredAmount =
        wallet.selectedToken.symbol === product?.paymentToken
          ? computedTotals.totalInPayment
          : computedTotals.totalInSelected;

      const currentBalance = wallet.tokenBalances[wallet.selectedToken.symbol];
      if (!currentBalance) return false;

      console.log("💵 Balance Check:", {
        requiredAmount,
        currentBalance: parseFloat(currentBalance.raw),
        hasEnough: parseFloat(currentBalance.raw) >= requiredAmount,
      });

      return parseFloat(currentBalance.raw) >= requiredAmount;
    }, [wallet, product, computedTotals, state.mounted]);

    // Swap support validation
    const isSwapSupported = useCallback(async () => {
      if (
        !wallet.isConnected ||
        !product ||
        wallet.selectedToken.symbol === product.paymentToken
      ) {
        return true;
      }

      try {
        const fromToken = STABLE_TOKENS.find(
          (t) => t.symbol === wallet.selectedToken.symbol
        );
        const toToken = STABLE_TOKENS.find(
          (t) => t.symbol === product.paymentToken
        );

        if (!fromToken || !toToken) return false;

        // Test with minimal amount
        await getSwapQuote(
          wallet.selectedToken.symbol,
          product.paymentToken,
          0.1
        );
        return true;
      } catch {
        return false;
      }
    }, [
      wallet.selectedToken.symbol,
      product?.paymentToken,
      getSwapQuote,
      wallet.isConnected,
    ]);

    // quote fetching
    const updateSwapQuote = useCallback(
      debounce(async () => {
        if (
          !product ||
          !wallet.isConnected ||
          wallet.selectedToken.symbol === product.paymentToken
        ) {
          updateState({ swapQuote: "", isGettingQuote: false });
          return;
        }

        if (computedTotals.totalInSelected <= 0) return;

        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }

        abortControllerRef.current = new AbortController();

        // ✅ Wrap state update in startTransition
        startTransition(() => {
          updateState({ isGettingQuote: true });
        });

        try {
          // Fetch live prices first (non-blocking)
          console.log("🔄 Fetching live prices before swap quote...");
          await fetchLivePrices(true);

          console.log("🔄 Getting swap quote with fresh prices:", {
            from: wallet.selectedToken.symbol,
            to: product.paymentToken,
            amount: computedTotals.totalInSelected,
          });

          const quote = await getSwapQuote(
            wallet.selectedToken.symbol,
            product.paymentToken,
            computedTotals.totalInSelected
          );

          console.log("✅ Swap quote received:", quote);

          if (!abortControllerRef.current.signal.aborted) {
            // ✅ Wrap state update in startTransition
            startTransition(() => {
              updateState({ swapQuote: quote, isGettingQuote: false });
            });
          }
        } catch (error) {
          if (!abortControllerRef.current?.signal.aborted) {
            console.error("❌ Failed to get swap quote:", error);
            // ✅ Wrap state update in startTransition
            startTransition(() => {
              updateState({ swapQuote: "", isGettingQuote: false });
            });
          }
        }
      }, QUOTE_DEBOUNCE_MS),
      [
        product,
        wallet.isConnected,
        wallet.selectedToken.symbol,
        computedTotals.totalInSelected,
        getSwapQuote,
        fetchLivePrices,
        updateState,
      ]
    );

    // Update quote when relevant values change
    useEffect(() => {
      if (quoteTimeoutRef.current) {
        clearTimeout(quoteTimeoutRef.current);
      }

      quoteTimeoutRef.current = setTimeout(() => {
        updateSwapQuote();
      }, 100);

      return () => {
        if (quoteTimeoutRef.current) {
          clearTimeout(quoteTimeoutRef.current);
        }
      };
    }, [updateSwapQuote]);

    // Cleanup on unmount
    useEffect(() => {
      return () => {
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }
        updateSwapQuote.cancel();
      };
    }, [updateSwapQuote]);

    // Validate swap requirements
    const validateSwapRequirements = useCallback(async () => {
      if (!wallet.isConnected || !product) return false;

      try {
        const mentoReady = await initializeUniswap();
        if (!mentoReady) {
          updateState({
            purchaseError:
              "Swap functionality not available. Please try again.",
          });
          return false;
        }

        const balance = parseFloat(
          wallet.tokenBalances[wallet.selectedToken.symbol]?.raw || "0"
        );
        if (balance < computedTotals.totalInSelected) {
          updateState({
            purchaseError: `Insufficient ${wallet.selectedToken.symbol} balance for swap`,
          });
          return false;
        }

        const pairSupported = await isSwapSupported();
        if (!pairSupported) {
          updateState({
            purchaseError: `${wallet.selectedToken.symbol}/${product.paymentToken} swap not supported`,
          });
          return false;
        }

        return true;
      } catch (error) {
        updateState({ purchaseError: "Failed to validate swap requirements" });
        return false;
      }
    }, [
      wallet,
      product,
      computedTotals,
      initializeUniswap,
      isSwapSupported,
      updateState,
    ]);

    // Execute order
    const executeOrder = useCallback(async () => {
      if (!product) return;

      updateState({ isProcessing: true, purchaseError: null });

      try {
        const requiredAmount = computedTotals.totalInPayment.toString();
        const currentAllowance = await getTokenAllowance(product.paymentToken);

        if (currentAllowance < computedTotals.totalInPayment) {
          updateState({ purchaseError: "Approving token spend..." });
          await approveToken(product.paymentToken, requiredAmount);
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }

        const orderData: any = {
          product: product._id as any,
          quantity: state.quantity,
        };

        if (state.selectedLogistics) {
          orderData.logisticsProviderWalletAddress = [
            state.selectedLogistics.provider.walletAddress,
          ];
        }

        const order = await createOrder(orderData).unwrap();

        if (!order?._id) {
          throw new Error("Order creation failed");
        }

        await refreshTokenBalance();
        startTransition(() => {
          navigate(`/orders/${order._id}?status=pending`);
        });
      } catch (err: any) {
        console.error("Purchase failed:", err);
        updateState({
          purchaseError: err.message || "Purchase failed. Please try again.",
        });
      } finally {
        updateState({ isProcessing: false });
      }
    }, [
      product,
      state.selectedLogistics,
      state.quantity,
      computedTotals,
      getTokenAllowance,
      approveToken,
      createOrder,
      refreshTokenBalance,
      navigate,
      updateState,
    ]);

    // Handle button click
    const handleButtonClick = useCallback(async () => {
      updateState({ purchaseError: null });

      if (!isAuthenticated) {
        return startTransition(() => navigate("/login"));
      }

      if (!product) {
        updateState({ purchaseError: "Product information is missing" });
        return;
      }

      if (!wallet.isConnected) {
        updateState({ showWalletModal: true });
        return;
      }

      if (!hasSufficientBalance) {
        updateState({
          purchaseError: `Insufficient ${wallet.selectedToken.symbol} balance`,
        });
        return;
      }

      if (wallet.selectedToken.symbol !== product.paymentToken) {
        const canSwap = await validateSwapRequirements();
        if (!canSwap) return;

        updateState({ showSwapModal: true });
        return;
      }

      await executeOrder();
    }, [
      isAuthenticated,
      product,
      wallet,
      hasSufficientBalance,
      validateSwapRequirements,
      executeOrder,
      navigate,
      updateState,
    ]);

    // Handle swap confirmation
    const handleConfirmSwap = useCallback(async () => {
      if (!product) return;

      updateState({ purchaseError: null });

      try {
        await performSwap(
          wallet.selectedToken.symbol,
          product.paymentToken,
          computedTotals.totalInSelected
        );

        const targetToken = STABLE_TOKENS.find(
          (t) => t.symbol === product.paymentToken
        );
        if (targetToken) {
          setSelectedToken(targetToken);
        }

        updateState({ showSwapModal: false });

        setTimeout(() => {
          executeOrder();
        }, SWAP_CONFIRMATION_DELAY);
      } catch (err: any) {
        console.error("Swap failed:", err);
        updateState({
          purchaseError: err.message || "Swap failed. Please try again.",
        });
      }
    }, [
      product,
      performSwap,
      wallet.selectedToken.symbol,
      computedTotals,
      setSelectedToken,
      executeOrder,
      updateState,
    ]);

    // Format balance utility
    const formatBalance = useCallback(
      (balance: string | undefined) => {
        if (!balance || !state.mounted) return "Loading...";
        const num = parseFloat(balance);
        return num.toLocaleString("en-US", {
          minimumFractionDigits: 0,
          maximumFractionDigits: BALANCE_PRECISION,
        });
      },
      [state.mounted]
    );

    // Loading skeleton
    if (!state.mounted) {
      return (
        <div className="bg-[#212428] p-4 md:p-6 animate-pulse">
          <div className="space-y-4">
            <div className="h-12 bg-gray-700 rounded"></div>
            <div className="h-16 bg-gray-700 rounded"></div>
            <div className="h-8 bg-gray-700 rounded"></div>
            <div className="h-12 bg-gray-700 rounded"></div>
          </div>
        </div>
      );
    }

    const isLoading = state.isProcessing || swapState.isSwapping;
    const hasError = state.purchaseError || swapState.error;
    const needsSwap = Boolean(
      wallet.isConnected &&
        product &&
        wallet.selectedToken.symbol !== product.paymentToken &&
        computedTotals.totalInSelected > 0
    );

    const swapOutputAmount = state.swapQuote ? parseFloat(state.swapQuote) : 0;

    return (
      <>
        <div className="bg-[#212428] p-4 md:p-6 space-y-4">
          {/* Error Display */}
          <ErrorDisplay error={hasError} />

          {/* Quantity and Stock Info */}
          <div className="flex justify-between items-center">
            <QuantitySelector
              min={1}
              max={Math.min(99, availableQty)}
              availableQuantity={availableQty}
              onChange={(qty) => updateState({ quantity: qty })}
            />
            <StockStatus availableQty={availableQty} />
          </div>

          {/* Price Breakdown */}
          {product && (
            <PriceBreakdown totals={computedTotals} formatPrice={formatPrice} />
          )}

          {/* Delivery Address Selection */}
          <DeliveryAddressSelector
            selectedAddress={state.selectedAddress}
            onAddressSelect={(address) =>
              updateState({ selectedAddress: address, selectedLogistics: null })
            }
          />

          {/* Filtered Logistics Selection */}
          {state.selectedAddress && (
            <FilteredLogisticsSelector
              deliveryAddress={state.selectedAddress}
              selectedProvider={state.selectedLogistics}
              onProviderSelect={(provider) =>
                updateState({ selectedLogistics: provider })
              }
              productPrice={product?.price || 0}
            />
          )}

          {/* Balance Warning */}
          <BalanceWarning
            isConnected={wallet.isConnected}
            hasSufficientBalance={hasSufficientBalance}
          />

          {/* Swap Preview */}
          <SwapPreview
            isVisible={needsSwap}
            fromAmount={computedTotals.totalInSelected}
            fromToken={wallet.selectedToken.symbol}
            toAmount={swapOutputAmount}
            toToken={product?.paymentToken || ""}
            isGettingQuote={state.isGettingQuote}
            onRefresh={() => updateSwapQuote()}
          />

          {/* Purchase Button */}
          <button
            onClick={handleButtonClick}
            disabled={isLoading || stockStatus.isOutOfStock}
            className="bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 disabled:from-gray-600 disabled:to-gray-600 text-white py-3 px-6 rounded-lg w-full flex justify-center items-center gap-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-gray-800 shadow-lg hover:shadow-xl font-semibold"
            aria-label={
              !isAuthenticated
                ? "Login to buy this product"
                : !wallet.isConnected
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
                    : !wallet.isConnected
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

          {/* Wallet Info */}
          <WalletInfo
            wallet={wallet}
            formatBalance={formatBalance}
            isLoadingBalance={wallet.isLoadingTokenBalance}
          />
        </div>

        {/* Lazy-loaded Modals */}
        <Suspense
          fallback={
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <FaSpinner className="animate-spin w-8 h-8 text-white" />
            </div>
          }
        >
          <WalletConnectionModal
            isOpen={state.showWalletModal}
            onClose={() => updateState({ showWalletModal: false })}
          />

          <SwapConfirmationModal
            isOpen={state.showSwapModal}
            fromToken={wallet.selectedToken.symbol}
            toToken={product?.paymentToken || ""}
            amountIn={computedTotals.totalInSelected}
            onClose={() => updateState({ showSwapModal: false })}
            onConfirm={handleConfirmSwap}
            slippage={5}
          />
        </Suspense>
      </>
    );
  }
);

// Display name for debugging
PurchaseSection.displayName = "PurchaseSection";

export default PurchaseSection;
