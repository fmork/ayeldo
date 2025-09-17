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
import TenantRepoDdb from '@ayeldo/infra-aws/src/tenantRepoDdb';
import UserRepoDdb from '@ayeldo/infra-aws/src/userRepoDdb';
import { createRootLogger, getEventBridgeClient, loadEnv } from '@ayeldo/utils';
import type { ILogWriter } from '@fmork/backend-core';
import {
  AxiosHttpClient,
  ClaimBasedAuthorizer,
  JsonUtil,
  JwtAuthorization,
  RequestLogMiddleware,
  Server,
  TokenKeyCache,
} from '@fmork/backend-core';
import { z } from 'zod';
import { CartController } from '../controllers/cartController';
import { MediaController } from '../controllers/mediaController';
import { OrderController } from '../controllers/orderController';
import { PaymentController } from '../controllers/paymentController';
import { TenantAdminController } from '../controllers/tenantAdminController';
import { StripePaymentProviderFake } from '../payments/stripePaymentProviderFake';
// Controllers and services that include former BFF responsibilities (previously in packages/bff).
// These were merged into the API package; controller/class names may still include 'Bff' for
// historical reasons.
import { DdbSessionStore, DdbStateStore } from '@ayeldo/infra-aws';
import { AuthController } from '../controllers/authController';
import { CartFrontendController } from '../controllers/cartController';
import { RootController } from '../controllers/rootController';
import { AuthFlowService } from '../services/authFlowService';
import { OidcClientOpenId, type OidcOpenIdConfig } from '../services/oidcOpenIdClient';
import OnboardingService from '../services/onboardingService';
import { SessionBasedAuthorizer } from '../services/sessionBasedAuthorizer';
import { SessionService } from '../services/sessionService';
import { TenantService } from '../services/tenantService';
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

// Log configuration status
// Note: `bffOrigin` currently represents the HTTP API origin (formerly called BFF).
logWriter.info(
  `Site configuration: webOrigin=${siteConfig.webOrigin}, bffOrigin=${siteConfig.bffOrigin}`,
);
logWriter.info(
  `OIDC configuration status: ${siteConfig.isOidcConfigured ? 'ENABLED' : 'DISABLED'}`,
);

if (!siteConfig.isOidcConfigured) {
  logWriter.warn('OIDC is not configured. Auth endpoints will not be available.');
  logWriter.warn('To enable OIDC, set: OIDC_ISSUER_URL, OIDC_CLIENT_ID, OIDC_CLIENT_SECRET');
}

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
  logger: logWriter,
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

// Tenant repository and service (used by admin controller)
const tenantRepo = new TenantRepoDdb({ tableName, client: ddb });

const tenantService = new TenantService({
  tenantRepo,
  publisher: eventPublisher,
  jsonUtil,
  logger: logWriter,
});

const userRepo = new UserRepoDdb({ tableName, client: ddb });

const onboardingService = new OnboardingService({
  tenantService,
  userRepo,
  eventPublisher,
  logger: logWriter,
});

// BFF wiring
const httpClient = new AxiosHttpClient({ logWriter });

// Create OIDC config from SiteConfiguration if OIDC is configured
let oidc: OidcClientOpenId | undefined;
let sessions: SessionService | undefined;
let authFlowService: AuthFlowService | undefined;

if (siteConfig.isOidcConfigured) {
  const authority = siteConfig.oidcAuthority;
  const authUrl = process.env['OIDC_AUTH_URL'] ?? siteConfig.oidcAuthUrl;
  const tokenUrl = process.env['OIDC_TOKEN_URL'] ?? siteConfig.oidcTokenUrl;
  const clientId = siteConfig.oidcClientId;
  const clientSecret = siteConfig.oidcClientSecret;
  const jwksUrlOverride = process.env['OIDC_JWKS_URL'];
  const redirectUriOverride = process.env['OIDC_REDIRECT_URI'];

  if (authority && authUrl && tokenUrl && clientId && clientSecret) {
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
    oidc = new OidcClientOpenId(oidcCfg);

    sessions = new SessionService({
      store: new DdbSessionStore({ tableName, client: ddb }),
      states: new DdbStateStore({ tableName, client: ddb, logger: logWriter }),
      encKeyB64: siteConfig.sessionEncKey ?? 'c2Vzc2lvbl9lbmNfMzJieXRlc19iYXNlNjQ=',
      encKid: 'v1',
      bffJwtSecretB64: siteConfig.bffJwtSecret ?? 'YnZmX2p3dF9zZWNyZXRfYmFzZTY0',
      issuer: 'bff',
      audience: 'api',
      logger: logWriter,
    });

    authFlowService = new AuthFlowService({
      oidc,
      sessions,
      userRepo,
      logger: logWriter,
    });
  }
}

export const rootBffController = new RootController({ baseUrl: '', logWriter });

