pub mod client;
pub mod eot;
pub mod prompt;

use crate::ipc::events::HudEvent;
use crate::ipc::HudChannelState;
use crate::llm::client::{LlmConfig, LlmProviderType, LlmStreamOutcome, SpeculativeLlmClient};
use crate::llm::eot::{EotDetector, EotTrigger};
use crate::llm::prompt::build_system_prompt_with_options;
use eventsource_stream::Eventsource;
use futures_util::StreamExt;
use std::sync::Arc;
use std::sync::atomic::{AtomicU64, Ordering};
use std::time::Instant;
use tokio::sync::Mutex;
use tokio_util::sync::CancellationToken;

/// Orchestrator managing End-of-Thought (EoT) detection, speculative LLM stream triggering,
/// active token cancellation, and dispatching HudEvent chunks directly to frontend channels.
pub struct LlmOrchestrator {
    eot_detector: Arc<Mutex<EotDetector>>,
    llm_client: Arc<SpeculativeLlmClient>,
    active_cancellation: Arc<Mutex<Option<(u64, CancellationToken)>>>,
    generation: Arc<AtomicU64>,
    config: Arc<Mutex<LlmConfig>>,
    candidate_profile: Arc<Mutex<Option<String>>>,
    concise_mode: Arc<Mutex<bool>>,
    output_language: Arc<Mutex<Option<String>>>,
    helper_language: Arc<Mutex<Option<String>>>,
    modifier: Arc<Mutex<Option<String>>>,
    recent_turns: Arc<Mutex<Vec<crate::llm::prompt::FollowUpContextTurn>>>,
}

impl Default for LlmOrchestrator {
    fn default() -> Self {
        Self::new()
    }
}

