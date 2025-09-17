// Main API initialization file - orchestrates all initialization modules

// Configuration and environment setup
export { claimBasedAuthorizer, env, jsonUtil, logWriter, siteConfig } from './config';

// Infrastructure (DynamoDB, repositories, event publisher)
export {
  albumRepo,
  cartRepo,
  ddb,
  download,
  eventPublisher,
  httpClient,
  imageRepo,
  orderRepo,
  payments,
  priceListRepo,
} from './infrastructure';

// Core controllers (don't depend on OIDC)
export { mediaController, orderController, paymentController } from './coreControllers';

// Tenant services
export { onboardingService, tenantService, userRepo } from './tenantServices';

// Authentication services
export { authFlowService, oidc, sessions } from './authServices';

// Authentication controllers
export {
  authController,
  cartController,
  rootController,
  sessionBasedAuthorizer,
  sessionController,
  tenantAdminController,
} from './authControllers';

// Server setup
export { server } from './server';
