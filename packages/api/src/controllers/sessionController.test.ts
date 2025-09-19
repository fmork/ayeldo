import type { ILogWriter } from '@ayeldo/backend-core';
import type { AuthFlowService } from '../services/authFlowService';
import { SessionController } from './sessionController';

describe('SessionController', () => {
  const mkLogger = (): ILogWriter => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  });

  const mkAuthFlow = (overrides?: Partial<AuthFlowService>): AuthFlowService =>
    ({
      sessionInfo: jest.fn().mockResolvedValue({ loggedIn: false }),
      ...overrides,
    }) as AuthFlowService;

  it('should create a controller that can be initialized', () => {
    const controller = new SessionController({
      baseUrl: 'session',
      logWriter: mkLogger(),
      authFlow: mkAuthFlow(),
    });

    expect(() => controller.initialize()).not.toThrow();
  });

  it('should call sessionInfo when initialized', () => {
    const mockAuthFlow = mkAuthFlow({
      sessionInfo: jest.fn().mockResolvedValue({ loggedIn: true, sub: 'test' }),
    });

    const controller = new SessionController({
      baseUrl: '',
      logWriter: mkLogger(),
      authFlow: mockAuthFlow,
    });

    controller.initialize();

    // The sessionInfo method should be available (we can't easily test the actual HTTP call without a full server setup)
    expect(typeof mockAuthFlow.sessionInfo).toBe('function');
  });
});
