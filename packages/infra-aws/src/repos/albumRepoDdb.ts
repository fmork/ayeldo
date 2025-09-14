import type { IAlbumRepo } from '@ayeldo/core';
import { Album } from '@ayeldo/core';
import type { TenantId } from '@ayeldo/types';
import { GSI1_NAME, pkTenant, skAlbum } from '../keys';
import type { DdbClient } from '../ddbClient';
import { fromAlbumItem, toAlbumItem, type AlbumItem } from '../marshalling';

export interface AlbumRepoDdbProps {
  readonly tableName: string;
  readonly client: DdbClient;
}

export class AlbumRepoDdb implements IAlbumRepo {
  private readonly tableName: string;
  private readonly client: DdbClient;
  public constructor(props: AlbumRepoDdbProps) {
    this.tableName = props.tableName;
    this.client = props.client;
  }

  public async getById(tenantId: TenantId, id: string): Promise<Album | undefined> {
    const { item } = await this.client.get<AlbumItem>({
      tableName: this.tableName,
      key: { PK: pkTenant(tenantId), SK: skAlbum(id) },
    });
    return item ? new Album(fromAlbumItem(item)) : undefined;
  }

  public async listChildren(tenantId: TenantId, parentAlbumId: string): Promise<readonly Album[]> {
    const tenantPk = pkTenant(tenantId);
    const parentKey = skAlbum(parentAlbumId);
    const { items } = await this.client.query<AlbumItem>({
      tableName: this.tableName,
      indexName: GSI1_NAME,
      keyCondition: '#gpk = :gpk',
      names: { '#gpk': 'GSI1PK' },
      values: { ':gpk': parentKey, ':pk': tenantPk },
      filter: '#pk = :pk',
      scanIndexForward: true,
    });
    return items.map((i) => new Album(fromAlbumItem(i)));
  }

  public async put(entity: Album): Promise<void> {
    const dto = {
      id: entity.id,
      tenantId: entity.tenantId,
      title: entity.title,
      ...(entity.description !== undefined
        ? { description: entity.description }
        : {}),
      ...(entity.parentAlbumId !== undefined
        ? { parentAlbumId: entity.parentAlbumId }
        : {}),
      createdAt: entity.createdAt,
    };
    const item = toAlbumItem(dto);
    await this.client.put({ tableName: this.tableName, item });
  }
}
