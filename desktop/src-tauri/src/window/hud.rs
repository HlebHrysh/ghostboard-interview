//! Detached transparent "Ghostboard HUD" window (the live Copilot), separate from the
//! regular "Ghostboard Office" main window.

use serde::Serialize;
use tauri::{AppHandle, Emitter, LogicalSize, Manager, WebviewUrl, WebviewWindowBuilder};

use crate::window::hyprland;

pub const MAIN_LABEL: &str = "main";
pub const HUD_LABEL: &str = "hud";
pub const HUD_TITLE: &str = "Ghostboard HUD";

/// Event the HUD webview listens to for live mode switches (chat <-> top bar).
pub const HUD_MODE_EVENT: &str = "hud:set-mode";
/// Event broadcast to every window once the HUD has been destroyed.
pub const HUD_CLOSED_EVENT: &str = "hud:closed";

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum HudMode {
    /// Two-column AI chat (interviewer | answer).
    Chat,
    /// Slim eyeline teleprompter pinned under the webcam.
    TopBar,
}

impl HudMode {
    pub fn parse(raw: &str) -> Result<Self, String> {
        match raw.trim().to_ascii_lowercase().as_str() {
            "chat" | "full" | "two_column" => Ok(HudMode::Chat),
            "top_bar" | "topbar" | "top-bar" | "notch" | "teleprompter" => Ok(HudMode::TopBar),
            other => Err(format!("Unknown copilot mode: '{}' (expected 'chat' or 'top_bar')", other)),
        }
    }

    pub fn as_str(self) -> &'static str {
        match self {
            HudMode::Chat => "chat",
            HudMode::TopBar => "top_bar",
        }
    }

    /// Logical window size.
    pub fn size(self) -> (f64, f64) {
        match self {
            HudMode::Chat => (780.0, 460.0),
            HudMode::TopBar => (680.0, 150.0),
        }
    }

    /// Logical gap to the top edge of the monitor (0 = flush under the webcam).
    pub fn top_padding(self) -> f64 {
        match self {
            HudMode::Chat => 12.0,
            HudMode::TopBar => 0.0,
        }
    }
}

/// Relative app URL of the HUD entry (same bundle, `?window=hud` switches the UI).
pub fn hud_url(mode: HudMode) -> String {
    format!("index.html?window=hud&mode={}", mode.as_str())
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LaunchReport {
    pub mode: String,
    /// `true` when a new window was created, `false` when an existing one was reused.
    pub created: bool,
    pub hyprland: bool,
    pub hyprland_rules_applied: u32,
    pub hyprland_rules_failed: u32,
}

/// Creates (or re-uses) the transparent HUD window for `mode`, positions it and shows it.
pub fn launch_copilot_window(app: &AppHandle, mode: &str) -> Result<LaunchReport, String> {
    let mode = HudMode::parse(mode)?;
    let (width, height) = mode.size();

    // 1. Push Hyprland rules *before* the window maps so it opens floating / pinned.
    let rules = hyprland::apply_hud_rules();

    // 2. Create or reuse.
    let (window, created) = if let Some(existing) = app.get_webview_window(HUD_LABEL) {
        let _ = existing.set_size(LogicalSize::new(width, height));
        (existing, false)
    } else {
        let built = WebviewWindowBuilder::new(app, HUD_LABEL, WebviewUrl::App(hud_url(mode).into()))
            .title(HUD_TITLE)
            .inner_size(width, height)
            .min_inner_size(480.0, 96.0)
            .transparent(true)
            .decorations(false)
            .always_on_top(true)
            .skip_taskbar(true)
            .shadow(false)
            .resizable(true)
            .visible(false)
            .focused(true)
            .build()
            .map_err(|e| format!("Failed to create Ghostboard HUD window: {}", e))?;
        (built, true)
    };

    // 3. Geometry: top-centre of the active monitor (ignored by Wayland, handled by hyprctl).
    let _ = crate::window::align_to_active_display_with_padding(&window, width, height, mode.top_padding());
    hyprland::place_hud_top_center(width as u32, height as u32, mode.top_padding());

    // 4. Screen-share stealth is best-effort and must never block the launch.
    let _ = crate::window::apply_stealth(&window, true);

    window.show().map_err(|e| format!("Failed to show HUD window: {}", e))?;
    let _ = window.set_always_on_top(true);
    let _ = window.set_focus();

    if !created {
        let _ = app.emit_to(HUD_LABEL, HUD_MODE_EVENT, mode.as_str());
    }

    // 5. Get the Office out of the way (no-op on tiling WMs, which keep it tiled).
    if let Some(main) = app.get_webview_window(MAIN_LABEL) {
        let _ = main.minimize();
    }

    Ok(LaunchReport {
        mode: mode.as_str().to_string(),
        created,
        hyprland: rules.detected,
        hyprland_rules_applied: rules.rules_applied,
        hyprland_rules_failed: rules.rules_failed,
    })
}

/// Destroys the HUD (if open). Restoring the Office is handled by the window-event hook so it
/// also covers the HUD being closed by the OS / window manager.
pub fn close_copilot_window(app: &AppHandle) {
    if let Some(hud) = app.get_webview_window(HUD_LABEL) {
        let _ = hud.destroy();
    } else {
        restore_office(app);
    }
}

/// Brings the Office (main window) back to the front.
pub fn restore_office(app: &AppHandle) {
    if let Some(main) = app.get_webview_window(MAIN_LABEL) {
        let _ = main.show();
        let _ = main.unminimize();
        let _ = main.set_focus();
    }
    let _ = app.emit(HUD_CLOSED_EVENT, ());
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_modes_and_aliases() {
        assert_eq!(HudMode::parse("chat").unwrap(), HudMode::Chat);
        assert_eq!(HudMode::parse(" TOP_BAR ").unwrap(), HudMode::TopBar);
        assert_eq!(HudMode::parse("notch").unwrap(), HudMode::TopBar);
        assert!(HudMode::parse("sidebar").is_err());
    }

    #[test]
    fn mode_sizes_match_spec() {
        assert_eq!(HudMode::Chat.size(), (780.0, 460.0));
        assert_eq!(HudMode::TopBar.size(), (680.0, 150.0));
    }

    #[test]
    fn top_bar_is_flush_with_top_edge() {
        assert_eq!(HudMode::TopBar.top_padding(), 0.0);
        assert!(HudMode::Chat.top_padding() > 0.0);
    }

    #[test]
    fn hud_url_carries_window_and_mode() {
        assert_eq!(hud_url(HudMode::Chat), "index.html?window=hud&mode=chat");
        assert_eq!(hud_url(HudMode::TopBar), "index.html?window=hud&mode=top_bar");
    }

    #[test]
    fn hud_title_matches_hyprland_selector() {
        assert_eq!(HUD_TITLE, hyprland::HUD_WINDOW_TITLE);
    }
}
