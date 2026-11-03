use eventsource_stream::Eventsource;
use futures_util::StreamExt;
use reqwest::header::{HeaderMap, HeaderValue, AUTHORIZATION, CONTENT_TYPE};
use serde::{Deserialize, Serialize};
use std::time::Duration;
use tokio_util::sync::CancellationToken;

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
            }
            #[derive(Deserialize)]
            struct ChatCompletionChunk {
                choices: Option<Vec<ChatChoice>>,
            }

            if let Ok(parsed) = serde_json::from_str::<ChatCompletionChunk>(trimmed) {
                if let Some(choices) = parsed.choices {
                    if let Some(choice) = choices.first() {
                        if let Some(delta) = &choice.delta {
                            if let Some(content) = &delta.content {
                                return Some(content.clone());
                            }
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
            }
            #[derive(Deserialize)]
            struct GeminiChunk {
                candidates: Option<Vec<GeminiCandidate>>,
            }

            if let Ok(parsed) = serde_json::from_str::<GeminiChunk>(trimmed) {
                if let Some(candidates) = parsed.candidates {
                    if let Some(first_cand) = candidates.first() {
                        if let Some(content) = &first_cand.content {
                            if let Some(parts) = &content.parts {
                                if let Some(first_part) = parts.first() {
                                    if let Some(text) = &first_part.text {
                                        return Some(text.clone());
                                    }
                                }
                            }
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
                .timeout(Duration::from_secs(30))
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
            LlmProviderType::Gemini => {
                let model = if config.model.is_empty() {
                    "gemini-3.8-flash".to_string()
                } else {
                    config.model.clone()
                };

                let url = config
                    .endpoint_url
                    .clone()
                    .unwrap_or_else(|| {
                        format!(
                            "https://generativelanguage.googleapis.com/v1beta/models/{}:streamGenerateContent?alt=sse&key={}",
                            model,
                            config.api_key.trim()
                        )
                    });

                let mut headers = HeaderMap::new();
                headers.insert(CONTENT_TYPE, HeaderValue::from_static("application/json"));

                let combined_prompt = if system_prompt.is_empty() {
                    user_prompt.to_string()
                } else {
                    format!("{}\n\n{}", system_prompt, user_prompt)
                };

                let mut gen_config = serde_json::json!({
                    "temperature": 0.3,
                    "maxOutputTokens": 850
                });

                if !model.contains("flash-lite") {
                    gen_config["thinkingConfig"] = serde_json::json!({ "thinkingBudget": 0 });
                }

                let body = serde_json::json!({
                    "contents": [
                        {
                            "role": "user",
                            "parts": [
                                { "text": combined_prompt }
                            ]
                        }
                    ],
                    "generationConfig": gen_config
                });

                (url, body, headers)
            }
        };

        // Send HTTP request with cancellation protection and 600ms hedged racing for Gemini
        let response = if config.provider == LlmProviderType::Gemini {
            let primary_fut = self
                .client
                .post(&url)
                .headers(headers.clone())
                .timeout(Duration::from_millis(3000))
                .json(&body_json)
                .send();
            tokio::pin!(primary_fut);

            let primary_res = tokio::select! {
                _ = cancellation_token.cancelled() => {
                    return Ok(LlmStreamOutcome::Cancelled);
                }
                res = &mut primary_fut => Some(res),
                _ = tokio::time::sleep(Duration::from_millis(600)) => None,
            };

            let primary_ok = match primary_res {
                Some(Ok(ref r)) if r.status().is_success() => true,
                _ => false,
            };

            if primary_ok {
                primary_res.unwrap().unwrap()
            } else {
                let fallbacks = [
                    "gemini-3.6-flash",
                    "gemini-3.5-flash-lite",
                    "gemini-2.0-flash-lite",
                    "gemini-flash-latest",
                ];
                let mut fallback_resp = None;

                for fb_model in &fallbacks {
                    if config.model == *fb_model {
                        continue;
                    }
                    let fb_url = format!(
                        "https://generativelanguage.googleapis.com/v1beta/models/{}:streamGenerateContent?alt=sse&key={}",
                        fb_model,
                        config.api_key.trim()
                    );
                    let mut fb_body = body_json.clone();
                    if fb_model.contains("flash-lite") {
                        if let Some(obj) = fb_body.get_mut("generationConfig").and_then(|g| g.as_object_mut()) {
                            obj.remove("thinkingConfig");
                        }
                    }

                    let fb_req = self
                        .client
                        .post(&fb_url)
                        .headers(headers.clone())
                        .timeout(Duration::from_millis(2500))
                        .json(&fb_body);

                    tokio::select! {
                        _ = cancellation_token.cancelled() => {
                            return Ok(LlmStreamOutcome::Cancelled);
                        }
                        res = &mut primary_fut, if primary_res.is_none() => {
                            if let Ok(r) = res {
                                if r.status().is_success() {
                                    fallback_resp = Some(r);
                                    break;
                                }
                            }
                        }
                        fb_res = fb_req.send() => {
                            if let Ok(r) = fb_res {
                                if r.status().is_success() {
                                    fallback_resp = Some(r);
                                    break;
                                }
                            }
                        }
                    }
                }

                if let Some(r) = fallback_resp {
                    r
                } else if let Some(Ok(r)) = primary_res {
                    r
                } else {
                    return Err("All Gemini models failed or timed out during hedged race".to_string());
                }
            }
        } else {
            let request = self
                .client
                .post(&url)
                .headers(headers.clone())
                .timeout(Duration::from_millis(4000))
                .json(&body_json);

            tokio::select! {
                _ = cancellation_token.cancelled() => {
                    return Ok(LlmStreamOutcome::Cancelled);
                }
                resp_res = request.send() => {
                    resp_res.map_err(|e| format!("HTTP request to {} failed: {}", url, e))?
                }
            }
        };

        if !response.status().is_success() {
            let status = response.status();
            let err_text = response.text().await.unwrap_or_default();
            return Err(format!("LLM Provider returned error HTTP {}: {}", status, err_text));
        }

        // Stream SSE tokens
        let mut stream = response.bytes_stream().eventsource();
        let mut full_text = String::new();
        let mut token_count = 0;

        loop {
            tokio::select! {
                _ = cancellation_token.cancelled() => {
                    return Ok(LlmStreamOutcome::Cancelled);
                }
                event_option = stream.next() => {
                    match event_option {
                        Some(Ok(event)) => {
                            if let Some(delta) = parse_sse_data_chunk(config.provider, &event.data) {
                                full_text.push_str(&delta);
                                token_count += 1;
                                on_chunk(delta);
                            }
                        }
                        Some(Err(e)) => {
                            return Err(format!("SSE stream read error: {}", e));
                        }
                        None => {
                            // End of stream
                            break;
                        }
                    }
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
}
