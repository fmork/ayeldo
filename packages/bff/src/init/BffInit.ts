import { createRootLogger } from '@ayeldo/utils';
import type { ILogWriter } from '@fmork/backend-core/dist/logging';
import { AxiosHttpClient } from '@fmork/backend-core/dist/IO';
import { RequestLogMiddleware } from '@fmork/backend-core/dist/middleWare';
import { Server } from '@fmork/backend-core/dist/server';
import { CartBffController } from '../controllers/cartBffController';
import { getEnv } from '../init';

export const logWriter: ILogWriter = createRootLogger('bff', 'info');

const httpClient = new AxiosHttpClient({ logWriter });

export const cartBffController = new CartBffController({
  baseUrl: '',
  logWriter,
  apiBaseUrl: getEnv().API_BASE_URL,
  httpClient,
});

const requestLogger = new RequestLogMiddleware({ logWriter });
const serverPort: number = process.env['PORT'] ? Number.parseInt(process.env['PORT'] as string, 10) : 3001;

export const server = new Server({
  controllers: [cartBffController],
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

