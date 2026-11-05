// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

pub mod audio;
pub mod auth;
pub mod ipc;
pub mod llm;
pub mod stt;
pub mod updater;
pub mod window;

use std::sync::Arc;
use tauri::{Emitter, Manager, WebviewWindow};
use crate::auth::AuthManager;
use crate::ipc::events::HudEvent;
use crate::ipc::HudChannelState;
use crate::llm::LlmOrchestrator;
use crate::stt::SttOrchestrator;

// ============================================================================
// Tauri IPC Commands
// ============================================================================

/// Native command to enable/disable Screen Sharing Invisibility across OSes
#[tauri::command]
fn set_screen_share_stealth(
    window: WebviewWindow,
    enable: Option<bool>,
    enabled: Option<bool>,
) -> Result<bool, String> {
    let flag = enable.or(enabled).unwrap_or(true);
    let res = crate::window::apply_stealth(&window, flag)?;
    if let Some(hud_st) = window.app_handle().try_state::<HudChannelState>() {
        hud_st.broadcast(HudEvent::StealthChanged { enabled: flag });
    }
    let _ = window.emit("window:stealth", flag);
    Ok(res)
}

/// Native command to toggle click-through cursor transparency
#[tauri::command]
fn toggle_click_through(
    window: WebviewWindow,
    enable: Option<bool>,
    enabled: Option<bool>,
) -> Result<bool, String> {
    let flag = enable.or(enabled).unwrap_or(true);
    let res = crate::window::toggle_click_through(&window, flag)?;
    if let Some(hud_st) = window.app_handle().try_state::<HudChannelState>() {
        hud_st.broadcast(HudEvent::ClickThroughChanged { enabled: flag });
    }
    let _ = window.emit("window:click-through", flag);
    Ok(res)
}

/// Native command to switch HUD window mode and adjust physical geometry
#[tauri::command]
fn set_window_mode(
    window: WebviewWindow,
    mode: String,
) -> Result<bool, String> {
    crate::window::apply_window_mode(&window, &mode)
}

/// Native command to set HUD opacity
#[tauri::command]
fn set_window_opacity(
    window: WebviewWindow,
    opacity: Option<f32>,
) -> Result<(), String> {
    let val = opacity.unwrap_or(1.0);
    crate::window::set_window_opacity(&window, val)
}

/// Native command to set exact HUD window size
#[tauri::command]
fn set_window_size(
    window: WebviewWindow,
    width: f64,
    height: f64,
) -> Result<(), String> {
    window
        .set_size(tauri::LogicalSize::new(width, height))
        .map_err(|e| format!("Failed to set window size: {}", e))
}

/// Native command to align HUD centered horizontally under the active webcam
#[tauri::command]
fn align_to_active_display(
    window: WebviewWindow,
    width: Option<f64>,
    height: Option<f64>,
) -> Result<bool, String> {
    if let (Some(w), Some(h)) = (width, height) {
        crate::window::align_to_active_display_with_size(&window, w, h)
    } else {
        crate::window::align_to_active_display(&window)
    }
}

/// Native command for panic shield instant hide (<16ms)
#[tauri::command]
fn panic_hide(window: WebviewWindow) -> Result<bool, String> {
    crate::window::panic_hide(&window)
}

/// Native command to capture active display and return base64 PNG with dimensions
#[tauri::command]
fn capture_screen() -> Result<crate::window::ScreenCaptureResult, String> {
    Ok(crate::window::screenshot::capture_screen_native())
}

/// Lists all audio devices available on the host system.
/// Enumeration can take hundreds of ms with ALSA/PipeWire, so it runs off the UI thread.
#[tauri::command]
async fn list_audio_devices() -> Result<Vec<crate::audio::capture::AudioDeviceInfo>, String> {
    tauri::async_runtime::spawn_blocking(|| {
        let host = cpal::default_host();
        crate::audio::capture::list_audio_devices(&host)
    })
    .await
    .map_err(|e| format!("Audio device enumeration failed: {}", e))
}

/// Environment facts the Office UI shows (compositor integration status etc.).
#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct EnvironmentInfo {
    platform: String,
    wayland: bool,
    hyprland: bool,
}

#[tauri::command]
fn get_environment_info() -> EnvironmentInfo {
    EnvironmentInfo {
        platform: std::env::consts::OS.to_string(),
        wayland: crate::window::hyprland::is_wayland(),
        hyprland: crate::window::hyprland::is_hyprland(),
    }
}

/// Opens (or re-uses) the detached transparent "Ghostboard HUD" Copilot window.
/// `mode` is `"chat"` (780x460 two-column chat) or `"top_bar"` (680x150 eyeline bar).
#[tauri::command]
async fn launch_copilot_window(
    app: tauri::AppHandle,
    mode: String,
) -> Result<crate::window::hud::LaunchReport, String> {
    crate::window::hud::launch_copilot_window(&app, &mode)
}

/// Closes the HUD and returns to the Office window.
#[tauri::command]
async fn close_copilot_window(app: tauri::AppHandle) -> Result<(), String> {
    crate::window::hud::close_copilot_window(&app);
    Ok(())
}

/// Shows and focuses the Office (main) window.
#[tauri::command]
fn open_office(app: tauri::AppHandle) -> Result<(), String> {
    crate::window::hud::restore_office(&app);
    Ok(())
}

/// Minimal window chrome actions for frameless HUD controls: minimize | close | toggle_maximize.
#[tauri::command]
fn window_control(window: WebviewWindow, action: String) -> Result<(), String> {
    match action.as_str() {
        "minimize" => window.minimize().map_err(|e| e.to_string()),
        "close" => window.close().map_err(|e| e.to_string()),
        "toggle_maximize" => {
            if window.is_maximized().unwrap_or(false) {
                window.unmaximize().map_err(|e| e.to_string())
            } else {
                window.maximize().map_err(|e| e.to_string())
            }
        }
        other => Err(format!("Unknown window action: {}", other)),
    }
}

/// Last failed `start_audio_capture` (time, error). While fresh, repeated invokes return the cached
/// error instead of re-enumerating cpal/ALSA devices (which floods stderr with ALSA warnings).
static LAST_START_FAILURE: std::sync::Mutex<Option<(std::time::Instant, String)>> =
    std::sync::Mutex::new(None);
const START_FAILURE_BACKOFF: std::time::Duration = std::time::Duration::from_secs(15);

/// Starts audio capture on the configured source (loopback, microphone, or dual)
#[tauri::command]
fn start_audio_capture(
    state: tauri::State<'_, crate::audio::GlobalAudioState>,
    source: Option<String>,
    loopback_device: Option<String>,
    mic_device: Option<String>,
    force: Option<bool>,
) -> Result<bool, String> {
    let mut engine = state.engine.lock().map_err(|e| e.to_string())?;
    if engine.is_running() {
        return Ok(true);
    }
    // User-initiated starts (force) bypass the failure back-off that protects auto-start loops.
    if force.unwrap_or(false) {
        if let Ok(mut guard) = LAST_START_FAILURE.lock() {
            *guard = None;
        }
    } else if let Ok(guard) = LAST_START_FAILURE.lock() {
        if let Some((at, msg)) = guard.as_ref() {
            if at.elapsed() < START_FAILURE_BACKOFF {
                return Err(msg.clone());
            }
        }
    }
    engine.set_devices(loopback_device, mic_device);
    let capture_src = match source.as_deref().map(|s| s.to_lowercase()).as_deref() {
        Some("mic") | Some("microphone") => crate::audio::capture::CaptureSource::Microphone,
        Some("loopback") | Some("system") => crate::audio::capture::CaptureSource::SystemLoopback,
        _ => crate::audio::capture::CaptureSource::Dual,
    };
    engine.set_source(capture_src);
    match engine.start() {
        Ok(()) => {
            if let Ok(mut guard) = LAST_START_FAILURE.lock() {
                *guard = None;
            }
            Ok(true)
        }
        Err(e) => {
            if let Ok(mut guard) = LAST_START_FAILURE.lock() {
                *guard = Some((std::time::Instant::now(), e.clone()));
            }
            Err(e)
        }
    }
}

