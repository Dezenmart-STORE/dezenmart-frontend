import { useCallback, useMemo } from "react";
import { useWriteContract } from "wagmi";
import { useWeb3 } from "../../context/Web3Context";
import { DEZENMART_ABI } from "../abi/dezenmartAbi.json";
import { ESCROW_ADDRESSES } from "../config/web3.config";
import { useSnackbar } from "../../context/SnackbarContext";

interface ContractResult {
  success: boolean;
  message?: string;
  hash?: `0x${string}`;
  error?: string;
}

interface UseContractReturn {
  confirmDeliveryAndPurchase: (purchaseId: string) => Promise<ContractResult>;
  raiseDispute: (purchaseId: string) => Promise<ContractResult>;
  cancelPurchase: (purchaseId: string) => Promise<ContractResult>;
  isLoading: boolean;
}

const CONTRACT_ERROR_MESSAGES = {
  InvalidPurchaseId: "Invalid purchase ID. Please verify and try again.",
  InvalidPurchaseState: "Purchase is not in the correct state for this action.",
  NotAuthorized: "You are not authorized to perform this action.",
  PurchaseNotFound: "Purchase not found. Please check the purchase ID.",
  AlreadySettled: "This purchase has already been settled.",
  "User rejected": "Transaction was cancelled.",
  "insufficient funds": "Insufficient funds for transaction fees.",
  "execution reverted": "Transaction failed. Please try again.",
} as const;

export const useContract = (): UseContractReturn => {
  const { wallet, switchToCorrectNetwork, isCorrectNetwork } = useWeb3();
  const { writeContractAsync, isPending } = useWriteContract();
  const { showSnackbar } = useSnackbar();

  const escrowAddress = useMemo(() => {
    if (!wallet.chainId) return null;

    const address =
      ESCROW_ADDRESSES[wallet.chainId as keyof typeof ESCROW_ADDRESSES];
    return address ? (address as `0x${string}`) : null;
  }, [wallet.chainId]);

  const parseContractError = useCallback((error: any): string => {
    const errorMessage = error?.message || error?.toString() || "";

    // Check for known contract errors
    for (const [contractError, userMessage] of Object.entries(
      CONTRACT_ERROR_MESSAGES
    )) {
      if (errorMessage.includes(contractError)) {
        return userMessage;
      }
    }

    // Handle MetaMask/wallet specific errors
    if (errorMessage.includes("MetaMask")) {
      return "Wallet error occurred. Please try again.";
    }

    if (errorMessage.includes("network")) {
      return "Network error. Please check your connection and try again.";
    }

    // Default fallback
    return "Transaction failed. Please try again.";
  }, []);

  // Pre-transaction validation
  const validateTransaction =
    useCallback(async (): Promise<ContractResult | null> => {
      if (!wallet.isConnected || !wallet.address) {
        return {
          success: false,
          message: "Please connect your wallet first",
          error: "WALLET_NOT_CONNECTED",
        };
      }

      if (!escrowAddress) {
        return {
          success: false,
          message: "Escrow contract not available on this network",
          error: "UNSUPPORTED_NETWORK",
        };
      }

      if (!isCorrectNetwork) {
        try {
          showSnackbar("Switching to correct network...", "info");
          await switchToCorrectNetwork();
          // Allow time for network switch to complete
          await new Promise((resolve) => setTimeout(resolve, 1500));
        } catch (networkError) {
          return {
            success: false,
            message: "Please switch to the correct network",
            error: "NETWORK_SWITCH_FAILED",
          };
        }
      }

      return null; // No validation errors
    }, [
      wallet.isConnected,
      wallet.address,
      escrowAddress,
      isCorrectNetwork,
      switchToCorrectNetwork,
      showSnackbar,
    ]);

  const executeContractTransaction = useCallback(
    async (
      functionName: string,
      args: readonly unknown[],
      loadingMessage: string,
      successMessage: string
    ): Promise<ContractResult> => {
      try {
        // Pre-transaction validation
        const validationError = await validateTransaction();
        if (validationError) return validationError;

        showSnackbar(loadingMessage, "info");

        const hash = await writeContractAsync({
          address: escrowAddress!,
          abi: DEZENMART_ABI,
          functionName,
          args,
        });

        showSnackbar(successMessage, "success");

        return {
          success: true,
          message: successMessage,
          hash,
        };
      } catch (error: any) {
        console.error(`${functionName} error:`, error);

        const errorMessage = parseContractError(error);
        showSnackbar(errorMessage, "error");

        return {
          success: false,
          message: errorMessage,
          error: error?.code || "UNKNOWN_ERROR",
        };
      }
    },
    [
      validateTransaction,
      escrowAddress,
      writeContractAsync,
      parseContractError,
      showSnackbar,
    ]
  );

  // Combined confirm delivery and purchase function
  const confirmDeliveryAndPurchase = useCallback(
    async (purchaseId: string): Promise<ContractResult> => {
      if (!purchaseId || isNaN(Number(purchaseId))) {
        return {
          success: false,
          message: "Invalid purchase ID provided",
          error: "INVALID_INPUT",
        };
      }

      const purchaseIdBigInt = BigInt(purchaseId);

      return executeContractTransaction(
        "confirmDeliveryAndPurchase",
        [purchaseIdBigInt],
        "Confirming delivery and purchase...",
        "Delivery and purchase confirmed successfully"
      );
    },
    [executeContractTransaction]
  );

  // Raise dispute function
  const raiseDispute = useCallback(
    async (purchaseId: string): Promise<ContractResult> => {
      if (!purchaseId || isNaN(Number(purchaseId))) {
        return {
          success: false,
          message: "Invalid purchase ID provided",
          error: "INVALID_INPUT",
        };
      }

      const purchaseIdBigInt = BigInt(purchaseId);

      return executeContractTransaction(
        "raiseDispute",
        [purchaseIdBigInt],
        "Raising dispute...",
        "Dispute raised successfully"
      );
    },
    [executeContractTransaction]
  );

  // Cancel purchase function
  const cancelPurchase = useCallback(
    async (purchaseId: string): Promise<ContractResult> => {
      if (!purchaseId || isNaN(Number(purchaseId))) {
        return {
          success: false,
          message: "Invalid purchase ID provided",
          error: "INVALID_INPUT",
        };
      }

      const purchaseIdBigInt = BigInt(purchaseId);

      return executeContractTransaction(
        "cancelPurchase",
        [purchaseIdBigInt],
        "Cancelling purchase...",
        "Purchase cancelled successfully"
      );
    },
    [executeContractTransaction]
  );

  return {
    confirmDeliveryAndPurchase,
    raiseDispute,
    cancelPurchase,
    isLoading: isPending,
  };
};

export type { ContractResult, UseContractReturn };
