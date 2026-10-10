#!/usr/bin/env bash
# ==============================================================================
# Ghostboard macOS 1-Click Desktop Application Bundle Generator
# Creates a standalone .app bundle in ~/Applications and links to ~/Desktop
# Runs Chromium in borderless --app mode with dedicated Apple .icns branding
# ==============================================================================

set -euo pipefail

APP_NAME="Ghostboard"
APP_URL="https://ghostboard.ai"
APP_ID="ai.ghostboard.launcher"
USER_APPS_DIR="$HOME/Applications"
DESKTOP_DIR="$HOME/Desktop"
APP_BUNDLE="$USER_APPS_DIR/${APP_NAME}.app"

echo "=========================================================="
echo "   GHOSTBOARD — Native macOS Application Setup            "
echo "=========================================================="

mkdir -p "$USER_APPS_DIR"
rm -rf "$APP_BUNDLE"

# 1. Create standard macOS Application Bundle directory hierarchy
mkdir -p "$APP_BUNDLE/Contents/MacOS"
mkdir -p "$APP_BUNDLE/Contents/Resources"

# 2. Write Info.plist
cat <<EOF > "$APP_BUNDLE/Contents/Info.plist"
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleName</key>
    <string>${APP_NAME}</string>
    <key>CFBundleDisplayName</key>
    <string>${APP_NAME}</string>
    <key>CFBundleIdentifier</key>
    <string>${APP_ID}</string>
    <key>CFBundleVersion</key>
    <string>1.0.0</string>
    <key>CFBundleShortVersionString</key>
    <string>1.0.0</string>
    <key>CFBundlePackageType</key>
    <string>APPL</string>
    <key>CFBundleSignature</key>
    <string>????</string>
    <key>CFBundleExecutable</key>
    <string>${APP_NAME}</string>
    <key>CFBundleIconFile</key>
    <string>app.icns</string>
    <key>LSMinimumSystemVersion</key>
    <string>10.15</string>
    <key>NSHighResolutionCapable</key>
    <true/>
    <key>LSUIElement</key>
    <false/>
</dict>
</plist>
EOF

echo "APPL????" > "$APP_BUNDLE/Contents/PkgInfo"

# 3. Compile Launcher Binary / Script
cat <<'EOF' > "$APP_BUNDLE/Contents/MacOS/${APP_NAME}"
#!/usr/bin/env bash
TARGET_URL="https://ghostboard.ai"

# Detect best Chromium engine for clean --app windowing
if [ -d "/Applications/Google Chrome.app" ]; then
    exec "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --app="$TARGET_URL" "$@"
elif [ -d "$HOME/Applications/Google Chrome.app" ]; then
    exec "$HOME/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --app="$TARGET_URL" "$@"
elif [ -d "/Applications/Microsoft Edge.app" ]; then
    exec "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge" --app="$TARGET_URL" "$@"
elif [ -d "/Applications/Brave Browser.app" ]; then
    exec "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser" --app="$TARGET_URL" "$@"
else
    # Fallback to default browser
    exec open "$TARGET_URL"
fi
EOF

chmod +x "$APP_BUNDLE/Contents/MacOS/${APP_NAME}"

# 4. Copy High-Resolution .icns Asset
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOCAL_ICNS="$SCRIPT_DIR/../public/icon.icns"
DEST_ICNS="$APP_BUNDLE/Contents/Resources/app.icns"

if [ -f "$LOCAL_ICNS" ]; then
    cp "$LOCAL_ICNS" "$DEST_ICNS"
    echo "[*] Embedded local Apple .icns asset."
else
    echo "[*] Downloading icon from https://ghostboard.ai/icon.icns..."
    curl -fsSL "https://ghostboard.ai/icon.icns" -o "$DEST_ICNS" || true
fi

# 5. Clear Quarantine & Register with macOS Launch Services
xattr -dr com.apple.quarantine "$APP_BUNDLE" 2>/dev/null || true

LSREGISTER="/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister"
if [ -x "$LSREGISTER" ]; then
    "$LSREGISTER" -f "$APP_BUNDLE" 2>/dev/null || true
fi

touch "$APP_BUNDLE"

# 6. Create Desktop Link
if [ -d "$DESKTOP_DIR" ]; then
    ln -sf "$APP_BUNDLE" "$DESKTOP_DIR/${APP_NAME}.app"
    echo "[✓] Placed Desktop shortcut: $DESKTOP_DIR/${APP_NAME}.app"
fi

echo "[✓] Installed App Bundle: $APP_BUNDLE"
echo ""
echo "=========================================================="
echo "   macOS INSTALLATION COMPLETE!                           "
echo "   Ghostboard is now in your Applications and Desktop.    "
echo "=========================================================="

# Trigger visual notification if osascript exists
if command -v osascript >/dev/null 2>&1; then
    osascript -e 'display notification "Ghostboard installed to Applications & Desktop!" with title "Ghostboard Ready"' 2>/dev/null || true
fi
