import type { EventBridgeClient } from '@aws-sdk/client-eventbridge';
import { SiteConfiguration } from '@ayeldo/core';
import {
  AlbumRepoDdb,
  CartRepoDdb,
  DdbDocumentClientAdapter,
  EventBridgePublisher,
  ImageRepoDdb,
  OrderRepoDdb,
  PriceListRepoDdb,
} from '@ayeldo/infra-aws';
import { createRootLogger, getEventBridgeClient, loadEnv } from '@ayeldo/utils';
import { AxiosHttpClient } from '@fmork/backend-core/dist/IO';
import { JsonUtil } from '@fmork/backend-core/dist/Json';
import type { ILogWriter } from '@fmork/backend-core/dist/logging';
import { RequestLogMiddleware } from '@fmork/backend-core/dist/middleWare';
import {
  ClaimBasedAuthorizer,
  JwtAuthorization,
  TokenKeyCache,
} from '@fmork/backend-core/dist/security';
import { Server } from '@fmork/backend-core/dist/server';
import { z } from 'zod';
import { CartController } from '../controllers/cartController';
import { MediaController } from '../controllers/mediaController';
import { OrderController } from '../controllers/orderController';
import { PaymentController } from '../controllers/paymentController';
import { ReferenceClaimAuthorizedApiController } from '../controllers/referenceClaimAuthorizedApiController';
import { ReferencePublicApiController } from '../controllers/referencePublicApiController';
import { StripePaymentProviderFake } from '../payments/stripePaymentProviderFake';
// BFF controllers and services (merged from packages/bff)
import { AuthBffController } from '../bff/controllers/authBffController';
import { CartBffController } from '../bff/controllers/cartBffController';
import { RootBffController } from '../bff/controllers/rootBffController';
import { OidcClientOpenId, type OidcOpenIdConfig } from '../bff/services/oidcOpenIdClient';
import { SessionService } from '../bff/services/sessionService';
import { MemorySessionStore, MemoryStateStore } from '../bff/stores/sessionStore';
import { SignedUrlProviderFake } from '../storage/signedUrlProviderFake';

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
    process.env['OIDC_AUTHORITY'] || 'https://example-issuer.invalid',
  ],
});

// Claim-based authorizer that looks for groups/roles in JWT claims
const claimBasedAuthorizer = new ClaimBasedAuthorizer({
  jwtAuthorization,
  logWriter,
  claimNames: ['cognito:groups', 'groups', 'roles'],
});

// Helper to create SiteConfiguration from environment variables
function createSiteConfigurationFromEnv(): SiteConfiguration {
  const apiBaseUrl = process.env['API_BASE_URL'] ?? 'http://localhost:3000';
  const url = new URL(apiBaseUrl);
  const bffOrigin = `${url.protocol}//${url.host}`;
  const webOrigin = process.env['WEB_ORIGIN'] ?? 'http://localhost:3001';

  return new SiteConfiguration({
    webOrigin,
    bffOrigin,
    ...(process.env['OIDC_ISSUER_URL'] && { oidcAuthority: process.env['OIDC_ISSUER_URL'] }),
    ...(process.env['OIDC_CLIENT_ID'] && { oidcClientId: process.env['OIDC_CLIENT_ID'] }),
    ...(process.env['OIDC_CLIENT_SECRET'] && {
      oidcClientSecret: process.env['OIDC_CLIENT_SECRET'],
    }),
    ...(process.env['OIDC_SCOPES'] && { oidcScopes: process.env['OIDC_SCOPES'] }),
    ...(process.env['SESSION_ENC_KEY'] && { sessionEncKey: process.env['SESSION_ENC_KEY'] }),
    ...(process.env['BFF_JWT_SECRET'] && { bffJwtSecret: process.env['BFF_JWT_SECRET'] }),
  });
}

// Create site configuration
const siteConfig = createSiteConfigurationFromEnv();

// Env - simplified schema now that OIDC is handled by SiteConfiguration
const env = loadEnv(
  z.object({
    STRIPE_WEBHOOK_SECRET: z.string().min(1).default('dev_stripe_webhook_secret'),
  }),
);

