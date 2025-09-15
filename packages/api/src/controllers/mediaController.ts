import type { IAlbumRepo, IImageRepo } from '@ayeldo/core';
import type { HttpRouter, ILogWriter } from '@fmork/backend-core';
import { PublicController } from '@fmork/backend-core';
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
        () =>
          this.flow.listAlbumImages(
            (req as unknown as { params: Record<string, unknown> }).params,
            (req as unknown as { query: unknown }).query,
          ),
        res,
        () => 200,
      );
    });

    return this.getRouter();
  }
}
