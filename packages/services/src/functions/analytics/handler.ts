import { createRootLogger } from '@ayeldo/utils';
import type { EventEnvelope } from '@ayeldo/types';
import { AnalyticsConsumer } from '../../analytics/analyticsConsumer';
import { DdbDocumentClientAdapter, StatsRepoDdb } from '@ayeldo/infra-aws';

interface LambdaEventBridgeEvent {
  readonly ['detail-type']?: string;
  readonly detail?: unknown;
}

export async function main(event: unknown): Promise<void> {
  const logger = createRootLogger('analytics', 'info');
  const e = event as LambdaEventBridgeEvent;
  const type = e?.['detail-type'];
  if (!type) return;
  const detail = e.detail as EventEnvelope<string, unknown>;

  const tableName = process.env['TABLE_NAME'];
  const region = process.env['AWS_REGION'] ?? 'us-east-1';
  if (!tableName) throw new Error('TABLE_NAME env var is required');

  const ddb = new DdbDocumentClientAdapter({ region });
  const statsRepo = new StatsRepoDdb({ tableName, client: ddb });
  const consumer = new AnalyticsConsumer({ statsRepo, logger });

  await consumer.handle(detail);
}

