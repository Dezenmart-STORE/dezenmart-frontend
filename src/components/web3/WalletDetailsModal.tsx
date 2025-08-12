import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import {
  HiArrowTopRightOnSquare,
  HiClipboardDocument,
  HiArrowsRightLeft,
  HiExclamationTriangle,
  HiChevronDown,
} from "react-icons/hi2";
import { FiLogOut } from "react-icons/fi";
import Modal from "../common/Modal";
import Button from "../common/Button";
import { useWeb3 } from "../../context/Web3Context";
import { TARGET_CHAIN } from "../../utils/config/web3.config";
import { truncateAddress, copyToClipboard } from "../../utils/web3.utils";
import { useSnackbar } from "../../context/SnackbarContext";
import { useCurrencyConverter } from "../../utils/hooks/useCurrencyConverter";
import { useCurrency } from "../../context/CurrencyContext";

interface WalletDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type BalanceDisplayMode = "TOKEN" | "CELO" | "FIAT";

// Optimized loading state hook
const useStableLoadingState = (isLoading: boolean, delay: number = 200) => {
  const [stableLoading, setStableLoading] = useState(isLoading);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    if (isLoading) {
      setStableLoading(true);
    } else {
      timeoutRef.current = setTimeout(() => {
        setStableLoading(false);
      }, delay);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [isLoading, delay]);

  return stableLoading;
};

// Memoized balance display component
const BalanceDisplay = React.memo<{
  isLoading: boolean;
  balance: string | null;
  symbol: string;
  showFullBalance?: boolean;
}>(({ isLoading, balance, symbol, showFullBalance = false }) => {
  if (isLoading) {
    return (
      <div className="flex items-center gap-2 min-h-[24px]">
        <div className="w-4 h-4 border-2 border-Red border-t-transparent rounded-full animate-spin" />
        <span className="text-gray-400">Loading...</span>
      </div>
    );
  }

  if (!balance) {
    return <span className="text-gray-400 font-mono">0.00 {symbol}</span>;
  }

  return (
    <span className="text-white font-mono transition-opacity duration-200">
      {showFullBalance ? balance : balance}
    </span>
  );
});

BalanceDisplay.displayName = "BalanceDisplay";

