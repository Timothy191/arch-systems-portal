#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────────────
# Arch-Systems — Dev Script
# Starts Docker infrastructure (Redis + Postgres) + Next.js portal with HMR,
# runs a 4-phase health check, then opens the browser to the login page.
#
# Usage:
#   bash scripts/dev.sh              # Full stack
#   bash scripts/dev.sh --quick      # Portal only (skip Docker)
#   bash scripts/dev.sh --no-infra   # Skip docker-compose, assume infra is up
# ──────────────────────────────────────────────────────────────────────────────
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PORT="${PORT:-3000}"

# ── Colours ───────────────────────────────────────────────────────────────────
DIM='\033[0;2m'
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
BOLD='\033[1m'
NC='\033[0m'

PASS="${GREEN}${BOLD}  ✓${NC}"
FAIL="${RED}${BOLD}  ✗${NC}"
WARN="${YELLOW}${BOLD}  ⚠${NC}"
SKIP="${YELLOW}${BOLD}  –${NC}"
INFO="${CYAN}${BOLD}  →${NC}"

# ── Helpers ───────────────────────────────────────────────────────────────────
phase() { echo; echo -e "  ${BOLD}${MAGENTA}━━━  Phase $1: $2  ━━━${NC}"; }

check() {
  local label="$1" status="$2" detail="${3:-}"
  case "$status" in
    pass) echo -e "  ${PASS} ${label}${detail:+  ${DIM}${detail}${NC}}" ;;
    fail) echo -e "  ${FAIL} ${label}${detail:+  ${RED}${detail}${NC}}" ;;
    warn) echo -e "  ${WARN} ${label}${detail:+  ${YELLOW}${detail}${NC}}" ;;
    skip) echo -e "  ${SKIP} ${label}${detail:+  ${DIM}${detail}${NC}}" ;;
  esac
}

spinner() {
  local pid=$1 msg="$2"
  local frames=('◐' '◓' '◑' '◒')
  local i=0
  while kill -0 "$pid" 2>/dev/null; do
    printf "\r  ${CYAN}${frames[$i]}${NC} %s... " "$msg"
    i=$(( (i+1) % 4 ))
    sleep 0.2
  done
  printf "\r  ${GREEN}◉${NC} %-40s\n" "$msg"
}

wait_for_url() {
  local url="$1" max="${2:-60}" delay="${3:-2}"
  for _ in $(seq 1 "$max"); do
    curl -fs "$url" -o /dev/null -w "%{http_code}" 2>/dev/null | grep -qE "^(200|301|302|307|308)$" && return 0
    sleep "$delay"
  done
  return 1
}

wait_for_port() {
  local port="$1" max="${2:-30}"
  for _ in $(seq 1 "$max"); do
    ss -tlnH 2>/dev/null | grep -qE ":${port} " && return 0
    sleep 1
  done
  return 1
}

detect_compose() {
  if docker compose version >/dev/null 2>&1; then echo "docker compose"
  elif command -v docker-compose >/dev/null 2>&1; then echo "docker-compose"
  else echo "docker compose"
  fi
}

open_browser() {
  # Shared helper: prefers Chromium/Brave/Firefox, logs success/failure
  bash "$REPO_ROOT/scripts/open-login.sh" "$PORT" || true
}

cleanup() {
  echo
  echo -e "  ${YELLOW}Shutting down portal...${NC}"
  if [ -f "$REPO_ROOT/.portal.pid" ]; then
    kill "$(cat "$REPO_ROOT/.portal.pid")" 2>/dev/null || true
    rm -f "$REPO_ROOT/.portal.pid" "$REPO_ROOT/.portal.start"
  fi
}
trap cleanup EXIT INT TERM

banner() {
  clear 2>/dev/null || true
  echo
  echo -e "  ${BOLD}${CYAN}  ╔═══════════════════════════════════════╗${NC}"
  echo -e "  ${BOLD}${CYAN}  ║   Arch Systems — Dev Server           ║${NC}"
  echo -e "  ${BOLD}${CYAN}  ╚═══════════════════════════════════════╝${NC}"
  echo
  echo -e "  ${DIM}$(date '+%a %b %d %Y  %H:%M')${NC}"
  echo
}

