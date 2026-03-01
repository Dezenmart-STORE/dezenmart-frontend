import { configureStore } from "@reduxjs/toolkit";
import watchlistReducer from "./slices/watchlistSlice";
import rewardsReducer from "./slices/rewardsSlice";
import notificationsReducer from "./slices/notificationsSlice";
import { baseApi } from "./api/baseApi";

export const store = configureStore({
  reducer: {
    // RTK Query API reducer
    [baseApi.reducerPath]: baseApi.reducer,
    // Active slices
    watchlist: watchlistReducer,
    rewards: rewardsReducer,
    notifications: notificationsReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(baseApi.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
