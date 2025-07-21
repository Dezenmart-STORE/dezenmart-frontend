import { useState, useCallback } from "react";
import { Mento } from "@mento-protocol/mento-sdk";
import { parseUnits, formatUnits } from "viem";
import { useWeb3 } from "../../context/Web3Context";
import { useCurrencyConverter } from "./useCurrencyConverter";
import { useSnackbar } from "../../context/SnackbarContext";
import { STABLE_TOKENS } from "../config/web3.config";

interface SwapParams {
  fromToken: string;
  toToken: string;
  amount: string;
  slippageTolerance?: number;
}

interface SwapQuote {
  estimatedOutput: string;
  minimumOutput: string;
  priceImpact: number;
  route: string[];
}

export const useSwap = () => {
  const [isSwapping, setIsSwapping] = useState(false);
  const [swapError, setSwapError] = useState<string | null>(null);
  const { wallet, writeContractAsync } = useWeb3();
  const { convertPrice } = useCurrencyConverter();
  const { showSnackbar } = useSnackbar();

  const initializeMento = useCallback(async () => {
    if (!wallet.chainId) throw new Error("Chain not connected");

    const mento = await Mento.create({
      chainId: wallet.chainId,
      rpcUrl: process.env.VITE_RPC_URL || "https://forno.celo.org",
    });

    return mento;
  }, [wallet.chainId]);

  const getSwapQuote = useCallback(
    async (params: SwapParams): Promise<SwapQuote | null> => {
      try {
        const mento = await initializeMento();

        // Convert USD amount to token amount
        const fromTokenAmount = convertPrice(
          parseFloat(params.amount),
          "FIAT",
          params.fromToken
        );
        const fromTokenDecimals =
          STABLE_TOKENS.find((t) => t.symbol === params.fromToken)?.decimals ||
          18;

        const amountInWei = parseUnits(
          fromTokenAmount.toString(),
          fromTokenDecimals
        );

        const quote = await mento.getAmountOut(
          params.fromToken,
          params.toToken,
          amountInWei.toString()
        );

        const toTokenDecimals =
          STABLE_TOKENS.find((t) => t.symbol === params.toToken)?.decimals ||
          18;
        const estimatedOutput = formatUnits(
          BigInt(quote.amountOut),
          toTokenDecimals
        );
        const minimumOutput = formatUnits(
          (BigInt(quote.amountOut) *
            BigInt(100 - (params.slippageTolerance || 1))) /
            BigInt(100),
          toTokenDecimals
        );

        return {
          estimatedOutput,
          minimumOutput,
          priceImpact: quote.priceImpact || 0,
          route: quote.route || [params.fromToken, params.toToken],
        };
      } catch (error) {
        console.error("Failed to get swap quote:", error);
        return null;
      }
    },
    [initializeMento, convertPrice, STABLE_TOKENS]
  );

  const executeSwap = useCallback(
    async (params: SwapParams): Promise<string> => {
      if (!wallet.address) throw new Error("Wallet not connected");

      setIsSwapping(true);
      setSwapError(null);

      try {
        const mento = await initializeMento();

        // Convert USD amount to token amount
        const fromTokenAmount = convertPrice(
          parseFloat(params.amount),
          "FIAT",
          params.fromToken
        );
        const fromToken = STABLE_TOKENS.find(
          (t) => t.symbol === params.fromToken
        );

        if (!fromToken) throw new Error(`Token ${params.fromToken} not found`);

        const amountInWei = parseUnits(
          fromTokenAmount.toString(),
          fromToken.decimals
        );

        // Get swap transaction data
        const swapTx = await mento.swapIn(
          params.fromToken,
          params.toToken,
          amountInWei.toString(),
          wallet.address
          //   params.slippageTolerance || 1
        );

        // Execute the swap transaction
        const hash = await writeContractAsync({
          address: swapTx.to as `0x${string}`,
          abi: swapTx.abi,
          functionName: swapTx.functionName,
          args: swapTx.args,
          value: BigInt(swapTx.value || "0"),
        });

        showSnackbar(
          `Swap successful! Hash: ${hash.slice(0, 10)}...`,
          "success"
        );
        return hash;
      } catch (error: any) {
        const errorMessage = error?.message || "Swap failed";
        setSwapError(errorMessage);
        showSnackbar(`Swap failed: ${errorMessage}`, "error");
        throw error;
      } finally {
        setIsSwapping(false);
      }
    },
    [initializeMento, convertPrice, wallet, writeContractAsync, showSnackbar]
  );

  return {
    getSwapQuote,
    executeSwap,
    isSwapping,
    swapError,
    clearSwapError: () => setSwapError(null),
  };
};
