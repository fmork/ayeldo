import { SiteConfiguration } from '@ayeldo/core';
import type { ILogWriter } from '@fmork/backend-core';
import type { AuthFlowService } from '../services/authFlowService';
import type { OnboardingService } from '../services/onboardingService';
import { AuthController } from './authController';

// Mock the ApiInit module to prevent initialization during tests
jest.mock('../init/ApiInit', () => ({
  logWriter: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock the initialization modules to avoid OIDC configuration requirements
jest.mock('../init/authServices', () => ({
  authFlowService: {
    buildAuthorizeUrl: jest.fn().mockReturnValue({ url: 'https://auth.example.com' }),
    buildLoginRedirectUrl: jest.fn().mockReturnValue('https://auth.example.com/login'),
    handleCallback: jest.fn().mockResolvedValue({
      sid: 'session-123',
      csrf: 'csrf-456',
      redirectTarget: '/',
    }),
    sessionInfo: jest.fn().mockResolvedValue({
      loggedIn: true,
      sub: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
    }),
    logout: jest.fn().mockResolvedValue(undefined),
  },
  sessions: {
    createSession: jest.fn(),
    getSession: jest.fn(),
    updateSession: jest.fn(),
    deleteSession: jest.fn(),
  },
}));

jest.mock('../init/config', () => ({
  logWriter: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
  siteConfig: {
    webOrigin: 'http://localhost:3001',
    apiOrigin: 'http://localhost:3000',
    oidcAuthority: 'https://auth.example.com',
    oidcClientId: 'test-client-id',
    oidcClientSecret: 'test-client-secret',
  },
}));

jest.mock('../init/tenantServices', () => ({
  onboardingService: {
    createTenant: jest.fn().mockResolvedValue({
      tenant: { id: 'tenant-123', name: 'Test Tenant', ownerEmail: 'test@example.com' },
      adminUser: { id: 'user-123', email: 'test@example.com', oidcSub: 'user-123' },
      session: undefined,
    }),
  },
}));

describe('AuthController', () => {
  const mkLogger = (): ILogWriter => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  });

  const mkSiteConfig = (): SiteConfiguration => {
    return new SiteConfiguration({
      webOrigin: 'http://localhost:3001',
      bffOrigin: 'http://localhost:3000',
      oidcAuthority: 'https://auth.example.com',
      oidcClientId: 'test-client-id',
      oidcClientSecret: 'test-client-secret',
    });
  };

  const mkAuthFlow = (overrides?: Partial<AuthFlowService>): AuthFlowService =>
    ({
      buildAuthorizeUrl: jest.fn().mockReturnValue({ url: 'https://auth.example.com' }),
      buildLoginRedirectUrl: jest.fn().mockReturnValue('https://auth.example.com/login'),
      handleCallback: jest.fn().mockResolvedValue({
        sid: 'session-123',
        csrf: 'csrf-456',
        redirectTarget: '/',
      }),
      sessionInfo: jest.fn().mockResolvedValue({
        loggedIn: true,
        sub: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
      }),
      logout: jest.fn().mockResolvedValue(undefined),
      ...overrides,
    }) as any;

  const mkOnboardingService = (overrides?: Partial<OnboardingService>): OnboardingService =>
    ({
      createTenant: jest.fn().mockResolvedValue({
        tenant: { id: 'tenant-123', name: 'Test Tenant', ownerEmail: 'test@example.com' },
        adminUser: { id: 'user-123', email: 'test@example.com', oidcSub: 'user-123' },
        session: undefined,
      }),
      ...overrides,
    }) as any;

  test('constructor initializes with dependencies', () => {
    const authFlow = mkAuthFlow();
    const onboardingService = mkOnboardingService();
    const logger = mkLogger();
    const siteConfig = mkSiteConfig();

    const controller = new AuthController({
      baseUrl: 'https://api.example.com',
      logWriter: logger,
      authFlow,
      siteConfig,
      onboardingService,
    });

    expect(controller).toBeInstanceOf(AuthController);
  });

  test('constructor works without onboarding service', () => {
    const authFlow = mkAuthFlow();
    const logger = mkLogger();
    const siteConfig = mkSiteConfig();

    const controller = new AuthController({
      baseUrl: 'https://api.example.com',
      logWriter: logger,
      authFlow,
      siteConfig,
    });

    expect(controller).toBeInstanceOf(AuthController);
  });

  test('initialize returns router', () => {
    const authFlow = mkAuthFlow();
    const onboardingService = mkOnboardingService();
    const logger = mkLogger();
    const siteConfig = mkSiteConfig();

    const controller = new AuthController({
      baseUrl: 'https://api.example.com',
      logWriter: logger,
      authFlow,
      siteConfig,
      onboardingService,
    });

    const router = controller.initialize();
    expect(router).toBeDefined();
  });

  // Note: Full HTTP endpoint testing would require a router/server harness
  // to exercise CSRF middleware, cookie handling, and HTTP-specific logic.
  // For now, we focus on dependency injection and basic initialization.
  // Integration tests should be added when implementing Phase 5.
});
