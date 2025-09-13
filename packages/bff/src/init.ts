import { z } from 'zod';
import { loadEnv, createRootLogger, withRequestId, type BaseEnv, type PinoLogWriter } from '@ayeldo/utils';

interface BffEnv extends BaseEnv {
  readonly API_BASE_URL: string;
}

const bffEnvSchema = z.object({
  API_BASE_URL: z.string().url(),
});

let envCache: BffEnv | undefined;
let loggerCache: PinoLogWriter | undefined;

export function getEnv(): BffEnv {
  const env = (envCache ??= loadEnv(bffEnvSchema));
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
