use serde::{Deserialize, Serialize};

/// Strongly typed event model emitted to the frontend HUD over zero-overhead Tauri IPC channels.
#[derive(Clone, Serialize, Deserialize, Debug, PartialEq)]
#[serde(tag = "type", content = "payload")]
pub enum HudEvent {
    #[serde(rename = "vadState")]
    VadState {
        is_speech: bool,
        #[serde(alias = "speech_probability")]
        confidence: f32,
    },

    #[serde(rename = "sttTranscript")]
    SttTranscript {
        speaker: String, // "interlocutor" | "candidate"
        text: String,
        is_final: bool,
        #[serde(default)]
        speech_final: bool,
        #[serde(default)]
        timestamp_ms: u64,
    },

    #[serde(rename = "questionDetected")]
    QuestionDetected {
        id: String,
        question: String,
        timestamp_ms: u64,
    },

    #[serde(rename = "llmChunk")]
    LlmChunk {
        question_id: String,
        #[serde(alias = "delta")]
        token: String,
        #[serde(default)]
        is_first: bool,
    },

    #[serde(rename = "llmDone")]
    LlmDone {
        question_id: String,
        full_text: String,
        #[serde(default)]
        latency_ms: u64,
    },

    #[serde(rename = "hotkeyTriggered")]
    HotkeyTriggered {
        action: String,
    },

    #[serde(rename = "audioLevel")]
    AudioLevel {
        #[serde(default)]
        source: String,
        #[serde(default)]
        level: f32,
        #[serde(default)]
        interlocutor: f32,
        #[serde(default)]
        candidate: f32,
    },

    #[serde(rename = "stealthChanged")]
    StealthChanged {
        enabled: bool,
    },

    #[serde(rename = "clickThroughChanged")]
    ClickThroughChanged {
        enabled: bool,
    },

    #[serde(rename = "error")]
    Error {
        code: String,
        message: String,
    },

    /// Deepgram socket lifecycle: "connected" | "reconnecting" | "failed".
    #[serde(rename = "sttStatus")]
    SttStatus {
        speaker: String,
        status: String,
        #[serde(default)]
        attempt: u32,
        #[serde(default)]
        retry_in_ms: u64,
        #[serde(default)]
        message: Option<String>,
    },

    #[serde(rename = "authChanged")]
    AuthChanged {
        authenticated: bool,
        user: Option<serde_json::Value>,
        plan: String,
    },

    #[serde(rename = "deviceCodePending")]
    DeviceCodePending {
        user_code: String,
        verification_uri: String,
        expires_in_sec: u64,
    },

    #[serde(rename = "planUpdated")]
    PlanUpdated {
        plan: String,
    },

    #[serde(rename = "updateStatus")]
    UpdateStatus {
        status: String,
        #[serde(default)]
        progress: Option<f32>,
        #[serde(default)]
        version: Option<String>,
        #[serde(default)]
        message: Option<String>,
    },
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_hud_event_serde_vad_state() {
        let event = HudEvent::VadState {
            is_speech: true,
            confidence: 0.92,
        };
        let json = serde_json::to_string(&event).expect("serialize vadState");
        assert!(json.contains(r#""type":"vadState""#));
        assert!(json.contains(r#""is_speech":true"#));

        let deserialized: HudEvent = serde_json::from_str(&json).expect("deserialize vadState");
        assert_eq!(event, deserialized);
    }

    #[test]
    fn test_hud_event_serde_stt_transcript() {
        let event = HudEvent::SttTranscript {
            speaker: "interlocutor".to_string(),
            text: "Explain Python GIL and memory management".to_string(),
            is_final: true,
            speech_final: true,
            timestamp_ms: 1729180000000,
        };
        let json = serde_json::to_string(&event).expect("serialize sttTranscript");
        assert!(json.contains(r#""type":"sttTranscript""#));

        let deserialized: HudEvent = serde_json::from_str(&json).expect("deserialize sttTranscript");
        assert_eq!(event, deserialized);
    }

    #[test]
    fn test_hud_event_serde_question_detected() {
        let event = HudEvent::QuestionDetected {
            id: "q-123".to_string(),
            question: "How does MVCC work in PostgreSQL?".to_string(),
            timestamp_ms: 1729180000000,
        };
        let json = serde_json::to_string(&event).expect("serialize questionDetected");
        assert!(json.contains(r#""type":"questionDetected""#));

        let deserialized: HudEvent = serde_json::from_str(&json).expect("deserialize questionDetected");
        assert_eq!(event, deserialized);
    }

    #[test]
    fn test_hud_event_serde_llm_chunk_and_done() {
        let chunk = HudEvent::LlmChunk {
            question_id: "q-123".to_string(),
            token: "PostgreSQL uses ".to_string(),
            is_first: true,
        };
        let json_chunk = serde_json::to_string(&chunk).expect("serialize llmChunk");
        let deser_chunk: HudEvent = serde_json::from_str(&json_chunk).expect("deserialize llmChunk");
        assert_eq!(chunk, deser_chunk);

        let done = HudEvent::LlmDone {
            question_id: "q-123".to_string(),
            full_text: "PostgreSQL uses Multi-Version Concurrency Control...".to_string(),
            latency_ms: 320,
        };
        let json_done = serde_json::to_string(&done).expect("serialize llmDone");
        let deser_done: HudEvent = serde_json::from_str(&json_done).expect("deserialize llmDone");
        assert_eq!(done, deser_done);
    }

    #[test]
    fn test_hud_event_serde_hotkey_and_error() {
        let hotkey = HudEvent::HotkeyTriggered {
            action: "answer".to_string(),
        };
        let json_hotkey = serde_json::to_string(&hotkey).expect("serialize hotkeyTriggered");
        let deser_hotkey: HudEvent = serde_json::from_str(&json_hotkey).expect("deserialize hotkeyTriggered");
        assert_eq!(hotkey, deser_hotkey);

        let error = HudEvent::Error {
            code: "DEEPGRAM_AUTH_FAILED".to_string(),
            message: "Invalid API Key".to_string(),
        };
        let json_err = serde_json::to_string(&error).expect("serialize error");
        let deser_err: HudEvent = serde_json::from_str(&json_err).expect("deserialize error");
        assert_eq!(error, deser_err);
    }

    #[test]
    fn test_hud_event_serde_audio_level() {
        let event = HudEvent::AudioLevel {
            source: "loopback".to_string(),
            level: 65.5,
            interlocutor: 0.655,
            candidate: 0.12,
        };
        let json = serde_json::to_string(&event).expect("serialize audioLevel");
        assert!(json.contains(r#""type":"audioLevel""#));
        assert!(json.contains(r#""source":"loopback""#));
        assert!(json.contains(r#""level":65.5"#));

        let deserialized: HudEvent = serde_json::from_str(&json).expect("deserialize audioLevel");
        assert_eq!(event, deserialized);
    }

    #[test]
    fn test_hud_event_serde_update_status() {
        let event = HudEvent::UpdateStatus {
            status: "downloading".to_string(),
            progress: Some(0.45),
            version: Some("1.3.0".to_string()),
            message: Some("Downloading package...".to_string()),
        };
        let json = serde_json::to_string(&event).expect("serialize updateStatus");
        assert!(json.contains(r#""type":"updateStatus""#));
        assert!(json.contains(r#""status":"downloading""#));

        let deserialized: HudEvent = serde_json::from_str(&json).expect("deserialize updateStatus");
        assert_eq!(event, deserialized);
    }
}
