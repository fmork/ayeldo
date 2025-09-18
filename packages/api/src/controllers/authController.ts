/* eslint-disable @typescript-eslint/no-explicit-any */
import type { SiteConfiguration } from '@ayeldo/core';
import { tenantCreateSchema } from '@ayeldo/types/src/schemas';
import type { HttpRouter, ILogWriter } from '@fmork/backend-core';
import { PublicController } from '@fmork/backend-core';
import { COOKIE_NAMES } from '../constants';
import { requireCsrfForController } from '../middleware/csrfGuard';
import type { AuthFlowService } from '../services/authFlowService';
import type { OnboardingService } from '../services/onboardingService';

export interface AuthControllerProps {
  readonly baseUrl: string;
  readonly logWriter: ILogWriter;
  readonly authFlow: AuthFlowService;
  readonly siteConfig: SiteConfiguration;
  readonly onboardingService?: OnboardingService;
}

export class AuthController extends PublicController {
  private readonly authFlow: AuthFlowService;
  private readonly siteConfig: SiteConfiguration;
  private readonly onboardingService?: OnboardingService | undefined;

  public constructor(props: AuthControllerProps) {
    super(props.baseUrl, props.logWriter);
    this.authFlow = props.authFlow;
    this.siteConfig = props.siteConfig;
    this.onboardingService = props.onboardingService;
  }

  public initialize(): HttpRouter {
    // GET /authorize-url — returns the OIDC authorize URL for SPA-driven redirects
    this.addGet('/authorize-url', async (req, res) => {
      await this.performRequest(
        () => this.authFlow.buildAuthorizeUrl((req as any).query?.redirect as string | undefined),
        res,
      );
    });

    // GET /login?redirect=...
    this.addGet('/login', async (_req, res) => {
      await this.performRequest(
        async () => {
          const url = this.authFlow.buildLoginRedirectUrl();
          (res as any).setHeader?.('Location', url)?.end?.();
          return { redirected: true } as const;
        },
        res,
        () => 302,
      );
    });

    // GET /callback?code&state[&redirect]
    this.addGet('/callback', async (req, res) => {
      await this.performRequest(
        async () => {
          const result = await this.authFlow.handleCallback((req as any).query);

          // Cookies are always set to be cross-site friendly. The backend
          // never runs locally, so session cookies must be Secure and use
          // SameSite=None to allow cross-origin XHR when used with
          // credentials: 'include'. We also use the __Host- prefix.
          (res as any).cookie?.(COOKIE_NAMES.SESSION_ID, result.sid, {
            httpOnly: true,
            secure: true,
            sameSite: 'none',
            path: '/',
          });
          (res as any).cookie?.(COOKIE_NAMES.CSRF, result.csrf, {
            httpOnly: false,
            secure: true,
            sameSite: 'none',
            path: '/',
            ...(this.siteConfig.cookieDomain && { domain: this.siteConfig.cookieDomain }),
          });

          (res as any).setHeader?.('Location', result.redirectTarget);
          return { redirected: true } as const;
        },
        res,
        () => 302,
      );
    });

    // POST /logout
    this.addPost(
      '/logout',
      requireCsrfForController(async (req, res) => {
        await this.performRequest(
          async () => {
            const sid = (req as any).cookies?.[COOKIE_NAMES.SESSION_ID] as string | undefined;
            (res as any).clearCookie?.(COOKIE_NAMES.SESSION_ID);
            (res as any).clearCookie?.(COOKIE_NAMES.CSRF);

            await this.authFlow.logout(sid);

            return { loggedOut: true } as const;
          },
          res as unknown as Parameters<typeof this.performRequest>[1],
          () => 204,
        );
      }),
    );

    // POST /onboard - OIDC-authenticated tenant onboarding
    this.addPost(
      '/onboard',
      requireCsrfForController(async (req, res) => {
        const response = res as unknown as Parameters<typeof this.performRequest>[1];

        if (!this.onboardingService) {
          // Service not configured — return 501
          response.status?.(501)?.json?.({ error: 'Onboarding not configured' });
          return;
        }

        await this.performRequest(
          async () => {
            // Service existence already checked above
            const onboardingService = this.onboardingService as OnboardingService;

            // 1. Validate input with zod
            const validatedBody = tenantCreateSchema.parse((req as any).body);

            // 2. Extract OIDC identity from session
            const sid = (req as any).cookies?.[COOKIE_NAMES.SESSION_ID] as string | undefined;
            const sessionInfo = await this.authFlow.sessionInfo(sid);

            if (!sessionInfo.loggedIn) {
              throw new Error('Authentication required for onboarding');
            }

            if (!sessionInfo.email) {
              throw new Error('User email required for onboarding');
            }

            const oidcIdentity = {
              sub: sessionInfo.sub,
              email: sessionInfo.email,
              ...(sessionInfo.name && { name: sessionInfo.name }),
            };

            // 3. Call OnboardingService with validated body and OIDC identity
            const result = await onboardingService.createTenant(validatedBody, oidcIdentity);

            // 4. On success, set session cookie and CSRF cookie if returned
            if (result.session) {
              response.cookie?.(COOKIE_NAMES.SESSION_ID, result.session.sid, {
                httpOnly: true,
                secure: true,
                sameSite: 'none',
                path: '/',
              });
              response.cookie?.(COOKIE_NAMES.CSRF, result.session.csrf, {
                httpOnly: false,
                secure: true,
                sameSite: 'none',
                path: '/',
                ...(this.siteConfig.cookieDomain && { domain: this.siteConfig.cookieDomain }),
              });
            }

            return {
              tenant: result.tenant,
              adminUser: result.adminUser,
            };
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
