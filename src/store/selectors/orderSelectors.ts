import { createSelector } from "@reduxjs/toolkit";
import { RootState } from "../store";
import { Order } from "../../utils/types";

export const selectAllOrders = (state: RootState) => state.orders.orders;
export const selectSellerOrders = (state: RootState) =>
  state.orders.sellerOrders;
export const selectCurrentOrder = (state: RootState) =>
  state.orders.currentOrder;
export const selectOrderLoading = (state: RootState) =>
  state.orders.loading === "pending";
export const selectOrderError = (state: RootState) => state.orders.error;

export const selectFormattedOrders = createSelector(
  [selectAllOrders],
  (orders) => {
    return orders.map((order: Order) => ({
      ...order,
      formattedDate: new Date(order.createdAt).toLocaleDateString(),
      formattedAmount: (order.amount / 100).toFixed(2),
    }));
  }
);

export const selectFormattedSellerOrders = createSelector(
  [selectSellerOrders],
  (orders) => {
    return orders.map((order: Order) => ({
      ...order,
      formattedDate: new Date(order.createdAt).toLocaleDateString(),
      formattedAmount: (order.amount / 100).toFixed(2),
    }));
  }
);

export const selectFormattedCurrentOrder = createSelector(
  [selectCurrentOrder],
  (order) => {
    if (!order) return null;

    return {
      ...order,
      formattedDate: new Date(order.createdAt).toLocaleDateString(),
      formattedAmount: (order.amount / 100).toFixed(2),
    };
  }
);

export const selectOrdersByStatus = createSelector(
  //   [selectAllOrders, (state: RootState, status: string) => status],
  [selectAllOrders, (state: RootState, status: string) => status],
  (orders, status) => {
    return orders.filter((order: Order) => order.status === status);
  }
);

export const selectOrderStats = createSelector(
  [selectAllOrders, selectSellerOrders],
  (buyerOrders, sellerOrders) => {
    const buyerTotal = buyerOrders.reduce(
      (sum, order) => sum + order.amount,
      0
    );
    const sellerTotal = sellerOrders.reduce(
      (sum, order) => sum + order.amount,
      0
    );

    return {
      totalBuyer: buyerOrders.length,
      totalSeller: sellerOrders.length,
      amountSpent: buyerTotal,
      amountEarned: sellerTotal,
      formattedAmountSpent: (buyerTotal / 100).toFixed(2),
      formattedAmountEarned: (sellerTotal / 100).toFixed(2),
      pendingBuyerOrders: buyerOrders.filter((o) => o.status === "pending")
        .length,
      pendingSellerOrders: sellerOrders.filter((o) => o.status === "pending")
        .length,
      completedBuyerOrders: buyerOrders.filter((o) => o.status === "completed")
        .length,
      completedSellerOrders: sellerOrders.filter(
        (o) => o.status === "completed"
      ).length,
      disputedBuyerOrders: buyerOrders.filter((o) => o.status === "disputed")
        .length,
      disputedSellerOrders: sellerOrders.filter((o) => o.status === "disputed")
        .length,
    };
  }
);
