import { baseApi } from './baseApi';
import type { Product } from '../../utils/types';

export const productsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Get all products
    getProducts: builder.query<Product[], void>({
      query: () => '/products',
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ _id }) => ({ type: 'Products' as const, id: _id })),
              { type: 'Products', id: 'LIST' },
            ]
          : [{ type: 'Products', id: 'LIST' }],
    }),

    // Get product by ID
    getProductById: builder.query<Product, string>({
      query: (id) => `/products/${id}`,
      providesTags: (result, error, id) => [{ type: 'Product', id }],
    }),

    // Get products by category
    getProductsByCategory: builder.query<Product[], string>({
      query: (category) => `/products/category/${category}`,
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ _id }) => ({ type: 'Products' as const, id: _id })),
              { type: 'Products', id: 'CATEGORY' },
            ]
          : [{ type: 'Products', id: 'CATEGORY' }],
    }),

    // Get products by seller
    getProductsBySeller: builder.query<Product[], string>({
      query: (sellerId) => `/products/seller/${sellerId}`,
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ _id }) => ({ type: 'Products' as const, id: _id })),
              { type: 'Products', id: 'SELLER' },
            ]
          : [{ type: 'Products', id: 'SELLER' }],
    }),

    // Search products
    searchProducts: builder.query<Product[], string>({
      query: (searchTerm) => `/products/search?q=${encodeURIComponent(searchTerm)}`,
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ _id }) => ({ type: 'Products' as const, id: _id })),
              { type: 'Products', id: 'SEARCH' },
            ]
          : [{ type: 'Products', id: 'SEARCH' }],
    }),

    // Get sponsored products
    getSponsoredProducts: builder.query<Product[], void>({
      query: () => '/products/sponsored',
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ _id }) => ({ type: 'Products' as const, id: _id })),
              { type: 'Products', id: 'SPONSORED' },
            ]
          : [{ type: 'Products', id: 'SPONSORED' }],
    }),

    // Create product
    createProduct: builder.mutation<Product, FormData>({
      query: (formData) => ({
        url: '/products',
        method: 'POST',
        body: formData,
      }),
      invalidatesTags: [{ type: 'Products', id: 'LIST' }],
    }),

    // Update product
    updateProduct: builder.mutation<Product, { id: string; data: FormData }>({
      query: ({ id, data }) => ({
        url: `/products/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Product', id },
        { type: 'Products', id: 'LIST' },
      ],
    }),

    // Delete product
    deleteProduct: builder.mutation<void, string>({
      query: (id) => ({
        url: `/products/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, id) => [
        { type: 'Product', id },
        { type: 'Products', id: 'LIST' },
      ],
    }),

    // Toggle product active status
    toggleProductStatus: builder.mutation<Product, string>({
      query: (id) => ({
        url: `/products/${id}/toggle-status`,
        method: 'PATCH',
      }),
      invalidatesTags: (result, error, id) => [
        { type: 'Product', id },
        { type: 'Products', id: 'LIST' },
      ],
    }),
  }),
});

export const {
  useGetProductsQuery,
  useGetProductByIdQuery,
  useGetProductsByCategoryQuery,
  useGetProductsBySellerQuery,
  useSearchProductsQuery,
  useGetSponsoredProductsQuery,
  useCreateProductMutation,
  useUpdateProductMutation,
  useDeleteProductMutation,
  useToggleProductStatusMutation,
} = productsApi;
