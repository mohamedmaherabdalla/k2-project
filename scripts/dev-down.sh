#!/usr/bin/env bash
set -euo pipefail

BACKEND_PORT="${BACKEND_PORT:-8000}"
FRONTEND_PORT="${FRONTEND_PORT:-4173}"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG_DIR="$ROOT_DIR/.devlogs"

kill_port() {
  local port="$1"
  local pids
  pids="$(lsof -ti tcp:"$port" 2>/dev/null || true)"
  if [ -n "$pids" ]; then
    # shellcheck disable=SC2086
    kill -9 $pids >/dev/null 2>&1 || true
    echo "Stopped processes on port ${port}: $pids"
  else
    echo "No process listening on port ${port}"
  fi
}

kill_port "$BACKEND_PORT"
kill_port "$FRONTEND_PORT"

rm -f "$LOG_DIR/backend.pid" "$LOG_DIR/frontend.pid"
