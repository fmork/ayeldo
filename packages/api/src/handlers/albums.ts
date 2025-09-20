import { Album } from '@ayeldo/core';
import type { IAlbumRepo, IImageRepo } from '@ayeldo/core';
import type { AlbumDto, ImageDto } from '@ayeldo/types';
import { z } from 'zod';
import { makeUuid } from '@ayeldo/utils';
import { enhanceImageWithCdnUrls, type ImageWithCdnDto } from '../types/enhancedImageDto';

export const createAlbumSchema = z.object({
  tenantId: z.string().min(1),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  parentAlbumId: z.string().min(1).optional(),
});

export type CreateAlbumInput = z.infer<typeof createAlbumSchema>;

export async function createAlbum(
  input: CreateAlbumInput,
  deps: { albumRepo: IAlbumRepo },
): Promise<AlbumDto> {
    const { tenantId, title, description, parentAlbumId } = createAlbumSchema.parse(input);

    if (parentAlbumId) {
      const parent = await deps.albumRepo.getById(tenantId, parentAlbumId);
      if (!parent) {
        throw new Error('Parent album not found');
      }
    }

    const nowIso = new Date().toISOString();
    const album = new Album({
      id: makeUuid(),
      tenantId,
      title,
      ...(description !== undefined ? { description } : {}),
      ...(parentAlbumId !== undefined ? { parentAlbumId } : {}),
      createdAt: nowIso,
    });

    await deps.albumRepo.put(album);

    return {
      id: album.id,
      tenantId: album.tenantId,
      title: album.title,
      ...(album.description !== undefined ? { description: album.description } : {}),
      ...(album.parentAlbumId !== undefined ? { parentAlbumId: album.parentAlbumId } : {}),
      createdAt: album.createdAt,
    } as const;
}

export const listAlbumsSchema = z.object({
  tenantId: z.string().min(1),
  parentAlbumId: z.string().min(1).optional(),
});

export type ListAlbumsInput = z.infer<typeof listAlbumsSchema>;

export interface ListAlbumsResult {
  readonly albums: readonly AlbumDto[];
  readonly images: readonly ImageWithCdnDto[];
}

export async function listAlbums(
  input: ListAlbumsInput,
  deps: { albumRepo: IAlbumRepo; imageRepo: IImageRepo; cdnHost: string },
): Promise<ListAlbumsResult> {
    const { tenantId, parentAlbumId } = listAlbumsSchema.parse(input);

    const albums = parentAlbumId
      ? await deps.albumRepo.listChildren(tenantId, parentAlbumId)
      : await deps.albumRepo.listRoot(tenantId);

    const images = parentAlbumId
      ? await deps.imageRepo.listByAlbum(tenantId, parentAlbumId)
      : [];
    const imageDtos = images.map((image) => ({
      id: image.id,
      imageId: image.imageId,
      tenantId: image.tenantId,
      albumId: image.albumId,
      filename: image.filename,
      contentType: image.contentType,
      sizeBytes: image.sizeBytes,
      width: image.width,
      height: image.height,
      createdAt: image.createdAt,
      ...(image.variants.length > 0 ? { variants: image.variants } : {}),
      ...(image.processedAt ? { processedAt: image.processedAt } : {}),
    } as ImageDto));
    const imagesWithCdn: readonly ImageWithCdnDto[] = imageDtos.map((image) =>
      enhanceImageWithCdnUrls(image, deps.cdnHost),
    );

    return {
      albums: albums.map((album) => ({
        id: album.id,
        tenantId: album.tenantId,
        title: album.title,
        ...(album.description !== undefined ? { description: album.description } : {}),
        ...(album.parentAlbumId !== undefined ? { parentAlbumId: album.parentAlbumId } : {}),
        createdAt: album.createdAt,
      } as const)),
      images: imagesWithCdn,
    } as const;
}
