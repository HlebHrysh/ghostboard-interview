pub mod deepgram;
pub mod normalizer;

use crate::ipc::events::HudEvent;
use crate::stt::deepgram::{DeepgramClient, TranscriptToken};
use crate::stt::normalizer::normalize_technical_speech;
use std::sync::Arc;
use tokio::sync::{mpsc, Mutex};

/// Unified STT Orchestrator coordinating Deepgram WebSocket streaming,
/// technical phonetic normalization, and transcript routing for both
/// remote interlocutor and candidate speech.
pub struct SttOrchestrator {
    interlocutor_client: Arc<Mutex<Option<DeepgramClient>>>,
    candidate_client: Arc<Mutex<Option<DeepgramClient>>>,
    transcript_tx: mpsc::Sender<TranscriptToken>,
    status_tx: std::sync::Mutex<Option<mpsc::UnboundedSender<HudEvent>>>,
    current_language: Arc<Mutex<String>>,
    current_api_key: Arc<Mutex<Option<String>>>,
    custom_stack: Arc<Mutex<Option<String>>>,
}

impl SttOrchestrator {
    pub fn new(transcript_tx: mpsc::Sender<TranscriptToken>) -> Self {
        Self {
            interlocutor_client: Arc::new(Mutex::new(None)),
            candidate_client: Arc::new(Mutex::new(None)),
            transcript_tx,
            status_tx: std::sync::Mutex::new(None),
            current_language: Arc::new(Mutex::new("multi".to_string())),
            current_api_key: Arc::new(Mutex::new(None)),
            custom_stack: Arc::new(Mutex::new(None)),
        }
    }

    /// Registers a sink receiving `HudEvent::SttStatus` connection lifecycle events.
    pub fn set_status_sink(&self, tx: mpsc::UnboundedSender<HudEvent>) {
        let mut guard = match self.status_tx.lock() {
            Ok(g) => g,
            Err(p) => p.into_inner(),
        };
        *guard = Some(tx);
    }

    fn status_sink(&self) -> Option<mpsc::UnboundedSender<HudEvent>> {
        match self.status_tx.lock() {
            Ok(g) => g.clone(),
            Err(p) => p.into_inner().clone(),
        }
    }

    /// Sets the dynamic technical stack / CV context for Deepgram keyterm boosting.
    pub async fn set_custom_stack(&self, stack: Option<String>) {
        let mut lock = self.custom_stack.lock().await;
        *lock = stack;
    }

    /// Gets the current dynamic technical stack / CV context.
    pub async fn get_custom_stack(&self) -> Option<String> {
        let lock = self.custom_stack.lock().await;
        lock.clone()
    }

    /// Initializes and starts the Deepgram live WebSocket connection.
    pub async fn start(&self, api_key: &str, endpoint_url: Option<&str>) -> Result<(), String> {
        let trimmed_key = api_key.trim();
        if trimmed_key.is_empty() {
            return Err("Deepgram API key cannot be empty".to_string());
        }

        // Store the key for dynamic language switching reconnects
        {
            let mut key_lock = self.current_api_key.lock().await;
            *key_lock = Some(trimmed_key.to_string());
        }

        // Gracefully close any existing connection before establishing a new one
        self.stop().await;

        let (raw_tx, mut raw_rx) = mpsc::channel::<TranscriptToken>(100);
        let sink = self.status_sink();

        let lang = {
            let lang_lock = self.current_language.lock().await;
            lang_lock.clone()
        };

        let custom_stack = {
            let stack_lock = self.custom_stack.lock().await;
            stack_lock.clone()
        };

        let default_url = crate::stt::deepgram::build_deepgram_url_with_keyterms(
            Some("nova-3"),
            Some(&lang),
            custom_stack.as_deref(),
        );
        let url_to_use = endpoint_url.unwrap_or(&default_url);

        tracing::info!(
            target: "ghostboard::stt",
            url = %url_to_use,
            language = %lang,
            "Connecting to Deepgram with negotiated parameters"
        );

        // 1. Connect Interlocutor STT stream (tagged "interlocutor")
        let interlocutor_client = DeepgramClient::connect_supervised(
            trimmed_key,
            Some(url_to_use),
            "interlocutor",
            raw_tx.clone(),
            sink.clone(),
        )
        .await?;

        // 2. Connect Candidate STT stream (tagged "candidate")
        let candidate_client =
            match DeepgramClient::connect_supervised(trimmed_key, Some(url_to_use), "candidate", raw_tx, sink).await {
                Ok(c) => Some(c),
                Err(e) => {
                    tracing::warn!(target: "ghostboard::stt", "Candidate STT connection fallback: {}", e);
                    None
                }
            };

        // Task reading raw tokens from Deepgram and applying technical phonetic normalization
        let out_tx = self.transcript_tx.clone();
        tokio::spawn(async move {
            while let Some(mut token) = raw_rx.recv().await {
                // Apply developer speech normalization rules
                token.text = normalize_technical_speech(&token.text);
                if out_tx.send(token).await.is_err() {
                    break;
                }
            }
        });

        {
            let mut lock = self.interlocutor_client.lock().await;
            *lock = Some(interlocutor_client);
        }
        if let Some(cand) = candidate_client {
            let mut lock = self.candidate_client.lock().await;
            *lock = Some(cand);
        }

        Ok(())
    }

