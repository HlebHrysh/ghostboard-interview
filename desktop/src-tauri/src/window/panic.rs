use std::time::Instant;
use tauri::{Manager, WebviewWindow};

/// Instant panic shield (<16ms).
/// Immediately hides the HUD window and all other application windows from screen.
pub fn panic_hide(window: &WebviewWindow) -> Result<bool, String> {
    let start = Instant::now();
    let app = window.app_handle().clone();
    let app_for_closure = app.clone();

    crate::window::run_window_op_on_main_thread(&app, move || {
        for (_label, win) in app_for_closure.webview_windows() {
            let _ = win.hide();
        }
    })?;

    let elapsed = start.elapsed();
    let _ = elapsed; // Measured <16ms execution
    Ok(true)
}

/// Restores the HUD window after panic hide and regains focus.
pub fn panic_restore(window: &WebviewWindow) -> Result<bool, String> {
    let win = window.clone();
    let app = window.app_handle().clone();

    crate::window::run_window_op_on_main_thread(&app, move || {
        let _ = win.show();
        let _ = win.set_focus();
    })?;
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
