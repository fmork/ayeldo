import type { IUserRepo } from '@ayeldo/core/src/ports/userRepo';
import type { SessionInfo, SessionInfoLoggedIn, Uuid, UserDto } from '@ayeldo/types';
import type { ILogWriter } from '@fmork/backend-core';
import { z } from 'zod';
import { base64url } from './crypto';
import type { OidcClientOpenId } from './oidcOpenIdClient';
import type { SessionService } from './sessionService';

export interface AuthFlowServiceProps {
  readonly oidc: OidcClientOpenId;
  readonly sessions: SessionService;
  readonly userRepo: IUserRepo;
  readonly logger: ILogWriter;
}

export interface AuthorizeUrlResult {
  readonly url: string;
}

interface CallbackState {
  readonly stateId: string;
  readonly redirectTarget: string;
}

export interface CallbackResult {
  readonly sid: string;
  readonly csrf: string;
  readonly redirectTarget: string;
  readonly profile: {
    readonly sub: string;
    readonly email?: string;
    readonly name?: string;
    readonly fullName?: string;
  };
}

export class AuthFlowService {
  private readonly oidc: OidcClientOpenId;
  private readonly sessions: SessionService;
  private readonly userRepo: IUserRepo;
  private readonly logger: ILogWriter;

  public constructor(props: AuthFlowServiceProps) {
    this.oidc = props.oidc;
    this.sessions = props.sessions;
    this.userRepo = props.userRepo;
    this.logger = props.logger;
  }

  public buildAuthorizeUrl(rawRedirect?: string): AuthorizeUrlResult {
    const redirectTarget = this.decodeRedirect(rawRedirect);
    this.logger.info(`Generating OIDC authorize URL with redirect='${redirectTarget ?? ''}'`);
    const { state, nonce, codeChallenge } = this.sessions.createLoginState();
    const stateWithRedirect =
      typeof redirectTarget === 'string' && redirectTarget.length > 0
        ? `${state}.${base64url(Buffer.from(redirectTarget, 'utf8'))}`
        : state;
    const url = this.oidc.buildAuthorizeUrl({ state: stateWithRedirect, nonce, codeChallenge });
    this.logger.info(`OIDC authorize URL generated`);
    return { url } as const;
  }

  public buildLoginRedirectUrl(): string {
    const { state, nonce, codeChallenge } = this.sessions.createLoginState();
    return this.oidc.buildAuthorizeUrl({ state, nonce, codeChallenge });
  }

  public async handleCallback(query: unknown): Promise<CallbackResult> {
    const params = z
      .object({ code: z.string().min(1), state: z.string().min(1) })
      .parse((query as Record<string, unknown>) ?? {});

    const callbackState = this.getCallbackState(query, params);

    const paramsForValidation = { code: params.code, state: callbackState.stateId };
    const { sid, csrf, profile } = await this.sessions.completeLogin(
      this.oidc,
      paramsForValidation,
    );
    this.logger.info(`Login completed successfully, sid=${sid}`);

    // Ensure user object exists for OIDC identity
    let user = await this.userRepo.getUserByOidcSub(profile.sub);
    if (!user && profile.email) {
      user = await this.userRepo.getUserByEmail(profile.email);
      if (user) {
        // Update user with OIDC sub if missing
        if (!user.oidcSub) {
          // This assumes a method like updateUserSub exists; if not, you may need to implement it
          await this.userRepo.updateUserSub(user.id, profile.sub);
          this.logger.info(`Updated user ${user.id} with OIDC sub=${profile.sub}`);
          user = await this.userRepo.getUserByOidcSub(profile.sub);
        }
      }
    }
    if (!user) {
      user = await this.userRepo.createUser({
        email: profile.email ?? '',
        oidcSub: profile.sub,
        name: profile.name,
      });
      this.logger.info(`Created new user for OIDC sub=${profile.sub}`);
    } else {
      this.logger.debug(`User already exists for OIDC sub=${profile.sub}`);
    }

    const target = this.sanitizeRedirect(callbackState.redirectTarget);
    return { sid, csrf, redirectTarget: target, profile } as const;
  }

  private getCallbackState(query: unknown, params: { code: string; state: string }): CallbackState {
    let redirectTarget = (query as Record<string, unknown>)['redirect'] as string | undefined;
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
    const result = { stateId, redirectTarget } as CallbackState;

    this.logger.info(
      `Getting callback state, state=${params.state}, parsedStateId=${result.stateId}, redirect=${result.redirectTarget ?? '/'} `,
    );

    return result;
  }

  public async logout(sid: string | undefined): Promise<void> {
    if (sid) await this.sessions.logout(sid);
  }

  public async sessionInfo(sid: string | undefined): Promise<SessionInfo> {
    this.logger.info(`Retrieving session info for sid=${sid ?? '<none>'}`);
    if (!sid) return { loggedIn: false } as const;
    const sess = await this.sessions.getSession(sid);
    this.logger.info(`Session info retrieved: ${JSON.stringify(sess)}`);
    if (!sess) return { loggedIn: false } as const;

    // Fetch user to enrich response with directory data
    let userRecord: UserDto | undefined;
    let tenantIds: readonly string[] = [];
    try {
      userRecord = await this.userRepo.getUserByOidcSub(sess.sub);
      if (userRecord?.tenantId !== undefined) {
        tenantIds = [userRecord.tenantId];
      }
    } catch (err) {
      this.logger.warn(`Failed to fetch user for session ${sess.sub}: ${err}`);
      // Continue with session-only data - user might not exist yet or have DB issues
    }

    const email = userRecord?.email ?? sess.email ?? '';
    const fullName = sess.fullName ?? userRecord?.name ?? sess.name ?? email;

    const normalizedTenantIds: readonly string[] = tenantIds.length > 0 ? [...tenantIds] : [];

    const out: SessionInfoLoggedIn = {
      user: {
        id: (userRecord?.id ?? sess.sub) as Uuid,
        email,
        fullName,
      },
      loggedIn: true,
      sub: sess.sub,
      tenantIds: normalizedTenantIds,
    } as const;

    this.logger.info(`Session info returned: ${JSON.stringify(out)}`);
    return out;
  }

  private decodeRedirect(rawRedirect?: string): string | undefined {
    if (typeof rawRedirect !== 'string' || rawRedirect.length === 0) return undefined;
    try {
      const decoded = decodeURIComponent(rawRedirect);
      return decoded || rawRedirect;
    } catch {
      return rawRedirect;
    }
  }

  private sanitizeRedirect(redirectTarget?: string): string {
    if (redirectTarget && typeof redirectTarget === 'string') {
      if (redirectTarget.startsWith('/')) return redirectTarget;
      if (redirectTarget.startsWith('http')) return redirectTarget;
      this.logger.warn(`Rejected unsafe redirect target: ${redirectTarget}`);
    }
    return '/';
  }
}
