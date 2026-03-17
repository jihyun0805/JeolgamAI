#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${BACKEND_ENV_FILE:-$ROOT_DIR/.env.local}"
BACKEND_PORT="${BACKEND_PORT:-8081}"

if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi

cd "$ROOT_DIR"
exec bash gradlew bootRun --args="--server.port=${BACKEND_PORT}"
