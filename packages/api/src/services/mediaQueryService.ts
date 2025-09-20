import type { IAlbumRepo, IImageRepo } from '@ayeldo/core';
import { PolicyEvaluator, PolicyMode } from '@ayeldo/core';
import { z } from 'zod';
import { getAlbum, listAlbumImages } from '../handlers/media';
import { enhanceImageWithCdnUrls, type ImageWithCdnDto } from '../types/enhancedImageDto';

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
const paramsImageSchema = z.object({
  tenantId: z.string().min(1),
  albumId: z.string().min(1),
  imageId: z.string().min(1),
});

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

  public async listAlbumImagesWithCdnUrls(
    paramsInput: unknown,
    queryInput: unknown,
    cdnHost: string,
  ): Promise<readonly ImageWithCdnDto[]> {
    const images = await this.listAlbumImages(paramsInput, queryInput);
    return images.map((image) => enhanceImageWithCdnUrls(image, cdnHost));
  }

  public async getImageForSignedUrl(
    paramsInput: unknown,
  ): Promise<
    | { id: string; originalKey?: string; variants?: readonly { label: string; key: string }[] }
    | undefined
  > {
    const params = paramsImageSchema.parse(paramsInput);
    const image = await this.imageRepo.getById(params.tenantId, params.imageId);
    if (!image || image.albumId !== params.albumId) {
      return undefined;
    }
    return {
      id: image.id,
      ...(image.variants && image.variants.length > 0
        ? {
            variants: image.variants.map((v) => ({ label: v.label, key: v.key })),
          }
        : {}),
    };
  }
}
