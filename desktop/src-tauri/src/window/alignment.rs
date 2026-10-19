use tauri::{PhysicalPosition, PhysicalSize, WebviewWindow};

#[derive(Debug, Clone, Copy, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
pub struct WindowGeometry {
    pub x: i32,
    pub y: i32,
    pub width: u32,
    pub height: u32,
}

/// Pure calculation function for positioning the HUD centered horizontally directly below the webcam.
/// Takes monitor coordinates and scale factor, placing the HUD top-aligned with `top_padding` (default 20px)
/// and centered horizontally across `monitor_width`.
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
    let phys_w = (hud_width * scale).round().max(100.0) as u32;
    let phys_h = window_height
        .filter(|&h| h > 0)
        .unwrap_or_else(|| (420.0 * scale).round() as u32)
        .max(80);

    let phys_x = monitor_x + ((monitor_width as i32 - phys_w as i32) / 2);
    let phys_y = monitor_y + (top_padding * scale).round() as i32;

    WindowGeometry {
        x: phys_x,
        y: phys_y,
        width: phys_w,
        height: phys_h,
    }
}

/// Align the HUD window to the active display where the user's cursor currently resides.
/// Centered horizontally directly under the webcam with top 20px padding (760px logical width).
pub fn align_to_active_display(window: &WebviewWindow) -> Result<bool, String> {
    const HUD_LOGICAL_WIDTH: f64 = 720.0;
    const TOP_PADDING_LOGICAL: f64 = 8.0;

    let monitors = window
        .available_monitors()
        .map_err(|e| format!("Failed to enumerate available monitors: {}", e))?;

    let cursor_pos = window.cursor_position().ok();

    // 1. Detect target monitor based on cursor coordinates
    let target_monitor = if let Some(cursor) = cursor_pos {
        monitors.iter().find(|m| {
            let pos = m.position();
            let size = m.size();
            cursor.x >= pos.x as f64
                && cursor.x <= (pos.x + size.width as i32) as f64
                && cursor.y >= pos.y as f64
                && cursor.y <= (pos.y + size.height as i32) as f64
        }).cloned()
    } else {
        None
    };

    // 2. Fall back to current monitor, primary monitor, or first available monitor
    let monitor = target_monitor
        .or_else(|| window.current_monitor().ok().flatten())
        .or_else(|| window.primary_monitor().ok().flatten())
        .or_else(|| monitors.into_iter().next())
        .ok_or_else(|| "No active monitor found on the host system".to_string())?;

    let scale = monitor.scale_factor();
    let m_pos = monitor.position();
    let m_size = monitor.size();

    let current_height = window
        .outer_size()
        .ok()
        .map(|s| s.height)
        .filter(|&h| h > 0);

    let geom = calculate_webcam_alignment(
        m_pos.x,
        m_pos.y,
        m_size.width,
        m_size.height,
        scale,
        HUD_LOGICAL_WIDTH,
        TOP_PADDING_LOGICAL,
        current_height,
    );

    window
        .set_size(PhysicalSize::new(geom.width, geom.height))
        .map_err(|e| format!("Failed to set window size: {}", e))?;

    window
        .set_position(PhysicalPosition::new(geom.x, geom.y))
        .map_err(|e| format!("Failed to set window position: {}", e))?;

    Ok(true)
}
