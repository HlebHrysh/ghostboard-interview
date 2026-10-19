// Standalone Empirical Stress Test Suite for Ghostboard Milestone 2 Window Management

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct WindowGeometry {
    pub x: i32,
    pub y: i32,
    pub width: u32,
    pub height: u32,
}

pub fn calculate_webcam_alignment(
    monitor_x: i32,
    monitor_y: i32,
    monitor_width: u32,
    _monitor_height: u32,
    scale_factor: f64,
    hud_width: f64,
    top_padding: f64,
    window_height: Option<u32>,
) -> WindowGeometry {
    let scale = if scale_factor <= 0.0 { 1.0 } else { scale_factor };
    let phys_w = (hud_width * scale).round() as u32;
    let phys_h = window_height.unwrap_or_else(|| (420.0 * scale).round() as u32);

    let phys_x = monitor_x + ((monitor_width as i32 - phys_w as i32) / 2);
    let phys_y = monitor_y + (top_padding * scale).round() as i32;

    WindowGeometry {
        x: phys_x,
        y: phys_y,
        width: phys_w,
        height: phys_h,
    }
}

pub fn clamp_opacity(opacity: f32) -> f32 {
    opacity.clamp(0.05, 1.0)
}

#[cfg(test)]
mod stress_tests {
    use super::*;

    #[test]
    fn test_multi_monitor_negative_coordinates() {
        // Multi-monitor arrangement:
        // Left monitor: [-1920, 0] to [0, 1080] (FullHD)
        // Primary monitor: [0, 0] to [1920, 1080] (FullHD)
        // Right monitor: [1920, 0] to [3840, 1080] (FullHD)
        // Top monitor: [0, -1440] to [2560, 0] (QHD)
        // Top-Left monitor: [-2560, -1440] to [0, 0] (QHD)

        // 1. Left Monitor (Negative X)
        let left = calculate_webcam_alignment(-1920, 0, 1920, 1080, 1.0, 760.0, 20.0, None);
        assert_eq!(left.width, 760);
        assert_eq!(left.height, 420);
        assert_eq!(left.x, -1340); // -1920 + (1920 - 760) / 2 = -1920 + 580 = -1340
        assert_eq!(left.y, 20);
        // Verify center:
        let left_center = left.x as f64 + (left.width as f64 / 2.0);
        let left_mon_center = -1920.0 + (1920.0 / 2.0);
        assert!((left_center - left_mon_center).abs() < 1e-6);

        // 2. Right Monitor (Positive X)
        let right = calculate_webcam_alignment(1920, 0, 1920, 1080, 1.0, 760.0, 20.0, None);
        assert_eq!(right.x, 2500); // 1920 + 580 = 2500
        assert_eq!(right.y, 20);
        let right_center = right.x as f64 + (right.width as f64 / 2.0);
        let right_mon_center = 1920.0 + (1920.0 / 2.0);
        assert!((right_center - right_mon_center).abs() < 1e-6);

        // 3. Top Monitor (Negative Y)
        let top = calculate_webcam_alignment(0, -1440, 2560, 1440, 1.0, 760.0, 20.0, None);
        assert_eq!(top.x, 900); // (2560 - 760) / 2 = 900
        assert_eq!(top.y, -1420); // -1440 + 20 = -1420
        let top_center = top.x as f64 + (top.width as f64 / 2.0);
        let top_mon_center = 2560.0 / 2.0;
        assert!((top_center - top_mon_center).abs() < 1e-6);

        // 4. Top-Left Monitor (Negative X and Negative Y)
        let top_left = calculate_webcam_alignment(-2560, -1440, 2560, 1440, 1.0, 760.0, 20.0, None);
        assert_eq!(top_left.x, -1660); // -2560 + 900 = -1660
        assert_eq!(top_left.y, -1420); // -1440 + 20 = -1420
        let tl_center = top_left.x as f64 + (top_left.width as f64 / 2.0);
        let tl_mon_center = -2560.0 + (2560.0 / 2.0);
        assert!((tl_center - tl_mon_center).abs() < 1e-6);
    }

