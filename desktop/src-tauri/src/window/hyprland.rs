//! Hyprland (Wayland tiling compositor) integration for the detached Copilot HUD window.
//!
//! Wayland clients cannot position or pin their own windows, and a tiling compositor would
//! otherwise tile the transparent HUD like a regular app (blurred / black gaps). When the app
//! runs under Hyprland we therefore push a small batch of window rules through `hyprctl`
//! that target the HUD by its exact title, while the "Ghostboard Office" window stays a
//! normal tiled window.

use serde::{Deserialize, Serialize};
use std::process::Command;

/// Exact title of the HUD window (must match `HUD_TITLE` in `window::hud`).
pub const HUD_WINDOW_TITLE: &str = "Ghostboard HUD";

/// Regex selector Hyprland uses to match the HUD window.
pub fn hud_title_selector() -> String {
    format!("title:^({})$", HUD_WINDOW_TITLE)
}

/// `true` when running inside a Hyprland session.
pub fn is_hyprland() -> bool {
    std::env::var("HYPRLAND_INSTANCE_SIGNATURE")
        .map(|v| !v.trim().is_empty())
        .unwrap_or(false)
}

/// `true` when the session is Wayland (any compositor).
pub fn is_wayland() -> bool {
    std::env::var("XDG_SESSION_TYPE")
        .map(|v| v.eq_ignore_ascii_case("wayland"))
        .unwrap_or(false)
        || std::env::var_os("WAYLAND_DISPLAY").is_some()
}

/// Legacy (`windowrulev2`) rule bodies applied to the HUD, e.g. `float, title:^(Ghostboard HUD)$`.
pub fn hud_windowrulev2_rules() -> Vec<String> {
    let sel = hud_title_selector();
    ["float", "pin", "noblur", "noshadow", "noborder"]
        .iter()
        .map(|effect| format!("{}, {}", effect, sel))
        .collect()
}

/// Hyprland >= 0.53 dropped `windowrulev2` in favour of `windowrule` with `match:` props.
/// Same five effects, new syntax; used only as a fallback when the legacy keyword is rejected.
pub fn hud_windowrule_modern_rules() -> Vec<String> {
    let m = format!("match:title ^({})$", HUD_WINDOW_TITLE);
    vec![
        format!("float on, {}", m),
        format!("pin on, {}", m),
        format!("no_blur on, {}", m),
        format!("no_shadow on, {}", m),
        format!("border_size 0, {}", m),
    ]
}

/// Outcome of pushing the rule batch to the compositor.
#[derive(Debug, Clone, Default, Serialize, Deserialize, PartialEq, Eq)]
pub struct HyprlandReport {
    pub detected: bool,
    pub rules_applied: u32,
    pub rules_failed: u32,
    pub errors: Vec<String>,
}

/// Runs `hyprctl keyword <keyword> <rule>` and succeeds only on the literal `ok` reply
/// (hyprctl exits 0 even for rejected keywords, printing the error on stdout).
fn run_keyword(keyword: &str, rule: &str) -> Result<(), String> {
    let output = Command::new("hyprctl")
        .args(["keyword", keyword, rule])
        .output()
        .map_err(|e| format!("hyprctl unavailable: {}", e))?;
    let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
    if output.status.success() && stdout.eq_ignore_ascii_case("ok") {
        Ok(())
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
        Err(format!(
            "hyprctl keyword {} \"{}\" -> {}",
            keyword,
            rule,
            if stdout.is_empty() { stderr } else { stdout }
        ))
    }
}

/// Applies the float / pin / noblur / noshadow / noborder rule batch for the HUD window.
/// No-op (detected = false) outside Hyprland. Safe to call repeatedly.
pub fn apply_hud_rules() -> HyprlandReport {
    let mut report = HyprlandReport::default();
    if !is_hyprland() {
        return report;
    }
    report.detected = true;

    let legacy = hud_windowrulev2_rules();
    let modern = hud_windowrule_modern_rules();

    for (legacy_rule, modern_rule) in legacy.iter().zip(modern.iter()) {
        let result = run_keyword("windowrulev2", legacy_rule)
            .or_else(|first_err| run_keyword("windowrule", modern_rule).map_err(|e| format!("{first_err}; {e}")));
        match result {
            Ok(()) => report.rules_applied += 1,
            Err(e) => {
                report.rules_failed += 1;
                tracing::warn!(target: "ghostboard::hyprland", "{}", e);
                report.errors.push(e);
            }
        }
    }

    tracing::info!(
        target: "ghostboard::hyprland",
        applied = report.rules_applied,
        failed = report.rules_failed,
        "Hyprland HUD window rules pushed"
    );
    report
}

/// Top-centre placement in Hyprland layout (logical) coordinates for a monitor described by
/// its layout origin, pixel width and scale.
pub fn compute_top_center(
    monitor_x: i32,
    monitor_y: i32,
    monitor_width_px: u32,
    scale: f64,
    window_width: f64,
    top_padding: f64,
) -> (i32, i32) {
    let scale = if scale > 0.0 { scale } else { 1.0 };
    let logical_w = monitor_width_px as f64 / scale;
    let x = monitor_x as f64 + ((logical_w - window_width) / 2.0).max(0.0);
    let y = monitor_y as f64 + top_padding.max(0.0);
    (x.round() as i32, y.round() as i32)
}

