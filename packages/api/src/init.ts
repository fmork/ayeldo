import { z } from 'zod';
import { loadEnv, createRootLogger, withRequestId, type BaseEnv, type PinoLogWriter, getS3Client, getEventBridgeClient } from '@ayeldo/utils';
import { S3PresignedPostProvider, EventBridgePublisher } from '@ayeldo/infra-aws';
import type { EventBridgeClient } from '@aws-sdk/client-eventbridge';
import type { S3Client } from '@aws-sdk/client-s3';

interface ApiEnv extends BaseEnv {
  readonly TABLE_NAME: string;
  readonly UPLOAD_BUCKET: string;
  readonly EVENTS_BUS_NAME: string;
}

const apiEnvSchema = z.object({
  TABLE_NAME: z.string().min(1),
  UPLOAD_BUCKET: z.string().min(1),
  EVENTS_BUS_NAME: z.string().min(1),
});

let envCache: ApiEnv | undefined;
let loggerCache: PinoLogWriter | undefined;

export function getEnv(): ApiEnv {
  const env = (envCache ??= loadEnv(apiEnvSchema));
  return env;
}

export function getLogger(): PinoLogWriter {
  if (!loggerCache) {
    const env = getEnv();
    loggerCache = createRootLogger(env.SERVICE_NAME, env.LOG_LEVEL);
  }
  return loggerCache;
}

export function getRequestLogger(requestId: string): PinoLogWriter {
  return withRequestId(getLogger(), requestId);
}

let s3Cache: S3Client | undefined;
let ebCache: EventBridgeClient | undefined;
let uploadProviderCache: S3PresignedPostProvider | undefined;
let publisherCache: EventBridgePublisher | undefined;

export function getS3(): S3Client {
  if (!s3Cache) s3Cache = getS3Client(getEnv().AWS_REGION) as unknown as S3Client;
  return s3Cache;
}

export function getEventBridge(): EventBridgeClient {
  if (!ebCache) ebCache = getEventBridgeClient(getEnv().AWS_REGION) as unknown as EventBridgeClient;
  return ebCache;
}

export function getUploadProvider(): S3PresignedPostProvider {
  if (!uploadProviderCache) {
    const env = getEnv();
    uploadProviderCache = new S3PresignedPostProvider({ bucketName: env.UPLOAD_BUCKET, client: getS3() });
  }
  return uploadProviderCache;
}

export function getEventPublisher(): EventBridgePublisher {
  if (!publisherCache) {
    const env = getEnv();
    publisherCache = new EventBridgePublisher({ client: getEventBridge(), eventBusName: env.EVENTS_BUS_NAME });
  }
  return publisherCache;
}
