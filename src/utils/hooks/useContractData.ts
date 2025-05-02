// import { useCallback, useState } from "react";
// import { useAppDispatch, useAppSelector } from "./redux";
// import {
//   createTrade,
//   clearTradeResponse,
//   setTransactionPending,
//   confirmDelivery,
//   clearDeliveryConfirmError,
// } from "../../store/slices/contractSlice";
// import {
//   selectTradeResponse,
//   selectIsContractPending,
//   selectIsContractError,
//   selectIsContractSuccess,
//   selectContractError,
//   selectTransactionPending,
//   selectDeliveryConfirmLoading,
//   selectDeliveryConfirmError,
// } from "../../store/selectors/contractSelectors";
// import { useSnackbar } from "../../context/SnackbarContext";
// import { CreateTradeParams } from "../types";
// import { useWallet } from "../../utils/hooks/useWallet";
// import { ethers } from "ethers";

// export const useContractData = () => {
//   const dispatch = useAppDispatch();
//   const { showSnackbar } = useSnackbar();
//   const { signer } = useWallet();
//   const [transactionHash, setTransactionHash] = useState<string | null>(null);

//   const tradeResponse = useAppSelector(selectTradeResponse);
//   const isLoading = useAppSelector(selectIsContractPending);
//   const isError = useAppSelector(selectIsContractError);
//   const isSuccess = useAppSelector(selectIsContractSuccess);
//   const error = useAppSelector(selectContractError);
//   const isTransactionPending = useAppSelector(selectTransactionPending);
//   const isDeliveryConfirmLoading = useAppSelector(selectDeliveryConfirmLoading);
//   const deliveryConfirmError = useAppSelector(selectDeliveryConfirmError);

//   const sendFundsToEscrow = useCallback(
//     async (contractAddress: string, amount: string) => {
//       if (!signer) {
//         showSnackbar("Wallet not connected", "error");
//         return { success: false, hash: null };
//       }

//       try {
//         dispatch(setTransactionPending(true));

//         // Convert the amount to wei
//         const amountInWei = ethers.parseEther(amount);

//         // Send transaction to escrow contract
//         const tx = await signer.sendTransaction({
//           to: contractAddress,
//           value: amountInWei,
//         });

//         setTransactionHash(tx.hash);

//         // Wait for transaction to be mined
//         await tx.wait();

//         showSnackbar("Funds successfully sent to escrow", "success");
//         return { success: true, hash: tx.hash };
//       } catch (err: any) {
//         console.error("Transaction error:", err);
//         showSnackbar(err.message || "Transaction failed", "error");
//         return { success: false, hash: null };
//       } finally {
//         dispatch(setTransactionPending(false));
//       }
//     },
//     [signer, dispatch, showSnackbar]
//   );

//   const initiateTradeContract = useCallback(
//     async (tradeData: CreateTradeParams, showNotifications = true) => {
//       try {
//         const result = await dispatch(createTrade(tradeData)).unwrap();

//         if (showNotifications) {
//           if (result.status === "success") {
//             showSnackbar("Trade contract created successfully", "success");

//             // If contract creation was successful, we need to prompt for funds transfer
//             if (result.data.contractAddress && result.data.amount) {
//               // Show notification about required action
//               showSnackbar(
//                 "Please confirm the transaction in your wallet to deposit funds",
//                 "info"
//               );
//             }
//           } else {
//             showSnackbar(result.message || "Trade creation failed", "error");
//           }
//         }

//         return result;
//       } catch (err) {
//         if (showNotifications) {
//           showSnackbar(
//             (err as string) || "Failed to create trade contract",
//             "error"
//           );
//         }
//         return {
//           status: "error",
//           message: (err as string) || "Failed to create trade contract",
//         };
//       }
//     },
//     [dispatch, showSnackbar]
//   );

