#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SOLO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
export SOLO_ROOT
export PYTHONDONTWRITEBYTECODE=1

exec python3 "$SCRIPT_DIR/manual_start.py" "$@"
