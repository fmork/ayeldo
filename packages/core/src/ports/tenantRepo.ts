import type { TenantCreateDto, TenantDto, Uuid } from '@ayeldo/types';

export interface ITenantRepo {
  createTenant(input: TenantCreateDto, id?: Uuid): Promise<TenantDto>;
  getTenantById(id: Uuid): Promise<TenantDto | undefined>;
  getTenantByOwnerEmail(email: string): Promise<TenantDto | undefined>;
}

export type { TenantCreateDto, TenantDto };
