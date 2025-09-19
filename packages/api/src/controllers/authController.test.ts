import type { ILogWriter } from '@ayeldo/backend-core';
import { SiteConfiguration } from '@ayeldo/core';
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

  const mkJsonUtil = () =>
    ({
      getParsedRequestBody: jest.fn(),
    }) as any;

  const mkSiteConfig = (): SiteConfiguration => {
    // Required envs for SiteConfiguration (tests must provide all values)
    process.env['WEB_ORIGIN'] = process.env['WEB_ORIGIN'] ?? 'http://localhost:3001';
    process.env['API_BASE_URL'] = process.env['API_BASE_URL'] ?? 'http://localhost:3000';
    process.env['OIDC_ISSUER_URL'] = process.env['OIDC_ISSUER_URL'] ?? 'https://auth.example.com';
    process.env['OIDC_CLIENT_ID'] = process.env['OIDC_CLIENT_ID'] ?? 'test-client-id';
    process.env['OIDC_CLIENT_SECRET'] = process.env['OIDC_CLIENT_SECRET'] ?? 'test-client-secret';
    process.env['SESSION_ENC_KEY'] =
      process.env['SESSION_ENC_KEY'] ?? 'c2Vzc2lvbl9lbmNfMzJieXRlc19iYXNlNjQ=';
    process.env['API_JWT_SECRET'] = process.env['API_JWT_SECRET'] ?? 'YnZmX2p3dF9zZWNyZXRfYmFzZTY0';
    process.env['TABLE_NAME'] = process.env['TABLE_NAME'] ?? 'AppTable';
    process.env['AWS_REGION'] = process.env['AWS_REGION'] ?? 'us-east-1';
    process.env['EVENTS_BUS_NAME'] = process.env['EVENTS_BUS_NAME'] ?? 'default';
    process.env['DDB_ENDPOINT'] = process.env['DDB_ENDPOINT'] ?? 'http://localhost:8000';
    process.env['CDN_HOST'] = process.env['CDN_HOST'] ?? 'http://cdn.local';
    process.env['MEDIA_BUCKET'] = process.env['MEDIA_BUCKET'] ?? 'media-bucket';
    process.env['IMAGE_VARIANTS'] = process.env['IMAGE_VARIANTS'] ?? 'small,medium,large';
    process.env['PORT'] = process.env['PORT'] ?? '3000';
    return new SiteConfiguration();
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
      jsonUtil: mkJsonUtil(),
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
      jsonUtil: mkJsonUtil(),
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
      jsonUtil: mkJsonUtil(),
    });

    const router = controller.initialize();
    expect(router).toBeDefined();
  });

  // Note: Full HTTP endpoint testing would require a router/server harness
  // to exercise CSRF middleware, cookie handling, and HTTP-specific logic.
  // For now, we focus on dependency injection and basic initialization.
  // Integration tests should be added when implementing Phase 5.
});
