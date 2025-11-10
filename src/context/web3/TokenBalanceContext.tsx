import React, { createContext, useContext, useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useReadContract } from 'wagmi';
import { erc20Abi, formatUnits } from 'viem';
import { useWallet } from './WalletContext';
import { getTokenAddress, STABLE_TOKENS } from '../../utils/config/web3.config';
import { useCurrencyConverter } from '../../utils/hooks/useCurrencyConverter';

interface TokenBalance {
  raw: string;
  formatted: string;
  fiat: string;
}

interface BalanceCache {
  [key: string]: {
    data: TokenBalance;
    timestamp: number;
  };
}

interface TokenBalanceContextType {
  // Current token balance
  currentTokenBalance: bigint | undefined;
  currentTokenDecimals: number | undefined;
  isLoadingCurrentToken: boolean;
  refetchCurrentTokenBalance: () => void;

  // Multi-token balances
  tokenBalances: Record<string, TokenBalance>;
  isLoadingTokenBalance: boolean;
  refreshTokenBalance: (tokenSymbol?: string) => Promise<void>;

  // Available tokens for current chain
  availableTokens: typeof STABLE_TOKENS;
}

const CACHE_DURATION = 240000; // 4 minutes
const BALANCE_FETCH_INTERVAL = 300000; // 5 minutes

const TokenBalanceContext = createContext<TokenBalanceContextType | undefined>(undefined);

