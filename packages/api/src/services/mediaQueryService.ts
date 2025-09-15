import type { IAlbumRepo, IImageRepo } from '@ayeldo/core';
import { PolicyEvaluator, PolicyMode } from '@ayeldo/core';
import { z } from 'zod';
import { getAlbum, listAlbumImages } from '../handlers/media';

export interface MediaQueryServiceProps {
  readonly albumRepo: IAlbumRepo;
  readonly imageRepo: IImageRepo;
}

const accessQuerySchema = z.object({
  mode: z.enum([PolicyMode.Public, PolicyMode.Hidden, PolicyMode.Restricted]).default('public'),
  linkToken: z.string().optional(),
  isMember: z
    .string()
    .optional()
    .transform((v) => (v === 'true' ? true : v === 'false' ? false : undefined)),
});

const paramsAlbumSchema = z.object({ tenantId: z.string().min(1), albumId: z.string().min(1) });

export class MediaQueryService {
  private readonly albumRepo: IAlbumRepo;
  private readonly imageRepo: IImageRepo;
  private readonly policy: PolicyEvaluator;

  public constructor(props: MediaQueryServiceProps) {
    this.albumRepo = props.albumRepo;
    this.imageRepo = props.imageRepo;
    this.policy = new PolicyEvaluator();
  }

  public async getAlbum(
    paramsInput: unknown,
    queryInput: unknown,
  ): Promise<ReturnType<typeof getAlbum>> {
    const params = paramsAlbumSchema.parse(paramsInput);
    const access = accessQuerySchema.parse(queryInput);
    return getAlbum({ ...params, access }, { albumRepo: this.albumRepo, policy: this.policy });
  }

  public async listAlbumImages(
    paramsInput: unknown,
    queryInput: unknown,
  ): Promise<ReturnType<typeof listAlbumImages>> {
    const params = paramsAlbumSchema.parse(paramsInput);
    const access = accessQuerySchema.parse(queryInput);
    return listAlbumImages(
      { ...params, access },
      { imageRepo: this.imageRepo, policy: this.policy },
    );
  }
}
