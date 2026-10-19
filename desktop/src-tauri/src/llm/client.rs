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
        LlmProviderType::Groq | LlmProviderType::OpenAI => {
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

            let parsed: ChatCompletionChunk = serde_json::from_str(trimmed).ok()?;
            let choices = parsed.choices?;
            let choice = choices.first()?;
            let delta = choice.delta.as_ref()?;
            delta.content.clone()
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
        let client = reqwest::Client::builder()
            .timeout(Duration::from_secs(30))
            .build()
            .unwrap_or_else(|_| reqwest::Client::new());
        Self { client }
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
                    "temperature": 0.2,
                    "max_tokens": 1024
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
                    "temperature": 0.2,
                    "max_tokens": 1024
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
                    "max_tokens": 1024,
                    "temperature": 0.2
                });

                (url, body, headers)
            }
        };

        // Send HTTP request with cancellation protection
        let request = self.client.post(&url).headers(headers).json(&body_json);

        let response = tokio::select! {
            _ = cancellation_token.cancelled() => {
                return Ok(LlmStreamOutcome::Cancelled);
            }
            resp_res = request.send() => {
                resp_res.map_err(|e| format!("HTTP request to {} failed: {}", url, e))?
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
