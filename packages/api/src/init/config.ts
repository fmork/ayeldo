import type { ILogWriter } from '@ayeldo/backend-core';
import {
  AxiosHttpClient,
  ClaimBasedAuthorizer,
  JsonUtil,
  JwtAuthorization,
  TokenKeyCache,
} from '@ayeldo/backend-core';
import { SiteConfiguration } from '@ayeldo/core';
import { createRootLogger, loadEnv } from '@ayeldo/utils';
import { z } from 'zod';

// Root logger using @ayeldo/utils pino adapter (implements ILogWriter shape)
export const logWriter: ILogWriter = createRootLogger('api', 'info');
export const jsonUtil = new JsonUtil({ logWriter });

// Minimal HTTP client + JWT authorizer for claim checks
const httpClientCore = new AxiosHttpClient({ logWriter });
const tokenKeyCache = new TokenKeyCache({ httpClient: httpClientCore, logWriter });
const jwtAuthorization = new JwtAuthorization({
  tokenKeyCache,
  logWriter,
  // For a real setup, set OIDC_AUTHORITY to your issuer URL
  getKnownIssuers: (): string[] => [
    process.env['OIDC_ISSUER_URL'] || 'https://example-issuer.invalid',
  ],
});

// Claim-based authorizer that looks for groups/roles in JWT claims
export const claimBasedAuthorizer = new ClaimBasedAuthorizer({
  jwtAuthorization,
  logWriter,
  claimNames: ['cognito:groups', 'groups', 'roles'],
});

// Helper to create SiteConfiguration from environment variables
function createSiteConfigurationFromEnv(): SiteConfiguration {
  // SiteConfiguration now reads configuration directly from environment variables.
  // Ensure defaults commonly used in local/test runs are present on process.env
  process.env['API_BASE_URL'] = process.env['API_BASE_URL'] ?? 'http://localhost:3000';
  process.env['WEB_ORIGIN'] = process.env['WEB_ORIGIN'] ?? 'http://localhost:3001';

  // Construct without args; the class reads from environment.
  return new SiteConfiguration();
}

// Create site configuration
export const siteConfig = createSiteConfigurationFromEnv();

// Log configuration status
// Note: `bffOrigin` currently represents the HTTP API origin (formerly called BFF).
logWriter.info(
  `Site configuration: webOrigin=${siteConfig.webOrigin}, apiOrigin=${siteConfig.apiOrigin}`,
);
logWriter.info(
  `OIDC configuration status: ${siteConfig.oidcAuthority && siteConfig.oidcClientId && siteConfig.oidcClientSecret ? 'ENABLED' : 'DISABLED'}`,
);

// Validate OIDC configuration
if (!siteConfig.oidcAuthority || !siteConfig.oidcClientId || !siteConfig.oidcClientSecret) {
  // In test environment, skip the error and just log a warning
  if (process.env['JEST_WORKER_ID'] || process.env['NODE_ENV'] === 'test') {
    logWriter.warn('OIDC is not configured. Auth endpoints will not be available.');
    logWriter.warn('To enable OIDC, set: OIDC_ISSUER_URL, OIDC_CLIENT_ID, OIDC_CLIENT_SECRET');
  } else {
    throw new Error(
      'OIDC configuration is required but not provided. Please configure oidcAuthority, oidcClientId, and oidcClientSecret.',
    );
  }
}

// Env - simplified schema now that OIDC is handled by SiteConfiguration
export const env = loadEnv(
  z.object({
    STRIPE_WEBHOOK_SECRET: z.string().min(1).default('dev_stripe_webhook_secret'),
  }),
);
