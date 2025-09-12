import type { CartState, OrderState } from './state';

export type Ulid = string;

export type TenantId = string;

export type AlbumId = string;

export type ImageId = string;

export type CartId = string;

export type OrderId = string;

export type PriceListId = string;

export interface AlbumDto {
  readonly id: AlbumId;
  readonly tenantId: TenantId;
  readonly title: string;
  readonly description?: string;
  readonly parentAlbumId?: AlbumId;
  readonly createdAt: string; // ISO timestamp
}

export interface ImageDto {
  readonly id: ImageId;
  readonly tenantId: TenantId;
  readonly albumId: AlbumId;
  readonly filename: string;
  readonly contentType: string;
  readonly sizeBytes: number;
  readonly width: number;
  readonly height: number;
  readonly createdAt: string; // ISO timestamp
}

export interface PriceItemDto {
  readonly sku: string;
  readonly label: string;
  readonly unitPriceCents: number;
}

export interface PriceListDto {
  readonly id: PriceListId;
  readonly tenantId: TenantId;
  readonly items: readonly PriceItemDto[];
  readonly createdAt: string; // ISO timestamp
}

export interface CartItemDto {
  readonly imageId: ImageId;
  readonly sku: string;
  readonly quantity: number;
}

export interface CartDto {
  readonly id: CartId;
  readonly tenantId: TenantId;
  readonly state: CartState;
  readonly priceListId: PriceListId;
  readonly items: readonly CartItemDto[];
  readonly createdAt: string; // ISO timestamp
  readonly expiresAt?: string; // ISO timestamp
}

export interface OrderLineDto {
  readonly imageId: ImageId;
  readonly sku: string;
  readonly quantity: number;
  readonly unitPriceCents: number;
  readonly lineTotalCents: number;
}

export interface OrderDto {
  readonly id: OrderId;
  readonly tenantId: TenantId;
  readonly cartId: CartId;
  readonly state: OrderState;
  readonly lines: readonly OrderLineDto[];
  readonly totalCents: number;
  readonly createdAt: string; // ISO timestamp
  readonly updatedAt: string; // ISO timestamp
}
