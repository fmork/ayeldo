import { RequestLogMiddleware, Server } from '@fmork/backend-core';
import {
  authController,
  albumsController,
  cartController,
  rootController,
  sessionController,
  tenantAdminController,
} from './authControllers';
import { logWriter, siteConfig } from './config';
import { mediaController, orderController, paymentController } from './coreControllers';

const requestLogger = new RequestLogMiddleware({ logWriter });

// Replace the request logger with the enhanced version so Server.initialize
// picks it up when it installs middleware.
// requestLogger.logRequest = enhancedLogRequest.bind(requestLogger);
const serverPort: number = process.env['PORT']
  ? Number.parseInt(process.env['PORT'] as string, 10)
  : 3000;

logWriter.info(
  `Starting API server on port ${serverPort}, API origin: ${siteConfig.apiOrigin}, Web origin: ${siteConfig.webOrigin}`,
);

export const server = new Server({
  controllers: [
    cartController,
    albumsController,
    orderController,
    paymentController,
    mediaController,
    // API controllers
    rootController,
    sessionController,
    authController,
    // Authenticated controllers
    tenantAdminController,
  ],
  port: serverPort,
  requestLogger,
  logging: {
    logWriter: logWriter,
    logRoutesOnInitialize: false,
    logCorsRejections: true,
  },
  corsOptions: {
    origin: [
      siteConfig.webOrigin,
      siteConfig.apiOrigin,
      // Development origins
      /^http:\/\/localhost:\d+$/,
      /^https:\/\/localhost:\d+$/,
      /^http:\/\/127\.0\.0\.1:\d+$/,
      /^https:\/\/127\.0\.0\.1:\d+$/,
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-CSRF-Token'],
    credentials: true,
  },
});
