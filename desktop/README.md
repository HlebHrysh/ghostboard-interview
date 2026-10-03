# 👻 Ghostboard Desktop — Stealth Mini HUD

> **Ultra-minimalist, autonomous AI interview teleprompter with native screen-share invisibility.**  
> Completely invisible to **Zoom**, **Google Meet**, **Microsoft Teams**, **Discord**, **OBS**, and system screen recording.

---

## ⚡ How Screen Share Invisibility Works

Ghostboard Desktop does not rely on web hacks or hiding behind other tabs. It leverages **direct OS compositor hardware APIs**:

1. **Windows 10 (2004+) & Windows 11**:
   Calls `SetWindowDisplayAffinity(hwnd, WDA_EXCLUDEFROMCAPTURE)` (`0x00000011`).
   - The Windows Desktop Window Manager (DWM) composites the window onto your physical monitor.
   - Any screen capture pipeline (`BitBlt`, `DirectX Desktop Duplication`, `Windows.Graphics.Capture`) receives the underlying desktop pixels **without** Ghostboard.
   - Even when sharing **"Entire Screen 1"**, the interviewer sees only your clean IDE / desktop!

2. **macOS (AppKit / Cocoa)**:
   Calls `[window setSharingType:NSWindowSharingNone]`.
   - Apple's `ScreenCaptureKit` and Quartz Window Services exclude the window from any active capture stream.

---

## 🚀 Quick Start (Development & Standalone)

### Option A: Electron Lightweight Runner
```bash
cd desktop
npm install
npm start
```

### Option B: Tauri v2 Native Rust Build (~8MB executable)
```bash
cd desktop
cargo build --release --manifest-path src-tauri/Cargo.toml
```

---

## ⌨️ Global Shortcuts Matrix

| Shortcut | Action | Description |
|---|---|---|
| **`[Space]`** / **`[F8]`** | **Freeze Mode** | Freeze current answer card. STT keeps listening in the background. |
| **`[Esc]`** / **`[F12]`** | **Panic Shield** | Instantly disguise HUD into a realistic terminal / git diff screen. |
| **`[Ctrl+Alt+H]`** | **Hide / Show** | Instant emergency visibility toggle. |
| **`[Ctrl+Alt+T]`** | **Click-Through** | Makes HUD completely transparent to mouse clicks (clicks hit IDE). |
| **`[Ctrl+Alt+S]`** | **Stealth Toggle** | Toggle screen share capture exclusion on/off. |

---

## 🔗 1-Click Web-to-App Pairing

The desktop app registers the custom protocol `ghostboard://`:
1. On the web dashboard, click **"Open in Ghostboard App"** or scan the QR code.
2. The web platform issues a secure device token via `ghostboard://pair?token=...`.
3. The desktop app connects to the user's private channel (`/api/companion/stream`), streaming answers synchronously across PC, Web, and Mobile Phone!
