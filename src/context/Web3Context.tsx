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
  createWalletClient,
  custom,
  http,
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
  USDT_ADDRESSES,
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
import { Mento } from "@mento-protocol/mento-sdk";
import {
  readContract,
  simulateContract,
  waitForTransactionReceipt,
} from "@wagmi/core";
import { ethers } from "ethers";

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
  mento?: Mento;
  swapState: SwapState;
  performSwap: (from: string, to: string, amount: number) => Promise<void>;
  getSwapQuote: (from: string, to: string, amount: number) => Promise<string>;
  initializeMento: () => Promise<boolean>;
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
  const { address, isConnected, chain } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const chainId = useChainId();

  // Mento and swap state
  const [mento, setMento] = useState<Mento | undefined>();
  const [swapState, setSwapState] = useState<SwapState>({
    isSwapping: false,
    fromAmount: "",
    toAmount: "",
    error: null,
    isInitializing: false,
  });

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

  // Initialize Mento SDK
  const initializeMento = useCallback(async (): Promise<boolean> => {
    if (!walletClient || !chainId || !address) {
      console.warn(
        "Wallet client, chain ID, or address not available for Mento initialization"
      );
      return false;
    }

    if (mento) {
      return true; // Already initialized
    }

    setSwapState((prev) => ({ ...prev, isInitializing: true, error: null }));

    try {
      // Create ethers provider from viem public client
      const provider = new ethers.providers.Web3Provider(window.ethereum!);
      const ethersSigner = provider.getSigner();

      // Create Mento instance with ethers signer
      const mentoInstance = await Mento.create(ethersSigner);
      setMento(mentoInstance);

      setSwapState((prev) => ({ ...prev, isInitializing: false }));
      return true;
    } catch (error) {
      console.error("Failed to initialize Mento SDK:", error);
      setSwapState((prev) => ({
        ...prev,
        isInitializing: false,
        error: "Failed to initialize swap functionality",
      }));
      return false;
    }
  }, [walletClient, chainId, address, mento]);

  // Initialize Mento when wallet is connected
  useEffect(() => {
    if (isConnected && address && walletClient && chainId) {
      initializeMento();
    } else {
      setMento(undefined);
      setSwapState({
        isSwapping: false,
        fromAmount: "",
        toAmount: "",
        error: null,
        isInitializing: false,
      });
    }
  }, [isConnected, address, walletClient, chainId, initializeMento]);

  const validateTokenPair = useCallback(
    async (fromSymbol: string, toSymbol: string): Promise<boolean> => {
      if (!mento || !chainId) return false;

      const fromToken = STABLE_TOKENS.find((t) => t.symbol === fromSymbol);
      const toToken = STABLE_TOKENS.find((t) => t.symbol === toSymbol);

      if (!fromToken || !toToken) return false;

      const fromAddr = getTokenAddress(fromToken, chainId);
      const toAddr = getTokenAddress(toToken, chainId);

      if (!fromAddr || !toAddr) return false;

      try {
        // Try to get a small quote to validate the pair
        const testAmount = ethers.utils.parseUnits("1", fromToken.decimals);
        await mento.getAmountOut(fromAddr, toAddr, testAmount);
        return true;
      } catch {
        return false;
      }
    },
    [mento, chainId]
  );

  // Get swap quote
  const getSwapQuote = useCallback(
    async (
      fromSymbol: string,
      toSymbol: string,
      amount: number
    ): Promise<string> => {
      if (!mento || !chainId) {
        throw new Error("Swap functionality not ready");
      }

      if (fromSymbol === toSymbol) {
        return amount.toString();
      }

      const fromToken = STABLE_TOKENS.find((t) => t.symbol === fromSymbol);
      const toToken = STABLE_TOKENS.find((t) => t.symbol === toSymbol);

      if (!fromToken || !toToken) {
        throw new Error("Invalid token symbols");
      }

      const fromAddr = getTokenAddress(fromToken, chainId);
      const toAddr = getTokenAddress(toToken, chainId);

      if (!fromAddr || !toAddr) {
        throw new Error("Token addresses not found for current chain");
      }

      const amountIn = ethers.utils.parseUnits(
        amount.toString(),
        fromToken.decimals
      );

      try {
        // Direct pair attempt
        const amountOut = await mento.getAmountOut(fromAddr, toAddr, amountIn);
        return ethers.utils.formatUnits(amountOut, toToken.decimals);
      } catch (directError) {
        console.warn("Direct pair failed, trying via CELO:", directError);

        // Fallback: Route through CELO if it's not one of the tokens
        if (fromSymbol !== "CELO" && toSymbol !== "CELO") {
          try {
            const celoToken = STABLE_TOKENS.find((t) => t.symbol === "CELO");
            if (!celoToken) throw new Error("CELO token not found");

            const celoAddr = getTokenAddress(celoToken, chainId);
            if (!celoAddr) throw new Error("CELO address not found");

            // Step 1: fromToken -> CELO
            const celoAmount = await mento.getAmountOut(
              fromAddr,
              celoAddr,
              amountIn
            );

            // Step 2: CELO -> toToken
            const finalAmount = await mento.getAmountOut(
              celoAddr,
              toAddr,
              celoAmount
            );

            return ethers.utils.formatUnits(finalAmount, toToken.decimals);
          } catch (celoError) {
            console.warn("CELO routing failed:", celoError);
          }
        }

        // Final fallback: Use currency converter for estimation
        const convertedAmount = convertPrice(amount, fromSymbol, toSymbol);
        return convertedAmount.toString();
      }
    },
    [mento, chainId, convertPrice]
  );

  const [wallet, setWallet] = useState<ExtendedWalletState>({
    isConnected: false,
    isConnecting: false,
    selectedToken,
    tokenBalances,
    isLoadingTokenBalance,
  });

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
      refetchInterval: 300000, // 5 minutes
      staleTime: 150000, // 2.5 minutes
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
    },
  });

  // Legacy USDT support
  const usdtContractAddress = useMemo(() => {
    if (!address || !chain?.id) return undefined;
    const contractAddr =
      USDT_ADDRESSES[chain.id as keyof typeof USDT_ADDRESSES];
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
    },
  });

  const { data: usdtDecimals } = useReadContract({
    address: usdtContractAddress,
    abi: erc20Abi,
    functionName: "decimals",
    query: {
      enabled: !!usdtContractAddress && isCorrectNetwork,
      staleTime: Infinity,
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

        const fiat = formatPrice(
          convertPrice(numericBalance, token.symbol, "FIAT"),
          "FIAT"
        );

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
    [address, chain?.id, isCorrectNetwork, convertPrice, formatPrice]
  );
  // Debounced balance fetching
  const debouncedFetchBalance = useCallback(
    debounce(async (tokenSymbol: string) => {
      if (refreshInProgressRef.current.has(tokenSymbol)) {
        return;
      }

      refreshInProgressRef.current.add(tokenSymbol);

      try {
        const token = getTokenBySymbol(tokenSymbol);
        if (!token) return;

        const balance = await fetchTokenBalance(token);
        if (balance) {
          setTokenBalances((prev) => ({
            ...prev,
            [token.symbol]: balance,
          }));

          // Update cache
          balanceCacheRef.current[tokenSymbol] = {
            data: balance,
            timestamp: Date.now(),
          };
        }
      } finally {
        refreshInProgressRef.current.delete(tokenSymbol);
        setIsLoadingTokenBalance(false);
      }
    }, 300),
    [fetchTokenBalance]
  );
  // Refresh token balance
  const refreshTokenBalance = useCallback(
    async (tokenSymbol?: string) => {
      if (!address || !isCorrectNetwork) return;

      const targetSymbol = tokenSymbol || selectedToken.symbol;

      // Check if already refreshing
      if (refreshInProgressRef.current.has(targetSymbol)) {
        return;
      }

      setIsLoadingTokenBalance(true);
      debouncedFetchBalance(targetSymbol);
    },
    [address, isCorrectNetwork, selectedToken.symbol, debouncedFetchBalance]
  );

  // performSwap function
  const performSwap = useCallback(
    async (fromSymbol: string, toSymbol: string, amount: number) => {
      if (!mento || !chainId || !address) {
        throw new Error("Swap functionality not ready");
      }

      if (fromSymbol === toSymbol) {
        throw new Error("Cannot swap same token");
      }

      const fromToken = STABLE_TOKENS.find((t) => t.symbol === fromSymbol);
      const toToken = STABLE_TOKENS.find((t) => t.symbol === toSymbol);

      if (!fromToken || !toToken) {
        throw new Error("Invalid token symbols");
      }

      const fromAddr = getTokenAddress(fromToken, chainId);
      const toAddr = getTokenAddress(toToken, chainId);

      if (!fromAddr || !toAddr) {
        throw new Error("Token addresses not found for current chain");
      }

      setSwapState((prev) => ({
        ...prev,
        isSwapping: true,
        error: null,
        fromAmount: amount.toString(),
      }));

      try {
        // Enhanced balance validation
        const balanceRaw = tokenBalances[fromSymbol]?.raw;
        if (!balanceRaw) {
          await refreshTokenBalance(fromSymbol);
          const updatedBalance = tokenBalances[fromSymbol]?.raw;
          if (!updatedBalance) {
            throw new Error(`Unable to fetch ${fromSymbol} balance`);
          }
        }

        const currentBalance = parseFloat(balanceRaw || "0");
        if (currentBalance < amount) {
          throw new Error(
            `Insufficient ${fromSymbol} balance. Available: ${currentBalance.toFixed(
              4
            )}, Required: ${amount.toFixed(4)}`
          );
        }

        // Validate pair exists
        const pairExists = await validateTokenPair(fromSymbol, toSymbol);
        if (!pairExists) {
          throw new Error(
            `Trading pair ${fromSymbol}/${toSymbol} not available. Try converting to CELO first.`
          );
        }

        const amountIn = ethers.utils.parseUnits(
          amount.toString(),
          fromToken.decimals
        );

        // Get quote with retry mechanism
        let amountOut: ethers.BigNumber | undefined;
        let retries = 3;
        while (retries > 0) {
          try {
            amountOut = await mento.getAmountOut(fromAddr, toAddr, amountIn);
            break;
          } catch (error) {
            retries--;
            if (retries === 0) throw error;
            await new Promise((resolve) => setTimeout(resolve, 1000));
          }
        }

        if (!amountOut) {
          throw new Error("Failed to get swap quote after multiple attempts");
        }

        const minAmountOut = amountOut.mul(95).div(100); // 5% slippage

        setSwapState((prev) => ({
          ...prev,
          toAmount: ethers.utils.formatUnits(amountOut, toToken.decimals),
        }));

        const provider = new ethers.providers.Web3Provider(window.ethereum!);
        const signer = provider.getSigner();

        // Enhanced allowance handling
        const currentAllowance = await checkMentoAllowance(fromAddr, amountIn);

        if (currentAllowance.lt(amountIn)) {
          showSnackbar(`Approving ${fromSymbol} for swap...`, "info");

          const allowanceTxObj = await mento.increaseTradingAllowance(
            fromAddr,
            amountIn
          );

          if (allowanceTxObj) {
            // Estimate gas for allowance
            let gasEstimate: ethers.BigNumber;
            try {
              gasEstimate = await provider.estimateGas({
                ...allowanceTxObj,
                from: address,
              });
              gasEstimate = gasEstimate.mul(120).div(100); // 20% buffer
            } catch {
              gasEstimate = ethers.utils.parseUnits("200000", "wei");
            }

            const allowanceTx = await signer.sendTransaction({
              ...allowanceTxObj,
              gasLimit: gasEstimate,
            });

            showSnackbar("Waiting for approval confirmation...", "info");
            await allowanceTx.wait(2); // Wait for 2 confirmations
          }
        }

        // Execute swap with enhanced error handling
        const swapTxObj = await mento.swapIn(
          fromAddr,
          toAddr,
          amountIn,
          minAmountOut
        );

        if (!swapTxObj) {
          throw new Error("Failed to create swap transaction");
        }

        // Estimate gas for swap
        let swapGasEstimate: ethers.BigNumber;
        try {
          swapGasEstimate = await provider.estimateGas({
            ...swapTxObj,
            from: address,
          });
          swapGasEstimate = swapGasEstimate.mul(130).div(100); // 30% buffer
        } catch {
          swapGasEstimate = ethers.utils.parseUnits("400000", "wei");
        }

        showSnackbar("Executing swap...", "info");
        const swapTx = await signer.sendTransaction({
          ...swapTxObj,
          gasLimit: swapGasEstimate,
        });

        showSnackbar("Waiting for swap confirmation...", "info");
        await swapTx.wait(2);

        showSnackbar(
          `Successfully swapped ${amount} ${fromSymbol} to ${toSymbol}`,
          "success"
        );

        // Refresh balances with delay
        setTimeout(() => {
          refreshTokenBalance(fromSymbol);
          refreshTokenBalance(toSymbol);
        }, 3000);
      } catch (error: any) {
        console.error("Swap failed:", error);
        let errorMessage = "Swap failed";

        // Enhanced error parsing
        if (error?.message?.includes("transferFrom failed")) {
          errorMessage = `${fromSymbol} transfer failed. Check allowance and balance.`;
        } else if (error?.message?.includes("No pair found")) {
          errorMessage = `${fromSymbol}/${toSymbol} pair not available. Try swapping through CELO.`;
        } else if (error?.message?.includes("insufficient")) {
          errorMessage = `Insufficient ${fromSymbol} balance`;
        } else if (error?.message?.includes("slippage")) {
          errorMessage = "Price changed too much. Please try again.";
        } else if (error?.message?.includes("User denied")) {
          errorMessage = "Transaction cancelled by user";
        } else if (error?.message?.includes("UNPREDICTABLE_GAS_LIMIT")) {
          errorMessage =
            "Cannot estimate gas. Check your balance and allowances.";
        } else {
          errorMessage = error?.message || errorMessage;
        }

        setSwapState((prev) => ({ ...prev, error: errorMessage }));
        showSnackbar(errorMessage, "error");
        throw new Error(errorMessage);
      } finally {
        setSwapState((prev) => ({ ...prev, isSwapping: false }));
      }
    },
    [
      mento,
      chainId,
      address,
      tokenBalances,
      showSnackbar,
      refreshTokenBalance,
      validateTokenPair,
    ]
  );

  const checkMentoAllowance = useCallback(
    async (
      tokenAddress: string,
      amount: ethers.BigNumber
    ): Promise<ethers.BigNumber> => {
      if (!mento || !address) {
        return ethers.BigNumber.from(0);
      }

      try {
        const provider = new ethers.providers.Web3Provider(window.ethereum!);
        const tokenContract = new ethers.Contract(
          tokenAddress,
          erc20Abi,
          provider
        );

        // celo alfajores
        const MENTO_BROKER_ADDRESS =
          "0xD3Dff18E465bCa6241A244144765b4421Ac14D09";
        // celo mainnet
        // const MENTO_BROKER_ADDRESS =
        //   "0x777A8255cA72412f0d706dc03C9D1987306B4CaD";

        const allowance = await tokenContract.allowance(
          address,
          MENTO_BROKER_ADDRESS
        );
        return allowance;
      } catch (error) {
        console.warn("Failed to check Mento allowance:", error);
        return ethers.BigNumber.from(0);
      }
    },
    [mento, address]
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

  // Setup balance refresh interval
  useEffect(() => {
    if (isConnected && address && isCorrectNetwork) {
      // Clear existing interval
      if (balanceIntervalRef.current) {
        clearInterval(balanceIntervalRef.current);
      }

      // Set new interval for 5 minutes
      balanceIntervalRef.current = setInterval(() => {
        refreshTokenBalance();
        refetchCeloBalance();
      }, 300000);

      // Initial fetch
      refreshTokenBalance();

      return () => {
        if (balanceIntervalRef.current) {
          clearInterval(balanceIntervalRef.current);
        }
      };
    }
  }, [isConnected, address, isCorrectNetwork, refreshTokenBalance]);

  // Fetch balance when selected token changes
  useEffect(() => {
    if (selectedToken && address && isCorrectNetwork) {
      refreshTokenBalance();
    }
  }, [selectedToken, address, isCorrectNetwork]);

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
        Object.keys(prev.tokenBalances).length !==
          Object.keys(newWalletState.tokenBalances).length;

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

  // Updated buy trade function
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

      // const paymentToken = getTokenBySymbol(params.paymentToken);
      // if (!paymentToken) {
      //   throw new Error(`Payment token ${params.paymentToken} not found`);
      // }

      try {
        const tradeId = BigInt(params.tradeId);
        const quantity = BigInt(params.quantity);
        const logisticsProvider = params.logisticsProvider as `0x${string}`;

        if (
          !logisticsProvider?.startsWith("0x") ||
          logisticsProvider.length !== 42
        ) {
          throw new Error("Invalid logistics provider address");
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

        const hash = await writeContractAsync({
          address: escrowAddress as `0x${string}`,
          abi: DEZENMART_ABI,
          functionName: "buyTrade",
          args: [tradeId, quantity, logisticsProvider],
          gas: gasEstimate,
        });

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

        // Refresh balance after successful purchase
        setTimeout(() => {
          refreshTokenBalance(selectedToken.symbol);
        }, 2000);

        return {
          hash,
          amount: "0",
          to: escrowAddress,
          from: address,
          token: selectedToken.symbol,
          status: "pending",
          timestamp: Date.now(),
          purchaseId,
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
    [address, chain, isCorrectNetwork, writeContractAsync, refreshTokenBalance]
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
    return () => {
      if (balanceIntervalRef.current) {
        clearInterval(balanceIntervalRef.current);
      }
    };
  }, []);
  useEffect(() => {
    return () => {
      debouncedFetchBalance.cancel();
      refreshInProgressRef.current.clear();
    };
  }, [debouncedFetchBalance]);

  const value: ExtendedWeb3ContextType = {
    wallet,
    connectWallet,
    disconnectWallet,
    switchToCorrectNetwork,
    sendPayment,
    performSwap,
    getSwapQuote,
    initializeMento,
    swapState,
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
  };

  return <Web3Context.Provider value={value}>{children}</Web3Context.Provider>;
};

export const useWeb3 = () => {
  const context = useContext(Web3Context);
  if (context === undefined) {
    throw new Error("useWeb3 must be used within a Web3Provider");
  }
  return context;
};
