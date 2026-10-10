#!/usr/bin/env bash
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ELECTRON_BIN="$SCRIPT_DIR/node_modules/.bin/electron"

if [ ! -x "$ELECTRON_BIN" ]; then
    echo "[!] Electron binary not found at $ELECTRON_BIN" >&2
    exit 1
fi

exec "$ELECTRON_BIN" --ozone-platform-hint=auto --enable-features=WaylandWindowDecorations "$SCRIPT_DIR" "$@"
