use tauri::WebviewWindow;

/// Toggle click-through transparency for the HUD window.
/// When enabled (`true`), mouse events pass directly through the transparent HUD to background windows (IDE, browser, terminal).
/// When disabled (`false`), interactive controls (buttons, scroll areas, drawers) receive user clicks.
pub fn toggle_click_through(window: &WebviewWindow, enable: bool) -> Result<bool, String> {
    #[cfg(windows)]
    {
        if let Ok(hwnd_raw) = window.hwnd() {
            use windows_sys::Win32::Foundation::HWND;
            use windows_sys::Win32::UI::WindowsAndMessaging::{
                GetWindowLongPtrW, SetWindowLongPtrW, GWL_EXSTYLE, WS_EX_LAYERED, WS_EX_TRANSPARENT,
            };
            let hwnd = hwnd_raw.0 as HWND;
            unsafe {
                let mut ex_style = GetWindowLongPtrW(hwnd, GWL_EXSTYLE);
                if enable {
                    ex_style |= (WS_EX_TRANSPARENT | WS_EX_LAYERED) as isize;
                } else {
                    ex_style &= !((WS_EX_TRANSPARENT) as isize);
                }
                SetWindowLongPtrW(hwnd, GWL_EXSTYLE, ex_style);
            }
        }
    }

    window
        .set_ignore_cursor_events(enable)
        .map_err(|e| format!("Failed to set ignore_cursor_events({}): {}", enable, e))?;
    Ok(enable)
}
