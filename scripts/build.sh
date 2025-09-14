#!/bin/bash
set -euo pipefail

# Install workspace dependencies deterministically (single pass)
pnpm install --frozen-lockfile --prefer-offline

# Lint the codebase (fail on any warnings)
pnpm run lint

# Build TypeScript projects in topological order via project references
pnpm run typecheck

# Prebuild deployment artifacts (Lambdas + web assets)
pnpm run build:artifacts

# Run tests (packages only; web uses vitest separately)
pnpm run test
