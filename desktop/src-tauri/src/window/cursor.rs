use tauri::WebviewWindow;

/// Toggle click-through transparency for the HUD window.
/// When enabled (`true`), mouse events pass directly through the transparent HUD to background windows (IDE, browser, terminal).
/// When disabled (`false`), interactive controls (buttons, scroll areas, drawers) receive user clicks.
pub fn toggle_click_through(window: &WebviewWindow, enable: bool) -> Result<bool, String> {
    window
        .set_ignore_cursor_events(enable)
        .map_err(|e| format!("Failed to set ignore_cursor_events({}): {}", enable, e))?;
    Ok(enable)
}
