<!-- Customer onboarding plan: phased, actionable, repo-aligned. -->

# Customer onboarding implementation plan

Convention: ✅ = done, ☐ = todo.  
Work top-down; each phase is small and independently testable.

This document implements the onboarding flow sketched in `docs/architecture.c4.dsl` (flow-1-signup-and-customer-association). The objective: allow a new tenant to sign up from the SPA, create tenant metadata in the API, create an initial admin user, and return the user to the app with a valid session.

Summary (one-liner)

- SPA -> HTTP API POST /auth/signup -> HTTP API calls POST /tenants -> tenant created + TenantCreated event -> HTTP API issues session cookie + CSRF cookie -> SPA redirected to onboarding.

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

Phase 2 — HTTP API onboarding flow (user-facing orchestration)

- ☐ Add `OnboardingService` in `packages/api/src/services/onboardingService.ts` that composes tenant creation, seeding, and admin user creation.
- ☐ Add `signup` handler to `AuthController` (or `OnboardingController`) at `POST /auth/signup`:
  - Validate body via zod DTO.
  - Call `OnboardingService.createTenantAndAdmin(...)` which uses `ITenantRepo`, `IUserRepo` (or existing user repo), and `IEventPublisher`.
  - On success, set session cookie and CSRF cookie using existing `SessionService` behavior and return redirect target.
- ☐ Unit tests for `OnboardingService` and controller wiring.

Phase 3 — Initial data & events

- ☐ Implement optional seeding in `OnboardingService` (price list, sample album) as idempotent operations.
- ☐ Emit `TenantCreated` event with tenant id + admin email; add event contract to `packages/types`.
- ☐ Validate idempotency for event consumers.

Phase 4 — Frontend signup UI

- ☐ Add `/signup` page in `apps/web/src/features/auth` with the form and client-side validation (mirror zod schema).
- ☐ Add RTK Query mutation that calls the HTTP API `POST /auth/signup` using `credentials: 'include'` and `X-CSRF-Token` header.
- ☐ On success, navigate to `/onboarding` or `/albums` per flow.
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

- packages/types/src/dtos.ts (TenantCreate + Tenant + event types)
- packages/types/src/schemas.ts (zod schemas)
- packages/core/src/ports/tenantRepo.ts
- packages/infra-aws/src/tenantRepoDdb.ts
- packages/api/src/controllers/tenantController.ts
- packages/api/src/services/onboardingService.ts
- apps/web/src/features/auth/pages/signUpPage.tsx
- apps/web/src/features/auth/api.ts (RTK mutation)

Implementation notes & small contracts

- Contract for `POST /auth/signup` request: { companyName: string, adminEmail: string, adminName?: string }
- Contract for `POST /tenants` request (domain API): TenantCreate DTO (id optional; server generates ULID)
- Error modes: validation error (400), email exists (409), internal error (500).

Edge cases

- Email already registered — return 409 with helpful message.
- Partial failure during seeding (tenant created but seeding failed) — ensure system remains usable and provide operator remediation steps (re-run seeding job or idempotent retry).
- Race: two signups for same email — repo should enforce uniqueness (conditional write) and onboarding service should handle conditional-failure gracefully.

Next actions (short-term)

- ✅ Create this file (done).
- ✅ Phase 0: scaffolded `packages/types` DTOs and zod schemas; tests added and run (see `packages/types/src/tenant.test.ts`).
  - ☐ Phase 1: I can implement `ITenantRepo` and `TenantRepoDdb` next. Want me to start Phase 1?

---

Completion summary

- File created to track onboarding implementation with phased actionable tasks. Use this doc to assign and implement small PRs per phase.
