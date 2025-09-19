import type { IImageRepo } from '@ayeldo/core';
import { Image } from '@ayeldo/core';
import type { TenantId } from '@ayeldo/types';
import { GSI1_NAME, pkTenant, skAlbum, skImage } from '../keys';
import type { DdbClient } from '../ddbClient';
import { fromImageItem, toImageItem, type ImageItem } from '../marshalling';

export interface ImageRepoDdbProps {
  readonly tableName: string;
  readonly client: DdbClient;
}

export class ImageRepoDdb implements IImageRepo {
  private readonly tableName: string;
  private readonly client: DdbClient;
  public constructor(props: ImageRepoDdbProps) {
    this.tableName = props.tableName;
    this.client = props.client;
  }

  public async getById(tenantId: TenantId, id: string): Promise<Image | undefined> {
    const { item } = await this.client.get<ImageItem>({
      tableName: this.tableName,
      key: { PK: pkTenant(tenantId), SK: skImage(id) },
    });
    return item ? new Image(fromImageItem(item)) : undefined;
  }

  public async listByAlbum(tenantId: TenantId, albumId: string): Promise<readonly Image[]> {
    const tenantPk = pkTenant(tenantId);
    const albumKey = skAlbum(albumId);
    const { items } = await this.client.query<ImageItem>({
      tableName: this.tableName,
      indexName: GSI1_NAME,
      keyCondition: '#gpk = :gpk',
      names: { '#gpk': 'GSI1PK', '#pk': 'PK' },
      values: { ':gpk': albumKey, ':pk': tenantPk },
      filter: '#pk = :pk',
      scanIndexForward: true,
    });
    return items.map((i) => new Image(fromImageItem(i)));
  }

  public async put(entity: Image): Promise<void> {
    const dto = {
      id: entity.id,
      tenantId: entity.tenantId,
      albumId: entity.albumId,
      filename: entity.filename,
      contentType: entity.contentType,
      sizeBytes: entity.sizeBytes,
      width: entity.width,
      height: entity.height,
      createdAt: entity.createdAt,
      ...(entity.originalKey ? { originalKey: entity.originalKey } : {}),
      ...(entity.variants.length ? { variants: entity.variants } : {}),
      ...(entity.processedAt ? { processedAt: entity.processedAt } : {}),
    };
    const item = toImageItem(dto);
    await this.client.put({ tableName: this.tableName, item });
  }
}
