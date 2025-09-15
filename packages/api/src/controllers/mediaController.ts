import type { IAlbumRepo, IImageRepo } from '@ayeldo/core';
import { PolicyEvaluator, PolicyMode } from '@ayeldo/core';
import type { HttpRouter, ILogWriter } from '@fmork/backend-core';
import { PublicController } from '@fmork/backend-core';
import { z } from 'zod';
import { getAlbum, listAlbumImages } from '../handlers/media';

export interface MediaControllerProps {
  readonly baseUrl: string;
  readonly logWriter: ILogWriter;
  readonly albumRepo: IAlbumRepo;
  readonly imageRepo: IImageRepo;
}

export class MediaController extends PublicController {
  private readonly albumRepo: IAlbumRepo;
  private readonly imageRepo: IImageRepo;
  private readonly policy: PolicyEvaluator;

  public constructor(props: MediaControllerProps) {
    super(props.baseUrl, props.logWriter);
    this.albumRepo = props.albumRepo;
    this.imageRepo = props.imageRepo;
    this.policy = new PolicyEvaluator();
  }

  public initialize(): HttpRouter {
    const accessQuery = z.object({
      mode: z.enum([PolicyMode.Public, PolicyMode.Hidden, PolicyMode.Restricted]).default('public'),
      linkToken: z.string().optional(),
      isMember: z
        .string()
        .optional()
        .transform((v) => (v === 'true' ? true : v === 'false' ? false : undefined)),
    });

    // GET /tenants/:tenantId/albums/:albumId
    this.addGet('/tenants/:tenantId/albums/:albumId', async (req, res) => {
      const params = z
        .object({ tenantId: z.string().min(1), albumId: z.string().min(1) })
        .parse((req as unknown as { params: { tenantId: unknown; albumId: unknown } }).params);
      const access = accessQuery.parse((req as unknown as { query: unknown }).query);
      await this.performRequest(
        () => getAlbum({ ...params, access }, { albumRepo: this.albumRepo, policy: this.policy }),
        res,
        (result) => (result ? 200 : 404),
      );
    });

    // GET /tenants/:tenantId/albums/:albumId/images
    this.addGet('/tenants/:tenantId/albums/:albumId/images', async (req, res) => {
      const params = z
        .object({ tenantId: z.string().min(1), albumId: z.string().min(1) })
        .parse((req as unknown as { params: { tenantId: unknown; albumId: unknown } }).params);
      const access = accessQuery.parse((req as unknown as { query: unknown }).query);
      await this.performRequest(
        () =>
          listAlbumImages(
            { ...params, access },
            { imageRepo: this.imageRepo, policy: this.policy },
          ),
        res,
        () => 200,
      );
    });

    return this.getRouter();
  }
}
