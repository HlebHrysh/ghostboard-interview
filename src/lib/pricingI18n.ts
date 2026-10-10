import type { SupportedLocale } from './geoLang';

export interface PricingPlanI18n {
  badge: string;
  name: string;
  subtitle: string;
  period?: string;
  popular?: string;
  features: string[];
}

export interface PricingMatrixRowI18n {
  feat: string;
  free: string;
  pro: string;
  life: string;
}

export interface PricingFaqItemI18n {
  q: string;
  a: string;
}

export interface PricingPageI18n {
  plans: {
    free: PricingPlanI18n;
    pro: PricingPlanI18n;
    life: PricingPlanI18n;
  };
  matrix: {
    title: string;
    headers: {
      feature: string;
      free: string;
      pro: string;
      life: string;
    };
    rows: PricingMatrixRowI18n[];
  };
  faq: {
    title: string;
    items: PricingFaqItemI18n[];
  };
  ctaBottom: {
    title: string;
    desc: string;
    btn: string;
  };
}

export const PRICING_I18N: Record<SupportedLocale, PricingPageI18n> = {
  "ua": {
    "plans": {
      "free": {
        "badge": "Starter Coach",
        "name": "Free Trial",
        "subtitle": "Ознайомчий допуск",
        "period": "/ демо 15 хвилин",
        "features": [
          "✓ 15 хв повнофункціональної сесії",
          "✓ Розпізнавання мови в реальному часі",
          "✓ Швидкі тези відповідей Senior-рівня",
          "✓ Freeze Mode [Пробіл] для фіксації",
          "✓ Бліц-режим відповідей [Q]",
          "✓ Без привʼязки банківської картки"
        ]
      },
      "pro": {
        "badge": "Pro Coach & Prompter",
        "name": "Pro Pass",
        "popular": "ХІТ ПРОДАЖІВ",
        "subtitle": "PRO БЕЗЛІМІТ",
        "features": [
          "✓ Необмежені сесії співбесід",
          "✓ Deepgram Nova-3 STT (надшвидкий)",
          "✓ Screen & Code OCR [F9]",
          "✓ Eye-Line суфлер під веб-камеру",
          "✓ HUD-телесуфлер на планшет / iPad",
          "✓ AI Mock Interviewer тренажер"
        ]
      },
      "life": {
        "badge": "Lifetime Access",
        "name": "Lifetime Founder",
        "popular": "Founder Pass",
        "subtitle": "LIFETIME",
        "features": [
          "✓ Пожиттєвий доступ до v2, v3, v4 без підписок",
          "✓ VIP Клуб (Discord/Telegram) з розборами FAANG оферів",
          "✓ Виділений канал ШІ (0.8–1.2с затримка)",
          "✓ Персональний глибокий AI-аудит резюме та GitHub",
          "✓ Early Access до нових голосових ШІ моделей"
        ]
      }
    },
    "matrix": {
      "title": "Детальне порівняння можливостей",
      "headers": {
        "feature": "Функціонал",
        "free": "Free Trial",
        "pro": "Pro Pass",
        "life": "Lifetime"
      },
      "rows": [
        {
          "feat": "Тривалість сесії співбесіди",
          "free": "15 хв (демо)",
          "pro": "Безлімітно",
          "life": "Безлімітно (пожиттєво)"
        },
        {
          "feat": "Апаратний захист від запису (Screen Shield)",
          "free": "—",
          "pro": "✓ Desktop App",
          "life": "✓ Desktop App"
        },
        {
          "feat": "Companion HUD на смартфон (2-й екран)",
          "free": "—",
          "pro": "✓ AMOLED",
          "life": "✓ AMOLED"
        },
        {
          "feat": "Screen & Code OCR розпізнавання [F9]",
          "free": "—",
          "pro": "✓ Миттєво",
          "life": "✓ Миттєво"
        },
        {
          "feat": "Freeze Mode [Пробіл] & Бліц-режим [Q]",
          "free": "✓",
          "pro": "✓",
          "life": "✓"
        },
        {
          "feat": "AI Mock Interviewer тренажер",
          "free": "Базовий",
          "pro": "✓ Повний",
          "life": "✓ Повний"
        },
        {
          "feat": "Експорт звіту співбесіди (.md)",
          "free": "—",
          "pro": "✓",
          "life": "✓"
        },
        {
          "feat": "Персональний аудит резюме та GitHub",
          "free": "—",
          "pro": "—",
          "life": "✓ Founder VIP"
        }
      ]
    },
    "faq": {
      "title": "Часті запитання (FAQ)",
      "items": [
        {
          "q": "Як Ghostboard допомагає подолати мовний бар'єр і хвилювання на співбесіді?",
          "a": "Ghostboard працює як персональний AI-телесуфлер та коуч у реальному часі. Він миттєво транскрибує запитання та виводить лаконічні тези для відповіді, допомагаючи зберігати зоровий контакт, спокій і чітку структуру мовлення під час інтерв'ю та стендапів."
        },
        {
          "q": "Чи потрібно мені самостійно купувати або вставляти власні API-ключі?",
          "a": "Ні! Усі ліцензії та квоти для Deepgram Nova-3 та Gemini 2.5 Flash вже включені у підписку та працюють на наших серверах з коробки."
        },
        {
          "q": "Чи підтримуються співбесіди англійською мовою?",
          "a": "Так. Ghostboard автоматично визначає мову питання інтерв'юера та генерує відповіді природною технічною англійською мовою рівня B2/C1 без складних штучних зворотів."
        },
        {
          "q": "Як працює режим Freeze Mode (Стоп-питання)?",
          "a": "При натисканні клавіші [Пробіл] екран із тезами поточної відповіді фіксується, щоб ви могли спокійно читати. При цьому ШІ продовжує слухати дзвінок у фоні та збирає наступні запитання у чергу."
        },
        {
          "q": "Чи можу я скасувати підписку?",
          "a": "Так, у будь-який момент в один клік у розділі Налаштування вашого акаунту або через особистий кабінет Stripe. Жодних прихованих комісій."
        }
      ]
    },
    "ctaBottom": {
      "title": "Готові впевнено пройти наступне інтерв'ю?",
      "desc": "Почніть з безкоштовного 15-хвилинного тріалу без прив'язки карти.",
      "btn": "Зареєструватися безкоштовно →"
    }
  },
  "en": {
    "plans": {
      "free": {
        "badge": "Starter Coach",
        "name": "Free Trial",
        "subtitle": "Starter Pass",
        "period": "/ 15 min demo",
        "features": [
          "✓ 15-min full-featured live session",
          "✓ Real-time speech transcription",
          "✓ Structured Senior-level answers",
          "✓ Freeze Mode [Space] text locking",
          "✓ Concise blitz answers [Q]",
          "✓ No credit card required to test"
        ]
      },
      "pro": {
        "badge": "Pro Coach & Prompter",
        "name": "Pro Pass",
        "popular": "MOST POPULAR",
        "subtitle": "PRO UNLIMITED",
        "features": [
          "✓ Unlimited interview sessions",
          "✓ Deepgram Nova-3 STT (ultra-fast)",
          "✓ Screen & Code OCR [F9]",
          "✓ Eye-Line webcam teleprompter",
          "✓ HUD teleprompter for iPad / phone",
          "✓ AI Voice Mock Interviewer"
        ]
      },
      "life": {
        "badge": "Lifetime Access",
        "name": "Lifetime Founder",
        "popular": "Founder Pass",
        "subtitle": "LIFETIME",
        "features": [
          "✓ Lifetime access to v2, v3, v4 without subscriptions",
          "✓ VIP Club (Discord/Telegram) with FAANG offer debriefs",
          "✓ Dedicated ultra-low latency AI lane (0.8–1.2s)",
          "✓ Personalized deep AI audit of CV and GitHub",
          "✓ Early access to next-gen voice AI models"
        ]
      }
    },
    "matrix": {
      "title": "Detailed Feature Comparison",
      "headers": {
        "feature": "Feature",
        "free": "Free Trial",
        "pro": "Pro Pass",
        "life": "Lifetime"
      },
      "rows": [
        {
          "feat": "Live Session Duration",
          "free": "15 min (demo)",
          "pro": "Unlimited",
          "life": "Unlimited (Forever)"
        },
        {
          "feat": "Hardware Stealth Screen Shield",
          "free": "—",
          "pro": "✓ Desktop App",
          "life": "✓ Desktop App"
        },
        {
          "feat": "Mobile Companion HUD (2nd Screen)",
          "free": "—",
          "pro": "✓ AMOLED",
          "life": "✓ AMOLED"
        },
        {
          "feat": "Screen & Code OCR Solver [F9]",
          "free": "—",
          "pro": "✓ Instant",
          "life": "✓ Instant"
        },
        {
          "feat": "Freeze Mode [Space] & Blitz [Q]",
          "free": "✓",
          "pro": "✓",
          "life": "✓"
        },
        {
          "feat": "AI Mock Interview Simulator",
          "free": "Basic",
          "pro": "✓ Full Access",
          "life": "✓ Full Access"
        },
        {
          "feat": "Interview Debrief Export (.md)",
          "free": "—",
          "pro": "✓",
          "life": "✓"
        },
        {
          "feat": "Personal Resume & GitHub Audit",
          "free": "—",
          "pro": "—",
          "life": "✓ Founder VIP"
        }
      ]
    },
    "faq": {
      "title": "Frequently Asked Questions",
      "items": [
        {
          "q": "How does Ghostboard help overcome language barriers and interview anxiety?",
          "a": "Ghostboard functions as a personal AI teleprompter and real-time performance coach. It transcribes live speech and provides structured bullet points on your screen or tablet, helping you maintain confident eye contact, clear English articulation, and calm focus throughout technical interviews and standups."
        },
        {
          "q": "Do I need to purchase or provide my own API keys?",
          "a": "No! All quotas and licenses for Deepgram Nova-3 and Gemini 2.5 Flash are included out of the box."
        },
        {
          "q": "Are technical interviews in English supported?",
          "a": "Yes. Ghostboard automatically detects interviewer speech and crafts natural, technical responses at B2/C1 fluency."
        },
        {
          "q": "How does Freeze Mode work?",
          "a": "Pressing [Space] locks the current response bullets on screen for relaxed reading while the AI continues listening in the background."
        },
        {
          "q": "Can I cancel my subscription anytime?",
          "a": "Yes, cancel anytime with a single click in your Account Settings or via the Stripe customer portal. Zero hidden fees."
        }
      ]
    },
    "ctaBottom": {
      "title": "Ready to Ace Your Next Interview?",
      "desc": "Start with a free 15-minute trial. No credit card required.",
      "btn": "Sign Up Free →"
    }
  },
  "pl": {
    "plans": {
      "free": {
        "badge": "Starter Coach",
        "name": "Free Trial",
        "subtitle": "Wstępny dostęp",
        "period": "/ 15 min demo",
        "features": [
          "✓ 15-minutowa pełna sesja próbna",
          "✓ Transkrypcja mowy w czasie rzeczywistym",
          "✓ Tezy odpowiedzi na poziomie Seniora",
          "✓ Freeze Mode [Spacja] do blokady tekstu",
          "✓ Tryb zwięzły [Q]",
          "✓ Karta kredytowa nie jest wymagana"
        ]
      },
      "pro": {
        "badge": "Pro Coach & Prompter",
        "name": "Pro Pass",
        "popular": "MOST POPULAR",
        "subtitle": "PRO BEZ LIMITU",
        "features": [
          "✓ Unlimited interview sessions",
          "✓ Deepgram Nova-3 STT (ultra-fast)",
          "✓ Screen & Code OCR [F9]",
          "✓ Eye-Line webcam teleprompter",
          "✓ HUD teleprompter for iPad / phone",
          "✓ AI Voice Mock Interviewer"
        ]
      },
      "life": {
        "badge": "Lifetime Access",
        "name": "Lifetime Founder",
        "popular": "Founder Pass",
        "subtitle": "DOŻYWOTNIO",
        "features": [
          "✓ Lifetime access to v2, v3, v4 without subscriptions",
          "✓ VIP Club (Discord/Telegram) with FAANG offer debriefs",
          "✓ Dedicated ultra-low latency AI lane (0.8–1.2s)",
          "✓ Personalized deep AI audit of CV and GitHub",
          "✓ Early access to next-gen voice AI models"
        ]
      }
    },
    "matrix": {
      "title": "Szczegółowe porównanie funkcji",
      "headers": {
        "feature": "Feature",
        "free": "Free Trial",
        "pro": "Pro Pass",
        "life": "Lifetime"
      },
      "rows": [
        {
          "feat": "Czas trwania sesji rozmowy",
          "free": "15 min (demo)",
          "pro": "Bez limitu",
          "life": "Bez limitu (dożywotnio)"
        },
        {
          "feat": "Sprzętowa ochrona ekranu (Screen Shield)",
          "free": "—",
          "pro": "✓ Desktop App",
          "life": "✓ Desktop App"
        },
        {
          "feat": "Companion HUD na telefon (2. ekran)",
          "free": "—",
          "pro": "✓ AMOLED",
          "life": "✓ AMOLED"
        },
        {
          "feat": "Analiza ekranu i kodu OCR [F9]",
          "free": "—",
          "pro": "✓ Natychmiast",
          "life": "✓ Natychmiast"
        },
        {
          "feat": "Freeze Mode [Spacja] & Tryb szybki [Q]",
          "free": "✓",
          "pro": "✓",
          "life": "✓"
        },
        {
          "feat": "Symulator rozmów AI Mock Interviewer",
          "free": "Podstawowy",
          "pro": "✓ Pełny dostęp",
          "life": "✓ Pełny dostęp"
        },
        {
          "feat": "Eksport raportu z rozmowy (.md)",
          "free": "—",
          "pro": "✓",
          "life": "✓"
        },
        {
          "feat": "Osobisty audyt CV i profilu GitHub",
          "free": "—",
          "pro": "—",
          "life": "✓ Founder VIP"
        }
      ]
    },
    "faq": {
      "title": "Często zadawane pytania (FAQ)",
      "items": [
        {
          "q": "Jak Ghostboard pomaga pokonać barierę językową i stres podczas rozmowy?",
          "a": "Ghostboard działa jako osobisty teleprompter AI i trener w czasie rzeczywistym. Transkrybuje mowę na żywo i wyświetla ustrukturyzowane wskazówki, pomagając utrzymać kontakt wzrokowy, płynną komunikację techniczną i spokój podczas rozmów rekrutacyjnych oraz standupów."
        },
        {
          "q": "Do I need to purchase or provide my own API keys?",
          "a": "No! All quotas and licenses for Deepgram Nova-3 and Gemini 2.5 Flash are included out of the box."
        },
        {
          "q": "Are technical interviews in English supported?",
          "a": "Yes. Ghostboard automatically detects interviewer speech and crafts natural, technical responses at B2/C1 fluency."
        },
        {
          "q": "How does Freeze Mode work?",
          "a": "Pressing [Space] locks the current response bullets on screen for relaxed reading while the AI continues listening in the background."
        },
        {
          "q": "Can I cancel my subscription anytime?",
          "a": "Yes, cancel anytime with a single click in your Account Settings or via the Stripe customer portal. Zero hidden fees."
        }
      ]
    },
    "ctaBottom": {
      "title": "Gotowy, aby pewnie przejść kolejną rozmowę?",
      "desc": "Rozpocznij od darmowego 15-minutowego testu bez podawania karty.",
      "btn": "Zarejestruj się za darmo →"
    }
  },
  "de": {
    "plans": {
      "free": {
        "badge": "Starter Coach",
        "name": "Free Trial",
        "subtitle": "Einstiegszugang",
        "period": "/ 15 Min. Demo",
        "features": [
          "✓ 15 Min. voll ausgestattete Testsitzung",
          "✓ Echtzeit-Sprachtranskription",
          "✓ Strukturierte Senior-Antworten",
          "✓ Freeze Mode [Leertaste] zur Textfixierung",
          "✓ Blitz-Antwortmodus [Q]",
          "✓ Keine Kreditkarte erforderlich"
        ]
      },
      "pro": {
        "badge": "Pro Coach & Prompter",
        "name": "Pro Pass",
        "popular": "MOST POPULAR",
        "subtitle": "PRO UNBEGRENZT",
        "features": [
          "✓ Unlimited interview sessions",
          "✓ Deepgram Nova-3 STT (ultra-fast)",
          "✓ Screen & Code OCR [F9]",
          "✓ Eye-Line webcam teleprompter",
          "✓ HUD teleprompter for iPad / phone",
          "✓ AI Voice Mock Interviewer"
        ]
      },
      "life": {
        "badge": "Lifetime Access",
        "name": "Lifetime Founder",
        "popular": "Founder Pass",
        "subtitle": "LEBENSLANG",
        "features": [
          "✓ Lifetime access to v2, v3, v4 without subscriptions",
          "✓ VIP Club (Discord/Telegram) with FAANG offer debriefs",
          "✓ Dedicated ultra-low latency AI lane (0.8–1.2s)",
          "✓ Personalized deep AI audit of CV and GitHub",
          "✓ Early access to next-gen voice AI models"
        ]
      }
    },
    "matrix": {
      "title": "Detaillierter Funktionsvergleich",
      "headers": {
        "feature": "Feature",
        "free": "Free Trial",
        "pro": "Pro Pass",
        "life": "Lifetime"
      },
      "rows": [
        {
          "feat": "Sitzungsdauer im Interview",
          "free": "15 Min. (Demo)",
          "pro": "Unbegrenzt",
          "life": "Lebenslang unbegrenzt"
        },
        {
          "feat": "Hardware-Screenshare-Schutz (Screen Shield)",
          "free": "—",
          "pro": "✓ Desktop App",
          "life": "✓ Desktop App"
        },
        {
          "feat": "Smartphone Companion HUD (2. Bildschirm)",
          "free": "—",
          "pro": "✓ AMOLED",
          "life": "✓ AMOLED"
        },
        {
          "feat": "Screen- & Code-OCR Erkennung [F9]",
          "free": "—",
          "pro": "✓ Sofort",
          "life": "✓ Sofort"
        },
        {
          "feat": "Freeze Mode [Leertaste] & Blitzmodus [Q]",
          "free": "✓",
          "pro": "✓",
          "life": "✓"
        },
        {
          "feat": "KI-Mock-Interview-Simulator",
          "free": "Basis",
          "pro": "✓ Vollzugriff",
          "life": "✓ Vollzugriff"
        },
        {
          "feat": "Interview-Berichtsexport (.md)",
          "free": "—",
          "pro": "✓",
          "life": "✓"
        },
        {
          "feat": "Persönlicher Lebenslauf- & GitHub-Audit",
          "free": "—",
          "pro": "—",
          "life": "✓ Founder VIP"
        }
      ]
    },
    "faq": {
      "title": "Häufig gestellte Fragen (FAQ)",
      "items": [
        {
          "q": "Wie hilft Ghostboard bei Sprachbarrieren und Nervosität im Vorstellungsgespräch?",
          "a": "Ghostboard fungiert als persönlicher KI-Teleprompter und Live-Performance-Coach. Es transkribiert gesprochene Fragen in Echtzeit und blendet strukturierte Stichpunkte ein, damit Sie natürlichen Blickkontakt halten, Sprachbarrieren überwinden und souverän antworten können."
        },
        {
          "q": "Do I need to purchase or provide my own API keys?",
          "a": "No! All quotas and licenses for Deepgram Nova-3 and Gemini 2.5 Flash are included out of the box."
        },
        {
          "q": "Are technical interviews in English supported?",
          "a": "Yes. Ghostboard automatically detects interviewer speech and crafts natural, technical responses at B2/C1 fluency."
        },
        {
          "q": "How does Freeze Mode work?",
          "a": "Pressing [Space] locks the current response bullets on screen for relaxed reading while the AI continues listening in the background."
        },
        {
          "q": "Can I cancel my subscription anytime?",
          "a": "Yes, cancel anytime with a single click in your Account Settings or via the Stripe customer portal. Zero hidden fees."
        }
      ]
    },
    "ctaBottom": {
      "title": "Bereit für Ihr nächstes Vorstellungsgespräch?",
      "desc": "Starten Sie mit einem kostenlosen 15-minütigen Test ohne Kreditkarte.",
      "btn": "Kostenlos registrieren →"
    }
  },
  "fr": {
    "plans": {
      "free": {
        "badge": "Starter Coach",
        "name": "Free Trial",
        "subtitle": "Accès d'initiation",
        "period": "/ démo 15 min",
        "features": [
          "✓ 15 min de session d’essai complète",
          "✓ Transcription vocale en temps réel",
          "✓ Réponses structurées niveau Senior",
          "✓ Mode Freeze [Espace] pour verrouiller",
          "✓ Mode réponses concises [Q]",
          "✓ Sans carte bancaire requise"
        ]
      },
      "pro": {
        "badge": "Pro Coach & Prompter",
        "name": "Pro Pass",
        "popular": "MOST POPULAR",
        "subtitle": "PRO ILLIMITÉ",
        "features": [
          "✓ Unlimited interview sessions",
          "✓ Deepgram Nova-3 STT (ultra-fast)",
          "✓ Screen & Code OCR [F9]",
          "✓ Eye-Line webcam teleprompter",
          "✓ HUD teleprompter for iPad / phone",
          "✓ AI Voice Mock Interviewer"
        ]
      },
      "life": {
        "badge": "Lifetime Access",
        "name": "Lifetime Founder",
        "popular": "Founder Pass",
        "subtitle": "À VIE",
        "features": [
          "✓ Lifetime access to v2, v3, v4 without subscriptions",
          "✓ VIP Club (Discord/Telegram) with FAANG offer debriefs",
          "✓ Dedicated ultra-low latency AI lane (0.8–1.2s)",
          "✓ Personalized deep AI audit of CV and GitHub",
          "✓ Early access to next-gen voice AI models"
        ]
      }
    },
    "matrix": {
      "title": "Comparaison détaillée des fonctionnalités",
      "headers": {
        "feature": "Feature",
        "free": "Free Trial",
        "pro": "Pro Pass",
        "life": "Lifetime"
      },
      "rows": [
        {
          "feat": "Durée de session d’entretien",
          "free": "15 min (démo)",
          "pro": "Illimité",
          "life": "Illimité à vie"
        },
        {
          "feat": "Protection d’écran matérielle (Screen Shield)",
          "free": "—",
          "pro": "✓ Desktop App",
          "life": "✓ Desktop App"
        },
        {
          "feat": "Companion HUD smartphone (2e écran)",
          "free": "—",
          "pro": "✓ AMOLED",
          "life": "✓ AMOLED"
        },
        {
          "feat": "Analyse d’écran et code OCR [F9]",
          "free": "—",
          "pro": "✓ Immédiat",
          "life": "✓ Immédiat"
        },
        {
          "feat": "Mode Freeze [Espace] & Concis [Q]",
          "free": "✓",
          "pro": "✓",
          "life": "✓"
        },
        {
          "feat": "Simulateur d’entretien AI Mock",
          "free": "Basique",
          "pro": "✓ Accès total",
          "life": "✓ Accès total"
        },
        {
          "feat": "Export du débriefing d’entretien (.md)",
          "free": "—",
          "pro": "✓",
          "life": "✓"
        },
        {
          "feat": "Audit personnalisé du CV et de GitHub",
          "free": "—",
          "pro": "—",
          "life": "✓ Founder VIP"
        }
      ]
    },
    "faq": {
      "title": "Foire aux questions (FAQ)",
      "items": [
        {
          "q": "Comment Ghostboard aide-t-il à surmonter la barrière de la langue et le stress de l'entretien ?",
          "a": "Ghostboard fonctionne comme un téléprompteur IA personnel et un coach de performance en direct. Il transcrit les échanges en temps réel et affiche des points clés structurés, vous aidant à garder un contact visuel confiant et à surmonter l'anxiété lors d'entretiens ou de réunions quotidiennes."
        },
        {
          "q": "Do I need to purchase or provide my own API keys?",
          "a": "No! All quotas and licenses for Deepgram Nova-3 and Gemini 2.5 Flash are included out of the box."
        },
        {
          "q": "Are technical interviews in English supported?",
          "a": "Yes. Ghostboard automatically detects interviewer speech and crafts natural, technical responses at B2/C1 fluency."
        },
        {
          "q": "How does Freeze Mode work?",
          "a": "Pressing [Space] locks the current response bullets on screen for relaxed reading while the AI continues listening in the background."
        },
        {
          "q": "Can I cancel my subscription anytime?",
          "a": "Yes, cancel anytime with a single click in your Account Settings or via the Stripe customer portal. Zero hidden fees."
        }
      ]
    },
    "ctaBottom": {
      "title": "Prêt à réussir votre prochain entretien technique ?",
      "desc": "Commencez par un essai gratuit de 15 minutes sans carte bancaire.",
      "btn": "S'inscrire gratuitement →"
    }
  },
  "es": {
    "plans": {
      "free": {
        "badge": "Starter Coach",
        "name": "Free Trial",
        "subtitle": "Acceso de prueba",
        "period": "/ demo 15 min",
        "features": [
          "✓ 15 min de sesión de prueba completa",
          "✓ Transcripción de voz en tiempo real",
          "✓ Respuestas estructuradas nivel Senior",
          "✓ Freeze Mode [Espacio] para fijar texto",
          "✓ Modo respuestas rápidas [Q]",
          "✓ Sin tarjeta de crédito requerida"
        ]
      },
      "pro": {
        "badge": "Pro Coach & Prompter",
        "name": "Pro Pass",
        "popular": "MOST POPULAR",
        "subtitle": "PRO ILIMITADO",
        "features": [
          "✓ Unlimited interview sessions",
          "✓ Deepgram Nova-3 STT (ultra-fast)",
          "✓ Screen & Code OCR [F9]",
          "✓ Eye-Line webcam teleprompter",
          "✓ HUD teleprompter for iPad / phone",
          "✓ AI Voice Mock Interviewer"
        ]
      },
      "life": {
        "badge": "Lifetime Access",
        "name": "Lifetime Founder",
        "popular": "Founder Pass",
        "subtitle": "DE POR VIDA",
        "features": [
          "✓ Lifetime access to v2, v3, v4 without subscriptions",
          "✓ VIP Club (Discord/Telegram) with FAANG offer debriefs",
          "✓ Dedicated ultra-low latency AI lane (0.8–1.2s)",
          "✓ Personalized deep AI audit of CV and GitHub",
          "✓ Early access to next-gen voice AI models"
        ]
      }
    },
    "matrix": {
      "title": "Comparativa detallada de funciones",
      "headers": {
        "feature": "Feature",
        "free": "Free Trial",
        "pro": "Pro Pass",
        "life": "Lifetime"
      },
      "rows": [
        {
          "feat": "Duración de la sesión de entrevista",
          "free": "15 min (demo)",
          "pro": "Ilimitado",
          "life": "Ilimitado de por vida"
        },
        {
          "feat": "Protección de pantalla hardware (Screen Shield)",
          "free": "—",
          "pro": "✓ Desktop App",
          "life": "✓ Desktop App"
        },
        {
          "feat": "Companion HUD móvil (2.ª pantalla)",
          "free": "—",
          "pro": "✓ AMOLED",
          "life": "✓ AMOLED"
        },
        {
          "feat": "OCR de pantalla y código en vivo [F9]",
          "free": "—",
          "pro": "✓ Instantáneo",
          "life": "✓ Instantáneo"
        },
        {
          "feat": "Freeze Mode [Espacio] y Rápido [Q]",
          "free": "✓",
          "pro": "✓",
          "life": "✓"
        },
        {
          "feat": "Simulador de entrevistas con IA",
          "free": "Básico",
          "pro": "✓ Acceso total",
          "life": "✓ Acceso total"
        },
        {
          "feat": "Exportación de informe (.md)",
          "free": "—",
          "pro": "✓",
          "life": "✓"
        },
        {
          "feat": "Auditoría VIP de CV y GitHub",
          "free": "—",
          "pro": "—",
          "life": "✓ Founder VIP"
        }
      ]
    },
    "faq": {
      "title": "Preguntas frecuentes (FAQ)",
      "items": [
        {
          "q": "¿Cómo ayuda Ghostboard a superar la barrera del idioma y los nervios en la entrevista?",
          "a": "Ghostboard actúa como tu teleprompter de IA y coach de rendimiento en tiempo real. Transcribe el audio en directo y genera notas clave estructuradas en tu pantalla o tablet, ayudándote a mantener el contacto visual, la calma y una comunicación técnica fluida."
        },
        {
          "q": "Do I need to purchase or provide my own API keys?",
          "a": "No! All quotas and licenses for Deepgram Nova-3 and Gemini 2.5 Flash are included out of the box."
        },
        {
          "q": "Are technical interviews in English supported?",
          "a": "Yes. Ghostboard automatically detects interviewer speech and crafts natural, technical responses at B2/C1 fluency."
        },
        {
          "q": "How does Freeze Mode work?",
          "a": "Pressing [Space] locks the current response bullets on screen for relaxed reading while the AI continues listening in the background."
        },
        {
          "q": "Can I cancel my subscription anytime?",
          "a": "Yes, cancel anytime with a single click in your Account Settings or via the Stripe customer portal. Zero hidden fees."
        }
      ]
    },
    "ctaBottom": {
      "title": "¿Listo para superar tu próxima entrevista técnica?",
      "desc": "Comienza con una prueba gratuita de 15 minutos sin tarjeta de crédito.",
      "btn": "Registrarse gratis →"
    }
  },
  "pt": {
    "plans": {
      "free": {
        "badge": "Starter Coach",
        "name": "Free Trial",
        "subtitle": "Acesso inicial",
        "period": "/ demo 15 min",
        "features": [
          "✓ 15 min de sessão de teste completa",
          "✓ Transcrição de voz em tempo real",
          "✓ Respostas estruturadas nível Senior",
          "✓ Modo Freeze [Espaço] para travar texto",
          "✓ Modo respostas rápidas [Q]",
          "✓ Cartão de crédito não obrigatório"
        ]
      },
      "pro": {
        "badge": "Pro Coach & Prompter",
        "name": "Pro Pass",
        "popular": "MOST POPULAR",
        "subtitle": "PRO ILIMITADO",
        "features": [
          "✓ Unlimited interview sessions",
          "✓ Deepgram Nova-3 STT (ultra-fast)",
          "✓ Screen & Code OCR [F9]",
          "✓ Eye-Line webcam teleprompter",
          "✓ HUD teleprompter for iPad / phone",
          "✓ AI Voice Mock Interviewer"
        ]
      },
      "life": {
        "badge": "Lifetime Access",
        "name": "Lifetime Founder",
        "popular": "Founder Pass",
        "subtitle": "VITALÍCIO",
        "features": [
          "✓ Lifetime access to v2, v3, v4 without subscriptions",
          "✓ VIP Club (Discord/Telegram) with FAANG offer debriefs",
          "✓ Dedicated ultra-low latency AI lane (0.8–1.2s)",
          "✓ Personalized deep AI audit of CV and GitHub",
          "✓ Early access to next-gen voice AI models"
        ]
      }
    },
    "matrix": {
      "title": "Comparação detalhada de recursos",
      "headers": {
        "feature": "Feature",
        "free": "Free Trial",
        "pro": "Pro Pass",
        "life": "Lifetime"
      },
      "rows": [
        {
          "feat": "Duração da sessão de entrevista",
          "free": "15 min (demo)",
          "pro": "Ilimitado",
          "life": "Ilimitado vitalício"
        },
        {
          "feat": "Proteção de tela hardware (Screen Shield)",
          "free": "—",
          "pro": "✓ Desktop App",
          "life": "✓ Desktop App"
        },
        {
          "feat": "Companion HUD no smartphone (2ª tela)",
          "free": "—",
          "pro": "✓ AMOLED",
          "life": "✓ AMOLED"
        },
        {
          "feat": "OCR de tela e código ao vivo [F9]",
          "free": "—",
          "pro": "✓ Instantâneo",
          "life": "✓ Instantâneo"
        },
        {
          "feat": "Modo Freeze [Espaço] e Rápido [Q]",
          "free": "✓",
          "pro": "✓",
          "life": "✓"
        },
        {
          "feat": "Simulador de entrevistas com IA",
          "free": "Básico",
          "pro": "✓ Acesso total",
          "life": "✓ Acesso total"
        },
        {
          "feat": "Exportação do relatório da sessão (.md)",
          "free": "—",
          "pro": "✓",
          "life": "✓"
        },
        {
          "feat": "Auditoria individual de currículo e GitHub",
          "free": "—",
          "pro": "—",
          "life": "✓ Founder VIP"
        }
      ]
    },
    "faq": {
      "title": "Perguntas Frequentes (FAQ)",
      "items": [
        {
          "q": "Como o Ghostboard ajuda a superar barreiras linguísticas e o nervosismo na entrevista?",
          "a": "O Ghostboard atua como um teleprompter de IA pessoal e coach de desempenho em tempo real. Ele transcreve a conversa instantaneamente e exibe tópicos estruturados, permitindo manter contato visual confiante e superar a ansiedade durante entrevistas técnicas e reuniões."
        },
        {
          "q": "Do I need to purchase or provide my own API keys?",
          "a": "No! All quotas and licenses for Deepgram Nova-3 and Gemini 2.5 Flash are included out of the box."
        },
        {
          "q": "Are technical interviews in English supported?",
          "a": "Yes. Ghostboard automatically detects interviewer speech and crafts natural, technical responses at B2/C1 fluency."
        },
        {
          "q": "How does Freeze Mode work?",
          "a": "Pressing [Space] locks the current response bullets on screen for relaxed reading while the AI continues listening in the background."
        },
        {
          "q": "Can I cancel my subscription anytime?",
          "a": "Yes, cancel anytime with a single click in your Account Settings or via the Stripe customer portal. Zero hidden fees."
        }
      ]
    },
    "ctaBottom": {
      "title": "Pronto para conquistar sua próxima vaga?",
      "desc": "Comece com um teste grátis de 15 minutos sem necessidade de cartão.",
      "btn": "Cadastre-se gratuitamente →"
    }
  },
  "it": {
    "plans": {
      "free": {
        "badge": "Starter Coach",
        "name": "Free Trial",
        "subtitle": "Accesso di prova",
        "period": "/ demo 15 min",
        "features": [
          "✓ 15 min di sessione di prova completa",
          "✓ Trascrizione vocale in tempo reale",
          "✓ Risposte strutturate livello Senior",
          "✓ Freeze Mode [Spazio] per bloccare testo",
          "✓ Modalità risposte concise [Q]",
          "✓ Nessuna carta di credito richiesta"
        ]
      },
      "pro": {
        "badge": "Pro Coach & Prompter",
        "name": "Pro Pass",
        "popular": "MOST POPULAR",
        "subtitle": "PRO ILLIMITATO",
        "features": [
          "✓ Unlimited interview sessions",
          "✓ Deepgram Nova-3 STT (ultra-fast)",
          "✓ Screen & Code OCR [F9]",
          "✓ Eye-Line webcam teleprompter",
          "✓ HUD teleprompter for iPad / phone",
          "✓ AI Voice Mock Interviewer"
        ]
      },
      "life": {
        "badge": "Lifetime Access",
        "name": "Lifetime Founder",
        "popular": "Founder Pass",
        "subtitle": "A VITA",
        "features": [
          "✓ Lifetime access to v2, v3, v4 without subscriptions",
          "✓ VIP Club (Discord/Telegram) with FAANG offer debriefs",
          "✓ Dedicated ultra-low latency AI lane (0.8–1.2s)",
          "✓ Personalized deep AI audit of CV and GitHub",
          "✓ Early access to next-gen voice AI models"
        ]
      }
    },
    "matrix": {
      "title": "Confronto dettagliato delle funzionalità",
      "headers": {
        "feature": "Feature",
        "free": "Free Trial",
        "pro": "Pro Pass",
        "life": "Lifetime"
      },
      "rows": [
        {
          "feat": "Durata della sessione di colloquio",
          "free": "15 min (demo)",
          "pro": "Illimitato",
          "life": "Illimitato a vita"
        },
        {
          "feat": "Protezione hardware dello schermo (Screen Shield)",
          "free": "—",
          "pro": "✓ Desktop App",
          "life": "✓ Desktop App"
        },
        {
          "feat": "Companion HUD per smartphone (2° schermo)",
          "free": "—",
          "pro": "✓ AMOLED",
          "life": "✓ AMOLED"
        },
        {
          "feat": "OCR schermo e codice live [F9]",
          "free": "—",
          "pro": "✓ Istantaneo",
          "life": "✓ Istantaneo"
        },
        {
          "feat": "Freeze Mode [Spazio] e Conciso [Q]",
          "free": "✓",
          "pro": "✓",
          "life": "✓"
        },
        {
          "feat": "Simulatore di colloqui AI Mock",
          "free": "Base",
          "pro": "✓ Accesso completo",
          "life": "✓ Accesso completo"
        },
        {
          "feat": "Esportazione report colloquio (.md)",
          "free": "—",
          "pro": "✓",
          "life": "✓"
        },
        {
          "feat": "Revisione personale CV e GitHub",
          "free": "—",
          "pro": "—",
          "life": "✓ Founder VIP"
        }
      ]
    },
    "faq": {
      "title": "Domande Frequenti (FAQ)",
      "items": [
        {
          "q": "Come aiuta Ghostboard a superare le barriere linguistiche e l'ansia da colloquio?",
          "a": "Ghostboard funziona come un teleprompter AI personale e live performance coach. Trascrive il parlato in tempo reale e mostra punti chiave strutturati, aiutandoti a mantenere il contatto visivo, superare l'ansia e strutturare risposte tecniche chiare."
        },
        {
          "q": "Do I need to purchase or provide my own API keys?",
          "a": "No! All quotas and licenses for Deepgram Nova-3 and Gemini 2.5 Flash are included out of the box."
        },
        {
          "q": "Are technical interviews in English supported?",
          "a": "Yes. Ghostboard automatically detects interviewer speech and crafts natural, technical responses at B2/C1 fluency."
        },
        {
          "q": "How does Freeze Mode work?",
          "a": "Pressing [Space] locks the current response bullets on screen for relaxed reading while the AI continues listening in the background."
        },
        {
          "q": "Can I cancel my subscription anytime?",
          "a": "Yes, cancel anytime with a single click in your Account Settings or via the Stripe customer portal. Zero hidden fees."
        }
      ]
    },
    "ctaBottom": {
      "title": "Pronto a superare il tuo prossimo colloquio?",
      "desc": "Inizia con una prova gratuita di 15 minuti senza carta di credito.",
      "btn": "Registrati gratis →"
    }
  },
  "cs": {
    "plans": {
      "free": {
        "badge": "Starter Coach",
        "name": "Free Trial",
        "subtitle": "Zkušební přístup",
        "period": "/ 15 min demo",
        "features": [
          "✓ 15 min plnohodnotné zkušební relace",
          "✓ Přepis řeči v reálném čase",
          "✓ Strukturované odpovědi úrovně Senior",
          "✓ Freeze Mode [Mezerník] pro fixaci textu",
          "✓ Režim stručných odpovědí [Q]",
          "✓ Platební karta není vyžadována"
        ]
      },
      "pro": {
        "badge": "Pro Coach & Prompter",
        "name": "Pro Pass",
        "popular": "MOST POPULAR",
        "subtitle": "PRO NEOMEZENĚ",
        "features": [
          "✓ Unlimited interview sessions",
          "✓ Deepgram Nova-3 STT (ultra-fast)",
          "✓ Screen & Code OCR [F9]",
          "✓ Eye-Line webcam teleprompter",
          "✓ HUD teleprompter for iPad / phone",
          "✓ AI Voice Mock Interviewer"
        ]
      },
      "life": {
        "badge": "Lifetime Access",
        "name": "Lifetime Founder",
        "popular": "Founder Pass",
        "subtitle": "DOŽIVOTNÍ",
        "features": [
          "✓ Lifetime access to v2, v3, v4 without subscriptions",
          "✓ VIP Club (Discord/Telegram) with FAANG offer debriefs",
          "✓ Dedicated ultra-low latency AI lane (0.8–1.2s)",
          "✓ Personalized deep AI audit of CV and GitHub",
          "✓ Early access to next-gen voice AI models"
        ]
      }
    },
    "matrix": {
      "title": "Podrobné porovnání funkcí",
      "headers": {
        "feature": "Feature",
        "free": "Free Trial",
        "pro": "Pro Pass",
        "life": "Lifetime"
      },
      "rows": [
        {
          "feat": "Délka relace pohovoru",
          "free": "15 min (demo)",
          "pro": "Neomezeně",
          "life": "Doživotně neomezeně"
        },
        {
          "feat": "Hardwarová ochrana obrazovky (Screen Shield)",
          "free": "—",
          "pro": "✓ Desktop App",
          "life": "✓ Desktop App"
        },
        {
          "feat": "Companion HUD na mobil (2. obrazovka)",
          "free": "—",
          "pro": "✓ AMOLED",
          "life": "✓ AMOLED"
        },
        {
          "feat": "OCR snímání obrazovky a kódu [F9]",
          "free": "—",
          "pro": "✓ Okamžitě",
          "life": "✓ Okamžitě"
        },
        {
          "feat": "Freeze Mode [Mezerník] & Stručný režim [Q]",
          "free": "✓",
          "pro": "✓",
          "life": "✓"
        },
        {
          "feat": "AI trenažér technických pohovorů",
          "free": "Základní",
          "pro": "✓ Plný přístup",
          "life": "✓ Plný přístup"
        },
        {
          "feat": "Export reportu z pohovoru (.md)",
          "free": "—",
          "pro": "✓",
          "life": "✓"
        },
        {
          "feat": "Osobní audit životopisu a GitHubu",
          "free": "—",
          "pro": "—",
          "life": "✓ Founder VIP"
        }
      ]
    },
    "faq": {
      "title": "Často kladené otázky (FAQ)",
      "items": [
        {
          "q": "Jak Ghostboard pomáhá překonat jazykovou bariéru a nervozitu při pohovoru?",
          "a": "Ghostboard funguje jako osobní AI teleprompter a kouč v reálném čase. Okamžitě přepisuje otázky a zobrazuje přehledné body pro odpověď, což vám pomůže udržet oční kontakt, jistotu a klid během technických pohovorů i denních standupů."
        },
        {
          "q": "Do I need to purchase or provide my own API keys?",
          "a": "No! All quotas and licenses for Deepgram Nova-3 and Gemini 2.5 Flash are included out of the box."
        },
        {
          "q": "Are technical interviews in English supported?",
          "a": "Yes. Ghostboard automatically detects interviewer speech and crafts natural, technical responses at B2/C1 fluency."
        },
        {
          "q": "How does Freeze Mode work?",
          "a": "Pressing [Space] locks the current response bullets on screen for relaxed reading while the AI continues listening in the background."
        },
        {
          "q": "Can I cancel my subscription anytime?",
          "a": "Yes, cancel anytime with a single click in your Account Settings or via the Stripe customer portal. Zero hidden fees."
        }
      ]
    },
    "ctaBottom": {
      "title": "Jste připraveni úspěšně zvládnout další pohovor?",
      "desc": "Začněte bezplatnou 15minutovou zkušební verzí bez nutnosti zadávat kartu.",
      "btn": "Zaregistrovat se zdarma →"
    }
  },
  "nl": {
    "plans": {
      "free": {
        "badge": "Starter Coach",
        "name": "Free Trial",
        "subtitle": "Starttoegang",
        "period": "/ 15 min demo",
        "features": [
          "✓ 15 min volledige testsessie",
          "✓ Real-time spraaktranscriptie",
          "✓ Gestructureerde antwoorden op Senior-niveau",
          "✓ Freeze Mode [Spatie] om tekst vast te zetten",
          "✓ Snelle beknopte antwoorden [Q]",
          "✓ Geen creditcard vereist om te testen"
        ]
      },
      "pro": {
        "badge": "Pro Coach & Prompter",
        "name": "Pro Pass",
        "popular": "MOST POPULAR",
        "subtitle": "PRO ONBEPERKT",
        "features": [
          "✓ Unlimited interview sessions",
          "✓ Deepgram Nova-3 STT (ultra-fast)",
          "✓ Screen & Code OCR [F9]",
          "✓ Eye-Line webcam teleprompter",
          "✓ HUD teleprompter for iPad / phone",
          "✓ AI Voice Mock Interviewer"
        ]
      },
      "life": {
        "badge": "Lifetime Access",
        "name": "Lifetime Founder",
        "popular": "Founder Pass",
        "subtitle": "LEVENSLANG",
        "features": [
          "✓ Lifetime access to v2, v3, v4 without subscriptions",
          "✓ VIP Club (Discord/Telegram) with FAANG offer debriefs",
          "✓ Dedicated ultra-low latency AI lane (0.8–1.2s)",
          "✓ Personalized deep AI audit of CV and GitHub",
          "✓ Early access to next-gen voice AI models"
        ]
      }
    },
    "matrix": {
      "title": "Gedetailleerde functievergelijking",
      "headers": {
        "feature": "Feature",
        "free": "Free Trial",
        "pro": "Pro Pass",
        "life": "Lifetime"
      },
      "rows": [
        {
          "feat": "Duur van de interviewsessie",
          "free": "15 min (demo)",
          "pro": "Onbeperkt",
          "life": "Levenslang onbeperkt"
        },
        {
          "feat": "Hardwarematige schermbeveiliging (Screen Shield)",
          "free": "—",
          "pro": "✓ Desktop App",
          "life": "✓ Desktop App"
        },
        {
          "feat": "Smartphone Companion HUD (2e scherm)",
          "free": "—",
          "pro": "✓ AMOLED",
          "life": "✓ AMOLED"
        },
        {
          "feat": "Live scherm- en code-OCR [F9]",
          "free": "—",
          "pro": "✓ Direct",
          "life": "✓ Direct"
        },
        {
          "feat": "Freeze Mode [Spatie] & Beknopt [Q]",
          "free": "✓",
          "pro": "✓",
          "life": "✓"
        },
        {
          "feat": "AI Mock Interview Simulator",
          "free": "Basis",
          "pro": "✓ Volledige toegang",
          "life": "✓ Volledige toegang"
        },
        {
          "feat": "Export van sessieverslag (.md)",
          "free": "—",
          "pro": "✓",
          "life": "✓"
        },
        {
          "feat": "Persoonlijke CV- en GitHub-audit",
          "free": "—",
          "pro": "—",
          "life": "✓ Founder VIP"
        }
      ]
    },
    "faq": {
      "title": "Veelgestelde vragen (FAQ)",
      "items": [
        {
          "q": "Hoe helpt Ghostboard om taalbarrières en spreekangst tijdens een interview te overwinnen?",
          "a": "Ghostboard fungeert als een persoonlijke AI-teleprompter en realtime performance coach. Het transcribeert gesproken vragen live en toont beknopte steekwoorden, zodat u zelfverzekerd oogcontact houdt, taalbarrières overwint en ontspannen blijft tijdens interviews en standups."
        },
        {
          "q": "Do I need to purchase or provide my own API keys?",
          "a": "No! All quotas and licenses for Deepgram Nova-3 and Gemini 2.5 Flash are included out of the box."
        },
        {
          "q": "Are technical interviews in English supported?",
          "a": "Yes. Ghostboard automatically detects interviewer speech and crafts natural, technical responses at B2/C1 fluency."
        },
        {
          "q": "How does Freeze Mode work?",
          "a": "Pressing [Space] locks the current response bullets on screen for relaxed reading while the AI continues listening in the background."
        },
        {
          "q": "Can I cancel my subscription anytime?",
          "a": "Yes, cancel anytime with a single click in your Account Settings or via the Stripe customer portal. Zero hidden fees."
        }
      ]
    },
    "ctaBottom": {
      "title": "Klaar om je volgende interview te halen?",
      "desc": "Begin met een gratis proefperiode van 15 minuten zonder creditcard.",
      "btn": "Gratis aanmelden →"
    }
  }
};
;

export function getPricingTranslations(locale: SupportedLocale): PricingPageI18n {
  return PRICING_I18N[locale] || PRICING_I18N.en;
}
