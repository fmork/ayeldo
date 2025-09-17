<!-- Customer onboarding plan: phased, actionable, repo-aligned. -->

# Customer onboarding implementation plan

Convention: ✅ = done, ☐ = todo.  
Work top-down; each phase is small and independently testable.

This document implements the onboarding flow sketched in `docs/architecture.c4.dsl` (flow-1-signup-and-customer-association). The objective: allow a new tenant to sign up from the SPA, create tenant metadata in the API, associate an existing admin user (created during OIDC sign-in) with the tenant, and return the user to the app with a valid session.

Summary:

- Customer onboarding is always initiated by an authenticated user (OIDC principal).
- User creation happens during the initial OIDC sign-in flow (via AuthFlowService.handleCallback), not during onboarding.
- After OIDC login, the SPA calls an API endpoint to check the user's onboarding status.
- If the user is not associated with a Customer, onboarding is triggered.
- The onboarding process creates a Customer object (billing partner), then a Tenant for domain data (albums, images, ...), and associates the existing OIDC user as the initial admin.
- No public signup or password-based flows are supported; all onboarding is OIDC-based.

Phases

Phase 0 — Design & schema (small, safe)

- ✅ Add types and zod schemas for TenantCreate and TenantCreated event in `packages/types` (`dtos.ts`, `schemas.ts`).
- ✅ Define single-table key shape for tenant (PK = `TENANT#<id>`, SK = `METADATA#<id>`). Add marshalling notes in `docs/dynamo.md`.
- ✅ Add unit tests for schema parsing and event shape.

Phase 1 — API: Tenant creation (domain API)

- ✅ Add `ITenantRepo` port in `packages/core/src/ports/tenantRepo.ts` (create + getById).
- ✅ Implement `TenantRepoDdb` in `packages/infra-aws` using existing marshalling helpers.
- ✅ Implement `TenantController` in `packages/api/src/controllers/tenantController.ts` exposing `POST /tenants`.
  - Validate input with zod, create tenant via repo, emit `TenantCreated` via `IEventPublisher`.
- ✅ Unit tests for repo and service
  - Added `packages/infra-aws/src/tenantRepoDdb.test.ts` (TenantRepoDdb tests: create/get/query)
  - Added `packages/api/src/services/tenantService.test.ts` (TenantService tests: happy + validation)
- ☐ Controller unit tests (deferred)
  - `TenantController` tests require a router/server harness to exercise CSRF and middleware reliably; deferred for now.

Status note: After adding `TenantController` and the unit tests for `TenantService` and `TenantRepoDdb`, I ran the repository build (lint + tsc -b) and unit tests. All checks completed successfully in this session: Test Suites: 1 skipped, 16 passed; Tests: 3 skipped, 73 passed. Controller-level tests remain to be implemented (see note above).

Phase 1.5 — User management and OIDC integration (completed)

- ✅ Add `IUserRepo` port in `packages/core/src/ports/userRepo.ts` with getUserByOidcSub, getUserByEmail, createUser, updateUserSub methods.
- ✅ Implement `UserRepoDdb` in `packages/infra-aws` using DdbClient and single-table design.
- ✅ Integrate user creation into OIDC sign-in flow via `AuthFlowService.handleCallback`:
  - Users are automatically created during first OIDC authentication
  - Email fallback for user lookup when OIDC sub changes
  - updateUserSub method to associate users found by email with OIDC sub
- ✅ Unit tests for UserRepoDdb and AuthFlowService user creation logic.

Phase 2 — HTTP API onboarding flow (OIDC user orchestration)

- ✅ Add `OnboardingService` in `packages/api/src/services/onboardingService.ts` that composes tenant creation and user-tenant association.
- ✅ Enhanced `AuthFlowService` to create users during OIDC sign-in flow (handleCallback method):
  - Added userRepo dependency to find/create users during authentication
  - Added email fallback for user lookup when OIDC sub not found
  - Added updateUserSub method to associate email-found users with OIDC sub
- ✅ Updated `OnboardingService` to assume existing authenticated user instead of creating users:
  - Finds existing user by OIDC identity (created during sign-in)
  - Associates user with newly created tenant
- ✅ Implemented proper dependency injection for AuthFlowService in ApiInit.ts
- ✅ Add onboarding handler to `AuthController` at `POST /auth/onboard`:
  - Validates body via zod DTO (TenantCreateDto with companyName/name, adminName, plan).
  - Uses OIDC session to get current user identity (sub/email).
  - Calls `OnboardingService.createTenantAndMaybeSignIn(...)` which uses `ITenantRepo`, `IUserRepo` (OIDC-linked), and `IEventPublisher`.
  - On success, sets session cookie and CSRF cookie using existing `SessionService` behavior and returns tenant + admin user data.
- ✅ Unit tests for `OnboardingService`, `AuthFlowService`, and `AuthController` updated for new architecture.

Phase 3 — Initial data & events

