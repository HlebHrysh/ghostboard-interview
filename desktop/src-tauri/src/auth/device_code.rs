use crate::auth::keyring::StoredSession;
use rand::Rng;
use serde::{Deserialize, Serialize};
use std::time::{SystemTime, UNIX_EPOCH};

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct DeviceCodeResponse {
    pub device_code: String,
    pub user_code: String,
    pub verification_uri: String,
    pub verification_uri_complete: String,
    pub expires_in: u64,
    pub interval: u64,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(tag = "status", content = "payload")]
pub enum DevicePollResult {
    Pending,
    SlowDown,
    Success(StoredSession),
    Expired,
    Denied,
    Error(String),
}

pub fn generate_device_code_session(base_url: Option<&str>) -> DeviceCodeResponse {
    let mut rng = rand::thread_rng();
    let chars: Vec<char> = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789".chars().collect();
    let p1: String = (0..3).map(|_| chars[rng.gen_range(0..chars.len())]).collect();
    let p2: String = (0..3).map(|_| chars[rng.gen_range(0..chars.len())]).collect();
    let user_code = format!("{}-{}", p1, p2);

    let device_code = format!("dc_{}_{}", user_code.replace('-', ""), rng.gen::<u32>());
    let base = base_url.unwrap_or("https://ghostboard.ai");
    let verification_uri = format!("{}/activate", base);
    let verification_uri_complete = format!("{}/activate?user_code={}", base, user_code);

    DeviceCodeResponse {
        device_code,
        user_code,
        verification_uri,
        verification_uri_complete,
        expires_in: 600,
        interval: 5,
    }
}

pub async fn poll_device_code_endpoint(
    endpoint: &str,
    device_code: &str,
) -> Result<DevicePollResult, String> {
    let client = reqwest::Client::new();
    let params = [
        ("grant_type", "urn:ietf:params:oauth:grant-type:device_code"),
        ("device_code", device_code),
        ("client_id", "ghostboard-desktop"),
    ];

    let resp = client
        .post(endpoint)
        .form(&params)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let status = resp.status();
    let body = resp.text().await.map_err(|e| e.to_string())?;

    if status.is_success() {
        if let Ok(val) = serde_json::from_str::<serde_json::Value>(&body) {
            let access_token = val["access_token"].as_str().unwrap_or_default().to_string();
            let refresh_token = val["refresh_token"].as_str().unwrap_or_default().to_string();
            let email = val["email"].as_str().unwrap_or("user@ghostboard.ai").to_string();
            let user_id = val["user_id"].as_str().unwrap_or("usr_device").to_string();
            let plan = val["plan"].as_str().unwrap_or("pro").to_string();
            let now_ms = SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap_or_default()
                .as_millis() as u64;

            return Ok(DevicePollResult::Success(StoredSession {
                access_token,
                refresh_token,
                user_id,
                email,
                plan,
                expires_at_ms: now_ms + 86400 * 1000 * 30, // 30 days
            }));
        }
    }

    if let Ok(val) = serde_json::from_str::<serde_json::Value>(&body) {
        if let Some(err) = val["error"].as_str() {
            return match err {
                "authorization_pending" => Ok(DevicePollResult::Pending),
                "slow_down" => Ok(DevicePollResult::SlowDown),
                "expired_token" => Ok(DevicePollResult::Expired),
                "access_denied" => Ok(DevicePollResult::Denied),
                _ => Ok(DevicePollResult::Error(err.to_string())),
            };
        }
    }

    Ok(DevicePollResult::Pending)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_device_code_generation_structure() {
        let dc = generate_device_code_session(None);
        assert_eq!(dc.user_code.len(), 7); // XXX-XXX
        assert!(dc.user_code.contains('-'));
        assert!(dc.verification_uri.contains("ghostboard.ai/activate"));
        assert!(dc.verification_uri_complete.contains(&dc.user_code));
        assert_eq!(dc.expires_in, 600);
        assert_eq!(dc.interval, 5);
    }
}
