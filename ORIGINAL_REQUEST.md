# Original User Request

## Initial Request — 2026-10-15T20:41:35Z

Complete rework and productionization of Ghostboard Desktop into an Awwwards-grade, cross-platform (Windows, macOS, Linux) AI interview copilot with dual-channel audio capture (system/tab loopback for interlocutor vs microphone for candidate), an interactive dual-column chat HUD built with React 19, Tailwind CSS, and Framer Motion, and sub-second token-by-token streaming AI answers.

Working directory: /mnt/storage_d/ghostboard-interview/desktop
Integrity mode: development

## Requirements

### R1. Cross-Platform Audio Capture Engine with Strict Speaker Separation
- The application must capture incoming audio from the remote interlocutor via either full system audio loopback or a selected application/window/tab.
- The candidate's microphone must be captured as a separate stream: speech detected from the microphone must be displayed in the dialogue as "Ви" (Candidate), but must NEVER trigger AI answer generation.
- Only audio originating from the interlocutor (system loopback or meeting window/tab) triggers the AI interview copilot.
- The UI must provide a clean switch between "System Audio" (весь звук) and "Window/Tab Audio" (вкладка/вікно), accompanied by live dual VU/waveform meters.

### R2. Instant Streaming AI Chat Architecture
- The main interface must present a dual-column conversation flow:
  - Left column: The live conversation stream with distinct visual treatments for the Interlocutor's questions/speech ("Співрозмовник") and candidate notes.
  - Right column: Real-time streaming AI copilot answers appearing incrementally token-by-token (typewriter effect) with sub-second first-token latency via SSE/streaming.
- Markdown rendering with syntax highlighting, bullet points, and code copy actions.

