import { configureStore } from '@reduxjs/toolkit';
import { bffApi } from '../services/api/bffApi';

export const store = configureStore({
  reducer: {
    [bffApi.reducerPath]: bffApi.reducer,
  },
  middleware: (getDefault) => getDefault().concat(bffApi.middleware),
});

export type AppDispatch = typeof store.dispatch;
export type RootState = ReturnType<typeof store.getState>;

