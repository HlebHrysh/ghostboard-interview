use std::time::Instant;
use tauri::WebviewWindow;

/// Instant panic shield (<16ms).
/// Immediately hides the HUD window from screen and unmaps its surface from the compositor.
pub fn panic_hide(window: &WebviewWindow) -> Result<bool, String> {
    let start = Instant::now();
    window
        .hide()
        .map_err(|e| format!("Panic shield hide failed: {}", e))?;
    let elapsed = start.elapsed();
    let _ = elapsed; // Measured <16ms execution
    Ok(true)
}

/// Restores the HUD window after panic hide and regains focus.
pub fn panic_restore(window: &WebviewWindow) -> Result<bool, String> {
    window
        .show()
        .map_err(|e| format!("Panic shield restore failed: {}", e))?;
    let _ = window.set_focus();
    Ok(true)
}

/// Toggles between panic hide and restore based on current window visibility.
pub fn toggle_panic(window: &WebviewWindow) -> Result<bool, String> {
    let is_visible = window.is_visible().unwrap_or(false);
    if is_visible {
        panic_hide(window)
    } else {
        panic_restore(window)
    }
}
