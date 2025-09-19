# Session and Token Handling: Plan

## Goal

Shorten and improve session lifetime handling so that sessions closely follow the access token lifecycle and support safe automatic refreshes using the refresh token. Specifically:

- Session life span = 2 \* access token lifetime.
- Session life span is a rolling window: each valid request extends the session expiry.
- If a request arrives and the session is valid but the access token is expired, automatically obtain a new access token using the stored refresh token and associate the new tokens with the session.

This document outlines the design, implementation steps, tests, and rollout plan.

## Assumptions

- The OIDC provider returns both access_token and refresh_token at initial authentication (and refresh responses include access_token and optionally refresh_token).
- Session records are stored in our sessions store (DynamoDB single-table or equivalent). The record currently contains at least: sessionId, userId, createdAt, expiresAt, and cookie/session metadata. We'll extend this.
- The backend has an HttpClient abstraction to make outgoing HTTP requests to the token endpoint.

## High-level design

1. Session TTL calculation

- When creating/updating a session, compute:

  access_expires_at = now + access_token_expires_in (derived from provider response's "expires_in" or from JWT exp claim)

  session_expires_at = now + (2 \* access_token_expires_in)

- Store both access_expires_at and session_expires_at on the session record.

2. Rolling window

- On each authenticated request, when the session is validated, update session_expires_at to: now + 2 \* (current access_token_remaining_life), where current access_token_remaining_life is either (access_expires_at - now) or re-derived after a refresh.
- Also update a last_seen timestamp for metrics/audit.
- To avoid write storms, only update the session record when the remaining session lifetime is below a configurable threshold (e.g., when session_expires_at - now < 50% of original TTL), or at most once every N seconds (e.g., 60s) per session. This reduces Dynamo writes.

3. Automatic access token refresh

- On each request, after validating the session record:
  - If access_expires_at > now: access token is valid — proceed.
  - Else (access expired): attempt to refresh
    - If refresh_token is present and refresh_token_exp > now (if we track it) or unknown:
      - Call the OIDC token endpoint with grant_type=refresh_token and the stored refresh token.
      - On success, update session record with new access_token (and refresh_token if returned), and recompute access_expires_at and session_expires_at.
      - If refresh fails with an invalid_grant or expired token, treat as authentication failure: clear session and respond 401 (or redirect to login for browser flows).

## Data model changes

Add fields to the session record (Dynamo attribute names shown as examples):

- accessToken: string (encrypted at rest)
- accessTokenExpiresAt: ISO timestamp or numeric epoch
- refreshToken: string (encrypted at rest)
- refreshTokenExpiresAt?: ISO timestamp (if provider gives this) or null
- sessionExpiresAt: ISO timestamp (current TTL of session)
- lastSeenAt: ISO timestamp
- tokenIssuedAt: ISO timestamp (optional — when token was issued)
- tokenIssuer: string (provider issuer id — helpful for multi-provider)

## Security considerations

- Refresh tokens are highly sensitive. Store them encrypted (KMS/secret store) and restrict access to the minimal set of services.
- Rotate stored refresh tokens when the provider returns a new refresh_token in the refresh response.
- Limit the number of automatic refresh attempts per session/request to prevent abuse (e.g., max 2 attempts per request; global rate-limit to the token endpoint per session/user).
- Log refresh attempts and failures (audit) without logging raw token values.

## Implementation plan (step-by-step)

Phase A — Discovery & config

1. Locate the session storage implementation and the auth middleware that validates sessions and attaches the user context to requests. (Files to inspect: packages/api/src/..., apps/web/src/..., docs/ may list implementations.)
2. Add configuration entries (env/SSM) for:
   - ENABLE_ROLLING_SESSION (boolean, default false for safe rollout)
   - SESSION_ROLLING_MIN_REFRESH_SECS (e.g., 60)
   - SESSION_ROLLING_THRESHOLD_PERCENT (e.g., 50)
   - TOKEN_ENDPOINT, TOKEN_CLIENT_ID, TOKEN_CLIENT_SECRET (or use existing provider config)
   - REFRESH_MAX_ATTEMPTS_PER_REQUEST (e.g., 1)

Phase B — Data model updates

1. Add new attributes to the session record in the session repo interface and implementations.
2. Add utilities to serialize/deserialize session tokens and to encrypt/decrypt token fields.
3. Create a short migration (if needed) to backfill existing sessions with conservative values (e.g., sessionExpiresAt = now + DEFAULT_SESSION_TTL until next login) — but prefer not to mass-migrate: instead expire existing sessions on next use.

Phase C — Middleware changes (main implementation)

1. Update session validation middleware to read accessTokenExpiresAt and sessionExpiresAt.
2. On each request when ENABLE_ROLLING_SESSION=true:
   - If sessionExpiresAt < now: respond 401 (session expired).
   - Else, check accessTokenExpiresAt:
     - If accessTokenExpiresAt >= now: optionally extend sessionExpiresAt (rolling) according to threshold logic.
     - If accessTokenExpiresAt < now: attempt refresh (see below).

3. Implement refresh logic:
   - Call token endpoint with grant_type=refresh_token and stored refresh token.
   - If success, update session record atomically with new tokens and new expiresAt fields.
   - If failure (invalid_grant, expired_token), clear session and return 401.

4. Update cookie/session response headers if you manage HttpOnly cookie expiry based on sessionExpiresAt.

Phase D — Testing

1. Unit tests:
   - TTL computation (various expires_in values).
   - Rolling update threshold logic.
   - Refresh success and failure behaviors (mock token endpoint).

2. Integration tests:
   - Middleware flow: incoming request with expired access token and valid refresh token -> calls token endpoint -> session updated -> request succeeds.
   - Failing refresh leads to cleared session and 401.

Phase E — Rollout

1. Enable behind feature flag ENABLE_ROLLING_SESSION=false by default.
2. Deploy to staging with the flag enabled. Run integration tests and smoke UI tests (web login flow).
3. After validation, enable for a small percentage of traffic / canary service and monitor metrics.

## Acceptance criteria

- Sessions have a TTL equal to twice the access token life span (sessionExpiresAt computed correctly).
- SessionExpiresAt moves forward on validated requests (rolling) respecting write throttling.
- When access token expires but refresh token is valid, the service transparently refreshes tokens and continues request processing.
- 401 is returned when both access and refresh tokens are invalid.
- Sensitive tokens are stored encrypted and never logged in cleartext.

## Edge cases and notes

- Provider may not return an explicit refresh token expiry. In that case, assume the refresh token is valid until revoked; still honor failures from token endpoint.
- If refresh responses occasionally rotate the refresh token (send a new refresh_token), update stored refresh_token atomically.
- Consider adding a safety window (e.g., treat tokens as expired 30s before true expiry) to avoid races.
- Watch out for clock skew between services and provider; allow a small skew window (e.g., 60s).
- For performance, avoid writing session records on every request — use threshold/time-based updates.

## Open implementation questions

- Which package implements session storage (Dynamo table) in this repo? We'll inspect infra/session repo and package APIs to find exact locations for edits.
- Do we set cookie expiry from sessionExpiresAt on every response? If so, we must ensure client browsers receive updated cookies when rolling window extends.
- How is refresh_token encryption currently implemented (if at all)? Use existing KMS utilities or add one.

## Monitoring & metrics

- Metrics to add:
  - session_renewed_count
  - session_expired_count
  - token_refresh_attempts, token_refresh_success, token_refresh_failure
  - refresh_error_by_reason (invalid_grant, network, rate_limit)

- Alerts:
  - spike in token_refresh_failure rate
  - large increase in session_expired_count

## Runbook

- If many users get logged out after rollout: check token_refresh_failure metric; if refreshes failing due to client id/secret misconfiguration, revert feature flag and fix config.
- If token endpoint rate-limited: add backoff + cache per-user refresh attempts, throttle token endpoint calls.

## Files to change (examples)

- packages/api/src/auth/sessionRepo.ts (or equivalent) — extend model
- packages/api/src/auth/sessionService.ts — implement refresh and rolling update
- packages/api/src/middleware/authMiddleware.ts — call refresh when needed and update session
- packages/api/src/config.ts — add env flags
- packages/api/test/\* — add tests

## Estimated effort

- Design & discovery: 2-4 hours
- Data model & small migration: 2-6 hours (depends on migration needs)
- Middleware & refresh implementation: 4-8 hours
- Tests and QA: 4-8 hours
- Staging rollout and monitoring adjustments: 2-4 hours

## Appendix: Example token refresh pseudo-code

1. In auth middleware (simplified):

   session = sessionRepo.get(sessionId)
   if (!session) return 401
   if (session.sessionExpiresAt < now) return 401

   if (session.accessTokenExpiresAt <= now) {
   if (!session.refreshToken) return 401
   if (session.refreshTokenExpiresAt && session.refreshTokenExpiresAt <= now) return 401

   // call token endpoint
   tokenResp = httpClient.post(tokenEndpoint, {
   grant_type: 'refresh_token',
   refresh_token: session.refreshToken,
   client_id: clientId,
   client_secret: clientSecret,
   })

   if (tokenResp.ok) {
   session.accessToken = encrypt(tokenResp.access_token)
   if (tokenResp.refresh_token) session.refreshToken = encrypt(tokenResp.refresh_token)
   session.accessTokenExpiresAt = now + tokenResp.expires_in
   session.sessionExpiresAt = now + 2 \* tokenResp.expires_in
   sessionRepo.update(session)
   } else {
   sessionRepo.delete(sessionId)
   return 401
   }
   }

   // Optionally extend sessionExpiresAt (rolling) according to policy

   // Attach tokens/user to request context and continue

## Conclusion

This plan gives a safe, testable approach to aligning session lifetimes with access tokens and performing transparent refreshes. Next step: do the discovery task and map exact files/locations to edit, then implement middleware and tests behind a feature flag.

## Todo checklist (for tracking)

Use these checkboxes to track progress. Convention here:

- [x] = completed
- [-] = in-progress
- [ ] = not started

- [-] Analyze current session & token model — Locate session storage, session creation flow, and existing token handling. (Discovery in-progress)
- [ ] Design TTL & rolling policy — Define exact calculations and rolling-window rules.
- [ ] Update session storage schema — Add fields (accessToken, refreshToken, expiries, lastSeen) and plan migration.
- [ ] Implement middleware to refresh session TTL (rolling) — Update session on requests with write-throttling.
- [ ] Implement automatic access token refresh — Use refresh token when access token expired and update session atomically.
- [ ] Handle refresh failures and re-auth flows — Clear sessions, return 401 or redirect, emit audit events.
- [ ] Add unit and integration tests — Mock token endpoint flows and middleware behavior.
- [ ] Add config & env variables — Feature flag, thresholds, token endpoint config.
- [ ] Documentation & security review — Threat model, token storage, runbook.
- [ ] Rollout & monitoring — Canary, metrics, alerts.
