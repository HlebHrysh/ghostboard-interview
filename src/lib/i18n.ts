import type { SupportedLocale } from './geoLang';
export type { SupportedLocale };

export const LOCALE_META: Record<SupportedLocale, { flag: string; name: string; nativeName: string }> = {
  ua: { flag: '🇺🇦', name: 'Ukrainian', nativeName: 'Українська' },
  en: { flag: '🇬🇧', name: 'English', nativeName: 'English' },
  pl: { flag: '🇵🇱', name: 'Polish', nativeName: 'Polski' },
  de: { flag: '🇩🇪', name: 'German', nativeName: 'Deutsch' },
  fr: { flag: '🇫🇷', name: 'French', nativeName: 'Français' },
  es: { flag: '🇪🇸', name: 'Spanish', nativeName: 'Español' },
  pt: { flag: '🇵🇹', name: 'Portuguese', nativeName: 'Português' },
  it: { flag: '🇮🇹', name: 'Italian', nativeName: 'Italiano' },
  cs: { flag: '🇨🇿', name: 'Czech', nativeName: 'Čeština' },
  nl: { flag: '🇳🇱', name: 'Dutch', nativeName: 'Nederlands' },
};

export const SUPPORTED_LOCALES: SupportedLocale[] = ['ua', 'en', 'pl', 'de', 'fr', 'es', 'pt', 'it', 'cs', 'nl'];

export interface Translations {
  common: {
    save: string;
    saving: string;
    cancel: string;
    loading: string;
    error: string;
    success: string;
    close: string;
    back: string;
    next: string;
    yes: string;
    no: string;
    auto: string;
  };
  nav: {
    features: string;
    pricing: string;
    guide: string;
    mockSimulator: string;
    signIn: string;
    signUp: string;
    launchCopilot: string;
    copilotStudio: string;
    settings: string;
    arena: string;
    cabinet: string;
  };
  hero: {
    badge: string;
    line1: string;
    line2: string;
    line3: string;
    line3_sub: string;
    desc: string;
    ctaStart: string;
    ctaDemo: string;
    statSessions: string;
    statRules: string;
    statStealth: string;
    noirBadge1: string;
    noirTitle1: string;
    noirTitle1Sub: string;
    noirBadge2: string;
    noirTitle2: string;
    noirTitle2Sub: string;
    noirDisclaimer: string;
  };
  features: {
    label: string;
    title: string;
    subtitle: string;
  };
  pricing: {
    label: string;
    title: string;
    subtitle: string;
    monthly: string;
    annual: string;
    discount: string;
    perMonth: string;
    oneTime: string;
    freeTier: string;
    freeBadge: string;
    freeCta: string;
    proTier: string;
    proBadge: string;
    proCta: string;
    lifeTier: string;
    lifeCta: string;
  };
  cta: {
    titlePart1: string;
    titleAccent: string;
    btn: string;
    login: string;
    sub: string;
  };
  footer: {
    privacy: string;
    terms: string;
    settingsLink: string;
    workspace: string;
  };
  settings: {
    title: string;
    subtitle: string;
    toCopilot: string;
    sectionSubscription: string;
    sectionProfile: string;
    sectionAudio: string;
    sectionLanguage: string;
    sectionSystem: string;
    sectionInterfaceLang: string;
    interfaceLangLabel: string;
    interfaceLangSaved: string;
    speechLangLabel: string;
    outputLangLabel: string;
    saveLangBtn: string;
    langSaved: string;
    subscriptionFree: string;
    subscriptionPro: string;
    subscriptionLifetime: string;
    upgradeBtn: string;
    upgrading: string;
    manageSubscription: string;
    profilePosition: string;
    profileStack: string;
    editResume: string;
    systemVersion: string;
    systemAI: string;
    systemSTT: string;
    systemPhonetics: string;
  };
}

const ua: Translations = {
  common: {
    save: 'Зберегти', saving: 'Збереження...', cancel: 'Скасувати', loading: 'Завантаження...',
    error: 'Помилка', success: 'Успішно', close: 'Закрити', back: 'Назад', next: 'Далі',
    yes: 'Так', no: 'Ні', auto: 'Авто',
  },
  nav: {
    features: 'Можливості', pricing: 'Тарифи', guide: 'Гайд ОС', mockSimulator: 'Тренажер',
    signIn: 'Вхід', signUp: 'Реєстрація (Free)', launchCopilot: 'Запустити Copilot',
    copilotStudio: 'Copilot Студія', settings: 'Налаштування', arena: '3D Арена', cabinet: 'Вхід до кабінету',
  },
  hero: {
    badge: "AI Copilot & Teleprompter · Технічні Інтерв'ю",
    line1: 'Твій наступний', line2: "технічний оффер", line3: 'за 1.5 секунди.', line3_sub: 'Щоразу.',
    desc: "AI-телесуфлер у реальному часі та розумний коуч. Допомагає подолати мовний бар'єр, зняти тривожність та чітко структурувати відповіді на технічних інтерв'ю. Власних API-ключів не потрібно.",
    ctaStart: 'СТАРТ БЕЗКОШТОВНО', ctaDemo: 'ДИВИТИСЯ ДЕМО',
    statSessions: 'Сесій', statRules: 'Правил', statStealth: "Захист приватності", noirBadge1: "LIVE AI COACH", noirTitle1: "ВПЕВНЕНІСТЬ", noirTitle1Sub: "ЧИСТИЙ РЕЗУЛЬТАТ", noirBadge2: "TELEPROMPTER HUD", noirTitle2: 'ОТРИМАЙТЕ ОФФЕР\nМРІЇ!', noirTitle2Sub: "ВАШ РОЗУМНИЙ\nКОУЧ*", noirDisclaimer: "*AI-телесуфлер з відгуком <1.5с. Допомагає долати хвилювання та мовний бар'єр на технічних зустрічах.",
  },
  features: {
    label: 'Архітектура', title: "Налаштування платформи & Телесуфлер",
    subtitle: 'Кожна технологія вирішує конкретну больову точку інтерв\'ю',
  },
  pricing: {
    label: 'Прозорі тарифи', title: 'Інвестиція в один вдалий оффер',
    subtitle: 'Без прихованих оплат · Без потреби налаштовувати API-ключі',
    monthly: 'Щомісячно', annual: 'Річний', discount: '−17%', perMonth: '/ місяць', oneTime: 'одноразово',
    freeTier: 'Стартовий', freeBadge: 'демо-тест 15 хвилин', freeCta: 'ПОЧАТИ БЕЗКОШТОВНО',
    proTier: 'Безліміт', proBadge: 'ХІТ ПРОДАЖІВ', proCta: 'ОТРИМАТИ PRO PASS →',
    lifeTier: 'Lifetime', lifeCta: 'ОТРИМАТИ НАЗАВЖДИ',
  },
  cta: {
    titlePart1: 'Готові забрати свій ', titleAccent: 'оффер мрії?',
    btn: 'ПОЧАТИ ПЕРШУ СЕСІЮ →', login: 'Вже є акаунт? Увійти',
    sub: '15 хв демо-тест · Без банківської картки · Без власних API-ключів',
  },
  footer: {
    privacy: 'Конфіденційність', terms: 'Умови', settingsLink: 'Налаштування', workspace: 'Робочий простір Copilot →',
  },
  settings: {
    title: 'Налаштування продукту & Стелс-система',
    subtitle: 'Підписка, профіль кандидата та апаратна аудіосистема',
    toCopilot: 'До Copilot',
    sectionSubscription: '💎 Підписка та Платіжна система',
    sectionProfile: '👨‍💻 Профіль кандидата (CV & Контекст)',
    sectionAudio: '🎙️ Налаштування Audio Capture',
    sectionLanguage: '🌍 Мовні налаштування',
    sectionSystem: 'ℹ️ Про систему',
    sectionInterfaceLang: '🌐 Мова інтерфейсу',
    interfaceLangLabel: 'Мова сайту (інтерфейс):',
    interfaceLangSaved: 'Мову інтерфейсу збережено',
    speechLangLabel: 'Мова розпізнавання мовлення (STT):',
    outputLangLabel: 'Мова відповідей AI:',
    saveLangBtn: 'Зберегти налаштування мови',
    langSaved: 'Налаштування мови збережено',
    subscriptionFree: 'Free Trial Demo', subscriptionPro: 'Ghostboard Pro Pass', subscriptionLifetime: 'Ghostboard Lifetime Founder Pass',
    upgradeBtn: 'Отримати Pro Pass →', upgrading: 'Перехід...', manageSubscription: 'Керувати підпискою',
    profilePosition: 'Позиція / Спеціалізація:', profileStack: 'Активний стек:',
    editResume: 'Редагувати резюме в Copilot',
    systemVersion: 'Версія Ghostboard Studio', systemAI: 'AI Core Engine', systemSTT: 'STT Streaming Model',
    systemPhonetics: 'Нормалізатор IT-фонетики',
  },
};

