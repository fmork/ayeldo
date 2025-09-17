import type { ILogWriter } from '@fmork/backend-core';
import type { AuthFlowService } from '../services/authFlowService';
import type { OnboardingService } from '../services/onboardingService';
import { AuthController } from './authController';

describe('AuthController', () => {
  const mkLogger = (): ILogWriter => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  });

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
      createTenantAndMaybeSignIn: jest.fn().mockResolvedValue({
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

    const controller = new AuthController({
      baseUrl: 'https://api.example.com',
      logWriter: logger,
      authFlow,
      onboardingService,
    });

    expect(controller).toBeInstanceOf(AuthController);
  });

  test('constructor works without onboarding service', () => {
    const authFlow = mkAuthFlow();
    const logger = mkLogger();

    const controller = new AuthController({
      baseUrl: 'https://api.example.com',
      logWriter: logger,
      authFlow,
    });

    expect(controller).toBeInstanceOf(AuthController);
  });

  test('initialize returns router', () => {
    const authFlow = mkAuthFlow();
    const onboardingService = mkOnboardingService();
    const logger = mkLogger();

    const controller = new AuthController({
      baseUrl: 'https://api.example.com',
      logWriter: logger,
      authFlow,
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