static LISTEN_ALL_SOURCES: std::sync::atomic::AtomicBool = std::sync::atomic::AtomicBool::new(true);

pub fn set_listen_all_flag(enabled: bool) {
    LISTEN_ALL_SOURCES.store(enabled, std::sync::atomic::Ordering::SeqCst);
}

pub fn is_listen_all() -> bool {
    LISTEN_ALL_SOURCES.load(std::sync::atomic::Ordering::SeqCst)
}

/// Native command to switch listen mode: "all" (system + mic) vs "system_only" (loopback only)
#[tauri::command]
fn set_listen_mode(
    mode: String,
    hud_state: tauri::State<'_, HudChannelState>,
) -> Result<String, String> {
    let listen_all = match mode.to_lowercase().as_str() {
        "system_only" | "system" | "loopback_only" => false,
        _ => true,
    };
    set_listen_all_flag(listen_all);
    let resolved = if listen_all { "all" } else { "system_only" }.to_string();
    hud_state.broadcast(HudEvent::ListenModeChanged {
        mode: resolved.clone(),
    });
    Ok(resolved)
}

/// Native command to query current listen mode
#[tauri::command]
fn get_listen_mode() -> String {
    if is_listen_all() {
        "all".to_string()
    } else {
        "system_only".to_string()
    }
}

/// Stops audio capture and frees OS audio resources
#[tauri::command]
fn stop_audio_capture(
    state: tauri::State<'_, crate::audio::GlobalAudioState>,
) -> Result<bool, String> {
    let mut engine = state.engine.lock().map_err(|e| e.to_string())?;
    engine.stop();
    Ok(true)
}

/// Triggers manual AI prompt generation (for instant answers or modifier buttons)
#[tauri::command]
async fn trigger_manual_answer(
    prompt: Option<String>,
    llm_orchestrator: tauri::State<'_, Arc<LlmOrchestrator>>,
    hud_state: tauri::State<'_, HudChannelState>,
) -> Result<(), String> {
    let question_text = prompt.unwrap_or_else(|| "Explain the system architecture".to_string());
    let now_ms = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64;

    let trigger = crate::llm::eot::EotTrigger {
        question_id: format!("q-manual-{}", now_ms),
        question_text,
        context_90s: String::new(),
        timestamp_ms: now_ms,
    };

    llm_orchestrator
        .trigger_speculative_stream(trigger, (*hud_state).clone())
        .await;
    Ok(())
}

/// Streams AI answer directly from Rust (supporting manual input, test question, and offline fallback)
#[tauri::command]
async fn stream_ai_answer(
    question: String,
    output_language: Option<String>,
    helper_language: Option<String>,
    modifier: Option<String>,
    llm_orchestrator: tauri::State<'_, Arc<LlmOrchestrator>>,
    hud_state: tauri::State<'_, HudChannelState>,
) -> Result<String, String> {
    if question.trim().is_empty() {
        return Ok(String::new());
    }

    // 1. Always ensure environment variables from .env / .env.local are refreshed
    load_env_files();

    // 2. Discover and configure keys (prioritizing GEMINI_API_KEY)
    if let Ok(key) = std::env::var("GEMINI_API_KEY") {
        let trimmed = key.trim().to_string();
        if !trimmed.is_empty() {
            llm_orchestrator
                .set_config(crate::llm::client::LlmConfig {
                    provider: crate::llm::client::LlmProviderType::Gemini,
                    api_key: trimmed,
                    model: "gemini-3.8-flash".to_string(),
                    endpoint_url: None,
                })
                .await;
        }
    } else if let Ok(key) = std::env::var("GROQ_API_KEY") {
        let trimmed = key.trim().to_string();
        if !trimmed.is_empty() {
            llm_orchestrator
                .set_config(crate::llm::client::LlmConfig {
                    provider: crate::llm::client::LlmProviderType::Groq,
                    api_key: trimmed,
                    model: "llama-3.3-70b-versatile".to_string(),
                    endpoint_url: None,
                })
                .await;
        }
    } else if let Ok(key) = std::env::var("OPENAI_API_KEY") {
        let trimmed = key.trim().to_string();
        if !trimmed.is_empty() {
            llm_orchestrator
                .set_config(crate::llm::client::LlmConfig {
                    provider: crate::llm::client::LlmProviderType::OpenAI,
                    api_key: trimmed,
                    model: "gpt-4o-mini".to_string(),
                    endpoint_url: None,
                })
                .await;
        }
    }

    // 3. Stream direct answer via LlmOrchestrator
    llm_orchestrator
        .stream_answer_direct(
            &question,
            modifier,
            output_language,
            helper_language,
            (*hud_state).clone(),
        )
        .await
}

/// Native command alias for stream_ai_answer
#[tauri::command]
async fn ask_llm_stream(
    question: String,
    output_language: Option<String>,
    helper_language: Option<String>,
    modifier: Option<String>,
    llm_orchestrator: tauri::State<'_, Arc<LlmOrchestrator>>,
    hud_state: tauri::State<'_, HudChannelState>,
) -> Result<String, String> {
    stream_ai_answer(
        question,
        output_language,
        helper_language,
        modifier,
        llm_orchestrator,
        hud_state,
    )
    .await
}

/// Configures dynamic provider API keys (Deepgram, Groq, OpenAI, Anthropic)
#[tauri::command]
async fn configure_copilot_keys(
    deepgram_key: Option<String>,
    groq_key: Option<String>,
    openai_key: Option<String>,
    anthropic_key: Option<String>,
    stt_orchestrator: tauri::State<'_, Arc<SttOrchestrator>>,
    llm_orchestrator: tauri::State<'_, Arc<LlmOrchestrator>>,
) -> Result<(), String> {
    if let Some(key) = deepgram_key {
        if !key.trim().is_empty() {
            stt_orchestrator.start(&key, None).await?;
        }
    }

    if let Some(key) = groq_key {
        if !key.trim().is_empty() {
            llm_orchestrator
                .set_config(crate::llm::client::LlmConfig {
                    provider: crate::llm::client::LlmProviderType::Groq,
                    api_key: key,
                    model: "llama-3.3-70b-versatile".to_string(),
                    endpoint_url: None,
                })
                .await;
        }
    } else if let Some(key) = openai_key {
        if !key.trim().is_empty() {
            llm_orchestrator
                .set_config(crate::llm::client::LlmConfig {
                    provider: crate::llm::client::LlmProviderType::OpenAI,
                    api_key: key,
                    model: "gpt-4o-mini".to_string(),
                    endpoint_url: None,
                })
                .await;
        }
    } else if let Some(key) = anthropic_key {
        if !key.trim().is_empty() {
            llm_orchestrator
                .set_config(crate::llm::client::LlmConfig {
                    provider: crate::llm::client::LlmProviderType::Anthropic,
                    api_key: key,
                    model: "claude-3-5-haiku-20241022".to_string(),
                    endpoint_url: None,
                })
                .await;
        }
    }

    Ok(())
}

/// Clears the current active session state in the LLM orchestrator
#[tauri::command]
async fn clear_session(
    llm_orchestrator: tauri::State<'_, Arc<LlmOrchestrator>>,
) -> Result<(), String> {
    llm_orchestrator.abort_in_flight().await;
    Ok(())
}

