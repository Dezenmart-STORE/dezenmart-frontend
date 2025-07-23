import { useState, useCallback, useRef, useEffect } from "react";
import { useAccount, useWalletClient, usePublicClient } from "wagmi";
import { Mento } from "@mento-protocol/mento-sdk";
import { parseEther, formatEther, parseUnits, formatUnits } from "viem";
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

const QUOTE_CACHE_DURATION = 30000; // 30 seconds
const SLIPPAGE_DEFAULT = 0.05; // 5%
const DEADLINE_MINUTES = 20;

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
  const brokerRef = useRef<Contract | null>(null);
  const quoteCache = useRef<Map<string, SwapQuote>>(new Map());

  // Initialize Mento SDK
  const initializeMento = useCallback(async (): Promise<boolean> => {
    if (!address || !walletClient || mentoRef.current) {
      return !!mentoRef.current;
    }

    setState((prev) => ({ ...prev, isInitializing: true, error: null }));

    try {
      const provider = new providers.Web3Provider(window.ethereum!);
      const signer = provider.getSigner();

      const mento = await Mento.create(signer);
      const broker = await mento.getBroker();

      mentoRef.current = mento;
      brokerRef.current = broker;

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

  // Get swap quote with caching
  const getSwapQuote = useCallback(
    async (
      fromSymbol: string,
      toSymbol: string,
      amount: number,
      slippageTolerance = SLIPPAGE_DEFAULT
    ): Promise<SwapQuote> => {
      if (!mentoRef.current || amount <= 0) {
        // throw new Error("Invalid swap parameters");
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

        // Get tradable pair for route discovery
        const tradablePair = await mentoRef.current.findPairForTokens(
          fromAddress,
          toAddress
        );

        // Get amount out
        const amountOut = await mentoRef.current.getAmountOut(
          fromAddress,
          toAddress,
          amountIn
        );

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

        // Calculate price impact (simplified)
        const priceImpact = "0.1"; // This should be calculated properly based on pool reserves

        // Determine route
        const route =
          tradablePair.path.length > 1
            ? [fromSymbol, "CELO", toSymbol]
            : [fromSymbol, toSymbol];

        const quote: SwapQuote = {
          amountOut: amountOutFormatted,
          exchangeRate,
          minAmountOut: minAmountOutFormatted,
          priceImpact,
          route,
          timestamp: Date.now(),
        };

        // Cache the quote
        quoteCache.current.set(cacheKey, quote);

        setState((prev) => ({
          ...prev,
          isGettingQuote: false,
          lastQuote: quote,
        }));
        return quote;
      } catch (error: any) {
        setState((prev) => ({
          ...prev,
          isGettingQuote: false,
          error: error.message || "Failed to get quote",
        }));
        throw error;
      }
    },
    [walletClient]
  );

  // Debounced quote function for UI
  const debouncedGetQuote = useCallback(debounce(getSwapQuote, 500), [
    getSwapQuote,
  ]);

  // Execute swap
  const performSwap = useCallback(
    async (params: SwapParams): Promise<SwapResult> => {
      if (
        !mentoRef.current ||
        !brokerRef.current ||
        !address ||
        !walletClient
      ) {
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

        // Check and handle allowance
        await handleTokenAllowance(
          fromAddress,
          fromToken,
          amountIn.toString(),
          brokerRef.current.address
        );

        // Get tradable pair
        const tradablePair = await mentoRef.current.findPairForTokens(
          fromAddress,
          toAddress
        );

        let swapHash: string;

        if (tradablePair.path.length === 1) {
          // Direct swap
          swapHash = await executeDirectSwap(
            tradablePair.path[0],
            fromAddress,
            toAddress,
            amountIn.toString(),
            minAmountOut.toString()
          );
        } else {
          // Multi-hop swap
          swapHash = await executeMultiHopSwap(
            tradablePair,
            fromAddress,
            toAddress,
            amountIn.toString(),
            slippageTolerance
          );
        }

        // Wait for confirmation
        await publicClient?.waitForTransactionReceipt({
          hash: swapHash as `0x${string}`,
        });

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
        setState((prev) => ({
          ...prev,
          isSwapping: false,
          error: parseSwapError(error),
        }));
        throw new Error(parseSwapError(error));
      }
    },
    [address, walletClient, publicClient, getSwapQuote]
  );

  // Helper function to handle token allowance
  const handleTokenAllowance = async (
    tokenAddress: string,
    token: any,
    amount: string,
    spenderAddress: string
  ) => {
    const tokenContract = new Contract(
      tokenAddress,
      [
        "function allowance(address,address) view returns (uint256)",
        "function approve(address,uint256) returns (bool)",
      ],
      new providers.Web3Provider(window.ethereum!).getSigner()
    );

    const currentAllowance = await tokenContract.allowance(
      address,
      spenderAddress
    );

    if (BigInt(currentAllowance.toString()) < BigInt(amount)) {
      const approveTx = await tokenContract.populateTransaction.approve(
        spenderAddress,
        amount
      );

      const hash = await walletClient!.sendTransaction({
        account: address as `0x${string}`,
        to: tokenAddress as `0x${string}`,
        data: approveTx.data as `0x${string}`,
        value: BigInt(0),
      });

      await publicClient?.waitForTransactionReceipt({ hash });
    }
  };

  // Execute direct swap
  const executeDirectSwap = async (
    exchange: any,
    fromAddress: string,
    toAddress: string,
    amountIn: string,
    minAmountOut: string
  ): Promise<string> => {
    const txRequest = await brokerRef.current!.populateTransaction.swapIn(
      exchange.providerAddr,
      exchange.id,
      fromAddress,
      toAddress,
      amountIn,
      minAmountOut
    );

    return await walletClient!.sendTransaction({
      account: address as `0x${string}`,
      to: brokerRef.current!.address as `0x${string}`,
      data: txRequest.data as `0x${string}`,
      gas: txRequest.gasLimit
        ? BigInt(txRequest.gasLimit.toString())
        : undefined,
      value: BigInt(0),
    });
  };

  // Execute multi-hop swap
  const executeMultiHopSwap = async (
    tradablePair: any,
    fromAddress: string,
    toAddress: string,
    amountIn: string,
    slippageTolerance: number
  ): Promise<string> => {
    // Implement multi-hop logic similar to the reference
    // This is a simplified version - you'd need to implement the full logic
    const firstExchange = tradablePair.path[0];
    const secondExchange = tradablePair.path[1];

    // Find intermediate token
    const intermediateToken = findIntermediateToken(
      firstExchange,
      secondExchange,
      fromAddress,
      toAddress
    );

    // Execute first swap
    const step1Quote = await mentoRef.current!.getAmountOut(
      fromAddress,
      intermediateToken,
      BigInt(amountIn)
    );
    const step1MinAmount = (
      (BigInt(step1Quote.toString()) *
        BigInt(Math.floor((1 - slippageTolerance) * 10000))) /
      BigInt(10000)
    ).toString();

    const step1Hash = await executeDirectSwap(
      firstExchange,
      fromAddress,
      intermediateToken,
      amountIn,
      step1MinAmount
    );
    await publicClient?.waitForTransactionReceipt({
      hash: step1Hash as `0x${string}`,
    });

    // Handle intermediate token allowance
    await handleTokenAllowance(
      intermediateToken,
      { decimals: 18 },
      step1Quote.toString(),
      brokerRef.current!.address
    );

    // Execute second swap
    const step2Quote = await mentoRef.current!.getAmountOut(
      intermediateToken,
      toAddress,
      step1Quote
    );
    const step2MinAmount = (
      (BigInt(step2Quote.toString()) *
        BigInt(Math.floor((1 - slippageTolerance) * 10000))) /
      BigInt(10000)
    ).toString();

    return await executeDirectSwap(
      secondExchange,
      intermediateToken,
      toAddress,
      step1Quote.toString(),
      step2MinAmount
    );
  };

  // Handle remittance
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

  // Helper functions
  const findIntermediateToken = (
    exchange1: any,
    exchange2: any,
    fromAddr: string,
    toAddr: string
  ): string => {
    for (const asset1 of exchange1.assets) {
      for (const asset2 of exchange2.assets) {
        if (asset1 === asset2 && asset1 !== fromAddr && asset1 !== toAddr) {
          return asset1;
        }
      }
    }
    throw new Error("No intermediate token found");
  };

  const parseSwapError = (error: any): string => {
    const message = error?.message || error?.toString() || "";

    if (message.includes("transferFrom failed"))
      return "Token approval required";
    if (message.includes("pair not available"))
      return "Trading pair not available";
    if (message.includes("Insufficient")) return "Insufficient balance";
    if (message.includes("User rejected"))
      return "Transaction cancelled by user";
    if (message.includes("slippage"))
      return "Price moved beyond slippage tolerance";

    return "Swap failed. Please try again.";
  };

  // Initialize on mount
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
    isReady: !!mentoRef.current && !!brokerRef.current,
  };
}
