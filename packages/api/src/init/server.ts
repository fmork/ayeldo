import { RequestLogMiddleware, Server, type ControllerBase } from '@ayeldo/backend-core';
import {
  albumsController,
  authController,
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
const serverPort: number =
  siteConfig.server.port ??
  (process.env['PORT'] ? Number.parseInt(process.env['PORT'] as string, 10) : 3000);

logWriter.info(
  `Starting API server on port ${serverPort}, API origin: ${siteConfig.origins.apiBaseUrl}, Web origin: ${siteConfig.origins.webOrigin}`,
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
    sessionController as unknown as ControllerBase,
    authController as unknown as ControllerBase,
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
      siteConfig.origins.webOrigin,
      siteConfig.origins.apiBaseUrl,
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
