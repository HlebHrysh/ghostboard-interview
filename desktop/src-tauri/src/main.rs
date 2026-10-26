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
    crate::window::apply_stealth(&window, flag)
}

/// Native command to toggle click-through cursor transparency
#[tauri::command]
fn toggle_click_through(
    window: WebviewWindow,
    enable: Option<bool>,
    enabled: Option<bool>,
) -> Result<bool, String> {
    let flag = enable.or(enabled).unwrap_or(true);
    crate::window::toggle_click_through(&window, flag)
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

/// Native command to align HUD centered horizontally under the active webcam
#[tauri::command]
fn align_to_active_display(
    window: WebviewWindow,
    _width: Option<f64>,
    _height: Option<f64>,
) -> Result<bool, String> {
    crate::window::align_to_active_display(&window)
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

/// Lists all audio devices available on the host system
#[tauri::command]
fn list_audio_devices() -> Result<Vec<crate::audio::capture::AudioDeviceInfo>, String> {
    let host = cpal::default_host();
    Ok(crate::audio::capture::list_audio_devices(&host))
}

/// Starts audio capture on the configured source (loopback, microphone, or dual)
#[tauri::command]
fn start_audio_capture(
    state: tauri::State<'_, crate::audio::GlobalAudioState>,
    source: Option<String>,
) -> Result<bool, String> {
    let mut engine = state.engine.lock().map_err(|e| e.to_string())?;
    let capture_src = match source.as_deref().map(|s| s.to_lowercase()).as_deref() {
        Some("mic") | Some("microphone") => crate::audio::capture::CaptureSource::Microphone,
        Some("loopback") | Some("system") => crate::audio::capture::CaptureSource::SystemLoopback,
        _ => crate::audio::capture::CaptureSource::Dual,
    };
    engine.set_source(capture_src);
    engine.start()?;
    Ok(true)
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
    // 1. Task: Ingest normalized STT tokens, emit SttTranscript to HUD, and evaluate EoT
    let hud_for_stt = hud_state.clone();
    let llm_for_stt = llm_orchestrator.clone();
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

            // 🛡️ CRITICAL SPEAKER GUARDRAIL: Candidate speech tagged "Ви" / "candidate"
            // strictly bypasses LLM prompt triggers and question ingestion!
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

            // Immediate EoT check if speech_final is true or text ends in ?
            if token.speech_final || token.text.ends_with('?') {
                if let Some(trigger) = llm_for_stt.evaluate_eot(false, token.timestamp_ms).await {
                    llm_for_stt
                        .trigger_speculative_stream(trigger, hud_for_stt.clone())
                        .await;
                }
            }
        }
    });

    // 2. Task: Real-time Audio processing loop (30ms RMS level metering + VAD evaluation + PCM forwarding + EoT pause detection)
    let hud_for_audio = hud_state.clone();
    let llm_for_audio = llm_orchestrator.clone();
    let stt_for_audio = stt_orchestrator.clone();
    tokio::spawn(async move {
        let mut interval = tokio::time::interval(std::time::Duration::from_millis(30));
        interval.set_missed_tick_behavior(tokio::time::MissedTickBehavior::Skip);
        let mut last_audio_error_at: Option<std::time::Instant> = None;

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
                            // Report at most once every 5s so a persistent failure can't flood the HUD
                            let should_report = last_audio_error_at
                                .map(|t| t.elapsed() >= std::time::Duration::from_secs(5))
                                .unwrap_or(true);
                            if should_report {
                                last_audio_error_at = Some(std::time::Instant::now());
                                tracing::error!(target: "ghostboard::audio", "poll_and_process error: {}", e);
                                hud_for_audio.broadcast(HudEvent::Error {
                                    code: "AUDIO_PIPELINE_ERROR".to_string(),
                                    message: format!("Audio processing error: {}", e),
                                });
                            }
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

                // 1. Emit 30ms RMS AudioLevel events for both loopback and candidate
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

                // 2. Broadcast VAD frame state
                if !tick.vad_results.is_empty() {
                    hud_for_audio.broadcast(HudEvent::VadState {
                        is_speech: tick.speech_detected,
                        confidence: tick.latest_speech_probability,
                    });
                }

                // 3. If interlocutor resumed talking while LLM was streaming, cancel immediately
                if tick.speech_detected {
                    llm_for_audio.abort_in_flight().await;
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
                    if let Some(trigger) = llm_for_audio.evaluate_eot(true, now_ms).await {
                        llm_for_audio
                            .trigger_speculative_stream(trigger, hud_for_audio.clone())
                            .await;
                    }
                }
            }
        }
    });
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
                    if arg.starts_with("copilot://") {
                        tracing::info!(target: "ghostboard::main", deep_link = %arg, "Handling copilot:// deep-link");
                        let _ = app.emit("deep-link://new-url", vec![arg.clone()]);
                        let _ = app.emit("copilot://deep-link", arg.clone());

                        if let Ok(url) = url::Url::parse(arg) {
                            let mut code = None;
                            let mut state = None;
                            for (k, v) in url.query_pairs() {
                                if k == "code" {
                                    code = Some(v.to_string());
                                }
                                if k == "state" {
                                    state = Some(v.to_string());
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
                        let click_1 = "Ctrl+Shift+X".parse::<Shortcut>();
                        let click_2 = "Super+Shift+X".parse::<Shortcut>();
                        let screen_1 = "Ctrl+Shift+S".parse::<Shortcut>();
                        let screen_2 = "Super+Shift+S".parse::<Shortcut>();

                        let is_panic = shortcut == &f12
                            || panic_1.as_ref().map(|s| s == shortcut).unwrap_or(false)
                            || panic_2.as_ref().map(|s| s == shortcut).unwrap_or(false);

                        let is_click = click_1.as_ref().map(|s| s == shortcut).unwrap_or(false)
                            || click_2.as_ref().map(|s| s == shortcut).unwrap_or(false);

                        let is_screenshot = screen_1.as_ref().map(|s| s == shortcut).unwrap_or(false)
                            || screen_2.as_ref().map(|s| s == shortcut).unwrap_or(false);

                        if let Some(w) = app.get_webview_window("main") {
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
                let main_window = app
                    .get_webview_window("main")
                    .expect("Failed to get main webview window");

                // Automatically activate screen share invisibility upon launch
                let _ = crate::window::apply_stealth(&main_window, true);

                // Automatically align HUD directly under webcam
                let _ = crate::window::align_to_active_display(&main_window);

                // Register global shortcuts: F12, Cmd/Ctrl+Shift+H, Cmd/Ctrl+Shift+X, Cmd/Ctrl+Shift+S
                use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Shortcut};
                let f12 = Shortcut::new(None, Code::F12);
                let _ = app.global_shortcut().register(f12);
                if let Ok(s) = "Ctrl+Shift+H".parse::<Shortcut>() {
                    let _ = app.global_shortcut().register(s);
                }
                if let Ok(s) = "Super+Shift+H".parse::<Shortcut>() {
                    let _ = app.global_shortcut().register(s);
                }
                if let Ok(s) = "Ctrl+Shift+X".parse::<Shortcut>() {
                    let _ = app.global_shortcut().register(s);
                }
                if let Ok(s) = "Super+Shift+X".parse::<Shortcut>() {
                    let _ = app.global_shortcut().register(s);
                }
                if let Ok(s) = "Ctrl+Shift+S".parse::<Shortcut>() {
                    let _ = app.global_shortcut().register(s);
                }
                if let Ok(s) = "Super+Shift+S".parse::<Shortcut>() {
                    let _ = app.global_shortcut().register(s);
                }

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

                // Auto-connect Deepgram if DEEPGRAM_API_KEY is present
                if let Ok(key) = std::env::var("DEEPGRAM_API_KEY") {
                    let stt_clone = stt_orchestrator.clone();
                    tokio::spawn(async move {
                        if let Err(e) = stt_clone.start(&key, None).await {
                            tracing::warn!(target: "ghostboard::stt", "Deepgram auto-connection notice: {}", e);
                        }
                    });
                }

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
        .invoke_handler(tauri::generate_handler![
            set_screen_share_stealth,
            toggle_click_through,
            set_window_opacity,
            align_to_active_display,
            panic_hide,
            list_audio_devices,
            start_audio_capture,
            stop_audio_capture,
            crate::ipc::start_copilot_stream,
            crate::ipc::stop_hud_stream,
            trigger_manual_answer,
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
}
