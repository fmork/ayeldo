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
  tagTypes: ['Album', 'Image', 'Cart', 'Order', 'PriceList', 'Session'],
  endpoints: (builder) => ({
    getAuthorizeUrl: builder.query<{ url: string }, { redirect?: string }>({
      query: (args) => {
        const params = args?.redirect ? `?redirect=${encodeURIComponent(args.redirect)}` : '';
        return `/auth/authorize-url${params}`;
      },
    }),
    getSession: builder.query<
      { loggedIn: true; sub: string; email?: string; name?: string } | { loggedIn: false },
      void
    >({
      query: () => '/session',
      transformErrorResponse: () => ({ loggedIn: false as const }),
    }),
    logout: builder.mutation<{ loggedOut: boolean }, void>({
      query: () => ({
        url: '/auth/logout',
        method: 'POST',
      }),
      invalidatesTags: ['Session'],
    }),
  }),
});

export const {
  useLazyGetAuthorizeUrlQuery,
  useGetSessionQuery,
  useLazyGetSessionQuery,
  useLogoutMutation,
} = bffApi;
