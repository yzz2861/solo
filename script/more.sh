#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SOLO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
export SOLO_ROOT
export PYTHONDONTWRITEBYTECODE=1

# Switch for the current more.sh queue. It is off by default so older IDs are
# allowed; set SOLO_MORE_MIN_ID_ENABLED=1 to only take IDs whose numeric suffix
# is at least SOLO_MORE_MIN_ID.
: "${SOLO_MORE_MIN_ID_ENABLED:=0}"
: "${SOLO_MORE_MIN_ID:=10293}"
export SOLO_MORE_MIN_ID_ENABLED
export SOLO_MORE_MIN_ID

exec python3 "$SCRIPT_DIR/manual_second.py" "$@"
