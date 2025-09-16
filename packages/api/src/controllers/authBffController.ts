/* eslint-disable @typescript-eslint/no-explicit-any */
import type { HttpRouter, ILogWriter } from '@fmork/backend-core';
import { PublicController } from '@fmork/backend-core';
import { AuthFlowService } from '../services/authFlowService';
import type { OidcClientOpenId } from '../services/oidcOpenIdClient';
import type { SessionService } from '../services/sessionService';

export interface AuthBffControllerProps {
  readonly baseUrl: string;
  readonly logWriter: ILogWriter;
  readonly oidc: OidcClientOpenId;
  readonly sessions: SessionService;
  readonly isDevelopment?: boolean;
}

export class AuthBffController extends PublicController {
  private readonly authFlow: AuthFlowService;
  private readonly isDevelopment: boolean;

  public constructor(props: AuthBffControllerProps) {
    super(props.baseUrl, props.logWriter);
    this.isDevelopment = props.isDevelopment ?? false;
    this.authFlow = new AuthFlowService({
      oidc: props.oidc,
      sessions: props.sessions,
      logger: props.logWriter,
    });
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

          // Development-friendly cookie settings
          const isSecure = !this.isDevelopment;
          const sidCookieName = this.isDevelopment ? 'sid' : '__Host-sid';

          (res as any).cookie?.(sidCookieName, result.sid, {
            httpOnly: true,
            secure: isSecure,
            sameSite: 'lax',
            path: '/',
          });
          (res as any).cookie?.('csrf', result.csrf, {
            httpOnly: false,
            secure: isSecure,
            sameSite: 'lax',
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
    this.addPost('/auth/logout', async (req, res) => {
      await this.performRequest(
        async () => {
          const sidCookieName = this.isDevelopment ? 'sid' : '__Host-sid';
          const sid = (req as any).cookies?.[sidCookieName] as string | undefined;
          await this.authFlow.logout(sid);
          (res as any).clearCookie?.(sidCookieName);
          (res as any).clearCookie?.('csrf');
          (res as any).status(204).end();
          return { loggedOut: true } as const;
        },
        res,
        () => 204,
      );
    });

    // GET /session — minimal profile state
    this.addGet('/session', async (req, res) => {
      await this.performRequest(
        () => {
          const sidCookieName = this.isDevelopment ? 'sid' : '__Host-sid';
          return this.authFlow.sessionInfo(
            (req as any).cookies?.[sidCookieName] as string | undefined,
          );
        },
        res,
        (r) => (r.loggedIn ? 200 : 401),
      );
    });

    return this.getRouter();
  }
}
