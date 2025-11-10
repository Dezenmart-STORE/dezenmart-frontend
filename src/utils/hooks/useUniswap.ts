import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { useAccount, useWalletClient, usePublicClient } from "wagmi";
import { parseUnits, formatUnits, erc20Abi, isAddress } from "viem";
// import {
//   Token,
//   CurrencyAmount,
//   TradeType,
//   Percent,
//   Currency,
// } from "@uniswap/sdk-core";
import { ethers } from "ethers";
import { debounce } from "lodash-es";
import {
  STABLE_TOKENS,
  getTokenAddress,
  TARGET_CHAIN,
  // StableToken,
} from "../config/web3.config";

// Uniswap V3 Router addresses
const SWAP_ROUTER_ADDRESSES = {
  42220: "0x5615CDAb10dc425a742d643d949a7F474C01abc4", // Celo Mainnet
  44787: "0x5615CDAb10dc425a742d643d949a7F474C01abc4", // Celo Alfajores
} as const;

// Quoter V2 address on Celo
const QUOTER_V2_ADDRESS = "0x82825d0554fA07f7FC52Ab63c961F330fdEFa8E8";

// SwapRouter02 ABI (minimal for exactInputSingle)
const SWAP_ROUTER_ABI = [
  {
    inputs: [
      {
        components: [
          { internalType: "address", name: "tokenIn", type: "address" },
          { internalType: "address", name: "tokenOut", type: "address" },
          { internalType: "uint24", name: "fee", type: "uint24" },
          { internalType: "address", name: "recipient", type: "address" },
          { internalType: "uint256", name: "amountIn", type: "uint256" },
          {
            internalType: "uint256",
            name: "amountOutMinimum",
            type: "uint256",
          },
          {
            internalType: "uint160",
            name: "sqrtPriceLimitX96",
            type: "uint160",
          },
        ],
        internalType: "struct IV3SwapRouter.ExactInputSingleParams",
        name: "params",
        type: "tuple",
      },
    ],
    name: "exactInputSingle",
    outputs: [{ internalType: "uint256", name: "amountOut", type: "uint256" }],
    stateMutability: "payable",
    type: "function",
  },
];

