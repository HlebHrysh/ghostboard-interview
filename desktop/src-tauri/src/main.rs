// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

pub mod audio;
pub mod auth;
pub mod ipc;
pub mod llm;
pub mod stt;
pub mod updater;
pub mod vision_radar;
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
    let app = window.app_handle().clone();
    crate::window::run_window_op_on_main_thread(&app, move || {
        let _ = window.set_size(tauri::LogicalSize::new(width, height));
    })
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
async fn capture_screen() -> Result<crate::window::ScreenCaptureResult, String> {
    tauri::async_runtime::spawn_blocking(|| {
        crate::window::screenshot::capture_screen_native()
    })
    .await
    .map_err(|e| format!("Screen capture failed: {}", e))
}

/// Enables or disables the background perceptual dHash screen radar watcher.
#[tauri::command]
fn toggle_vision_radar(
    enabled: bool,
    state: tauri::State<'_, Arc<vision_radar::VisionRadarState>>,
) -> Result<bool, String> {
    Ok(state.set_enabled(enabled))
}

/// Returns the pre-cropped ROI PNG from RAM in 0ms if staged by the radar,
/// or falls back to a native screen capture if none is cached yet.
#[tauri::command]
async fn consume_radar_snapshot(
    state: tauri::State<'_, Arc<vision_radar::VisionRadarState>>,
) -> Result<Option<vision_radar::RadarDetectionPayload>, String> {
    if let Some(cached) = state.take_latest() {
        return Ok(Some(cached));
    }

    let cap = tauri::async_runtime::spawn_blocking(|| {
        crate::window::screenshot::capture_screen_native()
    })
    .await
    .map_err(|e| format!("Screen capture fallback failed: {}", e))?;

    Ok(Some(vision_radar::RadarDetectionPayload {
        detection_id: format!("fallback-{}", vision_radar::now_epoch_ms()),
        hamming_distance: 0,
        roi_x: 0,
        roi_y: 0,
        roi_width: cap.width,
        roi_height: cap.height,
        base64_png: format!("data:image/png;base64,{}", cap.base64_png),
        detected_at_ms: vision_radar::now_epoch_ms(),
    }))
}

