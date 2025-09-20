import type { ImageDto } from '../types';

/** Metadata for an image asset within an album. */
export class Image {
  public readonly id: ImageDto['id'];
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
