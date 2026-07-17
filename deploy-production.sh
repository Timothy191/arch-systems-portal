#!/usr/bin/env bash
# ══════════════════════════════════════════════════════════════════════════════
# Arch-Systems — Production Deployment Script
#
# Deploys the production stack with proper validation, health checks, and monitoring.
# Usage: bash deploy-production.sh [--force] [--skip-build] [--skip-validation]
#
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
  echo -e "  ${BOLD}${CYAN}║   Arch Systems  ·  Production Deployment          ║${NC}"
  echo -e "  ${BOLD}${CYAN}╚══════════════════════════════════════════════════╝${NC}"
  echo
  echo -e "  ${DIM}$(date '+%A, %d %B %Y  %H:%M:%S')${NC}"
  echo
}

# ── Parse Arguments ───────────────────────────────────────────────────────────

SKIP_VALIDATION=false
SKIP_BUILD=false
FORCE=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --skip-validation)
      SKIP_VALIDATION=true
      shift
      ;;
    --skip-build)
      SKIP_BUILD=true
      shift
      ;;
    --force)
      FORCE=true
      shift
      ;;
    --help|-h)
      echo "Usage: $0 [OPTIONS]"
      echo
      echo "Options:"
      echo "  --skip-validation    Skip environment validation (dangerous)"
      echo "  --skip-build        Skip Docker image rebuild"
      echo "  --force             Force deployment without confirmation"
      echo "  --help, -h          Show this help message"
      exit 0
      ;;
    *)
      die "Unknown option: $1"
      ;;
  esac
done

# ── Deployment Functions ────────────────────────────────────────────────────

check_docker() {
  step "Checking Docker availability"
  if ! command -v docker >/dev/null 2>&1; then
    die "Docker is not installed or not in PATH"
  fi
  if ! command -v docker compose >/dev/null 2>&1; then
    die "Docker Compose is not installed or not in PATH"
  fi
  ok "Docker and Docker Compose available"
}

validate_environment() {
  step "Validating production environment"
  
  if [[ "$SKIP_VALIDATION" == true ]]; then
    warn "Skipping environment validation (not recommended)"
    return 0
  fi
  
  # Run the environment validation script
  if ! bash "$SCRIPT_DIR/scripts/validate-env.sh" --production; then
    die "Environment validation failed. Please fix the issues above."
  fi
  ok "Production environment validated"
}

build_images() {
  step "Building production Docker images"
  
  if [[ "$SKIP_BUILD" == true ]]; then
    warn "Skipping Docker image rebuild"
    return 0
  fi
  
  info "Building Next.js portal image..."
  if ! docker compose -f docker-compose.production.yml build --no-cache portal; then
    die "Failed to build portal image"
  fi
  ok "Portal image built successfully"
  
  # Uncomment if building Redis/PostgreSQL images
  # info "Building infrastructure images..."
  # if ! docker compose -f docker-compose.production.yml build redis postgres; then
  #   die "Failed to build infrastructure images"
  # fi
  # ok "Infrastructure images built successfully"
}

stop_existing_services() {
  step "Stopping existing production services"
  
  # Check if services are running
  if docker compose -f docker-compose.production.yml ps --services --status running | grep -q .; then
    info "Stopping running production services..."
    if ! docker compose -f docker-compose.production.yml down; then
      warn "Failed to stop existing services, continuing anyway"
    else
      ok "Existing services stopped"
    fi
  else
    ok "No production services running"
  fi
}

start_services() {
  step "Starting production services"
  
  info "Starting services in detached mode..."
  if ! docker compose -f docker-compose.production.yml up -d; then
    die "Failed to start production services"
  fi
  ok "Production services started"
}

wait_for_health() {
  step "Waiting for services to become healthy"
  
  local max_attempts=30
  local attempt=1
  
  info "Waiting for portal health check..."
  
  while [[ $attempt -le $max_attempts ]]; do
    if curl -s -f http://localhost:3000/api/health >/dev/null 2>&1; then
      ok "Portal is healthy (attempt $attempt/$max_attempts)"
      return 0
    fi
    
    if [[ $attempt -eq $max_attempts ]]; then
      err "Portal health check failed after $max_attempts attempts"
      info "Checking container logs..."
      docker compose -f docker-compose.production.yml logs portal --tail=20
      return 1
    fi
    
    echo -n "."
    sleep 2
    attempt=$((attempt + 1))
  done
  
  return 1
}

verify_deployment() {
  step "Verifying deployment"
  
  info "Checking service status..."
  if ! docker compose -f docker-compose.production.yml ps; then
    warn "Failed to get service status"
  fi
  
  info "Testing frontend accessibility..."
  if ! curl -s -f http://localhost:3000 >/dev/null 2>&1; then
    warn "Frontend not accessible at http://localhost:3000"
  else
    ok "Frontend accessible at http://localhost:3000"
  fi
  
  info "Testing health endpoint..."
  if ! curl -s -f http://localhost:3000/api/health | grep -q '"status":"healthy"'; then
    warn "Health endpoint returned non-healthy status"
    curl -s http://localhost:3000/api/health | jq . 2>/dev/null || curl -s http://localhost:3000/api/health
  else
    ok "Health endpoint reports healthy status"
  fi
}

confirm_deployment() {
  if [[ "$FORCE" == true ]]; then
    return 0
  fi
  
  echo
  echo -e "  ${BOLD}${YELLOW}⚠  Production Deployment Confirmation${NC}"
  echo
  echo "  You are about to deploy to production."
  echo "  This will:"
  echo "    • Stop any running production services"
  echo "    • Build new Docker images"
  echo "    • Start all services"
  echo "    • Configure production networking"
  echo
  echo -e "  Target: ${BOLD}Port 3000${NC}"
  echo
  read -p "  Continue with deployment? [y/N] " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo
    err "Deployment cancelled"
    exit 0
  fi
}

# ── Main Deployment Flow ──────────────────────────────────────────────────────

main() {
  banner
  
  step "Starting production deployment"
  
  # 1. Check prerequisites
  check_docker
  
  # 2. Confirm deployment
  confirm_deployment
  
  # 3. Validate environment
  validate_environment
  
  # 4. Stop existing services
  stop_existing_services
  
  # 5. Build images
  build_images
  
  # 6. Start services
  start_services
  
  # 7. Wait for health
  if ! wait_for_health; then
    err "Services did not become healthy in time"
    info "Check logs with: docker compose -f docker-compose.production.yml logs"
    exit 1
  fi
  
  # 8. Verify deployment
  verify_deployment
  
  # 9. Success
  echo
  echo -e "${BOLD}─────────────────────────────────────────────────────────────${NC}"
  echo
  echo -e "  ${BOLD}${GREEN}✓ Production deployment completed successfully${NC}"
  echo
  echo "  Services:"
  echo "    • Frontend: http://localhost:3000"
  echo "    • Health:   http://localhost:3000/api/health"
  echo
  echo "  Useful commands:"
  echo "    • View logs:    docker compose -f docker-compose.production.yml logs -f"
  echo "    • Stop:        docker compose -f docker-compose.production.yml down"
  echo "    • Status:      docker compose -f docker-compose.production.yml ps"
  echo
  echo "  Next steps:"
  echo "    • Verify login functionality"
  echo "    • Test all application pages"
  echo "    • Monitor service health"
  echo
}

# Run main function
main "$@"