/// Builds the `hyprctl --batch` payload that sizes and moves the HUD.
pub fn format_place_batch(x: i32, y: i32, width: u32, height: u32) -> String {
    let sel = hud_title_selector();
    format!(
        "dispatch resizewindowpixel exact {w} {h},{sel} ; dispatch movewindowpixel exact {x} {y},{sel}",
        w = width,
        h = height,
        x = x,
        y = y,
        sel = sel
    )
}

#[derive(Debug, Deserialize)]
struct HyprMonitor {
    x: i32,
    y: i32,
    width: u32,
    #[serde(default = "default_scale")]
    scale: f64,
    #[serde(default)]
    focused: bool,
}

fn default_scale() -> f64 {
    1.0
}

/// Picks the focused monitor (or the first one) out of `hyprctl -j monitors` output.
fn parse_focused_monitor(json: &str) -> Option<HyprMonitor> {
    let mut monitors: Vec<HyprMonitor> = serde_json::from_str(json).ok()?;
    if monitors.is_empty() {
        return None;
    }
    let idx = monitors.iter().position(|m| m.focused).unwrap_or(0);
    Some(monitors.swap_remove(idx))
}

/// Resizes the HUD to `width` x `height` and pins it to the top-centre of the focused monitor.
/// The compositor maps the window asynchronously, so the batch is retried a few times in the
/// background; it never blocks the caller.
pub fn place_hud_top_center(width: u32, height: u32, top_padding: f64) {
    if !is_hyprland() {
        return;
    }
    std::thread::spawn(move || {
        for delay_ms in [120u64, 260, 520, 900] {
            std::thread::sleep(std::time::Duration::from_millis(delay_ms));
            let monitor = Command::new("hyprctl")
                .args(["-j", "monitors"])
                .output()
                .ok()
                .and_then(|o| parse_focused_monitor(&String::from_utf8_lossy(&o.stdout)));
            let (x, y) = match monitor {
                Some(m) => compute_top_center(m.x, m.y, m.width, m.scale, width as f64, top_padding),
                None => continue,
            };
            let batch = format_place_batch(x, y, width, height);
            let _ = Command::new("hyprctl").args(["--batch", &batch]).output();
        }
    });
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn legacy_rules_cover_float_pin_noblur_noshadow_noborder() {
        let rules = hud_windowrulev2_rules();
        assert_eq!(
            rules,
            vec![
                "float, title:^(Ghostboard HUD)$",
                "pin, title:^(Ghostboard HUD)$",
                "noblur, title:^(Ghostboard HUD)$",
                "noshadow, title:^(Ghostboard HUD)$",
                "noborder, title:^(Ghostboard HUD)$",
            ]
        );
    }

    #[test]
    fn modern_rules_match_hud_title_only() {
        let rules = hud_windowrule_modern_rules();
        assert_eq!(rules.len(), hud_windowrulev2_rules().len());
        assert!(rules.iter().all(|r| r.contains("match:title ^(Ghostboard HUD)$")));
        assert!(rules.iter().all(|r| !r.contains("Office")));
    }

    #[test]
    fn office_window_is_never_targeted() {
        assert!(!hud_title_selector().contains("Office"));
    }

    #[test]
    fn top_center_on_1080p() {
        assert_eq!(compute_top_center(0, 0, 1920, 1.0, 680.0, 0.0), (620, 0));
    }

    #[test]
    fn top_center_on_scaled_secondary_monitor() {
        // 3840px wide at scale 2 => 1920 logical, origin 1920
        assert_eq!(compute_top_center(1920, 0, 3840, 2.0, 780.0, 8.0), (1920 + 570, 8));
    }

    #[test]
    fn top_center_never_goes_left_of_monitor() {
        assert_eq!(compute_top_center(100, 50, 400, 1.0, 680.0, 0.0), (100, 50));
    }

    #[test]
    fn place_batch_targets_hud_title() {
        let b = format_place_batch(620, 0, 680, 150);
        assert!(b.contains("resizewindowpixel exact 680 150,title:^(Ghostboard HUD)$"));
        assert!(b.contains("movewindowpixel exact 620 0,title:^(Ghostboard HUD)$"));
    }

    #[test]
    fn focused_monitor_is_preferred() {
        let json = r#"[{"x":0,"y":0,"width":1920,"scale":1.0,"focused":false},
                       {"x":1920,"y":0,"width":2560,"scale":1.0,"focused":true}]"#;
        let m = parse_focused_monitor(json).expect("monitor");
        assert_eq!(m.x, 1920);
        assert_eq!(m.width, 2560);
    }

    #[test]
    fn no_monitors_yields_none() {
        assert!(parse_focused_monitor("[]").is_none());
        assert!(parse_focused_monitor("not json").is_none());
    }
}