const en: Translations = {
  common: {
    save: 'Save', saving: 'Saving...', cancel: 'Cancel', loading: 'Loading...',
    error: 'Error', success: 'Success', close: 'Close', back: 'Back', next: 'Next',
    yes: 'Yes', no: 'No', auto: 'Auto',
  },
  nav: {
    features: 'Features', pricing: 'Pricing', guide: 'OS Setup', mockSimulator: 'Mock Simulator',
    signIn: 'Sign In', signUp: 'Sign Up Free', launchCopilot: 'Launch Copilot',
    copilotStudio: 'Copilot Studio', settings: 'Settings', arena: '3D Arena', cabinet: 'Sign In',
  },
  hero: {
    badge: "AI Teleprompter & Live Performance Coach · Technical Interviews",
    line1: 'Your Next', line2: 'Technical Offer', line3: 'in 1.5 seconds.', line3_sub: 'Every time.',
    desc: "AI-powered real-time teleprompter and performance coach. Overcome language barriers, structure technical answers, and eliminate anxiety during interviews and standups. Zero API keys required.",
    ctaStart: 'START FOR FREE', ctaDemo: 'VIEW DEMO',
    statSessions: 'Sessions', statRules: 'Rules', statStealth: "Privacy Protection", noirBadge1: "LIVE AI COACH", noirTitle1: "CONFIDENCE", noirTitle1Sub: "PURE PERFORMANCE", noirBadge2: "TELEPROMPTER HUD", noirTitle2: 'LAND THE\nDREAM OFFER!', noirTitle2Sub: "YOUR PERFORMANCE\nCOACH*", noirDisclaimer: "*sub-1.5s real-time AI teleprompter & coach. Built to eliminate language barriers and interview anxiety.",
  },
  features: {
    label: 'Architecture', title: "Platform Settings & Teleprompter System",
    subtitle: 'Every capability solves an exact high-stakes interview friction point',
  },
  pricing: {
    label: 'Transparent Pricing', title: 'An Investment in One Great Offer',
    subtitle: 'Zero hidden charges · Zero API setup friction',
    monthly: 'Monthly', annual: 'Annual', discount: '−17%', perMonth: '/ month', oneTime: 'one-time',
    freeTier: 'Starter', freeBadge: '15-minute live demo', freeCta: 'START FOR FREE',
    proTier: 'Unlimited', proBadge: 'MOST POPULAR', proCta: 'GET PRO PASS →',
    lifeTier: 'Lifetime', lifeCta: 'GET LIFETIME PASS',
  },
  cta: {
    titlePart1: 'Ready to land your ', titleAccent: 'dream offer?',
    btn: 'START YOUR FIRST SESSION →', login: 'Already have an account? Sign In',
    sub: '15 min demo · No credit card required · No personal API keys needed',
  },
  footer: {
    privacy: 'Privacy', terms: 'Terms', settingsLink: 'Settings', workspace: 'Copilot Workspace →',
  },
  settings: {
    title: 'Product Settings & Teleprompter System',
    subtitle: 'Subscription, candidate profile and audio hardware setup',
    toCopilot: 'To Copilot',
    sectionSubscription: '💎 Subscription & Payment',
    sectionProfile: '👨‍💻 Candidate Profile (CV & Context)',
    sectionAudio: '🎙️ Audio Capture Setup',
    sectionLanguage: '🌍 Language Preferences',
    sectionSystem: 'ℹ️ About System',
    sectionInterfaceLang: '🌐 Interface Language',
    interfaceLangLabel: 'Site language (interface):',
    interfaceLangSaved: 'Interface language saved',
    speechLangLabel: 'Speech recognition language (STT):',
    outputLangLabel: 'AI response language:',
    saveLangBtn: 'Save language settings',
    langSaved: 'Language settings saved',
    subscriptionFree: 'Free Trial Demo', subscriptionPro: 'Ghostboard Pro Pass', subscriptionLifetime: 'Ghostboard Lifetime Founder Pass',
    upgradeBtn: 'Get Pro Pass →', upgrading: 'Redirecting...', manageSubscription: 'Manage Subscription',
    profilePosition: 'Position / Specialization:', profileStack: 'Active stack:',
    editResume: 'Edit CV in Copilot',
    systemVersion: 'Ghostboard Studio Version', systemAI: 'AI Core Engine', systemSTT: 'STT Streaming Model',
    systemPhonetics: 'IT Phonetics Normalizer',
  },
};

