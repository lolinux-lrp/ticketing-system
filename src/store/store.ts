import { configureStore } from "@reduxjs/toolkit";
import { setupListeners } from "@reduxjs/toolkit/query";
import { ticketsApi } from "./ticketsApi";
import { usersApi } from "./usersApi";
import { meetingsApi } from "./meetingsApi";
import { projectsApi } from "./projectsApi";

export const store = configureStore({
  reducer: {
    [ticketsApi.reducerPath]: ticketsApi.reducer,
    [usersApi.reducerPath]: usersApi.reducer,
    [meetingsApi.reducerPath]: meetingsApi.reducer,
    [projectsApi.reducerPath]: projectsApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(
      ticketsApi.middleware,
      usersApi.middleware,
      meetingsApi.middleware,
      projectsApi.middleware
    ),
});

setupListeners(store.dispatch);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
