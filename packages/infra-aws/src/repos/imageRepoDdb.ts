import type { IImageRepo } from '@ayeldo/core';
import { Image } from '@ayeldo/core';
import type { TenantId } from '@ayeldo/types';
import { pkTenant, skImage } from '../keys';
import type { DdbClient } from '../ddbClient';
import { fromImageItem, toImageItem, type ImageItem } from '../marshalling';

export interface ImageRepoDdbProps {
  readonly tableName: string;
  readonly client: DdbClient;
}

export class ImageRepoDdb implements IImageRepo {
  private readonly tableName: string;
  private readonly client: DdbClient;
  constructor(props: ImageRepoDdbProps) {
    this.tableName = props.tableName;
    this.client = props.client;
  }

  async getById(tenantId: TenantId, id: string): Promise<Image | undefined> {
    const { item } = await this.client.get<ImageItem>({
      tableName: this.tableName,
      key: { PK: pkTenant(tenantId), SK: skImage(id) },
    });
    return item ? new Image(fromImageItem(item)) : undefined;
  }

  async put(entity: Image): Promise<void> {
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
    };
    const item = toImageItem(dto);
    await this.client.put({ tableName: this.tableName, item });
  }
}
