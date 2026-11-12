use std::collections::VecDeque;

pub const DEFAULT_SLIDING_WINDOW_MS: u64 = 90_000; // 90 seconds
pub const MIN_QUESTION_WORD_COUNT: usize = 2;
pub const CONTINUATION_WINDOW_MS: u64 = 2500; // 2.5s speaker continuation merge window

#[derive(Debug, Clone, PartialEq, serde::Serialize, serde::Deserialize)]
pub struct MergedContinuation {
    pub merged_question: String,
    pub added_constraint: String,
}

/// Merges an incremental continuation fragment onto a previous question when an interlocutor
/// pauses briefly and then resumes speaking within 2500ms to add constraints.
pub fn merge_continuation_question(previous_question: &str, continuation_fragment: &str) -> MergedContinuation {
    let prev = previous_question.trim();
    let frag = continuation_fragment.trim();

    if prev.is_empty() {
        let clean_frag = frag
            .trim_start_matches(|c: char| c == '.' || c == '…' || c == '-' || c == ',' || c == ';' || c.is_whitespace())
            .trim_end_matches(|c: char| c == '?' || c == '.' || c == '!' || c.is_whitespace());
        let merged = if frag.ends_with('?') {
            frag.to_string()
        } else if !frag.is_empty() {
            format!("{}?", frag)
        } else {
            String::new()
        };
        return MergedContinuation {
            merged_question: merged,
            added_constraint: clean_frag.to_string(),
        };
    }

    if frag.is_empty() {
        return MergedContinuation {
            merged_question: prev.to_string(),
            added_constraint: String::new(),
        };
    }

    // Strip leading ellipses (... or …), dashes, commas, semicolons from continuation fragment
    let clean_frag = frag
        .trim_start_matches(|c: char| c == '.' || c == '…' || c == '-' || c == ',' || c == ';' || c.is_whitespace())
        .trim();
    let added_constraint = clean_frag
        .trim_end_matches(|c: char| c == '?' || c == '.' || c == '!' || c.is_whitespace())
        .trim()
        .to_string();

    // Strip trailing punctuation from previous question for merging
    let base_prev = prev
        .trim_end_matches(|c: char| c == '?' || c == '.' || c == '!' || c.is_whitespace())
        .trim();

    // Subordinate words / prepositions / conjunctions that seamlessly continue the sentence
    let clean_lower = clean_frag.to_lowercase();
    let is_subordinate = [
        "assuming", "given", "with", "without", "if", "when", "but", "and", "or",
        "where", "considering", "specifically", "let's say",
        "якщо", "але", "при цьому", "враховуючи", "скажімо"
    ].iter().any(|&prefix| {
        clean_lower.starts_with(prefix) && (clean_lower.len() == prefix.len() || clean_lower[prefix.len()..].starts_with(|c: char| !c.is_alphanumeric()))
    });

    let mut merged = if is_subordinate || clean_frag.chars().next().map(|c| c.is_lowercase()).unwrap_or(false) {
        let mut chars = clean_frag.chars();
        let first = chars.next().unwrap_or_default().to_lowercase().to_string();
        let rest: String = chars.collect();
        format!("{}, {}{}", base_prev, first, rest)
    } else {
        format!("{}? {}", base_prev, clean_frag)
    };

    if !merged.ends_with('?') {
        let trimmed = merged.trim_end_matches(|c: char| c == '.' || c == '!' || c.is_whitespace());
        merged = format!("{}?", trimmed);
    }

    MergedContinuation {
        merged_question: merged,
        added_constraint,
    }
}

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
    last_trigger_timestamp_ms: u64,
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
            last_trigger_timestamp_ms: 0,
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
    /// Evaluates whether an End-of-Thought (EoT) question boundary has occurred.
    ///
    /// Triggers when:
    /// 1. VAD pause boundary is flagged (>350ms silence after speech), OR
    /// 2. Deepgram flagged `speech_final == true`, OR
    /// 3. The accumulated transcript explicitly ends in `?`, OR
    /// 4. Speaker resumed speaking within CONTINUATION_WINDOW_MS (2500ms) to append constraints.
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

        let is_continuation = self.last_trigger_timestamp_ms > 0
            && current_time_ms.saturating_sub(self.last_trigger_timestamp_ms) <= CONTINUATION_WINDOW_MS
            && !self.last_triggered_question.is_empty();

        let is_syntactic_question = is_question_heuristic(candidate_text);
        let ends_in_question_mark = candidate_text.ends_with('?');

        // Condition check for EoT firing:
        let should_trigger = (vad_pause_boundary && is_syntactic_question)
            || (ends_in_question_mark && is_syntactic_question)
            || (vad_pause_boundary && ends_in_question_mark)
            || (is_continuation && (vad_pause_boundary || ends_in_question_mark));

        if !should_trigger {
            return None;
        }

        // Prevent duplicate trigger for identical question if not a continuation
        if !is_continuation && candidate_text == self.last_triggered_question {
            return None;
        }

        self.counter += 1;
        let question_id = format!("q-{}-{}", current_time_ms, self.counter);

        let question_text = if is_continuation {
            let MergedContinuation {
                merged_question,
                added_constraint,
            } = merge_continuation_question(&self.last_triggered_question, candidate_text);
            self.last_triggered_question = merged_question.clone();
            self.last_trigger_timestamp_ms = current_time_ms;
            format!(
                "{}\n\n[CONTINUATION REFINEMENT: Keep the opening natural, and specifically address the newly added constraint: \"{}\"]",
                merged_question, added_constraint
            )
        } else {
            let focused = extract_focused_question(candidate_text, &self.get_sliding_context());
            self.last_triggered_question = focused.clone();
            self.last_trigger_timestamp_ms = current_time_ms;
            focused
        };

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

    /// Resets the continuation tracking window.
    pub fn reset_continuation(&mut self) {
        self.last_trigger_timestamp_ms = 0;
        self.last_triggered_question.clear();
    }

    /// Current number of entries retained in sliding context.
    pub fn history_count(&self) -> usize {
        self.history.len()
    }
}

