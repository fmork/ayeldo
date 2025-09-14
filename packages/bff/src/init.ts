import { z } from 'zod';
import { loadEnv, createRootLogger, withRequestId, type BaseEnv, type PinoLogWriter } from '@ayeldo/utils';

interface BffEnv extends BaseEnv {
  readonly API_BASE_URL: string;
  readonly OIDC_ISSUER_URL: string;
  readonly OIDC_AUTH_URL: string;
  readonly OIDC_TOKEN_URL: string;
  readonly OIDC_JWKS_URL?: string;
  readonly OIDC_CLIENT_ID: string;
  readonly OIDC_CLIENT_SECRET: string;
  readonly OIDC_SCOPES: string;
  readonly OIDC_REDIRECT_URI: string;
  readonly SESSION_ENC_KEY: string; // base64 (32 bytes)
  readonly BFF_JWT_SECRET: string; // base64 secret for HS256
}

const bffEnvSchema = z.object({
  API_BASE_URL: z.string().url(),
  OIDC_ISSUER_URL: z.string().url(),
  OIDC_AUTH_URL: z.string().url(),
  OIDC_TOKEN_URL: z.string().url(),
  OIDC_JWKS_URL: z.string().url().optional(),
  OIDC_CLIENT_ID: z.string().min(1),
  OIDC_CLIENT_SECRET: z.string().min(1),
  OIDC_SCOPES: z.string().min(1).default('openid email profile offline_access'),
  OIDC_REDIRECT_URI: z.string().url(),
  SESSION_ENC_KEY: z.string().min(1),
  BFF_JWT_SECRET: z.string().min(1),
});

let envCache: BffEnv | undefined;
let loggerCache: PinoLogWriter | undefined;

export function getEnv(): BffEnv {
  if (!envCache) {
    const parsed = loadEnv(bffEnvSchema) as unknown as Record<string, unknown>;
    if (parsed['OIDC_JWKS_URL'] === undefined) {
      // Ensure the optional key is omitted rather than set to undefined to satisfy exactOptionalPropertyTypes
      delete (parsed as any)['OIDC_JWKS_URL'];
    }
    envCache = parsed as unknown as BffEnv;
  }
  return envCache;
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
