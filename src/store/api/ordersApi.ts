import { baseApi } from './baseApi';
import type { Order, OrderStatus } from '../../utils/types';

export const ordersApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Get user orders (buyer or seller)
    getUserOrders: builder.query<Order[], { type: 'buyer' | 'seller' }>({
      query: ({ type }) => `/orders?type=${type}`,
      providesTags: (result, error, { type }) =>
        result
          ? [
              ...result.map(({ _id }) => ({ type: 'Orders' as const, id: _id })),
              { type: 'Orders', id: type.toUpperCase() },
            ]
          : [{ type: 'Orders', id: type.toUpperCase() }],
    }),

    // Get all orders
    getOrders: builder.query<Order[], void>({
      query: () => '/orders',
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ _id }) => ({ type: 'Orders' as const, id: _id })),
              { type: 'Orders', id: 'LIST' },
            ]
          : [{ type: 'Orders', id: 'LIST' }],
    }),

    // Get order by ID
    getOrderById: builder.query<Order, string>({
      query: (orderId) => `/orders/${orderId}`,
      providesTags: (result, error, orderId) => [{ type: 'Order', id: orderId }],
    }),

    // Get buyer orders
    getBuyerOrders: builder.query<Order[], void>({
      query: () => '/orders/buyer',
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ _id }) => ({ type: 'Orders' as const, id: _id })),
              { type: 'Orders', id: 'BUYER' },
            ]
          : [{ type: 'Orders', id: 'BUYER' }],
    }),

    // Get seller orders
    getSellerOrders: builder.query<Order[], void>({
      query: () => '/orders/seller',
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ _id }) => ({ type: 'Orders' as const, id: _id })),
              { type: 'Orders', id: 'SELLER' },
            ]
          : [{ type: 'Orders', id: 'SELLER' }],
    }),

    // Create order
    createOrder: builder.mutation<Order, Partial<Order>>({
      query: (orderData) => ({
        url: '/orders',
        method: 'POST',
        body: orderData,
      }),
      invalidatesTags: [
        { type: 'Orders', id: 'LIST' },
        { type: 'Orders', id: 'BUYER' },
      ],
    }),

    // Update order status
    updateOrderStatus: builder.mutation<
      Order,
      { orderId: string; details: { purchaseId?: string; status?: OrderStatus; [key: string]: any } }
    >({
      query: ({ orderId, details }) => ({
        url: `/orders/${orderId}`,
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: details,
      }),
      invalidatesTags: (result, error, { orderId }) => [
        { type: 'Order', id: orderId },
        { type: 'Orders', id: 'LIST' },
        { type: 'Orders', id: 'BUYER' },
        { type: 'Orders', id: 'SELLER' },
      ],
    }),

    // Raise dispute
    raiseDispute: builder.mutation<Order, { orderId: string; reason: string }>({
      query: ({ orderId, reason }) => ({
        url: `/orders/${orderId}/dispute`,
        method: 'POST',
        body: { reason },
      }),
      invalidatesTags: (result, error, { orderId }) => [
        { type: 'Order', id: orderId },
        { type: 'Orders', id: 'LIST' },
      ],
    }),

    // Resolve dispute
    resolveDispute: builder.mutation<Order, { orderId: string; resolution: string }>({
      query: ({ orderId, resolution }) => ({
        url: `/orders/${orderId}/dispute/resolve`,
        method: 'PATCH',
        body: { resolution },
      }),
      invalidatesTags: (result, error, { orderId }) => [
        { type: 'Order', id: orderId },
        { type: 'Orders', id: 'LIST' },
      ],
    }),
  }),
});

export const {
  useGetUserOrdersQuery,
  useGetOrdersQuery,
  useGetOrderByIdQuery,
  useGetBuyerOrdersQuery,
  useGetSellerOrdersQuery,
  useCreateOrderMutation,
  useUpdateOrderStatusMutation,
  useRaiseDisputeMutation,
  useResolveDisputeMutation,
} = ordersApi;
