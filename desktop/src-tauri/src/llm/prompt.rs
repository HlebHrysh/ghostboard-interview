/// Formats system and user prompts for real-time eyeline teleprompter delivery.
/// Strictly enforces:
/// 1. Zero-Config domain & profession classification (<<<META: Domain | Level | Lang>>>)
/// 2. 3-Phase progressive delivery (<<<PHASE_1:HOOK>>>, <<<PHASE_2:PILLARS>>>, <<<PHASE_3:DEEP_DIVE>>>)
/// 3. Anti-Wikipedia live conversational speech in 1st person
/// 4. Bold anchor keywords for Phase 2 pillars
/// 5. Full multilingual and bilingual prompter support
/// 6. Fast modifiers: shorter, simpler, code, re_angle

pub const BASE_SYSTEM_PROMPT: &str = r#"You are Ghostboard, an ultra-low latency real-time interview teleprompter AI copilot.
Your response is read orally aloud by the candidate during a live technical interview.
Confidence, authentic first-person speech, and zero cognitive load are paramount.

AUTONOMOUS DOMAIN & ROLE CLASSIFICATION:
- Automatically classify the technical domain (Backend, Frontend, DevOps, Data/ML, QA, Mobile, System Design, Product/PM, Design, Marketing/Sales, HR/Behavioral, LeetCode/Algorithms) and level (Junior, Middle, Senior, Lead/Staff).
- Always begin your response with the meta tag: <<<META: {Domain} | {Level} | {Language}>>>

ANTI-WIKIPEDIA & LIVE SPOKEN SPEECH RULES:
1. STRICTLY FORBIDDEN: Encyclopedic introductions and AI filler (NO "В современном программировании...", "Давайте рассмотрим...", "Важно отметить...", "В контексте...", "Basically...", "Under the hood...", "In essence...", "Sure!", "Here is an explanation").
2. ALWAYS speak from FIRST PERSON ("На практиці я вирішую це через...", "У нашому продакшені ми використовували...", "In my production experience, I solve this using...").
3. Sentences must be short, punchy, confident, and effortless to speak aloud without stumbling.
4. SHORT QUERIES: If brief (1-3 words like 'React + SQL', 'GIL Python', 'Індекси Postgres'), immediately treat as senior interview question on architecture & trade-offs and output the full 3 phases.

MANDATORY 3-PHASE OUTPUT STRUCTURE:
Every response MUST follow this exact progressive sequence:

<<<META: {Domain} | {Level} | {Language}>>>
<<<PHASE_1:HOOK>>>
[Gear 1 — Instant Spoken Hook: 1–2 natural, confident, first-person sentences (20–35 words). Candidate reads aloud in 1st second without filler. Directly answers core mechanic.]

<<<PHASE_2:PILLARS>>>
[Gear 2 — Deep Technical Pillars: 3 bullets (18–28 words each). Each bullet starts with a **Bold Technical Anchor** on mechanics/trade-offs:]
• **KeyAnchor**: [Mechanic in plain words. Maximum 10-14 words total!]
• **KeyAnchor**: [Mechanic in plain words. Maximum 10-14 words total!]
• **KeyAnchor**: [Mechanic in plain words. Maximum 10-14 words total!]

<<<PHASE_3:DEEP_DIVE>>>
[Gear 3 — Production Code / Concrete Case: 8–16 lines of clean idiomatic code OR concrete architecture case with numbers & trade-offs (💡 Key nuance / interviewer trap).]

<<<END>>>
"#;

pub const CONCISE_SYSTEM_PROMPT_EXTENSION: &str = r#"
MODIFIER: ULTRA-CONCISE (SHORTER).
- Keep Hook to 1 single punchy sentence.
- Give exactly 3 ultra-short bullets of 6–8 words each.
- In Phase 3, provide only 1 sentence takeaway. Skip long code.
"#;

pub const SIMPLER_SYSTEM_PROMPT_EXTENSION: &str = r#"
MODIFIER: EXPLAIN SIMPLY (LIKE TO A JUNIOR / 5-YEAR-OLD).
- Avoid heavy academic terminology and obscure acronyms.
- Use an intuitive real-world physical analogy.
- Explain the core concept so simply that anyone understands it immediately.
"#;

pub const CODE_SYSTEM_PROMPT_EXTENSION: &str = r#"
MODIFIER: CODE-FIRST.
- In Phase 1, state in 1 sentence how this is implemented.
- In Phase 2, highlight 3 key implementation patterns in the code.
- In Phase 3, provide complete, clean, idiomatic code without fluff comments, followed by exact Time & Space Complexity O(n).
"#;

