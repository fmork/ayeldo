import { createRootLogger } from '@ayeldo/utils';
import type { ILogWriter } from '@fmork/backend-core/dist/logging';
import { AxiosHttpClient } from '@fmork/backend-core/dist/IO';
import { RequestLogMiddleware } from '@fmork/backend-core/dist/middleWare';
import { Server } from '@fmork/backend-core/dist/server';
import { CartBffController } from '../controllers/cartBffController';
import { getEnv } from '../init';
import { OidcClientOpenId } from '../services/oidcOpenIdClient';
import type { OidcOpenIdConfig } from '../services/oidcOpenIdClient';
import { SessionService } from '../services/sessionService';
import { MemorySessionStore, MemoryStateStore } from '../stores/sessionStore';
import { AuthBffController } from '../controllers/authBffController';

export const logWriter: ILogWriter = createRootLogger('bff', 'info');

const httpClient = new AxiosHttpClient({ logWriter });
const env = getEnv();
const oidcCfg: OidcOpenIdConfig = {
  issuer: env.OIDC_ISSUER_URL,
  authUrl: env.OIDC_AUTH_URL,
  tokenUrl: env.OIDC_TOKEN_URL,
  clientId: env.OIDC_CLIENT_ID,
  clientSecret: env.OIDC_CLIENT_SECRET,
  redirectUri: env.OIDC_REDIRECT_URI,
  scopes: env.OIDC_SCOPES,
  ...(env.OIDC_JWKS_URL ? { jwksUrl: env.OIDC_JWKS_URL } : {}),
};
const oidc = new OidcClientOpenId(oidcCfg);
const sessions = new SessionService({
  store: new MemorySessionStore(),
  states: new MemoryStateStore(),
  encKeyB64: env.SESSION_ENC_KEY,
  encKid: 'v1',
  bffJwtSecretB64: env.BFF_JWT_SECRET,
  issuer: 'bff',
  audience: 'api',
  logger: logWriter,
});

export const cartBffController = new CartBffController({
  baseUrl: '',
  logWriter,
  apiBaseUrl: env.API_BASE_URL,
  httpClient,
  sessions,
});

export const authBffController = new AuthBffController({ baseUrl: '', logWriter, oidc, sessions });

const requestLogger = new RequestLogMiddleware({ logWriter });
const serverPort: number = process.env['PORT'] ? Number.parseInt(process.env['PORT'] as string, 10) : 3001;

export const server = new Server({
  controllers: [authBffController, cartBffController],
  port: serverPort,
  requestLogger,
  logWriter,
  corsOptions: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-CSRF-Token'],
    credentials: true,
  },
});
