#!/usr/bin/env bash

# pre-commit hook template
# To activate: copy this to .git/hooks/pre-commit and make it executable (chmod +x)

set -e

echo "Running pre-commit quality gate checks..."

# 1. Format Check
echo "Checking formatting..."
pnpm format:check

# 2. Lint Check
echo "Running linter..."
pnpm lint

# 3. Row Level Security Audit
# Mandatory for database package updates
if git diff --cached --name-only | grep -E '^packages/database/migrations/'; then
  echo "Database migration detected. Verifying Row Level Security (RLS)..."
  pnpm audit:rls
fi

echo "All pre-commit checks passed successfully!"
exit 0
