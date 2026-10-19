pub mod client;
pub mod eot;
pub mod prompt;

use crate::ipc::events::HudEvent;
use crate::ipc::HudChannelState;
use crate::llm::client::{LlmConfig, LlmProviderType, LlmStreamOutcome, SpeculativeLlmClient};
use crate::llm::eot::{EotDetector, EotTrigger};
use crate::llm::prompt::{build_system_prompt, build_user_prompt};
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
}

impl Default for LlmOrchestrator {
    fn default() -> Self {
        Self::new()
    }
}

impl LlmOrchestrator {
    pub fn new() -> Self {
        // Detect available API keys in environment: GROQ_API_KEY, OPENAI_API_KEY, ANTHROPIC_API_KEY
        let (provider, api_key, model) = if let Ok(k) = std::env::var("GROQ_API_KEY") {
            (LlmProviderType::Groq, k, "llama-3.3-70b-versatile".to_string())
        } else if let Ok(k) = std::env::var("OPENAI_API_KEY") {
            (LlmProviderType::OpenAI, k, "gpt-4o-mini".to_string())
        } else if let Ok(k) = std::env::var("ANTHROPIC_API_KEY") {
            (LlmProviderType::Anthropic, k, "claude-3-5-haiku-20241022".to_string())
        } else {
            (LlmProviderType::Groq, String::new(), "llama-3.3-70b-versatile".to_string())
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

        // If no API key is set, log or emit notice and do not fail silently
        if config.api_key.trim().is_empty() {
            hud_channel.broadcast(HudEvent::Error {
                code: "LLM_API_KEY_MISSING".to_string(),
                message: "No LLM API key configured (set GROQ_API_KEY, OPENAI_API_KEY, or ANTHROPIC_API_KEY)".to_string(),
            });
            return;
        }

        let candidate_profile = {
            let p_lock = self.candidate_profile.lock().await;
            p_lock.clone()
        };
        let is_concise = {
            let c_lock = self.concise_mode.lock().await;
            *c_lock
        };

        let system_prompt = build_system_prompt(candidate_profile.as_deref(), is_concise);
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
