use futures_util::{SinkExt, StreamExt};
use serde::{Deserialize, Serialize};
use std::collections::HashSet;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::time::Duration;
use tokio::sync::mpsc;
use tokio_tungstenite::tungstenite::client::IntoClientRequest;
use tokio_tungstenite::tungstenite::http::HeaderValue;
use tokio_tungstenite::tungstenite::Message;
use crate::ipc::events::HudEvent;

pub const BASE_DEEPGRAM_URL: &str =
    "wss://api.deepgram.com/v1/listen?model=nova-3&language=multi&encoding=linear16&sample_rate=16000&channels=1&interim_results=true&punctuate=true&smart_format=true&endpointing=350&vad_events=true";

pub const DEFAULT_DEEPGRAM_URL: &str = BASE_DEEPGRAM_URL;

/// 20 key technical terms boosted for Deepgram (nova-3 limit: 500 tokens across all keyterms).
pub const TECH_KEYTERMS: &[&str] = &[
    "Python", "TypeScript", "React", "Next.js", "Node.js", "Rust", "SQL", "PostgreSQL", "Redis", "Docker",
    "Kubernetes", "AWS", "Kafka", "gRPC", "GraphQL", "REST", "Microservices", "LLM", "JWT", "CI/CD",
];

fn is_stopword(word: &str) -> bool {
    let lower = word.to_lowercase();
    match lower.as_str() {
        "a" | "an" | "the" | "and" | "or" | "but" | "in" | "on" | "at" | "to" | "for" | "of" | "with"
        | "by" | "from" | "is" | "are" | "was" | "were" | "be" | "been" | "have" | "has" | "had"
        | "do" | "does" | "did" | "will" | "would" | "shall" | "should" | "can" | "could" | "may"
        | "i" | "we" | "you" | "he" | "she" | "they" | "it" | "my" | "our" | "your" | "his" | "her"
        | "their" | "its" | "this" | "that" | "these" | "those" | "which" | "who" | "what" | "when"
        | "where" | "why" | "how" | "all" | "any" | "both" | "each" | "few" | "more" | "most"
        | "other" | "some" | "such" | "no" | "nor" | "not" | "only" | "own" | "same" | "so" | "than"
        | "too" | "very" | "just" | "also" | "well" | "like" | "as" | "if"
        | "experience" | "experienced" | "skills" | "skill" | "technologies" | "technology" | "stack"
        | "developer" | "develop" | "developed" | "developing" | "development" | "engineer" | "engineering"
        | "senior" | "junior" | "lead" | "principal" | "staff" | "architect" | "years" | "year"
        | "project" | "projects" | "work" | "worked" | "working" | "built" | "build" | "building"
        | "team" | "teams" | "software" | "system" | "systems" | "solution" | "solutions"
        | "application" | "applications" | "service" | "services" | "platform" | "platforms"
        | "tool" | "tools" | "code" | "data" | "knowledge" | "proficient" | "expert" | "expertise"
        | "high" | "throughput" | "distributed" | "using" | "used" | "uses" | "manage" | "managed"
        | "orchestration" | "orchestrator" | "analytics" | "pipeline" | "pipelines" | "workflow" | "workflows"
        | "management" | "state" | "cluster" | "clusters"
        | "і" | "та" | "чи" | "або" | "не" | "ні" | "в" | "у" | "на" | "до" | "по" | "за" | "з"
        | "зі" | "із" | "для" | "про" | "при" | "через" | "від" | "як" | "що" | "це" | "той" | "цей"
        | "вона" | "він" | "вони" | "ми" | "ви" | "я" | "ти" | "досвід" | "розробка" | "інженер"
        | "робота" | "команда" | "роки" | "рік"
        | "и" | "или" | "с" | "со" | "из" | "к" | "о"
        | "об" | "от" | "как" | "что" | "это" | "этот" | "они" | "он" | "она"
        | "опыт" | "работа" | "лет" => true,
        _ => false,
    }
}

fn clean_candidate(s: &str) -> &str {
    s.trim_matches(|c: char| {
        c.is_whitespace()
            || c == '*'
            || c == '•'
            || c == '-'
            || c == '–'
            || c == '—'
            || c == '#'
            || c == ','
            || c == ';'
            || c == ':'
            || c == '!'
            || c == '?'
            || c == '"'
            || c == '\''
            || c == '('
            || c == ')'
            || c == '['
            || c == ']'
            || c == '{'
            || c == '}'
            || c == '.'
    })
}

