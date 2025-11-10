import { configureStore } from "@reduxjs/toolkit";
import userReducer from "./slices/userSlice";
import productReducer from "./slices/productSlice";
import reviewReducer from "./slices/reviewSlice";
import referralReducer from "./slices/referralSlice";
import orderReducer from "./slices/orderSlice";
import contractReducer from "./slices/contractSlice";
import watchlistReducer from "./slices/watchlistSlice";
import rewardsReducer from "./slices/rewardsSlice";
import notificationsReducer from "./slices/notificationsSlice";
import chatsReducer from "./slices/chatSlice";
import { baseApi } from "./api/baseApi";

export const store = configureStore({
  reducer: {
    // RTK Query API reducer
    [baseApi.reducerPath]: baseApi.reducer,
    // Legacy reducers (will be gradually migrated to RTK Query)
    user: userReducer,
    products: productReducer,
    reviews: reviewReducer,
    referrals: referralReducer,
    orders: orderReducer,
    contract: contractReducer,
    watchlist: watchlistReducer,
    rewards: rewardsReducer,
    notifications: notificationsReducer,
    chat: chatsReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [
          "products/fetchAll/fulfilled",
          "products/fetchById/fulfilled",
        ],
        ignoredPaths: ["products.currentProduct", "products.products"],
      },
    }).concat(baseApi.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