// Quoter ABI (minimal for quoteExactInputSingle)
const QUOTER_ABI = [
  {
    inputs: [
      {
        components: [
          { internalType: "address", name: "tokenIn", type: "address" },
          { internalType: "address", name: "tokenOut", type: "address" },
          { internalType: "uint256", name: "amountIn", type: "uint256" },
          { internalType: "uint24", name: "fee", type: "uint24" },
          {
            internalType: "uint160",
            name: "sqrtPriceLimitX96",
            type: "uint160",
          },
        ],
        internalType: "struct IQuoterV2.QuoteExactInputSingleParams",
        name: "params",
        type: "tuple",
      },
    ],
    name: "quoteExactInputSingle",
    outputs: [
      { internalType: "uint256", name: "amountOut", type: "uint256" },
      { internalType: "uint160", name: "sqrtPriceX96After", type: "uint160" },
      {
        internalType: "uint32",
        name: "initializedTicksCrossed",
        type: "uint32",
      },
      { internalType: "uint256", name: "gasEstimate", type: "uint256" },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
];

// Fee tiers
enum FeeAmount {
  LOWEST = 100,
  LOW = 500,
  MEDIUM = 3000,
  HIGH = 10000,
}

// interfaces
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
const QUOTE_CACHE_DURATION = 10000; // 10 seconds - reduced for security
const SLIPPAGE_DEFAULT = 0.01; // 1%
const MAX_RETRIES = 3;
const RETRY_DELAY = 1500;
const INITIALIZATION_TIMEOUT = 30000;
const DEADLINE_MINUTES = 5; // Shorter deadline for MEV protection (was 30)

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

  // Initialize Uniswap
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

        console.log(
          `[Uniswap] Initializing (Simple SDK) attempt ${retries + 1}...`
        );

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

  // Get swap quote using Quoter contract
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

      if (!providerRef.current || !state.isInitialized) {
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

        const amountIn = parseUnits(amount.toString(), fromToken.decimals);

        // Try different fee tiers to find best quote
        const feeTiers = [
          FeeAmount.MEDIUM,
          FeeAmount.LOW,
          FeeAmount.HIGH,
          FeeAmount.LOWEST,
        ];
        const quoter = new ethers.Contract(
          QUOTER_V2_ADDRESS,
          QUOTER_ABI,
          providerRef.current
        );

        let bestQuote: any = null;
        let bestFee = FeeAmount.MEDIUM;

        for (const fee of feeTiers) {
          try {
            const quoteParams = {
              tokenIn: fromAddress,
              tokenOut: toAddress,
              amountIn: amountIn.toString(),
              fee: fee,
              sqrtPriceLimitX96: 0,
            };

            const quote = await quoter.callStatic.quoteExactInputSingle(
              quoteParams
            );

            if (
              !bestQuote ||
              ethers.BigNumber.from(quote.amountOut).gt(bestQuote.amountOut)
            ) {
              bestQuote = quote;
              bestFee = fee;
            }
          } catch (error) {
            console.warn(`Quote failed for fee tier ${fee}:`, error);
          }
        }

        if (!bestQuote || ethers.BigNumber.from(bestQuote.amountOut).isZero()) {
          throw new SwapError(
            SwapErrorType.INSUFFICIENT_LIQUIDITY,
            `No liquidity found for ${fromSymbol}/${toSymbol} pair`
          );
        }

        const amountOutFormatted = formatUnits(
          ethers.BigNumber.from(bestQuote.amountOut).toBigInt(),
          toToken.decimals
        );

        const exchangeRate = (parseFloat(amountOutFormatted) / amount).toFixed(
          6
        );

        const minAmountOut = ethers.BigNumber.from(bestQuote.amountOut)
          .mul(Math.floor((1 - slippageTolerance) * 10000))
          .div(10000);

        const minAmountOutFormatted = formatUnits(
          minAmountOut.toBigInt(),
          toToken.decimals
        );

        const priceImpact = calculatePriceImpact(1, parseFloat(exchangeRate));

        const gasEstimate = formatUnits(bestQuote.gasEstimate || "150000", 18);

        const networkFee = await getGasFee(
          publicClient!,
          BigInt(bestQuote.gasEstimate?.toString() || "150000")
        );

        const quote: SwapQuote = {
          amountOut: amountOutFormatted,
          exchangeRate,
          minAmountOut: minAmountOutFormatted,
          priceImpact,
          route: [fromSymbol, toSymbol],
          fees: { networkFee, protocolFee: "0" },
          gasEstimate,
          timestamp: Date.now(),
          isDirectSwap: true,
          routeDetails: {
            poolAddresses: [],
            poolFees: [bestFee],
            path: [fromAddress, toAddress],
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
          fee: bestFee,
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
      state.isInitialized,
      state.isInitializing,
      initializeUniswap,
    ]
  );

  // Perform swap using SwapRouter02
  const performSwap = useCallback(
    async (params: SwapParams): Promise<SwapResult> => {
      if (!providerRef.current || !address || !walletClient) {
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

        const minAmountOut = parseUnits(quote.minAmountOut, toToken.decimals);
        const bestFee = quote.routeDetails?.poolFees[0] || FeeAmount.MEDIUM;

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

        // Step 2: Execute swap using SwapRouter02
        console.log("Executing swap...");

        const deadline = Math.floor(Date.now() / 1000) + DEADLINE_MINUTES * 60;

        // Create swap params for exactInputSingle
        const swapParams = {
          tokenIn: fromAddress,
          tokenOut: toAddress,
          fee: bestFee,
          recipient: recipientAddress || address,
          amountIn: amountIn.toString(),
          amountOutMinimum: minAmountOut.toString(),
          sqrtPriceLimitX96: 0,
        };

        // Encode the function call
        const swapRouter = new ethers.Contract(
          routerAddress,
          SWAP_ROUTER_ABI,
          providerRef.current
        );

        const data = swapRouter.interface.encodeFunctionData(
          "exactInputSingle",
          [swapParams]
        );

        // Estimate gas
        const gasEstimate = await publicClient!.estimateGas({
          account: address as `0x${string}`,
          to: routerAddress as `0x${string}`,
          data: data as `0x${string}`,
          value: BigInt(0),
        });

        // Add 20% buffer
        const gasWithBuffer = (gasEstimate * BigInt(120)) / BigInt(100);

        const swapHash = await walletClient.sendTransaction({
          account: address as `0x${string}`,
          to: routerAddress as `0x${string}`,
          data: data as `0x${string}`,
          value: BigInt(0),
          gas: gasWithBuffer,
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
      isReady: state.isInitialized && !!providerRef.current,
    }),
    [state, initializeUniswap, debouncedGetQuote, performSwap, clearQuoteCache]
  );

  return contextValue;
}
