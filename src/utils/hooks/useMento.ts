import { useState, useCallback, useRef, useEffect } from "react";
import { useAccount, useWalletClient, usePublicClient } from "wagmi";
import { Mento } from "@mento-protocol/mento-sdk";
import { parseUnits, formatUnits } from "viem";
import { providers, Contract, utils } from "ethers";
import { STABLE_TOKENS, getTokenAddress } from "../config/web3.config";
import { debounce } from "lodash-es";

interface MentoState {
  isInitializing: boolean;
  isSwapping: boolean;
  isGettingQuote: boolean;
  error: string | null;
  lastQuote: SwapQuote | null;
}

interface SwapQuote {
  amountOut: string;
  exchangeRate: string;
  minAmountOut: string;
  priceImpact: string;
  route: string[];
  timestamp: number;
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
}

const QUOTE_CACHE_DURATION = 30000;
const SLIPPAGE_DEFAULT = 0.01; // 1%

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
  });

  const mentoRef = useRef<Mento | null>(null);
  const quoteCache = useRef<Map<string, SwapQuote>>(new Map());

  const initializeMento = useCallback(async (): Promise<boolean> => {
    if (!address || !walletClient || mentoRef.current) {
      return !!mentoRef.current;
    }

    setState((prev) => ({ ...prev, isInitializing: true, error: null }));

    try {
      const provider = new providers.Web3Provider(window.ethereum!);
      const signer = provider.getSigner();
      const mento = await Mento.create(signer);

      mentoRef.current = mento;
      setState((prev) => ({ ...prev, isInitializing: false }));
      return true;
    } catch (error) {
      console.error("Failed to initialize Mento:", error);
      setState((prev) => ({
        ...prev,
        isInitializing: false,
        error: "Failed to initialize swap functionality",
      }));
      return false;
    }
  }, [address, walletClient]);

  const getSwapQuote = useCallback(
    async (
      fromSymbol: string,
      toSymbol: string,
      amount: number,
      slippageTolerance = SLIPPAGE_DEFAULT
    ): Promise<SwapQuote> => {
      if (!mentoRef.current || amount <= 0) {
        return {
          amountOut: "0",
          exchangeRate: "0",
          minAmountOut: "0",
          priceImpact: "0",
          route: [fromSymbol, toSymbol],
          timestamp: Date.now(),
        };
      }

      const cacheKey = `${fromSymbol}-${toSymbol}-${amount}-${slippageTolerance}`;
      const cached = quoteCache.current.get(cacheKey);

      if (cached && Date.now() - cached.timestamp < QUOTE_CACHE_DURATION) {
        return cached;
      }

      setState((prev) => ({ ...prev, isGettingQuote: true, error: null }));

      try {
        const chainId = (await walletClient?.getChainId()) || 44787;

        const fromToken = STABLE_TOKENS.find((t) => t.symbol === fromSymbol);
        const toToken = STABLE_TOKENS.find((t) => t.symbol === toSymbol);

        if (!fromToken || !toToken) {
          throw new Error("Invalid token symbols");
        }

        const fromAddress = getTokenAddress(fromToken, chainId);
        const toAddress = getTokenAddress(toToken, chainId);

        if (!fromAddress || !toAddress) {
          throw new Error("Token addresses not found for current chain");
        }

        const amountIn = parseUnits(amount.toString(), fromToken.decimals);

        // Find tradable pair with proper error handling
        let tradablePair;
        let amountOut;
        let route: string[] = [];

        try {
          // Try to find direct or routed pair
          tradablePair = await mentoRef.current.findPairForTokens(
            fromAddress,
            toAddress
          );

          // Get amount out using the tradable pair
          amountOut = await mentoRef.current.getAmountOut(
            fromAddress,
            toAddress,
            amountIn,
            tradablePair
          );

          // Determine route based on path length
          if (tradablePair.path && tradablePair.path.length > 1) {
            // Multi-hop route (e.g., cUSD -> CELO -> cEUR)
            route = [fromSymbol, "CELO", toSymbol];
          } else {
            // Direct route
            route = [fromSymbol, toSymbol];
          }
        } catch (pairError) {
          console.error("Pair finding failed:", pairError);

          // Fallback: try direct swap without routing
          try {
            amountOut = await mentoRef.current.getAmountOut(
              fromAddress,
              toAddress,
              amountIn
            );
            route = [fromSymbol, toSymbol];
          } catch (directError) {
            throw new Error(
              `No trading path available between ${fromSymbol} and ${toSymbol}`
            );
          }
        }

        const amountOutFormatted = formatUnits(
          BigInt(amountOut.toString()),
          toToken.decimals
        );

        const exchangeRate = (
          parseFloat(amountOutFormatted) / amount
        ).toString();

        // Calculate minimum amount out with slippage
        const minAmountOut = (
          (BigInt(amountOut.toString()) *
            BigInt(Math.floor((1 - slippageTolerance) * 10000))) /
          BigInt(10000)
        ).toString();

        const minAmountOutFormatted = formatUnits(
          BigInt(minAmountOut),
          toToken.decimals
        );

        // Calculate price impact (simplified - you may want to implement proper calculation)
        const priceImpact = "0.1";

        const quote: SwapQuote = {
          amountOut: amountOutFormatted,
          exchangeRate,
          minAmountOut: minAmountOutFormatted,
          priceImpact,
          route,
          timestamp: Date.now(),
        };

        quoteCache.current.set(cacheKey, quote);

        setState((prev) => ({
          ...prev,
          isGettingQuote: false,
          lastQuote: quote,
        }));

        return quote;
      } catch (error: any) {
        const errorMessage = error.message || "Failed to get quote";
        setState((prev) => ({
          ...prev,
          isGettingQuote: false,
          error: errorMessage,
        }));
        throw new Error(errorMessage);
      }
    },
    [walletClient]
  );

  const performSwap = useCallback(
    async (params: SwapParams): Promise<SwapResult> => {
      if (!mentoRef.current || !address || !walletClient) {
        throw new Error("Swap not ready");
      }

      const {
        fromSymbol,
        toSymbol,
        amount,
        slippageTolerance = SLIPPAGE_DEFAULT,
        recipientAddress,
      } = params;

      setState((prev) => ({ ...prev, isSwapping: true, error: null }));

      try {
        const chainId = await walletClient.getChainId();

        const fromToken = STABLE_TOKENS.find((t) => t.symbol === fromSymbol);
        const toToken = STABLE_TOKENS.find((t) => t.symbol === toSymbol);

        if (!fromToken || !toToken) {
          throw new Error("Invalid token symbols");
        }

        const fromAddress = getTokenAddress(fromToken, chainId);
        const toAddress = getTokenAddress(toToken, chainId);

        if (!fromAddress || !toAddress) {
          throw new Error("Token addresses not found");
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

        // Find tradable pair
        let tradablePair;
        try {
          tradablePair = await mentoRef.current.findPairForTokens(
            fromAddress,
            toAddress
          );
        } catch (error) {
          // If no pair found, try direct swap
          tradablePair = undefined;
        }

        // Increase trading allowance
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

        await publicClient?.waitForTransactionReceipt({ hash: allowanceHash });

        // Execute swap
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

        await publicClient?.waitForTransactionReceipt({ hash: swapHash });

        let result: SwapResult = {
          success: true,
          hash: swapHash,
          amountOut: quote.amountOut,
          recipient: recipientAddress || address,
        };

        // Handle remittance if needed
        if (recipientAddress && recipientAddress !== address) {
          const transferHash = await handleRemittance(
            toAddress,
            recipientAddress,
            quote.amountOut,
            toToken.decimals
          );
          result.transferHash = transferHash;
        }

        setState((prev) => ({ ...prev, isSwapping: false }));
        return result;
      } catch (error: any) {
        const errorMessage = parseSwapError(error);
        setState((prev) => ({
          ...prev,
          isSwapping: false,
          error: errorMessage,
        }));
        throw new Error(errorMessage);
      }
    },
    [address, walletClient, publicClient, getSwapQuote]
  );

  const handleRemittance = async (
    tokenAddress: string,
    recipient: string,
    amount: string,
    decimals: number
  ): Promise<string> => {
    const tokenContract = new Contract(
      tokenAddress,
      ["function transfer(address,uint256) returns (bool)"],
      new providers.Web3Provider(window.ethereum!).getSigner()
    );

    const transferTx = await tokenContract.populateTransaction.transfer(
      recipient,
      parseUnits(amount, decimals)
    );

    return await walletClient!.sendTransaction({
      account: address as `0x${string}`,
      to: tokenAddress as `0x${string}`,
      data: transferTx.data as `0x${string}`,
      value: BigInt(0),
    });
  };

  const parseSwapError = (error: any): string => {
    const message = error?.message || error?.toString() || "";

    if (message.includes("No pair found") || message.includes("tradable path"))
      return "Trading pair not available";
    if (message.includes("transferFrom failed"))
      return "Token approval required";
    if (message.includes("Insufficient")) return "Insufficient balance";
    if (message.includes("User rejected"))
      return "Transaction cancelled by user";
    if (message.includes("slippage"))
      return "Price moved beyond slippage tolerance";

    return "Swap failed. Please try again.";
  };

  const debouncedGetQuote = useCallback(debounce(getSwapQuote, 500), [
    getSwapQuote,
  ]);

  useEffect(() => {
    if (address && walletClient) {
      initializeMento();
    }
  }, [address, walletClient, initializeMento]);

  return {
    ...state,
    initializeMento,
    getSwapQuote: debouncedGetQuote,
    performSwap,
    clearCache: () => quoteCache.current.clear(),
    isReady: !!mentoRef.current,
  };
}