show_results() {
  echo
  echo -e "  ${GREEN}${BOLD}┌─────────────────────────────────────────────┐${NC}"
  echo -e "  ${GREEN}${BOLD}│  All systems go — edit any file for HMR     │${NC}"
  echo -e "  ${GREEN}${BOLD}└─────────────────────────────────────────────┘${NC}"
  echo
  echo -e "  ${BOLD}Login:${NC}      ${CYAN}http://localhost:${PORT}/login${NC}"
  echo -e "  ${BOLD}Dashboard:${NC}  ${CYAN}http://localhost:${PORT}/dashboard${NC}"
  echo -e "  ${BOLD}Health:${NC}     ${CYAN}http://localhost:${PORT}/api/health${NC}"
  if [ "$QUICK_MODE" = "false" ]; then
    echo -e "  ${BOLD}Postgres:${NC}   ${CYAN}localhost:5432  (db: arch_dev, user: postgres)${NC}"
    echo -e "  ${BOLD}Redis:${NC}      ${CYAN}localhost:6379${NC}"
  fi
  echo
  echo -e "  ${DIM}Stop with Ctrl+C${NC}"
  echo
}

# ── Arg parsing ───────────────────────────────────────────────────────────────
QUICK_MODE=false
NO_INFRA=false
while [ $# -gt 0 ]; do
  case "$1" in
    --quick|-q)    QUICK_MODE=true; shift ;;
    --no-infra)    NO_INFRA=true;   shift ;;
    *)             shift ;;
  esac
done

COMPOSE_CMD=$(detect_compose)

# ══════════════════════════════════════════════════════════════════════════════
banner

# ── Phase 0: Pre-flight ───────────────────────────────────────────────────────
phase 0 "Pre-flight"

# Clean stale PID / start marker if portal is no longer alive
if [ -f "$REPO_ROOT/.portal.pid" ]; then
  if ! kill -0 "$(cat "$REPO_ROOT/.portal.pid")" 2>/dev/null; then
    rm -f "$REPO_ROOT/.portal.pid" "$REPO_ROOT/.portal.start"
    check "Stale portal PID" "pass" "cleaned"
  else
    check "Portal process" "pass" "PID $(cat "$REPO_ROOT/.portal.pid") already running"
  fi
fi

# Clear port if occupied by a non-Docker process
if ss -tlnH 2>/dev/null | grep -qE ":${PORT} "; then
  if docker ps --format '{{.Ports}}' 2>/dev/null | grep -qE ":${PORT}->"; then
    check "Port ${PORT}" "pass" "in use by Docker (expected)"
  else
    pid=$(lsof -ti :"$PORT" 2>/dev/null | head -n1 || true)
    if [ -n "$pid" ]; then
      kill "$pid" 2>/dev/null || true
      sleep 1
      check "Port ${PORT}" "pass" "freed (killed PID $pid)"
    else
      check "Port ${PORT}" "warn" "occupied, PID unknown — continuing"
    fi
  fi
else
  check "Port ${PORT}" "pass" "free"
fi

# Rotate portal log
if [ -f "$REPO_ROOT/portal.log" ]; then
  : > "$REPO_ROOT/portal.log"
  check "Portal log" "pass" "rotated"
fi

# ── Phase 1: Environment ──────────────────────────────────────────────────────
phase 1 "Environment"

env_ok=true
node -v >/dev/null 2>&1 && check "Node.js" "pass" "$(node -v)" || { check "Node.js" "fail" "not found — install Node 22+"; env_ok=false; }
pnpm -v >/dev/null 2>&1 && check "pnpm"    "pass" "v$(pnpm -v)"  || { check "pnpm"    "fail" "not found — run: corepack enable"; env_ok=false; }

if [ "$QUICK_MODE" = "true" ]; then
  check "Docker" "skip" "quick mode"
else
  docker info >/dev/null 2>&1 && check "Docker" "pass" || { check "Docker" "warn" "not running — infrastructure will be skipped"; NO_INFRA=true; }
fi

# Ensure apps/portal env file exists
if [ ! -f "$REPO_ROOT/apps/portal/.env.local" ] && [ ! -f "$REPO_ROOT/apps/portal/.env" ]; then
  if [ -f "$REPO_ROOT/apps/portal/.env.example" ]; then
    cp "$REPO_ROOT/apps/portal/.env.example" "$REPO_ROOT/apps/portal/.env.local"
    check "Portal .env.local" "pass" "created from .env.example"
    check "Secrets" "warn" "fill in SUPABASE keys in apps/portal/.env.local"
  else
    check "Portal .env.local" "fail" "missing — create apps/portal/.env.local"
    env_ok=false
  fi
else
  check "Portal .env.local" "pass" "exists"
fi

