import { useState, useEffect, useMemo } from "react";
import { FaWallet, FaSpinner, FaExchangeAlt } from "react-icons/fa";
import { HiCurrencyDollar, HiSignal } from "react-icons/hi2";
import { Product, ProductVariant } from "../../../utils/types";
import { useWeb3 } from "../../../context/Web3Context";
import { useOrderData } from "../../../utils/hooks/useOrder";
import { useNavigate } from "react-router-dom";
import QuantitySelector from "./QuantitySelector";
import { useCurrency } from "../../../context/CurrencyContext";
import { useCurrencyConverter } from "../../../utils/hooks/useCurrencyConverter";
import { useSwap } from "../../../utils/hooks/useSwap";
import LogisticsSelector, { LogisticsProvider } from "./LogisticsSelector";
import { useAuth } from "../../../context/AuthContext";
import WalletConnectionModal from "../../web3/WalletConnectionModal";
import SwapConfirmationModal from "../../common/SwapConfirmationModal";
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

const PurchaseSection = ({
  product,
  selectedVariant,
}: PurchaseSectionProps) => {
  const navigate = useNavigate();
  const { placeOrder } = useOrderData();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [showSwapModal, setShowSwapModal] = useState(false);
  const { secondaryCurrency } = useCurrency();
  const { isAuthenticated } = useAuth();
  const { wallet, connectWallet, isCorrectNetwork, setSelectedToken } =
    useWeb3();
  const { convertPrice } = useCurrencyConverter();
  const { executeSwap, isSwapping } = useSwap();
  const [selectedLogistics, setSelectedLogistics] =
    useState<LogisticsProvider | null>(null);

  // Calculate total cost including fees
  const totalCostUSD = useMemo(() => {
    if (!product || !selectedLogistics) return 0;

    const productCost = product.price * quantity;
    const fee = productCost * 0.025; // 2.5% fee
    const logisticsCost = parseFloat("2");

    return productCost + fee + logisticsCost;
  }, [product, quantity, selectedLogistics]);

  // Check if swap is needed
  const needsSwap = useMemo(() => {
    return (
      product?.paymentToken &&
      wallet.selectedToken.symbol !== product.paymentToken
    );
  }, [product?.paymentToken, wallet.selectedToken.symbol]);

  // Check if user has sufficient balance
  const hasSufficientBalance = useMemo(() => {
    if (!wallet.isConnected || !totalCostUSD) return false;

    const tokenToCheck = needsSwap
      ? wallet.selectedToken.symbol
      : product?.paymentToken;
    if (!tokenToCheck) return false;
    const balance = wallet.tokenBalances[tokenToCheck];

    if (!balance) return false;

    const requiredAmount = convertPrice(totalCostUSD, "FIAT", tokenToCheck);
    return parseFloat(balance.raw) >= requiredAmount;
  }, [
    wallet.tokenBalances,
    totalCostUSD,
    needsSwap,
    product?.paymentToken,
    wallet.selectedToken.symbol,
    convertPrice,
    wallet.isConnected,
  ]);

  useEffect(() => {
    setQuantity(1);
  }, [selectedVariant]);

  const handleConnectWallet = async () => {
    setIsProcessing(true);
    setError(null);

    try {
      await connectWallet();
    } catch (err: any) {
      console.error("Error connecting wallet:", err);
      setError(`Failed to connect wallet: ${err.message || "Unknown error"}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleLogisticsSelect = (provider: LogisticsProvider) => {
    setSelectedLogistics(provider);
  };

  const handleSwapAndPurchase = async () => {
    if (!product || !selectedLogistics || !needsSwap) return;

    setIsProcessing(true);
    setError(null);

    try {
      // Execute the swap
      await executeSwap({
        fromToken: wallet.selectedToken.symbol,
        toToken: product.paymentToken,
        amount: totalCostUSD.toString(),
        slippageTolerance: 1,
      });

      // Switch to payment token
      const paymentToken = STABLE_TOKENS.find(
        (t) => t.symbol === product.paymentToken
      );
      if (paymentToken) {
        setSelectedToken(paymentToken);
      }

      // Small delay to allow balance update
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Proceed with purchase
      await handleDirectPurchase();
    } catch (err: any) {
      console.error("Swap failed:", err);
      setError(`Swap failed: ${err.message || "Please try again"}`);
    } finally {
      setIsProcessing(false);
      setShowSwapModal(false);
    }
  };

  const handleDirectPurchase = async () => {
    if (!product || !selectedLogistics) return;

    setIsProcessing(true);
    setError(null);

    try {
      const order = await placeOrder({
        product: product._id,
        quantity: quantity,
        logisticsProviderWalletAddress: selectedLogistics.walletAddress,
      });

      if (order && order._id) {
        navigate(`/orders/${order._id}?status=pending`);
      } else {
        setError("Failed to create order. Please try again.");
      }
    } catch (err) {
      setError(`Transaction failed: ${(err as string) || "Please try again"}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePurchase = async () => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }

    if (!product) return;
    if (!selectedLogistics) {
      setError("Please select a delivery method");
      return;
    }

    if (!hasSufficientBalance) {
      setError(
        `Insufficient balance. You need ${convertPrice(
          totalCostUSD,
          "FIAT",
          needsSwap ? wallet.selectedToken.symbol : product.paymentToken
        ).toFixed(4)} ${
          needsSwap ? wallet.selectedToken.symbol : product.paymentToken
        }`
      );
      return;
    }

    if (needsSwap) {
      setShowSwapModal(true);
    } else {
      await handleDirectPurchase();
    }
  };

  const handleQuantityChange = (newQuantity: number) => {
    setQuantity(newQuantity);
  };

  const isOutOfStock = selectedVariant && selectedVariant.quantity <= 0;
  const availableQuantity = selectedVariant
    ? selectedVariant.quantity
    : product?.stock || 99;

  const handleButtonClick = () => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }

    if (wallet.isConnected) {
      handlePurchase();
    } else {
      setShowWalletModal(true);
    }
  };

  const getButtonText = () => {
    if (isProcessing || isSwapping) {
      return needsSwap && showSwapModal ? "Swapping..." : "Processing...";
    }

    if (isOutOfStock) return "Out of Stock";
    if (!isAuthenticated) return "Login to buy";
    if (!wallet.isConnected) return "Connect wallet to buy";

    if (needsSwap) {
      return `Swap to ${product?.paymentToken} & Buy`;
    }

    return "Buy Now";
  };

  const getButtonIcon = () => {
    if (isProcessing || isSwapping) {
      return <FaSpinner className="animate-spin text-lg" />;
    }

    if (needsSwap && wallet.isConnected) {
      return <FaExchangeAlt className="text-lg" />;
    }

    return <FaWallet className="text-lg" />;
  };

  return (
    <>
      <div className="bg-[#212428] p-4 md:p-6 space-y-4">
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-md text-sm mb-3 flex items-center gap-2">
            <HiSignal className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Payment Token Notice */}
        {needsSwap && wallet.isConnected && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 p-3 rounded-md text-sm mb-3">
            <p className="font-medium">
              Payment Token: {product?.paymentToken}
            </p>
            <p className="text-xs mt-1">
              This product requires payment in {product?.paymentToken}. We'll
              swap from your {wallet.selectedToken.symbol} automatically.
            </p>
          </div>
        )}

        {/* Quantity Selector */}
        <div className="flex justify-between items-center">
          <QuantitySelector
            min={1}
            max={99}
            onChange={handleQuantityChange}
            availableQuantity={availableQuantity as number}
          />

          {isOutOfStock ? (
            <span className="text-xs text-red-500 font-medium">
              Out of stock
            </span>
          ) : availableQuantity && Number(availableQuantity) < 10 ? (
            <span className="text-xs text-yellow-500 font-medium">
              Only {availableQuantity} left
            </span>
          ) : null}
        </div>

        {/* Logistics Selector */}
        <LogisticsSelector
          logisticsCost={product?.logisticsCost ?? []}
          logisticsProviders={product?.logisticsProviders ?? []}
          onSelect={handleLogisticsSelect}
          selectedProvider={selectedLogistics}
        />

        {/* Cost Breakdown */}
        {selectedLogistics && (
          <div className="bg-Dark/30 border border-Red/20 rounded-lg p-3 text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-gray-400">Product ({quantity}x):</span>
              <span className="text-white">
                ${((product?.price ?? 0) * quantity).toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Platform fee (2.5%):</span>
              <span className="text-white">
                ${((product?.price ?? 0) * quantity * 0.025).toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Logistics:</span>
              <span className="text-white">${selectedLogistics.cost}</span>
            </div>
            <div className="flex justify-between font-medium border-t border-Red/10 pt-1">
              <span className="text-white">Total:</span>
              <span className="text-Red">${totalCostUSD.toFixed(2)}</span>
            </div>
          </div>
        )}

        {/* Purchase Button */}
        <div className="flex gap-3 w-full">
          <button
            className={`py-3 px-6 md:px-10 font-bold flex-1 rounded-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg ${
              needsSwap && wallet.isConnected
                ? "bg-amber-600 hover:bg-amber-700 text-white"
                : "bg-Red hover:bg-Red/80 text-white"
            }`}
            onClick={handleButtonClick}
            disabled={
              isProcessing ||
              isSwapping ||
              !product ||
              isOutOfStock ||
              (!hasSufficientBalance && wallet.isConnected)
            }
          >
            {getButtonIcon()}
            <span>{getButtonText()}</span>
          </button>
        </div>

        {/* Balance Warning */}
        {wallet.isConnected && !hasSufficientBalance && totalCostUSD > 0 && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-2 rounded-md text-xs">
            Insufficient balance for this purchase
          </div>
        )}

        {/* Wallet Balance Display */}
        {wallet.isConnected && (
          <div className="bg-Dark/30 border border-Red/20 rounded-lg p-2 text-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HiCurrencyDollar className="w-3 h-3 text-Red" />
                <span className="text-gray-400">Balance:</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-white">
                  {wallet.tokenBalances[wallet.selectedToken.symbol]
                    ?.formatted || "Loading..."}
                </span>
              </div>
            </div>

            <div className="text-center mt-1 pt-1 border-t border-Red/10">
              <div className="text-gray-500 text-xs">
                {wallet.address
                  ? `${wallet.address.substring(
                      0,
                      4
                    )}...${wallet.address.substring(wallet.address.length - 4)}`
                  : ""}
              </div>
            </div>
          </div>
        )}
      </div>

      <WalletConnectionModal
        isOpen={showWalletModal}
        onClose={() => setShowWalletModal(false)}
      />

      <SwapConfirmationModal
        isOpen={showSwapModal}
        onClose={() => setShowSwapModal(false)}
        onConfirm={handleSwapAndPurchase}
        fromToken={wallet.selectedToken.symbol}
        toToken={product?.paymentToken || ""}
        usdAmount={totalCostUSD.toString()}
        productName={product?.name || ""}
        loading={isProcessing || isSwapping}
      />
    </>
  );
};

export default PurchaseSection;
