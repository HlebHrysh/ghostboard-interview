/// Formats system and user prompts for real-time eyeline teleprompter delivery.
/// The output strictly enforces three sections: Direct Answer, Key Talking Points, and Code Snippet.

pub const BASE_SYSTEM_PROMPT: &str = r#"You are Ghostboard, an ultra-low latency stealth interview copilot.
Your responses are displayed on a glassmorphic teleprompter directly beneath the candidate's webcam.
You must generate structured, authoritative technical responses optimized for natural oral delivery.

STRICT CONSTRAINTS:
1. NEVER include conversational filler, greetings, or acknowledgments (e.g. NO "Sure!", "Great question!", "Here is an explanation").
2. Your response MUST follow this exact Markdown format:

### Direct Answer
[1-2 punchy sentences summarizing the core conceptual answer for immediate oral response]

### Key Talking Points
- [Point 1: Architecture, internal mechanics, or theoretical foundation]
- [Point 2: Practical trade-off, edge case, or performance implication]
- [Point 3: Senior-level production rule of thumb or best practice]

### Code Snippet
[Provide only if the question specifically requests syntax, an implementation, or code snippet. Use idiomatic, modern syntax. Otherwise omit this entire section.]
"#;

pub const CONCISE_SYSTEM_PROMPT_EXTENSION: &str = r#"
CONCISE MODE ACTIVATED:
Keep the answer ultra-compact (<120 words total).
Deliver exactly 1 direct sentence and 2-3 concise bullets.
"#;

/// Builds the system prompt tailored with optional candidate profile and concise mode flag.
pub fn build_system_prompt(candidate_profile: Option<&str>, is_concise: bool) -> String {
    let mut prompt = String::from(BASE_SYSTEM_PROMPT);

    if is_concise {
        prompt.push_str(CONCISE_SYSTEM_PROMPT_EXTENSION);
    }

    if let Some(profile) = candidate_profile {
        if !profile.trim().is_empty() {
            prompt.push_str("\nCANDIDATE CONTEXT & EXPERIENCE:\n");
            prompt.push_str(profile.trim());
            prompt.push_str("\nAdopt this stack and experience level naturally in your phrasing.\n");
        }
    }

    prompt
}

/// Builds the user prompt incorporating the detected question and recent sliding context.
pub fn build_user_prompt(question: &str, recent_context: Option<&str>) -> String {
    let mut prompt = String::new();

    if let Some(ctx) = recent_context {
        let trimmed_ctx = ctx.trim();
        if !trimmed_ctx.is_empty() && trimmed_ctx != question.trim() {
            prompt.push_str("CONVERSATION CONTEXT (last 90 seconds):\n");
            prompt.push_str(trimmed_ctx);
            prompt.push_str("\n\n");
        }
    }

    prompt.push_str("INTERVIEWER QUESTION:\n");
    prompt.push_str(question.trim());
    prompt
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_system_prompt_formatting() {
        let default_prompt = build_system_prompt(None, false);
        assert!(default_prompt.contains("### Direct Answer"));
        assert!(default_prompt.contains("### Key Talking Points"));
        assert!(default_prompt.contains("### Code Snippet"));
        assert!(!default_prompt.contains("CONCISE MODE ACTIVATED"));

        let concise_prompt = build_system_prompt(Some("Senior Backend Python Engineer"), true);
        assert!(concise_prompt.contains("CONCISE MODE ACTIVATED"));
        assert!(concise_prompt.contains("Senior Backend Python Engineer"));
    }

    #[test]
    fn test_user_prompt_formatting() {
        let question = "How does PostgreSQL handle MVCC?";
        let user_prompt = build_user_prompt(question, None);
        assert_eq!(
            user_prompt,
            "INTERVIEWER QUESTION:\nHow does PostgreSQL handle MVCC?"
        );

        let context = "We discussed B-Trees earlier. Now switching gears.";
        let contextual_prompt = build_user_prompt(question, Some(context));
        assert!(contextual_prompt.contains("CONVERSATION CONTEXT (last 90 seconds):"));
        assert!(contextual_prompt.contains("We discussed B-Trees earlier."));
        assert!(contextual_prompt.contains("INTERVIEWER QUESTION:\nHow does PostgreSQL handle MVCC?"));
    }
}
