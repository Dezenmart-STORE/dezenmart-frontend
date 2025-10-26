import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { useAccount, useWalletClient, usePublicClient } from "wagmi";
import { parseUnits, formatUnits, erc20Abi, isAddress } from "viem";
import {
  Token,
  CurrencyAmount,
  TradeType,
  Percent,
  Currency,
} from "@uniswap/sdk-core";
import {
  AlphaRouter,
  SwapType,
  SwapOptionsSwapRouter02,
  SwapRoute,
} from "@uniswap/smart-order-router";
import { ethers } from "ethers";
import { debounce } from "lodash-es";
import {
  STABLE_TOKENS,
  getTokenAddress,
  TARGET_CHAIN,
  StableToken,
} from "../config/web3.config";

const SWAP_ROUTER_ADDRESSES = {
  42220: "0x5615CDAb10dc425a742d643d949a7F474C01abc4", // Celo Mainnet
  44787: "0x5615CDAb10dc425a742d643d949a7F474C01abc4", // Celo Alfajores
} as const;

//  interfaces
interface UniswapState {
  isInitializing: boolean;
  isSwapping: boolean;
  isGettingQuote: boolean;
  error: string | null;
  lastQuote: SwapQuote | null;
  isInitialized: boolean;
  isApproving: boolean;
  currentStep: number;
  totalSteps: number;
  initializationAttempts: number;
}

interface SwapQuote {
  amountOut: string;
  exchangeRate: string;
  minAmountOut: string;
  priceImpact: string;
  route: string[];
  timestamp: number;
  fees: {
    networkFee: string;
    protocolFee: string;
  };
  gasEstimate?: string;
  isDirectSwap: boolean;
  routeDetails?: {
    poolAddresses: string[];
    poolFees: number[];
    path: string[];
  };
}

interface SwapParams {
  fromSymbol: string;
  toSymbol: string;
  amount: number;
  slippageTolerance?: number;
  recipientAddress?: string;
}

interface SwapResult {
  success: boolean;
  hash: string;
  amountOut: string;
  recipient: string;
  transferHash?: string;
  gasUsed?: string;
}

// Constants
const QUOTE_CACHE_DURATION = 15000; // 15 seconds
const SLIPPAGE_DEFAULT = 0.01; // 1%
const MAX_RETRIES = 3;
const RETRY_DELAY = 1500;
const INITIALIZATION_TIMEOUT = 30000;
const DEADLINE_MINUTES = 30;

// Error types
enum SwapErrorType {
  INITIALIZATION_FAILED = "INITIALIZATION_FAILED",
  INVALID_PAIR = "INVALID_PAIR",
  INSUFFICIENT_LIQUIDITY = "INSUFFICIENT_LIQUIDITY",
  NETWORK_ERROR = "NETWORK_ERROR",
  TOKEN_APPROVAL_FAILED = "TOKEN_APPROVAL_FAILED",
  TRANSACTION_FAILED = "TRANSACTION_FAILED",
  USER_REJECTED = "USER_REJECTED",
  SLIPPAGE_EXCEEDED = "SLIPPAGE_EXCEEDED",
  GAS_ESTIMATION_FAILED = "GAS_ESTIMATION_FAILED",
}

class SwapError extends Error {
  constructor(
    public type: SwapErrorType,
    message: string,
    public originalError?: any
  ) {
    super(message);
    this.name = "SwapError";
  }
}

// Type guard to check if a currency is a Token
function isToken(currency: Currency): currency is Token {
  return "address" in currency;
}

// Helper to safely extract token address
function safeGetAddress(currency: Currency): string | null {
  if (isToken(currency)) {
    return currency.address;
  }
  return null;
}