const pl: Translations = {
  common: {
    save: 'Zapisz', saving: 'Zapisywanie...', cancel: 'Anuluj', loading: 'Ładowanie...',
    error: 'Błąd', success: 'Sukces', close: 'Zamknij', back: 'Wstecz', next: 'Dalej',
    yes: 'Tak', no: 'Nie', auto: 'Auto',
  },
  nav: {
    features: 'Możliwości', pricing: 'Cennik', guide: 'Konfiguracja OS', mockSimulator: 'Symulator',
    signIn: 'Zaloguj się', signUp: 'Zarejestruj się', launchCopilot: 'Uruchom Copilot',
    copilotStudio: 'Copilot Studio', settings: 'Ustawienia', arena: 'Arena 3D', cabinet: 'Zaloguj się',
  },
  hero: {
    badge: "Teleprompter AI i Trener na Żywo · Rozmowy Techniczne",
    line1: 'Twoja następna', line2: 'oferta techniczna', line3: 'w 1.5 sekundy.', line3_sub: 'Za każdym razem.',
    desc: "Teleprompter AI w czasie rzeczywistym i osobisty trener. Pomaga pokonać barierę językową, opanować stres i ustrukturyzować odpowiedzi. Własne klucze API nie są wymagane.",
    ctaStart: 'ZACZNIJ ZA DARMO', ctaDemo: 'OBEJRZYJ DEMO',
    statSessions: 'Sesji', statRules: 'Reguł', statStealth: "Ochrona prywatności", noirBadge1: "LIVE AI COACH", noirTitle1: "PEWNOŚĆ", noirTitle1Sub: "CZYSTA WYDAJNOŚĆ", noirBadge2: "TELEPROMPTER HUD", noirTitle2: 'ZDOBĄDŹ OFERTĘ\nMARZEŃ!', noirTitle2Sub: "TWÓJ OSOBISTY\nTRENER*", noirDisclaimer: "*Teleprompter AI z czasem reakcji <1.5s. Pomaga pokonać stres i barierę językową na spotkaniach technicznych.",
  },
  features: {
    label: 'Architektura', title: "Ustawienia platformy i telepromptera",
    subtitle: 'Każda technologia rozwiązuje konkretny problem podczas rozmowy kwalifikacyjnej',
  },
  pricing: {
    label: 'Przejrzyste ceny', title: 'Inwestycja w jedną dobrą ofertę',
    subtitle: 'Bez ukrytych opłat · Bez konfiguracji kluczy API',
    monthly: 'Miesięcznie', annual: 'Rocznie', discount: '−17%', perMonth: '/ miesiąc', oneTime: 'jednorazowo',
    freeTier: 'Starter', freeBadge: '15-minutowe demo', freeCta: 'ZACZNIJ ZA DARMO',
    proTier: 'Unlimited', proBadge: 'NAJPOPULARNIEJSZY', proCta: 'ZDOBĄDŹ PRO PASS →',
    lifeTier: 'Lifetime', lifeCta: 'ZDOBĄDŹ NA ZAWSZE',
  },
  cta: {
    titlePart1: 'Gotowy na ', titleAccent: 'wymarzoną ofertę?',
    btn: 'ROZPOCZNIJ PIERWSZĄ SESJĘ →', login: 'Masz już konto? Zaloguj się',
    sub: '15 min demo · Bez karty kredytowej · Bez własnych kluczy API',
  },
  footer: {
    privacy: 'Prywatność', terms: 'Warunki', settingsLink: 'Ustawienia', workspace: 'Workspace Copilot →',
  },
  settings: {
    title: 'Ustawienia produktu & System Telepromptera',
    subtitle: 'Subskrypcja, profil kandydata i konfiguracja audio',
    toCopilot: 'Do Copilot',
    sectionSubscription: '💎 Subskrypcja i płatności',
    sectionProfile: '👨‍💻 Profil kandydata (CV & Kontekst)',
    sectionAudio: '🎙️ Konfiguracja nagrywania dźwięku',
    sectionLanguage: '🌍 Preferencje językowe',
    sectionSystem: 'ℹ️ O systemie',
    sectionInterfaceLang: '🌐 Język interfejsu',
    interfaceLangLabel: 'Język strony (interfejs):',
    interfaceLangSaved: 'Język interfejsu zapisany',
    speechLangLabel: 'Język rozpoznawania mowy (STT):',
    outputLangLabel: 'Język odpowiedzi AI:',
    saveLangBtn: 'Zapisz ustawienia języka',
    langSaved: 'Ustawienia języka zapisane',
    subscriptionFree: 'Free Trial Demo', subscriptionPro: 'Ghostboard Pro Pass', subscriptionLifetime: 'Ghostboard Lifetime Pass',
    upgradeBtn: 'Zdobądź Pro Pass →', upgrading: 'Przekierowanie...', manageSubscription: 'Zarządzaj subskrypcją',
    profilePosition: 'Stanowisko / Specjalizacja:', profileStack: 'Aktywny stack:',
    editResume: 'Edytuj CV w Copilot',
    systemVersion: 'Wersja Ghostboard Studio', systemAI: 'Silnik AI Core', systemSTT: 'Model STT Streaming',
    systemPhonetics: 'Normalizator fonetyki IT',
  },
};