### R3. Awwwards-Grade Interactive Desktop HUD Experience
- Built with React 19, Tailwind CSS, and Framer Motion adhering to modern dark luxury foundations (#08090a, #0d0f12), ambient radial glows, glassmorphism (backdrop-blur-xl, border-white/[0.08]), and spring physics.
- Flexible 2-in-1 layout: an elegant floating widget designed to be pinned directly under the webcam (Eyeline HUD) that smoothly expands into the full dual-column chat mode or collapses into a discreet ultra-compact notch.
- Hardware-level screen share invisibility on Windows (WDA_EXCLUDEFROMCAPTURE) and macOS (NSWindowSharingNone), rendering the window invisible to Zoom, Google Meet, Microsoft Teams, Discord, and OBS.

### R4. Core Productivity Feature Suite
- Quick 1-click AI modifiers: "Bridge Phrase" (instant time-buying response), "Blitz / Shorter", "Deep Dive / Architecture Internals", and "Code Example".
- Session history with real-time search across all asked questions and 1-click export to Markdown.
- Essential safety utilities: Panic Shield (F12 disguise as terminal/git screen), Freeze mode (Space to lock current cards), Click-Through (Ctrl+Alt+T), and Window Opacity controls.

## Acceptance Criteria

### Audio Separation & Routing
- [ ] Interlocutor speech from system loopback or captured window/tab triggers the AI copilot pipeline.
- [ ] Candidate speech from the microphone is rendered in chat as candidate dialogue but is strictly blocked from initiating AI prompt generation.
- [ ] Switching between System Audio and Window/Tab capture works cleanly without application freezes or memory leaks.
- [ ] Real-time audio waveform / VU meters respond accurately to incoming audio levels.

### Chat & Streaming Delivery
- [ ] Left column displays live dialogue transcriptions with distinct visual identities for interlocutor vs candidate.
- [ ] Right column displays AI answers streaming incrementally token-by-token with syntax-highlighted code blocks.
- [ ] First token latency is sub-second using SSE / streaming endpoints.

### UI & Motion Polish
- [ ] Smooth transitions between expanded chat mode and compact eyeline notch using Framer Motion springs.
- [ ] Window drag, opacity adjustments, and click-through function seamlessly.
- [ ] Hardware screen share protection successfully marks the window excluded from capture on Windows and macOS.

### History & Modifiers
- [ ] 1-click AI modifiers trigger immediate prompt adjustments and stream revised answers.
- [ ] Session questions are persisted during the run, searchable via input, and exportable to clean Markdown.

### Build & Platform Integrity
- [ ] Desktop application builds and packages without errors for Linux, Windows, and macOS targets (npm run build / npm run pack).
- [ ] Zero runtime crashes, clean process shutdown, and no unhandled promise rejections.

## 2026-10-17T15:27:24Z

Migrate the Ghostboard stealth interview teleprompter and live copilot desktop application from Electron to Tauri v2 + Rust, fully eliminating legacy Electron code, implementing OS-native stealth anti-capture and audio loopback streaming, and delivering an ultra-low latency (<1.2s TTFT) Awwwards-grade glassmorphic HUD.

Working directory: /mnt/storage_d/ghostboard-interview
Integrity mode: development

## Requirements

### R1. Legacy Electron Decommissioning & Clean Tauri v2 Foundation
Completely eradicate all legacy Electron artifacts from `desktop/` and root configurations (including `main.js`, `preload.js`, `electron-builder.yml`, `pkce-loopback.js`, `secure-store.js`, `dist`, `electron` dependencies and scripts in `desktop/package.json` and root `package.json`). Establish a clean Tauri v2 project structure under `desktop/src-tauri` with optimized `Cargo.toml` (`lto = true`, `strip = true`, `codegen-units = 1`, `panic = "abort"`).

### R2. OS-Native Stealth Window Management & Anti-Screen Capture
Implement stealth window configurations and anti-screen capture capabilities across target OSes:
- Windows: `SetWindowDisplayAffinity(hwnd, WDA_EXCLUDEFROMCAPTURE)` via `windows-sys` / `windows` crate.
- macOS: `ns_window.setSharingType(NSWindowSharingNone)` with `NSWindowCollectionBehaviorCanJoinAllSpaces` and `LSUIElement = true`.
- Linux (X11 / Wayland): `_NET_WM_STATE_SKIP_TASKBAR` / `_NET_WM_STATE_SKIP_PAGER` with desktop-portal capture fallback detection and quick panic hide shortcut.
- Cursor transparency (click-through toggle `set_ignore_cursor_events`) with hover restoration over control zones and global shortcut toggles.

### R3. Cableless System Audio Loopback Capture & VAD Pre-processing
Implement asynchronous low-latency system loopback audio capture in Rust using `cpal` (WASAPI Loopback on Windows, ScreenCaptureKit/CoreAudio tap on macOS, PipeWire/PulseAudio monitor sink on Linux) with lock-free ring buffer (`ringbuf`) and real-time resampling to 16kHz 1-channel 16-bit PCM (`rubato`). Integrate local voice activity detection (Silero VAD via ONNX runtime / `ort`) to filter silence in 30ms frames and trigger speech pause boundaries (>350ms).

### R4. Real-time STT WebSocket & Speculative Low-Latency LLM Streaming Pipeline
Build a full-duplex Tokio-based pipeline connecting the 16kHz PCM stream to Deepgram Nova-2 via WebSocket (`interim_results=true`), streaming interim and final transcription tokens directly into Tauri IPC channels. Implement an End-of-Thought (EoT) detector based on VAD speech pauses and sentence markers over a sliding 90-second context window, triggering speculative HTTP/2 SSE streaming from fast LLM providers (Groq / OpenAI / Anthropic) with strict response structuring (one-line summary, bullet points, concise code snippet).

### R5. Awwwards-Grade Glassmorphic Eyeline Teleprompter HUD
Refactor the React 19 / Tailwind CSS / Framer Motion frontend to consume Tauri v2 typed IPC channels (`tauri::ipc::Channel<HudEvent>`). Deliver an ergonomic under-webcam interface centered horizontally (760px width, max 65 chars per line):
- Top Control Pill: dark frosted glass (`backdrop-blur-md bg-zinc-900/80 border border-white/10`) with live capture pulse, session timer, hotkey action triggers (`Answer ⌘↵`, `Screenshot ⌘⇧S`, `Chat ⌘⇧␣`, `Clear ⌘⇧⌫`), and opacity slider.
- STT Live Ticker Tape: smooth 60fps single-line scrolling ribbon for live transcript tokens.
- Expandable Glassmorphic Teleprompter Drawer: spring-animated downward fold displaying detected question and structured markdown streaming answer with syntax highlighting.

### R6. Cross-Platform Packaging & CI/CD Configuration
Configure `tauri.conf.json` with capabilities for transparent, undecorated, always-on-top, skip-taskbar floating windows. Set up multi-target build configurations for Windows (NSIS installer), Linux (AppImage with WebKit2GTK-4.1 and PipeWire/PulseAudio dependencies), and macOS (Universal Binary DMG with entitlements).

## Acceptance Criteria

### Clean Decommissioning
- [ ] No Electron dependencies (`electron`, `electron-builder`, `electron-updater`, `electron-log`) remain in `desktop/package.json` or root `package.json`.
- [ ] Legacy Electron files (`desktop/main.js`, `desktop/preload.js`, `desktop/electron-builder.yml`, `desktop/pkce-loopback.js`, `desktop/secure-store.js`) are deleted.
- [ ] Root scripts in `package.json` are updated to point to Tauri commands (`desktop:dev`, `desktop:build`).

### Rust Backend & Tauri Core
- [ ] `desktop/src-tauri` compiles cleanly via `cargo check` and `cargo test` without compilation errors or broken dependencies.
- [ ] Window stealth configuration compiles conditionally for Windows (`WDA_EXCLUDEFROMCAPTURE`), macOS (`NSWindowSharingNone`), and Linux.
- [ ] Global shortcut management and cursor pass-through (`set_ignore_cursor_events`) functions are registered as Tauri commands / plugins.
- [ ] Audio loopback pipeline correctly defines 16kHz PCM mono resampling and ring-buffer streaming hooks.
- [ ] Typed Tauri IPC event model matches `HudEvent` (`vadState`, `sttTranscript`, `questionDetected`, `llmChunk`, `llmDone`).

### Frontend HUD & Build Verification
- [ ] Frontend in `desktop/` compiles cleanly via `npm run build:renderer` (Vite + TypeScript `tsc --noEmit`) with 0 errors.
- [ ] All references to `window.electronAPI` or `ipcRenderer` are replaced with `@tauri-apps/api` invoke/listen channels.
- [ ] Teleprompter UI renders the top control pill, live STT ticker, and expandable answer drawer with Tailwind CSS and Framer Motion styling.

## 2026-10-18T09:41:21Z

# Teamwork Project Prompt — Draft

> Status: Launched
> Goal: Craft prompt → get user approval → delegate to teamwork_preview
> Requested team: Full multi-agent desktop engineering team (OS packaging, security/auth, HUD frontend, E2E QA)

Production-ready desktop AI interview copilot ("Ghostboard") distribution and runtime: cross-platform single-instance OS packaging, cryptographically secure OAuth 2.0 PKCE authentication with native OS keyring and RFC 8628 Device Code fallback, awwwards-grade camera-aligned stealth HUD with pass-through compositing, and comprehensive lifecycle E2E testing framework.

Working directory: `/mnt/storage_d/ghostboard-interview/desktop`
Integrity mode: development

## Requirements

### R1. Cross-Platform Zero-Friction OS Packaging & Single-Instance IPC
Deliver complete build and installer configurations for Windows, macOS, and Linux without requiring terminal usage or developer tooling from end users:
- **Windows**: NSIS installer (`.exe`) supporting `perUser`/`perMachine`, automatic Desktop and Start Menu shortcut creation, custom NSIS hook (`hooks.nsh`) registering `copilot://` protocol in `HKCU\Software\Classes`, multi-resolution `.ico` (16-256px), and optional launch on startup.
- **macOS**: Drag-to-Applications `.dmg` packaging, configured `Info.plist` with `CFBundleURLTypes` for `copilot://`, `LSUIElement` handling, microphone (`NSMicrophoneUsageDescription`) and screen capture descriptions (`NSScreenCaptureUsageDescription`), Retina `.icns` icons, and signing/notarization profile readiness.
- **Linux**: `.deb` and `.AppImage` packaging with automated `.desktop` entry registration in `~/.local/share/applications/`, MIME type registration `x-scheme-handler/copilot` via `update-desktop-database`, and complete hicolor icon sets.
- **Single-Instance IPC**: Enforce single-instance execution (`tauri-plugin-single-instance` or equivalent) across all platforms so secondary launches or deep-link invocations route arguments/URIs directly into the primary window and bring it to focus instead of launching duplicate processes.

### R2. Cryptographically Secure OAuth 2.0 PKCE, Deep Linking & Native Keyring Storage
Implement an end-to-end desktop authentication loop with zero plaintext token exposure:
- **PKCE Initialization**: Generate CSPRNG `code_verifier`, calculate SHA-256 `code_challenge` (S256), and cryptographic `state`. Open system default browser to the OAuth authorization endpoint.
- **Deep Link Handling**: Intercept `copilot://auth/callback?code=...&state=...`, validate state against CSRF, and exchange the authorization code for `access_token` and `refresh_token`.
- **RFC 8628 Device Code Fallback**: Provide an automated parallel Device Authorization Flow displaying a 6-character user code inside the HUD with background polling against `/oauth/token` for environments where custom URI protocols or browser redirects are blocked.
- **Hardware/OS Keyring Integration**: Securely persist tokens in native OS credential stores (Windows Credential Manager / DPAPI, macOS Keychain, Linux Secret Service / libsecret / KWallet via `keyring`). Prohibit storing secrets in `localStorage`, unencrypted files, or plain logs.
- **Session Lifecycle & Token Rotation**: On application launch, retrieve credentials from keyring in <50ms, validate expiry, automatically rotate expired tokens via refresh token, and synchronize subscription tier (`Free` / `Pro`) immediately with the UI.

### R3. Combat HUD Frontend & Low-Level Window Compositor Controls
Develop a 100% complete, fully interactive, awwwards-grade HUD overlay centered directly beneath the webcam:
- **Top Pill Capsule**: Fixed top-center alignment (`(ScreenWidth - 720) / 2`, `Y = 8px`). Contains real-time STT live transcript ticker with gradient fadeout, live connection latency indicator (<80ms green, 80-200ms amber, >200ms red), quick audio source switcher (Microphone / Loopback / Combined / Mute) with real-time RMS signal meter, profile avatar with subscription status badge, and hotkey indicators.
- **Glassmorphic Answer Drawer**: Expanding teleprompter drawer beneath the pill featuring SSE/WebSocket streaming AI response rendering, syntax-highlighted code blocks, persistent top 3 executive summary bullets, and intelligent auto-scroll with pause-on-wheel and instant snap-to-live button. Background opacity slider from 15% to 95% with `backdrop-filter: blur(16px)`.
- **Window Overlay & Compositor Control**:
  - Global Panic Button (`Cmd/Ctrl+Shift+H`): Instant toggle (0ms) window visibility without terminating ongoing audio or generation pipelines.
  - Click-Through Mode (`Cmd/Ctrl+Shift+X`): Transparent click bypass (`set_ignore_cursor_events(true)`) allowing direct clicks to fall through into underlying Zoom/Meet/IDE windows, while preserving a designated hover trigger zone to reclaim focus.
  - Screen Share Invisibility: Low-level window capture exclusion (`WDA_EXCLUDEFROMCAPTURE` on Windows, `NSWindowSharingNone` on macOS) rendering HUD completely invisible to full-screen screen shares in Zoom, Google Meet, Teams, and Discord.

### R4. Comprehensive E2E Testing & Lifecycle Verification Framework
Deliver an automated and manual verification suite validating all release gates:
- Automated tests for PKCE challenge generation, token exchange, and state validation.
- Unit/integration tests for OS keyring read/write/delete abstraction.
- Verification tests for single-instance argument forwarding and deep link routing.
- HUD state machine, audio level calculation, and transcript streaming tests.
- Step-by-step verification protocols covering clean OS installation, cold/warm deep-link activation, reboot persistence, screen share invisibility, fullscreen overlay stability, and clean uninstallation.

---

## Acceptance Criteria

### OS Packaging & Single Instance
- [ ] Windows NSIS build configuration generates working `.exe` installer with Desktop and Start Menu shortcuts.
- [ ] NSIS script registers `copilot://` protocol handler in `HKCU\Software\Classes` upon install and cleans it up upon uninstall.
- [ ] macOS build configuration generates `.dmg` with drag-to-applications layout, high-res `.icns`, and necessary permissions in `Info.plist`.
- [ ] Linux `.desktop` file registers `MimeType=x-scheme-handler/copilot;` and integrates with `update-desktop-database`.
- [ ] Multi-resolution application icons are present and valid for all target OS formats (.ico, .icns, .png).
- [ ] Single-instance plugin ensures that launching a second copy passes CLI arguments and deep-link URIs to the active instance and terminates the duplicate process.

### Authentication & Keyring Security
- [ ] OAuth 2.0 PKCE generates valid `code_verifier`, SHA-256 `code_challenge`, and unique `state`.
- [ ] Deep link callback `copilot://auth/callback` verifies state, exchanges code for access/refresh tokens, and updates HUD state.
- [ ] Device Code Flow (RFC 8628) displays 6-digit code and polls token endpoint successfully when deep links are unavailable.
- [ ] Tokens are stored exclusively in the OS native keyring (Windows Credential Manager, macOS Keychain, Linux Secret Service).
- [ ] No tokens, secrets, or credentials appear in `localStorage`, plain config files, or debug logs.
- [ ] Automatic session restoration on app startup loads stored credentials in <50ms with seamless refresh token rotation.

### HUD Overlay & Controls
- [ ] Top Pill renders centered under the webcam at screen top with responsive layout.
- [ ] Real-time STT live transcript ticker renders streaming tokens with smooth fading.
- [ ] Audio source switcher enables switching between mic and loopback with live RMS volume meter visualization.
- [ ] Answer Drawer renders markdown streaming responses with syntax highlighting, executive summary bullet pins, and smart auto-scroll.
- [ ] Panic Button hotkey instantly hides/restores the HUD without interrupting network streams.
- [ ] Click-Through mode passes cursor clicks through the window while retaining a hover recovery zone.
- [ ] Window configuration enables screen share capture exclusion (`set_content_protected(true)`).

### Verification & Quality Gates
- [ ] `npm run test` or Rust tests pass with zero errors across all newly introduced auth and utility modules.
- [ ] Clean build command (`npm run build` or `cargo check`) executes without compilation or lint errors.
- [ ] E2E lifecycle matrix covers install, deep-link warm/cold boot, reboot persistence, stealth screen sharing, and clean uninstall.

## Follow-up — 2026-10-18T21:40:34Z

# Teamwork Project Prompt

Requested team: Full multi-agent team: Lead Product Copywriter & Localization-Aware Conversion Strategist, Awwwards Creative UI/UX & Motion Technologist, High-Performance Next.js/React Frontend Architect, Conversion Funnel & QA/i18n Auditor

Architect and implement an Awwwards-grade, high-conversion Dark Tech Luxury landing page for Ghostboard AI Interview Copilot & Teleprompter (`/` and `/landing`) with complete 10-locale translation support, an interactive bilingual HUD simulator (Candidate vs. Recruiter screen-share toggle), Bento security architecture, 3-step onboarding, fear-busting FAQ, and transparent pricing.

Working directory: /mnt/storage_d/ghostboard-interview
Integrity mode: development

## Requirements

### R1. Complete 10-Locale i18n Data Layer & Text-Expansion Resilience
- Sync all new and updated copy (Hero, HUD simulator, Bento grid, 3-step setup, FAQ, Pricing, Footer CTA) across all 10 supported locales (`ua`, `en`, `pl`, `de`, `fr`, `es`, `pt`, `it`, `cs`, `nl`) in `src/lib/homeI18n.ts` and related translation files.
- Zero raw or hardcoded text in JSX/TSX components; all dynamic text must consume the locale context via `useLocale()`.
- Elastic layout engineering: containers, buttons, tabs, and Bento cards must accommodate +25% to +35% string expansion (typical in German, Ukrainian, and Polish) without text clipping, horizontal layout blowout, or broken alignments.

### R2. Dark Tech Luxury Visual Aesthetic & Interactive HUD Simulator
- Visual atmosphere: obsidian black background (`#08090A`), radial mesh glows, glassmorphic teleprompter HUD surface (`rgba(18, 20, 26, 0.72)` + `backdrop-filter: blur(20px)` + `1px solid rgba(255, 255, 255, 0.08)`), emerald safety accents (`#10B981`), indigo AI streaming accents (`#6366F1`), and amber metric highlights (`#F59E0B`).
- Prominent interactive HUD simulator mounted directly under the virtual camera line:
  - 3 clickable real-world interview scenarios:
    1. Behavioral / STAR: "Tell me about your most challenging production bug"
    2. System Design & Tech: "Concurrency vs Parallelism and Event Loop mechanics"
    3. Bilingual English Interview: "[EN Interview] Why should we hire you and salary expectations?" demonstrating live recruiter speech translation + answer bullets.
  - Reactive dual-view toggle:
    - **Candidate View (`👁 What you see`)**: Displays the teleprompter window with realistic 0.6s tokenized response streaming, highlighted keywords, and bilingual hints.
    - **Recruiter View (`🖥 Screen Share`)**: Renders a Zoom/Teams active screen-share indicator (`You are sharing your entire screen`) where the teleprompter window completely disappears, proving OS-level capture exclusion.
  - Tuned spring dynamics (Framer Motion) and zero layout shift.

### R3. Engineering Proof Bento Grid, 3-Step Setup, & No-BS FAQ
- **4 Bento Architecture Cards**:
  1. OS Kernel-level stream exclusion (`WDA_EXCLUDEFROMCAPTURE` on Windows & `NSWindow.SharingType.none` on macOS) — invisible to Zoom, Meet, Teams, OBS.
  2. Eye-Contact Lock — HUD pinned flush to the top edge under the webcam lens, eliminating reading eye-drift.
  3. Real-time translation & Glance-and-Speak structured bullet points (STAR, keywords, numbers) rather than unreadable text walls.
  4. Cursor click-through mode (`Cmd/Ctrl+Shift+X`) allowing seamless IDE coding through the teleprompter window.
- **3-Step Setup Flow ("Ready in 60 seconds")**:
  - Step 1: Upload resume PDF & select target interview language (bilingual mode).
  - Step 2: 1-click system audio capture from headphones (no virtual cables, no meeting bots).
  - Step 3: Speak with confidence (auto-separates interviewer voice and streams structured prompts).
- **No-BS FAQ Section**:
  - Full-screen desktop sharing safety guarantee.
  - Zero-bot architecture (100% local audio capture).
  - Foreign language comprehension and real-time translation module.
  - Live coding and technical screenshot solver (`Cmd/Ctrl + Enter`).

### R4. Transparent Pricing Matrix & Smart OS-Aware CTA
- **3 Pricing Tiers**:
  - Free Sandbox ($0 forever): unlimited browser simulator, 15-min live desktop call test, screen-share test.
  - Offer Pack ($29 one-time payment, no recurring subscription): 10 hours of live interviews (never expire), resume parsing, real-time speech translation, screenshot coding solver.
  - Job Hunter Unlimited ($49/month, cancel anytime): unlimited interview hours, ultra-fast models (0.4s latency), priority multilingual support.
- **Smart OS-Aware Primary Download CTA**:
  - Automatically detects client OS (macOS Apple Silicon/Intel, Windows x64, Linux AppImage/deb).
  - Displays localized OS badge and secondary manual download triggers.
- **CRO Funnel Telemetry**:
  - Event dispatch for key funnel actions (`hero_cta_download_clicked`, `simulator_question_triggered`, `stealth_toggle_switched`, `language_switched`, `pricing_plan_selected`, `faq_fear_expanded`) passing active `locale` and `os`.

## Acceptance Criteria

### Automated & Programmatic Verification
- [ ] `npm test` passes without failure, with `tests/i18nCoverage.test.ts` validating complete translation key presence across all 10 locales (`ua`, `en`, `pl`, `de`, `fr`, `es`, `pt`, `it`, `cs`, `nl`).
- [ ] `npx tsc --noEmit` and `npm run build` execute with 0 errors and 0 unhandled TypeScript type discrepancies.
- [ ] No React hydration errors or raw string keys (e.g. `simulator.view_candidate`) rendered in the browser.

### Interactive HUD Simulator & Visual UX
- [ ] Clicking any of the 3 scenario tabs triggers instant tokenized answer streaming with soundwave animation.
- [ ] Switching between Candidate View and Recruiter View smoothly mounts/unmounts or fades the teleprompter HUD while activating the green Zoom sharing boundary.
- [ ] Switching site locale in `UnifiedNavbar` updates all landing page strings, simulator questions, and streaming answers in real time without horizontal scroll or broken containers.
- [ ] Smart CTA reflects the current user platform (`macOS`, `Windows`, `Linux`) with working direct download/launch triggers.

## Follow-up — 2026-10-19T15:24:24Z

# Teamwork Project Prompt — Ghostboard Desktop Full Web Feature Parity

End-to-end operational parity for Ghostboard Desktop with the web application: seamless real-time dual audio capture (system loopback + microphone) with Deepgram Nova-3 STT, sub-second 3-phase streaming AI copilot answers connected to Next.js APIs via Vite dev proxy and configurable cloud endpoint, instant Vision OCR screen capture problem solver, candidate profile resume context injection, and mobile companion QR synchronization.

Working directory: `/mnt/storage_d/ghostboard-interview/desktop`
Integrity mode: development

## Requirements

### R1. Dual-Channel Audio Capture & Deepgram STT Pipeline
Implement full feature parity with the web audio engine:
- Provide hybrid audio capture: native OS system audio loopback plus microphone, with fallback to desktop window/tab capture.
- Continuous 16kHz linear PCM streaming to Deepgram Nova-3 WebSocket with automatic keep-alive, reconnection on network drop, and strict speaker separation ("Співрозмовник" vs "Ви").
- Real-time 4-stage RMS volume calculations feeding HUD LED meters and live transcript ticker.
- Automated speech boundary detection triggering AI answers upon question completion.

### R2. Live 3-Phase Streaming AI Copilot & Backend Integration
- Configure seamless communication between Desktop HUD and backend `/api/ai/dual-stream` (and `/api/ai/interview-copilot`):
  - Configure Vite development proxy forwarding `/api` requests to `http://localhost:3001` with proper origin headers.
  - Support setting/toggling backend URL between local (`http://localhost:3001`) and cloud (`https://ghostboard.ai`).
  - Pass authenticated Bearer token from native Keyring store.
- Progressive 3-phase response streaming: Hook (sub-second spoken sentence), Pillars (3 core architectural bullets), and Deep Dive (technical internals/code snippet).
- Dynamic answer modifiers: "Under the hood", "Code example", "Shorter", "Tradeoffs", and emergency conversational bridge phrases.

### R3. Multimodal Vision OCR Screen Solver
- Global shortcut (`Cmd/Ctrl+Shift+S`) and HUD action button to capture screen area or active window.
- Transmit image buffer to `/api/ai/screenshot` for multimodal vision parsing (LeetCode problem detection, architectural diagrams, system designs).
- Stream synthesized code solutions and architectural breakdowns directly into the teleprompter drawer.

### R4. Candidate Profile & Resume Context Injection
- Interactive Candidate Profile modal in HUD (Target Role, Core Stack, Experience Level, Custom Bio).
- Ingest candidate profile into AI prompt context so answers automatically reflect the candidate's real-world background.
- Integrate with resume parser endpoints (`/api/ai/parse-resume` / `/api/profile/context`) and persist settings in encrypted local storage.

### R5. Mobile Companion Sync & Session History
- Generate dynamic QR code linking mobile devices to `/companion/[sessionId]` for eyeline-preserving secondary screen viewing.
- Synchronize live dialogue and streamed answers between desktop and companion in real time.
- Searchable session history drawer with markdown export and 1-click clipboard copying.

---

## Acceptance Criteria

### Audio & Speech Recognition
- [ ] Audio capture starts successfully and streams both microphone and system audio without clipping or crashes.
- [ ] Live STT transcripts display in HUD ticker with speaker labels within 500ms of speech.
- [ ] Question heuristic engine accurately identifies interlocutor questions and automatically requests AI answers.

### AI Copilot & Streaming
- [ ] Desktop HUD connects to `/api/ai/dual-stream` without 404, CORS, or origin rejection errors.
- [ ] 3-phase response streams progressively with zero delimiter leakage in visible UI.
- [ ] Modifier buttons ("Shorter", "Code", "Under the hood") trigger immediate answer re-generation.
- [ ] Offline or failed network requests trigger graceful heuristic fallback answers.

### Multimodal Vision & Personalization
- [ ] Screen capture shortcut captures active display and receives AI analysis from vision endpoint.
- [ ] Candidate profile customizations are reflected in generated response terminology and examples.

### Verification & Stability
- [ ] Vitest test suite (`npm test -- --run`) passes 100% across all desktop and integration suites.
- [ ] Rust core unit tests (`cargo test`) pass 100% with 0 errors.
- [ ] TypeScript compilation (`npm run typecheck`) and production build (`npm run build:renderer`) complete cleanly without errors.
