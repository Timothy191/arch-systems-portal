#!/usr/bin/env bash
# ══════════════════════════════════════════════════════════════════════════════
# Arch-Systems — deploy-dev-mode.sh
#
# One-command local dev deployment. Clones the repo (if needed), installs
# deps, validates the environment, boots infrastructure, and starts the
# Next.js portal with HMR — all in a single shot.
#
# Usage (from any directory):
#   bash deploy-dev-mode.sh [OPTIONS]
#
# Options:
#   --quick       Skip Docker / Compose; start portal only
#   --no-infra    Assume Docker Compose is already up; skip bring-up
#   --clean       Wipe .next caches before starting
#   --port PORT   Override portal port (default: 3000)
#   --help        Show this message
#
# pnpm run deploy:dev  (alias registered in root package.json)
# ══════════════════════════════════════════════════════════════════════════════
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$SCRIPT_DIR"

# ── Colours ───────────────────────────────────────────────────────────────────
DIM='\033[0;2m'; RED='\033[0;31m'; GREEN='\033[0;32m'
YELLOW='\033[0;33m'; CYAN='\033[0;36m'; MAGENTA='\033[0;35m'
BOLD='\033[1m'; NC='\033[0m'

OK="${GREEN}${BOLD}  ✓${NC}"; ERR="${RED}${BOLD}  ✗${NC}"
WARN="${YELLOW}${BOLD}  ⚠${NC}"; INFO="${CYAN}${BOLD}  →${NC}"
STEP="${MAGENTA}${BOLD}"

step() { echo; echo -e "  ${STEP}▶  $1${NC}"; }
ok()   { echo -e "  ${OK} $1${DIM}${2:+  $2}${NC}"; }
err()  { echo -e "  ${ERR} $1${RED}${2:+  $2}${NC}"; }
warn() { echo -e "  ${WARN} $1${YELLOW}${2:+  $2}${NC}"; }
info() { echo -e "  ${INFO} $1"; }
die()  { err "$1"; echo; exit 1; }

banner() {
  clear 2>/dev/null || true
  echo
  echo -e "  ${BOLD}${CYAN}╔══════════════════════════════════════════════════╗${NC}"
  echo -e "  ${BOLD}${CYAN}║   Arch Systems  ·  Local Dev Deployment          ║${NC}"
  echo -e "  ${BOLD}${CYAN}╚══════════════════════════════════════════════════╝${NC}"
  echo
  echo -e "  ${DIM}$(date '+%A, %d %B %Y  %H:%M:%S')${NC}"
  echo
}

usage() {
  echo "Usage: bash deploy-dev-mode.sh [--quick] [--no-infra] [--clean] [--port N]"
  echo
  echo "  --quick       Start portal only, skip Docker/Compose"
  echo "  --no-infra    Skip docker compose up (assume already running)"
  echo "  --clean       Delete .next build caches before starting"
  echo "  --port N      Portal port (default: 3000)"
  echo "  --help        This message"
  echo
}

# ── Arg parsing ───────────────────────────────────────────────────────────────
QUICK=false
NO_INFRA=false
CLEAN=false
PORT=3000

while [ $# -gt 0 ]; do
  case "$1" in
    --quick)    QUICK=true;     shift ;;
    --no-infra) NO_INFRA=true;  shift ;;
    --clean)    CLEAN=true;     shift ;;
    --port)     PORT="$2";      shift 2 ;;
    --help|-h)  usage; exit 0  ;;
    *)          shift ;;
  esac
done

export PORT

banner

# ══════════════════════════════════════════════════════════════════════════════
# STEP 1 — Preflight checks
# ══════════════════════════════════════════════════════════════════════════════
step "Preflight checks"

# Node.js
if ! command -v node >/dev/null 2>&1; then
  die "Node.js not found" "Install Node 22+ from https://nodejs.org or via Volta/nvm"
