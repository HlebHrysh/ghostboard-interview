use reqwest::header::{HeaderMap, HeaderValue, AUTHORIZATION, CONTENT_TYPE};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Mutex as StdMutex;
use std::time::Duration;
use tokio_util::sync::CancellationToken;

static CIRCUIT_BREAKER: std::sync::OnceLock<StdMutex<HashMap<String, std::time::Instant>>> =
    std::sync::OnceLock::new();

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

    // Only include thinkingConfig on models that explicitly support it, and when requested
    if include_thinking && (model == "gemini-3.8-flash" || model == "gemini-3.6-flash" || model == "gemini-3.5-flash") {
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
        res = tokio::time::timeout(Duration::from_millis(12000), req_future) => match res {
            Ok(Ok(r)) => r,
            Ok(Err(e)) => return Err(e.without_url().to_string()),
            // On timeout, return error immediately - NEVER cooldown on timeout!
            Err(_) => return Err(format!("Model {} timed out after 12000ms", model)),
        }
    };

    let status = resp.status();
    if status.is_success() {
        clear_model_cooldown(model);
        return Ok(resp);
    }

    if status.as_u16() == 400 {
        let err_text = resp.text().await.unwrap_or_default();
        if (err_text.contains("thinkingConfig") || err_text.contains("INVALID_ARGUMENT")) && include_thinking {
            tracing::info!(target: "ghostboard::llm", model = %model, "Retrying Gemini without thinkingConfig on HTTP 400");
            let body_without_thinking = build_gemini_request_body(system_prompt, user_prompt, model, false);
            let retry_req = client.post(&url).headers(headers).json(&body_without_thinking).send();
            let retry_res = tokio::select! {
                _ = cancellation_token.cancelled() => return Err("Cancelled".to_string()),
                res = tokio::time::timeout(Duration::from_millis(12000), retry_req) => res
            };
            if let Ok(Ok(retry_resp)) = retry_res {
                if retry_resp.status().is_success() {
                    clear_model_cooldown(model);
                    return Ok(retry_resp);
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

        // Send HTTP request with cancellation protection
        let mut response = if config.provider == LlmProviderType::Gemini {
            if cancellation_token.is_cancelled() {
                return Ok(LlmStreamOutcome::Cancelled);
            }

            let mut gemini_models: Vec<String> = Vec::new();
            if !config.model.trim().is_empty() && config.model.starts_with("gemini") {
                let m = config.model.trim();
                gemini_models.push(m.to_string());
            }
            for candidate in &["gemini-3.8-flash", "gemini-2.5-flash", "gemini-2.0-flash", "gemini-flash-latest"] {
                if !gemini_models.iter().any(|m| m == candidate) {
                    gemini_models.push(candidate.to_string());
                }
            }

            // Never-Dead Cooldown Bypass: if every model is on cooldown, automatically clear cooldown state
            let mut available_models: Vec<String> = gemini_models
                .iter()
                .filter(|m| !is_model_cooling_down(m))
                .cloned()
                .collect();

            if available_models.is_empty() {
                tracing::warn!(target: "ghostboard::llm", "All models on cooldown, clearing cooldown state (Never-Dead Cooldown Bypass)");
                clear_all_model_cooldowns();
                available_models = gemini_models.clone();
            }

            enum ContenderMsg {
                Success {
                    provider: LlmProviderType,
                    model: String,
                    response: reqwest::Response,
                },
                Failed {
                    model: String,
                    error: String,
                },
            }

            let (tx, mut rx) = tokio::sync::mpsc::channel::<ContenderMsg>(16);
            let race_cancel = cancellation_token.child_token();
            let mut active_contenders: usize = 0;
            let mut gemini_index: usize = 0;
            let mut final_response: Option<reqwest::Response> = None;
            let mut last_error = String::new();

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
                    match send_groq_request(&client, &g_key_c, &sys_c, &usr_c, &cancel_c).await {
                        Ok(resp) => {
                            let _ = tx_c.send(ContenderMsg::Success {
                                provider: LlmProviderType::Groq,
                                model: "llama-3.3-70b-versatile".to_string(),
                                response: resp,
                            }).await;
                        }
                        Err(e) => {
                            let _ = tx_c.send(ContenderMsg::Failed {
                                model: "llama-3.3-70b-versatile".to_string(),
                                error: e,
                            }).await;
                        }
                    }
                });
            }

            // Helper to spawn a Gemini contender
            let spawn_gemini_contender = |model: String, tx_sender: tokio::sync::mpsc::Sender<ContenderMsg>, cancel: CancellationToken| {
                let client = self.client.clone();
                let key = config.api_key.clone();
                let sys = system_prompt.to_string();
                let usr = user_prompt.to_string();
                let model_clone = model.clone();
                tokio::spawn(async move {
                    match send_gemini_request(&client, &model_clone, &key, &sys, &usr, true, &cancel).await {
                        Ok(resp) => {
                            let _ = tx_sender.send(ContenderMsg::Success {
                                provider: LlmProviderType::Gemini,
                                model: model_clone,
                                response: resp,
                            }).await;
                        }
                        Err(e) => {
                            let _ = tx_sender.send(ContenderMsg::Failed {
                                model: model_clone,
                                error: e,
                            }).await;
                        }
                    }
                });
            };

            // 2. Launch primary Gemini model at t=0ms
            if gemini_index < available_models.len() {
                let m = available_models[gemini_index].clone();
                gemini_index += 1;
                active_contenders += 1;
                tracing::info!(target: "ghostboard::llm", model = %m, "Starting primary Gemini model in hedged race");
                spawn_gemini_contender(m, tx.clone(), race_cancel.clone());
            }

            // 3. Staggered Hedged Race loop: 1800ms timer launches backup #2 in parallel if no first byte/success,
            // or immediately launches next model on 404/429/503/error.
            let mut next_hedge_deadline = tokio::time::Instant::now() + Duration::from_millis(1800);

            while active_contenders > 0 || gemini_index < available_models.len() {
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
                        if gemini_index < available_models.len() {
                            let next_m = available_models[gemini_index].clone();
                            gemini_index += 1;
                            active_contenders += 1;
                            tracing::info!(target: "ghostboard::llm", model = %next_m, "1800ms hedge timer fired, launching backup contender in parallel");
                            spawn_gemini_contender(next_m, tx.clone(), race_cancel.clone());
                            next_hedge_deadline = tokio::time::Instant::now() + Duration::from_millis(1800);
                        }
                    }
                    msg = rx.recv() => {
                        match msg {
                            Some(ContenderMsg::Success { provider, model, response: r }) => {
                                tracing::info!(target: "ghostboard::llm", model = %model, "Hedged race won by contender");
                                race_cancel.cancel();
                                final_response = Some(r);
                                active_provider = provider;
                                break;
                            }
                            Some(ContenderMsg::Failed { model, error: e }) => {
                                tracing::warn!(target: "ghostboard::llm", model = %model, error = %e, "Hedged contender failed");
                                last_error = e;
                                if active_contenders > 0 {
                                    active_contenders -= 1;
                                }
                                // On early error (e.g. 404/429/503), launch next backup contender immediately
                                if gemini_index < available_models.len() {
                                    let next_m = available_models[gemini_index].clone();
                                    gemini_index += 1;
                                    active_contenders += 1;
                                    tracing::info!(target: "ghostboard::llm", model = %next_m, "Early contender failure, launching next candidate immediately");
                                    spawn_gemini_contender(next_m, tx.clone(), race_cancel.clone());
                                    next_hedge_deadline = tokio::time::Instant::now() + Duration::from_millis(1800);
                                }
                            }
                            None => break,
                        }
                    }
                }
            }

            // 4. Never-Dead Cooldown Breaker: if all models are on cooldown or failed,
            // call clear_all_model_cooldowns() and execute 1 direct retry on primary model with simplified payload (include_thinking: false)
            if final_response.is_none() {
                if cancellation_token.is_cancelled() {
                    return Ok(LlmStreamOutcome::Cancelled);
                }
                tracing::warn!(target: "ghostboard::llm", "All candidates exhausted, triggering Never-Dead Cooldown Breaker on primary model");
                clear_all_model_cooldowns();
                let primary = gemini_models.first().cloned().unwrap_or_else(|| "gemini-3.8-flash".to_string());
                match send_gemini_request(&self.client, &primary, &config.api_key, system_prompt, user_prompt, false, &cancellation_token).await {
                    Ok(resp) => {
                        active_provider = LlmProviderType::Gemini;
                        final_response = Some(resp);
                    }
                    Err(e) => {
                        last_error = e;
                    }
                }
            }

            match final_response {
                Some(r) => r,
                None => {
                    return Err(format!("All Gemini fallback models exhausted: {}", last_error));
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
        let mut line_buffer = String::new();

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
}
