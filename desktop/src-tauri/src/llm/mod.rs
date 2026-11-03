pub mod client;
pub mod eot;
pub mod prompt;

use crate::ipc::events::HudEvent;
use crate::ipc::HudChannelState;
use crate::llm::client::{LlmConfig, LlmProviderType, LlmStreamOutcome, SpeculativeLlmClient};
use crate::llm::eot::{EotDetector, EotTrigger};
use crate::llm::prompt::{build_system_prompt_with_options, build_user_prompt};
use eventsource_stream::Eventsource;
use futures_util::StreamExt;
use std::sync::Arc;
use std::time::Instant;
use tokio::sync::Mutex;
use tokio_util::sync::CancellationToken;

/// Orchestrator managing End-of-Thought (EoT) detection, speculative LLM stream triggering,
/// active token cancellation, and dispatching HudEvent chunks directly to frontend channels.
pub struct LlmOrchestrator {
    eot_detector: Arc<Mutex<EotDetector>>,
    llm_client: Arc<SpeculativeLlmClient>,
    active_cancellation: Arc<Mutex<Option<CancellationToken>>>,
    config: Arc<Mutex<LlmConfig>>,
    candidate_profile: Arc<Mutex<Option<String>>>,
    concise_mode: Arc<Mutex<bool>>,
    output_language: Arc<Mutex<Option<String>>>,
    helper_language: Arc<Mutex<Option<String>>>,
    modifier: Arc<Mutex<Option<String>>>,
}

impl Default for LlmOrchestrator {
    fn default() -> Self {
        Self::new()
    }
}

impl LlmOrchestrator {
    pub fn new() -> Self {
        // Detect available API keys in environment: GEMINI_API_KEY, GROQ_API_KEY, OPENAI_API_KEY, ANTHROPIC_API_KEY
        let (provider, api_key, model) = if let Some(k) = std::env::var("GEMINI_API_KEY").ok().map(|s| s.trim().to_string()).filter(|s| !s.is_empty()) {
            (LlmProviderType::Gemini, k, "gemini-3.8-flash".to_string())
        } else if let Some(k) = std::env::var("GROQ_API_KEY").ok().map(|s| s.trim().to_string()).filter(|s| !s.is_empty()) {
            (LlmProviderType::Groq, k, "llama-3.3-70b-versatile".to_string())
        } else if let Some(k) = std::env::var("OPENAI_API_KEY").ok().map(|s| s.trim().to_string()).filter(|s| !s.is_empty()) {
            (LlmProviderType::OpenAI, k, "gpt-4o-mini".to_string())
        } else if let Some(k) = std::env::var("ANTHROPIC_API_KEY").ok().map(|s| s.trim().to_string()).filter(|s| !s.is_empty()) {
            (LlmProviderType::Anthropic, k, "claude-3-5-haiku-20241022".to_string())
        } else {
            (LlmProviderType::Gemini, String::new(), "gemini-3.8-flash".to_string())
        };

        Self {
            eot_detector: Arc::new(Mutex::new(EotDetector::default())),
            llm_client: Arc::new(SpeculativeLlmClient::new()),
            active_cancellation: Arc::new(Mutex::new(None)),
            config: Arc::new(Mutex::new(LlmConfig {
                provider,
                api_key,
                model,
                endpoint_url: None,
            })),
            candidate_profile: Arc::new(Mutex::new(None)),
            concise_mode: Arc::new(Mutex::new(false)),
            output_language: Arc::new(Mutex::new(None)),
            helper_language: Arc::new(Mutex::new(None)),
            modifier: Arc::new(Mutex::new(None)),
        }
    }

    /// Sets the LLM provider configuration.
    pub async fn set_config(&self, config: LlmConfig) {
        let mut conf = self.config.lock().await;
        *conf = config;
    }

    /// Sets candidate contextual background profile.
    pub async fn set_candidate_profile(&self, profile: Option<String>) {
        let mut p = self.candidate_profile.lock().await;
        *p = profile;
    }

    /// Toggles concise teleprompter output mode.
    pub async fn set_concise_mode(&self, concise: bool) {
        let mut c = self.concise_mode.lock().await;
        *c = concise;
    }

    /// Sets target output language (e.g. "auto", "bilingual", "uk", "en").
    pub async fn set_output_language(&self, lang: Option<String>) {
        let mut l = self.output_language.lock().await;
        *l = lang;
    }

