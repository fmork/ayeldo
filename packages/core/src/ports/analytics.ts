import type { TenantId, Ulid } from '@ayeldo/types';

export interface IStatsRepo {
  ensureIdempotent(eventId: Ulid, ttlSeconds?: number): Promise<boolean>;
  incrementMetric(
    metric: string,
    params: { tenantId: TenantId; subjectId: string; occurredAtIso?: string; delta?: number },
  ): Promise<void>;
}

