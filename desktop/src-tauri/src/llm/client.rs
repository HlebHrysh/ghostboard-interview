use reqwest::header::{HeaderMap, HeaderValue, AUTHORIZATION, CONTENT_TYPE};
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};
use std::sync::Mutex as StdMutex;
use std::time::Duration;
use tokio_util::sync::CancellationToken;

pub const GEMINI_FLASH_MODELS: &[&str] = &[
    "gemini-3.8-flash",
    "gemini-2.5-flash",
    "gemini-3.5-flash-lite",
    "gemini-3.5-flash",
    "gemini-3-flash-preview",
    "gemini-flash-lite-latest",
    "gemini-3.1-flash-lite",
    "gemini-2.0-flash",
    "gemini-flash-latest",
];

pub const HEDGE_STAGGER_MS: u64 = 550;

static CIRCUIT_BREAKER: std::sync::OnceLock<StdMutex<HashMap<String, std::time::Instant>>> =
    std::sync::OnceLock::new();

static MODELS_REJECTING_THINKING: std::sync::OnceLock<StdMutex<HashSet<String>>> =
    std::sync::OnceLock::new();

pub fn is_model_rejecting_thinking(model: &str) -> bool {
    let set = MODELS_REJECTING_THINKING.get_or_init(|| StdMutex::new(HashSet::new()));
    if let Ok(guard) = set.lock() {
        return guard.contains(model);
    }
    false
}

pub fn mark_model_rejecting_thinking(model: &str) {
    let set = MODELS_REJECTING_THINKING.get_or_init(|| StdMutex::new(HashSet::new()));
    if let Ok(mut guard) = set.lock() {
        guard.insert(model.to_string());
    }
}

pub fn clear_models_rejecting_thinking() {
    let set = MODELS_REJECTING_THINKING.get_or_init(|| StdMutex::new(HashSet::new()));
    if let Ok(mut guard) = set.lock() {
        guard.clear();
    }
}

/// Returns whether a given LLM model is currently in temporary error cooldown (e.g. 404, 429, 503).
pub fn is_model_cooling_down(model: &str) -> bool {
    let cb = CIRCUIT_BREAKER.get_or_init(|| StdMutex::new(HashMap::new()));
    if let Ok(guard) = cb.lock() {
        if let Some(cooldown_until) = guard.get(model) {
            if std::time::Instant::now() < *cooldown_until {
                return true;
            }
        }
    }
    false
}

/// Marks a model as cooling down for the specified duration.
pub fn mark_model_cooldown(model: &str, duration: Duration) {
    let cb = CIRCUIT_BREAKER.get_or_init(|| StdMutex::new(HashMap::new()));
    if let Ok(mut guard) = cb.lock() {
        guard.insert(model.to_string(), std::time::Instant::now() + duration);
    }
}

/// Clears cooldown status for a model upon successful connection.
pub fn clear_model_cooldown(model: &str) {
    let cb = CIRCUIT_BREAKER.get_or_init(|| StdMutex::new(HashMap::new()));
    if let Ok(mut guard) = cb.lock() {
        guard.remove(model);
    }
}

/// Clears cooldown status for all models (deadlock breaker).
pub fn clear_all_model_cooldowns() {
    let cb = CIRCUIT_BREAKER.get_or_init(|| StdMutex::new(HashMap::new()));
    if let Ok(mut guard) = cb.lock() {
        guard.clear();
    }
}

/// Resolves available models from the cascade, applying Never-Dead Cooldown Bypass
/// if all models are marked on cooldown simultaneously.
pub fn resolve_available_models(candidates: &[String]) -> Vec<String> {
    let available: Vec<String> = candidates
        .iter()
        .filter(|m| !is_model_cooling_down(m))
        .cloned()
        .collect();
    if available.is_empty() && !candidates.is_empty() {
        tracing::warn!(
            target: "ghostboard::llm",
            "All models on cooldown, clearing cooldown state (Never-Dead Cooldown Bypass)"
        );
        clear_all_model_cooldowns();
        return candidates.to_vec();
    }
    available
}

