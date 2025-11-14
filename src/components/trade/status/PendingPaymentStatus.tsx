import { FC, useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  OrderDetails,
  TradeDetails,
  TradeTransactionInfo,
} from "../../../utils/types";
import BaseStatus from "./BaseStatus";
import StatusAlert from "./StatusAlert";
import Button from "../../common/Button";
import { BsShieldExclamation } from "react-icons/bs";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import Modal from "../../common/Modal";
import { FiEdit2 } from "react-icons/fi";
import LogisticsSelector from "../../product/singleProduct/LogisticsSelector";
import { useSnackbar } from "../../../context/SnackbarContext";
import { useWeb3 } from "../../../context/Web3Context";
import { useUpdateOrderStatusMutation } from "../../../store/api";
import { ESCROW_ADDRESSES } from "../../../utils/config/web3.config";
import PaymentModal from "../../web3/PaymentModal";
import WalletConnectionModal from "../../web3/WalletConnectionModal";
import {
  clearStoredOrderId,
  getStoredOrderId,
  storeOrderId,
} from "../../../utils/helpers";
import { PaymentTransaction } from "../../../utils/types/web3.types";
import { useCurrencyConverter } from "../../../utils/hooks/useCurrencyConverter";

interface PendingPaymentStatusProps {
  tradeDetails?: TradeDetails;
  orderDetails?: OrderDetails;
  transactionInfo?: TradeTransactionInfo;
  onContactSeller?: () => void;
  onOrderDispute?: (reason: string) => Promise<void>;
  onReleaseNow?: () => void;
  navigatePath?: string;
  orderId?: string;
  showTimer?: boolean;
  onUpdateOrder?: (orderId: string, updates: any) => Promise<void>;
}

interface TimeRemaining {
  minutes: number;
  seconds: number;
}

interface UpdateOrderPayload {
  quantity: number;
  logisticsProviderWalletAddress?: string;
}

