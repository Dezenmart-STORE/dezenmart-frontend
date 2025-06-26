import { useCallback, useState } from "react";
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
  const { wallet, switchToCorrectNetwork } = useWeb3();
  const { showSnackbar } = useSnackbar();
  const [isSwitching, setIsSwitching] = useState(false);

  const switchNetwork = useCallback(
    async (chainId?: number) => {
      const targetId = chainId || options.targetChainId;

      if (!wallet.isConnected) {
        const error = new Error("Wallet not connected");
        options.onError?.(error);
        return { success: false, error };
      }

      if (isSwitching) {
        return {
          success: false,
          error: new Error("Switch already in progress"),
        };
      }

      setIsSwitching(true);

      try {
        if (targetId && wallet.chainId !== targetId) {
          const { switchChain } = await import("wagmi/actions");
          const { wagmiConfig } = await import(
            "../../utils/config/web3.config"
          );
          await switchChain(wagmiConfig, { chainId: targetId });

          const chainMetadata = getChainMetadata(targetId);
          showSnackbar(
            `Switched to ${chainMetadata?.name || "network"}`,
            "success"
          );
        } else {
          await switchToCorrectNetwork();
        }

        options.onSuccess?.(targetId || wallet.chainId || 0);
        return { success: true, error: null };
      } catch (error: any) {
        console.error("Network switch failed:", error);

        const errorObj = new Error(
          error?.message?.includes("User rejected")
            ? "Network switch cancelled by user"
            : "Failed to switch network"
        );

        options.onError?.(errorObj);
        return { success: false, error: errorObj };
      } finally {
        setIsSwitching(false);
      }
    },
    [
      wallet.isConnected,
      wallet.chainId,
      isSwitching,
      options,
      switchToCorrectNetwork,
      showSnackbar,
    ]
  );

  const isOnTargetNetwork = useCallback(
    (chainId?: number) => {
      const targetId = chainId || options.targetChainId;
      return wallet.chainId === targetId;
    },
    [wallet.chainId, options.targetChainId]
  );

  const isOnSupportedNetwork = useCallback(() => {
    return (
      wallet.chainId &&
      SUPPORTED_CHAINS.some((chain) => chain.id === wallet.chainId)
    );
  }, [wallet.chainId]);

  return {
    switchNetwork,
    isSwitching,
    isOnTargetNetwork,
    isOnSupportedNetwork,
    currentChainId: wallet.chainId,
    isConnected: wallet.isConnected,
  };
};
