import { createSelector } from "@reduxjs/toolkit";
import { RootState } from "../store";
import { Order } from "../../utils/types";

export const selectAllOrders = (state: RootState) => {
  console.log("🔍 Selector - Full orders state:", state.orders);
  console.log("🔍 Selector - Orders array:", state.orders.orders);
  console.log("🔍 Selector - Orders count:", state.orders.orders?.length);
  return state.orders.orders || [];
};

export const selectSellerOrders = (state: RootState) => {
  console.log("🔍 Selector - Seller orders:", state.orders.sellerOrders);
  return state.orders.sellerOrders || [];
};

export const selectCurrentOrder = (state: RootState) => {
  console.log("🔍 Selector - Current order:", state.orders.currentOrder);
  return state.orders.currentOrder;
};

export const selectOrderLoading = (state: RootState) => {
  const isLoading = state.orders.loading === "pending";
  console.log(
    "🔍 Selector - Loading status:",
    isLoading,
    "Raw:",
    state.orders.loading
  );
  return isLoading;
};

export const selectOrderError = (state: RootState) => {
  console.log("🔍 Selector - Error:", state.orders.error);
  return state.orders.error;
};

export const selectOrdersByStatus = createSelector(
  [selectAllOrders, (state: RootState, status: string) => status],
  (orders, status) => {
    console.log(`🔍 Selector - Filtering orders by status: ${status}`, orders);
    const filtered = orders.filter((order: Order) => order.status === status);
    console.log(`🔍 Selector - Filtered result:`, filtered);
    return filtered;
  }
);
