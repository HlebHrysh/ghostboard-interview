# Ghostboard Desktop: E2E Test Infrastructure Specification & Architecture

**Document Version:** 1.0.0  
**Date:** 2026-10-15  
**Target Systems:** Linux (x64), macOS (Apple Silicon / Intel), Windows 10/11 (x64)  
**Integrity Mode:** Opaque-Box Requirement-Driven E2E Testing  
**Applicable Standards:** `ORIGINAL_REQUEST.md`, `PROJECT.md`, `GEMINI.md`, `AGENTS.md`

---

## 1. Executive Summary & Dual Track Testing Methodology

Ghostboard Desktop is an Awwwards-grade, real-time AI interview copilot requiring extreme reliability, sub-second latency, hardware-level screen-share invisibility, and strict dual-channel audio separation. Because the application interacts directly with OS-level compositor APIs, real-time Web Audio graphs, WebSocket speech recognition, and token-by-token streaming LLM endpoints, quality assurance must be backed by an uncompromising **Dual Track E2E Testing Methodology**.

```
┌───────────────────────────────────────────────────────────────────────────────────┐
│                           DUAL TRACK E2E ARCHITECTURE                             │
├─────────────────────────────────────────┬─────────────────────────────────────────┤
│    TRACK 1: OPAQUE-BOX SPECIFICATION    │    TRACK 2: COMPONENT & IPC INTEGRATION  │
│              VALIDATION                 │               RESILIENCE                │
├─────────────────────────────────────────┼─────────────────────────────────────────┤
│ • Requirements-driven (R1–R4)           │ • Preload ContextBridge IPC contracts   │
│ • Zero private implementation coupling  │ • Web Audio graph routing invariants    │
│ • Black-box verification of outputs     │ • 16kHz Linear PCM AudioWorklet math    │
│ • End-to-end user interview journeys    │ • Progressive 3-phase SSE chunk parsing │
│ • Behavioral assertions on UX flow      │ • Network glitch & WebSocket recovery   │
└─────────────────────────────────────────┴─────────────────────────────────────────┘
```

### Track 1: Requirements Opaque-Box Specification Validation
Track 1 treats the entire Ghostboard system as a black box. Test cases are derived strictly from authoritative requirement documents (`ORIGINAL_REQUEST.md`, `PROJECT.md`) and acceptance criteria without making assumptions about internal private state. Observable inputs (audio streams, speech events, hotkeys, UI clicks) produce observable outputs (chat dialogue bubbles, streaming teleprompter tokens, window display affinity flags, exported markdown files).

### Track 2: Component Integration, Edge Invariants & Resilience
Track 2 validates the structural integrity of module boundaries and interface contracts:
1. **Audio Routing Graph:** Strict isolation between `interviewerGainNode` (AI trigger) and `candidateGainNode` (blocked from AI).
2. **Streaming Protocol:** SSE chunk stream delimiter handling (`<<<PHASE_1:HOOK>>>`, `<<<PHASE_2:PILLARS>>>`, `<<<PHASE_3:DEEP_DIVE>>>`, `<<<END>>>`).
3. **IPC ContextBridge:** Type safety, safe parameter deserialization, and error handling for Electron native shell calls.
4. **Resilience & Timing:** Keep-alives, network timeouts, rapid switching, and zero-leak state transitions.

---

## 2. Test Suite Tier Taxonomy

The test suite in `tests/e2e/` is structured into four distinct, progressive tiers:

```
tests/e2e/
├── fixtures/
│   ├── mockAudioGraph.ts         # Web Audio graph & 16kHz PCM simulation
│   ├── mockDeepgramServer.ts     # Deepgram Nova-3 WS server fixture
│   ├── mockElectronBridge.ts     # Electron ContextBridge IPC simulator
│   └── mockSseServer.ts          # Sub-second SSE streaming route fixture
├── tier1-audio-separation.test.ts # Tier 1: Audio Capture & Strict Speaker Guard (>=5 tests)
├── tier1-streaming-chat.test.ts   # Tier 1: Dual-Column Chat & 3-Phase Streaming (>=5 tests)
├── tier1-hud-layout.test.ts       # Tier 1: Eyeline HUD Notch & Screen Protection (>=5 tests)
├── tier1-modifiers.test.ts        # Tier 1: 1-Click AI Modifiers (Bridge/Blitz/Deep) (>=5 tests)
├── tier1-history.test.ts          # Tier 1: Session History & Markdown Export (>=5 tests)
├── tier1-safety.test.ts           # Tier 1: Panic Shield & Freeze Mode (>=5 tests)
├── tier2-boundaries.test.ts       # Tier 2: Boundary, Noise, Timeout & Stress Cases
├── tier3-combinations.test.ts     # Tier 3: Cross-Feature Concurrency & State Combinations
└── tier4-scenarios.test.ts        # Tier 4: Complete Real-World Interview Simulation
```

