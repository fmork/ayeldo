import type { Request, Response } from 'express';
import type { ILogWriter } from '../logging/ILogWriter';
import type { AuthorizationRequirement } from './AuthorizationTypes';
import { ClaimBasedAuthorizer } from './ClaimBasedAuthorizer';
import type { JwtAuthorization } from './JwtAuthorization';

describe('ClaimBasedAuthorizer', () => {
  let mockJwtAuthorization: jest.Mocked<JwtAuthorization>;
  let mockLogWriter: jest.Mocked<ILogWriter>;
  let claimBasedAuthorizer: ClaimBasedAuthorizer;
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

    claimBasedAuthorizer = new ClaimBasedAuthorizer({
      jwtAuthorization: mockJwtAuthorization,
      logWriter: mockLogWriter,
      claimNames: ['cognito:groups', 'groups', 'roles'], // Default test configuration
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

  describe('constructor', () => {
    it('should throw error when no claim names provided', () => {
      expect(() => {
        new ClaimBasedAuthorizer({
          jwtAuthorization: mockJwtAuthorization,
          logWriter: mockLogWriter,
          claimNames: [],
        });
      }).toThrow('At least one claim name must be specified');
    });

    it('should throw error when claimNames is undefined', () => {
      expect(() => {
        new ClaimBasedAuthorizer({
          jwtAuthorization: mockJwtAuthorization,
          logWriter: mockLogWriter,
          claimNames: undefined as any,
        });
      }).toThrow('At least one claim name must be specified');
    });
  });

  describe('createAuthorizer', () => {
    it('should return 401 when authorization header is missing', async () => {
      const authorizer = claimBasedAuthorizer.createAuthorizer();

      await authorizer(mockRequest as any, mockResponse as any, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Authorization token is missing',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 when bearer token is missing', async () => {
      mockRequest.headers = { authorization: 'InvalidHeader' };

      const authorizer = claimBasedAuthorizer.createAuthorizer();

      await authorizer(mockRequest as any, mockResponse as any, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Bearer token is missing',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 when JWT token is invalid', async () => {
      mockRequest.headers = { authorization: 'Bearer invalidtoken' };
      mockJwtAuthorization.getVerifiedToken.mockRejectedValue(new Error('Invalid token'));

      const authorizer = claimBasedAuthorizer.createAuthorizer();

      await authorizer(mockRequest as any, mockResponse as any, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Invalid or expired token',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should proceed when no authorization requirement is specified', async () => {
      mockRequest.headers = { authorization: 'Bearer validtoken' };
      const mockPayload = { sub: 'user123' };
      mockJwtAuthorization.getVerifiedToken.mockResolvedValue(mockPayload);

      const authorizer = claimBasedAuthorizer.createAuthorizer();

      await authorizer(mockRequest as any, mockResponse as any, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect((mockRequest as any).user).toBe(mockPayload);
    });

    describe('Array Claims', () => {
      it('should allow access when user has required array claim value', async () => {
        mockRequest.headers = { authorization: 'Bearer validtoken' };
        const mockPayload = {
          sub: 'user123',
          'cognito:groups': ['admin', 'user'],
        };
        mockJwtAuthorization.getVerifiedToken.mockResolvedValue(mockPayload);

        const requirement: AuthorizationRequirement = {
          requiredValues: ['admin'],
        };
        const authorizer = claimBasedAuthorizer.createAuthorizer(requirement);

        await authorizer(mockRequest as any, mockResponse as any, mockNext);

        expect(mockNext).toHaveBeenCalled();
        expect(mockLogWriter.info).toHaveBeenCalledWith(
          expect.stringContaining('Access granted: User has required claim values'),
        );
      });

      it('should deny access when user does not have required array claim value', async () => {
        mockRequest.headers = { authorization: 'Bearer validtoken' };
        const mockPayload = {
          sub: 'user123',
          'cognito:groups': ['user'],
        };
        mockJwtAuthorization.getVerifiedToken.mockResolvedValue(mockPayload);

        const requirement: AuthorizationRequirement = {
          requiredValues: ['admin'],
        };
        const authorizer = claimBasedAuthorizer.createAuthorizer(requirement);

        await authorizer(mockRequest as any, mockResponse as any, mockNext);

        expect(mockResponse.status).toHaveBeenCalledWith(403);
        expect(mockResponse.json).toHaveBeenCalledWith({
          message: 'Insufficient permissions - required claim values not found',
          requiredValues: ['admin'],
        });
        expect(mockNext).not.toHaveBeenCalled();
      });
    });

    describe('String Claims', () => {
      it('should allow access when user has required string claim value', async () => {
        mockRequest.headers = { authorization: 'Bearer validtoken' };
        const mockPayload = {
          sub: 'user123',
          roles: 'admin', // Single string value
        };
        mockJwtAuthorization.getVerifiedToken.mockResolvedValue(mockPayload);

        const requirement: AuthorizationRequirement = {
          requiredValues: ['admin'],
        };
        const authorizer = claimBasedAuthorizer.createAuthorizer(requirement);

        await authorizer(mockRequest as any, mockResponse as any, mockNext);

        expect(mockNext).toHaveBeenCalled();
        expect(mockLogWriter.info).toHaveBeenCalledWith(
          expect.stringContaining('Access granted: User has required claim values'),
        );
      });

      it('should deny access when user does not have required string claim value', async () => {
        mockRequest.headers = { authorization: 'Bearer validtoken' };
        const mockPayload = {
          sub: 'user123',
          roles: 'user', // Different string value
        };
        mockJwtAuthorization.getVerifiedToken.mockResolvedValue(mockPayload);

        const requirement: AuthorizationRequirement = {
          requiredValues: ['admin'],
        };
        const authorizer = claimBasedAuthorizer.createAuthorizer(requirement);

        await authorizer(mockRequest as any, mockResponse as any, mockNext);

        expect(mockResponse.status).toHaveBeenCalledWith(403);
        expect(mockResponse.json).toHaveBeenCalledWith({
          message: 'Insufficient permissions - required claim values not found',
          requiredValues: ['admin'],
        });
        expect(mockNext).not.toHaveBeenCalled();
      });
    });

    describe('Multiple Claim Names Priority', () => {
      it('should use first available claim name (Cognito groups)', async () => {
        mockRequest.headers = { authorization: 'Bearer validtoken' };
        const mockPayload = {
          sub: 'user123',
          'cognito:groups': ['admin'],
          groups: ['user'], // This should be ignored as cognito:groups comes first
          roles: 'superuser',
        };
        mockJwtAuthorization.getVerifiedToken.mockResolvedValue(mockPayload);

        const requirement: AuthorizationRequirement = {
          requiredValues: ['admin'],
        };
        const authorizer = claimBasedAuthorizer.createAuthorizer(requirement);

        await authorizer(mockRequest as any, mockResponse as any, mockNext);

        expect(mockNext).toHaveBeenCalled();
      });

      it('should fallback to second claim name when first is not available', async () => {
        mockRequest.headers = { authorization: 'Bearer validtoken' };
        const mockPayload = {
          sub: 'user123',
          groups: ['admin'], // cognito:groups not present, so this should be used
          roles: 'superuser',
        };
        mockJwtAuthorization.getVerifiedToken.mockResolvedValue(mockPayload);

        const requirement: AuthorizationRequirement = {
          requiredValues: ['admin'],
        };
        const authorizer = claimBasedAuthorizer.createAuthorizer(requirement);

        await authorizer(mockRequest as any, mockResponse as any, mockNext);

        expect(mockNext).toHaveBeenCalled();
      });

      it('should fallback to third claim name when first two are not available', async () => {
        mockRequest.headers = { authorization: 'Bearer validtoken' };
        const mockPayload = {
          sub: 'user123',
          roles: 'admin', // Only roles claim present
        };
        mockJwtAuthorization.getVerifiedToken.mockResolvedValue(mockPayload);

        const requirement: AuthorizationRequirement = {
          requiredValues: ['admin'],
        };
        const authorizer = claimBasedAuthorizer.createAuthorizer(requirement);

        await authorizer(mockRequest as any, mockResponse as any, mockNext);

        expect(mockNext).toHaveBeenCalled();
      });
    });

    describe('Edge Cases', () => {
      it('should handle empty JWT payload gracefully', async () => {
        mockRequest.headers = { authorization: 'Bearer validtoken' };
        const mockPayload = {} as any; // Empty object instead of null
        mockJwtAuthorization.getVerifiedToken.mockResolvedValue(mockPayload);

        const requirement: AuthorizationRequirement = {
          requiredValues: ['admin'],
        };
        const authorizer = claimBasedAuthorizer.createAuthorizer(requirement);

        await authorizer(mockRequest as any, mockResponse as any, mockNext);

        expect(mockResponse.status).toHaveBeenCalledWith(403);
        expect(mockResponse.json).toHaveBeenCalledWith({
          message: 'Insufficient permissions - required claim values not found',
          requiredValues: ['admin'],
        });
      });

      it('should handle non-string array elements gracefully', async () => {
        mockRequest.headers = { authorization: 'Bearer validtoken' };
        const mockPayload = {
          sub: 'user123',
          'cognito:groups': ['admin', 123, null, 'user'], // Mixed types
        };
        mockJwtAuthorization.getVerifiedToken.mockResolvedValue(mockPayload);

        const requirement: AuthorizationRequirement = {
          requiredValues: ['admin'],
        };
        const authorizer = claimBasedAuthorizer.createAuthorizer(requirement);

        await authorizer(mockRequest as any, mockResponse as any, mockNext);

        expect(mockNext).toHaveBeenCalled(); // Should still work with string values
      });

      it('should handle non-string claim values gracefully', async () => {
        mockRequest.headers = { authorization: 'Bearer validtoken' };
        const mockPayload = {
          sub: 'user123',
          'cognito:groups': 123, // Not a string or array
          groups: null,
          roles: { invalid: 'object' },
        };
        mockJwtAuthorization.getVerifiedToken.mockResolvedValue(mockPayload);

        const requirement: AuthorizationRequirement = {
          requiredValues: ['admin'],
        };
        const authorizer = claimBasedAuthorizer.createAuthorizer(requirement);

        await authorizer(mockRequest as any, mockResponse as any, mockNext);

        expect(mockResponse.status).toHaveBeenCalledWith(403);
      });
    });

    describe('Backward Compatibility', () => {
      it('should work with requiredGroups property (deprecated)', async () => {
        mockRequest.headers = { authorization: 'Bearer validtoken' };
        const mockPayload = {
          sub: 'user123',
          'cognito:groups': ['admin', 'user'],
        };
        mockJwtAuthorization.getVerifiedToken.mockResolvedValue(mockPayload);

        const requirement: AuthorizationRequirement = {
          requiredGroups: ['admin'],
        };
        const authorizer = claimBasedAuthorizer.createAuthorizer(requirement);

        await authorizer(mockRequest as any, mockResponse as any, mockNext);

        expect(mockNext).toHaveBeenCalled();
        expect(mockLogWriter.info).toHaveBeenCalledWith(
          expect.stringContaining('Access granted: User has required claim values'),
        );
      });

      it('should prefer requiredValues over requiredGroups when both are present', async () => {
        mockRequest.headers = { authorization: 'Bearer validtoken' };
        const mockPayload = {
          sub: 'user123',
          'cognito:groups': ['admin', 'user'],
        };
        mockJwtAuthorization.getVerifiedToken.mockResolvedValue(mockPayload);

        const requirement: AuthorizationRequirement = {
          requiredValues: ['admin'],
          requiredGroups: ['different-group'], // This should be ignored
        };
        const authorizer = claimBasedAuthorizer.createAuthorizer(requirement);

        await authorizer(mockRequest as any, mockResponse as any, mockNext);

        expect(mockNext).toHaveBeenCalled();
      });
    });
  });

  describe('authorizeToken', () => {
    it('should return error when token is empty', async () => {
      const result = await claimBasedAuthorizer.authorizeToken('');

      expect(result.success).toBe(false);
      expect(result.error).toEqual({
        status: 401,
        message: 'Authorization token is missing',
      });
    });

    it('should return error when JWT token is invalid', async () => {
      mockJwtAuthorization.getVerifiedToken.mockRejectedValue(new Error('Invalid token'));

      const result = await claimBasedAuthorizer.authorizeToken('invalidtoken');

      expect(result.success).toBe(false);
      expect(result.error).toEqual({
        status: 401,
        message: 'Invalid or expired token',
      });
    });

    it('should return success when token is valid and no requirements', async () => {
      const mockPayload = { sub: '123', 'cognito:groups': ['user'] };
      mockJwtAuthorization.getVerifiedToken.mockResolvedValue(mockPayload);

      const result = await claimBasedAuthorizer.authorizeToken('validtoken');

      expect(result.success).toBe(true);
      expect(result.user).toEqual(mockPayload);
    });

    it('should return success when token is valid and user has required groups', async () => {
      const mockPayload = { sub: '123', 'cognito:groups': ['admin', 'user'] };
      mockJwtAuthorization.getVerifiedToken.mockResolvedValue(mockPayload);

      const requirement = { requiredGroups: ['admin'] };
      const result = await claimBasedAuthorizer.authorizeToken('validtoken', requirement);

      expect(result.success).toBe(true);
      expect(result.user).toEqual(mockPayload);
    });

    it('should return error when user does not have required groups', async () => {
      const mockPayload = { sub: '123', 'cognito:groups': ['user'] };
      mockJwtAuthorization.getVerifiedToken.mockResolvedValue(mockPayload);

      const requirement = { requiredGroups: ['admin'] };
      const result = await claimBasedAuthorizer.authorizeToken('validtoken', requirement);

      expect(result.success).toBe(false);
      expect(result.error).toEqual({
        status: 403,
        message: 'Insufficient permissions - required claim values not found',
      });
    });

    it('should work with string claims', async () => {
      const mockPayload = { sub: '123', role: 'admin' };
      mockJwtAuthorization.getVerifiedToken.mockResolvedValue(mockPayload);

      // Create authorizer with different claim names that includes 'role'
      const authorizer = new ClaimBasedAuthorizer({
        jwtAuthorization: mockJwtAuthorization,
        logWriter: mockLogWriter,
        claimNames: ['role', 'groups'],
      });

      const requirement = { requiredValues: ['admin'] };
      const result = await authorizer.authorizeToken('validtoken', requirement);

      expect(result.success).toBe(true);
      expect(result.user).toEqual(mockPayload);
    });

    it('should work with array claims and check multiple required values', async () => {
      const mockPayload = { sub: '123', groups: ['user', 'editor'] };
      mockJwtAuthorization.getVerifiedToken.mockResolvedValue(mockPayload);

      const requirement = { requiredValues: ['admin', 'editor'] };
      const result = await claimBasedAuthorizer.authorizeToken('validtoken', requirement);

      expect(result.success).toBe(true);
      expect(result.user).toEqual(mockPayload);
    });

    it('should prefer first matching claim name', async () => {
      const mockPayload = {
        sub: '123',
        'cognito:groups': ['admin'],
        groups: ['user'], // Should not use this one
      };
      mockJwtAuthorization.getVerifiedToken.mockResolvedValue(mockPayload);

      const requirement = { requiredValues: ['admin'] };
      const result = await claimBasedAuthorizer.authorizeToken('validtoken', requirement);

      expect(result.success).toBe(true);
      expect(result.user).toEqual(mockPayload);
    });
  });
});
