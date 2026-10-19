use tauri::WebviewWindow;

/// Set the window opacity for the HUD teleprompter.
/// Value is clamped to [0.05, 1.0] to prevent creating an entirely invisible, unreachable window.
/// Applies OS-native compositor transparency and sets webview DOM opacity styles.
pub fn set_window_opacity(window: &WebviewWindow, opacity: f32) -> Result<(), String> {
    let clamped = opacity.clamp(0.05, 1.0);

    #[cfg(windows)]
    {
        if let Ok(hwnd_raw) = window.hwnd() {
            use windows_sys::Win32::Foundation::HWND;
            use windows_sys::Win32::UI::WindowsAndMessaging::{
                GetWindowLongPtrW, SetLayeredWindowAttributes, SetWindowLongPtrW,
                GWL_EXSTYLE, LWA_ALPHA, WS_EX_LAYERED,
            };
            unsafe {
                let hwnd = hwnd_raw.0 as HWND;
                let mut ex_style = GetWindowLongPtrW(hwnd, GWL_EXSTYLE);
                ex_style |= WS_EX_LAYERED as isize;
                SetWindowLongPtrW(hwnd, GWL_EXSTYLE, ex_style);
                let alpha = (clamped * 255.0).round() as u8;
                SetLayeredWindowAttributes(hwnd, 0, alpha, LWA_ALPHA);
            }
        }
    }

    #[cfg(target_os = "macos")]
    {
        if let Ok(ns_win) = window.ns_window() {
            use cocoa::base::id;
            use objc::{msg_send, sel, sel_impl};
            let ns_win = ns_win as id;
            unsafe {
                let alpha: f64 = clamped as f64;
                let _: () = msg_send![ns_win, setAlphaValue: alpha];
            }
        }
    }

    #[cfg(target_os = "linux")]
    {
        if let Ok(gtk_win) = window.gtk_window() {
            use gtk::prelude::*;
            gtk_win.set_opacity(clamped as f64);
        }
    }

    // Defense-in-depth: inject CSS custom property and body opacity into the Webview
    let script = format!(
        "if (document.documentElement) {{ document.documentElement.style.setProperty('--hud-opacity', '{0}'); }} if (document.body) {{ document.body.style.opacity = '{0}'; }}",
        clamped
    );
    let _ = window.eval(&script);

    Ok(())
}
