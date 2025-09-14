import type { IPriceListRepo } from '@ayeldo/core';
import { PriceList } from '@ayeldo/core';
import type { TenantId } from '@ayeldo/types';
import { pkTenant, skPriceList } from '../keys';
import type { DdbClient } from '../ddbClient';
import { fromPriceListItem, toPriceListItem, type PriceListItem } from '../marshalling';

export interface PriceListRepoDdbProps {
  readonly tableName: string;
  readonly client: DdbClient;
}

export class PriceListRepoDdb implements IPriceListRepo {
  private readonly tableName: string;
  private readonly client: DdbClient;
  public constructor(props: PriceListRepoDdbProps) {
    this.tableName = props.tableName;
    this.client = props.client;
  }

  public async getById(tenantId: TenantId, id: string): Promise<PriceList | undefined> {
    const { item } = await this.client.get<PriceListItem>({
      tableName: this.tableName,
      key: { PK: pkTenant(tenantId), SK: skPriceList(id) },
    });
    return item ? new PriceList(fromPriceListItem(item)) : undefined;
  }

  public async put(entity: PriceList): Promise<void> {
    const dto = {
      id: entity.id,
      tenantId: entity.tenantId,
      items: entity.items,
      createdAt: entity.createdAt,
    };
    const item = toPriceListItem(dto);
    await this.client.put({ tableName: this.tableName, item });
  }
}
