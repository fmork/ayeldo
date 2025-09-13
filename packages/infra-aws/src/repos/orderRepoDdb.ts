import type { IOrderRepo } from '@ayeldo/core';
import { Order } from '@ayeldo/core';
import type { TenantId } from '@ayeldo/types';
import { pkTenant, skOrder } from '../keys';
import type { DdbClient } from '../ddbClient';
import { fromOrderItem, toOrderItem, type OrderItem } from '../marshalling';

export interface OrderRepoDdbProps {
  readonly tableName: string;
  readonly client: DdbClient;
}

export class OrderRepoDdb implements IOrderRepo {
  private readonly tableName: string;
  private readonly client: DdbClient;
  constructor(props: OrderRepoDdbProps) {
    this.tableName = props.tableName;
    this.client = props.client;
  }

  async getById(tenantId: TenantId, id: string): Promise<Order | undefined> {
    const { item } = await this.client.get<OrderItem>({
      tableName: this.tableName,
      key: { PK: pkTenant(tenantId), SK: skOrder(id) },
    });
    return item ? new Order(fromOrderItem(item)) : undefined;
  }

  async put(entity: Order): Promise<void> {
    const dto = {
      id: entity.id,
      tenantId: entity.tenantId,
      cartId: entity.cartId,
      state: entity.state,
      lines: entity.lines,
      totalCents: entity.totalCents,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
    const item = toOrderItem(dto);
    await this.client.put({ tableName: this.tableName, item });
  }
}

