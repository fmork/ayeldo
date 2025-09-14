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

Put functionality into well-designed, focused classes. Inject depedencies through constructors, follwing the following pattern:

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

### Logging

Use the `ILogWriter` interface from `@fmork/backend-core` for all logging. Instantiate loggers via `@ayeldo/utils`' pino-backed adapter (`createRootLogger`) and create request-scoped child loggers with `withRequestId(logger, requestId)`.

### Outgoing HTTP requests

Code that needs to make HTTP requests should take a dependency on `HttpClient` from `@fmork/backend-core`. The type is described in `docs/type-snapshots/HttpClient.d.ts`.

- Backend (BFF/API/Services): inject an `HttpClient` implementation (Axios or fetch/undici-based) via manual DI.
- Frontend (Web/Vite): use a small typed fetch wrapper that calls only the BFF with `credentials: 'include'` and an `X-CSRF-Token` header.

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

- **BFF pattern**
  - Browser never sees OIDC tokens.
  - BFF performs token exchange and issues HttpOnly session cookies.
  - BFF calls Domain API using internal auth (signed JWT or API key).

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
  - Routing with `react-router-dom` for: `/login`, `/albums/:id`, `/cart`, `/checkout/result`.
  - API access via a typed fetch wrapper that talks only to the BFF. Always send `credentials: 'include'` and an `X-CSRF-Token` header.
  - Configuration via Vite env (`VITE_BFF_BASE_URL`); in dev, set a Vite proxy to the BFF origin to simplify CORS and cookie forwarding.
  - Do not expose OIDC tokens in the browser. BFF issues and manages HttpOnly session cookies.

- **Handler philosophy**
  - BFF and API handlers should be **thin**.
  - Validate input with `zod`.
  - Delegate to domain services via ports.

- **Service responsibilities**
  - **BFF**: auth/session management, orchestration, aggregation.
  - **API**: domain orchestration, event emission.
  - **Services**: vertical concerns (images, pricing, orders, analytics).

---

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

When Codex (or another AI agent) generates code, it should:

1. **Check references** (`C4 DSL`, `todo.md`, `dynamo.md`, `events.md`).
2. **Follow coding rules** (strict TS, zod validation, async/await, no any).
3. **Respect architecture** (BFF → API → Services, ports, events).
4. **Produce tests** for new domain logic.
5. **Verify correctness** so that generated code does not contain errors. Run `scripts/build.sh` to verify that nothing is broken.
6. **Document** new features in `docs/` as needed.

---
