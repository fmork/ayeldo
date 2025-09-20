import type { IAlbumRepo, IImageRepo } from '@ayeldo/core';
import { PolicyMode, type PolicyEvaluator } from '@ayeldo/core';
import type { AlbumDto, ImageDto } from '@ayeldo/types';
import { z } from 'zod';

export const accessSchema = z.object({
  mode: z.enum([PolicyMode.Public, PolicyMode.Hidden, PolicyMode.Restricted]),
  linkToken: z.string().optional(),
  isMember: z.boolean().optional(),
});

export const getAlbumSchema = z.object({
  tenantId: z.string().min(1),
  albumId: z.string().min(1),
  access: accessSchema,
});

export type GetAlbumInput = z.infer<typeof getAlbumSchema>;

export async function getAlbum(
  input: GetAlbumInput,
  deps: { albumRepo: IAlbumRepo; policy: PolicyEvaluator },
): Promise<AlbumDto | undefined> {
  const { tenantId, albumId, access } = getAlbumSchema.parse(input);
  const baseCtx = {
    mode: access.mode,
    hasLinkToken: Boolean(access.linkToken),
  } as unknown as Parameters<PolicyEvaluator['evaluate']>[0];
  const ctx =
    access.isMember !== undefined
      ? ({ ...baseCtx, isMember: access.isMember } as typeof baseCtx)
      : baseCtx;
  const allowed = deps.policy.evaluate(ctx);
  if (!allowed) throw new Error('Forbidden');
  const album = await deps.albumRepo.getById(tenantId, albumId);
  if (!album) return undefined;
  return {
    id: album.id,
    tenantId: album.tenantId,
    title: album.title,
    ...(album.description !== undefined ? { description: album.description } : {}),
    ...(album.parentAlbumId !== undefined ? { parentAlbumId: album.parentAlbumId } : {}),
    createdAt: album.createdAt,
  } as const;
}

export const listAlbumImagesSchema = z.object({
  tenantId: z.string().min(1),
  albumId: z.string().min(1),
  access: accessSchema,
});

export type ListAlbumImagesInput = z.infer<typeof listAlbumImagesSchema>;

export async function listAlbumImages(
  input: ListAlbumImagesInput,
  deps: { imageRepo: IImageRepo; policy: PolicyEvaluator },
): Promise<readonly ImageDto[]> {
  const { tenantId, albumId, access } = listAlbumImagesSchema.parse(input);
  const baseCtx = {
    mode: access.mode,
    hasLinkToken: Boolean(access.linkToken),
  } as unknown as Parameters<PolicyEvaluator['evaluate']>[0];
  const ctx =
    access.isMember !== undefined
      ? ({ ...baseCtx, isMember: access.isMember } as typeof baseCtx)
      : baseCtx;
  const allowed = deps.policy.evaluate(ctx);
  if (!allowed) throw new Error('Forbidden');
  const images = await deps.imageRepo.listByAlbum(tenantId, albumId);
  return images.map(
    (img) =>
      ({
        id: img.id,
        imageId: img.imageId,
        tenantId: img.tenantId,
        albumId: img.albumId,
        filename: img.filename,
        contentType: img.contentType,
        sizeBytes: img.sizeBytes,
        width: img.width,
        height: img.height,
        createdAt: img.createdAt,
        ...(img.variants && img.variants.length > 0 ? { variants: img.variants } : {}),
        ...(img.processedAt ? { processedAt: img.processedAt } : {}),
      }) as const,
  );
}
