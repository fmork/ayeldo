import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { frontendConfig } from '../../app/FrontendConfigurationContext';

export const backendApi = createApi({
  reducerPath: 'backendApi',
  baseQuery: fetchBaseQuery({
    // In dev, when the BFF origin differs from the web origin we rely on the
    // Vite dev server proxy. Using a relative baseUrl ensures requests are
    // made to the dev server origin (same-origin) so cookies are handled by
    // the browser normally. In production/site builds, use the full apiBaseUrl.
    baseUrl: frontendConfig.apiBaseUrl,
    credentials: 'include',
    // NOTE: X-CSRF-Token header disabled temporarily — re-enable later when CORS is settled
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
      | {
          loggedIn: true;
          sub: string;
          email?: string;
          name?: string;
          fullName?: string;
          tenantId?: string;
        }
      | { loggedIn: false },
      void
    >({
      query: () => '/session',
      transformErrorResponse: () => ({ loggedIn: false as const }),
    }),
    onboard: builder.mutation<
      {
        tenant: { id: string; name: string; ownerEmail: string };
        adminUser: { id: string; email: string };
      },
      { name: string; ownerEmail: string; adminName?: string; plan?: string }
    >({
      query: (body) => ({
        url: '/auth/onboard',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Session'],
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
  useOnboardMutation,
} = backendApi;