const WalletDetailsModal: React.FC<WalletDetailsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { showSnackbar } = useSnackbar();
  const { secondaryCurrency } = useCurrency();
  const {
    wallet,
    disconnectWallet,
    isCorrectNetwork,
    switchToCorrectNetwork,
    refreshTokenBalance,
  } = useWeb3();

  const {
    userCountry,
    convertPrice,
    formatPrice,
    loading: currencyLoading,
  } = useCurrencyConverter();

  const [balanceMode, setBalanceMode] = useState<BalanceDisplayMode>("FIAT");

  // Optimized loading state with stable transitions
  const stableTokenLoading = useStableLoadingState(
    wallet.isLoadingTokenBalance,
    300
  );
  const stableCurrencyLoading = useStableLoadingState(currencyLoading, 200);

  // Refs for dropdown management
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Memoized current token balance
  const currentTokenBalance = useMemo(() => {
    return wallet.tokenBalances[wallet.selectedToken.symbol];
  }, [wallet.tokenBalances, wallet.selectedToken.symbol]);

  // Memoized portfolio value calculation
  const portfolioValue = useMemo(() => {
    if (stableCurrencyLoading) return 0;

    const celoValue = wallet.balance ? parseFloat(wallet.balance) : 0;
    const fiatCeloValue = convertPrice(celoValue, "CELO", "FIAT");

    let totalTokenValue = 0;
    Object.values(wallet.tokenBalances).forEach((balance) => {
      if (balance?.raw) {
        totalTokenValue += parseFloat(balance.raw);
      }
    });

    const fiatTokenValue = convertPrice(
      totalTokenValue,
      wallet.selectedToken.symbol,
      "FIAT"
    );
    return fiatCeloValue + fiatTokenValue;
  }, [
    wallet.balance,
    wallet.tokenBalances,
    wallet.selectedToken.symbol,
    convertPrice,
    stableCurrencyLoading,
  ]);

  // Optimized balance display formatting
  const formattedBalance = useMemo(() => {
    if (!currentTokenBalance) return null;

    switch (balanceMode) {
      case "TOKEN":
        return currentTokenBalance.formatted;
      case "CELO":
        const celoAmount = convertPrice(
          parseFloat(currentTokenBalance.raw),
          wallet.selectedToken.symbol,
          "CELO"
        );
        return formatPrice(celoAmount, "CELO");
      case "FIAT":
        return currentTokenBalance.fiat;
      default:
        return currentTokenBalance.fiat;
    }
  }, [
    currentTokenBalance,
    balanceMode,
    convertPrice,
    formatPrice,
    wallet.selectedToken.symbol,
  ]);

  // Optimized event handlers
  const handleCopyAddress = useCallback(() => {
    if (wallet.address) {
      copyToClipboard(wallet.address);
      showSnackbar("Address copied to clipboard", "success");
    }
  }, [wallet.address, showSnackbar]);

  const handleDisconnect = useCallback(() => {
    disconnectWallet();
    onClose();
  }, [disconnectWallet, onClose]);

  const handleSwitchNetwork = useCallback(async () => {
    try {
      await switchToCorrectNetwork();
    } catch (error) {
      // Error handled in context
    }
  }, [switchToCorrectNetwork]);

  const handleRefreshBalance = useCallback(async () => {
    if (!currentTokenBalance || stableTokenLoading) return;

    try {
      await refreshTokenBalance(wallet.selectedToken.symbol);
      showSnackbar("Balance refreshed", "success");
    } catch (error) {
      showSnackbar("Failed to refresh balance", "error");
    }
  }, [
    currentTokenBalance,
    stableTokenLoading,
    wallet.selectedToken.symbol,
    refreshTokenBalance,
    showSnackbar,
  ]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, []);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Wallet Details"
      maxWidth="md:max-w-md"
    >
      <div className="space-y-6">
        {/* Wallet Address */}
        <div className="space-y-3">
          <h3 className="text-lg font-medium text-white">Connected Wallet</h3>
          <div className="flex items-center gap-3 p-3 bg-Dark rounded-lg border border-gray-700/50">
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-400">Address</p>
              <p className="font-mono text-white truncate">
                {wallet.address
                  ? truncateAddress(wallet.address)
                  : "Not connected"}
              </p>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <Button
                title=""
                icon={<HiClipboardDocument className="w-4 h-4" />}
                onClick={handleCopyAddress}
                className="bg-[#1a1c20] hover:bg-Red/10 hover:border-Red/30 hover:shadow-md border border-gray-600 text-white p-2 transition-all duration-200"
                disabled={!wallet.address}
              />
              <Button
                title=""
                icon={<HiArrowTopRightOnSquare className="w-4 h-4" />}
                path={`https://celo-alfajores.blockscout.com/address/${wallet.address}`}
                className="bg-[#1a1c20] hover:bg-Red/10 hover:border-Red/30 hover:shadow-md border border-gray-600 text-white p-2 transition-all duration-200"
                disabled={!wallet.address}
              />
            </div>
          </div>
        </div>

        {/* Network Status */}
        <div className="space-y-3">
          <h3 className="text-lg font-medium text-white">Network</h3>
          {!isCorrectNetwork ? (
            <div className="p-3 bg-Red/10 border border-Red/30 rounded-lg">
              <div className="flex items-start gap-2">
                <HiExclamationTriangle className="w-5 h-5 text-Red flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-Red font-medium">Wrong Network</p>
                  <p className="text-sm text-Red/80 mt-1">
                    Switch to {TARGET_CHAIN.name} to make purchases
                  </p>
                  <Button
                    title={`Switch to ${TARGET_CHAIN.name}`}
                    icon={<HiArrowsRightLeft className="w-4 h-4" />}
                    onClick={handleSwitchNetwork}
                    className="mt-2 bg-Red hover:bg-Red/80 text-white text-sm px-3 py-1.5 transition-all duration-200"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-green-400 font-medium">
                  {TARGET_CHAIN.name}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Portfolio Overview */}
        <div className="space-y-3">
          <h3 className="text-lg font-medium text-white">Portfolio Value</h3>
          <div className="p-4 bg-gradient-to-r from-Red/10 to-Red/5 border border-Red/20 rounded-lg">
            <div className="text-center">
              <p className="text-sm text-gray-400 mb-1">Total Balance</p>
              <BalanceDisplay
                isLoading={stableCurrencyLoading}
                balance={
                  secondaryCurrency === "TOKEN"
                    ? convertPrice(portfolioValue, "FIAT", "USDT").toFixed(2)
                    : formatPrice(portfolioValue, "FIAT")
                }
                symbol={
                  secondaryCurrency === "TOKEN" ? "USDT" : userCountry || "USD"
                }
                showFullBalance={true}
              />
              <p className="text-xs text-gray-500 mt-1">
                in {secondaryCurrency === "TOKEN" ? "USDT" : userCountry}
              </p>
            </div>
          </div>
        </div>

        {/* Token Balance - Updated to show current selected token */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-white">Token Balance</h3>
            <button
              onClick={handleRefreshBalance}
              disabled={stableTokenLoading}
              className="text-sm text-gray-400 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {stableTokenLoading ? (
                <div className="w-4 h-4 border-2 border-Red border-t-transparent rounded-full animate-spin" />
              ) : (
                "Refresh"
              )}
            </button>
          </div>

          <div className="p-3 bg-Dark rounded-lg border border-gray-700/50">
            <div className="flex flex-wrap gap-2 justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="text-xl">
                  {typeof wallet.selectedToken.icon === "string" &&
                  wallet.selectedToken.icon ? (
                    <img
                      src={wallet.selectedToken.icon}
                      alt={wallet.selectedToken.symbol}
                      width={24}
                      height={24}
                    />
                  ) : (
                    "💰"
                  )}
                </span>
                <div>
                  <span className="text-gray-300 font-medium block">
                    {wallet.selectedToken.symbol}
                  </span>
                  <span className="text-xs text-gray-500">
                    {wallet.selectedToken.name}
                  </span>
                </div>
              </div>

              <div className="min-h-[24px] flex items-center">
                <BalanceDisplay
                  isLoading={stableTokenLoading}
                  balance={formattedBalance}
                  symbol={wallet.selectedToken.symbol}
                />
              </div>
            </div>

            {currentTokenBalance &&
              !stableCurrencyLoading &&
              !stableTokenLoading && (
                <div className="text-xs text-gray-500 mt-2 space-y-1 transition-opacity duration-200">
                  <div className="flex justify-between">
                    <span>
                      ≈{" "}
                      {formatPrice(
                        convertPrice(
                          parseFloat(currentTokenBalance.raw),
                          wallet.selectedToken.symbol,
                          "CELO"
                        ),
                        "CELO"
                      )}
                    </span>
                    <span>≈ {currentTokenBalance.fiat}</span>
                  </div>
                </div>
              )}
          </div>
          
          {/* Note about token selection */}
          <p className="text-xs text-gray-500 text-center">
            Change selected token from the header dropdown
          </p>
        </div>

        {/* CELO Balance */}
        <div className="space-y-3">
          <h3 className="text-lg font-medium text-white">Gas Balance</h3>
          <div className="p-3 bg-Dark rounded-lg border border-gray-700/50">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-yellow-500 flex items-center justify-center text-xs font-bold text-black">
                  ◉
                </div>
                <span className="text-gray-300 font-medium">CELO</span>
              </div>
              <div className="text-right">
                <span className="font-mono text-white">
                  {wallet.balance
                    ? `${parseFloat(wallet.balance).toFixed(4)} CELO`
                    : "0.0000 CELO"}
                </span>
                {!stableCurrencyLoading && wallet.balance && (
                  <p className="text-xs text-gray-500">
                    ≈{" "}
                    {formatPrice(
                      convertPrice(parseFloat(wallet.balance), "CELO", "FIAT"),
                      "FIAT"
                    )}
                  </p>
                )}
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-1">For transaction fees</p>
          </div>
        </div>

        {/* Currency Info */}
        {!stableCurrencyLoading && (
          <div className="text-xs text-gray-500 text-center p-2 bg-Red/5 rounded-lg border border-Red/10">
            Prices shown in {userCountry || "USD"} • Updated every 5 minutes
          </div>
        )}

        {/* Actions */}
        <div className="border-t border-gray-700/50 pt-4">
          <Button
            title="Disconnect Wallet"
            icon={<FiLogOut className="w-4 h-4" />}
            onClick={handleDisconnect}
            className="flex items-center justify-center w-full bg-Red hover:bg-Red/80 text-white py-2.5 transition-all duration-200"
          />
        </div>
      </div>
    </Modal>
  );
};

export default WalletDetailsModal;