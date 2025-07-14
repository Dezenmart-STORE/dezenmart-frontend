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
  HiCurrencyDollar,
  HiBanknotes,
  HiStar,
  HiOutlineStar,
} from "react-icons/hi2";
import { FiLogOut } from "react-icons/fi";
import Modal from "../common/Modal";
import Button from "../common/Button";
import { useWeb3 } from "../../context/Web3Context";
import { TARGET_CHAIN, StableToken } from "../../utils/config/web3.config";
import { truncateAddress, copyToClipboard } from "../../utils/web3.utils";
import { useSnackbar } from "../../context/SnackbarContext";
import { useCurrencyConverter } from "../../utils/hooks/useCurrencyConverter";
import { useCurrency } from "../../context/CurrencyContext";

interface WalletDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type BalanceDisplayMode = "TOKEN" | "CELO" | "FIAT";

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
    setSelectedToken,
    refreshTokenBalance,
    availableTokens,
  } = useWeb3();

  const {
    userCountry,
    convertPrice,
    formatPrice,
    loading: currencyLoading,
    error: currencyError,
  } = useCurrencyConverter();

  const [balanceMode, setBalanceMode] = useState<BalanceDisplayMode>("FIAT");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isTokenSelectorOpen, setIsTokenSelectorOpen] = useState(false);
  const [refreshingToken, setRefreshingToken] = useState<string | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const tokenSelectorRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
      if (
        tokenSelectorRef.current &&
        !tokenSelectorRef.current.contains(event.target as Node)
      ) {
        setIsTokenSelectorOpen(false);
      }
    };

    if (isDropdownOpen || isTokenSelectorOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isDropdownOpen, isTokenSelectorOpen]);

  // Get current token balance
  const currentTokenBalance = useMemo(() => {
    return wallet.tokenBalances[wallet.selectedToken.symbol];
  }, [wallet.tokenBalances, wallet.selectedToken.symbol]);

  // Get portfolio value
  const portfolioValue = useMemo(() => {
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
  ]);

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

  const handleTokenSelect = useCallback(
    async (token: StableToken) => {
      setSelectedToken(token);
      setIsTokenSelectorOpen(false);
      showSnackbar(`Switched to ${token.symbol}`, "success");

      // Refresh balance for new token
      setRefreshingToken(token.symbol);
      try {
        await refreshTokenBalance(token.symbol);
      } finally {
        setRefreshingToken(null);
      }
    },
    [setSelectedToken, showSnackbar, refreshTokenBalance]
  );

  const handleRefreshBalance = useCallback(async () => {
    if (!currentTokenBalance) return;

    setRefreshingToken(wallet.selectedToken.symbol);
    try {
      await refreshTokenBalance(wallet.selectedToken.symbol);
      showSnackbar("Balance refreshed", "success");
    } catch (error) {
      showSnackbar("Failed to refresh balance", "error");
    } finally {
      setRefreshingToken(null);
    }
  }, [
    currentTokenBalance,
    wallet.selectedToken.symbol,
    refreshTokenBalance,
    showSnackbar,
  ]);

  const getBalanceDisplay = useCallback(() => {
    if (!currentTokenBalance) return "0.00";

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

  const getBalanceIcon = useCallback(
    (mode: BalanceDisplayMode) => {
      switch (mode) {
        case "TOKEN":
          return (
            <span className="w-4 h-4 flex items-center justify-center text-sm">
              {wallet.selectedToken.icon || "💰"}
            </span>
          );
        case "CELO":
          return (
            <div className="w-4 h-4 rounded-full bg-yellow-500 flex items-center justify-center text-xs font-bold text-black">
              ◉
            </div>
          );
        case "FIAT":
          return <HiBanknotes className="w-4 h-4 text-Red" />;
        default:
          return <HiBanknotes className="w-4 h-4 text-Red" />;
      }
    },
    [wallet.selectedToken.icon]
  );

  const balanceOptions = useMemo(
    () =>
      [
        {
          mode: "FIAT" as const,
          label: userCountry || "USD",
          priority: 1,
        },
        {
          mode: "TOKEN" as const,
          label: wallet.selectedToken.symbol,
          priority: 2,
        },
        {
          mode: "CELO" as const,
          label: "CELO",
          priority: 3,
        },
      ].sort((a, b) => a.priority - b.priority),
    [userCountry, wallet.selectedToken.symbol]
  );

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
              {currencyLoading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-Red border-t-transparent rounded-full animate-spin" />
                  <span className="text-gray-400">Loading...</span>
                </div>
              ) : (
                <p className="text-2xl font-bold text-white">
                  {secondaryCurrency === "USDT"
                    ? convertPrice(portfolioValue, "FIAT", "USDT").toFixed(2)
                    : formatPrice(portfolioValue, "FIAT")}
                </p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                in {secondaryCurrency === "USDT" ? "USDT" : userCountry}
              </p>
            </div>
          </div>
        </div>

        {/* Token Selection */}
        <div className="space-y-3">
          <h3 className="text-lg font-medium text-white">Selected Token</h3>
          <div className="relative" ref={tokenSelectorRef}>
            <button
              onClick={() => setIsTokenSelectorOpen(!isTokenSelectorOpen)}
              className="w-full flex items-center justify-between p-3 bg-Dark rounded-lg border border-gray-700/50 hover:border-Red/30 hover:bg-Red/5 transition-all duration-200"
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">
                  {wallet.selectedToken.icon || "💰"}
                </span>
                <div className="text-left">
                  <p className="text-white font-medium">
                    {wallet.selectedToken.symbol}
                  </p>
                  <p className="text-sm text-gray-400">
                    {wallet.selectedToken.name}
                  </p>
                </div>
              </div>
              <HiChevronDown
                className={`w-5 h-5 text-gray-400 transition-transform ${
                  isTokenSelectorOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {isTokenSelectorOpen && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-[#1a1c20] border border-Red/30 rounded-lg shadow-xl z-30 max-h-64 overflow-y-auto">
                {availableTokens.map((token) => (
                  <button
                    key={token.symbol}
                    onClick={() => handleTokenSelect(token)}
                    className={`w-full flex items-center justify-between p-3 hover:bg-Red/10 transition-colors ${
                      token.symbol === wallet.selectedToken.symbol
                        ? "bg-Red/20 border-l-2 border-Red"
                        : ""
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{token.icon || "💰"}</span>
                      <div className="text-left">
                        <p className="text-white font-medium">{token.symbol}</p>
                        <p className="text-sm text-gray-400">{token.name}</p>
                      </div>
                    </div>
                    {token.symbol === wallet.selectedToken.symbol && (
                      <HiStar className="w-4 h-4 text-Red" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Token Balance */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-white">Token Balance</h3>
            <button
              onClick={handleRefreshBalance}
              disabled={refreshingToken === wallet.selectedToken.symbol}
              className="text-sm text-gray-400 hover:text-white transition-colors disabled:opacity-50"
            >
              {refreshingToken === wallet.selectedToken.symbol ? (
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
                  {wallet.selectedToken.icon || "💰"}
                </span>
                <span className="text-gray-300 font-medium">
                  {wallet.selectedToken.symbol}
                </span>
              </div>

              <div className="relative" ref={dropdownRef}>
                {wallet.isLoadingTokenBalance ||
                refreshingToken === wallet.selectedToken.symbol ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-Red border-t-transparent rounded-full animate-spin" />
                    <span className="text-gray-400">Loading...</span>
                  </div>
                ) : (
                  <button
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="flex items-center gap-2 font-mono text-white hover:text-gray-300 transition-colors bg-[#1a1c20] hover:bg-Red/10 hover:border-Red/30 border border-gray-600 px-3 py-1.5 rounded-md transition-all duration-200"
                    disabled={!currentTokenBalance}
                  >
                    {getBalanceIcon(balanceMode)}
                    <span className="min-w-0">{getBalanceDisplay()}</span>
                    <HiChevronDown
                      className={`w-4 h-4 transition-transform flex-shrink-0 ${
                        isDropdownOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                )}

                {isDropdownOpen && currentTokenBalance && (
                  <div className="absolute right-0 top-full mt-1 bg-[#1a1c20] border border-Red/30 rounded-lg shadow-xl z-20 min-w-[160px] overflow-hidden">
                    {balanceOptions.map((option) => (
                      <button
                        key={option.mode}
                        onClick={() => {
                          setBalanceMode(option.mode);
                          setIsDropdownOpen(false);
                        }}
                        className={`w-full px-3 py-2.5 text-left hover:bg-Red/10 transition-colors ${
                          balanceMode === option.mode
                            ? "bg-Red/20 text-white border-l-2 border-Red"
                            : "text-gray-300"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-2">
                            {getBalanceIcon(option.mode)}
                            {option.label}
                          </span>
                          {balanceMode === option.mode && (
                            <div className="w-1.5 h-1.5 bg-Red rounded-full" />
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {currentTokenBalance && !currencyLoading && (
              <div className="text-xs text-gray-500 mt-2 space-y-1">
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
                {!currencyLoading && wallet.balance && (
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
        {!currencyLoading && (
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
