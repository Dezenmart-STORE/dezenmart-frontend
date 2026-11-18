import { configureStore } from "@reduxjs/toolkit";
import { setupListeners } from "@reduxjs/toolkit/query";
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

// Tells RTK Query when the page is hidden or offline, so polling (a bank
// transfer's status) pauses in a background tab and resumes on return.
// No endpoint opts in to refetching on focus, so nothing else changes.
setupListeners(store.dispatch);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
