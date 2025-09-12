import type { Album, Image, PriceList, Cart, Order } from '../index';
import type { TenantId } from '../types';

export interface IAlbumRepo {
  getById(tenantId: TenantId, id: string): Promise<Album | undefined>;
  put(entity: Album): Promise<void>;
}

export interface IImageRepo {
  getById(tenantId: TenantId, id: string): Promise<Image | undefined>;
  put(entity: Image): Promise<void>;
}

export interface IPriceListRepo {
  getById(tenantId: TenantId, id: string): Promise<PriceList | undefined>;
  put(entity: PriceList): Promise<void>;
}

export interface ICartRepo {
  getById(tenantId: TenantId, id: string): Promise<Cart | undefined>;
  put(entity: Cart): Promise<void>;
}

export interface IOrderRepo {
  getById(tenantId: TenantId, id: string): Promise<Order | undefined>;
  put(entity: Order): Promise<void>;
}

