#!/bin/bash
set -euo pipefail

format_duration() {
  local total_seconds="$1"
  local hours=$(( total_seconds / 3600 ))
  local minutes=$(( (total_seconds % 3600) / 60 ))
  local seconds=$(( total_seconds % 60 ))
  printf '%02dh:%02dm:%02ds' "$hours" "$minutes" "$seconds"
}

measure_block() {
  local label="$1"
  shift
  local start
  start=$(date +%s)
  "$@"
  local end
  end=$(date +%s)
  local duration=$(( end - start ))
  echo "$label took $(format_duration "$duration")"
  return 0
}

# Always run from the repo root
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$REPO_ROOT"

echo "GitHub Access Token is set: ${GITHUB_ACCESS_TOKEN:+yes}"


# Install workspace dependencies deterministically (single pass)
pnpm install --frozen-lockfile --prefer-offline

# Lint the codebase (fail on any warnings)
lint_build_start=$(date +%s)
pnpm -w run lint

# Build TypeScript projects in topological order via project references
pnpm -w run typecheck

# Build all packages and web (in parallel where possible)
pnpm -w run build
lint_build_end=$(date +%s)
lint_build_duration=$(( lint_build_end - lint_build_start ))
echo "Lint + Typecheck + Build took $(format_duration "$lint_build_duration")"

# Run tests (packages only; web uses vitest separately)
# Run Jest in-band to reduce intermittent worker-exit / leaked handle warnings in CI
# Run Jest directly in-band to avoid passing extra literal arguments via pnpm run
tests_start=$(date +%s)
pnpm -w exec -- jest -c jest.config.ts --runInBand
tests_end=$(date +%s)
tests_duration=$(( tests_end - tests_start ))
echo "Tests took $(format_duration "$tests_duration")"