/// Checks if `pattern` occurs in `text` with word boundaries (not as part of another word).
fn has_word_or_prefix(text: &str, pattern: &str) -> bool {
    let text_lower = text.to_lowercase();
    let pat_lower = pattern.to_lowercase();

    let mut start = 0;
    while let Some(pos) = text_lower[start..].find(&pat_lower) {
        let abs_pos = start + pos;
        let end_pos = abs_pos + pat_lower.len();

        let left_ok = if abs_pos == 0 {
            true
        } else {
            text_lower[..abs_pos].chars().last().map(|c| !c.is_alphanumeric()).unwrap_or(true)
        };

        let right_ok = if end_pos == text_lower.len() {
            true
        } else {
            text_lower[end_pos..].chars().next().map(|c| !c.is_alphanumeric()).unwrap_or(true)
        };

        if left_ok && right_ok {
            return true;
        }
        start = abs_pos + pat_lower.len().max(1);
    }
    false
}

/// Checks whether the text ends on an unfinished dangling preposition, conjunction, or incomplete clause.
pub fn is_dangling_ending(text: &str) -> bool {
    let clean = text.trim().to_lowercase();
    let trimmed = clean.trim_end_matches(|c: char| c == '.' || c == ',' || c == '…' || c == '-' || c.is_whitespace());

    const DANGLING_ENDINGS: &[&str] = &[
        "і", "та", "або", "але", "тому", "тому що", "бо", "якщо", "коли", "щоб",
        "який", "яка", "яке", "які", "про", "для", "на", "в", "у", "з", "із",
        "це все-таки", "основна", "наприклад", "тобто",
        "and", "or", "but", "because", "if", "when", "that", "which", "with",
        "for", "to", "in", "on", "of", "such as",
        "и", "или", "но", "потому что", "если", "когда", "чтобы", "который", "которая"
    ];

    for &ending in DANGLING_ENDINGS {
        if trimmed == ending || trimmed.ends_with(&format!(" {}", ending)) {
            return true;
        }
    }
    false
}

/// Checks whether an utterance is pure first-person company storytelling or meeting overview banter.
pub fn is_first_person_storytelling(text: &str) -> bool {
    let lower = text.to_lowercase();
    const STORY_PATTERNS: &[&str] = &[
        "у нашій компанії", "в нашій команді", "ми в компанії", "ми зараз робимо",
        "наш продукт", "наш клієнт", "я працюю в", "сьогодні ми поговоримо",
        "план нашої співбесіди", "давайте я розповім про нас",
        "in our company", "our team builds", "we are currently working on",
        "let me tell you about our", "today we will cover",
        "в нашей компании", "мы в команде", "сейчас я расскажу о нас"
    ];
    STORY_PATTERNS.iter().any(|&p| lower.contains(p))
}

/// Checks whether the utterance starts with an interrogative or imperative prompt keyword.
pub fn has_question_opener(text: &str) -> bool {
    const OPENERS: &[&str] = &[
        "як", "чому", "навіщо", "що таке", "що буде", "у чому різниця", "в чому різниця",
        "яка різниця", "як працює", "як би ти", "як би ви", "розкажи", "розкажіть",
        "поясни", "поясніть", "назви", "назвіть", "опиши", "опишіть", "порівняй",
        "спроектуй", "напиши",
        "how", "why", "what is", "what are", "what happens", "what's the difference",
        "explain", "describe", "tell me", "walk me through", "compare", "design",
        "implement", "when would you", "can you", "could you",
        "как", "почему", "зачем", "что такое", "что будет", "в чем разница",
        "расскажи", "расскажите", "объясни", "объясните"
    ];
    OPENERS.iter().any(|&p| has_word_or_prefix(text, p))
}

