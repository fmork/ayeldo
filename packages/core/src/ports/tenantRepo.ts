import type { TenantCreateDto, TenantDto, Ulid } from '@ayeldo/types';

export interface ITenantRepo {
  createTenant(input: TenantCreateDto, id?: Ulid): Promise<TenantDto>;
  getTenantById(id: Ulid): Promise<TenantDto | undefined>;
  getTenantByOwnerEmail(email: string): Promise<TenantDto | undefined>;
}

export type { TenantCreateDto, TenantDto };