    /// Sets helper language for bilingual prompter (e.g. "uk", "ru").
    pub async fn set_helper_language(&self, lang: Option<String>) {
        let mut l = self.helper_language.lock().await;
        *l = lang;
    }

    /// Sets rapid answer modifier ("shorter", "simpler", "code", "re_angle").
    pub async fn set_modifier(&self, modifier: Option<String>) {
        let mut m = self.modifier.lock().await;
        *m = modifier;
    }

    /// Ingests incoming transcript into the 90s sliding context window.
    pub async fn ingest_transcript(&self, text: &str, is_final: bool, speech_final: bool, timestamp_ms: u64) {
        let mut eot = self.eot_detector.lock().await;
        eot.add_transcript(text, is_final, speech_final, timestamp_ms);
    }

    /// Evaluates if an End-of-Thought (EoT) question boundary has been reached.
    pub async fn evaluate_eot(&self, vad_pause_boundary: bool, timestamp_ms: u64) -> Option<EotTrigger> {
        let mut eot = self.eot_detector.lock().await;
        eot.evaluate_eot(vad_pause_boundary, timestamp_ms)
    }

    /// Cancels any in-flight speculative LLM generation immediately.
    /// Called when the interlocutor resumes speaking within 1.5s of question detection.
    pub async fn abort_in_flight(&self) {
        let mut token_lock = self.active_cancellation.lock().await;
        if let Some(token) = token_lock.take() {
            token.cancel();
        }
    }

    /// Spawns a speculative streaming generation task for the detected question,
    /// broadcasting tokens directly into `HudChannelState`.
    pub async fn trigger_speculative_stream(
        &self,
        trigger: EotTrigger,
        hud_channel: HudChannelState,
    ) {
        // 1. Abort any previous generation task still running
        self.abort_in_flight().await;

        // 2. Broadcast questionDetected event to HUD
        hud_channel.broadcast(HudEvent::QuestionDetected {
            id: trigger.question_id.clone(),
            question: trigger.question_text.clone(),
            timestamp_ms: trigger.timestamp_ms,
        });

        // 3. Create a new CancellationToken for this speculative stream
        let cancel_token = CancellationToken::new();
        {
            let mut active = self.active_cancellation.lock().await;
            *active = Some(cancel_token.clone());
        }

        let config = {
            let conf_lock = self.config.lock().await;
            conf_lock.clone()
        };

        let candidate_profile = {
            let p_lock = self.candidate_profile.lock().await;
            p_lock.clone()
        };
        let is_concise = {
            let c_lock = self.concise_mode.lock().await;
            *c_lock
        };
        let (modifier, out_lang, helper_lang) = {
            let m_lock = self.modifier.lock().await;
            let l_lock = self.output_language.lock().await;
            let h_lock = self.helper_language.lock().await;
            let m = if is_concise {
                Some("shorter".to_string())
            } else {
                m_lock.clone()
            };
            (m, l_lock.clone(), h_lock.clone())
        };

        // If no API key is set in Rust, route request to local Next.js backend
        if config.api_key.trim().is_empty() {
            let q_text = trigger.question_text.clone();
            let q_id = trigger.question_id.clone();
            let channel_clone = hud_channel.clone();
            let cancel_clone = cancel_token.clone();
            let m_val = modifier.clone();
            let ol_val = out_lang.clone();
            let hl_val = helper_lang.clone();
            let active_cancellation_ref = self.active_cancellation.clone();

            tokio::spawn(async move {
                stream_from_local_nextjs_backend(
                    q_text,
                    m_val,
                    ol_val,
                    hl_val,
                    q_id,
                    channel_clone,
                    cancel_clone,
                )
                .await;
                let mut token_lock = active_cancellation_ref.lock().await;
                *token_lock = None;
            });
            return;
        }

        let system_prompt = build_system_prompt_with_options(
            candidate_profile.as_deref(),
            modifier.as_deref(),
            out_lang.as_deref(),
            helper_lang.as_deref(),
        );
        let user_prompt = build_user_prompt(&trigger.question_text, Some(&trigger.context_90s));

        let client = self.llm_client.clone();
        let q_id = trigger.question_id.clone();
        let channel_clone = hud_channel.clone();
        let active_cancellation_ref = self.active_cancellation.clone();

        tokio::spawn(async move {
            let start_time = Instant::now();
            let is_first = Arc::new(Mutex::new(true));
            let is_first_cb = is_first.clone();
            let q_id_cb = q_id.clone();
            let ch_cb = channel_clone.clone();

            let outcome = client
                .stream_answer(
                    &config,
                    &system_prompt,
                    &user_prompt,
                    cancel_token,
                    move |token| {
                        let mut first_lock = is_first_cb.try_lock();
                        let first_val = match first_lock.as_mut() {
                            Ok(guard) => {
                                let val = **guard;
                                **guard = false;
                                val
                            }
                            Err(_) => false,
                        };

                        ch_cb.broadcast(HudEvent::LlmChunk {
                            question_id: q_id_cb.clone(),
                            token,
                            is_first: first_val,
                        });
                    },
                )
                .await;

            let latency_ms = start_time.elapsed().as_millis() as u64;

            // Clear active cancellation reference
            {
                let mut token_lock = active_cancellation_ref.lock().await;
                *token_lock = None;
            }

            match outcome {
                Ok(LlmStreamOutcome::Completed { full_text, .. }) => {
                    channel_clone.broadcast(HudEvent::LlmDone {
                        question_id: q_id,
                        full_text,
                        latency_ms,
                    });
                }
                Ok(LlmStreamOutcome::Cancelled) => {
                    // Instantly aborted; no LlmDone event needed
                }
                Ok(LlmStreamOutcome::Failed(err)) => {
                    channel_clone.broadcast(HudEvent::Error {
                        code: "LLM_STREAM_FAILED".to_string(),
                        message: err,
                    });
                }
                Err(e) => {
                    channel_clone.broadcast(HudEvent::Error {
                        code: "LLM_REQUEST_ERROR".to_string(),
                        message: e,
                    });
                }
            }
        });
    }

