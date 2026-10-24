use futures_util::{SinkExt, StreamExt};
use serde::{Deserialize, Serialize};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::time::Duration;
use tokio::sync::mpsc;
use tokio_tungstenite::tungstenite::client::IntoClientRequest;
use tokio_tungstenite::tungstenite::http::HeaderValue;
use tokio_tungstenite::tungstenite::Message;
use crate::ipc::events::HudEvent;

pub const DEFAULT_DEEPGRAM_URL: &str =
    "wss://api.deepgram.com/v1/listen?model=nova-3&smart_format=true&interim_results=true&endpointing=300&encoding=linear16&sample_rate=16000&channels=1";

/// 45+ technical vocabulary keywords boosted for Deepgram Nova-3 recognition.
pub const TECH_KEYTERMS: &[&str] = &[
    // Core Languages & Runtimes
    "Python", "TypeScript", "JavaScript", "Golang", "Java", "Kotlin", "Swift", "C#", "Dart", "Rust", "SQL",
    // Web & Frontend
    "React", "Next.js", "Vue", "Nuxt", "Angular", "RxJS", "Redux", "Zustand", "Tailwind", "Vite",
    // Backend & Frameworks
    "FastAPI", "Django", "Node.js", "NestJS", "Express", "Spring Boot", "ASP.NET", "Gin",
    // Concurrency & Low-level
    "Asyncio", "Goroutine", "Coroutines", "EventLoop", "async/await", "GIL", "libuv", "JVM",
    // Databases & ORMs
    "PostgreSQL", "MySQL", "MongoDB", "Redis", "SQLAlchemy", "Prisma", "Hibernate", "Entity Framework", "Alembic", "B-Tree", "MVCC",
    // Cloud, Infra & Containers
    "Docker", "Kubernetes", "K8s", "Helm", "Terraform", "AWS", "GCP", "Azure", "Linux", "Nginx", "CI/CD",
    // Messaging & Streaming
    "Kafka", "RabbitMQ", "Celery", "WebSocket", "gRPC", "REST", "GraphQL",
    // Testing & QA
    "pytest", "Jest", "JUnit", "Playwright", "Cypress", "Selenium",
    // Mobile
    "SwiftUI", "Jetpack Compose", "Flutter", "React Native", "Xcode",
    // Data, AI & Big Data
    "PyTorch", "TensorFlow", "Pandas", "Spark", "Airflow", "Snowflake", "BigQuery", "dbt", "LangChain", "RAG", "LLM",
    // Architecture & Security
    "Microservices", "Clean Architecture", "CQRS", "DDD", "OWASP", "AppSec", "JWT", "OAuth",
];

/// Builds a fully-formed Deepgram Nova-3 WebSocket streaming URL with 45+ technical keywords boosted.
pub fn build_deepgram_url(base_model: Option<&str>, language: Option<&str>) -> String {
    let model = base_model.unwrap_or("nova-3");
    let mut url = format!(
        "wss://api.deepgram.com/v1/listen?model={}&smart_format=true&interim_results=true&endpointing=300&encoding=linear16&sample_rate=16000&channels=1",
        model
    );
    if let Some(lang) = language {
        let target_lang = if lang == "auto" { "multi" } else { lang };
        url.push_str(&format!("&language={}", target_lang));
    }
    for term in TECH_KEYTERMS {
        let encoded: String = url::form_urlencoded::byte_serialize(term.as_bytes()).collect();
        url.push_str(&format!("&keyterm={}", encoded));
    }
    url
}

fn default_speaker() -> String {
    "interlocutor".to_string()
}

/// A normalized transcript token emitted from Deepgram Nova-3.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct TranscriptToken {
    pub text: String,
    pub is_final: bool,
    pub speech_final: bool,
    pub confidence: f32,
    pub timestamp_ms: u64,
    #[serde(default = "default_speaker")]
    pub speaker: String,
}

