use futures_util::{SinkExt, StreamExt};
use serde::{Deserialize, Serialize};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::time::Duration;
use tokio::sync::mpsc;
use tokio_tungstenite::tungstenite::client::IntoClientRequest;
use tokio_tungstenite::tungstenite::http::HeaderValue;
use tokio_tungstenite::tungstenite::Message;

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

/// Full-duplex WebSocket client streaming 16kHz linear PCM to Deepgram Nova-3.
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
        let generated_url;
        let url = match endpoint_url {
            Some(u) => u,
            None => {
                generated_url = build_deepgram_url(Some("nova-3"), None);
                &generated_url
            }
        };

        let mut request = url
            .into_client_request()
            .map_err(|e| format!("Invalid Deepgram URL {}: {}", url, e))?;

        let auth_header = format!("Token {}", api_key.trim());
        request.headers_mut().insert(
            "Authorization",
            HeaderValue::from_str(&auth_header)
                .map_err(|e| format!("Invalid Authorization header: {}", e))?,
        );

        let (ws_stream, _) = tokio_tungstenite::connect_async(request)
            .await
            .map_err(|e| format!("Deepgram WebSocket connection failed: {}", e))?;

        let (mut ws_write, mut ws_read) = ws_stream.split();
        let (audio_tx, mut audio_rx) = mpsc::channel::<Vec<u8>>(100);
        let is_connected = Arc::new(AtomicBool::new(true));
        let is_conn_read = is_connected.clone();
        let is_conn_write = is_connected.clone();
        let speaker_tag = speaker.to_string();

        // 1. Audio Sender Task (Streams 16kHz PCM chunks + KeepAlive ping during silence)
        tokio::spawn(async move {
            let mut keepalive_interval = tokio::time::interval(Duration::from_secs(8));
            keepalive_interval.set_missed_tick_behavior(tokio::time::MissedTickBehavior::Delay);

            loop {
                tokio::select! {
                    Some(pcm_chunk) = audio_rx.recv() => {
                        if !pcm_chunk.is_empty() {
                            if let Err(e) = ws_write.send(Message::Binary(pcm_chunk)).await {
                                eprintln!("[Deepgram] Error sending PCM audio chunk: {}", e);
                                break;
                            }
                        }
                    }
                    _ = keepalive_interval.tick() => {
                        // Deepgram closes idle connections after 10-15s of silence
                        let keepalive = Message::Text(r#"{"type":"KeepAlive"}"#.to_string());
                        if let Err(e) = ws_write.send(keepalive).await {
                            eprintln!("[Deepgram] KeepAlive ping failed: {}", e);
                            break;
                        }
                    }
                    else => break,
                }
            }
            is_conn_write.store(false, Ordering::Relaxed);
            let _ = ws_write.close().await;
        });

        // 2. Transcript Receiver Task (Reads interim and final transcription tokens)
        tokio::spawn(async move {
            while let Some(msg_result) = ws_read.next().await {
                match msg_result {
                    Ok(Message::Text(text)) => {
                        let now_ms = std::time::SystemTime::now()
                            .duration_since(std::time::UNIX_EPOCH)
                            .unwrap_or_default()
                            .as_millis() as u64;

                        if let Some(token) = parse_deepgram_json_with_speaker(&text, now_ms, &speaker_tag) {
                            if transcript_tx.send(token).await.is_err() {
                                break;
                            }
                        }
                    }
                    Ok(Message::Close(_)) => {
                        break;
                    }
                    Ok(_) => {}
                    Err(e) => {
                        eprintln!("[Deepgram] WebSocket read error: {}", e);
                        break;
                    }
                }
            }
            is_conn_read.store(false, Ordering::Relaxed);
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