    #[test]
    fn test_hidpi_4k_and_5k_alignment() {
        // 4K UHD (3840x2160, 2.0x scale)
        let uhd4k = calculate_webcam_alignment(0, 0, 3840, 2160, 2.0, 760.0, 20.0, None);
        assert_eq!(uhd4k.width, 1520);
        assert_eq!(uhd4k.height, 840);
        assert_eq!(uhd4k.x, 1160); // (3840 - 1520) / 2 = 1160
        assert_eq!(uhd4k.y, 40); // 20 * 2.0 = 40
        assert_eq!(uhd4k.x + (uhd4k.width as i32 / 2), 1920);

        // 5K Retina (5120x2880, 2.0x scale)
        let ret5k = calculate_webcam_alignment(0, 0, 5120, 2880, 2.0, 760.0, 20.0, None);
        assert_eq!(ret5k.width, 1520);
        assert_eq!(ret5k.height, 840);
        assert_eq!(ret5k.x, 1800); // (5120 - 1520) / 2 = 1800
        assert_eq!(ret5k.y, 40);
        assert_eq!(ret5k.x + (ret5k.width as i32 / 2), 2560);
    }

    #[test]
    fn test_ultrawide_and_super_ultrawide() {
        // 21:9 Ultrawide 3440x1440 (1.0x scale)
        let uw = calculate_webcam_alignment(0, 0, 3440, 1440, 1.0, 760.0, 20.0, None);
        assert_eq!(uw.width, 760);
        assert_eq!(uw.height, 420);
        assert_eq!(uw.x, 1340); // (3440 - 760) / 2 = 1340
        assert_eq!(uw.y, 20);
        assert_eq!(uw.x + (uw.width as i32 / 2), 1720);

        // 32:9 Super Ultrawide 5120x1440 (1.0x scale)
        let suw = calculate_webcam_alignment(0, 0, 5120, 1440, 1.0, 760.0, 20.0, None);
        assert_eq!(suw.width, 760);
        assert_eq!(suw.x, 2180); // (5120 - 760) / 2 = 2180
        assert_eq!(suw.y, 20);
        assert_eq!(suw.x + (suw.width as i32 / 2), 2560);

        // 32:9 Super Ultrawide with 1.25x scale
        let suw_scaled = calculate_webcam_alignment(0, 0, 5120, 1440, 1.25, 760.0, 20.0, None);
        assert_eq!(suw_scaled.width, 950);
        assert_eq!(suw_scaled.height, 525);
        assert_eq!(suw_scaled.x, 2085); // (5120 - 950) / 2 = 2085
        assert_eq!(suw_scaled.y, 25); // 20 * 1.25 = 25
        assert_eq!(suw_scaled.x + (suw_scaled.width as i32 / 2), 2560);
    }

    #[test]
    fn test_fractional_scaling_variations() {
        // 1.25x scale on 1080p
        let s125 = calculate_webcam_alignment(0, 0, 1920, 1080, 1.25, 760.0, 20.0, None);
        assert_eq!(s125.width, 950);
        assert_eq!(s125.height, 525);
        assert_eq!(s125.x, 485); // (1920 - 950) / 2 = 485
        assert_eq!(s125.y, 25);
        assert_eq!(s125.x + (s125.width as i32 / 2), 960);

        // 1.50x scale on 1440p
        let s150 = calculate_webcam_alignment(0, 0, 2560, 1440, 1.5, 760.0, 20.0, None);
        assert_eq!(s150.width, 1140);
        assert_eq!(s150.height, 630);
        assert_eq!(s150.x, 710); // (2560 - 1140) / 2 = 710
        assert_eq!(s150.y, 30);
        assert_eq!(s150.x + (s150.width as i32 / 2), 1280);

        // 1.75x scale on 4K
        let s175 = calculate_webcam_alignment(0, 0, 3840, 2160, 1.75, 760.0, 20.0, None);
        assert_eq!(s175.width, 1330);
        assert_eq!(s175.height, 735);
        assert_eq!(s175.x, 1255); // (3840 - 1330) / 2 = 1255
        assert_eq!(s175.y, 35);
        assert_eq!(s175.x + (s175.width as i32 / 2), 1920);

        // 2.25x scale on 4K
        let s225 = calculate_webcam_alignment(0, 0, 3840, 2160, 2.25, 760.0, 20.0, None);
        assert_eq!(s225.width, 1710);
        assert_eq!(s225.height, 945);
        assert_eq!(s225.x, 1065); // (3840 - 1710) / 2 = 1065
        assert_eq!(s225.y, 45);
        assert_eq!(s225.x + (s225.width as i32 / 2), 1920);

        // Non-standard Linux Wayland scale 1.333333
        let sway = calculate_webcam_alignment(0, 0, 1920, 1080, 1.333333, 760.0, 20.0, None);
        assert_eq!(sway.width, 1013);
        assert_eq!(sway.height, 560);
        assert_eq!(sway.x, 453);
        assert_eq!(sway.y, 27);
    }

