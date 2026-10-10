// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{Manager, PhysicalPosition, PhysicalSize};

// Native command to enable/disable Screen Sharing Invisibility
#[tauri::command]
fn set_screen_share_stealth(window: tauri::Window, enable: bool) -> Result<bool, String> {
    #[cfg(windows)]
    {
        use windows_sys::Win32::UI::WindowsAndMessaging::{
            GetWindowLongPtrW, SetWindowLongPtrW, SetWindowDisplayAffinity,
            GWL_EXSTYLE, WS_EX_NOACTIVATE, WS_EX_TOOLWINDOW, WS_EX_TOPMOST,
        };
        use windows_sys::Win32::Foundation::HWND;

        // WDA_EXCLUDEFROMCAPTURE = 0x00000011 (Windows 10 2004+ and Windows 11)
        // WDA_NONE = 0x00000000
        let affinity = if enable { 0x00000011 } else { 0x00000000 };
        if let Ok(hwnd_raw) = window.hwnd() {
            unsafe {
                let hwnd = hwnd_raw.0 as HWND;
                let success = SetWindowDisplayAffinity(hwnd, affinity);
                
                // Also set non-activating and toolwindow extended styles
                let mut ex_style = GetWindowLongPtrW(hwnd, GWL_EXSTYLE);
                ex_style |= (WS_EX_NOACTIVATE | WS_EX_TOOLWINDOW | WS_EX_TOPMOST) as isize;
                SetWindowLongPtrW(hwnd, GWL_EXSTYLE, ex_style);

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
        use cocoa::appkit::NSWindowCollectionBehavior;
        use cocoa::base::id;
        use objc::{msg_send, sel, sel_impl};

        if let Ok(ns_win) = window.ns_window() {
            let ns_win = ns_win as id;
            unsafe {
                let sharing_type: usize = if enable { 0 } else { 1 };
                let _: () = msg_send![ns_win, setSharingType: sharing_type];

                // Configure multi-space auxiliary behavior
                let behavior = NSWindowCollectionBehavior::NSWindowCollectionBehaviorCanJoinAllSpaces
                    | NSWindowCollectionBehavior::NSWindowCollectionBehaviorFullScreenAuxiliary
                    | NSWindowCollectionBehavior::NSWindowCollectionBehaviorStationary;
                let _: () = msg_send![ns_win, setCollectionBehavior: behavior];
                let _: () = msg_send![ns_win, setHidesOnDeactivate: false];

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

#[tauri::command]
fn align_to_active_display(window: tauri::Window, width: f64, height: f64) -> Result<bool, String> {
    if let Ok(cursor_pos) = window.cursor_position() {
        if let Ok(monitors) = window.available_monitors() {
            let target_monitor = monitors.into_iter().find(|m| {
                let pos = m.position();
                let size = m.size();
                cursor_pos.x >= pos.x as f64
                    && cursor_pos.x <= (pos.x + size.width as i32) as f64
                    && cursor_pos.y >= pos.y as f64
                    && cursor_pos.y <= (pos.y + size.height as i32) as f64
            }).or_else(|| window.primary_monitor().ok().flatten());

            if let Some(m) = target_monitor {
                let scale = m.scale_factor();
                let m_pos = m.position();
                let m_size = m.size();

                let phys_w = (width * scale).round() as u32;
                let phys_h = (height * scale).round() as u32;
                let phys_x = m_pos.x + ((m_size.width as i32 - phys_w as i32) / 2);
                let phys_y = m_pos.y + (10.0 * scale).round() as i32;

                let _ = window.set_size(PhysicalSize::new(phys_w, phys_h));
                let _ = window.set_position(PhysicalPosition::new(phys_x, phys_y));
                return Ok(true);
            }
        }
    }
    Ok(false)
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
            toggle_click_through,
            align_to_active_display
        ])
        .run(tauri::generate_context!())
        .expect("error while running Ghostboard desktop application");
}
