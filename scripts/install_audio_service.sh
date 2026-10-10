#!/usr/bin/env bash
# ==============================================================================
# Install Ghostboard Stealth Audio Systemd User Service
# ==============================================================================
set -e

SERVICE_DIR="${HOME}/.config/systemd/user"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCRIPT_PATH="${SCRIPT_DIR}/stealth_audio.sh"

echo "→ Налаштування автоматичного запуску Ghostboard Stealth Audio..."
mkdir -p "${SERVICE_DIR}"

cat <<EOF > "${SERVICE_FILE}"
[Unit]
Description=Ghostboard Stealth Audio Daemon for Linux
After=pipewire.service pipewire-pulse.service
Wants=pipewire.service pipewire-pulse.service

[Service]
Type=simple
ExecStart=${SCRIPT_PATH} daemon
Restart=always
RestartSec=3

[Install]
WantedBy=default.target
EOF

echo "→ Перезавантаження конфігурації systemd user..."
systemctl --user daemon-reload
echo "→ Активація та запуск служби..."
systemctl --user enable --now ghostboard-stealth-audio.service

echo "✅ Готово! Службу встановлено. Аудіо-міст Ghostboard буде автоматично підніматися при кожному старті ПК!"
systemctl --user status ghostboard-stealth-audio.service --no-pager