const de: Translations = {
  common: {
    save: 'Speichern', saving: 'Speichern...', cancel: 'Abbrechen', loading: 'Laden...',
    error: 'Fehler', success: 'Erfolg', close: 'Schließen', back: 'Zurück', next: 'Weiter',
    yes: 'Ja', no: 'Nein', auto: 'Auto',
  },
  nav: {
    features: 'Funktionen', pricing: 'Preise', guide: 'OS-Einrichtung', mockSimulator: 'Übungssimulator',
    signIn: 'Anmelden', signUp: 'Kostenlos registrieren', launchCopilot: 'Copilot starten',
    copilotStudio: 'Copilot Studio', settings: 'Einstellungen', arena: '3D Arena', cabinet: 'Anmelden',
  },
  hero: {
    badge: "KI-Teleprompter & Live-Performance-Coach · Technische Interviews",
    line1: 'Dein nächstes', line2: 'technisches Angebot', line3: 'in 1,5 Sekunden.', line3_sub: 'Jedes Mal.',
    desc: "KI-gestützter Echtzeit-Teleprompter & Live-Coach. Überwinden Sie Sprachbarrieren, reduzieren Sie Prüfungsangst und strukturieren Sie Antworten souverän. Keine eigenen API-Schlüssel nötig.",
    ctaStart: 'KOSTENLOS STARTEN', ctaDemo: 'DEMO ANSEHEN',
    statSessions: 'Sitzungen', statRules: 'Regeln', statStealth: "Datenschutz", noirBadge1: "LIVE AI COACH", noirTitle1: "SOUVERÄNITÄT", noirTitle1Sub: "ECHTE LEISTUNG", noirBadge2: "TELEPROMPTER HUD", noirTitle2: 'HOL DIR DAS\nTRAUMANGEBOT!', noirTitle2Sub: "DEIN PERSÖNLICHER\nCOACH*", noirDisclaimer: "*Echtzeit-KI-Teleprompter mit <1.5s Reaktionszeit. Entwickelt, um Sprachbarrieren und Nervosität abzubauen.",
  },
  features: {
    label: 'Architektur', title: "Plattformeinstellungen & Teleprompter",
    subtitle: 'Jede Technologie löst einen konkreten Schmerzpunkt bei Vorstellungsgesprächen',
  },
  pricing: {
    label: 'Transparente Preise', title: 'Investition in ein erfolgreiches Angebot',
    subtitle: 'Keine versteckten Gebühren · Keine API-Schlüssel-Konfiguration',
    monthly: 'Monatlich', annual: 'Jährlich', discount: '−17%', perMonth: '/ Monat', oneTime: 'einmalig',
    freeTier: 'Starter', freeBadge: '15-Minuten-Demo', freeCta: 'KOSTENLOS STARTEN',
    proTier: 'Unlimited', proBadge: 'BELIEBTESTE WAHL', proCta: 'PRO PASS HOLEN →',
    lifeTier: 'Lifetime', lifeCta: 'FÜR IMMER HOLEN',
  },
  cta: {
    titlePart1: 'Bereit für dein ', titleAccent: 'Traumangebot?',
    btn: 'ERSTE SITZUNG STARTEN →', login: 'Bereits ein Konto? Anmelden',
    sub: '15 Min. Demo · Keine Kreditkarte · Keine eigenen API-Schlüssel',
  },
  footer: {
    privacy: 'Datenschutz', terms: 'AGB', settingsLink: 'Einstellungen', workspace: 'Copilot Workspace →',
  },
  settings: {
    title: 'Produkteinstellungen & Teleprompter-System',
    subtitle: 'Abonnement, Kandidatenprofil und Audio-Hardware-Setup',
    toCopilot: 'Zum Copilot',
    sectionSubscription: '💎 Abonnement & Zahlung',
    sectionProfile: '👨‍💻 Kandidatenprofil (Lebenslauf & Kontext)',
    sectionAudio: '🎙️ Audio-Aufnahme-Einrichtung',
    sectionLanguage: '🌍 Spracheinstellungen',
    sectionSystem: 'ℹ️ Über das System',
    sectionInterfaceLang: '🌐 Oberflächensprache',
    interfaceLangLabel: 'Website-Sprache (Oberfläche):',
    interfaceLangSaved: 'Oberflächensprache gespeichert',
    speechLangLabel: 'Spracherkennungssprache (STT):',
    outputLangLabel: 'KI-Antwortsprache:',
    saveLangBtn: 'Spracheinstellungen speichern',
    langSaved: 'Spracheinstellungen gespeichert',
    subscriptionFree: 'Free Trial Demo', subscriptionPro: 'Ghostboard Pro Pass', subscriptionLifetime: 'Ghostboard Lifetime Pass',
    upgradeBtn: 'Pro Pass holen →', upgrading: 'Weiterleitung...', manageSubscription: 'Abonnement verwalten',
    profilePosition: 'Position / Spezialisierung:', profileStack: 'Aktiver Stack:',
    editResume: 'Lebenslauf im Copilot bearbeiten',
    systemVersion: 'Ghostboard Studio Version', systemAI: 'KI-Kernmaschine', systemSTT: 'STT Streaming-Modell',
    systemPhonetics: 'IT-Phonetik-Normalisierer',
  },
};

const fr: Translations = {
  common: {
    save: 'Enregistrer', saving: 'Enregistrement...', cancel: 'Annuler', loading: 'Chargement...',
    error: 'Erreur', success: 'Succès', close: 'Fermer', back: 'Retour', next: 'Suivant',
    yes: 'Oui', no: 'Non', auto: 'Auto',
  },
  nav: {
    features: 'Fonctionnalités', pricing: 'Tarifs', guide: 'Config OS', mockSimulator: 'Simulateur',
    signIn: 'Connexion', signUp: 'Inscription gratuite', launchCopilot: 'Lancer Copilot',
    copilotStudio: 'Copilot Studio', settings: 'Paramètres', arena: 'Arène 3D', cabinet: 'Connexion',
  },
  hero: {
    badge: "Téléprompteur IA et Coach en Direct · Entretiens Techniques",
    line1: 'Votre prochaine', line2: 'offre technique', line3: 'en 1,5 seconde.', line3_sub: 'À chaque fois.',
    desc: "Téléprompteur IA en temps réel et coach de performance. Surmontez la barrière de la langue, éliminez le stress et structurez des réponses claires en direct. Aucune clé API requise.",
    ctaStart: 'COMMENCER GRATUITEMENT', ctaDemo: 'VOIR LA DÉMO',
    statSessions: 'Sessions', statRules: 'Règles', statStealth: "Protection privée", noirBadge1: "LIVE AI COACH", noirTitle1: "CONFIANCE", noirTitle1Sub: "PURE PERFORMANCE", noirBadge2: "TELEPROMPTER HUD", noirTitle2: 'DÉCROCHEZ L\'OFFRE\nDE VOS RÊVES !', noirTitle2Sub: "VOTRE COACH\nPERSONNEL*", noirDisclaimer: "*Téléprompteur IA en temps réel <1.5s. Conçu pour surmonter la barrière de la langue et le stress des entretiens.*",
  },
  features: {
    label: 'Architecture', title: 'Six Niveaux d\'Avantage',
    subtitle: 'Chaque technologie résout un point de douleur précis lors des entretiens',
  },
  pricing: {
    label: 'Tarifs transparents', title: "Paramètres de la plateforme & téléprompteur",
    subtitle: 'Sans frais cachés · Sans configuration de clés API',
    monthly: 'Mensuel', annual: 'Annuel', discount: '−17%', perMonth: '/ mois', oneTime: 'paiement unique',
    freeTier: 'Débutant', freeBadge: 'démo 15 minutes', freeCta: 'COMMENCER GRATUITEMENT',
    proTier: 'Illimité', proBadge: 'LE PLUS POPULAIRE', proCta: 'OBTENIR PRO PASS →',
    lifeTier: 'Lifetime', lifeCta: 'OBTENIR À VIE',
  },
  cta: {
    titlePart1: 'Prêt à décrocher votre ', titleAccent: 'offre de rêve\u00a0?',
    btn: 'DÉMARRER VOTRE PREMIÈRE SESSION →', login: 'Déjà un compte\u00a0? Se connecter',
    sub: '15 min de démo · Sans carte bancaire · Sans clés API personnelles',
  },
  footer: {
    privacy: 'Confidentialité', terms: 'CGU', settingsLink: 'Paramètres', workspace: 'Workspace Copilot →',
  },
  settings: {
    title: 'Paramètres du produit & Système Téléprompteur',
    subtitle: 'Abonnement, profil candidat et configuration audio',
    toCopilot: 'Vers Copilot',
    sectionSubscription: '💎 Abonnement & Paiement',
    sectionProfile: '👨‍💻 Profil Candidat (CV & Contexte)',
    sectionAudio: '🎙️ Configuration de la Capture Audio',
    sectionLanguage: '🌍 Préférences linguistiques',
    sectionSystem: 'ℹ️ À propos du système',
    sectionInterfaceLang: '🌐 Langue de l\'interface',
    interfaceLangLabel: 'Langue du site (interface)\u00a0:',
    interfaceLangSaved: 'Langue de l\'interface sauvegardée',
    speechLangLabel: 'Langue de reconnaissance vocale (STT)\u00a0:',
    outputLangLabel: 'Langue des réponses IA\u00a0:',
    saveLangBtn: 'Enregistrer les paramètres de langue',
    langSaved: 'Paramètres de langue enregistrés',
    subscriptionFree: 'Free Trial Demo', subscriptionPro: 'Ghostboard Pro Pass', subscriptionLifetime: 'Ghostboard Lifetime Pass',
    upgradeBtn: 'Obtenir Pro Pass →', upgrading: 'Redirection...', manageSubscription: 'Gérer l\'abonnement',
    profilePosition: 'Poste / Spécialisation\u00a0:', profileStack: 'Stack actif\u00a0:',
    editResume: 'Modifier le CV dans Copilot',
    systemVersion: 'Version Ghostboard Studio', systemAI: 'Moteur IA Core', systemSTT: 'Modèle STT Streaming',
    systemPhonetics: 'Normalisateur phonétique IT',
  },
};

