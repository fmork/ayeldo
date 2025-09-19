import type { HttpRouter, ILogWriter } from '@ayeldo/backend-core';
import { PublicController } from '@ayeldo/backend-core';
import type { IAlbumRepo, IImageRepo } from '@ayeldo/core';
import { siteConfig } from '../init/config';
import { MediaQueryService } from '../services/mediaQueryService';

export interface MediaControllerProps {
  readonly baseUrl: string;
  readonly logWriter: ILogWriter;
  readonly albumRepo: IAlbumRepo;
  readonly imageRepo: IImageRepo;
}

export class MediaController extends PublicController {
  private readonly flow: MediaQueryService;

  public constructor(props: MediaControllerProps) {
    super(props.baseUrl, props.logWriter);
    this.flow = new MediaQueryService({ albumRepo: props.albumRepo, imageRepo: props.imageRepo });
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
        () => {
          const cdnHost = siteConfig.cdnHost ?? process.env['CDN_HOST'];
          if (!cdnHost) {
            throw new Error('CDN_HOST configuration is required');
          }
          return this.flow.listAlbumImagesWithCdnUrls(
            (req as unknown as { params: Record<string, unknown> }).params,
            (req as unknown as { query: unknown }).query,
            cdnHost,
          );
        },
        res,
        () => 200,
      );
    });

    return this.getRouter();
  }
}
