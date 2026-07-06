import { configureStore } from "@reduxjs/toolkit";
import { ticketsApi } from "./ticketsApi";
import { commentsApi } from "./commentsApi";

export const store = configureStore({
  reducer: {
    [ticketsApi.reducerPath]: ticketsApi.reducer,
    [commentsApi.reducerPath]: commentsApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(ticketsApi.middleware, commentsApi.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
