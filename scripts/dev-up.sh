#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
BACKEND_VENV="$BACKEND_DIR/.venv"
BACKEND_PORT="${BACKEND_PORT:-8000}"
FRONTEND_PORT="${FRONTEND_PORT:-4173}"
LOG_DIR="$ROOT_DIR/.devlogs"

kill_port() {
  local port="$1"
  local pids
  pids="$(lsof -ti tcp:"$port" 2>/dev/null || true)"
  if [ -n "$pids" ]; then
    # shellcheck disable=SC2086
    kill -9 $pids >/dev/null 2>&1 || true
  fi
}

kill_port "$BACKEND_PORT"
kill_port "$FRONTEND_PORT"
mkdir -p "$LOG_DIR"

if [ ! -d "$BACKEND_VENV" ]; then
  python3 -m venv "$BACKEND_VENV"
fi

if ! "$BACKEND_VENV/bin/python" -c "import fastapi,uvicorn" >/dev/null 2>&1; then
  "$BACKEND_VENV/bin/python" -m pip install -r "$BACKEND_DIR/requirements.txt"
fi

if [ ! -d "$ROOT_DIR/node_modules" ]; then
  (cd "$ROOT_DIR" && npm install)
fi

(
  cd "$BACKEND_DIR"
  nohup "$BACKEND_VENV/bin/python" -m uvicorn main:app --reload --host 127.0.0.1 --port "$BACKEND_PORT" \
    >"$LOG_DIR/backend.log" 2>&1 &
  echo $! >"$LOG_DIR/backend.pid"
)

(
  cd "$ROOT_DIR"
  nohup npm run dev -- --host 127.0.0.1 --port "$FRONTEND_PORT" --strictPort \
    >"$LOG_DIR/frontend.log" 2>&1 &
  echo $! >"$LOG_DIR/frontend.pid"
)

sleep 2

echo "Backend:  http://127.0.0.1:${BACKEND_PORT}"
echo "Frontend: http://127.0.0.1:${FRONTEND_PORT}"
echo "Logs:"
echo "  $LOG_DIR/backend.log"
echo "  $LOG_DIR/frontend.log"

if ! lsof -nP -iTCP:"$BACKEND_PORT" -sTCP:LISTEN >/dev/null 2>&1; then
  echo "Backend failed to start. Recent logs:"
  tail -n 20 "$LOG_DIR/backend.log" || true
  exit 1
fi

if ! lsof -nP -iTCP:"$FRONTEND_PORT" -sTCP:LISTEN >/dev/null 2>&1; then
  echo "Frontend failed to start. Recent logs:"
  tail -n 20 "$LOG_DIR/frontend.log" || true
  exit 1
fi

bash "$ROOT_DIR/scripts/dev-status.sh"
