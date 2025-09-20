import type {
  AuthorizationRequirement,
  HttpMiddleware,
  HttpRouter,
  ILogWriter,
  JsonUtil,
} from '@ayeldo/backend-core';
import { ClaimAuthorizedController } from '@ayeldo/backend-core';
import type { IAlbumRepo, IEventPublisher, IImageRepo, IUploadUrlProvider } from '@ayeldo/core';
import type { PinoLogWriter } from '@ayeldo/utils';
import { z } from 'zod';
import { requireCsrfForController } from '../middleware/csrfGuard';
import { AlbumManagementService } from '../services/albumManagementService';
import { AlbumUploadService } from '../services/albumUploadService';

export interface AlbumsControllerProps {
  readonly baseUrl: string;
  readonly logWriter: ILogWriter;
  readonly albumRepo: IAlbumRepo;
  readonly imageRepo: IImageRepo;
  readonly cdnHost: string;
  readonly jsonUtil: JsonUtil;
  readonly uploadProvider: IUploadUrlProvider;
  readonly publisher: IEventPublisher;
  readonly requestLogger: PinoLogWriter;
  readonly authorizer:
    | HttpMiddleware
    | ((requirement?: AuthorizationRequirement) => HttpMiddleware);
}

export class AlbumsController extends ClaimAuthorizedController {
  private readonly service: AlbumManagementService;
  private readonly uploadService: AlbumUploadService;
  private readonly jsonUtil: JsonUtil;

  public constructor(props: AlbumsControllerProps) {
    super(props.baseUrl, props.logWriter, props.authorizer);
    this.service = new AlbumManagementService({
      albumRepo: props.albumRepo,
      imageRepo: props.imageRepo,
      cdnHost: props.cdnHost,
    });
    this.uploadService = new AlbumUploadService({
      albumRepo: props.albumRepo,
      uploadProvider: props.uploadProvider,
      publisher: props.publisher,
      logger: props.requestLogger,
    });
    this.jsonUtil = props.jsonUtil;
  }

  public initialize(): HttpRouter {
    this.addGet('/creator/tenants/:tenantId/albums', async (req, res) => {
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
    });

    this.addPost(
      '/creator/tenants/:tenantId/albums',
      requireCsrfForController(async (req, res) => {
        const params = z
          .object({ tenantId: z.string().min(1) })
          .parse((req as { params: unknown }).params);
        const parsedBody = this.jsonUtil.getParsedRequestBody((req as { body?: unknown }).body);

        await this.performRequest(
          () =>
            this.service.createAlbum({
              tenantId: params.tenantId,
              body: parsedBody,
            }),
          res as unknown as Parameters<typeof this.performRequest>[1],
          () => 201,
        );
      }),
    );

    this.addPost(
      '/creator/tenants/:tenantId/albums/:albumId/uploads',
      requireCsrfForController(async (req, res) => {
        const params = z
          .object({ tenantId: z.string().min(1), albumId: z.string().min(1) })
          .parse((req as { params: unknown }).params);
        const parsedBody = this.jsonUtil.getParsedRequestBody((req as { body?: unknown }).body);

        await this.performRequest(
          () =>
            this.uploadService.createUpload({
              tenantId: params.tenantId,
              albumId: params.albumId,
              body: parsedBody,
            }),
          res as unknown as Parameters<typeof this.performRequest>[1],
          () => 201,
        );
      }),
    );

    this.addPost(
      '/creator/tenants/:tenantId/albums/:albumId/uploads/:imageId/complete',
      requireCsrfForController(async (req, res) => {
        const params = z
          .object({
            tenantId: z.string().min(1),
            albumId: z.string().min(1),
            imageId: z.string().min(1),
          })
          .parse((req as { params: unknown }).params);

        await this.performRequest(
          () => this.uploadService.completeUpload(params),
          res as unknown as Parameters<typeof this.performRequest>[1],
          () => 200,
        );
      }),
    );

    return this.getRouter();
  }
}
