import type { PriceItemDto, PriceListDto } from '../types';

/** Price entry for a SKU with label and unit price. */
export class PriceItem implements PriceItemDto {
  public readonly sku: string;
  public readonly label: string;
  public readonly unitPriceCents: number;
  constructor(props: PriceItemDto) {
    this.sku = props.sku;
    this.label = props.label;
    this.unitPriceCents = props.unitPriceCents;
  }
}

/** Tenant-scoped list of price items used for checkout. */
export class PriceList implements PriceListDto {
  public readonly id: PriceListDto['id'];
  public readonly tenantId: PriceListDto['tenantId'];
  public readonly items: readonly PriceItemDto[];
  public readonly createdAt: string;
  constructor(props: PriceListDto) {
    this.id = props.id;
    this.tenantId = props.tenantId;
    this.items = props.items;
    this.createdAt = props.createdAt;
  }
}