    /// Directly streams an answer for a user prompt, test question, or button click,
    /// broadcasting HudEvent chunks AND returning the full text to the caller.
    pub async fn stream_answer_direct(
        &self,
        question: &str,
        modifier: Option<String>,
        output_lang: Option<String>,
        helper_lang: Option<String>,
        hud_channel: HudChannelState,
    ) -> Result<String, String> {
        let question = question.trim();
        if question.is_empty() {
            return Ok(String::new());
        }

        self.abort_in_flight().await;

        let now_ms = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_millis() as u64;

        let q_id = format!("q-direct-{}", now_ms);

        hud_channel.broadcast(HudEvent::QuestionDetected {
            id: q_id.clone(),
            question: question.to_string(),
            timestamp_ms: now_ms,
        });

        let cancel_token = CancellationToken::new();
        {
            let mut active = self.active_cancellation.lock().await;
            *active = Some(cancel_token.clone());
        }

        let config = {
            let conf_lock = self.config.lock().await;
            conf_lock.clone()
        };

        if config.api_key.trim().is_empty() {
            let err_msg = "Помилка API: GEMINI_API_KEY не знайдено у файлі .env. Вкажіть дійсний ключ Gemini у .env".to_string();
            hud_channel.broadcast(HudEvent::Error {
                code: "GEMINI_API_KEY_MISSING".to_string(),
                message: err_msg.clone(),
            });
            return Err(err_msg);
        }

        let candidate_profile = {
            let p_lock = self.candidate_profile.lock().await;
            p_lock.clone()
        };

        let system_prompt = build_system_prompt_with_options(
            candidate_profile.as_deref(),
            modifier.as_deref(),
            output_lang.as_deref(),
            helper_lang.as_deref(),
        );
        let user_prompt = build_user_prompt(question, None);

        let start_time = Instant::now();
        let is_first = Arc::new(Mutex::new(true));
        let is_first_cb = is_first.clone();
        let q_id_cb = q_id.clone();
        let ch_cb = hud_channel.clone();

        let outcome = self.llm_client
            .stream_answer(
                &config,
                &system_prompt,
                &user_prompt,
                cancel_token,
                move |token| {
                    let mut first_lock = is_first_cb.try_lock();
                    let first_val = match first_lock.as_mut() {
                        Ok(guard) => {
                            let val = **guard;
                            **guard = false;
                            val
                        }
                        Err(_) => false,
                    };

                    ch_cb.broadcast(HudEvent::LlmChunk {
                        question_id: q_id_cb.clone(),
                        token,
                        is_first: first_val,
                    });
                },
            )
            .await;

        let latency_ms = start_time.elapsed().as_millis() as u64;

        {
            let mut token_lock = self.active_cancellation.lock().await;
            *token_lock = None;
        }

        match outcome {
            Ok(LlmStreamOutcome::Completed { full_text, .. }) => {
                hud_channel.broadcast(HudEvent::LlmDone {
                    question_id: q_id,
                    full_text: full_text.clone(),
                    latency_ms,
                });
                Ok(full_text)
            }
            Ok(LlmStreamOutcome::Cancelled) => {
                Ok(String::new())
            }
            Ok(LlmStreamOutcome::Failed(err)) => {
                hud_channel.broadcast(HudEvent::Error {
                    code: "LLM_STREAM_FAILED".to_string(),
                    message: err.clone(),
                });
                Err(err)
            }
            Err(e) => {
                hud_channel.broadcast(HudEvent::Error {
                    code: "LLM_REQUEST_ERROR".to_string(),
                    message: e.clone(),
                });
                Err(e)
            }
        }
    }
}