/// Checks whether an interrogative clause occurs anywhere in the utterance.
pub fn has_question_anywhere(text: &str) -> bool {
    const ANYWHERE: &[&str] = &[
        "як ти вважаєш", "як ви вважаєте", "чи використовував", "чи працював",
        "чи знаєш", "що думаєш про", "what do you think", "have you used",
        "have you worked with", "do you know", "how do you handle", "how does",
        "как ты думаешь", "работал ли ты", "использовал ли"
    ];
    let lower = text.to_lowercase();
    ANYWHERE.iter().any(|&p| lower.contains(p))
}

/// Checks for technical topic keywords in the utterance.
pub fn has_tech_keyword(text: &str) -> bool {
    const TECH: &[&str] = &[
        "react", "next.js", "nextjs", "node.js", "nodejs", "typescript", "javascript",
        "python", "rust", "go", "golang", "java", "c++", "sql", "postgres", "postgresql",
        "mysql", "mongodb", "redis", "kafka", "rabbitmq", "docker", "kubernetes", "k8s",
        "aws", "gcp", "azure", "ci/cd", "git", "linux", "rest", "graphql", "grpc",
        "websocket", "http", "tcp", "udp", "dns", "tls", "jwt", "oauth", "cors",
        "csrf", "xss", "ssr", "csr", "isr", "dom", "virtual dom", "event loop",
        "promise", "async", "thread", "process", "mutex", "deadlock", "garbage collect",
        "memory leak", "index", "b-tree", "acid", "cap", "sharding", "replication",
        "partition", "load balanc", "rate limit", "cache", "microservice", "monolith",
        "solid", "oop", "fp", "big o", "hash map", "binary tree", "gil", "mro",
        "індекс", "потік", "процес", "пам'ят", "кеш", "транзакц", "база даних",
        "архітектур", "алгоритм", "складність"
    ];
    let lower = text.to_lowercase();
    TECH.iter().any(|&p| has_word_or_prefix(&lower, p))
}

/// Checks whether the text is a pure greeting or microphone audio test noise.
pub fn is_greeting_or_noise(text: &str) -> bool {
    let clean = text.trim().to_lowercase();
    let trimmed = clean.trim_matches(|c: char| c == '!' || c == '.' || c == ',' || c == '?' || c.is_whitespace());
    const NOISE_WORDS: &[&str] = &[
        "привіт", "добрий день", "доброго дня", "вітаю", "алло", "раз два", "як мене чути",
        "чи добре чути", "зараз розшарю", "секунду", "угу", "ага", "так-так", "окей", "добре",
        "дякую", "hello", "hi there", "can you hear me", "let me share", "one second",
        "uh huh", "yeah", "okay", "thanks", "здравствуйте", "привет", "как слышно"
    ];
    NOISE_WORDS.contains(&trimmed)
}

/// Extracts the actual question from an utterance preceded by storytelling context.
pub fn extract_focused_question(latest_chunk: &str, rolling_context: &str) -> String {
    let latest_clean = latest_chunk.trim();
    if latest_clean.is_empty() {
        return String::new();
    }

    let combined = format!("{} {}", rolling_context.trim(), latest_clean)
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ");

    let mut sentences: Vec<String> = Vec::new();
    let mut current = String::new();
    for c in combined.chars() {
        current.push(c);
        if c == '.' || c == '?' || c == '!' {
            let trimmed = current.trim().to_string();
            if !trimmed.is_empty() {
                sentences.push(trimmed);
            }
            current.clear();
        }
    }
    let remaining = current.trim().to_string();
    if !remaining.is_empty() {
        sentences.push(remaining);
    }

    if sentences.len() <= 2 {
        return latest_clean.to_string();
    }

    let n = sentences.len();
    let min_idx = n.saturating_sub(3);
    for i in (min_idx..n).rev() {
        let s = &sentences[i];
        if s.contains('?') || has_question_opener(s) || has_question_anywhere(s) {
            let prefix = if i > 0 { &sentences[i - 1] } else { "" };
            let question_part = sentences[i..].join(" ");
            return if !prefix.is_empty() {
                format!("{} {}", prefix, question_part)
            } else {
                question_part
            };
        }
    }

    latest_clean.to_string()
}