    /// Dynamically switches the active STT listening language ("multi", "uk", "ru", "en").
    /// Updates the setting and reconnects active WebSocket streams with the new language parameters.
    pub async fn set_language(&self, language: &str) -> Result<String, String> {
        let normalized = match language.trim().to_lowercase().as_str() {
            "uk" | "ua" => "uk",
            "ru" => "ru",
            "en" => "en",
            _ => "multi",
        };

        {
            let mut lang_lock = self.current_language.lock().await;
            *lang_lock = normalized.to_string();
        }

        let api_key_opt = {
            let key_lock = self.current_api_key.lock().await;
            key_lock.clone()
        };

        if let Some(key) = api_key_opt {
            let custom_stack = {
                let stack_lock = self.custom_stack.lock().await;
                stack_lock.clone()
            };
            let new_url = crate::stt::deepgram::build_deepgram_url_with_keyterms(
                Some("nova-3"),
                Some(normalized),
                custom_stack.as_deref(),
            );
            tracing::info!(
                target: "ghostboard::stt",
                language = %normalized,
                url = %new_url,
                "Switching STT language and reconnecting Deepgram streams on the fly"
            );
            self.start(&key, Some(&new_url)).await?;
        }

        Ok(normalized.to_string())
    }

    /// Returns the currently active STT listening language.
    pub async fn get_language(&self) -> String {
        let lang_lock = self.current_language.lock().await;
        lang_lock.clone()
    }

    /// Forwards 16kHz linear PCM audio bytes to Deepgram interlocutor stream.
    pub async fn send_audio(&self, pcm_bytes: Vec<u8>) -> Result<(), String> {
        self.send_interlocutor_audio(pcm_bytes).await
    }

    /// Forwards 16kHz linear PCM audio bytes to Deepgram interlocutor stream.
    pub async fn send_interlocutor_audio(&self, pcm_bytes: Vec<u8>) -> Result<(), String> {
        let lock = self.interlocutor_client.lock().await;
        if let Some(ref client) = *lock {
            client.send_audio(pcm_bytes)?;
        }
        Ok(())
    }

    /// Forwards 16kHz linear PCM audio bytes to Deepgram candidate stream.
    pub async fn send_candidate_audio(&self, pcm_bytes: Vec<u8>) -> Result<(), String> {
        let lock = self.candidate_client.lock().await;
        if let Some(ref client) = *lock {
            client.send_audio(pcm_bytes)?;
        }
        Ok(())
    }

    /// Checks if Deepgram is connected and active.
    pub async fn is_connected(&self) -> bool {
        let int_lock = self.interlocutor_client.lock().await;
        let cand_lock = self.candidate_client.lock().await;
        int_lock.as_ref().map(|c| c.is_connected()).unwrap_or(false)
            || cand_lock.as_ref().map(|c| c.is_connected()).unwrap_or(false)
    }

    /// Closes the connection.
    pub async fn stop(&self) {
        let mut int_lock = self.interlocutor_client.lock().await;
        *int_lock = None;
        let mut cand_lock = self.candidate_client.lock().await;
        *cand_lock = None;
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_stt_orchestrator_initialization() {
        let (tx, _rx) = mpsc::channel(10);
        let orchestrator = SttOrchestrator::new(tx);
        assert!(!orchestrator.is_connected().await);
        assert_eq!(orchestrator.get_language().await, "multi");
    }

    #[tokio::test]
    async fn test_stt_orchestrator_language_switch() {
        let (tx, _rx) = mpsc::channel(10);
        let orchestrator = SttOrchestrator::new(tx);
        assert_eq!(orchestrator.get_language().await, "multi");

        let res_uk = orchestrator.set_language("uk").await.unwrap();
        assert_eq!(res_uk, "uk");
        assert_eq!(orchestrator.get_language().await, "uk");

        let res_ru = orchestrator.set_language("RU").await.unwrap();
        assert_eq!(res_ru, "ru");

        let res_en = orchestrator.set_language("en").await.unwrap();
        assert_eq!(res_en, "en");

        let res_auto = orchestrator.set_language("auto").await.unwrap();
        assert_eq!(res_auto, "multi");
    }

    #[tokio::test]
    async fn test_stt_orchestrator_custom_stack() {
        let (tx, _rx) = mpsc::channel(10);
        let orchestrator = SttOrchestrator::new(tx);
        assert_eq!(orchestrator.get_custom_stack().await, None);

        orchestrator
            .set_custom_stack(Some("React, Next.js, Rust, ClickHouse, Kafka".to_string()))
            .await;
        assert_eq!(
            orchestrator.get_custom_stack().await,
            Some("React, Next.js, Rust, ClickHouse, Kafka".to_string())
        );

        orchestrator.set_custom_stack(None).await;
        assert_eq!(orchestrator.get_custom_stack().await, None);
    }
}
