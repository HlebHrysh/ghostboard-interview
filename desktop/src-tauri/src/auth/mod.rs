pub mod device_code;
pub mod keyring;
pub mod pkce;
pub mod token_service;

use self::device_code::{generate_device_code_session, DeviceCodeResponse};
use self::keyring::{KeyringStore, StoredSession};
use self::pkce::{build_authorization_url, generate_pkce, verify_state, PkceSession};
use serde::{Deserialize, Serialize};
use std::sync::RwLock;
use std::time::{SystemTime, UNIX_EPOCH};

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct UserProfile {
    pub id: String,
    pub email: String,
    pub plan: String,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct AuthStateResponse {
    pub authenticated: bool,
    pub user: Option<UserProfile>,
    pub plan: String,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct PkceLoginResponse {
    pub auth_url: String,
    pub state: String,
}

pub struct AuthManager {
    keyring_store: KeyringStore,
    pending_pkce: RwLock<Option<PkceSession>>,
    active_device_flow: RwLock<Option<DeviceCodeResponse>>,
    current_session: RwLock<Option<StoredSession>>,
}

impl AuthManager {
    pub fn new() -> Self {
        Self {
            keyring_store: KeyringStore::new(),
            pending_pkce: RwLock::new(None),
            active_device_flow: RwLock::new(None),
            current_session: RwLock::new(None),
        }
    }

    /// Sub-50ms cold load from native OS Keyring on application startup
    pub async fn cold_load(&self) -> Result<Option<StoredSession>, String> {
        let start = std::time::Instant::now();
        let loaded = self.keyring_store.load()?;
        let elapsed = start.elapsed();
        tracing::info!(target: "ghostboard::auth", elapsed = ?elapsed, "Cold load from OS Keyring completed");

        if let Some(session) = loaded {
            let now_ms = SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap_or_default()
                .as_millis() as u64;

            // Check if token expired or expires within 60s
            if now_ms + 60_000 >= session.expires_at_ms {
                tracing::info!(target: "ghostboard::auth", "Access token near expiration, initiating background refresh rotation");
                match token_service::refresh_access_token(&session.refresh_token, None).await {
                    Ok(refreshed) => {
                        let _ = self.keyring_store.save(&refreshed);
                        if let Ok(mut lock) = self.current_session.write() {
                            *lock = Some(refreshed.clone());
                        }
                        return Ok(Some(refreshed));
                    }
                    Err(e) => {
                        tracing::warn!(target: "ghostboard::auth", "Refresh token rotation notice: {}", e);
                    }
                }
            }

            if let Ok(mut lock) = self.current_session.write() {
                *lock = Some(session.clone());
            }
            return Ok(Some(session));
        }

        Ok(None)
    }

    pub fn start_pkce_login(&self, base_url: Option<&str>) -> Result<PkceLoginResponse, String> {
        let session = generate_pkce();
        let auth_url = build_authorization_url(&session, base_url);
        let state = session.state.clone();

        if let Ok(mut lock) = self.pending_pkce.write() {
            *lock = Some(session);
        }

        Ok(PkceLoginResponse { auth_url, state })
    }

    pub async fn handle_callback(
        &self,
        code: &str,
        state: &str,
        token_endpoint: Option<&str>,
    ) -> Result<StoredSession, String> {
        let verifier = {
            let mut lock = self.pending_pkce.write().map_err(|e| e.to_string())?;
            let pending = lock
                .take()
                .ok_or_else(|| "No pending PKCE session found (possibly expired or invalid state)".to_string())?;

            if !verify_state(state, &pending) {
                return Err("PKCE state mismatch: possible CSRF attempt".to_string());
            }
            pending.code_verifier
        };

        let session = token_service::exchange_auth_code(code, &verifier, token_endpoint).await?;
        self.keyring_store.save(&session)?;

        if let Ok(mut lock) = self.current_session.write() {
            *lock = Some(session.clone());
        }

        Ok(session)
    }

    /// Stores an externally authenticated session (e.g. from desktop-poll handshake or deep-link) in native OS Keyring
    pub fn save_session(&self, session: &StoredSession) -> Result<(), String> {
        self.keyring_store.save(session)?;
        if let Ok(mut lock) = self.current_session.write() {
            *lock = Some(session.clone());
        }
        Ok(())
    }

    pub fn start_device_code_flow(&self, base_url: Option<&str>) -> Result<DeviceCodeResponse, String> {
        let resp = generate_device_code_session(base_url);
        if let Ok(mut lock) = self.active_device_flow.write() {
            *lock = Some(resp.clone());
        }
        Ok(resp)
    }

    pub fn get_auth_state(&self) -> AuthStateResponse {
        if let Ok(lock) = self.current_session.read() {
            if let Some(ref s) = *lock {
                return AuthStateResponse {
                    authenticated: true,
                    user: Some(UserProfile {
                        id: s.user_id.clone(),
                        email: s.email.clone(),
                        plan: s.plan.clone(),
                    }),
                    plan: s.plan.clone(),
                };
            }
        }

        AuthStateResponse {
            authenticated: false,
            user: None,
            plan: "free".to_string(),
        }
    }

    pub fn get_access_token(&self) -> Option<String> {
        if let Ok(lock) = self.current_session.read() {
            if let Some(ref s) = *lock {
                return Some(s.access_token.clone());
            }
        }
        None
    }

    pub fn logout(&self) -> Result<(), String> {
        self.keyring_store.clear()?;
        if let Ok(mut lock) = self.current_session.write() {
            *lock = None;
        }
        if let Ok(mut lock) = self.pending_pkce.write() {
            *lock = None;
        }
        if let Ok(mut lock) = self.active_device_flow.write() {
            *lock = None;
        }
        Ok(())
    }
}

impl Default for AuthManager {
    fn default() -> Self {
        Self::new()
    }
}