// Only create BFF controllers if OIDC is configured
export const authBffController =
  oidc && sessions && authFlowService
    ? new AuthController({
        baseUrl: '',
        logWriter,
        authFlow: authFlowService,
        onboardingService,
      })
    : undefined;

export const cartBffController = sessions
  ? new CartFrontendController({
      baseUrl: '',
      logWriter,
      apiBaseUrl: siteConfig.apiBaseUrl,
      httpClient,
      sessions,
    })
  : undefined;

// Session-based authorizer for authenticated endpoints
export const sessionBasedAuthorizer = sessions
  ? new SessionBasedAuthorizer({
      sessionService: sessions,
      logWriter,
      claimBasedAuthorizer,
    })
  : undefined;

// Tenant admin controller (requires authentication)
export const tenantAdminController =
  sessions && sessionBasedAuthorizer
    ? new TenantAdminController({
        baseUrl: '',
        logWriter,
        jsonUtil,
        sessionService: sessions,
        authorizer: sessionBasedAuthorizer.createAuthorizer,
        tenantService,
      })
    : undefined;

const requestLogger = new RequestLogMiddleware({ logWriter });

// // Enhance the requestLogger so it also logs all request headers and parsed
// // cookies (cookie-parser will populate req.cookies when cookieParser runs).
// // Server installs `requestLogger.logRequest` early (before controllers), so
// // wrapping it here guarantees our debug logging runs before routes.
// const originalLogRequest = requestLogger.logRequest.bind(requestLogger);
// const enhancedLogRequest = async (req: unknown, res: unknown, next: unknown): Promise<void> => {
//   try {
//     // Run cookie-parser to populate req.cookies so the original request
//     // logger (installed by Server) can access cookies even though
//     // cookieParser middleware may be added later in handler.ts.
//     const cp = cookieParser();
//     await new Promise<void>((resolve) => {
//       try {
//         cp(req as unknown as never, res as unknown as never, () => resolve());
//       } catch (e) {
//         resolve();
//       }
//     });

//     const r = req as {
//       headers?: Record<string, string | string[] | undefined>;
//       cookies?: Record<string, string>;
//     };
//     logWriter.info(`REQ HEADERS: ${JSON.stringify(r.headers ?? {})}`);
//     logWriter.info(`REQ COOKIES: ${JSON.stringify(r.cookies ?? {})}`);
//   } catch (e) {
//     logWriter.warn(
//       `Failed to log headers/cookies in enhancedRequestLogger: ${(e as Error).message}`,
//     );
//   }
//   // Delegate to original logger and await if it returns a Promise
//   await originalLogRequest(
//     req as unknown as never,
//     res as unknown as never,
//     next as unknown as never,
//   );
// };

// Replace the request logger with the enhanced version so Server.initialize
// picks it up when it installs middleware.
// requestLogger.logRequest = enhancedLogRequest.bind(requestLogger);
const serverPort: number = process.env['PORT']
  ? Number.parseInt(process.env['PORT'] as string, 10)
  : 3000;

export const server = new Server({
  controllers: [
    cartController,
    orderController,
    paymentController,
    mediaController,
    // BFF - only include if configured
    rootBffController,
    ...(authBffController ? [authBffController] : []),
    ...(cartBffController ? [cartBffController] : []),
    // Authenticated controllers
    ...(tenantAdminController ? [tenantAdminController] : []),
  ],
  port: serverPort,
  requestLogger,
  logWriter,
  corsOptions: {
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ): void => {
      const corsMessages: string[] = [];
      corsMessages.push(`CORS request from origin: ${origin || 'no-origin'}`);

      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) {
        corsMessages.push('CORS: Allowing request with no origin');
        return callback(null, true);
      }

      // List of allowed origins (string or RegExp entries)
      const allowedOrigins: (string | RegExp)[] = [
        siteConfig.webOrigin,
        siteConfig.bffOrigin,
        // Development origins: allow any localhost/127.0.0.1 port
        /^http:\/\/localhost:\d+$/,
        /^https:\/\/localhost:\d+$/,
        /^http:\/\/127\.0\.0\.1:\d+$/,
        /^https:\/\/127\.0\.0\.1:\d+$/,
      ];

      corsMessages.push(
        'CORS: Allowed origins: ' +
          allowedOrigins.map((o) => (typeof o === 'string' ? o : o.toString())).join(', '),
      );

      const isAllowed = Boolean(
        origin &&
          allowedOrigins.some((entry) => {
            if (typeof entry === 'string') {
              return entry === origin;
            }
            if (entry instanceof RegExp) {
              return entry.test(origin);
            }
            return false;
          }),
      );

      if (isAllowed) {
        callback(null, true);
      } else {
        corsMessages.push(`CORS: Rejecting origin ${origin}`);
        logWriter.info(corsMessages.join('\n'));

        callback(new Error(`Not allowed by CORS: ${origin}`));
      }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-CSRF-Token'],
    credentials: true,
  },
});