export const TokenBalanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { address, chain, isConnected, isCorrectNetwork, selectedToken } = useWallet();
  const { convertPrice, formatPrice } = useCurrencyConverter();

  const [tokenBalances, setTokenBalances] = useState<Record<string, TokenBalance>>({});
  const [isLoadingTokenBalance, setIsLoadingTokenBalance] = useState(false);

  // Cache refs
  const balanceCacheRef = useRef<BalanceCache>({});
  const refreshInProgressRef = useRef<Set<string>>(new Set());
  const lastFetchRef = useRef<Record<string, number>>({});
  const balanceIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Get current token address
  const currentTokenAddress = useMemo(() => {
    if (!chain?.id || !selectedToken) return undefined;
    return getTokenAddress(selectedToken, chain.id) as `0x${string}` | undefined;
  }, [selectedToken, chain?.id]);

  // Available tokens for the current chain
  const availableTokens = useMemo(() => {
    if (!chain?.id) return STABLE_TOKENS;
    return STABLE_TOKENS.filter((token) => token.address[chain.id]);
  }, [chain?.id]);

  // Current token balance
  const {
    data: currentTokenBalance,
    refetch: refetchCurrentTokenBalance,
    isLoading: isLoadingCurrentToken,
  } = useReadContract({
    address: currentTokenAddress,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && !!currentTokenAddress && isCorrectNetwork,
      refetchInterval: BALANCE_FETCH_INTERVAL,
      staleTime: CACHE_DURATION,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  });

  // Current token decimals
  const { data: currentTokenDecimals } = useReadContract({
    address: currentTokenAddress,
    abi: erc20Abi,
    functionName: 'decimals',
    query: {
      enabled: !!currentTokenAddress && isCorrectNetwork,
      staleTime: Infinity, // Decimals never change
      refetchOnWindowFocus: false,
    },
  });

  // Fetch token balance for a specific token
  const fetchTokenBalance = useCallback(
    async (tokenSymbol: string): Promise<TokenBalance | null> => {
      if (!address || !chain?.id) return null;

      const cacheKey = `${tokenSymbol}-${address}`;
      const now = Date.now();

      // Check cache
      const cached = balanceCacheRef.current[cacheKey];
      if (cached && now - cached.timestamp < CACHE_DURATION) {
        return cached.data;
      }

      // Prevent concurrent fetches
      if (refreshInProgressRef.current.has(cacheKey)) {
        return cached?.data || null;
      }

      refreshInProgressRef.current.add(cacheKey);

      try {
        const token = STABLE_TOKENS.find((t) => t.symbol === tokenSymbol);
        if (!token) return null;

        const tokenAddress = getTokenAddress(token, chain.id);
        if (!tokenAddress) return null;

        // Fetch balance using viem/wagmi
        const { readContract } = await import('@wagmi/core');
        const { wagmiConfig } = await import('../../utils/config/web3.config');

        const [balance, decimals] = await Promise.all([
          readContract(wagmiConfig, {
            address: tokenAddress as `0x${string}`,
            abi: erc20Abi,
            functionName: 'balanceOf',
            args: [address],
          }),
          readContract(wagmiConfig, {
            address: tokenAddress as `0x${string}`,
            abi: erc20Abi,
            functionName: 'decimals',
          }),
        ]);

        const formatted = formatUnits(balance as bigint, decimals as number);
        const fiat = await convertPrice(parseFloat(formatted), tokenSymbol, 'USD');

        const balanceData: TokenBalance = {
          raw: (balance as bigint).toString(),
          formatted,
          fiat: formatPrice(fiat, 'USD'),
        };

        // Update cache
        balanceCacheRef.current[cacheKey] = {
          data: balanceData,
          timestamp: now,
        };
        lastFetchRef.current[tokenSymbol] = now;

        return balanceData;
      } catch (error) {
        console.error(`[TokenBalance] Error fetching ${tokenSymbol}:`, error);
        return null;
      } finally {
        refreshInProgressRef.current.delete(cacheKey);
      }
    },
    [address, chain?.id, convertPrice, formatPrice]
  );

  // Refresh token balance(s)
  const refreshTokenBalance = useCallback(
    async (tokenSymbol?: string) => {
      if (!address || !chain?.id) return;

      setIsLoadingTokenBalance(true);

      try {
        if (tokenSymbol) {
          // Refresh single token
          const balance = await fetchTokenBalance(tokenSymbol);
          if (balance) {
            setTokenBalances((prev) => ({
              ...prev,
              [tokenSymbol]: balance,
            }));
          }
        } else {
          // Refresh all available tokens
          const balances = await Promise.all(
            availableTokens.map(async (token) => {
              const balance = await fetchTokenBalance(token.symbol);
              return { symbol: token.symbol, balance };
            })
          );

          const newBalances: Record<string, TokenBalance> = {};
          balances.forEach(({ symbol, balance }) => {
            if (balance) {
              newBalances[symbol] = balance;
            }
          });

          setTokenBalances(newBalances);
        }
      } finally {
        setIsLoadingTokenBalance(false);
      }
    },
    [address, chain?.id, availableTokens, fetchTokenBalance]
  );

  // Auto-refresh balances on interval
  useEffect(() => {
    if (!isConnected || !address) return;

    // Initial fetch
    refreshTokenBalance();

    // Set up interval
    balanceIntervalRef.current = setInterval(() => {
      refreshTokenBalance();
    }, BALANCE_FETCH_INTERVAL);

    return () => {
      if (balanceIntervalRef.current) {
        clearInterval(balanceIntervalRef.current);
      }
    };
  }, [isConnected, address, refreshTokenBalance]);

  // Clear cache on disconnect
  useEffect(() => {
    if (!isConnected) {
      balanceCacheRef.current = {};
      lastFetchRef.current = {};
      setTokenBalances({});
    }
  }, [isConnected]);

  const value = useMemo(
    () => ({
      currentTokenBalance,
      currentTokenDecimals: currentTokenDecimals as number | undefined,
      isLoadingCurrentToken,
      refetchCurrentTokenBalance,
      tokenBalances,
      isLoadingTokenBalance,
      refreshTokenBalance,
      availableTokens,
    }),
    [
      currentTokenBalance,
      currentTokenDecimals,
      isLoadingCurrentToken,
      refetchCurrentTokenBalance,
      tokenBalances,
      isLoadingTokenBalance,
      refreshTokenBalance,
      availableTokens,
    ]
  );

  return <TokenBalanceContext.Provider value={value}>{children}</TokenBalanceContext.Provider>;
};

export const useTokenBalance = () => {
  const context = useContext(TokenBalanceContext);
  if (!context) {
    throw new Error('useTokenBalance must be used within TokenBalanceProvider');
  }
  return context;
};

TokenBalanceProvider.displayName = 'TokenBalanceProvider';
