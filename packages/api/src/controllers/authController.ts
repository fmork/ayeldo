/* eslint-disable @typescript-eslint/no-explicit-any */
import type { HttpRouter, ILogWriter } from '@fmork/backend-core';
import { PublicController } from '@fmork/backend-core';
import { requireCsrfForController } from '../middleware/csrfGuard';
import { AuthFlowService } from '../services/authFlowService';
import type { OidcClientOpenId } from '../services/oidcOpenIdClient';
import type { OnboardingService } from '../services/onboardingService';
import type { SessionService } from '../services/sessionService';

export interface AuthControllerProps {
  readonly baseUrl: string;
  readonly logWriter: ILogWriter;
  readonly oidc: OidcClientOpenId;
  readonly sessions: SessionService;
  readonly onboardingService?: OnboardingService;
}

export class AuthController extends PublicController {
  private readonly authFlow: AuthFlowService;
  private readonly onboardingService?: OnboardingService | undefined;

  public constructor(props: AuthControllerProps) {
    super(props.baseUrl, props.logWriter);
    // Backend always runs in production-like environments; no dev flags.
    this.authFlow = new AuthFlowService({
      oidc: props.oidc,
      sessions: props.sessions,
      logger: props.logWriter,
    });
    this.onboardingService = props.onboardingService;
  }

  public initialize(): HttpRouter {
    // GET /auth/authorize-url — returns the OIDC authorize URL for SPA-driven redirects
    this.addGet('/auth/authorize-url', async (req, res) => {
      await this.performRequest(
        () => this.authFlow.buildAuthorizeUrl((req as any).query?.redirect as string | undefined),
        res,
      );
    });

    // GET /auth/login?redirect=...
    this.addGet('/auth/login', async (_req, res) => {
      await this.performRequest(
        async () => {
          const url = this.authFlow.buildLoginRedirectUrl();
          (res as any).redirect?.(url) ??
            (res as any).status(302)?.setHeader?.('Location', url)?.end?.();
          return { redirected: true } as const;
        },
        res,
        () => 302,
      );
    });

    // GET /auth/callback?code&state[&redirect]
    this.addGet('/auth/callback', async (req, res) => {
      await this.performRequest(
        async () => {
          const result = await this.authFlow.handleCallback((req as any).query);

          // Cookies are always set to be cross-site friendly. The backend
          // never runs locally, so session cookies must be Secure and use
          // SameSite=None to allow cross-origin XHR when used with
          // credentials: 'include'. We also use the __Host- prefix.
          (res as any).cookie?.('__Host-sid', result.sid, {
            httpOnly: true,
            secure: true,
            sameSite: 'none',
            path: '/',
          });
          (res as any).cookie?.('csrf', result.csrf, {
            httpOnly: false,
            secure: true,
            sameSite: 'none',
            path: '/',
          });
          (res as any).redirect?.(result.redirectTarget) ??
            (res as any).status(302)?.setHeader?.('Location', result.redirectTarget)?.end?.();
          return { redirected: true } as const;
        },
        res,
        () => 302,
      );
    });

    // POST /auth/logout
    this.addPost(
      '/auth/logout',
      requireCsrfForController(async (req, res) => {
        await this.performRequest(
          async () => {
            const sid = (req as any).cookies?.['__Host-sid'] as string | undefined;
            await this.authFlow.logout(sid);
            (res as any).clearCookie?.('__Host-sid');
            (res as any).clearCookie?.('csrf');
            (res as any).status(204).end();
            return { loggedOut: true } as const;
          },
          res as unknown as Parameters<typeof this.performRequest>[1],
          () => 204,
        );
      }),
    );

    // GET /session — minimal profile state
    this.addGet('/session', async (req, res) => {
      await this.performRequest(
        () => {
          return this.authFlow.sessionInfo(
            (req as any).cookies?.['__Host-sid'] as string | undefined,
          );
        },
        res,
        (r) => (r.loggedIn ? 200 : 401),
      );
    });

    // POST /auth/signup - public signup creating tenant (and optionally admin user)
    this.addPost(
      '/auth/signup',
      requireCsrfForController(async (req, res) => {
        const response = res as unknown as Parameters<typeof this.performRequest>[1];

        if (!this.onboardingService) {
          // Service not configured — return 501
          response.status?.(501)?.json?.({ error: 'Onboarding not configured' });
          return;
        }

        const svc = this.onboardingService;

        await this.performRequest(
          async () => {
            const result = await svc.createTenantAndMaybeSignIn((req as any).body);

            // If onboarding returned session info, set cookies (not implemented)
            if (result.session) {
              response.cookie?.('__Host-sid', result.session.sid, {
                httpOnly: true,
                secure: true,
                sameSite: 'none',
                path: '/',
              });
              response.cookie?.('csrf', result.session.csrf, {
                httpOnly: false,
                secure: true,
                sameSite: 'none',
                path: '/',
              });
            }

            return result.tenant;
          },
          response,
          () => 201,
        );
      }),
    );

    return this.getRouter();
  }
}

// Export legacy name for compatibility
export const AuthBffController = AuthController as unknown as typeof AuthController;
