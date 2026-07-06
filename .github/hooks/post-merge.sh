#!/usr/bin/env bash

# post-merge hook template to sync dependencies and index structures after pull/merge

# 1. Update dependencies if package.json or pnpm-lock.yaml changed
if git diff-tree -r --name-only --no-commit-id ORIG_HEAD HEAD | grep -qE 'package.json|pnpm-lock.yaml'; then
  echo "Dependencies changed. Running pnpm install..."
  pnpm install
fi

# 2. Sync codebase indexing
echo "Updating Repowise index..."
/home/timothy/.local/bin/repowise update -w --index-only