//   const confirmTradeDelivery = useCallback(
//     async (tradeId: string) => {
//       try {
//         const result = await dispatch(confirmDelivery(tradeId)).unwrap();
//         showSnackbar(
//           "Delivery confirmed successfully. Funds released to seller.",
//           "success"
//         );
//         return { success: true, message: result.message };
//       } catch (err) {
//         showSnackbar((err as string) || "Failed to confirm delivery", "error");
//         return { success: false, message: err as string };
//       }
//     },
//     [dispatch, showSnackbar]
//   );

//   const resetTradeResponse = useCallback(() => {
//     dispatch(clearTradeResponse());
//   }, [dispatch]);

//   const clearDeliveryError = useCallback(() => {
//     dispatch(clearDeliveryConfirmError());
//   }, [dispatch]);

//   return {
//     tradeResponse,
//     isLoading,
//     isError,
//     isSuccess,
//     error,
//     isTransactionPending,
//     transactionHash,
//     isDeliveryConfirmLoading,
//     deliveryConfirmError,
//     initiateTradeContract,
//     sendFundsToEscrow,
//     confirmTradeDelivery,
//     resetTradeResponse,
//     clearDeliveryError,
//   };
// };

import { useCallback, useState } from "react";
import { useAppDispatch, useAppSelector } from "./redux";
import {
  createTrade,
  clearTradeResponse,
  setTransactionPending,
  confirmDelivery,
  clearDeliveryConfirmError,
} from "../../store/slices/contractSlice";
import {
  selectTradeResponse,
  selectIsContractPending,
  selectIsContractError,
  selectIsContractSuccess,
  selectContractError,
  selectTransactionPending,
  selectDeliveryConfirmLoading,
  selectDeliveryConfirmError,
} from "../../store/selectors/contractSelectors";
import { useSnackbar } from "../../context/SnackbarContext";
import { CreateTradeParams } from "../types";
import { useWallet } from "./useWallet";
import { ethers } from "ethers";
import { raiseOrderDispute } from "../../store/slices/orderSlice";