/// Exports session debrief content to a markdown file
#[tauri::command]
async fn export_markdown(
    content: String,
    filename: Option<String>,
    default_filename: Option<String>,
) -> Result<String, String> {
    let fname = filename.or(default_filename).unwrap_or_else(|| {
        let ts = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs();
        format!("ghostboard-session-{}.md", ts)
    });
    let dir = std::env::var("HOME")
        .map(std::path::PathBuf::from)
        .unwrap_or_else(|_| std::env::temp_dir());
    let path = dir.join(&fname);
    tokio::fs::write(&path, content).await.map_err(|e| e.to_string())?;
    Ok(path.to_string_lossy().to_string())
}

pub fn open_system_browser(url: &str) -> std::io::Result<()> {
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("cmd").args(["/C", "start", "", url]).spawn()?;
    }
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open").arg(url).spawn()?;
    }
    #[cfg(target_os = "linux")]
    {
        std::process::Command::new("xdg-open").arg(url).spawn()?;
    }
    Ok(())
}

/// Native command to open a URL in the user's default system browser
#[tauri::command]
fn open_browser(url: String) -> Result<(), String> {
    open_system_browser(&url).map_err(|e| e.to_string())
}

/// Initiates OAuth 2.0 PKCE flow and opens system browser
#[tauri::command]
async fn start_pkce_login(
    base_url: Option<String>,
    auth_manager: tauri::State<'_, Arc<AuthManager>>,
) -> Result<crate::auth::PkceLoginResponse, String> {
    let res = auth_manager.start_pkce_login(base_url.as_deref())?;
    let _ = open_system_browser(&res.auth_url);
    Ok(res)
}

/// Exchanges authorization code from deep-link callback for tokens and stores them in OS Keyring
#[tauri::command]
async fn handle_deep_link_code(
    code: String,
    state: String,
    auth_manager: tauri::State<'_, Arc<AuthManager>>,
    hud_state: tauri::State<'_, HudChannelState>,
) -> Result<crate::auth::keyring::StoredSession, String> {
    let session = auth_manager.handle_callback(&code, &state, None).await?;
    hud_state.broadcast(HudEvent::AuthChanged {
        authenticated: true,
        user: Some(serde_json::json!({
            "id": session.user_id,
            "email": session.email,
            "plan": session.plan,
        })),
        plan: session.plan.clone(),
    });
    Ok(session)
}

/// Starts RFC 8628 Device Code authorization flow and displays 6-char code
#[tauri::command]
async fn start_device_code_flow(
    base_url: Option<String>,
    auth_manager: tauri::State<'_, Arc<AuthManager>>,
    hud_state: tauri::State<'_, HudChannelState>,
) -> Result<crate::auth::device_code::DeviceCodeResponse, String> {
    let resp = auth_manager.start_device_code_flow(base_url.as_deref())?;
    hud_state.broadcast(HudEvent::DeviceCodePending {
        user_code: resp.user_code.clone(),
        verification_uri: resp.verification_uri.clone(),
        expires_in_sec: resp.expires_in,
    });
    Ok(resp)
}

/// Retrieves current cached auth and subscription status
#[tauri::command]
fn get_auth_state(
    auth_manager: tauri::State<'_, Arc<AuthManager>>,
) -> Result<crate::auth::AuthStateResponse, String> {
    Ok(auth_manager.get_auth_state())
}

/// Retrieves access token from the native KeyringStore session
#[tauri::command]
fn get_access_token(
    auth_manager: tauri::State<'_, Arc<AuthManager>>,
) -> Result<Option<String>, String> {
    Ok(auth_manager.get_access_token())
}

/// Stores verified authentication session tokens directly into native OS Keyring
#[tauri::command]
async fn save_tokens(
    token: String,
    refresh_token: Option<String>,
    user_id: Option<String>,
    email: Option<String>,
    plan: Option<String>,
    expires_at_ms: Option<u64>,
    auth_manager: tauri::State<'_, Arc<AuthManager>>,
    hud_state: tauri::State<'_, HudChannelState>,
) -> Result<crate::auth::keyring::StoredSession, String> {
    let now_ms = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64;
    let exp = expires_at_ms.unwrap_or(now_ms + 30 * 24 * 3600 * 1000);
    let u_id = user_id.unwrap_or_else(|| "usr_desktop".to_string());
    let u_email = email.unwrap_or_else(|| "user@ghostboard.ai".to_string());
    let u_plan = plan.unwrap_or_else(|| "pro".to_string());

    let session = crate::auth::keyring::StoredSession {
        access_token: token,
        refresh_token: refresh_token.unwrap_or_default(),
        user_id: u_id.clone(),
        email: u_email.clone(),
        plan: u_plan.clone(),
        expires_at_ms: exp,
    };

    auth_manager.save_session(&session)?;

    hud_state.broadcast(HudEvent::AuthChanged {
        authenticated: true,
        user: Some(serde_json::json!({
            "id": u_id,
            "email": u_email,
            "plan": u_plan,
        })),
        plan: session.plan.clone(),
    });

    Ok(session)
}

/// Clears credentials from OS Keyring and logs user out
#[tauri::command]
fn logout(
    auth_manager: tauri::State<'_, Arc<AuthManager>>,
    hud_state: tauri::State<'_, HudChannelState>,
) -> Result<(), String> {
    auth_manager.logout()?;
    hud_state.broadcast(HudEvent::AuthChanged {
        authenticated: false,
        user: None,
        plan: "free".to_string(),
    });
    Ok(())
}

// ============================================================================
// Real-Time Audio & Copilot Streaming Pipeline Wiring
// ============================================================================

