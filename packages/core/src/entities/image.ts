import type { ImageDto } from '../types';

/** Metadata for an image asset within an album. */
export class Image {
  public readonly id: ImageDto['id'];
  public readonly imageId: string;
  public readonly tenantId: ImageDto['tenantId'];
  public readonly albumId: ImageDto['albumId'];
  public readonly filename: string;
  public readonly contentType: string;
  public readonly sizeBytes: number;
  public readonly width: number;
  public readonly height: number;
  public readonly createdAt: string;
  public readonly variants: readonly {
    readonly label: string;
    readonly key: string;
    readonly width: number;
    readonly height: number;
    readonly sizeBytes: number;
  }[];
  public readonly processedAt: string | undefined;

  constructor(props: ImageDto) {
    this.id = props.id;
    this.imageId = props.imageId.length > 0 ? props.imageId : deriveImageIdFromFilename(props.filename);
    this.tenantId = props.tenantId;
    this.albumId = props.albumId;
    this.filename = props.filename;
    this.contentType = props.contentType;
    this.sizeBytes = props.sizeBytes;
    this.width = props.width;
    this.height = props.height;
    this.createdAt = props.createdAt;
    this.variants = props.variants ?? [];
    this.processedAt = props.processedAt;
  }
}

export function deriveImageIdFromFilename(filename: string): string {
  const normalized = filename.replace(/\\/g, '/').trim();
  const segments = normalized.split('/');
  const basename = segments[segments.length - 1] ?? filename;
  if (basename.length === 0) {
    return 'image';
  }
  const lastDotIndex = basename.lastIndexOf('.');
  if (lastDotIndex <= 0) {
    return basename;
  }
  const derived = basename.slice(0, lastDotIndex);
  return derived.length > 0 ? derived : basename;
}
