import type { OrderDto, OrderLineDto, OrderState } from '../types';

export class Order implements OrderDto {
  public readonly id: OrderDto['id'];
  public readonly tenantId: OrderDto['tenantId'];
  public readonly cartId: OrderDto['cartId'];
  public readonly state: OrderState;
  public readonly lines: readonly OrderLineDto[];
  public readonly totalCents: number;
  public readonly createdAt: string;
  public readonly updatedAt: string;

  constructor(props: OrderDto) {
    this.id = props.id;
    this.tenantId = props.tenantId;
    this.cartId = props.cartId;
    this.state = props.state;
    this.lines = props.lines;
    this.totalCents = props.totalCents;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }
}
