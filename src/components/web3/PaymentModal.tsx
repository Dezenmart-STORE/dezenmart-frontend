import React, { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  HiCreditCard,
  HiShieldCheck,
  HiExclamationTriangle,
  HiCheckCircle,
  HiXCircle,
  HiCurrencyDollar,
  HiChevronDown,
  HiStar,
} from "react-icons/hi2";
import Modal from "../common/Modal";
import Button from "../common/Button";
import { useWeb3 } from "../../context/Web3Context";
import { PaymentTransaction } from "../../utils/types/web3.types";
import { formatCurrency } from "../../utils/web3.utils";
import { useSnackbar } from "../../context/SnackbarContext";
import { Order } from "../../utils/types";
import { parseWeb3Error } from "../../utils/errorParser";
import {
  startPaymentSession,
  endPaymentSession,
  logPaymentStep,
  analyzePaymentError,
} from "../../utils/debug/index";
import { StableToken } from "../../utils/config/web3.config";
import {
  scanWalletForStableTokens,
  checkSufficientBalance,
  getBestTokenForPurchase,
  TokenBalanceInfo,
} from "../../utils/tokenBalanceChecker";
import { useCurrencyConverter } from "../../utils/hooks/useCurrencyConverter";
import WalletConnectionModal from "./WalletConnectionModal";

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderDetails: Order;
  onPaymentSuccess: (transaction: PaymentTransaction) => void;
}

type PaymentStep = "review" | "processing" | "success" | "error";

