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
          "✓ 15 хв живого демо-тесту",
          "✓ Gemini 2.5 Flash відповіді",
          "✓ Freeze Mode [Пробіл]",
          "✓ Бліц-режим відповідей [Q]",
          "✕ Screen OCR аналіз коду",
          "✕ Сесія обмежується 15 хвилинами"
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
          "feat": "Час сесій розпізнавання",
          "free": "15 хв",
          "pro": "Безлімітно",
          "life": "Безлімітно"
        },
        {
          "feat": "AI Модель",
          "free": "Gemini Flash",
          "pro": "Gemini 2.5 Flash",
          "life": "Gemini 2.5 Flash"
        },
        {
          "feat": "Швидкість генерації",
          "free": "1.5с",
          "pro": "1.4с",
          "life": "1.4с"
        },
        {
          "feat": "Freeze Mode [Пробіл]",
          "free": "✓",
          "pro": "✓",
          "life": "✓"
        },
        {
          "feat": "Screen Code OCR [F9]",
          "free": "—",
          "pro": "✓",
          "life": "✓"
        },
        {
          "feat": "HUD Телесуфлер на 2-й екран",
          "free": "—",
          "pro": "✓",
          "life": "✓"
        },
        {
          "feat": "Експорт звіту співбесіди (.md)",
          "free": "—",
          "pro": "✓",
          "life": "✓"
        },
        {
          "feat": "Потрібні власні API-ключі",
          "free": "Не потрібні",
          "pro": "Не потрібні",
          "life": "Не потрібні"
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
          "✓ 15-min live demo test",
          "✓ Gemini 2.5 Flash answers",
          "✓ Freeze Mode [Space]",
          "✓ Concise blitz answers [Q]",
          "✕ Screen OCR code analysis",
          "✕ Capped at 15 minutes per session"
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
          "feat": "Session Duration Limit",
          "free": "15 min",
          "pro": "Unlimited",
          "life": "Unlimited"
        },
        {
          "feat": "AI Core Engine",
          "free": "Gemini Flash",
          "pro": "Gemini 2.5 Flash",
          "life": "Gemini 2.5 Flash"
        },
        {
          "feat": "Generation Latency",
          "free": "1.5s",
          "pro": "1.4s",
          "life": "1.4s"
        },
        {
          "feat": "Freeze Mode [Space]",
          "free": "✓",
          "pro": "✓",
          "life": "✓"
        },
        {
          "feat": "Screen Code OCR [F9]",
          "free": "—",
          "pro": "✓",
          "life": "✓"
        },
        {
          "feat": "Dual-Screen HUD Teleprompter",
          "free": "—",
          "pro": "✓",
          "life": "✓"
        },
        {
          "feat": "Markdown Debrief Export (.md)",
          "free": "—",
          "pro": "✓",
          "life": "✓"
        },
        {
          "feat": "Own API Keys Required",
          "free": "No",
          "pro": "No",
          "life": "No"
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
          "✓ 15-min live demo test",
          "✓ Gemini 2.5 Flash answers",
          "✓ Freeze Mode [Space]",
          "✓ Concise blitz answers [Q]",
          "✕ Screen OCR code analysis",
          "✕ Capped at 15 minutes per session"
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
          "feat": "Session Duration Limit",
          "free": "15 min",
          "pro": "Bez limitu",
          "life": "Bez limitu"
        },
        {
          "feat": "AI Core Engine",
          "free": "Gemini Flash",
          "pro": "Gemini 2.5 Flash",
          "life": "Gemini 2.5 Flash"
        },
        {
          "feat": "Generation Latency",
          "free": "1.5s",
          "pro": "1.4s",
          "life": "1.4s"
        },
        {
          "feat": "Freeze Mode [Space]",
          "free": "✓",
          "pro": "✓",
          "life": "✓"
        },
        {
          "feat": "Screen Code OCR [F9]",
          "free": "—",
          "pro": "✓",
          "life": "✓"
        },
        {
          "feat": "Dual-Screen HUD Teleprompter",
          "free": "—",
          "pro": "✓",
          "life": "✓"
        },
        {
          "feat": "Markdown Debrief Export (.md)",
          "free": "—",
          "pro": "✓",
          "life": "✓"
        },
        {
          "feat": "Own API Keys Required",
          "free": "Nie są wymagane",
          "pro": "Nie są wymagane",
          "life": "Nie są wymagane"
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
          "✓ 15-min live demo test",
          "✓ Gemini 2.5 Flash answers",
          "✓ Freeze Mode [Space]",
          "✓ Concise blitz answers [Q]",
          "✕ Screen OCR code analysis",
          "✕ Capped at 15 minutes per session"
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
          "feat": "Session Duration Limit",
          "free": "15 min",
          "pro": "Unbegrenzt",
          "life": "Unbegrenzt"
        },
        {
          "feat": "AI Core Engine",
          "free": "Gemini Flash",
          "pro": "Gemini 2.5 Flash",
          "life": "Gemini 2.5 Flash"
        },
        {
          "feat": "Generation Latency",
          "free": "1.5s",
          "pro": "1.4s",
          "life": "1.4s"
        },
        {
          "feat": "Freeze Mode [Space]",
          "free": "✓",
          "pro": "✓",
          "life": "✓"
        },
        {
          "feat": "Screen Code OCR [F9]",
          "free": "—",
          "pro": "✓",
          "life": "✓"
        },
        {
          "feat": "Dual-Screen HUD Teleprompter",
          "free": "—",
          "pro": "✓",
          "life": "✓"
        },
        {
          "feat": "Markdown Debrief Export (.md)",
          "free": "—",
          "pro": "✓",
          "life": "✓"
        },
        {
          "feat": "Own API Keys Required",
          "free": "Nicht erforderlich",
          "pro": "Nicht erforderlich",
          "life": "Nicht erforderlich"
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
          "✓ 15-min live demo test",
          "✓ Gemini 2.5 Flash answers",
          "✓ Freeze Mode [Space]",
          "✓ Concise blitz answers [Q]",
          "✕ Screen OCR code analysis",
          "✕ Capped at 15 minutes per session"
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
          "feat": "Session Duration Limit",
          "free": "15 min",
          "pro": "Illimité",
          "life": "Illimité"
        },
        {
          "feat": "AI Core Engine",
          "free": "Gemini Flash",
          "pro": "Gemini 2.5 Flash",
          "life": "Gemini 2.5 Flash"
        },
        {
          "feat": "Generation Latency",
          "free": "1.5s",
          "pro": "1.4s",
          "life": "1.4s"
        },
        {
          "feat": "Freeze Mode [Space]",
          "free": "✓",
          "pro": "✓",
          "life": "✓"
        },
        {
          "feat": "Screen Code OCR [F9]",
          "free": "—",
          "pro": "✓",
          "life": "✓"
        },
        {
          "feat": "Dual-Screen HUD Teleprompter",
          "free": "—",
          "pro": "✓",
          "life": "✓"
        },
        {
          "feat": "Markdown Debrief Export (.md)",
          "free": "—",
          "pro": "✓",
          "life": "✓"
        },
        {
          "feat": "Own API Keys Required",
          "free": "Non requis",
          "pro": "Non requis",
          "life": "Non requis"
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
          "✓ 15-min live demo test",
          "✓ Gemini 2.5 Flash answers",
          "✓ Freeze Mode [Space]",
          "✓ Concise blitz answers [Q]",
          "✕ Screen OCR code analysis",
          "✕ Capped at 15 minutes per session"
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
          "feat": "Session Duration Limit",
          "free": "15 min",
          "pro": "Ilimitado",
          "life": "Ilimitado"
        },
        {
          "feat": "AI Core Engine",
          "free": "Gemini Flash",
          "pro": "Gemini 2.5 Flash",
          "life": "Gemini 2.5 Flash"
        },
        {
          "feat": "Generation Latency",
          "free": "1.5s",
          "pro": "1.4s",
          "life": "1.4s"
        },
        {
          "feat": "Freeze Mode [Space]",
          "free": "✓",
          "pro": "✓",
          "life": "✓"
        },
        {
          "feat": "Screen Code OCR [F9]",
          "free": "—",
          "pro": "✓",
          "life": "✓"
        },
        {
          "feat": "Dual-Screen HUD Teleprompter",
          "free": "—",
          "pro": "✓",
          "life": "✓"
        },
        {
          "feat": "Markdown Debrief Export (.md)",
          "free": "—",
          "pro": "✓",
          "life": "✓"
        },
        {
          "feat": "Own API Keys Required",
          "free": "No requeridas",
          "pro": "No requeridas",
          "life": "No requeridas"
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
          "✓ 15-min live demo test",
          "✓ Gemini 2.5 Flash answers",
          "✓ Freeze Mode [Space]",
          "✓ Concise blitz answers [Q]",
          "✕ Screen OCR code analysis",
          "✕ Capped at 15 minutes per session"
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
          "feat": "Session Duration Limit",
          "free": "15 min",
          "pro": "Ilimitado",
          "life": "Ilimitado"
        },
        {
          "feat": "AI Core Engine",
          "free": "Gemini Flash",
          "pro": "Gemini 2.5 Flash",
          "life": "Gemini 2.5 Flash"
        },
        {
          "feat": "Generation Latency",
          "free": "1.5s",
          "pro": "1.4s",
          "life": "1.4s"
        },
        {
          "feat": "Freeze Mode [Space]",
          "free": "✓",
          "pro": "✓",
          "life": "✓"
        },
        {
          "feat": "Screen Code OCR [F9]",
          "free": "—",
          "pro": "✓",
          "life": "✓"
        },
        {
          "feat": "Dual-Screen HUD Teleprompter",
          "free": "—",
          "pro": "✓",
          "life": "✓"
        },
        {
          "feat": "Markdown Debrief Export (.md)",
          "free": "—",
          "pro": "✓",
          "life": "✓"
        },
        {
          "feat": "Own API Keys Required",
          "free": "Não necessárias",
          "pro": "Não necessárias",
          "life": "Não necessárias"
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
          "✓ 15-min live demo test",
          "✓ Gemini 2.5 Flash answers",
          "✓ Freeze Mode [Space]",
          "✓ Concise blitz answers [Q]",
          "✕ Screen OCR code analysis",
          "✕ Capped at 15 minutes per session"
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
          "feat": "Session Duration Limit",
          "free": "15 min",
          "pro": "Illimitato",
          "life": "Illimitato"
        },
        {
          "feat": "AI Core Engine",
          "free": "Gemini Flash",
          "pro": "Gemini 2.5 Flash",
          "life": "Gemini 2.5 Flash"
        },
        {
          "feat": "Generation Latency",
          "free": "1.5s",
          "pro": "1.4s",
          "life": "1.4s"
        },
        {
          "feat": "Freeze Mode [Space]",
          "free": "✓",
          "pro": "✓",
          "life": "✓"
        },
        {
          "feat": "Screen Code OCR [F9]",
          "free": "—",
          "pro": "✓",
          "life": "✓"
        },
        {
          "feat": "Dual-Screen HUD Teleprompter",
          "free": "—",
          "pro": "✓",
          "life": "✓"
        },
        {
          "feat": "Markdown Debrief Export (.md)",
          "free": "—",
          "pro": "✓",
          "life": "✓"
        },
        {
          "feat": "Own API Keys Required",
          "free": "Non richieste",
          "pro": "Non richieste",
          "life": "Non richieste"
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
          "✓ 15-min live demo test",
          "✓ Gemini 2.5 Flash answers",
          "✓ Freeze Mode [Space]",
          "✓ Concise blitz answers [Q]",
          "✕ Screen OCR code analysis",
          "✕ Capped at 15 minutes per session"
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
          "feat": "Session Duration Limit",
          "free": "15 min",
          "pro": "Neomezeně",
          "life": "Neomezeně"
        },
        {
          "feat": "AI Core Engine",
          "free": "Gemini Flash",
          "pro": "Gemini 2.5 Flash",
          "life": "Gemini 2.5 Flash"
        },
        {
          "feat": "Generation Latency",
          "free": "1.5s",
          "pro": "1.4s",
          "life": "1.4s"
        },
        {
          "feat": "Freeze Mode [Space]",
          "free": "✓",
          "pro": "✓",
          "life": "✓"
        },
        {
          "feat": "Screen Code OCR [F9]",
          "free": "—",
          "pro": "✓",
          "life": "✓"
        },
        {
          "feat": "Dual-Screen HUD Teleprompter",
          "free": "—",
          "pro": "✓",
          "life": "✓"
        },
        {
          "feat": "Markdown Debrief Export (.md)",
          "free": "—",
          "pro": "✓",
          "life": "✓"
        },
        {
          "feat": "Own API Keys Required",
          "free": "Není potřeba",
          "pro": "Není potřeba",
          "life": "Není potřeba"
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
          "✓ 15-min live demo test",
          "✓ Gemini 2.5 Flash answers",
          "✓ Freeze Mode [Space]",
          "✓ Concise blitz answers [Q]",
          "✕ Screen OCR code analysis",
          "✕ Capped at 15 minutes per session"
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
          "feat": "Session Duration Limit",
          "free": "15 min",
          "pro": "Onbeperkt",
          "life": "Onbeperkt"
        },
        {
          "feat": "AI Core Engine",
          "free": "Gemini Flash",
          "pro": "Gemini 2.5 Flash",
          "life": "Gemini 2.5 Flash"
        },
        {
          "feat": "Generation Latency",
          "free": "1.5s",
          "pro": "1.4s",
          "life": "1.4s"
        },
        {
          "feat": "Freeze Mode [Space]",
          "free": "✓",
          "pro": "✓",
          "life": "✓"
        },
        {
          "feat": "Screen Code OCR [F9]",
          "free": "—",
          "pro": "✓",
          "life": "✓"
        },
        {
          "feat": "Dual-Screen HUD Teleprompter",
          "free": "—",
          "pro": "✓",
          "life": "✓"
        },
        {
          "feat": "Markdown Debrief Export (.md)",
          "free": "—",
          "pro": "✓",
          "life": "✓"
        },
        {
          "feat": "Own API Keys Required",
          "free": "Niet vereist",
          "pro": "Niet vereist",
          "life": "Niet vereist"
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

export function getPricingTranslations(locale: SupportedLocale): PricingPageI18n {
  return PRICING_I18N[locale] || PRICING_I18N.en;
}
