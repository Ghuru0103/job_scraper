#!/bin/bash
# =============================================================
# GS Apify Store — Single Command Startup
# Usage: ./start.sh
# =============================================================

set -e

BOLD="\033[1m"
GREEN="\033[0;32m"
CYAN="\033[0;36m"
YELLOW="\033[1;33m"
RED="\033[0;31m"
RESET="\033[0m"

log()   { echo -e "${CYAN}[GS]${RESET} $1"; }
ok()    { echo -e "${GREEN}[GS] ✓ $1${RESET}"; }
warn()  { echo -e "${YELLOW}[GS] ⚠ $1${RESET}"; }
error() { echo -e "${RED}[GS] ✗ $1${RESET}"; exit 1; }
header(){ echo -e "\n${BOLD}${CYAN}══════════════════════════════════════${RESET}"; echo -e "${BOLD}${CYAN}  $1${RESET}"; echo -e "${BOLD}${CYAN}══════════════════════════════════════${RESET}\n"; }

# ─── Trap: clean up on Ctrl+C ──────────────────────────────────────────────
cleanup() {
  echo ""
  warn "Shutting down..."
  docker stop ag-mongo ag-redis 2>/dev/null || true
  docker rm ag-mongo ag-redis 2>/dev/null || true
  ok "Done. Bye!"
  exit 0
}
trap cleanup INT TERM

# ─── 1. Pre-flight checks ───────────────────────────────────────────────────
header "⚗️  GS Apify Store"

command -v docker &>/dev/null || error "Docker is not installed. Install from https://docs.docker.com/get-docker/"
command -v node   &>/dev/null || error "Node.js is not installed."
command -v npm    &>/dev/null || error "npm is not installed."

ok "Prerequisites OK (Docker, Node $(node -v), npm $(npm -v))"

# ─── 2. Install deps if missing ─────────────────────────────────────────────
if [ ! -d "node_modules" ]; then
  log "Installing npm dependencies..."
  npm install --silent
  ok "Dependencies installed"
else
  ok "node_modules present"
fi

# ─── 3. Setup .env.local ────────────────────────────────────────────────────
if [ ! -f ".env.local" ]; then
  log "Creating .env.local from template..."
  cp .env.example .env.local

  # Auto-generate secrets
  JWT_SECRET=$(openssl rand -base64 32)
  ENCRYPTION_KEY=$(openssl rand -hex 32)

  # Patch secrets in-place
  sed -i "s|your_jwt_secret_change_me_in_production|${JWT_SECRET}|" .env.local
  sed -i "s|your_encryption_key_change_me_in_production|${ENCRYPTION_KEY}|" .env.local

  # Point to local Docker containers
  sed -i "s|MONGODB_URI=mongodb://localhost:27017/GS|MONGODB_URI=mongodb://localhost:27017/GS|" .env.local
  sed -i "s|REDIS_URL=redis://localhost:6379|REDIS_URL=redis://localhost:6379|" .env.local

  ok ".env.local created with auto-generated secrets"
else
  ok ".env.local already exists"
fi

# ─── 4. Start MongoDB ───────────────────────────────────────────────────────
log "Starting MongoDB..."

if docker ps --filter "name=ag-mongo" --format '{{.Names}}' | grep -q "ag-mongo"; then
  ok "MongoDB already running"
else
  docker rm -f ag-mongo 2>/dev/null || true
  docker run -d \
    --name ag-mongo \
    -p 27017:27017 \
    -e MONGO_INITDB_DATABASE=GS \
    -v ag-mongo-data:/data/db \
    mongo:6.0 \
    --quiet \
    >/dev/null
  ok "MongoDB container started"
fi

# ─── 5. Start Redis ─────────────────────────────────────────────────────────
log "Starting Redis..."

if docker ps --filter "name=ag-redis" --format '{{.Names}}' | grep -q "ag-redis"; then
  ok "Redis already running"
else
  docker rm -f ag-redis 2>/dev/null || true
  docker run -d \
    --name ag-redis \
    -p 6379:6379 \
    -v ag-redis-data:/data \
    redis:7-alpine \
    redis-server --save 60 1 \
    >/dev/null
  ok "Redis container started"
fi

# ─── 6. Wait for MongoDB to be ready ────────────────────────────────────────
log "Waiting for MongoDB to be ready..."
MAX_WAIT=30
COUNT=0
until docker exec ag-mongo mongosh --quiet --eval "db.runCommand('ping').ok" 2>/dev/null | grep -q "1"; do
  sleep 1
  COUNT=$((COUNT + 1))
  if [ $COUNT -ge $MAX_WAIT ]; then
    error "MongoDB did not become ready within ${MAX_WAIT}s"
  fi
  echo -ne "${CYAN}[GS]${RESET} Waiting for MongoDB... (${COUNT}s)\r"
done
ok "MongoDB is ready"

# ─── 7. Wait for Redis to be ready ──────────────────────────────────────────
log "Waiting for Redis to be ready..."
COUNT=0
until docker exec ag-redis redis-cli ping 2>/dev/null | grep -q "PONG"; do
  sleep 1
  COUNT=$((COUNT + 1))
  if [ $COUNT -ge 15 ]; then
    warn "Redis not responding, continuing anyway..."
    break
  fi
done
ok "Redis is ready"

# ─── 8. Launch ──────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}${GREEN}  🚀 All services up! Starting Node.js Express & Angular 19...${RESET}"
echo ""
echo -e "  ${BOLD}Store${RESET}       → http://localhost:3000"
echo -e "  ${BOLD}Dashboard${RESET}   → http://localhost:3000/dashboard"
echo -e "  ${BOLD}Runs${RESET}        → http://localhost:3000/runs"
echo -e "  ${BOLD}Jobs${RESET}        → http://localhost:3000/jobs"
echo -e "  ${BOLD}Monitoring${RESET}  → http://localhost:3000/monitoring"
echo -e "  ${BOLD}Metrics${RESET}     → http://localhost:3000/api/metrics"
echo ""
echo -e "  Press ${BOLD}Ctrl+C${RESET} to stop everything\n"

# ─── 9. Start Next.js dev server (blocking) ──────────────────────────────────
npm run dev
