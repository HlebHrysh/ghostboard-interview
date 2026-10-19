use std::collections::VecDeque;

pub const DEFAULT_SLIDING_WINDOW_MS: u64 = 90_000; // 90 seconds
pub const MIN_QUESTION_WORD_COUNT: usize = 4;

/// A recorded transcript chunk within the sliding 90-second context window.
#[derive(Debug, Clone, PartialEq)]
pub struct TranscriptEntry {
    pub text: String,
    pub is_final: bool,
    pub speech_final: bool,
    pub timestamp_ms: u64,
}

/// Information emitted when an End-of-Thought (EoT) question boundary is detected.
#[derive(Debug, Clone, PartialEq)]
pub struct EotTrigger {
    pub question_id: String,
    pub question_text: String,
    pub context_90s: String,
    pub timestamp_ms: u64,
}

/// End-of-Thought (EoT) detector maintaining a 90-second sliding context window,
/// detecting syntactic interrogative patterns, and synchronizing with VAD speech pauses.
pub struct EotDetector {
    window_duration_ms: u64,
    history: VecDeque<TranscriptEntry>,
    pending_text: String,
    last_triggered_question: String,
    counter: u64,
}

impl Default for EotDetector {
    fn default() -> Self {
        Self::new(DEFAULT_SLIDING_WINDOW_MS)
    }
}

impl EotDetector {
    pub fn new(window_duration_ms: u64) -> Self {
        Self {
            window_duration_ms,
            history: VecDeque::new(),
            pending_text: String::new(),
            last_triggered_question: String::new(),
            counter: 0,
        }
    }

    /// Prunes entries that have expired beyond the sliding window.
    pub fn evict_expired(&mut self, current_time_ms: u64) {
        let cutoff = current_time_ms.saturating_sub(self.window_duration_ms);
        while let Some(front) = self.history.front() {
            if front.timestamp_ms < cutoff {
                self.history.pop_front();
            } else {
                break;
            }
        }
    }

    /// Ingests a new transcript token from the STT subsystem.
    pub fn add_transcript(
        &mut self,
        text: &str,
        is_final: bool,
        speech_final: bool,
        timestamp_ms: u64,
    ) {
        self.evict_expired(timestamp_ms);

        let clean = text.trim();
        if clean.is_empty() {
            return;
        }

        if is_final {
            self.history.push_back(TranscriptEntry {
                text: clean.to_string(),
                is_final,
                speech_final,
                timestamp_ms,
            });

            if self.pending_text.is_empty() {
                self.pending_text = clean.to_string();
            } else {
                self.pending_text.push(' ');
                self.pending_text.push_str(clean);
            }
        } else {
            // For interim tokens, temporarily update pending_text if empty
            if self.pending_text.is_empty() {
                self.pending_text = clean.to_string();
            }
        }
    }

    /// Returns the aggregated conversation context within the sliding 90-second window.
    pub fn get_sliding_context(&self) -> String {
        let mut context = String::new();
        for entry in &self.history {
            if !context.is_empty() {
                context.push(' ');
            }
            context.push_str(&entry.text);
        }
        context
    }

    /// Evaluates whether an End-of-Thought (EoT) question boundary has occurred.
    ///
    /// Triggers when:
    /// 1. VAD pause boundary is flagged (>350ms silence after speech), OR
    /// 2. Deepgram flagged `speech_final == true`, OR
    /// 3. The accumulated transcript explicitly ends in `?`,
    /// AND the accumulated text passes the syntactic question heuristics (>= 4 words, interrogatives).
    pub fn evaluate_eot(
        &mut self,
        vad_pause_boundary: bool,
        current_time_ms: u64,
    ) -> Option<EotTrigger> {
        self.evict_expired(current_time_ms);

        let candidate_text = self.pending_text.trim();
        if candidate_text.is_empty() {
            return None;
        }

        let is_syntactic_question = is_question_heuristic(candidate_text);
        let ends_in_question_mark = candidate_text.ends_with('?');

        // Condition check for EoT firing:
        let should_trigger = (vad_pause_boundary && is_syntactic_question)
            || (ends_in_question_mark && is_syntactic_question)
            || (vad_pause_boundary && ends_in_question_mark);

        if !should_trigger {
            return None;
        }

        // Prevent duplicate trigger for identical question
        if candidate_text == self.last_triggered_question {
            return None;
        }

        self.counter += 1;
        let question_id = format!("q-{}-{}", current_time_ms, self.counter);
        let question_text = candidate_text.to_string();
        self.last_triggered_question = question_text.clone();
        let context_90s = self.get_sliding_context();

        // Clear the pending text buffer for the next question
        self.pending_text.clear();

        Some(EotTrigger {
            question_id,
            question_text,
            context_90s,
            timestamp_ms: current_time_ms,
        })
    }

    /// Resets the current pending question buffer.
    pub fn reset_pending(&mut self) {
        self.pending_text.clear();
    }

    /// Current number of entries retained in sliding context.
    pub fn history_count(&self) -> usize {
        self.history.len()
    }
}

