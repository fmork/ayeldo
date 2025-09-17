import { DdbSessionStore, DdbStateStore } from '@ayeldo/infra-aws';
import { AuthFlowService } from '../services/authFlowService';
import { OidcClientOpenId, type OidcOpenIdConfig } from '../services/oidcOpenIdClient';
import { SessionService } from '../services/sessionService';
import { logWriter, siteConfig } from './config';
import { ddb } from './infrastructure';
import { userRepo } from './tenantServices';

// DynamoDB table name
const tableName = process.env['TABLE_NAME'] || 'AppTable';

// Create OIDC config from SiteConfiguration (required)
const authority = siteConfig.oidcAuthority;
const authUrl = process.env['OIDC_AUTH_URL'] ?? siteConfig.oidcAuthUrl;
const tokenUrl = process.env['OIDC_TOKEN_URL'] ?? siteConfig.oidcTokenUrl;
const clientId = siteConfig.oidcClientId;
const clientSecret = siteConfig.oidcClientSecret;
const jwksUrlOverride = process.env['OIDC_JWKS_URL'];
const redirectUriOverride = process.env['OIDC_REDIRECT_URI'];

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
  scopes: siteConfig.oidcScopes,
} as const;
const jwks = jwksUrlOverride ?? siteConfig.oidcJwksUrl;
const oidcCfg: OidcOpenIdConfig = jwks
  ? ({ ...baseCfg, jwksUrl: jwks } as OidcOpenIdConfig)
  : (baseCfg as OidcOpenIdConfig);

export const oidc = new OidcClientOpenId(oidcCfg);

export const sessions = new SessionService({
  store: new DdbSessionStore({ tableName, client: ddb }),
  states: new DdbStateStore({ tableName, client: ddb, logger: logWriter }),
  encKeyB64: siteConfig.sessionEncKey ?? 'c2Vzc2lvbl9lbmNfMzJieXRlc19iYXNlNjQ=',
  encKid: 'v1',
  bffJwtSecretB64: siteConfig.bffJwtSecret ?? 'YnZmX2p3dF9zZWNyZXRfYmFzZTY0',
  issuer: 'bff',
  audience: 'api',
  logger: logWriter,
});

export const authFlowService = new AuthFlowService({
  oidc,
  sessions,
  userRepo,
  logger: logWriter,
});
