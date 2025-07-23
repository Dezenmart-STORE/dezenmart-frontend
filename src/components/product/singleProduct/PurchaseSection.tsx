import { useState, useEffect, useCallback, useMemo } from "react";
import { FaWallet, FaSpinner, FaExchangeAlt } from "react-icons/fa";
import {
  HiCurrencyDollar,
  HiSignal,
  HiExclamationTriangle,
} from "react-icons/hi2";
import { Product, ProductVariant } from "../../../utils/types";
import { useWeb3 } from "../../../context/Web3Context";
import { useOrderData } from "../../../utils/hooks/useOrder";
import { useNavigate } from "react-router-dom";
import QuantitySelector from "./QuantitySelector";
import LogisticsSelector, { LogisticsProvider } from "./LogisticsSelector";
import { useAuth } from "../../../context/AuthContext";
import WalletConnectionModal from "../../web3/WalletConnectionModal";
import SwapConfirmationModal from "./../../common/SwapConfirmationModal";
import { useCurrencyConverter } from "../../../utils/hooks/useCurrencyConverter";
import { STABLE_TOKENS } from "../../../utils/config/web3.config";

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

const PurchaseSection: React.FC<PurchaseSectionProps> = ({
  product,
  selectedVariant,
}) => {
  const navigate = useNavigate();
  const { placeOrder } = useOrderData();
  const { convertPrice } = useCurrencyConverter();
  const {
    wallet,
    performSwap,
    setSelectedToken,
    getSwapQuote,
    swapState,
    refreshTokenBalance,
    approveToken,
    getTokenAllowance,
    initializeMento,
  } = useWeb3();
  const { isAuthenticated } = useAuth();

  // State management
  const [quantity, setQuantity] = useState(1);
  const [selectedLogistics, setSelectedLogistics] =
    useState<LogisticsProvider | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [showSwapModal, setShowSwapModal] = useState(false);
  const [swapQuote, setSwapQuote] = useState<string>("");
  const [isGettingQuote, setIsGettingQuote] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // Reset quantity when variant changes
  useEffect(() => {
    setQuantity(1);
    setPurchaseError(null);
  }, [selectedVariant]);

  // Memoized calculations for better performance
  const computeTotals = useMemo(() => {
    if (!product || !selectedLogistics || !mounted) {
      return { grandTotalUsd: 0, totalInSelected: 0, totalInPayment: 0 };
    }

    const totalUsd = product.price * quantity;
    const fee = totalUsd * 0.025; // 2.5% fee
    const logistics = selectedLogistics.cost;
    const grandTotalUsd = totalUsd + fee + logistics;

    const selectedTokenSymbol = wallet.selectedToken.symbol;
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
  }, [
    product,
    selectedLogistics,
    quantity,
    wallet.selectedToken,
    convertPrice,
    mounted,
  ]);

  const availableQty = useMemo(() => {
    if (selectedVariant) return selectedVariant.quantity;
    if (product?.logisticsCost.length)
      return parseFloat(product.logisticsCost[0]);
    return 0;
  }, [selectedVariant, product]);

  const isOutOfStock = availableQty <= 0;
  const isLowStock = availableQty > 0 && availableQty < 10;

  // Check if user has sufficient balance
  const hasSufficientBalance = useMemo(() => {
    if (!wallet.isConnected || !mounted) return false;

    const requiredAmount =
      wallet.selectedToken.symbol === product?.paymentToken
        ? computeTotals.totalInPayment
        : computeTotals.totalInSelected;

    const currentBalance = wallet.tokenBalances[wallet.selectedToken.symbol];
    if (!currentBalance) return false;

    return parseFloat(currentBalance.raw) >= requiredAmount;
  }, [wallet, product, computeTotals, mounted]);

  const isSwapSupported = useMemo(async () => {
    if (
      !wallet.isConnected ||
      !product ||
      wallet.selectedToken.symbol === product.paymentToken
    ) {
      return true; // No swap needed
    }

    try {
      // Quick validation without getting full quote
      const fromToken = STABLE_TOKENS.find(
        (t) => t.symbol === wallet.selectedToken.symbol
      );
      const toToken = STABLE_TOKENS.find(
        (t) => t.symbol === product.paymentToken
      );

      if (!fromToken || !toToken) return false;

      // Use small amount for testing
      await getSwapQuote(wallet.selectedToken.symbol, product.paymentToken, 1);
      return true;
    } catch {
      return false;
    }
  }, [wallet.selectedToken.symbol, product?.paymentToken, getSwapQuote]);

  // Get swap quote when needed
  const updateSwapQuote = useCallback(async () => {
    if (
      !product ||
      !wallet.isConnected ||
      wallet.selectedToken.symbol === product.paymentToken
    ) {
      setSwapQuote("");
      return;
    }

    if (computeTotals.totalInSelected <= 0) return;

    setIsGettingQuote(true);
    try {
      const quote = await getSwapQuote(
        wallet.selectedToken.symbol,
        product.paymentToken,
        computeTotals.totalInSelected
      );
      setSwapQuote(quote);
    } catch (error) {
      console.error("Failed to get swap quote:", error);
      setSwapQuote("");
    } finally {
      setIsGettingQuote(false);
    }
  }, [
    product,
    wallet.isConnected,
    wallet.selectedToken.symbol,
    computeTotals.totalInSelected,
    getSwapQuote,
  ]);

  // Update quote when relevant values change
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      updateSwapQuote();
    }, 500); // Debounce quote requests

    return () => clearTimeout(timeoutId);
  }, [updateSwapQuote]);

  const validateSwapRequirements = useCallback(async () => {
    if (!wallet.isConnected || !product) return false;

    try {
      // Check if we need to initialize Mento
      const mentoReady = await initializeMento();
      if (!mentoReady) {
        setPurchaseError("Swap functionality not available. Please try again.");
        return false;
      }

      // Validate balance
      const balance = parseFloat(
        wallet.tokenBalances[wallet.selectedToken.symbol]?.raw || "0"
      );
      if (balance < computeTotals.totalInSelected) {
        setPurchaseError(
          `Insufficient ${wallet.selectedToken.symbol} balance for swap`
        );
        return false;
      }

      // Test if pair exists
      const pairSupported = await isSwapSupported;
      if (!pairSupported) {
        setPurchaseError(
          `${wallet.selectedToken.symbol}/${product.paymentToken} swap not supported`
        );
        return false;
      }

      return true;
    } catch (error) {
      setPurchaseError("Failed to validate swap requirements");
      return false;
    }
  }, [wallet, product, computeTotals, initializeMento, isSwapSupported]);

  const handleButtonClick = async () => {
    setPurchaseError(null);

    // Authentication check
    if (!isAuthenticated) {
      return navigate("/login");
    }

    // Product and logistics validation
    if (!product || !selectedLogistics) {
      setPurchaseError("Please select a delivery method");
      return;
    }

    // Wallet connection check
    if (!wallet.isConnected) {
      setShowWalletModal(true);
      return;
    }

    // Balance check
    if (!hasSufficientBalance) {
      setPurchaseError(`Insufficient ${wallet.selectedToken.symbol} balance`);
      return;
    }

    // Determine if swap is needed
    if (wallet.selectedToken.symbol !== product.paymentToken) {
      // setShowSwapModal(true);
      // return;
      const canSwap = await validateSwapRequirements();
      if (!canSwap) return;

      setShowSwapModal(true);
      return;
    }

    // Direct purchase
    await executeOrder();
  };

  const executeOrder = async () => {
    if (!product || !selectedLogistics) return;

    setIsProcessing(true);
    setPurchaseError(null);

    try {
      // Check and approve token if necessary
      const requiredAmount = computeTotals.totalInPayment.toString();
      const currentAllowance = await getTokenAllowance(product.paymentToken);

      if (currentAllowance < computeTotals.totalInPayment) {
        setPurchaseError("Approving token spend...");
        await approveToken(product.paymentToken, requiredAmount);
        // Wait a moment for blockchain confirmation
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }

      const order = await placeOrder({
        product: product._id,
        quantity,
        logisticsProviderWalletAddress: selectedLogistics.walletAddress,
      });

      if (!order?._id) {
        throw new Error("Order creation failed");
      }

      // Refresh balance after successful order
      await refreshTokenBalance();

      navigate(`/orders/${order._id}?status=pending`);
    } catch (err: any) {
      console.error("Purchase failed:", err);
      setPurchaseError(err.message || "Purchase failed. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmSwap = async () => {
    if (!product) return;

    setPurchaseError(null);

    try {
      // Perform the swap
      await performSwap(
        wallet.selectedToken.symbol,
        product.paymentToken,
        computeTotals.totalInSelected
      );

      // Switch to payment token
      const targetToken = STABLE_TOKENS.find(
        (t) => t.symbol === product.paymentToken
      );
      if (targetToken) {
        setSelectedToken(targetToken);
      }

      setShowSwapModal(false);

      // Execute order after successful swap
      setTimeout(() => {
        executeOrder();
      }, 1000);
    } catch (err: any) {
      console.error("Swap failed:", err);
      setPurchaseError(err.message || "Swap failed. Please try again.");
    }
  };

  const formatBalance = (balance: string | undefined) => {
    if (!balance || !mounted) return "Loading...";
    const num = parseFloat(balance);
    return num.toLocaleString("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 6,
    });
  };

  // Don't render during SSR
  if (!mounted) {
    return <div className="bg-[#212428] p-4 md:p-6 animate-pulse h-64"></div>;
  }

  const isLoading = isProcessing || swapState.isSwapping;
  const hasError = purchaseError || swapState.error;

  return (
    <>
      <div className="bg-[#212428] p-4 md:p-6 space-y-4">
        {/* Error Display */}
        {hasError && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-lg text-sm flex items-center gap-2">
            <HiExclamationTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{purchaseError || swapState.error}</span>
          </div>
        )}

        {/* Quantity and Stock Info */}
        <div className="flex justify-between items-center">
          <QuantitySelector
            min={1}
            max={Math.min(99, availableQty)}
            availableQuantity={availableQty}
            onChange={setQuantity}
          />
          <div className="text-xs">
            {isOutOfStock ? (
              <span className="text-red-500 font-medium">Out of stock</span>
            ) : isLowStock ? (
              <span className="text-yellow-500">Only {availableQty} left</span>
            ) : (
              <span className="text-green-500">{availableQty} available</span>
            )}
          </div>
        </div>

        {/* Logistics Selection */}
        <LogisticsSelector
          logisticsCost={product?.logisticsCost || []}
          logisticsProviders={product?.logisticsProviders || []}
          selectedProvider={selectedLogistics}
          onSelect={setSelectedLogistics}
        />

        {/* Balance Warning */}
        {wallet.isConnected && !hasSufficientBalance && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 p-3 rounded-lg text-sm flex items-center gap-2">
            <HiSignal className="w-4 h-4 flex-shrink-0" />
            <span>Insufficient balance for this purchase</span>
          </div>
        )}

        {/* Swap Preview */}
        {wallet.isConnected &&
          product &&
          wallet.selectedToken.symbol !== product.paymentToken &&
          computeTotals.totalInSelected > 0 && (
            <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-3">
              <div className="flex items-center gap-2 text-red-300 text-sm">
                <FaExchangeAlt className="w-3 h-3" />
                <span>
                  Will swap {computeTotals.totalInSelected.toFixed(4)}{" "}
                  {wallet.selectedToken.symbol}
                  {isGettingQuote ? (
                    <FaSpinner className="inline ml-2 animate-spin w-3 h-3" />
                  ) : swapQuote ? (
                    ` → ${parseFloat(swapQuote).toFixed(4)} ${
                      product.paymentToken
                    }`
                  ) : null}
                </span>
              </div>
            </div>
          )}

        {/* Purchase Button */}
        <button
          onClick={handleButtonClick}
          disabled={isLoading || isOutOfStock}
          className="bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white py-3 px-6 rounded-lg w-full flex justify-center items-center gap-2 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
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
                  : "Buy Now"}
              </span>
            </>
          )}
        </button>

        {/* Wallet Info */}
        {wallet.isConnected && (
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 text-xs space-y-2">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-1 text-gray-400">
                <HiCurrencyDollar className="text-red-500 w-3 h-3" />
                <span>{wallet.selectedToken.symbol} Balance:</span>
              </div>
              <div className="text-white font-medium">
                {formatBalance(
                  wallet.tokenBalances[wallet.selectedToken.symbol]?.raw
                )}
              </div>
            </div>

            {wallet.address && (
              <div className="text-gray-500 text-center pt-1 border-t border-gray-700">
                {`${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)}`}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      <WalletConnectionModal
        isOpen={showWalletModal}
        onClose={() => setShowWalletModal(false)}
      />

      <SwapConfirmationModal
        isOpen={showSwapModal}
        fromToken={wallet.selectedToken.symbol}
        toToken={product?.paymentToken || ""}
        amountIn={computeTotals.totalInSelected}
        amountOut={swapQuote}
        isProcessing={swapState.isSwapping}
        error={swapState.error || undefined}
        onClose={() => setShowSwapModal(false)}
        onConfirm={handleConfirmSwap}
        slippage={5}
      />
    </>
  );
};

export default PurchaseSection;
