use std::ffi::c_void;
use tauri::WebviewWindow;

/// Windows OS-Native Stealth: Uses DWM exclusion from screen capture APIs.
/// WDA_EXCLUDEFROMCAPTURE (0x00000011) hides window from BitBlt, DirectX Desktop Duplication,
/// Windows.Graphics.Capture, OBS, Zoom, Microsoft Teams, Google Meet, and Discord.
/// Extended styles WS_EX_TOOLWINDOW | WS_EX_NOACTIVATE | WS_EX_TOPMOST prevent taskbar
/// icon creation, focus stealing, and keep the HUD on top.
#[cfg(windows)]
pub fn apply_windows_stealth(hwnd: isize, enable: bool) -> Result<(), String> {
    use windows_sys::Win32::Foundation::HWND;
    use windows_sys::Win32::UI::WindowsAndMessaging::{
        GetWindowLongPtrW, SetWindowLongPtrW, SetWindowDisplayAffinity,
        GWL_EXSTYLE, WS_EX_NOACTIVATE, WS_EX_TOOLWINDOW, WS_EX_TOPMOST,
    };

    let hwnd = hwnd as HWND;
    // WDA_EXCLUDEFROMCAPTURE = 0x00000011 (Windows 10 2004+ and Windows 11)
    // WDA_NONE = 0x00000000
    let affinity = if enable { 0x00000011 } else { 0x00000000 };

    unsafe {
        let success = SetWindowDisplayAffinity(hwnd, affinity);
        if success == 0 {
            return Err("SetWindowDisplayAffinity failed on Windows".into());
        }

        let mut ex_style = GetWindowLongPtrW(hwnd, GWL_EXSTYLE);
        if enable {
            ex_style |= (WS_EX_NOACTIVATE | WS_EX_TOOLWINDOW | WS_EX_TOPMOST) as isize;
        } else {
            ex_style &= !((WS_EX_NOACTIVATE | WS_EX_TOOLWINDOW) as isize);
        }
        SetWindowLongPtrW(hwnd, GWL_EXSTYLE, ex_style);
    }
    Ok(())
}

#[cfg(not(windows))]
pub fn apply_windows_stealth(_hwnd: isize, _enable: bool) -> Result<(), String> {
    // Non-Windows stub for cross-platform compilation & testing
    Ok(())
}

/// macOS OS-Native Stealth: Quartz WindowServer sharing exclusion.
/// Setting sharingType to NSWindowSharingNone (0) excludes the window from ScreenCaptureKit,
/// QuickTime, Zoom, Teams, Google Meet, and OBS screen capture.
/// NSWindowCollectionBehaviorCanJoinAllSpaces ensures HUD appears across all spaces and full-screen apps.
#[cfg(target_os = "macos")]
pub fn apply_macos_stealth(ns_window_ptr: *mut c_void, enable: bool) -> Result<(), String> {
    if ns_window_ptr.is_null() {
        return Err("Null NSWindow pointer".into());
    }
    use cocoa::appkit::NSWindowCollectionBehavior;
    use cocoa::base::id;
    use objc::{msg_send, sel, sel_impl};

    let ns_win = ns_window_ptr as id;
    unsafe {
        // NSWindowSharingNone = 0, NSWindowSharingReadOnly = 1
        let sharing_type: usize = if enable { 0 } else { 1 };
        let _: () = msg_send![ns_win, setSharingType: sharing_type];

        // Configure auxiliary floating behavior across all desktop spaces
        let behavior = NSWindowCollectionBehavior::NSWindowCollectionBehaviorCanJoinAllSpaces
            | NSWindowCollectionBehavior::NSWindowCollectionBehaviorFullScreenAuxiliary
            | NSWindowCollectionBehavior::NSWindowCollectionBehaviorStationary;
        let _: () = msg_send![ns_win, setCollectionBehavior: behavior];
        let _: () = msg_send![ns_win, setHidesOnDeactivate: false];
    }
    Ok(())
}

#[cfg(not(target_os = "macos"))]
pub fn apply_macos_stealth(_ns_window_ptr: *mut c_void, _enable: bool) -> Result<(), String> {
    // Non-macOS stub for cross-platform compilation & testing
    Ok(())
}

/// Linux Stealth & Defense-in-Depth:
/// 1. Skips taskbar on desktop environments via `set_skip_taskbar(enable)`.
/// 2. Sets always on top state.
/// 3. Sets X11 / GTK window hints (_NET_WM_STATE_SKIP_TASKBAR, _NET_WM_STATE_SKIP_PAGER, keep-above).
pub fn apply_linux_stealth(window: &WebviewWindow, enable: bool) -> Result<(), String> {
    window.set_skip_taskbar(enable).map_err(|e| format!("Failed to set skip_taskbar: {}", e))?;
    let _ = window.set_always_on_top(enable);

    #[cfg(target_os = "linux")]
    {
        if let Ok(gtk_win) = window.gtk_window() {
            use gtk::prelude::*;
            gtk_win.set_skip_taskbar_hint(enable);
            gtk_win.set_skip_pager_hint(enable);
            gtk_win.set_keep_above(enable);
        }
    }

    Ok(())
}

/// Cross-platform stealth window dispatcher
pub fn apply_stealth(window: &WebviewWindow, enable: bool) -> Result<bool, String> {
    #[cfg(windows)]
    {
        if let Ok(hwnd_raw) = window.hwnd() {
            apply_windows_stealth(hwnd_raw.0 as isize, enable)?;
        }
    }

    #[cfg(target_os = "macos")]
    {
        if let Ok(ns_win) = window.ns_window() {
            apply_macos_stealth(ns_win as *mut c_void, enable)?;
        }
    }

    #[cfg(target_os = "linux")]
    {
        apply_linux_stealth(window, enable)?;
    }

    Ok(enable)
}
