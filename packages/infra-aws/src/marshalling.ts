import type { AlbumDto, CartDto, ImageDto, OrderDto, PriceListDto } from '@ayeldo/types';
import { gsi1AlbumChild, gsi1ImageByAlbum, pkTenant, skAlbum, skCart, skImage, skOrder, skPriceList } from './keys';

export interface BaseItem {
  readonly PK: string;
  readonly SK: string;
  readonly type: 'Album' | 'Image' | 'PriceList' | 'Cart' | 'Order';
  readonly tenantId: string;
  readonly createdAt: string;
  readonly updatedAt?: string;
}

export type AlbumItem = BaseItem & {
  readonly type: 'Album';
  readonly title: string;
  readonly description?: string;
  readonly parentAlbumId?: string;
  readonly GSI1PK?: string;
  readonly GSI1SK?: string;
};

export type ImageItem = BaseItem & {
  readonly type: 'Image';
  readonly albumId: string;
  readonly filename: string;
  readonly contentType: string;
  readonly sizeBytes: number;
  readonly width: number;
  readonly height: number;
  readonly GSI1PK: string;
  readonly GSI1SK: string;
};

export type PriceListItem = BaseItem & {
  readonly type: 'PriceList';
  readonly items: readonly { sku: string; label: string; unitPriceCents: number }[];
};

export interface CartItemRecord { imageId: string; sku: string; quantity: number }
export type CartItem = BaseItem & {
  readonly type: 'Cart';
  readonly state: CartDto['state'];
  readonly priceListId: string;
  readonly items: readonly CartItemRecord[];
  readonly expiresAt?: string;
  readonly ttl?: number;
};

export interface OrderItemRecord {
  imageId: string;
  sku: string;
  quantity: number;
  unitPriceCents: number;
  lineTotalCents: number;
}
export type OrderItem = BaseItem & {
  readonly type: 'Order';
  readonly cartId: string;
  readonly state: OrderDto['state'];
  readonly lines: readonly OrderItemRecord[];
  readonly totalCents: number;
};

// Album
export function toAlbumItem(dto: AlbumDto): AlbumItem {
  const base: Omit<AlbumItem, 'title' | 'description' | 'parentAlbumId' | 'GSI1PK' | 'GSI1SK'> = {
    PK: pkTenant(dto.tenantId),
    SK: skAlbum(dto.id),
    type: 'Album',
    tenantId: dto.tenantId,
    createdAt: dto.createdAt,
  };
  const gsi = dto.parentAlbumId ? gsi1AlbumChild(dto.parentAlbumId, dto.id) : undefined;
  return {
    ...base,
    title: dto.title,
    ...(dto.description !== undefined ? { description: dto.description } : {}),
    ...(dto.parentAlbumId !== undefined ? { parentAlbumId: dto.parentAlbumId } : {}),
    ...(gsi ? gsi : {}),
  } as AlbumItem;
}

export function fromAlbumItem(item: AlbumItem): AlbumDto {
  return {
    id: item.SK.replace('ALBUM#', ''),
    tenantId: item.tenantId,
    title: item.title,
    ...(item.description !== undefined ? { description: item.description } : {}),
    ...(item.parentAlbumId !== undefined ? { parentAlbumId: item.parentAlbumId } : {}),
    createdAt: item.createdAt,
  };
}

// Image
export function toImageItem(dto: ImageDto): ImageItem {
  return {
    PK: pkTenant(dto.tenantId),
    SK: skImage(dto.id),
    type: 'Image',
    tenantId: dto.tenantId,
    createdAt: dto.createdAt,
    albumId: dto.albumId,
    filename: dto.filename,
    contentType: dto.contentType,
    sizeBytes: dto.sizeBytes,
    width: dto.width,
    height: dto.height,
    ...gsi1ImageByAlbum(dto.albumId, dto.id),
  };
}

export function fromImageItem(item: ImageItem): ImageDto {
  return {
    id: item.SK.replace('IMAGE#', ''),
    tenantId: item.tenantId,
    albumId: item.albumId,
    filename: item.filename,
    contentType: item.contentType,
    sizeBytes: item.sizeBytes,
    width: item.width,
    height: item.height,
    createdAt: item.createdAt,
  };
}

// PriceList
export function toPriceListItem(dto: PriceListDto): PriceListItem {
  return {
    PK: pkTenant(dto.tenantId),
    SK: skPriceList(dto.id),
    type: 'PriceList',
    tenantId: dto.tenantId,
    createdAt: dto.createdAt,
    items: dto.items,
  };
}

export function fromPriceListItem(item: PriceListItem): PriceListDto {
  return {
    id: item.SK.replace('PRICELIST#', ''),
    tenantId: item.tenantId,
    items: item.items,
    createdAt: item.createdAt,
  };
}

// Cart
export function toCartItem(dto: CartDto): CartItem {
  const ttl = dto.expiresAt ? Math.floor(new Date(dto.expiresAt).getTime() / 1000) : undefined;
  return {
    PK: pkTenant(dto.tenantId),
    SK: skCart(dto.id),
    type: 'Cart',
    tenantId: dto.tenantId,
    createdAt: dto.createdAt,
    state: dto.state,
    priceListId: dto.priceListId,
    items: dto.items,
    ...(dto.expiresAt !== undefined ? { expiresAt: dto.expiresAt } : {}),
    ...(ttl !== undefined ? { ttl } : {}),
  };
}

export function fromCartItem(item: CartItem): CartDto {
  return {
    id: item.SK.replace('CART#', ''),
    tenantId: item.tenantId,
    state: item.state,
    priceListId: item.priceListId,
    items: item.items,
    createdAt: item.createdAt,
    ...(item.expiresAt !== undefined ? { expiresAt: item.expiresAt } : {}),
  };
}

// Order
export function toOrderItem(dto: OrderDto): OrderItem {
  return {
    PK: pkTenant(dto.tenantId),
    SK: skOrder(dto.id),
    type: 'Order',
    tenantId: dto.tenantId,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
    cartId: dto.cartId,
    state: dto.state,
    lines: dto.lines,
    totalCents: dto.totalCents,
  };
}

export function fromOrderItem(item: OrderItem): OrderDto {
  return {
    id: item.SK.replace('ORDER#', ''),
    tenantId: item.tenantId,
    cartId: item.cartId,
    state: item.state,
    lines: item.lines,
    totalCents: item.totalCents,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt ?? item.createdAt,
  };
}
