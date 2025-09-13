# 🧭 Implementation To-Do (Codex-friendly, small steps)

Convention: ✅ = done, ☐ = todo.  
Work top-down. For each step, ask Codex to scaffold the files and code as described.

---

## 0) Project Bootstrap

- ✅ Create repo & workspace
  - ✅ `pnpm init -y`
  - ✅ Create `pnpm-workspace.yaml`
  - ✅ Add `.editorconfig`, `.gitignore`, `.nvmrc`
  - ✅ Add root `tsconfig.base.json` (strict mode)
- ✅ Add packages (empty scaffolds)
  - ✅ `packages/types`
  - ✅ `packages/core`
  - ✅ `packages/infra-aws`
  - ✅ `packages/utils`
  - ✅ `packages/bff`
  - ✅ `packages/api`
  - ✅ `packages/services`
- ✅ Add apps/infra
  - ✅ `apps/web` (React/Vite SPA)
  - ✅ `infra/cdk` (AWS CDK app)
- ✅ Tooling
  - ✅ Install dev deps: `typescript`, `eslint`, `@typescript-eslint/*`, `prettier`, `jest`, `zod`, `ts-node`
  - ✅ Root scripts: `build`, `lint`, `format`, `test`, `typecheck`

Codex prompt: Scaffold a pnpm monorepo with the package/app folders above, a strict tsconfig base shared via references, and shared ESLint + Prettier configs.

---

## 1) Shared Types & Events (`packages/types`)

- ✅ Create `src/events.ts`: event envelope (ULID id, ISO timestamps, tenantId)
- ✅ Create `src/dtos.ts`: DTOs for Album, Image, Cart, Order, PriceList
- ✅ Create `src/state.ts`: order/cart state enums
- ✅ Create `src/schemas.ts`: zod schemas for DTOs/events
- ✅ Unit tests for schema parsing

Codex prompt: Implement strongly typed event envelopes and zod schemas for Album/Image/Cart/Order/PriceList DTOs; include happy/sad-path tests with vitest.

---

## 2) Domain Core (`packages/core`)

- ✅ Entities & value objects: `Album`, `Image`, `PriceList`, `Cart`, `Order`
- ✅ Ports: `IAlbumRepo`, `IImageRepo`, `IPriceListRepo`, `ICartRepo`, `IOrderRepo`
- ✅ Services:
  - ✅ `TieredPricingEngine`
  - ✅ `OrderStateMachine` (pure function)
  - ✅ `PolicyEvaluator` (public/hidden/restricted; stub)
- ✅ Domain error types

Codex prompt: Create domain entities and ports (no AWS imports). Implement TieredPricingEngine and a pure OrderStateMachine with unit tests.

---

## 3) Utils & DI (`packages/utils`) — Manual DI

- ✅ `src/init.ts` in each app (`packages/bff`, `packages/api`, `packages/services`): manual wiring of singletons; instantiate dependencies explicitly and pass via constructors.
- ✅ `awsClients.ts`: module-cached AWS SDK clients (DynamoDB, S3, EventBridge).
- ✅ `logging.ts`: use `ILogWriter` (from @fmork/backend-core); root pino-backed logger and request-scoped wrapper (`withRequestId`).
- ✅ `http.ts`: API Gateway helpers (JSON responses, error mapping)
- ✅ `env.ts`: zod-validated env loader

Codex prompt: Implement manual DI (no container). Create `src/init.ts` per app that assembles repositories/services/publishers using shared utils (`awsClients`, `logging`, `env`). Ensure one instance per runtime where appropriate and pass dependencies explicitly via constructors.

---

## 4) DynamoDB Single-Table (`packages/infra-aws`)

- ✅ Document design in `docs/dynamo.md`
- ✅ Repositories (get/put):
  - ✅ `AlbumRepoDdb`
  - ✅ `ImageRepoDdb`
  - ✅ `PriceListRepoDdb`
  - ✅ `CartRepoDdb`
  - ✅ `OrderRepoDdb`
- ✅ Marshalling helpers (`keys.ts`, `marshalling.ts`)
- ☐ Secondary indexes: GSI wiring in CDK and queries
- ☐ LocalStack integration tests

Codex prompt: Implement DynamoDB repositories with strict key prefixes and LocalStack tests; no use of `any`, all fields typed.

---

## 5) Event Bus & Analytics

- ✅ Event publisher abstraction (`IEventPublisher`)
- ✅ EventBridge implementation
- ✅ Analytics service:
  - ✅ Consume `ViewRecorded`, `DownloadRecorded`, `OrderPaid`
  - ✅ Update stats counters in DynamoDB
  - ✅ Ensure idempotency by event id

Codex prompt: Create an analytics lambda that consumes events and updates counters; ensure idempotency by event id.

---

## 6) Image Upload Flow

- ✅ Define upload URL provider port (presigned POST)
- ✅ S3 adapter for presigned POST
- ✅ API endpoint: register image → return presigned POST
- ✅ Completion endpoint: emit `ImageUploaded`

