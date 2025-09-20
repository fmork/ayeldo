import type {
  AlbumDto,
  ImageDto as SharedImageDto,
  ImageVariantDto as SharedImageVariantDto,
  SessionInfo,
} from '@ayeldo/types';
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { frontendConfig } from '../../app/FrontendConfigurationContext';

// Reuse shared DTOs and augment with CDN fields used by the API responses.
export type ImageVariantDto = SharedImageVariantDto & { readonly cdnUrl?: string };

// Use the shared ImageDto directly; augment to override variants to include cdnUrl.
export type ImageWithCdnDto = Omit<SharedImageDto, 'variants'> & {
  readonly variants?: readonly ImageVariantDto[];
};

export interface AlbumsWithImagesDto {
  readonly albums: readonly AlbumDto[];
  readonly images: readonly ImageWithCdnDto[];
}

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
    listAlbums: builder.query<AlbumsWithImagesDto, { tenantId: string; parentAlbumId?: string }>({
      query: ({ tenantId, parentAlbumId }) => {
        const params = parentAlbumId ? `?parentAlbumId=${encodeURIComponent(parentAlbumId)}` : '';
        return `/creator/tenants/${tenantId}/albums${params}`;
      },
      providesTags: (_result, _error, arg) => [
        {
          type: 'Album' as const,
          id: `tenant:${arg.tenantId}:parent:${arg.parentAlbumId ?? 'root'}`,
        },
      ],
    }),
    createAlbum: builder.mutation<
      AlbumDto,
      { tenantId: string; title: string; description?: string; parentAlbumId?: string }
    >({
      query: ({ tenantId, ...body }) => ({
        url: `/creator/tenants/${tenantId}/albums`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_result, _error, arg) => {
        const tags: { type: 'Album' | 'Image'; id: string }[] = [
          {
            type: 'Album',
            id: `tenant:${arg.tenantId}:parent:${arg.parentAlbumId ?? 'root'}`,
          },
        ];
        if (arg.parentAlbumId) {
          tags.push({ type: 'Image', id: `album:${arg.parentAlbumId}` });
        }
        return tags;
      },
    }),
    getAlbum: builder.query<AlbumDto, { tenantId: string; albumId: string }>({
      query: ({ tenantId, albumId }) => `/tenants/${tenantId}/albums/${albumId}`,
      providesTags: (result, _error, arg) =>
        result
          ? [{ type: 'Album' as const, id: result.id }]
          : [{ type: 'Album' as const, id: `tenant:${arg.tenantId}:lookup` }],
    }),
    getAlbumImages: builder.query<
      readonly ImageWithCdnDto[],
      { tenantId: string; albumId: string }
    >({
      query: ({ tenantId, albumId }) => `/tenants/${tenantId}/albums/${albumId}/images`,
      providesTags: (result, _error, arg) =>
        result
          ? [
              { type: 'Image' as const, id: `album:${arg.albumId}` },
              ...result.map((img) => ({ type: 'Image' as const, id: img.id })),
            ]
          : [{ type: 'Image' as const, id: `album:${arg.albumId}` }],
    }),
    getSession: builder.query<SessionInfo, void>({
      query: () => '/session',
      transformErrorResponse: () => ({ loggedIn: false }) as const,
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
  useListAlbumsQuery,
  useCreateAlbumMutation,
  useGetAlbumQuery,
  useGetAlbumImagesQuery,
} = backendApi;