/// Evaluates whether a piece of text satisfies interview question heuristics:
/// 1. Filters out noise, greetings, or short affirmations.
/// 2. Penalizes dangling endings (і, та, але, тому що, and, but, etc.) unless ? is present.
/// 3. Penalizes pure first-person company storytelling unless question opener or ? is present.
/// 4. Accurately scores interrogative openers, questions anywhere, and tech topics.
pub fn is_question_heuristic(text: &str) -> bool {
    let clean = text.trim();
    let words: Vec<&str> = clean.split_whitespace().collect();
    let word_count = words.len();
    if word_count < MIN_QUESTION_WORD_COUNT {
        return false;
    }

    if is_greeting_or_noise(clean) && !clean.contains('?') {
        return false;
    }

    let ends_with_qm = clean.ends_with('?');
    let has_qm = clean.contains('?') && !clean.ends_with('.');
    let has_opener = has_question_opener(clean);
    let has_anywhere = has_question_anywhere(clean);
    let has_tech = has_tech_keyword(clean);
    let is_story = is_first_person_storytelling(clean);
    let ends_with_dangling = is_dangling_ending(clean);

    let mut score: i32 = 0;
    if ends_with_qm { score += 55; }
    else if has_qm { score += 30; }
    if has_opener { score += 50; }
    if has_anywhere { score += 45; }
    if has_tech { score += 25; }
    if word_count >= 4 && word_count <= 45 { score += 10; }

    if ends_with_dangling && !ends_with_qm { score -= 45; }
    if is_story && !ends_with_qm && !has_opener && !has_anywhere { score -= 50; }
    if word_count < 2 && !has_tech { score -= 40; }

    if score >= 45
        || (ends_with_qm && word_count >= 2)
        || (has_opener && word_count >= 3 && !ends_with_dangling)
        || (has_tech && (has_opener || has_anywhere || ends_with_qm))
    {
        return true;
    }

    false
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
        assert!(is_question_heuristic("React SQL?"));
        assert!(is_question_heuristic("Explain GIL"));

        // Substrings inside words should NOT match interrogatives
        assert!(!is_question_heuristic("The developer fixed bugs"));
        assert!(!is_question_heuristic("вчитель зайшов у клас"));
        assert!(!is_question_heuristic("create a new view model"));

        // Too short (< 2 words)
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

    #[test]
    fn test_merge_continuation_question_ellipses_and_subordinate() {
        let prev = "How would you design a rate limiter?";
        let frag = "...assuming we have 50 geo-distributed regions and no central Redis?";
        let res = merge_continuation_question(prev, frag);
        assert_eq!(
            res.merged_question,
            "How would you design a rate limiter, assuming we have 50 geo-distributed regions and no central Redis?"
        );
        assert_eq!(
            res.added_constraint,
            "assuming we have 50 geo-distributed regions and no central Redis"
        );

        let frag2 = ", but with strict memory limits";
        let res2 = merge_continuation_question(prev, frag2);
        assert_eq!(
            res2.merged_question,
            "How would you design a rate limiter, but with strict memory limits?"
        );
        assert_eq!(res2.added_constraint, "but with strict memory limits");
    }

    #[test]
    fn test_eot_continuation_within_2500ms() {
        let mut detector = EotDetector::new(90_000);

        // Step 1: Initial question asked and paused
        detector.add_transcript("How would you design a rate limiter?", true, false, 1000);
        let first_trigger = detector.evaluate_eot(true, 1400);
        assert!(first_trigger.is_some());
        assert_eq!(
            first_trigger.unwrap().question_text,
            "How would you design a rate limiter?"
        );

        // Step 2: Speaker resumes within 2500ms (at t = 2600ms, diff = 1200ms <= 2500ms)
        detector.add_transcript("...assuming 50 geo-distributed regions?", true, false, 2600);
        let cont_trigger = detector.evaluate_eot(true, 2800);
        assert!(cont_trigger.is_some());
        let trig = cont_trigger.unwrap();
        assert!(trig.question_text.contains("How would you design a rate limiter, assuming 50 geo-distributed regions?"));
        assert!(trig.question_text.contains("[CONTINUATION REFINEMENT: Keep the opening natural, and specifically address the newly added constraint: \"assuming 50 geo-distributed regions\"]"));
    }

    #[test]
    fn test_question_vs_storytelling_and_dangling() {
        // Storytelling without question:
        assert!(!is_question_heuristic("У нашій компанії ми розробляємо фінансовий продукт і команда складається з 15 інженерів"));
        // Dangling ending without question:
        assert!(!is_question_heuristic("І основна частина нашого вебінару це все-таки буде"));
        // Real question:
        assert!(is_question_heuristic("Як працюють індекси в PostgreSQL і коли B-Tree деградує?"));
        // Story followed by question extracts focused question:
        let story = "У нашій компанії ми розробляємо фінансовий продукт. Команда складається з 15 інженерів. Як влаштований MRO в Python?";
        let focused = extract_focused_question(story, "");
        assert!(focused.contains("Як влаштований MRO в Python?"));
    }
}