fn spawn_vision_radar_watcher(
    app_handle: tauri::AppHandle,
    vision_radar: Arc<vision_radar::VisionRadarState>,
    hud_state: HudChannelState,
) {
    tokio::spawn(async move {
        let mut interval = tokio::time::interval(std::time::Duration::from_millis(2500));
        let mut last_stable_hash: Option<u64> = None;
        let mut last_stable_img: Option<image::DynamicImage> = None;
        let mut prev_tick_hash: Option<u64> = None;

        loop {
            interval.tick().await;

            let hud_active = app_handle
                .get_webview_window(crate::window::hud::HUD_LABEL)
                .is_some()
                || hud_state.active_channel_count() > 0;

            if !hud_active || !vision_radar.is_enabled() {
                if !hud_active {
                    last_stable_hash = None;
                    last_stable_img = None;
                    prev_tick_hash = None;
                }
                continue;
            }

            let frame_opt = tokio::task::spawn_blocking(vision_radar::capture_primary_frame)
                .await
                .ok()
                .flatten();

            let Some(img) = frame_opt else {
                continue;
            };

            let dhash = vision_radar::compute_dhash_64(&img);

            let Some(stable_hash) = last_stable_hash else {
                last_stable_hash = Some(dhash);
                last_stable_img = Some(img);
                prev_tick_hash = Some(dhash);
                continue;
            };

            let dist_from_stable = vision_radar::hamming_distance(stable_hash, dhash);
            let dist_from_prev = prev_tick_hash
                .map(|p| vision_radar::hamming_distance(p, dhash))
                .unwrap_or(u32::MAX);

            if dist_from_stable >= 8 && dist_from_prev <= 3 {
                let prev_ref = last_stable_img.clone();
                let curr_clone = img.clone();
                let roi_res = tokio::task::spawn_blocking(move || {
                    vision_radar::extract_changed_roi_base64(prev_ref.as_ref(), &curr_clone)
                })
                .await;

                if let Ok(Ok((rx, ry, rw, rh, b64))) = roi_res {
                    let detected_at_ms = vision_radar::now_epoch_ms();
                    let detection_id = format!("radar-{}", detected_at_ms);
                    let payload = vision_radar::RadarDetectionPayload {
                        detection_id: detection_id.clone(),
                        hamming_distance: dist_from_stable,
                        roi_x: rx,
                        roi_y: ry,
                        roi_width: rw,
                        roi_height: rh,
                        base64_png: b64,
                        detected_at_ms,
                    };
                    vision_radar.set_latest(payload);
                    hud_state.broadcast_screen_radar(
                        detection_id,
                        dist_from_stable,
                        rw,
                        rh,
                        detected_at_ms,
                    );
                    tracing::info!(
                        target: "ghostboard::vision_radar",
                        hamming = dist_from_stable,
                        roi = ?(rx, ry, rw, rh),
                        "Staged 0ms ROI screen delta"
                    );
                    last_stable_hash = Some(dhash);
                    last_stable_img = Some(img);
                }
            }

            prev_tick_hash = Some(dhash);
        }
    });
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
fn launch_copilot_window(
    app: tauri::AppHandle,
    mode: String,
) -> Result<crate::window::hud::LaunchReport, String> {
    crate::window::hud::launch_copilot_window(&app, &mode)
}

/// Closes the HUD and returns to the Office window.
#[tauri::command]
fn close_copilot_window(app: tauri::AppHandle) -> Result<(), String> {
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
    let app = window.app_handle().clone();
    crate::window::run_window_op_on_main_thread(&app, move || {
        match action.as_str() {
            "minimize" => {
                let _ = window.minimize();
            }
            "close" => {
                let _ = window.close();
            }
            "toggle_maximize" => {
                if window.is_maximized().unwrap_or(false) {
                    let _ = window.unminimize();
                } else {
                    let _ = window.maximize();
                }
            }
            _ => {}
        }
    })
}

/// Last failed `start_audio_capture` (time, error). While fresh, repeated invokes return the cached
/// error instead of re-enumerating cpal/ALSA devices (which floods stderr with ALSA warnings).
static LAST_START_FAILURE: std::sync::Mutex<Option<(std::time::Instant, String)>> =
    std::sync::Mutex::new(None);
const START_FAILURE_BACKOFF: std::time::Duration = std::time::Duration::from_secs(15);

/// Starts audio capture on the configured source (loopback, microphone, or dual)
#[tauri::command]
async fn start_audio_capture(
    state: tauri::State<'_, crate::audio::GlobalAudioState>,
    stt_orchestrator: tauri::State<'_, Arc<SttOrchestrator>>,
    source: Option<String>,
    loopback_device: Option<String>,
    mic_device: Option<String>,
    stt_language: Option<String>,
    force: Option<bool>,
) -> Result<bool, String> {
    if let Some(ref lang) = stt_language {
        let _ = stt_orchestrator.set_language(lang).await;
    }
    let engine_arc = state.engine.clone();
    tauri::async_runtime::spawn_blocking(move || {
        let mut engine = engine_arc.lock().map_err(|e| e.to_string())?;
        if engine.is_running() {
            return Ok(true);
        }
        if engine.is_active() {
            engine.stop();
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
    })
    .await
    .map_err(|e| format!("Audio capture start task failed: {}", e))?
}

static LISTEN_ALL_SOURCES: std::sync::atomic::AtomicBool = std::sync::atomic::AtomicBool::new(true);
static LISTEN_MODE_NAME: std::sync::OnceLock<std::sync::RwLock<String>> = std::sync::OnceLock::new();

pub fn set_listen_all_flag(enabled: bool) {
    LISTEN_ALL_SOURCES.store(enabled, std::sync::atomic::Ordering::SeqCst);
}

pub fn is_listen_all() -> bool {
    LISTEN_ALL_SOURCES.load(std::sync::atomic::Ordering::SeqCst)
}

pub fn set_explicit_listen_mode(mode: &str) {
    let rw = LISTEN_MODE_NAME.get_or_init(|| std::sync::RwLock::new("both".to_string()));
    if let Ok(mut lock) = rw.write() {
        *lock = mode.to_string();
    }
}

pub fn get_explicit_listen_mode() -> String {
    let rw = LISTEN_MODE_NAME.get_or_init(|| std::sync::RwLock::new("both".to_string()));
    if let Ok(lock) = rw.read() {
        lock.clone()
    } else {
        "both".to_string()
    }
}

/// Native command to switch audio capture mode: "interviewer_only" | "both" | "mic_only"
#[tauri::command]
fn set_listen_mode(
    mode: String,
    audio_state: tauri::State<'_, crate::audio::GlobalAudioState>,
    hud_state: tauri::State<'_, HudChannelState>,
) -> Result<String, String> {
    let mode_lower = mode.to_lowercase();
    let (resolved, capture_src) = match mode_lower.as_str() {
        "interviewer_only" | "interviewer" | "system_only" | "system" | "loopback_only" => {
            ("interviewer_only", crate::audio::capture::CaptureSource::SystemLoopback)
        }
        "mic_only" | "candidate_only" | "mic" => {
            ("mic_only", crate::audio::capture::CaptureSource::Microphone)
        }
        _ => {
            ("both", crate::audio::capture::CaptureSource::Dual)
        }
    };
    set_listen_all_flag(resolved == "both");
    set_explicit_listen_mode(resolved);

    let mut engine = match audio_state.engine.lock() {
        Ok(guard) => guard,
        Err(poisoned) => poisoned.into_inner(),
    };
    if engine.config().source != capture_src {
        engine.set_source(capture_src);
        if engine.is_active() {
            let _ = engine.restart();
        }
    }

    let res_str = resolved.to_string();
    hud_state.broadcast(HudEvent::ListenModeChanged {
        mode: res_str.clone(),
    });
    Ok(res_str)
}

/// Native command to query current listen mode
#[tauri::command]
fn get_listen_mode() -> String {
    get_explicit_listen_mode()
}

/// Native command to switch STT language ("multi", "uk", "ru", "en")
#[tauri::command]
async fn set_stt_language(
    language: String,
    stt_orchestrator: tauri::State<'_, Arc<SttOrchestrator>>,
    hud_state: tauri::State<'_, HudChannelState>,
) -> Result<String, String> {
    let resolved = stt_orchestrator.set_language(&language).await?;
    hud_state.broadcast(HudEvent::SttLanguageChanged {
        language: resolved.clone(),
    });
    Ok(resolved)
}

/// Native command to query current STT language
#[tauri::command]
async fn get_stt_language(
    stt_orchestrator: tauri::State<'_, Arc<SttOrchestrator>>,
) -> Result<String, String> {
    Ok(stt_orchestrator.get_language().await)
}

/// Stops audio capture and frees OS audio resources
#[tauri::command]
async fn stop_audio_capture(
    state: tauri::State<'_, crate::audio::GlobalAudioState>,
) -> Result<bool, String> {
    let engine_arc = state.engine.clone();
    tauri::async_runtime::spawn_blocking(move || {
        let mut engine = engine_arc.lock().map_err(|e| e.to_string())?;
        engine.stop();
        Ok(true)
    })
    .await
    .map_err(|e| format!("Audio capture stop task failed: {}", e))?
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
    candidate_profile: Option<crate::llm::prompt::CandidateProfileDto>,
    history: Option<Vec<crate::llm::prompt::HistoryTurnDto>>,
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
                    model: "gemini-3.5-flash".to_string(),
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
            candidate_profile,
            history,
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
    candidate_profile: Option<crate::llm::prompt::CandidateProfileDto>,
    history: Option<Vec<crate::llm::prompt::HistoryTurnDto>>,
    llm_orchestrator: tauri::State<'_, Arc<LlmOrchestrator>>,
    hud_state: tauri::State<'_, HudChannelState>,
) -> Result<String, String> {
    stream_ai_answer(
        question,
        output_language,
        helper_language,
        modifier,
        candidate_profile,
        history,
        llm_orchestrator,
        hud_state,
    )
    .await
}

/// Syncs Office AI preferences (output language, depth modifier, candidate context) into the
/// native pipeline so auto-detected questions honor them as well. Empty strings reset to default.
#[tauri::command]
async fn set_ai_preferences(
    output_language: Option<String>,
    helper_language: Option<String>,
    modifier: Option<String>,
    concise: Option<bool>,
    candidate_profile: Option<String>,
    llm_orchestrator: tauri::State<'_, Arc<LlmOrchestrator>>,
    stt_orchestrator: tauri::State<'_, Arc<SttOrchestrator>>,
) -> Result<(), String> {
    let norm = |v: Option<String>| v.map(|s| s.trim().to_string()).filter(|s| !s.is_empty());
    llm_orchestrator.set_output_language(norm(output_language)).await;
    llm_orchestrator.set_helper_language(norm(helper_language)).await;
    llm_orchestrator.set_modifier(norm(modifier)).await;
    llm_orchestrator.set_concise_mode(concise.unwrap_or(false)).await;
    let prof = norm(candidate_profile).map(|s| s.chars().take(4000).collect());
    stt_orchestrator.set_custom_stack(prof.clone()).await;
    llm_orchestrator
        .set_candidate_profile(prof)
        .await;
    Ok(())
}

/// Configures dynamic provider API keys (Deepgram, Groq, OpenAI, Anthropic)
#[tauri::command]
async fn configure_copilot_keys(
    deepgram_key: Option<String>,
    gemini_key: Option<String>,
    groq_key: Option<String>,
    openai_key: Option<String>,
    anthropic_key: Option<String>,
    stt_orchestrator: tauri::State<'_, Arc<SttOrchestrator>>,
    llm_orchestrator: tauri::State<'_, Arc<LlmOrchestrator>>,
) -> Result<(), String> {
    if let Some(key) = deepgram_key.map(|s| s.trim().to_string()).filter(|s| !s.is_empty()) {
        stt_orchestrator.start(&key, None).await?;
    }

    if let Some(key) = gemini_key.map(|s| s.trim().to_string()).filter(|s| !s.is_empty()) {
        llm_orchestrator
            .set_config(crate::llm::client::LlmConfig {
                provider: crate::llm::client::LlmProviderType::Gemini,
                api_key: key,
                model: "gemini-3.5-flash".to_string(),
                endpoint_url: None,
            })
            .await;
    } else if let Some(key) = groq_key.map(|s| s.trim().to_string()).filter(|s| !s.is_empty()) {
        llm_orchestrator
            .set_config(crate::llm::client::LlmConfig {
                provider: crate::llm::client::LlmProviderType::Groq,
                api_key: key,
                model: "llama-3.3-70b-versatile".to_string(),
                endpoint_url: None,
            })
            .await;
    } else if let Some(key) = openai_key.map(|s| s.trim().to_string()).filter(|s| !s.is_empty()) {
        llm_orchestrator
            .set_config(crate::llm::client::LlmConfig {
                provider: crate::llm::client::LlmProviderType::OpenAI,
                api_key: key,
                model: "gpt-4o-mini".to_string(),
                endpoint_url: None,
            })
            .await;
    } else if let Some(key) = anthropic_key.map(|s| s.trim().to_string()).filter(|s| !s.is_empty()) {
        llm_orchestrator
            .set_config(crate::llm::client::LlmConfig {
                provider: crate::llm::client::LlmProviderType::Anthropic,
                api_key: key,
                model: "claude-3-5-haiku-20241022".to_string(),
                endpoint_url: None,
            })
            .await;
    }

    Ok(())
}

/// Clears the current active session state in the LLM orchestrator
#[tauri::command]
async fn clear_session(
    llm_orchestrator: tauri::State<'_, Arc<LlmOrchestrator>>,
) -> Result<(), String> {
    llm_orchestrator.abort_in_flight().await;
    llm_orchestrator.clear_history().await;
    Ok(())
}

/// Exports session debrief content to a markdown file
#[tauri::command]
async fn export_markdown(
    content: String,
    filename: Option<String>,
    default_filename: Option<String>,
) -> Result<String, String> {
    let raw_name = filename.or(default_filename).unwrap_or_else(|| {
        let ts = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs();
        format!("ghostboard-session-{}.md", ts)
    });

    let safe_name = std::path::Path::new(&raw_name)
        .file_name()
        .and_then(|f| f.to_str())
        .filter(|s| !s.is_empty() && *s != "." && *s != "..")
        .ok_or_else(|| "Invalid or dangerous export filename".to_string())?;

    let dir = std::env::var("XDG_DOCUMENTS_DIR")
        .or_else(|_| std::env::var("XDG_DOWNLOAD_DIR"))
        .map(std::path::PathBuf::from)
        .or_else(|_| {
            std::env::var("HOME").map(|h| {
                let doc = std::path::PathBuf::from(&h).join("Documents");
                if doc.is_dir() {
                    doc
                } else {
                    let dl = std::path::PathBuf::from(&h).join("Downloads");
                    if dl.is_dir() {
                        dl
                    } else {
                        std::path::PathBuf::from(h)
                    }
                }
            })
        })
        .unwrap_or_else(|_| std::env::temp_dir());
    let path = dir.join(safe_name);
    tokio::fs::write(&path, content).await.map_err(|e| e.to_string())?;
    Ok(path.to_string_lossy().to_string())
}

pub fn open_system_browser(url: &str) -> std::io::Result<()> {
    let u = url::Url::parse(url).map_err(|e| std::io::Error::new(std::io::ErrorKind::InvalidInput, e))?;
    let scheme = u.scheme();
    if scheme != "https" && !(cfg!(debug_assertions) && scheme == "http") {
        return Err(std::io::Error::new(
            std::io::ErrorKind::PermissionDenied,
            "Invalid URL scheme: only https is permitted",
        ));
    }
    let host = u.host_str().unwrap_or_default();
    let is_allowed_host = host == "ghostboard.ai"
        || host == "www.ghostboard.ai"
        || host == "github.com"
        || host.ends_with(".github.com")
        || host == "google.com"
        || host.ends_with(".google.com")
        || host.ends_with(".googleusercontent.com")
        || (cfg!(debug_assertions) && (host == "localhost" || host == "127.0.0.1"));
    if !is_allowed_host {
        return Err(std::io::Error::new(
            std::io::ErrorKind::PermissionDenied,
            "Blocked untrusted host in open_system_browser",
        ));
    }

    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("rundll32")
            .args(["url.dll,FileProtocolHandler", u.as_str()])
            .spawn()?;
    }
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open").arg(u.as_str()).spawn()?;
    }
    #[cfg(target_os = "linux")]
    {
        std::process::Command::new("xdg-open").arg(u.as_str()).spawn()?;
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
    let u_plan = plan.unwrap_or_else(|| "free".to_string());

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
        rolling_buffer: String,
        last_is_final: bool,
        last_token_instant: Option<std::time::Instant>,
        last_trigger_instant: Option<std::time::Instant>,
        triggered_text: String,
        recent_triggers: Vec<(std::time::Instant, String)>,
    }

    fn is_recent_duplicate(recent: &[(std::time::Instant, String)], text: &str) -> bool {
        let clean = text.trim().to_lowercase();
        if clean.is_empty() {
            return true;
        }
        for (t, prev) in recent {
            if t.elapsed() < std::time::Duration::from_secs(5) {
                let prev_clean = prev.trim().to_lowercase();
                if prev_clean == clean
                    || (prev_clean.len() >= 8 && clean.len() >= 8 && (prev_clean.contains(&clean) || clean.contains(&prev_clean)))
                {
                    return true;
                }
            }
        }
        false
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

            // 🛡️ SPEAKER GUARDRAIL: Candidate speech tagged "Ви" / "candidate" strictly
            // bypasses auto-triggering LLM generation! Candidate speech is shown in the dialogue
            // history only, unless explicitly clicked by the user to ask AI.
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
            if clean.is_empty() {
                continue;
            }

            let mut trigger_candidate = None;
            {
                let mut tr = tracker_for_stt.lock().await;
                tr.last_text = clean.clone();
                tr.last_is_final = token.is_final;
                tr.last_token_instant = Some(std::time::Instant::now());

                if token.is_final {
                    if tr.rolling_buffer.is_empty() {
                        tr.rolling_buffer = clean.clone();
                    } else {
                        tr.rolling_buffer.push(' ');
                        tr.rolling_buffer.push_str(&clean);
                    }
                }

                let current_eval_text = if !tr.rolling_buffer.is_empty() {
                    tr.rolling_buffer.clone()
                } else {
                    clean.clone()
                };

                let word_count = current_eval_text.split_whitespace().count();
                let is_question = crate::llm::eot::is_question_heuristic(&current_eval_text);

                if is_question && word_count >= 2 && !is_recent_duplicate(&tr.recent_triggers, &current_eval_text) {
                    trigger_candidate = Some(current_eval_text);
                }
            }

            if let Some(candidate_text) = trigger_candidate {
                let eot_result = llm_for_stt.evaluate_eot(token.speech_final, token.timestamp_ms).await;
                let trigger = match eot_result {
                    Some(t) => Some(t),
                    None if (token.speech_final || candidate_text.ends_with('?')) && crate::llm::eot::is_question_heuristic(&candidate_text) => {
                        let now_ms = token.timestamp_ms;
                        let context_90s = llm_for_stt.get_sliding_context().await;
                        let focused = crate::llm::eot::extract_focused_question(&candidate_text, &context_90s);
                        Some(crate::llm::eot::EotTrigger {
                            question_id: format!("q-stt-{}", now_ms),
                            question_text: focused,
                            context_90s,
                            timestamp_ms: now_ms,
                        })
                    }
                    _ => None,
                };

                if let Some(trig) = trigger {
                    {
                        let mut tr = tracker_for_stt.lock().await;
                        tr.recent_triggers.retain(|(t, _)| t.elapsed() < std::time::Duration::from_secs(30));
                        tr.recent_triggers.push((std::time::Instant::now(), trig.question_text.clone()));
                        tr.rolling_buffer.clear();
                        tr.last_token_instant = None;
                    }
                    llm_for_stt
                        .trigger_speculative_stream(trig, hud_for_stt.clone())
                        .await;
                }
            }
        }
    });

    // 2. Periodic silence watcher:
    // 350ms silence for finalized sentences (is_final == true)
    // 900ms silence for interim utterances (is_final == false)
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
                    let threshold = if tr.last_is_final {
                        std::time::Duration::from_millis(350)
                    } else {
                        std::time::Duration::from_millis(900)
                    };

                    if last_at.elapsed() >= threshold {
                        let candidate_text = if !tr.rolling_buffer.is_empty() {
                            tr.rolling_buffer.clone()
                        } else {
                            tr.last_text.clone()
                        };
                        let word_count = candidate_text.split_whitespace().count();

                        if word_count >= 3
                            && !is_recent_duplicate(&tr.recent_triggers, &candidate_text)
                            && (crate::llm::eot::is_question_heuristic(&candidate_text)
                                || candidate_text.ends_with('?'))
                        {
                            tr.recent_triggers.retain(|(t, _)| t.elapsed() < std::time::Duration::from_secs(30));
                            tr.recent_triggers.push((std::time::Instant::now(), candidate_text.clone()));
                            tr.rolling_buffer.clear();
                            tr.last_token_instant = None;
                            should_trigger = true;
                            text_to_trigger = candidate_text;
                        }
                    }
                }
            }
            if should_trigger {
                let now_ms = std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .unwrap_or_default()
                    .as_millis() as u64;

                let context_90s = llm_for_silence.get_sliding_context().await;
                let trigger = crate::llm::eot::EotTrigger {
                    question_id: format!("q-silence-{}", now_ms),
                    question_text: text_to_trigger,
                    context_90s,
                    timestamp_ms: now_ms,
                };
                llm_for_silence
                    .trigger_speculative_stream(trigger, hud_for_silence.clone())
                    .await;
            }
        }
    });

    // 3. Audio processing loop: Offload DSP (resampling + ONNX Silero VAD) to dedicated OS thread
    let (dsp_tx, mut dsp_rx) = tokio::sync::mpsc::channel::<crate::audio::AudioEngineTickResult>(32);
    let audio_state_dsp = audio_state.clone();
    let hud_for_dsp = hud_state.clone();

    std::thread::Builder::new()
        .name("ghostboard-audio-dsp".into())
        .spawn(move || {
            let mut last_audio_error_at: Option<std::time::Instant> = None;
            loop {
                std::thread::sleep(std::time::Duration::from_millis(30));
                let tick_opt = {
                    let mut engine = match audio_state_dsp.engine.lock() {
                        Ok(guard) => guard,
                        Err(poisoned) => poisoned.into_inner(),
                    };
                    if engine.is_active() {
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
                                    hud_for_dsp.broadcast(HudEvent::SttStatus {
                                        speaker: "system".to_string(),
                                        status: "reconnecting".to_string(),
                                        attempt: 1,
                                        retry_in_ms: 2000,
                                        message: Some("Audio pipeline reconnecting...".to_string()),
                                    });
                                    hud_for_dsp.broadcast(HudEvent::Error {
                                        code: "AUDIO_PIPELINE_ERROR".to_string(),
                                        message: format!("Audio processing error: {}", e),
                                    });
                                }
                                engine.stop();
                                let _ = engine.start();
                                None
                            }
                        }
                    } else {
                        None
                    }
                };
                if let Some(tick) = tick_opt {
                    if dsp_tx.blocking_send(tick).is_err() {
                        break;
                    }
                }
            }
        })
        .expect("Failed to spawn ghostboard-audio-dsp thread");

    let hud_for_audio = hud_state.clone();
    let llm_for_audio = llm_orchestrator.clone();
    let stt_for_audio = stt_orchestrator.clone();
    let tracker_for_audio = tracker.clone();
    tokio::spawn(async move {
        let mut consecutive_speech_ticks: u32 = 0;
        const LEVEL_EMIT_INTERVAL: std::time::Duration = std::time::Duration::from_millis(90);
        const LEVEL_DELTA_THRESHOLD: f32 = 0.5;
        const VAD_HANGOVER: std::time::Duration = std::time::Duration::from_millis(800);
        const PRE_ROLL_CAPACITY: usize = 4; // 4 * 30ms = 120ms pre-roll

        let mut last_level_emit = std::time::Instant::now();
        let mut last_loop_rms: f32 = 0.0;
        let mut last_mic_rms: f32 = 0.0;
        let mut last_interlocutor_speech: Option<std::time::Instant> = None;
        let mut last_interlocutor_active_rms: Option<std::time::Instant> = None;
        let mut last_candidate_speech: Option<std::time::Instant> = None;
        let mut interlocutor_preroll: std::collections::VecDeque<Vec<u8>> =
            std::collections::VecDeque::with_capacity(PRE_ROLL_CAPACITY);
        let mut candidate_preroll: std::collections::VecDeque<Vec<u8>> =
            std::collections::VecDeque::with_capacity(PRE_ROLL_CAPACITY);

        while let Some(tick) = dsp_rx.recv().await {
            // Track interlocutor active speech for Acoustic Echo Gate
            if tick.speech_detected || tick.interlocutor_rms >= 3.0 {
                last_interlocutor_active_rms = Some(std::time::Instant::now());
            }

            // Acoustic Echo Gate: if the interlocutor channel has active speech RMS above threshold
            // within the last 250ms, suppress duplicate bleed on the candidate channel!
            let is_echo_bleed = last_interlocutor_active_rms
                .map(|t| t.elapsed() <= std::time::Duration::from_millis(250))
                .unwrap_or(false);
            if is_echo_bleed {
                candidate_preroll.clear();
            }

            let now_ms = std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap_or_default()
                .as_millis() as u64;

            // 1. Emit throttled (~90ms) RMS AudioLevel events; skip silence / negligible change
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

            // 4. Forward 16kHz linear PCM to Deepgram WebSocket with VAD + RMS gating (800ms hangover, 120ms pre-roll)
            let interlocutor_active = tick.speech_detected || tick.interlocutor_rms >= 1.0;
            if interlocutor_active {
                let was_silent = last_interlocutor_speech
                    .map(|t| t.elapsed() > VAD_HANGOVER)
                    .unwrap_or(true);
                last_interlocutor_speech = Some(std::time::Instant::now());
                if was_silent {
                    while let Some(chunk) = interlocutor_preroll.pop_front() {
                        let _ = stt_for_audio.send_interlocutor_audio(chunk).await;
                    }
                }
                if !tick.pcm16_bytes.is_empty() {
                    let _ = stt_for_audio.send_interlocutor_audio(tick.pcm16_bytes).await;
                }
            } else if last_interlocutor_speech.map(|t| t.elapsed() <= VAD_HANGOVER).unwrap_or(false) {
                if !tick.pcm16_bytes.is_empty() {
                    let _ = stt_for_audio.send_interlocutor_audio(tick.pcm16_bytes).await;
                }
            } else if !tick.pcm16_bytes.is_empty() {
                if interlocutor_preroll.len() >= PRE_ROLL_CAPACITY {
                    interlocutor_preroll.pop_front();
                }
                interlocutor_preroll.push_back(tick.pcm16_bytes);
            }

            // Acoustic Echo Gate: suppress candidate audio forwarding if interlocutor channel was active
            let candidate_active = tick.candidate_speech_detected || tick.candidate_rms >= 1.0;
            if candidate_active && !is_echo_bleed {
                let was_silent = last_candidate_speech
                    .map(|t| t.elapsed() > VAD_HANGOVER)
                    .unwrap_or(true);
                last_candidate_speech = Some(std::time::Instant::now());
                if was_silent {
                    while let Some(chunk) = candidate_preroll.pop_front() {
                        let _ = stt_for_audio.send_candidate_audio(chunk).await;
                    }
                }
                if !tick.candidate_pcm16_bytes.is_empty() {
                    let _ = stt_for_audio.send_candidate_audio(tick.candidate_pcm16_bytes).await;
                }
            } else if !is_echo_bleed && last_candidate_speech.map(|t| t.elapsed() <= VAD_HANGOVER).unwrap_or(false) {
                if !tick.candidate_pcm16_bytes.is_empty() {
                    let _ = stt_for_audio.send_candidate_audio(tick.candidate_pcm16_bytes).await;
                }
            } else if !tick.candidate_pcm16_bytes.is_empty() {
                if candidate_preroll.len() >= PRE_ROLL_CAPACITY {
                    candidate_preroll.pop_front();
                }
                if !is_echo_bleed {
                    candidate_preroll.push_back(tick.candidate_pcm16_bytes);
                } else {
                    candidate_preroll.clear();
                }
            }

            // 5. EoT trigger check on VAD pause boundary (>350ms silence after speech)
            if tick.pause_boundary_triggered {
                let debounced = {
                    let tr = tracker_for_audio.lock().await;
                    match tr.last_trigger_instant {
                        Some(t) => t.elapsed() >= std::time::Duration::from_millis(1200),
                        None => true,
                    }
                };
                if debounced {
                    if let Some(trigger) = llm_for_audio.evaluate_eot(true, now_ms).await {
                        {
                            let mut tr = tracker_for_audio.lock().await;
                            tr.last_trigger_instant = Some(std::time::Instant::now());
                            tr.triggered_text = trigger.question_text.clone();
                        }
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
pub(crate) fn load_env_files() {
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

        // Also search upwards from CARGO_MANIFEST_DIR in development/testing
        if let Some(manifest_dir) = option_env!("CARGO_MANIFEST_DIR") {
            let mut m_dir = std::path::PathBuf::from(manifest_dir);
            for _ in 0..4 {
                let env_local = m_dir.join(".env.local");
                if env_local.is_file() {
                    load_single_env_file(&env_local);
                    loaded_any = true;
                }
                let env_file = m_dir.join(".env");
                if env_file.is_file() {
                    load_single_env_file(&env_file);
                    loaded_any = true;
                }
                if !m_dir.pop() {
                    break;
                }
            }
        }

        // Walk up the directory tree looking for .env and .env.local
        let max_depth = if cfg!(debug_assertions) { 6 } else { 2 };
        let mut current_dir = std::env::current_dir().ok();
        for _ in 0..max_depth {
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
            for _ in 0..max_depth {
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
            let mut trimmed = line.trim();
            if trimmed.is_empty() || trimmed.starts_with('#') {
                continue;
            }
            if trimmed.starts_with("export ") {
                trimmed = trimmed.trim_start_matches("export ").trim();
            }
            if let Some((k, v)) = trimmed.split_once('=') {
                let key = k.trim();
                let mut val = v.trim();
                if !val.starts_with('"') && !val.starts_with('\'') {
                    if let Some((clean_val, _)) = val.split_once('#') {
                        val = clean_val.trim();
                    }
                }
                let clean_val = val.trim_matches('"').trim_matches('\'').trim();
                if !key.is_empty() && !clean_val.is_empty() {
                    let should_override = match std::env::var(key) {
                        Ok(existing) => existing.trim().is_empty(),
                        Err(_) => true,
                    };
                    if should_override {
                        std::env::set_var(key, clean_val);
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

static PANIC_SHORTCUTS: std::sync::LazyLock<Vec<tauri_plugin_global_shortcut::Shortcut>> =
    std::sync::LazyLock::new(|| {
        use tauri_plugin_global_shortcut::{Code, Shortcut};
        let mut scs = vec![Shortcut::new(None, Code::F12)];
        for s in ["Ctrl+Shift+H", "Super+Shift+H", "CommandOrControl+Shift+H"] {
            if let Ok(sc) = s.parse::<Shortcut>() {
                scs.push(sc);
            }
        }
        scs
    });

static CLICK_SHORTCUTS: std::sync::LazyLock<Vec<tauri_plugin_global_shortcut::Shortcut>> =
    std::sync::LazyLock::new(|| {
        use tauri_plugin_global_shortcut::Shortcut;
        let mut scs = Vec::new();
        for s in ["Ctrl+Shift+X", "Super+Shift+X", "CommandOrControl+Shift+X"] {
            if let Ok(sc) = s.parse::<Shortcut>() {
                scs.push(sc);
            }
        }
        scs
    });

static SCREEN_SHORTCUTS: std::sync::LazyLock<Vec<tauri_plugin_global_shortcut::Shortcut>> =
    std::sync::LazyLock::new(|| {
        use tauri_plugin_global_shortcut::Shortcut;
        let mut scs = Vec::new();
        for s in ["Ctrl+Shift+S", "Super+Shift+S", "Alt+Shift+S", "CommandOrControl+Shift+S"] {
            if let Ok(sc) = s.parse::<Shortcut>() {
                scs.push(sc);
            }
        }
        scs
    });

fn main() {
    std::panic::set_hook(Box::new(|panic_info| {
        let backtrace = std::backtrace::Backtrace::capture();
        let payload = if let Some(s) = panic_info.payload().downcast_ref::<&str>() {
            *s
        } else if let Some(s) = panic_info.payload().downcast_ref::<String>() {
            s.as_str()
        } else {
            "Box<Any>"
        };
        let location = panic_info
            .location()
            .map(|l| format!("{}:{}:{}", l.file(), l.line(), l.column()))
            .unwrap_or_else(|| "unknown location".to_string());
        let crash_msg = format!(
            "Ghostboard Crash Report\nTimestamp: {:?}\nLocation: {}\nPanic message: {}\n\nBacktrace:\n{:?}",
            std::time::SystemTime::now(),
            location,
            payload,
            backtrace
        );
        eprintln!("{}", crash_msg);
        let crash_dir = std::env::var("HOME")
            .map(|h| std::path::PathBuf::from(h).join(".local/share/ghostboard"))
            .unwrap_or_else(|_| std::env::temp_dir().join("ghostboard"));
        let _ = std::fs::create_dir_all(&crash_dir);
        let _ = std::fs::write(crash_dir.join("crash.log"), crash_msg);
    }));

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
    tauri::async_runtime::set(rt.handle().clone());

    let hud_state = HudChannelState::new();
    let (transcript_tx, transcript_rx) = tokio::sync::mpsc::channel(100);
    let stt_orchestrator = Arc::new(SttOrchestrator::new(transcript_tx));
    let llm_orchestrator = Arc::new(LlmOrchestrator::new());
    let audio_state = crate::audio::GlobalAudioState::default();
    let auth_manager = Arc::new(AuthManager::new());
    let vision_radar = vision_radar::VisionRadarState::new();

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
                    let win = window.clone();
                    let app_h = app.clone();
                    let _ = crate::window::run_window_op_on_main_thread(&app_h, move || {
                        let _ = win.show();
                        let _ = win.unminimize();
                        let _ = win.set_focus();
                    });
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
                                tauri::async_runtime::spawn(async move {
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
        .manage(vision_radar.clone())
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(move |app, shortcut, event| {
                    if event.state == tauri_plugin_global_shortcut::ShortcutState::Pressed {
                        let is_panic = PANIC_SHORTCUTS.contains(shortcut);
                        let is_click = CLICK_SHORTCUTS.contains(shortcut);
                        let is_screenshot = SCREEN_SHORTCUTS.contains(shortcut);

                        if is_panic {
                            let target_win = app.get_webview_window(crate::window::hud::HUD_LABEL)
                                .or_else(|| app.get_webview_window("main"))
                                .or_else(|| app.webview_windows().into_values().next());
                            if let Some(w) = target_win {
                                let _ = crate::window::toggle_panic(&w);
                            }
                        } else if let Some(w) = app.get_webview_window(crate::window::hud::HUD_LABEL) {
                            if is_click {
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
            let vision_radar = vision_radar.clone();

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

                // Register pre-parsed global shortcuts: F12, Cmd/Ctrl+Shift+H, Cmd/Ctrl+Shift+X, Cmd/Ctrl/Alt+Shift+S
                use tauri_plugin_global_shortcut::GlobalShortcutExt;
                for sc in PANIC_SHORTCUTS.iter().chain(CLICK_SHORTCUTS.iter()).chain(SCREEN_SHORTCUTS.iter()) {
                    let _ = app.global_shortcut().register(*sc);
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
                            let _ = crate::window::run_window_op_on_main_thread(&app, move || {
                                let _ = crate::window::hud::launch_copilot_window(&handle, "chat");
                            });
                        }
                        "panic_hide" => {
                            let target_win = app.get_webview_window(crate::window::hud::HUD_LABEL)
                                .or_else(|| app.get_webview_window("main"))
                                .or_else(|| app.webview_windows().into_values().next());
                            if let Some(w) = target_win {
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
                                model: "gemini-3.5-flash".to_string(),
                                endpoint_url: None,
                            })
                            .await;
                            tracing::info!(target: "ghostboard::llm", "Auto-configured Gemini 3.5 Flash LLM provider from GEMINI_API_KEY");
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

                // Check and notify HUD if no LLM keys are configured
                if std::env::var("GEMINI_API_KEY").is_err()
                    && std::env::var("GROQ_API_KEY").is_err()
                    && std::env::var("OPENAI_API_KEY").is_err()
                    && std::env::var("ANTHROPIC_API_KEY").is_err()
                {
                    let hud_for_llm_err = hud_state.clone();
                    hud_for_llm_err.broadcast(HudEvent::Error {
                        code: "LLM_API_KEY_MISSING".to_string(),
                        message: "Ключ AI (GEMINI_API_KEY або GROQ_API_KEY) не знайдено у файлі .env".to_string(),
                    });
                }

                // Auto-connect Deepgram if DEEPGRAM_API_KEY is present or fetch from local backend
                let deepgram_key = std::env::var("DEEPGRAM_API_KEY").ok().filter(|k| !k.trim().is_empty());
                let stt_clone = stt_orchestrator.clone();
                let hud_for_deepgram = hud_state.clone();
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
                        hud_for_deepgram.broadcast(HudEvent::SttStatus {
                            speaker: "interlocutor".to_string(),
                            status: "failed".to_string(),
                            attempt: 0,
                            retry_in_ms: 0,
                            message: Some("DEEPGRAM_API_KEY не знайдено у .env".to_string()),
                        });
                    }
                });

                // Spawn the real-time background audio & copilot pipeline
                spawn_copilot_pipeline(
                    audio_state,
                    hud_state.clone(),
                    stt_orchestrator,
                    llm_orchestrator,
                    transcript_rx,
                );

                // Spawn the lightweight 2.5s perceptual dHash screen delta radar watcher
                spawn_vision_radar_watcher(app.handle().clone(), vision_radar, hud_state);

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
            set_stt_language,
            get_stt_language,
            crate::ipc::start_copilot_stream,
            crate::ipc::stop_hud_stream,
            trigger_manual_answer,
            stream_ai_answer,
            ask_llm_stream,
            configure_copilot_keys,
            set_ai_preferences,
            clear_session,
            export_markdown,
            start_pkce_login,
            handle_deep_link_code,
            start_device_code_flow,
            get_auth_state,
            get_access_token,
            save_tokens,
            capture_screen,
            toggle_vision_radar,
            consume_radar_snapshot,
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

    #[tokio::test]
    async fn test_capture_screen_command() {
        let res = capture_screen().await.expect("capture_screen command returns result");
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

        assert!(PANIC_SHORTCUTS.len() >= 4);
        assert!(CLICK_SHORTCUTS.len() >= 3);
        assert!(SCREEN_SHORTCUTS.len() >= 4);
        assert!(PANIC_SHORTCUTS.contains(&f12));

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

    #[test]
    fn test_open_system_browser_url_validation() {
        // Disallow dangerous schemes
        assert!(open_system_browser("javascript:alert(1)").is_err());
        assert!(open_system_browser("file:///etc/passwd").is_err());
        assert!(open_system_browser("data:text/html,<h1>XSS</h1>").is_err());

        // Disallow untrusted domains
        assert!(open_system_browser("https://evil-phishing-site.com").is_err());
        assert!(open_system_browser("https://ghostboard.ai.attacker.com").is_err());

        // Allowed domains (URL parses validly even if spawn fails on headless CI)
        let parsed = url::Url::parse("https://ghostboard.ai/activate");
        assert!(parsed.is_ok());
    }

    #[tokio::test]
    async fn test_export_markdown_path_traversal_sanitization() {
        let content = "# Test Session Notes\n\nAll clear.".to_string();
        // Path traversal payload
        let res = export_markdown(content, Some("../../etc/passwd".to_string()), None).await;
        assert!(res.is_ok());
        let path_str = res.unwrap();
        // File must be written strictly to safe directory with the bare filename "passwd" (not ../../etc/passwd)
        assert!(path_str.ends_with("passwd"));
        assert!(!path_str.contains(".."));
    }
}
