import type {
  TenantCreateDto,
  TenantDto,
  TenantMembershipDto,
  TenantMembershipId,
  Uuid,
} from '@ayeldo/types';
import type { Album, Cart, Image, Order, PriceList } from '../index';
import type { TenantId } from '../types';

export interface IAlbumRepo {
  getById(tenantId: TenantId, id: string): Promise<Album | undefined>;
  /** List albums at the root level (no parent). */
  listRoot(tenantId: TenantId): Promise<readonly Album[]>;
  /** List direct child albums of a parent album using GSI. */
  listChildren(tenantId: TenantId, parentAlbumId: string): Promise<readonly Album[]>;
  put(entity: Album): Promise<void>;
}

export interface IImageRepo {
  getById(tenantId: TenantId, id: string): Promise<Image | undefined>;
  /** List images belonging to a given album using GSI. */
  listByAlbum(tenantId: TenantId, albumId: string): Promise<readonly Image[]>;
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

export interface ITenantRepo {
  createTenant(input: TenantCreateDto, id?: Uuid): Promise<TenantDto>;
  getTenantById(id: Uuid): Promise<TenantDto | undefined>;
  getTenantByOwnerEmail(email: string): Promise<TenantDto | undefined>;
}

export interface ITenantMembershipRepo {
  putMembership(membership: TenantMembershipDto): Promise<void>;
  deleteMembership(membershipId: TenantMembershipId): Promise<void>;
  findMembership(tenantId: TenantId, userId: Uuid): Promise<TenantMembershipDto | undefined>;
  findMembershipById(membershipId: TenantMembershipId): Promise<TenantMembershipDto | undefined>;
  listMembershipsByUser(userId: Uuid): Promise<readonly TenantMembershipDto[]>;
  listMembershipsByTenant(tenantId: TenantId): Promise<readonly TenantMembershipDto[]>;
}
