#!/usr/bin/env bash
# merge_skills.sh — Synchronize skills from .github/skills into .agentic-tools-mcp/agents/skills
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SRC="$REPO_ROOT/.github/skills"
DST="$REPO_ROOT/.agentic-tools-mcp/agents/skills"
MERGED=0

echo "=== Merging skills from $SRC -> $DST ==="

for skill_dir in "$SRC"/*/; do
  [ -d "$skill_dir" ] || continue
  skill_name=$(basename "$skill_dir")
  target="$DST/$skill_name"
  if [ -d "$target" ]; then
    # Update existing — copy SKILL.md if newer
    if [ -f "$skill_dir/SKILL.md" ]; then
      cp -u "$skill_dir/SKILL.md" "$target/SKILL.md" 2>/dev/null || true
    fi
    # Copy any scripts/ and assets/ subdirs
    for sub in scripts assets resources references; do
      if [ -d "$skill_dir/$sub" ]; then
        mkdir -p "$target/$sub"
        cp -ru "$skill_dir/$sub/"* "$target/$sub/" 2>/dev/null || true
      fi
    done
    echo "  UPDATED: $skill_name"
  else
    # New skill — full copy
    cp -r "$skill_dir" "$target"
    echo "  ADDED: $skill_name"
  fi
  MERGED=$((MERGED + 1))
done

echo "=== Merge complete: $MERGED skills synced ==="

# Sync README if present
if [ -f "$SRC/README.md" ]; then
  cp "$SRC/README.md" "$DST/../README.md" 2>/dev/null || true
fi
