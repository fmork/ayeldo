# 🤖 AGENTS.md

This file provides **project-specific guidance** for AI coding agents (e.g., Codex, Copilot, ChatGPT).  
Its purpose is to keep all generated code consistent with the agreed **architecture, style, and conventions**.

---

## 📚 Reference Materials

Agents should always consult these documents before scaffolding or modifying code:

- `docs/architecture.c4.dsl` → C4 model (system context, containers, flows)
- `docs/todo.md` → Implementation roadmap (checklist)
- `docs/dynamo.md` → DynamoDB single-table design
- `docs/events.md` → Event definitions and schemas
- `docs/security.md` → Security practices
- `docs/dependency-injection.md` → specifics around dependency injection

---

## 📝 Coding Guidelines (TypeScript)

Put functionality into well-designed, focused classes. Inject depedencies through constructors, following the following pattern:

```typescript
interface MyClassProps {
  // depdencies go here
}

export class MyClass {
  private readonly props: MyClassProps;

  constructor(props: MyClassProps) {
    this.props = props;
  }
}
```

## Avoid optional properties

By default, avoid optional properties unless absolutely necessary. I prefer simpler code without conditionals.

### React components

```typescript
import { FC } from 'react';

const SomePage: FC<any> = () => {

    return (
        <>
            Content goes here
        </>
    )

}



export default SomePage;

```

### API calls from React

React clients should always use RTK toolkit for making API calls, unless there are very specific reasons not to.

### Logging

Use the `ILogWriter` interface from `@fmork/backend-core` for all logging. Instantiate loggers via `@ayeldo/utils`' pino-backed adapter (`createRootLogger`) and create request-scoped child loggers with `withRequestId(logger, requestId)`.

### Outgoing HTTP requests in the backend

Code that needs to make HTTP requests should take a dependency on `HttpClient` from `backend-core`.

- Backend (API/Services): inject an `HttpClient` implementation (Axios or fetch/undici-based) via manual DI.
- Frontend (Web/Vite): use a small typed fetch wrapper that calls the API with `credentials: 'include'` and an `X-CSRF-Token` header.

### TypeScript Best Practices

- Strict mode (`"strict": true`) in `tsconfig`.
- Don't use TypeScript enums.
- Don't export imported variables.
- Always add type annotations to variables, parameters, and class properties unless they are initialized with literal expressions.
- Always add access modifiers to members in classes.
- Always add type annotations to function return types.
- Don't use TypeScript namespaces.
- Don't use non-null assertions with the `!` postfix operator.
- Don't use parameter properties in class constructors.
- Don't use user-defined types.
- Use `as const` instead of literal types and type annotations.
- Use `T[]` consistently for array declarations.
- Initialize each enum member value explicitly.
- Use `export type` for types.
- Use `import type` for types.
- Make sure all enum members are literal values.
- Don't use TypeScript const enum.
- Don't declare empty interfaces.
- Don't let variables evolve into any type through reassignments.
- Don't use the any type.
- Don't misuse the non-null assertion operator (!) in TypeScript files.
- Don't use implicit any type on variable declarations.
- Don't merge interfaces and classes unsafely.
- Don't use overload signatures that aren't next to each other.
- Use the namespace keyword instead of the module keyword to declare TypeScript namespaces.
- Prefer **readonly** properties, arrays, and parameters.
- Always use `async/await` for async code (no `.then()` chaining).
- Runtime validation with **zod** on all external input (API, events, env).
- File naming conventions:
  - Files: `camelCase`
  - Classes: `PascalCase`
  - Directories: `kebab-case`

---

## 🏗 Architecture Rules

- **API pattern**
  - Browser never sees OIDC tokens.
  - API performs token exchange and issues HttpOnly session cookies.
  - API calls services using internal auth (signed JWT or API key).

- **Layered separation**
  - **Domain (`core`)** is **pure** (no AWS imports).
  - **Ports** define contracts for repos, services, publishers.
  - **Infra (`infra-aws`)** implements ports with AWS SDK.
  - **Apps (`bff`, `api`, `services`)** provide Lambda entrypoints, wire DI, delegate to domain.

- **Event-driven**
  - All significant state changes emit events (EventBridge).
  - Consumers must be **idempotent**.
  - Services should not call each other directly across bounded contexts.

---

## 🗄 Data & Infrastructure Principles

- **DynamoDB single-table** design
  - Typed prefixes for keys (e.g., `TENANT#id`, `ALBUM#id`, `ORDER#id`).
  - Secondary indexes for album tree, images by album, orders by user.
  - TTL on carts and sessions.

- **EventBridge**
  - Domain events (`UserCreated`, `ImageUploaded`, `OrderPaid`, …).
  - Each event includes `id`, `type`, `occurredAt`, `tenantId`, and `payload`.

- **S3 & CloudFront**
  - S3 for asset storage (originals, derivatives).
  - Short-lived signed URLs for downloads.

- **IAM**
  - Enforce least privilege: Lambdas only access their table keys and bucket prefixes.

---

## 🌐 Environments & Deployment

- **Environments**: Environment is derived from git branch name. The git branch `main` gives enviroment `prod`, any other git branch gives an environment with the git branch name. If the branch name contains 'path separators' (as in `feat/some-feature`), the last segment is the environment name (so, `feat/some-feature` gives the environment name `some-feature`). Name stacks/resources with an `env` suffix.
- **Resource names**: Do not assign explicit names to resources (such as the `BucketName` property of S3 buckets) unless required.
- **Base domains**: The deployment environment should have an environment variable FMORK_SITE_DOMAIN_NAME containing the base domain name. This domain is expected to be maintained in AWS Route 53 in the AWS account where the CDK deployment is performed.
- **Hostnames**: Standardize patterns:
  - API: `{env}-api.{base}`
  - Web app: `{env}-www.{base}`
  - Static assets: `{env}-cdn.{base}`
    **NOTE**: the `{env}-` prefix should be omitted for the `prod` environment.
