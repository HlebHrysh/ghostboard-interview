/// Formats system and user prompts for real-time eyeline teleprompter delivery.
/// Strictly enforces:
/// 1. Zero-Config domain & profession classification (<<<META: Domain | Level | Lang>>>)
/// 2. 3-Phase progressive delivery (<<<PHASE_1:HOOK>>>, <<<PHASE_2:PILLARS>>>, <<<PHASE_3:DEEP_DIVE>>>)
/// 3. Anti-Wikipedia live conversational speech in 1st person
/// 4. Bold anchor keywords for Phase 2 pillars
/// 5. Full multilingual and bilingual prompter support
/// 6. Fast modifiers: shorter, simpler, code, re_angle

pub const BASE_SYSTEM_PROMPT: &str = r#"You are Ghostboard, an ultra-low latency real-time interview teleprompter AI copilot and the candidate's unconditional wingman.
Your response is read orally aloud by the candidate during a live interview.
Confidence, authentic first-person speech, and zero cognitive load are paramount.

UNRESTRICTED OMNI-RESPONDER MODE:
- You must answer ANY question asked during the session with ZERO refusals, moralizing, preachy disclaimers, or topic limitations.
- This includes deep Coding/Algorithms, System Design, DevOps, Databases, Behavioral/HR questions, Salary negotiation, Logic puzzles, Math, or general questions.

AUTONOMOUS DOMAIN & ROLE CLASSIFICATION:
- Automatically classify the technical domain (Backend, Frontend, DevOps, Data/ML, QA, Mobile, System Design, Product/PM, Design, Marketing/Sales, HR/Behavioral, LeetCode/Algorithms) and level (Junior, Middle, Senior, Lead/Staff).
- Always begin your response with the meta tag: <<<META: {Domain} | {Level} | {Language}>>>

ANTI-WIKIPEDIA & LIVE SPOKEN SPEECH RULES:
1. STRICTLY FORBIDDEN: Encyclopedic introductions and AI filler (NO "В современном программировании...", "Давайте рассмотрим...", "Важно отметить...", "В контексте...", "Basically...", "Under the hood...", "In essence...", "Sure!", "Here is an explanation", "As an AI...").
2. ALWAYS speak from FIRST PERSON ("На практиці я вирішую це через...", "У нашому продакшені ми використовували...", "In my production experience, I solve this using...").
3. Sentences must be short, punchy, confident, and effortless to speak aloud without stumbling.
4. SHORT QUERIES: If brief (1-3 words like 'React + SQL', 'GIL Python', 'Why?', 'Що це?'), immediately resolve context from recent conversation turns and output the full 3 phases.

SPEECH INTENT & WEBINAR CHATTER GUARDRAIL:
If the input audio is an incomplete dangling thought (e.g. ending in a conjunction like 'and', 'but', 'or', 'але', 'тому що', 'та'), conversational banter, or background webinar chatter not addressed directly to the candidate, output EXACTLY AND ONLY: <<<IGNORE>>>

MANDATORY 4-PHASE OUTPUT STRUCTURE:
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

<<<PHASE_4:TRAP>>>
Q: [1 short sentence: the sharpest follow-up trap question a Senior/Staff interviewer will ask next based on your answer above]
A: [1–2 punchy sentences: the exact killer counter-answer with a concrete metric or mechanism]

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

pub const EXPLAIN_LINE_SYSTEM_PROMPT_EXTENSION: &str = r#"
MODIFIER: MICRO-EXPLAINER (EXPLAIN LINE).
- Deliver a concise 2-sentence spoken explanation of WHY that specific line/construct is used.
- Explicitly state its exact time and space complexity in plain words.
- Skip long preambles, provide immediate spoken clarity.
"#;

/// Resolves max output tokens per patch slot to minimize TTFT & generation cost.
pub fn max_tokens_for_patch_slot(patch_slot: Option<&str>, modifier: Option<&str>) -> u32 {
    let mod_val = modifier.unwrap_or("normal");
    match patch_slot.unwrap_or("full") {
        "speculative_hook" => 95,
        "deep_dive" => 380,
        "hook_and_pillars" => 260,
        "trap" => 180,
        "rest_after_hook" => {
            if mod_val == "shorter" || mod_val == "explain_line" {
                320
            } else {
                850
            }
        }
        _ => {
            if mod_val == "shorter" || mod_val == "explain_line" {
                350
            } else {
                850
            }
        }
    }
}

