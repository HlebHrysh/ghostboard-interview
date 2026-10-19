use regex::Regex;
use std::sync::OnceLock;

/// Holds a compiled Regex pattern and its canonical technical replacement.
struct PhoneticRule {
    pattern: Regex,
    replacement: &'static str,
}

static RULES: OnceLock<Vec<PhoneticRule>> = OnceLock::new();
static RESTORE_REGEX: OnceLock<Regex> = OnceLock::new();

fn get_rules() -> &'static [PhoneticRule] {
    RULES.get_or_init(|| {
        let raw_rules: Vec<(&str, &'static str)> = vec![
            // ── Core Python & Runtime ─────────────────────────────────────────
            (r"(?i)\b(джил|гил|глобал[\s-]*интерпретер[\s-]*лок|г[\s.]*и[\s.]*л|global[\s-]*interpreter[\s-]*lock)\b", "GIL (Global Interpreter Lock)"),
            (r"(?i)\b(эм[\s-]*эр[\s-]*о|мро|м[\s.]*р[\s.]*о|method[\s-]*resolution[\s-]*order)\b", "MRO (Method Resolution Order / C3 Linearization)"),
            (r"(?i)\b(дандер(?:[а-яіїєґ]{0,3})?(?:[\s-]*(?:методи|методы|метод[а-яіїєґ]*))?|магические[\s-]*методы|магічні[\s-]*методи)\b", "Dunder methods (__init__, __call__, __repr__)"),
            (r"(?i)\b(пайтон[а-яіїєґ]*|пітон[а-яіїєґ]*)\b", "Python"),
            (r"(?i)\b(гарбидж[\s-]*коллектор|збирач[\s-]*сміття|сборщик[\s-]*мусора|референс[\s-]*каунтинг|підрахунок[\s-]*посилань)\b", "Garbage Collector & Reference Counting"),
            (r"(?i)\b(пайтесті|пайтест)\b", "pytest"),
            (r"(?i)\b(датаклас[иів]*|датаклассы)\b", "dataclass"),
            (r"(?i)\b(поетрі|поэтри)\b", "Poetry"),

            // ── Asyncio & Concurrency ─────────────────────────────────────────
            (r"(?i)\b(асінк[\s-]*авейт|асинк[\s-]*авейт|(?:асін[кц]|асин[кц])[а-яіїєґ]*)\b", "Asyncio (async/await)"),
            (r"(?i)\b(івент[\s-]*луп|івентлуп|евент[\s-]*луп|эвент[\s-]*луп)\b", "Event Loop (asyncio)"),
            (r"(?i)\b(газер|гезер|асинк[\s-]*газер)\b", "asyncio.gather"),
            (r"(?i)\b(таск[\s-]*груп)\b", "asyncio.TaskGroup"),
            (r"(?i)\b(корутин[иаы]|таск[иаы]|фьючерс[иы]?)\b", "Coroutine / Task / Future"),

            // ── Web Frameworks & APIs ─────────────────────────────────────────
            (r"(?i)\b(д[\s.]*р[\s.]*ф|дрф|джанго[\s-]*рест[а-яіїєґ]*|джанґо[\s-]*рест[а-яіїєґ]*)\b", "DRF (Django REST Framework)"),
            (r"(?i)\b(джанго|джанґо|джангі)[а-яіїєґ]*\b", "Django"),
            (r"(?i)\b(фаст[\s-]*апі|фастапі|фаст[\s-]*апи|фастапи|fast[\s-]*api)\b", "FastAPI"),
            (r"(?i)\b(підантік|пайдантік|пайдантик|пудантик|пайдентик|пайдантек)\b", "Pydantic v2"),
            (r"(?i)\b(ювікорн|ювикорн|увикорн)\b", "Uvicorn"),
            (r"(?i)\b(гунікорн|гуникорн)\b", "Gunicorn"),
            (r"(?i)\b(асгі|асги)\b", "ASGI"),
            (r"(?i)\b(всгі|всги)\b", "WSGI"),

            // ── Databases, SQL & Indexes ──────────────────────────────────────
            (r"(?i)\b(склалхімі[яї]|склалхимия|алхімія|алхимия|ескуель[\s-]*алхімія)\b", "SQLAlchemy"),
            (r"(?i)\b(postgres(?:ql)?|постгрес(?:кюель)?|посгрес|постгріс|постгрі|постгре)[а-яіїєґa-z]*\b", "PostgreSQL"),
            (r"(?i)\b(мвцц|м[\s.]*в[\s.]*ц[\s.]*ц|mvcc)\b", "MVCC (Multi-Version Concurrency Control)"),
            (r"(?i)\b(б[\s-]*трі|бі[\s-]*трі|б[\s-]*дерево|б[\s-]*три|би[\s-]*три)\b", "B-Tree Index"),
            (r"(?i)\b(джін[\s-]*індекс|гин[\s-]*индекс|gin[\s-]*index)\b", "GIN Index"),
            (r"(?i)\b(гіст[\s-]*індекс|гист[\s-]*индекс|gist[\s-]*index)\b", "GiST Index"),
            (r"(?i)\b(експлейн[\s-]*аналайз|эксплейн[\s-]*аналайз|explain[\s-]*analyze)\b", "EXPLAIN ANALYZE"),
            (r"(?i)\b(алембік[а-яіїєґ]*|алембик[а-яіїєґ]*)\b", "Alembic"),
            (r"(?i)\b(автовакуум|autovacuum)\b", "Autovacuum"),
            (r"(?i)\b(дедлок[иів]*|дедлоки|взаємне[\s-]*блокування)\b", "Deadlock"),
            (r"(?i)\b(пджібаунсер|пиджибаунсер|пгбаунсер|pgbouncer)\b", "PgBouncer"),

            // ── Messaging, Queues & Caching ───────────────────────────────────
            (r"(?i)\b(кафк[а-яіїєґ]*|кафц[іе][а-яіїєґ]*)\b", "Kafka"),
            (r"(?i)\b(селері|селери|селлери|целери|seleri)[а-яіїєґa-z]*\b", "Celery"),
            (r"(?i)\b(редіс|редис|redis)[а-яіїєґa-z]*\b", "Redis"),
            (r"(?i)\b(реббіт[\s-]*емкю|раббіт[а-яіїєґ]*|ребіт[а-яіїєґ]*)\b", "RabbitMQ"),
            (r"(?i)\b(лру[\s-]*кеш[а-яіїєґ]*|лру)\b", "LRU Cache"),

            // ── DevOps, Containers, Infrastructure & Networking ───────────────
            (r"(?i)\b(кубер|кубернетис|кубернетіс|k8s)[а-яіїєґa-z]*\b", "Kubernetes"),
            (r"(?i)\b(докер[а-яіїєґ]*)\b", "Docker"),
            (r"(?i)\b(енджинікс[а-яіїєґ]*|энджиникс[а-яіїєґ]*|нгінкс|нгинкс|engine[\s-]*x)\b", "NGINX"),
            (r"(?i)\b(вебсокет[а-яіїєґ]*|веб[\s-]*сокет[а-яіїєґ]*)\b", "WebSockets"),
            (r"(?i)\b(графкюель|граф[\s-]*кю[\s-]*ель|graphql)\b", "GraphQL"),
            (r"(?i)\b(жрпц|джрпц|грпц|grpc)\b", "gRPC"),
            (r"(?i)\b(терраформ[а-яіїєґ]*|тераформ[а-яіїєґ]*)\b", "Terraform"),
        ];

        raw_rules
            .into_iter()
            .filter_map(|(pat, rep)| {
                Regex::new(pat).ok().map(|pattern| PhoneticRule {
                    pattern,
                    replacement: rep,
                })
            })
            .collect()
    })
}

