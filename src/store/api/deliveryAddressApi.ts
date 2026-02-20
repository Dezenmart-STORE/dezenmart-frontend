import { baseApi } from './baseApi';
import type {
  DeliveryAddress,
  CreateDeliveryAddressParams,
  UpdateDeliveryAddressParams
} from '../../utils/types';

export const deliveryAddressApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Get all delivery addresses for current user
    getDeliveryAddresses: builder.query<DeliveryAddress[], void>({
      query: () => '/delivery-addresses',
      providesTags: (result) =>
        result
          ? [
              ...result.map((address) => ({ type: 'DeliveryAddress' as const, id: address._id })),
              { type: 'DeliveryAddress', id: 'LIST' },
            ]
          : [{ type: 'DeliveryAddress', id: 'LIST' }],
    }),

    // Get single delivery address by ID
    getDeliveryAddressById: builder.query<DeliveryAddress, string>({
      query: (addressId) => `/delivery-addresses/${addressId}`,
      providesTags: (result, error, addressId) => [{ type: 'DeliveryAddress', id: addressId }],
    }),

    // Get default delivery address
    getDefaultDeliveryAddress: builder.query<DeliveryAddress | null, void>({
      query: () => '/delivery-addresses/default',
      providesTags: [{ type: 'DeliveryAddress', id: 'DEFAULT' }],
    }),

    // Create new delivery address
    createDeliveryAddress: builder.mutation<DeliveryAddress, CreateDeliveryAddressParams>({
      query: (addressData) => ({
        url: '/delivery-addresses',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: addressData,
      }),
      invalidatesTags: [{ type: 'DeliveryAddress', id: 'LIST' }],
    }),

    // Update delivery address
    updateDeliveryAddress: builder.mutation<DeliveryAddress, UpdateDeliveryAddressParams>({
      query: ({ _id, ...addressData }) => ({
        url: `/delivery-addresses/${_id}`,
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: addressData,
      }),
      invalidatesTags: (result, error, { _id }) => [
        { type: 'DeliveryAddress', id: _id },
        { type: 'DeliveryAddress', id: 'LIST' },
        { type: 'DeliveryAddress', id: 'DEFAULT' },
      ],
    }),

    // Delete delivery address
    deleteDeliveryAddress: builder.mutation<void, string>({
      query: (addressId) => ({
        url: `/delivery-addresses/${addressId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, addressId) => [
        { type: 'DeliveryAddress', id: addressId },
        { type: 'DeliveryAddress', id: 'LIST' },
        { type: 'DeliveryAddress', id: 'DEFAULT' },
      ],
    }),

    // Set address as default
    setDefaultDeliveryAddress: builder.mutation<DeliveryAddress, string>({
      query: (addressId) => ({
        url: `/delivery-addresses/${addressId}/set-default`,
        method: 'PUT',
      }),
      invalidatesTags: [
        { type: 'DeliveryAddress', id: 'LIST' },
        { type: 'DeliveryAddress', id: 'DEFAULT' },
      ],
    }),
  }),
});

export const {
  useGetDeliveryAddressesQuery,
  useGetDeliveryAddressByIdQuery,
  useGetDefaultDeliveryAddressQuery,
  useCreateDeliveryAddressMutation,
  useUpdateDeliveryAddressMutation,
  useDeleteDeliveryAddressMutation,
  useSetDefaultDeliveryAddressMutation,
} = deliveryAddressApi;