const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  orderDetails,
  onPaymentSuccess,
}) => {
  const { showSnackbar } = useSnackbar();
  const { convertPrice, formatPrice } = useCurrencyConverter();
  const {
    wallet,
    buyTrade,
    approveToken,
    getTokenAllowance,
    isCorrectNetwork,
    switchToCorrectNetwork,
    // connectWallet,
    validateTradeBeforePurchase,
    getTradeTokenInfo,
    setSelectedToken,
    refreshTokenBalance,
    availableTokens,
  } = useWeb3();
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [step, setStep] = useState<PaymentStep>("review");
  const [needsApproval, setNeedsApproval] = useState(false);
  const [approvalHash, setApprovalHash] = useState<string>("");
  const [transaction, setTransaction] = useState<PaymentTransaction | null>(
    null
  );
  const [error, setError] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);
  const [isTokenSelectorOpen, setIsTokenSelectorOpen] = useState(false);
  const [refreshingToken, setRefreshingToken] = useState<string | null>(null);
  const [walletTokens, setWalletTokens] = useState<TokenBalanceInfo[]>([]);
  const [isScanningWallet, setIsScanningWallet] = useState(false);
  const [needsConversion, setNeedsConversion] = useState(false);
  const [conversionInfo, setConversionInfo] = useState<{
    fromToken: string;
    toToken: string;
    amount: number;
    estimatedUSDT: string;
  } | null>(null);
  const [contractTokenSymbol, setContractTokenSymbol] = useState<string | null>(
    null
  );
  const [isLoadingContractToken, setIsLoadingContractToken] = useState(false);
  const [useUnlimitedApproval, setUseUnlimitedApproval] = useState(() => {
    // Check localStorage for user preference, default to true (recommended)
    const saved = localStorage.getItem("useUnlimitedApproval");
    return saved !== null ? saved === "true" : true;
  });
  const [currentAllowance, setCurrentAllowance] = useState<number>(0);

  // Get REQUIRED payment token from the smart contract (not database)
  const requiredPaymentToken = useMemo(() => {
    // Use contract token if available, fallback to product token, then USDT
    const tokenSymbol =
      contractTokenSymbol || orderDetails?.product?.paymentToken || "USDT";
    return (
      availableTokens.find((t) => t.symbol === tokenSymbol) ||
      availableTokens[0]
    );
  }, [
    contractTokenSymbol,
    orderDetails?.product?.paymentToken,
    availableTokens,
  ]);

  // Get selected token and its balance - MUST match product's payment token
  const selectedToken = requiredPaymentToken;
  const selectedTokenBalance = wallet.tokenBalances[selectedToken.symbol];

  // Calculate logistics fee (in USD)
  const logisticsFee = useMemo(() => {
    const logisticsProvider = orderDetails?.logisticsProviderWalletAddress?.[0];
    if (!logisticsProvider) return 0;

    const logisticsIndex = orderDetails?.product.logisticsProviders.findIndex(
      (provider: string) =>
        provider.toLowerCase() === logisticsProvider.toLowerCase()
    );

    return logisticsIndex >= 0
      ? parseFloat(orderDetails?.product.logisticsCost[logisticsIndex] || "0")
      : 0;
  }, [orderDetails]);

  // Calculate logistics cost in token units (for contract)
  const logisticsCostInToken = useMemo(() => {
    if (logisticsFee === 0) return "0";

    // Convert logistics fee from USD to selected token
    const isStablecoin =
      selectedToken.symbol === "USDT" ||
      selectedToken.symbol === "cUSD" ||
      selectedToken.symbol === "USDC";
    const logisticsInToken = isStablecoin
      ? logisticsFee
      : convertPrice(logisticsFee, "USD", selectedToken.symbol);

    // Convert to wei (multiply by 10^decimals)
    const decimals = selectedToken.decimals;
    const logisticsInWei = Math.floor(logisticsInToken * Math.pow(10, decimals));

    return logisticsInWei.toString();
  }, [logisticsFee, selectedToken.symbol, selectedToken.decimals, convertPrice]);

  // Calculate TOTAL order amount in USD, then convert to selected token
  // NOTE: Product prices from backend are in USD
  const { orderAmountUSD, orderAmountInToken, subtotal, escrowFee } =
    useMemo(() => {
      if (!orderDetails?.product?.price) {
        return {
          orderAmountUSD: 0,
          orderAmountInToken: 0,
          subtotal: 0,
          escrowFee: 0,
        };
      }

      const productPriceUSD = orderDetails.product.price; // Price is in USD
      const quantity = orderDetails.quantity || 1;
      const subtotalUSD = productPriceUSD * quantity;
      const escrowFeeUSD = subtotalUSD * 0.025; // 2.5%
      const totalUSD = subtotalUSD + escrowFeeUSD + logisticsFee;

      // Convert from USD to selected token
      // For stablecoins, use 1:1 ratio since they're pegged to USD
      const isStablecoin =
        selectedToken.symbol === "USDT" ||
        selectedToken.symbol === "cUSD" ||
        selectedToken.symbol === "USDC";
      const totalInToken = isStablecoin
        ? totalUSD
        : convertPrice(totalUSD, "USD", selectedToken.symbol);

      console.log("💰 Payment Modal Calculations:", {
        productPriceUSD,
        quantity,
        subtotalUSD,
        escrowFeeUSD,
        logisticsFee,
        logisticsCostInToken,
        totalUSD,
        selectedToken: selectedToken.symbol,
        totalInToken,
      });

      return {
        orderAmountUSD: totalUSD,
        orderAmountInToken: totalInToken,
        subtotal: subtotalUSD,
        escrowFee: escrowFeeUSD,
      };
    }, [orderDetails, logisticsFee, logisticsCostInToken, selectedToken.symbol, convertPrice]);

  // Use the token amount for balance checks
  const orderAmount = orderAmountInToken;

  const balanceNumber = useMemo(() => {
    if (!selectedTokenBalance?.raw) return 0;
    return parseFloat(selectedTokenBalance.raw);
  }, [selectedTokenBalance?.raw]);

  const gasBalance = useMemo(
    () => parseFloat(wallet.balance || "0"),
    [wallet.balance]
  );

  const hasInsufficientBalance = useMemo(
    () => balanceNumber < orderAmount,
    [balanceNumber, orderAmount]
  );

  const hasInsufficientGas = useMemo(() => gasBalance < 0.01, [gasBalance]);

  // Scan wallet for available stable tokens
  // const scanWallet = useCallback(async () => {
  //   if (!wallet.isConnected || !wallet.address) return;

  //   setIsScanningWallet(true);
  //   try {
  //     const walletScan = await scanWalletForStableTokens(wallet.address, wallet.chainId || 42220);
  //     setWalletTokens(walletScan.availableTokens);

  //     // Check if user needs to convert tokens
  //     const balanceCheck = checkSufficientBalance(walletScan.availableTokens, orderAmount, "USDT");

  //     if (!balanceCheck.hasSufficientBalance && balanceCheck.needsConversion && balanceCheck.conversionRequired) {
  //       setNeedsConversion(true);
  //       setConversionInfo({
  //         fromToken: balanceCheck.conversionRequired.fromToken,
  //         toToken: balanceCheck.conversionRequired.toToken,
  //         amount: balanceCheck.conversionRequired.amount,
  //         estimatedUSDT: balanceCheck.conversionRequired.amount.toString(), // Simplified
  //       });
  //     } else {
  //       setNeedsConversion(false);
  //       setConversionInfo(null);
  //     }
  //   } catch (error) {
  //     console.error("Failed to scan wallet:", error);
  //     showSnackbar("Failed to scan wallet for tokens", "error");
  //   } finally {
  //     setIsScanningWallet(false);
  //   }
  // }, [wallet.isConnected, wallet.address, wallet.chainId, orderAmount, showSnackbar]);

  // Fetch the actual token from the smart contract
  const loadContractToken = useCallback(async () => {
    if (!orderDetails?.product?.tradeId) return;

    setIsLoadingContractToken(true);
    try {
      const tokenInfo = await getTradeTokenInfo(orderDetails.product.tradeId);
      if (tokenInfo) {
        console.log("📋 Contract token info:", tokenInfo);
        setContractTokenSymbol(tokenInfo.tokenSymbol);
      } else {
        console.warn("⚠️ Failed to get contract token, using fallback");
        // Fallback to product token from database
        setContractTokenSymbol(orderDetails.product.paymentToken || "USDT");
      }
    } catch (error) {
      console.error("Failed to load contract token:", error);
      // Fallback to product token from database
      setContractTokenSymbol(orderDetails.product.paymentToken || "USDT");
    } finally {
      setIsLoadingContractToken(false);
    }
  }, [
    orderDetails?.product?.tradeId,
    orderDetails?.product?.paymentToken,
    getTradeTokenInfo,
  ]);

  // Fetch balance for selected token
  const loadBalance = useCallback(async () => {
    if (!wallet.isConnected) return;
    setIsLoadingBalance(true);
    setRefreshingToken(selectedToken.symbol);
    try {
      await refreshTokenBalance(selectedToken.symbol);
    } catch (error) {
      console.error("Failed to load balance:", error);
      showSnackbar("Failed to load balance", "error");
    } finally {
      setIsLoadingBalance(false);
      setRefreshingToken(null);
    }
  }, [
    wallet.isConnected,
    selectedToken.symbol,
    refreshTokenBalance,
    showSnackbar,
  ]);

  // Check approval requirements for selected token
  const checkApprovalNeeds = useCallback(async () => {
    if (!wallet.isConnected || !isCorrectNetwork) return;
    try {
      const allowance = await getTokenAllowance(selectedToken.symbol);
      setCurrentAllowance(allowance);
      setNeedsApproval(allowance < orderAmount);
    } catch (error) {
      console.error("Failed to check allowance:", error);
      setCurrentAllowance(0);
      setNeedsApproval(true);
    }
  }, [
    wallet.isConnected,
    isCorrectNetwork,
    getTokenAllowance,
    selectedToken.symbol,
    orderAmount,
  ]);

  // Load contract token when modal opens (before everything else)
  useEffect(() => {
    if (isOpen) {
      loadContractToken();
    }
  }, [isOpen, loadContractToken]);

  // Initialize modal state and set correct payment token
  useEffect(() => {
    if (isOpen && wallet.isConnected && !isLoadingContractToken) {
      // Ensure the wallet is using the correct payment token
      if (
        requiredPaymentToken &&
        wallet.selectedToken.symbol !== requiredPaymentToken.symbol
      ) {
        setSelectedToken(requiredPaymentToken);
      }
      loadBalance();
      checkApprovalNeeds();
      // scanWallet();
    }
  }, [
    isOpen,
    wallet.isConnected,
    isLoadingContractToken,
    requiredPaymentToken,
    wallet.selectedToken.symbol,
    setSelectedToken,
    loadBalance,
    checkApprovalNeeds,
    // scanWallet
  ]);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep("review");
      setError("");
      setTransaction(null);
      setApprovalHash("");
      setRetryCount(0);
      setIsProcessing(false);
      setNeedsConversion(false);
      setConversionInfo(null);
      setWalletTokens([]);
    }
  }, [isOpen]);

  // Handle token selection
  const handleTokenSelect = useCallback(
    async (token: StableToken) => {
      setSelectedToken(token);
      setIsTokenSelectorOpen(false);
      setRefreshingToken(token.symbol);
      try {
        await refreshTokenBalance(token.symbol);
        showSnackbar(`Switched to ${token.symbol}`, "success");
        checkApprovalNeeds();
      } finally {
        setRefreshingToken(null);
      }
    },
    [setSelectedToken, refreshTokenBalance, showSnackbar, checkApprovalNeeds]
  );

  const handlePayment = useCallback(async () => {
    console.log("🔵 [PaymentModal] handlePayment started");
    console.log("🔵 [PaymentModal] Wallet state:", {
      isConnected: wallet.isConnected,
      address: wallet.address,
      selectedToken: selectedToken.symbol,
      balance: selectedTokenBalance?.raw,
    });

    // Start debug session
    startPaymentSession(wallet.address, wallet.chainId);
    logPaymentStep("Payment initiated", "pending", {
      product: orderDetails.product.name,
      quantity: orderDetails.quantity,
      amount: orderAmount,
      token: selectedToken.symbol,
    });

    if (!wallet.isConnected) {
      console.log("⚠️ [PaymentModal] Wallet not connected");
      logPaymentStep(
        "Wallet connection check",
        "error",
        null,
        "Wallet not connected"
      );
      try {
        setShowWalletModal(true);
        return;
      } catch (error) {
        showSnackbar("Failed to connect wallet", "error");
        endPaymentSession(false);
        return;
      }
    }

    logPaymentStep("Wallet connected", "success", { address: wallet.address });

    if (!isCorrectNetwork) {
      console.log("⚠️ [PaymentModal] Wrong network");
      try {
        setIsProcessing(true);
        await switchToCorrectNetwork();
        await new Promise((resolve) => setTimeout(resolve, 3000));
        setIsProcessing(false);
      } catch (error) {
        console.error("❌ [PaymentModal] Network switch failed:", error);
        setError(
          "Failed to switch network. Please switch manually in your wallet."
        );
        setStep("error");
        setIsProcessing(false);
        return;
      }
    }

    if (hasInsufficientBalance) {
      console.log("⚠️ [PaymentModal] Insufficient balance");
      setError(
        `Insufficient ${
          selectedToken.symbol
        } balance. Required: ${formatCurrency(orderAmount)} ${
          selectedToken.symbol
        }`
      );
      setStep("error");
      return;
    }

    if (hasInsufficientGas) {
      console.log("⚠️ [PaymentModal] Insufficient gas");
      setError(
        "Insufficient CELO for transaction fees. Please add some CELO to your wallet."
      );
      setStep("error");
      return;
    }

    try {
      console.log("✅ [PaymentModal] Starting payment process");
      setIsProcessing(true);
      setStep("processing");
      setError("");

      console.log("🔍 [PaymentModal] Validating trade...");
      logPaymentStep("Validating trade", "pending");

      if (!validateTradeBeforePurchase) {
        console.error(
          "❌ [PaymentModal] validateTradeBeforePurchase is not available"
        );
        logPaymentStep(
          "Trade validation",
          "error",
          { error: "Function not available" },
          "Validation function missing"
        );
        throw new Error(
          "Unable to validate trade. Please check your wallet connection and try again."
        );
      }

      // Check if logistics provider is required and selected
      const logisticsProvider = "0xCeaD78F9Cf39Aba45Ea39E297bC0771cF28f3bb4";
      // orderDetails.logisticsProviderWalletAddress?.[0];
      if (!logisticsProvider || logisticsProvider === undefined) {
        console.error("❌ [PaymentModal] No logistics provider selected");
        logPaymentStep(
          "Logistics validation",
          "error",
          {
            logisticsProviderWalletAddress:
              orderDetails.logisticsProviderWalletAddress,
            productLogisticsProviders: orderDetails.product.logisticsProviders,
          },
          "No logistics provider selected"
        );
        throw new Error(
          "Please select a logistics provider before completing payment. Go back to product page and select a delivery option."
        );
      }

      const isValidTrade = await validateTradeBeforePurchase(
        orderDetails.product.tradeId,
        orderDetails.quantity.toString(),
        logisticsProvider
      );

      console.log("🔍 [PaymentModal] Trade validation result:", isValidTrade);

      if (!isValidTrade) {
        console.error("❌ [PaymentModal] Trade validation failed");
        logPaymentStep(
          "Trade validation",
          "error",
          {
            tradeId: orderDetails.product.tradeId,
            quantity: orderDetails.quantity,
            validationResult: isValidTrade,
          },
          "Trade not valid or insufficient quantity"
        );
        throw new Error(
          "This product is no longer available. Please refresh and try another item."
        );
      }

      logPaymentStep("Trade validation", "success", {
        tradeId: orderDetails.product.tradeId,
      });

      // Use the logistics fee calculated in useMemo
      const productPrice = orderDetails.product.price;
      const quantity = orderDetails.quantity;

      if (needsApproval) {
        console.log("📝 [PaymentModal] Approval required");
        const approvalType = useUnlimitedApproval
          ? "unlimited"
          : "exact amount";
        showSnackbar(
          `Requesting ${selectedToken.symbol} spending approval (${approvalType})...`,
          "info"
        );
        try {
          console.log("💰 [PaymentModal] Approving token:", {
            token: selectedToken.symbol,
            amount: orderAmount,
            amountString: orderAmount.toString(),
            unlimited: useUnlimitedApproval,
          });
          // Approve the TOTAL amount (product + escrow fee + logistics fee)
          const approvalTx = await approveToken(
            selectedToken.symbol,
            orderAmount.toString(),
            useUnlimitedApproval
          );
          console.log(
            "✅ [PaymentModal] Approval transaction hash:",
            approvalTx
          );

          if (approvalTx !== "0x0") {
            setApprovalHash(approvalTx);
            showSnackbar(
              `${selectedToken.symbol} approval submitted. Waiting for confirmation...`,
              "info"
            );
            let confirmed = false;
            let attempts = 0;
            const maxAttempts = 20;
            console.log(
              "⏳ [PaymentModal] Waiting for approval confirmation..."
            );
            while (!confirmed && attempts < maxAttempts) {
              await new Promise((resolve) => setTimeout(resolve, 2000));
              try {
                const newAllowance = await getTokenAllowance(
                  selectedToken.symbol
                );
                console.log(
                  `🔍 [PaymentModal] Allowance check attempt ${attempts + 1}:`,
                  newAllowance,
                  "required:",
                  orderAmount
                );
                if (newAllowance >= orderAmount) {
                  confirmed = true;
                  console.log("✅ [PaymentModal] Approval confirmed!");
                  break;
                }
              } catch (checkError) {
                console.warn(
                  "❌ [PaymentModal] Allowance check failed:",
                  checkError
                );
              }
              attempts++;
            }
            if (!confirmed) {
              console.error("❌ [PaymentModal] Approval confirmation timeout");
              throw new Error(
                "Approval confirmation timeout. Please try again."
              );
            }
          } else {
            console.log("ℹ️ [PaymentModal] Already approved (0x0)");
          }
          showSnackbar(`${selectedToken.symbol} spending approved!`, "success");
        } catch (approvalError) {
          console.error("❌ [PaymentModal] Approval failed:", approvalError);
          throw new Error(`Approval failed: ${parseWeb3Error(approvalError)}`);
        }
      } else {
        console.log("✅ [PaymentModal] No approval needed");
      }

      await new Promise((resolve) => setTimeout(resolve, 1000));
      let retryAttempts = 0;
      const maxRetries = 3;
      console.log("🚀 [PaymentModal] Starting buyTrade execution...");
      while (retryAttempts < maxRetries) {
        try {
          showSnackbar("Processing purchase transaction...", "info");
          console.log(
            "💰 [PaymentModal] Executing buyTrade (attempt " +
              (retryAttempts + 1) +
              "):",
            {
              tradeId: orderDetails.product.tradeId,
              quantity: orderDetails.quantity.toString(),
              logisticsProvider: orderDetails.logisticsProviderWalletAddress[0],
              productCost: productPrice,
              logisticsCostUSD: logisticsFee,
              logisticsCostInToken: logisticsCostInToken,
              totalAmount: orderAmount,
              totalTokenAmount: orderAmountInToken,
              paymentToken: selectedToken.symbol,
              contractTokenSymbol: contractTokenSymbol,
            }
          );

          console.log("⏳ [PaymentModal] Calling buyTrade function...");
          const paymentTransaction = await buyTrade({
            tradeId: orderDetails.product.tradeId,
            quantity: orderDetails.quantity.toString(),
            logisticsProvider: orderDetails.logisticsProviderWalletAddress[0],
            logisticsCost: logisticsCostInToken, // REQUIRED: Logistics cost in token units (wei)
            productCost: productPrice, // Optional: for display/logging
            logisticsCostUSD: logisticsFee, // Optional: for display/logging
            paymentToken: selectedToken.symbol,
            totalTokenAmount: orderAmountInToken, // Pass the correctly calculated token amount
          });

          console.log(
            "✅ [PaymentModal] buyTrade completed successfully!",
            paymentTransaction
          );
          logPaymentStep("Purchase completed", "success", {
            hash: paymentTransaction.hash,
            purchaseId: paymentTransaction.purchaseId,
          });
          endPaymentSession(true);

          setTransaction(paymentTransaction);
          setStep("success");
          onPaymentSuccess(paymentTransaction);
          showSnackbar("Purchase completed successfully!", "success");
          setTimeout(() => loadBalance(), 3000);
          break;
        } catch (txError: any) {
          retryAttempts++;
          console.error(
            `❌ [PaymentModal] buyTrade attempt ${retryAttempts} failed:`,
            txError
          );
          console.error("❌ [PaymentModal] Error details:", {
            message: txError.message,
            code: txError.code,
            reason: txError.reason,
            stack: txError.stack,
          });

          const errorMsg = txError.message || "Transaction failed";
          if (retryAttempts >= maxRetries) {
            console.error(
              "❌ [PaymentModal] Max retries reached, throwing error"
            );
            throw txError;
          }
          if (
            errorMsg.includes("Network error") ||
            errorMsg.includes("JSON-RPC")
          ) {
            console.log(`🔄 [PaymentModal] Retrying due to network error...`);
            showSnackbar(
              `Retry attempt ${retryAttempts}/${maxRetries}...`,
              "info"
            );
            await new Promise((resolve) =>
              setTimeout(resolve, 2000 * retryAttempts)
            );
            continue;
          } else {
            console.error("❌ [PaymentModal] Non-retryable error, throwing");
            throw txError;
          }
        }
      }
    } catch (error: unknown) {
      console.error("❌ [PaymentModal] Payment failed - FINAL ERROR:", error);
      console.error("❌ [PaymentModal] Error type:", typeof error);
      console.error(
        "❌ [PaymentModal] Error stringified:",
        JSON.stringify(error, Object.getOwnPropertyNames(error))
      );

      const errorMessage = parseWeb3Error(error);
      console.error("❌ [PaymentModal] Parsed error message:", errorMessage);

      // Analyze error and log to debugger
      const errorAnalysis = analyzePaymentError(error);
      logPaymentStep("Payment failed", "error", errorAnalysis, errorMessage);
      endPaymentSession(false);
      let errorDetail = errorMessage;
      if (
        errorMessage.includes("TradeNotFound") ||
        errorMessage.includes("no longer available")
      ) {
        errorDetail =
          "This product is no longer available. Please try a different item.";
      } else if (errorMessage.includes("InsufficientQuantity")) {
        errorDetail =
          "Not enough stock available. Please reduce quantity or try later.";
      }
      setError(errorDetail);
      setStep("error");
      showSnackbar(errorDetail, "error");
    } finally {
      setIsProcessing(false);
    }
  }, [
    wallet.isConnected,
    wallet.address,
    wallet.chainId,
    isCorrectNetwork,
    hasInsufficientBalance,
    hasInsufficientGas,
    needsApproval,
    orderDetails,
    orderAmount,
    orderAmountInToken,
    contractTokenSymbol,
    logisticsFee,
    logisticsCostInToken,
    useUnlimitedApproval,
    switchToCorrectNetwork,
    approveToken,
    buyTrade,
    getTokenAllowance,
    onPaymentSuccess,
    showSnackbar,
    loadBalance,
    selectedToken.symbol,
    validateTradeBeforePurchase,
  ]);

  const handleRetry = useCallback(() => {
    setRetryCount((prev) => prev + 1);
    setStep("review");
    setError("");
    setIsProcessing(false);
    setApprovalHash("");
    loadBalance();
    checkApprovalNeeds();
  }, [loadBalance, checkApprovalNeeds]);

  const handleModalClose = useCallback(() => {
    if (step === "processing" && isProcessing) {
      showSnackbar(
        "Transaction in progress. Please wait for completion before closing.",
        "info"
      );
      return;
    }
    onClose();
  }, [step, isProcessing, onClose, showSnackbar]);

  const displayBalance = useMemo(() => {
    if (isLoadingBalance || refreshingToken === selectedToken.symbol)
      return "Loading...";
    return selectedTokenBalance?.formatted || `0 ${selectedToken.symbol}`;
  }, [
    isLoadingBalance,
    refreshingToken,
    selectedToken.symbol,
    selectedTokenBalance,
  ]);

  const renderStepContent = () => {
    switch (step) {
      case "review":
        return (
          <div className="space-y-6">
            {/* Order Summary */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white">
                Order Summary
              </h3>
              <div className="bg-Dark/50 border border-Red/20 rounded-lg p-4 space-y-3">
                {/* Product */}
                <div className="flex justify-between text-sm">
                  <span className="text-gray-300">
                    {orderDetails.product?.name} × {orderDetails.quantity}
                  </span>
                  <div className="text-right">
                    <div className="text-white font-medium">
                      {formatPrice(
                        convertPrice(subtotal, "USD", selectedToken.symbol),
                        selectedToken.symbol
                      )}
                    </div>
                    <div className="text-xs text-gray-400">
                      ${subtotal.toFixed(2)} USD
                    </div>
                  </div>
                </div>

                {/* Escrow Fee */}
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Escrow Fee (2.5%)</span>
                  <div className="text-right">
                    <div className="text-gray-300">
                      {formatPrice(
                        convertPrice(escrowFee, "USD", selectedToken.symbol),
                        selectedToken.symbol
                      )}
                    </div>
                    <div className="text-xs text-gray-500">
                      ${escrowFee.toFixed(2)} USD
                    </div>
                  </div>
                </div>

                {/* Logistics Fee */}
                {logisticsFee > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Logistics Fee</span>
                    <div className="text-right">
                      <div className="text-gray-300">
                        {formatPrice(
                          convertPrice(
                            logisticsFee,
                            "USD",
                            selectedToken.symbol
                          ),
                          selectedToken.symbol
                        )}
                      </div>
                      <div className="text-xs text-gray-500">
                        ${logisticsFee.toFixed(2)} USD
                      </div>
                    </div>
                  </div>
                )}

                <div className="border-t border-Red/20 pt-3">
                  <div className="flex justify-between">
                    <span className="text-white font-bold">Total Amount</span>
                    <div className="text-right">
                      <div className="text-Red text-lg font-bold">
                        {formatPrice(orderAmountInToken, selectedToken.symbol)}
                      </div>
                      <div className="text-xs text-gray-400">
                        ≈ ${orderAmountUSD.toFixed(2)} USD
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Method & Balance */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-white">
                Payment Method
              </h3>
              <div className="bg-Dark/50 border border-Red/20 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-Red/20 rounded-full flex items-center justify-center">
                      <HiCurrencyDollar className="w-5 h-5 text-Red" />
                    </div>
                    <div>
                      {/* Token Display (Locked to product's payment token) */}
                      <div className="relative">
                        <div className="flex items-center gap-2 text-white font-medium">
                          <span className="flex items-center gap-2">
                            {typeof selectedToken.icon === "string" &&
                            selectedToken.icon ? (
                              <img
                                src={selectedToken.icon}
                                alt={selectedToken.symbol}
                                width={24}
                                height={24}
                              />
                            ) : (
                              "💰"
                            )}{" "}
                            {selectedToken.symbol}
                          </span>
                          <span className="text-xs text-gray-400">
                            (Required)
                          </span>
                        </div>
                      </div>
                      <p className="text-sm text-gray-400">
                        {!wallet.isConnected
                          ? "Connect wallet to continue"
                          : needsApproval
                          ? "Approval required"
                          : "Ready to pay"}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-white font-medium">{displayBalance}</p>
                    <p className="text-xs text-gray-400">Available</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Available Tokens Section */}
            {walletTokens.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-white">
                  Available Tokens in Wallet
                </h3>
                <div className="bg-Dark/50 border border-Red/20 rounded-lg p-4">
                  <div className="grid grid-cols-2 gap-3">
                    {walletTokens
                      .filter((token) => token.hasBalance)
                      .map((tokenInfo) => (
                        <div
                          key={tokenInfo.token.symbol}
                          className="flex items-center justify-between p-2 bg-Dark/30 rounded-md"
                        >
                          <div className="flex items-center gap-2">
                            {typeof tokenInfo.token.icon === "string" &&
                            tokenInfo.token.icon ? (
                              <img
                                src={tokenInfo.token.icon}
                                alt={tokenInfo.token.symbol}
                                width={20}
                                height={20}
                              />
                            ) : (
                              "💰"
                            )}
                            <span className="text-white font-medium">
                              {tokenInfo.token.symbol}
                            </span>
                          </div>
                          <span className="text-sm text-gray-300">
                            {tokenInfo.formattedBalance}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            )}

            {/* Conversion Notice */}
            {needsConversion && conversionInfo && (
              <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <HiExclamationTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-yellow-400 font-medium">
                      Token Conversion Required
                    </p>
                    <p className="text-sm text-yellow-400/80 mt-1">
                      You don't have enough USDT. We'll convert{" "}
                      {conversionInfo.amount} {conversionInfo.fromToken} to USDT
                      before completing your purchase.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Payment Token Info */}
            <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <HiCurrencyDollar className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="w-full">
                  <p className="text-blue-400 font-medium">
                    Payment Token Required
                  </p>
                  {isLoadingContractToken ? (
                    <p className="text-sm text-blue-400/80 mt-1">
                      Loading payment token information from contract...
                    </p>
                  ) : (
                    <p className="text-sm text-blue-400/80 mt-1">
                      This product requires payment in{" "}
                      <span className="font-semibold">
                        {selectedToken.symbol}
                      </span>
                      .
                      {contractTokenSymbol &&
                        contractTokenSymbol !==
                          orderDetails.product.paymentToken && (
                          <span className="block mt-1 text-yellow-400">
                            ⚠️ Note: Contract uses {contractTokenSymbol},
                            database shows {orderDetails.product.paymentToken}
                          </span>
                        )}
                      {hasInsufficientBalance &&
                        " Please ensure you have sufficient balance before proceeding."}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Security Notice */}
            <div className="bg-Red/10 border border-Red/30 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <HiShieldCheck className="w-5 h-5 text-Red flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-Red font-medium">Secure Escrow Payment</p>
                  <p className="text-sm text-Red/80 mt-1">
                    Your payment is held securely until you confirm delivery of
                    your order.
                  </p>
                </div>
              </div>
            </div>

            {needsApproval && (
              <div className="space-y-3">
                <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-4">
                  <div className="flex items-start gap-2 mb-3">
                    <HiExclamationTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-yellow-400 text-sm font-medium">
                        {selectedToken.symbol} spending approval required
                      </p>
                      <p className="text-yellow-400/80 text-xs mt-1">
                        Choose your approval preference below
                      </p>
                    </div>
                  </div>

                  {/* Approval Type Toggle */}
                  <div className="space-y-2">
                    <label className="flex items-start gap-3 p-3 bg-Dark/50 border border-yellow-500/20 rounded-lg cursor-pointer hover:bg-Dark/70 transition-colors">
                      <input
                        type="radio"
                        name="approvalType"
                        checked={useUnlimitedApproval}
                        onChange={() => {
                          setUseUnlimitedApproval(true);
                          localStorage.setItem("useUnlimitedApproval", "true");
                        }}
                        className="mt-1 w-4 h-4 text-Red focus:ring-Red focus:ring-offset-0"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-white text-sm font-medium">
                            Unlimited Approval
                          </span>
                          <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded">
                            Recommended
                          </span>
                        </div>
                        <p className="text-gray-400 text-xs mt-1">
                          Approve once, never approve again for this token. Same
                          approach used by Uniswap, Aave, and other major DeFi
                          platforms.
                        </p>
                      </div>
                    </label>

                    <label className="flex items-start gap-3 p-3 bg-Dark/50 border border-yellow-500/20 rounded-lg cursor-pointer hover:bg-Dark/70 transition-colors">
                      <input
                        type="radio"
                        name="approvalType"
                        checked={!useUnlimitedApproval}
                        onChange={() => {
                          setUseUnlimitedApproval(false);
                          localStorage.setItem("useUnlimitedApproval", "false");
                        }}
                        className="mt-1 w-4 h-4 text-Red focus:ring-Red focus:ring-offset-0"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-white text-sm font-medium">
                            Exact Amount + 5%
                          </span>
                          <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded">
                            More Secure
                          </span>
                        </div>
                        <p className="text-gray-400 text-xs mt-1">
                          Approve only what's needed for this transaction.
                          You'll need to approve again for future purchases.
                        </p>
                      </div>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* Show current allowance if exists */}
            {/* {!needsApproval && currentAllowance > 0 && (
              <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <HiCheckCircle className="w-4 h-4 text-green-400" />
                  <span className="text-green-400 text-sm">
                    {selectedToken.symbol} already approved. Current allowance: {formatCurrency(currentAllowance)} {selectedToken.symbol}
                  </span>
                </div>
              </div>
            )} */}

            {/* Warnings */}
            {(!wallet.isConnected ||
              hasInsufficientBalance ||
              hasInsufficientGas ||
              !isCorrectNetwork) && (
              <div className="space-y-2">
                {!wallet.isConnected && (
                  <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-3">
                    <div className="flex items-center gap-2">
                      <HiExclamationTriangle className="w-4 h-4 text-blue-400" />
                      <span className="text-blue-400 text-sm">
                        Please connect your wallet to continue
                      </span>
                    </div>
                  </div>
                )}

                {wallet.isConnected && hasInsufficientBalance && (
                  <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-3">
                    <div className="flex items-center gap-2">
                      <HiExclamationTriangle className="w-4 h-4 text-red-400" />
                      <span className="text-red-400 text-sm">
                        Insufficient {selectedToken.symbol} balance. Need{" "}
                        {formatCurrency(orderAmount)} {selectedToken.symbol}
                      </span>
                    </div>
                  </div>
                )}

                {wallet.isConnected && hasInsufficientGas && (
                  <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-3">
                    <div className="flex items-center gap-2">
                      <HiExclamationTriangle className="w-4 h-4 text-yellow-400" />
                      <span className="text-yellow-400 text-sm">
                        Low CELO balance for transaction fees
                      </span>
                    </div>
                  </div>
                )}

                {wallet.isConnected && !isCorrectNetwork && (
                  <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-3">
                    <div className="flex items-center gap-2">
                      <HiExclamationTriangle className="w-4 h-4 text-yellow-400" />
                      <span className="text-yellow-400 text-sm">
                        Please switch to Celo network
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Retry indicator */}
            {retryCount > 0 && (
              <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <span className="text-blue-400 text-sm">
                    Retry attempt #{retryCount}
                  </span>
                </div>
              </div>
            )}

            {/* Payment Button */}
            <Button
              title={
                isLoadingContractToken
                  ? "Loading payment token..."
                  : !wallet.isConnected
                  ? "Connect Wallet"
                  : needsConversion
                  ? `Convert & Pay ${formatCurrency(orderAmount)} USDT`
                  : `Pay ${formatCurrency(orderAmount)} ${selectedToken.symbol}`
              }
              onClick={handlePayment}
              disabled={
                isLoadingContractToken ||
                isProcessing ||
                isLoadingBalance ||
                isScanningWallet ||
                (wallet.isConnected &&
                  (hasInsufficientBalance || hasInsufficientGas))
              }
              className="flex items-center justify-center w-full bg-Red hover:bg-Red/80 disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-lg py-4 font-semibold transition-all duration-200"
            />
          </div>
        );

      case "processing":
        return (
          <div className="text-center space-y-6 py-12">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-Red/30 border-t-Red rounded-full animate-spin mx-auto" />
              <div className="absolute inset-0 w-12 h-12 border-2 border-Red/20 border-t-transparent rounded-full animate-spin mx-auto mt-2" />
            </div>
            <div className="space-y-3">
              <h3 className="text-xl font-bold text-white">
                Processing Payment
              </h3>
              <p className="text-gray-300 max-w-sm mx-auto">
                {needsApproval && !approvalHash
                  ? `Requesting ${selectedToken.symbol} spending permission...`
                  : "Completing your purchase transaction..."}
              </p>
              <p className="text-sm text-gray-400">
                Please confirm the transaction in your wallet
              </p>
              <div className="flex items-center justify-center gap-1 text-sm text-Red">
                <div className="w-2 h-2 bg-Red rounded-full animate-pulse" />
                <div className="w-2 h-2 bg-Red rounded-full animate-pulse delay-100" />
                <div className="w-2 h-2 bg-Red rounded-full animate-pulse delay-200" />
              </div>
            </div>
          </div>
        );

      case "success":
        return (
          <div className="text-center space-y-6 py-8">
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", duration: 0.6, delay: 0.1 }}
            >
              <div className="w-16 h-16 bg-Red/20 rounded-full flex items-center justify-center mx-auto">
                <HiCheckCircle className="w-10 h-10 text-Red" />
              </div>
            </motion.div>
            <div className="space-y-3">
              <h3 className="text-xl font-bold text-white">
                Payment Successful!
              </h3>
              <p className="text-gray-300 max-w-md mx-auto">
                Your payment has been sent to escrow. You'll receive your order
                soon.
              </p>
              {transaction && (
                <div className="bg-Dark/50 border border-Red/20 rounded-lg p-4 mt-4">
                  <p className="text-sm text-gray-400 mb-1">
                    Transaction Hash:
                  </p>
                  <p className="font-mono text-xs text-Red break-all">
                    {transaction.hash}
                  </p>
                </div>
              )}
            </div>
            <Button
              title="Continue Shopping"
              onClick={onClose}
              className="w-full bg-Red hover:bg-Red/80 text-white"
            />
          </div>
        );

      case "error":
        return (
          <div className="text-center space-y-6 py-8">
            <div className="w-16 h-16 bg-red-900/20 rounded-full flex items-center justify-center mx-auto">
              <HiXCircle className="w-10 h-10 text-red-400" />
            </div>
            <div className="space-y-3">
              <h3 className="text-xl font-bold text-white">Payment Failed</h3>
              <p className="text-gray-300 max-w-md mx-auto">{error}</p>
            </div>
            <div className="space-y-3">
              <Button
                title="Try Again"
                onClick={handleRetry}
                className="w-full bg-Red hover:bg-Red/80 text-white"
              />
              <Button
                title="Close"
                onClick={onClose}
                className="w-full bg-gray-700 hover:bg-gray-600 text-white"
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={handleModalClose}
        title={step === "review" ? "Complete Payment" : ""}
        maxWidth="md:max-w-lg"
        showCloseButton={step !== "processing"}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
          >
            {renderStepContent()}
          </motion.div>
        </AnimatePresence>
      </Modal>
      <WalletConnectionModal
        isOpen={showWalletModal}
        onClose={() => setShowWalletModal(false)}
      />
    </>
  );
};

export default PaymentModal;
