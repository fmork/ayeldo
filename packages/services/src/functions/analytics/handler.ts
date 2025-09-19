import type { ILogWriter } from '@ayeldo/backend-core';
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
  const logger: ILogWriter = createRootLogger('analytics', 'info');
  const e = event as LambdaEventBridgeEvent;
  const type = e?.['detail-type'];
  if (!type) return;
  const detail = e.detail as EventEnvelope<string, unknown>;

  // Prefer SiteConfiguration in runtime if injected (globalThis.__AYELDO_SITE_CONFIG__), else env
  type RuntimeEnv = Record<string, string | undefined>;
  const g = globalThis as unknown as {
    __AYELDO_SITE_CONFIG__?: RuntimeEnv;
    process?: { env?: RuntimeEnv };
  };
  const runtimeEnv: RuntimeEnv = g.__AYELDO_SITE_CONFIG__ ?? g.process?.env ?? {};
  const tableName = runtimeEnv['TABLE_NAME'];
  const region = runtimeEnv['AWS_REGION'] ?? 'us-east-1';
  if (!tableName) throw new Error('TABLE_NAME env var is required');

  const ddb = new DdbDocumentClientAdapter({ region, logger });
  const statsRepo = new StatsRepoDdb({ tableName, client: ddb });
  const consumer = new AnalyticsConsumer({ statsRepo, logger });

  await consumer.handle(detail);
}
