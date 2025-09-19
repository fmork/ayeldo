# Environment variable exceptions — process.env usages kept intentionally

This document lists locations in the repository that intentionally keep reading directly from `process.env` rather than via `SiteConfiguration`.

Goal

- Keep a clear, auditable list of files where `process.env` is an accepted exception. This helps future contributors understand why a direct env access exists and what considerations (synth-time vs runtime) apply.

Why we leave some files using process.env

- There are two broad contexts where reading `process.env` directly is a valid choice:
  1. Synth-time / infra scripts (CDK/bin) — these run during synth/deploy and need plain environment values; constructing application runtime objects (like `SiteConfiguration`) inside CDK synth can create circular assumptions or conflate infra-time and runtime configuration.
  2. Build/CLI entrypoints — scripts that drive the build, generate artifacts, or compute derived values may run outside of the app runtime and therefore can't rely on runtime-only abstractions that expect Node server/lambda environment shapes.

Rules of thumb

- Runtime code (lambda handlers, API servers, services) should use `SiteConfiguration` as the single source of truth for runtime configuration.
- Synth-time infra code (CDK stacks, CDK bin/app entrypoints, infra utility scripts) may continue to read `process.env` directly.
- Tests may set `process.env` when they bootstrap environment before constructing `SiteConfiguration` — this is acceptable.

Files intentionally left using `process.env`

The following files / areas were reviewed and intentionally kept reading `process.env` directly. They are listed with rationale and suggested notes for future migrations.

- infra/cdk/bin/app.ts
  - Rationale: CDK app entrypoint. Reads `ENV_NAME`, branch name, account/region for synth. These are synth-time inputs.
  - Note: If you want to centralize these values, consider a small infra-only config helper that reads `process.env` and exposes typed values; do not import runtime `SiteConfiguration` here.

- infra/cdk/bin/cdk.ts
  - Rationale: CLI wrapper used for CDK commands and contexts. Reads branch/env variables for env name resolution.

- infra/cdk/src/api-stack.ts
  - Rationale: Stack construction sets environment defaults (for synthesised Lambda envs) and uses `process.env` to seed values. Constructing `SiteConfiguration` here is acceptable when you ensure only synth-safe fields are used — but we prefer keeping direct env reads for clarity.

- infra/cdk/src/domain.ts
  - Rationale: Domain computation during synth uses `FMORK_SITE_DOMAIN_NAME` and friends; this is an infra-time concern.

- infra/cdk/bin/\* (other CDK entrypoints)
  - Rationale: Various CDK entrypoints and scripts that drive synths.

- scripts/\* (build.sh, deploy.sh, etc.)
  - Rationale: Shell scripts and Node CLI helpers are build-time tooling and may rely on `process.env` or environment variables set in CI. If these scripts grow complex, add a small infra config helper inside `infra/`.

- packages/utils/src/env.ts
  - Rationale: Utility that merges and validates process.env with zod for various packages (kept as a utilities helper; runtime code should still prefer SiteConfiguration where appropriate).

- apps/web/vite.config.ts
  - Rationale: Vite config runs at build time and uses envs like OUT_DIR / VITE_OUT_DIR. These are build-time bits and not part of app runtime.

Files migrated to use SiteConfiguration (not exceptions)

- packages/api/src/init/\* — server, infrastructure, authServices, config, controllers
  - Status: Migrated to prefer `siteConfig` grouped getters. Some small typed process.env fallbacks remain where the call site explicitly permitted env overrides (e.g., OIDC_JWKS_URL, OIDC_AUTH_URL overrides).
  - Note: Tests still set `process.env` during bootstrap to ensure `new SiteConfiguration()` sees values — this remains the recommended pattern for tests.

Recommendations for contributors

- Before changing a file that reads `process.env` directly, ask: is this file running at synth/build-time or at app runtime?
  - If synth/build-time: prefer keeping `process.env` usage, or add an infra-only typed helper inside `infra/`.
  - If app runtime: migrate to `SiteConfiguration` (or `siteConfig` factory in package-local init) so there is one canonical source for runtime configuration.

- When adding new env-driven behavior in runtime code, add accompanying unit tests that set `process.env` as needed and then construct `new SiteConfiguration()` to validate behavior.

- If you see a direct `process.env` in runtime code, open a PR to move it to `SiteConfiguration` and include a small migration note in the PR description.

Maintenance

- Keep this document up-to-date when performing future migrations. If a file is migrated away from `process.env`, remove it from this list.

---

If you'd like, I can (optionally):

- Produce a short script that lists `process.env` occurrences and marks which of them are in infra vs runtime directories (helpful for audits).
- Start the stricter repo-wide migration of all `process.env` occurrences (including infra) — but that will be more invasive and may require separate infra-only config helpers.
