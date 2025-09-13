import { z } from 'zod';
import { loadEnv, createRootLogger, withRequestId, type BaseEnv, type PinoLogWriter } from '@ayeldo/utils';

interface ServicesEnv extends BaseEnv {
  readonly EVENTS_BUS_ARN: string;
}

const servicesEnvSchema = z.object({
  EVENTS_BUS_ARN: z.string().min(1),
});

let envCache: ServicesEnv | undefined;
let loggerCache: PinoLogWriter | undefined;

export function getEnv(): ServicesEnv {
  const env = (envCache ??= loadEnv(servicesEnvSchema));
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