// DynamoDB repos
const tableName = process.env['TABLE_NAME'] || 'AppTable';
const region = process.env['AWS_REGION'] || 'us-east-1';
const eventBusName = process.env['EVENTS_BUS_NAME'] || 'default';
const ddbEndpoint = process.env['DDB_ENDPOINT'];
const ddb = new DdbDocumentClientAdapter({
  region,
  ...(ddbEndpoint ? { endpoint: ddbEndpoint } : {}),
});
const cartRepo = new CartRepoDdb({ tableName, client: ddb });
const priceListRepo = new PriceListRepoDdb({ tableName, client: ddb });
const orderRepo = new OrderRepoDdb({ tableName, client: ddb });
const albumRepo = new AlbumRepoDdb({ tableName, client: ddb });
const imageRepo = new ImageRepoDdb({ tableName, client: ddb });
// Event publisher (EventBridge)
const ebClient = getEventBridgeClient(region) as unknown as EventBridgeClient;
const eventPublisher = new EventBridgePublisher({ client: ebClient, eventBusName });
// Payments provider (Stripe fake)
const payments = new StripePaymentProviderFake();
// Download URL provider (fake)
const download = new SignedUrlProviderFake();

// Instantiate controllers
export const referencePublicApiController = new ReferencePublicApiController({
  baseUrl: '',
  jsonUtil,
  logWriter,
});

export const referenceClaimAuthorizedApiController = new ReferenceClaimAuthorizedApiController({
  baseUrl: '',
  jsonUtil,
  logWriter,
  authorizer: claimBasedAuthorizer.createAuthorizer,
});

export const cartController = new CartController({
  baseUrl: '',
  logWriter,
  cartRepo,
  priceListRepo,
  publisher: eventPublisher,
});

export const orderController = new OrderController({
  baseUrl: '',
  logWriter,
  cartRepo,
  priceListRepo,
  orderRepo,
  download,
});

export const paymentController = new PaymentController({
  baseUrl: '',
  logWriter,
  orderRepo,
  payments,
  stripeWebhookSecret: env.STRIPE_WEBHOOK_SECRET,
  publisher: eventPublisher,
});

export const mediaController = new MediaController({
  baseUrl: '',
  logWriter,
  albumRepo,
  imageRepo,
});

// BFF wiring
const httpClient = new AxiosHttpClient({ logWriter });

// Create OIDC config from SiteConfiguration if OIDC is configured
let oidc: OidcClientOpenId | undefined;
let sessions: SessionService | undefined;

if (siteConfig.isOidcConfigured) {
  const authority = siteConfig.oidcAuthority;
  const authUrl = siteConfig.oidcAuthUrl;
  const tokenUrl = siteConfig.oidcTokenUrl;
  const clientId = siteConfig.oidcClientId;
  const clientSecret = siteConfig.oidcClientSecret;

  if (authority && authUrl && tokenUrl && clientId && clientSecret) {
    const oidcCfg: OidcOpenIdConfig = {
      issuer: authority,
      authUrl: authUrl,
      tokenUrl: tokenUrl,
      clientId: clientId,
      clientSecret: clientSecret,
      redirectUri: siteConfig.oidcRedirectUri,
      scopes: siteConfig.oidcScopes,
      ...(siteConfig.oidcJwksUrl ? { jwksUrl: siteConfig.oidcJwksUrl } : {}),
    };
    oidc = new OidcClientOpenId(oidcCfg);

    sessions = new SessionService({
      store: new MemorySessionStore(),
      states: new MemoryStateStore(),
      encKeyB64: siteConfig.sessionEncKey ?? 'c2Vzc2lvbl9lbmNfMzJieXRlc19iYXNlNjQ=',
      encKid: 'v1',
      bffJwtSecretB64: siteConfig.bffJwtSecret ?? 'YnZmX2p3dF9zZWNyZXRfYmFzZTY0',
      issuer: 'bff',
      audience: 'api',
      logger: logWriter,
    });
  }
}

export const rootBffController = new RootBffController({ baseUrl: '', logWriter });

// Only create BFF controllers if OIDC is configured
export const authBffController =
  oidc && sessions ? new AuthBffController({ baseUrl: '', logWriter, oidc, sessions }) : undefined;

export const cartBffController = sessions
  ? new CartBffController({
      baseUrl: '',
      logWriter,
      apiBaseUrl: siteConfig.apiBaseUrl,
      httpClient,
      sessions,
    })
  : undefined;

const requestLogger = new RequestLogMiddleware({ logWriter });
const serverPort: number = process.env['PORT']
  ? Number.parseInt(process.env['PORT'] as string, 10)
  : 3000;

export const server = new Server({
  controllers: [
    referencePublicApiController,
    referenceClaimAuthorizedApiController,
    cartController,
    orderController,
    paymentController,
    mediaController,
    // BFF - only include if configured
    rootBffController,
    ...(authBffController ? [authBffController] : []),
    ...(cartBffController ? [cartBffController] : []),
  ],
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