// Helper to extract route information from Uniswap route
const extractRouteInfo = (
  route: SwapRoute,
  fromSymbol: string,
  toSymbol: string,
  chainId: number
): {
  symbols: string[];
  poolAddresses: string[];
  poolFees: number[];
  path: string[];
} => {
  const symbols: string[] = [fromSymbol];
  const poolAddresses: string[] = [];
  const poolFees: number[] = [];
  const path: string[] = [];

  try {
    if (route.route && route.route.length > 0) {
      // Iterate through all routes
      for (const routeItem of route.route) {
        // Extract token path
        if (routeItem.tokenPath && Array.isArray(routeItem.tokenPath)) {
          routeItem.tokenPath.forEach((currency: Currency, index: number) => {
            const address = safeGetAddress(currency);
            if (address) {
              const lowerAddress = address.toLowerCase();
              path.push(lowerAddress);

              // Map address to symbol for intermediate tokens
              if (index > 0 && index < routeItem.tokenPath.length - 1) {
                const stableToken = STABLE_TOKENS.find(
                  (t) =>
                    getTokenAddress(t, chainId)?.toLowerCase() === lowerAddress
                );
                if (stableToken && !symbols.includes(stableToken.symbol)) {
                  symbols.push(stableToken.symbol);
                }
              }
            }
          });
        }

        // Extract pool information with safe access
        try {
          const routeData = routeItem.route as any;

          // Try to get pools (V3/MIXED routes)
          if (
            routeData &&
            "pools" in routeData &&
            Array.isArray(routeData.pools)
          ) {
            routeData.pools.forEach((pool: any) => {
              if (pool.token0) {
                const addr = safeGetAddress(pool.token0);
                if (addr) poolAddresses.push(addr);
              }
              if (typeof pool.fee === "number") {
                poolFees.push(pool.fee);
              }
            });
          }

          // Try to get pairs (V2 routes)
          if (
            routeData &&
            "pairs" in routeData &&
            Array.isArray(routeData.pairs)
          ) {
            routeData.pairs.forEach((pair: any) => {
              if (pair.token0) {
                const addr = safeGetAddress(pair.token0);
                if (addr) poolAddresses.push(addr);
              }
              // V2 doesn't have fee tiers, use default 0.3%
              poolFees.push(3000);
            });
          }
        } catch (poolError) {
          console.warn("[extractRouteInfo] Error extracting pools:", poolError);
        }
      }
    }
  } catch (error) {
    console.warn("[extractRouteInfo] Error extracting route:", error);
  }

  // Ensure we have at least the start and end tokens
  if (!symbols.includes(toSymbol)) {
    symbols.push(toSymbol);
  }

  return {
    symbols,
    poolAddresses,
    poolFees,
    path,
  };
};

// Utility functions
const calculatePriceImpact = (
  expectedRate: number,
  actualRate: number
): string => {
  if (expectedRate <= 0 || actualRate <= 0) return "0.0000";

  const impact = Math.abs((expectedRate - actualRate) / expectedRate) * 100;
  return Math.min(impact, 100).toFixed(4);
};

const getGasFee = async (
  publicClient: any,
  gasLimit: bigint
): Promise<string> => {
  try {
    const gasPrice = await publicClient.getGasPrice();
    const fee = gasPrice * gasLimit;
    return formatUnits(fee, 18);
  } catch (error) {
    console.error("Failed to estimate gas fee:", error);
    return "0.001";
  }
};

