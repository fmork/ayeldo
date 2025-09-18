import { AuthController } from '../controllers/authController';
import { CartController } from '../controllers/cartController';
import { RootController } from '../controllers/rootController';
import { SessionController } from '../controllers/sessionController';
import { TenantAdminController } from '../controllers/tenantAdminController';
import { SessionBasedAuthorizer } from '../services/sessionBasedAuthorizer';
import { authFlowService, sessions } from './authServices';
import { claimBasedAuthorizer, jsonUtil, logWriter, siteConfig } from './config';
import { cartRepo, eventPublisher, httpClient, priceListRepo } from './infrastructure';
import { onboardingService, tenantService } from './tenantServices';

// Root controller (always available)
export const rootController = new RootController({ baseUrl: '', logWriter });

// Authentication controllers (always initialized)
export const authController = new AuthController({
  baseUrl: '/auth',
  logWriter,
  authFlow: authFlowService,
  siteConfig,
  onboardingService,
  jsonUtil,
});

export const sessionController = new SessionController({
  baseUrl: '/session',
  logWriter,
  authFlow: authFlowService,
});

export const cartController = new CartController({
  baseUrl: '',
  logWriter,
  apiBaseUrl: siteConfig.apiBaseUrl,
  httpClient,
  sessions,
  cartRepo,
  priceListRepo,
  publisher: eventPublisher,
});

// Session-based authorizer for authenticated endpoints
export const sessionBasedAuthorizer = new SessionBasedAuthorizer({
  sessionService: sessions,
  logWriter,
  claimBasedAuthorizer,
});

// Tenant admin controller (requires authentication)
export const tenantAdminController = new TenantAdminController({
  baseUrl: '',
  logWriter,
  jsonUtil,
  sessionService: sessions,
  authorizer: sessionBasedAuthorizer.createAuthorizer,
  tenantService,
});
