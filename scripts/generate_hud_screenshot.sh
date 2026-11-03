#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HTML_FILE="file://${SCRIPT_DIR}/render_hud_screenshot.html"
OUT_DIR="${SCRIPT_DIR}/../public"

echo "Rendering Ghostboard HUD screenshots with headless Firefox..."

# 1. 1024x127 Standard Banner
firefox --headless --window-size 1024,127 --screenshot "${OUT_DIR}/hud_minimal_banner.png" "${HTML_FILE}"

# 2. 2048x254 Retina 2x Edition
firefox --headless --window-size 2048,254 --screenshot "${OUT_DIR}/hud_minimal_retina.png" "${HTML_FILE}"

# 3. 1440x360 Widescreen Context
firefox --headless --window-size 1440,360 --screenshot "${OUT_DIR}/hud_minimal_widescreen.png" "${HTML_FILE}"

echo "Screenshots successfully generated in ${OUT_DIR}"
