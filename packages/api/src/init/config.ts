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
  // Construct without args; the class will throw if required envs are missing.
  return new SiteConfiguration();
}

// Create site configuration
export const siteConfig = createSiteConfigurationFromEnv();

// Log configuration status
// Note: `bffOrigin` currently represents the HTTP API origin (formerly called BFF).
logWriter.info(
  `Site configuration: webOrigin=${siteConfig.origins.webOrigin}, apiOrigin=${siteConfig.origins.apiBaseUrl}`,
);
logWriter.info(`OIDC configuration status: ENABLED`);

// Env - simplified schema now that OIDC is handled by SiteConfiguration
export const env = loadEnv(
  z.object({
    STRIPE_WEBHOOK_SECRET: z.string().min(1).default('dev_stripe_webhook_secret'),
  }),
);
