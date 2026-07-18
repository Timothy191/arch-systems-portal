#!/usr/bin/env bash
# Validate Agent Skills standard compliance for skills + agents (3-pass capable).
set -euo pipefail
ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$ROOT"

PASS="${1:-1}"
ERR=0
WARN=0

fail() { echo "  FAIL: $1"; ERR=$((ERR + 1)); }
warn() { echo "  WARN: $1"; WARN=$((WARN + 1)); }
ok()   { echo "  OK: $1"; }

echo "=== Agent Skills validate (pass $PASS) ==="

# --- Standard library ---
STANDARD_DIR=".cursor/standards/agent-skills"
if [[ ! -f "$STANDARD_DIR/STANDARD.md" ]]; then
  fail "missing $STANDARD_DIR/STANDARD.md"
else
  ok "STANDARD.md present"
fi

ref_count=$(find "$STANDARD_DIR/references" -maxdepth 1 -name '*.md' | wc -l)
if [[ "$ref_count" -lt 16 ]]; then
  fail "expected 16 reference files, found $ref_count"
else
  ok "16 reference sections present ($ref_count files)"
fi

[[ -f "$STANDARD_DIR/assets/tool-paths.json" ]] && ok "tool-paths.json" || fail "missing tool-paths.json"

# --- Skills ---
for base in .cursor/skills .qoder/skills .github/skills; do
  [[ -d "$base" ]] || continue
  for dir in "$base"/*/; do
    [[ -d "$dir" ]] || continue
    name=$(basename "$dir")
    [[ "$name" == "README.md" ]] && continue
    skill_md="${dir}SKILL.md"
    if [[ ! -f "$skill_md" ]]; then
      fail "$name: missing SKILL.md"
      continue
    fi
    head -20 "$skill_md" | grep -q '^name:' || fail "$name: missing name in frontmatter"
    head -30 "$skill_md" | grep -q '^description:' || fail "$name: missing description in frontmatter"
    if grep -qE '(^|/)scripts/' "$skill_md" && [[ ! -d "${dir}scripts" ]]; then
      warn "$name: SKILL.md references scripts/ but directory missing"
    fi
    # Vendored/community skills may exceed lean limit
    if [[ "$name" != awesome-copilot--* ]] && [[ $(wc -l < "$skill_md") -gt 80 ]]; then
      warn "$name: SKILL.md >80 lines — move detail to references/"
    fi
  done
done
ok "skill folders scanned"

# --- Agents ---
for agent in .cursor/agents/*.md; do
  [[ -f "$agent" ]] || continue
  base=$(basename "$agent")
  [[ "$base" == "README.md" ]] && continue
  grep -q 'Gold Standard Contract' "$agent" || fail "$base: missing Gold Standard Contract"
  grep -qi 'anti-trigger' "$agent" || fail "$base: missing anti-triggers in description"
  grep -q 'Agent Skills Standard' "$agent" || fail "$base: missing Agent Skills Standard section"
  grep -q 'Next owner:' "$agent" || warn "$base: no Next owner in output format"
done
ok "agents scanned"

# --- Indexes ---
for idx in .cursor/skills/README.md .qoder/skills/README.md .github/skills/README.md; do
  [[ -f "$idx" ]] && ok "$(basename $(dirname $idx))/README.md" || warn "missing $idx"
done

echo ""
echo "Pass $PASS complete: $ERR error(s), $WARN warning(s)"
[[ $ERR -eq 0 ]]