/// Evaluates whether a piece of text satisfies interview question heuristics:
/// 1. Contains at least `MIN_QUESTION_WORD_COUNT` words (filters out conversational affirmations like "okay?", "cool?").
/// 2. Ends in `?` OR contains known interrogative keywords in English, Ukrainian, or Russian.
pub fn is_question_heuristic(text: &str) -> bool {
    let clean = text.trim();
    let words: Vec<&str> = clean.split_whitespace().collect();
    if words.len() < MIN_QUESTION_WORD_COUNT {
        return false;
    }

    if clean.ends_with('?') {
        return true;
    }

    let lower = clean.to_lowercase();

    // English interrogatives
    const EN_PREFIXES: &[&str] = &[
        "what", "how", "why", "where", "when", "can you", "could you", "explain",
        "describe", "difference between", "tell me", "what is", "how does", "is it possible",
    ];

    // Ukrainian interrogatives
    const UK_PREFIXES: &[&str] = &[
        "як", "що", "чому", "де", "коли", "чи", "поясни", "розкажи",
        "опиши", "в чому різниця", "яка різниця", "навіщо", "чи можна",
    ];

    // Russian interrogatives
    const RU_PREFIXES: &[&str] = &[
        "как", "что", "почему", "где", "когда", "зачем", "объясни", "расскажи",
        "опиши", "в чем разница", "какая разница", "можно ли",
    ];

    EN_PREFIXES.iter().any(|&p| lower.contains(p))
        || UK_PREFIXES.iter().any(|&p| lower.contains(p))
        || RU_PREFIXES.iter().any(|&p| lower.contains(p))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_question_heuristic_english() {
        assert!(is_question_heuristic("Explain the GIL in Python"));
        assert!(is_question_heuristic("How does PostgreSQL handle MVCC?"));
        assert!(is_question_heuristic("What is the difference between processes and threads"));
        assert!(is_question_heuristic("Can you describe B-Tree indexing?"));

        // Too short (< 4 words)
        assert!(!is_question_heuristic("Why?"));
        assert!(!is_question_heuristic("Okay?"));
        assert!(!is_question_heuristic("Really? Yes."));
    }

    #[test]
    fn test_question_heuristic_ukrainian_and_russian() {
        assert!(is_question_heuristic("Як влаштований MRO в Python?"));
        assert!(is_question_heuristic("Розкажи про рівні ізоляції транзакцій"));
        assert!(is_question_heuristic("В чому різниця між TCP та UDP"));
        assert!(is_question_heuristic("Как устроен гарбидж коллектор в питоне"));

        // Statement without interrogatives and without '?'
        assert!(!is_question_heuristic("Ми розгорнули наш сервіс у Kubernetes"));
    }

    #[test]
    fn test_eot_90s_sliding_window_expiration() {
        let mut detector = EotDetector::new(90_000);

        // Add an entry at t = 10,000ms
        detector.add_transcript("First sentence at 10s", true, false, 10_000);
        assert_eq!(detector.history_count(), 1);

        // Add an entry at t = 50,000ms
        detector.add_transcript("Second sentence at 50s", true, false, 50_000);
        assert_eq!(detector.history_count(), 2);

        // Evict at t = 105,000ms (cutoff is 105,000 - 90,000 = 15,000ms)
        // First entry (10,000ms) should be evicted; second entry (50,000ms) retained.
        detector.evict_expired(105_000);
        assert_eq!(detector.history_count(), 1);
        assert_eq!(detector.get_sliding_context(), "Second sentence at 50s");

        // Evict at t = 150,000ms (cutoff is 60,000ms) -> second entry evicted
        detector.evict_expired(150_000);
        assert_eq!(detector.history_count(), 0);
        assert!(detector.get_sliding_context().is_empty());
    }

    #[test]
    fn test_eot_vad_pause_boundary_trigger() {
        let mut detector = EotDetector::new(90_000);

        detector.add_transcript("Explain how PostgreSQL handles MVCC", true, false, 1000);

        // Without VAD pause boundary, EoT should not fire
        let no_trigger = detector.evaluate_eot(false, 1000);
        assert!(no_trigger.is_none());

        // With VAD pause boundary (>350ms silence), EoT should fire!
        let trigger = detector.evaluate_eot(true, 1400);
        assert!(trigger.is_some());
        let trig = trigger.unwrap();
        assert_eq!(trig.question_text, "Explain how PostgreSQL handles MVCC");
        assert!(trig.question_id.starts_with("q-1400-"));

        // Duplicate evaluation without new text should not fire again
        let duplicate = detector.evaluate_eot(true, 1500);
        assert!(duplicate.is_none());
    }

    #[test]
    fn test_eot_question_mark_immediate_trigger() {
        let mut detector = EotDetector::new(90_000);

        detector.add_transcript("How do coroutines work in Asyncio?", true, true, 2000);
        let trigger = detector.evaluate_eot(false, 2000);
        assert!(trigger.is_some());
        assert_eq!(trigger.unwrap().question_text, "How do coroutines work in Asyncio?");
    }
}
