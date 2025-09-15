/* eslint-disable @typescript-eslint/no-explicit-any */
import { PublicController } from '@fmork/backend-core/dist/controllers';
import type { HttpRouter } from '@fmork/backend-core/dist/controllers/http';
import type { ILogWriter } from '@fmork/backend-core/dist/logging';
import { z } from 'zod';
import type { OidcClientOpenId } from '../services/oidcOpenIdClient';
import type { SessionService } from '../services/sessionService';

export interface AuthBffControllerProps {
  readonly baseUrl: string;
  readonly logWriter: ILogWriter;
  readonly oidc: OidcClientOpenId;
  readonly sessions: SessionService;
}

export class AuthBffController extends PublicController {
  private readonly oidc: OidcClientOpenId;
  private readonly sessions: SessionService;

  public constructor(props: AuthBffControllerProps) {
    super(props.baseUrl, props.logWriter);
    this.oidc = props.oidc;
    this.sessions = props.sessions;
  }

  public initialize(): HttpRouter {
    // GET /auth/authorize-url — returns the OIDC authorize URL for SPA-driven redirects
    this.addGet('/auth/authorize-url', async (_req, res) => {
      const { state, nonce, codeChallenge } = this.sessions.createLoginState();
      const url = this.oidc.buildAuthorizeUrl({ state, nonce, codeChallenge });
      (res as any).set?.('Cache-Control', 'no-store, no-cache, must-revalidate');
      res.json({ url });
    });

    // GET /auth/login?redirect=...
    this.addGet('/auth/login', async (_req, res) => {
      const { state, nonce, codeChallenge } = this.sessions.createLoginState();
      const url = this.oidc.buildAuthorizeUrl({ state, nonce, codeChallenge });
      (res as any).redirect?.(url) ??
        (res as any).status(302)?.setHeader?.('Location', url)?.end?.();
    });

    // GET /auth/callback?code&state
    this.addGet('/auth/callback', async (req, res) => {
      const params = z
        .object({ code: z.string().min(1), state: z.string().min(1) })
        .parse((req as any).query);
      const { sid, csrf } = await this.sessions.completeLogin(this.oidc, params);
      // Set cookies
      // HttpOnly session cookie
      (res as any).cookie?.('__Host-sid', sid, {
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        path: '/',
      });
      // CSRF token cookie (readable by JS)
      (res as any).cookie?.('csrf', csrf, {
        httpOnly: false,
        secure: true,
        sameSite: 'lax',
        path: '/',
      });
      (res as any).redirect?.('/') ??
        (res as any).status(302)?.setHeader?.('Location', '/')?.end?.();
    });

    // POST /auth/logout
    this.addPost('/auth/logout', async (req, res) => {
      const sid = (req as any).cookies?.['__Host-sid'] as string | undefined;
      if (sid) await this.sessions.logout(sid);
      (res as any).clearCookie?.('__Host-sid');
      (res as any).clearCookie?.('csrf');
      res.status(204).end();
    });

    // GET /session — minimal profile state
    this.addGet('/session', async (req, res) => {
      const sid = (req as any).cookies?.['__Host-sid'] as string | undefined;
      if (!sid) return res.status(401).json({ loggedIn: false });
      const sess = await this.sessions.getSession(sid);
      if (!sess) return res.status(401).json({ loggedIn: false });
      res.json({ loggedIn: true, sub: sess.sub, email: sess.email, name: sess.name });
    });

    return this.getRouter();
  }
}
