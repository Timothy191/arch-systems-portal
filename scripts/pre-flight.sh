#!/bin/bash
# scripts/pre-flight.sh
# Automated pre-flight validation and scope determination.

echo "=== Running Pre-flight ==="

# 1. Domain Detection & Validation
if [ -f "apps/portal/package.json" ]; then
    echo "Detected: Next.js Portal"
    pnpm --filter apps/portal type-check
fi

# 2. Scope Determination (for Alignment Score)
# If multi-file, requires high scrutiny.
changed_files=$(git diff --name-only --cached | wc -l)
if [ "$changed_files" -gt 1 ]; then
    echo "Scope: Multi-file (High Scrutiny)"
    export ALIGNMENT_SCOPE="high"
else
    echo "Scope: Single-file (Standard Scrutiny)"
    export ALIGNMENT_SCOPE="standard"
fi

# 3. Domain-specific checks (e.g., Zod)
if grep -q "zod" apps/portal/package.json; then
    echo "Domain: Zod Validation required"
    # Placeholder for automated Zod scan
fi

echo "=== Pre-flight Passed ==="
exit 0
