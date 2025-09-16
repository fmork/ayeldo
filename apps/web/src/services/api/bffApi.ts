import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { siteConfig } from '../../app/SiteConfigurationContext';
import { getCsrfToken } from '../csrf/getCsrfToken';

export const bffApi = createApi({
  reducerPath: 'bffApi',
  baseQuery: fetchBaseQuery({
    // In dev, when the BFF origin differs from the web origin we rely on the
    // Vite dev server proxy. Using a relative baseUrl ensures requests are
    // made to the dev server origin (same-origin) so cookies are handled by
    // the browser normally. In production/site builds, use the full apiBaseUrl.
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