fi
node_ver=$(node -v)
ok "Node.js" "$node_ver"

# pnpm
if ! command -v pnpm >/dev/null 2>&1; then
  info "pnpm not found — enabling via corepack..."
  corepack enable && corepack prepare pnpm@9.15.9 --activate \
    || die "corepack failed" "Install manually: npm i -g pnpm@9.15.9"
fi
ok "pnpm" "v$(pnpm -v)"

# Docker (only needed when not in quick/no-infra mode)
if [ "$QUICK" = "false" ] && [ "$NO_INFRA" = "false" ]; then
  if ! docker info >/dev/null 2>&1; then
    warn "Docker is not running" "infrastructure start will be skipped"
    NO_INFRA=true
  else
    ok "Docker"
    # Detect compose command
    if docker compose version >/dev/null 2>&1; then
      COMPOSE_CMD="docker compose"
    elif command -v docker-compose >/dev/null 2>&1; then
      COMPOSE_CMD="docker-compose"
    else
      warn "docker compose plugin not found" "infrastructure will be skipped"
      NO_INFRA=true
    fi
  fi
fi

# ══════════════════════════════════════════════════════════════════════════════
# STEP 2 — Environment files
# ══════════════════════════════════════════════════════════════════════════════
step "Environment files"

# Root .env
if [ ! -f "$REPO_ROOT/.env" ]; then
  if [ -f "$REPO_ROOT/.env.example" ]; then
    cp "$REPO_ROOT/.env.example" "$REPO_ROOT/.env"
    ok ".env" "created from .env.example"
    warn "Root .env" "fill in real secrets before production use"
  else
    warn ".env" "no .env or .env.example found at repo root"
  fi
else
  ok ".env" "exists"
fi

# Portal .env.local
PORTAL_ENV="$REPO_ROOT/apps/portal/.env.local"
PORTAL_ENV_ALT="$REPO_ROOT/apps/portal/.env"
if [ ! -f "$PORTAL_ENV" ] && [ ! -f "$PORTAL_ENV_ALT" ]; then
  if [ -f "$REPO_ROOT/apps/portal/.env.example" ]; then
    cp "$REPO_ROOT/apps/portal/.env.example" "$PORTAL_ENV"
    ok "apps/portal/.env.local" "created from .env.example"
    warn "Supabase keys" "set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in apps/portal/.env.local"
  else
    warn "apps/portal/.env.local" "not found — Next.js may error on env reads"
  fi
else
  ok "apps/portal/.env.local" "exists"
fi

# ══════════════════════════════════════════════════════════════════════════════
# STEP 3 — Install dependencies
# ══════════════════════════════════════════════════════════════════════════════
step "Dependencies"

if [ ! -d "$REPO_ROOT/node_modules" ]; then
  info "node_modules not found — running pnpm install..."
  pnpm install --frozen-lockfile 2>&1 | grep -E "(warn|error|ERR|Done|Packages)" | sed 's/^/    /' || true
  ok "Dependencies installed"
else
  # Fast integrity check — re-install only if lockfile is newer than node_modules
  if [ "$REPO_ROOT/pnpm-lock.yaml" -nt "$REPO_ROOT/node_modules/.modules.yaml" ] 2>/dev/null; then
    info "Lockfile changed — syncing dependencies..."
    pnpm install --frozen-lockfile 2>&1 | grep -E "(warn|error|Done)" | sed 's/^/    /' || true
    ok "Dependencies synced"
  else
    ok "Dependencies" "up to date"
  fi
fi

# ══════════════════════════════════════════════════════════════════════════════
# STEP 4 — Cache clean (optional)
# ══════════════════════════════════════════════════════════════════════════════
if [ "$CLEAN" = "true" ]; then
  step "Cache clean (--clean)"
  for cache_dir in \
    "$REPO_ROOT/apps/portal/.next" \
    "$REPO_ROOT/.turbo" \
    "$REPO_ROOT/.vercel"
  do
    if [ -d "$cache_dir" ]; then
      size=$(du -sh "$cache_dir" 2>/dev/null | awk '{print $1}')
      rm -rf "$cache_dir"
      ok "Removed $(basename "$cache_dir")" "freed ${size:-?}"
    fi
  done
