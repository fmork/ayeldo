import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { siteConfig } from '../../app/SiteConfigurationContext';
import { getCsrfToken } from '../csrf/getCsrfToken';

export const bffApi = createApi({
  reducerPath: 'bffApi',
  baseQuery: fetchBaseQuery({
    baseUrl: siteConfig.apiBaseUrl,
    credentials: 'include',
    prepareHeaders: (headers) => {
      const csrf = getCsrfToken();
      if (csrf) headers.set(siteConfig.csrfHeaderName, csrf);
      return headers;
    },
  }),
  tagTypes: ['Album', 'Image', 'Cart', 'Order', 'PriceList'],
  endpoints: (builder) => ({
    getAuthorizeUrl: builder.query<{ url: string }, void>({
      query: () => '/auth/authorize-url',
    }),
  }),
});

export const { useLazyGetAuthorizeUrlQuery } = bffApi;
