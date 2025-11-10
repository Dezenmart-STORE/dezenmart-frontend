import { createSelector } from "@reduxjs/toolkit";
import { RootState } from "../store";
import { Product } from "../../utils/types";

// Base selectors
export const selectAllProducts = (state: RootState) => state.products.products;

export const selectCurrentProduct = (state: RootState) =>
  state.products.currentProduct;

export const selectSponsoredProducts = (state: RootState) =>
  state.products.sponsoredProducts;

export const selectProductLoading = (state: RootState) =>
  state.products.loading;

export const selectProductError = (state: RootState) => state.products.error;

export const selectSearchResults = (state: RootState) =>
  state.products.searchResults;

// Memoized selector for products by category
export const selectProductsByCategory = createSelector(
  [selectAllProducts, (_: RootState, category: string) => category],
  (products, category): Product[] => {
    if (!products) return [];
    if (category === "All") return products;

    return products.filter(
      (product) =>
        product.category &&
        product.category.toLowerCase() === category.toLowerCase()
    );
  }
);

// Memoized selector for related products
export const selectRelatedProducts = createSelector(
  [selectCurrentProduct, selectAllProducts],
  (currentProduct, products): Product[] => {
    if (!currentProduct || !products) return [];

    const { category } = currentProduct;
    const productId = currentProduct._id;

    return products
      .filter(
        (product) =>
          product.category &&
          product.category === category &&
          product._id !== productId
      )
      .map((product) => ({
        ...product,
        seller:
          typeof product.seller === "object"
            ? product.seller._id
            : product.seller,
      }));
  }
);

// Memoized selector for active products
export const selectActiveProducts = createSelector(
  [selectAllProducts],
  (products): Product[] => {
    if (!products) return [];
    return products.filter((product) => product.isActive);
  }
);

// Memoized selector for products by seller
export const selectProductsBySeller = createSelector(
  [selectAllProducts, (_: RootState, sellerId: string) => sellerId],
  (products, sellerId): Product[] => {
    if (!products) return [];
    return products.filter((product) => {
      const sellerIdValue =
        typeof product.seller === "object" ? product.seller._id : product.seller;
      return sellerIdValue === sellerId;
    });
  }
);

// Memoized selector for product count by category
export const selectProductCountByCategory = createSelector(
  [selectAllProducts],
  (products): Record<string, number> => {
    if (!products) return {};

    return products.reduce((acc, product) => {
      const category = product.category || "Uncategorized";
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }
);
