// PurchaseSection.tsx
import { useState, useEffect, useCallback } from "react";
import { FaWallet, FaSpinner } from "react-icons/fa";
import { HiCurrencyDollar, HiSignal } from "react-icons/hi2";
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
  const { wallet, performSwap, setSelectedToken } = useWeb3();
  const { isAuthenticated } = useAuth();

  const [quantity, setQuantity] = useState(1);
  const [selectedLogistics, setSelectedLogistics] =
    useState<LogisticsProvider | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSwapping, setIsSwapping] = useState(false);
  const [swapError, setSwapError] = useState<string | null>(null);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [showSwapModal, setShowSwapModal] = useState(false);
  const [swapAmount, setSwapAmount] = useState(0);

  useEffect(() => {
    setQuantity(1);
  }, [selectedVariant]);

  const computeTotals = useCallback(() => {
    if (!product || !selectedLogistics)
      return { grandTotalUsd: 0, totalInSel: 0, totalInPay: 0 };
    const totalUsd = product.price * quantity;
    const fee = totalUsd * 0.025;
    const logistics = selectedLogistics.cost;
    const grandTotalUsd = totalUsd + fee + logistics;
    const sel = wallet.selectedToken.symbol;
    const pay = product.paymentToken;
    const totalInSel = convertPrice(grandTotalUsd, "USDT", sel);
    const totalInPay = convertPrice(grandTotalUsd, "USDT", pay);
    return { grandTotalUsd, totalInSel, totalInPay };
  }, [
    product,
    selectedLogistics,
    quantity,
    wallet.selectedToken,
    convertPrice,
  ]);

  const handleButtonClick = async () => {
    if (!isAuthenticated) return navigate("/login");
    if (!product || !selectedLogistics) {
      setSwapError("Please select delivery method");
      return;
    }
    if (!wallet.isConnected) return setShowWalletModal(true);

    const { totalInSel } = computeTotals();
    if (wallet.selectedToken.symbol !== product.paymentToken) {
      setSwapAmount(totalInSel);
      setShowSwapModal(true);
      return;
    }
    await doPlaceOrder();
  };

  const doPlaceOrder = async () => {
    setIsProcessing(true);
    setSwapError(null);
    try {
      const order = await placeOrder({
        product: product!._id,
        quantity,
        logisticsProviderWalletAddress: selectedLogistics!.walletAddress,
      });
      if (!order?._id) throw new Error("Order creation failed");
      navigate(`/orders/${order._id}?status=pending`);
    } catch (err: any) {
      setSwapError(err.message || "Purchase failed");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmSwap = async () => {
    setSwapError(null);
    setIsSwapping(true);
    try {
      const balRaw = wallet.tokenBalances[wallet.selectedToken.symbol]?.raw;
      if (!balRaw || parseFloat(balRaw) < swapAmount)
        throw new Error("Insufficient balance for swap");
      await performSwap(
        wallet.selectedToken.symbol,
        product!.paymentToken,
        swapAmount
      );

      const tokenObj = STABLE_TOKENS.find(
        (t) => t.symbol === product!.paymentToken
      );
      if (tokenObj) setSelectedToken(tokenObj);
      setShowSwapModal(false);
      await doPlaceOrder();
    } catch (err: any) {
      setSwapError(err.message);
    } finally {
      setIsSwapping(false);
    }
  };

  const availableQty = selectedVariant
    ? selectedVariant.quantity
    : product?.logisticsCost.length
    ? parseFloat(product.logisticsCost[0])
    : 0;
  const isOutOfStock = availableQty <= 0;

  return (
    <>
      <div className="bg-[#212428] p-4 md:p-6 space-y-4">
        {swapError && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-md text-sm flex items-center gap-2">
            <HiSignal className="w-4 h-4" />
            {swapError}
          </div>
        )}

        <div className="flex justify-between items-center">
          <QuantitySelector
            min={1}
            max={99}
            availableQuantity={availableQty}
            onChange={setQuantity}
          />
          {isOutOfStock ? (
            <span className="text-xs text-red-500">Out of stock</span>
          ) : availableQty < 10 ? (
            <span className="text-xs text-yellow-500">
              Only {availableQty} left
            </span>
          ) : null}
        </div>

        <LogisticsSelector
          logisticsCost={product?.logisticsCost || []}
          logisticsProviders={product?.logisticsProviders || []}
          selectedProvider={selectedLogistics}
          onSelect={setSelectedLogistics}
        />

        <button
          onClick={handleButtonClick}
          disabled={isProcessing || isSwapping || isOutOfStock}
          className="bg-red-600 text-white py-3 px-6 rounded-md w-full flex justify-center items-center gap-2 hover:bg-red-700 disabled:opacity-50"
        >
          {isProcessing || isSwapping ? (
            <>
              <FaSpinner className="animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <FaWallet />
              {!isAuthenticated
                ? "Login to Buy"
                : !wallet.isConnected
                ? "Connect Wallet"
                : "Buy Now"}
            </>
          )}
        </button>

        {wallet.isConnected && (
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-2 text-xs">
            <div className="flex justify-between">
              <div className="flex items-center gap-1">
                <HiCurrencyDollar className="text-red-500" />
                Balance:
              </div>
              <div className="text-white">
                {wallet.tokenBalances[wallet.selectedToken.symbol]?.formatted ||
                  "Loading..."}
              </div>
            </div>
            <div className="text-gray-500 text-center mt-1 border-t border-gray-700 pt-1 text-xs">
              {wallet.address &&
                `${wallet.address.slice(0, 4)}…${wallet.address.slice(-4)}`}
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
        fromToken={wallet.selectedToken.symbol}
        toToken={product?.paymentToken || ""}
        amountIn={swapAmount}
        amountOut={computeTotals().totalInPay}
        isProcessing={isSwapping}
        error={swapError || undefined}
        onClose={() => setShowSwapModal(false)}
        onConfirm={handleConfirmSwap}
      />
    </>
  );
};

export default PurchaseSection;
