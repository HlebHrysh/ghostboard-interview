# 👻 Ghostboard Desktop — Awwwards-Grade AI Interview HUD

> **Ultra-minimalist, autonomous AI interview teleprompter with native screen-share invisibility.**  
> Completely invisible to **Zoom**, **Google Meet**, **Microsoft Teams**, **Discord**, **OBS**, and system screen recording.

---

## ⚡ Architecture & Core Capabilities

1. **Strict Audio Routing & Speaker Separation Engine**:
   - **Candidate Microphone ("Ви")**: Captured purely for candidate record-keeping and local transcription. **Strictly blocked from ever triggering AI copilot generation.**
   - **Interlocutor Loopback ("Співрозмовник")**: Captured from full system audio loopback or a selected meeting window/tab (Google Meet, Zoom, Teams). **Only interlocutor audio triggers the AI copilot pipeline.**
   - **Live 60fps Dual VU Waveform**: Independent green (interlocutor) and blue (candidate) visualizers with zero layout shift.

2. **Dual-Column Streaming AI Chat**:
   - **Left Column**: Live conversation flow with clear visual distinction between interlocutor questions and candidate remarks.
   - **Right Column**: Real-time token-by-token streaming AI answers via Server-Sent Events (`/api/ai/dual-stream`) with sub-second Time-To-First-Token (TTFT) and progressive phased rendering:
     - `<<<PHASE_1:HOOK>>>`: Immediate 1-sentence opening / bridge hook.
     - `<<<PHASE_2:PILLARS>>>`: 3 concrete technical bullet points.
     - `<<<PHASE_3:DEEP_DIVE>>>`: Production architectural trade-offs and code examples.

3. **Awwwards-Grade Interactive HUD (Tauri v2 + React 19 + Framer Motion 13)**:
   - **Tauri v2 Rust Core**: Ultra-lightweight native foundation powered by `cpal` for high-performance audio loopback/mic streaming, `Silero VAD` for speech detection, `xcap` for screen capture, and zero-overhead Tauri IPC channels.
   - **2-in-1 Adaptive Layout**: Seamlessly morphs between a floating Eyeline HUD (pinned below webcam at 580x220), full dual-column chat mode, and ultra-compact 40px ticker ribbon.
   - **Hardware Screen-Share Invisibility**:
     - **Windows 10/11**: Direct OS compositor exclusion via `SetWindowDisplayAffinity(hwnd, WDA_EXCLUDEFROMCAPTURE)`.
     - **macOS**: `[NSWindow setSharingType:NSWindowSharingNone]`.
     - **Linux**: Skip-taskbar, skip-pager, and portal-aware stealth.

---

## 🚀 Development & Packaging

```bash
cd desktop

# 1. Install frontend dependencies
npm install

# 2. Run in Tauri v2 development mode (Vite + Rust Core)
npm run tauri:dev

# 3. Typecheck TypeScript sources
npm run typecheck

# 4. Build Vite renderer bundle (<500 kB optimized chunks)
npm run build:renderer

# 5. Run Rust core unit & integration test suite
cargo test --manifest-path src-tauri/Cargo.toml

# 6. Build production standalone binary & installer (AppImage, deb, dmg, nsis)
npm run tauri:build
```

---

## ⌨️ Hotkey & Keyboard Shortcuts Matrix

| Shortcut | Action | Description |
|---|---|---|
| **`[Space]`** | **Freeze Mode** | Freeze current answer card to maintain reading position while STT continues in background. |
| **`[F12]`** | **Panic Shield** | Instantly disguise HUD into a hyper-realistic terminal screen (pytest/git status). |
| **`[Ctrl+Alt+T]`** | **Click-Through** | Makes the HUD completely transparent to mouse clicks (clicks pass through to IDE). |
| **`[Ctrl+Alt+H]`** | **Hide / Show** | Instant emergency visibility toggle. |
| **`[Ctrl+Alt+B]`** / **`[B]`** | **Bridge Phrase** | Generate an instant 1-sentence opening to buy time naturally. |
| **`[Ctrl+Alt+Q]`** / **`[Q]`** | **Blitz / Shorter** | Condense the active response into rapid-fire bullet points. |
| **`[Ctrl+Alt+D]`** / **`[D]`** | **Deep Dive** | Expand the active answer with architectural internals and failure modes. |
| **`[Ctrl+Alt+C]`** / **`[C]`** | **Code Example** | Generate an production-ready code snippet. |
| **`[Ctrl+Alt+M]`** / **`[M]`** | **History Drawer** | Open session question history with real-time search and 1-click Markdown export. |

---

## 🔗 1-Click Web-to-App Pairing

The desktop app registers the custom protocol `ghostboard://`:
1. On the web dashboard, click **"Open in Ghostboard App"** or scan the QR code.
2. The web platform issues a secure device token via `ghostboard://pair?token=...`.
3. The desktop app connects to the user's private channel (`/api/companion/stream`), streaming answers synchronously across PC, Web, and Mobile Phone!

