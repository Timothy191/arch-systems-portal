#!/usr/bin/env bash
# Open follow-log terminals for local monitoring (best-effort).
# Usage: bash scripts/open-monitoring-terminals.sh
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PORTAL_LOG="${REPO_ROOT}/portal.log"
STUDIO_URL="http://127.0.0.1:54323"

DIM='\033[0;2m'; GREEN='\033[0;32m'; YELLOW='\033[0;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'

open_cmd() {
  local title="$1"
  local cmd="$2"

  if command -v kitty >/dev/null 2>&1; then
    kitty --title "$title" -e bash -lc "$cmd" >/dev/null 2>&1 &
    return 0
  fi
  if command -v gnome-terminal >/dev/null 2>&1; then
    gnome-terminal --title="$title" -- bash -lc "$cmd; exec bash" >/dev/null 2>&1 &
    return 0
  fi
  if command -v konsole >/dev/null 2>&1; then
    konsole -p tabtitle="$title" -e bash -lc "$cmd; exec bash" >/dev/null 2>&1 &
    return 0
  fi
  if command -v x-terminal-emulator >/dev/null 2>&1; then
    x-terminal-emulator -T "$title" -e bash -lc "$cmd; exec bash" >/dev/null 2>&1 &
    return 0
  fi
  return 1
}

opened=0

if open_cmd "Arch portal.log" "tail -F '${PORTAL_LOG}'"; then
  opened=$((opened + 1))
fi
if open_cmd "Arch Redis" "docker logs -f arch-redis"; then
  opened=$((opened + 1))
fi
if open_cmd "Arch Supabase Kong" "docker logs -f supabase_kong_supabase"; then
  opened=$((opened + 1))
fi

if [ "$opened" -gt 0 ]; then
  echo -e "  ${GREEN}${BOLD}✓${NC} Opened ${opened} monitoring terminal(s)"
  echo -e "  ${DIM}Studio:${NC} ${CYAN}${STUDIO_URL}${NC}"
  exit 0
fi

echo -e "  ${YELLOW}${BOLD}⚠${NC} No terminal emulator found — monitoring URLs:"
echo -e "  ${BOLD}Portal log:${NC}  ${CYAN}${PORTAL_LOG}${NC}"
echo -e "  ${BOLD}Redis:${NC}       ${CYAN}docker logs -f arch-redis${NC}"
echo -e "  ${BOLD}Supabase:${NC}    ${CYAN}docker logs -f supabase_kong_supabase${NC}"
echo -e "  ${BOLD}Studio:${NC}      ${CYAN}${STUDIO_URL}${NC}"
exit 0
