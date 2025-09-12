import type { AlbumDto } from '../types';

/** Read-only domain entity for an album in the hierarchy. */
export class Album {
  public readonly id: AlbumDto['id'];
  public readonly tenantId: AlbumDto['tenantId'];
  public readonly title: string;
  public readonly description: string | undefined;
  public readonly parentAlbumId: AlbumDto['id'] | undefined;
  public readonly createdAt: string;

  constructor(props: AlbumDto) {
    this.id = props.id;
    this.tenantId = props.tenantId;
    this.title = props.title;
    this.description = props.description;
    this.parentAlbumId = props.parentAlbumId;
    this.createdAt = props.createdAt;
  }
}
