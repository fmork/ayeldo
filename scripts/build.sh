#!/bin/bash
set -euo pipefail

# Always run from the repo root
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$REPO_ROOT"

echo "GitHub Access Token is set: ${GITHUB_ACCESS_TOKEN:+yes}"

# Install workspace dependencies deterministically (single pass)
pnpm install --frozen-lockfile --prefer-offline

# Lint the codebase (fail on any warnings)
pnpm -w run lint

# Build TypeScript projects in topological order via project references
pnpm -w run typecheck

# Run tests (packages only; web uses vitest separately)
pnpm -w run test