const es: Translations = {
  common: {
    save: 'Guardar', saving: 'Guardando...', cancel: 'Cancelar', loading: 'Cargando...',
    error: 'Error', success: 'Éxito', close: 'Cerrar', back: 'Atrás', next: 'Siguiente',
    yes: 'Sí', no: 'No', auto: 'Auto',
  },
  nav: {
    features: 'Funciones', pricing: 'Precios', guide: 'Config OS', mockSimulator: 'Simulador',
    signIn: 'Iniciar sesión', signUp: 'Registro gratis', launchCopilot: 'Iniciar Copilot',
    copilotStudio: 'Copilot Studio', settings: 'Configuración', arena: 'Arena 3D', cabinet: 'Iniciar sesión',
  },
  hero: {
    badge: "Teleprompter de IA y Coach en Vivo · Entrevistas Técnicas",
    line1: 'Tu próxima', line2: 'oferta técnica', line3: 'en 1,5 segundos.', line3_sub: 'Cada vez.',
    desc: "Teleprompter de IA en tiempo real y coach de rendimiento. Supera la barrera del idioma, reduce la ansiedad y estructura respuestas claras. Sin necesidad de claves API propias.",
    ctaStart: 'COMENZAR GRATIS', ctaDemo: 'VER DEMO',
    statSessions: 'Sesiones', statRules: 'Reglas', statStealth: "Protección de privacidad", noirBadge1: "LIVE AI COACH", noirTitle1: "CONFIANZA", noirTitle1Sub: "MÁXIMO RENDIMIENTO", noirBadge2: "TELEPROMPTER HUD", noirTitle2: '¡CONSIGUE LA OFERTA\nSOÑADA!', noirTitle2Sub: "TU COACH\nPERSONAL*", noirDisclaimer: "*Teleprompter de IA en tiempo real <1.5s. Diseñado para superar la barrera del idioma y la ansiedad técnica.",
  },
  features: {
    label: 'Arquitectura', title: "Configuración de la plataforma y teleprompter",
    subtitle: 'Cada tecnología resuelve un punto de dolor exacto en entrevistas de alto riesgo',
  },
  pricing: {
    label: 'Precios transparentes', title: 'Inversión en una gran oferta',
    subtitle: 'Sin cargos ocultos · Sin configuración de API',
    monthly: 'Mensual', annual: 'Anual', discount: '−17%', perMonth: '/ mes', oneTime: 'pago único',
    freeTier: 'Básico', freeBadge: 'demo de 15 minutos', freeCta: 'COMENZAR GRATIS',
    proTier: 'Ilimitado', proBadge: 'MÁS POPULAR', proCta: 'OBTENER PRO PASS →',
    lifeTier: 'Lifetime', lifeCta: 'OBTENER DE POR VIDA',
  },
  cta: {
    titlePart1: '¿Listo para tu ', titleAccent: 'oferta soñada?',
    btn: 'COMENZAR TU PRIMERA SESIÓN →', login: '¿Ya tienes cuenta? Iniciar sesión',
    sub: '15 min demo · Sin tarjeta de crédito · Sin claves API propias',
  },
  footer: {
    privacy: 'Privacidad', terms: 'Términos', settingsLink: 'Configuración', workspace: 'Copilot Workspace →',
  },
  settings: {
    title: 'Configuración del producto & Sistema Teleprompter',
    subtitle: 'Suscripción, perfil del candidato y configuración de audio',
    toCopilot: 'Al Copilot',
    sectionSubscription: '💎 Suscripción y Pago',
    sectionProfile: '👨‍💻 Perfil del candidato (CV & Contexto)',
    sectionAudio: '🎙️ Configuración de captura de audio',
    sectionLanguage: '🌍 Preferencias de idioma',
    sectionSystem: 'ℹ️ Acerca del sistema',
    sectionInterfaceLang: '🌐 Idioma de la interfaz',
    interfaceLangLabel: 'Idioma del sitio (interfaz):',
    interfaceLangSaved: 'Idioma de interfaz guardado',
    speechLangLabel: 'Idioma de reconocimiento de voz (STT):',
    outputLangLabel: 'Idioma de respuestas de IA:',
    saveLangBtn: 'Guardar configuración de idioma',
    langSaved: 'Configuración de idioma guardada',
    subscriptionFree: 'Free Trial Demo', subscriptionPro: 'Ghostboard Pro Pass', subscriptionLifetime: 'Ghostboard Lifetime Pass',
    upgradeBtn: 'Obtener Pro Pass →', upgrading: 'Redirigiendo...', manageSubscription: 'Gestionar suscripción',
    profilePosition: 'Posición / Especialización:', profileStack: 'Stack activo:',
    editResume: 'Editar CV en Copilot',
    systemVersion: 'Versión de Ghostboard Studio', systemAI: 'Motor IA Core', systemSTT: 'Modelo STT Streaming',
    systemPhonetics: 'Normalizador fonético IT',
  },
};