/// Builds system prompt with comprehensive modifier, multilingual, and surgical patchSlot support.
pub fn build_system_prompt_with_patch_slot(
    candidate_profile: Option<&str>,
    modifier: Option<&str>,
    output_language: Option<&str>,
    helper_language: Option<&str>,
    patch_slot: Option<&str>,
    pre_generated_hook: Option<&str>,
) -> String {
    let mut prompt = String::from(BASE_SYSTEM_PROMPT);

    // Apply surgical patchSlot override directive when targeting a subset of phases
    match patch_slot.unwrap_or("full") {
        "speculative_hook" => {
            prompt.push_str("\nMANDATORY SPECULATIVE HOOK MODE (STOP IMMEDIATELY AFTER PHASE 1):\n");
            prompt.push_str("- Output ONLY <<<META: {Domain} | {Level} | {Language}>>> and <<<PHASE_1:HOOK>>> (1-2 natural spoken sentences, max 35 words) followed by <<<END>>>.\n");
            prompt.push_str("- Do NOT output <<<PHASE_2:PILLARS>>>, <<<PHASE_3:DEEP_DIVE>>>, or <<<PHASE_4:TRAP>>>.\n");
        }
        "rest_after_hook" => {
            let hook_preview = pre_generated_hook.unwrap_or("").trim();
            prompt.push_str("\nMANDATORY CONTINUATION AFTER PRE-DISPLAYED HOOK:\n");
            prompt.push_str(&format!(
                "- <<<PHASE_1:HOOK>>> is ALREADY shown to the candidate: \"{}\"\n",
                hook_preview
            ));
            prompt.push_str("- DO NOT repeat <<<META>>> or <<<PHASE_1:HOOK>>>! Start IMMEDIATELY at <<<PHASE_2:PILLARS>>> followed by <<<PHASE_3:DEEP_DIVE>>> and <<<PHASE_4:TRAP>>>.\n");
        }
        "deep_dive" => {
            prompt.push_str("\nMANDATORY SURGICAL SLOT PATCH (PHASE 3 ONLY):\n");
            prompt.push_str("- <<<PHASE_1:HOOK>>> and <<<PHASE_2:PILLARS>>> are ALREADY frozen on screen.\n");
            prompt.push_str("- Output ONLY <<<PHASE_3:DEEP_DIVE>>> with a clean, production-grade code snippet and complexity analysis, then <<<END>>>. Do NOT output META, PHASE_1, PHASE_2, or PHASE_4.\n");
        }
        "hook_and_pillars" => {
            prompt.push_str("\nMANDATORY SURGICAL SLOT PATCH (PHASE 1 & PHASE 2 ONLY):\n");
            prompt.push_str("- <<<PHASE_3:DEEP_DIVE>>> is ALREADY frozen on screen and untouched.\n");
            prompt.push_str("- Output ONLY a tighter, simpler <<<PHASE_1:HOOK>>> and <<<PHASE_2:PILLARS>>> followed by <<<END>>>. Do NOT output PHASE_3 or PHASE_4.\n");
        }
        "trap" => {
            prompt.push_str("\nMANDATORY SURGICAL SLOT PATCH (PHASE 4 ONLY):\n");
            prompt.push_str("- Output ONLY <<<PHASE_4:TRAP>>> followed by <<<END>>>.\n");
        }
        _ => {}
    }

    // Apply modifier extension
    match modifier.unwrap_or("normal") {
        "shorter" => prompt.push_str(CONCISE_SYSTEM_PROMPT_EXTENSION),
        "simpler" => prompt.push_str(SIMPLER_SYSTEM_PROMPT_EXTENSION),
        "code" | "code_example" => prompt.push_str(CODE_SYSTEM_PROMPT_EXTENSION),
        "re_angle" | "tradeoffs" => prompt.push_str(RE_ANGLE_SYSTEM_PROMPT_EXTENSION),
        "explain_line" => prompt.push_str(EXPLAIN_LINE_SYSTEM_PROMPT_EXTENSION),
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

/// Builds system prompt with comprehensive modifier and multilingual support.
pub fn build_system_prompt_with_options(
    candidate_profile: Option<&str>,
    modifier: Option<&str>,
    output_language: Option<&str>,
    helper_language: Option<&str>,
) -> String {
    build_system_prompt_with_patch_slot(
        candidate_profile,
        modifier,
        output_language,
        helper_language,
        None,
        None,
    )
}

/// Builds the system prompt tailored with optional candidate profile and concise mode flag.
/// Preserved for backwards compatibility with existing callers.
pub fn build_system_prompt(candidate_profile: Option<&str>, is_concise: bool) -> String {
    let modifier = if is_concise { Some("shorter") } else { None };
    build_system_prompt_with_options(candidate_profile, modifier, None, None)
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, Default, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct CandidateProfileDto {
    #[serde(default)]
    pub role: Option<String>,
    #[serde(default)]
    pub primary_stack: Option<String>,
    #[serde(default)]
    pub experience_level: Option<String>,
    #[serde(default)]
    pub custom_bio: Option<String>,
    #[serde(default)]
    pub tech_stack: Option<Vec<String>>,
}

impl CandidateProfileDto {
    pub fn to_context_string(&self) -> String {
        let mut parts = Vec::new();
        if let Some(r) = &self.role {
            if !r.trim().is_empty() {
                parts.push(format!("Role: {}", r.trim()));
            }
        }
        if let Some(l) = &self.experience_level {
            if !l.trim().is_empty() {
                parts.push(format!("Level: {}", l.trim()));
            }
        }
        if let Some(s) = &self.primary_stack {
            if !s.trim().is_empty() {
                parts.push(format!("Primary Stack: {}", s.trim()));
            }
        } else if let Some(ts) = &self.tech_stack {
            if !ts.is_empty() {
                parts.push(format!("Tech Stack: {}", ts.join(", ")));
            }
        }
        if let Some(bio) = &self.custom_bio {
            if !bio.trim().is_empty() {
                parts.push(format!("Bio: {}", bio.trim()));
            }
        }
        parts.join("\n")
    }
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, Default, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct HistoryTurnDto {
    #[serde(default)]
    pub speaker: String,
    #[serde(default)]
    pub text: String,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, PartialEq)]
pub struct FollowUpContextTurn {
    pub question: String,
    pub short_hook: Option<String>,
}

/// Builds user prompt with rolling 2-turn follow-up context memory (resolving pronouns "this", "that", "це").
pub fn build_user_prompt_with_history(
    question: &str,
    recent_context: Option<&str>,
    recent_turns: Option<&[FollowUpContextTurn]>,
) -> String {
    let mut prompt = String::new();

    if let Some(turns) = recent_turns {
        if !turns.is_empty() {
            prompt.push_str("RECENT CONVERSATION TURNS (use to resolve follow-ups like \"Why?\", \"How would you scale that?\", pronouns \"this\"/\"that\"/\"це\"):\n");
            let slice = if turns.len() > 2 { &turns[turns.len() - 2..] } else { turns };
            for (i, t) in slice.iter().enumerate() {
                let ans = t.short_hook.as_deref().unwrap_or("").trim();
                let short_ans = if ans.len() > 160 { &ans[..160] } else { ans };
                prompt.push_str(&format!("Turn {} Q: {}\nTurn {} A: {}\n", i + 1, t.question.trim(), i + 1, short_ans));
            }
            prompt.push_str("\n");
        }
    } else if let Some(ctx) = recent_context {
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

/// Builds user prompt with rolling 2-turn follow-up context memory and continuation refinement.
pub fn build_user_prompt_with_continuation(
    question: &str,
    recent_context: Option<&str>,
    recent_turns: Option<&[FollowUpContextTurn]>,
    continuation_constraint: Option<&str>,
) -> String {
    let mut prompt = build_user_prompt_with_history(question, recent_context, recent_turns);
    if let Some(constraint) = continuation_constraint {
        let clean = constraint.trim();
        if !clean.is_empty() {
            prompt.push_str(&format!(
                "\n\n[CONTINUATION REFINEMENT: Keep the opening natural, and specifically address the newly added constraint: \"{}\"]",
                clean
            ));
        }
    }
    prompt
}

/// Builds the user prompt incorporating the detected question and recent sliding context.
pub fn build_user_prompt(question: &str, recent_context: Option<&str>) -> String {
    build_user_prompt_with_history(question, recent_context, None)
}

/// Builds an Emergency Instant Structured Coaching Card in standard 4-phase format.
/// Rendered when all network models are unavailable so the candidate always has a calm,
/// structured framework to speak from with a 1-click retry button.
pub fn build_emergency_coaching_card(language: Option<&str>) -> String {
    let lang = language.unwrap_or("en");
    let is_uk = lang.starts_with("uk") || lang.starts_with("bilingual");
    let is_ru = lang.starts_with("ru");

    if is_uk {
        r#"<<<META: System Architecture | Senior | uk>>>
<<<PHASE_1:HOOK>>>
Почніть відповідь упевнено за структурою STAR/CAR: дайте чітке визначення або тезу та опишіть практичний бізнес-контекст. (ШІ тимчасово не відповів, натисніть кнопку для миттєвого повтору).
<<<PHASE_2:PILLARS>>>
• **Архітектура та компоненти**: Окресліть призначення технології, ключові компоненти та потік даних.
• **Механізми під капотом**: Поясніть роботу з пам'яттю, конкурентністю, кешуванням, транзакціями чи мережею.
• **Trade-offs та Best Practices**: Наведіть плюси, мінуси, обмеження та альтернативні підходи.
<<<PHASE_3:DEEP_DIVE>>>
// [🔄 Повторити запит (1 клік)]
<<<END>>>"#.to_string()
    } else if is_ru {
        r#"<<<META: System Architecture | Senior | ru>>>
<<<PHASE_1:HOOK>>>
Начните ответ уверенно по структуре STAR/CAR: дайте чёткое определение или тезис и опишите практический бизнес-контекст. (ИИ временно задержал ответ, нажмите кнопку для быстрого повтора).
<<<PHASE_2:PILLARS>>>
• **Архитектура и компоненты**: Обозначьте назначение технологии, ключевые компоненты и поток данных.
• **Механизмы под капотом**: Объясните работу с памятью, конкурентностью, кэшированием или транзакциями.
• **Trade-offs и Best Practices**: Приведите плюсы, минусы, ограничения и альтернативные подходы.
<<<PHASE_3:DEEP_DIVE>>>
// [🔄 Повторить запрос (1 клик)]
<<<END>>>"#.to_string()
    } else {
        r#"<<<META: System Architecture | Senior | en>>>
<<<PHASE_1:HOOK>>>
Answer confidently using the STAR/CAR framework: state your core thesis and practical business context upfront. (AI connection timed out, click below to retry instantly).
<<<PHASE_2:PILLARS>>>
• **Core Architecture & Flow**: Define key system entities, data flow, and core responsibilities.
• **Under the Hood Mechanics**: Explain memory management, concurrency models, caching, or transaction guarantees.
• **Trade-offs & Production Scale**: Discuss bottlenecks, failure recovery, and architectural alternatives.
<<<PHASE_3:DEEP_DIVE>>>
// [🔄 Повторити запит (1 клік)]
<<<END>>>"#.to_string()
    }
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
        assert!(default_prompt.contains("<<<PHASE_4:TRAP>>>"));
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

        let explain_prompt = build_system_prompt_with_options(None, Some("explain_line"), None, None);
        assert!(explain_prompt.contains("MODIFIER: MICRO-EXPLAINER (EXPLAIN LINE)"));
        assert!(explain_prompt.contains("time and space complexity"));

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

        let continuation_prompt = build_user_prompt_with_continuation(
            "How would you design a rate limiter, assuming 50 regions?",
            None,
            None,
            Some("assuming 50 regions"),
        );
        assert!(continuation_prompt.contains("[CONTINUATION REFINEMENT: Keep the opening natural, and specifically address the newly added constraint: \"assuming 50 regions\"]"));
    }

    #[test]
    fn test_emergency_coaching_card() {
        let card_uk = build_emergency_coaching_card(Some("uk"));
        assert!(card_uk.contains("<<<PHASE_1:HOOK>>>"));
        assert!(card_uk.contains("Почніть відповідь упевнено за структурою STAR/CAR"));
        assert!(card_uk.contains("[🔄 Повторити запит (1 клік)]"));

        let card_en = build_emergency_coaching_card(Some("en"));
        assert!(card_en.contains("Answer confidently using the STAR/CAR framework"));
        assert!(card_en.contains("[🔄 Повторити запит (1 клік)]"));
    }

    #[test]
    fn test_patch_slot_prompts_and_token_budgets() {
        let spec = build_system_prompt_with_patch_slot(
            None,
            Some("normal"),
            Some("en"),
            None,
            Some("speculative_hook"),
            None,
        );
        assert!(spec.contains("MANDATORY SPECULATIVE HOOK MODE"));
        assert!(spec.contains("max 35 words"));

        let rest = build_system_prompt_with_patch_slot(
            None,
            Some("normal"),
            Some("en"),
            None,
            Some("rest_after_hook"),
            Some("In production I use token bucket with Redis Lua scripts."),
        );
        assert!(rest.contains("MANDATORY CONTINUATION AFTER PRE-DISPLAYED HOOK"));
        assert!(rest.contains("In production I use token bucket with Redis Lua scripts."));
        assert!(rest.contains("Start IMMEDIATELY at <<<PHASE_2:PILLARS>>>"));

        let deep = build_system_prompt_with_patch_slot(
            None,
            Some("code"),
            Some("en"),
            None,
            Some("deep_dive"),
            None,
        );
        assert!(deep.contains("MANDATORY SURGICAL SLOT PATCH (PHASE 3 ONLY)"));
        assert!(deep.contains("Output ONLY <<<PHASE_3:DEEP_DIVE>>>"));

        let hp = build_system_prompt_with_patch_slot(
            None,
            Some("shorter"),
            Some("en"),
            None,
            Some("hook_and_pillars"),
            None,
        );
        assert!(hp.contains("MANDATORY SURGICAL SLOT PATCH (PHASE 1 & PHASE 2 ONLY)"));

        assert_eq!(max_tokens_for_patch_slot(Some("speculative_hook"), None), 95);
        assert_eq!(max_tokens_for_patch_slot(Some("deep_dive"), Some("code")), 380);
        assert_eq!(max_tokens_for_patch_slot(Some("hook_and_pillars"), Some("shorter")), 260);
        assert_eq!(max_tokens_for_patch_slot(Some("full"), None), 850);
    }
}