fn get_restore_regex() -> &'static Regex {
    RESTORE_REGEX.get_or_init(|| Regex::new(r"\x{E000}(\d+)\x{E001}").expect("valid restore regex"))
}

/// Normalizes spoken Ukrainian/Russian/English technical slang and misheard audio terms
/// into industry-standard canonical terminology.
///
/// Uses an opaque sentinel placeholder substitution (`\u{E000}{idx}\u{E001}`)
/// to eliminate recursive regex cascade collisions where expanded replacement terms
/// are inadvertently re-matched by subsequent rules.
pub fn normalize_technical_speech(text: &str) -> String {
    if text.trim().is_empty() {
        return text.to_string();
    }

    // Strip any raw private-use sentinel code points if present in input
    let clean_text = text.replace(['\u{E000}', '\u{E001}'], "");
    let mut normalized = clean_text;
    let mut sentinels: Vec<&'static str> = Vec::new();

    let rules = get_rules();
    for rule in rules {
        if !rule.pattern.is_match(&normalized) {
            continue;
        }

        let rep_str = rule.replacement;
        normalized = rule
            .pattern
            .replace_all(&normalized, |_caps: &regex::Captures| {
                let idx = sentinels.len();
                sentinels.push(rep_str);
                format!("\u{E000}{idx}\u{E001}")
            })
            .to_string();
    }

    // Terminal non-recursive restoration pass
    if !sentinels.is_empty() {
        let restore = get_restore_regex();
        normalized = restore
            .replace_all(&normalized, |caps: &regex::Captures| {
                if let Some(idx_match) = caps.get(1) {
                    if let Ok(idx) = idx_match.as_str().parse::<usize>() {
                        if let Some(val) = sentinels.get(idx) {
                            return val.to_string();
                        }
                    }
                }
                caps[0].to_string()
            })
            .to_string();
    }

    normalized
}