fn normalize_extracted_term(term: &str) -> String {
    let words: Vec<&str> = term.split_whitespace().collect();
    if words.len() == 2 {
        if is_stopword(words[1]) {
            return words[0].to_string();
        }
        if is_stopword(words[0]) {
            return words[1].to_string();
        }
    }
    term.to_string()
}

fn is_valid_keyterm(term: &str) -> bool {
    if term.len() < 2 || term.len() > 35 {
        return false;
    }
    let words: Vec<&str> = term.split_whitespace().collect();
    if words.is_empty() || words.len() > 2 {
        return false;
    }
    let non_stopwords = words.iter().filter(|w| !is_stopword(w)).count();
    if non_stopwords == 0 {
        return false;
    }
    if !term.chars().any(|c| c.is_alphabetic()) {
        return false;
    }
    true
}

fn extract_tech_terms_from_chunk(chunk: &str, candidates: &mut Vec<String>) {
    let cleaned = clean_candidate(chunk);
    let norm = normalize_extracted_term(cleaned);
    let words: Vec<&str> = norm.split_whitespace().collect();
    if words.len() >= 1 && words.len() <= 2 {
        if is_valid_keyterm(&norm) {
            candidates.push(norm);
            return;
        }
    }
    for word in cleaned.split_whitespace() {
        let w = clean_candidate(word);
        if is_valid_keyterm(w) {
            let is_proper = w.chars().next().map_or(false, |c| c.is_uppercase())
                || w.contains('.')
                || w.contains('+')
                || w.contains('#')
                || w.contains('/');
            if is_proper {
                candidates.push(w.to_string());
            }
        }
    }
}

/// Extracts up to 10 unique technical terms / framework names / proper nouns
/// from the candidate's profile stack or CV string, merging ahead of TECH_KEYTERMS,
/// and strictly capping at 24 terms maximum (< 100 tokens total).
pub fn build_dynamic_keyterms(custom_stack_or_cv: Option<&str>) -> Vec<String> {
    let mut custom_candidates = Vec::new();

    if let Some(raw) = custom_stack_or_cv {
        for chunk in raw.split(|c| c == ',' || c == ';' || c == '\n' || c == '\r' || c == '|' || c == '•') {
            let trimmed = chunk.trim();
            if !trimmed.is_empty() {
                extract_tech_terms_from_chunk(trimmed, &mut custom_candidates);
            }
        }
    }

    let mut unique_custom = Vec::new();
    let mut seen_lower = HashSet::new();

    for term in custom_candidates {
        let lower = term.to_lowercase();
        if !seen_lower.contains(&lower) && unique_custom.len() < 10 {
            seen_lower.insert(lower);
            unique_custom.push(term);
        }
    }

    let mut result = Vec::new();
    let mut merged_seen = HashSet::new();
    let mut total_tokens: usize = 0;

    for term in unique_custom {
        let lower = term.to_lowercase();
        if !merged_seen.contains(&lower) && result.len() < 24 {
            let tokens_in_term = term
                .split(|c: char| c.is_whitespace() || c == '_' || c == '-' || c == '.' || c == '/')
                .filter(|s| !s.is_empty())
                .count()
                .max(1);
            if total_tokens + tokens_in_term <= 95 {
                merged_seen.insert(lower);
                result.push(term);
                total_tokens += tokens_in_term;
            }
        }
    }

    for core_term in TECH_KEYTERMS {
        let lower = core_term.to_lowercase();
        if !merged_seen.contains(&lower) && result.len() < 24 {
            let tokens_in_term = core_term
                .split(|c: char| c.is_whitespace() || c == '_' || c == '-' || c == '.' || c == '/')
                .filter(|s| !s.is_empty())
                .count()
                .max(1);
            if total_tokens + tokens_in_term <= 95 {
                merged_seen.insert(lower);
                result.push(core_term.to_string());
                total_tokens += tokens_in_term;
            }
        }
    }

    result
}

/// Builds a fully-formed Deepgram WebSocket streaming URL with technical keyterms boosted.
pub fn build_deepgram_url(base_model: Option<&str>, language: Option<&str>) -> String {
    build_deepgram_url_with_keyterms(base_model, language, None)
}