export const useContractData = () => {
  const dispatch = useAppDispatch();
  const { showSnackbar } = useSnackbar();
  const { signer, provider, account } = useWallet();
  const [transactionHash, setTransactionHash] = useState<string | null>(null);

  const tradeResponse = useAppSelector(selectTradeResponse);
  const isLoading = useAppSelector(selectIsContractPending);
  const isError = useAppSelector(selectIsContractError);
  const isSuccess = useAppSelector(selectIsContractSuccess);
  const error = useAppSelector(selectContractError);
  const isTransactionPending = useAppSelector(selectTransactionPending);
  const isDeliveryConfirmLoading = useAppSelector(selectDeliveryConfirmLoading);
  const deliveryConfirmError = useAppSelector(selectDeliveryConfirmError);

  const approveUSDT = useCallback(
    async (
      usdtAddress: string,
      spenderAddress: string,
      amount: string
    ): Promise<boolean> => {
      if (!signer || !account) {
        showSnackbar("Wallet not connected", "error");
        return false;
      }

      try {
        // USDT has 6 decimals
        const amountInMicroUSDT = ethers.parseUnits(amount, 6);

        // Create USDT contract instance
        const usdtContract = new ethers.Contract(
          usdtAddress,
          [
            "function approve(address spender, uint256 value) returns (bool)",
            "function allowance(address owner, address spender) view returns (uint256)",
          ],
          signer
        );

        // Check current allowance
        const currentAllowance = await usdtContract.allowance(
          account,
          spenderAddress
        );

        if (currentAllowance < amountInMicroUSDT) {
          showSnackbar("Approving USDT tokens...", "info");
          const tx = await usdtContract.approve(
            spenderAddress,
            amountInMicroUSDT
          );
          await tx.wait();
          showSnackbar("USDT approval successful", "success");
          return true;
        }

        return true; // Already approved enough
      } catch (err: any) {
        console.error("USDT approval error:", err);
        showSnackbar(err.message || "Failed to approve USDT", "error");
        return false;
      }
    },
    [signer, account, showSnackbar]
  );

  const sendFundsToEscrow = useCallback(
    async (
      contractAddress: string,
      amount: string,
      isUSDT: boolean = false,
      usdtAddress?: string
    ) => {
      if (!signer) {
        showSnackbar("Wallet not connected", "error");
        return { success: false, hash: null };
      }

      try {
        dispatch(setTransactionPending(true));

        if (isUSDT && usdtAddress) {
          // Handle USDT payment
          const approvalSuccess = await approveUSDT(
            usdtAddress,
            contractAddress,
            amount
          );
          if (!approvalSuccess) {
            return { success: false, hash: null };
          }

          // Create contract instance for the trade contract to call createTrade
          // Note: This is simplified - you'll need to include the actual function call to createTrade
          showSnackbar("Creating trade with USDT...", "info");
          // Execute the createTrade function with USDT

          return { success: true, hash: "usdt-transaction" }; // Replace with actual transaction hash
        } else {
          // Handle ETH payment
          const amountInWei = ethers.parseEther(amount);

          showSnackbar("Sending ETH to escrow...", "info");
          const tx = await signer.sendTransaction({
            to: contractAddress,
            value: amountInWei,
          });

          setTransactionHash(tx.hash);
          await tx.wait();

          showSnackbar("Funds successfully sent to escrow", "success");
          return { success: true, hash: tx.hash };
        }
      } catch (err: any) {
        console.error("Transaction error:", err);
        showSnackbar(err.message || "Transaction failed", "error");
        return { success: false, hash: null };
      } finally {
        dispatch(setTransactionPending(false));
      }
    },
    [signer, dispatch, showSnackbar, approveUSDT]
  );

  const initiateTradeContract = useCallback(
    async (tradeData: CreateTradeParams, showNotifications = true) => {
      try {
        const result = await dispatch(createTrade(tradeData)).unwrap();

        if (showNotifications) {
          if (result.status === "success") {
            showSnackbar("Trade contract created successfully", "success");

            if (result.data.contractAddress && result.data.amount) {
              showSnackbar(
                `Please confirm the transaction to deposit ${
                  result.data.isUSDT ? "USDT" : "ETH"
                }`,
                "info"
              );
            }
          } else {
            showSnackbar(result.message || "Trade creation failed", "error");
          }
        }

        return result;
      } catch (err) {
        if (showNotifications) {
          showSnackbar(
            (err as string) || "Failed to create trade contract",
            "error"
          );
        }
        return {
          status: "error",
          message: (err as string) || "Failed to create trade contract",
        };
      }
    },
    [dispatch, showSnackbar]
  );

  const confirmTradeDelivery = useCallback(
    async (tradeId: string) => {
      try {
        const result = await dispatch(confirmDelivery(tradeId)).unwrap();
        showSnackbar(
          "Delivery confirmed successfully. Funds released to seller.",
          "success"
        );
        return { success: true, message: result.message };
      } catch (err) {
        showSnackbar((err as string) || "Failed to confirm delivery", "error");
        return { success: false, message: err as string };
      }
    },
    [dispatch, showSnackbar]
  );

  const raiseTradeDispute = useCallback(
    async (orderId: string, reason: string) => {
      try {
        const result = await dispatch(
          raiseOrderDispute({ orderId, reason })
        ).unwrap();
        showSnackbar(
          "Dispute raised successfully. Admin will review the case.",
          "success"
        );
        return { success: true, message: "Your dispute is sent" };
      } catch (err) {
        showSnackbar((err as string) || "Failed to raise dispute", "error");
        return { success: false, message: err as string };
      }
    },
    [dispatch, showSnackbar]
  );

  const resetTradeResponse = useCallback(() => {
    dispatch(clearTradeResponse());
  }, [dispatch]);

  const clearDeliveryError = useCallback(() => {
    dispatch(clearDeliveryConfirmError());
  }, [dispatch]);

  return {
    tradeResponse,
    isLoading,
    isError,
    isSuccess,
    error,
    isTransactionPending,
    transactionHash,
    isDeliveryConfirmLoading,
    deliveryConfirmError,
    initiateTradeContract,
    sendFundsToEscrow,
    approveUSDT,
    confirmTradeDelivery,
    raiseTradeDispute,
    resetTradeResponse,
    clearDeliveryError,
  };
};
