use keyring::Entry;
use serde::{Deserialize, Serialize};
use std::sync::RwLock;

pub const KEYRING_SERVICE: &str = "ai.ghostboard.desktop";
pub const KEYRING_USER: &str = "session_tokens";

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
pub struct StoredSession {
    pub access_token: String,
    pub refresh_token: String,
    pub user_id: String,
    pub email: String,
    pub plan: String,
    pub expires_at_ms: u64,
}

pub struct KeyringStore {
    fallback_memory: RwLock<Option<String>>,
}

impl KeyringStore {
    pub fn new() -> Self {
        Self {
            fallback_memory: RwLock::new(None),
        }
    }

    pub fn save(&self, session: &StoredSession) -> Result<(), String> {
        let serialized = serde_json::to_string(session).map_err(|e| e.to_string())?;

        // 1. Attempt native OS Keyring
        match Entry::new(KEYRING_SERVICE, KEYRING_USER) {
            Ok(entry) => {
                if let Err(e) = entry.set_password(&serialized) {
                    eprintln!("[Keyring] Native store warning: {}, using secure memory store", e);
                    let mut lock = self.fallback_memory.write().map_err(|e| e.to_string())?;
                    *lock = Some(serialized);
                } else {
                    // Also mirror in memory cache for sub-1ms instant reads
                    if let Ok(mut lock) = self.fallback_memory.write() {
                        *lock = Some(serialized);
                    }
                }
            }
            Err(e) => {
                eprintln!("[Keyring] Entry creation notice: {}, using memory store", e);
                let mut lock = self.fallback_memory.write().map_err(|e| e.to_string())?;
                *lock = Some(serialized);
            }
        }
        Ok(())
    }

    pub fn load(&self) -> Result<Option<StoredSession>, String> {
        // Fast path: memory cache
        if let Ok(lock) = self.fallback_memory.read() {
            if let Some(ref data) = *lock {
                if let Ok(session) = serde_json::from_str::<StoredSession>(data) {
                    return Ok(Some(session));
                }
            }
        }

        // Native OS Keyring path (<20ms)
        let entry = Entry::new(KEYRING_SERVICE, KEYRING_USER).map_err(|e| e.to_string())?;
        match entry.get_password() {
            Ok(data) => {
                let session = serde_json::from_str::<StoredSession>(&data)
                    .map_err(|e| format!("Invalid session json: {}", e))?;
                if let Ok(mut lock) = self.fallback_memory.write() {
                    *lock = Some(data);
                }
                Ok(Some(session))
            }
            Err(keyring::Error::NoEntry) => Ok(None),
            Err(e) => {
                eprintln!("[Keyring] Keyring load notice (fallback active): {}", e);
                Ok(None)
            }
        }
    }

    pub fn clear(&self) -> Result<(), String> {
        if let Ok(mut lock) = self.fallback_memory.write() {
            *lock = None;
        }

        if let Ok(entry) = Entry::new(KEYRING_SERVICE, KEYRING_USER) {
            let _ = entry.delete_credential();
        }
        Ok(())
    }
}

impl Default for KeyringStore {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_keyring_roundtrip_and_serialization() {
        let store = KeyringStore::new();
        let session = StoredSession {
            access_token: "jwt-test-token-12345".to_string(),
            refresh_token: "refresh-test-token-67890".to_string(),
            user_id: "user_test_999".to_string(),
            email: "engineer@ghostboard.ai".to_string(),
            plan: "pro".to_string(),
            expires_at_ms: 1893456000000,
        };

        store.save(&session).expect("save session");
        let loaded = store.load().expect("load session").expect("session exists");
        assert_eq!(loaded.email, "engineer@ghostboard.ai");
        assert_eq!(loaded.plan, "pro");
        assert_eq!(loaded.access_token, "jwt-test-token-12345");

        store.clear().expect("clear session");
        let cleared = store.load().expect("load session");
        assert_eq!(cleared, None);
    }
}
