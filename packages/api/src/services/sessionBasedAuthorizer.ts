import type {
  AuthorizationRequirement,
  ClaimBasedAuthorizer,
  HttpMiddleware,
  ILogWriter,
} from '@fmork/backend-core';
import { COOKIE_NAMES } from '../constants';
import type { SessionService } from '../services/sessionService';

interface SessionBasedAuthorizerProps {
  readonly sessionService: SessionService;
  readonly logWriter: ILogWriter;
  readonly claimBasedAuthorizer: ClaimBasedAuthorizer;
}

/**
 * Session-based authorizer that extracts JWT access tokens from sessions
 * and uses ClaimBasedAuthorizer.authorizeToken for proper JWT validation.
 */
export class SessionBasedAuthorizer {
  private readonly sessionService: SessionService;
  private readonly logWriter: ILogWriter;
  private readonly claimBasedAuthorizer: ClaimBasedAuthorizer;

  public constructor(props: SessionBasedAuthorizerProps) {
    this.sessionService = props.sessionService;
    this.logWriter = props.logWriter;
    this.claimBasedAuthorizer = props.claimBasedAuthorizer;
  }

  public createAuthorizer(requirement?: AuthorizationRequirement): HttpMiddleware {
    return async (req: unknown, res: unknown, next: unknown): Promise<void> => {
      try {
        const request = req as {
          cookies?: Record<string, string>;
        };
        const response = res as { status: (code: number) => { json: (data: unknown) => void } };
        const nextFn = next as () => void;

        // Extract session ID from cookies
        const sessionId =
          request.cookies?.[COOKIE_NAMES.SESSION_ID_ALT] || request.cookies?.[COOKIE_NAMES.SID_ALT];

        if (!sessionId) {
          this.logWriter.warn('No session ID found in request');
          response.status(401).json({ error: 'Authentication required' });
          return;
        }

        // Get JWT access token from session
        const accessToken = await this.sessionService.getOidcAccessToken(sessionId);

        if (!accessToken) {
          this.logWriter.warn(`No valid access token found for session: ${sessionId}`);
          response.status(401).json({ error: 'Invalid or expired session' });
          return;
        }

        // Use ClaimBasedAuthorizer.authorizeToken for JWT validation and claim checking
        const authResult = await this.claimBasedAuthorizer.authorizeToken(accessToken, requirement);

        if (!authResult.success) {
          const statusCode = authResult.error?.status || 403;
          const message = authResult.error?.message || 'Authorization failed';

          this.logWriter.warn(`Authorization failed for session ${sessionId}: ${message}`);
          response.status(statusCode).json({ error: message });
          return;
        }

        // Store user info in request for potential use by handlers
        if (authResult.user) {
          (req as { user?: unknown }).user = authResult.user;
        }

        nextFn();
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        this.logWriter.error('Authorization middleware error', err);
        const response = res as { status: (code: number) => { json: (data: unknown) => void } };
        response.status(500).json({ error: 'Authorization error' });
      }
    };
  }
}
