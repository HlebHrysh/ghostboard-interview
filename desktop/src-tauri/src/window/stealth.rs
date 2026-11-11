use std::ffi::c_void;
use tauri::{Manager, WebviewWindow};

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
        WDA_EXCLUDEFROMCAPTURE, WDA_NONE,
    };

    let hwnd = hwnd as HWND;
    // WDA_EXCLUDEFROMCAPTURE = 0x00000011 (Windows 10 2004+ and Windows 11)
    // WDA_NONE = 0x00000000
    let affinity = if enable { WDA_EXCLUDEFROMCAPTURE } else { WDA_NONE };

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
/// Sets NSFloatingWindowLevel (5) and NSApplicationActivationPolicyAccessory (1) to eliminate Dock icon.
#[cfg(target_os = "macos")]
pub fn apply_macos_stealth(ns_window_ptr: *mut c_void, enable: bool) -> Result<(), String> {
    if ns_window_ptr.is_null() {
        return Err("Null NSWindow pointer".into());
    }
    use cocoa::appkit::NSWindowCollectionBehavior;
    use cocoa::base::id;
    use objc::{class, msg_send, sel, sel_impl};

    let ns_win = ns_window_ptr as id;
    unsafe {
        // NSWindowSharingNone = 0, NSWindowSharingReadOnly = 1
        let sharing_type: usize = if enable { 0 } else { 1 };
        let _: () = msg_send![ns_win, setSharingType: sharing_type];

        // NSFloatingWindowLevel = 5, NSNormalWindowLevel = 0
        let level: i64 = if enable { 5 } else { 0 };
        let _: () = msg_send![ns_win, setLevel: level];

        // Configure auxiliary floating behavior across all desktop spaces
        let behavior = NSWindowCollectionBehavior::NSWindowCollectionBehaviorCanJoinAllSpaces
            | NSWindowCollectionBehavior::NSWindowCollectionBehaviorFullScreenAuxiliary
            | NSWindowCollectionBehavior::NSWindowCollectionBehaviorStationary;
        let _: () = msg_send![ns_win, setCollectionBehavior: behavior];
        let _: () = msg_send![ns_win, setHidesOnDeactivate: false];

        // NSApplicationActivationPolicyAccessory = 1 (removes Dock icon during stealth)
        // NSApplicationActivationPolicyRegular = 0
        let app: id = msg_send![class!(NSApplication), sharedApplication];
        let policy: i64 = if enable { 1 } else { 0 };
        let _: () = msg_send![app, setActivationPolicy: policy];
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
/// 3. Hyprland: executes batch rules (float, pin, noblur, noshadow, noborder).
/// 4. X11: sets atoms _NET_WM_STATE_SKIP_TASKBAR, _NET_WM_STATE_SKIP_PAGER, _NET_WM_STATE_ABOVE, and _NET_WM_BYPASS_COMPOSITOR.
pub fn apply_linux_stealth(window: &WebviewWindow, enable: bool) -> Result<(), String> {
    // Hyprland integration: dispatch window properties without re-registering rules
    if crate::window::hyprland::is_hyprland() {
        if let Ok(pos) = window.outer_position() {
            crate::window::hyprland::dispatch_hud_window_properties(pos.x, pos.y);
        }
    }

    let win = window.clone();
    let app = window.app_handle().clone();
    crate::window::run_window_op_on_main_thread(&app, move || {
        let _ = win.set_skip_taskbar(enable);
        let _ = win.set_always_on_top(enable);

        #[cfg(target_os = "linux")]
        {
            if let Ok(gtk_win) = win.gtk_window() {
                use gtk::prelude::*;
                gtk_win.set_skip_taskbar_hint(enable);
                gtk_win.set_skip_pager_hint(enable);
                gtk_win.set_keep_above(enable);

                // GDK X11 atoms are only valid in native X11 sessions (never in Wayland/Hyprland)
                if !crate::window::hyprland::is_wayland() && !crate::window::hyprland::is_hyprland() {
                    if let Some(gdk_win) = gtk_win.window() {
                        let atom = gtk::gdk::Atom::intern("_NET_WM_BYPASS_COMPOSITOR");
                        let cardinal = gtk::gdk::Atom::intern("CARDINAL");
                        let val: u32 = if enable { 1 } else { 0 };
                        let val_bytes = val.to_ne_bytes();
                        gtk::gdk::property_change(
                            &gdk_win,
                            &atom,
                            &cardinal,
                            32,
                            gtk::gdk::PropMode::Replace,
                            gtk::gdk::ChangeData::UChars(&val_bytes),
                        );
                    }
                }
            }
        }
    })?;

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
