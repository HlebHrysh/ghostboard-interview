use base64::engine::general_purpose::URL_SAFE_NO_PAD;
use base64::Engine;
use rand::RngCore;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::time::{SystemTime, UNIX_EPOCH};

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct PkceSession {
    pub code_verifier: String,
    pub code_challenge: String,
    pub state: String,
    pub created_at_sec: u64,
}

pub fn generate_pkce() -> PkceSession {
    let mut verifier_bytes = [0u8; 32];
    rand::rngs::OsRng.fill_bytes(&mut verifier_bytes);
    let code_verifier = URL_SAFE_NO_PAD.encode(verifier_bytes);

    let mut hasher = Sha256::new();
    hasher.update(code_verifier.as_bytes());
    let challenge_bytes = hasher.finalize();
    let code_challenge = URL_SAFE_NO_PAD.encode(challenge_bytes);

    let mut state_bytes = [0u8; 32];
    rand::rngs::OsRng.fill_bytes(&mut state_bytes);
    let state = URL_SAFE_NO_PAD.encode(state_bytes);

    let created_at_sec = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();

    PkceSession {
        code_verifier,
        code_challenge,
        state,
        created_at_sec,
    }
}

pub fn build_authorization_url(session: &PkceSession, base_url: Option<&str>) -> String {
    let endpoint = base_url.unwrap_or("https://ghostboard.ai/auth/authorize");
    let mut serializer = url::form_urlencoded::Serializer::new(String::new());
    serializer
        .append_pair("response_type", "code")
        .append_pair("client_id", "ghostboard-desktop")
        .append_pair("redirect_uri", "copilot://auth/callback")
        .append_pair("scope", "openid profile email offline_access")
        .append_pair("state", &session.state)
        .append_pair("code_challenge", &session.code_challenge)
        .append_pair("code_challenge_method", "S256");

    format!("{}?{}", endpoint, serializer.finish())
}

pub fn verify_state(received_state: &str, session: &PkceSession) -> bool {
    if received_state != session.state {
        return false;
    }
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();
    // Valid within 10 minutes (600s)
    now >= session.created_at_sec && (now - session.created_at_sec) <= 600
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_pkce_generation_and_length() {
        let pkce = generate_pkce();
        assert_eq!(pkce.code_verifier.len(), 43);
        assert_eq!(pkce.code_challenge.len(), 43);
        assert_eq!(pkce.state.len(), 43);
        assert!(verify_state(&pkce.state, &pkce));
        assert!(!verify_state("invalid-state", &pkce));
    }

    #[test]
    fn test_rfc7636_known_vector() {
        // RFC 7636 Appendix B Test Vector
        let verifier = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk";
        let mut hasher = Sha256::new();
        hasher.update(verifier.as_bytes());
        let challenge = URL_SAFE_NO_PAD.encode(hasher.finalize());
        assert_eq!(challenge, "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM");
    }

    #[test]
    fn test_authorization_url_formatting() {
        let pkce = generate_pkce();
        let url = build_authorization_url(&pkce, None);
        assert!(url.starts_with("https://ghostboard.ai/auth/authorize"));
        assert!(url.contains("client_id=ghostboard-desktop"));
        assert!(url.contains("code_challenge_method=S256"));
        assert!(url.contains(&pkce.code_challenge));
        assert!(url.contains(&pkce.state));
    }
}
