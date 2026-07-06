#!/usr/bin/env bash
# cleanup.sh — Remove orphaned/stale directories and cache files
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
echo "=== Arch-Mk2 Cleanup ==="

# Remove known orphan directories
ORPHANS=(
  "$REPO_ROOT/.kilo"
  "$REPO_ROOT/.cache/aistack"
)

for dir in "${ORPHANS[@]}"; do
  if [ -d "$dir" ]; then
    echo "  Removing: $dir"
    rm -rf "$dir"
  fi
done

# Clean turbo cache > 7 days old
if [ -d "$REPO_ROOT/.turbo" ]; then
  echo "  Pruning stale turbo cache..."
  find "$REPO_ROOT/.turbo" -type f -name "*.tar.zst" -mtime +7 -delete 2>/dev/null || true
fi

# Clean Next.js caches
for dir in "$REPO_ROOT"/apps/*/.next/cache; do
  [ -d "$dir" ] || continue
  echo "  Clearing: $dir"
  rm -rf "$dir"
done

# Clean logs
for f in "$REPO_ROOT"/*.log; do
  [ -f "$f" ] || continue
  SIZE=$(stat -c%s "$f" 2>/dev/null || echo 0)
  if [ "$SIZE" -gt 10485760 ]; then
    echo "  Truncating large log: $(basename "$f") ($((SIZE/1048576))MB)"
    > "$f"
  fi
done

echo "=== Cleanup complete ==="