fi

# ══════════════════════════════════════════════════════════════════════════════
# STEP 5 — Start infrastructure (Docker Compose)
# ══════════════════════════════════════════════════════════════════════════════
step "Infrastructure"

if [ "$QUICK" = "true" ]; then
  warn "Infrastructure" "skipped (--quick)"
elif [ "$NO_INFRA" = "true" ]; then
  warn "Infrastructure" "skipped (--no-infra or Docker unavailable)"
else
  info "Bringing up Docker Compose stack (Redis + Postgres)..."
  $COMPOSE_CMD -f "$REPO_ROOT/docker-compose.yml" up -d 2>&1 \
    | grep -vE "^$|Network|Volume" | sed 's/^/    /' || true

  # Wait for Redis
  redis_up=false
  for _ in $(seq 1 20); do
    ss -tlnH 2>/dev/null | grep -qE ":6379 " && { redis_up=true; break; }
    sleep 1
  done
  [ "$redis_up" = "true" ] && ok "Redis" "localhost:6379" || warn "Redis" "port 6379 not responding yet"

  # Wait for Postgres
  pg_up=false
  for _ in $(seq 1 20); do
    ss -tlnH 2>/dev/null | grep -qE ":5432 " && { pg_up=true; break; }
    sleep 1
  done
  [ "$pg_up" = "true" ] && ok "Postgres" "localhost:5432 (arch_dev)" || warn "Postgres" "port 5432 not responding yet"
fi

# ══════════════════════════════════════════════════════════════════════════════
# STEP 6 — Free portal port if occupied
# ══════════════════════════════════════════════════════════════════════════════
step "Port check"

if ss -tlnH 2>/dev/null | grep -qE ":${PORT} "; then
  pid=$(lsof -ti :"$PORT" 2>/dev/null | head -n1 || true)
  if [ -n "$pid" ]; then
    proc=$(ps -p "$pid" -o comm= 2>/dev/null || echo "unknown")
    kill "$pid" 2>/dev/null && sleep 1 && ok "Port ${PORT}" "freed process '$proc' (PID $pid)" \
      || warn "Port ${PORT}" "could not kill PID $pid — port may still be occupied"
  else
    warn "Port ${PORT}" "occupied, PID unknown — continuing anyway"
  fi
else
  ok "Port ${PORT}" "free"
fi

# ══════════════════════════════════════════════════════════════════════════════
# STEP 7 — Start portal dev server
# ══════════════════════════════════════════════════════════════════════════════
step "Starting portal"

# Rotate log
: > "$REPO_ROOT/portal.log"

cd "$REPO_ROOT/apps/portal"
PORT="$PORT" pnpm dev > "$REPO_ROOT/portal.log" 2>&1 &
PORTAL_PID=$!
echo "$PORTAL_PID" > "$REPO_ROOT/.portal.pid"
cd "$REPO_ROOT"

info "Next.js dev server starting on :${PORT} (Turbopack)..."
info "Logs: $REPO_ROOT/portal.log"

# Poll until login page responds or fatal error detected
compiled=false
attempt=0
max_attempts=120  # 4 minutes

while [ $attempt -lt $max_attempts ]; do
  http_code=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:${PORT}/login" 2>/dev/null || echo "000")
  if echo "$http_code" | grep -qE "^(200|307|308)$"; then
    compiled=true; break
  fi
  if ! kill -0 "$PORTAL_PID" 2>/dev/null; then
    break
  fi
  # Only abort on login-route compile failure — other route Module not found must not block /login
  if grep -qiE "⨯.*(/login|app/\(auth\)/login).*Failed to compile|Error: Cannot find module" "$REPO_ROOT/portal.log" 2>/dev/null; then
    break
  fi
  attempt=$(( attempt + 1 ))
  sleep 2
