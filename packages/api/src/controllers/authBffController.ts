/* eslint-disable @typescript-eslint/no-explicit-any */
import type { HttpRouter, ILogWriter } from '@fmork/backend-core';
import { PublicController } from '@fmork/backend-core';
import { z } from 'zod';
import { base64url } from '../services/crypto';
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
  private readonly logWriter: ILogWriter;

  public constructor(props: AuthBffControllerProps) {
    super(props.baseUrl, props.logWriter);
    this.oidc = props.oidc;
    this.sessions = props.sessions;
    this.logWriter = props.logWriter;
  }

  public initialize(): HttpRouter {
    // GET /auth/authorize-url — returns the OIDC authorize URL for SPA-driven redirects
    this.addGet('/auth/authorize-url', async (req, res) => {
      await this.performRequest(
        async () => {
          const redirectTarget = (req as any).query?.redirect as string | undefined;
          this.logWriter.info(
            `Generating OIDC authorize URL with redirect='${redirectTarget ?? ''}'`,
          );
          const { state, nonce, codeChallenge } = this.sessions.createLoginState();
          // Encode optional redirect into state so it can be restored on callback
          const stateWithRedirect =
            typeof redirectTarget === 'string' && redirectTarget.length > 0
              ? `${state}.${base64url(Buffer.from(redirectTarget, 'utf8'))}`
              : state;
          const url = this.oidc.buildAuthorizeUrl({
            state: stateWithRedirect,
            nonce,
            codeChallenge,
          });
          this.logWriter.info(`OIDC authorize URL generated: ${url}`);

          (res as any).set?.('Cache-Control', 'no-store, no-cache, must-revalidate');
          return url;
        },
        res,
        () => 200,
      );
    });

    // GET /auth/login?redirect=...
    this.addGet('/auth/login', async (_req, res) => {
      const { state, nonce, codeChallenge } = this.sessions.createLoginState();
      const url = this.oidc.buildAuthorizeUrl({ state, nonce, codeChallenge });
      (res as any).redirect?.(url) ??
        (res as any).status(302)?.setHeader?.('Location', url)?.end?.();
    });

    // GET /auth/callback?code&state[&redirect]
    this.addGet('/auth/callback', async (req, res) => {
      await this.performRequest(
        async () => {
          const params = z
            .object({ code: z.string().min(1), state: z.string().min(1) })
            .parse((req as any).query);
          // Extract optional redirect encoded into state: format '<id>.<b64url(redirect)>'
          let redirectTarget = (req as any).query?.redirect as string | undefined;
          let stateId = params.state;
          const dotIdx = params.state.indexOf('.');
          if (dotIdx > 0) {
            stateId = params.state.substring(0, dotIdx);
            const enc = params.state.substring(dotIdx + 1);
            try {
              const decoded = Buffer.from(enc, 'base64url').toString('utf8');
              if (decoded.length > 0) redirectTarget = decoded;
            } catch {
              // ignore malformed state suffix
            }
          }
          const paramsForValidation = { code: params.code, state: stateId };
          this.logWriter.info(
            `Handling OIDC callback, state=${params.state}, parsedStateId=${stateId}, redirect=${redirectTarget ?? '/'} `,
          );
          const { sid, csrf } = await this.sessions.completeLogin(this.oidc, paramsForValidation);
          this.logWriter.info(`Login completed successfully, sid=${sid}, csrf=${csrf}`);
          // Set cookies
          (res as any).cookie?.('__Host-sid', sid, {
            httpOnly: true,
            secure: true,
            sameSite: 'lax',
            path: '/',
          });
          this.logWriter.info(`HttpOnly session cookie set: ${sid}`);

          (res as any).cookie?.('csrf', csrf, {
            httpOnly: false,
            secure: true,
            sameSite: 'lax',
            path: '/',
          });
          this.logWriter.info(`CSRF token cookie set: ${csrf}`);
          // Validate redirect target (allow only relative or whitelisted origins)
          let target = '/';
          if (redirectTarget && typeof redirectTarget === 'string') {
            // Only allow relative URLs or absolute URLs to known web origins
            if (redirectTarget.startsWith('/')) {
              target = redirectTarget;
            } else if (redirectTarget.startsWith('http')) {
              // Optionally: check against allowed origins here
              target = redirectTarget;
            } else {
              this.logWriter.warn(`Rejected unsafe redirect target: ${redirectTarget}`);
            }
          }
          this.logWriter.info(`Redirecting to '${target}'`);
          (res as any).setHeader?.('Location', target);
        },
        res,
        () => 302,
      );
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