### Tier 1: Feature Coverage (Core Requirements R1–R4)
Provides at least five independent, comprehensive test cases for each core feature domain:
1. **Audio Separation & Routing (R1):** System loopback capture, tab capture, microphone capture, strict speaker separation guardrail, audio source hot-switching ("весь звук" vs "вкладка/вікно"), dual 60fps VU meters.
2. **Streaming AI Chat (R2):** Dual-column layout separation, SSE progressive 3-phase stream client, token-by-token typewriter rendering, sub-second TTFT extraction, Markdown & code copy actions, phonetic slang normalization.
3. **Interactive HUD Layout (R3):** Eyeline HUD Notch pinned below webcam, full dual-column chat mode, ticker ribbon mode, hardware screen share protection (`WDA_EXCLUDEFROMCAPTURE` / `NSWindowSharingNone`), window opacity (50%–100%), and mouse click-through (`setIgnoreMouseEvents`).
4. **1-Click AI Modifiers (R4):** Emergency Bridge Phrase (`[B]`), Blitz / Shorter Mode (`[Q]`), Deep Dive (`more_technical`), Code Example (`code_example`), dynamic prompt modification during active cards.
5. **Session History & Markdown Export (R4):** In-memory and persistent session storage, real-time fuzzy search filtering, clean Markdown debrief export, automated follow-up Thank-You email drafting.
6. **Essential Safety Utilities (R4):** Panic Shield (`[F12]` disguise terminal with green pytest results + discreet background STT), Freeze Mode (`[Space]` card lock + queue counter badge), safe unfreezing transition.

### Tier 2: Boundary & Corner Cases
Tests system behavior at limits, extreme values, and degraded environments:
- Empty and whitespace-only STT transcripts (filler noise dropped).
- Network timeouts during SSE streaming (graceful abort and fallback).
- Rapid audio source switching in sub-100ms intervals.
- Prolonged audio silence (>15s) with keep-alive ping preservation.
- Massive Markdown answers (10,000+ characters, multi-line code) without DOM freeze.
- Rapid hotkey hammering (Space, B, F12 in rapid succession).
- Partial SSE streams missing phases or with abrupt EOF.
- Audio volume clipping (Float32 values outside `[-1.0, 1.0]`).

### Tier 3: Cross-Feature Combinations
Tests concurrent interactions across distinct modules:
- Candidate speaking into mic while interlocutor answer is actively streaming.
- User clicking AI modifier chip while an active SSE stream is in-flight.
- Panic Shield triggered during active audio capture and streaming.
- Freeze mode activated while 3-phase answer is partially rendered.
- Audio source mode switch initiated mid-question transcription.
- Multi-step emergency sequence (Question -> Bridge -> Panic -> Dismiss -> Answer ready).

### Tier 4: Real-World Application Scenarios
Simulates a complete, multi-stage Senior Software Engineer technical interview:
- Stage 1: Window docking in Eyeline Notch under webcam with hardware protection enabled.
- Stage 2: Spoken behavioral question ("Tell me about high-load microservices architecture") -> Bridge phrase triggered -> Sub-second answer stream delivered.
- Stage 3: Candidate microphone speech explaining project experience -> Displayed as "Ви" -> Strictly ZERO AI prompt generation.
- Stage 4: Spoken coding question with heavy accented slang ("напиши лру кеш з ордерд дікт") -> Phonetic normalizer corrects slang -> 3 progressive phases generated -> Candidate uses Quick Copy (`[C]`).
- Stage 5: Unexpected room intrusion -> Candidate activates Panic Shield (`[F12]`) -> Terminal disguised -> STT continues capturing in background -> Escapes back to session.
- Stage 6: Follow-up question while candidate is speaking -> Freeze Mode (`[Space]`) locks card and queues question -> Unfreezing advances to follow-up.
- Stage 7: Debrief & Export -> Session finalized -> Markdown debrief downloaded with interview questions, code snippets, and follow-up thank-you email.

---

## 3. Test Harness, Environment & Fixtures

To ensure fast, deterministic, CI/CD-friendly execution on Linux, macOS, and Windows without requiring physical microphones or GPU displays, the test infrastructure uses modular software harnesses:

### 1. `MockWebAudioGraph`
Simulates the Web Audio API graph:
- `AudioContext` with state management (`running`, `suspended`, `closed`).
- `MediaStreamAudioSourceNode` for remote interlocutor and candidate mic.
- `GainNode` for `interviewerGain` and `candidateGain`.
- `AnalyserNode` computing RMS volume levels (0–100) at 60fps.
- Resampling helper implementing the exact 16-bit linear PCM conversion formula:
  $$\text{int16} = \max(-1, \min(1, \text{sample})) \times (\text{sample} < 0 ? 0\text{x}8000 : 0\text{x}7\text{FFF})$$

