#!/usr/bin/env bash
set -euo pipefail
cd "$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
echo "=== Never-do spot check ==="
rg -n "Never use npm|pnpm 9|use client" .cursor/rules .qoder/rules AGENTS.md CLAUDE.md 2>/dev/null | head -20 || true
echo ""
echo "=== Layout validators ==="
.cursor/standards/agent-layout/scripts/validate-agents.sh
.cursor/standards/agent-skills/scripts/validate.sh