const pt: Translations = {
  common: {
    save: 'Salvar', saving: 'Salvando...', cancel: 'Cancelar', loading: 'Carregando...',
    error: 'Erro', success: 'Sucesso', close: 'Fechar', back: 'Voltar', next: 'Próximo',
    yes: 'Sim', no: 'Não', auto: 'Auto',
  },
  nav: {
    features: 'Recursos', pricing: 'Preços', guide: 'Config OS', mockSimulator: 'Simulador',
    signIn: 'Entrar', signUp: 'Cadastro grátis', launchCopilot: 'Iniciar Copilot',
    copilotStudio: 'Copilot Studio', settings: 'Configurações', arena: 'Arena 3D', cabinet: 'Entrar',
  },
  hero: {
    badge: "Teleprompter com IA e Coach ao Vivo · Entrevistas Técnicas",
    line1: 'Sua próxima', line2: 'oferta técnica', line3: 'em 1,5 segundos.', line3_sub: 'Sempre.',
    desc: "Teleprompter com IA em tempo real e coach de desempenho. Supere barreiras linguísticas, elimine a ansiedade e estruture respostas com clareza. Sem necessidade de chaves API.",
    ctaStart: 'COMEÇAR GRÁTIS', ctaDemo: 'VER DEMO',
    statSessions: 'Sessões', statRules: 'Regras', statStealth: "Proteção de privacidade", noirBadge1: "LIVE AI COACH", noirTitle1: "CONFIANÇA", noirTitle1Sub: "ALTO DESEMPENHO", noirBadge2: "TELEPROMPTER HUD", noirTitle2: 'CONQUISTE A VAGA\nDOS SONHOS!', noirTitle2Sub: "SEU COACH\nPESSOAL*", noirDisclaimer: "*Teleprompter com IA em tempo real <1.5s. Criado para eliminar barreiras linguísticas e ansiedade em entrevistas.",
  },
  features: {
    label: 'Arquitetura', title: "Configurações da plataforma e teleprompter",
    subtitle: 'Cada tecnologia resolve um ponto de dor específico em entrevistas',
  },
  pricing: {
    label: 'Preços transparentes', title: 'Investimento em uma ótima oferta',
    subtitle: 'Sem cobranças ocultas · Sem configuração de API',
    monthly: 'Mensal', annual: 'Anual', discount: '−17%', perMonth: '/ mês', oneTime: 'pagamento único',
    freeTier: 'Básico', freeBadge: 'demo de 15 minutos', freeCta: 'COMEÇAR GRÁTIS',
    proTier: 'Ilimitado', proBadge: 'MAIS POPULAR', proCta: 'OBTER PRO PASS →',
    lifeTier: 'Lifetime', lifeCta: 'OBTER PARA SEMPRE',
  },
  cta: {
    titlePart1: 'Pronto para a sua ', titleAccent: 'oferta dos sonhos?',
    btn: 'INICIAR SUA PRIMEIRA SESSÃO →', login: 'Já tem uma conta? Entrar',
    sub: '15 min demo · Sem cartão de crédito · Sem chaves de API próprias',
  },
  footer: {
    privacy: 'Privacidade', terms: 'Termos', settingsLink: 'Configurações', workspace: 'Copilot Workspace →',
  },
  settings: {
    title: 'Configurações do produto & Sistema Teleprompter',
    subtitle: 'Assinatura, perfil do candidato e configuração de áudio',
    toCopilot: 'Para o Copilot',
    sectionSubscription: '💎 Assinatura e Pagamento',
    sectionProfile: '👨‍💻 Perfil do candidato (CV & Contexto)',
    sectionAudio: '🎙️ Configuração de captura de áudio',
    sectionLanguage: '🌍 Preferências de idioma',
    sectionSystem: 'ℹ️ Sobre o sistema',
    sectionInterfaceLang: '🌐 Idioma da interface',
    interfaceLangLabel: 'Idioma do site (interface):',
    interfaceLangSaved: 'Idioma da interface salvo',
    speechLangLabel: 'Idioma de reconhecimento de fala (STT):',
    outputLangLabel: 'Idioma das respostas de IA:',
    saveLangBtn: 'Salvar configurações de idioma',
    langSaved: 'Configurações de idioma salvas',
    subscriptionFree: 'Free Trial Demo', subscriptionPro: 'Ghostboard Pro Pass', subscriptionLifetime: 'Ghostboard Lifetime Pass',
    upgradeBtn: 'Obter Pro Pass →', upgrading: 'Redirecionando...', manageSubscription: 'Gerenciar assinatura',
    profilePosition: 'Cargo / Especialização:', profileStack: 'Stack ativo:',
    editResume: 'Editar CV no Copilot',
    systemVersion: 'Versão do Ghostboard Studio', systemAI: 'Motor IA Core', systemSTT: 'Modelo STT Streaming',
    systemPhonetics: 'Normalizador fonético IT',
  },
};

