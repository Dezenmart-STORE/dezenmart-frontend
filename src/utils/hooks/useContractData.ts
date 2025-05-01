import { useCallback } from "react";
import { useAppDispatch, useAppSelector } from "./redux";
import {
  createTrade,
  clearTradeResponse,
} from "../../store/slices/contractSlice";
import {
  selectTradeResponse,
  selectIsContractPending,
  selectIsContractError,
  selectIsContractSuccess,
  selectContractError,
} from "../../store/selectors/contractSelectors";
import { useSnackbar } from "../../context/SnackbarContext";
import { CreateTradeParams } from "../types";

export const useContractData = () => {
  const dispatch = useAppDispatch();
  const { showSnackbar } = useSnackbar();

  const tradeResponse = useAppSelector(selectTradeResponse);
  const isLoading = useAppSelector(selectIsContractPending);
  const isError = useAppSelector(selectIsContractError);
  const isSuccess = useAppSelector(selectIsContractSuccess);
  const error = useAppSelector(selectContractError);

  const initiateTradeContract = useCallback(
    async (tradeData: CreateTradeParams, showNotifications = true) => {
      try {
        const result = await dispatch(createTrade(tradeData)).unwrap();

        if (showNotifications) {
          if (result.status === "success") {
            showSnackbar("Trade contract created successfully", "success");
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

  const resetTradeResponse = useCallback(() => {
    dispatch(clearTradeResponse());
  }, [dispatch]);

  return {
    tradeResponse,
    isLoading,
    isError,
    isSuccess,
    error,
    initiateTradeContract,
    resetTradeResponse,
  };
};