### 2. `MockDeepgramServer`
Simulates Deepgram Nova-3 WebSocket protocol:
- Handles `wss://api.deepgram.com/v1/listen` connection handshake with token subprotocol.
- Accepts raw 16kHz linear PCM binary frames.
- Receives `{ type: 'KeepAlive' }` pings.
- Emits realistic Deepgram JSON responses with `channel.alternatives[0].transcript`, `is_final`, and `speech_final`.

### 3. `MockSSEStreamServer`
Simulates `/api/ai/dual-stream` Server-Sent Events protocol:
- Emits progressive SSE events:
  - `event: telemetry` (`{ ttftMs, model, timestamp }`)
  - `event: chunk` (`{ text, model }`)
  - `event: complete` (`{ hook, pillars, deepDive, ttftMs, totalDurationMs }`)
- Simulates realistic chunk delivery intervals (sub-second TTFT < 900ms).
- Simulates fallback across `FLASH_MODELS` upon HTTP 429/503.

### 4. `MockElectronBridge`
Simulates the Electron Main process and `contextBridge` (`window.desktopAPI`):
- `setContentProtection(enable)` tracking hardware capture flags.
- `setWindowMode(mode)` validating geometry transitions (`launcher`, `stealth`, `ticker`).
- `setIgnoreMouseEvents(ignore, options)` validating click-through forwards.
- `setOpacity(val)` clamping between 0.5 and 1.0.
- `exportMarkdown(content, filename)` simulating secure local filesystem export.

---

## 4. Authoritative Verification Mapping

| Req ID | Requirement Description | Acceptance Criteria | Verified By Test Suite |
|---|---|---|---|
| **R1** | Dual-channel audio capture & strict speaker separation | Interlocutor triggers AI; mic renders as "Ви" and NEVER triggers AI; audio source switch works; dual VU meters. | `tier1-audio-separation.test.ts` |
| **R2** | Sub-second streaming AI chat architecture | Dual-column layout; SSE 3-phase stream; typewriter effect; sub-second TTFT; markdown/code copy; speech normalizer. | `tier1-streaming-chat.test.ts` |
| **R3** | Awwwards-grade interactive desktop HUD | Eyeline notch <-> dual-column layout; screen share invisibility (Win/Mac); opacity; click-through; spring physics. | `tier1-hud-layout.test.ts` |
| **R4.1**| 1-click AI modifiers | Bridge Phrase [B], Blitz/Shorter [Q], Deep Dive, Code Example immediately stream revised answers. | `tier1-modifiers.test.ts` |
| **R4.2**| Session history & Markdown export | Chronological session storage, live fuzzy search filter, 1-click Markdown debrief export with thank-you email. | `tier1-history.test.ts` |
| **R4.3**| Essential safety utilities | Panic Shield [F12] terminal disguise with background STT; Freeze mode [Space] card lock and queue counter. | `tier1-safety.test.ts` |
| **R1–R4**| Boundaries & Degraded Conditions | Empty transcripts, timeouts, rapid audio switching, silence keep-alives, huge answers, hotkey hammering, volume clipping. | `tier2-boundaries.test.ts` |
| **R1–R4**| Cross-Feature Combinations | Concurrency: mic during streaming, modifier during stream, panic during capture, freeze during stream. | `tier3-combinations.test.ts` |
| **R1–R4**| Full End-to-End User Journey | Full mock interview simulation: setup, behavioral question, mic answer, coding question, panic shield, freeze, debrief. | `tier4-scenarios.test.ts` |

---

## 5. Test Execution Protocol

### Running the Entire E2E Test Suite
```bash
npx vitest run tests/e2e
```

### Running Individual Tiers
```bash
# Tier 1 Feature Suites
npx vitest run tests/e2e/tier1-audio-separation.test.ts
npx vitest run tests/e2e/tier1-streaming-chat.test.ts
npx vitest run tests/e2e/tier1-hud-layout.test.ts
npx vitest run tests/e2e/tier1-modifiers.test.ts
npx vitest run tests/e2e/tier1-history.test.ts
npx vitest run tests/e2e/tier1-safety.test.ts

# Tier 2 Boundary Cases
npx vitest run tests/e2e/tier2-boundaries.test.ts

# Tier 3 Cross-Feature Combinations
npx vitest run tests/e2e/tier3-combinations.test.ts

# Tier 4 Real-World Application Scenarios
npx vitest run tests/e2e/tier4-scenarios.test.ts
```

### Pass Criteria
1. **100% Pass Rate:** All test cases in Tiers 1–4 must execute and pass cleanly.
2. **Deterministic Execution:** Zero race conditions, zero unhandled promise rejections, zero orphaned timers.
3. **Complete Isolation:** Each test case creates and tears down its own state without cross-test leakage.