/// Builds a fully-formed Deepgram WebSocket streaming URL with dynamic CV-aware keyterms boosted.
pub fn build_deepgram_url_with_keyterms(
    base_model: Option<&str>,
    language: Option<&str>,
    custom_stack: Option<&str>,
) -> String {
    let model = base_model.unwrap_or("nova-3");
    let target_lang = match language {
        Some("uk") | Some("ua") => "uk",
        Some("ru") => "ru",
        Some("en") => "en",
        Some("multi") | Some("auto") | None => {
            if model.starts_with("nova-2") {
                // Nova-2 does not support language=multi (returns HTTP 400 Bad Request).
                // Fallback to Ukrainian locale for Nova-2.
                "uk"
            } else {
                "multi"
            }
        }
        Some(other) => other,
    };
    let mut url = format!(
        "wss://api.deepgram.com/v1/listen?model={}&language={}&encoding=linear16&sample_rate=16000&channels=1&interim_results=true&punctuate=true&smart_format=true&endpointing=350&vad_events=true&utterance_end_ms=1000",
        model, target_lang
    );
    let key_param = if model.starts_with("nova-3") {
        "keyterm"
    } else {
        "keywords"
    };
    let keyterms = build_dynamic_keyterms(custom_stack);
    for term in keyterms {
        let encoded: String = url::form_urlencoded::byte_serialize(term.as_bytes()).collect();
        url.push_str(&format!("&{}={}", key_param, encoded));
    }
    url
}

