#!/bin/bash
set -e

pnpm -r install
pnpm build
pnpm run test
