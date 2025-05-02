import { createSelector } from "@reduxjs/toolkit";
import { RootState } from "../store";

export const selectContractLoading = (state: RootState) =>
  state.contract.loading;
export const selectContractError = (state: RootState) => state.contract.error;
export const selectTradeResponse = (state: RootState) =>
  state.contract.tradeResponse;
export const selectTransactionPending = (state: RootState) =>
  state.contract.transactionPending;
export const selectDeliveryConfirmLoading = (state: RootState) =>
  state.contract.deliveryConfirmLoading;
export const selectDeliveryConfirmError = (state: RootState) =>
  state.contract.deliveryConfirmError;

export const selectIsContractPending = createSelector(
  [selectContractLoading],
  (loading) => loading === "pending"
);

export const selectIsContractSuccess = createSelector(
  [selectContractLoading],
  (loading) => loading === "succeeded"
);

export const selectIsContractError = createSelector(
  [selectContractLoading, selectContractError],
  (loading, error) => loading === "failed" && error !== null
);
