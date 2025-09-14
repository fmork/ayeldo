import { createRootLogger } from '@ayeldo/utils';
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
import { ReferenceClaimAuthorizedApiController } from '../controllers/referenceClaimAuthorizedApiController';
import { CartController } from '../controllers/cartController';
import { CartRepoDdb, PriceListRepoDdb, DdbDocumentClientAdapter } from '@ayeldo/infra-aws';
import { ReferencePublicApiController } from '../controllers/referencePublicApiController';

// Root logger using @ayeldo/utils pino adapter (implements ILogWriter shape)
export const logWriter: ILogWriter = createRootLogger('api', 'info');
export const jsonUtil = new JsonUtil({ logWriter });

// Minimal HTTP client + JWT authorizer for claim checks
const httpClient = new AxiosHttpClient({ logWriter });
const tokenKeyCache = new TokenKeyCache({ httpClient, logWriter });
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

// DynamoDB repos
const tableName = process.env['TABLE_NAME'] || 'AppTable';
const region = process.env['AWS_REGION'] || 'us-east-1';
const ddbEndpoint = process.env['DDB_ENDPOINT'];
const ddb = new DdbDocumentClientAdapter({ region, ...(ddbEndpoint ? { endpoint: ddbEndpoint } : {}) });
const cartRepo = new CartRepoDdb({ tableName, client: ddb });
const priceListRepo = new PriceListRepoDdb({ tableName, client: ddb });

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
});

const requestLogger = new RequestLogMiddleware({ logWriter });
const serverPort: number = process.env['PORT']
  ? Number.parseInt(process.env['PORT'] as string, 10)
  : 3000;

export const server = new Server({
  controllers: [referencePublicApiController, referenceClaimAuthorizedApiController, cartController],
  port: serverPort,
  requestLogger,
  logWriter,
  corsOptions: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    credentials: true,
  },
});
