import type { ITenantRepo } from '@ayeldo/core';
import type { TenantCreateDto, TenantDto, Uuid } from '@ayeldo/types';
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

  public async createTenant(input: TenantCreateDto, id?: Uuid): Promise<TenantDto> {
    const tenantId = id ?? makeLocalUuid();
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

  public async getTenantById(id: Uuid): Promise<TenantDto | undefined> {
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

// Local UUID generator to avoid depending on the utils package inside infra types.
function makeLocalUuid(): string {
  const g = globalThis as unknown as {
    crypto?: { randomUUID?: () => string; getRandomValues?: (out: Uint8Array) => void };
  };
  const cryptoApi = g.crypto;
  if (cryptoApi && typeof cryptoApi.randomUUID === 'function') {
    return cryptoApi.randomUUID();
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const nodeCrypto = require('node:crypto') as { randomUUID?: () => string };
    if (typeof nodeCrypto.randomUUID === 'function') {
      return nodeCrypto.randomUUID();
    }
  } catch {
    // ignore and fall back to manual generation
  }

  const bytes = new Uint8Array(16);
  if (cryptoApi && typeof cryptoApi.getRandomValues === 'function') {
    cryptoApi.getRandomValues(bytes);
  } else {
    for (const index of bytes.keys()) {
      bytes[index] = Math.floor(Math.random() * 256);
    }
  }

  bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // RFC 4122 variant

  const hex: string[] = [];
  for (const byte of bytes) {
    hex.push(byte.toString(16).padStart(2, '0'));
  }
  return (
    `${hex[0]}${hex[1]}${hex[2]}${hex[3]}-` +
    `${hex[4]}${hex[5]}-` +
    `${hex[6]}${hex[7]}-` +
    `${hex[8]}${hex[9]}-` +
    `${hex[10]}${hex[11]}${hex[12]}${hex[13]}${hex[14]}${hex[15]}`
  );
}