impl LlmOrchestrator {
    pub fn new() -> Self {
        crate::load_env_files();
        // Detect available API keys in environment: GEMINI_API_KEY, GROQ_API_KEY, OPENAI_API_KEY, ANTHROPIC_API_KEY
        let (provider, api_key, model) = if let Some(k) = std::env::var("GEMINI_API_KEY").ok().map(|s| s.trim().to_string()).filter(|s| !s.is_empty()) {
            (LlmProviderType::Gemini, k, "gemini-3.5-flash".to_string())
        } else if let Some(k) = std::env::var("GROQ_API_KEY").ok().map(|s| s.trim().to_string()).filter(|s| !s.is_empty()) {
            (LlmProviderType::Groq, k, "llama-3.3-70b-versatile".to_string())
        } else if let Some(k) = std::env::var("OPENAI_API_KEY").ok().map(|s| s.trim().to_string()).filter(|s| !s.is_empty()) {
            (LlmProviderType::OpenAI, k, "gpt-4o-mini".to_string())
        } else if let Some(k) = std::env::var("ANTHROPIC_API_KEY").ok().map(|s| s.trim().to_string()).filter(|s| !s.is_empty()) {
            (LlmProviderType::Anthropic, k, "claude-3-5-haiku-20241022".to_string())
        } else {
            (LlmProviderType::Gemini, String::new(), "gemini-3.5-flash".to_string())
        };

        Self {
            eot_detector: Arc::new(Mutex::new(EotDetector::default())),
            llm_client: Arc::new(SpeculativeLlmClient::new()),
            active_cancellation: Arc::new(Mutex::new(None)),
            generation: Arc::new(AtomicU64::new(0)),
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
            recent_turns: Arc::new(Mutex::new(Vec::new())),
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

    /// Returns aggregated 90-second sliding conversation context.
    pub async fn get_sliding_context(&self) -> String {
        let eot = self.eot_detector.lock().await;
        eot.get_sliding_context()
    }

    /// Cancels any in-flight speculative LLM generation immediately.
    /// Called when the interlocutor resumes speaking within 1.5s of question detection.
    pub async fn abort_in_flight(&self) {
        let mut token_lock = self.active_cancellation.lock().await;
        if let Some((_, token)) = token_lock.take() {
            token.cancel();
        }
    }

    /// Clears the rolling 2-turn follow-up context history.
    pub async fn clear_history(&self) {
        let mut turns = self.recent_turns.lock().await;
        turns.clear();
    }

    /// Spawns a speculative streaming generation task for the detected question,
    /// broadcasting tokens directly into `HudChannelState`.
    pub async fn trigger_speculative_stream(
        &self,
        trigger: EotTrigger,
        hud_channel: HudChannelState,
    ) {
        // 1. Create a new CancellationToken for this speculative stream and atomically cancel any prior task
        let cancel_token = CancellationToken::new();
        let gen = {
            let mut active = self.active_cancellation.lock().await;
            if let Some((_, old_token)) = active.take() {
                old_token.cancel();
            }
            let next_gen = self.generation.fetch_add(1, Ordering::SeqCst) + 1;
            *active = Some((next_gen, cancel_token.clone()));
            next_gen
        };

        // 2. Broadcast questionDetected event to HUD
        hud_channel.broadcast(HudEvent::QuestionDetected {
            id: trigger.question_id.clone(),
            question: trigger.question_text.clone(),
            timestamp_ms: trigger.timestamp_ms,
        });

        let mut config = {
            let conf_lock = self.config.lock().await;
            conf_lock.clone()
        };

        if config.api_key.trim().is_empty() {
            crate::load_env_files();
            if let Some(k) = std::env::var("GEMINI_API_KEY").ok().map(|s| s.trim().to_string()).filter(|s| !s.is_empty()) {
                config.provider = LlmProviderType::Gemini;
                config.api_key = k;
                config.model = "gemini-3.5-flash".to_string();
                let mut conf_lock = self.config.lock().await;
                *conf_lock = config.clone();
            } else if let Some(k) = std::env::var("GROQ_API_KEY").ok().map(|s| s.trim().to_string()).filter(|s| !s.is_empty()) {
                config.provider = LlmProviderType::Groq;
                config.api_key = k;
                config.model = "llama-3.3-70b-versatile".to_string();
                let mut conf_lock = self.config.lock().await;
                *conf_lock = config.clone();
            }
        }

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
                if let Err(e) = stream_from_local_nextjs_backend(
                    q_text,
                    m_val,
                    ol_val.clone(),
                    hl_val,
                    q_id.clone(),
                    channel_clone.clone(),
                    cancel_clone,
                )
                .await
                {
                    tracing::warn!(target: "ghostboard::llm", error = %e, "Local Next.js stream failed, emitting Emergency Coaching Card");
                    let emergency_card = crate::llm::prompt::build_emergency_coaching_card(ol_val.as_deref());
                    channel_clone.broadcast(HudEvent::LlmChunk {
                        question_id: q_id.clone(),
                        token: emergency_card.clone(),
                        is_first: true,
                    });
                    channel_clone.broadcast(HudEvent::LlmDone {
                        question_id: q_id,
                        full_text: emergency_card,
                        latency_ms: 0,
                    });
                }
                let mut token_lock = active_cancellation_ref.lock().await;
                if let Some((stored_gen, _)) = *token_lock {
                    if stored_gen == gen {
                        *token_lock = None;
                    }
                }
            });
            return;
        }

        let system_prompt = build_system_prompt_with_options(
            candidate_profile.as_deref(),
            modifier.as_deref(),
            out_lang.as_deref(),
            helper_lang.as_deref(),
        );

        let recent_turns = {
            let turns = self.recent_turns.lock().await;
            turns.clone()
        };
        let user_prompt = crate::llm::prompt::build_user_prompt_with_history(
            &trigger.question_text,
            Some(&trigger.context_90s),
            Some(&recent_turns),
        );

        let client = self.llm_client.clone();
        let q_id = trigger.question_id.clone();
        let trigger_q = trigger.question_text.clone();
        let recent_turns_ref = self.recent_turns.clone();
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
                    cancel_token.clone(),
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

            // Clear active cancellation reference only if generation matches
            {
                let mut token_lock = active_cancellation_ref.lock().await;
                if let Some((stored_gen, _)) = *token_lock {
                    if stored_gen == gen {
                        *token_lock = None;
                    }
                }
            }

