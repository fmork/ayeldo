import type { ITenantRepo } from '@ayeldo/core';
import type { TenantCreateDto, TenantDto, Ulid } from '@ayeldo/types';
import type { DdbClient } from './ddbClient';
import { pkTenant } from './keys';

export interface TenantRepoDdbProps {
  readonly tableName: string;
  readonly client: DdbClient;
}

export class TenantRepoDdb implements ITenantRepo {
  private readonly tableName: string;
  private readonly client: DdbClient;

  public constructor(props: TenantRepoDdbProps) {
    this.tableName = props.tableName;
    this.client = props.client;
  }

  public async createTenant(input: TenantCreateDto, id?: Ulid): Promise<TenantDto> {
    const tenantId = id ?? makeLocalUlid();
    const now = new Date().toISOString();
    const item: TenantDto = {
      id: tenantId,
      name: input.name,
      ownerEmail: input.ownerEmail,
      plan: input.plan ?? 'free',
      status: 'active',
      createdAt: now,
    } as const;

    const dbItem = {
      PK: pkTenant(tenantId),
      SK: `METADATA#${tenantId}`,
      type: 'Tenant',
      tenantId,
      ...item,
    };

    await this.client.put({ tableName: this.tableName, item: dbItem });
    return item;
  }

  public async getTenantById(id: Ulid): Promise<TenantDto | undefined> {
    const { item } = await this.client.get<Record<string, unknown>>({
      tableName: this.tableName,
      key: { PK: pkTenant(id), SK: `METADATA#${id}` },
    });
    if (!item) return undefined;
    const obj = item as Record<string, unknown>;
    return {
      id: String(obj['id']),
      name: String(obj['name']),
      ownerEmail: String(obj['ownerEmail']),
      plan: String(obj['plan']),
      status: String(obj['status']) as 'active' | 'pending' | 'suspended',
      createdAt: String(obj['createdAt']),
    } as TenantDto;
  }

  public async getTenantByOwnerEmail(email: string): Promise<TenantDto | undefined> {
    // Simple query using scan-like QueryParams isn't available; use a generic query against a GSI if present.
    // For now, emulate a table scan via query with a filter on ownerEmail — callers should add a GSI in prod.
    const { items } = await this.client.query<Record<string, unknown>>({
      tableName: this.tableName,
      keyCondition: '#pk = :pk',
      names: { '#pk': 'PK' },
      values: { ':pk': 'TENANT#', ':e': email },
      filter: 'ownerEmail = :e',
      scanIndexForward: true,
      limit: 1,
    });

    const it = items && items.length > 0 ? items[0] : undefined;
    if (!it) return undefined;
    const obj = it as Record<string, unknown>;
    return {
      id: String(obj['id']),
      name: String(obj['name']),
      ownerEmail: String(obj['ownerEmail']),
      plan: String(obj['plan']),
      status: String(obj['status']) as 'active' | 'pending' | 'suspended',
      createdAt: String(obj['createdAt']),
    } as TenantDto;
  }
}

export default TenantRepoDdb;

// Minimal local ULID-like generator (keeps id uniqueness; not monotonic). Using an internal helper
// here avoids importing package source files during the infra package typecheck.
function makeLocalUlid(): string {
  // timestamp(10 chars base36) + random(16 chars base36) => ~26 chars
  const t = Date.now().toString(36);
  const r = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER).toString(36);
  return (t + r).slice(0, 26);
}