const it: Translations = {
  common: {
    save: 'Salva', saving: 'Salvataggio...', cancel: 'Annulla', loading: 'Caricamento...',
    error: 'Errore', success: 'Successo', close: 'Chiudi', back: 'Indietro', next: 'Avanti',
    yes: 'Sì', no: 'No', auto: 'Auto',
  },
  nav: {
    features: 'Funzionalità', pricing: 'Prezzi', guide: 'Config OS', mockSimulator: 'Simulatore',
    signIn: 'Accedi', signUp: 'Registrati gratis', launchCopilot: 'Avvia Copilot',
    copilotStudio: 'Copilot Studio', settings: 'Impostazioni', arena: 'Arena 3D', cabinet: 'Accedi',
  },
  hero: {
    badge: "Teleprompter AI e Live Performance Coach · Colloqui Tecnici",
    line1: 'La tua prossima', line2: 'offerta tecnica', line3: 'in 1,5 secondi.', line3_sub: 'Ogni volta.',
    desc: "Teleprompter IA in tempo reale e performance coach. Supera le barriere linguistiche, riduci l'ansia e struttura risposte chiare durante i colloqui. Senza chiavi API personali.",
    ctaStart: 'INIZIA GRATIS', ctaDemo: 'GUARDA LA DEMO',
    statSessions: 'Sessioni', statRules: 'Regole', statStealth: "Protezione privacy", noirBadge1: "LIVE AI COACH", noirTitle1: "SICUREZZA", noirTitle1Sub: "MASSIMA PERFORMANCE", noirBadge2: "TELEPROMPTER HUD", noirTitle2: 'OTTIENI L\'OFFERTA\nDEI TUOI SOGNI!', noirTitle2Sub: "IL TUO COACH\nPERSONALE*", noirDisclaimer: "*Teleprompter AI in tempo reale <1.5s. Creato per superare barriere linguistiche e ansia nei colloqui tecnici.",
  },
  features: {
    label: 'Architettura', title: "Impostazioni della piattaforma e teleprompter",
    subtitle: 'Ogni tecnologia risolve un punto critico preciso nei colloqui ad alto rischio',
  },
  pricing: {
    label: 'Prezzi trasparenti', title: 'Un investimento per una grande offerta',
    subtitle: 'Nessun addebito nascosto · Nessuna configurazione di chiavi API',
    monthly: 'Mensile', annual: 'Annuale', discount: '−17%', perMonth: '/ mese', oneTime: 'pagamento unico',
    freeTier: 'Base', freeBadge: 'demo da 15 minuti', freeCta: 'INIZIA GRATIS',
    proTier: 'Illimitato', proBadge: 'PIÙ POPOLARE', proCta: 'OTTIENI PRO PASS →',
    lifeTier: 'Lifetime', lifeCta: 'OTTIENI PER SEMPRE',
  },
  cta: {
    titlePart1: 'Pronto per la tua ', titleAccent: 'offerta da sogno?',
    btn: 'INIZIA LA TUA PRIMA SESSIONE →', login: 'Hai già un account? Accedi',
    sub: '15 min demo · Nessuna carta di credito · Nessuna chiave API personale',
  },
  footer: {
    privacy: 'Privacy', terms: 'Termini', settingsLink: 'Impostazioni', workspace: 'Copilot Workspace →',
  },
  settings: {
    title: 'Impostazioni prodotto & Sistema Teleprompter',
    subtitle: 'Abbonamento, profilo candidato e configurazione audio',
    toCopilot: 'Al Copilot',
    sectionSubscription: '💎 Abbonamento e Pagamento',
    sectionProfile: '👨‍💻 Profilo candidato (CV & Contesto)',
    sectionAudio: '🎙️ Configurazione acquisizione audio',
    sectionLanguage: '🌍 Preferenze linguistiche',
    sectionSystem: 'ℹ️ Informazioni sul sistema',
    sectionInterfaceLang: '🌐 Lingua dell\'interfaccia',
    interfaceLangLabel: 'Lingua del sito (interfaccia):',
    interfaceLangSaved: 'Lingua dell\'interfaccia salvata',
    speechLangLabel: 'Lingua di riconoscimento vocale (STT):',
    outputLangLabel: 'Lingua delle risposte IA:',
    saveLangBtn: 'Salva impostazioni lingua',
    langSaved: 'Impostazioni lingua salvate',
    subscriptionFree: 'Free Trial Demo', subscriptionPro: 'Ghostboard Pro Pass', subscriptionLifetime: 'Ghostboard Lifetime Pass',
    upgradeBtn: 'Ottieni Pro Pass →', upgrading: 'Reindirizzamento...', manageSubscription: 'Gestisci abbonamento',
    profilePosition: 'Posizione / Specializzazione:', profileStack: 'Stack attivo:',
    editResume: 'Modifica CV in Copilot',
    systemVersion: 'Versione Ghostboard Studio', systemAI: 'Motore IA Core', systemSTT: 'Modello STT Streaming',
    systemPhonetics: 'Normalizzatore fonetico IT',
  },
};

const cs: Translations = {
  common: {
    save: 'Uložit', saving: 'Ukládání...', cancel: 'Zrušit', loading: 'Načítání...',
    error: 'Chyba', success: 'Úspěch', close: 'Zavřít', back: 'Zpět', next: 'Další',
    yes: 'Ano', no: 'Ne', auto: 'Automaticky',
  },
  nav: {
    features: 'Funkce', pricing: 'Ceny', guide: 'Nastavení OS', mockSimulator: 'Simulátor',
    signIn: 'Přihlásit se', signUp: 'Registrovat zdarma', launchCopilot: 'Spustit Copilot',
    copilotStudio: 'Copilot Studio', settings: 'Nastavení', arena: '3D Aréna', cabinet: 'Přihlásit se',
  },
  hero: {
    badge: "AI Teleprompter a Osobní Kouč · Technické Pohovory",
    line1: 'Vaše příští', line2: 'technická nabídka', line3: 'za 1,5 sekundy.', line3_sub: 'Pokaždé.',
    desc: "AI teleprompter v reálném čase a osobní kouč. Pomáhá překonat jazykovou bariéru, zvládnout nervozitu a strukturovat odpovědi. Vlastní API klíče nejsou potřeba.",
    ctaStart: 'ZAČÍT ZDARMA', ctaDemo: 'ZOBRAZIT DEMO',
    statSessions: 'Relací', statRules: 'Pravidel', statStealth: "Ochrana soukromí", noirBadge1: "LIVE AI COACH", noirTitle1: "SEBEDŮVĚRA", noirTitle1Sub: "ČISTÝ VÝKON", noirBadge2: "TELEPROMPTER HUD", noirTitle2: 'ZÍSKEJTE VYSNĚNOU\nNABÍDKU!', noirTitle2Sub: "VÁŠ OSOBNÍ\nKOUČ*", noirDisclaimer: "*AI teleprompter s odezvou <1.5s. Vytvořen pro překonání jazykové bariéry a nervozity při pohovorech.",
  },
  features: {
    label: 'Architektura', title: "Nastavení platformy a teleprompteru",
    subtitle: 'Každá technologie řeší konkrétní problémový bod v pohovorech',
  },
  pricing: {
    label: 'Transparentní ceny', title: 'Investice do jedné skvělé nabídky',
    subtitle: 'Bez skrytých poplatků · Bez konfigurace API klíčů',
    monthly: 'Měsíčně', annual: 'Ročně', discount: '−17%', perMonth: '/ měsíc', oneTime: 'jednorázově',
    freeTier: 'Starter', freeBadge: '15minutové demo', freeCta: 'ZAČÍT ZDARMA',
    proTier: 'Neomezený', proBadge: 'NEJOBLÍBENĚJŠÍ', proCta: 'ZÍSKAT PRO PASS →',
    lifeTier: 'Lifetime', lifeCta: 'ZÍSKAT NAVŽDY',
  },
  cta: {
    titlePart1: 'Připraveni na svou ', titleAccent: 'vysněnou nabídku?',
    btn: 'ZAHÁJIT PRVNÍ RELACI →', login: 'Již máte účet? Přihlásit se',
    sub: '15 min demo · Bez kreditní karty · Bez vlastních API klíčů',
  },
  footer: {
    privacy: 'Soukromí', terms: 'Podmínky', settingsLink: 'Nastavení', workspace: 'Copilot Workspace →',
  },
  settings: {
    title: 'Nastavení produktu & Teleprompter systém',
    subtitle: 'Předplatné, profil kandidáta a nastavení zvuku',
    toCopilot: 'Do Copilot',
    sectionSubscription: '💎 Předplatné a platba',
    sectionProfile: '👨‍💻 Profil kandidáta (CV & kontext)',
    sectionAudio: '🎙️ Nastavení zachycení zvuku',
    sectionLanguage: '🌍 Jazykové preference',
    sectionSystem: 'ℹ️ O systému',
    sectionInterfaceLang: '🌐 Jazyk rozhraní',
    interfaceLangLabel: 'Jazyk webu (rozhraní):',
    interfaceLangSaved: 'Jazyk rozhraní uložen',
    speechLangLabel: 'Jazyk rozpoznávání řeči (STT):',
    outputLangLabel: 'Jazyk odpovědí AI:',
    saveLangBtn: 'Uložit jazyková nastavení',
    langSaved: 'Jazyková nastavení uložena',
    subscriptionFree: 'Free Trial Demo', subscriptionPro: 'Ghostboard Pro Pass', subscriptionLifetime: 'Ghostboard Lifetime Pass',
    upgradeBtn: 'Získat Pro Pass →', upgrading: 'Přesměrování...', manageSubscription: 'Spravovat předplatné',
    profilePosition: 'Pozice / Specializace:', profileStack: 'Aktivní stack:',
    editResume: 'Upravit CV v Copilot',
    systemVersion: 'Verze Ghostboard Studio', systemAI: 'Jádro AI motoru', systemSTT: 'Model STT Streaming',
    systemPhonetics: 'IT fonetický normalizátor',
  },
};

