# Project: Ghostboard Desktop Full Web Feature Parity

## Architecture
Ghostboard Desktop is built as an ultra-low-latency, stealth AI interview copilot using Tauri v2 (Rust backend) and React 19 + Tailwind CSS + Framer Motion (Frontend HUD).
- **Audio Pipeline**: Native OS loopback capture (`cpal` WASAPI / CoreAudio / PipeWire) + microphone input resampled via `rubato` to 16kHz mono linear PCM; streamed to Deepgram Nova-3 WebSocket with Silero VAD (`tract-onnx`) and End-of-Thought detection.
- **AI Streaming Pipeline**: Next.js backend proxy (`/api/ai/dual-stream` and `/api/ai/interview-copilot`) communicating with Gemini 2.5 / 3.x Flash models in 3 progressive phases (Hook, Pillars, Deep Dive) with client-side fallback heuristics.
- **Security & Stealth**: Native OS Keyring token persistence, OS-level screen share protection (`WDA_EXCLUDEFROMCAPTURE` / `NSWindowSharingNone`), click-through transparent compositing.
- **Vision OCR**: Native screen capture via Tauri IPC sent to multimodal vision parsing (`/api/ai/screenshot`).
- **Personalization & Companion**: Candidate profile & resume context injection; real-time session sync with mobile companion via QR code and SSE (`/companion/[sessionId]`).

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Dual Audio Capture (Loopback + Mic) | Simultaneous capture of remote interlocutor loopback and candidate microphone | M1 | Survey (R1) |
| 2 | Deepgram Nova-3 16kHz Streaming | Continuous linear PCM streaming to Nova-3 with 45+ `TECH_KEYTERMS` and keep-alive | M1 | Survey (R1) |
| 3 | Strict Speaker Separation | Tagging "Співрозмовник" vs "Ви" with candidate speech strictly blocked from triggering AI | M1 | Survey (R1) |
| 4 | Real-Time 4-Stage RMS Metering | Calculating 30-50ms time-domain RMS feeding 4-stage reactive LED bar in Eyeline HUD | M1 | Survey (R1) |
| 5 | Speech Boundary & Turn-Taking VAD | Silero VAD 352ms pause detection and semantic question heuristics triggering AI answer | M1 | Survey (R1) |
| 6 | Vite Dev API Proxy | Forwarding `/api` from Vite dev server to Next.js on `http://localhost:3001` with headers | M2 | Survey (R2) |
| 7 | Backend URL Setting & Toggle | Runtime toggle between Local (`http://localhost:3001`) and Cloud (`https://ghostboard.ai`) | M2 | Survey (R2) |
| 8 | Keyring Bearer Auth Header | IPC command to expose `access_token` and attach `Authorization: Bearer <token>` in requests | M2 | Survey (R2) |
| 9 | 3-Phase Streaming Delimiter Guard | Clean parsing of Hook, Pillars, Deep Dive with case-insensitive delimiter leakage protection | M2 | Survey (R2) |
| 10 | Dynamic Answer Modifiers | HUD buttons and keyboard shortcuts for Shorter [Q], Dive [D], Code [C], Bridge [B], Tradeoffs [T] | M2 | Survey (R2) |
| 11 | Offline & Error Fallback Heuristics | Zero-crash fallback generating structured answers during network drops or HTTP errors | M2 | Survey (R2) |
| 12 | Screen OCR Capture Command | Native screenshot capture in Rust using `screenshots` crate returning base64 PNG | M3 | Survey (R3) |
| 13 | Global Screenshot Shortcut & Button | Global shortcut `Cmd/Ctrl+Shift+S` and HUD camera action button triggering OCR capture | M3 | Survey (R3) |
| 14 | Multimodal Vision Solution Delivery | POST to `/api/ai/screenshot` with streaming solution rendered in teleprompter drawer | M3 | Survey (R3) |
| 15 | Candidate Profile Modal | HUD modal for Target Role, Primary Stack, Experience Level, and Custom Bio | M4 | Survey (R4) |
| 16 | Resume Context Parsing & Injection | PDF resume upload calling `/api/ai/parse-resume` and injecting context into AI prompt | M4 | Survey (R4) |
| 17 | Encrypted Profile Persistence | Storing profile in encrypted local store and synchronizing with `/api/profile/context` | M4 | Survey (R4) |
| 18 | Mobile Companion QR Generation | Dynamic QR code modal for mobile eyeline sync pointing to `/companion/[sessionId]` | M5 | Survey (R5) |
| 19 | Real-Time Companion State Sync | Dispatching live QA dialogue and streaming status to `/api/ai/interview-sync` | M5 | Survey (R5) |
| 20 | Searchable History & Clipboard Copy | History drawer with real-time question search, 1-click clipboard copy, and notch trigger | M5 | Survey (R5) |
| 21 | Vitest Suite 100% Pass | Resolving dual-React resolution collision in `vitest.config.ts` for 100% pass | M6 | Survey (QA) |
| 22 | Cargo, Typecheck & Build Gates | Zero compilation errors in `cargo test`, `npm run typecheck`, and `npm run build:renderer` | M6 | Survey (QA) |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Audio Capture & Deepgram STT Pipeline | Dual-channel native loopback + mic, Nova-3 upgrade, `TECH_KEYTERMS`, 4-stage RMS IPC, strict speaker tagging | none | DONE |
| M2 | 3-Phase Copilot & Backend Proxy Integration | Vite `/api` proxy, Keyring Bearer auth token, Local/Cloud URL switch, case-insensitive delimiter guard, Tradeoffs modifier | none | DONE |
| M3 | Multimodal Vision OCR Screen Solver | Rust `capture_screen` command, `Cmd/Ctrl+Shift+S` shortcut, `/api/ai/screenshot` integration, solution drawer rendering | M2 | DONE |
| M4 | Candidate Profile & Resume Context Injection | `CandidateProfileModal`, resume upload via `/api/ai/parse-resume`, encrypted persistence, prompt context injection | M2 | DONE |
| M5 | Mobile Companion Sync & Session History | `CompanionQRModal`, `/companion/[sessionId]` sync dispatch, history 1-click copy, notch mode access | M2 | DONE |
| M6 | Full Quality Gates & Final Hardening | Vitest dual-React fix, Cargo test pass, TypeScript verification, production renderer build, adversarial review | M1, M3, M4, M5 | DONE |