            match outcome {
                Ok(LlmStreamOutcome::Completed { full_text, .. }) => {
                    let short_hook = full_text
                        .lines()
                        .find(|l| !l.trim().is_empty())
                        .map(|s| s.trim().chars().take(160).collect::<String>());
                    {
                        let mut turns = recent_turns_ref.lock().await;
                        turns.push(crate::llm::prompt::FollowUpContextTurn {
                            question: trigger_q,
                            short_hook,
                        });
                        if turns.len() > 2 {
                            turns.remove(0);
                        }
                    }

                    channel_clone.broadcast(HudEvent::LlmDone {
                        question_id: q_id,
                        full_text,
                        latency_ms,
                    });
                }
                Ok(LlmStreamOutcome::Cancelled) => {
                    // Instantly aborted; no LlmDone event needed
                }
                Ok(LlmStreamOutcome::Failed(err)) | Err(err) => {
                    tracing::warn!(target: "ghostboard::llm", error = %err, "Native LLM stream failed, attempting local Next.js failover");
                    if let Err(e) = stream_from_local_nextjs_backend(
                        trigger_q,
                        modifier,
                        out_lang.clone(),
                        helper_lang,
                        q_id.clone(),
                        channel_clone.clone(),
                        cancel_token,
                    )
                    .await
                    {
                        tracing::warn!(target: "ghostboard::llm", error = %e, "Local Next.js failover failed, emitting Emergency Coaching Card");
                        let emergency_card = crate::llm::prompt::build_emergency_coaching_card(out_lang.as_deref());
                        channel_clone.broadcast(HudEvent::LlmChunk {
                            question_id: q_id.clone(),
                            token: emergency_card.clone(),
                            is_first: true,
                        });
                        channel_clone.broadcast(HudEvent::LlmDone {
                            question_id: q_id,
                            full_text: emergency_card,
                            latency_ms,
                        });
                    }
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
        candidate_profile_dto: Option<crate::llm::prompt::CandidateProfileDto>,
        history_dto: Option<Vec<crate::llm::prompt::HistoryTurnDto>>,
        hud_channel: HudChannelState,
    ) -> Result<String, String> {
        let question = question.trim();
        if question.is_empty() {
            return Ok(String::new());
        }

        let cancel_token = CancellationToken::new();
        let gen = {
            let mut active = self.active_cancellation.lock().await;
            if let Some((_, old_token)) = active.take() {
                old_token.cancel();
            }
            let next_gen = self.generation.fetch_add(1, Ordering::SeqCst) + 1;
            *active = Some((next_gen, cancel_token.clone()));
            next_gen
        };

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

        let mut config = {
            let conf_lock = self.config.lock().await;
            conf_lock.clone()
        };

        if config.api_key.trim().is_empty() {
            crate::load_env_files();
            if let Some(k) = std::env::var("GEMINI_API_KEY").ok().map(|s| s.trim().to_string()).filter(|s| !s.is_empty()) {
                config.provider = LlmProviderType::Gemini;
                config.api_key = k;
                config.model = "gemini-3.5-flash".to_string();
                let mut conf_lock = self.config.lock().await;
                *conf_lock = config.clone();
            } else if let Some(k) = std::env::var("GROQ_API_KEY").ok().map(|s| s.trim().to_string()).filter(|s| !s.is_empty()) {
                config.provider = LlmProviderType::Groq;
                config.api_key = k;
                config.model = "llama-3.3-70b-versatile".to_string();
                let mut conf_lock = self.config.lock().await;
                *conf_lock = config.clone();
            }
        }

        if config.api_key.trim().is_empty() {
            match stream_from_local_nextjs_backend(
                question.to_string(),
                modifier.clone(),
                output_lang.clone(),
                helper_lang.clone(),
                q_id.clone(),
                hud_channel.clone(),
                cancel_token.clone(),
            )
            .await
            {
                Ok(full_text) => return Ok(full_text),
                Err(_) => {
                    let emergency_card = crate::llm::prompt::build_emergency_coaching_card(output_lang.as_deref());
                    hud_channel.broadcast(HudEvent::LlmChunk {
                        question_id: q_id.clone(),
                        token: emergency_card.clone(),
                        is_first: true,
                    });
                    hud_channel.broadcast(HudEvent::LlmDone {
                        question_id: q_id,
                        full_text: emergency_card.clone(),
                        latency_ms: 0,
                    });
                    return Ok(emergency_card);
                }
            }
        }

        let candidate_profile_str = match candidate_profile_dto {
            Some(dto) => {
                let s = dto.to_context_string();
                if s.trim().is_empty() {
                    let p_lock = self.candidate_profile.lock().await;
                    p_lock.clone()
                } else {
                    Some(s)
                }
            }
            None => {
                let p_lock = self.candidate_profile.lock().await;
                p_lock.clone()
            }
        };

        let system_prompt = build_system_prompt_with_options(
            candidate_profile_str.as_deref(),
            modifier.as_deref(),
            output_lang.as_deref(),
            helper_lang.as_deref(),
        );

        let recent_turns = if let Some(history) = history_dto {
            let mut turns = Vec::new();
            let mut last_q: Option<String> = None;
            for h in history {
                if h.speaker == "interviewer" {
                    last_q = Some(h.text);
                } else if h.speaker == "candidate" {
                    if let Some(q) = last_q.take() {
                        turns.push(crate::llm::prompt::FollowUpContextTurn {
                            question: q,
                            short_hook: Some(h.text),
                        });
                    }
                }
            }
            if turns.is_empty() {
                let t_lock = self.recent_turns.lock().await;
                t_lock.clone()
            } else {
                turns
            }
        } else {
            let t_lock = self.recent_turns.lock().await;
            t_lock.clone()
        };

        let user_prompt = crate::llm::prompt::build_user_prompt_with_history(
            question,
            None,
            Some(&recent_turns),
        );

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
                cancel_token.clone(),
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
            if let Some((stored_gen, _)) = *token_lock {
                if stored_gen == gen {
                    *token_lock = None;
                }
            }
        }

        match outcome {
            Ok(LlmStreamOutcome::Completed { full_text, .. }) => {
                let short_hook = full_text
                    .lines()
                    .find(|l| !l.trim().is_empty())
                    .map(|s| s.trim().chars().take(160).collect::<String>());
                {
                    let mut turns = self.recent_turns.lock().await;
                    turns.push(crate::llm::prompt::FollowUpContextTurn {
                        question: question.to_string(),
                        short_hook,
                    });
                    if turns.len() > 2 {
                        turns.remove(0);
                    }
                }

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
            Ok(LlmStreamOutcome::Failed(err)) | Err(err) => {
                tracing::warn!(target: "ghostboard::llm", error = %err, "Native stream_answer_direct failed, failing over to local Next.js");
                match stream_from_local_nextjs_backend(
                    question.to_string(),
                    modifier,
                    output_lang.clone(),
                    helper_lang,
                    q_id.clone(),
                    hud_channel.clone(),
                    cancel_token,
                )
                .await
                {
                    Ok(txt) => Ok(txt),
                    Err(_) => {
                        let emergency_card = crate::llm::prompt::build_emergency_coaching_card(output_lang.as_deref());
                        hud_channel.broadcast(HudEvent::LlmChunk {
                            question_id: q_id.clone(),
                            token: emergency_card.clone(),
                            is_first: true,
                        });
                        hud_channel.broadcast(HudEvent::LlmDone {
                            question_id: q_id,
                            full_text: emergency_card.clone(),
                            latency_ms,
                        });
                        Ok(emergency_card)
                    }
                }
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
) -> Result<String, String> {
    let start_time = Instant::now();
    let mut urls: Vec<String> = Vec::new();

    if let Ok(custom_url) = std::env::var("GHOSTBOARD_API_URL").or_else(|_| std::env::var("VITE_API_URL")) {
        let trimmed = custom_url.trim();
        if !trimmed.is_empty() {
            let full_url = if trimmed.ends_with("/api/ai/dual-stream") {
                trimmed.to_string()
            } else {
                format!("{}/api/ai/dual-stream", trimmed.trim_end_matches('/'))
            };
            urls.push(full_url);
        }
    }

    urls.push("http://localhost:3000/api/ai/dual-stream".to_string());
    urls.push("http://localhost:3001/api/ai/dual-stream".to_string());
    urls.push("https://ghostboard.tech/api/ai/dual-stream".to_string());

    let auth_token = std::env::var("GHOSTBOARD_AUTH_TOKEN")
        .ok()
        .filter(|t| !t.trim().is_empty())
        .or_else(|| {
            crate::auth::keyring::KeyringStore::new()
                .load()
                .ok()
                .flatten()
                .map(|s| s.access_token)
                .filter(|t| !t.trim().is_empty())
        });

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
            return Err("Cancelled".to_string());
        }
        let mut req = client
            .post(url)
            .header("x-ghostboard-client", "desktop-app")
            .header("Content-Type", "application/json")
            .header("Accept", "text/event-stream");

        if let Some(ref token) = auth_token {
            req = req.header("Authorization", format!("Bearer {}", token));
        }

        match req
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
            return Err("Local backend offline".to_string());
        }
    };

    let mut stream = response.bytes_stream().eventsource();
    let mut full_text = String::new();
    let mut is_first = true;

    loop {
        tokio::select! {
            _ = cancel_token.cancelled() => {
                return Err("Cancelled".to_string());
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

    if full_text.trim().is_empty() {
        return Err("Local backend returned empty response".to_string());
    }

    let latency_ms = start_time.elapsed().as_millis() as u64;
    hud_channel.broadcast(HudEvent::LlmDone {
        question_id: q_id,
        full_text: full_text.clone(),
        latency_ms,
    });
    Ok(full_text)
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

    #[tokio::test]
    async fn test_llm_orchestrator_generational_cancellation() {
        let orchestrator = LlmOrchestrator::new();
        let hud = HudChannelState::new();

        let trigger1 = EotTrigger {
            question_id: "q1".to_string(),
            question_text: "What is Rust?".to_string(),
            context_90s: "context".to_string(),
            timestamp_ms: 100,
        };

        orchestrator.trigger_speculative_stream(trigger1, hud.clone()).await;

        let token1 = {
            let active = orchestrator.active_cancellation.lock().await;
            assert!(active.is_some());
            let (gen, ref tok) = active.as_ref().unwrap();
            assert_eq!(*gen, 1);
            tok.clone()
        };

        // Trigger second stream
        let trigger2 = EotTrigger {
            question_id: "q2".to_string(),
            question_text: "What is Tokio?".to_string(),
            context_90s: "context".to_string(),
            timestamp_ms: 200,
        };
        orchestrator.trigger_speculative_stream(trigger2, hud.clone()).await;

        // Verify token1 was cancelled
        assert!(token1.is_cancelled());

        let token2 = {
            let active = orchestrator.active_cancellation.lock().await;
            assert!(active.is_some());
            let (gen, ref tok) = active.as_ref().unwrap();
            assert_eq!(*gen, 2);
            tok.clone()
        };
        assert!(!token2.is_cancelled());

        // Simulate delayed generation 1 cleanup attempt: should NOT clear gen 2
        {
            let mut active = orchestrator.active_cancellation.lock().await;
            if let Some((stored_gen, _)) = *active {
                if stored_gen == 1 {
                    *active = None;
                }
            }
        }

        // Active token should still be gen 2
        {
            let active = orchestrator.active_cancellation.lock().await;
            assert!(active.is_some());
            let (gen, _) = active.as_ref().unwrap();
            assert_eq!(*gen, 2);
        }

        // Abort in flight cancels token2
        orchestrator.abort_in_flight().await;
        assert!(token2.is_cancelled());
        {
            let active = orchestrator.active_cancellation.lock().await;
            assert!(active.is_none());
        }
    }
}
