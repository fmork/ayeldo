import type { IStatsRepo } from '@ayeldo/core';
import type { TenantId, Uuid } from '@ayeldo/types';
import type { DdbClient } from '../ddbClient';

export interface StatsRepoDdbProps {
  readonly tableName: string;
  readonly client: DdbClient;
}

// Processed event key: PK=EVENT#<eventId>, SK=EVENT#<eventId>
// Counter key: PK=STAT#<metric>#TENANT#<tenantId>, SK=SUBJECT#<subjectId>

export class StatsRepoDdb implements IStatsRepo {
  private readonly tableName: string;
  private readonly client: DdbClient;
  public constructor(props: StatsRepoDdbProps) {
    this.tableName = props.tableName;
    this.client = props.client;
  }

  public async ensureIdempotent(eventId: Uuid, ttlSeconds?: number): Promise<boolean> {
    const key = { PK: `EVENT#${eventId}`, SK: `EVENT#${eventId}` } as const;
    const { item } = await this.client.get<{ PK: string; SK: string }>({ tableName: this.tableName, key });
    if (item) return false;
    const now = Math.floor(Date.now() / 1000);
    const ttl = ttlSeconds ? now + ttlSeconds : undefined;
    await this.client.put({ tableName: this.tableName, item: { ...key, type: 'ProcessedEvent', ...(ttl ? { ttl } : {}) } });
    return true;
  }

  public async incrementMetric(metric: string, params: { tenantId: TenantId; subjectId: string; occurredAtIso?: string; delta?: number }): Promise<void> {
    const pk = `STAT#${metric}#TENANT#${params.tenantId}`;
    const sk = `SUBJECT#${params.subjectId}`;
    const delta = params.delta ?? 1;
    const occurredAt = params.occurredAtIso;
    if (!this.client.update) {
      await this.client.put({ tableName: this.tableName, item: { PK: pk, SK: sk, count: delta, updatedAt: occurredAt } });
      return;
    }
    await this.client.update({
      tableName: this.tableName,
      key: { PK: pk, SK: sk },
      update: 'SET #count = if_not_exists(#count, :zero) + :delta' + (occurredAt ? ', #updatedAt = :ts' : ''),
      names: { '#count': 'count', ...(occurredAt ? { '#updatedAt': 'updatedAt' } : {}) },
      values: { ':zero': 0, ':delta': delta, ...(occurredAt ? { ':ts': occurredAt } : {}) },
    });
  }
}
