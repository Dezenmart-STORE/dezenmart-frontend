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
  type Connector,
} from "wagmi";
import {
  parseUnits,
  formatUnits,
  erc20Abi,
  decodeEventLog,
  WalletClient,
  type Log,
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
import { DEZENMART_ABI } from "../utils/abi/dezenmartAbi";
import { ESCROW_ADDRESSES } from "../utils/config/web3.config";
import { parseWeb3Error } from "../utils/errorParser";
import {
  parseSwapError,
  logSwapError,
  formatSwapError,
} from "../utils/swapErrorHandler";
// import { Mento } from "@mento-protocol/mento-sdk";
import { useUniswap } from "../utils/hooks/useUniswap";
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
  getTradeTokenInfo: (tradeId: string) => Promise<{ tokenAddress: string; tokenSymbol: string } | null>;
  approveToken: (tokenSymbol: string, amount: string, useUnlimited?: boolean) => Promise<string>;
  getTokenAllowance: (tokenSymbol: string) => Promise<number>;
  setSelectedToken: (token: StableToken) => void;
  refreshTokenBalance: (tokenSymbol?: string) => Promise<void>;
  availableTokens: StableToken[];
  usdtAllowance: bigint | undefined;
  usdtDecimals: number | undefined;
  approveUSDT: (amount: string) => Promise<string>;
  walletClient?: WalletClient;
  chainId?: number;
  // mento?: ReturnType<typeof useMento>;
  uniswap?: ReturnType<typeof useUniswap>;
  swapState: SwapState;
  performSwap: (from: string, to: string, amount: number) => Promise<void>;
  getSwapQuote: (from: string, to: string, amount: number) => Promise<string>;
  // initializeMento: () => Promise<boolean>;
  initializeUniswap: () => Promise<boolean>;
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

export const Web3Context = createContext<ExtendedWeb3ContextType | undefined>(
  undefined
);

export const Web3Provider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { showSnackbar } = useSnackbar();
  const { address, isConnected, chain } = useAccount();

  // connection status ref to prevent redundant checks
  const connectionCheckRef = useRef<boolean>(false);
  const mountedRef = useRef<boolean>(true);
  // const { data: walletClient } = useWalletClient();
  // const publicClient = usePublicClient();
  // const chainId = useChainId();
  const uniswap = useUniswap();
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
      console.log("Wallet connected:", address);
      connectionCheckRef.current = true;
    } else if (!isConnected) {
      console.log("Wallet disconnected");
      connectionCheckRef.current = false;
      // Clear all cached data
      balanceCacheRef.current = {};
      lastFetchRef.current = {};
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
    async (tokenSymbol: string, amount: string, useUnlimited: boolean = false): Promise<string> => {
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

        let approvalAmount: bigint;

        if (useUnlimited) {
          // Unlimited approval - max uint256
          // This is common practice (Uniswap, Aave use this) and reduces future approvals to zero
          approvalAmount = BigInt("115792089237316195423570985008687907853269984665640564039457584007913129639935");
          console.log(`🔓 Approving unlimited ${tokenSymbol} for escrow contract`);
        } else {
          // Approve exact amount + 5% buffer
          // This limits exposure if the contract is compromised
          const amountBigInt = parseUnits(amount, token.decimals ?? 18);
          const bufferMultiplier = BigInt(105); // 105% (5% buffer)
          approvalAmount = (amountBigInt * bufferMultiplier) / BigInt(100);
          console.log(`🔒 Approving ${formatUnits(approvalAmount, token.decimals)} ${tokenSymbol} for escrow contract`);
        }

        const hash = await writeContractAsync({
          address: tokenAddress as `0x${string}`,
          abi: erc20Abi,
          functionName: "approve",
          args: [escrowAddress as `0x${string}`, approvalAmount],
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

  // Helper function to convert tokens using Uniswao SDK
  // Helper function to determine which protocol to use for a swap
  const shouldUseMento = useCallback((from: string, to: string): boolean => {
    // Mento is optimized for these Celo native stablecoin pairs
    const mentoPairs = [
      "cUSD-cEUR",
      "cEUR-cUSD",
      "cUSD-cREAL",
      "cREAL-cUSD",
      "cUSD-cKES",
      "cKES-cUSD",
      "cEUR-cREAL",
      "cREAL-cEUR",
      "cEUR-cKES",
      "cKES-cEUR",
      "cREAL-cKES",
      "cKES-cREAL",
    ];
    const pair = `${from}-${to}`;
    return mentoPairs.includes(pair);
  }, []);

  const convertTokens = useCallback(
    async (
      fromToken: string,
      toToken: string,
      amount: number,
      preferredProtocol?: "mento" | "uniswap"
    ): Promise<string> => {
      // Determine which protocol to use
      let useMentoProtocol = shouldUseMento(fromToken, toToken);

      // Override with preferred protocol if specified
      if (preferredProtocol) {
        useMentoProtocol = preferredProtocol === "mento";
      }

      const protocol = useMentoProtocol ? mento : uniswap;
      const protocolName = useMentoProtocol ? "Mento" : "Uniswap";

      // Check if the selected protocol is ready
      if (!protocol?.isReady) {
        // Try to fallback to the other protocol
        const fallbackProtocol = useMentoProtocol ? uniswap : mento;
        const fallbackName = useMentoProtocol ? "Uniswap" : "Mento";

        if (fallbackProtocol?.isReady && !preferredProtocol) {
          console.log(
            `${protocolName} not ready, falling back to ${fallbackName}`
          );
          const fallbackPreference = useMentoProtocol ? "uniswap" : "mento";
          return convertTokens(fromToken, toToken, amount, fallbackPreference);
        }

        throw new Error(
          "Token conversion not available. Please try again later."
        );
      }

      try {
        // First, get a quote to check if conversion is possible
        const quote = await protocol.getSwapQuote(fromToken, toToken, amount);

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
          ).toFixed(6)} ${toToken} via ${protocolName}...`,
          "info"
        );

        const swapResult = await protocol.performSwap({
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
        logSwapError(error, `convertTokens-${protocolName}`, {
          fromToken,
          toToken,
          amount,
        });
        const swapError = parseSwapError(error);
        showSnackbar(formatSwapError(error), "error");
        throw swapError;
      }
    },
    [shouldUseMento, mento, uniswap, showSnackbar]
  );

  // buy trade function
  const buyTrade = useCallback(
    async (params: BuyTradeParams): Promise<PaymentTransaction> => {
      console.log('🟢 [Web3Context] buyTrade function called with params:', params);

      if (!address || !chain?.id) {
        console.error('❌ [Web3Context] Wallet not connected', { address, chainId: chain?.id });
        throw new Error("Wallet not connected");
      }

      console.log('✅ [Web3Context] Wallet connected:', { address, chainId: chain.id });

      if (!isCorrectNetwork) {
        console.error('❌ [Web3Context] Wrong network');
        throw new Error("Please switch to the correct network first");
      }

      console.log('✅ [Web3Context] Correct network confirmed');

      const escrowAddress =
        ESCROW_ADDRESSES[chain.id as keyof typeof ESCROW_ADDRESSES];
      if (!escrowAddress) {
        console.error('❌ [Web3Context] Escrow contract not found for chain:', chain.id);
        throw new Error("Escrow contract not available on this network");
      }

      console.log('✅ [Web3Context] Escrow address:', escrowAddress);

      try {
        // Get the payment token (default to USDT for backward compatibility)
        const paymentTokenSymbol = params.paymentToken || "USDT";
        console.log('💰 [Web3Context] Payment token symbol:', paymentTokenSymbol);

        // Use the totalTokenAmount passed from PaymentModal (already calculated correctly)
        const requiredAmount = params.totalTokenAmount;

        if (!requiredAmount || requiredAmount <= 0) {
          throw new Error('Invalid totalTokenAmount - must be provided by PaymentModal');
        }

        console.log('💵 [Web3Context] Using totalTokenAmount from PaymentModal:', {
          requiredAmount,
          paymentTokenSymbol,
          productCostUSD: params.productCost,
          logisticsCostUSD: params.logisticsCost,
          quantity: params.quantity,
        });

        // First, scan user wallet for available stable tokens
        console.log('🔍 [Web3Context] Scanning wallet for stable tokens...');
        const walletScan = await scanWalletForStableTokens(address, chain.id);
        console.log('✅ [Web3Context] Wallet scan complete:', walletScan);

        // Check if user has sufficient balance in the payment token
        console.log('🔍 [Web3Context] Checking balance...');
        const balanceCheck = checkSufficientBalance(
          walletScan.availableTokens,
          requiredAmount,
          paymentTokenSymbol
        );
        console.log('✅ [Web3Context] Balance check result:', balanceCheck);

        let conversionHash: string | undefined;

        if (
          !balanceCheck.hasSufficientBalance &&
          balanceCheck.needsConversion &&
          balanceCheck.conversionRequired
        ) {
          // User needs to convert tokens to the payment token
          showSnackbar(
            `Converting ${balanceCheck.conversionRequired.amount.toFixed(4)} ${
              balanceCheck.conversionRequired.fromToken
            } to ${paymentTokenSymbol}...`,
            "info"
          );

          try {
            conversionHash = await convertTokens(
              balanceCheck.conversionRequired.fromToken,
              paymentTokenSymbol,
              balanceCheck.conversionRequired.amount
            );

            showSnackbar("Token conversion completed successfully!", "success");

            // Wait for conversion to be confirmed
            await new Promise((resolve) => setTimeout(resolve, 3000));

            // Update selected token to the payment token after swap
            const paymentToken = getTokenBySymbol(paymentTokenSymbol);
            if (paymentToken) {
              setSelectedTokenState(paymentToken);
              localStorage.setItem("selectedToken", JSON.stringify(paymentToken));
              console.log(`✅ [Web3Context] Switched selected token to ${paymentTokenSymbol} after swap`);
            }

            // Refresh payment token balance after conversion
            await refreshTokenBalance(paymentTokenSymbol);

            // Re-verify balance after conversion
            const updatedWalletScan = await scanWalletForStableTokens(
              address,
              chain.id
            );
            const updatedBalanceCheck = checkSufficientBalance(
              updatedWalletScan.availableTokens,
              requiredAmount,
              paymentTokenSymbol
            );

            if (!updatedBalanceCheck.hasSufficientBalance) {
              throw new Error(
                `Insufficient balance after conversion. Required: ${requiredAmount.toFixed(
                  2
                )} ${paymentTokenSymbol}`
              );
            }
          } catch (conversionError: any) {
            console.error("Token conversion failed:", conversionError);

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
            `Insufficient balance. You need at least ${requiredAmount.toFixed(
              2
            )} ${paymentTokenSymbol} to complete this purchase.`
          );
        }

        const tradeId = BigInt(params.tradeId);
        const quantityBigInt = BigInt(params.quantity);
        const logisticsProvider = params.logisticsProvider as `0x${string}`;
        const logisticsCostBigInt = BigInt(params.logisticsCost || "0");

        if (
          !logisticsProvider?.startsWith("0x") ||
          logisticsProvider.length !== 42
        ) {
          throw new Error("Invalid logistics provider address");
        }

        console.log('📦 [Web3Context] Logistics parameters:', {
          logisticsProvider,
          logisticsCost: params.logisticsCost,
          logisticsCostBigInt: logisticsCostBigInt.toString(),
        });

        // Generate referral tag if Divvi is ready
        let referralTag = "";
        if (divvi.isReady) {
          try {
            const tag = divvi.generateReferralTag({
              user: address,
              consumer: ensure0xPrefix(
                `${import.meta.env.VITE_DIVVI_CONSUMER_ADDRESS!}`
              ),
              providers: [],
            });
            referralTag = tag || "";
          } catch (tagError) {
            console.warn("Failed to generate referral tag:", tagError);
          }
        }

        // Verify payment token configuration
        console.log('🔍 [Web3Context] Finding payment token configuration...');
        const paymentToken = STABLE_TOKENS.find((t) => t.symbol === paymentTokenSymbol);
        if (!paymentToken) {
          console.error('❌ [Web3Context] Payment token not found:', paymentTokenSymbol);
          throw new Error(`${paymentTokenSymbol} token configuration not found`);
        }
        console.log('✅ [Web3Context] Payment token found:', paymentToken);

        // NOTE: PaymentModal has already handled token approval before calling buyTrade
        // We're just verifying the allowance here for safety
        console.log('🔍 [Web3Context] Verifying token allowance (approval handled by PaymentModal)...');
        const currentAllowance = await getTokenAllowance(paymentTokenSymbol);
        console.log('✅ [Web3Context] Current allowance:', currentAllowance, 'required:', requiredAmount);

        if (currentAllowance < requiredAmount) {
          console.error('❌ [Web3Context] Insufficient allowance detected!');
          throw new Error(
            `Insufficient ${paymentTokenSymbol} allowance. This should have been handled by PaymentModal. ` +
            `Current: ${currentAllowance}, Required: ${requiredAmount}`
          );
        } else {
          console.log('✅ [Web3Context] Sufficient allowance confirmed');
        }

        // Estimate gas first
        let gasEstimate: bigint;
        console.log('⛽ [Web3Context] Estimating gas...');
        try {
          console.log('🔍 [Web3Context] Simulating contract with args:', {
            tradeId: tradeId.toString(),
            quantity: quantityBigInt.toString(),
            logisticsProvider,
            logisticsCost: logisticsCostBigInt.toString(),
          });

          const { request } = await simulateContract(wagmiConfig, {
            address: escrowAddress as `0x${string}`,
            abi: DEZENMART_ABI,
            functionName: "buyTrade",
            args: [tradeId, quantityBigInt, logisticsProvider, logisticsCostBigInt],
            account: address,
          });

          gasEstimate = request.gas
            ? (request.gas * BigInt(120)) / BigInt(100)
            : BigInt(800000);
          console.log('✅ [Web3Context] Gas estimate:', gasEstimate.toString());
        } catch (estimateError) {
          console.warn("⚠️ [Web3Context] Gas estimation failed, using default:", estimateError);
          console.error("⚠️ [Web3Context] Gas estimation error details:", {
            message: (estimateError as any).message,
            code: (estimateError as any).code,
            reason: (estimateError as any).reason,
          });
          gasEstimate = BigInt(800000);
        }

        // Execute transaction with referral tag if available
        const txConfig: any = {
          address: escrowAddress as `0x${string}`,
          abi: DEZENMART_ABI,
          functionName: "buyTrade",
          args: [tradeId, quantityBigInt, logisticsProvider, logisticsCostBigInt],
          gas: gasEstimate,
        };

        // Append referral tag to transaction data if available
        if (referralTag) {
          console.log('🏷️ [Web3Context] Adding referral tag:', referralTag);
          txConfig.dataSuffix = `0x${referralTag}`;
        }

        console.log('🚀 [Web3Context] Executing buyTrade transaction...');
        console.log('🚀 [Web3Context] Transaction config:', {
          address: txConfig.address,
          functionName: txConfig.functionName,
          args: txConfig.args.map((arg: any) => arg.toString()),
          gas: txConfig.gas.toString(),
        });

        const hash = await writeContractAsync(txConfig);
        console.log('✅ [Web3Context] Transaction hash received:', hash);

        if (!hash) {
          console.error('❌ [Web3Context] No transaction hash received');
          throw new Error("Transaction failed to execute");
        }

        console.log('⏳ [Web3Context] Waiting for transaction receipt...');
        const receipt = await waitForTransactionReceipt(wagmiConfig, {
          hash,
          timeout: 60000,
        });
        console.log('✅ [Web3Context] Transaction receipt:', receipt);

        let purchaseId: string | undefined;

        if (receipt.logs) {
          try {
            const decodedLogs = receipt.logs
              .map((log: Log) => {
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
          refreshTokenBalance(paymentTokenSymbol);
        }, 2000);

        return {
          hash,
          amount: requiredAmount.toString(),
          to: escrowAddress,
          from: address,
          token: paymentTokenSymbol,
          status: "pending",
          timestamp: Date.now(),
          purchaseId,
          conversionHash,
        };
      } catch (error: any) {
        console.error("Buy trade failed:", error);

        const errorMessage = error?.message || error?.toString() || "";

        if (errorMessage.includes("InsufficientUSDTBalance") || errorMessage.includes("Insufficient") && errorMessage.includes("Balance")) {
          throw new Error(`Insufficient ${params.paymentToken || "USDT"} balance for this purchase`);
        }
        if (errorMessage.includes("InsufficientUSDTAllowance") || errorMessage.includes("Insufficient") && errorMessage.includes("Allowance")) {
          throw new Error(
            `${params.paymentToken || "USDT"} allowance insufficient. Please approve the amount first`
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
      getTokenAllowance,
      approveToken,
    ]
  );

  // Legacy functions for backward compatibility
  const connectWallet = useCallback(
    async (connectorName?: string) => {
      try {
        // If a specific connector is provided, use it
        // Otherwise, intelligently select based on device and available wallets
        let connector;

        if (connectorName) {
          connector = connectors.find(
            (c: Connector) => c.name === connectorName
          );
        } else {
          // Auto-detect best connector for the user's device
          const isMobile =
            /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
              navigator.userAgent
            );

          if (isMobile) {
            // On mobile, prefer WalletConnect for better compatibility with mobile wallets
            connector =
              connectors.find((c: Connector) =>
                c.name.toLowerCase().includes("walletconnect")
              ) ||
              connectors.find((c: Connector) => c.name === "Coinbase Wallet") ||
              connectors[0];
          } else {
            // On desktop, prefer MetaMask if installed, otherwise Coinbase Wallet
            connector =
              connectors.find((c: Connector) => c.name === "MetaMask") ||
              connectors.find((c: Connector) => c.name === "Coinbase Wallet") ||
              connectors[0];
          }
        }

        if (connector) {
          await connect({ connector });
        } else {
          throw new Error("No wallet connector available");
        }
      } catch (error: any) {
        console.error("Failed to connect wallet:", error);

        // Provide user-friendly error messages
        if (error.message?.includes("User rejected")) {
          showSnackbar("Connection cancelled", "info");
        } else if (error.message?.includes("No wallet connector")) {
          showSnackbar(
            "No wallet found. Please install a wallet extension.",
            "error"
          );
        } else {
          showSnackbar("Failed to connect wallet. Please try again.", "error");
        }
      }
    },
    [connect, connectors, showSnackbar]
  );

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
          tokenAddress: string;
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

        // Check if logistics provider is valid
        if (!logisticsProvider || logisticsProvider === "undefined" || logisticsProvider.trim() === "") {
          console.warn(
            `No logistics provider specified for trade ${tradeId}`
          );
          return false;
        }

        if (!tradeDetails.logisticsProviders.includes(logisticsProvider)) {
          console.warn(
            `Logistics provider ${logisticsProvider} not available for trade ${tradeId}. Available providers:`,
            tradeDetails.logisticsProviders
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

  // Get the token address and symbol from a trade ID
  const getTradeTokenInfo = useCallback(
    async (tradeId: string): Promise<{ tokenAddress: string; tokenSymbol: string } | null> => {
      if (!chain?.id) {
        console.warn("Chain not available");
        return null;
      }

      const escrowAddress =
        ESCROW_ADDRESSES[chain.id as keyof typeof ESCROW_ADDRESSES];
      if (!escrowAddress) {
        console.warn("Escrow contract not available on this network");
        return null;
      }

      try {
        const tradeDetails = (await readContract(wagmiConfig, {
          address: escrowAddress as `0x${string}`,
          abi: DEZENMART_ABI,
          functionName: "getTrade",
          args: [BigInt(tradeId)],
        })) as {
          tokenAddress: string;
        };

        const tokenAddress = tradeDetails.tokenAddress;

        // Find the token by matching its address
        const token = STABLE_TOKENS.find(
          (t) => t.address[chain.id]?.toLowerCase() === tokenAddress.toLowerCase()
        );

        if (!token) {
          console.error(`Token address ${tokenAddress} not found in STABLE_TOKENS configuration`);
          return null;
        }

        return {
          tokenAddress,
          tokenSymbol: token.symbol,
        };
      } catch (error: any) {
        console.error("Failed to get trade token info:", error);
        return null;
      }
    },
    [chain]
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
      // Expose both protocols, prioritizing based on readiness
      mento: mento.isReady ? mento : undefined,
      uniswap: uniswap.isReady ? uniswap : undefined,
      connectWallet,
      disconnectWallet,
      switchToCorrectNetwork,
      sendPayment,

      performSwap: async (
        from: string,
        to: string,
        amount: number
      ): Promise<void> => {
        // Determine which protocol to use
        const useMentoProtocol = shouldUseMento(from, to);
        const protocol = useMentoProtocol ? mento : uniswap;
        const protocolName = useMentoProtocol ? "Mento" : "Uniswap";

        // Check if protocol is ready
        if (!protocol?.isReady) {
          // Try fallback protocol
          const fallbackProtocol = useMentoProtocol ? uniswap : mento;
          const fallbackName = useMentoProtocol ? "Uniswap" : "Mento";

          if (fallbackProtocol?.isReady) {
            console.log(
              `[Web3Context] ${protocolName} not ready, using ${fallbackName} as fallback`
            );
            await fallbackProtocol.performSwap({
              fromSymbol: from,
              toSymbol: to,
              amount: amount,
            });
            return;
          }

          throw new Error(
            "Swap service is currently unavailable. Please try again later."
          );
        }

        try {
          console.log(`[Web3Context] Performing swap via ${protocolName}`);
          await protocol.performSwap({
            fromSymbol: from,
            toSymbol: to,
            amount: amount,
          });
        } catch (error) {
          logSwapError(error, `performSwap-${protocolName}`, {
            from,
            to,
            amount,
          });
          const swapError = parseSwapError(error);
          showSnackbar(formatSwapError(error), "error");
          throw swapError;
        }
      },
      getSwapQuote: async (
        from: string,
        to: string,
        amount: number
      ): Promise<string> => {
        // Determine which protocol to use
        const useMentoProtocol = shouldUseMento(from, to);
        const protocol = useMentoProtocol ? mento : uniswap;
        const protocolName = useMentoProtocol ? "Mento" : "Uniswap";

        // Check if protocol is ready
        if (!protocol?.isReady) {
          // Try fallback protocol
          const fallbackProtocol = useMentoProtocol ? uniswap : mento;
          const fallbackName = useMentoProtocol ? "Uniswap" : "Mento";

          if (fallbackProtocol?.isReady) {
            console.log(
              `[Web3Context] ${protocolName} not ready, using ${fallbackName} for quote`
            );
            const quote = await fallbackProtocol.getSwapQuote(from, to, amount);
            return quote?.amountOut || "0";
          }

          throw new Error(
            "Quote service is currently unavailable. Please try again later."
          );
        }

        try {
          console.log(`[Web3Context] Getting swap quote via ${protocolName}`);
          const quote = await protocol.getSwapQuote(from, to, amount);
          return quote?.amountOut || "0";
        } catch (error) {
          logSwapError(error, `getSwapQuote-${protocolName}`, {
            from,
            to,
            amount,
          });
          const swapError = parseSwapError(error, "quote");
          throw swapError;
        }
      },
      initializeUniswap: uniswap.initializeUniswap,
      swapState: {
        isSwapping: uniswap.isSwapping,
        fromAmount: "",
        toAmount: "",
        error: uniswap.error,
        isInitializing: uniswap.isInitializing,
      },
      usdtAllowance,
      usdtDecimals,
      getCurrentAllowance,
      getUSDTBalance,
      buyTrade,
      approveUSDT,
      validateTradeBeforePurchase,
      getTradeTokenInfo,
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
      uniswap,
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
      approveUSDT,
      validateTradeBeforePurchase,
      getTradeTokenInfo,
      isCorrectNetwork,
      divvi,
      shouldUseMento,
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