- **Routing/Ingress**: CloudFront/APIGW/ALB terminate TLS and route to Lambdas (API). Use host-based routing (`api.*`, `backend.*`) and health checks (`/-/healthz`, `/-/readyz`).
- **TLS**: ACM certificates per zone; TLS 1.2+; HSTS for public hosts. Track certificate ownership and renewal windows.
- **Custom domains (tenants)**: Support optional CNAME to tenant host (`{tenant}.bff.{base}`). Require DNS validation flow and ownership checks.
- **Caching**: Define TTL defaults per path. No-cache for auth/session endpoints; short TTL for personalized responses; long TTL for static assets with immutable hashes.
- **Deployment strategy**: IaC-managed (e.g., CDK/Terraform). Prefer blue/green or canary for API. Record DNS TTLs to enable fast cutover/rollback.
- **Config & secrets**: Store env-scoped config in SSM Parameter Store; rotate secrets (see Security Practices). Never bake secrets into images/artifacts.
- **Observability**: Standardize logs/metrics/traces per env. Alert on DNS/SSL expiry, 5xx/error rates, latency SLOs.

---

## 🛠 Build & Artifacts (Option A)

- **Approach**: Prebuild deployable assets outside CDK, then point stacks at `infra/cdk/assets`.
- **Lambdas**: `scripts/build-artifacts.mjs` uses esbuild to bundle each `packages/*/src/functions/**/handler.ts` into a compact single file: `infra/cdk/assets/lambdas/<pkg>-<func>/index.js` (+ `.map`).
- **Web app**: Vite `build.outDir` honors `OUT_DIR` env var; root script places output in `infra/cdk/assets/web`.
- **CDK**: Use `lambda.Code.fromAsset('<path>')` and `handler: 'index.main'` with `Runtime.NODEJS_20_X` instead of `NodejsFunction` bundling.
- **Scripts**:
  - `pnpm run build:lambdas` → bundle Lambdas.
  - `pnpm run build:web` → builds SPA to `infra/cdk/assets/web`.
  - `pnpm run build:artifacts` → both of the above.
- **Source maps**: External source maps are emitted; set `NODE_OPTIONS=--enable-source-maps` in Lambda env.
- **Assets repo policy**: `infra/cdk/assets` is kept in repo but git‑ignored (`.gitkeep`) to avoid committing large binaries.

---

## 🎨 Style & Structure

- **Dependency Injection: Manual (no container)**
  - Do not use a DI container framework.
  - Create an `init.ts` in `src/` for each project (`bff`, `api`, `services`) that wires dependencies explicitly and returns singletons.
  - Pass dependencies through constructors and keep runtime instances to one per process where appropriate.

- **Frontend (React/Vite)**
  - React 18 + Vite + TypeScript (strict). Target modern browsers.
  - Use React MUI (Material‑UI) components.
  - Use MUI (Material‑UI) theming for styling.
  - Prepare theming enabling tenants to have custom themes.
  - Routing with `react-router-dom` for: `/auth/signin` (formerly `/login`), `/albums/:id`, `/cart`, `/checkout/result`.
  - API access via a typed fetch wrapper. Always send `credentials: 'include'` and an `X-CSRF-Token` header.
  - Configuration via Vite env (`VITE_BFF_BASE_URL`); in dev, set a Vite proxy to the API origin to simplify CORS and cookie forwarding.
  - Do not expose OIDC tokens in the browser. BFF issues and manages HttpOnly session cookies.

- **Handler philosophy**
  - API handlers should be **thin**.
  - Validate input with `zod`.
  - Delegate to domain services via ports.

- **Service responsibilities**
  - **API**: auth/session management, orchestration, aggregation, domain orchestration, event emission.
  - **Services**: vertical concerns (images, pricing, orders, analytics).

### Payment integrations

## The primary intended payment provider is Stripe, but the system should be prepared for being integrated to several payment providers.

## 🧪 Testing Rules

- **jest** for unit tests.
- All domain logic (pricing, order state machine, policies) must have tests.
- **LocalStack** for integration tests of repos and S3 flows.
- Contract tests for events (validate against schemas).

---

## 🔐 Security Practices

- HttpOnly, Secure, SameSite cookies for sessions.
- CSRF protection (header token or double-submit cookie).
- Input validation with zod for all external input.
- Rotate secrets (BFF JWT signing key) via SSM Parameter Store.
- Signed CloudFront/S3 URLs with short TTL for downloads.

---

## 📖 Documentation Discipline

- Update `docs/todo.md` when adding or completing features.
- Update `docs/architecture.c4.dsl` when changing system structure.
- Render/export diagrams for visibility when making major changes.
- Keep this `AGENTS.md` aligned with real-world decisions.

---

## ✅ Agent Workflow

When an AI agent generates code, it should:

1. **NEVER EVER RUN CDK DEPLOY**
2. **Check references** (`C4 DSL`, `todo.md`, `dynamo.md`, `events.md`).
3. **Update itself on** manual code changes, so that it does not overwrite and corrupt files.
4. **Follow coding rules** (strict TS, zod validation, async/await, no any).
5. **Respect architecture** (API → Services, ports, events).
6. **Produce tests** for new domain logic.
7. **Verify correctness** so that generated code does not contain errors. **ALWAYS** `scripts/build.sh` before a task is handed off in order to verify that nothing is broken. **Verify your working directory** before running the script. This script emits an ESLint TypeScript version warning: ignore this warning.
8. **Document** new features in `docs/` as needed.

---