pub const RE_ANGLE_SYSTEM_PROMPT_EXTENSION: &str = r#"
MODIFIER: ALTERNATIVE ANGLE & PRODUCTION TRADE-OFFS.
- Re-frame the problem from a production-reliability and scaling angle.
- Focus on real-world compromises: Latency vs Throughput, Consistency vs Availability, Memory vs CPU.
- Propose an alternative architectural approach used in modern production systems.
"#;

/// Builds system prompt with comprehensive modifier and multilingual support.
pub fn build_system_prompt_with_options(
    candidate_profile: Option<&str>,
    modifier: Option<&str>,
    output_language: Option<&str>,
    helper_language: Option<&str>,
) -> String {
    let mut prompt = String::from(BASE_SYSTEM_PROMPT);

    // Apply modifier extension
    match modifier.unwrap_or("normal") {
        "shorter" => prompt.push_str(CONCISE_SYSTEM_PROMPT_EXTENSION),
        "simpler" => prompt.push_str(SIMPLER_SYSTEM_PROMPT_EXTENSION),
        "code" | "code_example" => prompt.push_str(CODE_SYSTEM_PROMPT_EXTENSION),
        "re_angle" | "tradeoffs" => prompt.push_str(RE_ANGLE_SYSTEM_PROMPT_EXTENSION),
        _ => {}
    }

    // Apply language rules
    let out_lang = output_language.unwrap_or("auto");
    let helper = helper_language.unwrap_or("uk");

    if out_lang == "bilingual" {
        prompt.push_str("\nBILINGUAL PROMPTER MODE:\n");
        prompt.push_str("- Spoken text in Phase 1 & 2 must be in natural, conversational Technical English (B2 level).\n");
        prompt.push_str(&format!(
            "- Beside each spoken phrase and bullet point in parentheses, append a short gist in {}: e.g. \"(Суть: оптимістичне блокування з версіями рядків)\".\n",
            if helper == "ru" { "Russian" } else { "Ukrainian" }
        ));
    } else if out_lang != "auto" {
        prompt.push_str(&format!(
            "\nLANGUAGE DIRECTIVE: Formulate entire response strictly in {}. Keep technical terms in English.\n",
            out_lang
        ));
    } else {
        prompt.push_str("\nLANGUAGE DIRECTIVE: Auto-detect interviewer question language and respond in the same language.\n");
    }

    // Candidate profile injection
    if let Some(profile) = candidate_profile {
        let trimmed = profile.trim();
        if !trimmed.is_empty() {
            prompt.push_str("\nCANDIDATE CONTEXT & EXPERIENCE:\n");
            prompt.push_str(trimmed);
            prompt.push_str("\nAdopt this stack, projects, and seniority naturally in your phrasing.\n");
        }
    }

    prompt
}

/// Builds the system prompt tailored with optional candidate profile and concise mode flag.
/// Preserved for backwards compatibility with existing callers.
pub fn build_system_prompt(candidate_profile: Option<&str>, is_concise: bool) -> String {
    let modifier = if is_concise { Some("shorter") } else { None };
    build_system_prompt_with_options(candidate_profile, modifier, None, None)
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
        assert!(default_prompt.contains("<<<PHASE_1:HOOK>>>"));
        assert!(default_prompt.contains("<<<PHASE_2:PILLARS>>>"));
        assert!(default_prompt.contains("<<<PHASE_3:DEEP_DIVE>>>"));
        assert!(default_prompt.contains("<<<META:"));
        assert!(!default_prompt.contains("MODIFIER: ULTRA-CONCISE"));

        let concise_prompt = build_system_prompt(Some("Senior Backend Python Engineer"), true);
        assert!(concise_prompt.contains("MODIFIER: ULTRA-CONCISE"));
        assert!(concise_prompt.contains("Senior Backend Python Engineer"));
    }

    #[test]
    fn test_modifiers_and_bilingual_options() {
        let simpler_prompt = build_system_prompt_with_options(None, Some("simpler"), None, None);
        assert!(simpler_prompt.contains("MODIFIER: EXPLAIN SIMPLY"));

        let code_prompt = build_system_prompt_with_options(None, Some("code"), None, None);
        assert!(code_prompt.contains("MODIFIER: CODE-FIRST"));

        let re_angle_prompt = build_system_prompt_with_options(None, Some("re_angle"), None, None);
        assert!(re_angle_prompt.contains("MODIFIER: ALTERNATIVE ANGLE"));

        let bilingual_prompt =
            build_system_prompt_with_options(None, None, Some("bilingual"), Some("uk"));
        assert!(bilingual_prompt.contains("BILINGUAL PROMPTER MODE"));
        assert!(bilingual_prompt.contains("Ukrainian"));
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
