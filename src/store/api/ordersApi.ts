import { baseApi } from './baseApi';
import { unwrapList } from './unwrap';
import type { Order, OrderStatus, CreateOrderParams } from '../../utils/types';

const toOrders = (response: unknown): Order[] =>
  unwrapList<Order>(response).filter((order) => order && order.product !== null);

export const ordersApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Get user orders (buyer or seller)
    getUserOrders: builder.query<Order[], { type: 'buyer' | 'seller' }>({
      query: ({ type }) => `/orders?type=${type}`,
      transformResponse: toOrders,
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
      transformResponse: toOrders,
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

    // Create order
    createOrder: builder.mutation<Order, CreateOrderParams>({
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
  }),
});

export const {
  useGetUserOrdersQuery,
  useGetOrdersQuery,
  useGetOrderByIdQuery,
  useCreateOrderMutation,
  useUpdateOrderStatusMutation,
  useRaiseDisputeMutation,
} = ordersApi;
