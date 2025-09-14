import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { getCsrfToken } from '../csrf/getCsrfToken';

export const bffApi = createApi({
  reducerPath: 'bffApi',
  baseQuery: fetchBaseQuery({
    baseUrl: (import.meta as unknown as { env: Record<string, string | undefined> }).env
      .VITE_BFF_BASE_URL as string | undefined,
    credentials: 'include',
    prepareHeaders: (headers) => {
      const csrf = getCsrfToken();
      if (csrf) headers.set('X-CSRF-Token', csrf);
      return headers;
    },
  }),
  tagTypes: ['Album', 'Image', 'Cart', 'Order', 'PriceList'],
  endpoints: () => ({}),
});