    #[test]
    fn test_custom_window_height_collapsed_expanded() {
        // Collapsed Eyeline Notch HUD: height = 64
        let notch = calculate_webcam_alignment(0, 0, 1920, 1080, 1.0, 760.0, 20.0, Some(64));
        assert_eq!(notch.width, 760);
        assert_eq!(notch.height, 64);
        assert_eq!(notch.x, 580);
        assert_eq!(notch.y, 20);

        // Expanded Drawer Teleprompter: height = 620
        let drawer = calculate_webcam_alignment(0, 0, 1920, 1080, 1.0, 760.0, 20.0, Some(620));
        assert_eq!(drawer.width, 760);
        assert_eq!(drawer.height, 620);
        assert_eq!(drawer.x, 580);
        assert_eq!(drawer.y, 20);
    }

    #[test]
    fn test_extreme_and_boundary_alignment_inputs() {
        // Zero scale fallback -> 1.0
        let z = calculate_webcam_alignment(0, 0, 1920, 1080, 0.0, 760.0, 20.0, None);
        assert_eq!(z.width, 760);
        assert_eq!(z.x, 580);

        // Negative scale fallback -> 1.0
        let neg = calculate_webcam_alignment(0, 0, 1920, 1080, -2.5, 760.0, 20.0, None);
        assert_eq!(neg.width, 760);
        assert_eq!(neg.x, 580);

        // Monitor narrower than HUD (portrait screen 600px wide)
        let narrow = calculate_webcam_alignment(0, 0, 600, 1080, 1.0, 760.0, 20.0, None);
        assert_eq!(narrow.width, 760);
        // (600 - 760) / 2 = -160 / 2 = -80
        assert_eq!(narrow.x, -80);
        // Center of monitor = 300; Center of HUD = -80 + 380 = 300
        assert_eq!(narrow.x + (narrow.width as i32 / 2), 300);

        // Odd monitor width 1921
        let odd = calculate_webcam_alignment(0, 0, 1921, 1080, 1.0, 760.0, 20.0, None);
        assert_eq!(odd.x, 580); // (1921 - 760) / 2 = 1161 / 2 = 580
    }

    #[test]
    fn test_opacity_clamping_required_values() {
        // Required values from prompt: -1.0, 0.0, 0.01, 0.05, 0.5, 1.0, 2.0
        assert_eq!(clamp_opacity(-1.0), 0.05, "Opacity -1.0 must clamp to 0.05");
        assert_eq!(clamp_opacity(0.0), 0.05, "Opacity 0.0 must clamp to 0.05");
        assert_eq!(clamp_opacity(0.01), 0.05, "Opacity 0.01 must clamp to 0.05");
        assert_eq!(clamp_opacity(0.05), 0.05, "Opacity 0.05 must be preserved");
        assert_eq!(clamp_opacity(0.5), 0.5, "Opacity 0.5 must be preserved");
        assert_eq!(clamp_opacity(1.0), 1.0, "Opacity 1.0 must be preserved");
        assert_eq!(clamp_opacity(2.0), 1.0, "Opacity 2.0 must clamp to 1.0");

        // Additional edge case values
        assert_eq!(clamp_opacity(-100.0), 0.05);
        assert_eq!(clamp_opacity(100.0), 1.0);
        assert_eq!(clamp_opacity(0.04999), 0.05);
        assert_eq!(clamp_opacity(0.05001), 0.05001);
        assert_eq!(clamp_opacity(0.99999), 0.99999);
        assert_eq!(clamp_opacity(1.00001), 1.0);
    }
}