/// Checks whether a raw transcript chunk is mere conversational noise, throat-clearing,
/// or single-word confirmations that should NOT trigger AI generation.
pub fn is_filler_or_noise(text: &str) -> bool {
    let trimmed = text.trim();
    if trimmed.is_empty() {
        return true;
    }

    let clean: String = trimmed
        .to_lowercase()
        .chars()
        .filter(|c| !c.is_ascii_punctuation() && !matches!(c, '«' | '»' | '—' | '–'))
        .collect();

    let clean = clean.trim();
    if clean.chars().count() < 2 {
        return true;
    }

    const FILLERS: &[&str] = &[
        "так", "да", "ок", "окей", "ага", "угу", "ну", "ясно", "понятно", "добре", "хорошо",
        "хм", "гм", "алло", "привіт", "привет", "hello", "hi", "yes", "yeah", "yep", "okay",
        "sure", "fine", "cool", "nice", "right", "got it", "зрозумів", "понял", "слухаю", "слушаю",
        "так так", "да да", "ну да", "ну так", "чути", "чутно", "чути мене", "чутно мене",
        "чи чути", "чи чутно", "чи чути мене", "чи чутно мене", "hmm", "um",
    ];

    FILLERS.iter().any(|&f| f == clean)
}

/// Extracted target question with conversational transition preamble removed.
#[derive(Debug, Clone, PartialEq)]
pub struct ExtractedQuestionTarget {
    pub isolated_question: String,
    pub context_preamble: String,
    pub has_transition_marker: bool,
}