- ☐ Implement optional seeding in `OnboardingService` (price list, sample album) as idempotent operations.
- ☐ Emit `TenantCreated` event with tenant id + admin email; add event contract to `packages/types`.
- ☐ Validate idempotency for event consumers.

Phase 4 — Frontend onboarding UI

- ☐ Add `/onboard` page in `apps/web/src/features/auth` with the onboarding form and client-side validation (mirror zod schema).
- ☐ Add RTK Query mutation that calls the HTTP API `POST /auth/onboard` using `credentials: 'include'` and `X-CSRF-Token` header.
- ☐ On success, navigate to `/albums` or onboarding completion page.
- ☐ Add visual feedback and error handling for common failures (email already exists, validation errors).

Phase 5 — Tests & QA

- ☐ Integration test (jest + supertest) for HTTP API `POST /auth/signup` that asserts session cookie + csrf cookie and redirect.
- ☐ Local smoke test: use headless browser or playwright to fill the form, follow redirect, and assert authenticated route access.
- ☐ Add contract test for `TenantCreated` event schema.

Phase 6 — Docs & rollout

- ☐ Add README snippet and docs section describing onboarding flow and required env vars.
- ☐ Document transitional naming decisions: repo preserves `BFF_*` env var names (for example `BFF_JWT_SECRET`) and `bffOrigin` property for backwards compatibility. Plan a staged migration if you want to rename runtime keys (accept both old/new names for a release, then remove old names later).

Acceptance criteria

- Frontend signup page submits to HTTP API and receives either validation errors or a redirect.
- HTTP API creates tenant record and emits `TenantCreated` event exactly once per successful onboarding.
- Session cookie (`__Host-sid`) and CSRF cookie are set (HttpOnly/secure/SameSite=None as appropriate), and the user can call authenticated endpoints.
- Unit & integration tests cover success and failure paths.

Security considerations

- Validate all external input with zod.
- Rate-limit signup or add CAPTCHA to block abuse.
- Never return session tokens to the browser; always use HttpOnly cookies.
- Store admin passwords hashed (bcrypt/argon2) and never return them in responses.

Suggested files to create (small increments)

- ✅ packages/types/src/dtos.ts (TenantCreate + Tenant + UserCreate + User + event types)
- ✅ packages/types/src/schemas.ts (zod schemas)
- ✅ packages/core/src/ports/tenantRepo.ts
- ✅ packages/core/src/ports/userRepo.ts
- ✅ packages/infra-aws/src/tenantRepoDdb.ts
- ✅ packages/infra-aws/src/userRepoDdb.ts
- ✅ packages/api/src/controllers/tenantController.ts
- ✅ packages/api/src/controllers/authController.ts (with POST /auth/onboard endpoint)
- ✅ packages/api/src/controllers/authController.test.ts
- ✅ packages/api/src/services/onboardingService.ts
- ✅ Enhanced packages/api/src/services/authFlowService.ts (user creation during sign-in)
- ☐ apps/web/src/features/auth/pages/signUpPage.tsx
- ☐ apps/web/src/features/auth/api.ts (RTK mutation)

Implementation notes & small contracts

- User creation happens during OIDC sign-in (AuthFlowService.handleCallback), not during onboarding
- Contract for `POST /auth/onboard` request: { companyName: string, adminName?: string, plan?: string }
  - OIDC identity (sub/email) is taken from the session, not the request body.
  - User must already exist (created during sign-in) before onboarding
- Contract for `POST /tenants` request (domain API): TenantCreate DTO (id optional; server generates ULID)
- Error modes: validation error (400), user not found (404), email exists (409), internal error (500).

Edge cases

- OIDC user not found during onboarding — return 404 with helpful message (user should sign in first).
- OIDC email already registered but different sub — AuthFlowService handles this via email fallback and updateUserSub.
- Partial failure during seeding (tenant created but seeding failed) — ensure system remains usable and provide operator remediation steps (re-run seeding job or idempotent retry).
- Race: two onboardings for same OIDC user — repo should enforce uniqueness (conditional write) and onboarding service should handle conditional-failure gracefully.

Next actions (short-term)

- ✅ Create this file (done).
- ✅ Phase 0: scaffolded `packages/types` DTOs and zod schemas; tests added and run (see `packages/types/src/tenant.test.ts`).
- ✅ Phase 1: implemented `ITenantRepo`, `TenantRepoDdb`, and `TenantService` with full test coverage.
- ✅ Phase 1.5: implemented user management with OIDC integration during sign-in flow.
- ✅ Phase 2: implemented `OnboardingService` with updated architecture (users created at sign-in, not onboarding).
- ✅ Phase 2 completion: Added onboarding HTTP endpoint `POST /auth/onboard` to AuthController with proper OIDC authentication.
- ☐ Phase 3: Implement seeding and event emission.
- ☐ Phase 4: Frontend onboarding UI implementation.

---

Completion summary

- File created to track onboarding implementation with phased actionable tasks. Use this doc to assign and implement small PRs per phase.