async fn stream_from_local_nextjs_backend(
    question: String,
    modifier: Option<String>,
    output_lang: Option<String>,
    helper_lang: Option<String>,
    q_id: String,
    hud_channel: HudChannelState,
    cancel_token: CancellationToken,
) {
    let start_time = Instant::now();
    let urls = [
        "http://localhost:3000/api/ai/dual-stream",
        "http://localhost:3001/api/ai/dual-stream",
    ];

    let client = crate::llm::client::get_shared_llm_client();

    let payload = serde_json::json!({
        "question": question,
        "directorModifier": modifier.unwrap_or_else(|| "normal".to_string()),
        "outputLanguage": output_lang.unwrap_or_else(|| "en".to_string()),
        "helperLanguage": helper_lang.unwrap_or_else(|| "uk".to_string()),
    });

    let mut response_opt = None;
    for url in &urls {
        if cancel_token.is_cancelled() {
            return;
        }
        match client
            .post(*url)
            .header("x-ghostboard-client", "desktop-app")
            .header("Content-Type", "application/json")
            .header("Accept", "text/event-stream")
            .json(&payload)
            .send()
            .await
        {
            Ok(resp) if resp.status().is_success() => {
                response_opt = Some(resp);
                break;
            }
            _ => continue,
        }
    }

    let response = match response_opt {
        Some(r) => r,
        None => {
            hud_channel.broadcast(HudEvent::Error {
                code: "LLM_API_KEY_MISSING".to_string(),
                message: "Помилка API: перевірте GEMINI_API_KEY у файлі .env (ключ відсутній у Rust, а локальний Next.js бэкенд недоступний)".to_string(),
            });
            return;
        }
    };

    let mut stream = response.bytes_stream().eventsource();
    let mut full_text = String::new();
    let mut is_first = true;

    loop {
        tokio::select! {
            _ = cancel_token.cancelled() => {
                return;
            }
            event_res = stream.next() => {
                match event_res {
                    Some(Ok(event)) => {
                        let data = event.data.trim();
                        if data == "[DONE]" || data == "<<<END>>>" {
                            break;
                        }
                        if event.event == "chunk" {
                            if let Ok(v) = serde_json::from_str::<serde_json::Value>(data) {
                                if let Some(txt) = v.get("text").and_then(|t| t.as_str()) {
                                    full_text.push_str(txt);
                                    hud_channel.broadcast(HudEvent::LlmChunk {
                                        question_id: q_id.clone(),
                                        token: txt.to_string(),
                                        is_first,
                                    });
                                    is_first = false;
                                }
                            }
                        } else if event.event == "complete" {
                            break;
                        }
                    }
                    Some(Err(e)) => {
                        tracing::warn!(target: "ghostboard::llm", "Local backend stream error: {}", e);
                        break;
                    }
                    None => break,
                }
            }
        }
    }

    let latency_ms = start_time.elapsed().as_millis() as u64;
    hud_channel.broadcast(HudEvent::LlmDone {
        question_id: q_id,
        full_text,
        latency_ms,
    });
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_llm_orchestrator_initialization() {
        let orchestrator = LlmOrchestrator::new();
        orchestrator.set_concise_mode(true).await;
        orchestrator.abort_in_flight().await;
    }
}
