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

pub const HUD_LOGICAL_WIDTH: f64 = 720.0;
pub const TOP_PADDING_LOGICAL: f64 = 8.0;

/// Align the HUD window to the active display where the user's cursor currently resides.
/// Centered horizontally directly under the webcam with top 8px padding and exact logical dimensions.
pub fn align_to_active_display_with_size(
    window: &WebviewWindow,
    logical_width: f64,
    logical_height: f64,
) -> Result<bool, String> {
    align_to_active_display_with_padding(window, logical_width, logical_height, TOP_PADDING_LOGICAL)
}

/// Same as [`align_to_active_display_with_size`] but with an explicit logical top padding
/// (0.0 pins the window flush against the top edge of the monitor, right under the webcam).
pub fn align_to_active_display_with_padding(
    window: &WebviewWindow,
    logical_width: f64,
    logical_height: f64,
    top_padding_logical: f64,
) -> Result<bool, String> {
    let top_padding_logical = top_padding_logical.max(0.0);

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

    let target_phys_height = (logical_height * scale).round() as u32;

    let geom = calculate_webcam_alignment(
        m_pos.x,
        m_pos.y,
        m_size.width,
        m_size.height,
        scale,
        logical_width,
        top_padding_logical,
        Some(target_phys_height),
    );

    window
        .set_size(PhysicalSize::new(geom.width, geom.height))
        .map_err(|e| format!("Failed to set window size: {}", e))?;

    window
        .set_position(PhysicalPosition::new(geom.x, geom.y))
        .map_err(|e| format!("Failed to set window position: {}", e))?;

    Ok(true)
}

/// Align the HUD window using default notch dimensions.
pub fn align_to_active_display(window: &WebviewWindow) -> Result<bool, String> {
    align_to_active_display_with_size(window, 560.0, 140.0)
}

/// Applies ergonomic window geometry based on user-selected HUD mode.
/// - "launcher": 600x400 centered launcher card
/// - "notch": 560x140 compact pill under active webcam
/// - "notch_answering": 560x280 expanded pill displaying structured answer
/// - "full" / "chat": 760x480 dual-column live interview teleprompter
/// - "ticker": 640x56 single-line floating transcript ticker
pub fn apply_window_mode(window: &WebviewWindow, mode: &str) -> Result<bool, String> {
    match mode {
        "launcher" => {
            let _ = window.set_size(tauri::LogicalSize::new(600.0, 400.0));
            let _ = window.center();
            Ok(true)
        }
        "notch" => {
            align_to_active_display_with_size(window, 560.0, 140.0)
        }
        "notch_answering" => {
            align_to_active_display_with_size(window, 560.0, 280.0)
        }
        "full" | "chat" => {
            align_to_active_display_with_size(window, 760.0, 480.0)
        }
        "ticker" => {
            align_to_active_display_with_size(window, 640.0, 56.0)
        }
        _ => Err(format!("Unknown window mode: {}", mode)),
    }
}

