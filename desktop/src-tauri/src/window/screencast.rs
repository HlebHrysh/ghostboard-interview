use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct ScreencastStatus {
    pub portal_available: bool,
    pub active_screencast_detected: bool,
    pub session_count: usize,
    pub details: String,
}

/// Detects Desktop Portal ScreenCast status on Linux and reports whether screen capture is in progress.
/// Modern Linux environments (Wayland & X11 with xdg-desktop-portal) route screen capture via
/// org.freedesktop.portal.ScreenCast and PipeWire.
pub fn detect_desktop_portal_screencast() -> ScreencastStatus {
    #[cfg(target_os = "linux")]
    {
        // 1. Check if org.freedesktop.portal.Desktop ScreenCast interface is available via busctl
        let busctl_check = std::process::Command::new("busctl")
            .args([
                "--user",
                "introspect",
                "org.freedesktop.portal.Desktop",
                "/org/freedesktop/portal/desktop",
                "org.freedesktop.portal.ScreenCast",
            ])
            .output();

        let portal_available = match busctl_check {
            Ok(ref output) => output.status.success(),
            Err(_) => false,
        };

        // 2. Check PipeWire for active screencast streams using pw-dump if available
        let mut active_screencast = false;
        let mut session_count = 0;
        let mut details = String::from("Linux screencast awareness: ");

        if let Ok(pw_output) = std::process::Command::new("pw-dump").output() {
            if pw_output.status.success() {
                let dump_str = String::from_utf8_lossy(&pw_output.stdout);
                // Look for stream nodes associated with screen capture or portal monitor
                if dump_str.contains("Stream/Output/Video") || dump_str.contains("xdg-desktop-portal-hyprland") || dump_str.contains("xdg-desktop-portal-gnome") {
                    let occurrences = dump_str.matches("media.class = \"Stream/Output/Video\"").count();
                    if occurrences > 0 {
                        active_screencast = true;
                        session_count = occurrences;
                    }
                }
            }
        }

        if portal_available {
            details.push_str("xdg-desktop-portal ScreenCast interface active; ");
        } else {
            details.push_str("xdg-desktop-portal ScreenCast interface unavailable; ");
        }

        if active_screencast {
            details.push_str(&format!("{} active screencast stream(s) detected", session_count));
        } else {
            details.push_str("no active screencast stream detected");
        }

        ScreencastStatus {
            portal_available,
            active_screencast_detected: active_screencast,
            session_count,
            details,
        }
    }

    #[cfg(not(target_os = "linux"))]
    {
        ScreencastStatus {
            portal_available: false,
            active_screencast_detected: false,
            session_count: 0,
            details: "Native OS window capture exclusion active (hardware-level)".to_string(),
        }
    }
}
