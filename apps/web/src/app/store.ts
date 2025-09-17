import { configureStore } from '@reduxjs/toolkit';
import { backendApi } from '../services/api/backendApi';

export const store = configureStore({
  reducer: {
    [backendApi.reducerPath]: backendApi.reducer,
  },
  middleware: (getDefault) => getDefault().concat(backendApi.middleware),
});

export type AppDispatch = typeof store.dispatch;
export type RootState = ReturnType<typeof store.getState>;
