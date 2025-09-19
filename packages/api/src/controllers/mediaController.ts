import type { HttpRouter, ILogWriter } from '@ayeldo/backend-core';
import { PublicController } from '@ayeldo/backend-core';
import type { IAlbumRepo, IDownloadUrlProvider, IImageRepo } from '@ayeldo/core';
import { z } from 'zod';
import { MediaQueryService } from '../services/mediaQueryService';

export interface MediaControllerProps {
  readonly baseUrl: string;
  readonly logWriter: ILogWriter;
  readonly albumRepo: IAlbumRepo;
  readonly imageRepo: IImageRepo;
  readonly downloadProvider: IDownloadUrlProvider;
}

export class MediaController extends PublicController {
  private readonly flow: MediaQueryService;
  private readonly downloadProvider: IDownloadUrlProvider;

  public constructor(props: MediaControllerProps) {
    super(props.baseUrl, props.logWriter);
    this.flow = new MediaQueryService({ albumRepo: props.albumRepo, imageRepo: props.imageRepo });
    this.downloadProvider = props.downloadProvider;
  }

  public initialize(): HttpRouter {
    // GET /tenants/:tenantId/albums/:albumId
    this.addGet('/tenants/:tenantId/albums/:albumId', async (req, res) => {
      await this.performRequest(
        async () =>
          await this.flow.getAlbum(
            (req as unknown as { params: Record<string, unknown> }).params,
            (req as unknown as { query: unknown }).query,
          ),
        res,
        (result) => (result ? 200 : 404),
      );
    });

    // GET /tenants/:tenantId/albums/:albumId/images
    this.addGet('/tenants/:tenantId/albums/:albumId/images', async (req, res) => {
      await this.performRequest(
        () =>
          this.flow.listAlbumImages(
            (req as unknown as { params: Record<string, unknown> }).params,
            (req as unknown as { query: unknown }).query,
          ),
        res,
        () => 200,
      );
    });

    // GET /tenants/:tenantId/albums/:albumId/images/:imageId/url/:variant?
    this.addGet(
      '/tenants/:tenantId/albums/:albumId/images/:imageId/url/:variant?',
      async (req, res) => {
        const params = z
          .object({
            tenantId: z.string().min(1),
            albumId: z.string().min(1),
            imageId: z.string().min(1),
            variant: z.string().optional(),
          })
          .parse((req as unknown as { params: Record<string, unknown> }).params);

        await this.performRequest(
          async () => {
            // Get the image to verify it exists and get the appropriate key
            const image = await this.flow.getImageForSignedUrl(params);
            if (!image) return undefined;

            const key =
              params.variant && params.variant !== 'original'
                ? image.variants?.find(
                    (v: { label: string; key: string }) => v.label === params.variant,
                  )?.key
                : image.originalKey;

            if (!key) {
              throw new Error(`Variant '${params.variant}' not found for image ${params.imageId}`);
            }

            const signedUrl = await this.downloadProvider.getSignedUrl({
              key,
              expiresSeconds: 3600, // 1 hour
            });

            return {
              imageId: image.id,
              variant: params.variant || 'original',
              url: signedUrl.url,
              expiresAt: signedUrl.expiresAtIso,
            };
          },
          res,
          (result) => (result ? 200 : 404),
        );
      },
    );

    return this.getRouter();
  }
}
