import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { debounce } from "lodash-es";
import {
  useAccount,
  useConnect,
  useDisconnect,
  useBalance,
  useSwitchChain,
  useWalletClient,
  useReadContract,
  useWriteContract,
  useChainId,
  usePublicClient,
} from "wagmi";
import {
  parseUnits,
  formatUnits,
  erc20Abi,
  decodeEventLog,
  WalletClient,
  // createWalletClient,
  // custom,
  // http,
} from "viem";

import {
  Web3ContextType,
  WalletState,
  PaymentTransaction,
  PaymentParams,
  BuyTradeParams,
} from "../utils/types/web3.types";
import {
  TARGET_CHAIN,
  // USDT_ADDRESSES,
  wagmiConfig,
  STABLE_TOKENS,
  DEFAULT_STABLE_TOKEN,
  StableToken,
  getTokenAddress,
  getTokenBySymbol,
} from "../utils/config/web3.config";
import { useSnackbar } from "./SnackbarContext";
import { useCurrencyConverter } from "../utils/hooks/useCurrencyConverter";
import { DEZENMART_ABI } from "../utils/abi/dezenmartAbi.json";
import { ESCROW_ADDRESSES } from "../utils/config/web3.config";
import { parseWeb3Error } from "../utils/errorParser";
// import { Mento } from "@mento-protocol/mento-sdk";
import {
  readContract,
  simulateContract,
  waitForTransactionReceipt,
} from "@wagmi/core";
// import { ethers } from "ethers";
import { useMento } from "../utils/hooks/useMento";
import { useDivvi } from "../utils/hooks/useDivvi";
import { ensure0xPrefix } from "../utils/services/divvi.service";
import {
  scanWalletForStableTokens,
  checkSufficientBalance,
  getBestTokenForPurchase,
  TokenBalanceInfo,
} from "../utils/tokenBalanceChecker";

interface TokenBalance {
  raw: string;
  formatted: string;
  fiat: string;
}

interface SwapState {
  isSwapping: boolean;
  fromAmount: string;
  toAmount: string;
  error: string | null;
  isInitializing: boolean;
}

interface ExtendedWalletState extends WalletState {
  selectedToken: StableToken;
  tokenBalances: Record<string, TokenBalance>;
  isLoadingTokenBalance: boolean;
}

interface ExtendedWeb3ContextType extends Omit<Web3ContextType, "wallet"> {
  wallet: ExtendedWalletState;
  buyTrade: (params: BuyTradeParams) => Promise<PaymentTransaction>;
  validateTradeBeforePurchase: (
    tradeId: string,
    quantity: string,
    logisticsProvider: string
  ) => Promise<any>;
  approveToken: (tokenSymbol: string, amount: string) => Promise<string>;
  getTokenAllowance: (tokenSymbol: string) => Promise<number>;
  setSelectedToken: (token: StableToken) => void;
  refreshTokenBalance: (tokenSymbol?: string) => Promise<void>;
  availableTokens: StableToken[];
  usdtAllowance: bigint | undefined;
  usdtDecimals: number | undefined;
  approveUSDT: (amount: string) => Promise<string>;
  walletClient?: WalletClient;
  chainId?: number;
  mento?: ReturnType<typeof useMento>;
  swapState: SwapState;
  performSwap: (from: string, to: string, amount: number) => Promise<void>;
  getSwapQuote: (from: string, to: string, amount: number) => Promise<string>;
  initializeMento: () => Promise<boolean>;
  divvi: {
    isReady: boolean;
    error: string | null;
    referralCode: string | null;
    generateReferralTag: (params: {
      user: string;
      consumer?: string;
      providers?: string[];
    }) => string | null;
    trackTransaction: (data: {
      transactionHash: string;
      chainId: number;
      user: string;
      consumer?: string;
      providers?: string[];
    }) => Promise<boolean>;
    generateReferralLink: (referralCode: string, baseUrl?: string) => string;
    clearReferralCode: () => void;
  };
}

const CACHE_DURATION = 240000; // 4 minutes
const BALANCE_FETCH_INTERVAL = 300000; // 5 minutes

interface BalanceCache {
  [key: string]: {
    data: TokenBalance;
    timestamp: number;
  };
}

const Web3Context = createContext<ExtendedWeb3ContextType | undefined>(
  undefined
);

