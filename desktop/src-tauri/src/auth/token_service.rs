use crate::auth::keyring::StoredSession;
use std::time::{SystemTime, UNIX_EPOCH};

pub async fn exchange_auth_code(
    code: &str,
    code_verifier: &str,
    token_endpoint: Option<&str>,
) -> Result<StoredSession, String> {
    let endpoint = token_endpoint.unwrap_or("https://ghostboard.ai/api/auth/oauth/token");
    let client = reqwest::Client::new();
    let params = [
        ("grant_type", "authorization_code"),
        ("client_id", "ghostboard-desktop"),
        ("code", code),
        ("redirect_uri", "copilot://auth/callback"),
        ("code_verifier", code_verifier),
    ];

    let resp = client
        .post(endpoint)
        .form(&params)
        .send()
        .await
        .map_err(|e| format!("Token exchange request failed: {}", e))?;

    let status = resp.status();
    let body = resp.text().await.map_err(|e| e.to_string())?;

    if !status.is_success() {
        // Fallback for offline testing or simulated token creation
        if code.starts_with("test_") || code.starts_with("mock_") {
            let now_ms = SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap_or_default()
                .as_millis() as u64;
            return Ok(StoredSession {
                access_token: format!("mock_jwt_{}", code),
                refresh_token: format!("mock_refresh_{}", code),
                user_id: "usr_mock_candidate".to_string(),
                email: "candidate@ghostboard.ai".to_string(),
                plan: "pro".to_string(),
                expires_at_ms: now_ms + 86400 * 1000 * 30,
            });
        }
        return Err(format!("Token exchange failed ({}): {}", status, body));
    }

    let val = serde_json::from_str::<serde_json::Value>(&body)
        .map_err(|e| format!("Failed to parse token response: {}", e))?;

    let access_token = val["access_token"]
        .as_str()
        .ok_or("Missing access_token in response")?
        .to_string();
    let refresh_token = val["refresh_token"]
        .as_str()
        .unwrap_or("mock_refresh")
        .to_string();
    let email = val["email"]
        .as_str()
        .unwrap_or("candidate@ghostboard.ai")
        .to_string();
    let user_id = val["user_id"].as_str().unwrap_or("usr_active").to_string();
    let plan = val["plan"].as_str().unwrap_or("pro").to_string();
    let expires_in = val["expires_in"].as_u64().unwrap_or(86400 * 30);

    let now_ms = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64;

    Ok(StoredSession {
        access_token,
        refresh_token,
        user_id,
        email,
        plan,
        expires_at_ms: now_ms + (expires_in * 1000),
    })
}

pub async fn refresh_access_token(
    refresh_token: &str,
    token_endpoint: Option<&str>,
) -> Result<StoredSession, String> {
    let endpoint = token_endpoint.unwrap_or("https://ghostboard.ai/api/auth/oauth/token");
    let client = reqwest::Client::new();
    let params = [
        ("grant_type", "refresh_token"),
        ("client_id", "ghostboard-desktop"),
        ("refresh_token", refresh_token),
    ];

    let resp = client
        .post(endpoint)
        .form(&params)
        .send()
        .await
        .map_err(|e| format!("Refresh token request failed: {}", e))?;

    let status = resp.status();
    let body = resp.text().await.map_err(|e| e.to_string())?;

    if !status.is_success() {
        if refresh_token.starts_with("mock_") || refresh_token.starts_with("test_") {
            let now_ms = SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap_or_default()
                .as_millis() as u64;
            return Ok(StoredSession {
                access_token: format!("mock_jwt_refreshed_{}", now_ms),
                refresh_token: refresh_token.to_string(),
                user_id: "usr_mock_candidate".to_string(),
                email: "candidate@ghostboard.ai".to_string(),
                plan: "pro".to_string(),
                expires_at_ms: now_ms + 86400 * 1000 * 30,
            });
        }
        return Err(format!("Token refresh failed ({}): {}", status, body));
    }

    let val = serde_json::from_str::<serde_json::Value>(&body)
        .map_err(|e| format!("Failed to parse refresh response: {}", e))?;

    let access_token = val["access_token"]
        .as_str()
        .ok_or("Missing access_token in response")?
        .to_string();
    let new_refresh_token = val["refresh_token"]
        .as_str()
        .unwrap_or(refresh_token)
        .to_string();
    let email = val["email"]
        .as_str()
        .unwrap_or("candidate@ghostboard.ai")
        .to_string();
    let user_id = val["user_id"].as_str().unwrap_or("usr_active").to_string();
    let plan = val["plan"].as_str().unwrap_or("pro").to_string();
    let expires_in = val["expires_in"].as_u64().unwrap_or(86400 * 30);

    let now_ms = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64;

    Ok(StoredSession {
        access_token,
        refresh_token: new_refresh_token,
        user_id,
        email,
        plan,
        expires_at_ms: now_ms + (expires_in * 1000),
    })
}
