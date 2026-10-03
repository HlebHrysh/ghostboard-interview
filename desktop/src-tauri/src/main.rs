// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::Manager;

// Native command to enable/disable Screen Sharing Invisibility
#[tauri::command]
fn set_screen_share_stealth(window: tauri::Window, enable: bool) -> Result<bool, String> {
    #[cfg(windows)]
    {
        use windows_sys::Win32::UI::WindowsAndMessaging::SetWindowDisplayAffinity;
        // WDA_EXCLUDEFROMCAPTURE = 0x00000011 (Windows 10 2004+ and Windows 11)
        // WDA_NONE = 0x00000000
        let affinity = if enable { 0x00000011 } else { 0x00000000 };
        if let Ok(hwnd) = window.hwnd() {
            unsafe {
                let success = SetWindowDisplayAffinity(hwnd.0 as _, affinity);
                if success != 0 {
                    return Ok(enable);
                } else {
                    return Err("Failed to set window display affinity on Windows".into());
                }
            }
        }
    }

    #[cfg(target_os = "macos")]
    {
        // On macOS: NSWindowSharingNone = 0, NSWindowSharingReadOnly = 1
        use cocoa::base::id;
        use objc::{msg_send, sel, sel_impl};
        if let Ok(ns_win) = window.ns_window() {
            let ns_win = ns_win as id;
            unsafe {
                let sharing_type: usize = if enable { 0 } else { 1 };
                let _: () = msg_send![ns_win, setSharingType: sharing_type];
                return Ok(enable);
            }
        }
    }

    #[cfg(target_os = "linux")]
    {
        // Linux Wayland/X11 overlay handler
        let _ = enable;
        let _ = window;
        return Ok(enable);
    }

    #[allow(unreachable_code)]
    Ok(enable)
}

#[tauri::command]
fn toggle_click_through(window: tauri::Window, enable: bool) -> Result<bool, String> {
    window.set_ignore_cursor_events(enable).map_err(|e| e.to_string())?;
    Ok(enable)
}

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            let main_window = app.get_webview_window("main").unwrap();
            // Automatically activate screen share invisibility upon launch
            #[cfg(any(windows, target_os = "macos"))]
            {
                let _ = set_screen_share_stealth(main_window.as_ref().window(), true);
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            set_screen_share_stealth,
            toggle_click_through
        ])
        .run(tauri::generate_context!())
        .expect("error while running Ghostboard desktop application");
}