export const Web3Provider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { showSnackbar } = useSnackbar();
  // const { address, isConnected, chain } = useAccount();
  const { address, isConnected, chain } = useAccount({
    onConnect: ({ address: newAddress }) => {
      console.log("Wallet connected:", newAddress);
      connectionCheckRef.current = true;
    },
    onDisconnect: () => {
      console.log("Wallet disconnected");
      connectionCheckRef.current = false;
      // Clear all cached data
      balanceCacheRef.current = {};
      lastFetchRef.current = {};
    },
  });
  // connection status ref to prevent redundant checks
  const connectionCheckRef = useRef<boolean>(false);
  const mountedRef = useRef<boolean>(true);
  // const { data: walletClient } = useWalletClient();
  // const publicClient = usePublicClient();
  // const chainId = useChainId();
  const mento = useMento();
  const divvi = useDivvi();
  const {
    connect,
    connectors,
    isPending: isConnecting,
    error: connectError,
  } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();
  const { convertPrice, formatPrice } = useCurrencyConverter();

  //balance cache
  const balanceCacheRef = useRef<BalanceCache>({});
  const refreshInProgressRef = useRef<Set<string>>(new Set());

  // State for selected token and balances
  const [selectedToken, setSelectedTokenState] = useState<StableToken>(() => {
    const saved = localStorage.getItem("selectedToken");
    return saved ? JSON.parse(saved) : DEFAULT_STABLE_TOKEN;
  });

  const [tokenBalances, setTokenBalances] = useState<
    Record<string, TokenBalance>
  >({});
  const [isLoadingTokenBalance, setIsLoadingTokenBalance] = useState(false);

  // Refs for interval management
  const balanceIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastFetchRef = useRef<Record<string, number>>({});

  // ref to track initialization
  const isInitializedRef = useRef<boolean>(false);

  const [wallet, setWallet] = useState<ExtendedWalletState>({
    isConnected: false,
    isConnecting: false,
    selectedToken,
    tokenBalances,
    isLoadingTokenBalance,
  });
  // connection stability check
  useEffect(() => {
    if (isConnected && address) {
      connectionCheckRef.current = true;
    } else {
      connectionCheckRef.current = false;
    }
  }, [isConnected, address]);

  const isCorrectNetwork = chain?.id === TARGET_CHAIN.id;

  // Available tokens for the current chain
  const availableTokens = useMemo(() => {
    if (!chain?.id) return STABLE_TOKENS;
    return STABLE_TOKENS.filter((token) => token.address[chain.id]);
  }, [chain?.id]);

  // Get current token address
  const currentTokenAddress = useMemo(() => {
    if (!chain?.id || !selectedToken) return undefined;
    return getTokenAddress(selectedToken, chain.id) as
      | `0x${string}`
      | undefined;
  }, [selectedToken, chain?.id]);

  // CELO balance for gas fees
  const { data: celoBalance, refetch: refetchCeloBalance } = useBalance({
    address,
    query: {
      enabled: !!address && isCorrectNetwork,
      refetchInterval: 300000, // 5 minutes
      staleTime: 240000, // 4 minutes
      gcTime: 600000, // 10 minutes
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: false,
    },
  });

  // Token balance hook for selected token
  const {
    data: currentTokenBalance,
    refetch: refetchCurrentTokenBalance,
    isLoading: isLoadingCurrentToken,
  } = useReadContract({
    address: currentTokenAddress,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && !!currentTokenAddress && isCorrectNetwork,
      refetchInterval: 300000,
      staleTime: 240000,
      gcTime: 600000,
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: false,
    },
  });

  // Token decimals
  const { data: tokenDecimals } = useReadContract({
    address: currentTokenAddress,
    abi: erc20Abi,
    functionName: "decimals",
    query: {
      enabled: !!currentTokenAddress && isCorrectNetwork,
      staleTime: Infinity,
      gcTime: Infinity,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
    },
  });

  // Legacy USDT support
  const usdtContractAddress = useMemo(() => {
    if (!address || !chain?.id) return undefined;
    const contractAddr = getTokenAddress(STABLE_TOKENS[0], chain.id);
    // USDT_ADDRESSES[chain.id as keyof typeof USDT_ADDRESSES];
    return contractAddr as `0x${string}` | undefined;
  }, [address, chain?.id]);

  const { data: usdtAllowance } = useReadContract({
    address: usdtContractAddress,
    abi: erc20Abi,
    functionName: "allowance",
    args:
      address && chain?.id
        ? [
            address,
            ESCROW_ADDRESSES[
              chain.id as keyof typeof ESCROW_ADDRESSES
            ] as `0x${string}`,
          ]
        : undefined,
    query: {
      enabled: !!address && !!usdtContractAddress && isCorrectNetwork,
      refetchInterval: 300000,
      staleTime: Infinity,
      gcTime: Infinity,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
    },
  });

  const { data: usdtDecimals } = useReadContract({
    address: usdtContractAddress,
    abi: erc20Abi,
    functionName: "decimals",
    query: {
      enabled: !!usdtContractAddress && isCorrectNetwork,
      staleTime: Infinity,
      gcTime: Infinity,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
    },
  });

  // token balance fetching
  const fetchTokenBalance = useCallback(
    async (token: StableToken): Promise<TokenBalance | null> => {
      if (!address || !chain?.id || !isCorrectNetwork) return null;

      // Check cache first
      const cached = balanceCacheRef.current[token.symbol];
      if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        return cached.data;
      }

      const tokenAddress = getTokenAddress(token, chain.id);
      if (!tokenAddress) return null;

      try {
        const balance = await readContract(wagmiConfig, {
          address: tokenAddress as `0x${string}`,
          abi: erc20Abi,
          functionName: "balanceOf",
          args: [address],
        });

        const decimals = token.decimals;
        const raw = formatUnits(balance as bigint, decimals);
        const numericBalance = parseFloat(raw);

        const formatted = `${numericBalance.toLocaleString("en-US", {
          minimumFractionDigits: 0,
          maximumFractionDigits: Math.min(decimals, 6),
        })} ${token.symbol}`;

        // const fiat = formatPrice(
        //   convertPrice(numericBalance, token.symbol, "FIAT"),
        //   "FIAT"
        // );

        const fiat = "0";

        const balanceData = { raw, formatted, fiat };

        // Update cache
        balanceCacheRef.current[token.symbol] = {
          data: balanceData,
          timestamp: Date.now(),
        };

        return balanceData;
      } catch (error) {
        console.error(`Failed to fetch ${token.symbol} balance:`, error);
        return null;
      }
    },
    [address, chain?.id, isCorrectNetwork]
    // convertPrice, formatPrice
  );
  // Debounced balance fetching
  const debouncedFetchBalance = useMemo(
    () =>
      debounce(
        async (tokenSymbol: string) => {
          if (
            !mountedRef.current ||
            refreshInProgressRef.current.has(tokenSymbol)
          ) {
            return;
          }

          refreshInProgressRef.current.add(tokenSymbol);

          try {
            const token = getTokenBySymbol(tokenSymbol);
            if (!token) return;

            const balance = await fetchTokenBalance(token);
            if (balance && mountedRef.current) {
              setTokenBalances((prev) => ({
                ...prev,
                [token.symbol]: balance,
              }));

              balanceCacheRef.current[tokenSymbol] = {
                data: balance,
                timestamp: Date.now(),
              };
            }
          } catch (error) {
            console.error(`Failed to fetch ${tokenSymbol} balance:`, error);
          } finally {
            refreshInProgressRef.current.delete(tokenSymbol);
            if (mountedRef.current) {
              setIsLoadingTokenBalance(false);
            }
          }
        },
        500, // debounce time
        { leading: true, trailing: false, maxWait: 1000 }
      ),
    [fetchTokenBalance]
  );
  // Refresh token balance
  const refreshTokenBalance = useCallback(
    async (tokenSymbol?: string) => {
      if (!address || !isCorrectNetwork || !mountedRef.current) return;

      const targetSymbol = tokenSymbol || selectedToken.symbol;

      // Rate limiting: Don't refresh if last fetch was less than 30 seconds ago
      const lastFetch = lastFetchRef.current[targetSymbol] || 0;
      const now = Date.now();
      if (now - lastFetch < 30000) {
        console.log(`Skipping refresh for ${targetSymbol} - too soon`);
        return;
      }

      // Check if already refreshing
      if (refreshInProgressRef.current.has(targetSymbol)) {
        return;
      }

      lastFetchRef.current[targetSymbol] = now;
      setIsLoadingTokenBalance(true);
      debouncedFetchBalance(targetSymbol);
    },
    [address, isCorrectNetwork, selectedToken.symbol, debouncedFetchBalance]
  );

  // Set selected token
  const setSelectedToken = useCallback((token: StableToken) => {
    setSelectedTokenState(token);
    localStorage.setItem("selectedToken", JSON.stringify(token));
  }, []);

  // Update current token balance when it changes
  useEffect(() => {
    if (currentTokenBalance && tokenDecimals !== undefined) {
      const raw = formatUnits(currentTokenBalance as bigint, tokenDecimals);
      const numericBalance = parseFloat(raw);

      const formatted = `${numericBalance.toLocaleString("en-US", {
        minimumFractionDigits: 0,
        maximumFractionDigits: Math.min(tokenDecimals, 6),
      })} ${selectedToken.symbol}`;

      const fiat = formatPrice(
        convertPrice(numericBalance, selectedToken.symbol, "FIAT"),
        "FIAT"
      );

      setTokenBalances((prev) => ({
        ...prev,
        [selectedToken.symbol]: { raw, formatted, fiat },
      }));
    }
  }, [
    currentTokenBalance,
    tokenDecimals,
    selectedToken,
    convertPrice,
    formatPrice,
  ]);

  // Update fiat values for all token balances when currency conversion changes
  useEffect(() => {
    if (Object.keys(tokenBalances).length > 0) {
      setTokenBalances((prev) => {
        const updated = { ...prev };
        Object.keys(updated).forEach((symbol) => {
          const balance = updated[symbol];
          if (balance && balance.raw !== "0") {
            const numericBalance = parseFloat(balance.raw);
            const fiat = formatPrice(
              convertPrice(numericBalance, symbol, "FIAT"),
              "FIAT"
            );
            updated[symbol] = { ...balance, fiat };
          }
        });
        return updated;
      });
    }
  }, [convertPrice, formatPrice]);

  // balance refresh interval
  useEffect(() => {
    // Prevent double initialization
    if (isInitializedRef.current) {
      return;
    }

    if (
      isConnected &&
      address &&
      isCorrectNetwork &&
      connectionCheckRef.current
    ) {
      isInitializedRef.current = true;

      // Clear existing interval
      if (balanceIntervalRef.current) {
        clearInterval(balanceIntervalRef.current);
        balanceIntervalRef.current = null;
      }

      // Initial fetch after a short delay
      const initialTimeout = setTimeout(() => {
        if (mountedRef.current && connectionCheckRef.current) {
          refreshTokenBalance();
          refetchCeloBalance();
        }
      }, 1000);

      // Set interval for 5 minutes
      balanceIntervalRef.current = setInterval(() => {
        if (mountedRef.current && connectionCheckRef.current) {
          refreshTokenBalance();
          refetchCeloBalance();
        }
      }, 300000);

      return () => {
        clearTimeout(initialTimeout);
        if (balanceIntervalRef.current) {
          clearInterval(balanceIntervalRef.current);
          balanceIntervalRef.current = null;
        }
        isInitializedRef.current = false;
      };
    }

    return () => {
      if (balanceIntervalRef.current) {
        clearInterval(balanceIntervalRef.current);
        balanceIntervalRef.current = null;
      }
      isInitializedRef.current = false;
    };
  }, [isConnected, address, isCorrectNetwork]);

  // Fetch balance when selected token changes
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    if (
      selectedToken &&
      address &&
      isCorrectNetwork &&
      connectionCheckRef.current
    ) {
      timeoutId = setTimeout(() => {
        if (mountedRef.current) {
          refreshTokenBalance();
        }
      }, 500);
    }

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [selectedToken?.symbol, address, isCorrectNetwork]);

  // Update wallet state
  useEffect(() => {
    const newWalletState: ExtendedWalletState = {
      isConnected,
      address,
      chainId: chain?.id,
      balance: celoBalance
        ? formatUnits(celoBalance.value, celoBalance.decimals)
        : undefined,
      error: connectError?.message,
      isConnecting: isConnecting,
      selectedToken,
      tokenBalances,
      isLoadingTokenBalance,
    };
    setWallet((prev) => {
      const hasChanged =
        prev.isConnected !== newWalletState.isConnected ||
        prev.address !== newWalletState.address ||
        prev.chainId !== newWalletState.chainId ||
        prev.balance !== newWalletState.balance ||
        prev.error !== newWalletState.error ||
        prev.isConnecting !== newWalletState.isConnecting ||
        prev.selectedToken.symbol !== newWalletState.selectedToken.symbol ||
        prev.isLoadingTokenBalance !== newWalletState.isLoadingTokenBalance ||
        // Object.keys(prev.tokenBalances).length !==
        //   Object.keys(newWalletState.tokenBalances).length;
        JSON.stringify(prev.tokenBalances) !==
          JSON.stringify(newWalletState.tokenBalances);

      return hasChanged ? newWalletState : prev;
    });
  }, [
    isConnected,
    address,
    chain,
    celoBalance,
    connectError,
    isConnecting,
    selectedToken,
    tokenBalances,
    isLoadingTokenBalance,
  ]);

  // Get token allowance
  const getTokenAllowance = useCallback(
    async (tokenSymbol: string): Promise<number> => {
      if (!address || !chain?.id || !isCorrectNetwork) return 0;

      const token = getTokenBySymbol(tokenSymbol);
      if (!token) return 0;

      const tokenAddress = getTokenAddress(token, chain.id);
      const escrowAddress =
        ESCROW_ADDRESSES[chain.id as keyof typeof ESCROW_ADDRESSES];

      if (!tokenAddress || !escrowAddress) return 0;

      try {
        const allowance = await readContract(wagmiConfig, {
          address: tokenAddress as `0x${string}`,
          abi: erc20Abi,
          functionName: "allowance",
          args: [address, escrowAddress as `0x${string}`],
        });

        const formattedAllowance = formatUnits(
          allowance as bigint,
          token.decimals
        );
        return parseFloat(formattedAllowance);
      } catch (error) {
        console.error(`Failed to get ${tokenSymbol} allowance:`, error);
        return 0;
      }
    },
    [address, chain?.id, isCorrectNetwork]
  );

  // Approve token
  const approveToken = useCallback(
    async (tokenSymbol: string, amount: string): Promise<string> => {
      if (!address || !chain?.id) {
        throw new Error("Wallet not connected");
      }

      const token = getTokenBySymbol(tokenSymbol);
      if (!token) {
        throw new Error(`Token ${tokenSymbol} not found`);
      }

      const tokenAddress = getTokenAddress(token, chain.id);
      const escrowAddress =
        ESCROW_ADDRESSES[chain.id as keyof typeof ESCROW_ADDRESSES];

      if (!tokenAddress || !escrowAddress) {
        throw new Error("Contracts not available on this network");
      }

      try {
        const currentAllowance = await getTokenAllowance(tokenSymbol);
        const requiredAmount = parseFloat(amount);

        if (currentAllowance >= requiredAmount) {
          return "0x0"; // Already approved
        }

        const maxApproval = BigInt(
          "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"
        );

        const hash = await writeContractAsync({
          address: tokenAddress as `0x${string}`,
          abi: erc20Abi,
          functionName: "approve",
          args: [escrowAddress as `0x${string}`, maxApproval],
          gas: BigInt(150000),
        });

        return hash;
      } catch (error: any) {
        console.error(`${tokenSymbol} approval failed:`, error);

        if (error?.message?.includes("User rejected")) {
          throw new Error("Approval was rejected by user");
        }
        if (error?.message?.includes("insufficient funds")) {
          throw new Error("Insufficient CELO for gas fees");
        }

        throw new Error(`Approval failed: ${parseWeb3Error(error)}`);
      }
    },
    [address, chain, writeContractAsync, getTokenAllowance]
  );

  // Helper function to convert tokens using Mento SDK
  const convertTokens = useCallback(
    async (
      fromToken: string,
      toToken: string,
      amount: number
    ): Promise<string> => {
      if (!mento?.isReady) {
        throw new Error(
          "Token conversion not available. Please try again later."
        );
      }

      try {
        // First, get a quote to check if conversion is possible
        const quote = await mento.getSwapQuote(fromToken, toToken, amount);

        if (!quote || parseFloat(quote.amountOut) <= 0) {
          throw new Error(
            `No conversion path available from ${fromToken} to ${toToken}`
          );
        }

        // Check if the conversion rate is reasonable (not too much slippage)
        const conversionRate = parseFloat(quote.amountOut) / amount;
        if (conversionRate < 0.5) {
          throw new Error(
            `Conversion rate too low (${(conversionRate * 100).toFixed(
              2
            )}%). This may indicate insufficient liquidity.`
          );
        }

        showSnackbar(
          `Converting ${amount} ${fromToken} to approximately ${parseFloat(
            quote.amountOut
          ).toFixed(6)} ${toToken}...`,
          "info"
        );

        const swapResult = await mento.performSwap({
          fromSymbol: fromToken,
          toSymbol: toToken,
          amount: amount,
          slippageTolerance: 0.01, // 1% slippage
        });

        if (!swapResult.success) {
          throw new Error("Token conversion transaction failed");
        }

        showSnackbar("Token conversion completed successfully!", "success");
        return swapResult.hash;
      } catch (error: any) {
        console.error("Token conversion failed:", error);

        // Provide more specific error messages
        if (error.message?.includes("insufficient balance")) {
          throw new Error(`Insufficient ${fromToken} balance for conversion`);
        } else if (error.message?.includes("slippage")) {
          throw new Error(
            `Price moved too much during conversion. Please try again.`
          );
        } else if (error.message?.includes("liquidity")) {
          throw new Error(
            `Insufficient liquidity for ${fromToken} to ${toToken} conversion`
          );
        } else if (error.message?.includes("user rejected")) {
          throw new Error("Token conversion was cancelled by user");
        } else if (error.message?.includes("network")) {
          throw new Error(
            "Network error during conversion. Please check your connection and try again."
          );
        } else {
          throw new Error(
            `Failed to convert ${fromToken} to ${toToken}: ${
              error.message || "Unknown error"
            }`
          );
        }
      }
    },
    [mento, showSnackbar]
  );

  // buy trade function with token conversion support
  const buyTrade = useCallback(
    async (params: BuyTradeParams): Promise<PaymentTransaction> => {
      if (!address || !chain?.id) {
        throw new Error("Wallet not connected");
      }

      if (!isCorrectNetwork) {
        throw new Error("Please switch to the correct network first");
      }

      const escrowAddress =
        ESCROW_ADDRESSES[chain.id as keyof typeof ESCROW_ADDRESSES];
      if (!escrowAddress) {
        throw new Error("Escrow contract not available on this network");
      }

      try {
        // First, scan user wallet for available stable tokens
        const walletScan = await scanWalletForStableTokens(address, chain.id);

        // Get the required amount
        const requiredAmount = 100;

        // Check if user has sufficient USDT balance
        const balanceCheck = checkSufficientBalance(
          walletScan.availableTokens,
          requiredAmount,
          "USDT"
        );

        let conversionHash: string | undefined;

        if (
          !balanceCheck.hasSufficientBalance &&
          balanceCheck.needsConversion &&
          balanceCheck.conversionRequired
        ) {
          // User needs to convert tokens to USDT
          showSnackbar(
            `Converting ${balanceCheck.conversionRequired.amount} ${balanceCheck.conversionRequired.fromToken} to USDT...`,
            "info"
          );

          try {
            conversionHash = await convertTokens(
              balanceCheck.conversionRequired.fromToken,
              balanceCheck.conversionRequired.toToken,
              balanceCheck.conversionRequired.amount
            );

            showSnackbar("Token conversion completed successfully!", "success");

            // Wait a bit for the conversion to be confirmed
            await new Promise((resolve) => setTimeout(resolve, 3000));

            // Refresh token balances after conversion
            await refreshTokenBalance("USDT");
          } catch (conversionError: any) {
            console.error("Token conversion failed:", conversionError);

            // Provide more specific error messages based on the conversion error
            let errorMessage = "Token conversion failed. ";

            if (conversionError.message?.includes("insufficient balance")) {
              errorMessage += "You don't have enough tokens to convert.";
            } else if (conversionError.message?.includes("liquidity")) {
              errorMessage +=
                "Insufficient liquidity for this conversion. Please try a smaller amount or different tokens.";
            } else if (conversionError.message?.includes("slippage")) {
              errorMessage +=
                "Price moved too much during conversion. Please try again.";
            } else if (conversionError.message?.includes("user rejected")) {
              errorMessage += "Conversion was cancelled. Please try again.";
            } else if (conversionError.message?.includes("network")) {
              errorMessage +=
                "Network error. Please check your connection and try again.";
            } else {
              errorMessage +=
                conversionError.message ||
                "Please ensure you have sufficient balance and try again.";
            }

            throw new Error(errorMessage);
          }
        } else if (!balanceCheck.hasSufficientBalance) {
          throw new Error(
            `Insufficient balance. You need at least ${requiredAmount} USDT to complete this purchase.`
          );
        }

        const tradeId = BigInt(params.tradeId);
        const quantity = BigInt(params.quantity);
        const logisticsProvider = params.logisticsProvider as `0x${string}`;

        if (
          !logisticsProvider?.startsWith("0x") ||
          logisticsProvider.length !== 42
        ) {
          throw new Error("Invalid logistics provider address");
        }

        // Generate referral tag if Divvi is ready
        let referralTag = "";
        if (divvi.isReady) {
          try {
            const tag = divvi.generateReferralTag({
              user: address,
              consumer: ensure0xPrefix(
                `${import.meta.env.VITE_DIVVI_CONSUMER_ADDRESS!}`
              ),
              // providers: [logisticsProvider],
              providers: [],
            });
            referralTag = tag || "";
          } catch (tagError) {
            console.warn("Failed to generate referral tag:", tagError);
          }
        }

        // Estimate gas first
        let gasEstimate: bigint;
        try {
          const { request } = await simulateContract(wagmiConfig, {
            address: escrowAddress as `0x${string}`,
            abi: DEZENMART_ABI,
            functionName: "buyTrade",
            args: [tradeId, quantity, logisticsProvider],
            account: address,
          });

          gasEstimate = request.gas
            ? (request.gas * BigInt(120)) / BigInt(100)
            : BigInt(800000);
        } catch (estimateError) {
          console.warn("Gas estimation failed, using default:", estimateError);
          gasEstimate = BigInt(800000);
        }

        // Execute transaction with referral tag if available
        const txConfig: any = {
          address: escrowAddress as `0x${string}`,
          abi: DEZENMART_ABI,
          functionName: "buyTrade",
          args: [tradeId, quantity, logisticsProvider],
          gas: gasEstimate,
        };

        // Append referral tag to transaction data if available
        if (referralTag) {
          txConfig.dataSuffix = `0x${referralTag}`;
        }

        const hash = await writeContractAsync(txConfig);

        if (!hash) {
          throw new Error("Transaction failed to execute");
        }

        const receipt = await waitForTransactionReceipt(wagmiConfig, {
          hash,
          timeout: 60000,
        });

        let purchaseId: string | undefined;

        if (receipt.logs) {
          try {
            const decodedLogs = receipt.logs
              .map((log) => {
                try {
                  return decodeEventLog({
                    abi: DEZENMART_ABI,
                    data: log.data,
                    topics: log.topics,
                  });
                } catch {
                  return null;
                }
              })
              .filter(Boolean);

            const purchaseCreatedEvent = decodedLogs.find(
              (event: any) => event?.eventName === "PurchaseCreated"
            );

            if (purchaseCreatedEvent?.args) {
              const args = purchaseCreatedEvent.args as any;
              purchaseId = args.purchaseId?.toString();
            }
          } catch (error) {
            console.warn("Failed to decode event logs:", error);
          }
        }

        // Track with Divvi after successful transaction
        if (receipt.status === "success" && divvi.isReady && referralTag) {
          try {
            await divvi.trackTransaction({
              transactionHash: hash,
              chainId: chain.id,
              user: address,
              consumer: escrowAddress,
              providers: [logisticsProvider],
            });
          } catch (divviError) {
            console.warn("Divvi tracking failed:", divviError);
          }
        }

        // Refresh balance after successful purchase
        setTimeout(() => {
          refreshTokenBalance("USDT");
        }, 2000);

        return {
          hash,
          amount: "0",
          to: escrowAddress,
          from: address,
          token: "USDT", // Always use USDT for purchases
          status: "pending",
          timestamp: Date.now(),
          purchaseId,
          conversionHash, // Include conversion hash if token was converted
        };
      } catch (error: any) {
        console.error("Buy trade failed:", error);

        const errorMessage = error?.message || error?.toString() || "";

        if (
          errorMessage.includes(`Insufficient${selectedToken.symbol}Balance`)
        ) {
          throw new Error(
            `Insufficient ${selectedToken.symbol} balance for this purchase`
          );
        }
        if (
          errorMessage.includes(`Insufficient${selectedToken.symbol}Allowance`)
        ) {
          throw new Error(
            `${selectedToken.symbol} allowance insufficient. Please approve the amount first`
          );
        }
        if (
          errorMessage.includes("InvalidTradeId") ||
          errorMessage.includes("Trade not found")
        ) {
          throw new Error(
            "Invalid trade ID. This product may no longer be available"
          );
        }
        if (errorMessage.includes("InsufficientQuantity")) {
          throw new Error("Requested quantity exceeds available stock");
        }
        if (
          errorMessage.includes("User rejected") ||
          errorMessage.includes("user rejected")
        ) {
          throw new Error("Transaction was rejected by user");
        }
        if (errorMessage.includes("Internal JSON-RPC error")) {
          throw new Error(
            "Network error. Please check your connection and try again"
          );
        }
        if (errorMessage.includes("gas")) {
          throw new Error(
            "Transaction failed due to gas issues. Please try again"
          );
        }

        throw new Error("Transaction failed. Please try again.");
      }
    },
    [
      address,
      chain,
      isCorrectNetwork,
      writeContractAsync,
      refreshTokenBalance,
      divvi,
      convertTokens,
      showSnackbar,
    ]
  );

  // Legacy functions for backward compatibility
  const connectWallet = useCallback(async () => {
    try {
      const connector =
        connectors.find((c) => c.name === "MetaMask") || connectors[0];
      if (connector) {
        connect({ connector });
      }
    } catch (error) {
      console.error("Failed to connect wallet:", error);
      showSnackbar("Failed to connect wallet. Please try again.", "error");
    }
  }, [connect, connectors, showSnackbar]);

  const disconnectWallet = useCallback(() => {
    disconnect();
    // Clear intervals on disconnect
    if (balanceIntervalRef.current) {
      clearInterval(balanceIntervalRef.current);
    }
    // Clear cached fetch times
    lastFetchRef.current = {};
    showSnackbar("Wallet disconnected", "success");
  }, [disconnect, showSnackbar]);

  const switchToCorrectNetwork = useCallback(async () => {
    try {
      await switchChain({ chainId: TARGET_CHAIN.id });
      showSnackbar(`Switched to ${TARGET_CHAIN.name}`, "success");
    } catch (error) {
      console.error("Failed to switch network:", error);
      showSnackbar(`Failed to switch to ${TARGET_CHAIN.name}`, "error");
      throw error;
    }
  }, [switchChain, showSnackbar]);

  const validateTradeBeforePurchase = useCallback(
    async (tradeId: string, quantity: string, logisticsProvider: string) => {
      if (!address || !chain?.id) {
        console.warn("Wallet not connected for trade validation");
        return false;
      }

      const escrowAddress =
        ESCROW_ADDRESSES[chain.id as keyof typeof ESCROW_ADDRESSES];
      if (!escrowAddress) {
        console.warn("Escrow contract not available on this network");
        return false;
      }

      try {
        const tradeDetails = (await readContract(wagmiConfig, {
          address: escrowAddress as `0x${string}`,
          abi: DEZENMART_ABI,
          functionName: "getTrade",
          args: [BigInt(tradeId)],
        })) as {
          active: boolean;
          remainingQuantity: bigint;
          logisticsProviders: string[];
        };

        if (!tradeDetails.active) {
          console.warn(`Trade ${tradeId} is not active`);
          return false;
        }

        if (tradeDetails.remainingQuantity < BigInt(quantity)) {
          console.warn(
            `Insufficient quantity for trade ${tradeId}. Available: ${tradeDetails.remainingQuantity}, Requested: ${quantity}`
          );
          return false;
        }

        if (!tradeDetails.logisticsProviders.includes(logisticsProvider)) {
          console.warn(
            `Logistics provider ${logisticsProvider} not available for trade ${tradeId}`
          );
          return false;
        }

        return true;
      } catch (error: any) {
        if (error?.message?.includes("TradeNotFound")) {
          console.warn(`Trade ${tradeId} not found in contract`);
        } else {
          console.error("Trade validation failed:", error);
        }
        return false;
      }
    },
    [address, chain]
  );

  // Legacy USDT functions for backward compatibility
  const getUSDTBalance = useCallback(async (): Promise<string> => {
    const usdtBalance = tokenBalances["USDT"];
    return usdtBalance?.raw || "0";
  }, [tokenBalances]);

  const getCurrentAllowance = useCallback(async (): Promise<number> => {
    return getTokenAllowance("USDT");
  }, [getTokenAllowance]);

  const approveUSDT = useCallback(
    async (amount: string): Promise<string> => {
      return approveToken("USDT", amount);
    },
    [approveToken]
  );

  const sendPayment = useCallback(
    async (params: PaymentParams): Promise<PaymentTransaction> => {
      if (!address || !chain?.id) {
        throw new Error("Wallet not connected");
      }

      if (!isCorrectNetwork) {
        try {
          await switchToCorrectNetwork();
          await new Promise((resolve) => setTimeout(resolve, 1000));
        } catch (error) {
          throw new Error("Please switch to the correct network first");
        }
      }

      const token = getTokenBySymbol(selectedToken.symbol);
      if (!token) {
        throw new Error(`Selected token ${selectedToken.symbol} not found`);
      }

      const tokenAddress = getTokenAddress(token, chain.id);
      if (!tokenAddress) {
        throw new Error(
          `${selectedToken.symbol} not supported on this network`
        );
      }

      try {
        const amount = parseUnits(params.amount, token.decimals);

        const hash = await writeContractAsync({
          address: tokenAddress as `0x${string}`,
          abi: erc20Abi,
          functionName: "transfer",
          args: [params.to as `0x${string}`, amount],
        });

        const transaction: PaymentTransaction = {
          hash,
          amount: params.amount,
          token: selectedToken.symbol,
          to: params.to,
          from: address,
          status: "pending",
          timestamp: Date.now(),
        };

        showSnackbar("Payment sent! Waiting for confirmation...", "success");

        // Refresh balance after payment
        setTimeout(() => {
          refreshTokenBalance(selectedToken.symbol);
        }, 2000);

        return transaction;
      } catch (error) {
        console.error("Payment failed:", error);
        showSnackbar("Payment failed. Please try again.", "error");
        throw error;
      }
    },
    [
      address,
      chain,
      isCorrectNetwork,
      selectedToken,
      switchToCorrectNetwork,
      writeContractAsync,
      showSnackbar,
      refreshTokenBalance,
    ]
  );

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;

      // Cancel debounced function
      debouncedFetchBalance.cancel();

      // Clear all intervals
      if (balanceIntervalRef.current) {
        clearInterval(balanceIntervalRef.current);
        balanceIntervalRef.current = null;
      }

      // Clear all in-progress refreshes
      refreshInProgressRef.current.clear();

      // Clear fetch timestamps
      lastFetchRef.current = {};

      // Reset initialization flag
      isInitializedRef.current = false;
    };
  }, [debouncedFetchBalance]);

  useEffect(() => {
    return () => {
      debouncedFetchBalance.cancel();
      refreshInProgressRef.current.clear();
    };
  }, [debouncedFetchBalance]);

  const value: ExtendedWeb3ContextType = useMemo(
    () => ({
      wallet,
      mento: mento.isReady ? mento : undefined,
      connectWallet,
      disconnectWallet,
      switchToCorrectNetwork,
      sendPayment,

      performSwap: async (
        from: string,
        to: string,
        amount: number
      ): Promise<void> => {
        try {
          await mento.performSwap({
            fromSymbol: from,
            toSymbol: to,
            amount: amount,
          });
        } catch (error) {
          throw error;
        }
      },
      getSwapQuote: async (
        from: string,
        to: string,
        amount: number
      ): Promise<string> => {
        try {
          const quote = await mento.getSwapQuote(from, to, amount);
          return quote?.amountOut || "0";
        } catch (error) {
          throw error;
        }
      },
      initializeMento: mento.initializeMento,
      swapState: {
        isSwapping: mento.isSwapping,
        fromAmount: "",
        toAmount: "",
        error: mento.error,
        isInitializing: mento.isInitializing,
      },
      usdtAllowance,
      usdtDecimals,
      getCurrentAllowance,
      getUSDTBalance,
      buyTrade,
      approveUSDT,
      validateTradeBeforePurchase,
      isCorrectNetwork,
      setSelectedToken,
      refreshTokenBalance,
      availableTokens,
      approveToken,
      getTokenAllowance,
      divvi,
    }),
    [
      wallet,
      mento,
      connectWallet,
      disconnectWallet,
      switchToCorrectNetwork,
      sendPayment,
      buyTrade,
      getTokenAllowance,
      availableTokens,
      setSelectedToken,
      usdtAllowance,
      usdtDecimals,
      getCurrentAllowance,
      getUSDTBalance,
      buyTrade,
      approveUSDT,
      validateTradeBeforePurchase,
      isCorrectNetwork,
      divvi,
    ]
  );

  return <Web3Context.Provider value={value}>{children}</Web3Context.Provider>;
};

export const useWeb3 = () => {
  const context = useContext(Web3Context);
  if (context === undefined) {
    throw new Error("useWeb3 must be used within a Web3Provider");
  }
  return context;
};