/// Raw Deepgram WebSocket JSON structure.
#[derive(Debug, Clone, Deserialize)]
pub struct DeepgramResponse {
    #[serde(rename = "type")]
    pub msg_type: Option<String>,
    pub is_final: Option<bool>,
    pub speech_final: Option<bool>,
    pub channel: Option<DeepgramChannel>,
    pub duration: Option<f64>,
    pub start: Option<f64>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct DeepgramChannel {
    pub alternatives: Vec<DeepgramAlternative>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct DeepgramAlternative {
    pub transcript: String,
    pub confidence: Option<f32>,
}

/// Parses a Deepgram JSON WebSocket message into a TranscriptToken.
pub fn parse_deepgram_json(json_str: &str, current_time_ms: u64) -> Option<TranscriptToken> {
    parse_deepgram_json_with_speaker(json_str, current_time_ms, "interlocutor")
}

/// Parses a Deepgram JSON WebSocket message into a TranscriptToken with a designated speaker tag.
pub fn parse_deepgram_json_with_speaker(
    json_str: &str,
    current_time_ms: u64,
    speaker: &str,
) -> Option<TranscriptToken> {
    let resp: DeepgramResponse = serde_json::from_str(json_str).ok()?;
    let channel = resp.channel?;
    let alt = channel.alternatives.first()?;
    let text = alt.transcript.trim();
    if text.is_empty() {
        return None;
    }

    Some(TranscriptToken {
        text: text.to_string(),
        is_final: resp.is_final.unwrap_or(false),
        speech_final: resp.speech_final.unwrap_or(false),
        confidence: alt.confidence.unwrap_or(1.0),
        timestamp_ms: current_time_ms,
        speaker: speaker.to_string(),
    })
}

/// KeepAlive is sent when no audio was written for this long (Deepgram drops idle sockets at ~10s).
pub const KEEPALIVE_INTERVAL: Duration = Duration::from_millis(7500);
/// Reconnect backoff: first retry delay and ceiling.
pub const RECONNECT_BASE_DELAY_MS: u64 = 500;
pub const RECONNECT_MAX_DELAY_MS: u64 = 5000;

/// Exponential reconnect backoff: 500ms -> 1s -> 2s -> 4s -> 5s (capped).
/// `attempt` is zero-based (0 = first retry).
pub fn reconnect_backoff(attempt: u32) -> Duration {
    let factor = 1u64.checked_shl(attempt.min(16)).unwrap_or(u64::MAX);
    let ms = RECONNECT_BASE_DELAY_MS
        .saturating_mul(factor)
        .min(RECONNECT_MAX_DELAY_MS);
    Duration::from_millis(ms)
}

/// Builds the Deepgram KeepAlive text frame.
pub fn keepalive_message() -> Message {
    Message::Text(r#"{"type":"KeepAlive"}"#.to_string())
}

fn status_event(speaker: &str, status: &str, attempt: u32, retry_in_ms: u64, message: Option<String>) -> HudEvent {
    HudEvent::SttStatus {
        speaker: speaker.to_string(),
        status: status.to_string(),
        attempt,
        retry_in_ms,
        message,
    }
}

type WsStream = tokio_tungstenite::WebSocketStream<tokio_tungstenite::MaybeTlsStream<tokio::net::TcpStream>>;

fn build_request(
    api_key: &str,
    url: &str,
) -> Result<tokio_tungstenite::tungstenite::handshake::client::Request, String> {
    let mut request = url
        .into_client_request()
        .map_err(|e| format!("Invalid Deepgram URL {}: {}", url, e))?;
    let auth_header = format!("Token {}", api_key.trim());
    request.headers_mut().insert(
        "Authorization",
        HeaderValue::from_str(&auth_header).map_err(|e| format!("Invalid Authorization header: {}", e))?,
    );
    Ok(request)
}

/// True when the handshake failure is a non-retryable auth/permission rejection.
fn is_fatal_connect_error(e: &tokio_tungstenite::tungstenite::Error) -> bool {
    matches!(
        e,
        tokio_tungstenite::tungstenite::Error::Http(resp)
            if matches!(resp.status().as_u16(), 401 | 402 | 403)
    )
}

enum SessionEnd {
    /// Client dropped / transcript consumer gone: stop supervising.
    Stopped,
    /// Socket lost: reconnect.
    Dropped,
}

/// Runs one WebSocket session: forwards PCM, sends idle KeepAlive, reads transcripts.
async fn run_session(
    ws: WsStream,
    audio_rx: &mut mpsc::Receiver<Vec<u8>>,
    transcript_tx: &mpsc::Sender<TranscriptToken>,
    speaker: &str,
) -> SessionEnd {
    let (mut ws_write, mut ws_read) = ws.split();
    let mut last_write = tokio::time::Instant::now();

    let end = loop {
        let keepalive_deadline = last_write + KEEPALIVE_INTERVAL;
        tokio::select! {
            chunk = audio_rx.recv() => {
                match chunk {
                    None => break SessionEnd::Stopped,
                    Some(pcm) if pcm.is_empty() => {}
                    Some(pcm) => {
                        if let Err(e) = ws_write.send(Message::Binary(pcm)).await {
                            tracing::error!(target: "ghostboard::stt", speaker = %speaker, "Error sending PCM audio chunk: {}", e);
                            break SessionEnd::Dropped;
                        }
                        last_write = tokio::time::Instant::now();
                    }
                }
            }
            _ = tokio::time::sleep_until(keepalive_deadline) => {
                if let Err(e) = ws_write.send(keepalive_message()).await {
                    tracing::warn!(target: "ghostboard::stt", speaker = %speaker, "KeepAlive ping failed: {}", e);
                    break SessionEnd::Dropped;
                }
                last_write = tokio::time::Instant::now();
            }
            msg = ws_read.next() => {
                match msg {
                    Some(Ok(Message::Text(text))) => {
                        let now_ms = std::time::SystemTime::now()
                            .duration_since(std::time::UNIX_EPOCH)
                            .unwrap_or_default()
                            .as_millis() as u64;
                        if let Some(token) = parse_deepgram_json_with_speaker(&text, now_ms, speaker) {
                            if transcript_tx.send(token).await.is_err() {
                                break SessionEnd::Stopped;
                            }
                        }
                    }
                    Some(Ok(Message::Close(_))) | None => break SessionEnd::Dropped,
                    Some(Ok(_)) => {}
                    Some(Err(e)) => {
                        tracing::error!(target: "ghostboard::stt", speaker = %speaker, "WebSocket read error: {}", e);
                        break SessionEnd::Dropped;
                    }
                }
            }
        }
    };
    let _ = ws_write.close().await;
    end
}

/// Full-duplex WebSocket client streaming 16kHz linear PCM to Deepgram Nova-3.
/// The audio channel outlives individual sockets: a supervisor task reconnects with
/// exponential backoff while the client is alive, so capture never needs to restart.
pub struct DeepgramClient {
    audio_tx: mpsc::Sender<Vec<u8>>,
    is_connected: Arc<AtomicBool>,
}

impl DeepgramClient {
    /// Connects to Deepgram Nova-3 WebSocket and starts the full-duplex streaming loop.
    /// Emits parsed transcripts to `transcript_tx`.
    pub async fn connect(
        api_key: &str,
        endpoint_url: Option<&str>,
        transcript_tx: mpsc::Sender<TranscriptToken>,
    ) -> Result<Self, String> {
        Self::connect_with_speaker(api_key, endpoint_url, "interlocutor", transcript_tx).await
    }

    /// Connects to Deepgram Nova-3 with an explicit speaker tag ("interlocutor" or "candidate").
    pub async fn connect_with_speaker(
        api_key: &str,
        endpoint_url: Option<&str>,
        speaker: &str,
        transcript_tx: mpsc::Sender<TranscriptToken>,
    ) -> Result<Self, String> {
        Self::connect_supervised(api_key, endpoint_url, speaker, transcript_tx, None).await
    }

    /// Like `connect_with_speaker`, additionally publishing `HudEvent::SttStatus`
    /// (connected / reconnecting / failed) to `status_tx`.
    pub async fn connect_supervised(
        api_key: &str,
        endpoint_url: Option<&str>,
        speaker: &str,
        transcript_tx: mpsc::Sender<TranscriptToken>,
        status_tx: Option<mpsc::UnboundedSender<HudEvent>>,
    ) -> Result<Self, String> {
        let url = match endpoint_url {
            Some(u) => u.to_string(),
            None => build_deepgram_url(Some("nova-3"), None),
        };
        let api_key = api_key.to_string();

        let request = build_request(&api_key, &url)?;
        let (initial_ws, _) = tokio_tungstenite::connect_async(request)
            .await
            .map_err(|e| format!("Deepgram WebSocket connection failed: {}", e))?;

        let (audio_tx, mut audio_rx) = mpsc::channel::<Vec<u8>>(100);
        let is_connected = Arc::new(AtomicBool::new(true));
        let is_conn = is_connected.clone();
        let speaker_tag = speaker.to_string();

        let emit = move |ev: HudEvent| {
            if let Some(tx) = &status_tx {
                let _ = tx.send(ev);
            }
        };

        tokio::spawn(async move {
            let mut next_ws = Some(initial_ws);
            let mut attempt: u32 = 0;

            'supervisor: loop {
                let ws = match next_ws.take() {
                    Some(ws) => ws,
                    None => loop {
                        let delay = reconnect_backoff(attempt);
                        emit(status_event(
                            &speaker_tag,
                            "reconnecting",
                            attempt + 1,
                            delay.as_millis() as u64,
                            None,
                        ));
                        tracing::info!(
                            target: "ghostboard::stt",
                            speaker = %speaker_tag,
                            attempt = attempt + 1,
                            delay_ms = delay.as_millis(),
                            "Reconnecting to Deepgram"
                        );

                        // Wait out the backoff, discarding stale audio so capture is never blocked.
                        let sleep = tokio::time::sleep(delay);
                        tokio::pin!(sleep);
                        loop {
                            tokio::select! {
                                _ = &mut sleep => break,
                                chunk = audio_rx.recv() => {
                                    if chunk.is_none() {
                                        break 'supervisor;
                                    }
                                }
                            }
                        }
                        attempt = attempt.saturating_add(1);

                        let request = match build_request(&api_key, &url) {
                            Ok(r) => r,
                            Err(e) => {
                                emit(status_event(&speaker_tag, "failed", attempt, 0, Some(e)));
                                break 'supervisor;
                            }
                        };
                        match tokio_tungstenite::connect_async(request).await {
                            Ok((ws, _)) => break ws,
                            Err(e) => {
                                tracing::warn!(target: "ghostboard::stt", speaker = %speaker_tag, "Reconnect failed: {}", e);
                                if is_fatal_connect_error(&e) {
                                    emit(status_event(
                                        &speaker_tag,
                                        "failed",
                                        attempt,
                                        0,
                                        Some(format!("Deepgram rejected credentials: {}", e)),
                                    ));
                                    break 'supervisor;
                                }
                            }
                        }
                    },
                };

                attempt = 0; // successful connect resets the backoff
                is_conn.store(true, Ordering::Relaxed);
                emit(status_event(&speaker_tag, "connected", 0, 0, None));

                match run_session(ws, &mut audio_rx, &transcript_tx, &speaker_tag).await {
                    SessionEnd::Stopped => break,
                    SessionEnd::Dropped => {
                        is_conn.store(false, Ordering::Relaxed);
                    }
                }
            }
            is_conn.store(false, Ordering::Relaxed);
        });

        Ok(Self {
            audio_tx,
            is_connected,
        })
    }

    /// Feeds linear 16kHz mono 16-bit PCM audio bytes to the streaming WebSocket.
    pub fn send_audio(&self, pcm_bytes: Vec<u8>) -> Result<(), String> {
        if !self.is_connected.load(Ordering::Relaxed) {
            return Err("Deepgram connection is closed".to_string());
        }
        self.audio_tx
            .try_send(pcm_bytes)
            .map_err(|e| format!("Deepgram audio buffer full: {}", e))
    }

    /// Whether the WebSocket connection is actively open.
    pub fn is_connected(&self) -> bool {
        self.is_connected.load(Ordering::Relaxed)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_reconnect_backoff_sequence_and_cap() {
        assert_eq!(reconnect_backoff(0), Duration::from_millis(500));
        assert_eq!(reconnect_backoff(1), Duration::from_millis(1000));
        assert_eq!(reconnect_backoff(2), Duration::from_millis(2000));
        assert_eq!(reconnect_backoff(3), Duration::from_millis(4000));
        assert_eq!(reconnect_backoff(4), Duration::from_millis(5000));
        assert_eq!(reconnect_backoff(100), Duration::from_millis(5000));
        assert_eq!(reconnect_backoff(u32::MAX), Duration::from_millis(5000));
    }

    #[test]
    fn test_keepalive_message_and_interval() {
        match keepalive_message() {
            Message::Text(t) => {
                let v: serde_json::Value = serde_json::from_str(&t).expect("valid json");
                assert_eq!(v["type"], "KeepAlive");
            }
            other => panic!("KeepAlive must be a text frame, got {:?}", other),
        }
        assert!(KEEPALIVE_INTERVAL >= Duration::from_secs(7));
        assert!(KEEPALIVE_INTERVAL <= Duration::from_secs(8));
    }

    #[test]
    fn test_status_event_shape() {
        let ev = status_event("candidate", "reconnecting", 2, 1000, None);
        let json = serde_json::to_string(&ev).expect("serialize");
        assert!(json.contains(r#""type":"sttStatus""#));
        assert!(json.contains(r#""status":"reconnecting""#));
        assert!(json.contains(r#""attempt":2"#));
    }

    #[test]
    fn test_parse_deepgram_interim_json() {
        let json = r#"{
            "type": "Results",
            "channel_index": [0, 1],
            "duration": 0.5,
            "start": 0.0,
            "is_final": false,
            "speech_final": false,
            "channel": {
                "alternatives": [
                    {
                        "transcript": "how does the python",
                        "confidence": 0.85
                    }
                ]
            }
        }"#;

        let token = parse_deepgram_json(json, 1000).expect("should parse token");
        assert_eq!(token.text, "how does the python");
        assert!(!token.is_final);
        assert!(!token.speech_final);
        assert_eq!(token.confidence, 0.85);
        assert_eq!(token.timestamp_ms, 1000);
    }

    #[test]
    fn test_parse_deepgram_final_json() {
        let json = r#"{
            "type": "Results",
            "channel_index": [0, 1],
            "duration": 1.4,
            "start": 0.0,
            "is_final": true,
            "speech_final": true,
            "channel": {
                "alternatives": [
                    {
                        "transcript": "how does the Python GIL work?",
                        "confidence": 0.98
                    }
                ]
            }
        }"#;

        let token = parse_deepgram_json(json, 2500).expect("should parse token");
        assert_eq!(token.text, "how does the Python GIL work?");
        assert!(token.is_final);
        assert!(token.speech_final);
        assert_eq!(token.confidence, 0.98);
        assert_eq!(token.timestamp_ms, 2500);
    }

    #[test]
    fn test_parse_deepgram_empty_transcript_ignored() {
        let json = r#"{
            "type": "Results",
            "is_final": true,
            "speech_final": false,
            "channel": {
                "alternatives": [
                    {
                        "transcript": "   ",
                        "confidence": 0.0
                    }
                ]
            }
        }"#;

        let token = parse_deepgram_json(json, 3000);
        assert!(token.is_none());
    }

    #[test]
    fn test_build_deepgram_url_nova_3_and_tech_keyterms() {
        let url = build_deepgram_url(Some("nova-3"), Some("uk"));
        assert!(url.starts_with("wss://api.deepgram.com/v1/listen?"));
        assert!(url.contains("model=nova-3"));
        assert!(url.contains("smart_format=true"));
        assert!(url.contains("interim_results=true"));
        assert!(url.contains("endpointing=300"));
        assert!(url.contains("encoding=linear16"));
        assert!(url.contains("sample_rate=16000"));
        assert!(url.contains("channels=1"));
        assert!(url.contains("language=uk"));

        // Verify technical keyterms injected (45+)
        assert!(TECH_KEYTERMS.len() >= 45, "Must have 45+ technical keyterms, found {}", TECH_KEYTERMS.len());
        assert!(url.contains("keyterm=Kubernetes"));
        assert!(url.contains("keyterm=Celery"));
        assert!(url.contains("keyterm=PostgreSQL"));
        assert!(url.contains("keyterm=MVCC"));
        assert!(url.contains("keyterm=Goroutine"));
    }

    #[test]
    fn test_parse_deepgram_speaker_tagging() {
        let json = r#"{
            "type": "Results",
            "is_final": true,
            "speech_final": true,
            "channel": {
                "alternatives": [
                    {
                        "transcript": "Ми використовували Celery та Redis для черг задач",
                        "confidence": 0.95
                    }
                ]
            }
        }"#;

        // Candidate transcript
        let cand_token = parse_deepgram_json_with_speaker(json, 5000, "candidate")
            .expect("should parse candidate token");
        assert_eq!(cand_token.speaker, "candidate");
        assert_eq!(cand_token.text, "Ми використовували Celery та Redis для черг задач");

        // Interlocutor transcript
        let int_token = parse_deepgram_json_with_speaker(json, 5000, "interlocutor")
            .expect("should parse interlocutor token");
        assert_eq!(int_token.speaker, "interlocutor");
    }
}
