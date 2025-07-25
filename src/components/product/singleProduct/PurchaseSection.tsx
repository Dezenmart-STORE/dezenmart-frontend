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
} from "react-icons/hi2";
import { Product, ProductVariant } from "../../../utils/types";
import { useWeb3 } from "../../../context/Web3Context";
import { useOrderData } from "../../../utils/hooks/useOrder";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import { useCurrencyConverter } from "../../../utils/hooks/useCurrencyConverter";
import { STABLE_TOKENS } from "../../../utils/config/web3.config";
import { useMento } from "../../../utils/hooks/useMento";
import { debounce } from "lodash-es";

// Lazy load heavy modals
const WalletConnectionModal = lazy(
  () => import("../../web3/WalletConnectionModal")
);
const SwapConfirmationModal = lazy(
  () => import("../../common/SwapConfirmationModal")
);

// Lightweight components
import QuantitySelector from "./QuantitySelector";
import LogisticsSelector, { LogisticsProvider } from "./LogisticsSelector";

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
    selectedLogistics: null as LogisticsProvider | null,
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

// Custom hook for memoized calculations
const useCalculatedTotals = ({
  product,
  selectedLogistics,
  quantity,
  convertPrice,
  walletSelectedToken,
}: {
  product?: FormattedProduct;
  selectedLogistics: LogisticsProvider | null;
  quantity: number;
  convertPrice: (amount: number, from: string, to: string) => number;
  walletSelectedToken: any;
}) => {
  return useMemo(() => {
    if (!product || !selectedLogistics) {
      return { grandTotalUsd: 0, totalInSelected: 0, totalInPayment: 0 };
    }

    const totalUsd = product.price * quantity;
    const fee = totalUsd * TRANSACTION_FEE_RATE;
    const logistics = selectedLogistics.cost;
    const grandTotalUsd = totalUsd + fee + logistics;

    const selectedTokenSymbol = walletSelectedToken.symbol;
    const paymentTokenSymbol = product.paymentToken;

    const totalInSelected = convertPrice(
      grandTotalUsd,
      "USDT",
      selectedTokenSymbol
    );
    const totalInPayment = convertPrice(
      grandTotalUsd,
      "USDT",
      paymentTokenSymbol
    );

    return { grandTotalUsd, totalInSelected, totalInPayment };
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

// Swap preview component
const SwapPreview = memo(
  ({
    isVisible,
    fromAmount,
    fromToken,
    toToken,
    isGettingQuote,
    swapQuote,
  }: {
    isVisible: boolean;
    fromAmount: number;
    fromToken: string;
    toToken: string;
    isGettingQuote: boolean;
    swapQuote: string;
  }) => {
    if (!isVisible) return null;

    return (
      <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-3 animate-in fade-in-0 duration-300">
        <div className="flex items-center gap-2 text-red-300 text-sm">
          <FaExchangeAlt className="w-3 h-3" />
          <span>
            Will swap {fromAmount.toFixed(4)} {fromToken}
            {isGettingQuote ? (
              <FaSpinner className="inline ml-2 animate-spin w-3 h-3" />
            ) : swapQuote ? (
              <span className="text-green-400">
                → {parseFloat(swapQuote).toFixed(4)} {toToken}
              </span>
            ) : null}
          </span>
        </div>
      </div>
    );
  }
);

// Wallet info component
const WalletInfo = memo(
  ({
    wallet,
    formatBalance,
  }: {
    wallet: any;
    formatBalance: (balance: string | undefined) => string;
  }) => {
    if (!wallet.isConnected) return null;

    return (
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 text-xs space-y-2">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-1 text-gray-400">
            <HiCurrencyDollar className="text-red-500 w-3 h-3" />
            <span>{wallet.selectedToken.symbol} Balance:</span>
          </div>
          <div className="text-white font-mono font-medium">
            {formatBalance(
              wallet.tokenBalances[wallet.selectedToken.symbol]?.raw
            )}
          </div>
        </div>
        {wallet.address && (
          <div className="text-gray-500 text-center pt-1 border-t border-gray-700 font-mono">
            {`${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)}`}
          </div>
        )}
      </div>
    );
  }
);

// Main component
const PurchaseSection: React.FC<PurchaseSectionProps> = memo(
  ({ product, selectedVariant }) => {
    const navigate = useNavigate();
    const { placeOrder } = useOrderData();
    const { convertPrice } = useCurrencyConverter();
    const {
      wallet,
      performSwap,
      setSelectedToken,
      // getSwapQuote,
      swapState,
      refreshTokenBalance,
      approveToken,
      getTokenAllowance,
      initializeMento,
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

    // Memoized total calculations
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

      return parseFloat(currentBalance.raw) >= requiredAmount;
    }, [wallet, product, computedTotals, state.mounted]);

    // // Swap support validation
    // const isSwapSupported = useCallback(async () => {
    //   if (
    //     !wallet.isConnected ||
    //     !product ||
    //     wallet.selectedToken.symbol === product.paymentToken
    //   ) {
    //     return true;
    //   }

    //   try {
    //     const fromToken = STABLE_TOKENS.find(
    //       (t) => t.symbol === wallet.selectedToken.symbol
    //     );
    //     const toToken = STABLE_TOKENS.find(
    //       (t) => t.symbol === product.paymentToken
    //     );

    //     if (!fromToken || !toToken) return false;

    //     // Test with minimal amount
    //     await getSwapQuote(
    //       wallet.selectedToken.symbol,
    //       product.paymentToken,
    //       0.1
    //     );
    //     return true;
    //   } catch {
    //     return false;
    //   }
    // }, [
    //   wallet.selectedToken.symbol,
    //   product?.paymentToken,
    //   getSwapQuote,
    //   wallet.isConnected,
    // ]);

    // Debounced quote fetching
    // const updateSwapQuote = useCallback(
    //   debounce(async () => {
    //     if (
    //       !product ||
    //       !wallet.isConnected ||
    //       wallet.selectedToken.symbol === product.paymentToken
    //     ) {
    //       updateState({ swapQuote: "" });
    //       return;
    //     }

    //     if (computedTotals.totalInSelected <= 0) return;

    //     // Cancel previous request
    //     if (abortControllerRef.current) {
    //       abortControllerRef.current.abort();
    //     }

    //     abortControllerRef.current = new AbortController();
    //     updateState({ isGettingQuote: true });

    //     try {
    //       const quote = await getSwapQuote(
    //         wallet.selectedToken.symbol,
    //         product.paymentToken,
    //         computedTotals.totalInSelected
    //       );

    //       if (!abortControllerRef.current.signal.aborted) {
    //         updateState({ swapQuote: quote, isGettingQuote: false });
    //       }
    //     } catch (error) {
    //       if (!abortControllerRef.current?.signal.aborted) {
    //         console.error("Failed to get swap quote:", error);
    //         updateState({ swapQuote: "", isGettingQuote: false });
    //       }
    //     }
    //   }, QUOTE_DEBOUNCE_MS),
    //   [
    //     product,
    //     wallet.isConnected,
    //     wallet.selectedToken.symbol,
    //     computedTotals.totalInSelected,
    //     getSwapQuote,
    //     updateState,
    //   ]
    // );

    // Update quote when relevant values change
    // useEffect(() => {
    //   if (quoteTimeoutRef.current) {
    //     clearTimeout(quoteTimeoutRef.current);
    //   }

    //   quoteTimeoutRef.current = setTimeout(() => {
    //     updateSwapQuote();
    //   }, 100);

    //   return () => {
    //     if (quoteTimeoutRef.current) {
    //       clearTimeout(quoteTimeoutRef.current);
    //     }
    //   };
    // }, [updateSwapQuote]);

    // Cleanup on unmount
    // useEffect(() => {
    //   return () => {
    //     if (abortControllerRef.current) {
    //       abortControllerRef.current.abort();
    //     }
    //     updateSwapQuote.cancel();
    //   };
    // }, [updateSwapQuote]);

    // Validate swap requirements
    // const validateSwapRequirements = useCallback(async () => {
    //   if (!wallet.isConnected || !product) return false;

    //   try {
    //     const mentoReady = await initializeMento();
    //     if (!mentoReady) {
    //       updateState({
    //         purchaseError:
    //           "Swap functionality not available. Please try again.",
    //       });
    //       return false;
    //     }

    //     const balance = parseFloat(
    //       wallet.tokenBalances[wallet.selectedToken.symbol]?.raw || "0"
    //     );
    //     if (balance < computedTotals.totalInSelected) {
    //       updateState({
    //         purchaseError: `Insufficient ${wallet.selectedToken.symbol} balance for swap`,
    //       });
    //       return false;
    //     }

    //     const pairSupported = await isSwapSupported();
    //     if (!pairSupported) {
    //       updateState({
    //         purchaseError: `${wallet.selectedToken.symbol}/${product.paymentToken} swap not supported`,
    //       });
    //       return false;
    //     }

    //     return true;
    //   } catch (error) {
    //     updateState({ purchaseError: "Failed to validate swap requirements" });
    //     return false;
    //   }
    // }, [
    //   wallet,
    //   product,
    //   computedTotals,
    //   initializeMento,
    //   isSwapSupported,
    //   updateState,
    // ]);

    // Execute order
    const executeOrder = useCallback(async () => {
      if (!product || !state.selectedLogistics) return;

      updateState({ isProcessing: true, purchaseError: null });

      try {
        const requiredAmount = computedTotals.totalInPayment.toString();
        const currentAllowance = await getTokenAllowance(product.paymentToken);

        if (currentAllowance < computedTotals.totalInPayment) {
          updateState({ purchaseError: "Approving token spend..." });
          await approveToken(product.paymentToken, requiredAmount);
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }

        const order = await placeOrder({
          product: product._id,
          quantity: state.quantity,
          logisticsProviderWalletAddress: state.selectedLogistics.walletAddress,
        });

        if (!order?._id) {
          throw new Error("Order creation failed");
        }

        await refreshTokenBalance();
        navigate(`/orders/${order._id}?status=pending`);
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
      placeOrder,
      refreshTokenBalance,
      navigate,
      updateState,
    ]);

    // Handle button click
    const handleButtonClick = useCallback(async () => {
      updateState({ purchaseError: null });

      if (!isAuthenticated) {
        return navigate("/login");
      }

      if (!product || !state.selectedLogistics) {
        updateState({ purchaseError: "Please select a delivery method" });
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

      // if (wallet.selectedToken.symbol !== product.paymentToken) {
      // const canSwap = await validateSwapRequirements();
      // if (!canSwap) return;

      //   updateState({ showSwapModal: true });
      //   console.log("should show modal", state);
      //   return;
      // }

      await executeOrder();
    }, [
      isAuthenticated,
      product,
      state.selectedLogistics,
      wallet,
      hasSufficientBalance,
      // validateSwapRequirements,
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

          {/* Logistics Selection */}
          <LogisticsSelector
            logisticsCost={product?.logisticsCost || []}
            logisticsProviders={product?.logisticsProviders || []}
            selectedProvider={state.selectedLogistics}
            onSelect={(logistics) =>
              updateState({ selectedLogistics: logistics })
            }
          />

          {/* Balance Warning */}
          <BalanceWarning
            isConnected={wallet.isConnected}
            hasSufficientBalance={hasSufficientBalance}
          />

          {/* Swap Preview */}
          {/* <SwapPreview
            isVisible={needsSwap}
            fromAmount={computedTotals.totalInSelected}
            fromToken={wallet.selectedToken.symbol}
            toToken={product?.paymentToken || ""}
            isGettingQuote={state.isGettingQuote}
            swapQuote={state.swapQuote}
          /> */}

          {/* Purchase Button */}
          <button
            onClick={handleButtonClick}
            disabled={isLoading || stockStatus.isOutOfStock}
            className="bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white py-3 px-6 rounded-lg w-full flex justify-center items-center gap-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-gray-800"
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
                    : "Buy Now"}
                </span>
              </>
            )}
          </button>

          {/* Wallet Info */}
          <WalletInfo wallet={wallet} formatBalance={formatBalance} />
        </div>

        {/* Lazy-loaded Modals */}
        <Suspense
          fallback={
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
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
            // amountOut={state.swapQuote}
            // isProcessing={swapState.isSwapping}
            // error={swapState.error || undefined}
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
