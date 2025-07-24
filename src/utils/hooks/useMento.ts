import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { useAccount, useWalletClient, usePublicClient } from "wagmi";
import { Mento, TradablePair } from "@mento-protocol/mento-sdk";
import { parseUnits, formatUnits, erc20Abi, isAddress } from "viem";
import { providers, Contract, BigNumber } from "ethers";
import {
  STABLE_TOKENS,
  getTokenAddress,
  TARGET_CHAIN,
} from "../config/web3.config";
import { debounce } from "lodash-es";

// Helper to safely get address string from different types
const getAddressString = (value: unknown): string | undefined => {
  if (typeof value === "string") {
    return value;
  }
  // Assuming Asset objects from mento-sdk have an 'address' property
  if (
    typeof value === "object" &&
    value !== null &&
    "address" in value &&
    typeof (value as any).address === "string"
  ) {
    return (value as any).address;
  }
  return undefined;
};

// Enhanced interfaces
interface MentoState {
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
  pairDetails?: {
    id: string;
    providerAddr: string;
    assets: string[];
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
const QUOTE_CACHE_DURATION = 15000;
const SLIPPAGE_DEFAULT = 0.01;
const MAX_RETRIES = 3;
const RETRY_DELAY = 1500;
const INITIALIZATION_TIMEOUT = 30000;
const QUOTE_TIMEOUT = 10000;

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

// Helper function to build route from TradablePair
const buildRouteFromPair = (
  tradablePair: TradablePair | undefined,
  fromSymbol: string,
  toSymbol: string,
  chainId: number
): string[] => {
  if (!tradablePair) {
    return [fromSymbol, toSymbol];
  }

  try {
    // Handle different path structures
    if (
      tradablePair.path &&
      Array.isArray(tradablePair.path) &&
      tradablePair.path.length > 0
    ) {
      const route: string[] = [fromSymbol];

      // Process intermediate tokens from path
      for (const pathItem of tradablePair.path) {
        if (
          typeof pathItem === "object" &&
          pathItem !== null &&
          "assets" in pathItem
        ) {
          // Handle path item with assets array
          const assets = (pathItem as any).assets;
          if (Array.isArray(assets)) {
            for (const assetAddr of assets) {
              const token = STABLE_TOKENS.find((t) => {
                const tokenAddress = getTokenAddress(t, chainId);
                const compareAddress = getAddressString(assetAddr);
                return (
                  tokenAddress &&
                  compareAddress &&
                  tokenAddress.toLowerCase() === compareAddress.toLowerCase()
                );
              });
              if (
                token &&
                token.symbol !== fromSymbol &&
                token.symbol !== toSymbol &&
                !route.includes(token.symbol)
              ) {
                route.push(token.symbol);
              }
            }
          }
        } else {
          // Handle direct string addresses or Asset objects
          const token = STABLE_TOKENS.find((t) => {
            const tokenAddress = getTokenAddress(t, chainId);
            const pathItemAddress = getAddressString(pathItem);
            return (
              tokenAddress &&
              pathItemAddress &&
              tokenAddress.toLowerCase() === pathItemAddress.toLowerCase()
            );
          });
          if (
            token &&
            token.symbol !== fromSymbol &&
            token.symbol !== toSymbol &&
            !route.includes(token.symbol)
          ) {
            route.push(token.symbol);
          }
        }
      }

      // Add ending token if not already present
      if (!route.includes(toSymbol)) {
        route.push(toSymbol);
      }

      return route.length > 1 ? route : [fromSymbol, toSymbol];
    }

    // Handle direct pair with assets
    if (
      tradablePair.assets &&
      Array.isArray(tradablePair.assets) &&
      tradablePair.assets.length >= 2
    ) {
      const asset0 = tradablePair.assets[0];
      const asset1 = tradablePair.assets[1];

      const token0 = STABLE_TOKENS.find((t) => {
        const tokenAddress = getTokenAddress(t, chainId);
        const asset0Address = getAddressString(asset0);
        return (
          tokenAddress &&
          asset0Address &&
          tokenAddress.toLowerCase() === asset0Address.toLowerCase()
        );
      });
      const token1 = STABLE_TOKENS.find((t) => {
        const tokenAddress = getTokenAddress(t, chainId);
        const asset1Address = getAddressString(asset1);
        return (
          tokenAddress &&
          asset1Address &&
          tokenAddress.toLowerCase() === asset1Address.toLowerCase()
        );
      });

      if (token0 && token1) {
        return [token0.symbol, token1.symbol];
      }
    }
  } catch (error) {
    console.warn("[buildRouteFromPair] Error building route:", error);
  }

  return [fromSymbol, toSymbol];
};

// Utility functions
const calculatePriceImpact = (amountIn: number, amountOut: number): string => {
  if (amountIn <= 0 || amountOut <= 0) return "0.0000";

  const expectedRate = 1;
  const actualRate = amountOut / amountIn;
  const impact = Math.abs((expectedRate - actualRate) / expectedRate) * 100;

  return Math.min(impact, 100).toFixed(4);
};

const getGasFee = async (
  publicClient: any,
  gasLimit: BigNumber
): Promise<string> => {
  try {
    const gasPrice = await publicClient.getGasPrice();
    const fee = gasPrice * BigInt(gasLimit.toString());
    return formatUnits(fee, 18);
  } catch (error) {
    console.error("Failed to estimate gas fee:", error);
    return "0.001";
  }
};

export function useMento() {
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();

  const [state, setState] = useState<MentoState>({
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

  const mentoRef = useRef<Mento | null>(null);
  const quoteCache = useRef<Map<string, SwapQuote>>(new Map());
  const abortControllerRef = useRef<AbortController | null>(null);
  const quoteTtlRef = useRef<NodeJS.Timeout | null>(null);
  const initializationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [availablePairs, setAvailablePairs] = useState<TradablePair[]>([]);

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

  // Initialize Mento
  const initializeMento = useCallback(async (): Promise<boolean> => {
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
        const provider = new providers.Web3Provider(window.ethereum);
        const signer = provider.getSigner();

        const network = await provider.getNetwork();
        if (network.chainId !== TARGET_CHAIN.id) {
          throw new SwapError(
            SwapErrorType.NETWORK_ERROR,
            `Please switch to ${TARGET_CHAIN.name} network`
          );
        }

        console.log(`[Mento] Initializing SDK attempt ${retries + 1}...`);

        const mento = (await Promise.race([
          Mento.create(signer),
          new Promise((_, reject) =>
            setTimeout(
              () => reject(new Error("SDK initialization timeout")),
              15000
            )
          ),
        ])) as Mento;

        console.log("[Mento] SDK initialized, fetching tradable pairs...");

        const pairs = (await Promise.race([
          mento.getTradablePairs(),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Get pairs timeout")), 10000)
          ),
        ])) as TradablePair[];

        console.log(`[Mento] Found ${pairs.length} tradable pairs`);

        setAvailablePairs(pairs);
        mentoRef.current = mento;

        if (initializationTimeoutRef.current) {
          clearTimeout(initializationTimeoutRef.current);
        }

        setState((prev) => ({
          ...prev,
          isInitializing: false,
          isInitialized: true,
          error: null,
        }));

        console.log("[Mento] Initialization successful");
        return true;
      } catch (error: any) {
        retries++;
        console.error(
          `[Mento] Initialization attempt ${retries} failed:`,
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

      if (!mentoRef.current || !state.isInitialized) {
        if (!state.isInitializing) {
          await initializeMento();
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
        console.log(`[getSwapQuote] Parsed amount: ${amountIn.toString()}`);

        let amountOut: BigNumber;
        let route: string[] = [];
        let isDirectSwap = false;
        let tradablePair: TradablePair | undefined;
        let pairDetails: SwapQuote["pairDetails"];

        try {
          console.log("[getSwapQuote] Finding tradable pair...");
          tradablePair = (await Promise.race([
            mentoRef.current.findPairForTokens(fromAddress, toAddress),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error("Pair lookup timeout")), 5000)
            ),
          ])) as TradablePair;

          console.log("[getSwapQuote] Tradable pair found:", {
            id: (tradablePair as any)?.id,
            providerAddr: (tradablePair as any)?.providerAddr,
            assetsLength: tradablePair?.assets?.length,
            pathLength: tradablePair?.path?.length,
          });

          if (tradablePair) {
            pairDetails = {
              id: (tradablePair as any)?.id || "unknown",
              providerAddr: (tradablePair as any)?.providerAddr || "unknown",
              assets: tradablePair.assets
                ? tradablePair.assets.map((a) => getAddressString(a) || "")
                : [fromAddress, toAddress],
            };
          }

          amountOut = (await Promise.race([
            mentoRef.current.getAmountOut(
              fromAddress,
              toAddress,
              BigNumber.from(amountIn.toString()),
              tradablePair
            ),
            new Promise((_, reject) =>
              setTimeout(
                () => reject(new Error("Amount calculation timeout")),
                5000
              )
            ),
          ])) as BigNumber;

          route = buildRouteFromPair(
            tradablePair,
            fromSymbol,
            toSymbol,
            chainId
          );
        } catch (pairError: any) {
          console.warn(
            "[getSwapQuote] Pair lookup failed, trying direct swap:",
            pairError.message
          );

          try {
            amountOut = (await Promise.race([
              mentoRef.current.getAmountOut(
                fromAddress,
                toAddress,
                BigNumber.from(amountIn.toString())
              ),
              new Promise((_, reject) =>
                setTimeout(() => reject(new Error("Direct swap timeout")), 5000)
              ),
            ])) as BigNumber;

            route = [fromSymbol, toSymbol];
            isDirectSwap = true;
            console.log("[getSwapQuote] Direct swap successful");
          } catch (directSwapError: any) {
            console.error(
              "[getSwapQuote] Direct swap failed:",
              directSwapError.message
            );
            throw new SwapError(
              SwapErrorType.INSUFFICIENT_LIQUIDITY,
              `No trading path available between ${fromSymbol} and ${toSymbol}. This pair may not have sufficient liquidity.`
            );
          }
        }

        if (!amountOut || amountOut.isZero()) {
          throw new SwapError(
            SwapErrorType.INSUFFICIENT_LIQUIDITY,
            "Insufficient liquidity for this trade amount"
          );
        }

        const amountOutFormatted = formatUnits(
          BigInt(amountOut.toString()),
          toToken.decimals
        );

        const exchangeRate = (parseFloat(amountOutFormatted) / amount).toFixed(
          6
        );

        const minAmountOut = amountOut
          .mul(Math.floor((1 - slippageTolerance) * 10000))
          .div(10000);
        const minAmountOutFormatted = formatUnits(
          BigInt(minAmountOut.toString()),
          toToken.decimals
        );

        const priceImpact = calculatePriceImpact(
          amount,
          parseFloat(amountOutFormatted)
        );

        let gasEstimate = "0";
        try {
          console.log("[getSwapQuote] Estimating gas...");
          const txRequest = await mentoRef.current.swapIn(
            fromAddress,
            toAddress,
            BigNumber.from(amountIn.toString()),
            minAmountOut,
            tradablePair
          );

          const gasEstimateBigInt = await publicClient!.estimateGas({
            account: address as `0x${string}`,
            to: txRequest.to as `0x${string}`,
            data: txRequest.data as `0x${string}`,
            value: BigInt(txRequest.value?.toString() || "0"),
          });

          gasEstimate = formatUnits(gasEstimateBigInt, 18);
          console.log("[getSwapQuote] Gas estimated:", gasEstimate);
        } catch (gasError: any) {
          console.warn(
            "[getSwapQuote] Gas estimation failed:",
            gasError.message
          );
          gasEstimate = "0.01";
        }

        const networkFee = await getGasFee(
          publicClient!,
          BigNumber.from(parseUnits(gasEstimate, 18).toString())
        );
        const protocolFee = "0";

        const quote: SwapQuote = {
          amountOut: amountOutFormatted,
          exchangeRate,
          minAmountOut: minAmountOutFormatted,
          priceImpact,
          route,
          fees: { networkFee, protocolFee },
          gasEstimate,
          timestamp: Date.now(),
          isDirectSwap,
          pairDetails,
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
      initializeMento,
    ]
  );

  // Perform swap
  const performSwap = useCallback(
    async (params: SwapParams): Promise<SwapResult> => {
      if (!mentoRef.current || !address || !walletClient) {
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

        const amountIn = BigNumber.from(
          parseUnits(amount.toString(), fromToken.decimals).toString()
        );

        const quote = await getSwapQuote(
          fromSymbol,
          toSymbol,
          amount,
          slippageTolerance
        );
        const minAmountOut = BigNumber.from(
          parseUnits(quote.minAmountOut, toToken.decimals).toString()
        );

        let tradablePair: TradablePair | undefined;
        try {
          tradablePair = await mentoRef.current.findPairForTokens(
            fromAddress,
            toAddress
          );
        } catch (error) {
          console.log("Using direct swap without routing");
          tradablePair = undefined;
        }

        setState((prev) => ({
          ...prev,
          isApproving: true,
          currentStep: 1,
          totalSteps: recipientAddress ? 3 : 2,
        }));
        console.log("Increasing trading allowance...");
        const allowanceTxObj = await mentoRef.current.increaseTradingAllowance(
          fromAddress,
          amountIn,
          tradablePair
        );

        const allowanceHash = await walletClient.sendTransaction({
          account: address as `0x${string}`,
          to: allowanceTxObj.to as `0x${string}`,
          data: allowanceTxObj.data as `0x${string}`,
          value: BigInt(allowanceTxObj.value?.toString() || "0"),
          gas: allowanceTxObj.gasLimit
            ? BigInt(allowanceTxObj.gasLimit.toString())
            : undefined,
        });

        const allowanceReceipt = await publicClient?.waitForTransactionReceipt({
          hash: allowanceHash,
          timeout: 60000,
        });

        if (allowanceReceipt?.status !== "success") {
          throw new Error("Allowance transaction failed");
        }

        setState((prev) => ({ ...prev, isApproving: false, currentStep: 2 }));

        console.log("Executing swap...");
        const swapTxObj = await mentoRef.current.swapIn(
          fromAddress,
          toAddress,
          amountIn,
          minAmountOut,
          tradablePair
        );

        const swapHash = await walletClient.sendTransaction({
          account: address as `0x${string}`,
          to: swapTxObj.to as `0x${string}`,
          data: swapTxObj.data as `0x${string}`,
          value: BigInt(swapTxObj.value?.toString() || "0"),
          gas: swapTxObj.gasLimit
            ? BigInt(swapTxObj.gasLimit.toString())
            : undefined,
        });

        const swapReceipt = await publicClient?.waitForTransactionReceipt({
          hash: swapHash,
          timeout: 60000,
        });

        if (swapReceipt?.status !== "success") {
          throw new Error("Swap transaction failed");
        }

        let result: SwapResult = {
          success: true,
          hash: swapHash,
          amountOut: quote.amountOut,
          recipient: recipientAddress || address,
          gasUsed: swapReceipt?.gasUsed?.toString(),
        };

        if (recipientAddress && recipientAddress !== address) {
          setState((prev) => ({ ...prev, currentStep: 3 }));
          const transferHash = await handleRemittance(
            toAddress,
            recipientAddress,
            quote.amountOut,
            toToken.decimals
          );
          result.transferHash = transferHash;
        }

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

  const handleRemittance = async (
    tokenAddress: string,
    recipient: string,
    amount: string,
    decimals: number
  ): Promise<string> => {
    if (!walletClient || !address) {
      throw new Error("Wallet not available for remittance");
    }

    const transferAmount = parseUnits(amount, decimals);

    const hash = await walletClient.writeContract({
      address: tokenAddress as `0x${string}`,
      abi: erc20Abi,
      functionName: "transfer",
      args: [recipient as `0x${string}`, transferAmount],
      account: address as `0x${string}`,
    });

    return hash;
  };

  const parseSwapError = (error: any): string => {
    if (error instanceof SwapError) {
      return error.message;
    }

    const message = error?.message || error?.toString() || "";

    const errorPatterns = [
      {
        pattern: /no pair found|tradable path|insufficient liquidity/i,
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
        pattern: /slippage|minimum|maximum/i,
        type: SwapErrorType.SLIPPAGE_EXCEEDED,
      },
      {
        pattern: /network|connection|timeout/i,
        type: SwapErrorType.NETWORK_ERROR,
      },
      { pattern: /gas|estimation/i, type: SwapErrorType.GAS_ESTIMATION_FAILED },
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
      initializeMento();
    }
  }, [
    address,
    walletClient,
    state.isInitialized,
    state.isInitializing,
    state.initializationAttempts,
    initializeMento,
  ]);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (quoteTtlRef.current) {
        clearTimeout(quoteTtlRef.current);
      }
      if (initializationTimeoutRef.current) {
        clearTimeout(initializationTimeoutRef.current);
      }
      debouncedGetQuote.cancel();
    };
  }, [debouncedGetQuote]);

  const contextValue = useMemo(
    () => ({
      ...state,
      initializeMento,
      getSwapQuote: debouncedGetQuote,
      performSwap,
      clearQuoteCache,
      availablePairs,
      isReady: state.isInitialized && !!mentoRef.current,
    }),
    [
      state,
      initializeMento,
      debouncedGetQuote,
      performSwap,
      clearQuoteCache,
      availablePairs,
    ]
  );

  return contextValue;
}