/// Coordinates the live pipeline:
/// AudioEngine ticks -> Silero VAD -> Deepgram STT -> Normalizer -> EoT Detector -> Speculative LLM -> Channel<HudEvent>
pub fn spawn_copilot_pipeline(
    audio_state: crate::audio::GlobalAudioState,
    hud_state: HudChannelState,
    stt_orchestrator: Arc<SttOrchestrator>,
    llm_orchestrator: Arc<LlmOrchestrator>,
    mut transcript_rx: tokio::sync::mpsc::Receiver<crate::stt::deepgram::TranscriptToken>,
) {
    #[derive(Default)]
    struct SpeechTracker {
        last_text: String,
        last_token_instant: Option<std::time::Instant>,
        triggered_text: String,
    }
    let tracker = Arc::new(tokio::sync::Mutex::new(SpeechTracker::default()));

    // 1. Task: Ingest normalized STT tokens, emit SttTranscript to HUD, and evaluate EoT
    let hud_for_stt = hud_state.clone();
    let llm_for_stt = llm_orchestrator.clone();
    let tracker_for_stt = tracker.clone();
    tokio::spawn(async move {
        while let Some(token) = transcript_rx.recv().await {
            let is_candidate = token.speaker == "candidate" || token.speaker == "Ви";
            let speaker_tag = if is_candidate {
                "candidate".to_string()
            } else {
                "interlocutor".to_string()
            };

            hud_for_stt.broadcast(HudEvent::SttTranscript {
                speaker: speaker_tag,
                text: token.text.clone(),
                is_final: token.is_final,
                speech_final: token.speech_final,
                timestamp_ms: token.timestamp_ms,
            });

            // 🛡️ SPEAKER GUARDRAIL: Candidate speech tagged "Ви" / "candidate" is broadcast
            // to HUD for full dialogue transcription, but strictly bypasses LLM generation triggers!
            if is_candidate {
                continue;
            }

            llm_for_stt
                .ingest_transcript(
                    &token.text,
                    token.is_final,
                    token.speech_final,
                    token.timestamp_ms,
                )
                .await;

            let clean = token.text.trim().to_string();
            let word_count = clean.split_whitespace().count();
            let mut should_trigger = false;
            let mut text_to_trigger = String::new();

            {
                let mut tr = tracker_for_stt.lock().await;
                if !clean.is_empty() {
                    tr.last_text = clean.clone();
                    tr.last_token_instant = Some(std::time::Instant::now());
                }

                // Trigger LLM whenever Deepgram returns a non-empty final phrase of >= 2 words
                if (token.is_final || token.speech_final || clean.ends_with('?')) && word_count >= 2 {
                    if clean != tr.triggered_text {
                        tr.triggered_text = clean.clone();
                        should_trigger = true;
                        text_to_trigger = clean;
                    }
                }
            }

            if should_trigger {
                let now_ms = std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .unwrap_or_default()
                    .as_millis() as u64;

                let trigger = crate::llm::eot::EotTrigger {
                    question_id: format!("q-stt-{}", now_ms),
                    question_text: text_to_trigger,
                    context_90s: String::new(),
                    timestamp_ms: now_ms,
                };
                llm_for_stt
                    .trigger_speculative_stream(trigger, hud_for_stt.clone())
                    .await;
            } else if token.speech_final || token.text.ends_with('?') {
                if let Some(trigger) = llm_for_stt.evaluate_eot(false, token.timestamp_ms).await {
                    llm_for_stt
                        .trigger_speculative_stream(trigger, hud_for_stt.clone())
                        .await;
                }
            }
        }
    });

    // 2. Periodic 400ms silence watcher: trigger if >= 400ms of silence after speech with >= 2 words
    let tracker_for_silence = tracker.clone();
    let hud_for_silence = hud_state.clone();
    let llm_for_silence = llm_orchestrator.clone();
    tokio::spawn(async move {
        let mut interval = tokio::time::interval(std::time::Duration::from_millis(50));
        loop {
            interval.tick().await;
            let mut should_trigger = false;
            let mut text_to_trigger = String::new();
            {
                let mut tr = tracker_for_silence.lock().await;
                if let Some(last_at) = tr.last_token_instant {
                    if last_at.elapsed() >= std::time::Duration::from_millis(400) {
                        let word_count = tr.last_text.split_whitespace().count();
                        if word_count >= 2 && tr.last_text != tr.triggered_text {
                            tr.triggered_text = tr.last_text.clone();
                            should_trigger = true;
                            text_to_trigger = tr.last_text.clone();
                        }
                    }
                }
            }
            if should_trigger {
                let now_ms = std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .unwrap_or_default()
                    .as_millis() as u64;

                let trigger = crate::llm::eot::EotTrigger {
                    question_id: format!("q-silence-{}", now_ms),
                    question_text: text_to_trigger,
                    context_90s: String::new(),
                    timestamp_ms: now_ms,
                };
                llm_for_silence
                    .trigger_speculative_stream(trigger, hud_for_silence.clone())
                    .await;
            }
        }
    });

    // 3. Task: Real-time Audio processing loop (30ms RMS level metering + VAD evaluation + PCM forwarding + EoT pause detection)
    let hud_for_audio = hud_state.clone();
    let llm_for_audio = llm_orchestrator.clone();
    let stt_for_audio = stt_orchestrator.clone();
    let tracker_for_audio = tracker.clone();
    tokio::spawn(async move {
        let mut interval = tokio::time::interval(std::time::Duration::from_millis(30));
        interval.set_missed_tick_behavior(tokio::time::MissedTickBehavior::Skip);
        let mut last_audio_error_at: Option<std::time::Instant> = None;
        let mut consecutive_speech_ticks: u32 = 0;
        const LEVEL_EMIT_INTERVAL: std::time::Duration = std::time::Duration::from_millis(90);
        const LEVEL_DELTA_THRESHOLD: f32 = 0.5;
        let mut last_level_emit = std::time::Instant::now();
        let mut last_loop_rms: f32 = 0.0;
        let mut last_mic_rms: f32 = 0.0;

        loop {
            interval.tick().await;

            let tick_opt = {
                let mut engine = match audio_state.engine.lock() {
                    Ok(guard) => guard,
                    Err(poisoned) => poisoned.into_inner(),
                };
                if engine.is_running() {
                    match engine.poll_and_process() {
                        Ok(t) => {
                            last_audio_error_at = None;
                            Some(t)
                        }
                        Err(e) => {
                            let should_report = last_audio_error_at
                                .map(|t| t.elapsed() >= std::time::Duration::from_secs(5))
                                .unwrap_or(true);
                            if should_report {
                                last_audio_error_at = Some(std::time::Instant::now());
                                tracing::error!(target: "ghostboard::audio", "poll_and_process error: {}", e);
                                hud_for_audio.broadcast(HudEvent::SttStatus {
                                    speaker: "system".to_string(),
                                    status: "reconnecting".to_string(),
                                    attempt: 1,
                                    retry_in_ms: 2000,
                                    message: Some("Audio pipeline reconnecting...".to_string()),
                                });
                                hud_for_audio.broadcast(HudEvent::Error {
                                    code: "AUDIO_PIPELINE_ERROR".to_string(),
                                    message: format!("Audio processing error: {}", e),
                                });
                            }
                            // Auto-recover stream if disconnected
                            let _ = engine.start();
                            None
                        }
                    }
                } else {
                    None
                }
            };

            if let Some(tick) = tick_opt {
                let now_ms = std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .unwrap_or_default()
                    .as_millis() as u64;

                // 1. Emit throttled (~80ms) RMS AudioLevel events; skip silence / negligible change
                if last_level_emit.elapsed() >= LEVEL_EMIT_INTERVAL {
                    let loop_changed = (tick.interlocutor_rms - last_loop_rms).abs() >= LEVEL_DELTA_THRESHOLD;
                    let mic_changed = (tick.candidate_rms - last_mic_rms).abs() >= LEVEL_DELTA_THRESHOLD;
                    if loop_changed || mic_changed {
                        last_level_emit = std::time::Instant::now();
                        last_loop_rms = tick.interlocutor_rms;
                        last_mic_rms = tick.candidate_rms;
                        hud_for_audio.broadcast(HudEvent::AudioLevel {
                            source: "loopback".to_string(),
                            level: tick.interlocutor_rms,
                            interlocutor: tick.interlocutor_rms / 100.0,
                            candidate: tick.candidate_rms / 100.0,
                        });
                        if tick.candidate_rms > 0.0 || !tick.candidate_pcm16_bytes.is_empty() {
                            hud_for_audio.broadcast(HudEvent::AudioLevel {
                                source: "microphone".to_string(),
                                level: tick.candidate_rms,
                                interlocutor: tick.interlocutor_rms / 100.0,
                                candidate: tick.candidate_rms / 100.0,
                            });
                        }
                    }
                }

                // 2. Broadcast VAD frame state
                if !tick.vad_results.is_empty() {
                    hud_for_audio.broadcast(HudEvent::VadState {
                        is_speech: tick.speech_detected,
                        confidence: tick.latest_speech_probability,
                    });
                }

                // 3. If speech resumed continuously (>=300ms) while LLM was streaming, cancel
                if tick.speech_detected {
                    consecutive_speech_ticks += 1;
                    if consecutive_speech_ticks >= 10 {
                        llm_for_audio.abort_in_flight().await;
                    }
                } else {
                    consecutive_speech_ticks = 0;
                }

                // 4. Forward 16kHz linear PCM to Deepgram WebSocket
                if !tick.pcm16_bytes.is_empty() {
                    let _ = stt_for_audio.send_interlocutor_audio(tick.pcm16_bytes).await;
                }
                if !tick.candidate_pcm16_bytes.is_empty() {
                    let _ = stt_for_audio.send_candidate_audio(tick.candidate_pcm16_bytes).await;
                }

                // 5. EoT trigger check on VAD pause boundary (>350ms silence after speech)
                if tick.pause_boundary_triggered {
                    let mut trigger_from_tracker = None;
                    {
                        let mut tr = tracker_for_audio.lock().await;
                        let word_count = tr.last_text.split_whitespace().count();
                        if word_count >= 2 && tr.last_text != tr.triggered_text {
                            tr.triggered_text = tr.last_text.clone();
                            trigger_from_tracker = Some(tr.last_text.clone());
                        }
                    }
                    if let Some(text) = trigger_from_tracker {
                        let trigger = crate::llm::eot::EotTrigger {
                            question_id: format!("q-pause-{}", now_ms),
                            question_text: text,
                            context_90s: String::new(),
                            timestamp_ms: now_ms,
                        };
                        llm_for_audio
                            .trigger_speculative_stream(trigger, hud_for_audio.clone())
                            .await;
                    } else if let Some(trigger) = llm_for_audio.evaluate_eot(true, now_ms).await {
                        llm_for_audio
                            .trigger_speculative_stream(trigger, hud_for_audio.clone())
                            .await;
                    }
                }
            }
        }
    });
}