## Interface Contracts

### Audio Engine ↔ HUD Events
- **IPC Event**: `HudEvent::AudioLevel { source: String, level: f32 }`
  - `source`: `"loopback"` | `"microphone"`
  - `level`: 0.0 to 100.0 (RMS mapped to conversational volume)
- **IPC Event**: `HudEvent::SttTranscript { speaker: String, text: String, is_final: bool }`
  - `speaker`: `"interlocutor"` | `"candidate"`
  - Candidate speech tagged "candidate" ("Ви") strictly bypasses LLM prompt triggers.

### Backend Stream Client ↔ Next.js AI APIs
- **Endpoint**: `/api/ai/dual-stream`
- **Method**: `POST` (SSE Stream)
- **Headers**:
  - `Content-Type: application/json`
  - `Authorization: Bearer <access_token>`
  - `x-ghostboard-client: desktop-app`
- **Payload**:
  ```json
  {
    "question": "string",
    "history": [],
    "directorModifier": "normal | shorter | more_technical | code_example | tradeoffs",
    "candidateProfile": {
      "role": "string",
      "primaryStack": "string",
      "experienceLevel": "string",
      "customBio": "string"
    },
    "outputLanguage": "uk | en"
  }
  ```
- **Stream Format**: Progressive text with phase markers `<<<PHASE_1:HOOK>>>`, `<<<PHASE_2:PILLARS>>>`, `<<<PHASE_3:DEEP_DIVE>>>`.

### Screen Capture ↔ Vision OCR Endpoint
- **IPC Command**: `invoke('capture_screen') -> Promise<{ base64Png: string, width: number, height: number }>`
- **Endpoint**: `/api/ai/screenshot`
- **Payload**:
  ```json
  {
    "imageBase64": "data:image/png;base64,...",
    "mimeType": "image/png",
    "candidateProfile": {},
    "targetLanguage": "uk | en"
  }
  ```
- **Response**:
  ```json
  {
    "quickAnswer": "string",
    "hints": ["string"],
    "codeSnippet": "string",
    "complexity": "string"
  }
  ```

### Candidate Profile Persistence Contract
- **Local File**: Encrypted JSON in app config dir or secure local store.
- **Schema**:
  ```typescript
  interface CandidateProfile {
    role: string;
    primaryStack: string;
    experienceLevel: 'junior' | 'middle' | 'senior' | 'lead' | 'principal';
    customBio?: string;
    resumeKeywords?: string[];
  }
  ```

### Mobile Companion Pairing Contract
- **Endpoint**: `/api/companion/pair`
- **Method**: `POST`
- **Response**: `{ companionUrl: string, token: string, qrCodeDataUrl?: string }`
- **Sync Route**: `POST /api/ai/interview-sync` with `{ event: "ADD_OR_UPDATE_QA", sessionId, qaItem }`

## Code Layout
- Web Core: `src/`
  - `src/app/api/ai/`: Next.js streaming API routes (`dual-stream`, `interview-copilot`, `screenshot`, `parse-resume`).
  - `src/lib/`: Web STT (`deepgramLive.ts`), tab audio capture (`tabAudioCapture.ts`), AI client.
- Desktop App: `desktop/`
  - `desktop/vite.config.ts`: Vite build and dev proxy configuration.
  - `desktop/src/`: React 19 Frontend HUD.
    - `components/`: `EyeLineTeleprompter.tsx`, `DualColumnChat.tsx`, `AudioWaveform.tsx`, `HistoryDrawer.tsx`, `CandidateProfileModal.tsx`, `CompanionQRModal.tsx`.
    - `hooks/`: `useHudStream.ts`, `useAudioCapture.ts`.
    - `lib/`: `streamClient.ts`, `audioEngine.ts`, `techSpeechNormalizer.ts`, `tauriBridge.ts`.
  - `desktop/src-tauri/`: Tauri v2 Rust Core.
    - `src/audio/`: `capture.rs`, `vad.rs`, `resampler.rs`, `mod.rs`.
    - `src/stt/`: `deepgram.rs`.
    - `src/llm/`: `eot.rs`, `gemini.rs`.
    - `src/auth/`: `keyring.rs`, `pkce.rs`, `mod.rs`.
    - `src/ipc/`: `events.rs`.
    - `src/main.rs`: Command registrations and pipeline management.
