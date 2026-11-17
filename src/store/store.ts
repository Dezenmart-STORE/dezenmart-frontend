import { configureStore } from "@reduxjs/toolkit";
import { baseApi } from "./api/baseApi";

// All server data goes through RTK Query (src/store/api/*). The old
// watchlist/rewards/notifications slices and the hand-rolled apiService
// duplicated these endpoints and were no longer read anywhere.
export const store = configureStore({
  reducer: {
    [baseApi.reducerPath]: baseApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(baseApi.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
