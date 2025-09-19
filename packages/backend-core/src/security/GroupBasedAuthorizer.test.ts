import type { Request, Response } from 'express';
import type { ILogWriter } from '../logging/ILogWriter';
import type { AuthorizationRequirement } from './AuthorizationTypes';
import { GroupBasedAuthorizer } from './GroupBasedAuthorizer';
import type { JwtAuthorization } from './JwtAuthorization';

describe('GroupBasedAuthorizer', () => {
  let mockJwtAuthorization: jest.Mocked<JwtAuthorization>;
  let mockLogWriter: jest.Mocked<ILogWriter>;
  let groupBasedAuthorizer: GroupBasedAuthorizer;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: jest.Mock;

  beforeEach(() => {
    mockJwtAuthorization = {
      getVerifiedToken: jest.fn(),
    } as any;

    mockLogWriter = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    };

    groupBasedAuthorizer = new GroupBasedAuthorizer({
      jwtAuthorization: mockJwtAuthorization,
      logWriter: mockLogWriter,
      groupClaimNames: ['cognito:groups', 'groups'], // Default test configuration
    });

    mockRequest = {
      headers: {},
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockNext = jest.fn();
  });

  describe('createAuthorizer', () => {
    it('should return 401 when authorization header is missing', async () => {
      const authorizer = groupBasedAuthorizer.createAuthorizer();

      await authorizer(mockRequest as any, mockResponse as any, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Authorization token is missing',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 when bearer token is missing', async () => {
      mockRequest.headers = { authorization: 'Bearer' };
      const authorizer = groupBasedAuthorizer.createAuthorizer();

      await authorizer(mockRequest as any, mockResponse as any, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Bearer token is missing',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 when JWT verification fails', async () => {
      mockRequest.headers = { authorization: 'Bearer invalid-token' };
      mockJwtAuthorization.getVerifiedToken.mockRejectedValue(new Error('Invalid token'));

      const authorizer = groupBasedAuthorizer.createAuthorizer();

      await authorizer(mockRequest as any, mockResponse as any, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Invalid or expired token',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should call next() when token is valid and no group requirements', async () => {
      const mockPayload = { sub: 'user123', email: 'test@example.com' };
      mockRequest.headers = { authorization: 'Bearer valid-token' };
      mockJwtAuthorization.getVerifiedToken.mockResolvedValue(mockPayload);

      const authorizer = groupBasedAuthorizer.createAuthorizer();

      await authorizer(mockRequest as any, mockResponse as any, mockNext);

      expect((mockRequest as any).user).toBe(mockPayload);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should call next() when user has required group (cognito:groups)', async () => {
      const mockPayload = {
        sub: 'user123',
        email: 'test@example.com',
        'cognito:groups': ['events-admins', 'general-users'],
      };
      mockRequest.headers = { authorization: 'Bearer valid-token' };
      mockJwtAuthorization.getVerifiedToken.mockResolvedValue(mockPayload);

      const requirement: AuthorizationRequirement = {
        requiredGroups: ['events-admins'],
      };

      const authorizer = groupBasedAuthorizer.createAuthorizer(requirement);

      await authorizer(mockRequest as any, mockResponse as any, mockNext);

      expect((mockRequest as any).user).toBe(mockPayload);
      expect(mockNext).toHaveBeenCalled();
      expect(mockLogWriter.info).toHaveBeenCalledWith(
        'Access granted: User has required claim values. User values: [events-admins, general-users], Required: [events-admins]',
      );
    });

    it('should call next() when user has one of multiple required groups', async () => {
      const mockPayload = {
        sub: 'user123',
        'cognito:groups': ['events-readers'],
      };
      mockRequest.headers = { authorization: 'Bearer valid-token' };
      mockJwtAuthorization.getVerifiedToken.mockResolvedValue(mockPayload);

      const requirement: AuthorizationRequirement = {
        requiredGroups: ['events-admins', 'events-readers'], // User has events-readers
      };

      const authorizer = groupBasedAuthorizer.createAuthorizer(requirement);

      await authorizer(mockRequest as any, mockResponse as any, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should return 403 when user lacks required groups', async () => {
      const mockPayload = {
        sub: 'user123',
        'cognito:groups': ['basic-users'],
      };
      mockRequest.headers = { authorization: 'Bearer valid-token' };
      mockJwtAuthorization.getVerifiedToken.mockResolvedValue(mockPayload);

      const requirement: AuthorizationRequirement = {
        requiredGroups: ['events-admins'],
      };

      const authorizer = groupBasedAuthorizer.createAuthorizer(requirement);

      await authorizer(mockRequest as any, mockResponse as any, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Insufficient permissions - required claim values not found',
        requiredValues: ['events-admins'],
      });
      expect(mockNext).not.toHaveBeenCalled();
      expect(mockLogWriter.warn).toHaveBeenCalledWith(
        'Access denied: User claim values [basic-users] do not contain any required values [events-admins]',
      );
    });

    it('should handle fallback to "groups" claim when cognito:groups is not present', async () => {
      const mockPayload = {
        sub: 'user123',
        groups: ['events-admins'], // fallback claim
      };
      mockRequest.headers = { authorization: 'Bearer valid-token' };
      mockJwtAuthorization.getVerifiedToken.mockResolvedValue(mockPayload);

      const requirement: AuthorizationRequirement = {
        requiredGroups: ['events-admins'],
      };

      const authorizer = groupBasedAuthorizer.createAuthorizer(requirement);

      await authorizer(mockRequest as any, mockResponse as any, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle empty groups array', async () => {
      const mockPayload = {
        sub: 'user123',
        'cognito:groups': [],
      };
      mockRequest.headers = { authorization: 'Bearer valid-token' };
      mockJwtAuthorization.getVerifiedToken.mockResolvedValue(mockPayload);

      const requirement: AuthorizationRequirement = {
        requiredGroups: ['events-admins'],
      };

      const authorizer = groupBasedAuthorizer.createAuthorizer(requirement);

      await authorizer(mockRequest as any, mockResponse as any, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle payload with no group claims', async () => {
      const mockPayload = {
        sub: 'user123',
        email: 'test@example.com',
        // No group claims
      };
      mockRequest.headers = { authorization: 'Bearer valid-token' };
      mockJwtAuthorization.getVerifiedToken.mockResolvedValue(mockPayload);

      const requirement: AuthorizationRequirement = {
        requiredGroups: ['events-admins'],
      };

      const authorizer = groupBasedAuthorizer.createAuthorizer(requirement);

      await authorizer(mockRequest as any, mockResponse as any, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockNext).not.toHaveBeenCalled();
      expect(mockLogWriter.warn).toHaveBeenCalledWith(
        'Access denied: User claim values [] do not contain any required values [events-admins]',
      );
    });
  });

  describe('constructor validation', () => {
    it('should throw error when no group claim names are provided', () => {
      expect(() => {
        new GroupBasedAuthorizer({
          jwtAuthorization: mockJwtAuthorization,
          logWriter: mockLogWriter,
          groupClaimNames: [],
        });
      }).toThrow('At least one claim name must be specified');
    });

    it('should throw error when groupClaimNames is undefined', () => {
      expect(() => {
        new GroupBasedAuthorizer({
          jwtAuthorization: mockJwtAuthorization,
          logWriter: mockLogWriter,
          groupClaimNames: undefined as any,
        });
      }).toThrow('At least one claim name must be specified');
    });
  });

  describe('configurable group claims', () => {
    it('should work with custom claim names', async () => {
      const customAuthorizer = new GroupBasedAuthorizer({
        jwtAuthorization: mockJwtAuthorization,
        logWriter: mockLogWriter,
        groupClaimNames: ['roles', 'permissions'],
      });

      const mockPayload = {
        sub: 'user123',
        roles: ['admin', 'editor'],
      };
      mockRequest.headers = { authorization: 'Bearer valid-token' };
      mockJwtAuthorization.getVerifiedToken.mockResolvedValue(mockPayload);

      const requirement: AuthorizationRequirement = {
        requiredGroups: ['admin'],
      };

      const authorizer = customAuthorizer.createAuthorizer(requirement);

      await authorizer(mockRequest as any, mockResponse as any, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockLogWriter.info).toHaveBeenCalledWith(
        'Access granted: User has required claim values. User values: [admin, editor], Required: [admin]',
      );
    });

    it('should try claim names in order and use the first valid one', async () => {
      const orderedAuthorizer = new GroupBasedAuthorizer({
        jwtAuthorization: mockJwtAuthorization,
        logWriter: mockLogWriter,
        groupClaimNames: ['primary:groups', 'secondary:groups', 'fallback:groups'],
      });

      const mockPayload = {
        sub: 'user123',
        'primary:groups': null, // Not an array
        'secondary:groups': ['admin'], // This should be used
        'fallback:groups': ['fallback-admin'], // This should be ignored
      };
      mockRequest.headers = { authorization: 'Bearer valid-token' };
      mockJwtAuthorization.getVerifiedToken.mockResolvedValue(mockPayload);

      const requirement: AuthorizationRequirement = {
        requiredGroups: ['admin'],
      };

      const authorizer = orderedAuthorizer.createAuthorizer(requirement);

      await authorizer(mockRequest as any, mockResponse as any, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockLogWriter.info).toHaveBeenCalledWith(
        'Access granted: User has required claim values. User values: [admin], Required: [admin]',
      );
    });

    it('should handle claims with namespaced names (e.g., Auth0 style)', async () => {
      const namespacedAuthorizer = new GroupBasedAuthorizer({
        jwtAuthorization: mockJwtAuthorization,
        logWriter: mockLogWriter,
        groupClaimNames: ['https://example.com/groups'],
      });

      const mockPayload = {
        sub: 'user123',
        'https://example.com/groups': ['user', 'admin'],
      };
      mockRequest.headers = { authorization: 'Bearer valid-token' };
      mockJwtAuthorization.getVerifiedToken.mockResolvedValue(mockPayload);

      const requirement: AuthorizationRequirement = {
        requiredGroups: ['admin'],
      };

      const authorizer = namespacedAuthorizer.createAuthorizer(requirement);

      await authorizer(mockRequest as any, mockResponse as any, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should return empty array when no configured claims are found', async () => {
      const customAuthorizer = new GroupBasedAuthorizer({
        jwtAuthorization: mockJwtAuthorization,
        logWriter: mockLogWriter,
        groupClaimNames: ['roles', 'permissions'],
      });

      const mockPayload = {
        sub: 'user123',
        // No 'roles' or 'permissions' claims
        someOtherClaim: ['value'],
      };
      mockRequest.headers = { authorization: 'Bearer valid-token' };
      mockJwtAuthorization.getVerifiedToken.mockResolvedValue(mockPayload);

      const requirement: AuthorizationRequirement = {
        requiredGroups: ['admin'],
      };

      const authorizer = customAuthorizer.createAuthorizer(requirement);

      await authorizer(mockRequest as any, mockResponse as any, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockNext).not.toHaveBeenCalled();
      expect(mockLogWriter.warn).toHaveBeenCalledWith(
        'Access denied: User claim values [] do not contain any required values [admin]',
      );
    });
  });
});
