import { DdbDocumentClientAdapter, StatsRepoDdb } from '@ayeldo/infra-aws';
import type { EventEnvelope } from '@ayeldo/types';
import { createRootLogger } from '@ayeldo/utils';
import AWSXRay from 'aws-xray-sdk-core';
import { AnalyticsConsumer } from '../../analytics/analyticsConsumer';

// Enable X-Ray tracing
AWSXRay.config([AWSXRay.plugins.ECSPlugin, AWSXRay.plugins.EC2Plugin]);

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
