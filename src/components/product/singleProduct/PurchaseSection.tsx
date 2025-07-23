// PurchaseSection.tsx
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
import SwapConfirmationModal from "../../common/SwapConfirmationModal";
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
    refreshTokenBalance,
    approveToken,
    getTokenAllowance,
    initializeMento,
    swapState,
  } = useWeb3();
  const { isAuthenticated } = useAuth();

  const [quantity, setQuantity] = useState(1);
  const [selectedLogistics, setSelectedLogistics] =
    useState<LogisticsProvider | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [showSwapModal, setShowSwapModal] = useState(false);
  const [swapQuote, setSwapQuote] = useState<string>("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    setQuantity(1);
    setError(null);
  }, [selectedVariant]);

  const computeTotals = useMemo(() => {
    if (!product || !selectedLogistics || !mounted) return null;
    const usd = product.price * quantity;
    const logistics = selectedLogistics.cost;
    const fee = usd * 0.025;
    const totalUsd = usd + fee + logistics;

    return {
      usd: totalUsd,
      selectedTotal: convertPrice(
        totalUsd,
        "USDT",
        wallet.selectedToken.symbol
      ),
      paymentTotal: convertPrice(totalUsd, "USDT", product.paymentToken),
    };
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

  const insufficientBalance = useMemo(() => {
    if (!wallet.isConnected || !mounted || !computeTotals) return false;
    const required =
      wallet.selectedToken.symbol === product?.paymentToken
        ? computeTotals.paymentTotal
        : computeTotals.selectedTotal;

    const balance = wallet.tokenBalances[wallet.selectedToken.symbol]?.raw;
    return parseFloat(balance || "0") < required;
  }, [wallet, product, computeTotals, mounted]);

  const updateQuote = useCallback(async () => {
    if (
      !product ||
      !wallet.isConnected ||
      wallet.selectedToken.symbol === product.paymentToken
    ) {
      setSwapQuote("");
      return;
    }

    if (!computeTotals || computeTotals.selectedTotal <= 0) return;

    try {
      const quote = await getSwapQuote(
        wallet.selectedToken.symbol,
        product.paymentToken,
        computeTotals.selectedTotal
      );
      setSwapQuote(quote);
    } catch (e) {
      setSwapQuote("");
    }
  }, [wallet.selectedToken.symbol, product, computeTotals, getSwapQuote]);

  useEffect(() => {
    const timeout = setTimeout(() => updateQuote(), 500);
    return () => clearTimeout(timeout);
  }, [updateQuote]);

  const validateSwap = useCallback(async () => {
    if (!wallet.isConnected || !product || !computeTotals) return false;
    const ready = await initializeMento();
    if (!ready) return false;

    const balance = parseFloat(
      wallet.tokenBalances[wallet.selectedToken.symbol]?.raw || "0"
    );
    if (balance < computeTotals.selectedTotal) {
      setError(`Insufficient ${wallet.selectedToken.symbol} balance for swap`);
      return false;
    }

    try {
      await getSwapQuote(wallet.selectedToken.symbol, product.paymentToken, 1);
      return true;
    } catch {
      setError("Swap pair not supported");
      return false;
    }
  }, [wallet, product, computeTotals, initializeMento, getSwapQuote]);

  const handleBuy = async () => {
    setError(null);
    if (!isAuthenticated) return navigate("/login");
    if (!product || !selectedLogistics)
      return setError("Please select a delivery option");
    if (!wallet.isConnected) return setShowWalletModal(true);
    if (insufficientBalance) return setError("Insufficient balance");

    if (wallet.selectedToken.symbol !== product.paymentToken) {
      const valid = await validateSwap();
      if (!valid) return;
      return setShowSwapModal(true);
    }

    await executeOrder();
  };

  const executeOrder = async () => {
    if (!product || !selectedLogistics || !computeTotals) return;
    setIsProcessing(true);
    setError(null);
    try {
      const allowance = await getTokenAllowance(product.paymentToken);
      if (allowance < computeTotals.paymentTotal) {
        await approveToken(
          product.paymentToken,
          computeTotals.paymentTotal.toString()
        );
        await new Promise((r) => setTimeout(r, 2000));
      }

      const order = await placeOrder({
        product: product._id,
        quantity,
        logisticsProviderWalletAddress: selectedLogistics.walletAddress,
      });

      if (!order?._id) throw new Error("Order creation failed");
      await refreshTokenBalance();
      navigate(`/orders/${order._id}?status=pending`);
    } catch (e: any) {
      setError(e.message || "Purchase failed");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmSwap = async () => {
    if (!product || !computeTotals) return;

    try {
      await performSwap(
        wallet.selectedToken.symbol,
        product.paymentToken,
        computeTotals.selectedTotal
      );

      const toToken = STABLE_TOKENS.find(
        (t) => t.symbol === product.paymentToken
      );
      if (toToken) setSelectedToken(toToken);

      setShowSwapModal(false);
      setTimeout(() => executeOrder(), 800);
    } catch (e: any) {
      setError(e.message || "Swap failed");
    }
  };

  const formatBalance = (raw?: string) => {
    const num = parseFloat(raw || "0");
    return num.toLocaleString("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 6,
    });
  };

  if (!mounted)
    return <div className="bg-[#212428] p-4 md:p-6 animate-pulse h-64"></div>;

  const isLoading = isProcessing || swapState.isSwapping;

  return (
    <>
      <div className="bg-[#212428] p-4 md:p-6 space-y-4">
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-lg text-sm flex items-center gap-2">
            <HiExclamationTriangle className="w-4 h-4" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex justify-between items-center">
          <QuantitySelector
            min={1}
            max={Math.min(99, availableQty)}
            availableQuantity={availableQty}
            onChange={setQuantity}
          />
          <div className="text-xs">
            {availableQty <= 0 ? (
              <span className="text-red-500 font-medium">Out of stock</span>
            ) : availableQty < 10 ? (
              <span className="text-yellow-500">Only {availableQty} left</span>
            ) : (
              <span className="text-green-500">{availableQty} available</span>
            )}
          </div>
        </div>

        <LogisticsSelector
          logisticsCost={product?.logisticsCost || []}
          logisticsProviders={product?.logisticsProviders || []}
          selectedProvider={selectedLogistics}
          onSelect={setSelectedLogistics}
        />

        {insufficientBalance && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 p-3 rounded-lg text-sm flex items-center gap-2">
            <HiSignal className="w-4 h-4" />
            <span>Insufficient balance for this purchase</span>
          </div>
        )}

        {wallet.isConnected &&
          product &&
          computeTotals &&
          wallet.selectedToken.symbol !== product.paymentToken &&
          computeTotals?.selectedTotal > 0 && (
            <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-3">
              <div className="flex items-center gap-2 text-red-300 text-sm">
                <FaExchangeAlt className="w-3 h-3" />
                <span>
                  Will swap {computeTotals.selectedTotal.toFixed(4)}{" "}
                  {wallet.selectedToken.symbol}
                  {swapQuote &&
                    ` → ${parseFloat(swapQuote).toFixed(4)} ${
                      product.paymentToken
                    }`}
                </span>
              </div>
            </div>
          )}

        <button
          onClick={handleBuy}
          disabled={isLoading || availableQty <= 0}
          className="bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white py-3 px-6 rounded-lg w-full flex justify-center items-center gap-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
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

        {wallet.isConnected && (
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 text-xs space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-400 flex items-center gap-1">
                <HiCurrencyDollar className="text-red-500 w-3 h-3" />
                {wallet.selectedToken.symbol} Balance:
              </span>
              <span className="text-white font-medium">
                {formatBalance(
                  wallet.tokenBalances[wallet.selectedToken.symbol]?.raw
                )}
              </span>
            </div>
            <div className="text-gray-500 text-center pt-1 border-t border-gray-700">
              {wallet.address?.slice(0, 6)}...{wallet.address?.slice(-4)}
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
        amountIn={computeTotals?.selectedTotal || 0}
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
