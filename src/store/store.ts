import { configureStore } from "@reduxjs/toolkit";
import userReducer from "./slices/userSlice";
import productReducer from "./slices/productSlice";
import reviewReducer from "./slices/reviewSlice";
import referralReducer from "./slices/referralSlice";
import orderReducer from "./slices/orderSlice";
import contractReducer from "./slices/contractSlice";

export const store = configureStore({
  reducer: {
    user: userReducer,
    products: productReducer,
    reviews: reviewReducer,
    referrals: referralReducer,
    orders: orderReducer,
    contract: contractReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      // serializableCheck: false,
      serializableCheck: {
        ignoredActions: [
          "products/fetchAll/fulfilled",
          "products/fetchById/fulfilled",
        ],
        ignoredPaths: ["products.currentProduct", "products.products"],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