/// Builds request payload for Google Gemini models, selectively configuring thinkingConfig.
pub fn build_gemini_request_body(
    system_prompt: &str,
    user_prompt: &str,
    model: &str,
    include_thinking: bool,
) -> serde_json::Value {
    let combined_prompt = if system_prompt.is_empty() {
        user_prompt.to_string()
    } else {
        format!("{}\n\n{}", system_prompt, user_prompt)
    };

    let mut gen_config = serde_json::json!({
        "temperature": 0.3,
        "maxOutputTokens": 850
    });

    // Include thinkingConfig: { thinkingBudget: 0 } on active low-latency flash models when requested
    if include_thinking && !model.contains("flash-lite") && !is_model_rejecting_thinking(model) {
        gen_config["thinkingConfig"] = serde_json::json!({ "thinkingBudget": 0 });
    }

    serde_json::json!({
        "contents": [
            {
                "role": "user",
                "parts": [
                    { "text": combined_prompt }
                ]
            }
        ],
        "generationConfig": gen_config
    })
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum LlmProviderType {
    Groq,
    OpenAI,
    Anthropic,
    Gemini,
}

#[derive(Debug, Clone)]
pub struct LlmConfig {
    pub provider: LlmProviderType,
    pub api_key: String,
    pub model: String,
    pub endpoint_url: Option<String>,
}

impl Default for LlmConfig {
    fn default() -> Self {
        Self {
            provider: LlmProviderType::Groq,
            api_key: String::new(),
            model: "llama-3.3-70b-versatile".to_string(),
            endpoint_url: None,
        }
    }
}

#[derive(Debug, Clone, PartialEq)]
pub enum LlmStreamOutcome {
    Completed { full_text: String, token_count: usize },
    Cancelled,
    Failed(String),
}

/// Parses an incoming SSE `data:` payload according to provider schema.
pub fn parse_sse_data_chunk(provider: LlmProviderType, data_str: &str) -> Option<String> {
    let trimmed = data_str.trim();
    if trimmed.is_empty() || trimmed == "[DONE]" {
        return None;
    }

    match provider {
        LlmProviderType::Groq | LlmProviderType::OpenAI | LlmProviderType::Gemini => {
            #[derive(Deserialize)]
            struct ChatDelta {
                content: Option<String>,
            }
            #[derive(Deserialize)]
            struct ChatChoice {
                delta: Option<ChatDelta>,
                finish_reason: Option<String>,
            }
            #[derive(Deserialize)]
            struct ChatCompletionChunk {
                choices: Option<Vec<ChatChoice>>,
            }

            if let Ok(parsed) = serde_json::from_str::<ChatCompletionChunk>(trimmed) {
                if let Some(choices) = parsed.choices {
                    if let Some(choice) = choices.first() {
                        let mut text_out = choice.delta.as_ref().and_then(|d| d.content.clone()).unwrap_or_default();
                        if let Some(ref fr) = choice.finish_reason {
                            if fr == "length" {
                                text_out.push_str("\n\n[Відповідь досягла ліміту токенів]");
                            }
                        }
                        if !text_out.is_empty() {
                            return Some(text_out);
                        }
                    }
                }
            }

            // Fallback for native Gemini streamGenerateContent candidate schema
            #[derive(Deserialize)]
            struct GeminiPart {
                text: Option<String>,
                thought: Option<bool>,
            }
            #[derive(Deserialize)]
            struct GeminiContent {
                parts: Option<Vec<GeminiPart>>,
            }
            #[derive(Deserialize)]
            struct GeminiCandidate {
                content: Option<GeminiContent>,
                #[serde(rename = "finishReason")]
                finish_reason: Option<String>,
            }
            #[derive(Deserialize)]
            struct GeminiChunk {
                candidates: Option<Vec<GeminiCandidate>>,
            }

            if let Ok(parsed) = serde_json::from_str::<GeminiChunk>(trimmed) {
                if let Some(candidates) = parsed.candidates {
                    if let Some(first_cand) = candidates.first() {
                        let mut text_out = String::new();
                        if let Some(content) = &first_cand.content {
                            if let Some(parts) = &content.parts {
                                for part in parts {
                                    if part.thought.unwrap_or(false) {
                                        continue;
                                    }
                                    if let Some(text) = &part.text {
                                        text_out.push_str(text);
                                    }
                                }
                            }
                        }
                        if let Some(ref fr) = first_cand.finish_reason {
                            if fr == "MAX_TOKENS" || fr == "LENGTH" {
                                text_out.push_str("\n\n[Відповідь досягла ліміту токенів]");
                            }
                        }
                        if !text_out.is_empty() {
                            return Some(text_out);
                        }
                    }
                }
            }

            None
        }
        LlmProviderType::Anthropic => {
            #[derive(Deserialize)]
            struct AnthropicDelta {
                text: Option<String>,
            }
            #[derive(Deserialize)]
            struct AnthropicStreamEvent {
                delta: Option<AnthropicDelta>,
            }

            let parsed: AnthropicStreamEvent = serde_json::from_str(trimmed).ok()?;
            parsed.delta.and_then(|d| d.text)
        }
    }
}

static SHARED_LLM_CLIENT: std::sync::OnceLock<reqwest::Client> = std::sync::OnceLock::new();

pub fn get_shared_llm_client() -> reqwest::Client {
    SHARED_LLM_CLIENT
        .get_or_init(|| {
            reqwest::Client::builder()
                .pool_idle_timeout(Duration::from_secs(90))
                .tcp_nodelay(true)
                .connect_timeout(Duration::from_secs(8))
                .build()
                .unwrap_or_else(|_| reqwest::Client::new())
        })
        .clone()
}

/// Speculative HTTP/2 SSE streaming client with instant CancellationToken cancellation support.
pub struct SpeculativeLlmClient {
    client: reqwest::Client,
}

impl Default for SpeculativeLlmClient {
    fn default() -> Self {
        Self::new()
    }
}

/// Helper to send request to Google Gemini with automatic thinkingConfig retry on HTTP 400
async fn send_gemini_request(
    client: &reqwest::Client,
    model: &str,
    api_key: &str,
    system_prompt: &str,
    user_prompt: &str,
    include_thinking: bool,
    cancellation_token: &CancellationToken,
) -> Result<reqwest::Response, String> {
    let url = format!(
        "https://generativelanguage.googleapis.com/v1beta/models/{}:streamGenerateContent?alt=sse",
        model
    );
    let mut headers = HeaderMap::new();
    headers.insert(CONTENT_TYPE, HeaderValue::from_static("application/json"));
    if let Ok(hv) = HeaderValue::from_str(api_key.trim()) {
        headers.insert("x-goog-api-key", hv);
    }
    let body_with_thinking = build_gemini_request_body(system_prompt, user_prompt, model, include_thinking);

    let req_future = client.post(&url).headers(headers.clone()).json(&body_with_thinking).send();
    let resp = tokio::select! {
        _ = cancellation_token.cancelled() => return Err("Cancelled".to_string()),
        res = tokio::time::timeout(Duration::from_millis(4500), req_future) => match res {
            Ok(Ok(r)) => r,
            Ok(Err(e)) => return Err(e.without_url().to_string()),
            Err(_) => {
                mark_model_cooldown(model, Duration::from_secs(20));
                return Err(format!("Model {} timed out after 4500ms", model));
            }
        }
    };

    let status = resp.status();
    if status.is_success() {
        clear_model_cooldown(model);
        return Ok(resp);
    }

    if status.as_u16() == 400 {
        let err_text = resp.text().await.unwrap_or_default();
        let is_dead_key = err_text.contains("API_KEY_INVALID") || err_text.contains("API key not valid");
        if include_thinking && !is_dead_key {
            tracing::info!(
                target: "ghostboard::llm",
                model = %model,
                "Retrying Gemini immediately (0ms) without thinkingConfig on HTTP 400 without cooldown"
            );
            mark_model_rejecting_thinking(model);
            let body_without_thinking = build_gemini_request_body(system_prompt, user_prompt, model, false);
            let retry_req = client.post(&url).headers(headers).json(&body_without_thinking).send();
            let retry_res = tokio::select! {
                _ = cancellation_token.cancelled() => return Err("Cancelled".to_string()),
                res = tokio::time::timeout(Duration::from_millis(5000), retry_req) => res
            };
            if let Ok(Ok(retry_resp)) = retry_res {
                let retry_status = retry_resp.status();
                if retry_status.is_success() {
                    clear_model_cooldown(model);
                    return Ok(retry_resp);
                } else if retry_status.as_u16() == 429 || retry_status.as_u16() == 503 {
                    mark_model_cooldown(model, Duration::from_secs(8));
                    return Err(format!("Model {} HTTP {}", model, retry_status));
                } else if retry_status.as_u16() == 404 {
                    mark_model_cooldown(model, Duration::from_secs(120));
                    return Err(format!("Model {} HTTP 404 Not Found", model));
                }
            }
        }
        return Err(format!("Model {} HTTP 400: {}", model, err_text));
    } else if status.as_u16() == 429 || status.as_u16() == 503 {
        mark_model_cooldown(model, Duration::from_secs(8));
        return Err(format!("Model {} HTTP {}", model, status));
    } else if status.as_u16() == 404 {
        mark_model_cooldown(model, Duration::from_secs(120));
        return Err(format!("Model {} HTTP 404 Not Found", model));
    } else {
        let err_text = resp.text().await.unwrap_or_default();
        return Err(format!("Model {} HTTP {}: {}", model, status, err_text));
    }
}

/// Helper to send request to Groq (Llama 3.3 70B)
async fn send_groq_request(
    client: &reqwest::Client,
    api_key: &str,
    system_prompt: &str,
    user_prompt: &str,
    cancellation_token: &CancellationToken,
) -> Result<reqwest::Response, String> {
    let groq_url = "https://api.groq.com/openai/v1/chat/completions";
    let mut groq_headers = HeaderMap::new();
    if let Ok(auth_val) = HeaderValue::from_str(&format!("Bearer {}", api_key.trim())) {
        groq_headers.insert(AUTHORIZATION, auth_val);
    }
    groq_headers.insert(CONTENT_TYPE, HeaderValue::from_static("application/json"));
    let groq_body = serde_json::json!({
        "model": "llama-3.3-70b-versatile",
        "messages": [
            { "role": "system", "content": system_prompt },
            { "role": "user", "content": user_prompt }
        ],
        "stream": true,
        "temperature": 0.3,
        "max_tokens": 850
    });

    let groq_future = client.post(groq_url).headers(groq_headers).json(&groq_body).send();
    let resp = tokio::select! {
        _ = cancellation_token.cancelled() => return Err("Cancelled".to_string()),
        res = tokio::time::timeout(Duration::from_millis(12000), groq_future) => match res {
            Ok(Ok(r)) => r,
            Ok(Err(e)) => return Err(e.without_url().to_string()),
            Err(_) => return Err("Groq timed out after 12000ms".to_string()),
        }
    };

    if resp.status().is_success() {
        Ok(resp)
    } else {
        let status = resp.status();
        let err_text = resp.text().await.unwrap_or_default();
        Err(format!("Groq HTTP {}: {}", status, err_text))
    }
}

struct ContenderFirstChunk {
    provider: LlmProviderType,
    model: String,
    first_deltas: Vec<String>,
    line_buffer: String,
    response: reqwest::Response,
}

/// Reads from an active SSE response stream until the first valid text chunk is yielded.
async fn await_first_valid_chunk(
    provider: LlmProviderType,
    model: String,
    mut response: reqwest::Response,
    cancellation_token: &CancellationToken,
) -> Result<ContenderFirstChunk, String> {
    let mut line_buffer = String::new();
    let mut first_deltas = Vec::new();

    loop {
        let chunk_opt = tokio::select! {
            _ = cancellation_token.cancelled() => return Err("Cancelled".to_string()),
            res = tokio::time::timeout(Duration::from_secs(4), response.chunk()) => match res {
                Ok(Ok(c)) => c,
                Ok(Err(e)) => return Err(format!("SSE chunk error on {}: {}", model, e)),
                Err(_) => return Err(format!("SSE first chunk timed out on {}", model)),
            }
        };

        let chunk = match chunk_opt {
            Some(c) => c,
            None => break,
        };

        let text = String::from_utf8_lossy(&chunk);
        line_buffer.push_str(&text);

        while let Some(pos) = line_buffer.find('\n') {
            let line = line_buffer[..pos].trim().to_string();
            line_buffer = line_buffer[pos + 1..].to_string();
            if line.is_empty() {
                continue;
            }
            let data_str = if let Some(stripped) = line.strip_prefix("data:") {
                stripped.trim()
            } else {
                line.as_str()
            };
            if data_str == "[DONE]" || data_str == "<<<END>>>" {
                continue;
            }
            if let Some(delta) = parse_sse_data_chunk(provider, data_str) {
                if !delta.is_empty() {
                    first_deltas.push(delta);
                }
            }
        }

        if !first_deltas.is_empty() {
            clear_model_cooldown(&model);
            return Ok(ContenderFirstChunk {
                provider,
                model,
                first_deltas,
                line_buffer,
                response,
            });
        }
    }

    let remaining = line_buffer.trim().to_string();
    if !remaining.is_empty() {
        let data_str = if let Some(stripped) = remaining.strip_prefix("data:") {
            stripped.trim()
        } else {
            remaining.as_str()
        };
        if data_str != "[DONE]" && data_str != "<<<END>>>" {
            if let Some(delta) = parse_sse_data_chunk(provider, data_str) {
                if !delta.is_empty() {
                    line_buffer.clear();
                    first_deltas.push(delta);
                    clear_model_cooldown(&model);
                    return Ok(ContenderFirstChunk {
                        provider,
                        model,
                        first_deltas,
                        line_buffer,
                        response,
                    });
                }
            }
        }
    }

    Err(format!("Model {} stream ended before yielding any valid text chunk", model))
}

impl SpeculativeLlmClient {
    pub fn new() -> Self {
        Self {
            client: get_shared_llm_client(),
        }
    }

    /// Initiates speculative streaming generation for a detected question.
    ///
    /// The stream runs in real-time, calling `on_chunk(token)` for each incremental token delta.
    /// If `cancellation_token` is cancelled (e.g. because speaker resumes talking within 1.5s),
    /// the HTTP connection is immediately dropped, terminating token waste.
    pub async fn stream_answer<F>(
        &self,
        config: &LlmConfig,
        system_prompt: &str,
        user_prompt: &str,
        cancellation_token: CancellationToken,
        mut on_chunk: F,
    ) -> Result<LlmStreamOutcome, String>
    where
        F: FnMut(String) + Send + 'static,
    {
        if cancellation_token.is_cancelled() {
            return Ok(LlmStreamOutcome::Cancelled);
        }

        let mut active_provider = config.provider;
        let mut initial_deltas: Vec<String> = Vec::new();
        let mut initial_line_buffer = String::new();

        // Send HTTP request with cancellation protection
        let mut response = if config.provider == LlmProviderType::Gemini {
            if cancellation_token.is_cancelled() {
                return Ok(LlmStreamOutcome::Cancelled);
            }

            let mut gemini_models: Vec<String> = Vec::new();
            for candidate in GEMINI_FLASH_MODELS {
                if !gemini_models.iter().any(|m| m == candidate) {
                    gemini_models.push((*candidate).to_string());
                }
            }
            if !config.model.trim().is_empty()
                && config.model.starts_with("gemini")
                && config.model.trim() != "gemini-3.5-flash"
                && !gemini_models.iter().any(|m| m == config.model.trim())
            {
                gemini_models.insert(0, config.model.trim().to_string());
            }

            // Never-Dead Cooldown Bypass: if every model is on cooldown, automatically clear cooldown state
            let available_models = resolve_available_models(&gemini_models);

            enum ContenderMsg {
                FirstChunk(ContenderFirstChunk),
                Failed {
                    model: String,
                    error: String,
                },
            }

            let (tx, mut rx) = tokio::sync::mpsc::channel::<ContenderMsg>(16);
            let race_cancel = cancellation_token.child_token();
            let mut active_contenders: usize = 0;
            let mut gemini_index: usize = 0;
            let mut winner_chunk: Option<ContenderFirstChunk> = None;

            let groq_key_opt = std::env::var("GROQ_API_KEY")
                .ok()
                .map(|k| k.trim().to_string())
                .filter(|k| !k.is_empty());

            // 1. If Groq is available, start it in parallel at t=0ms
            if let Some(ref g_key) = groq_key_opt {
                let client = self.client.clone();
                let tx_c = tx.clone();
                let cancel_c = race_cancel.clone();
                let g_key_c = g_key.clone();
                let sys_c = system_prompt.to_string();
                let usr_c = user_prompt.to_string();
                active_contenders += 1;
                tokio::spawn(async move {
                    let model_name = "llama-3.3-70b-versatile".to_string();
                    match send_groq_request(&client, &g_key_c, &sys_c, &usr_c, &cancel_c).await {
                        Ok(resp) => {
                            match await_first_valid_chunk(
                                LlmProviderType::Groq,
                                model_name.clone(),
                                resp,
                                &cancel_c,
                            )
                            .await
                            {
                                Ok(first) => {
                                    let _ = tx_c.send(ContenderMsg::FirstChunk(first)).await;
                                }
                                Err(e) => {
                                    let _ = tx_c
                                        .send(ContenderMsg::Failed {
                                            model: model_name,
                                            error: e,
                                        })
                                        .await;
                                }
                            }
                        }
                        Err(e) => {
                            let _ = tx_c
                                .send(ContenderMsg::Failed {
                                    model: model_name,
                                    error: e,
                                })
                                .await;
                        }
                    }
                });
            }

            // Helper to spawn a Gemini contender that races to yield the first valid text chunk
            let spawn_gemini_contender = |model: String, tx_sender: tokio::sync::mpsc::Sender<ContenderMsg>, cancel: CancellationToken| {
                let client = self.client.clone();
                let key = config.api_key.clone();
                let sys = system_prompt.to_string();
                let usr = user_prompt.to_string();
                let model_clone = model.clone();
                tokio::spawn(async move {
                    match send_gemini_request(&client, &model_clone, &key, &sys, &usr, true, &cancel).await {
                        Ok(resp) => {
                            match await_first_valid_chunk(
                                LlmProviderType::Gemini,
                                model_clone.clone(),
                                resp,
                                &cancel,
                            )
                            .await
                            {
                                Ok(first) => {
                                    let _ = tx_sender.send(ContenderMsg::FirstChunk(first)).await;
                                }
                                Err(e) => {
                                    let _ = tx_sender
                                        .send(ContenderMsg::Failed {
                                            model: model_clone,
                                            error: e,
                                        })
                                        .await;
                                }
                            }
                        }
                        Err(e) => {
                            let _ = tx_sender
                                .send(ContenderMsg::Failed {
                                    model: model_clone,
                                    error: e,
                                })
                                .await;
                        }
                    }
                });
            };

            // 2. Launch primary Gemini model + sub-second Flash-Lite/Flash-3 contenders at t=0ms
            let mut launched_models: HashSet<String> = HashSet::new();
            if gemini_index < available_models.len() {
                let m = available_models[gemini_index].clone();
                gemini_index += 1;
                launched_models.insert(m.clone());
                active_contenders += 1;
                tracing::info!(target: "ghostboard::llm", model = %m, "Starting primary Gemini model in hedged race");
                spawn_gemini_contender(m, tx.clone(), race_cancel.clone());

                for fast_candidate in ["gemini-3.5-flash-lite", "gemini-3-flash-preview", "gemini-flash-lite-latest"] {
                    if available_models.iter().any(|am| am == fast_candidate)
                        && !launched_models.contains(fast_candidate)
                    {
                        let fast_m = fast_candidate.to_string();
                        launched_models.insert(fast_m.clone());
                        active_contenders += 1;
                        tracing::info!(target: "ghostboard::llm", model = %fast_m, "Starting parallel sub-second Gemini contender at t=0ms");
                        spawn_gemini_contender(fast_m, tx.clone(), race_cancel.clone());
                    }
                }
            }

            // 3. Staggered Hedged Race loop: 550ms timer launches secondary model in parallel if primary
            // has not yielded its first valid text chunk within 550ms, or immediately on early failure.
            let mut next_hedge_deadline =
                tokio::time::Instant::now() + Duration::from_millis(HEDGE_STAGGER_MS);

            while active_contenders > 0 || gemini_index < available_models.len() {
                while gemini_index < available_models.len()
                    && launched_models.contains(&available_models[gemini_index])
                {
                    gemini_index += 1;
                }
                let hedge_sleep = if gemini_index < available_models.len() {
                    tokio::time::sleep_until(next_hedge_deadline)
                } else {
                    tokio::time::sleep(Duration::from_secs(3600))
                };

                tokio::select! {
                    _ = cancellation_token.cancelled() => {
                        race_cancel.cancel();
                        return Ok(LlmStreamOutcome::Cancelled);
                    }
                    _ = hedge_sleep => {
                        while gemini_index < available_models.len()
                            && launched_models.contains(&available_models[gemini_index])
                        {
                            gemini_index += 1;
                        }
                        if gemini_index < available_models.len() {
                            let next_m = available_models[gemini_index].clone();
                            gemini_index += 1;
                            launched_models.insert(next_m.clone());
                            active_contenders += 1;
                            tracing::info!(target: "ghostboard::llm", model = %next_m, "550ms hedge timer fired without first token, launching secondary contender in parallel");
                            spawn_gemini_contender(next_m, tx.clone(), race_cancel.clone());
                            next_hedge_deadline = tokio::time::Instant::now() + Duration::from_millis(HEDGE_STAGGER_MS);
                        }
                    }
                    msg = rx.recv() => {
                        match msg {
                            Some(ContenderMsg::FirstChunk(winner)) => {
                                tracing::info!(target: "ghostboard::llm", model = %winner.model, "Hedged race won on first valid text chunk; aborting slower streams");
                                race_cancel.cancel();
                                active_provider = winner.provider;
                                winner_chunk = Some(winner);
                                break;
                            }
                            Some(ContenderMsg::Failed { model, error: e }) => {
                                tracing::warn!(target: "ghostboard::llm", model = %model, error = %e, "Hedged contender failed");
                                if active_contenders > 0 {
                                    active_contenders -= 1;
                                }
                                while gemini_index < available_models.len()
                                    && launched_models.contains(&available_models[gemini_index])
                                {
                                    gemini_index += 1;
                                }
                                // On early error (e.g. 404/429/503), launch next backup contender immediately
                                if gemini_index < available_models.len() {
                                    let next_m = available_models[gemini_index].clone();
                                    gemini_index += 1;
                                    launched_models.insert(next_m.clone());
                                    active_contenders += 1;
                                    tracing::info!(target: "ghostboard::llm", model = %next_m, "Early contender failure, launching next candidate immediately");
                                    spawn_gemini_contender(next_m, tx.clone(), race_cancel.clone());
                                    next_hedge_deadline = tokio::time::Instant::now() + Duration::from_millis(HEDGE_STAGGER_MS);
                                }
                            }
                            None => break,
                        }
                    }
                }
            }

            // 4. Never-Dead Cooldown Breaker: if all models are on cooldown or failed,
            // call clear_all_model_cooldowns() and execute 1 direct retry on fast fallback model with simplified payload (include_thinking: false)
            if let Some(winner) = winner_chunk {
                initial_deltas = winner.first_deltas;
                initial_line_buffer = winner.line_buffer;
                winner.response
            } else {
                if cancellation_token.is_cancelled() {
                    return Ok(LlmStreamOutcome::Cancelled);
                }
                tracing::warn!(target: "ghostboard::llm", "All candidates exhausted, triggering Never-Dead Cooldown Breaker on fast fallback model");
                clear_all_model_cooldowns();
                let primary = "gemini-3.5-flash-lite".to_string();
                match send_gemini_request(&self.client, &primary, &config.api_key, system_prompt, user_prompt, false, &cancellation_token).await {
                    Ok(resp) => {
                        active_provider = LlmProviderType::Gemini;
                        resp
                    }
                    Err(e) => {
                        return Err(format!("All Gemini fallback models exhausted: {}", e));
                    }
                }
            }
        } else {
            let (url, body_json, headers) = match config.provider {
                LlmProviderType::Groq => {
                    let url = config
                        .endpoint_url
                        .clone()
                        .unwrap_or_else(|| "https://api.groq.com/openai/v1/chat/completions".to_string());
                    let mut headers = HeaderMap::new();
                    headers.insert(
                        AUTHORIZATION,
                        HeaderValue::from_str(&format!("Bearer {}", config.api_key.trim()))
                            .map_err(|e| e.to_string())?,
                    );
                    headers.insert(CONTENT_TYPE, HeaderValue::from_static("application/json"));

                    let body = serde_json::json!({
                        "model": config.model,
                        "messages": [
                            { "role": "system", "content": system_prompt },
                            { "role": "user", "content": user_prompt }
                        ],
                        "stream": true,
                        "temperature": 0.3,
                        "max_tokens": 850
                    });

                    (url, body, headers)
                }
                LlmProviderType::OpenAI => {
                    let url = config
                        .endpoint_url
                        .clone()
                        .unwrap_or_else(|| "https://api.openai.com/v1/chat/completions".to_string());
                    let mut headers = HeaderMap::new();
                    headers.insert(
                        AUTHORIZATION,
                        HeaderValue::from_str(&format!("Bearer {}", config.api_key.trim()))
                            .map_err(|e| e.to_string())?,
                    );
                    headers.insert(CONTENT_TYPE, HeaderValue::from_static("application/json"));

                    let body = serde_json::json!({
                        "model": config.model,
                        "messages": [
                            { "role": "system", "content": system_prompt },
                            { "role": "user", "content": user_prompt }
                        ],
                        "stream": true,
                        "temperature": 0.3,
                        "max_tokens": 850
                    });

                    (url, body, headers)
                }
                LlmProviderType::Anthropic => {
                    let url = config
                        .endpoint_url
                        .clone()
                        .unwrap_or_else(|| "https://api.anthropic.com/v1/messages".to_string());
                    let mut headers = HeaderMap::new();
                    headers.insert(
                        "x-api-key",
                        HeaderValue::from_str(config.api_key.trim()).map_err(|e| e.to_string())?,
                    );
                    headers.insert("anthropic-version", HeaderValue::from_static("2023-06-01"));
                    headers.insert(CONTENT_TYPE, HeaderValue::from_static("application/json"));

                    let body = serde_json::json!({
                        "model": config.model,
                        "system": system_prompt,
                        "messages": [
                            { "role": "user", "content": user_prompt }
                        ],
                        "stream": true,
                        "max_tokens": 850,
                        "temperature": 0.3
                    });

                    (url, body, headers)
                }
                LlmProviderType::Gemini => unreachable!(),
            };

            let request = self
                .client
                .post(&url)
                .headers(headers.clone())
                .json(&body_json);

            tokio::select! {
                _ = cancellation_token.cancelled() => {
                    return Ok(LlmStreamOutcome::Cancelled);
                }
                resp_res = tokio::time::timeout(Duration::from_millis(12000), request.send()) => {
                    match resp_res {
                        Ok(inner) => inner.map_err(|e| format!("HTTP request failed: {}", e.without_url()))?,
                        Err(_) => return Err("HTTP request timed out waiting for response".to_string()),
                    }
                }
            }
        };

        if !response.status().is_success() {
            let status = response.status();
            let err_text = response.text().await.unwrap_or_default();
            tracing::warn!(target: "ghostboard::llm", status = %status, body = %err_text, "LLM returned non-success HTTP status");
            return Err(format!("LLM Provider returned error HTTP {}: {}", status, err_text));
        }

        // Stream SSE tokens sequentially using response.chunk().await without whole-stream cutoff
        let mut full_text = String::new();
        let mut token_count = 0;
        let mut line_buffer = initial_line_buffer;

        for delta in initial_deltas {
            full_text.push_str(&delta);
            token_count += 1;
            on_chunk(delta);
        }

        loop {
            if cancellation_token.is_cancelled() {
                return Ok(LlmStreamOutcome::Cancelled);
            }

            let chunk_opt = tokio::select! {
                _ = cancellation_token.cancelled() => return Ok(LlmStreamOutcome::Cancelled),
                res = tokio::time::timeout(Duration::from_secs(12), response.chunk()) => {
                    match res {
                        Ok(Ok(c)) => c,
                        Ok(Err(e)) => {
                            tracing::warn!(target: "ghostboard::llm", "HTTP chunk read error: {}", e);
                            return Err(format!("SSE chunk error: {}", e));
                        }
                        Err(_) => {
                            tracing::warn!(target: "ghostboard::llm", "SSE stream timed out (12s idle without chunk)");
                            return Err("SSE stream interrupted: 12s idle timeout".to_string());
                        }
                    }
                }
            };

            let chunk = match chunk_opt {
                Some(c) => c,
                None => break, // EOF reached cleanly
            };

            let text = String::from_utf8_lossy(&chunk);
            line_buffer.push_str(&text);

            while let Some(pos) = line_buffer.find('\n') {
                let line = line_buffer[..pos].trim().to_string();
                line_buffer = line_buffer[pos + 1..].to_string();

                if line.is_empty() {
                    continue;
                }

                let data_str = if let Some(stripped) = line.strip_prefix("data:") {
                    stripped.trim()
                } else {
                    line.as_str()
                };

                if data_str == "[DONE]" || data_str == "<<<END>>>" {
                    continue;
                }

                if let Some(delta) = parse_sse_data_chunk(active_provider, data_str) {
                    full_text.push_str(&delta);
                    token_count += 1;
                    on_chunk(delta);
                }
            }
        }

        let remaining = line_buffer.trim();
        if !remaining.is_empty() {
            let data_str = if let Some(stripped) = remaining.strip_prefix("data:") {
                stripped.trim()
            } else {
                remaining
            };
            if data_str != "[DONE]" && data_str != "<<<END>>>" {
                if let Some(delta) = parse_sse_data_chunk(active_provider, data_str) {
                    full_text.push_str(&delta);
                    token_count += 1;
                    on_chunk(delta);
                }
            }
        }

        Ok(LlmStreamOutcome::Completed {
            full_text,
            token_count,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_sse_openai_groq_delta() {
        let chunk_json = r#"{"choices":[{"delta":{"content":"PostgreSQL "}}]}"#;
        let token = parse_sse_data_chunk(LlmProviderType::Groq, chunk_json);
        assert_eq!(token, Some("PostgreSQL ".to_string()));

        let done_json = "[DONE]";
        assert_eq!(parse_sse_data_chunk(LlmProviderType::Groq, done_json), None);
    }

    #[test]
    fn test_parse_sse_anthropic_delta() {
        let anthropic_json = r#"{"type":"content_block_delta","delta":{"type":"text_delta","text":"FastAPI"}}"#;
        let token = parse_sse_data_chunk(LlmProviderType::Anthropic, anthropic_json);
        assert_eq!(token, Some("FastAPI".to_string()));
    }

    #[tokio::test]
    async fn test_cancellation_token_instant_abort() {
        let client = SpeculativeLlmClient::new();
        let token = CancellationToken::new();
        // Cancel token immediately before invocation
        token.cancel();

        let config = LlmConfig::default();
        let outcome = client
            .stream_answer(
                &config,
                "system",
                "user",
                token,
                |_chunk| {},
            )
            .await
            .expect("should not error on cancellation");

        assert_eq!(outcome, LlmStreamOutcome::Cancelled);
    }

    #[test]
    fn test_circuit_breaker_cooldown() {
        let model = "test-gemini-model";
        clear_model_cooldown(model);
        assert!(!is_model_cooling_down(model));

        mark_model_cooldown(model, Duration::from_secs(60));
        assert!(is_model_cooling_down(model));

        clear_model_cooldown(model);
        assert!(!is_model_cooling_down(model));
    }

    #[test]
    fn test_build_gemini_request_body() {
        let body_with_thinking = build_gemini_request_body("System prompt", "User prompt", "gemini-3.8-flash", true);
        assert!(body_with_thinking.get("generationConfig").is_some());
        let gen_config = &body_with_thinking["generationConfig"];
        assert_eq!(gen_config["thinkingConfig"]["thinkingBudget"], 0);

        let body_36 = build_gemini_request_body("System prompt", "User prompt", "gemini-3.6-flash", true);
        assert_eq!(body_36["generationConfig"]["thinkingConfig"]["thinkingBudget"], 0);

        let body_35_lite = build_gemini_request_body("System prompt", "User prompt", "gemini-3.5-flash-lite", true);
        assert!(body_35_lite["generationConfig"].get("thinkingConfig").is_none());

        let body_without_thinking = build_gemini_request_body("System prompt", "User prompt", "gemini-flash-latest", false);
        let gen_config2 = &body_without_thinking["generationConfig"];
        assert!(gen_config2.get("thinkingConfig").is_none());
        assert!(body_without_thinking["contents"][0]["parts"][0]["text"].as_str().unwrap().contains("User prompt"));
    }

    #[test]
    fn test_never_dead_cooldown_bypass_and_thinking_rejection_cache() {
        clear_all_model_cooldowns();
        clear_models_rejecting_thinking();

        let candidates: Vec<String> = GEMINI_FLASH_MODELS.iter().map(|s| s.to_string()).collect();
        assert_eq!(candidates[0], "gemini-3.8-flash");
        assert_eq!(candidates[1], "gemini-2.5-flash");
        assert!(candidates.contains(&"gemini-flash-latest".to_string()));
        assert_eq!(HEDGE_STAGGER_MS, 550);

        for m in &candidates {
            mark_model_cooldown(m, Duration::from_secs(60));
            assert!(is_model_cooling_down(m));
        }

        // Never-Dead Bypass clears cooldown state when all models are marked on cooldown simultaneously
        let resolved = resolve_available_models(&candidates);
        assert_eq!(resolved, candidates);
        assert!(!is_model_cooling_down("gemini-3.8-flash"));

        mark_model_rejecting_thinking("gemini-flash-latest");
        assert!(is_model_rejecting_thinking("gemini-flash-latest"));
        let body_rejected = build_gemini_request_body("Sys", "Usr", "gemini-flash-latest", true);
        assert!(body_rejected["generationConfig"].get("thinkingConfig").is_none());

        clear_models_rejecting_thinking();
        clear_all_model_cooldowns();
    }
}