# Install dependencies if node_modules absent
if [ ! -d "$REPO_ROOT/node_modules" ]; then
  echo -e "  ${INFO} Installing dependencies (first run)..."
  pnpm install --frozen-lockfile 2>&1 | tail -3 | sed 's/^/    /'
  check "Dependencies" "pass" "installed"
else
  check "Dependencies" "pass" "node_modules present"
fi

[ "$env_ok" = "false" ] && { echo -e "\n  ${RED}Environment checks failed. Fix the above and re-run.${NC}\n"; exit 1; }

# ── Phase 2: Infrastructure ───────────────────────────────────────────────────
phase 2 "Infrastructure"

if [ "$QUICK_MODE" = "true" ] || [ "$NO_INFRA" = "true" ]; then
  check "Docker Compose" "skip" "$([ "$QUICK_MODE" = 'true' ] && echo 'quick mode' || echo '--no-infra')"
  check "Redis"          "skip"
  check "Postgres"       "skip"
else
  # Bring up compose stack in background
  echo -e "  ${INFO} Starting Docker Compose stack..."
  $COMPOSE_CMD -f "$REPO_ROOT/docker-compose.yml" up -d >/dev/null 2>&1 &
  compose_pid=$!
  spinner "$compose_pid" "Booting containers"

  # Redis health
  if wait_for_port 6379 20; then
    check "Redis" "pass" "localhost:6379"
  else
    check "Redis" "warn" "not responding on 6379 — check docker ps"
  fi

  # Postgres health
  if wait_for_port 5432 20; then
    check "Postgres" "pass" "localhost:5432  (arch_dev)"
  else
    check "Postgres" "warn" "not responding on 5432 — check docker ps"
  fi
fi

# ── Phase 3: Portal ───────────────────────────────────────────────────────────
phase 3 "Portal"

# Skip restart if portal is already serving
if [ -f "$REPO_ROOT/.portal.pid" ] && kill -0 "$(cat "$REPO_ROOT/.portal.pid")" 2>/dev/null; then
  check "Dev server" "pass" "already running on :${PORT}"
else
  cd "$REPO_ROOT/apps/portal"
  PORT="$PORT" pnpm dev > "$REPO_ROOT/portal.log" 2>&1 &
  echo $! > "$REPO_ROOT/.portal.pid"
  cd "$REPO_ROOT"
  echo -e "  ${INFO} Starting Next.js on :${PORT} (Turbopack)..."

  compiled=false
  for _ in $(seq 1 120); do
    # Check for successful compile
    if curl -fs "http://localhost:${PORT}/login" -o /dev/null -w "%{http_code}" 2>/dev/null | grep -qE "^(200|307|308)$"; then
      compiled=true; break
    fi
    # Bail early only if the portal process died or login route itself failed to compile
    if [ -f "$REPO_ROOT/.portal.pid" ] && ! kill -0 "$(cat "$REPO_ROOT/.portal.pid")" 2>/dev/null; then
      break
    fi
    if grep -qiE "⨯.*(/login|app/\(auth\)/login).*Failed to compile|Error: Cannot find module" "$REPO_ROOT/portal.log" 2>/dev/null; then
      break
    fi
    sleep 2
  done

  if [ "$compiled" = "true" ]; then
    date +%s > "$REPO_ROOT/.portal.start"
    check "Dev server" "pass" "http://localhost:${PORT}"
  else
    check "Dev server" "fail" "did not come up within 4 minutes"
    echo -e "\n  ${RED}Last 25 lines of portal.log:${NC}"
    tail -25 "$REPO_ROOT/portal.log" 2>/dev/null | sed 's/^/    /'
    exit 1
  fi
fi

# ── Phase 4: Smoke Tests ──────────────────────────────────────────────────────
phase 4 "Smoke Tests"

# Health API
if curl -fs "http://localhost:${PORT}/api/health" >/dev/null 2>&1; then
  check "/api/health" "pass"
else
  check "/api/health" "warn" "endpoint not responding"
fi

# Login page HTML
if curl -fs "http://localhost:${PORT}/login" 2>/dev/null | grep -qi "<html\|<!doctype"; then
  check "Login page HTML" "pass"
else
  check "Login page HTML" "warn" "may be rendering an error overlay"
fi

# Static assets
curl -fs "http://localhost:${PORT}/favicon.ico" >/dev/null 2>&1 \
  && check "Static assets" "pass" \
  || check "Static assets" "skip" "no favicon yet"

# ── Done ──────────────────────────────────────────────────────────────────────
show_results
open_browser

# Keep script alive so cleanup trap fires on Ctrl+C
wait
