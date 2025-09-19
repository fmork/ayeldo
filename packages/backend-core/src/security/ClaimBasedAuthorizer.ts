import type { HttpMiddleware, HttpRequest, HttpResponse } from '../controllers/http';
import type { ILogWriter } from '../logging/ILogWriter';
import type { AuthorizationRequirement } from './AuthorizationTypes';
import type { JwtAuthorization } from './JwtAuthorization';

export interface AuthorizationResult {
  success: boolean;
  user?: unknown;
  error?: {
    status: number;
    message: string;
  };
}

interface ClaimBasedAuthorizerProps {
  jwtAuthorization: JwtAuthorization;
  logWriter: ILogWriter;
  /**
   * JWT claim properties that contain authorization values, in order of preference.
   * The first claim found with a valid value (string or array) will be used.
   *
   * Examples:
   * - For AWS Cognito groups: ['cognito:groups', 'groups']
   * - For Azure AD groups: ['groups']
   * - For Auth0 roles: ['https://example.com/roles', 'roles']
   * - For custom claims: ['roles', 'permissions', 'scopes']
   */
  claimNames: string[];
}

/**
 * Generic claim-based authorizer that validates JWT tokens and checks for required values
 * in configurable JWT claims. This authorizer is provider-agnostic and can work with
 * various JWT token formats by specifying the appropriate claim names.
 *
 * Supports both string and array claim values:
 * - String claims: "admin" - checks if required value equals the claim value
 * - Array claims: ["admin", "user"] - checks if required value is in the array
 */
export class ClaimBasedAuthorizer {
  constructor(private readonly props: ClaimBasedAuthorizerProps) {
    if (!props.claimNames || props.claimNames.length === 0) {
      throw new Error('At least one claim name must be specified');
    }
  }

  /**
   * Authorizes a token directly without Express middleware
   * Returns an authorization result that can be handled by the caller
   */
  public authorizeToken = async (
    token: string,
    requirement?: AuthorizationRequirement,
  ): Promise<AuthorizationResult> => {
    try {
      if (!token) {
        this.props.logWriter.warn('Token is missing');
        return {
          success: false,
          error: {
            status: 401,
            message: 'Authorization token is missing',
          },
        };
      }

      // Verify the JWT token
      const verified = await this.props.jwtAuthorization.getVerifiedToken(token);

      // Check claim requirements if specified
      const requiredValues = requirement?.requiredValues || requirement?.requiredGroups;
      if (requiredValues && requiredValues.length > 0) {
        const userClaimValues = this.extractClaimValues(verified as Record<string, unknown>);
        const hasRequiredValue = requiredValues.some((requiredValue) =>
          userClaimValues.includes(requiredValue),
        );

        if (!hasRequiredValue) {
          this.props.logWriter.warn(
            `Access denied: User claim values [${userClaimValues.join(
              ', ',
            )}] do not contain any required values [${requiredValues.join(', ')}]`,
          );
          return {
            success: false,
            error: {
              status: 403,
              message: 'Insufficient permissions - required claim values not found',
            },
          };
        }

        this.props.logWriter.info(
          `Access granted: User has required claim values. User values: [${userClaimValues.join(
            ', ',
          )}], Required: [${requiredValues.join(', ')}]`,
        );
      }

      return {
        success: true,
        user: verified as unknown,
      };
    } catch (error) {
      const _error = error as Error;
      this.props.logWriter.error(`Authorization error: ${_error.message}`, _error);
      return {
        success: false,
        error: {
          status: 401,
          message: 'Invalid or expired token',
        },
      };
    }
  };

  /**
   * Creates an authorization middleware that validates the token and checks for required claim values
   */
  public createAuthorizer = (requirement?: AuthorizationRequirement): HttpMiddleware => {
    return async (req: HttpRequest, res: HttpResponse, next: () => void): Promise<void> => {
      const authHeader = (req.headers as Record<string, string | undefined>)['authorization'];
      if (!authHeader) {
        this.props.logWriter.warn('Authorization header missing');
        res.status(401).json({ message: 'Authorization token is missing' });
        return;
      }

      const token = authHeader.split(' ')[1];
      if (!token) {
        this.props.logWriter.warn('Bearer token missing from authorization header');
        res.status(401).json({ message: 'Bearer token is missing' });
        return;
      }

      // Use the new token-based authorization method
      const result = await this.authorizeToken(token, requirement);

      if (!result.success) {
        const error = result.error ?? { status: 401, message: 'Unauthorized' };
        res.status(error.status).json({
          message: error.message,
          ...(requirement && {
            requiredValues: requirement.requiredValues || requirement.requiredGroups,
          }),
        });
        return;
      }

      // Attach user info to request
      (req as unknown as Record<string, unknown>)['user'] = result.user as unknown;
      next();
    };
  };

  /**
   * Extract claim values from JWT payload using the configured claim names
   * Checks each configured claim name in order until a valid value is found
   * Supports both string and array claim values
   */
  private extractClaimValues = (jwtPayload: Record<string, unknown> | undefined): string[] => {
    if (!jwtPayload) {
      return [];
    }

    // Try each configured claim name in order
    for (const claimName of this.props.claimNames) {
      const claimValue = jwtPayload[claimName] as unknown;

      // Handle array claims (e.g., groups: ["admin", "user"])
      if (Array.isArray(claimValue)) {
        return claimValue.filter((value) => typeof value === 'string');
      }

      // Handle string claims (e.g., role: "admin")
      if (typeof claimValue === 'string') {
        return [claimValue];
      }
    }

    // No valid claims found
    return [];
  };
}
