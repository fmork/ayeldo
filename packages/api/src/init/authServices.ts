import { DdbSessionStore, DdbStateStore } from '@ayeldo/infra-aws';
import { AuthFlowService } from '../services/authFlowService';
import { OidcClientOpenId, type OidcOpenIdConfig } from '../services/oidcOpenIdClient';
import { SessionService } from '../services/sessionService';
import { logWriter, siteConfig } from './config';
import { ddb } from './infrastructure';
import { tenantAccessService, userRepo } from './tenantServices';

// DynamoDB table name (prefer siteConfig)
const tableName = siteConfig.infra.tableName ?? process.env['TABLE_NAME'] ?? 'AppTable';

// Create OIDC config from SiteConfiguration (required)
const authority = siteConfig.oidc.authority;
const authUrl = (process.env['OIDC_AUTH_URL'] as string | undefined) ?? siteConfig.oidcAuthUrl;
const tokenUrl = (process.env['OIDC_TOKEN_URL'] as string | undefined) ?? siteConfig.oidcTokenUrl;
const clientId = siteConfig.oidc.clientId;
const clientSecret = siteConfig.oidc.clientSecret;
// Keep support for manual overrides if explicitly provided in the environment
const jwksUrlOverride = process.env['OIDC_JWKS_URL'] as string | undefined;
const redirectUriOverride = process.env['OIDC_REDIRECT_URI'] as string | undefined;

if (!authority || !authUrl || !tokenUrl || !clientId || !clientSecret) {
  throw new Error('OIDC configuration is incomplete. All OIDC settings must be provided.');
}

if (authority.includes('cognito-idp.') && authUrl.includes('cognito-idp.')) {
  logWriter.warn(
    'OIDC config: Detected Cognito issuer with authorization URL on cognito-idp.*. For Cognito Hosted UI, use the domain https://<domain>.auth.<region>.amazoncognito.com for auth/token endpoints. You can set OIDC_AUTH_URL and OIDC_TOKEN_URL env vars to override.',
  );
}
const baseCfg = {
  issuer: authority,
  authUrl: authUrl,
  tokenUrl: tokenUrl,
  clientId: clientId,
  clientSecret: clientSecret,
  redirectUri: redirectUriOverride ?? siteConfig.oidcRedirectUri,
  scopes: siteConfig.oidc.scopes,
} as const;
const jwks = jwksUrlOverride ?? siteConfig.oidcJwksUrl;
const oidcCfg: OidcOpenIdConfig = jwks
  ? ({ ...baseCfg, jwksUrl: jwks } as OidcOpenIdConfig)
  : (baseCfg as OidcOpenIdConfig);

export const oidc = new OidcClientOpenId(oidcCfg);

export const sessions = new SessionService({
  store: new DdbSessionStore({ tableName, client: ddb }),
  states: new DdbStateStore({ tableName, client: ddb, logger: logWriter }),
  encKeyB64: siteConfig.security.sessionEncKey ?? 'c2Vzc2lvbl9lbmNfMzJieXRlc19iYXNlNjQ=',
  encKid: 'v1',
  bffJwtSecretB64: siteConfig.security.apiJwtSecret ?? 'YnZmX2p3dF9zZWNyZXRfYmFzZTY0',
  issuer: 'bff',
  audience: 'api',
  logger: logWriter,
  oidc,
});

export const authFlowService = new AuthFlowService({
  oidc,
  sessions,
  userRepo,
  tenantAccess: tenantAccessService,
  logger: logWriter,
});
