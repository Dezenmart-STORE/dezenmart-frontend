import { RootState } from "../store";
import { Product } from "../../utils/types";
import { createSelector } from "@reduxjs/toolkit";

export const selectAllProducts = (state: RootState) => state.products.products;
export const selectSponsoredProducts = (state: RootState) =>
  state.products.sponsoredProducts;
export const selectCurrentProduct = (state: RootState) =>
  state.products.currentProduct;
export const selectProductLoading = (state: RootState) =>
  state.products.loading;
export const selectProductError = (state: RootState) => state.products.error;
export const selectSearchQuery = (state: RootState) =>
  state.products.searchQuery;
export const selectSearchResults = (state: RootState) =>
  state.products.searchResults;

export const selectProductsByCategory = createSelector(
  [selectAllProducts, (state: RootState, category: string) => category],
  (products, category) =>
    products.filter((product: Product) => product.category === category)
);

export const selectProductsGroupedByCategory = createSelector(
  [selectAllProducts],
  (products) => {
    const grouped: Record<string, Product[]> = {};
    products.forEach((product: Product) => {
      if (!grouped[product.category]) {
        grouped[product.category] = [];
      }
      grouped[product.category].push(product);
    });
    return grouped;
  }
);

export const selectProductCategories = createSelector(
  [selectAllProducts],
  (products) => {
    return Array.from(
      new Set(products.map((product: Product) => product.category))
    );
  }
);

export const selectFormattedProduct = createSelector(
  [selectCurrentProduct],
  (product) => {
    if (!product) return null;

    return {
      ...product,
      formattedPrice: (product.price / 1000000).toFixed(6),
      createdAtFormatted: new Date(product.createdAt).toLocaleDateString(),
      updatedAtFormatted: new Date(product.updatedAt).toLocaleDateString(),
    };
  }
);

export const selectRelatedProducts = createSelector(
  [selectAllProducts, selectCurrentProduct],
  (products, currentProduct) => {
    if (!currentProduct) return [];

    return products
      .filter(
        (p: Product) =>
          p.category === currentProduct.category && p._id !== currentProduct._id
      )
      .slice(0, 4); // Limit to 4 related products
  }
);
