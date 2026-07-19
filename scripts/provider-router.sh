#!/usr/bin/env bash
# pnpm provider:route — wrapper for the provider-router skill
set -euo pipefail
cd "$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
exec .cursor/skills/provider-router/scripts/provider-router.sh "$@"
