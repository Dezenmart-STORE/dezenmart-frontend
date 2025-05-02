import { CreateTradeParams, TradeResponse, UserProfile } from "../types";
const API_URL = import.meta.env.VITE_API_URL;
export const fetchWithAuth = async (
  endpoint: string,
  options: RequestInit = {}
) => {
  const token = localStorage.getItem("auth_token");
  const headers = {
    ...(options.headers || {}),
    ...(token && { Authorization: `Bearer ${token}` }),
  };
  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      return {
        ok: false,
        status: response.status,
        error: errorData?.message || `Error: ${response.status}`,
        data: null,
      };
    }
    const data = await response.json().catch(() => null);
    return { ok: true, status: response.status, data, error: null };
  } catch (error: any) {
    if (error.name === "AbortError") {
      throw error;
    }
    return {
      ok: false,
      status: 0,
      error: error instanceof Error ? error.message : "Unknown error",
      data: null,
    };
  }
};
const requestCache = new Map();
const cacheKey = (endpoint: string, options?: RequestInit) =>
  `${endpoint}:${options?.method || "GET"}`;
// Abort controller map for cancellation
const abortControllers = new Map();
export const api = {
  getUserProfile: async (skipCache = false) => {
    const key = cacheKey("/users/profile");
    if (!skipCache && requestCache.has(key)) {
      return requestCache.get(key);
    }
    // Cancel any existing request
    if (abortControllers.has(key)) {
      abortControllers.get(key).abort();
    }
    const controller = new AbortController();
    abortControllers.set(key, controller);
    const result = await fetchWithAuth("/users/profile", {
      signal: controller.signal,
    });
    if (result.ok) {
      requestCache.set(key, result);
    }
    return result;
  },
  updateUserProfile: async (profileData: Partial<UserProfile>) => {
    // Clear cache on update
    requestCache.delete(cacheKey("/users/profile"));
    // Handle form data
    const formData = new FormData();
    if (profileData.name) formData.append("name", profileData.name);
    if (profileData.dateOfBirth)
      formData.append("dateOfBirth", profileData.dateOfBirth);
    if (profileData.phoneNumber)
      formData.append("phoneNumber", profileData.phoneNumber);
    if (profileData.address) formData.append("address", profileData.address);
    if (profileData.profileImage instanceof File) {
      formData.append("profileImage", profileData.profileImage);
    }
    return fetchWithAuth("/users/profile", {
      method: "PUT",
      body: formData,
    });
  },
  getUserById: async (userId: string) => {
    const key = cacheKey(`/users/${userId}`);
    if (abortControllers.has(key)) {
      abortControllers.get(key).abort();
    }
    const controller = new AbortController();
    abortControllers.set(key, controller);
    return fetchWithAuth(`/users/${userId}`, {
      signal: controller.signal,
    });
  },
  getUserByEmail: async (emailAddress: string) => {
    const key = cacheKey(`/users/email/${emailAddress}`);
    if (abortControllers.has(key)) {
      abortControllers.get(key).abort();
    }
    const controller = new AbortController();
    abortControllers.set(key, controller);
    return fetchWithAuth(`/users/email/${emailAddress}`, {
      signal: controller.signal,
    });
  },
  getAllUsers: async (skipCache = false) => {
    const key = cacheKey("/users");
    if (!skipCache && requestCache.has(key)) {
      return requestCache.get(key);
    }
    if (abortControllers.has(key)) {
      abortControllers.get(key).abort();
    }
    const controller = new AbortController();
    abortControllers.set(key, controller);
    const result = await fetchWithAuth("/users", {
      signal: controller.signal,
    });
    if (result.ok) {
      requestCache.set(key, result);
    }
    return result;
  },
  deleteUserProfile: async (userId: string) => {
    // Clear cache on delete
    requestCache.delete(cacheKey("/users"));
    requestCache.delete(cacheKey(`/users/${userId}`));
    return fetchWithAuth(`/users/${userId}`, {
      method: "DELETE",
    });
  },
  getProducts: async (skipCache = false, preventAbort = false) => {
    const key = cacheKey("/products");
    if (!skipCache && requestCache.has(key)) {
      return requestCache.get(key);
    }
    // Cancel any existing request
    if (!preventAbort && abortControllers.has(key)) {
      abortControllers.get(key).abort();
    }
    const controller = new AbortController();
    if (!preventAbort) {
      abortControllers.set(key, controller);
    }
    const result = await fetchWithAuth("/products", {
      signal: controller.signal,
    });
    if (result.ok) {
      requestCache.set(key, result);
    }
    return result;
  },
  getProductById: async (productId: string) => {
    const key = cacheKey(`/products/${productId}`);
    // Cancel any existing request
    if (abortControllers.has(key)) {
      abortControllers.get(key).abort();
    }
    const controller = new AbortController();
    abortControllers.set(key, controller);
    return fetchWithAuth(`/products/${productId}`, {
      signal: controller.signal,
    });
  },
  searchProducts: async (query: string) => {
    const key = cacheKey(`/products/search?q=${query}`);
    // Cancel any existing request
    if (abortControllers.has(key)) {
      abortControllers.get(key).abort();
    }
    const controller = new AbortController();
    abortControllers.set(key, controller);
    return fetchWithAuth(`/products/search?q=${query}`, {
      signal: controller.signal,
    });
  },
  getSponsoredProducts: async (skipCache = false, preventAbort = false) => {
    const key = cacheKey("/products/sponsored");
    if (!skipCache && requestCache.has(key)) {
      return requestCache.get(key);
    }
    // Cancel any existing request
    if (!preventAbort && abortControllers.has(key)) {
      abortControllers.get(key).abort();
    }
    const controller = new AbortController();
    abortControllers.set(key, controller);
    if (!preventAbort) {
      abortControllers.set(key, controller);
    }
    const result = await fetchWithAuth("/products/sponsored", {
      signal: controller.signal,
    });
    if (result.ok) {
      requestCache.set(key, result);
    }
    return result;
  },
  createProduct: async (productData: FormData) => {
    return fetchWithAuth("/products", {
      method: "POST",
      body: productData,
    });
  },
  updateProduct: async (productId: string, productData: FormData) => {
    // Clear cache on update
    requestCache.delete(cacheKey("/products"));
    requestCache.delete(cacheKey(`/products/${productId}`));
    return fetchWithAuth(`/products/${productId}`, {
      method: "PUT",
      body: productData,
    });
  },
  deleteProduct: async (productId: string) => {
    // Clear cache on delete
    requestCache.delete(cacheKey("/products"));
    requestCache.delete(cacheKey(`/products/${productId}`));
    return fetchWithAuth(`/products/${productId}`, {
      method: "DELETE",
    });
  },
  // Reviews API endpoints
  createReview: async (reviewData: {
    reviewed: string;
    order: string;
    rating: number;
    comment: string;
  }) => {
    return fetchWithAuth("/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(reviewData),
    });
  },
  updateUserRating: async (productId: string) => {
    return fetchWithAuth(`/reviews/user-rating/${productId}`, {
      method: "PUT",
    });
  },
  getUserReviews: async (productId: string, skipCache = false) => {
    const key = cacheKey(`/reviews/user/${productId}`);
    if (!skipCache && requestCache.has(key)) {
      return requestCache.get(key);
    }
    if (abortControllers.has(key)) {
      abortControllers.get(key).abort();
    }
    const controller = new AbortController();
    abortControllers.set(key, controller);
    const result = await fetchWithAuth(`/reviews/user/${productId}`, {
      signal: controller.signal,
    });
    if (result.ok) {
      requestCache.set(key, result);
    }
    return result;
  },
  getOrderReview: async (productId: string) => {
    const key = cacheKey(`/reviews/order/${productId}`);
    if (abortControllers.has(key)) {
      abortControllers.get(key).abort();
    }
    const controller = new AbortController();
    abortControllers.set(key, controller);
    return fetchWithAuth(`/reviews/order/${productId}`, {
      signal: controller.signal,
    });
  },
  // Referrals API endpoints
  applyReferralCode: async (referralCode: string) => {
    return fetchWithAuth("/referral/apply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ referralCode }),
    });
  },
  getReferralInfo: async (skipCache = false) => {
    const key = cacheKey("/referral/info");
    if (!skipCache && requestCache.has(key)) {
      return requestCache.get(key);
    }
    if (abortControllers.has(key)) {
      abortControllers.get(key).abort();
    }
    const controller = new AbortController();
    abortControllers.set(key, controller);
    const result = await fetchWithAuth("/referral/info", {
      signal: controller.signal,
    });
    if (result.ok) {
      requestCache.set(key, result);
    }
    return result;
  },
  // Orders API endpoints
  createOrder: async (orderData: {
    product: string;
    seller: string;
    amount: number;
  }) => {
    return fetchWithAuth("/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(orderData),
    });
  },
  getUserOrders: async (
    type: "buyer" | "seller" = "buyer",
    skipCache = false
  ) => {
    const key = cacheKey(`/orders?type=${type}`);
    if (!skipCache && requestCache.has(key)) {
      return requestCache.get(key);
    }
    if (abortControllers.has(key)) {
      abortControllers.get(key).abort();
    }
    const controller = new AbortController();
    abortControllers.set(key, controller);
    const result = await fetchWithAuth(`/orders?type=${type}`, {
      signal: controller.signal,
    });
    if (result.ok) {
      requestCache.set(key, result);
    }
    return result;
  },
  getOrderById: async (orderId: string) => {
    const key = cacheKey(`/orders/${orderId}`);
    if (abortControllers.has(key)) {
      abortControllers.get(key).abort();
    }
    const controller = new AbortController();
    abortControllers.set(key, controller);
    return fetchWithAuth(`/orders/${orderId}`, {
      signal: controller.signal,
    });
  },
  updateOrderStatus: async (orderId: string, status: string) => {
    // Clear cache on update
    requestCache.delete(cacheKey("/orders?type=buyer"));
    requestCache.delete(cacheKey("/orders?type=seller"));
    requestCache.delete(cacheKey(`/orders/${orderId}`));
    return fetchWithAuth(`/orders/${orderId}/status`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
  },
  createTrade: async (
    tradeData: CreateTradeParams
  ): Promise<{
    ok: boolean;
    status: number;
    data: TradeResponse | null;
    error: string | null;
  }> => {
    return fetchWithAuth("/contracts/trades", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(tradeData),
    });
  },
  raiseDispute: async (orderId: string, reason: string) => {
    // Clear cache on update
    requestCache.delete(cacheKey("/orders?type=buyer"));
    requestCache.delete(cacheKey("/orders?type=seller"));
    requestCache.delete(cacheKey(`/orders/${orderId}`));
    return fetchWithAuth(`/orders/${orderId}/dispute`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    });
  },
  clearCache: () => {
    requestCache.clear();
  },
  cancelRequest: (endpoint: string, method = "GET") => {
    const key = cacheKey(endpoint, { method });
    if (abortControllers.has(key)) {
      abortControllers.get(key).abort();
      abortControllers.delete(key);
    }
  },
};