export function useUniswap() {
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();

  const [state, setState] = useState<UniswapState>({
    isInitializing: false,
    isSwapping: false,
    isGettingQuote: false,
    error: null,
    lastQuote: null,
    isInitialized: false,
    isApproving: false,
    currentStep: 0,
    totalSteps: 0,
    initializationAttempts: 0,
  });

  const routerRef = useRef<AlphaRouter | null>(null);
  const providerRef = useRef<ethers.providers.Web3Provider | null>(null);
  const quoteCache = useRef<Map<string, SwapQuote>>(new Map());
  const abortControllerRef = useRef<AbortController | null>(null);
  const quoteTtlRef = useRef<NodeJS.Timeout | null>(null);
  const initializationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Validation functions
  const validateEnvironment = useCallback((): boolean => {
    if (!window.ethereum) {
      throw new SwapError(
        SwapErrorType.INITIALIZATION_FAILED,
        "Web3 wallet not detected. Please install MetaMask or another Web3 wallet."
      );
    }

    if (!address || !walletClient || !publicClient) {
      throw new SwapError(
        SwapErrorType.INITIALIZATION_FAILED,
        "Wallet not connected. Please connect your wallet and try again."
      );
    }

    return true;
  }, [address, walletClient, publicClient]);

  const validateTokenPair = useCallback(
    (fromSymbol: string, toSymbol: string): boolean => {
      if (fromSymbol === toSymbol) {
        throw new SwapError(
          SwapErrorType.INVALID_PAIR,
          "Cannot swap the same token"
        );
      }

      const fromToken = STABLE_TOKENS.find((t) => t.symbol === fromSymbol);
      const toToken = STABLE_TOKENS.find((t) => t.symbol === toSymbol);

      if (!fromToken || !toToken) {
        throw new SwapError(
          SwapErrorType.INVALID_PAIR,
          "Unsupported token pair"
        );
      }

      const fromAddress = fromToken.address[TARGET_CHAIN.id];
      const toAddress = toToken.address[TARGET_CHAIN.id];

      if (
        !fromAddress ||
        !toAddress ||
        !isAddress(fromAddress) ||
        !isAddress(toAddress)
      ) {
        throw new SwapError(
          SwapErrorType.INVALID_PAIR,
          "Invalid token addresses for current network"
        );
      }

      return true;
    },
    []
  );

  // Initialize Uniswap Router
  const initializeUniswap = useCallback(async (): Promise<boolean> => {
    if (state.isInitialized || state.isInitializing) {
      return state.isInitialized;
    }

    try {
      validateEnvironment();
    } catch (error) {
      if (error instanceof SwapError) {
        setState((prev) => ({ ...prev, error: error.message }));
      }
      return false;
    }

    setState((prev) => ({
      ...prev,
      isInitializing: true,
      error: null,
      initializationAttempts: prev.initializationAttempts + 1,
    }));

    if (initializationTimeoutRef.current) {
      clearTimeout(initializationTimeoutRef.current);
    }

    initializationTimeoutRef.current = setTimeout(() => {
      setState((prev) => ({
        ...prev,
        isInitializing: false,
        error: "Initialization timeout. Please refresh and try again.",
      }));
    }, INITIALIZATION_TIMEOUT);

    let retries = 0;
    while (retries < MAX_RETRIES) {
      try {
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const network = await provider.getNetwork();

        if (network.chainId !== TARGET_CHAIN.id) {
          throw new SwapError(
            SwapErrorType.NETWORK_ERROR,
            `Please switch to ${TARGET_CHAIN.name} network`
          );
        }

        console.log(`[Uniswap] Initializing Router attempt ${retries + 1}...`);

        // Initialize AlphaRouter with Celo network
        const router = new AlphaRouter({
          chainId: network.chainId,
          provider,
        });

        routerRef.current = router;
        providerRef.current = provider;

        if (initializationTimeoutRef.current) {
          clearTimeout(initializationTimeoutRef.current);
        }

        setState((prev) => ({
          ...prev,
          isInitializing: false,
          isInitialized: true,
          error: null,
        }));

        console.log("[Uniswap] Initialization successful");
        return true;
      } catch (error: any) {
        retries++;
        console.error(
          `[Uniswap] Initialization attempt ${retries} failed:`,
          error
        );

        if (retries === MAX_RETRIES) {
          if (initializationTimeoutRef.current) {
            clearTimeout(initializationTimeoutRef.current);
          }

          const errorMessage =
            error instanceof SwapError
              ? error.message
              : `Failed to initialize trading functionality: ${
                  error.message || "Unknown error"
                }`;

          setState((prev) => ({
            ...prev,
            isInitializing: false,
            isInitialized: false,
            error: errorMessage,
          }));
          return false;
        }

        await new Promise((resolve) =>
          setTimeout(resolve, RETRY_DELAY * retries)
        );
      }
    }

    return false;
  }, [
    address,
    walletClient,
    publicClient,
    state.isInitialized,
    state.isInitializing,
    validateEnvironment,
  ]);

  // Clear quote cache
  const clearQuoteCache = useCallback(() => {
    quoteCache.current.clear();
    if (quoteTtlRef.current) {
      clearTimeout(quoteTtlRef.current);
    }
  }, []);

  // Get swap quote
  const getSwapQuote = useCallback(
    async (
      fromSymbol: string,
      toSymbol: string,
      amount: number,
      slippageTolerance = SLIPPAGE_DEFAULT
    ): Promise<SwapQuote> => {
      console.log(
        `[getSwapQuote] Starting quote: ${fromSymbol} -> ${toSymbol}, amount: ${amount}`
      );

      if (!routerRef.current || !state.isInitialized) {
        if (!state.isInitializing) {
          await initializeUniswap();
        }
        throw new SwapError(
          SwapErrorType.INITIALIZATION_FAILED,
          "Trading system not ready. Please wait for initialization to complete."
        );
      }

      if (amount <= 0) {
        throw new SwapError(
          SwapErrorType.INVALID_PAIR,
          "Amount must be greater than 0"
        );
      }

      validateTokenPair(fromSymbol, toSymbol);

      const cacheKey = `${fromSymbol}-${toSymbol}-${amount}-${slippageTolerance}`;
      const cached = quoteCache.current.get(cacheKey);

      if (cached && Date.now() - cached.timestamp < QUOTE_CACHE_DURATION) {
        console.log("[getSwapQuote] Returning cached quote");
        setState((prev) => ({
          ...prev,
          lastQuote: cached,
          isGettingQuote: false,
        }));
        return cached;
      }

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      setState((prev) => ({ ...prev, isGettingQuote: true, error: null }));

      try {
        const chainId = (await walletClient?.getChainId()) || TARGET_CHAIN.id;

        const fromToken = STABLE_TOKENS.find((t) => t.symbol === fromSymbol)!;
        const toToken = STABLE_TOKENS.find((t) => t.symbol === toSymbol)!;

        const fromAddress = getTokenAddress(fromToken, chainId);
        const toAddress = getTokenAddress(toToken, chainId);

        if (!fromAddress || !toAddress) {
          throw new SwapError(
            SwapErrorType.INVALID_PAIR,
            "Token addresses not found for current network"
          );
        }

        // Create Token instances for Uniswap SDK
        const inputToken = new Token(
          chainId,
          fromAddress,
          fromToken.decimals,
          fromToken.symbol,
          fromToken.name
        );

        const outputToken = new Token(
          chainId,
          toAddress,
          toToken.decimals,
          toToken.symbol,
          toToken.name
        );

        const amountIn = parseUnits(amount.toString(), fromToken.decimals);

        // Create CurrencyAmount
        const inputAmount = CurrencyAmount.fromRawAmount(
          inputToken,
          amountIn.toString()
        );

        console.log(`[getSwapQuote] Getting route from Uniswap...`);

        // Calculate deadline
        const deadline = Math.floor(Date.now() / 1000) + DEADLINE_MINUTES * 60;

        // Create swap options
        const swapOptions: SwapOptionsSwapRouter02 = {
          recipient: address as string,
          slippageTolerance: new Percent(
            Math.floor(slippageTolerance * 10000),
            10000
          ),
          deadline,
          type: SwapType.SWAP_ROUTER_02,
        };

        // Get route from AlphaRouter
        const route = (await Promise.race([
          routerRef.current.route(
            inputAmount,
            outputToken,
            TradeType.EXACT_INPUT,
            swapOptions
          ),
          new Promise<null>((_, reject) =>
            setTimeout(
              () => reject(new Error("Route calculation timeout")),
              15000
            )
          ),
        ])) as SwapRoute | null;

        if (!route || !route.quote) {
          throw new SwapError(
            SwapErrorType.INSUFFICIENT_LIQUIDITY,
            `No trading path available between ${fromSymbol} and ${toSymbol}. This pair may not have sufficient liquidity.`
          );
        }

        const amountOutFormatted = formatUnits(
          BigInt(route.quote.quotient.toString()),
          toToken.decimals
        );

        const exchangeRate = (parseFloat(amountOutFormatted) / amount).toFixed(
          6
        );

        const minAmountOut =
          (BigInt(route.quote.quotient.toString()) *
            BigInt(Math.floor((1 - slippageTolerance) * 10000))) /
          BigInt(10000);

        const minAmountOutFormatted = formatUnits(
          minAmountOut,
          toToken.decimals
        );

        // Calculate price impact
        const priceImpact =
          route.trade && route.trade.priceImpact
            ? route.trade.priceImpact.toFixed(4)
            : calculatePriceImpact(1, parseFloat(exchangeRate));

        // Extract route information
        const routeInfo = extractRouteInfo(
          route,
          fromSymbol,
          toSymbol,
          chainId
        );

        const gasEstimate = route.estimatedGasUsed
          ? formatUnits(BigInt(route.estimatedGasUsed.toString()), 18)
          : "0.01";

        const networkFee = await getGasFee(
          publicClient!,
          BigInt(route.estimatedGasUsed?.toString() || "150000")
        );

        const protocolFee = route.gasPriceWei
          ? formatUnits(
              BigInt(route.estimatedGasUsed?.toString() || "0") *
                BigInt(route.gasPriceWei.toString()),
              18
            )
          : "0";

        const quote: SwapQuote = {
          amountOut: amountOutFormatted,
          exchangeRate,
          minAmountOut: minAmountOutFormatted,
          priceImpact,
          route: routeInfo.symbols,
          fees: {
            networkFee,
            protocolFee,
          },
          gasEstimate,
          timestamp: Date.now(),
          isDirectSwap: routeInfo.symbols.length === 2,
          routeDetails: {
            poolAddresses: routeInfo.poolAddresses,
            poolFees: routeInfo.poolFees,
            path: routeInfo.path,
          },
        };

        quoteCache.current.set(cacheKey, quote);

        if (quoteTtlRef.current) clearTimeout(quoteTtlRef.current);
        quoteTtlRef.current = setTimeout(() => {
          quoteCache.current.delete(cacheKey);
        }, QUOTE_CACHE_DURATION);

        setState((prev) => ({
          ...prev,
          isGettingQuote: false,
          lastQuote: quote,
          error: null,
        }));

        console.log("[getSwapQuote] Quote completed successfully:", {
          amountOut: quote.amountOut,
          exchangeRate: quote.exchangeRate,
          priceImpact: quote.priceImpact,
          isDirectSwap: quote.isDirectSwap,
          routeLength: quote.route.length,
        });

        return quote;
      } catch (error: any) {
        console.error("[getSwapQuote] Error:", error);

        if (error.name === "AbortError") {
          return Promise.reject(error);
        }

        const swapError =
          error instanceof SwapError
            ? error
            : new SwapError(
                SwapErrorType.NETWORK_ERROR,
                `Failed to get quote: ${error.message || "Unknown error"}`
              );

        setState((prev) => ({
          ...prev,
          isGettingQuote: false,
          error: swapError.message,
        }));

        throw swapError;
      }
    },
    [
      walletClient,
      validateTokenPair,
      publicClient,
      address,
      state.isInitialized,
      state.isInitializing,
      initializeUniswap,
    ]
  );

  // Perform swap
  const performSwap = useCallback(
    async (params: SwapParams): Promise<SwapResult> => {
      if (!routerRef.current || !address || !walletClient) {
        throw new Error("Swap not ready - please ensure wallet is connected");
      }

      const {
        fromSymbol,
        toSymbol,
        amount,
        slippageTolerance = SLIPPAGE_DEFAULT,
        recipientAddress,
      } = params;

      if (!validateTokenPair(fromSymbol, toSymbol)) {
        throw new Error("Invalid token pair");
      }

      setState((prev) => ({
        ...prev,
        isSwapping: true,
        error: null,
        currentStep: 1,
        totalSteps: recipientAddress ? 3 : 2,
      }));

      try {
        const chainId = await walletClient.getChainId();

        const fromToken = STABLE_TOKENS.find((t) => t.symbol === fromSymbol)!;
        const toToken = STABLE_TOKENS.find((t) => t.symbol === toSymbol)!;

        const fromAddress = getTokenAddress(fromToken, chainId);
        const toAddress = getTokenAddress(toToken, chainId);

        if (!fromAddress || !toAddress) {
          throw new Error("Token addresses not found");
        }

        const routerAddress =
          SWAP_ROUTER_ADDRESSES[chainId as keyof typeof SWAP_ROUTER_ADDRESSES];
        if (!routerAddress) {
          throw new Error("Router address not found for this network");
        }

        const amountIn = parseUnits(amount.toString(), fromToken.decimals);

        // Get fresh quote
        const quote = await getSwapQuote(
          fromSymbol,
          toSymbol,
          amount,
          slippageTolerance
        );

        // Create Token instances
        const inputToken = new Token(
          chainId,
          fromAddress,
          fromToken.decimals,
          fromToken.symbol,
          fromToken.name
        );

        const outputToken = new Token(
          chainId,
          toAddress,
          toToken.decimals,
          toToken.symbol,
          toToken.name
        );

        const inputAmount = CurrencyAmount.fromRawAmount(
          inputToken,
          amountIn.toString()
        );

        const deadline = Math.floor(Date.now() / 1000) + DEADLINE_MINUTES * 60;

        const swapOptions: SwapOptionsSwapRouter02 = {
          recipient: recipientAddress || (address as string),
          slippageTolerance: new Percent(
            Math.floor(slippageTolerance * 10000),
            10000
          ),
          deadline,
          type: SwapType.SWAP_ROUTER_02,
        };

        // Get route
        const route = await routerRef.current.route(
          inputAmount,
          outputToken,
          TradeType.EXACT_INPUT,
          swapOptions
        );

        if (!route || !route.methodParameters) {
          throw new Error("Unable to generate swap route");
        }

        // Step 1: Approve token
        setState((prev) => ({
          ...prev,
          isApproving: true,
          currentStep: 1,
        }));

        console.log("Approving token spend...");

        const maxApproval = BigInt(
          "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"
        );

        const allowanceHash = await walletClient.writeContract({
          address: fromAddress as `0x${string}`,
          abi: erc20Abi,
          functionName: "approve",
          args: [routerAddress as `0x${string}`, maxApproval],
          account: address as `0x${string}`,
        });

        const allowanceReceipt = await publicClient?.waitForTransactionReceipt({
          hash: allowanceHash,
          timeout: 60000,
        });

        if (allowanceReceipt?.status !== "success") {
          throw new Error("Approval transaction failed");
        }

        setState((prev) => ({ ...prev, isApproving: false, currentStep: 2 }));

        // Step 2: Execute swap
        console.log("Executing swap...");

        // Add 20% buffer to gas estimate
        const gasEstimate = route.estimatedGasUsed
          ? (BigInt(route.estimatedGasUsed.toString()) * BigInt(120)) /
            BigInt(100)
          : BigInt(500000);

        const swapHash = await walletClient.sendTransaction({
          account: address as `0x${string}`,
          to: route.methodParameters.to as `0x${string}`,
          data: route.methodParameters.calldata as `0x${string}`,
          value: BigInt(route.methodParameters.value),
          gas: gasEstimate,
        });

        const swapReceipt = await publicClient?.waitForTransactionReceipt({
          hash: swapHash,
          timeout: 60000,
        });

        if (swapReceipt?.status !== "success") {
          throw new Error("Swap transaction failed");
        }

        // Step 3: Handle remittance if needed
        let transferHash: string | undefined;
        if (recipientAddress && recipientAddress !== address) {
          setState((prev) => ({ ...prev, currentStep: 3 }));

          const transferAmount = parseUnits(quote.amountOut, toToken.decimals);

          transferHash = await walletClient.writeContract({
            address: toAddress as `0x${string}`,
            abi: erc20Abi,
            functionName: "transfer",
            args: [recipientAddress as `0x${string}`, transferAmount],
            account: address as `0x${string}`,
          });
        }

        const result: SwapResult = {
          success: true,
          hash: swapHash,
          amountOut: quote.amountOut,
          recipient: recipientAddress || address,
          gasUsed: swapReceipt?.gasUsed?.toString(),
          transferHash,
        };

        setState((prev) => ({
          ...prev,
          isSwapping: false,
          error: null,
          currentStep: 0,
          totalSteps: 0,
        }));

        clearQuoteCache();

        return result;
      } catch (error: any) {
        const errorMessage = parseSwapError(error);
        setState((prev) => ({
          ...prev,
          isSwapping: false,
          isApproving: false,
          error: errorMessage,
          currentStep: 0,
          totalSteps: 0,
        }));
        throw new Error(errorMessage);
      }
    },
    [
      address,
      walletClient,
      publicClient,
      getSwapQuote,
      validateTokenPair,
      clearQuoteCache,
    ]
  );

  const parseSwapError = (error: any): string => {
    if (error instanceof SwapError) {
      return error.message;
    }

    const message = error?.message || error?.toString() || "";

    const errorPatterns = [
      {
        pattern: /no route found|insufficient liquidity|INSUFFICIENT/i,
        type: SwapErrorType.INSUFFICIENT_LIQUIDITY,
      },
      {
        pattern: /transferfrom failed|allowance|approval/i,
        type: SwapErrorType.TOKEN_APPROVAL_FAILED,
      },
      {
        pattern: /insufficient balance|insufficient funds/i,
        type: SwapErrorType.INSUFFICIENT_LIQUIDITY,
      },
      {
        pattern: /user rejected|rejected|cancelled/i,
        type: SwapErrorType.USER_REJECTED,
      },
      {
        pattern: /slippage|minimum|maximum|TOO_MUCH_SLIPPAGE/i,
        type: SwapErrorType.SLIPPAGE_EXCEEDED,
      },
      {
        pattern: /network|connection|timeout/i,
        type: SwapErrorType.NETWORK_ERROR,
      },
      {
        pattern: /gas|estimation/i,
        type: SwapErrorType.GAS_ESTIMATION_FAILED,
      },
    ];

    for (const { pattern, type } of errorPatterns) {
      if (pattern.test(message)) {
        return getErrorMessage(type);
      }
    }

    return "An unexpected error occurred. Please try again.";
  };

  const getErrorMessage = (type: SwapErrorType): string => {
    switch (type) {
      case SwapErrorType.INSUFFICIENT_LIQUIDITY:
        return "Insufficient liquidity for this trading pair. Try a smaller amount or different tokens.";
      case SwapErrorType.TOKEN_APPROVAL_FAILED:
        return "Token approval required. Please approve the token spend and try again.";
      case SwapErrorType.USER_REJECTED:
        return "Transaction was cancelled.";
      case SwapErrorType.SLIPPAGE_EXCEEDED:
        return "Price moved beyond acceptable range. Try increasing slippage tolerance.";
      case SwapErrorType.NETWORK_ERROR:
        return "Network connection issue. Please check your connection and try again.";
      case SwapErrorType.GAS_ESTIMATION_FAILED:
        return "Unable to estimate transaction cost. Please try again.";
      default:
        return "An unexpected error occurred. Please try again.";
    }
  };

  const debouncedGetQuote = useCallback(
    debounce(getSwapQuote, 800, {
      leading: false,
      trailing: true,
      maxWait: 2000,
    }),
    [getSwapQuote]
  );

  useEffect(() => {
    if (
      address &&
      walletClient &&
      !state.isInitialized &&
      !state.isInitializing &&
      state.initializationAttempts < 3
    ) {
      initializeUniswap();
    }
  }, [
    address,
    walletClient,
    state.isInitialized,
    state.isInitializing,
    state.initializationAttempts,
    initializeUniswap,
  ]);

  useEffect(() => {
    return () => {
      if (initializationTimeoutRef.current) {
        clearTimeout(initializationTimeoutRef.current);
      }
      if (quoteTtlRef.current) {
        clearTimeout(quoteTtlRef.current);
      }
      debouncedGetQuote.cancel();
    };
  }, [debouncedGetQuote]);

  const contextValue = useMemo(
    () => ({
      ...state,
      initializeUniswap,
      getSwapQuote: debouncedGetQuote,
      performSwap,
      clearQuoteCache,
      isReady: state.isInitialized && !!routerRef.current,
    }),
    [state, initializeUniswap, debouncedGetQuote, performSwap, clearQuoteCache]
  );

  return contextValue;
}