/// Isolates the active technical interview question from continuous conversational preamble
/// (e.g. "Дякую за відповідь по Celery. А тепер наступне питання: як працює GIL у Python?").
pub fn isolate_target_question_heuristics(raw_text: &str) -> ExtractedQuestionTarget {
    let text = raw_text.trim();
    if text.is_empty() {
        return ExtractedQuestionTarget {
            isolated_question: String::new(),
            context_preamble: String::new(),
            has_transition_marker: false,
        };
    }

    // Explicit transition markers
    static TRANSITION_PATTERNS: OnceLock<Vec<Regex>> = OnceLock::new();
    let patterns = TRANSITION_PATTERNS.get_or_init(|| {
        vec![
            Regex::new(r"(?i)\b(?:наступне(?:\s+таке)?\s+питання[:\s]*)").unwrap(),
            Regex::new(r"(?i)\b(?:інше\s+питання[:\s]*)").unwrap(),
            Regex::new(r"(?i)\b(?:давай(?:\s+тепер)?\s+далі[:\s]*)").unwrap(),
            Regex::new(r"(?i)\b(?:перейдемо\s+до[:\s]*)").unwrap(),
            Regex::new(r"(?i)\b(?:а\s+тепер\s+(?:розкажи|поясни|скажи|опиши|як|що|чому))").unwrap(),
            Regex::new(r"(?i)\b(?:питання\s+таке[:\s]*)").unwrap(),
            Regex::new(r"(?i)\b(?:следующий(?:\s+такой)?\s+вопрос[:\s]*)").unwrap(),
            Regex::new(r"(?i)\b(?:перейдем\s+к[:\s]*)").unwrap(),
            Regex::new(r"(?i)\b(?:а\s+теперь\s+(?:расскажи|объясни|скажи|опиши|как|что|почему))").unwrap(),
            Regex::new(r"(?i)\b(?:next\s+question[:\s]*)").unwrap(),
            Regex::new(r"(?i)\b(?:moving\s+on[:\s]*)").unwrap(),
            Regex::new(r"(?i)\b(?:let's\s+talk\s+about[:\s]*)").unwrap(),
        ]
    });

    let mut best_match_idx: Option<usize> = None;
    for pattern in patterns {
        if let Some(m) = pattern.find(text) {
            match best_match_idx {
                None => best_match_idx = Some(m.start()),
                Some(prev) if m.start() > prev => best_match_idx = Some(m.start()),
                _ => {}
            }
        }
    }

    if let Some(idx) = best_match_idx {
        let preamble = text[..idx].trim().to_string();
        let target = text[idx..].trim().to_string();
        let word_count = target.split_whitespace().count();
        if word_count >= 3 {
            return ExtractedQuestionTarget {
                isolated_question: target,
                context_preamble: preamble,
                has_transition_marker: true,
            };
        }
    }

    ExtractedQuestionTarget {
        isolated_question: text.to_string(),
        context_preamble: String::new(),
        has_transition_marker: false,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_normalizer_kubernetes() {
        assert_eq!(
            normalize_technical_speech("Як розгорнути сервіс у кубернетис?"),
            "Як розгорнути сервіс у Kubernetes?"
        );
        assert_eq!(
            normalize_technical_speech("Ми використовуємо кубер для оркестрації"),
            "Ми використовуємо Kubernetes для оркестрації"
        );
    }

    #[test]
    fn test_normalizer_postgresql() {
        assert_eq!(
            normalize_technical_speech("Які рівні ізоляції транзакцій у постгресі?"),
            "Які рівні ізоляції транзакцій у PostgreSQL?"
        );
        assert_eq!(
            normalize_technical_speech("Робота з постгресом і індексами"),
            "Робота з PostgreSQL і індексами"
        );
    }

    #[test]
    fn test_normalizer_fastapi() {
        assert_eq!(
            normalize_technical_speech("Як працює dependency injection у фастапі?"),
            "Як працює dependency injection у FastAPI?"
        );
        assert_eq!(
            normalize_technical_speech("Ми перейшли на фаст апи"),
            "Ми перейшли на FastAPI"
        );
    }

    #[test]
    fn test_normalizer_gil() {
        assert_eq!(
            normalize_technical_speech("Поясни як джил впливає на багатопотоковість"),
            "Поясни як GIL (Global Interpreter Lock) впливає на багатопотоковість"
        );
        assert_eq!(
            normalize_technical_speech("Що таке гил у CPython?"),
            "Що таке GIL (Global Interpreter Lock) у CPython?"
        );
    }

    #[test]
    fn test_normalizer_websockets() {
        assert_eq!(
            normalize_technical_speech("Чи підтримує клієнт вебсокети?"),
            "Чи підтримує клієнт WebSockets?"
        );
        assert_eq!(
            normalize_technical_speech("Підключення через веб-сокет"),
            "Підключення через WebSockets"
        );
    }

    #[test]
    fn test_normalizer_kafka() {
        assert_eq!(
            normalize_technical_speech("Як масштабувати партиції в кафці?"),
            "Як масштабувати партиції в Kafka?"
        );
        assert_eq!(
            normalize_technical_speech("Повідомлення записуються в кафку"),
            "Повідомлення записуються в Kafka"
        );
    }

    #[test]
    fn test_normalizer_redis() {
        assert_eq!(
            normalize_technical_speech("Кешування сесій у редіс"),
            "Кешування сесій у Redis"
        );
        assert_eq!(
            normalize_technical_speech("Скидання ttl у редисі"),
            "Скидання ttl у Redis"
        );
    }

    #[test]
    fn test_normalizer_docker_nginx() {
        assert_eq!(
            normalize_technical_speech("Збірка мультистейдж образу в докер"),
            "Збірка мультистейдж образу в Docker"
        );
        assert_eq!(
            normalize_technical_speech("Налаштування реверс проксі через енджинікс"),
            "Налаштування реверс проксі через NGINX"
        );
    }

    #[test]
    fn test_no_cascade_corruption() {
        // "GIL (Global Interpreter Lock)" contains "Lock", which could mistakenly be rematched
        // if sentinels were not used.
        let input = "Поясни джил і мро";
        let output = normalize_technical_speech(input);
        assert_eq!(
            output,
            "Поясни GIL (Global Interpreter Lock) і MRO (Method Resolution Order / C3 Linearization)"
        );
    }

    #[test]
    fn test_filler_filter() {
        assert!(is_filler_or_noise("так"));
        assert!(is_filler_or_noise("ок"));
        assert!(is_filler_or_noise("угу"));
        assert!(is_filler_or_noise("hello"));
        assert!(is_filler_or_noise("чи чутно мене?"));
        assert!(!is_filler_or_noise("Як влаштований MRO в Python?"));
    }

    #[test]
    fn test_transition_isolation() {
        let text = "Дякую, все зрозуміло. Наступне питання: розкажи про індекси в PostgreSQL";
        let res = isolate_target_question_heuristics(text);
        assert!(res.has_transition_marker);
        assert!(res.isolated_question.starts_with("Наступне питання"));
        assert_eq!(res.context_preamble, "Дякую, все зрозуміло.");
    }
}
