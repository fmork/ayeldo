import type { CartDto, CartItemDto, CartState } from '../types';

export class Cart implements CartDto {
  public readonly id: CartDto['id'];
  public readonly tenantId: CartDto['tenantId'];
  public readonly state: CartState;
  public readonly priceListId: CartDto['priceListId'];
  public readonly items: readonly CartItemDto[];
  public readonly createdAt: string;
  public readonly expiresAt?: string;

  constructor(props: CartDto) {
    this.id = props.id;
    this.tenantId = props.tenantId;
    this.state = props.state;
    this.priceListId = props.priceListId;
    this.items = props.items;
    this.createdAt = props.createdAt;
    if (props.expiresAt !== undefined) {
      this.expiresAt = props.expiresAt;
    }
  }
}
