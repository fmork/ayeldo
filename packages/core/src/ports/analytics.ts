import type { TenantId, Uuid } from '@ayeldo/types';

export interface IStatsRepo {
  ensureIdempotent(eventId: Uuid, ttlSeconds?: number): Promise<boolean>;
  incrementMetric(
    metric: string,
    params: { tenantId: TenantId; subjectId: string; occurredAtIso?: string; delta?: number },
  ): Promise<void>;
}
