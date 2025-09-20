import type { CartState, OrderState } from './state';

export interface UserDto {
  readonly id: string;
  readonly email: string;
  readonly oidcSub: string;
  readonly name?: string | undefined;
  readonly createdAt: string;
}

export interface UserCreateDto {
  readonly email: string;
  readonly oidcSub: string;
  readonly name?: string | undefined;
}

export type Uuid = string;

export type TenantId = string;

export type AlbumId = string;

export type ImageId = string;

export type CartId = string;

export type OrderId = string;

export type PriceListId = string;

export type TenantMembershipId = string;

export type TenantMembershipRole = 'owner' | 'admin' | 'member';

export type TenantMembershipStatus = 'active' | 'invited' | 'revoked';

export interface AlbumDto {
  readonly id: AlbumId;
  readonly tenantId: TenantId;
  readonly title: string;
  readonly description?: string;
  readonly parentAlbumId?: AlbumId;
  readonly createdAt: string; // ISO timestamp
}

export interface ImageVariantDto {
  readonly label: string;
  readonly key: string;
  readonly width: number;
  readonly height: number;
  readonly sizeBytes: number;
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
  readonly variants?: readonly ImageVariantDto[];
  readonly processedAt?: string;
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

export interface TenantCreateDto {
  readonly name: string;
  readonly ownerEmail: string;
  readonly adminName?: string;
  readonly plan?: string;
}

export interface TenantDto {
  readonly id: Uuid;
  readonly name: string;
  readonly ownerEmail: string;
  readonly plan: string;
  readonly status: 'active' | 'pending' | 'suspended';
  readonly createdAt: string; // ISO timestamp
}

export interface TenantMembershipDto {
  readonly membershipId: TenantMembershipId;
  readonly tenantId: TenantId;
  readonly userId: Uuid;
  readonly role: TenantMembershipRole;
  readonly status: TenantMembershipStatus;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface TenantMembershipCreateDto {
  readonly tenantId: TenantId;
  readonly userId: Uuid;
  readonly role: TenantMembershipRole;
  readonly status: TenantMembershipStatus;
  readonly createdAt: string;
  readonly updatedAt: string;
}
