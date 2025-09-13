import { z } from 'zod';
import { loadEnv, createRootLogger, withRequestId, type BaseEnv, type PinoLogWriter } from '@ayeldo/utils';

interface ApiEnv extends BaseEnv {
  readonly TABLE_NAME: string;
}

const apiEnvSchema = z.object({
  TABLE_NAME: z.string().min(1),
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
