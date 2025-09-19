import type { NextFunction, Request, Response, Router } from 'express';
import type { ILogWriter } from '../logging/ILogWriter';
import type { AuthorizationRequirement } from '../security/AuthorizationTypes';
import { GroupAuthorizedController } from './GroupAuthorizedController';
import type { HttpMiddleware, HttpRouter } from './http';

// Test controller implementation
class TestGroupAuthorizedController extends GroupAuthorizedController {
  constructor(
    baseUrl: string,
    logWriter: ILogWriter,
    authorizerOrFactory:
      | HttpMiddleware
      | ((requirement?: AuthorizationRequirement) => HttpMiddleware),
  ) {
    super(baseUrl, logWriter, authorizerOrFactory);
  }

  public initialize(): HttpRouter {
    // Test with different authorization requirements
    this.addGet('/test-no-auth', (_req, res) => {
      res.json({ message: 'no auth required' });
    });

    this.addPost(
      '/test-admin',
      (_req, res) => {
        res.json({ message: 'admin only' });
      },
      { requiredGroups: ['admins'] },
    );

    this.addPut(
      '/test-multi-group',
      (_req, res) => {
        res.json({ message: 'multiple groups' });
      },
      { requiredGroups: ['admins', 'editors'] },
    );

    this.addDelete(
      '/test-super-admin',
      (_req, res) => {
        res.json({ message: 'super admin only' });
      },
      { requiredGroups: ['super-admins'] },
    );

    return this.getRouter();
  }

  // Expose the router for testing
  public getExpressRouter(): Router {
    return this.getRouter().asExpressRouter();
  }
}

describe('GroupAuthorizedController', () => {
  let mockLogWriter: jest.Mocked<ILogWriter>;
  let mockLegacyAuthorizer: jest.Mock;
  let mockAuthorizerFactory: jest.Mock;

  beforeEach(() => {
    mockLogWriter = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    };

    mockLegacyAuthorizer = jest.fn((req: Request, res: Response, next: NextFunction) => {
      next();
    });

    mockAuthorizerFactory = jest.fn((requirement?: AuthorizationRequirement) => {
      return (req: Request, res: Response, next: NextFunction) => {
        next();
      };
    });
  });

  it('should work with legacy authorizer (3 parameters)', () => {
    const controller = new TestGroupAuthorizedController(
      '/api',
      mockLogWriter,
      mockLegacyAuthorizer,
    );

    const router = controller.initialize();

    expect(router).toBeDefined();
    // Legacy authorizer should be used regardless of authorization requirements
  });

  it('should work with authorizer factory (1 parameter)', () => {
    const controller = new TestGroupAuthorizedController(
      '/api',
      mockLogWriter,
      mockAuthorizerFactory,
    );

    const router = controller.initialize();

    expect(router).toBeDefined();

    // Factory should be called with different requirements
    expect(mockAuthorizerFactory).toHaveBeenCalledTimes(4);

    // Check that factory was called with correct requirements
    expect(mockAuthorizerFactory).toHaveBeenCalledWith(undefined); // no auth route
    expect(mockAuthorizerFactory).toHaveBeenCalledWith({ requiredGroups: ['admins'] });
    expect(mockAuthorizerFactory).toHaveBeenCalledWith({ requiredGroups: ['admins', 'editors'] });
    expect(mockAuthorizerFactory).toHaveBeenCalledWith({ requiredGroups: ['super-admins'] });
  });

  it('should detect legacy authorizer by parameter count', () => {
    const legacyAuthorizer = (req: Request, res: Response, next: NextFunction) => next();
    expect(legacyAuthorizer.length).toBe(3); // Should have 3 parameters

    const authorizerFactory =
      (requirement?: AuthorizationRequirement) =>
      (req: Request, res: Response, next: NextFunction) =>
        next();
    expect(authorizerFactory.length).toBe(1); // Should have 1 parameter
  });

  it('should throw error when no authorizer is provided', () => {
    // The constructor should throw when null/undefined authorizer is provided
    expect(() => {
      new TestGroupAuthorizedController('/api', mockLogWriter, null as any);
    }).toThrow('Authorizer is required');
  });

  describe('HTTP method routing', () => {
    let controller: TestGroupAuthorizedController;

    beforeEach(() => {
      controller = new TestGroupAuthorizedController('/api', mockLogWriter, mockAuthorizerFactory);
    });

    it('should add GET routes with authorization', () => {
      controller.initialize();

      // Verify GET route was registered (indirect test through mock calls)
      expect(mockAuthorizerFactory).toHaveBeenCalled();
    });

    it('should add POST routes with authorization', () => {
      controller.initialize();

      // Verify POST route was registered with correct requirements
      expect(mockAuthorizerFactory).toHaveBeenCalledWith({ requiredGroups: ['admins'] });
    });

    it('should add PUT routes with authorization', () => {
      controller.initialize();

      // Verify PUT route was registered with multi-group requirements
      expect(mockAuthorizerFactory).toHaveBeenCalledWith({ requiredGroups: ['admins', 'editors'] });
    });

    it('should add DELETE routes with authorization', () => {
      controller.initialize();

      // Verify DELETE route was registered with super-admin requirements
      expect(mockAuthorizerFactory).toHaveBeenCalledWith({ requiredGroups: ['super-admins'] });
    });
  });
});
