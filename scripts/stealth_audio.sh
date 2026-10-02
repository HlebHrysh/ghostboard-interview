#!/usr/bin/env bash
# ==============================================================================
# Ghostboard Stealth Audio Mix for Linux (PipeWire / PulseAudio)
# ==============================================================================
# Цей скрипт створює віртуальний аудіопристрій "Ghostboard_Stealth_Mic",
# який поєднує:
#   1. Ваш фізичний мікрофон (голос кандидата)
#   2. Монітор виходу навушників/колонок (голос інтерв'юера в Meet/Zoom/Teams)
#
# Завдяки цьому Chrome сприймає це як звичайний мікрофон (getUserMedia),
# тому ЖОДНА системна плашка "Sharing this tab" ніколи не з'являється!
# ==============================================================================

set -e

CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BOLD='\033[1m'
NC='\033[0m'

SINK_NAME="ghostboard_sink"
SOURCE_NAME="ghostboard_mic"
SINK_DESC="Ghostboard_Virtual_Sink"
SOURCE_DESC="Ghostboard_Stealth_Mic"

check_pactl() {
    if ! command -v pactl &>/dev/null; then
        echo -e "${RED}[ERROR] pactl не знайдено! Будь ласка, встановіть libpulse або pipewire-pulse.${NC}"
        exit 1
    fi
}

get_active_modules() {
    pactl list modules short | grep -E "${SINK_NAME}|${SOURCE_NAME}" | awk '{print $1}' || true
}

is_running() {
    local count
    count=$(get_active_modules | wc -w)
    if [ "$count" -ge 2 ] && pactl list sources short 2>/dev/null | grep -q "${SOURCE_NAME}"; then
        return 0
    fi
    return 1
}

link_active_sinks() {
    local default_sink
    default_sink=$(pactl get-default-sink 2>/dev/null || true)

    # Unlink any existing direct links to avoid multiple clock domain conflicts
    for link_id in $(pw-link -l 2>/dev/null | grep -B1 "${SINK_NAME}:playback" | grep -v "${SINK_NAME}" | grep ":" | awk '{print $1}'); do
        pw-link -d "$link_id" "${SINK_NAME}:playback_FL" 2>/dev/null || true
        pw-link -d "$link_id" "${SINK_NAME}:playback_FR" 2>/dev/null || true
    done

    # Only link the single active default sink if it is not ghostboard_sink itself
    if [ -n "$default_sink" ] && [ "$default_sink" != "$SINK_NAME" ]; then
        pw-link "${default_sink}:monitor_FL" "${SINK_NAME}:playback_FL" 2>/dev/null || true
        pw-link "${default_sink}:monitor_FR" "${SINK_NAME}:playback_FR" 2>/dev/null || true
    fi
}

start_audio() {
    check_pactl
    echo -e "${YELLOW}[!] Virtual audio sink creation is disabled. Ghostboard captures directly from your default audio device.${NC}"
    stop_audio 2>/dev/null || true
    return 0
}

stop_audio() {
    check_pactl

    local mods
    mods=$(get_active_modules)

    if [ -z "$mods" ]; then
        return 0
    fi

    echo -e "${CYAN}→ Зупинка Ghostboard Stealth Audio...${NC}"
    for mod in $mods; do
        pactl unload-module "$mod" 2>/dev/null || true
    done

    # Unlink any direct links to ghostboard
    for link_id in $(pw-link -l 2>/dev/null | grep -B1 "${SINK_NAME}:playback" | grep -v "${SINK_NAME}" | grep ":" | awk '{print $1}'); do
        pw-link -d "$link_id" "${SINK_NAME}:playback_FL" 2>/dev/null || true
        pw-link -d "$link_id" "${SINK_NAME}:playback_FR" 2>/dev/null || true
    done

    echo -e "${GREEN}✅ Віртуальний мікрофон вимкнено.${NC}"
}

status_audio() {
    check_pactl

    local mods
    mods=$(get_active_modules)

    echo -e "${CYAN}${BOLD}=== 👻 Ghostboard Stealth Audio Status ===${NC}"
    if is_running; then
        echo -e "Статус: ${GREEN}${BOLD}АКТИВНИЙ (Працює)${NC}"
        echo -e "Завантажені модулі PipeWire/Pulse: ${mods}"
        echo -e "Пристрій для запису: ${YELLOW}${SOURCE_DESC}${NC} (${SOURCE_NAME})"
        echo -e "Джерело в системі: ${GREEN}Доступне для Chrome/Firefox${NC}"
    else
        echo -e "Статус: ${RED}${BOLD}НЕ АКТИВНИЙ${NC}"
    fi
}

daemon_mode() {
    echo -e "${CYAN}${BOLD}=== 👻 Ghostboard Audio Hotplug Daemon Started ===${NC}"
    start_audio

    local last_sink
    last_sink=$(pactl get-default-sink 2>/dev/null || true)

    # Monitor PipeWire events for default sink changes
    pactl subscribe 2>/dev/null | while read -r line; do
        if echo "$line" | grep -qE "sink|server"; then
            local new_sink
            new_sink=$(pactl get-default-sink 2>/dev/null || true)
            if [ -n "$new_sink" ] && [ "$new_sink" != "$SINK_NAME" ] && [ "$new_sink" != "$last_sink" ]; then
                last_sink="$new_sink"
                # Restart loopback smoothly for the new active sink
                local lb_mod
                lb_mod=$(pactl list modules short | grep module-loopback | grep "${SINK_NAME}" | awk '{print $1}')
                if [ -n "$lb_mod" ]; then
                    pactl unload-module "$lb_mod" 2>/dev/null || true
                fi
                pactl load-module module-loopback source="${new_sink}.monitor" sink="${SINK_NAME}" latency_msec=60 sink_dont_move=true >/dev/null 2>&1 || true
            fi
        fi
    done
}

case "${1:-start}" in
    start)
        start_audio "$2" "$3"
        ;;
    stop)
        stop_audio
        ;;
    restart)
        stop_audio
        sleep 0.5
        start_audio "$2" "$3"
        ;;
    status)
        status_audio
        ;;
    relink)
        link_active_sinks
        echo -e "${GREEN}✓ Всі активні аудіо-виходи перепідключено до Ghostboard!${NC}"
        ;;
    daemon)
        daemon_mode
        ;;
    *)
        echo "Використання: $0 {start|stop|restart|status|relink|daemon}"
        exit 1
        ;;
esac
