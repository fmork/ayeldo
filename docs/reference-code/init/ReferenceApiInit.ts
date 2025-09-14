import {
  AxiosHttpClient,
  JsonUtil,
  RequestLogMiddleware,
  Server,
  ILogWriter,
  JwtAuthorization,
  TokenKeyCache,
  ClaimBasedAuthorizer,
} from 'backend-core';
import type { CorsOptions } from 'cors';
import { ReferencePublicApiController } from '../controllers/referencePublicApiController';
import { ReferenceClaimAuthorizedApiController } from '../controllers/referenceClaimAuthorizedApiController';

// Minimal console-based log writer for reference usage
class ConsoleLogWriter implements ILogWriter {
  debug(text: string): void {
    console.debug(text);
  }
  info(text: string): void {
    console.info(text);
  }
  warn(text: string): void {
    console.warn(text);
  }
  error(text: string, error: Error): void {
    console.error(`${text}\nError: ${error.message}\nStack: ${error.stack}`);
  }
}

// Basic, permissive CORS config for reference/demo usage
const corsOptions: CorsOptions = {
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
};

export const logWriter = new ConsoleLogWriter();
export const jsonUtil = new JsonUtil({ logWriter });

// Minimal HTTP client + JWT authorizer for claim checks
const httpClient = new AxiosHttpClient({ logWriter });
const tokenKeyCache = new TokenKeyCache({ httpClient, logWriter });
const jwtAuthorization = new JwtAuthorization({
  tokenKeyCache,
  logWriter,
  // For a real setup, set REFERENCE_OIDC_AUTHORITY to your issuer URL
  getKnownIssuers: () => [process.env.REFERENCE_OIDC_AUTHORITY || 'https://example-issuer.invalid'],
});

// Claim-based authorizer that looks for groups/roles in JWT claims
const claimBasedAuthorizer = new ClaimBasedAuthorizer({
  jwtAuthorization,
  logWriter,
  claimNames: ['cognito:groups', 'groups', 'roles'],
});

// Instantiate reference controllers
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

const requestLogger = new RequestLogMiddleware({ logWriter });
const serverPort: number = process.env.PORT ? parseInt(process.env.PORT) : 3000;

export const server = new Server({
  controllers: [referencePublicApiController, referenceClaimAuthorizedApiController],
  port: serverPort,
  requestLogger,
  logWriter,
  corsOptions,
});
