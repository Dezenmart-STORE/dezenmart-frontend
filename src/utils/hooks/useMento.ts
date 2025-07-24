import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { useAccount, useWalletClient, usePublicClient } from "wagmi";
import { Mento, TradablePair } from "@mento-protocol/mento-sdk";
import { parseUnits, formatUnits, erc20Abi } from "viem";
import { providers, Contract, BigNumber } from "ethers";
import {
  STABLE_TOKENS,
  getTokenAddress,
  TARGET_CHAIN,
} from "../config/web3.config";
import { debounce } from "lodash-es";

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

const QUOTE_CACHE_DURATION = 15000; // 15 seconds
const SLIPPAGE_DEFAULT = 0.01; // 1%
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

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
  });

  const mentoRef = useRef<Mento | null>(null);
  const quoteCache = useRef<Map<string, SwapQuote>>(new Map());
  const abortControllerRef = useRef<AbortController | null>(null);
  const quoteTtlRef = useRef<NodeJS.Timeout | null>(null);

  // Available trading pairs cache
  const [availablePairs, setAvailablePairs] = useState<any[]>([]);

  const initializeMento = useCallback(async (): Promise<boolean> => {
    if (state.isInitialized || !address || !walletClient) {
      return state.isInitialized;
    }

    setState((prev) => ({ ...prev, isInitializing: true, error: null }));

    let retries = 0;
    while (retries < MAX_RETRIES) {
      try {
        // Ensure we have ethereum provider
        if (!window.ethereum) {
          throw new Error("No ethereum provider found");
        }

        const provider = new providers.Web3Provider(window.ethereum);
        const signer = provider.getSigner();

        // Verify network
        const network = await provider.getNetwork();
        if (network.chainId !== TARGET_CHAIN.id) {
          throw new Error(`Please switch to ${TARGET_CHAIN.name}`);
        }

        const mento = await Mento.create(signer);

        // Test the connection by fetching tradable pairs
        const pairs = await mento.getTradablePairs();
        setAvailablePairs(pairs);

        mentoRef.current = mento;
        setState((prev) => ({
          ...prev,
          isInitializing: false,
          isInitialized: true,
          error: null,
        }));

        return true;
      } catch (error: any) {
        retries++;
        console.error(`Mento initialization attempt ${retries} failed:`, error);

        if (retries === MAX_RETRIES) {
          setState((prev) => ({
            ...prev,
            isInitializing: false,
            isInitialized: false,
            error: `Failed to initialize swap functionality: ${error.message}`,
          }));
          return false;
        }

        await new Promise((resolve) =>
          setTimeout(resolve, RETRY_DELAY * retries)
        );
      }
    }

    return false;
  }, [address, walletClient, state.isInitialized]);

  const clearQuoteCache = useCallback(() => {
    quoteCache.current.clear();
    if (quoteTtlRef.current) {
      clearTimeout(quoteTtlRef.current);
    }
  }, []);

  const validateTokenPair = useCallback(
    (fromSymbol: string, toSymbol: string): boolean => {
      if (fromSymbol === toSymbol) return false;

      const fromToken = STABLE_TOKENS.find((t) => t.symbol === fromSymbol);
      const toToken = STABLE_TOKENS.find((t) => t.symbol === toSymbol);

      return !!(
        fromToken &&
        toToken &&
        fromToken.address[TARGET_CHAIN.id] &&
        toToken.address[TARGET_CHAIN.id]
      );
    },
    []
  );

  const getSwapQuote = useCallback(
    async (
      fromSymbol: string,
      toSymbol: string,
      amount: number,
      slippageTolerance = SLIPPAGE_DEFAULT
    ): Promise<SwapQuote> => {
      console.log(
        `[getSwapQuote] Calling with: from=${fromSymbol}, to=${toSymbol}, amount=${amount}`
      );

      // Input validation
      if (
        !mentoRef.current ||
        amount <= 0 ||
        !validateTokenPair(fromSymbol, toSymbol)
      ) {
        throw new Error("Invalid swap parameters");
      }

      const cacheKey = `${fromSymbol}-${toSymbol}-${amount}-${slippageTolerance}`;
      const cached = quoteCache.current.get(cacheKey);

      if (cached && Date.now() - cached.timestamp < QUOTE_CACHE_DURATION) {
        setState((prev) => ({ ...prev, lastQuote: cached }));
        return cached;
      }

      // Cancel previous request
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
          throw new Error("Token addresses not found for current chain");
        }

        const amountIn = parseUnits(amount.toString(), fromToken.decimals);
        console.log(`[getSwapQuote] amountIn: ${amountIn.toString()}`);

        let tradablePair: TradablePair | undefined;
        let amountOut: BigNumber;
        let route: string[] = [];
        let gasEstimate = "0";

        try {
          // Try to find the best trading path
          console.log("[getSwapQuote] Finding pair for tokens...");
          console.log(
            "[getSwapQuote] tp",
            await mentoRef.current.findPairForTokens(fromAddress, toAddress)
          );
          tradablePair = await mentoRef.current.findPairForTokens(
            fromAddress,
            toAddress
          );

          console.log("[getSwapQuote] Tradable pair found:", tradablePair);

          // Get amount out using the found pair
          console.log(
            "[getSwapQuote] Getting amount out with tradable pair..."
          );
          amountOut = await mentoRef.current.getAmountOut(
            fromAddress,
            toAddress,
            BigNumber.from(amountIn.toString()),
            tradablePair
          );
          console.log(
            "[getSwapQuote] amountOut raw (with pair):",
            amountOut.toString()
          );

          // Determine route
          if (tradablePair?.path && tradablePair.path.length > 2) {
            // Multi-hop route
            const pathSymbols = tradablePair.path.map((pair) => {
              const addr = pair.assets[0];
              const token = STABLE_TOKENS.find(
                (t) =>
                  getTokenAddress(t, chainId)?.toLowerCase() ===
                  addr.toLowerCase()
              );
              return token?.symbol || addr;
            });
            route = pathSymbols;
          } else {
            route = [fromSymbol, toSymbol];
          }
        } catch (pairError: any) {
          console.warn(
            "[getSwapQuote] Error finding pair, attempting direct swap:",
            pairError
          );

          // Fallback to direct swap
          try {
            amountOut = await mentoRef.current.getAmountOut(
              fromAddress,
              toAddress,
              BigNumber.from(amountIn.toString())
            );
            route = [fromSymbol, toSymbol];
            console.log(
              "[getSwapQuote] amountOut raw (direct swap):",
              amountOut.toString()
            );
          } catch (directSwapError: any) {
            console.error(
              "[getSwapQuote] Direct swap also failed:",
              directSwapError
            );
            throw new Error(
              `No trading path available between ${fromSymbol} and ${toSymbol}: ${directSwapError.message}`
            );
          }
        }

        const amountOutFormatted = formatUnits(
          BigInt(amountOut.toString()),
          toToken.decimals
        );

        const exchangeRate = (parseFloat(amountOutFormatted) / amount).toFixed(
          6
        );
        console.log(`[getSwapQuote] exchangeRate: ${exchangeRate}`);

        // Calculate minimum amount out with slippage
        const minAmountOut = amountOut
          .mul(Math.floor((1 - slippageTolerance) * 10000))
          .div(10000);
        const minAmountOutFormatted = formatUnits(
          BigInt(minAmountOut.toString()),
          toToken.decimals
        );
        console.log(
          `[getSwapQuote] minAmountOutFormatted: ${minAmountOutFormatted}`
        );

        // Calculate price impact
        const priceImpact = calculatePriceImpact(
          amount,
          parseFloat(amountOutFormatted)
        );
        console.log(`[getSwapQuote] priceImpact: ${priceImpact}`);

        // Estimate gas and fees
        let estimatedGasLimit: BigNumber;
        try {
          console.log("[getSwapQuote] Estimating gas...");
          const txRequest = await mentoRef.current.swapIn(
            fromAddress,
            toAddress,
            amountIn,
            minAmountOut,
            tradablePair
          );
          const gasEstimateBigInt = await publicClient!.estimateGas({
            account: address as `0x${string}`,
            to: txRequest.to as `0x${string}`,
            data: txRequest.data as `0x${string}`,
            value: BigInt(txRequest.value?.toString() || "0"),
          });
          estimatedGasLimit = BigNumber.from(gasEstimateBigInt.toString());
          console.log(
            "[getSwapQuote] estimatedGasLimit:",
            estimatedGasLimit.toString()
          );
        } catch (gasError) {
          console.warn(
            "[getSwapQuote] Failed to estimate gas, using default:",
            gasError
          );
          estimatedGasLimit = BigNumber.from(300000);
        }

        const networkFee = await getGasFee(publicClient!, estimatedGasLimit);
        const protocolFee = "0"; // Placeholder for actual protocol fees
        console.log(
          `[getSwapQuote] networkFee: ${networkFee}, protocolFee: ${protocolFee}`
        );

        const quote: SwapQuote = {
          amountOut: amountOutFormatted,
          exchangeRate,
          minAmountOut: minAmountOutFormatted,
          priceImpact,
          route,
          fees: { networkFee, protocolFee },
          gasEstimate: formatUnits(BigInt(estimatedGasLimit.toString()), 18), // Gas estimate in CELO
          timestamp: Date.now(),
        };

        // Cache the quote
        quoteCache.current.set(cacheKey, quote);

        // Set TTL for cache cleanup
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
        console.log("[getSwapQuote] Quote fetched successfully:", quote);

        return quote;
      } catch (error: any) {
        console.error("[getSwapQuote] Error fetching quote:", error);
        if (error.name === "AbortError") return Promise.reject(error);

        const errorMessage = parseSwapError(error);
        setState((prev) => ({
          ...prev,
          isGettingQuote: false,
          error: errorMessage,
        }));
        throw new Error(errorMessage);
      }
    },
    [walletClient, validateTokenPair, publicClient, address]
  );

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
        totalSteps: 2,
      })); // Initialize steps

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

        // Get fresh quote
        const quote = await getSwapQuote(
          fromSymbol,
          toSymbol,
          amount,
          slippageTolerance
        );
        const minAmountOut = BigNumber.from(
          parseUnits(quote.minAmountOut, toToken.decimals).toString()
        );

        // Find tradable pair
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

        // Step 1: Increase trading allowance
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

        // Wait for allowance transaction
        const allowanceReceipt = await publicClient?.waitForTransactionReceipt({
          hash: allowanceHash,
          timeout: 60000,
        });

        if (allowanceReceipt?.status !== "success") {
          throw new Error("Allowance transaction failed");
        }

        setState((prev) => ({ ...prev, isApproving: false, currentStep: 2 }));

        // Step 2: Execute swap
        setState((prev) => ({
          ...prev,
          currentStep: recipientAddress ? 2 : 2,
        })); // Adjust step for remittance
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

        // Wait for swap transaction
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

        // Step 3: Handle remittance if recipient is different
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
        })); // Reset steps on completion

        // Clear cache after successful swap
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
        })); // Reset steps on error
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
    const message = error?.message || error?.toString() || "";

    if (message.includes("No pair found") || message.includes("tradable path"))
      return "Trading pair not available for this token combination";
    if (
      message.includes("transferFrom failed") ||
      message.includes("allowance")
    )
      return "Token approval required or insufficient allowance";
    if (message.includes("Insufficient"))
      return "Insufficient balance for this swap";
    if (message.includes("User rejected") || message.includes("rejected"))
      return "Transaction cancelled by user";
    if (message.includes("slippage") || message.includes("minimum"))
      return "Price moved beyond acceptable slippage tolerance";
    if (message.includes("network") || message.includes("connection"))
      return "Network connection issue. Please try again";
    if (message.includes("gas"))
      return "Transaction failed due to gas estimation. Please try again";

    return "Swap failed. Please check your connection and try again";
  };

  // Debounced quote fetching
  const debouncedGetQuote = useCallback(debounce(getSwapQuote, 800), [
    getSwapQuote,
  ]);

  // Auto-initialize when dependencies are ready
  useEffect(() => {
    if (
      address &&
      walletClient &&
      !state.isInitialized &&
      !state.isInitializing
    ) {
      initializeMento();
    }
  }, [
    address,
    walletClient,
    state.isInitialized,
    state.isInitializing,
    initializeMento,
  ]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (quoteTtlRef.current) {
        clearTimeout(quoteTtlRef.current);
      }
      debouncedGetQuote.cancel();
    };
  }, [debouncedGetQuote]);

  // Memoized return value
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

const calculatePriceImpact = (amountIn: number, amountOut: number): string => {
  if (amountIn <= 0 || amountOut <= 0) return "0";
  const expectedRate = 1;
  const actualRate = amountOut / amountIn;
  const impact = Math.abs((expectedRate - actualRate) / expectedRate) * 100;
  return impact.toFixed(4);
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
    return "0";
  }
};
