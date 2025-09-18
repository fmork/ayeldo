import type { IAlbumRepo } from '@ayeldo/core';
import type {
  AuthorizationRequirement,
  HttpMiddleware,
  HttpRouter,
  ILogWriter,
} from '@fmork/backend-core';
import { ClaimAuthorizedController } from '@fmork/backend-core';
import { z } from 'zod';
import { requireCsrfForController } from '../middleware/csrfGuard';
import { AlbumManagementService } from '../services/albumManagementService';

export interface AlbumsControllerProps {
  readonly baseUrl: string;
  readonly logWriter: ILogWriter;
  readonly albumRepo: IAlbumRepo;
  readonly authorizer:
    | HttpMiddleware
    | ((requirement?: AuthorizationRequirement) => HttpMiddleware);
}

export class AlbumsController extends ClaimAuthorizedController {
  private readonly service: AlbumManagementService;

  public constructor(props: AlbumsControllerProps) {
    super(props.baseUrl, props.logWriter, props.authorizer);
    this.service = new AlbumManagementService({ albumRepo: props.albumRepo });
  }

  public initialize(): HttpRouter {
    this.addGet(
      '/creator/tenants/:tenantId/albums',
      async (req, res) => {
        const params = z
          .object({ tenantId: z.string().min(1) })
          .parse((req as { params: unknown }).params);
        const query = z
          .object({ parentAlbumId: z.string().min(1).optional() })
          .parse(((req as { query?: unknown }).query ?? {}) as Record<string, unknown>);

        await this.performRequest(
          () => this.service.listAlbums({ tenantId: params.tenantId, ...query }),
          res as unknown as Parameters<typeof this.performRequest>[1],
          () => 200,
        );
      },
    );

    this.addPost(
      '/creator/tenants/:tenantId/albums',
      requireCsrfForController(async (req, res) => {
        const params = z
          .object({ tenantId: z.string().min(1) })
          .parse((req as { params: unknown }).params);

        await this.performRequest(
          () =>
            this.service.createAlbum({
              tenantId: params.tenantId,
              body: (req as { body: unknown }).body,
            }),
          res as unknown as Parameters<typeof this.performRequest>[1],
          () => 201,
        );
      }),
    );

    return this.getRouter();
  }
}