Codex prompt: Scaffold image upload endpoints: POST `/images:register`, POST `/images/:id/complete`; use presigned POST and emit ImageUploaded.

---

## 7) Pricing & Carts

- ☐ Implement cart repo (anonymous session + TTL)
- ☐ API route: price cart using `TieredPricingEngine`
- ☐ BFF routes: add/remove/list cart items
- ☐ Emit `CartUpdated`

Codex prompt: Expose BFF cart endpoints (add/remove/list) that call API for pricing; include CSRF validation.

---

## 8) Orders & Payments (Stripe)

- ☐ API: create order from cart
- ☐ API: get order status
- ☐ Stripe session creation
- ☐ Webhook handler: verify signature, update state
- ☐ Emit `OrderPaid` / `OrderFailed`
- ☐ Fulfillment step for paid albums (download link)

Codex prompt: Implement Stripe session creation and webhook processing with typed payloads and safe state transitions; unit tests for transitions.

---

## 9) BFF Auth & Session

- ☐ Route: `/auth/login` → redirect to Cognito
- ☐ Route: `/auth/callback` → code exchange server-side
- ☐ Store tokens in `SESSION#sid` (encrypted, TTL)
- ☐ Issue HttpOnly session cookie
- ☐ Middleware: `requireSession` + `csrfGuard`
- ☐ BFF → API auth (short-lived signed JWT)

Codex prompt: Implement BFF session management with Cognito code exchange (no tokens in browser), DynamoDB session store, and CSRF protection.

---

## 10) Policy/Authorization

- ☐ Implement `PolicyEvaluator`
- ☐ Public: allow all
- ☐ Hidden: require link token
- ☐ Restricted: require membership
- ☐ Integrate guard in album/image fetch endpoints

Codex prompt: Implement policy evaluation with three modes; integrate guard in album/image fetch handlers and test all cases.

---

## 11) Web App (SPA)

- ✅ Vite + React + TypeScript app talking only to BFF
- ✅ Routes with `react-router-dom`:
  - ✅ `/login`
  - ✅ `/albums/:id`
  - ✅ `/cart`
  - ✅ `/checkout/result`
- ✅ State + API: `@reduxjs/toolkit` with RTK Query
  - ✅ Configure `fetchBaseQuery` with `baseUrl=VITE_BFF_BASE_URL`, `credentials: 'include'`, and `X-CSRF-Token` header
  - ✅ Expose generated hooks and use tag-based cache invalidation
- ✅ Vite config: `VITE_BFF_BASE_URL` and dev proxy to BFF

Codex prompt: Scaffold a Vite React app with the routes above, add Redux Toolkit store and an RTK Query API slice configured with credentials + CSRF header to call the BFF, and configure a Vite dev proxy to the BFF origin.

---

## 12) CDK Infrastructure (`infra/cdk`)

- ☐ `CoreStack`: DynamoDB, S3, CloudFront
- ☐ `ApiStack`: API Gateway, Lambdas, permissions
- ☐ `EventsStack`: EventBridge, DLQs
- ☐ `AnalyticsStack`: analytics consumer
- ☐ Outputs: API URLs, table name, bus ARN

Codex prompt: Create CDK stacks with environment variables wired into lambdas and IAM policies scoped to DynamoDB table and S3 prefixes.

---

## 13) Observability

- ☐ Structured logs (pino, requestId)
- ☐ CloudWatch dashboards: errors, latency, DLQs
- ☐ X-Ray tracing BFF→API→DynamoDB

Codex prompt: Add pino logger + X-Ray capture; build a CloudWatch dashboard stack with metrics and alarms.

---

## 14) Security Hardening

- ☐ Cookies: HttpOnly, Secure, SameSite
- ☐ CSRF: double-submit or custom header
- ☐ Input validation: zod on every handler
- ☐ Signed S3/CloudFront URLs for downloads
- ☐ Rotate BFF signing key via SSM Param Store

Codex prompt: Add middleware that validates zod schema and rejects with 400; add CSRF guard and tests.

---

## 15) Documentation

- ☐ Save C4 DSL in `docs/architecture.c4.dsl`
- ☐ Write `docs/dynamo.md`, `docs/events.md`, `docs/security.md`
- ☐ Update README with local dev setup

Codex prompt: Generate markdown docs for events and DynamoDB design from current code types.

---

## 16) CI/CD

- ☐ GitHub Actions workflow:
  - ☐ `pnpm install --frozen-lockfile`
  - ☐ Lint, typecheck, test
  - ☐ CDK synth
- ☐ Require passing checks before merge

Codex prompt: Write a GitHub Actions workflow that caches pnpm store, runs lint/typecheck/tests, and synthesizes CDK.

---

## 17) Future Extensions

- ☐ Search (OpenSearch)
- ☐ Creator webhooks on order events
- ☐ Export analytics as CSV
- ☐ Multi-region S3 + CloudFront signed cookies
