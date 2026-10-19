pub mod deepgram;
pub mod normalizer;

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
}

impl SttOrchestrator {
    pub fn new(transcript_tx: mpsc::Sender<TranscriptToken>) -> Self {
        Self {
            interlocutor_client: Arc::new(Mutex::new(None)),
            candidate_client: Arc::new(Mutex::new(None)),
            transcript_tx,
        }
    }

    /// Initializes and starts the Deepgram live WebSocket connection.
    pub async fn start(&self, api_key: &str, endpoint_url: Option<&str>) -> Result<(), String> {
        let (raw_tx, mut raw_rx) = mpsc::channel::<TranscriptToken>(100);

        // 1. Connect Interlocutor STT stream (tagged "interlocutor")
        let interlocutor_client =
            DeepgramClient::connect_with_speaker(api_key, endpoint_url, "interlocutor", raw_tx.clone()).await?;

        // 2. Connect Candidate STT stream (tagged "candidate")
        let candidate_client = match DeepgramClient::connect_with_speaker(api_key, endpoint_url, "candidate", raw_tx).await {
            Ok(c) => Some(c),
            Err(e) => {
                eprintln!("[SttOrchestrator] Candidate STT connection fallback: {}", e);
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
    }
}
