#!/bin/bash
set -euo pipefail

echo "GitHub Access Token is set: ${GITHUB_ACCESS_TOKEN:+yes}"

# Install workspace dependencies deterministically (single pass)
pnpm install --frozen-lockfile --prefer-offline

# Lint the codebase (fail on any warnings)
pnpm run lint

# Build TypeScript projects in topological order via project references
pnpm run typecheck

# Run tests (packages only; web uses vitest separately)
pnpm run test