const nl: Translations = {
  common: {
    save: 'Opslaan', saving: 'Opslaan...', cancel: 'Annuleren', loading: 'Laden...',
    error: 'Fout', success: 'Succes', close: 'Sluiten', back: 'Terug', next: 'Volgende',
    yes: 'Ja', no: 'Nee', auto: 'Auto',
  },
  nav: {
    features: 'Functies', pricing: 'Prijzen', guide: 'OS-installatie', mockSimulator: 'Simulator',
    signIn: 'Inloggen', signUp: 'Gratis aanmelden', launchCopilot: 'Copilot starten',
    copilotStudio: 'Copilot Studio', settings: 'Instellingen', arena: '3D Arena', cabinet: 'Inloggen',
  },
  hero: {
    badge: "AI-Teleprompter & Live Performance Coach · Technische Interviews",
    line1: 'Jouw volgende', line2: 'technisch aanbod', line3: 'in 1,5 seconde.', line3_sub: 'Elke keer.',
    desc: "Realtime AI-teleprompter en live performance coach. Overwin taalbarrières, verminder spreekangst en formuleer duidelijke antwoorden. Geen eigen API-sleutels nodig.",
    ctaStart: 'GRATIS STARTEN', ctaDemo: 'DEMO BEKIJKEN',
    statSessions: 'Sessies', statRules: 'Regels', statStealth: "Privacybescherming", noirBadge1: "LIVE AI COACH", noirTitle1: "ZELFVERTROUWEN", noirTitle1Sub: "OPTIMALE PRESTATIE", noirBadge2: "TELEPROMPTER HUD", noirTitle2: 'KRIJG HET DROOM\nAANBOD!', noirTitle2Sub: "JOUW PERSOONLIJKE\nCOACH*", noirDisclaimer: "*Realtime AI-teleprompter met reactietijd <1.5s. Ontworpen om taalbarrières en spreekangst weg te nemen.",
  },
  features: {
    label: 'Architectuur', title: "Platforminstellingen & teleprompter",
    subtitle: 'Elke technologie lost een specifiek pijnpunt op bij sollicitaties',
  },
  pricing: {
    label: 'Transparante prijzen', title: 'Investering in een geweldig aanbod',
    subtitle: 'Geen verborgen kosten · Geen API-sleutelconfiguratie',
    monthly: 'Maandelijks', annual: 'Jaarlijks', discount: '−17%', perMonth: '/ maand', oneTime: 'eenmalig',
    freeTier: 'Starter', freeBadge: '15 minuten demo', freeCta: 'GRATIS STARTEN',
    proTier: 'Onbeperkt', proBadge: 'MEEST POPULAIR', proCta: 'PRO PASS KRIJGEN →',
    lifeTier: 'Lifetime', lifeCta: 'VOOR ALTIJD KRIJGEN',
  },
  cta: {
    titlePart1: 'Klaar voor jouw ', titleAccent: 'droomanbieding?',
    btn: 'START JOUW EERSTE SESSIE →', login: 'Al een account? Inloggen',
    sub: '15 min demo · Geen creditcard · Geen eigen API-sleutels',
  },
  footer: {
    privacy: 'Privacy', terms: 'Voorwaarden', settingsLink: 'Instellingen', workspace: 'Copilot Workspace →',
  },
  settings: {
    title: 'Productinstellingen & Teleprompter-systeem',
    subtitle: 'Abonnement, kandidaatprofiel en audio-hardware-instelling',
    toCopilot: 'Naar Copilot',
    sectionSubscription: '💎 Abonnement & Betaling',
    sectionProfile: '👨‍💻 Kandidaatprofiel (CV & Context)',
    sectionAudio: '🎙️ Audio-opname instellen',
    sectionLanguage: '🌍 Taalvoorkeuren',
    sectionSystem: 'ℹ️ Over het systeem',
    sectionInterfaceLang: '🌐 Interfacetaal',
    interfaceLangLabel: 'Sitetaal (interface):',
    interfaceLangSaved: 'Interfacetaal opgeslagen',
    speechLangLabel: 'Spraakherkenningsstaal (STT):',
    outputLangLabel: 'AI-antwoordtaal:',
    saveLangBtn: 'Taalinstellingen opslaan',
    langSaved: 'Taalinstellingen opgeslagen',
    subscriptionFree: 'Free Trial Demo', subscriptionPro: 'Ghostboard Pro Pass', subscriptionLifetime: 'Ghostboard Lifetime Pass',
    upgradeBtn: 'Pro Pass krijgen →', upgrading: 'Doorsturen...', manageSubscription: 'Abonnement beheren',
    profilePosition: 'Functie / Specialisatie:', profileStack: 'Actieve stack:',
    editResume: 'CV bewerken in Copilot',
    systemVersion: 'Ghostboard Studio Versie', systemAI: 'AI Core Motor', systemSTT: 'STT Streaming Model',
    systemPhonetics: 'IT Fonetische Normalizer',
  },
};

export const TRANSLATIONS: Record<SupportedLocale, Translations> = {
  ua, en, pl, de, fr, es, pt, it, cs, nl,
};

export function getTranslations(locale: SupportedLocale): Translations {
  return TRANSLATIONS[locale] || TRANSLATIONS['en'];
}
