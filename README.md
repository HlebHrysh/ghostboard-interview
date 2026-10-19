# 👻 Ghostboard — AI Stealth Interview Copilot

> **Next-generation, real-time autonomous AI copilot and teleprompter for technical software engineering interviews.**  
> Powered by **Deepgram Nova-3 live STT**, **Google Gemini 3.8/3.6 Flash with automated fallback**, and a high-performance **Awwwards-grade Neo-Glassmorphism UI**.

---

## ⚡ Key Highlights

- ⏱️ **Sub-1.5s Response Latency:** From the moment the interviewer finishes speaking, structured answers appear on your screen in ~1.4s.
- 🧊 **Stop-Question / Freeze Mode (`[Space]`):** Pin your current answer in view so you can deliver your points smoothly while the AI continues listening and processing upcoming questions in the background.
- 🔍 **Live Screen & Code OCR (`[F9]` / `[Ctrl+Shift+S]`):** Instantly captures code snippets or algorithms from your screen and breaks them down with complexity analysis, bug fixes, and line-by-line explanations.
- 🛡️ **Stealth Panic Shield (`[Esc]`):** Instantly camouflages the entire UI into an authentic Linux bash terminal or VS Code developer workspace if someone glances at your monitor.
- 🌍 **Technical Phonetic Normalization:** 116+ specialized regex patterns mapping Ukrainian/English/Russian spoken developer slang into precise technical terms (Asyncio, B-Tree, MVCC, GIL, FastAPI, etc.).
- 📱 **Multi-Device Teleprompter HUD:** Mirror live answers, prompts, and notes to a secondary monitor, laptop, tablet, or phone over Wi-Fi/LAN via SSE and REST polling.
- 🎓 **Personalized Profile & 1-Click Role Presets:** Custom context for your specific tech stack, pet projects, and target role (Python Backend, React Frontend, Full-Stack, DevOps, Data Science).

---

## ⌨️ Keyboard Shortcuts

| Key | Action | Description |
|---|---|---|
| **`[Space]`** | **Freeze Mode** | Freeze/unfreeze current answer view. AI keeps listening and queues incoming questions. |
| **`[Q]` / `[Й]`** | **Concise Mode** | Toggle 3-bullet punchy blitz summary for rapid answers. |
| **`[←]` / `[→]`** | **Card Navigation** | Step between newer `[←]` and older `[→]` question cards without window scrolling. |
| **`[C]` / `[С]`** | **Quick Copy** | Copy active answer text to clipboard. |
| **`[Esc]`** | **Panic Shield** | Emergency disguise overlay simulating terminal / IDE. |
| **`[F9]`** | **Screen OCR** | Capture and analyze code or LeetCode problem from screen. |

---

## 🏗️ Architecture

```
                               ┌─────────────────────────┐
                               │   Interviewer Speech    │
                               └────────────┬────────────┘
                                            │
                             ┌──────────────▼──────────────┐
                             │    Tab / Loopback Audio     │
                             │   (PipeWire / VB-Cable)     │
                             └──────────────┬──────────────┘
                                            │ PCM 16kHz
                             ┌──────────────▼──────────────┐
                             │     Deepgram Nova-3 STT     │
                             └──────────────┬──────────────┘
                                            │ Raw text
                             ┌──────────────▼──────────────┐
                             │  Tech Speech Normalizer     │
                             │    (116+ Phonetic Rules)    │
                             └──────────────┬──────────────┘
                                            │ Normalized Prompt + CV Context
                             ┌──────────────▼──────────────┐
                             │    Gemini Flash Fallback    │
                             │ (3.8-flash → 3.6-flash)     │
                             └──────────────┬──────────────┘
                                            │ Structured JSON (~1.4s)
                      ┌─────────────────────┴─────────────────────┐
                      │                                           │
         ┌────────────▼────────────┐                 ┌────────────▼────────────┐
         │  Stealth Copilot UI     │                 │   Secondary Screen HUD  │
         │  (Main Monitor)         │                 │ (Laptop / Mobile / LAN) │
         └─────────────────────────┘                 └─────────────────────────┘
```

---

## 🚀 Quick Start

### 1. Prerequisites
- **Node.js**: v18+ (tested on Node v20/v26)
- **API Keys**:
  - [Google AI Studio](https://aistudio.google.com/app/apikey) — free Gemini API Key
  - [Deepgram Console](https://console.deepgram.com/signup) — free Speech-to-Text Key

### 2. Installation
```bash
# Clone the repository
git clone https://github.com/your-org/ghostboard-interview.git
cd ghostboard-interview

# Install dependencies
npm install
```

### 3. Environment Configuration
Create a `.env.local` file in the project root:
```env
GEMINI_API_KEY=AIzaSy...your_gemini_api_key...
DEEPGRAM_API_KEY=your_deepgram_api_key...
```
*(You can also configure API keys directly inside the application via the `/settings` page at runtime.)*

### 4. Run Development Server
```bash
npm run dev
```
Open **`http://localhost:3001`** in your browser.

---

## 🎙️ Cross-Platform Audio Capture Setup

### 🐧 Linux (Arch / Ubuntu / Fedora)
Ghostboard automatically configures a virtual loopback sink via **PipeWire / PulseAudio** upon clicking **"Почати співбесіду"**. Ensure `pactl` is installed on your system.

### 🪟 Windows
1. Download and install [VB-Audio Virtual Cable](https://vb-audio.com/Cable/) (free).
2. Set Google Meet / Zoom speaker output to **CABLE Input (VB-Audio)**.
3. In Ghostboard, select **CABLE Output (VB-Audio)** as your input device.

### 🍎 macOS
1. Install [BlackHole](https://github.com/ExistentialAudio/BlackHole) (free virtual audio driver).
2. Open **Audio MIDI Setup** → create a **Multi-Output Device** (combining BlackHole + your headphones).
3. Set the Multi-Output Device as system output, and BlackHole as the input in Ghostboard.

---

## 📱 Secondary Monitor / Laptop Teleprompter HUD

To display answers and notes on a second laptop, phone, or monitor without tab-switching:
1. Find your machine's local IP address (e.g. `192.168.1.50`).
2. On your second device, open:  
   **`http://<YOUR-PC-IP>:3001/hud.html`**
3. Real-time updates synchronize automatically via **Server-Sent Events (`/api/companion/stream`)** and local network REST polling.

---

## 🛡️ Privacy & Security

- **Zero Server Audio Storage:** Audio is streamed over encrypted WebSockets directly to Deepgram and processed in-memory. No voice or call recordings are ever saved to our servers.
- **Local Client Persistence:** Candidate profiles and session histories remain strictly in your browser's `localStorage`.
- **Stealth First:** Designed to remain invisible during screen sharing and video calls with rapid emergency masking (`[Esc]`).

---

## 📄 License
MIT License. Created for educational preparation and technical mastery.