done

if [ "$compiled" = "false" ]; then
  err "Portal failed to start"
  echo
  echo -e "  ${RED}Last 30 lines of portal.log:${NC}"
  tail -30 "$REPO_ROOT/portal.log" 2>/dev/null | sed 's/^/    /'
  echo
  die "Aborting — fix the errors above and re-run"
fi

date +%s > "$REPO_ROOT/.portal.start"
ok "Portal" "http://localhost:${PORT}"

# ══════════════════════════════════════════════════════════════════════════════
# STEP 8 — Smoke tests
# ══════════════════════════════════════════════════════════════════════════════
step "Smoke tests"

# /api/health
health_code=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:${PORT}/api/health" 2>/dev/null || echo "000")
[ "$health_code" = "200" ] \
  && ok "/api/health" "HTTP 200" \
  || warn "/api/health" "returned $health_code"

# Login page renders HTML
login_html=$(curl -fs "http://localhost:${PORT}/login" 2>/dev/null || true)
echo "$login_html" | grep -qi "<html\|<!doctype" \
  && ok "Login page" "renders HTML" \
  || warn "Login page" "HTML not detected — may be an error overlay"

# ══════════════════════════════════════════════════════════════════════════════
# DONE
# ══════════════════════════════════════════════════════════════════════════════
echo
echo -e "  ${GREEN}${BOLD}╔══════════════════════════════════════════════════╗${NC}"
echo -e "  ${GREEN}${BOLD}║   Dev environment is live                        ║${NC}"
echo -e "  ${GREEN}${BOLD}╚══════════════════════════════════════════════════╝${NC}"
echo
echo -e "  ${BOLD}Login:${NC}      ${CYAN}http://localhost:${PORT}/login${NC}"
echo -e "  ${BOLD}Dashboard:${NC}  ${CYAN}http://localhost:${PORT}/dashboard${NC}"
echo -e "  ${BOLD}Health:${NC}     ${CYAN}http://localhost:${PORT}/api/health${NC}"
if [ "$QUICK" = "false" ] && [ "$NO_INFRA" = "false" ]; then
  echo -e "  ${BOLD}Redis:${NC}      ${CYAN}localhost:6379${NC}"
  echo -e "  ${BOLD}Postgres:${NC}   ${CYAN}localhost:5432  db=arch_dev  user=postgres${NC}"
fi
echo
echo -e "  ${DIM}Portal PID: ${PORTAL_PID}  ·  Log: portal.log  ·  Stop: bash scripts/shutdown.sh${NC}"
echo
echo -e "  ${DIM}Or keep this terminal open — Ctrl+C to stop${NC}"
echo

# ── Open browser to login ────────────────────────────────────────────────────
bash "$REPO_ROOT/scripts/open-login.sh" "$PORT" || true

# ── Keep alive so Ctrl+C triggers cleanup ────────────────────────────────────
cleanup() {
  echo
  info "Shutting down portal (PID $PORTAL_PID)..."
  kill "$PORTAL_PID" 2>/dev/null || true
  rm -f "$REPO_ROOT/.portal.pid" "$REPO_ROOT/.portal.start"
  echo -e "  ${OK} Stopped"
  if [ "$QUICK" = "false" ] && [ "$NO_INFRA" = "false" ] && [ -n "${COMPOSE_CMD:-}" ]; then
    info "Stopping Docker Compose stack..."
    $COMPOSE_CMD -f "$REPO_ROOT/docker-compose.yml" down >/dev/null 2>&1 || true
    echo -e "  ${OK} Infrastructure stopped"
  fi
  echo
}
trap cleanup EXIT INT TERM

wait "$PORTAL_PID" 2>/dev/null || true