const PendingPaymentStatus: FC<PendingPaymentStatusProps> = ({
  tradeDetails,
  orderDetails: details,
  transactionInfo: txInfo,
  onReleaseNow,
  navigatePath,
  orderId,
  showTimer = false,
  onUpdateOrder,
}) => {
  const navigate = useNavigate();
  const { showSnackbar } = useSnackbar();
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);
  const {
    wallet,
    connectWallet,
    validateTradeBeforePurchase,
    refreshTokenBalance,
  } = useWeb3();
  const { convertPrice, formatPrice } = useCurrencyConverter();
  const [updateOrderStatus] = useUpdateOrderStatusMutation();

  const [showWalletModal, setShowWalletModal] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);
  const abortControllerRef = useRef<AbortController | null>(null);
  const balanceRefetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [timeRemaining, setTimeRemaining] = useState<TimeRemaining>(() => ({
    minutes: 9,
    seconds: 59,
  }));
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [quantity, setQuantity] = useState<number>(1);
  const [selectedLogisticsProvider, setSelectedLogisticsProvider] =
    useState<any>(null);
  const tradeValidationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const orderDetails = useMemo(() => {
    if (!details) return details;
    return {
      ...details,
      logisticsProviderWalletAddress:
        details.logisticsProviderWalletAddress || [],
    };
  }, [
    details?._id,
    details?.status,
    details?.quantity,
    details?.product?.price,
  ]);
  const transactionInfo = useMemo(
    () => txInfo,
    [txInfo?.buyerName, txInfo?.sellerName]
  );
  const tradeValidation = useMemo(() => {
    if (orderDetails?.tradeValidation) {
      return {
        isValid: orderDetails.tradeValidation.isValid,
        isLoading: false,
        error: orderDetails.tradeValidation.error,
      };
    }

    // Default to valid if no validation data (for non-pending statuses)
    return {
      isValid: true,
      isLoading: false,
      error: null,
    };
  }, [orderDetails?.tradeValidation]);
  useEffect(() => {
    if (orderId) {
      storeOrderId(orderId);
    }
  }, [orderId]);
  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      if (timerRef.current) clearInterval(timerRef.current);
      if (abortControllerRef.current) abortControllerRef.current.abort();
      if (balanceRefetchTimeoutRef.current)
        clearTimeout(balanceRefetchTimeoutRef.current);
      if (tradeValidationTimeoutRef.current)
        clearTimeout(tradeValidationTimeoutRef.current);
    };
  }, []);

  // useEffect(() => {
  //   const validateTrade = async () => {
  //     if (
  //       !orderDetails?.product?.tradeId ||
  //       !wallet.isConnected ||
  //       tradeValidation.isLoading
  //     )
  //       return;

  //     // Clear previous timeout
  //     if (tradeValidationTimeoutRef.current) {
  //       clearTimeout(tradeValidationTimeoutRef.current);
  //     }

  //     tradeValidationTimeoutRef.current = setTimeout(async () => {
  //       setTradeValidation({ isValid: true, isLoading: true, error: null });

  //       try {
  //         const isValid = await validateTradeBeforePurchase?.(
  //           orderDetails.product.tradeId,
  //           orderDetails.quantity.toString(),
  //           orderDetails.logisticsProviderWalletAddress[0]
  //         );

  //         if (mountedRef.current) {
  //           setTradeValidation({
  //             isValid: isValid || false,
  //             isLoading: false,
  //             error: isValid ? null : "Product no longer available",
  //           });
  //         }
  //       } catch (error) {
  //         if (mountedRef.current) {
  //           console.error("Trade validation error:", error);
  //           setTradeValidation({
  //             isValid: false,
  //             isLoading: false,
  //             error: "Unable to verify product availability",
  //           });
  //         }
  //       }
  //     }, 2000);
  //   };

  //   validateTrade();

  //   return () => {
  //     if (tradeValidationTimeoutRef.current) {
  //       clearTimeout(tradeValidationTimeoutRef.current);
  //     }
  //   };
  // }, [
  //   orderDetails?.product?.tradeId,
  //   orderDetails?.quantity,
  //   orderDetails?.logisticsProviderWalletAddress?.[0],
  //   wallet.isConnected,
  // ]);

  const orderValidation = useMemo(() => {
    try {
      if (!orderDetails?.product?.price || !orderDetails.quantity) {
        return {
          isValid: false,
          error: "Order information incomplete",
        };
      }

      if (quantity <= 0 || quantity > 999) {
        return {
          isValid: false,
          error: "Invalid quantity (1-999)",
        };
      }

      if (!tradeValidation.isValid) {
        return {
          isValid: false,
          error: tradeValidation.error || "Product not available",
        };
      }

      return { isValid: true, error: null };
    } catch (error) {
      console.error("Order validation error:", error);
      return {
        isValid: false,
        error: "Order validation failed",
      };
    }
  }, [
    orderDetails?.product?.price,
    orderDetails?.quantity,
    quantity,
    tradeValidation.isValid,
    tradeValidation.error,
  ]);

  const calculations = useMemo(() => {
    if (!orderValidation.isValid || !orderDetails?.product?.price) {
      return {
        totalAmountUSD: 0,
        totalAmountInToken: 0,
        hasChanges: false,
        userBalance: 0,
        hasSufficientBalance: false,
      };
    }

    try {
      // Product prices are in USD
      const productPriceUSD = orderDetails.product.price;
      const subtotalUSD = productPriceUSD * quantity;
      const escrowFeeRate = 0.025; // 2.5%
      const escrowFeeUSD = subtotalUSD * escrowFeeRate;

      // Calculate logistics fee (already in USD)
      const logisticsFeeUSD = (() => {
        const logisticsProvider = orderDetails.logisticsProviderWalletAddress?.[0];
        if (!logisticsProvider) return 0;

        const logisticsIndex = orderDetails.product.logisticsProviders?.findIndex(
          (provider: string) => provider.toLowerCase() === logisticsProvider.toLowerCase()
        );

        return logisticsIndex >= 0
          ? parseFloat(orderDetails.product.logisticsCost?.[logisticsIndex] || "0")
          : 0;
      })();

      const totalUSD = subtotalUSD + escrowFeeUSD + logisticsFeeUSD;

      // Convert to selected token
      const totalInToken = convertPrice(totalUSD, "USD", wallet.selectedToken.symbol);

      const hasQuantityChanged = quantity !== orderDetails.quantity;
      const currentLogistics = orderDetails.logisticsProviderWalletAddress?.[0];
      const selectedLogistics = selectedLogisticsProvider?.walletAddress;
      const hasLogisticsChanged =
        selectedLogistics && selectedLogistics !== currentLogistics;

      const userBalance = (() => {
        const balanceStr = String(
          wallet.tokenBalances[wallet.selectedToken.symbol]?.raw || 0
        ).replace(/[,\s]/g, "");
        const parsed = Number(balanceStr);
        return Number.isFinite(parsed) ? parsed : 0;
      })();

      console.log("💰 Pending Payment Calculations:", {
        productPriceUSD,
        quantity,
        subtotalUSD,
        escrowFeeUSD,
        logisticsFeeUSD,
        totalUSD,
        totalInToken,
        userBalance,
        selectedToken: wallet.selectedToken.symbol,
      });

      return {
        totalAmountUSD: totalUSD,
        totalAmountInToken: totalInToken,
        hasChanges: hasQuantityChanged || Boolean(hasLogisticsChanged),
        userBalance,
        hasSufficientBalance: userBalance >= totalInToken,
      };
    } catch (error) {
      console.error("Calculation error:", error);
      return {
        totalAmountUSD: 0,
        totalAmountInToken: 0,
        hasChanges: false,
        userBalance: 0,
        hasSufficientBalance: false,
      };
    }
  }, [
    orderValidation.isValid,
    orderDetails?.product?.price,
    orderDetails?.quantity,
    orderDetails?.logisticsProviderWalletAddress,
    orderDetails?.product?.logisticsProviders,
    orderDetails?.product?.logisticsCost,
    quantity,
    selectedLogisticsProvider?.walletAddress,
    wallet.tokenBalances,
    wallet.selectedToken.symbol,
    convertPrice,
  ]);

  const escrowAddress = useMemo(() => {
    try {
      return ESCROW_ADDRESSES[44787] || null;
    } catch {
      return null;
    }
  }, []);

  const payButtonText = useMemo(() => {
    if (loading) return "Processing...";

    if (tradeValidation.isLoading) return "Checking availability...";
    if (!tradeValidation.isValid) return "Product unavailable";

    if (!wallet.isConnected) return "Connect Wallet to Pay";

    if (!calculations.hasSufficientBalance) return "Insufficient Balance";
    return `Pay ${formatPrice(
      calculations.totalAmountInToken,
      wallet.selectedToken.symbol
    )}`;
  }, [
    loading,
    tradeValidation.isLoading,
    tradeValidation.isValid,
    wallet.isConnected,
    calculations.totalAmountInToken,
    calculations.hasSufficientBalance,
    wallet.selectedToken.symbol,
    formatPrice,
  ]);

  useEffect(() => {
    if (
      orderDetails?.quantity &&
      quantity === 1 &&
      orderDetails.quantity !== 1
    ) {
      setQuantity(orderDetails.quantity);
    }
  }, [orderDetails?.quantity]);

  useEffect(() => {
    if (!showTimer) return;

    const timer = setInterval(() => {
      if (!mountedRef.current) return;

      setTimeRemaining((prev) => {
        if (prev.seconds > 0) {
          return { ...prev, seconds: prev.seconds - 1 };
        }
        if (prev.minutes > 0) {
          return { minutes: prev.minutes - 1, seconds: 59 };
        }
        return { minutes: 0, seconds: 0 };
      });
    }, 1000);

    timerRef.current = timer;
    return () => clearInterval(timer);
  }, [showTimer]);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      if (timerRef.current) clearInterval(timerRef.current);
      if (abortControllerRef.current) abortControllerRef.current.abort();
      if (balanceRefetchTimeoutRef.current)
        clearTimeout(balanceRefetchTimeoutRef.current);
    };
  }, []);

  const debouncedRefetchBalance = useCallback(() => {
    if (balanceRefetchTimeoutRef.current) {
      clearTimeout(balanceRefetchTimeoutRef.current);
    }
    balanceRefetchTimeoutRef.current = setTimeout(async () => {
      if (mountedRef.current && !isLoadingBalance) {
        setIsLoadingBalance(true);
        try {
          await refreshTokenBalance(wallet.selectedToken.symbol);
        } finally {
          if (mountedRef.current) {
            setIsLoadingBalance(false);
          }
        }
      }
    }, 1000);
  }, [refreshTokenBalance, isLoadingBalance]);

  const handlePayNow = useCallback(async () => {
    if (!orderValidation.isValid || loading) return;

    setLoading(true);
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      if (!wallet.isConnected) {
        // await connectWallet();
        setShowWalletModal(true);
        await new Promise((resolve) => setTimeout(resolve, 500));
        debouncedRefetchBalance();
      }

      if (controller.signal.aborted) return;

      if (!calculations.hasSufficientBalance) {
        showSnackbar(
          `Insufficient ${wallet.selectedToken.symbol} balance. Required: ${formatPrice(
            calculations.totalAmountInToken,
            wallet.selectedToken.symbol
          )} (≈$${calculations.totalAmountUSD.toFixed(2)} USD)`,
          "error"
        );
        return;
      }

      setIsPaymentModalOpen(true);
    } catch (error) {
      if (!controller.signal.aborted && mountedRef.current) {
        console.error("Payment initialization failed:", error);
        showSnackbar(
          error instanceof Error
            ? error.message
            : "Failed to initialize payment",
          "error"
        );
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [
    orderValidation.isValid,
    loading,
    wallet.isConnected,
    calculations.hasSufficientBalance,
    calculations.requiredAmount,
    connectWallet,
    debouncedRefetchBalance,
    showSnackbar,
  ]);

  const handlePaymentSuccess = useCallback(
    async (transaction: PaymentTransaction) => {
      setIsPaymentModalOpen(false);
      console.log("orderDetails before", orderDetails);
      // if (!mountedRef.current) return;

      console.log("orderDetails after", orderDetails);
      try {
        const currentOrderId = getStoredOrderId();

        console.log("orderDetails inside", orderDetails);
        console.log("rest", transaction);
        if (orderDetails?._id) {
          console.log("orderDetails inside if", orderDetails);
          await updateOrderStatus({
            orderId: orderDetails._id,
            details: {
              status: "accepted",
              purchaseId: transaction.purchaseId,
            },
          }).unwrap();
        }
        // else if (orderDetails?._id) {
        //   await changeOrderStatus(orderDetails._id, "accepted", true);
        // }
        showSnackbar("Payment completed successfully!", "success");
        clearStoredOrderId();

        if (navigatePath) {
          navigate(navigatePath, { replace: true });
        }
        // else if (onReleaseNow) {
        //   onReleaseNow();
        // }
      } catch (error) {
        console.error("Post-payment processing error:", error);
        if (navigatePath) {
          navigate(navigatePath, { replace: true });
        }
        // else if (onReleaseNow) {
        //   onReleaseNow();
        // }
      }
    },
    [navigate, navigatePath, showSnackbar]
  );

  const handleUpdateOrder = useCallback(async () => {
    if (!orderId || !onUpdateOrder || loading || !calculations.hasChanges) {
      if (!calculations.hasChanges) {
        showSnackbar("No changes to save", "info");
      }
      return;
    }

    setLoading(true);
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const updates: UpdateOrderPayload = {
        quantity,
        ...(selectedLogisticsProvider?.walletAddress && {
          logisticsProviderWalletAddress:
            selectedLogisticsProvider.walletAddress,
        }),
      };

      if (controller.signal.aborted) return;

      await onUpdateOrder(orderId, updates);

      if (mountedRef.current) {
        toast.success("Order updated successfully!");
        setIsEditModalOpen(false);
      }
    } catch (error: any) {
      if (!controller.signal.aborted && mountedRef.current) {
        console.error("Order update failed:", error);
        toast.error(
          error?.message || "Failed to update order. Please try again."
        );
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [
    orderId,
    onUpdateOrder,
    loading,
    calculations.hasChanges,
    quantity,
    selectedLogisticsProvider,
    showSnackbar,
  ]);

  const handleEditModalClose = useCallback(() => {
    if (!loading) {
      setIsEditModalOpen(false);
    }
  }, [loading]);

  const handlePaymentModalClose = useCallback(() => {
    if (!loading) {
      setIsPaymentModalOpen(false);
    }
  }, [loading]);

  const handleEditModalOpen = useCallback(() => {
    if (!loading) {
      setIsEditModalOpen(true);
      console.log(
        calculations,
        wallet.tokenBalances[wallet.selectedToken.symbol]
      );
    }
  }, [loading]);

  const handleQuantityChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = Math.max(
        1,
        Math.min(999, parseInt(e.target.value, 10) || 1)
      );
      setQuantity(value);
    },
    []
  );

  const handleLogisticsSelect = useCallback((provider: any) => {
    setSelectedLogisticsProvider(provider);
  }, []);

  const Payment = useMemo(
    () =>
      orderDetails && escrowAddress ? (
        <PaymentModal
          isOpen={isPaymentModalOpen}
          onClose={handlePaymentModalClose}
          orderDetails={orderDetails}
          onPaymentSuccess={handlePaymentSuccess}
        />
      ) : null,
    [
      isPaymentModalOpen,
      orderDetails?._id,
      escrowAddress,
      handlePaymentModalClose,
      handlePaymentSuccess,
    ]
  );

  const editButton = useMemo(
    () => (
      <Button
        title={
          <div className="flex items-center gap-2">
            <FiEdit2 className="w-4 h-4" />
            Edit Order
          </div>
        }
        className="bg-transparent hover:bg-gray-700 text-white text-sm px-6 py-3 border border-gray-600 rounded transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        onClick={handleEditModalOpen}
        disabled={loading}
      />
    ),
    [handleEditModalOpen, loading]
  );

  const payButton = useMemo(
    () => (
      <Button
        title={payButtonText}
        className={`text-white text-sm px-6 py-3 rounded transition-colors duration-200 disabled:cursor-not-allowed ${
          calculations.hasSufficientBalance &&
          !loading &&
          tradeValidation.isValid &&
          orderValidation.isValid
            ? "bg-Red hover:bg-[#e02d37]"
            : "bg-gray-600 opacity-75"
        }`}
        onClick={handlePayNow}
        disabled={
          !calculations.hasSufficientBalance ||
          loading ||
          !orderValidation.isValid ||
          !tradeValidation.isValid ||
          tradeValidation.isLoading
        }
      />
    ),
    [
      payButtonText,
      calculations.hasSufficientBalance,
      loading,
      orderValidation.isValid,
      tradeValidation.isValid,
      tradeValidation.isLoading,
      handlePayNow,
    ]
  );

  const statusAlert = useMemo(
    () => (
      <StatusAlert
        icon={<BsShieldExclamation size={20} className="text-yellow-600" />}
        message="Please verify all order details before proceeding with payment."
        type="warning"
      />
    ),
    []
  );

  // Early return for invalid states
  if (!orderValidation.isValid) {
    return (
      <div className="text-center py-8">
        <p className="text-red-400">{orderValidation.error}</p>
      </div>
    );
  }

  return (
    <>
      <BaseStatus
        statusTitle="Order Summary"
        statusDescription="Review your order details before payment. You can modify quantity and logistics provider if needed."
        statusAlert={statusAlert}
        orderDetails={orderDetails}
        tradeDetails={tradeDetails}
        transactionInfo={transactionInfo}
        showTimer={showTimer}
        timeRemaining={timeRemaining}
        actionButtons={
          <div className="w-full flex items-center justify-center flex-wrap gap-4">
            {editButton}
            {payButton}
          </div>
        }
      />

      <Modal
        isOpen={isEditModalOpen}
        onClose={handleEditModalClose}
        title="Update Order Details"
        maxWidth="md:max-w-lg"
      >
        <div className="space-y-4 mt-4">
          <div>
            <label htmlFor="quantity" className="block text-gray-300 mb-2">
              Quantity
            </label>
            <input
              type="number"
              id="quantity"
              min={1}
              max={999}
              value={quantity}
              onChange={handleQuantityChange}
              disabled={loading}
              className="w-full px-3 py-2 bg-neutral-800 text-white border border-neutral-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors duration-200 disabled:opacity-50"
            />
          </div>

          {orderDetails?.product && (
            <LogisticsSelector
              logisticsCost={orderDetails.product.logisticsCost ?? []}
              logisticsProviders={orderDetails.product.logisticsProviders ?? []}
              onSelect={handleLogisticsSelect}
              selectedProviderWalletAddress={
                orderDetails.logisticsProviderWalletAddress[0]
              }
            />
          )}

          <div className="flex justify-end gap-3 mt-6">
            <Button
              title="Cancel"
              className="bg-transparent hover:bg-gray-700 text-white text-sm px-4 py-2 border border-gray-600 rounded transition-colors duration-200"
              onClick={handleEditModalClose}
              disabled={loading}
            />
            <Button
              title={loading ? "Updating..." : "Save Changes"}
              className="bg-Red hover:bg-[#e02d37] text-white text-sm px-4 py-2 rounded transition-colors duration-200 disabled:opacity-50"
              onClick={handleUpdateOrder}
              disabled={loading || !calculations.hasChanges}
            />
          </div>
        </div>
      </Modal>

      {Payment}
      <WalletConnectionModal
        isOpen={showWalletModal}
        onClose={() => setShowWalletModal(false)}
      />
    </>
  );
};

export default PendingPaymentStatus;
