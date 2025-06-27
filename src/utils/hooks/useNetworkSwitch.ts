import { useCallback, useState, useRef, useEffect } from "react";
import { useSwitchChain } from "wagmi";
import { useWeb3 } from "../../context/Web3Context";
import {
  SUPPORTED_CHAINS,
  getChainMetadata,
} from "../../utils/config/web3.config";
import { useSnackbar } from "../../context/SnackbarContext";

interface UseNetworkSwitchOptions {
  targetChainId?: number;
  onSuccess?: (chainId: number) => void;
  onError?: (error: Error) => void;
}

export const useNetworkSwitch = (options: UseNetworkSwitchOptions = {}) => {
  const { wallet, chainId } = useWeb3();
  const { switchChain, isPending: isWagmiSwitching } = useSwitchChain();
  const { showSnackbar } = useSnackbar();
  const [isSwitching, setIsSwitching] = useState(false);
  const switchTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  const switchNetwork = useCallback(
    async (targetChainId?: number) => {
      const targetId = targetChainId || options.targetChainId;

      if (!wallet.isConnected) {
        const error = new Error("Wallet not connected");
        options.onError?.(error);
        throw error;
      }

      if (isSwitching || isWagmiSwitching) {
        return {
          success: false,
          error: new Error("Switch already in progress"),
        };
      }

      if (!targetId) {
        const error = new Error("No target chain ID specified");
        options.onError?.(error);
        throw error;
      }

      if (chainId === targetId) {
        options.onSuccess?.(targetId);
        return { success: true, error: null };
      }

      setIsSwitching(true);

      // Clear any existing timeout
      if (switchTimeoutRef.current) {
        clearTimeout(switchTimeoutRef.current);
      }

      // Set timeout for switch operation
      switchTimeoutRef.current = setTimeout(() => {
        setIsSwitching(false);
        const timeoutError = new Error("Network switch timed out");
        options.onError?.(timeoutError);
      }, 30000); // 30 second timeout

      try {
        await switchChain({ chainId: targetId });

        // Clear timeout on success
        if (switchTimeoutRef.current) {
          clearTimeout(switchTimeoutRef.current);
        }

        const chainMetadata = getChainMetadata(targetId);

        options.onSuccess?.(targetId);
        return { success: true, error: null };
      } catch (error: any) {
        // Clear timeout on error
        if (switchTimeoutRef.current) {
          clearTimeout(switchTimeoutRef.current);
        }

        console.error("Network switch failed:", error);

        let errorMessage = "Failed to switch network";

        if (error?.message) {
          const msg = error.message.toLowerCase();
          if (
            msg.includes("user rejected") ||
            msg.includes("rejected") ||
            msg.includes("cancelled") ||
            msg.includes("user denied")
          ) {
            errorMessage = "Network switch cancelled by user";
          } else if (msg.includes("unsupported")) {
            errorMessage = "Network not supported by your wallet";
          } else if (msg.includes("timeout")) {
            errorMessage = "Network switch timed out";
          }
        }

        const errorObj = new Error(errorMessage);
        options.onError?.(errorObj);
        throw errorObj;
      } finally {
        setIsSwitching(false);
      }
    },
    [
      wallet.isConnected,
      chainId,
      isSwitching,
      isWagmiSwitching,
      options,
      switchChain,
    ]
  );

  const isOnTargetNetwork = useCallback(
    (targetChainId?: number) => {
      const targetId = targetChainId || options.targetChainId;
      return chainId === targetId;
    },
    [chainId, options.targetChainId]
  );

  const isOnSupportedNetwork = useCallback(() => {
    return chainId
      ? SUPPORTED_CHAINS.some((chain) => chain.id === chainId)
      : false;
  }, [chainId]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (switchTimeoutRef.current) {
        clearTimeout(switchTimeoutRef.current);
      }
    };
  }, []);

  return {
    switchNetwork,
    isSwitching: isSwitching || isWagmiSwitching,
    isOnTargetNetwork,
    isOnSupportedNetwork,
    currentChainId: chainId,
    isConnected: wallet.isConnected,
  };
};
