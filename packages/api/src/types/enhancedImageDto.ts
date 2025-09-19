import type { ImageDto, ImageVariantDto } from '@ayeldo/types';

export interface ImageVariantWithCdnDto extends ImageVariantDto {
  readonly cdnUrl: string;
}

export interface ImageWithCdnDto extends Omit<ImageDto, 'variants'> {
  readonly originalCdnUrl?: string;
  readonly variants?: readonly ImageVariantWithCdnDto[];
}

export function enhanceImageWithCdnUrls(image: ImageDto, cdnHost: string): ImageWithCdnDto {
  return {
    id: image.id,
    tenantId: image.tenantId,
    albumId: image.albumId,
    filename: image.filename,
    contentType: image.contentType,
    sizeBytes: image.sizeBytes,
    width: image.width,
    height: image.height,
    createdAt: image.createdAt,
    ...(image.originalKey && {
      originalCdnUrl: `https://${cdnHost}/${image.originalKey}`,
    }),
    ...(image.variants &&
      image.variants.length > 0 && {
        variants: image.variants.map((variant) => ({
          ...variant,
          cdnUrl: `https://${cdnHost}/${variant.key}`,
        })),
      }),
    ...(image.processedAt && { processedAt: image.processedAt }),
  } as ImageWithCdnDto;
}