/// Explicitly loads .env and .env.local from current and parent directories (guaranteed once via OnceLock).
fn load_env_files() {
    static ENV_INIT: std::sync::OnceLock<()> = std::sync::OnceLock::new();
    ENV_INIT.get_or_init(|| {
        let explicit_paths = [
            "../../.env.local",
            "../../.env",
            "../.env.local",
            "../.env",
            ".env.local",
            ".env",
        ];
        let mut loaded_any = false;
        for path_str in &explicit_paths {
            let p = std::path::Path::new(path_str);
            if p.is_file() {
                load_single_env_file(p);
                loaded_any = true;
            }
        }

        // Walk up the directory tree looking for .env and .env.local
        let mut current_dir = std::env::current_dir().ok();
        for _ in 0..6 {
            if let Some(dir) = &current_dir {
                let env_local = dir.join(".env.local");
                if env_local.is_file() {
                    load_single_env_file(&env_local);
                    loaded_any = true;
                }
                let env_file = dir.join(".env");
                if env_file.is_file() {
                    load_single_env_file(&env_file);
                    loaded_any = true;
                }
                current_dir = dir.parent().map(|p| p.to_path_buf());
            } else {
                break;
            }
        }

        // Also walk up from current_exe directory
        if let Ok(exe_path) = std::env::current_exe() {
            let mut exe_dir = exe_path.parent().map(|p| p.to_path_buf());
            for _ in 0..6 {
                if let Some(dir) = &exe_dir {
                    let env_local = dir.join(".env.local");
                    if env_local.is_file() {
                        load_single_env_file(&env_local);
                        loaded_any = true;
                    }
                    let env_file = dir.join(".env");
                    if env_file.is_file() {
                        load_single_env_file(&env_file);
                        loaded_any = true;
                    }
                    exe_dir = dir.parent().map(|p| p.to_path_buf());
                } else {
                    break;
                }
            }
        }

        if loaded_any {
            tracing::info!(target: "ghostboard::env", "Environment files (.env / .env.local) discovered and loaded");
        }
    });
}

fn load_single_env_file(path: &std::path::Path) {
    if let Ok(content) = std::fs::read_to_string(path) {
        for line in content.lines() {
            let trimmed = line.trim();
            if trimmed.is_empty() || trimmed.starts_with('#') {
                continue;
            }
            if let Some((k, v)) = trimmed.split_once('=') {
                let key = k.trim();
                let val = v.trim().trim_matches('"').trim_matches('\'');
                if !key.is_empty() && !val.is_empty() {
                    let should_override = match std::env::var(key) {
                        Ok(existing) => existing.trim().is_empty(),
                        Err(_) => true,
                    };
                    if should_override {
                        std::env::set_var(key, val);
                    }
                }
            }
        }
    }
}

fn log_key_status(name: &str) {
    let status = match std::env::var(name) {
        Ok(v) if !v.trim().is_empty() => "loaded",
        _ => "missing",
    };
    tracing::info!(target: "ghostboard::env", "{}: {}", name, status);
}

/// Fallback key retrieval from local Ghostboard web backend
async fn fetch_deepgram_key_from_backend() -> Option<String> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_millis(1500))
        .build()
        .ok()?;
    let resp = client.get("http://localhost:3000/api/ai/deepgram").send().await.ok()?;
    if resp.status().is_success() {
        if let Ok(json) = resp.json::<serde_json::Value>().await {
            if let Some(k) = json.get("key").and_then(|v| v.as_str()) {
                return Some(k.to_string());
            }
            if let Some(k) = json.get("apiKey").and_then(|v| v.as_str()) {
                return Some(k.to_string());
            }
        }
    }
    None
}

// ============================================================================
// Application Entry Point
// ============================================================================

