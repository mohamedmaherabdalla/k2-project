#!/usr/bin/env bash
set -euo pipefail

BACKEND_PORT="${BACKEND_PORT:-8000}"
FRONTEND_PORT="${FRONTEND_PORT:-4173}"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG_DIR="$ROOT_DIR/.devlogs"

echo "Backend (${BACKEND_PORT}):"
lsof -nP -iTCP:"$BACKEND_PORT" -sTCP:LISTEN || true
if [ -f "$LOG_DIR/backend.pid" ]; then
  echo "pid file: $(cat "$LOG_DIR/backend.pid")"
fi
echo
echo "Frontend (${FRONTEND_PORT}):"
lsof -nP -iTCP:"$FRONTEND_PORT" -sTCP:LISTEN || true
if [ -f "$LOG_DIR/frontend.pid" ]; then
  echo "pid file: $(cat "$LOG_DIR/frontend.pid")"
fi