/// Derives the appropriate fallback Deepgram URL if nova-3 is rejected (e.g. tier 400/403).
/// If `url` had `language=multi`, nova-2 does not support `multi`, so it falls back to `nova-2&language=uk`.
pub fn get_fallback_url(current_url: &str) -> String {
    if current_url.contains("model=nova-3") {
        let lang = if current_url.contains("language=en") {
            "en"
        } else if current_url.contains("language=ru") {
            "ru"
        } else {
            // "multi", "uk", or anything else -> nova-2 with "uk"
            "uk"
        };
        build_deepgram_url(Some("nova-2"), Some(lang))
    } else if current_url.contains("model=nova-2") && (current_url.contains("keywords=") || current_url.contains("keyterm=")) {
        // Fallback Step 2: Strip keywords/keyterms if custom parameter caused HTTP 400
        let lang = if current_url.contains("language=en") {
            "en"
        } else if current_url.contains("language=ru") {
            "ru"
        } else {
            "uk"
        };
        format!(
            "wss://api.deepgram.com/v1/listen?model=nova-2&language={}&encoding=linear16&sample_rate=16000&channels=1&interim_results=true&punctuate=true&smart_format=true&endpointing=350&vad_events=true",
            lang
        )
    } else if current_url.contains("model=nova-2") {
        // Fallback Step 3: Minimal nova-3 without keywords
        "wss://api.deepgram.com/v1/listen?model=nova-3&language=multi&encoding=linear16&sample_rate=16000&channels=1&interim_results=true&punctuate=true&smart_format=true&endpointing=350&vad_events=true".to_string()
    } else {
        // Already minimal, avoid infinite retry oscillation
        current_url.to_string()
    }
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

const CONNECT_TIMEOUT: Duration = Duration::from_secs(8);

async fn connect_async_with_timeout(
    request: tokio_tungstenite::tungstenite::handshake::client::Request,
) -> Result<(WsStream, tokio_tungstenite::tungstenite::handshake::client::Response), tokio_tungstenite::tungstenite::Error> {
    match tokio::time::timeout(CONNECT_TIMEOUT, tokio_tungstenite::connect_async(request)).await {
        Ok(res) => res,
        Err(_) => Err(tokio_tungstenite::tungstenite::Error::Io(std::io::Error::new(
            std::io::ErrorKind::TimedOut,
            "Deepgram WebSocket connection timed out after 8s",
        ))),
    }
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
    let mut last_incoming_frame = tokio::time::Instant::now();
    let mut audio_bytes_sent_since_read: usize = 0;
    const HUNG_SOCKET_TIMEOUT: Duration = Duration::from_secs(12);

    let end = loop {
        let keepalive_deadline = last_write + KEEPALIVE_INTERVAL;
        tokio::select! {
            chunk = audio_rx.recv() => {
                match chunk {
                    None => break SessionEnd::Stopped,
                    Some(pcm) if pcm.is_empty() => {}
                    Some(pcm) => {
                        let len = pcm.len();
                        if let Err(e) = ws_write.send(Message::Binary(pcm)).await {
                            tracing::error!(target: "ghostboard::stt", speaker = %speaker, "Error sending PCM audio chunk: {}", e);
                            break SessionEnd::Dropped;
                        }
                        audio_bytes_sent_since_read += len;
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
            _ = tokio::time::sleep(Duration::from_millis(1000)) => {
                // If audio data has been actively sent but no frame received for >12s, socket is hung
                if audio_bytes_sent_since_read > 0 && last_incoming_frame.elapsed() >= HUNG_SOCKET_TIMEOUT {
                    tracing::warn!(
                        target: "ghostboard::stt",
                        speaker = %speaker,
                        "Deepgram socket hung watchdog triggered: audio sent without response for >12s"
                    );
                    break SessionEnd::Dropped;
                }
            }
            msg = ws_read.next() => {
                last_incoming_frame = tokio::time::Instant::now();
                audio_bytes_sent_since_read = 0;
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
    // Send CloseStream before terminating WebSocket connection
    let _ = ws_write.send(Message::Text(r#"{"type":"CloseStream"}"#.to_string())).await;
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
        let mut url = match endpoint_url {
            Some(u) => u.to_string(),
            None => BASE_DEEPGRAM_URL.to_string(),
        };
        let api_key = api_key.to_string();

        let request = build_request(&api_key, &url)?;
        let initial_ws = match connect_async_with_timeout(request).await {
            Ok((ws, _)) => Some(ws),
            Err(tokio_tungstenite::tungstenite::Error::Http(resp)) => {
                let status = resp.status();
                let body_str = resp
                    .body()
                    .as_ref()
                    .map(|b| String::from_utf8_lossy(b).to_string())
                    .unwrap_or_default();
                tracing::warn!(
                    target: "ghostboard::stt",
                    speaker = %speaker,
                    status = %status,
                    body = %body_str,
                    "Deepgram HTTP handshake failed"
                );
                if (status.as_u16() == 400 || status.as_u16() == 403) && url.contains("model=nova-3") {
                    let fallback_url = get_fallback_url(&url);
                    if fallback_url != url {
                        tracing::info!(
                            target: "ghostboard::stt",
                            speaker = %speaker,
                            fallback_url = %fallback_url,
                            "Deepgram nova-3 rejected (HTTP {}), falling back to nova-2",
                            status
                        );
                        url = fallback_url;
                        let fallback_req = build_request(&api_key, &url)?;
                        match connect_async_with_timeout(fallback_req).await {
                            Ok((ws, _)) => Some(ws),
                            Err(e) => {
                                tracing::warn!(
                                    target: "ghostboard::stt",
                                    speaker = %speaker,
                                    "Deepgram nova-2 fallback failed ({}), supervisor will retry with backoff",
                                    e
                                );
                                None
                            }
                        }
                    } else {
                        None
                    }
                } else if matches!(status.as_u16(), 401 | 402 | 403) {
                    return Err(format!(
                        "Deepgram credentials rejected: HTTP {} - {}",
                        status, body_str
                    ));
                } else {
                    None
                }
            }
            Err(e) => {
                tracing::warn!(
                    target: "ghostboard::stt",
                    speaker = %speaker,
                    "Initial Deepgram connection unavailable ({}), supervisor will retry with backoff",
                    e
                );
                None
            }
        };

        let has_initial_ws = initial_ws.is_some();
        let (audio_tx, mut audio_rx) = mpsc::channel::<Vec<u8>>(100);
        let is_connected = Arc::new(AtomicBool::new(has_initial_ws));
        let is_conn = is_connected.clone();
        let speaker_tag = speaker.to_string();

        let emit = move |ev: HudEvent| {
            if let Some(tx) = &status_tx {
                let _ = tx.send(ev);
            }
        };

        tokio::spawn(async move {
            let mut next_ws = initial_ws;
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
                        match connect_async_with_timeout(request).await {
                            Ok((ws, _)) => break ws,
                            Err(tokio_tungstenite::tungstenite::Error::Http(resp)) => {
                                let status = resp.status();
                                let body_str = resp
                                    .body()
                                    .as_ref()
                                    .map(|b| String::from_utf8_lossy(b).to_string())
                                    .unwrap_or_default();
                                tracing::warn!(
                                    target: "ghostboard::stt",
                                    speaker = %speaker_tag,
                                    status = %status,
                                    body = %body_str,
                                    "Deepgram HTTP error during reconnect"
                                );
                                if (status.as_u16() == 400 || status.as_u16() == 403) && url.contains("model=nova-3") {
                                    let fallback_url = get_fallback_url(&url);
                                    if fallback_url != url {
                                        url = fallback_url;
                                        if let Ok(fallback_req) = build_request(&api_key, &url) {
                                            if let Ok((ws, _)) = connect_async_with_timeout(fallback_req).await {
                                                break ws;
                                            }
                                        }
                                    }
                                }
                                if is_fatal_connect_error(&tokio_tungstenite::tungstenite::Error::Http(resp)) {
                                    emit(status_event(
                                        &speaker_tag,
                                        "failed",
                                        attempt,
                                        0,
                                        Some(format!("Deepgram rejected credentials: HTTP {} {}", status, body_str)),
                                    ));
                                    break 'supervisor;
                                }
                            }
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
        assert!(url.contains("endpointing=350"));
        assert!(url.contains("vad_events=true"));
        assert!(url.contains("utterance_end_ms=1000"));
        assert!(url.contains("encoding=linear16"));
        assert!(url.contains("sample_rate=16000"));
        assert!(url.contains("channels=1"));
        assert!(url.contains("language=uk"));

        // Verify technical keyterms injected (max 20)
        assert!(TECH_KEYTERMS.len() <= 20, "Keyterms must stay <= 20, found {}", TECH_KEYTERMS.len());
        assert!(url.contains("keyterm=Kubernetes"));
        assert!(url.contains("keyterm=Kafka"));
        assert!(url.contains("keyterm=PostgreSQL"));
        assert!(url.contains("keyterm=JWT"));
        assert!(url.contains("keyterm=Redis"));
    }

    #[test]
    fn test_build_deepgram_url_multilingual_and_fallbacks() {
        // Auto / Multi defaults to nova-3 & language=multi
        let multi_url = build_deepgram_url(None, None);
        assert!(multi_url.contains("model=nova-3"));
        assert!(multi_url.contains("language=multi"));

        let auto_url = build_deepgram_url(Some("nova-3"), Some("auto"));
        assert!(auto_url.contains("language=multi"));

        // Explicit languages
        let ru_url = build_deepgram_url(Some("nova-3"), Some("ru"));
        assert!(ru_url.contains("language=ru"));

        let en_url = build_deepgram_url(Some("nova-3"), Some("en"));
        assert!(en_url.contains("language=en"));

        // Nova-2 fallback with multi must select uk (since nova-2 rejects multi)
        let n2_multi = build_deepgram_url(Some("nova-2"), Some("multi"));
        assert!(n2_multi.contains("model=nova-2"));
        assert!(n2_multi.contains("language=uk"));
        assert!(n2_multi.contains("keywords="));

        // get_fallback_url test
        let fb_from_multi = get_fallback_url(&multi_url);
        assert!(fb_from_multi.contains("model=nova-2"));
        assert!(fb_from_multi.contains("language=uk"));

        let fb_from_ru = get_fallback_url(&ru_url);
        assert!(fb_from_ru.contains("model=nova-2"));
        assert!(fb_from_ru.contains("language=ru"));

        let fb_from_en = get_fallback_url(&en_url);
        assert!(fb_from_en.contains("model=nova-2"));
        assert!(fb_from_en.contains("language=en"));
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

    #[tokio::test]
    async fn test_deepgram_supervisor_handles_offline_initial_connect() {
        let (tx, _rx) = mpsc::channel(10);
        let unreachable_url = "wss://127.0.0.1:59999/v1/listen?encoding=linear16&sample_rate=16000&channels=1";
        let client_res = DeepgramClient::connect_supervised(
            "dummy_key_1234567890",
            Some(unreachable_url),
            "interlocutor",
            tx,
            None,
        ).await;

        assert!(client_res.is_ok(), "Supervisor should spawn and not return immediate fatal error when offline");
        let client = client_res.unwrap();
        assert!(!client.is_connected());
    }

    #[test]
    fn test_build_dynamic_keyterms_custom_stack_and_cap() {
        let custom = "ClickHouse, Temporal, Zustand, ScyllaDB";
        let terms = build_dynamic_keyterms(Some(custom));
        assert!(terms.len() <= 24);
        assert_eq!(terms[0], "ClickHouse");
        assert_eq!(terms[1], "Temporal");
        assert_eq!(terms[2], "Zustand");
        assert_eq!(terms[3], "ScyllaDB");
        assert!(terms.contains(&"PostgreSQL".to_string()));
    }

    #[test]
    fn test_build_dynamic_keyterms_deduplication() {
        let custom = "Python, ClickHouse, Docker, Temporal";
        let terms = build_dynamic_keyterms(Some(custom));
        assert!(terms.len() <= 24);
        let python_count = terms.iter().filter(|t| t.to_lowercase() == "python").count();
        assert_eq!(python_count, 1);
    }
}
