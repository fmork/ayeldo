#!/usr/bin/env bash
# Wrapper to run eslint and hide the known multi-line TypeScript-version warning
# while preserving eslint's exit code.
set -eo pipefail

TMP_OUT=$(mktemp)
trap 'rm -f "$TMP_OUT"' EXIT

# Run eslint and capture combined output
eslint . --ext .ts,.tsx --max-warnings 0 > "$TMP_OUT" 2>&1 || true
EC=$?

# Remove the multi-line TypeScript version warning block (if present) and print the rest to stderr
sed '/^WARNING: You are currently running a version of TypeScript which is not officially supported by @typescript-eslint\/typescript-estree\./,/^Please only submit bug reports when using the officially supported version\.$/d' "$TMP_OUT" >&2 || true

exit $EC
