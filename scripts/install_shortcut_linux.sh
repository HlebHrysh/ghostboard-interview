#!/usr/bin/env bash
# ==============================================================================
# Ghostboard Linux 1-Click Desktop & XDG Application Integration
# Compatible with Ubuntu, Fedora, Arch, Debian, openSUSE (GNOME, KDE, Wayland, X11)
# Strictly adheres to FreeDesktop.org Desktop Entry Specification v1.5
# ==============================================================================

set -euo pipefail

APP_NAME="Ghostboard"
APP_GENERIC_NAME="AI Interview Teleprompter"
APP_COMMENT="Real-Time Stealth Teleprompter & Live Performance Coach"
APP_URL="https://ghostboard.ai"
APP_ID="ghostboard"
WM_CLASS="ghostboard.ai"

XDG_DATA_HOME="${XDG_DATA_HOME:-$HOME/.local/share}"
APPS_DIR="$XDG_DATA_HOME/applications"
ICONS_DIR="$XDG_DATA_HOME/icons/hicolor"
DESKTOP_DIR="$(xdg-user-dir DESKTOP 2>/dev/null || echo "$HOME/Desktop")"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "=========================================================="
echo "   GHOSTBOARD — Linux Desktop & App Menu Setup            "
echo "=========================================================="

# 1. Detect Installed Chromium-Based Engine
BROWSER_BIN=""
for candidate in \
    google-chrome-stable \
    google-chrome \
    chromium \
    chromium-browser \
    microsoft-edge-stable \
    brave-browser \
    vivaldi-stable
do
    if command -v "$candidate" >/dev/null 2>&1; then
        BROWSER_BIN="$(command -v "$candidate")"
        break
    fi
done

if [ -z "$BROWSER_BIN" ]; then
    echo "[!] Warning: Chromium-based browser not found. Falling back to xdg-open."
    EXEC_CMD="xdg-open $APP_URL"
else
    echo "[*] Detected Browser Engine: $BROWSER_BIN"
    # --app runs borderless; --name sets WM_CLASS for Wayland/X11 window grouping
    EXEC_CMD="$BROWSER_BIN --app=$APP_URL --name=$APP_ID %U"
fi

# 2. Deploy Multi-Resolution Icon Assets into XDG Theme Directory
echo "[*] Installing icons to $ICONS_DIR..."
mkdir -p "$ICONS_DIR"

LOCAL_HICOLOR="$SCRIPT_DIR/../desktop/icons/hicolor"
if [ -d "$LOCAL_HICOLOR" ]; then
    cp -r "$LOCAL_HICOLOR"/* "$ICONS_DIR/"
else
    # Fallback to single SVG / PNG if hicolor tree not present
    mkdir -p "$ICONS_DIR/scalable/apps"
    if [ -f "$SCRIPT_DIR/../public/icon.svg" ]; then
        cp "$SCRIPT_DIR/../public/icon.svg" "$ICONS_DIR/scalable/apps/${APP_ID}.svg"
    else
        curl -fsSL "https://ghostboard.ai/icon.svg" -o "$ICONS_DIR/scalable/apps/${APP_ID}.svg" || true
    fi
fi

# 3. Generate FreeDesktop XDG .desktop Entry
mkdir -p "$APPS_DIR"
DESKTOP_FILE="$APPS_DIR/${APP_ID}.desktop"

cat <<EOF > "$DESKTOP_FILE"
[Desktop Entry]
Version=1.5
Type=Application
Name=${APP_NAME}
GenericName=${APP_GENERIC_NAME}
Comment=${APP_COMMENT}
Exec=${EXEC_CMD}
Icon=${APP_ID}
Terminal=false
StartupNotify=true
StartupWMClass=${WM_CLASS}
Categories=Utility;Education;
Keywords=interview;copilot;teleprompter;speech;ghostboard;ai;
MimeType=x-scheme-handler/ghostboard;
Actions=HUD;Simulator;Soundcheck;

[Desktop Action HUD]
Name=Open Live Teleprompter HUD
Exec=${BROWSER_BIN:-xdg-open} --app=${APP_URL}/companion/live

[Desktop Action Simulator]
Name=Open Mock Simulator
Exec=${BROWSER_BIN:-xdg-open} --app=${APP_URL}/mock-interview

[Desktop Action Soundcheck]
Name=Audio & Microphone Soundcheck
Exec=${BROWSER_BIN:-xdg-open} --app=${APP_URL}/settings
EOF

chmod +x "$DESKTOP_FILE"
echo "[✓] Created App Menu Entry: $DESKTOP_FILE"

# 4. Create Desktop Icon (if Desktop directory exists)
if [ -d "$DESKTOP_DIR" ]; then
    DESKTOP_SHORTCUT="$DESKTOP_DIR/${APP_ID}.desktop"
    cp "$DESKTOP_FILE" "$DESKTOP_SHORTCUT"
    chmod +x "$DESKTOP_SHORTCUT"
    
    # Mark trusted for GNOME Shell (removes "untrusted application launcher" warning)
    if command -v gio >/dev/null 2>&1; then
        gio set "$DESKTOP_SHORTCUT" metadata::trusted true 2>/dev/null || true
    fi
    echo "[✓] Placed Desktop Shortcut: $DESKTOP_SHORTCUT"
fi

# 5. Refresh System Desktop Database and Icon Caches
if command -v update-desktop-database >/dev/null 2>&1; then
    update-desktop-database "$APPS_DIR" 2>/dev/null || true
fi

if command -v gtk-update-icon-cache >/dev/null 2>&1; then
    gtk-update-icon-cache -f -t "$ICONS_DIR" 2>/dev/null || true
fi

echo ""
echo "=========================================================="
echo "   LINUX INSTALLATION COMPLETE!                           "
echo "   Search for 'Ghostboard' in your App Launcher / GNOME   "
echo "   or double-click the icon on your Desktop.              "
echo "=========================================================="
