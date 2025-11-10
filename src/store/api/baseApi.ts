import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { BaseQueryFn, FetchArgs, FetchBaseQueryError } from '@reduxjs/toolkit/query';

const API_URL = import.meta.env.VITE_API_URL;

// Custom base query with auth token injection
const baseQueryWithAuth: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
  args,
  api,
  extraOptions
) => {
  const baseQuery = fetchBaseQuery({
    baseUrl: API_URL,
    prepareHeaders: (headers) => {
      // Get token from localStorage (will be replaced with cookies later)
      const token = localStorage.getItem('auth_token');
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
      return headers;
    },
  });

  const result = await baseQuery(args, api, extraOptions);

  // Handle 401 unauthorized - token expired
  if (result.error && result.error.status === 401) {
    // Clear auth state
    localStorage.removeItem('auth_token');
    // Optionally redirect to login
    window.location.href = '/login';
  }

  return result;
};

export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithAuth,
  tagTypes: [
    'User',
    'Products',
    'Product',
    'Orders',
    'Order',
    'Trades',
    'Reviews',
    'Referrals',
    'Watchlist',
    'Rewards',
    'Notifications',
    'Messages',
    'Conversations',
    'Logistics',
    'DeliveryAddress',
  ],
  endpoints: () => ({}),
});
