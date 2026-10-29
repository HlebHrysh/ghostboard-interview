pub mod alignment;
pub mod cursor;
pub mod hud;
pub mod hyprland;
pub mod opacity;
pub mod panic;
pub mod screencast;
pub mod screenshot;
pub mod stealth;

pub use alignment::{
    align_to_active_display, align_to_active_display_with_padding, align_to_active_display_with_size, apply_window_mode,
    calculate_webcam_alignment, WindowGeometry,
};
pub use cursor::toggle_click_through;
pub use opacity::set_window_opacity;
pub use panic::{panic_hide, panic_restore, toggle_panic};
pub use screencast::{detect_desktop_portal_screencast, ScreencastStatus};
pub use screenshot::ScreenCaptureResult;
pub use stealth::{
    apply_linux_stealth, apply_macos_stealth, apply_stealth, apply_windows_stealth,
};

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_calculate_webcam_alignment_standard_1080p() {
        let geom = calculate_webcam_alignment(0, 0, 1920, 1080, 1.0, 760.0, 20.0, None);
        assert_eq!(geom.width, 760);
        assert_eq!(geom.height, 420);
        // Centered: (1920 - 760) / 2 = 580
        assert_eq!(geom.x, 580);
        // Under webcam: 20px top padding
        assert_eq!(geom.y, 20);
    }

    #[test]
    fn test_calculate_webcam_alignment_hidpi_4k() {
        let geom = calculate_webcam_alignment(0, 0, 3840, 2160, 2.0, 760.0, 20.0, None);
        assert_eq!(geom.width, 1520);
        assert_eq!(geom.height, 840);
        // Centered: (3840 - 1520) / 2 = 1160
        assert_eq!(geom.x, 1160);
        // Under webcam with 2x scale: 20 * 2 = 40
        assert_eq!(geom.y, 40);
    }

    #[test]
    fn test_calculate_webcam_alignment_secondary_left_monitor() {
        let geom = calculate_webcam_alignment(-1920, 0, 1920, 1080, 1.0, 760.0, 20.0, Some(500));
        assert_eq!(geom.width, 760);
        assert_eq!(geom.height, 500);
        // Monitor offset -1920 + 580 = -1340
        assert_eq!(geom.x, -1340);
        assert_eq!(geom.y, 20);
    }

    #[test]
    fn test_calculate_webcam_alignment_secondary_top_monitor() {
        let geom = calculate_webcam_alignment(0, -1080, 1920, 1080, 1.0, 760.0, 20.0, None);
        assert_eq!(geom.width, 760);
        assert_eq!(geom.x, 580);
        // Monitor offset -1080 + 20 = -1060
        assert_eq!(geom.y, -1060);
    }

    #[test]
    fn test_calculate_webcam_alignment_ultrawide() {
        let geom = calculate_webcam_alignment(0, 0, 3440, 1440, 1.0, 760.0, 20.0, None);
        assert_eq!(geom.width, 760);
        // Centered: (3440 - 760) / 2 = 1340
        assert_eq!(geom.x, 1340);
        assert_eq!(geom.y, 20);
    }

    #[test]
    fn test_calculate_webcam_alignment_fractional_scale() {
        let geom = calculate_webcam_alignment(0, 0, 2560, 1440, 1.5, 760.0, 20.0, None);
        // 760 * 1.5 = 1140
        assert_eq!(geom.width, 1140);
        // 420 * 1.5 = 630
        assert_eq!(geom.height, 630);
        // Centered: (2560 - 1140) / 2 = 710
        assert_eq!(geom.x, 710);
        // Top padding: 20 * 1.5 = 30
        assert_eq!(geom.y, 30);
    }

    #[test]
    fn test_opacity_clamping_logic() {
        let lower: f32 = 0.01;
        assert_eq!(lower.clamp(0.05, 1.0), 0.05);

        let upper: f32 = 1.5;
        assert_eq!(upper.clamp(0.05, 1.0), 1.0);

        let normal: f32 = 0.85;
        assert_eq!(normal.clamp(0.05, 1.0), 0.85);
    }

    #[test]
    fn test_screencast_status_serialization() {
        let status = ScreencastStatus {
            portal_available: true,
            active_screencast_detected: false,
            session_count: 0,
            details: "Portal available".to_string(),
        };
        let serialized = serde_json::to_string(&status).expect("Serialization failed");
        assert!(serialized.contains("\"portal_available\":true"));
        assert!(serialized.contains("\"active_screencast_detected\":false"));

        let deserialized: ScreencastStatus =
            serde_json::from_str(&serialized).expect("Deserialization failed");
        assert_eq!(status, deserialized);
    }

    #[test]
    fn test_windows_stealth_stub() {
        let res = apply_windows_stealth(0, true);
        assert!(res.is_ok());
    }

    #[test]
    fn test_macos_stealth_stub() {
        let res = apply_macos_stealth(std::ptr::null_mut(), true);
        #[cfg(target_os = "macos")]
        assert!(res.is_err());
        #[cfg(not(target_os = "macos"))]
        assert!(res.is_ok());
    }

    #[test]
    fn test_detect_desktop_portal_screencast() {
        let status = detect_desktop_portal_screencast();
        assert!(!status.details.is_empty());
    }

    #[test]
    fn test_calculate_webcam_alignment_zero_or_negative_scale_fallback() {
        let geom_zero = calculate_webcam_alignment(0, 0, 1920, 1080, 0.0, 760.0, 20.0, None);
        assert_eq!(geom_zero.width, 760);
        assert_eq!(geom_zero.height, 420);
        assert_eq!(geom_zero.x, 580);
        assert_eq!(geom_zero.y, 20);

        let geom_neg = calculate_webcam_alignment(0, 0, 1920, 1080, -1.5, 760.0, 20.0, None);
        assert_eq!(geom_neg.width, 760);
        assert_eq!(geom_neg.x, 580);
    }

    #[test]
    fn test_window_geometry_serde_roundtrip() {
        let original = WindowGeometry {
            x: 100,
            y: 50,
            width: 760,
            height: 420,
        };
        let json = serde_json::to_string(&original).expect("Failed to serialize WindowGeometry");
        let parsed: WindowGeometry =
            serde_json::from_str(&json).expect("Failed to deserialize WindowGeometry");
        assert_eq!(original, parsed);
    }

    #[test]
    fn test_stealth_enable_disable_stubs() {
        assert!(apply_windows_stealth(0, true).is_ok());
        assert!(apply_windows_stealth(0, false).is_ok());
        assert!(apply_macos_stealth(std::ptr::null_mut(), false).is_ok() || cfg!(target_os = "macos"));
    }
}
