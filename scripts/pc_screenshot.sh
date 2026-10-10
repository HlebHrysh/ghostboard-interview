#!/usr/bin/env bash
# ==============================================================================
# Ghostboard PC Host Screenshot Trigger
# Usage: Run this script directly or bind it to any global shortcut in your
# desktop environment on the PC (e.g. F9, PrintScreen, Super+Shift+S).
# It grabs the PC screen, sends it to Gemini Vision, and your laptop screen
# updates immediately!
# ==============================================================================

PORT="${PORT:-3001}"
curl -s -X POST "http://localhost:${PORT}/api/ai/screenshot" \
  -H "Content-Type: application/json" \
  -d '{"captureHost": true, "locale": "uk"}' > /dev/null 2>&1 &

echo "📸 Ghostboard: PC screen snapshot triggered!"