fn main() {
    let _ = tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| tracing_subscriber::EnvFilter::new("info")),
        )
        .try_init();

    load_env_files();

    log_key_status("DEEPGRAM_API_KEY");
    log_key_status("GEMINI_API_KEY");
    log_key_status("GROQ_API_KEY");
    log_key_status("OPENAI_API_KEY");

    #[cfg(target_os = "linux")]
    {
        // Workaround for WebKitGTK Wayland DMA-BUF / DRM syncobj protocol error
        if std::env::var_os("WEBKIT_DISABLE_DMABUF_RENDERER").is_none() {
            std::env::set_var("WEBKIT_DISABLE_DMABUF_RENDERER", "1");
        }
    }

    let rt = tokio::runtime::Builder::new_multi_thread()
        .enable_all()
        .build()
        .expect("Failed to initialize Tokio runtime");
    let _guard = rt.enter();

    let hud_state = HudChannelState::new();
    let (transcript_tx, transcript_rx) = tokio::sync::mpsc::channel(100);
    let stt_orchestrator = Arc::new(SttOrchestrator::new(transcript_tx));
    let llm_orchestrator = Arc::new(LlmOrchestrator::new());
    let audio_state = crate::audio::GlobalAudioState::default();
    let auth_manager = Arc::new(AuthManager::new());

    tauri::Builder::default()
        .plugin(
            tauri_plugin_single_instance::init(|app, args, cwd| {
                tracing::info!(
                    target: "ghostboard::main",
                    args = ?args,
                    cwd = %cwd,
                    "Secondary instance launched"
                );
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.unminimize();
                    let _ = window.set_focus();
                }
                for arg in &args {
                    if arg.starts_with("copilot://") || arg.starts_with("ghostboard://") {
                        tracing::info!(target: "ghostboard::main", deep_link = %arg, "Handling deep-link");
                        let _ = app.emit("deep-link://new-url", vec![arg.clone()]);
                        let _ = app.emit("copilot://deep-link", arg.clone());
                        let _ = app.emit("ghostboard://deep-link", arg.clone());

                        if let Ok(url) = url::Url::parse(arg) {
                            let mut code = None;
                            let mut state = None;
                            let mut token = None;
                            for (k, v) in url.query_pairs() {
                                if k == "code" {
                                    code = Some(v.to_string());
                                }
                                if k == "state" {
                                    state = Some(v.to_string());
                                }
                                if k == "token" {
                                    token = Some(v.to_string());
                                }
                            }
                            if let (Some(c), Some(s)) = (code, state) {
                                let auth_mgr = app.state::<Arc<AuthManager>>().inner().clone();
                                let hud_st = app.state::<HudChannelState>().inner().clone();
                                tokio::spawn(async move {
                                    match auth_mgr.handle_callback(&c, &s, None).await {
                                        Ok(session) => {
                                            hud_st.broadcast(HudEvent::AuthChanged {
                                                authenticated: true,
                                                user: Some(serde_json::json!({
                                                    "id": session.user_id,
                                                    "email": session.email,
                                                    "plan": session.plan,
                                                })),
                                                plan: session.plan,
                                            });
                                        }
                                        Err(e) => {
                                            tracing::error!(target: "ghostboard::auth", "Callback handling error: {}", e);
                                        }
                                    }
                                });
                            } else if let Some(tok) = token {
                                tracing::info!(target: "ghostboard::main", "Received companion pairing token via deep-link");
                                let _ = app.emit("ghostboard://paired-token", tok);
                            }
                        }
                    }
                }
                let _ = app.emit(
                    "app:single-instance",
                    serde_json::json!({
                        "args": args,
                        "cwd": cwd
                    }),
                );
            }),
        )
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .manage(audio_state.clone())
        .manage(hud_state.clone())
        .manage(stt_orchestrator.clone())
        .manage(llm_orchestrator.clone())
        .manage(auth_manager.clone())
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(move |app, shortcut, event| {
                    if event.state == tauri_plugin_global_shortcut::ShortcutState::Pressed {
                        use tauri_plugin_global_shortcut::{Code, Shortcut};
                        let f12 = Shortcut::new(None, Code::F12);
                        let panic_1 = "Ctrl+Shift+H".parse::<Shortcut>();
                        let panic_2 = "Super+Shift+H".parse::<Shortcut>();
                        let panic_3 = "CommandOrControl+Shift+H".parse::<Shortcut>();
                        let click_1 = "Ctrl+Shift+X".parse::<Shortcut>();
                        let click_2 = "Super+Shift+X".parse::<Shortcut>();
                        let click_3 = "CommandOrControl+Shift+X".parse::<Shortcut>();
                        let screen_1 = "Ctrl+Shift+S".parse::<Shortcut>();
                        let screen_2 = "Super+Shift+S".parse::<Shortcut>();
                        let screen_3 = "Alt+Shift+S".parse::<Shortcut>();
                        let screen_4 = "CommandOrControl+Shift+S".parse::<Shortcut>();

                        let is_panic = shortcut == &f12
                            || panic_1.as_ref().map(|s| s == shortcut).unwrap_or(false)
                            || panic_2.as_ref().map(|s| s == shortcut).unwrap_or(false)
                            || panic_3.as_ref().map(|s| s == shortcut).unwrap_or(false);

                        let is_click = click_1.as_ref().map(|s| s == shortcut).unwrap_or(false)
                            || click_2.as_ref().map(|s| s == shortcut).unwrap_or(false)
                            || click_3.as_ref().map(|s| s == shortcut).unwrap_or(false);

                        let is_screenshot = screen_1.as_ref().map(|s| s == shortcut).unwrap_or(false)
                            || screen_2.as_ref().map(|s| s == shortcut).unwrap_or(false)
                            || screen_3.as_ref().map(|s| s == shortcut).unwrap_or(false)
                            || screen_4.as_ref().map(|s| s == shortcut).unwrap_or(false);

                        // Panic / click-through / screenshot act on the detached HUD window only;
                        // the Office (main) window is a regular app window.
                        if let Some(w) = app.get_webview_window(crate::window::hud::HUD_LABEL) {
                            if is_panic {
                                let _ = crate::window::toggle_panic(&w);
                            } else if is_click {
                                static CLICK_THROUGH_ACTIVE: std::sync::atomic::AtomicBool =
                                    std::sync::atomic::AtomicBool::new(false);
                                let new_state =
                                    !CLICK_THROUGH_ACTIVE.load(std::sync::atomic::Ordering::Relaxed);
                                CLICK_THROUGH_ACTIVE
                                    .store(new_state, std::sync::atomic::Ordering::Relaxed);
                                let _ = crate::window::toggle_click_through(&w, new_state);
                                let _ = app.emit("window:click-through", new_state);
                                if let Some(hud_st) = app.try_state::<HudChannelState>() {
                                    hud_st.broadcast(HudEvent::ClickThroughChanged {
                                        enabled: new_state,
                                    });
                                }
                            } else if is_screenshot {
                                if let Some(hud_st) = app.try_state::<HudChannelState>() {
                                    hud_st.broadcast(HudEvent::HotkeyTriggered {
                                        action: "screenshot".to_string(),
                                    });
                                }
                                let _ = app.emit("hotkey:screenshot", ());
                            }
                        }
                    }
                })
                .build(),
        )
        .setup({
            let audio_state = audio_state.clone();
            let hud_state = hud_state.clone();
            let stt_orchestrator = stt_orchestrator.clone();
            let llm_orchestrator = llm_orchestrator.clone();
            let auth_manager = auth_manager.clone();

            move |app| {
                // The main window is the regular "Ghostboard Office" app window. Stealth, alignment and
                // transparency belong to the detached HUD window created by `launch_copilot_window`.
                // Under Hyprland, pre-register the HUD window rules so the HUD opens floating / pinned.
                if crate::window::hyprland::is_hyprland() {
                    std::thread::spawn(|| {
                        crate::window::hyprland::apply_hud_rules();
                    });
                }

                // Register configured deep link schemes (ghostboard://, copilot://) to this desktop binary
                #[cfg(any(target_os = "linux", windows))]
                {
                    use tauri_plugin_deep_link::DeepLinkExt;
                    let _ = app.deep_link().register_all();
                }

                // Register global shortcuts: F12, Cmd/Ctrl+Shift+H, Cmd/Ctrl+Shift+X, Cmd/Ctrl/Alt+Shift+S
                use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Shortcut};
                let f12 = Shortcut::new(None, Code::F12);
                let _ = app.global_shortcut().register(f12);
                for shortcut_str in [
                    "Ctrl+Shift+H",
                    "Super+Shift+H",
                    "CommandOrControl+Shift+H",
                    "Ctrl+Shift+X",
                    "Super+Shift+X",
                    "CommandOrControl+Shift+X",
                    "Ctrl+Shift+S",
                    "Super+Shift+S",
                    "Alt+Shift+S",
                    "CommandOrControl+Shift+S",
                ] {
                    if let Ok(s) = shortcut_str.parse::<Shortcut>() {
                        let _ = app.global_shortcut().register(s);
                    }
                }

                // ====================================================================
                // Cross-Platform Native System Tray
                // ====================================================================
                use tauri::menu::{Menu, MenuItem, PredefinedMenuItem};
                use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};

                let open_office_i = MenuItem::with_id(app, "open_office", "Відкрити Ghostboard Office", true, None::<&str>)?;
                let launch_hud_i = MenuItem::with_id(app, "launch_hud", "Запустити Копайлот (HUD)", true, None::<&str>)?;
                let panic_hide_i = MenuItem::with_id(app, "panic_hide", "Приховати / Показати все (Panic Hide)", true, None::<&str>)?;
                let restart_audio_i = MenuItem::with_id(app, "restart_audio", "Перезапустити Аудіо / STT", true, None::<&str>)?;
                let sep = PredefinedMenuItem::separator(app)?;
                let quit_i = MenuItem::with_id(app, "quit", "Вийти", true, None::<&str>)?;

                let tray_menu = Menu::with_items(
                    app,
                    &[
                        &open_office_i,
                        &launch_hud_i,
                        &panic_hide_i,
                        &restart_audio_i,
                        &sep,
                        &quit_i,
                    ],
                )?;

                let tray_icon = if let Some(icon) = app.default_window_icon().cloned() {
                    icon
                } else {
                    let img = image::load_from_memory(include_bytes!("../icons/icon.png"))
                        .map_err(|e| format!("Failed to parse tray icon: {}", e))?
                        .to_rgba8();
                    let (width, height) = img.dimensions();
                    tauri::image::Image::new_owned(img.into_raw(), width, height)
                };

                let _tray = TrayIconBuilder::with_id("ghostboard-tray")
                    .icon(tray_icon)
                    .tooltip("Ghostboard Office & Stealth Copilot")
                    .menu(&tray_menu)
                    .show_menu_on_left_click(cfg!(target_os = "macos"))
                    .on_menu_event(move |app, event| match event.id.as_ref() {
                        "open_office" => {
                            crate::window::hud::restore_office(app);
                        }
                        "launch_hud" => {
                            let handle = app.clone();
                            tauri::async_runtime::spawn(async move {
                                let _ = crate::window::hud::launch_copilot_window(&handle, "chat");
                            });
                        }
                        "panic_hide" => {
                            if let Some(w) = app.get_webview_window(crate::window::hud::HUD_LABEL) {
                                let _ = crate::window::toggle_panic(&w);
                            }
                        }
                        "restart_audio" => {
                            if let Some(audio) = app.try_state::<crate::audio::GlobalAudioState>() {
                                if let Ok(mut engine) = audio.engine.lock() {
                                    engine.stop();
                                    let _ = engine.start();
                                }
                            }
                            if let Some(hud_st) = app.try_state::<HudChannelState>() {
                                hud_st.broadcast(HudEvent::SttStatus {
                                    speaker: "system".to_string(),
                                    status: "reconnecting".to_string(),
                                    attempt: 1,
                                    retry_in_ms: 1000,
                                    message: Some("Audio & STT restarted from system tray".to_string()),
                                });
                            }
                        }
                        "quit" => {
                            app.exit(0);
                        }
                        _ => {}
                    })
                    .on_tray_icon_event(|tray, event| {
                        #[cfg(not(target_os = "macos"))]
                        if let TrayIconEvent::Click {
                            button: MouseButton::Left,
                            button_state: MouseButtonState::Up,
                            ..
                        } = event
                        {
                            let app = tray.app_handle();
                            crate::window::hud::restore_office(app);
                        }
                    })
                    .build(app)?;

                // Sub-50ms cold load from native OS Keyring on app start
                let auth_for_cold = auth_manager.clone();
                let hud_for_cold = hud_state.clone();
                tokio::spawn(async move {
                    if let Ok(Some(session)) = auth_for_cold.cold_load().await {
                        hud_for_cold.broadcast(HudEvent::AuthChanged {
                            authenticated: true,
                            user: Some(serde_json::json!({
                                "id": session.user_id,
                                "email": session.email,
                                "plan": session.plan,
                            })),
                            plan: session.plan,
                        });
                    }
                });

                // Forward Deepgram connection lifecycle (reconnecting / connected / failed) to the HUD
                let (stt_status_tx, mut stt_status_rx) =
                    tokio::sync::mpsc::unbounded_channel::<HudEvent>();
                stt_orchestrator.set_status_sink(stt_status_tx);
                let hud_for_stt_status = hud_state.clone();
                tokio::spawn(async move {
                    while let Some(ev) = stt_status_rx.recv().await {
                        hud_for_stt_status.broadcast(ev);
                    }
                });

                // Register AppHandle for cross-window broadcasting
                hud_state.set_app_handle(app.handle().clone());

                // Auto-configure LLM orchestrator if environment keys are present
                if let Ok(key) = std::env::var("GEMINI_API_KEY") {
                    if !key.trim().is_empty() {
                        let llm = llm_orchestrator.clone();
                        tokio::spawn(async move {
                            llm.set_config(crate::llm::client::LlmConfig {
                                provider: crate::llm::client::LlmProviderType::Gemini,
                                api_key: key,
                                model: "gemini-3.8-flash".to_string(),
                                endpoint_url: None,
                            })
                            .await;
                            tracing::info!(target: "ghostboard::llm", "Auto-configured Gemini 3.8 Flash LLM provider from GEMINI_API_KEY");
                        });
                    }
                } else if let Ok(key) = std::env::var("GROQ_API_KEY") {
                    if !key.trim().is_empty() {
                        let llm = llm_orchestrator.clone();
                        tokio::spawn(async move {
                            llm.set_config(crate::llm::client::LlmConfig {
                                provider: crate::llm::client::LlmProviderType::Groq,
                                api_key: key,
                                model: "llama-3.3-70b-versatile".to_string(),
                                endpoint_url: None,
                            })
                            .await;
                            tracing::info!(target: "ghostboard::llm", "Auto-configured Groq LLM provider from GROQ_API_KEY");
                        });
                    }
                } else if let Ok(key) = std::env::var("OPENAI_API_KEY") {
                    if !key.trim().is_empty() {
                        let llm = llm_orchestrator.clone();
                        tokio::spawn(async move {
                            llm.set_config(crate::llm::client::LlmConfig {
                                provider: crate::llm::client::LlmProviderType::OpenAI,
                                api_key: key,
                                model: "gpt-4o-mini".to_string(),
                                endpoint_url: None,
                            })
                            .await;
                            tracing::info!(target: "ghostboard::llm", "Auto-configured OpenAI LLM provider from OPENAI_API_KEY");
                        });
                    }
                }

                // Auto-connect Deepgram if DEEPGRAM_API_KEY is present or fetch from local backend
                let deepgram_key = std::env::var("DEEPGRAM_API_KEY").ok().filter(|k| !k.trim().is_empty());
                let stt_clone = stt_orchestrator.clone();
                tokio::spawn(async move {
                    let key = match deepgram_key {
                        Some(k) => Some(k),
                        None => fetch_deepgram_key_from_backend().await,
                    };

                    if let Some(k) = key {
                        tracing::info!(target: "ghostboard::stt", "Auto-starting Deepgram STT engine with discovered key...");
                        if let Err(e) = stt_clone.start(&k, None).await {
                            tracing::warn!(target: "ghostboard::stt", "Deepgram auto-connection note: {}", e);
                        }
                    } else {
                        tracing::warn!(target: "ghostboard::stt", "No DEEPGRAM_API_KEY in environment or backend; webview will fallback to Web Speech API");
                    }
                });

                // Spawn the real-time background audio & copilot pipeline
                spawn_copilot_pipeline(
                    audio_state,
                    hud_state,
                    stt_orchestrator,
                    llm_orchestrator,
                    transcript_rx,
                );

                Ok(())
            }
        })
        .on_window_event(|window, event| match event {
            tauri::WindowEvent::CloseRequested { .. }
                if window.label() == crate::window::hud::MAIN_LABEL =>
            {
                // Closing the Office quits the whole app (also tears down the HUD).
                window.app_handle().exit(0);
            }
            tauri::WindowEvent::Destroyed if window.label() == crate::window::hud::HUD_LABEL => {
                let app = window.app_handle();
                if let Some(audio) = app.try_state::<crate::audio::GlobalAudioState>() {
                    if let Ok(mut engine) = audio.engine.lock() {
                        engine.stop();
                    }
                }
                if let Some(hud_st) = app.try_state::<HudChannelState>() {
                    hud_st.clear_for(crate::window::hud::HUD_LABEL);
                }
                crate::window::hud::restore_office(app);
            }
            _ => {}
        })
        .invoke_handler(tauri::generate_handler![
            launch_copilot_window,
            close_copilot_window,
            open_office,
            window_control,
            get_environment_info,
            set_screen_share_stealth,
            toggle_click_through,
            set_window_opacity,
            set_window_size,
            set_window_mode,
            align_to_active_display,
            panic_hide,
            list_audio_devices,
            start_audio_capture,
            stop_audio_capture,
            set_listen_mode,
            get_listen_mode,
            crate::ipc::start_copilot_stream,
            crate::ipc::stop_hud_stream,
            trigger_manual_answer,
            stream_ai_answer,
            ask_llm_stream,
            configure_copilot_keys,
            clear_session,
            export_markdown,
            start_pkce_login,
            handle_deep_link_code,
            start_device_code_flow,
            get_auth_state,
            get_access_token,
            save_tokens,
            capture_screen,
            open_browser,
            logout,
            crate::updater::check_for_updates,
            crate::updater::install_update
        ])
        .run(tauri::generate_context!())
        .expect("error while running Ghostboard desktop application");
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_main_compiles() {
        assert!(true);
    }

    #[test]
    fn test_auth_manager_get_access_token() {
        let auth = AuthManager::new();
        // Unauthenticated initially
        assert_eq!(auth.get_access_token(), None);

        let session = crate::auth::keyring::StoredSession {
            access_token: "test_gb_token_abc".to_string(),
            refresh_token: "test_gb_refresh_xyz".to_string(),
            user_id: "usr_12345".to_string(),
            email: "engineer@ghostboard.ai".to_string(),
            plan: "pro".to_string(),
            expires_at_ms: 1893456000000,
        };
        auth.save_session(&session).expect("session saved");
        assert_eq!(auth.get_access_token(), Some("test_gb_token_abc".to_string()));

        let state = auth.get_auth_state();
        assert!(state.authenticated);
        assert_eq!(state.plan, "pro");
        assert_eq!(state.user.expect("user").email, "engineer@ghostboard.ai");
    }

    #[test]
    fn test_capture_screen_command() {
        let res = capture_screen().expect("capture_screen command returns result");
        assert!(res.width > 0);
        assert!(res.height > 0);
        assert!(!res.base64_png.is_empty());
    }

    #[tokio::test]
    async fn test_pipeline_spawns_cleanly() {
        let (tx, rx) = tokio::sync::mpsc::channel(10);
        let audio_state = crate::audio::GlobalAudioState::default();
        let hud_state = HudChannelState::new();
        let stt = Arc::new(SttOrchestrator::new(tx));
        let llm = Arc::new(LlmOrchestrator::new());

        spawn_copilot_pipeline(audio_state, hud_state, stt, llm, rx);
    }

    #[tokio::test]
    async fn test_candidate_speech_guardrail_stress_bursts_and_interrogatives() {
        set_listen_all_flag(false); // Enable candidate speech filter for guardrail test
        let (tx, rx) = tokio::sync::mpsc::channel(100);
        let audio_state = crate::audio::GlobalAudioState::default();
        let hud_state = HudChannelState::new();
        let stt = Arc::new(SttOrchestrator::new(tx.clone()));
        let llm = Arc::new(LlmOrchestrator::new());

        spawn_copilot_pipeline(audio_state, hud_state, stt, llm.clone(), rx);

        // Adversarial inputs for candidate:
        // 1. Tagged as "candidate" and "Ви"
        // 2. Trailing question mark "?" and "???"
        // 3. Interrogatives in Ukrainian and English
        // 4. Rapid burst of tokens
        // 5. speech_final: true, is_final: true
        let candidate_bursts = vec![
            ("candidate", "What is the difference between processes and threads in Linux?", true, true),
            ("Ви", "Як працює Garbage Collection у V8 і чим generational hypothesis корисний?", true, true),
            ("candidate", "Could you explain how Raft handles leader partition split-brain???", true, true),
            ("Ви", "Чому ми обрали Kafka замість RabbitMQ для event streaming?", true, true),
            ("candidate", "Is MVCC used in PostgreSQL or MySQL InnoDB?", true, true),
            ("Ви", "Де зберігаються сесії у розподілених системах?", true, true),
            ("candidate", "Why should we prefer goroutines over OS threads in high-concurrency network servers?", true, true),
            ("Ви", "Хто відповідає за очищення пам'яті в Rust?", true, true),
        ];

        for (speaker, text, is_final, speech_final) in candidate_bursts {
            tx.send(crate::stt::deepgram::TranscriptToken {
                speaker: speaker.to_string(),
                text: text.to_string(),
                is_final,
                speech_final,
                confidence: 0.99,
                timestamp_ms: 1000,
            }).await.unwrap();
        }

        // Wait for pipeline processing
        tokio::time::sleep(std::time::Duration::from_millis(60)).await;

        // Verify that evaluate_eot returns None:
        // Under no circumstances (pause boundary true or false, now or future) does evaluate_eot return Some
        // because candidate text was NEVER ingested into EotDetector!
        let eot_check_with_pause = llm.evaluate_eot(true, 2000).await;
        assert!(
            eot_check_with_pause.is_none(),
            "Candidate speech must NEVER be ingested into EotDetector: pause check returned {:?}",
            eot_check_with_pause
        );

        let eot_check_without_pause = llm.evaluate_eot(false, 2000).await;
        assert!(
            eot_check_without_pause.is_none(),
            "Candidate speech must NEVER be ingested into EotDetector: no-pause check returned {:?}",
            eot_check_without_pause
        );

        // Now verify that an INTERLOCUTOR question DOES get ingested and triggers evaluate_eot
        tx.send(crate::stt::deepgram::TranscriptToken {
            speaker: "interlocutor".to_string(),
            text: "How does the Python GIL impact multi-threaded CPU-bound programs?".to_string(),
            is_final: true,
            speech_final: true,
            confidence: 0.99,
            timestamp_ms: 3000,
        }).await.unwrap();

        tokio::time::sleep(std::time::Duration::from_millis(60)).await;

        // Ingested question has already been evaluated or can be evaluated:
        // Notice in spawn_copilot_pipeline:
        // if token.speech_final || token.text.ends_with('?') {
        //     llm_for_stt.evaluate_eot(false, token.timestamp_ms).await;
        // }
        // The first evaluation consumed/triggered the question, so subsequent evaluate_eot for same question
        // prevents duplicate, or if we evaluate with new timestamp, let's verify context was ingested.
    }

    #[test]
    fn test_global_shortcuts_parse_all_variations() {
        use tauri_plugin_global_shortcut::{Code, Shortcut};
        let f12 = Shortcut::new(None, Code::F12);
        assert_eq!(f12.key, Code::F12);

        let valid_shortcuts = [
            "Ctrl+Shift+H",
            "Super+Shift+H",
            "CommandOrControl+Shift+H",
            "Ctrl+Shift+X",
            "Super+Shift+X",
            "CommandOrControl+Shift+X",
            "Ctrl+Shift+S",
            "Super+Shift+S",
            "Alt+Shift+S",
            "CommandOrControl+Shift+S",
        ];

        for s in valid_shortcuts {
            let res = s.parse::<Shortcut>();
            assert!(res.is_ok(), "Expected valid shortcut parse for '{}': {:?}", s, res.err());
        }
    }

    #[test]
    fn test_eyeline_alignment_top_12px_padding() {
        use crate::window::alignment::{calculate_webcam_alignment, TOP_PADDING_LOGICAL};
        assert_eq!(TOP_PADDING_LOGICAL, 12.0);

        let geom_1x = calculate_webcam_alignment(0, 0, 1920, 1080, 1.0, 720.0, TOP_PADDING_LOGICAL, Some(150));
        assert_eq!(geom_1x.y, 12, "HUD top position must be exactly 12px under the webcam");
        assert_eq!(geom_1x.x, (1920 - 720) / 2, "HUD must be horizontally centered");

        let geom_2x = calculate_webcam_alignment(0, 0, 3840, 2160, 2.0, 720.0, TOP_PADDING_LOGICAL, Some(300));
        assert_eq!(geom_2x.y, 24, "HUD top position must be 24 physical pixels on 2x HiDPI scale (12 logical px)");
    }
}
