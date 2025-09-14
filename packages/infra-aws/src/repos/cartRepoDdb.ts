import type { ICartRepo } from '@ayeldo/core';
import { Cart } from '@ayeldo/core';
import type { TenantId } from '@ayeldo/types';
import { pkTenant, skCart } from '../keys';
import type { DdbClient } from '../ddbClient';
import { fromCartItem, toCartItem, type CartItem } from '../marshalling';

export interface CartRepoDdbProps {
  readonly tableName: string;
  readonly client: DdbClient;
}

export class CartRepoDdb implements ICartRepo {
  private readonly tableName: string;
  private readonly client: DdbClient;
  public constructor(props: CartRepoDdbProps) {
    this.tableName = props.tableName;
    this.client = props.client;
  }

  public async getById(tenantId: TenantId, id: string): Promise<Cart | undefined> {
    const { item } = await this.client.get<CartItem>({
      tableName: this.tableName,
      key: { PK: pkTenant(tenantId), SK: skCart(id) },
    });
    return item ? new Cart(fromCartItem(item)) : undefined;
  }

  public async put(entity: Cart): Promise<void> {
    const dto = {
      id: entity.id,
      tenantId: entity.tenantId,
      state: entity.state,
      priceListId: entity.priceListId,
      items: entity.items,
      createdAt: entity.createdAt,
      ...(entity.expiresAt !== undefined ? { expiresAt: entity.expiresAt } : {}),
    };
    const item = toCartItem(dto);
    await this.client.put({ tableName: this.tableName, item });
  }
}
