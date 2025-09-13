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
  isGettingQuote: boolean; // Commented out
  error: string | null;
  lastQuote: SwapQuote | null; // Commented out
  isInitialized: boolean;
  isApproving: boolean;
  currentStep: number;
  totalSteps: number;
  initializationAttempts: number;
}

interface SwapQuote { // Commented out
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
} // Commented out

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
    isGettingQuote: false, // Commented out
    error: null,
    lastQuote: null, // Commented out
    isInitialized: false,
    isApproving: false,
    currentStep: 0,
    totalSteps: 0,
    initializationAttempts: 0,
  });

  const mentoRef = useRef<Mento | null>(null);
  const quoteCache = useRef<Map<string, SwapQuote>>(new Map()); // Commented out
  const abortControllerRef = useRef<AbortController | null>(null); // Commented out
  const quoteTtlRef = useRef<NodeJS.Timeout | null>(null); // Commented out
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

  // Clear quote cache // Commented out
  const clearQuoteCache = useCallback(() => { // Commented out
    quoteCache.current.clear(); // Commented out
    if (quoteTtlRef.current) { // Commented out
      clearTimeout(quoteTtlRef.current); // Commented out
    } // Commented out
  }, []); // Commented out

  // Get swap quote // Commented out
  const getSwapQuote = useCallback( // Commented out
    async ( // Commented out
      fromSymbol: string, // Commented out
      toSymbol: string, // Commented out
      amount: number, // Commented out
      slippageTolerance = SLIPPAGE_DEFAULT // Commented out
    ): Promise<SwapQuote> => { // Commented out
      console.log( // Commented out
        `[getSwapQuote] Starting quote: ${fromSymbol} -> ${toSymbol}, amount: ${amount}` // Commented out
      ); // Commented out

      if (!mentoRef.current || !state.isInitialized) { // Commented out
        if (!state.isInitializing) { // Commented out
          await initializeMento(); // Commented out
        } // Commented out
        throw new SwapError( // Commented out
          SwapErrorType.INITIALIZATION_FAILED, // Commented out
          "Trading system not ready. Please wait for initialization to complete." // Commented out
        ); // Commented out
      } // Commented out

      if (amount <= 0) { // Commented out
        throw new SwapError( // Commented out
          SwapErrorType.INVALID_PAIR, // Commented out
          "Amount must be greater than 0" // Commented out
        ); // Commented out
      } // Commented out

      validateTokenPair(fromSymbol, toSymbol); // Commented out

      const cacheKey = `${fromSymbol}-${toSymbol}-${amount}-${slippageTolerance}`; // Commented out
      const cached = quoteCache.current.get(cacheKey); // Commented out

      if (cached && Date.now() - cached.timestamp < QUOTE_CACHE_DURATION) { // Commented out
        console.log("[getSwapQuote] Returning cached quote"); // Commented out
        setState((prev) => ({ // Commented out
          ...prev, // Commented out
          lastQuote: cached, // Commented out
          isGettingQuote: false, // Commented out
        })); // Commented out
        return cached; // Commented out
      } // Commented out

      if (abortControllerRef.current) { // Commented out
        abortControllerRef.current.abort(); // Commented out
      } // Commented out
      abortControllerRef.current = new AbortController(); // Commented out

      setState((prev) => ({ ...prev, isGettingQuote: true, error: null })); // Commented out

      try { // Commented out
        const chainId = (await walletClient?.getChainId()) || TARGET_CHAIN.id; // Commented out

        const fromToken = STABLE_TOKENS.find((t) => t.symbol === fromSymbol)!; // Commented out
        const toToken = STABLE_TOKENS.find((t) => t.symbol === toSymbol)!; // Commented out

        const fromAddress = getTokenAddress(fromToken, chainId); // Commented out
        const toAddress = getTokenAddress(toToken, chainId); // Commented out

        if (!fromAddress || !toAddress) { // Commented out
          throw new SwapError( // Commented out
            SwapErrorType.INVALID_PAIR, // Commented out
            "Token addresses not found for current network" // Commented out
          ); // Commented out
        } // Commented out

        const amountIn = parseUnits(amount.toString(), fromToken.decimals); // Commented out
        console.log(`[getSwapQuote] Parsed amount: ${amountIn.toString()}`); // Commented out

        let amountOut: BigNumber; // Commented out
        let route: string[] = []; // Commented out
        let isDirectSwap = false; // Commented out
        let tradablePair: TradablePair | undefined; // Commented out
        let pairDetails: SwapQuote["pairDetails"]; // Commented out

        try { // Commented out
          console.log("[getSwapQuote] Finding tradable pair..."); // Commented out
          tradablePair = (await Promise.race([ // Commented out
            mentoRef.current.findPairForTokens(fromAddress, toAddress), // Commented out
            new Promise((_, reject) => // Commented out
              setTimeout(() => reject(new Error("Pair lookup timeout")), 5000) // Commented out
            ), // Commented out
          ])) as TradablePair; // Commented out

          console.log("[getSwapQuote] Tradable pair found:", { // Commented out
            id: (tradablePair as any)?.id, // Commented out
            providerAddr: (tradablePair as any)?.providerAddr, // Commented out
            assetsLength: tradablePair?.assets?.length, // Commented out
            pathLength: tradablePair?.path?.length, // Commented out
          }); // Commented out

          if (tradablePair) { // Commented out
            pairDetails = { // Commented out
              id: (tradablePair as any)?.id || "unknown", // Commented out
              providerAddr: (tradablePair as any)?.providerAddr || "unknown", // Commented out
              assets: tradablePair.assets ? tradablePair.assets.map(a => getAddressString(a) || '') : [fromAddress, toAddress],
            }; // Commented out
          } // Commented out

          amountOut = (await Promise.race([ // Commented out
            mentoRef.current.getAmountOut( // Commented out
              fromAddress, // Commented out
              toAddress, // Commented out
              BigNumber.from(amountIn.toString()), // Commented out
              tradablePair // Commented out
            ), // Commented out
            new Promise((_, reject) => // Commented out
              setTimeout( // Commented out
                () => reject(new Error("Amount calculation timeout")),
                5000 // Commented out
              ) // Commented out
            ), // Commented out
          ])) as BigNumber; // Commented out

          route = buildRouteFromPair( // Commented out
            tradablePair, // Commented out
            fromSymbol, // Commented out
            toSymbol, // Commented out
            chainId // Commented out
          ); // Commented out
        } catch (pairError: any) { // Commented out
          console.warn( // Commented out
            "[getSwapQuote] Pair lookup failed, trying direct swap:", // Commented out
            pairError.message // Commented out
          ); // Commented out

          try { // Commented out
            amountOut = (await Promise.race([ // Commented out
              mentoRef.current.getAmountOut( // Commented out
                fromAddress, // Commented out
                toAddress, // Commented out
                BigNumber.from(amountIn.toString()) // Commented out
              ), // Commented out
              new Promise((_, reject) => // Commented out
                setTimeout(() => reject(new Error("Direct swap timeout")), 5000) // Commented out
              ), // Commented out
            ])) as BigNumber; // Commented out

            route = [fromSymbol, toSymbol]; // Commented out
            isDirectSwap = true; // Commented out
            console.log("[getSwapQuote] Direct swap successful"); // Commented out
          } catch (directSwapError: any) { // Commented out
            console.error( // Commented out
              "[getSwapQuote] Direct swap failed:", // Commented out
              directSwapError.message // Commented out
            ); // Commented out
            throw new SwapError( // Commented out
              SwapErrorType.INSUFFICIENT_LIQUIDITY, // Commented out
              `No trading path available between ${fromSymbol} and ${toSymbol}. This pair may not have sufficient liquidity.` // Commented out
            ); // Commented out
          } // Commented out
        } // Commented out

        if (!amountOut || amountOut.isZero()) { // Commented out
          throw new SwapError( // Commented out
            SwapErrorType.INSUFFICIENT_LIQUIDITY, // Commented out
            "Insufficient liquidity for this trade amount" // Commented out
          ); // Commented out
        } // Commented out

        const amountOutFormatted = formatUnits( // Commented out
          BigInt(amountOut.toString()), // Commented out
          toToken.decimals // Commented out
        ); // Commented out

        const exchangeRate = (parseFloat(amountOutFormatted) / amount).toFixed( // Commented out
          6 // Commented out
        ); // Commented out

        const minAmountOut = amountOut // Commented out
          .mul(Math.floor((1 - slippageTolerance) * 10000)) // Commented out
          .div(10000); // Commented out
        const minAmountOutFormatted = formatUnits( // Commented out
          BigInt(minAmountOut.toString()), // Commented out
          toToken.decimals // Commented out
        ); // Commented out

        const priceImpact = calculatePriceImpact( // Commented out
          amount, // Commented out
          parseFloat(amountOutFormatted) // Commented out
        ); // Commented out

        let gasEstimate = "0"; // Commented out
        try { // Commented out
          console.log("[getSwapQuote] Estimating gas..."); // Commented out
          const txRequest = await mentoRef.current.swapIn( // Commented out
            fromAddress, // Commented out
            toAddress, // Commented out
            BigNumber.from(amountIn.toString()), // Commented out
            minAmountOut, // Commented out
            tradablePair // Commented out
          ); // Commented out

          const gasEstimateBigInt = await publicClient!.estimateGas({ // Commented out
            account: address as `0x${string}`,
            to: txRequest.to as `0x${string}`,
            data: txRequest.data as `0x${string}`,
            value: BigInt(txRequest.value?.toString() || "0"),
          }); // Commented out

          gasEstimate = formatUnits(gasEstimateBigInt, 18); // Commented out
          console.log("[getSwapQuote] Gas estimated:", gasEstimate); // Commented out
        } catch (gasError: any) { // Commented out
          console.warn( // Commented out
            "[getSwapQuote] Gas estimation failed:", // Commented out
            gasError.message // Commented out
          ); // Commented out
          gasEstimate = "0.01"; // Commented out
        } // Commented out

        const networkFee = await getGasFee( // Commented out
          publicClient!, // Commented out
          BigNumber.from(parseUnits(gasEstimate, 18).toString()) // Commented out
        ); // Commented out
        const protocolFee = "0"; // Commented out

        const quote: SwapQuote = { // Commented out
          amountOut: amountOutFormatted, // Commented out
          exchangeRate, // Commented out
          minAmountOut: minAmountOutFormatted, // Commented out
          priceImpact, // Commented out
          route, // Commented out
          fees: { networkFee, protocolFee }, // Commented out
          gasEstimate, // Commented out
          timestamp: Date.now(), // Commented out
          isDirectSwap, // Commented out
          pairDetails, // Commented out
        }; // Commented out

        quoteCache.current.set(cacheKey, quote); // Commented out

        if (quoteTtlRef.current) clearTimeout(quoteTtlRef.current); // Commented out
        quoteTtlRef.current = setTimeout(() => { // Commented out
          quoteCache.current.delete(cacheKey); // Commented out
        }, QUOTE_CACHE_DURATION); // Commented out

        setState((prev) => ({ // Commented out
          ...prev, // Commented out
          isGettingQuote: false, // Commented out
          lastQuote: quote, // Commented out
          error: null, // Commented out
        })); // Commented out

        console.log("[getSwapQuote] Quote completed successfully:", { // Commented out
          amountOut: quote.amountOut, // Commented out
          exchangeRate: quote.exchangeRate, // Commented out
          priceImpact: quote.priceImpact, // Commented out
          isDirectSwap: quote.isDirectSwap, // Commented out
        }); // Commented out

        return quote; // Commented out
      } catch (error: any) { // Commented out
        console.error("[getSwapQuote] Error:", error); // Commented out

        if (error.name === "AbortError") { // Commented out
          return Promise.reject(error); // Commented out
        } // Commented out

        const swapError = // Commented out
          error instanceof SwapError // Commented out
            ? error // Commented out
            : new SwapError( // Commented out
                SwapErrorType.NETWORK_ERROR, // Commented out
                `Failed to get quote: ${error.message || "Unknown error"}` // Commented out
              ); // Commented out

        setState((prev) => ({ // Commented out
          ...prev, // Commented out
          isGettingQuote: false, // Commented out
          error: swapError.message, // Commented out
        })); // Commented out

        throw swapError; // Commented out
      } // Commented out
    }, // Commented out
    [ // Commented out
      walletClient, // Commented out
      validateTokenPair, // Commented out
      publicClient, // Commented out
      address, // Commented out
      state.isInitialized, // Commented out
      state.isInitializing, // Commented out
      initializeMento, // Commented out
    ] // Commented out
  ); // Commented out

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

        const quote = await getSwapQuote( // Commented out
          fromSymbol,
          toSymbol,
          amount,
          slippageTolerance
        );
        const minAmountOut = BigNumber.from(
          parseUnits(quote.minAmountOut, toToken.decimals).toString()
        );

        // Placeholder for amountOut and minAmountOut as getSwapQuote is commented out
        const amountOutPlaceholder = BigNumber.from("1"); // You might need to replace this with actual logic or a default
        const minAmountOutPlaceholder = BigNumber.from("1"); // You might need to replace this with actual logic or a default

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
          minAmountOutPlaceholder, // Use placeholder
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
          amountOut: "0", // Placeholder as quote is commented out
          recipient: recipientAddress || address,
          gasUsed: swapReceipt?.gasUsed?.toString(),
        };

        if (recipientAddress && recipientAddress !== address) {
          setState((prev) => ({ ...prev, currentStep: 3 }));
          const transferHash = await handleRemittance(
            toAddress,
            recipientAddress,
            quote.amountOut, // Commented out
            // "0", // Placeholder as quote is commented out
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

        clearQuoteCache(); // Commented out

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
      getSwapQuote, // Commented out
      validateTokenPair,
      clearQuoteCache, // Commented out
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

  const debouncedGetQuote = useCallback( // Commented out
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
      if (initializationTimeoutRef.current) {
        clearTimeout(initializationTimeoutRef.current);
      }
      debouncedGetQuote.cancel(); // Commented out
    };
  }, []);

  const contextValue = useMemo(
    () => ({
      ...state,
      initializeMento,
      getSwapQuote: debouncedGetQuote, // Commented out
      performSwap,
      clearQuoteCache, // Commented out
      availablePairs,
      isReady: state.isInitialized && !!mentoRef.current,
    }),
    [
      state,
      initializeMento,
      debouncedGetQuote, // Commented out
      performSwap,
      clearQuoteCache, // Commented out
      availablePairs,
    ]
  );

  return contextValue;
}
