import type { SupportedLocale } from './geoLang';

export const LANDING_COPY: Record<SupportedLocale, any> = {
  "ua": {
    "nav": {
      "features": "МОЖЛИВОСТІ",
      "demo": "ДЕМО",
      "comparison": "ПОРІВНЯННЯ",
      "pricing": "ТАРИФИ",
      "login": "УВІЙТИ",
      "start": "СТАРТ →"
    },
    "hero": {
      "badge": "AI Teleprompter & Live Performance Coach · Співбесіди та Стендапи",
      "line1": "Твій наступний",
      "line2": "технічний оффер",
      "line3": "за 1.5 секунди.",
      "line3_sub": "Щоразу.",
      "desc": "Deepgram розпізнає мову інтерв'юера за 0.4с → Gemini Flash генерує структуровану Senior-відповідь. Зручний інтерфейс телесуфлера для подолання мовного бар'єру та тривожності. Власних API-ключів не потрібно.",
      "cta_start": "СТАРТ БЕЗКОШТОВНО",
      "cta_demo": "ДИВИТИСЯ ДЕМО",
      "stat_sessions": "Сесій",
      "stat_rules": "Правил",
      "stat_stealth": "Захист приватності"
    },
    "tickers": {
      "t1": [
        "FREEZE MODE · Зупиніть час на інтерв'ю",
        "1.4С GEMINI 2.5 FLASH",
        "SCREEN OCR · Аналіз коду за F9",
        "116+ IT-ФОНЕТИЧНИХ ПРАВИЛ",
        "PRIVACY SHIELD · ШВИДКИЙ ФОКУС [ESC]",
        "HUD TELEPROMPTER · 2-Й ЕКРАН",
        "ZERO SETUP · ВЛАСНІ API НЕ ПОТРІБНІ",
        "$15/МІС · АБО $79 LIFETIME"
      ],
      "t2": [
        "SENIOR PYTHON / GO / RUST / REACT",
        "БЕЗ ЗАТРИМОК У ВІДПОВІДЯХ",
        "ДОПОМОГА ПРИ МОВНОМУ БАР'ЄРІ ТА СТРЕСІ",
        "15 ХВ ДЕМО-ТЕСТ БЕЗ ОБМЕЖЕНЬ",
        "АВТОМАТИЧНИЙ ЗАХИСТ ВІД ШУМУ",
        "ПІДТРИМКА 10+ МОВ (UA / EN / DE / PL / FR)"
      ]
    },
    "demo": {
      "label": "Інтерактивна Симуляція",
      "title": "Як це виглядає під час дзвінка",
      "desc": "Натисніть SPACE або кнопку Freeze Mode — відповіді фіксуються, поки ви спокійно читаєте. ШІ продовжує слухати у фоні.",
      "f1": "Deepgram STT розпізнає за 0.4с",
      "f2": "Gemini 2.5 Flash генерує за 1.35с",
      "f3": "Freeze Mode [Space] — пауза без паніки",
      "f4": "116+ IT-фонетичних правил нормалізації",
      "active_session": "ACTIVE SESSION · 08:24",
      "freeze_active": "🧊 FREEZE ACTIVE",
      "freeze_idle": "[ SPACE ] FREEZE",
      "reset": "↺ RESET",
      "question_tag": "🎙 Запитання тімліда · Python & DB · розпізнано за 0.4с",
      "question_text": "«Як у PostgreSQL працює MVCC при високому навантаженні на UPDATE, і чим небезпечний table bloat у з'єднанні з autovacuum?»",
      "ai_tag": "⚡ Gemini 2.5 Flash · 1.35с",
      "level": "SENIOR L5",
      "lead": "При UPDATE у PostgreSQL рядок не перезаписується — створюється нова версія кортежу (dead tuple):",
      "points": [
        {
          "tag": "TABLE BLOAT",
          "body": "Виникає, коли autovacuum не встигає очищати dead tuples через довгі транзакції або неефективні vacuum threshold settings."
        },
        {
          "tag": "HOT OPTIMIZATION",
          "body": "Новий рядок поміщається на ту ж дискову сторінку без оновлення індексів — якщо індексовані колонки не змінювалися."
        },
        {
          "tag": "PRODUCTION FIX",
          "body": "Тюнінг autovacuum_vacuum_scale_factor=0.05 + pg_repack без блокування читання."
        }
      ],
      "tip": "💡 Підкресліть HOT-оновлення — це одразу покаже Senior рівень знання сховища",
      "generating": "генерую...",
      "m_speed": "Швидкість",
      "m_acc": "Точність",
      "m_level": "Рівень"
    },
    "features": {
      "label": "Архітектура",
      "title": "Шість рівнів переваги",
      "subtitle": "Кожна технологія вирішує конкретну больову точку технічного інтерв'ю",
      "c1_tag": "01 / FREEZE MODE",
      "c1_badge": "[SPACE]",
      "c1_title": "Зупиніть потік. Жодної паніки.",
      "c1_desc": "Пробіл миттєво фіксує підказку на екрані. Спокійно читайте тези, зберігаючи природний погляд у камеру. ШІ продовжує слухати дзвінок у фоні.",
      "c1_status": "ШІ слухає у фоні · +2 запитання в черзі",
      "c2_tag": "02 / SCREEN OCR",
      "c2_title": "Gemini бачить ваш код на екрані",
      "c2_desc": "Клавіша F9 запускає миттєвий аналіз коду: алгоритми, асимптотика Big-O, помилки синтаксису та підводні камені.",
      "c2_status": "O(n log n) · Крайовий випадок: Empty Slice",
      "c3_tag": "03 / PANIC SHIELD",
      "c3_title": "Миттєве маскування екрана [Esc]",
      "c3_desc": "Одне натискання перетворює весь інтерфейс на справжній термінал Linux із пройденими юніт-тестами.",
      "c4_tag": "04 / IT PHONETICS",
      "c4_title": "116+ IT-фонетичних правил",
      "c4_desc": "Нормалізує розмовний сленг розробників: «постгрес» → PostgreSQL, «селері» → Celery, «горутіни» → Go Routines.",
      "c5_tag": "05 / HUD TELEPROMPTER",
      "c5_title": "2-й екран або планшет",
      "c5_desc": "Синхронізація через локальну мережу за технологією SSE без затримок. Відкривайте телесуфлер на смартфоні чи планшеті.",
      "c5_status": "SSE Потік · Затримка <15мс",
      "c6_tag": "06 / ZERO SETUP",
      "c6_title": "Власні API-ключі не потрібні",
      "c6_desc": "Deepgram і Gemini повністю інтегровані на наших швидких серверах. Жодних лімітів чи складних налаштувань. Увійдіть і починайте.",
      "c6_cta": "СПРОБУВАТИ БЕЗКОШТОВНО →"
    },
    "comparison": {
      "label": "Порівняння ринку",
      "title": "Чому розробники обирають Ghostboard",
      "col_product": "Продукт",
      "col_price": "Вартість",
      "col_speed": "Швидкість",
      "col_freeze": "Freeze",
      "col_ocr": "OCR",
      "col_nokeys": "Без API-ключів",
      "yes": "Так",
      "no": "Ні"
    },
    "pricing": {
      "label": "Прозорі тарифи",
      "title": "Інвестиція в один вдалий оффер",
      "subtitle": "Без прихованих оплат · Без потреби налаштовувати API-ключі",
      "monthly": "Щомісячно",
      "annual": "Річний",
      "discount": "−17%",
      "per_month": "/ місяць",
      "one_time": "одноразово",
      "free_tier": "Стартовий",
      "free_badge": "демо-тест 15 хвилин",
      "free_cta": "ПОЧАТИ БЕЗКОШТОВНО",
      "pro_tier": "Безліміт",
      "pro_badge": "ХІТ ПРОДАЖІВ",
      "pro_cta": "ОТРИМАТИ PRO PASS →",
      "life_tier": "Lifetime",
      "life_cta": "ОТРИМАТИ НАЗАВЖДИ",
      "free_features": [
        "15 хв тестова сесія",
        "Real-time Deepgram STT",
        "Freeze Mode [Space]",
        "Мобільний тренажер питань"
      ],
      "pro_features": [
        "Необмежені сесії співбесід",
        "OCR аналіз коду з екрана [F9]",
        "Телесуфлер для другого екрана",
        "Бліц-режим відповідей [Q]",
        "Privacy Shield [Esc]",
        "Індивідуальна підгонка під резюме"
      ],
      "life_features": [
        "Всі функції Pro назавжди",
        "Ранній доступ до нових ШІ-моделей",
        "Пріоритетна черга генерації",
        "Закрите ком'юніті у Discord"
      ]
    },
    "reviews": [
      {
        "quote": "ШІ помітив крайовий випадок off-by-one на моєму екрані ще до того, як інтерв'юер встиг це сказати.",
        "author": "Марія Л.",
        "role": "React Lead",
        "result": "Оффер у міжнародний SaaS"
      },
      {
        "quote": "Freeze Mode дає залізобетонний спокій. Тиснеш пробіл, дивишся прямо в камеру і звучиш абсолютно впевнено.",
        "author": "Дмитро Т.",
        "role": "Backend Engineer",
        "result": "Senior у Fintech, Варшава"
      },
      {
        "quote": "Отримав оффер на US ремоут через 4 дні після першого тренування. Швидкість 1.4с вражає.",
        "author": "Олексій К.",
        "role": "Senior Python",
        "result": "Оффер за 4 дні"
      }
    ],
    "cta": {
      "title_part1": "Готові забрати свій ",
      "title_accent": "оффер мрії?",
      "title_part2": "",
      "btn": "ПОЧАТИ ПЕРШУ СЕСІЮ →",
      "login": "Вже є акаунт? Увійти",
      "sub": "15 хв демо-тест · Без банківської картки · Без власних API-ключів"
    },
    "footer": {
      "privacy": "Конфіденційність",
      "terms": "Умови",
      "settings": "Налаштування",
      "workspace": "Робочий простір Copilot →"
    }
  },
  "en": {
    "nav": {
      "features": "FEATURES",
      "demo": "DEMO",
      "comparison": "COMPARISON",
      "pricing": "PRICING",
      "login": "SIGN IN",
      "start": "START →"
    },
    "hero": {
      "badge": "AI Teleprompter & Live Performance Coach · Technical Interviews & Standups",
      "line1": "Your Next",
      "line2": "Technical Offer",
      "line3": "in 1.5 seconds.",
      "line3_sub": "Every time.",
      "desc": "Deepgram transcribes the interviewer in 0.4s → Gemini Flash crafts a structured Senior-level answer. Ergonomic teleprompter HUD to overcome language barriers and interview anxiety. Zero API keys required.",
      "cta_start": "START FOR FREE",
      "cta_demo": "VIEW DEMO",
      "stat_sessions": "Sessions",
      "stat_rules": "Rules",
      "stat_stealth": "Privacy Protection"
    },
    "tickers": {
      "t1": [
        "FREEZE MODE · Stop time during interviews",
        "1.4S GEMINI 2.5 FLASH",
        "SCREEN OCR · Instant code analysis with F9",
        "116+ IT PHONETIC NORMALIZATION RULES",
        "PRIVACY SHIELD · ШВИДКИЙ ФОКУС [ESC] TERMINAL",
        "HUD TELEPROMPTER · DUAL-SCREEN / TABLET SYNC",
        "ZERO SETUP · NO PERSONAL API KEYS NEEDED",
        "$15/MO · OR $79 LIFETIME PASS"
      ],
      "t2": [
        "SENIOR PYTHON / GO / RUST / REACT",
        "ZERO-LATENCY ARCHITECTURAL ANSWERS",
        "OVERCOME LANGUAGE BARRIERS & ANXIETY",
        "15 MIN FREE DEMO SANDBOX",
        "AUTOMATIC ACOUSTIC NOISE GATE",
        "GLOBAL 10+ LANGUAGES SUPPORT"
      ]
    },
    "demo": {
      "label": "Interactive Simulation",
      "title": "Live Call Experience",
      "desc": "Press SPACE or toggle Freeze Mode — answers lock in place while you deliver clearly to camera. AI continues listening in the background.",
      "f1": "Deepgram STT transcribes in 0.4s",
      "f2": "Gemini 2.5 Flash answers in 1.35s",
      "f3": "Freeze Mode [Space] — pause without panic",
      "f4": "116+ phonetic normalization rules",
      "active_session": "ACTIVE SESSION · 08:24",
      "freeze_active": "🧊 FREEZE ACTIVE",
      "freeze_idle": "[ SPACE ] FREEZE",
      "reset": "↺ RESET",
      "question_tag": "🎙 Lead Architect Question · Python & DB · Transcribed in 0.4s",
      "question_text": "“How does PostgreSQL MVCC handle heavy UPDATE loads, and what makes table bloat dangerous when paired with autovacuum latency?”",
      "ai_tag": "⚡ Gemini 2.5 Flash · 1.35s",
      "level": "SENIOR L5",
      "lead": "During PostgreSQL UPDATEs, rows are never overwritten in place — a new tuple version is written, leaving the old one dead:",
      "points": [
        {
          "tag": "TABLE BLOAT",
          "body": "Occurs when autovacuum fails to keep up with dead tuples due to long-running transactions or conservative vacuum scale factor thresholds."
        },
        {
          "tag": "HOT OPTIMIZATION",
          "body": "Heap-Only Tuples place the new row on the exact same page without rewriting secondary indexes (provided indexed columns didn't change)."
        },
        {
          "tag": "PRODUCTION FIX",
          "body": "Tune autovacuum_vacuum_scale_factor=0.05 on write-heavy tables + schedule online pg_repack without read locks."
        }
      ],
      "tip": "💡 Emphasize Heap-Only Tuples (HOT) — instant Senior signal for PostgreSQL internals",
      "generating": "generating...",
      "m_speed": "Latency",
      "m_acc": "Accuracy",
      "m_level": "Level"
    },
    "features": {
      "label": "Architecture",
      "title": "Six Levels of Advantage",
      "subtitle": "Every capability solves an exact high-stakes interview friction point",
      "c1_tag": "01 / FREEZE MODE",
      "c1_badge": "[SPACE]",
      "c1_title": "Pause the stream. Zero panic.",
      "c1_desc": "Tap Space — the teleprompter freezes instantly. Read bullet points naturally while making eye contact. The AI queues new questions in the background.",
      "c1_status": "AI listening in background · +2 questions queued",
      "c2_tag": "02 / SCREEN OCR",
      "c2_title": "Gemini sees your code",
      "c2_desc": "Hit F9 — Gemini Vision instantly parses algorithms, time complexity, syntax pitfalls, and hidden edge cases.",
      "c2_status": "O(n log n) · Edge case: Empty Slice",
      "c3_tag": "03 / PANIC SHIELD",
      "c3_title": "Single ESC Emergency Shield",
      "c3_desc": "One keypress transforms your screen into an authentic Linux bash window running passing unit tests.",
      "c4_tag": "04 / IT PHONETICS",
      "c4_title": "116+ Phonetic IT Rules",
      "c4_desc": "Normalizes spoken jargon: 'postgres' → PostgreSQL, 'celery' → Celery, 'goroutines' → Go Routines. Seamless multilingual detection.",
      "c5_tag": "05 / HUD TELEPROMPTER",
      "c5_title": "2-nd Screen or Tablet HUD",
      "c5_desc": "Zero-latency LAN Server-Sent Events sync. Open the prompter on your iPad or secondary phone with instant realtime feed.",
      "c5_status": "SSE Stream · Zero Latency",
      "c6_tag": "06 / ZERO SETUP",
      "c6_title": "Zero API keys required.",
      "c6_desc": "Deepgram and Gemini are managed securely on our backend. No quota limits, no billing headaches. Sign in and start immediately.",
      "c6_cta": "TRY NOW →"
    },
    "comparison": {
      "label": "Market Benchmark",
      "title": "Why Engineers Choose Ghostboard",
      "col_product": "Product",
      "col_price": "Price",
      "col_speed": "Latency",
      "col_freeze": "Freeze",
      "col_ocr": "OCR",
      "col_nokeys": "No API Keys",
      "yes": "Yes",
      "no": "No"
    },
    "pricing": {
      "label": "Transparent Pricing",
      "title": "An Investment in One Great Offer",
      "subtitle": "Zero hidden charges · Zero API setup friction",
      "monthly": "Monthly",
      "annual": "Annual",
      "discount": "−17%",
      "per_month": "/ month",
      "one_time": "one-time",
      "free_tier": "Starter",
      "free_badge": "15-minute live demo",
      "free_cta": "START FOR FREE",
      "pro_tier": "Unlimited",
      "pro_badge": "MOST POPULAR",
      "pro_cta": "GET PRO PASS →",
      "life_tier": "Lifetime",
      "life_cta": "GET LIFETIME PASS",
      "free_features": [
        "15 min live demo session",
        "Real-time Deepgram STT",
        "Freeze Mode [Space]",
        "Mobile Question Simulator"
      ],
      "pro_features": [
        "Unlimited live interview sessions",
        "Screen & Code OCR [F9]",
        "Dual-screen HUD teleprompter",
        "Blitz answer mode [Q]",
        "Privacy Shield [Esc]",
        "Personalized CV context tuning"
      ],
      "life_features": [
        "All Pro features forever",
        "Early access to next-gen AI models",
        "Priority inference queue",
        "Private Discord mastermind"
      ]
    },
    "reviews": [
      {
        "quote": "The live code OCR caught an off-by-one edge case on my screen before the interviewer even mentioned it.",
        "author": "Maria L.",
        "role": "React Lead",
        "result": "Offer @ International SaaS"
      },
      {
        "quote": "Freeze Mode gives bulletproof calm. You tap space, look directly at the webcam, and sound completely composed.",
        "author": "Dmytro T.",
        "role": "Backend Engineer",
        "result": "Senior @ Fintech, Warsaw"
      },
      {
        "quote": "Landed my US remote offer 4 days after my first practice session. The 1.4s response speed is incredible.",
        "author": "Oleksiy K.",
        "role": "Senior Python",
        "result": "Offer in 4 days"
      }
    ],
    "cta": {
      "title_part1": "Ready to land your ",
      "title_accent": "dream offer?",
      "title_part2": "",
      "btn": "START YOUR FIRST SESSION →",
      "login": "Already have an account? Sign In",
      "sub": "15 min demo · No credit card required · No personal API keys needed"
    },
    "footer": {
      "privacy": "Privacy",
      "terms": "Terms",
      "settings": "Settings",
      "workspace": "Copilot Workspace →"
    }
  },
  "pl": {
    "nav": {
      "features": "MOŻLIWOŚCI",
      "demo": "DEMO",
      "comparison": "PORÓWNANIE",
      "pricing": "CENNIK",
      "login": "ZALOGUJ SIĘ",
      "start": "START →"
    },
    "hero": {
      "badge": "Teleprompter AI i Trener na Żywo · Rozmowy i Standupy",
      "line1": "Twoja Następna",
      "line2": "Oferta Pracy",
      "line3": "w 1,5 sekundy.",
      "line3_sub": "Za każdym razem.",
      "desc": "Deepgram transkrybuje pytania w 0.4s → Gemini Flash generuje ustrukturyzowaną odpowiedź Seniora. Wygodny teleprompter ułatwiający pokonanie bariery językowej i stresu. Własne klucze API nie są potrzebne.",
      "cta_start": "ZACZNIJ ZA DARMO",
      "cta_demo": "ZOBACZ DEMO",
      "stat_sessions": "Sesji",
      "stat_rules": "Zasad",
      "stat_stealth": "Ochrona prywatności"
    },
    "tickers": {
      "t1": [
        "FREEZE MODE · Stop time during interviews",
        "1.4S GEMINI 2.5 FLASH",
        "SCREEN OCR · Instant code analysis with F9",
        "116+ IT PHONETIC NORMALIZATION RULES",
        "PRIVACY SHIELD · ШВИДКИЙ ФОКУС [ESC] TERMINAL",
        "HUD TELEPROMPTER · DUAL-SCREEN / TABLET SYNC",
        "ZERO SETUP · NO PERSONAL API KEYS NEEDED",
        "$15/MO · OR $79 LIFETIME PASS"
      ],
      "t2": [
        "SENIOR PYTHON / GO / RUST / REACT",
        "ZERO-LATENCY ARCHITECTURAL ANSWERS",
        "OVERCOME LANGUAGE BARRIERS & ANXIETY",
        "15 MIN FREE DEMO SANDBOX",
        "AUTOMATIC ACOUSTIC NOISE GATE",
        "GLOBAL 10+ LANGUAGES SUPPORT"
      ]
    },
    "demo": {
      "label": "Interactive Simulation",
      "title": "Live Call Experience",
      "desc": "Press SPACE or toggle Freeze Mode — answers lock in place while you deliver clearly to camera. AI continues listening in the background.",
      "f1": "Deepgram STT transcribes in 0.4s",
      "f2": "Gemini 2.5 Flash answers in 1.35s",
      "f3": "Freeze Mode [Space] — pause without panic",
      "f4": "116+ phonetic normalization rules",
      "active_session": "ACTIVE SESSION · 08:24",
      "freeze_active": "🧊 FREEZE ACTIVE",
      "freeze_idle": "[ SPACE ] FREEZE",
      "reset": "↺ RESET",
      "question_tag": "🎙 Lead Architect Question · Python & DB · Transcribed in 0.4s",
      "question_text": "“How does PostgreSQL MVCC handle heavy UPDATE loads, and what makes table bloat dangerous when paired with autovacuum latency?”",
      "ai_tag": "⚡ Gemini 2.5 Flash · 1.35s",
      "level": "SENIOR L5",
      "lead": "During PostgreSQL UPDATEs, rows are never overwritten in place — a new tuple version is written, leaving the old one dead:",
      "points": [
        {
          "tag": "TABLE BLOAT",
          "body": "Occurs when autovacuum fails to keep up with dead tuples due to long-running transactions or conservative vacuum scale factor thresholds."
        },
        {
          "tag": "HOT OPTIMIZATION",
          "body": "Heap-Only Tuples place the new row on the exact same page without rewriting secondary indexes (provided indexed columns didn't change)."
        },
        {
          "tag": "PRODUCTION FIX",
          "body": "Tune autovacuum_vacuum_scale_factor=0.05 on write-heavy tables + schedule online pg_repack without read locks."
        }
      ],
      "tip": "💡 Emphasize Heap-Only Tuples (HOT) — instant Senior signal for PostgreSQL internals",
      "generating": "generating...",
      "m_speed": "Latency",
      "m_acc": "Accuracy",
      "m_level": "Level"
    },
    "features": {
      "label": "Architektura",
      "title": "Sześć Poziomów Przewagi",
      "subtitle": "Każda funkcja rozwiązuje konkretny problem podczas trudnej rozmowy rekrutacyjnej",
      "c1_tag": "01 / FREEZE MODE",
      "c1_badge": "[SPACE]",
      "c1_title": "Zatrzymaj strumień. Zero paniki.",
      "c1_desc": "Tap Space — the teleprompter freezes instantly. Read bullet points naturally while making eye contact. The AI queues new questions in the background.",
      "c1_status": "AI listening in background · +2 questions queued",
      "c2_tag": "02 / SCREEN OCR",
      "c2_title": "Gemini widzi Twój kod",
      "c2_desc": "Hit F9 — Gemini Vision instantly parses algorithms, time complexity, syntax pitfalls, and hidden edge cases.",
      "c2_status": "O(n log n) · Edge case: Empty Slice",
      "c3_tag": "03 / PANIC SHIELD",
      "c3_title": "Błyskawiczna tarcza [Esc]",
      "c3_desc": "One keypress transforms your screen into an authentic Linux bash window running passing unit tests.",
      "c4_tag": "04 / IT PHONETICS",
      "c4_title": "116+ reguł fonetycznych IT",
      "c4_desc": "Normalizes spoken jargon: 'postgres' → PostgreSQL, 'celery' → Celery, 'goroutines' → Go Routines. Seamless multilingual detection.",
      "c5_tag": "05 / HUD TELEPROMPTER",
      "c5_title": "Drugi ekran lub tablet",
      "c5_desc": "Zero-latency LAN Server-Sent Events sync. Open the prompter on your iPad or secondary phone with instant realtime feed.",
      "c5_status": "SSE Stream · Zero Latency",
      "c6_tag": "06 / ZERO SETUP",
      "c6_title": "Nie wymaga kluczy API",
      "c6_desc": "Deepgram and Gemini are managed securely on our backend. No quota limits, no billing headaches. Sign in and start immediately.",
      "c6_cta": "TRY NOW →"
    },
    "comparison": {
      "label": "Market Benchmark",
      "title": "Why Engineers Choose Ghostboard",
      "col_product": "Product",
      "col_price": "Price",
      "col_speed": "Latency",
      "col_freeze": "Freeze",
      "col_ocr": "OCR",
      "col_nokeys": "No API Keys",
      "yes": "Yes",
      "no": "No"
    },
    "pricing": {
      "label": "Przejrzysty cennik",
      "title": "Inwestycja w jedną świetną ofertę",
      "subtitle": "Zero ukrytych opłat · Zero konfiguracji kluczy API",
      "monthly": "Miesięcznie",
      "annual": "Rocznie",
      "discount": "−17%",
      "per_month": "/ month",
      "one_time": "one-time",
      "free_tier": "Starter",
      "free_badge": "15-minute live demo",
      "free_cta": "ZACZNIJ ZA DARMO",
      "pro_tier": "Unlimited",
      "pro_badge": "MOST POPULAR",
      "pro_cta": "KUP PRO PASS →",
      "life_tier": "Lifetime",
      "life_cta": "KUP NA ZAWSZE",
      "free_features": [
        "15 min live demo session",
        "Real-time Deepgram STT",
        "Freeze Mode [Space]",
        "Mobile Question Simulator"
      ],
      "pro_features": [
        "Unlimited live interview sessions",
        "Screen & Code OCR [F9]",
        "Dual-screen HUD teleprompter",
        "Blitz answer mode [Q]",
        "Privacy Shield [Esc]",
        "Personalized CV context tuning"
      ],
      "life_features": [
        "All Pro features forever",
        "Early access to next-gen AI models",
        "Priority inference queue",
        "Private Discord mastermind"
      ]
    },
    "reviews": [
      {
        "quote": "The live code OCR caught an off-by-one edge case on my screen before the interviewer even mentioned it.",
        "author": "Maria L.",
        "role": "React Lead",
        "result": "Offer @ International SaaS"
      },
      {
        "quote": "Freeze Mode gives bulletproof calm. You tap space, look directly at the webcam, and sound completely composed.",
        "author": "Dmytro T.",
        "role": "Backend Engineer",
        "result": "Senior @ Fintech, Warsaw"
      },
      {
        "quote": "Landed my US remote offer 4 days after my first practice session. The 1.4s response speed is incredible.",
        "author": "Oleksiy K.",
        "role": "Senior Python",
        "result": "Offer in 4 days"
      }
    ],
    "cta": {
      "title_part1": "Gotowy na zdobycie ",
      "title_accent": "oferty marzeń?",
      "title_part2": "",
      "btn": "ROZPOCZNIJ PIERWSZĄ SESJĘ →",
      "login": "Masz już konto? Zaloguj się",
      "sub": "15 min demo · Bez karty kredytowej · Bez własnych kluczy API"
    },
    "footer": {
      "privacy": "Prywatność",
      "terms": "Regulamin",
      "settings": "Ustawienia",
      "workspace": "Panel Copilota →"
    }
  },
  "de": {
    "nav": {
      "features": "FUNKTIONEN",
      "demo": "DEMO",
      "comparison": "VERGLEICH",
      "pricing": "PREISE",
      "login": "ANMELDEN",
      "start": "STARTEN →"
    },
    "hero": {
      "badge": "KI-Teleprompter & Live-Performance-Coach · Technische Interviews & Standups",
      "line1": "Dein Nächstes",
      "line2": "Jobangebot",
      "line3": "in 1,5 Sekunden.",
      "line3_sub": "Jedes Mal.",
      "desc": "Deepgram transkribiert in 0.4s → Gemini Flash formuliert strukturierte Antworten auf Senior-Niveau. Ergonomischer Teleprompter zur Überwindung von Sprachbarrieren und Nervosität. Keine API-Schlüssel nötig.",
      "cta_start": "KOSTENLOS TESTEN",
      "cta_demo": "DEMO ANSEHEN",
      "stat_sessions": "Sitzungen",
      "stat_rules": "Regeln",
      "stat_stealth": "Datenschutz"
    },
    "tickers": {
      "t1": [
        "FREEZE MODE · Stop time during interviews",
        "1.4S GEMINI 2.5 FLASH",
        "SCREEN OCR · Instant code analysis with F9",
        "116+ IT PHONETIC NORMALIZATION RULES",
        "PRIVACY SHIELD · ШВИДКИЙ ФОКУС [ESC] TERMINAL",
        "HUD TELEPROMPTER · DUAL-SCREEN / TABLET SYNC",
        "ZERO SETUP · NO PERSONAL API KEYS NEEDED",
        "$15/MO · OR $79 LIFETIME PASS"
      ],
      "t2": [
        "SENIOR PYTHON / GO / RUST / REACT",
        "ZERO-LATENCY ARCHITECTURAL ANSWERS",
        "OVERCOME LANGUAGE BARRIERS & ANXIETY",
        "15 MIN FREE DEMO SANDBOX",
        "AUTOMATIC ACOUSTIC NOISE GATE",
        "GLOBAL 10+ LANGUAGES SUPPORT"
      ]
    },
    "demo": {
      "label": "Interactive Simulation",
      "title": "Live Call Experience",
      "desc": "Press SPACE or toggle Freeze Mode — answers lock in place while you deliver clearly to camera. AI continues listening in the background.",
      "f1": "Deepgram STT transcribes in 0.4s",
      "f2": "Gemini 2.5 Flash answers in 1.35s",
      "f3": "Freeze Mode [Space] — pause without panic",
      "f4": "116+ phonetic normalization rules",
      "active_session": "ACTIVE SESSION · 08:24",
      "freeze_active": "🧊 FREEZE ACTIVE",
      "freeze_idle": "[ SPACE ] FREEZE",
      "reset": "↺ RESET",
      "question_tag": "🎙 Lead Architect Question · Python & DB · Transcribed in 0.4s",
      "question_text": "“How does PostgreSQL MVCC handle heavy UPDATE loads, and what makes table bloat dangerous when paired with autovacuum latency?”",
      "ai_tag": "⚡ Gemini 2.5 Flash · 1.35s",
      "level": "SENIOR L5",
      "lead": "During PostgreSQL UPDATEs, rows are never overwritten in place — a new tuple version is written, leaving the old one dead:",
      "points": [
        {
          "tag": "TABLE BLOAT",
          "body": "Occurs when autovacuum fails to keep up with dead tuples due to long-running transactions or conservative vacuum scale factor thresholds."
        },
        {
          "tag": "HOT OPTIMIZATION",
          "body": "Heap-Only Tuples place the new row on the exact same page without rewriting secondary indexes (provided indexed columns didn't change)."
        },
        {
          "tag": "PRODUCTION FIX",
          "body": "Tune autovacuum_vacuum_scale_factor=0.05 on write-heavy tables + schedule online pg_repack without read locks."
        }
      ],
      "tip": "💡 Emphasize Heap-Only Tuples (HOT) — instant Senior signal for PostgreSQL internals",
      "generating": "generating...",
      "m_speed": "Latency",
      "m_acc": "Accuracy",
      "m_level": "Level"
    },
    "features": {
      "label": "Architektur",
      "title": "Sechs Vorteile für deinen Erfolg",
      "subtitle": "Jede Funktion löst eine kritische Hürde im Vorstellungsgespräch",
      "c1_tag": "01 / FREEZE MODE",
      "c1_badge": "[SPACE]",
      "c1_title": "Pause auf Knopfdruck. Keine Panik.",
      "c1_desc": "Tap Space — the teleprompter freezes instantly. Read bullet points naturally while making eye contact. The AI queues new questions in the background.",
      "c1_status": "AI listening in background · +2 questions queued",
      "c2_tag": "02 / SCREEN OCR",
      "c2_title": "Gemini analysiert deinen Code",
      "c2_desc": "Hit F9 — Gemini Vision instantly parses algorithms, time complexity, syntax pitfalls, and hidden edge cases.",
      "c2_status": "O(n log n) · Edge case: Empty Slice",
      "c3_tag": "03 / PANIC SHIELD",
      "c3_title": "Notfall-Tarnung mit [Esc]",
      "c3_desc": "One keypress transforms your screen into an authentic Linux bash window running passing unit tests.",
      "c4_tag": "04 / IT PHONETICS",
      "c4_title": "116+ phonetische IT-Regeln",
      "c4_desc": "Normalizes spoken jargon: 'postgres' → PostgreSQL, 'celery' → Celery, 'goroutines' → Go Routines. Seamless multilingual detection.",
      "c5_tag": "05 / HUD TELEPROMPTER",
      "c5_title": "Zweitbildschirm oder Tablet",
      "c5_desc": "Zero-latency LAN Server-Sent Events sync. Open the prompter on your iPad or secondary phone with instant realtime feed.",
      "c5_status": "SSE Stream · Zero Latency",
      "c6_tag": "06 / ZERO SETUP",
      "c6_title": "Keine API-Schlüssel erforderlich",
      "c6_desc": "Deepgram and Gemini are managed securely on our backend. No quota limits, no billing headaches. Sign in and start immediately.",
      "c6_cta": "TRY NOW →"
    },
    "comparison": {
      "label": "Market Benchmark",
      "title": "Why Engineers Choose Ghostboard",
      "col_product": "Product",
      "col_price": "Price",
      "col_speed": "Latency",
      "col_freeze": "Freeze",
      "col_ocr": "OCR",
      "col_nokeys": "No API Keys",
      "yes": "Yes",
      "no": "No"
    },
    "pricing": {
      "label": "Transparente Preise",
      "title": "Eine Investition in dein Traumangebot",
      "subtitle": "Keine versteckten Gebühren · Sofort einsatzbereit",
      "monthly": "Monatlich",
      "annual": "Jährlich",
      "discount": "−17%",
      "per_month": "/ month",
      "one_time": "one-time",
      "free_tier": "Starter",
      "free_badge": "15-minute live demo",
      "free_cta": "KOSTENLOS STARTEN",
      "pro_tier": "Unlimited",
      "pro_badge": "MOST POPULAR",
      "pro_cta": "PRO PASS HOLEN →",
      "life_tier": "Lifetime",
      "life_cta": "LIFETIME SICHERN",
      "free_features": [
        "15 min live demo session",
        "Real-time Deepgram STT",
        "Freeze Mode [Space]",
        "Mobile Question Simulator"
      ],
      "pro_features": [
        "Unlimited live interview sessions",
        "Screen & Code OCR [F9]",
        "Dual-screen HUD teleprompter",
        "Blitz answer mode [Q]",
        "Privacy Shield [Esc]",
        "Personalized CV context tuning"
      ],
      "life_features": [
        "All Pro features forever",
        "Early access to next-gen AI models",
        "Priority inference queue",
        "Private Discord mastermind"
      ]
    },
    "reviews": [
      {
        "quote": "The live code OCR caught an off-by-one edge case on my screen before the interviewer even mentioned it.",
        "author": "Maria L.",
        "role": "React Lead",
        "result": "Offer @ International SaaS"
      },
      {
        "quote": "Freeze Mode gives bulletproof calm. You tap space, look directly at the webcam, and sound completely composed.",
        "author": "Dmytro T.",
        "role": "Backend Engineer",
        "result": "Senior @ Fintech, Warsaw"
      },
      {
        "quote": "Landed my US remote offer 4 days after my first practice session. The 1.4s response speed is incredible.",
        "author": "Oleksiy K.",
        "role": "Senior Python",
        "result": "Offer in 4 days"
      }
    ],
    "cta": {
      "title_part1": "Bereit für dein ",
      "title_accent": "Traumangebot?",
      "title_part2": "",
      "btn": "ERSTE SITZUNG STARTEN →",
      "login": "Bereits registriert? Anmelden",
      "sub": "15 Min Demo · Keine Kreditkarte · Keine eigenen API-Keys"
    },
    "footer": {
      "privacy": "Datenschutz",
      "terms": "AGB",
      "settings": "Einstellungen",
      "workspace": "Copilot Workspace →"
    }
  },
  "fr": {
    "nav": {
      "features": "FONCTIONNALITÉS",
      "demo": "DÉMO",
      "comparison": "COMPARAISON",
      "pricing": "TARIFS",
      "login": "CONNEXION",
      "start": "DÉMARRER →"
    },
    "hero": {
      "badge": "Téléprompteur IA et Coach en Direct · Entretiens et Standups",
      "line1": "Votre Prochaine",
      "line2": "Offre d'Emploi",
      "line3": "en 1,5 seconde.",
      "line3_sub": "À chaque fois.",
      "desc": "Deepgram transcrit l'interviewer en 0.4s → Gemini Flash formule une réponse structurée de niveau Senior. Téléprompteur ergonomique pour surmonter la barrière de la langue et le stress. Clés API incluses.",
      "cta_start": "DÉMARRER GRATUITEMENT",
      "cta_demo": "VOIR LA DÉMO",
      "stat_sessions": "Sessions",
      "stat_rules": "Règles",
      "stat_stealth": "Protection privée"
    },
    "tickers": {
      "t1": [
        "FREEZE MODE · Stop time during interviews",
        "1.4S GEMINI 2.5 FLASH",
        "SCREEN OCR · Instant code analysis with F9",
        "116+ IT PHONETIC NORMALIZATION RULES",
        "PRIVACY SHIELD · ШВИДКИЙ ФОКУС [ESC] TERMINAL",
        "HUD TELEPROMPTER · DUAL-SCREEN / TABLET SYNC",
        "ZERO SETUP · NO PERSONAL API KEYS NEEDED",
        "$15/MO · OR $79 LIFETIME PASS"
      ],
      "t2": [
        "SENIOR PYTHON / GO / RUST / REACT",
        "ZERO-LATENCY ARCHITECTURAL ANSWERS",
        "OVERCOME LANGUAGE BARRIERS & ANXIETY",
        "15 MIN FREE DEMO SANDBOX",
        "AUTOMATIC ACOUSTIC NOISE GATE",
        "GLOBAL 10+ LANGUAGES SUPPORT"
      ]
    },
    "demo": {
      "label": "Interactive Simulation",
      "title": "Live Call Experience",
      "desc": "Press SPACE or toggle Freeze Mode — answers lock in place while you deliver clearly to camera. AI continues listening in the background.",
      "f1": "Deepgram STT transcribes in 0.4s",
      "f2": "Gemini 2.5 Flash answers in 1.35s",
      "f3": "Freeze Mode [Space] — pause without panic",
      "f4": "116+ phonetic normalization rules",
      "active_session": "ACTIVE SESSION · 08:24",
      "freeze_active": "🧊 FREEZE ACTIVE",
      "freeze_idle": "[ SPACE ] FREEZE",
      "reset": "↺ RESET",
      "question_tag": "🎙 Lead Architect Question · Python & DB · Transcribed in 0.4s",
      "question_text": "“How does PostgreSQL MVCC handle heavy UPDATE loads, and what makes table bloat dangerous when paired with autovacuum latency?”",
      "ai_tag": "⚡ Gemini 2.5 Flash · 1.35s",
      "level": "SENIOR L5",
      "lead": "During PostgreSQL UPDATEs, rows are never overwritten in place — a new tuple version is written, leaving the old one dead:",
      "points": [
        {
          "tag": "TABLE BLOAT",
          "body": "Occurs when autovacuum fails to keep up with dead tuples due to long-running transactions or conservative vacuum scale factor thresholds."
        },
        {
          "tag": "HOT OPTIMIZATION",
          "body": "Heap-Only Tuples place the new row on the exact same page without rewriting secondary indexes (provided indexed columns didn't change)."
        },
        {
          "tag": "PRODUCTION FIX",
          "body": "Tune autovacuum_vacuum_scale_factor=0.05 on write-heavy tables + schedule online pg_repack without read locks."
        }
      ],
      "tip": "💡 Emphasize Heap-Only Tuples (HOT) — instant Senior signal for PostgreSQL internals",
      "generating": "generating...",
      "m_speed": "Latency",
      "m_acc": "Accuracy",
      "m_level": "Level"
    },
    "features": {
      "label": "Architecture",
      "title": "Six Piliers d'Avantage",
      "subtitle": "Chaque outil résout un point de friction majeur en entretien",
      "c1_tag": "01 / FREEZE MODE",
      "c1_badge": "[SPACE]",
      "c1_title": "Figez le flux. Zéro panique.",
      "c1_desc": "Tap Space — the teleprompter freezes instantly. Read bullet points naturally while making eye contact. The AI queues new questions in the background.",
      "c1_status": "AI listening in background · +2 questions queued",
      "c2_tag": "02 / SCREEN OCR",
      "c2_title": "Gemini lit votre code",
      "c2_desc": "Hit F9 — Gemini Vision instantly parses algorithms, time complexity, syntax pitfalls, and hidden edge cases.",
      "c2_status": "O(n log n) · Edge case: Empty Slice",
      "c3_tag": "03 / PANIC SHIELD",
      "c3_title": "Bouclier d'urgence [Esc]",
      "c3_desc": "One keypress transforms your screen into an authentic Linux bash window running passing unit tests.",
      "c4_tag": "04 / IT PHONETICS",
      "c4_title": "116+ règles phonétiques tech",
      "c4_desc": "Normalizes spoken jargon: 'postgres' → PostgreSQL, 'celery' → Celery, 'goroutines' → Go Routines. Seamless multilingual detection.",
      "c5_tag": "05 / HUD TELEPROMPTER",
      "c5_title": "Second écran ou tablette",
      "c5_desc": "Zero-latency LAN Server-Sent Events sync. Open the prompter on your iPad or secondary phone with instant realtime feed.",
      "c5_status": "SSE Stream · Zero Latency",
      "c6_tag": "06 / ZERO SETUP",
      "c6_title": "Zéro clé API requise",
      "c6_desc": "Deepgram and Gemini are managed securely on our backend. No quota limits, no billing headaches. Sign in and start immediately.",
      "c6_cta": "TRY NOW →"
    },
    "comparison": {
      "label": "Market Benchmark",
      "title": "Why Engineers Choose Ghostboard",
      "col_product": "Product",
      "col_price": "Price",
      "col_speed": "Latency",
      "col_freeze": "Freeze",
      "col_ocr": "OCR",
      "col_nokeys": "No API Keys",
      "yes": "Yes",
      "no": "No"
    },
    "pricing": {
      "label": "Tarifs transparents",
      "title": "Un investissement rentable dès la 1ère offre",
      "subtitle": "Sans frais cachés · Prêt à l'emploi",
      "monthly": "Mensuel",
      "annual": "Annuel",
      "discount": "−17%",
      "per_month": "/ month",
      "one_time": "one-time",
      "free_tier": "Starter",
      "free_badge": "15-minute live demo",
      "free_cta": "ESSAI GRATUIT",
      "pro_tier": "Unlimited",
      "pro_badge": "MOST POPULAR",
      "pro_cta": "OBTENIR LE PRO PASS →",
      "life_tier": "Lifetime",
      "life_cta": "ACCÈS À VIE",
      "free_features": [
        "15 min live demo session",
        "Real-time Deepgram STT",
        "Freeze Mode [Space]",
        "Mobile Question Simulator"
      ],
      "pro_features": [
        "Unlimited live interview sessions",
        "Screen & Code OCR [F9]",
        "Dual-screen HUD teleprompter",
        "Blitz answer mode [Q]",
        "Privacy Shield [Esc]",
        "Personalized CV context tuning"
      ],
      "life_features": [
        "All Pro features forever",
        "Early access to next-gen AI models",
        "Priority inference queue",
        "Private Discord mastermind"
      ]
    },
    "reviews": [
      {
        "quote": "The live code OCR caught an off-by-one edge case on my screen before the interviewer even mentioned it.",
        "author": "Maria L.",
        "role": "React Lead",
        "result": "Offer @ International SaaS"
      },
      {
        "quote": "Freeze Mode gives bulletproof calm. You tap space, look directly at the webcam, and sound completely composed.",
        "author": "Dmytro T.",
        "role": "Backend Engineer",
        "result": "Senior @ Fintech, Warsaw"
      },
      {
        "quote": "Landed my US remote offer 4 days after my first practice session. The 1.4s response speed is incredible.",
        "author": "Oleksiy K.",
        "role": "Senior Python",
        "result": "Offer in 4 days"
      }
    ],
    "cta": {
      "title_part1": "Prêt à décrocher votre ",
      "title_accent": "offre de rêve ?",
      "title_part2": "",
      "btn": "COMMENCER VOTRE SESSION →",
      "login": "Déjà un compte ? Se connecter",
      "sub": "Démo 15 min · Sans carte bancaire · Clés API incluses"
    },
    "footer": {
      "privacy": "Confidentialité",
      "terms": "Conditions",
      "settings": "Paramètres",
      "workspace": "Espace Copilot →"
    }
  },
  "es": {
    "nav": {
      "features": "CARACTERÍSTICAS",
      "demo": "DEMO",
      "comparison": "COMPARATIVA",
      "pricing": "PRECIOS",
      "login": "ENTRAR",
      "start": "COMENZAR →"
    },
    "hero": {
      "badge": "Teleprompter de IA y Coach en Vivo · Entrevistas y Standups",
      "line1": "Tu Próxima",
      "line2": "Oferta de Trabajo",
      "line3": "en 1.5 segundos.",
      "line3_sub": "Siempre.",
      "desc": "Deepgram transcribe en 0.4s → Gemini Flash genera respuestas de nivel Senior. Teleprompter ergonómico para superar la barrera del idioma y la ansiedad técnica. Cero claves API necesarias.",
      "cta_start": "EMPIEZA GRATIS",
      "cta_demo": "VER DEMO",
      "stat_sessions": "Sesiones",
      "stat_rules": "Reglas",
      "stat_stealth": "Protección de privacidad"
    },
    "tickers": {
      "t1": [
        "FREEZE MODE · Stop time during interviews",
        "1.4S GEMINI 2.5 FLASH",
        "SCREEN OCR · Instant code analysis with F9",
        "116+ IT PHONETIC NORMALIZATION RULES",
        "PRIVACY SHIELD · ШВИДКИЙ ФОКУС [ESC] TERMINAL",
        "HUD TELEPROMPTER · DUAL-SCREEN / TABLET SYNC",
        "ZERO SETUP · NO PERSONAL API KEYS NEEDED",
        "$15/MO · OR $79 LIFETIME PASS"
      ],
      "t2": [
        "SENIOR PYTHON / GO / RUST / REACT",
        "ZERO-LATENCY ARCHITECTURAL ANSWERS",
        "OVERCOME LANGUAGE BARRIERS & ANXIETY",
        "15 MIN FREE DEMO SANDBOX",
        "AUTOMATIC ACOUSTIC NOISE GATE",
        "GLOBAL 10+ LANGUAGES SUPPORT"
      ]
    },
    "demo": {
      "label": "Interactive Simulation",
      "title": "Live Call Experience",
      "desc": "Press SPACE or toggle Freeze Mode — answers lock in place while you deliver clearly to camera. AI continues listening in the background.",
      "f1": "Deepgram STT transcribes in 0.4s",
      "f2": "Gemini 2.5 Flash answers in 1.35s",
      "f3": "Freeze Mode [Space] — pause without panic",
      "f4": "116+ phonetic normalization rules",
      "active_session": "ACTIVE SESSION · 08:24",
      "freeze_active": "🧊 FREEZE ACTIVE",
      "freeze_idle": "[ SPACE ] FREEZE",
      "reset": "↺ RESET",
      "question_tag": "🎙 Lead Architect Question · Python & DB · Transcribed in 0.4s",
      "question_text": "“How does PostgreSQL MVCC handle heavy UPDATE loads, and what makes table bloat dangerous when paired with autovacuum latency?”",
      "ai_tag": "⚡ Gemini 2.5 Flash · 1.35s",
      "level": "SENIOR L5",
      "lead": "During PostgreSQL UPDATEs, rows are never overwritten in place — a new tuple version is written, leaving the old one dead:",
      "points": [
        {
          "tag": "TABLE BLOAT",
          "body": "Occurs when autovacuum fails to keep up with dead tuples due to long-running transactions or conservative vacuum scale factor thresholds."
        },
        {
          "tag": "HOT OPTIMIZATION",
          "body": "Heap-Only Tuples place the new row on the exact same page without rewriting secondary indexes (provided indexed columns didn't change)."
        },
        {
          "tag": "PRODUCTION FIX",
          "body": "Tune autovacuum_vacuum_scale_factor=0.05 on write-heavy tables + schedule online pg_repack without read locks."
        }
      ],
      "tip": "💡 Emphasize Heap-Only Tuples (HOT) — instant Senior signal for PostgreSQL internals",
      "generating": "generating...",
      "m_speed": "Latency",
      "m_acc": "Accuracy",
      "m_level": "Level"
    },
    "features": {
      "label": "Arquitectura",
      "title": "Seis Niveles de Ventaja",
      "subtitle": "Cada herramienta resuelve un momento crítico en la entrevista técnica",
      "c1_tag": "01 / FREEZE MODE",
      "c1_badge": "[SPACE]",
      "c1_title": "Congela la pantalla. Cero pánico.",
      "c1_desc": "Tap Space — the teleprompter freezes instantly. Read bullet points naturally while making eye contact. The AI queues new questions in the background.",
      "c1_status": "AI listening in background · +2 questions queued",
      "c2_tag": "02 / SCREEN OCR",
      "c2_title": "Gemini analiza tu código",
      "c2_desc": "Hit F9 — Gemini Vision instantly parses algorithms, time complexity, syntax pitfalls, and hidden edge cases.",
      "c2_status": "O(n log n) · Edge case: Empty Slice",
      "c3_tag": "03 / PANIC SHIELD",
      "c3_title": "Escudo de pánico instantáneo [Esc]",
      "c3_desc": "One keypress transforms your screen into an authentic Linux bash window running passing unit tests.",
      "c4_tag": "04 / IT PHONETICS",
      "c4_title": "116+ reglas fonéticas IT",
      "c4_desc": "Normalizes spoken jargon: 'postgres' → PostgreSQL, 'celery' → Celery, 'goroutines' → Go Routines. Seamless multilingual detection.",
      "c5_tag": "05 / HUD TELEPROMPTER",
      "c5_title": "Segunda pantalla o tablet",
      "c5_desc": "Zero-latency LAN Server-Sent Events sync. Open the prompter on your iPad or secondary phone with instant realtime feed.",
      "c5_status": "SSE Stream · Zero Latency",
      "c6_tag": "06 / ZERO SETUP",
      "c6_title": "Sin claves API propias",
      "c6_desc": "Deepgram and Gemini are managed securely on our backend. No quota limits, no billing headaches. Sign in and start immediately.",
      "c6_cta": "TRY NOW →"
    },
    "comparison": {
      "label": "Market Benchmark",
      "title": "Why Engineers Choose Ghostboard",
      "col_product": "Product",
      "col_price": "Price",
      "col_speed": "Latency",
      "col_freeze": "Freeze",
      "col_ocr": "OCR",
      "col_nokeys": "No API Keys",
      "yes": "Yes",
      "no": "No"
    },
    "pricing": {
      "label": "Precios claros",
      "title": "Una inversión que se amortiza con tu primera oferta",
      "subtitle": "Sin costes ocultos · Sin configuraciones complejas",
      "monthly": "Mensual",
      "annual": "Anual",
      "discount": "−17%",
      "per_month": "/ month",
      "one_time": "one-time",
      "free_tier": "Starter",
      "free_badge": "15-minute live demo",
      "free_cta": "COMENZAR GRATIS",
      "pro_tier": "Unlimited",
      "pro_badge": "MOST POPULAR",
      "pro_cta": "OBTENER PRO PASS →",
      "life_tier": "Lifetime",
      "life_cta": "PASE DE POR VIDA",
      "free_features": [
        "15 min live demo session",
        "Real-time Deepgram STT",
        "Freeze Mode [Space]",
        "Mobile Question Simulator"
      ],
      "pro_features": [
        "Unlimited live interview sessions",
        "Screen & Code OCR [F9]",
        "Dual-screen HUD teleprompter",
        "Blitz answer mode [Q]",
        "Privacy Shield [Esc]",
        "Personalized CV context tuning"
      ],
      "life_features": [
        "All Pro features forever",
        "Early access to next-gen AI models",
        "Priority inference queue",
        "Private Discord mastermind"
      ]
    },
    "reviews": [
      {
        "quote": "The live code OCR caught an off-by-one edge case on my screen before the interviewer even mentioned it.",
        "author": "Maria L.",
        "role": "React Lead",
        "result": "Offer @ International SaaS"
      },
      {
        "quote": "Freeze Mode gives bulletproof calm. You tap space, look directly at the webcam, and sound completely composed.",
        "author": "Dmytro T.",
        "role": "Backend Engineer",
        "result": "Senior @ Fintech, Warsaw"
      },
      {
        "quote": "Landed my US remote offer 4 days after my first practice session. The 1.4s response speed is incredible.",
        "author": "Oleksiy K.",
        "role": "Senior Python",
        "result": "Offer in 4 days"
      }
    ],
    "cta": {
      "title_part1": "¿Listo para conseguir tu ",
      "title_accent": "oferta soñada?",
      "title_part2": "",
      "btn": "INICIAR PRIMERA SESIÓN →",
      "login": "¿Ya tienes cuenta? Inicia sesión",
      "sub": "Demo 15 min · Sin tarjeta de crédito · Sin claves API"
    },
    "footer": {
      "privacy": "Privacidad",
      "terms": "Términos",
      "settings": "Ajustes",
      "workspace": "Panel Copilot →"
    }
  },
  "pt": {
    "nav": {
      "features": "RECURSOS",
      "demo": "DEMO",
      "comparison": "COMPARAÇÃO",
      "pricing": "PREÇOS",
      "login": "ENTRAR",
      "start": "INICIAR →"
    },
    "hero": {
      "badge": "Teleprompter com IA e Coach ao Vivo · Entrevistas e Standups",
      "line1": "Sua Próxima",
      "line2": "Oferta de Emprego",
      "line3": "em 1.5 segundos.",
      "line3_sub": "Sempre.",
      "desc": "Deepgram transcreve em 0.4s → Gemini Flash gera respostas de nível Sênior. Teleprompter ergonômico para superar barreiras linguísticas e a ansiedade da entrevista. Sem necessidade de chaves API.",
      "cta_start": "COMECE GRÁTIS",
      "cta_demo": "VER DEMO",
      "stat_sessions": "Sessões",
      "stat_rules": "Regras",
      "stat_stealth": "Proteção de privacidade"
    },
    "tickers": {
      "t1": [
        "FREEZE MODE · Stop time during interviews",
        "1.4S GEMINI 2.5 FLASH",
        "SCREEN OCR · Instant code analysis with F9",
        "116+ IT PHONETIC NORMALIZATION RULES",
        "PRIVACY SHIELD · ШВИДКИЙ ФОКУС [ESC] TERMINAL",
        "HUD TELEPROMPTER · DUAL-SCREEN / TABLET SYNC",
        "ZERO SETUP · NO PERSONAL API KEYS NEEDED",
        "$15/MO · OR $79 LIFETIME PASS"
      ],
      "t2": [
        "SENIOR PYTHON / GO / RUST / REACT",
        "ZERO-LATENCY ARCHITECTURAL ANSWERS",
        "OVERCOME LANGUAGE BARRIERS & ANXIETY",
        "15 MIN FREE DEMO SANDBOX",
        "AUTOMATIC ACOUSTIC NOISE GATE",
        "GLOBAL 10+ LANGUAGES SUPPORT"
      ]
    },
    "demo": {
      "label": "Interactive Simulation",
      "title": "Live Call Experience",
      "desc": "Press SPACE or toggle Freeze Mode — answers lock in place while you deliver clearly to camera. AI continues listening in the background.",
      "f1": "Deepgram STT transcribes in 0.4s",
      "f2": "Gemini 2.5 Flash answers in 1.35s",
      "f3": "Freeze Mode [Space] — pause without panic",
      "f4": "116+ phonetic normalization rules",
      "active_session": "ACTIVE SESSION · 08:24",
      "freeze_active": "🧊 FREEZE ACTIVE",
      "freeze_idle": "[ SPACE ] FREEZE",
      "reset": "↺ RESET",
      "question_tag": "🎙 Lead Architect Question · Python & DB · Transcribed in 0.4s",
      "question_text": "“How does PostgreSQL MVCC handle heavy UPDATE loads, and what makes table bloat dangerous when paired with autovacuum latency?”",
      "ai_tag": "⚡ Gemini 2.5 Flash · 1.35s",
      "level": "SENIOR L5",
      "lead": "During PostgreSQL UPDATEs, rows are never overwritten in place — a new tuple version is written, leaving the old one dead:",
      "points": [
        {
          "tag": "TABLE BLOAT",
          "body": "Occurs when autovacuum fails to keep up with dead tuples due to long-running transactions or conservative vacuum scale factor thresholds."
        },
        {
          "tag": "HOT OPTIMIZATION",
          "body": "Heap-Only Tuples place the new row on the exact same page without rewriting secondary indexes (provided indexed columns didn't change)."
        },
        {
          "tag": "PRODUCTION FIX",
          "body": "Tune autovacuum_vacuum_scale_factor=0.05 on write-heavy tables + schedule online pg_repack without read locks."
        }
      ],
      "tip": "💡 Emphasize Heap-Only Tuples (HOT) — instant Senior signal for PostgreSQL internals",
      "generating": "generating...",
      "m_speed": "Latency",
      "m_acc": "Accuracy",
      "m_level": "Level"
    },
    "features": {
      "label": "Architecture",
      "title": "Six Levels of Advantage",
      "subtitle": "Every capability solves an exact high-stakes interview friction point",
      "c1_tag": "01 / FREEZE MODE",
      "c1_badge": "[SPACE]",
      "c1_title": "Pause the stream. Zero panic.",
      "c1_desc": "Tap Space — the teleprompter freezes instantly. Read bullet points naturally while making eye contact. The AI queues new questions in the background.",
      "c1_status": "AI listening in background · +2 questions queued",
      "c2_tag": "02 / SCREEN OCR",
      "c2_title": "Gemini sees your code",
      "c2_desc": "Hit F9 — Gemini Vision instantly parses algorithms, time complexity, syntax pitfalls, and hidden edge cases.",
      "c2_status": "O(n log n) · Edge case: Empty Slice",
      "c3_tag": "03 / PANIC SHIELD",
      "c3_title": "Single ESC Emergency Shield",
      "c3_desc": "One keypress transforms your screen into an authentic Linux bash window running passing unit tests.",
      "c4_tag": "04 / IT PHONETICS",
      "c4_title": "116+ Phonetic IT Rules",
      "c4_desc": "Normalizes spoken jargon: 'postgres' → PostgreSQL, 'celery' → Celery, 'goroutines' → Go Routines. Seamless multilingual detection.",
      "c5_tag": "05 / HUD TELEPROMPTER",
      "c5_title": "2-nd Screen or Tablet HUD",
      "c5_desc": "Zero-latency LAN Server-Sent Events sync. Open the prompter on your iPad or secondary phone with instant realtime feed.",
      "c5_status": "SSE Stream · Zero Latency",
      "c6_tag": "06 / ZERO SETUP",
      "c6_title": "Zero API keys required.",
      "c6_desc": "Deepgram and Gemini are managed securely on our backend. No quota limits, no billing headaches. Sign in and start immediately.",
      "c6_cta": "TRY NOW →"
    },
    "comparison": {
      "label": "Market Benchmark",
      "title": "Why Engineers Choose Ghostboard",
      "col_product": "Product",
      "col_price": "Price",
      "col_speed": "Latency",
      "col_freeze": "Freeze",
      "col_ocr": "OCR",
      "col_nokeys": "No API Keys",
      "yes": "Yes",
      "no": "No"
    },
    "pricing": {
      "label": "Preços transparentes",
      "title": "Um investimento garantido na sua aprovação",
      "subtitle": "Sem taxas escondidas · Pronto para usar",
      "monthly": "Monthly",
      "annual": "Annual",
      "discount": "−17%",
      "per_month": "/ month",
      "one_time": "one-time",
      "free_tier": "Starter",
      "free_badge": "15-minute live demo",
      "free_cta": "COMEÇAR GRÁTIS",
      "pro_tier": "Unlimited",
      "pro_badge": "MOST POPULAR",
      "pro_cta": "GARANTIR PRO PASS →",
      "life_tier": "Lifetime",
      "life_cta": "ACESSO VITALÍCIO",
      "free_features": [
        "15 min live demo session",
        "Real-time Deepgram STT",
        "Freeze Mode [Space]",
        "Mobile Question Simulator"
      ],
      "pro_features": [
        "Unlimited live interview sessions",
        "Screen & Code OCR [F9]",
        "Dual-screen HUD teleprompter",
        "Blitz answer mode [Q]",
        "Privacy Shield [Esc]",
        "Personalized CV context tuning"
      ],
      "life_features": [
        "All Pro features forever",
        "Early access to next-gen AI models",
        "Priority inference queue",
        "Private Discord mastermind"
      ]
    },
    "reviews": [
      {
        "quote": "The live code OCR caught an off-by-one edge case on my screen before the interviewer even mentioned it.",
        "author": "Maria L.",
        "role": "React Lead",
        "result": "Offer @ International SaaS"
      },
      {
        "quote": "Freeze Mode gives bulletproof calm. You tap space, look directly at the webcam, and sound completely composed.",
        "author": "Dmytro T.",
        "role": "Backend Engineer",
        "result": "Senior @ Fintech, Warsaw"
      },
      {
        "quote": "Landed my US remote offer 4 days after my first practice session. The 1.4s response speed is incredible.",
        "author": "Oleksiy K.",
        "role": "Senior Python",
        "result": "Offer in 4 days"
      }
    ],
    "cta": {
      "title_part1": "Pronto para conquistar sua ",
      "title_accent": "vaga dos sonhos?",
      "title_part2": "",
      "btn": "INICIAR PRIMEIRA SESSÃO →",
      "login": "Já tem conta? Entrar",
      "sub": "15 min demo · No credit card required · No personal API keys needed"
    },
    "footer": {
      "privacy": "Privacidade",
      "terms": "Termos",
      "settings": "Configurações",
      "workspace": "Área Copilot →"
    }
  },
  "it": {
    "nav": {
      "features": "FUNZIONALITÀ",
      "demo": "DEMO",
      "comparison": "CONFRONTO",
      "pricing": "PREZZI",
      "login": "ACCEDI",
      "start": "INIZIA →"
    },
    "hero": {
      "badge": "Teleprompter AI e Live Performance Coach · Colloqui e Standup",
      "line1": "La Tua Prossima",
      "line2": "Offerta di Lavoro",
      "line3": "in 1.5 secondi.",
      "line3_sub": "Ogni volta.",
      "desc": "Deepgram trascrive l'intervistatore in 0.4s → Gemini Flash formula risposte strutturate di livello Senior. Teleprompter ergonomico per superare barriere linguistiche e ansia. Nessuna chiave API necessaria.",
      "cta_start": "INIZIA GRATIS",
      "cta_demo": "GUARDA LA DEMO",
      "stat_sessions": "Sessioni",
      "stat_rules": "Regole",
      "stat_stealth": "Protezione privacy"
    },
    "tickers": {
      "t1": [
        "FREEZE MODE · Stop time during interviews",
        "1.4S GEMINI 2.5 FLASH",
        "SCREEN OCR · Instant code analysis with F9",
        "116+ IT PHONETIC NORMALIZATION RULES",
        "PRIVACY SHIELD · ШВИДКИЙ ФОКУС [ESC] TERMINAL",
        "HUD TELEPROMPTER · DUAL-SCREEN / TABLET SYNC",
        "ZERO SETUP · NO PERSONAL API KEYS NEEDED",
        "$15/MO · OR $79 LIFETIME PASS"
      ],
      "t2": [
        "SENIOR PYTHON / GO / RUST / REACT",
        "ZERO-LATENCY ARCHITECTURAL ANSWERS",
        "OVERCOME LANGUAGE BARRIERS & ANXIETY",
        "15 MIN FREE DEMO SANDBOX",
        "AUTOMATIC ACOUSTIC NOISE GATE",
        "GLOBAL 10+ LANGUAGES SUPPORT"
      ]
    },
    "demo": {
      "label": "Interactive Simulation",
      "title": "Live Call Experience",
      "desc": "Press SPACE or toggle Freeze Mode — answers lock in place while you deliver clearly to camera. AI continues listening in the background.",
      "f1": "Deepgram STT transcribes in 0.4s",
      "f2": "Gemini 2.5 Flash answers in 1.35s",
      "f3": "Freeze Mode [Space] — pause without panic",
      "f4": "116+ phonetic normalization rules",
      "active_session": "ACTIVE SESSION · 08:24",
      "freeze_active": "🧊 FREEZE ACTIVE",
      "freeze_idle": "[ SPACE ] FREEZE",
      "reset": "↺ RESET",
      "question_tag": "🎙 Lead Architect Question · Python & DB · Transcribed in 0.4s",
      "question_text": "“How does PostgreSQL MVCC handle heavy UPDATE loads, and what makes table bloat dangerous when paired with autovacuum latency?”",
      "ai_tag": "⚡ Gemini 2.5 Flash · 1.35s",
      "level": "SENIOR L5",
      "lead": "During PostgreSQL UPDATEs, rows are never overwritten in place — a new tuple version is written, leaving the old one dead:",
      "points": [
        {
          "tag": "TABLE BLOAT",
          "body": "Occurs when autovacuum fails to keep up with dead tuples due to long-running transactions or conservative vacuum scale factor thresholds."
        },
        {
          "tag": "HOT OPTIMIZATION",
          "body": "Heap-Only Tuples place the new row on the exact same page without rewriting secondary indexes (provided indexed columns didn't change)."
        },
        {
          "tag": "PRODUCTION FIX",
          "body": "Tune autovacuum_vacuum_scale_factor=0.05 on write-heavy tables + schedule online pg_repack without read locks."
        }
      ],
      "tip": "💡 Emphasize Heap-Only Tuples (HOT) — instant Senior signal for PostgreSQL internals",
      "generating": "generating...",
      "m_speed": "Latency",
      "m_acc": "Accuracy",
      "m_level": "Level"
    },
    "features": {
      "label": "Architecture",
      "title": "Six Levels of Advantage",
      "subtitle": "Every capability solves an exact high-stakes interview friction point",
      "c1_tag": "01 / FREEZE MODE",
      "c1_badge": "[SPACE]",
      "c1_title": "Pause the stream. Zero panic.",
      "c1_desc": "Tap Space — the teleprompter freezes instantly. Read bullet points naturally while making eye contact. The AI queues new questions in the background.",
      "c1_status": "AI listening in background · +2 questions queued",
      "c2_tag": "02 / SCREEN OCR",
      "c2_title": "Gemini sees your code",
      "c2_desc": "Hit F9 — Gemini Vision instantly parses algorithms, time complexity, syntax pitfalls, and hidden edge cases.",
      "c2_status": "O(n log n) · Edge case: Empty Slice",
      "c3_tag": "03 / PANIC SHIELD",
      "c3_title": "Single ESC Emergency Shield",
      "c3_desc": "One keypress transforms your screen into an authentic Linux bash window running passing unit tests.",
      "c4_tag": "04 / IT PHONETICS",
      "c4_title": "116+ Phonetic IT Rules",
      "c4_desc": "Normalizes spoken jargon: 'postgres' → PostgreSQL, 'celery' → Celery, 'goroutines' → Go Routines. Seamless multilingual detection.",
      "c5_tag": "05 / HUD TELEPROMPTER",
      "c5_title": "2-nd Screen or Tablet HUD",
      "c5_desc": "Zero-latency LAN Server-Sent Events sync. Open the prompter on your iPad or secondary phone with instant realtime feed.",
      "c5_status": "SSE Stream · Zero Latency",
      "c6_tag": "06 / ZERO SETUP",
      "c6_title": "Zero API keys required.",
      "c6_desc": "Deepgram and Gemini are managed securely on our backend. No quota limits, no billing headaches. Sign in and start immediately.",
      "c6_cta": "TRY NOW →"
    },
    "comparison": {
      "label": "Market Benchmark",
      "title": "Why Engineers Choose Ghostboard",
      "col_product": "Product",
      "col_price": "Price",
      "col_speed": "Latency",
      "col_freeze": "Freeze",
      "col_ocr": "OCR",
      "col_nokeys": "No API Keys",
      "yes": "Yes",
      "no": "No"
    },
    "pricing": {
      "label": "Prezzi trasparenti",
      "title": "Un investimento nella tua prossima grande offerta",
      "subtitle": "Nessun costo nascosto · Pronto all'uso",
      "monthly": "Monthly",
      "annual": "Annual",
      "discount": "−17%",
      "per_month": "/ month",
      "one_time": "one-time",
      "free_tier": "Starter",
      "free_badge": "15-minute live demo",
      "free_cta": "INIZIA GRATIS",
      "pro_tier": "Unlimited",
      "pro_badge": "MOST POPULAR",
      "pro_cta": "OTTIENI PRO PASS →",
      "life_tier": "Lifetime",
      "life_cta": "PASSE A VITA",
      "free_features": [
        "15 min live demo session",
        "Real-time Deepgram STT",
        "Freeze Mode [Space]",
        "Mobile Question Simulator"
      ],
      "pro_features": [
        "Unlimited live interview sessions",
        "Screen & Code OCR [F9]",
        "Dual-screen HUD teleprompter",
        "Blitz answer mode [Q]",
        "Privacy Shield [Esc]",
        "Personalized CV context tuning"
      ],
      "life_features": [
        "All Pro features forever",
        "Early access to next-gen AI models",
        "Priority inference queue",
        "Private Discord mastermind"
      ]
    },
    "reviews": [
      {
        "quote": "The live code OCR caught an off-by-one edge case on my screen before the interviewer even mentioned it.",
        "author": "Maria L.",
        "role": "React Lead",
        "result": "Offer @ International SaaS"
      },
      {
        "quote": "Freeze Mode gives bulletproof calm. You tap space, look directly at the webcam, and sound completely composed.",
        "author": "Dmytro T.",
        "role": "Backend Engineer",
        "result": "Senior @ Fintech, Warsaw"
      },
      {
        "quote": "Landed my US remote offer 4 days after my first practice session. The 1.4s response speed is incredible.",
        "author": "Oleksiy K.",
        "role": "Senior Python",
        "result": "Offer in 4 days"
      }
    ],
    "cta": {
      "title_part1": "Pronto a conquistare la tua ",
      "title_accent": "offerta ideale?",
      "title_part2": "",
      "btn": "AVVIA PRIMA SESSIONE →",
      "login": "Hai già un account? Accedi",
      "sub": "15 min demo · No credit card required · No personal API keys needed"
    },
    "footer": {
      "privacy": "Privacy",
      "terms": "Termini",
      "settings": "Impostazioni",
      "workspace": "Area Copilot →"
    }
  },
  "cs": {
    "nav": {
      "features": "FUNKCE",
      "demo": "DEMO",
      "comparison": "SROVNÁNÍ",
      "pricing": "CENÍK",
      "login": "PŘIHLÁSIT SE",
      "start": "ZAČÍT →"
    },
    "hero": {
      "badge": "AI Teleprompter a Osobní Kouč · Technické Pohovory a Standupy",
      "line1": "Vaše Příští",
      "line2": "Pracovní Nabídka",
      "line3": "za 1,5 sekundy.",
      "line3_sub": "Pokaždé.",
      "desc": "Deepgram přepisuje otázky za 0.4s → Gemini Flash připraví strukturovanou Senior odpověď. Přehledný teleprompter pro překonání jazykové bariéry a nervozity. Vlastní API klíče nejsou potřeba.",
      "cta_start": "VYZKOUŠET ZDARMA",
      "cta_demo": "ZOBRAZIT DEMO",
      "stat_sessions": "Relací",
      "stat_rules": "Pravidel",
      "stat_stealth": "Ochrana soukromí"
    },
    "tickers": {
      "t1": [
        "FREEZE MODE · Stop time during interviews",
        "1.4S GEMINI 2.5 FLASH",
        "SCREEN OCR · Instant code analysis with F9",
        "116+ IT PHONETIC NORMALIZATION RULES",
        "PRIVACY SHIELD · ШВИДКИЙ ФОКУС [ESC] TERMINAL",
        "HUD TELEPROMPTER · DUAL-SCREEN / TABLET SYNC",
        "ZERO SETUP · NO PERSONAL API KEYS NEEDED",
        "$15/MO · OR $79 LIFETIME PASS"
      ],
      "t2": [
        "SENIOR PYTHON / GO / RUST / REACT",
        "ZERO-LATENCY ARCHITECTURAL ANSWERS",
        "OVERCOME LANGUAGE BARRIERS & ANXIETY",
        "15 MIN FREE DEMO SANDBOX",
        "AUTOMATIC ACOUSTIC NOISE GATE",
        "GLOBAL 10+ LANGUAGES SUPPORT"
      ]
    },
    "demo": {
      "label": "Interactive Simulation",
      "title": "Live Call Experience",
      "desc": "Press SPACE or toggle Freeze Mode — answers lock in place while you deliver clearly to camera. AI continues listening in the background.",
      "f1": "Deepgram STT transcribes in 0.4s",
      "f2": "Gemini 2.5 Flash answers in 1.35s",
      "f3": "Freeze Mode [Space] — pause without panic",
      "f4": "116+ phonetic normalization rules",
      "active_session": "ACTIVE SESSION · 08:24",
      "freeze_active": "🧊 FREEZE ACTIVE",
      "freeze_idle": "[ SPACE ] FREEZE",
      "reset": "↺ RESET",
      "question_tag": "🎙 Lead Architect Question · Python & DB · Transcribed in 0.4s",
      "question_text": "“How does PostgreSQL MVCC handle heavy UPDATE loads, and what makes table bloat dangerous when paired with autovacuum latency?”",
      "ai_tag": "⚡ Gemini 2.5 Flash · 1.35s",
      "level": "SENIOR L5",
      "lead": "During PostgreSQL UPDATEs, rows are never overwritten in place — a new tuple version is written, leaving the old one dead:",
      "points": [
        {
          "tag": "TABLE BLOAT",
          "body": "Occurs when autovacuum fails to keep up with dead tuples due to long-running transactions or conservative vacuum scale factor thresholds."
        },
        {
          "tag": "HOT OPTIMIZATION",
          "body": "Heap-Only Tuples place the new row on the exact same page without rewriting secondary indexes (provided indexed columns didn't change)."
        },
        {
          "tag": "PRODUCTION FIX",
          "body": "Tune autovacuum_vacuum_scale_factor=0.05 on write-heavy tables + schedule online pg_repack without read locks."
        }
      ],
      "tip": "💡 Emphasize Heap-Only Tuples (HOT) — instant Senior signal for PostgreSQL internals",
      "generating": "generating...",
      "m_speed": "Latency",
      "m_acc": "Accuracy",
      "m_level": "Level"
    },
    "features": {
      "label": "Architecture",
      "title": "Six Levels of Advantage",
      "subtitle": "Every capability solves an exact high-stakes interview friction point",
      "c1_tag": "01 / FREEZE MODE",
      "c1_badge": "[SPACE]",
      "c1_title": "Pause the stream. Zero panic.",
      "c1_desc": "Tap Space — the teleprompter freezes instantly. Read bullet points naturally while making eye contact. The AI queues new questions in the background.",
      "c1_status": "AI listening in background · +2 questions queued",
      "c2_tag": "02 / SCREEN OCR",
      "c2_title": "Gemini sees your code",
      "c2_desc": "Hit F9 — Gemini Vision instantly parses algorithms, time complexity, syntax pitfalls, and hidden edge cases.",
      "c2_status": "O(n log n) · Edge case: Empty Slice",
      "c3_tag": "03 / PANIC SHIELD",
      "c3_title": "Single ESC Emergency Shield",
      "c3_desc": "One keypress transforms your screen into an authentic Linux bash window running passing unit tests.",
      "c4_tag": "04 / IT PHONETICS",
      "c4_title": "116+ Phonetic IT Rules",
      "c4_desc": "Normalizes spoken jargon: 'postgres' → PostgreSQL, 'celery' → Celery, 'goroutines' → Go Routines. Seamless multilingual detection.",
      "c5_tag": "05 / HUD TELEPROMPTER",
      "c5_title": "2-nd Screen or Tablet HUD",
      "c5_desc": "Zero-latency LAN Server-Sent Events sync. Open the prompter on your iPad or secondary phone with instant realtime feed.",
      "c5_status": "SSE Stream · Zero Latency",
      "c6_tag": "06 / ZERO SETUP",
      "c6_title": "Zero API keys required.",
      "c6_desc": "Deepgram and Gemini are managed securely on our backend. No quota limits, no billing headaches. Sign in and start immediately.",
      "c6_cta": "TRY NOW →"
    },
    "comparison": {
      "label": "Market Benchmark",
      "title": "Why Engineers Choose Ghostboard",
      "col_product": "Product",
      "col_price": "Price",
      "col_speed": "Latency",
      "col_freeze": "Freeze",
      "col_ocr": "OCR",
      "col_nokeys": "No API Keys",
      "yes": "Yes",
      "no": "No"
    },
    "pricing": {
      "label": "Transparentní ceny",
      "title": "Investice, která se vrátí s první nabídkou",
      "subtitle": "Bez skrytých poplatků · Připraveno ihned k použití",
      "monthly": "Monthly",
      "annual": "Annual",
      "discount": "−17%",
      "per_month": "/ month",
      "one_time": "one-time",
      "free_tier": "Starter",
      "free_badge": "15-minute live demo",
      "free_cta": "ZAČÍT ZDARMA",
      "pro_tier": "Unlimited",
      "pro_badge": "MOST POPULAR",
      "pro_cta": "ZÍSKAT PRO PASS →",
      "life_tier": "Lifetime",
      "life_cta": "DOŽIVOTNÍ PŘÍSTUP",
      "free_features": [
        "15 min live demo session",
        "Real-time Deepgram STT",
        "Freeze Mode [Space]",
        "Mobile Question Simulator"
      ],
      "pro_features": [
        "Unlimited live interview sessions",
        "Screen & Code OCR [F9]",
        "Dual-screen HUD teleprompter",
        "Blitz answer mode [Q]",
        "Privacy Shield [Esc]",
        "Personalized CV context tuning"
      ],
      "life_features": [
        "All Pro features forever",
        "Early access to next-gen AI models",
        "Priority inference queue",
        "Private Discord mastermind"
      ]
    },
    "reviews": [
      {
        "quote": "The live code OCR caught an off-by-one edge case on my screen before the interviewer even mentioned it.",
        "author": "Maria L.",
        "role": "React Lead",
        "result": "Offer @ International SaaS"
      },
      {
        "quote": "Freeze Mode gives bulletproof calm. You tap space, look directly at the webcam, and sound completely composed.",
        "author": "Dmytro T.",
        "role": "Backend Engineer",
        "result": "Senior @ Fintech, Warsaw"
      },
      {
        "quote": "Landed my US remote offer 4 days after my first practice session. The 1.4s response speed is incredible.",
        "author": "Oleksiy K.",
        "role": "Senior Python",
        "result": "Offer in 4 days"
      }
    ],
    "cta": {
      "title_part1": "Připraveni získat svou ",
      "title_accent": "vysněnou nabídku?",
      "title_part2": "",
      "btn": "SPUSTIT PRVNÍ TRÉNINK →",
      "login": "Máte účet? Přihlásit se",
      "sub": "15 min demo · No credit card required · No personal API keys needed"
    },
    "footer": {
      "privacy": "Soukromí",
      "terms": "Podmínky",
      "settings": "Nastavení",
      "workspace": "Pracovní plocha →"
    }
  },
  "nl": {
    "nav": {
      "features": "FUNCTIES",
      "demo": "DEMO",
      "comparison": "VERGELIJKING",
      "pricing": "PRIJZEN",
      "login": "INLOGGEN",
      "start": "STARTEN →"
    },
    "hero": {
      "badge": "AI-Teleprompter & Live Performance Coach · Technische Interviews & Standups",
      "line1": "Jouw Volgende",
      "line2": "Baan Aanbod",
      "line3": "in 1,5 seconde.",
      "line3_sub": "Elke keer.",
      "desc": "Deepgram transcribeert in 0.4s → Gemini Flash genereert gestructureerde antwoorden op Senior-niveau. Ergonomische teleprompter om taalbarrières en spreekangst te overwinnen. Geen API-sleutels nodig.",
      "cta_start": "GRATIS STARTEN",
      "cta_demo": "DEMO BEKIJKEN",
      "stat_sessions": "Sessies",
      "stat_rules": "Regels",
      "stat_stealth": "Privacybescherming"
    },
    "tickers": {
      "t1": [
        "FREEZE MODE · Stop time during interviews",
        "1.4S GEMINI 2.5 FLASH",
        "SCREEN OCR · Instant code analysis with F9",
        "116+ IT PHONETIC NORMALIZATION RULES",
        "PRIVACY SHIELD · ШВИДКИЙ ФОКУС [ESC] TERMINAL",
        "HUD TELEPROMPTER · DUAL-SCREEN / TABLET SYNC",
        "ZERO SETUP · NO PERSONAL API KEYS NEEDED",
        "$15/MO · OR $79 LIFETIME PASS"
      ],
      "t2": [
        "SENIOR PYTHON / GO / RUST / REACT",
        "ZERO-LATENCY ARCHITECTURAL ANSWERS",
        "OVERCOME LANGUAGE BARRIERS & ANXIETY",
        "15 MIN FREE DEMO SANDBOX",
        "AUTOMATIC ACOUSTIC NOISE GATE",
        "GLOBAL 10+ LANGUAGES SUPPORT"
      ]
    },
    "demo": {
      "label": "Interactive Simulation",
      "title": "Live Call Experience",
      "desc": "Press SPACE or toggle Freeze Mode — answers lock in place while you deliver clearly to camera. AI continues listening in the background.",
      "f1": "Deepgram STT transcribes in 0.4s",
      "f2": "Gemini 2.5 Flash answers in 1.35s",
      "f3": "Freeze Mode [Space] — pause without panic",
      "f4": "116+ phonetic normalization rules",
      "active_session": "ACTIVE SESSION · 08:24",
      "freeze_active": "🧊 FREEZE ACTIVE",
      "freeze_idle": "[ SPACE ] FREEZE",
      "reset": "↺ RESET",
      "question_tag": "🎙 Lead Architect Question · Python & DB · Transcribed in 0.4s",
      "question_text": "“How does PostgreSQL MVCC handle heavy UPDATE loads, and what makes table bloat dangerous when paired with autovacuum latency?”",
      "ai_tag": "⚡ Gemini 2.5 Flash · 1.35s",
      "level": "SENIOR L5",
      "lead": "During PostgreSQL UPDATEs, rows are never overwritten in place — a new tuple version is written, leaving the old one dead:",
      "points": [
        {
          "tag": "TABLE BLOAT",
          "body": "Occurs when autovacuum fails to keep up with dead tuples due to long-running transactions or conservative vacuum scale factor thresholds."
        },
        {
          "tag": "HOT OPTIMIZATION",
          "body": "Heap-Only Tuples place the new row on the exact same page without rewriting secondary indexes (provided indexed columns didn't change)."
        },
        {
          "tag": "PRODUCTION FIX",
          "body": "Tune autovacuum_vacuum_scale_factor=0.05 on write-heavy tables + schedule online pg_repack without read locks."
        }
      ],
      "tip": "💡 Emphasize Heap-Only Tuples (HOT) — instant Senior signal for PostgreSQL internals",
      "generating": "generating...",
      "m_speed": "Latency",
      "m_acc": "Accuracy",
      "m_level": "Level"
    },
    "features": {
      "label": "Architecture",
      "title": "Six Levels of Advantage",
      "subtitle": "Every capability solves an exact high-stakes interview friction point",
      "c1_tag": "01 / FREEZE MODE",
      "c1_badge": "[SPACE]",
      "c1_title": "Pause the stream. Zero panic.",
      "c1_desc": "Tap Space — the teleprompter freezes instantly. Read bullet points naturally while making eye contact. The AI queues new questions in the background.",
      "c1_status": "AI listening in background · +2 questions queued",
      "c2_tag": "02 / SCREEN OCR",
      "c2_title": "Gemini sees your code",
      "c2_desc": "Hit F9 — Gemini Vision instantly parses algorithms, time complexity, syntax pitfalls, and hidden edge cases.",
      "c2_status": "O(n log n) · Edge case: Empty Slice",
      "c3_tag": "03 / PANIC SHIELD",
      "c3_title": "Single ESC Emergency Shield",
      "c3_desc": "One keypress transforms your screen into an authentic Linux bash window running passing unit tests.",
      "c4_tag": "04 / IT PHONETICS",
      "c4_title": "116+ Phonetic IT Rules",
      "c4_desc": "Normalizes spoken jargon: 'postgres' → PostgreSQL, 'celery' → Celery, 'goroutines' → Go Routines. Seamless multilingual detection.",
      "c5_tag": "05 / HUD TELEPROMPTER",
      "c5_title": "2-nd Screen or Tablet HUD",
      "c5_desc": "Zero-latency LAN Server-Sent Events sync. Open the prompter on your iPad or secondary phone with instant realtime feed.",
      "c5_status": "SSE Stream · Zero Latency",
      "c6_tag": "06 / ZERO SETUP",
      "c6_title": "Zero API keys required.",
      "c6_desc": "Deepgram and Gemini are managed securely on our backend. No quota limits, no billing headaches. Sign in and start immediately.",
      "c6_cta": "TRY NOW →"
    },
    "comparison": {
      "label": "Market Benchmark",
      "title": "Why Engineers Choose Ghostboard",
      "col_product": "Product",
      "col_price": "Price",
      "col_speed": "Latency",
      "col_freeze": "Freeze",
      "col_ocr": "OCR",
      "col_nokeys": "No API Keys",
      "yes": "Yes",
      "no": "No"
    },
    "pricing": {
      "label": "Transparante prijzen",
      "title": "Een investering die zichzelf terugbetaalt",
      "subtitle": "Geen verborgen kosten · Direct klaar voor gebruik",
      "monthly": "Monthly",
      "annual": "Annual",
      "discount": "−17%",
      "per_month": "/ month",
      "one_time": "one-time",
      "free_tier": "Starter",
      "free_badge": "15-minute live demo",
      "free_cta": "GRATIS STARTEN",
      "pro_tier": "Unlimited",
      "pro_badge": "MOST POPULAR",
      "pro_cta": "PRO PASS ONTVANGEN →",
      "life_tier": "Lifetime",
      "life_cta": "LIFETIME TOEGANG",
      "free_features": [
        "15 min live demo session",
        "Real-time Deepgram STT",
        "Freeze Mode [Space]",
        "Mobile Question Simulator"
      ],
      "pro_features": [
        "Unlimited live interview sessions",
        "Screen & Code OCR [F9]",
        "Dual-screen HUD teleprompter",
        "Blitz answer mode [Q]",
        "Privacy Shield [Esc]",
        "Personalized CV context tuning"
      ],
      "life_features": [
        "All Pro features forever",
        "Early access to next-gen AI models",
        "Priority inference queue",
        "Private Discord mastermind"
      ]
    },
    "reviews": [
      {
        "quote": "The live code OCR caught an off-by-one edge case on my screen before the interviewer even mentioned it.",
        "author": "Maria L.",
        "role": "React Lead",
        "result": "Offer @ International SaaS"
      },
      {
        "quote": "Freeze Mode gives bulletproof calm. You tap space, look directly at the webcam, and sound completely composed.",
        "author": "Dmytro T.",
        "role": "Backend Engineer",
        "result": "Senior @ Fintech, Warsaw"
      },
      {
        "quote": "Landed my US remote offer 4 days after my first practice session. The 1.4s response speed is incredible.",
        "author": "Oleksiy K.",
        "role": "Senior Python",
        "result": "Offer in 4 days"
      }
    ],
    "cta": {
      "title_part1": "Klaar om jouw ",
      "title_accent": "droomaanbod te claimen?",
      "title_part2": "",
      "btn": "START JE EERSTE SESSIE →",
      "login": "Al een account? Inloggen",
      "sub": "15 min demo · No credit card required · No personal API keys needed"
    },
    "footer": {
      "privacy": "Privacy",
      "terms": "Voorwaarden",
      "settings": "Instellingen",
      "workspace": "Copilot Workspace →"
    }
  }
};

export const LANDING_I18N = LANDING_COPY;
