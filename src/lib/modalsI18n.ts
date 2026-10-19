import type { SupportedLocale } from './geoLang';

export interface SoundcheckModalI18n {
  badge: string;
  title: string;
  desc: string;
  listening: string;
  waiting: string;
  sttLabel: string;
  speechSuccess: string;
  audioDetected: string;
  btnTab: string;
  btnTabSub: string;
  btnMic: string;
  btnMicSub: string;
  btnYt: string;
  btnYtSub: string;
  btnStop: string;
  guideTitle: string;
  winDesc: string;
  macDesc: string;
  linuxDesc: string;
  playLocal: string;
  ready: string;
  close: string;
  testSpeechText: string;
  step1Title: string;
  step1Desc: string;
  step2Title: string;
  step2Desc: string;
  step3Title: string;
  step3Desc: string;
  tabAudioAlert: string;
  voicePlaying: string;
  stopVoice: string;
  langSelectLabel: string;
  checkSource: string;
  checkVolume: string;
  checkSTT: string;
  transcriptionPlaceholder: string;
}

export interface TrialModalI18n {
  badge: string;
  title: string;
  desc: string;
  freeLabel: string;
  freeValue: string;
  proLabel: string;
  proValue: string;
  benefit1: string;
  benefit2: string;
  benefit3: string;
  upgradeBtn: string;
  demoBtn: string;
  stayFree: string;
}

export interface CompanionModalI18n {
  badge: string;
  title: string;
  desc: string;
  generating: string;
  sseSync: string;
  copyLink: string;
  copied: string;
  popout: string;
  toastCopied: string;
}

export interface ScorecardModalI18n {
  verifiedBadge: string;
  candidateDefault: string;
  matrixTitle: string;
  accuracy: string;
  architecture: string;
  speed: string;
  communication: string;
  stress: string;
  rounds: string;
  staffConclusion: string;
  qrScanHint: string;
  shareLinkedIn: string;
  copiedLinkedIn: string;
  publicLink: string;
  copiedPublic: string;
  tweet: string;
  toastLinkedIn: string;
  toastLink: string;
}

export interface ProfileModalI18n {
  title: string;
  subtitle: string;
  ageLabel: string;
  yearsOld: string;
  presetsLabel: string;
  presetsSub: string;
  roleLabel: string;
  stackLabel: string;
  addTech: string;
  projectsTitle: string;
  addProject: string;
  newProjName: string;
  newProjDesc: string;
  newProjHighlight: string;
  bioLabel: string;
  bioPlaceholder: string;
  jobLabel: string;
  jobPlaceholder: string;
  cvLabel: string;
  cvPlaceholder: string;
  reset: string;
  cancel: string;
  save: string;
  toastSaved: string;
  toastReset: string;
}

export interface PanicShieldI18n {
  exitHint: string;
  escBadge: string;
}

export interface FooterI18n {
  tagline: string;
  desc: string;
  ramBadge: string;
  ecoTitle: string;
  featLink: string;
  pricingLink: string;
  guideLink: string;
  mockLink: string;
  copilotLink: string;
  legalTitle: string;
  termsLink: string;
  privacyLink: string;
  settingsLink: string;
  rights: string;
}

export interface ModalsTranslations {
  soundcheck: SoundcheckModalI18n;
  trial: TrialModalI18n;
  companion: CompanionModalI18n;
  scorecard: ScorecardModalI18n;
  profile: ProfileModalI18n;
  panicShield: PanicShieldI18n;
  footer: FooterI18n;
}

export const MODALS_I18N: Record<SupportedLocale, ModalsTranslations> = {
  "ua": {
    "soundcheck": {
      "badge": "Acoustic Calibration Protocol",
      "title": "Калібрування звуку співрозмовника",
      "desc": "Ghostboard слухає аудіопотік вкладки зустрічі (Google Meet, Zoom, YouTube) та одночасно мікшує ваш мікрофон.",
      "listening": "Слухаємо аудіосигнал...",
      "waiting": "Очікуємо активації захоплення",
      "sttLabel": "Спіч-до-тексту (Deepgram Nova-3):",
      "speechSuccess": "Звук та мова співрозмовника розпізнаються ідеально!",
      "audioDetected": "Аудіосигнал виявлено! Очікуємо розпізнавання мови...",
      "btnTab": "ВКЛАДКА ЗУСТРІЧІ",
      "btnTabSub": "Meet / Zoom / YouTube",
      "btnMic": "МІКРОФОН (АКУСТИЧНИЙ)",
      "btnMicSub": "Динаміки + мікрофон (0 програм)",
      "btnYt": "ТЕСТ З YOUTUBE",
      "btnYtSub": "Відкрити відео",
      "btnStop": "ЗУПИНИТИ ТЕСТ ЗВУКУ",
      "guideTitle": "Сумісність для всіх ОС (Windows, macOS, Linux):",
      "winDesc": "Виберіть вкладку Chrome дзвінка або динаміки ноутбука (0 програм).",
      "macDesc": "Виберіть «Chrome Tab» з Meet/Zoom або динаміки ноутбука.",
      "linuxDesc": "Виберіть вкладку Chrome або режим динаміків — 0 стороннього софту.",
      "playLocal": "Озвучити локальний тест",
      "ready": "Все готово до інтервʼю",
      "close": "Закрити",
      "testSpeechText": "Привіт! Це автоматична перевірка звуку. Якщо ви бачите текст на екрані, система працює ідеально.",
      "step1Title": "Крок 1: Оберіть джерело звуку",
      "step1Desc": "Звідки записувати звук співрозмовника або ваш голос",
      "step2Title": "Крок 2: Озвучення або тест голосом",
      "step2Desc": "Натисніть кнопку озвучення або скажіть кілька слів у мікрофон",
      "step3Title": "Крок 3: Перевірка сигналу та тексту",
      "step3Desc": "Хвиля звуку має рухатись, а текст — розпізнаватись",
      "tabAudioAlert": "У спливаючому вікні Chrome обовʼязково увімкніть галочку «Поділитися аудіо вкладки»",
      "voicePlaying": "Озвучуємо фразу...",
      "stopVoice": "Зупинити голос",
      "langSelectLabel": "Мова тесту та інтерфейсу:",
      "checkSource": "Джерело звуку підключено",
      "checkVolume": "Аудіосигнал виявлено",
      "checkSTT": "Розпізнавання тексту працює",
      "transcriptionPlaceholder": "Тут зʼявиться розпізнаний текст у реальному часі..."
    },
    "trial": {
      "badge": "Free Trial · Ліміт 15 хвилин",
      "title": "Час безкоштовного тесту вичерпано",
      "desc": "Безкоштовний тариф обмежено 15 хвилинами для запобігання перевантаження безкоштовних квот Gemini та Deepgram. У тарифі Pro час сесій не обмежений.",
      "freeLabel": "Безкоштовний тариф:",
      "freeValue": "макс. 15 хвилин / сесія",
      "proLabel": "Тариф Pro ($15/міс):",
      "proValue": "БЕЗЛІМІТНО",
      "benefit1": "Неперервна співбесіда будь-якої тривалості (1–2+ години)",
      "benefit2": "Пріоритетний виділений канал Gemini 2.5 Flash",
      "benefit3": "Screen & Code OCR [F9] + HUD телесуфлер на планшет",
      "upgradeBtn": "Отримати Pro Pass ($15/міс) →",
      "demoBtn": "Протестувати Pro без ліміту (1-Click Demo)",
      "stayFree": "Залишитися на Free"
    },
    "companion": {
      "badge": "Dual-Screen · Без вікон на ПК",
      "title": "Телесуфлер на iPad або телефон",
      "desc": "Поставте планшет або смартфон біля веб-камери. Відповіді транслюються в реальному часі без жодного відкритого вікна на моніторі комп'ютера.",
      "generating": "Генерація QR-коду...",
      "sseSync": "Синхронізація по захищеному каналу SSE",
      "copyLink": "Скопіювати лінк",
      "copied": "Скопійовано!",
      "popout": "Вікно Pop-Out",
      "toastCopied": "Посилання на телесуфлер скопійовано!"
    },
    "scorecard": {
      "verifiedBadge": "Verified Senior Software Engineer",
      "candidateDefault": "Кандидат",
      "matrixTitle": "Радарна матриця компетенцій (5 вимірів):",
      "accuracy": "Точність",
      "architecture": "Архітектура",
      "speed": "Швидкість",
      "communication": "Комунікація",
      "stress": "Стресостійкість",
      "rounds": "раундів",
      "staffConclusion": "Висновки Staff Engineer:",
      "qrScanHint": "Скануйте для перевірки на мобільному або вставте у CV",
      "shareLinkedIn": "Поділитися в LinkedIn",
      "copiedLinkedIn": "Скопійовано для LinkedIn!",
      "publicLink": "Публічне посилання",
      "copiedPublic": "Посилання скопійовано!",
      "tweet": "Твітнути [X]",
      "toastLinkedIn": "Текст для LinkedIn скопійовано! Вставте його у ваш пост.",
      "toastLink": "Посилання на 3D скоркард скопійовано!"
    },
    "profile": {
      "title": "Контекст Резюме та Пет-проєктів",
      "subtitle": "ШІ органічно підмішуватиме твої реальні технології та кейси у відповіді на співбесіді.",
      "ageLabel": "Вік (років):",
      "yearsOld": "років",
      "presetsLabel": "⚡ Швидкий вибір ролі (в 1 клік):",
      "presetsSub": "Заповнить роль та стек",
      "roleLabel": "Позиція / Роль:",
      "stackLabel": "Твій стек технологій (теги):",
      "addTech": "+ Додати технологію",
      "projectsTitle": "Твої Пет-проєкти (для прикладів ШІ):",
      "addProject": "Додати проєкт",
      "newProjName": "Новий пет-проєкт",
      "newProjDesc": "Короткий опис технологій та задачі",
      "newProjHighlight": "Головне технічне досягнення або складний баг, який вирішив",
      "bioLabel": "Додатковий контекст / Твій стиль:",
      "bioPlaceholder": "Встав сюди частину свого резюме або ключові факти про себе...",
      "jobLabel": "Вимоги вакансії (Job Description):",
      "jobPlaceholder": "Вставте текст вакансії сюди, щоб ШІ міг адаптувати відповіді під вимоги компанії...",
      "cvLabel": "Твоє резюме (CV Context):",
      "cvPlaceholder": "Вставте текст вашого CV, щоб ШІ міг наводити приклади з вашого реального досвіду...",
      "reset": "Скинути до стандартних",
      "cancel": "Скасувати",
      "save": "Зберегти профіль",
      "toastSaved": "Профіль та контекст CV успішно збережено!",
      "toastReset": "Скинуто до стандартного профілю"
    },
    "panicShield": {
      "exitHint": "Натисніть Esc або клікніть будь-де, щоб повернутися до телесуфлера",
      "escBadge": "Esc для виходу"
    },
    "footer": {
      "tagline": "AI-телесуфлер та коуч для технічних інтерв'ю",
      "desc": "AI-телесуфлер у реальному часі та персональний коуч для технічних інтерв'ю і щоденних стендапів. Допомагає подолати мовний бар'єр, зняти хвилювання та структурувати відповіді.",
      "ramBadge": "Звук обробляється виключно в оперативній памʼяті (RAM-only)",
      "ecoTitle": "Екосистема",
      "featLink": "Можливості платформи",
      "pricingLink": "Тарифи та Pro-допуск",
      "guideLink": "Налаштування звуку ОС",
      "mockLink": "Тренажер співбесід (AI Voice)",
      "copilotLink": "Відкрити робочий Copilot",
      "legalTitle": "Безпека & Право",
      "termsLink": "Умови використання",
      "privacyLink": "Політика конфіденційності",
      "settingsLink": "Налаштування акаунту",
      "rights": "Всі права захищено."
    }
  },
  "en": {
    "soundcheck": {
      "badge": "Acoustic Calibration Protocol",
      "title": "Interviewer Audio Calibration",
      "desc": "Ghostboard captures meeting audio (Google Meet, Zoom, YouTube) while simultaneously mixing your microphone.",
      "listening": "Listening for audio signal...",
      "waiting": "Waiting for audio capture activation",
      "sttLabel": "Speech-to-Text (Deepgram Nova-3):",
      "speechSuccess": "Interviewer speech recognized with zero lag!",
      "audioDetected": "Audio signal detected! Awaiting speech...",
      "btnTab": "MEETING TAB",
      "btnTabSub": "Meet / Zoom / YouTube",
      "btnMic": "MICROPHONE (ACOUSTIC)",
      "btnMicSub": "Speakers + Mic (0 downloads)",
      "btnYt": "YOUTUBE TEST",
      "btnYtSub": "Launch sample video",
      "btnStop": "STOP AUDIO TEST",
      "guideTitle": "Cross-OS Compatibility (Windows, macOS, Linux):",
      "winDesc": "Select Chrome meeting tab or laptop speakers (zero software).",
      "macDesc": "Select 'Chrome Tab' with Meet/Zoom or laptop speakers.",
      "linuxDesc": "Select 'Chrome Tab' or speaker acoustic mode — zero software.",
      "playLocal": "Play local voice sample",
      "ready": "Ready for Interview",
      "close": "Close",
      "testSpeechText": "Hello! This is an automatic audio diagnostic. If you see this text streaming on screen, the system is calibrated perfectly.",
      "step1Title": "Step 1: Select Audio Source",
      "step1Desc": "Where to capture interviewer audio or your voice",
      "step2Title": "Step 2: Voice Test or Speak",
      "step2Desc": "Click the voice button or speak into your microphone",
      "step3Title": "Step 3: Signal & Transcript Verification",
      "step3Desc": "The audio wave should move and text should transcribe live",
      "tabAudioAlert": "In the Chrome window, make sure 'Share tab audio' is checked",
      "voicePlaying": "Playing test voice...",
      "stopVoice": "Stop Voice",
      "langSelectLabel": "Interface & Speech Language:",
      "checkSource": "Audio source connected",
      "checkVolume": "Audio signal detected",
      "checkSTT": "Speech recognition verified",
      "transcriptionPlaceholder": "Live transcribed text will appear here in real time..."
    },
    "trial": {
      "badge": "Free Trial · 15-Minute Limit",
      "title": "Free Trial Time Expired",
      "desc": "The free tier is capped at 15 minutes to prevent overloading Gemini & Deepgram free quotas. With Pro Pass, interview sessions are completely unlimited.",
      "freeLabel": "Free Trial:",
      "freeValue": "max. 15 min / session",
      "proLabel": "Pro Pass ($15/mo):",
      "proValue": "UNLIMITED",
      "benefit1": "Uninterrupted interviews of any duration (1–2+ hours)",
      "benefit2": "Priority dedicated Gemini 2.5 Flash low-latency pipeline",
      "benefit3": "Screen & Code OCR [F9] + dual-screen tablet teleprompter",
      "upgradeBtn": "Get Pro Pass ($15/mo) →",
      "demoBtn": "Test Pro without limits (1-Click Demo)",
      "stayFree": "Stay on Free"
    },
    "companion": {
      "badge": "Dual-Screen · No Windows on PC",
      "title": "Teleprompter for iPad or Smartphone",
      "desc": "Place your tablet or phone right below your webcam. Answers stream in real-time with zero visible windows on your main display.",
      "generating": "Generating QR code...",
      "sseSync": "Encrypted real-time SSE stream sync",
      "copyLink": "Copy Link",
      "copied": "Copied!",
      "popout": "Pop-Out Window",
      "toastCopied": "Teleprompter URL copied to clipboard!"
    },
    "scorecard": {
      "verifiedBadge": "Verified Senior Software Engineer",
      "candidateDefault": "Candidate",
      "matrixTitle": "Competency Radar Matrix (5 Dimensions):",
      "accuracy": "Accuracy",
      "architecture": "Architecture",
      "speed": "Speed",
      "communication": "Communication",
      "stress": "Stress Resilience",
      "rounds": "rounds",
      "staffConclusion": "Staff Engineer Debrief:",
      "qrScanHint": "Scan on mobile or attach to CV / LinkedIn",
      "shareLinkedIn": "Share on LinkedIn",
      "copiedLinkedIn": "Copied for LinkedIn!",
      "publicLink": "Public Scorecard Link",
      "copiedPublic": "Link Copied!",
      "tweet": "Tweet [X]",
      "toastLinkedIn": "LinkedIn post formatted and copied to clipboard!",
      "toastLink": "Public 3D Scorecard link copied to clipboard!"
    },
    "profile": {
      "title": "Candidate CV & Experience Context",
      "subtitle": "AI naturally injects your real tech stack, metrics, and production stories into interview answers.",
      "ageLabel": "Age (years):",
      "yearsOld": "y/o",
      "presetsLabel": "⚡ 1-Click Role Presets:",
      "presetsSub": "Auto-fills role & stack",
      "roleLabel": "Target Role:",
      "stackLabel": "Your Tech Stack (tags):",
      "addTech": "+ Add technology",
      "projectsTitle": "Your Pet Projects & Production Cases:",
      "addProject": "Add Project",
      "newProjName": "New Project",
      "newProjDesc": "Tech stack overview and objective",
      "newProjHighlight": "Key technical highlight, scale bottleneck or bug solved",
      "bioLabel": "Bio / Personal Style Context:",
      "bioPlaceholder": "Paste parts of your CV, background, or personal tone here...",
      "jobLabel": "Job Description:",
      "jobPlaceholder": "Paste the target job description to let AI tailor every response...",
      "cvLabel": "CV & Experience Details:",
      "cvPlaceholder": "Paste raw CV text so AI draws evidence from your actual track record...",
      "reset": "Reset to Default",
      "cancel": "Cancel",
      "save": "Save Profile",
      "toastSaved": "Candidate profile & CV context saved successfully!",
      "toastReset": "Reset to default profile"
    },
    "panicShield": {
      "exitHint": "Press Esc or click anywhere to return to teleprompter",
      "escBadge": "Esc to exit"
    },
    "footer": {
      "tagline": "AI Real-Time Teleprompter & Live Performance Coach",
      "desc": "AI-powered real-time teleprompter and live performance coach for technical interviews and daily standups. Built to overcome language barriers, eliminate anxiety, and structure responses.",
      "ramBadge": "Audio processed strictly in memory (RAM-only)",
      "ecoTitle": "Ecosystem",
      "featLink": "Platform Capabilities",
      "pricingLink": "Pricing & Pro Pass",
      "guideLink": "OS Audio Routing Guide",
      "mockLink": "AI Voice Mock Interviewer",
      "copilotLink": "Open Copilot Studio",
      "legalTitle": "Security & Legal",
      "termsLink": "Terms of Service",
      "privacyLink": "Privacy Policy",
      "settingsLink": "Account Settings",
      "rights": "All rights reserved."
    }
  },
  "pl": {
    "soundcheck": {
      "badge": "Acoustic Calibration Protocol",
      "title": "Kalibracja dźwięku rekrutera",
      "desc": "Ghostboard przechwytuje dźwięk z karty spotkania (Google Meet, Zoom, YouTube) i jednocześnie miksuje Twój mikrofon.",
      "listening": "Nasłuchiwanie sygnału audio...",
      "waiting": "Oczekiwanie na aktywację przechwytywania",
      "sttLabel": "Rozpoznawanie mowy (Deepgram Nova-3):",
      "speechSuccess": "Dźwięk i mowa rekrutera rozpoznawane perfekcyjnie!",
      "audioDetected": "Sygnał audio wykryty! Oczekiwanie na mowę...",
      "btnTab": "KARTA SPOTKANIA",
      "btnTabSub": "Meet / Zoom / YouTube",
      "btnMic": "MIKROFON",
      "btnMicSub": "Tylko mikrofon",
      "btnYt": "TEST Z YOUTUBE",
      "btnYtSub": "Otwórz wideo",
      "btnStop": "ZATRZYMAJ TEST DŹWIĘKU",
      "guideTitle": "Kompatybilność z systemami (Windows, macOS, Linux):",
      "winDesc": "Wybierz kartę Chrome z rozmową lub dźwięk systemowy.",
      "macDesc": "Wybierz kartę Chrome z Google Meet / Zoom.",
      "linuxDesc": "Wybierz kartę Chrome — dźwięk przechwytywany natywnie w przeglądarce.",
      "playLocal": "Odtwórz lokalny test mowy",
      "ready": "Gotowy do rozmowy",
      "close": "Zamknij",
      "testSpeechText": "Cześć! To automatyczny test dźwięku. Jeśli widzisz ten tekst na ekranie, system działa idealnie.",
      "step1Title": "Krok 1: Wybierz źródło dźwięku",
      "step1Desc": "Skąd przechwytywać dźwięk rozmówcy lub Twój głos",
      "step2Title": "Krok 2: Test głosu lub mówienie",
      "step2Desc": "Kliknij przycisk odtwarzania lub powiedz coś do mikrofonu",
      "step3Title": "Krok 3: Weryfikacja sygnału i tekstu",
      "step3Desc": "Fala dźwięku powinna falować, a tekst pojawiać się na żywo",
      "tabAudioAlert": "W oknie Chrome zaznacz pole «Udostępnij dźwięk karty»",
      "voicePlaying": "Odtwarzanie głosu testowego...",
      "stopVoice": "Zatrzymaj głos",
      "langSelectLabel": "Język interfejsu i mowy:",
      "checkSource": "Źródło dźwięku połączone",
      "checkVolume": "Wykryto sygnał audio",
      "checkSTT": "Rozpoznawanie mowy zweryfikowane",
      "transcriptionPlaceholder": "Tutaj pojawi się transkrypcja w czasie rzeczywistym..."
    },
    "trial": {
      "badge": "Free Trial · Limit 15 minut",
      "title": "Czas darmowego testu wyczerpany",
      "desc": "Darmowy plan jest ograniczony do 15 minut, aby zapobiec przeciążeniu limitów Gemini i Deepgram. W planie Pro czas sesji jest nieograniczony.",
      "freeLabel": "Darmowy plan:",
      "freeValue": "maks. 15 minut / sesja",
      "proLabel": "Plan Pro ($15/mies.):",
      "proValue": "BEZ LIMITU",
      "benefit1": "Nieprzerwana rozmowa o dowolnej długości (1–2+ godziny)",
      "benefit2": "Priorytetowy dedykowany kanał Gemini 2.5 Flash",
      "benefit3": "Screen & Code OCR [F9] + teleprompter na tablet",
      "upgradeBtn": "Zdobądź Pro Pass ($15/mies.) →",
      "demoBtn": "Przetestuj Pro bez limitu (1-Click Demo)",
      "stayFree": "Pozostań na Free"
    },
    "companion": {
      "badge": "Dual-Screen · Bez okien na PC",
      "title": "Teleprompter na iPad lub telefon",
      "desc": "Umieść tablet lub smartfon pod kamerą internetową. Odpowiedzi przesyłane są w czasie rzeczywistym bez otwierania okien na monitorze.",
      "generating": "Generowanie kodu QR...",
      "sseSync": "Synchronizacja przez bezpieczny kanał SSE",
      "copyLink": "Kopiuj link",
      "copied": "Skopiowano!",
      "popout": "Okno Pop-Out",
      "toastCopied": "Link do telepromptera skopiowany!"
    },
    "scorecard": {
      "verifiedBadge": "Verified Senior Software Engineer",
      "candidateDefault": "Kandydat",
      "matrixTitle": "Macierz radarowa kompetencji (5 wymiarów):",
      "accuracy": "Dokładność",
      "architecture": "Architektura",
      "speed": "Szybkość",
      "communication": "Komunikacja",
      "stress": "Odporność na stres",
      "rounds": "rund",
      "staffConclusion": "Wnioski Staff Engineera:",
      "qrScanHint": "Zeskanuj na telefonie lub dodaj do CV",
      "shareLinkedIn": "Udostępnij na LinkedIn",
      "copiedLinkedIn": "Skopiowano dla LinkedIn!",
      "publicLink": "Publiczny link",
      "copiedPublic": "Link skopiowany!",
      "tweet": "Opublikuj na [X]",
      "toastLinkedIn": "Tekst dla LinkedIn skopiowany do schowka!",
      "toastLink": "Link do 3D Scorecardu skopiowany!"
    },
    "profile": {
      "title": "Kontekst CV i projektów kandydata",
      "subtitle": "AI naturalnie wplata Twoje technologie i projekty w odpowiedzi podczas rozmowy.",
      "ageLabel": "Wiek (lata):",
      "yearsOld": "lat",
      "presetsLabel": "⚡ Szybki wybór roli (1 klik):",
      "presetsSub": "Uzupełni rolę i stack",
      "roleLabel": "Stanowisko docelowe:",
      "stackLabel": "Twój stack technologiczny (tagi):",
      "addTech": "+ Dodaj technologię",
      "projectsTitle": "Twoje projekty własne (dla przykładów AI):",
      "addProject": "Dodaj projekt",
      "newProjName": "Nowy projekt",
      "newProjDesc": "Opis technologii i celu projektu",
      "newProjHighlight": "Kluczowe osiągnięcie techniczne lub rozwiązany problem",
      "bioLabel": "Dodatkowy kontekst / Twój styl:",
      "bioPlaceholder": "Wklej fragmenty CV lub kluczowe fakty o sobie...",
      "jobLabel": "Wymagania oferty (Job Description):",
      "jobPlaceholder": "Wklej opis stanowiska, aby AI dopasował odpowiedzi...",
      "cvLabel": "Treść CV (CV Context):",
      "cvPlaceholder": "Wklej tekst swojego CV, aby AI odwoływał się do Twojego doświadczenia...",
      "reset": "Przywróć domyślne",
      "cancel": "Anuluj",
      "save": "Zapisz profil",
      "toastSaved": "Profil kandydata został pomyślnie zapisany!",
      "toastReset": "Przywrócono profil domyślny"
    },
    "panicShield": {
      "exitHint": "Naciśnij Esc lub kliknij w dowolnym miejscu, aby wrócić do telepromptera",
      "escBadge": "Esc aby wyjść"
    },
    "footer": {
      "tagline": "Teleprompter AI i trener rozmów technicznych",
      "desc": "Teleprompter AI w czasie rzeczywistym i osobisty trener. Pomaga pokonać barierę językową, zredukować stres i ustrukturyzować odpowiedzi na rozmowach i standupach.",
      "ramBadge": "Dźwięk przetwarzany wyłącznie w pamięci RAM",
      "ecoTitle": "Ekosystem",
      "featLink": "Możliwości platformy",
      "pricingLink": "Cennik i Pro Pass",
      "guideLink": "Konfiguracja dźwięku OS",
      "mockLink": "Symulator rozmów (AI Voice)",
      "copilotLink": "Otwórz Copilot Studio",
      "legalTitle": "Bezpieczeństwo i Prawo",
      "termsLink": "Warunki korzystania",
      "privacyLink": "Polityka prywatności",
      "settingsLink": "Ustawienia konta",
      "rights": "Wszelkie prawa zastrzeżone."
    }
  },
  "de": {
    "soundcheck": {
      "badge": "Acoustic Calibration Protocol",
      "title": "Audio-Kalibrierung des Interviewers",
      "desc": "Ghostboard erfasst den Audio-Stream des Meeting-Tabs (Google Meet, Zoom, YouTube) und mischt gleichzeitig Ihr Mikrofon bei.",
      "listening": "Audiosignal wird abgehört...",
      "waiting": "Warte auf Aktivierung der Audioaufnahme",
      "sttLabel": "Spracherkennung (Deepgram Nova-3):",
      "speechSuccess": "Sprache des Interviewers wird perfekt erkannt!",
      "audioDetected": "Audiosignal erkannt! Warte auf Sprache...",
      "btnTab": "MEETING-TAB",
      "btnTabSub": "Meet / Zoom / YouTube",
      "btnMic": "MIKROFON",
      "btnMicSub": "Nur Mikrofon",
      "btnYt": "YOUTUBE-TEST",
      "btnYtSub": "Testvideo öffnen",
      "btnStop": "AUDIO-TEST STOPPEN",
      "guideTitle": "Betriebssystem-Kompatibilität (Windows, macOS, Linux):",
      "winDesc": "Wählen Sie den Chrome-Tab Ihres Meetings oder Systemsound.",
      "macDesc": "Wählen Sie den Chrome-Tab mit Google Meet / Zoom.",
      "linuxDesc": "Wählen Sie 'Chrome Tab' — Audio wird direkt im Browser erfasst.",
      "playLocal": "Lokale Sprachprobe abspielen",
      "ready": "Bereit fürs Interview",
      "close": "Schließen",
      "testSpeechText": "Hallo! Dies ist eine automatische Audio-Diagnose. Wenn Sie diesen Text sehen, funktioniert das System perfekt.",
      "step1Title": "Schritt 1: Audioquelle auswählen",
      "step1Desc": "Woher der Ton des Gesprächspartners oder Ihre Stimme erfasst wird",
      "step2Title": "Schritt 2: Sprachtest oder sprechen",
      "step2Desc": "Klicken Sie auf Sprachausgabe oder sprechen Sie ins Mikrofon",
      "step3Title": "Schritt 3: Signal- & Transkriptionsprüfung",
      "step3Desc": "Die Audiowelle sollte sich bewegen und Text live erscheinen",
      "tabAudioAlert": "Im Chrome-Fenster unbedingt 'Tab-Audio teilen' ankreuzen",
      "voicePlaying": "Teststimme wird abgespielt...",
      "stopVoice": "Stimme stoppen",
      "langSelectLabel": "Oberflächen- und Sprachausgabe:",
      "checkSource": "Audioquelle verbunden",
      "checkVolume": "Audiosignal erkannt",
      "checkSTT": "Spracherkennung verifiziert",
      "transcriptionPlaceholder": "Live transkribierter Text erscheint hier in Echtzeit..."
    },
    "trial": {
      "badge": "Kostenlose Testversion · 15-Minuten-Limit",
      "title": "Testzeit abgelaufen",
      "desc": "Die Testphase ist auf 15 Minuten begrenzt, um die Kontingente zu schonen. Mit Pro Pass sind Interviewsitzungen zeitlich unbegrenzt.",
      "freeLabel": "Kostenloser Tarif:",
      "freeValue": "max. 15 Min. / Sitzung",
      "proLabel": "Pro Pass (15 $/Monat):",
      "proValue": "UNBEGRENZT",
      "benefit1": "Unterbrechungsfreie Interviews jeder Dauer (1–2+ Stunden)",
      "benefit2": "Priorisierte Gemini 2.5 Flash Pipeline mit niedriger Latenz",
      "benefit3": "Screen & Code OCR [F9] + Tablet-Teleprompter",
      "upgradeBtn": "Pro Pass sichern (15 $/Monat) →",
      "demoBtn": "Pro unbegrenzt testen (1-Click Demo)",
      "stayFree": "Bei Free bleiben"
    },
    "companion": {
      "badge": "Dual-Screen · Keine Fenster auf dem PC",
      "title": "Teleprompter für iPad oder Smartphone",
      "desc": "Platzieren Sie Ihr Tablet direkt unter der Webcam. Antworten werden in Echtzeit ohne sichtbare Fenster auf Ihrem Monitor gestreamt.",
      "generating": "QR-Code wird erstellt...",
      "sseSync": "Verschlüsselte SSE-Streamsynchronisierung",
      "copyLink": "Link kopieren",
      "copied": "Kopiert!",
      "popout": "Pop-Out-Fenster",
      "toastCopied": "Teleprompter-Link in die Zwischenablage kopiert!"
    },
    "scorecard": {
      "verifiedBadge": "Verified Senior Software Engineer",
      "candidateDefault": "Kandidat",
      "matrixTitle": "Kompetenz-Radarmatrix (5 Dimensionen):",
      "accuracy": "Genauigkeit",
      "architecture": "Architektur",
      "speed": "Geschwindigkeit",
      "communication": "Kommunikation",
      "stress": "Stressresistenz",
      "rounds": "Runden",
      "staffConclusion": "Staff Engineer Fazit:",
      "qrScanHint": "Mit dem Smartphone scannen oder zum Lebenslauf hinzufügen",
      "shareLinkedIn": "Auf LinkedIn teilen",
      "copiedLinkedIn": "Für LinkedIn kopiert!",
      "publicLink": "Öffentlicher Link",
      "copiedPublic": "Link kopiert!",
      "tweet": "Auf [X] teilen",
      "toastLinkedIn": "LinkedIn-Text in Zwischenablage kopiert!",
      "toastLink": "3D Scorecard Link kopiert!"
    },
    "profile": {
      "title": "Kandidatenprofil & CV-Kontext",
      "subtitle": "Die KI bindet Ihren echten Tech-Stack und Projekte nahtlos in Interviewantworten ein.",
      "ageLabel": "Alter (Jahre):",
      "yearsOld": "Jahre",
      "presetsLabel": "⚡ 1-Klick Rollenvorlagen:",
      "presetsSub": "Rolle und Stack automatisch ausfüllen",
      "roleLabel": "Zielposition:",
      "stackLabel": "Ihr Tech-Stack (Tags):",
      "addTech": "+ Technologie hinzufügen",
      "projectsTitle": "Ihre Projekte & Referenzen:",
      "addProject": "Projekt hinzufügen",
      "newProjName": "Neues Projekt",
      "newProjDesc": "Überblick über Stack und Zielsetzung",
      "newProjHighlight": "Wichtigstes technisches Highlight oder gelöster Bug",
      "bioLabel": "Zusätzlicher Kontext / Ihr Stil:",
      "bioPlaceholder": "Fügen Sie Auszüge Ihres Lebenslaufs oder Kernfakten ein...",
      "jobLabel": "Stellenbeschreibung (Job Description):",
      "jobPlaceholder": "Stellentext hier einfügen für optimale Anpassung...",
      "cvLabel": "Lebenslauftext (CV Context):",
      "cvPlaceholder": "CV-Text einfügen, damit KI echte Praxisbeispiele nutzt...",
      "reset": "Auf Standard zurücksetzen",
      "cancel": "Abbrechen",
      "save": "Profil speichern",
      "toastSaved": "Kandidatenprofil erfolgreich gespeichert!",
      "toastReset": "Auf Standardprofil zurückgesetzt"
    },
    "panicShield": {
      "exitHint": "Drücken Sie Esc oder klicken Sie irgendwo, um zum Teleprompter zurückzukehren",
      "escBadge": "Esc zum Beenden"
    },
    "footer": {
      "tagline": "KI-Teleprompter & Live-Performance-Coach",
      "desc": "KI-gestützter Echtzeit-Teleprompter & Live-Coach für technische Interviews und Daily Standups. Entwickelt, um Sprachbarrieren abzubauen und Nervosität zu lindern.",
      "ramBadge": "Audioverarbeitung ausschließlich im Arbeitsspeicher (RAM-only)",
      "ecoTitle": "Ökosystem",
      "featLink": "Funktionen & Features",
      "pricingLink": "Preise & Pro Pass",
      "guideLink": "Audio-Einrichtungsleitfaden",
      "mockLink": "KI-Sprachsimulator",
      "copilotLink": "Copilot Studio öffnen",
      "legalTitle": "Sicherheit & Recht",
      "termsLink": "Nutzungsbedingungen",
      "privacyLink": "Datenschutzrichtlinie",
      "settingsLink": "Kontoeinstellungen",
      "rights": "Alle Rechte vorbehalten."
    }
  },
  "fr": {
    "soundcheck": {
      "badge": "Acoustic Calibration Protocol",
      "title": "Calibrage audio de l'interviewer",
      "desc": "Ghostboard capture le flux audio de l'onglet de réunion (Google Meet, Zoom, YouTube) tout en mixant votre micro.",
      "listening": "Écoute du signal audio...",
      "waiting": "En attente d'activation de la capture",
      "sttLabel": "Reconnaissance vocale (Deepgram Nova-3) :",
      "speechSuccess": "Voix de l'interviewer reconnue parfaitement !",
      "audioDetected": "Signal audio détecté ! En attente de parole...",
      "btnTab": "ONGLET RÉUNION",
      "btnTabSub": "Meet / Zoom / YouTube",
      "btnMic": "MICROPHONE",
      "btnMicSub": "Microphone seul",
      "btnYt": "TEST YOUTUBE",
      "btnYtSub": "Ouvrir la vidéo",
      "btnStop": "ARRÊTER LE TEST AUDIO",
      "guideTitle": "Compatibilité multi-systèmes (Windows, macOS, Linux) :",
      "winDesc": "Sélectionnez l'onglet Chrome de votre appel ou l'audio système.",
      "macDesc": "Sélectionnez l'onglet Chrome avec Google Meet / Zoom.",
      "linuxDesc": "Sélectionnez l'onglet Chrome — audio capturé directement dans le navigateur.",
      "playLocal": "Écouter l'échantillon vocal",
      "ready": "Prêt pour l'entretien",
      "close": "Fermer",
      "testSpeechText": "Bonjour ! Ceci est un diagnostic audio automatique. Si vous voyez ce texte défiler, tout fonctionne parfaitement.",
      "step1Title": "Étape 1 : Choisir la source audio",
      "step1Desc": "D'où capturer le son du recruteur ou votre voix",
      "step2Title": "Étape 2 : Test vocal ou parler",
      "step2Desc": "Cliquez sur la voix de test ou parlez dans votre micro",
      "step3Title": "Étape 3 : Vérification du signal et du texte",
      "step3Desc": "L'onde sonore doit bouger et le texte s'afficher en direct",
      "tabAudioAlert": "Dans la fenêtre Chrome, cochez obligatoirement 'Partager l'audio de l'onglet'",
      "voicePlaying": "Lecture de la voix de test...",
      "stopVoice": "Arrêter la voix",
      "langSelectLabel": "Langue de l'interface et de la voix :",
      "checkSource": "Source audio connectée",
      "checkVolume": "Signal audio détecté",
      "checkSTT": "Reconnaissance vocale vérifiée",
      "transcriptionPlaceholder": "Le texte transcrit en direct apparaîtra ici en temps réel..."
    },
    "trial": {
      "badge": "Essai gratuit · Limite 15 minutes",
      "title": "Temps d'essai gratuit écoulé",
      "desc": "L'offre gratuite est limitée à 15 minutes pour préserver les quotas Gemini et Deepgram. Avec le Pro Pass, les sessions d'entretien sont illimitées.",
      "freeLabel": "Forfait Gratuit :",
      "freeValue": "max. 15 min / session",
      "proLabel": "Pass Pro (15 $/mois) :",
      "proValue": "ILLIMITÉ",
      "benefit1": "Entretiens ininterrompus de toute durée (1–2+ heures)",
      "benefit2": "Canal dédié prioritaire Gemini 2.5 Flash à faible latence",
      "benefit3": "Screen & Code OCR [F9] + prompteur tablette double écran",
      "upgradeBtn": "Obtenir le Pro Pass (15 $/mois) →",
      "demoBtn": "Tester Pro sans limite (Démo 1-Click)",
      "stayFree": "Rester sur Free"
    },
    "companion": {
      "badge": "Double écran · Zéro fenêtre sur PC",
      "title": "Téléprompteur pour iPad ou smartphone",
      "desc": "Placez votre tablette sous votre webcam. Les réponses s'affichent en direct sans aucune fenêtre ouverte sur votre écran principal.",
      "generating": "Génération du code QR...",
      "sseSync": "Flux chiffré synchronisé via canal SSE",
      "copyLink": "Copier le lien",
      "copied": "Copié !",
      "popout": "Fenêtre Pop-Out",
      "toastCopied": "Lien du téléprompteur copié dans le presse-papier !"
    },
    "scorecard": {
      "verifiedBadge": "Verified Senior Software Engineer",
      "candidateDefault": "Candidat",
      "matrixTitle": "Matrice radar des compétences (5 dimensions) :",
      "accuracy": "Précision",
      "architecture": "Architecture",
      "speed": "Rapidité",
      "communication": "Communication",
      "stress": "Résistance au stress",
      "rounds": "manches",
      "staffConclusion": "Conclusions du Staff Engineer :",
      "qrScanHint": "Scannez avec un mobile ou intégrez au CV",
      "shareLinkedIn": "Partager sur LinkedIn",
      "copiedLinkedIn": "Copié pour LinkedIn !",
      "publicLink": "Lien public",
      "copiedPublic": "Lien copié !",
      "tweet": "Tweeter [X]",
      "toastLinkedIn": "Texte LinkedIn copié dans le presse-papier !",
      "toastLink": "Lien 3D Scorecard copié !"
    },
    "profile": {
      "title": "Profil du candidat et contexte CV",
      "subtitle": "L'IA intègre naturellement vos vraies compétences et vos réalisations dans les réponses d'entretien.",
      "ageLabel": "Âge (ans) :",
      "yearsOld": "ans",
      "presetsLabel": "⚡ Préréglages de rôles en 1 clic :",
      "presetsSub": "Remplissage automatique du rôle et de la stack",
      "roleLabel": "Poste visé :",
      "stackLabel": "Votre stack technologique (tags) :",
      "addTech": "+ Ajouter une technologie",
      "projectsTitle": "Vos projets personnels & réalisations :",
      "addProject": "Ajouter un projet",
      "newProjName": "Nouveau projet",
      "newProjDesc": "Technologies et objectif du projet",
      "newProjHighlight": "Succès technique majeur ou bug complexe résolu",
      "bioLabel": "Contexte additionnel / Style personnel :",
      "bioPlaceholder": "Collez des extraits de CV ou vos points forts...",
      "jobLabel": "Fiche de poste (Job Description) :",
      "jobPlaceholder": "Collez l'offre d'emploi pour adapter les réponses...",
      "cvLabel": "Texte complet du CV :",
      "cvPlaceholder": "Collez votre CV pour que l'IA cite votre expérience réelle...",
      "reset": "Réinitialiser",
      "cancel": "Annuler",
      "save": "Enregistrer le profil",
      "toastSaved": "Profil candidat enregistré avec succès !",
      "toastReset": "Réinitialisé au profil par défaut"
    },
    "panicShield": {
      "exitHint": "Appuyez sur Échap ou cliquez n'importe où pour revenir au téléprompteur",
      "escBadge": "Échap pour quitter"
    },
    "footer": {
      "tagline": "Téléprompteur IA et coach de performance en direct",
      "desc": "Téléprompteur IA en temps réel et coach de performance pour entretiens et standups. Conçu pour surmonter la barrière de la langue, éliminer le stress et structurer vos réponses.",
      "ramBadge": "Traitement audio exclusivement en mémoire vive (RAM-only)",
      "ecoTitle": "Écosystème",
      "featLink": "Fonctionnalités",
      "pricingLink": "Tarifs & Pro Pass",
      "guideLink": "Guide de configuration audio",
      "mockLink": "Simulateur vocal d'entretien",
      "copilotLink": "Ouvrir Copilot Studio",
      "legalTitle": "Sécurité & Légal",
      "termsLink": "Conditions d'utilisation",
      "privacyLink": "Politique de confidentialité",
      "settingsLink": "Paramètres du compte",
      "rights": "Tous droits réservés."
    }
  },
  "es": {
    "soundcheck": {
      "badge": "Acoustic Calibration Protocol",
      "title": "Calibración del audio del entrevistador",
      "desc": "Ghostboard captura el audio de la pestaña de la reunión (Google Meet, Zoom, YouTube) mezclando tu micrófono simultáneamente.",
      "listening": "Escuchando señal de audio...",
      "waiting": "Esperando activación de la captura",
      "sttLabel": "Voz a texto (Deepgram Nova-3):",
      "speechSuccess": "¡Voz del entrevistador reconocida a la perfección!",
      "audioDetected": "¡Señal detectada! Esperando habla...",
      "btnTab": "PESTAÑA REUNIÓN",
      "btnTabSub": "Meet / Zoom / YouTube",
      "btnMic": "MICRÓFONO",
      "btnMicSub": "Solo micrófono",
      "btnYt": "TEST DE YOUTUBE",
      "btnYtSub": "Abrir vídeo de prueba",
      "btnStop": "DETENER TEST DE AUDIO",
      "guideTitle": "Compatibilidad con sistemas (Windows, macOS, Linux):",
      "winDesc": "Selecciona la pestaña de Chrome de la llamada o el audio del sistema.",
      "macDesc": "Selecciona la pestaña de Chrome con Google Meet / Zoom.",
      "linuxDesc": "Selecciona la pestaña de Chrome — el audio se captura directamente en el navegador.",
      "playLocal": "Reproducir muestra de voz local",
      "ready": "Listo para la entrevista",
      "close": "Cerrar",
      "testSpeechText": "¡Hola! Esta es una prueba automática de audio. Si ves este texto en pantalla, el sistema funciona de forma óptima.",
      "step1Title": "Paso 1: Seleccionar fuente de audio",
      "step1Desc": "De dónde capturar el audio del entrevistador o tu voz",
      "step2Title": "Paso 2: Prueba de voz o hablar",
      "step2Desc": "Haz clic en reproducir voz o habla por tu micrófono",
      "step3Title": "Paso 3: Verificación de señal y texto",
      "step3Desc": "La onda de audio debe moverse y el texto transcribirse en vivo",
      "tabAudioAlert": "En la ventana de Chrome, marca la casilla 'Compartir audio de la pestaña'",
      "voicePlaying": "Reproduciendo voz de prueba...",
      "stopVoice": "Detener voz",
      "langSelectLabel": "Idioma de la interfaz y la voz:",
      "checkSource": "Fuente de audio conectada",
      "checkVolume": "Señal de audio detectada",
      "checkSTT": "Reconocimiento de voz verificado",
      "transcriptionPlaceholder": "El texto transcrito en vivo aparecerá aquí en tiempo real..."
    },
    "trial": {
      "badge": "Prueba gratuita · Límite de 15 minutos",
      "title": "Tiempo de prueba agotado",
      "desc": "El plan gratuito está limitado a 15 minutos para proteger las cuotas de Gemini y Deepgram. Con el Pro Pass, las sesiones son ilimitadas.",
      "freeLabel": "Plan Gratuito:",
      "freeValue": "máx. 15 min / sesión",
      "proLabel": "Pase Pro ($15/mes):",
      "proValue": "ILIMITADO",
      "benefit1": "Entrevistas ininterrumpidas de cualquier duración (1–2+ horas)",
      "benefit2": "Canal dedicado de Gemini 2.5 Flash de mínima latencia",
      "benefit3": "Screen & Code OCR [F9] + teleprompter para tablet",
      "upgradeBtn": "Obtener Pro Pass ($15/mes) →",
      "demoBtn": "Probar Pro sin límites (Demo 1-Click)",
      "stayFree": "Permanecer en Free"
    },
    "companion": {
      "badge": "Doble pantalla · Sin ventanas en el PC",
      "title": "Teleprompter para iPad o smartphone",
      "desc": "Coloca tu tablet o teléfono cerca de tu cámara web. Las respuestas se transmiten en tiempo real sin ventanas abiertas en tu monitor.",
      "generating": "Generando código QR...",
      "sseSync": "Sincronización segura mediante canal SSE",
      "copyLink": "Copiar enlace",
      "copied": "¡Copiado!",
      "popout": "Ventana Pop-Out",
      "toastCopied": "¡Enlace del teleprompter copiado al portapapeles!"
    },
    "scorecard": {
      "verifiedBadge": "Verified Senior Software Engineer",
      "candidateDefault": "Candidato",
      "matrixTitle": "Matriz radar de competencias (5 dimensiones):",
      "accuracy": "Precisión",
      "architecture": "Arquitectura",
      "speed": "Velocidad",
      "communication": "Comunicación",
      "stress": "Resistencia al estrés",
      "rounds": "rondas",
      "staffConclusion": "Conclusiones del Staff Engineer:",
      "qrScanHint": "Escanea en el móvil o inclúyelo en tu CV",
      "shareLinkedIn": "Compartir en LinkedIn",
      "copiedLinkedIn": "¡Copiado para LinkedIn!",
      "publicLink": "Enlace público",
      "copiedPublic": "¡Enlace copiado!",
      "tweet": "Publicar en [X]",
      "toastLinkedIn": "¡Texto para LinkedIn copiado al portapapeles!",
      "toastLink": "¡Enlace a la tarjeta 3D copiado!"
    },
    "profile": {
      "title": "Contexto de CV y proyectos del candidato",
      "subtitle": "La IA incorpora tus herramientas y proyectos reales en las respuestas de la entrevista.",
      "ageLabel": "Edad (años):",
      "yearsOld": "años",
      "presetsLabel": "⚡ Roles preconfigurados (1 clic):",
      "presetsSub": "Rellena rol y tecnologías",
      "roleLabel": "Puesto objetivo:",
      "stackLabel": "Tu stack tecnológico (etiquetas):",
      "addTech": "+ Añadir tecnología",
      "projectsTitle": "Tus proyectos personales & experiencia:",
      "addProject": "Añadir proyecto",
      "newProjName": "Nuevo proyecto",
      "newProjDesc": "Resumen técnico y objetivos del proyecto",
      "newProjHighlight": "Logro técnico clave o error crítico solucionado",
      "bioLabel": "Contexto adicional / Tu estilo:",
      "bioPlaceholder": "Pega extractos de tu CV o información relevante...",
      "jobLabel": "Descripción del empleo (Job Description):",
      "jobPlaceholder": "Pega los requisitos de la vacante para adaptar las respuestas...",
      "cvLabel": "Texto del currículum (CV Context):",
      "cvPlaceholder": "Pega tu CV para que la IA proporcione ejemplos de tu experiencia...",
      "reset": "Restablecer por defecto",
      "cancel": "Cancelar",
      "save": "Guardar perfil",
      "toastSaved": "¡Perfil y contexto del CV guardados con éxito!",
      "toastReset": "Restablecido al perfil predeterminado"
    },
    "panicShield": {
      "exitHint": "Pulsa Esc o haz clic en cualquier lugar para volver al teleprompter",
      "escBadge": "Esc para salir"
    },
    "footer": {
      "tagline": "Teleprompter de IA y coach de rendimiento en vivo",
      "desc": "Teleprompter de IA en tiempo real y coach de rendimiento para entrevistas técnicas y standups diarios. Creado para superar la barrera del idioma y reducir la ansiedad.",
      "ramBadge": "Audio procesado exclusivamente en memoria RAM (RAM-only)",
      "ecoTitle": "Ecosistema",
      "featLink": "Capacidades de la plataforma",
      "pricingLink": "Precios y Pro Pass",
      "guideLink": "Guía de configuración de audio",
      "mockLink": "Simulador de entrevistas con IA",
      "copilotLink": "Abrir Copilot Studio",
      "legalTitle": "Seguridad y Legal",
      "termsLink": "Términos de servicio",
      "privacyLink": "Política de privacidad",
      "settingsLink": "Ajustes de la cuenta",
      "rights": "Todos los derechos reservados."
    }
  },
  "pt": {
    "soundcheck": {
      "badge": "Acoustic Calibration Protocol",
      "title": "Calibração do áudio do entrevistador",
      "desc": "O Ghostboard captura o áudio da aba da reunião (Google Meet, Zoom, YouTube) enquanto mixa seu microfone simultaneamente.",
      "listening": "Ouvindo sinal de áudio...",
      "waiting": "Aguardando ativação da captura",
      "sttLabel": "Voz para texto (Deepgram Nova-3):",
      "speechSuccess": "Voz do entrevistador reconhecida com precisão!",
      "audioDetected": "Sinal detectado! Aguardando fala...",
      "btnTab": "ABA DA REUNIÃO",
      "btnTabSub": "Meet / Zoom / YouTube",
      "btnMic": "MICROFONE",
      "btnMicSub": "Apenas microfone",
      "btnYt": "TESTE YOUTUBE",
      "btnYtSub": "Abrir vídeo de teste",
      "btnStop": "PARAR TESTE DE ÁUDIO",
      "guideTitle": "Compatibilidade com sistemas (Windows, macOS, Linux):",
      "winDesc": "Selecione a aba do Chrome da reunião ou áudio do sistema.",
      "macDesc": "Selecione a aba do Chrome com Google Meet / Zoom.",
      "linuxDesc": "Selecione a aba do Chrome — captura de áudio nativa no navegador.",
      "playLocal": "Tocar teste de voz local",
      "ready": "Tudo pronto para a entrevista",
      "close": "Fechar",
      "testSpeechText": "Olá! Este é um diagnóstico automático de áudio. Se você visualiza este texto, o sistema está operando perfeitamente.",
      "step1Title": "Passo 1: Selecionar fonte de áudio",
      "step1Desc": "De onde capturar o áudio do entrevistador ou sua voz",
      "step2Title": "Passo 2: Teste de voz ou falar",
      "step2Desc": "Clique em reproduzir voz ou fale no microfone",
      "step3Title": "Passo 3: Verificação de sinal e texto",
      "step3Desc": "A onda de áudio deve oscilar e o texto transcrever ao vivo",
      "tabAudioAlert": "Na janela do Chrome, marque 'Compartilhar áudio da guia'",
      "voicePlaying": "Reproduzindo voz de teste...",
      "stopVoice": "Parar voz",
      "langSelectLabel": "Idioma da interface e voz:",
      "checkSource": "Fonte de áudio conectada",
      "checkVolume": "Sinal de áudio detectado",
      "checkSTT": "Reconhecimento de fala verificado",
      "transcriptionPlaceholder": "O texto transcrito ao vivo aparecerá aqui em tempo real..."
    },
    "trial": {
      "badge": "Teste Grátis · Limite de 15 minutos",
      "title": "Tempo de teste gratuito esgotado",
      "desc": "O plano gratuito é limitado a 15 minutos para preservar as cotas do Gemini e Deepgram. Com o Pro Pass, as sessões de entrevista são ilimitadas.",
      "freeLabel": "Plano Gratuito:",
      "freeValue": "máx. 15 min / sessão",
      "proLabel": "Passe Pro ($15/mês):",
      "proValue": "ILIMITADO",
      "benefit1": "Entrevistas contínuas de qualquer duração (1–2+ horas)",
      "benefit2": "Canal dedicado e prioritário Gemini 2.5 Flash",
      "benefit3": "Screen & Code OCR [F9] + teleprompter para tablet",
      "upgradeBtn": "Adquirir Pro Pass ($15/mês) →",
      "demoBtn": "Testar Pro sem limites (Demo 1-Click)",
      "stayFree": "Continuar no Free"
    },
    "companion": {
      "badge": "Dual-Screen · Sem janelas no PC",
      "title": "Teleprompter no iPad ou celular",
      "desc": "Posicione seu tablet ou celular abaixo da webcam. As respostas são transmitidas em tempo real sem janelas abertas no monitor principal.",
      "generating": "Gerando QR Code...",
      "sseSync": "Sincronização em tempo real via canal seguro SSE",
      "copyLink": "Copiar link",
      "copied": "Copiado!",
      "popout": "Janela Pop-Out",
      "toastCopied": "Link do teleprompter copiado!"
    },
    "scorecard": {
      "verifiedBadge": "Verified Senior Software Engineer",
      "candidateDefault": "Candidato",
      "matrixTitle": "Matriz radar de competências (5 dimensões):",
      "accuracy": "Precisão",
      "architecture": "Arquitetura",
      "speed": "Velocidade",
      "communication": "Comunicação",
      "stress": "Resistência ao estresse",
      "rounds": "rodadas",
      "staffConclusion": "Avaliação do Staff Engineer:",
      "qrScanHint": "Escaneie no celular ou adicione ao currículo",
      "shareLinkedIn": "Compartilhar no LinkedIn",
      "copiedLinkedIn": "Copiado para o LinkedIn!",
      "publicLink": "Link público",
      "copiedPublic": "Link copiado!",
      "tweet": "Publicar no [X]",
      "toastLinkedIn": "Texto formatado para LinkedIn copiado!",
      "toastLink": "Link do Scorecard 3D copiado!"
    },
    "profile": {
      "title": "Contexto do CV e projetos do candidato",
      "subtitle": "A IA insere suas tecnologias reais e realizações nas respostas da entrevista de forma natural.",
      "ageLabel": "Idade (anos):",
      "yearsOld": "anos",
      "presetsLabel": "⚡ Predefinições de cargo (1 clique):",
      "presetsSub": "Preenche cargo e tecnologias",
      "roleLabel": "Cargo desejado:",
      "stackLabel": "Seu stack de tecnologias (tags):",
      "addTech": "+ Adicionar tecnologia",
      "projectsTitle": "Seus projetos pessoais & produção:",
      "addProject": "Adicionar projeto",
      "newProjName": "Novo projeto",
      "newProjDesc": "Resumo das tecnologias e objetivo do projeto",
      "newProjHighlight": "Destaque técnico principal ou desafio resolvido",
      "bioLabel": "Contexto adicional / Seu estilo:",
      "bioPlaceholder": "Cole trechos do seu currículo ou dados relevantes...",
      "jobLabel": "Descrição da vaga (Job Description):",
      "jobPlaceholder": "Cole os requisitos da vaga para direcionar as respostas...",
      "cvLabel": "Texto do currículo (CV Context):",
      "cvPlaceholder": "Cole seu currículo para que a IA utilize seus dados reais...",
      "reset": "Redefinir para o padrão",
      "cancel": "Cancelar",
      "save": "Salvar perfil",
      "toastSaved": "Perfil e contexto do CV salvos com sucesso!",
      "toastReset": "Redefinido para o perfil padrão"
    },
    "panicShield": {
      "exitHint": "Pressione Esc ou clique em qualquer lugar para retornar ao teleprompter",
      "escBadge": "Esc para sair"
    },
    "footer": {
      "tagline": "Teleprompter com IA e coach de desempenho ao vivo",
      "desc": "Teleprompter com IA em tempo real e coach de desempenho para entrevistas e reuniões diárias. Criado para superar barreiras linguísticas e eliminar a ansiedade.",
      "ramBadge": "Áudio processado exclusivamente em memória RAM (RAM-only)",
      "ecoTitle": "Ecossistema",
      "featLink": "Recursos da plataforma",
      "pricingLink": "Planos e Pro Pass",
      "guideLink": "Guia de configuração de áudio",
      "mockLink": "Simulador de entrevista por voz",
      "copilotLink": "Abrir Copilot Studio",
      "legalTitle": "Segurança e Legal",
      "termsLink": "Termos de uso",
      "privacyLink": "Política de privacidade",
      "settingsLink": "Configurações da conta",
      "rights": "Todos os direitos reservados."
    }
  },
  "it": {
    "soundcheck": {
      "badge": "Acoustic Calibration Protocol",
      "title": "Calibrazione audio dell'intervistatore",
      "desc": "Ghostboard acquisisce l'audio della scheda del meeting (Google Meet, Zoom, YouTube) mixando simultaneamente il tuo microfono.",
      "listening": "Ascolto del segnale audio...",
      "waiting": "In attesa dell'attivazione dell'acquisizione",
      "sttLabel": "Trascrizione vocale (Deepgram Nova-3):",
      "speechSuccess": "Voce dell'intervistatore riconosciuta con successo!",
      "audioDetected": "Segnale rilevato! In attesa della voce...",
      "btnTab": "SCHEDA MEETING",
      "btnTabSub": "Meet / Zoom / YouTube",
      "btnMic": "MICROFONO",
      "btnMicSub": "Solo microfono",
      "btnYt": "TEST YOUTUBE",
      "btnYtSub": "Apri video dimostrativo",
      "btnStop": "INTERROMPI TEST AUDIO",
      "guideTitle": "Compatibilità multi-sistema (Windows, macOS, Linux):",
      "winDesc": "Seleziona la scheda Chrome con la riunione o l'audio di sistema.",
      "macDesc": "Seleziona la scheda Chrome con Google Meet / Zoom.",
      "linuxDesc": "Seleziona la scheda Chrome — acquisizione nativa nel browser.",
      "playLocal": "Riproduci campione audio locale",
      "ready": "Pronto per l'intervista",
      "close": "Chiudi",
      "testSpeechText": "Ciao! Questo è un test audio automatico. Se visualizzi questo testo, il sistema funziona in modo ottimale.",
      "step1Title": "Passaggio 1: Seleziona sorgente audio",
      "step1Desc": "Da dove acquisire l'audio dell'intervistatore o la tua voce",
      "step2Title": "Passaggio 2: Test vocale o parla",
      "step2Desc": "Fai clic per riprodurre la voce o parla nel microfono",
      "step3Title": "Passaggio 3: Verifica segnale e testo",
      "step3Desc": "L'onda audio deve muoversi e il testo trascriversi in diretta",
      "tabAudioAlert": "Nella finestra di Chrome, seleziona 'Condividi l'audio della scheda'",
      "voicePlaying": "Riproduzione voce di test in corso...",
      "stopVoice": "Ferma voce",
      "langSelectLabel": "Lingua interfaccia e sintesi vocale:",
      "checkSource": "Sorgente audio connessa",
      "checkVolume": "Segnale audio rilevato",
      "checkSTT": "Riconoscimento vocale verificato",
      "transcriptionPlaceholder": "Il testo trascritto in tempo reale apparirà qui..."
    },
    "trial": {
      "badge": "Prova Gratuita · Limite di 15 minuti",
      "title": "Periodo di prova gratuito terminato",
      "desc": "Il piano gratuito è limitato a 15 minuti per preservare le quote di Gemini e Deepgram. Con il Pro Pass, le sessioni non hanno limiti di durata.",
      "freeLabel": "Piano Gratuito:",
      "freeValue": "max. 15 min / sessione",
      "proLabel": "Pass Pro ($15/mese):",
      "proValue": "ILLIMITATO",
      "benefit1": "Interviste ininterrotte di qualsiasi durata (1–2+ ore)",
      "benefit2": "Canale prioritario Gemini 2.5 Flash a bassissima latenza",
      "benefit3": "Screen & Code OCR [F9] + teleprompter per tablet",
      "upgradeBtn": "Ottieni il Pro Pass ($15/mese) →",
      "demoBtn": "Prova Pro senza limiti (Demo 1-Click)",
      "stayFree": "Resta su Free"
    },
    "companion": {
      "badge": "Doppio schermo · Nessuna finestra visibile su PC",
      "title": "Teleprompter per iPad o smartphone",
      "desc": "Posiziona il tablet sotto la webcam. I suggerimenti vengono trasmessi in tempo reale senza finestre aperte sul monitor principale.",
      "generating": "Generazione codice QR...",
      "sseSync": "Sincronizzazione in tempo reale tramite canale sicuro SSE",
      "copyLink": "Copia link",
      "copied": "Copiato!",
      "popout": "Finestra Pop-Out",
      "toastCopied": "Link del teleprompter copiato negli appunti!"
    },
    "scorecard": {
      "verifiedBadge": "Verified Senior Software Engineer",
      "candidateDefault": "Candidato",
      "matrixTitle": "Matrice radar delle competenze (5 dimensioni):",
      "accuracy": "Precisione",
      "architecture": "Architettura",
      "speed": "Velocità",
      "communication": "Comunicazione",
      "stress": "Resistenza allo stress",
      "rounds": "round",
      "staffConclusion": "Valutazione dello Staff Engineer:",
      "qrScanHint": "Scansiona da smartphone o allega al CV",
      "shareLinkedIn": "Condividi su LinkedIn",
      "copiedLinkedIn": "Copiato per LinkedIn!",
      "publicLink": "Link pubblico",
      "copiedPublic": "Link copiato!",
      "tweet": "Pubblica su [X]",
      "toastLinkedIn": "Testo formattato per LinkedIn copiato!",
      "toastLink": "Link della Scorecard 3D copiato!"
    },
    "profile": {
      "title": "Profilo candidato e contesto CV",
      "subtitle": "L'IA integra il tuo stack e i tuoi progetti reali nelle risposte durante il colloquio.",
      "ageLabel": "Età (anni):",
      "yearsOld": "anni",
      "presetsLabel": "⚡ Modelli di ruolo rapidi (1 clic):",
      "presetsSub": "Compila ruolo e competenze",
      "roleLabel": "Ruolo desiderato:",
      "stackLabel": "Il tuo stack tecnologico (tag):",
      "addTech": "+ Aggiungi tecnologia",
      "projectsTitle": "I tuoi progetti personali e realizzazioni:",
      "addProject": "Aggiungi progetto",
      "newProjName": "Nuovo progetto",
      "newProjDesc": "Panoramica dello stack e obiettivo del progetto",
      "newProjHighlight": "Punto chiave tecnico o problema critico risolto",
      "bioLabel": "Contesto addizionale / Stile personale:",
      "bioPlaceholder": "Incolla parti del tuo CV o tratti distintivi...",
      "jobLabel": "Descrizione della posizione (Job Description):",
      "jobPlaceholder": "Incolla l'annuncio per personalizzare le risposte...",
      "cvLabel": "Testo del curriculum (CV Context):",
      "cvPlaceholder": "Incolla il testo del tuo CV per consentire all'IA di citare la tua esperienza...",
      "reset": "Ripristina predefiniti",
      "cancel": "Annulla",
      "save": "Salva profilo",
      "toastSaved": "Profilo candidato salvato con successo!",
      "toastReset": "Ripristinato al profilo predefinito"
    },
    "panicShield": {
      "exitHint": "Premi Esc o fai clic ovunque per tornare al teleprompter",
      "escBadge": "Esc per uscire"
    },
    "footer": {
      "tagline": "Teleprompter AI e live performance coach",
      "desc": "Teleprompter AI in tempo reale e live performance coach per colloqui tecnici e standup quotidiani. Aiuta a superare le barriere linguistiche e ridurre l'ansia.",
      "ramBadge": "Elaborazione audio solo in memoria RAM (RAM-only)",
      "ecoTitle": "Ecosistema",
      "featLink": "Funzionalità della piattaforma",
      "pricingLink": "Prezzi e Pro Pass",
      "guideLink": "Guida configurazione audio OS",
      "mockLink": "Simulatore di colloqui vocale con IA",
      "copilotLink": "Apri Copilot Studio",
      "legalTitle": "Sicurezza e Normativa",
      "termsLink": "Termini di servizio",
      "privacyLink": "Informativa sulla privacy",
      "settingsLink": "Impostazioni account",
      "rights": "Tutti i diritti riservati."
    }
  },
  "cs": {
    "soundcheck": {
      "badge": "Acoustic Calibration Protocol",
      "title": "Kalibrace zvuku tazatele",
      "desc": "Ghostboard zachycuje zvuk ze záložky hovoru (Google Meet, Zoom, YouTube) a současně mixuje váš mikrofon.",
      "listening": "Poslech audio signálu...",
      "waiting": "Čekání na aktivaci snímání zvuku",
      "sttLabel": "Rozpoznávání řeči (Deepgram Nova-3):",
      "speechSuccess": "Hlas tazatele je bezchybně rozpoznáván!",
      "audioDetected": "Audio signál detekován! Čekání na řeč...",
      "btnTab": "ZÁLOŽKA SCHŮZKY",
      "btnTabSub": "Meet / Zoom / YouTube",
      "btnMic": "MIKROFON",
      "btnMicSub": "Pouze mikrofon",
      "btnYt": "YOUTUBE TEST",
      "btnYtSub": "Otevřít testovací video",
      "btnStop": "ZASTAVIT ZVUKOVÝ TEST",
      "guideTitle": "Kompatibilita s operačními systémy (Windows, macOS, Linux):",
      "winDesc": "Vyberte záložku Chrome s hovorem nebo systémový zvuk.",
      "macDesc": "Vyberte záložku Chrome s Google Meet / Zoom.",
      "linuxDesc": "Vyberte záložku Chrome — zvuk se zachycuje přímo v prohlížeči.",
      "playLocal": "Přehrát lokální hlasový vzorek",
      "ready": "Vše připraveno na pohovor",
      "close": "Zavřít",
      "testSpeechText": "Ahoj! Toto je automatický test zvuku. Pokud vidíte tento text, systém funguje perfektně.",
      "step1Title": "Krok 1: Vyberte zdroj zvuku",
      "step1Desc": "Odkud snímat zvuk tazatele nebo váš hlas",
      "step2Title": "Krok 2: Hlasový test nebo mluvení",
      "step2Desc": "Klikněte na přehrání hlasu nebo mluvte do mikrofonu",
      "step3Title": "Krok 3: Kontrola signálu a textu",
      "step3Desc": "Zvuková vlna by se měla pohybovat a text přepisovat živě",
      "tabAudioAlert": "V okně Chrome zaškrtněte 'Sdílet zvuk karty'",
      "voicePlaying": "Přehrávání testovacího hlasu...",
      "stopVoice": "Zastavit hlas",
      "langSelectLabel": "Jazyk rozhraní a hlasu:",
      "checkSource": "Zdroj zvuku připojen",
      "checkVolume": "Zvukový signál detekován",
      "checkSTT": "Rozpoznávání řeči ověřeno",
      "transcriptionPlaceholder": "Zde se v reálném čase zobrazí přepsaný text..."
    },
    "trial": {
      "badge": "Free Trial · Limit 15 minut",
      "title": "Čas bezplatného testu vypršel",
      "desc": "Bezplatný tarif je omezen na 15 minut z důvodu kvót Gemini a Deepgram. V tarifu Pro Pass je délka relací neomezená.",
      "freeLabel": "Bezplatný tarif:",
      "freeValue": "max. 15 min / relace",
      "proLabel": "Tarif Pro ($15/měsíc):",
      "proValue": "NEOMEZENĚ",
      "benefit1": "Nepřetržitý pohovor libovolné délky (1–2+ hodiny)",
      "benefit2": "Prioritní dedikovaný kanál Gemini 2.5 Flash",
      "benefit3": "Screen & Code OCR [F9] + teleprompter na tablet",
      "upgradeBtn": "Získat Pro Pass ($15/měsíc) →",
      "demoBtn": "Vyzkoušet Pro bez limitu (Demo 1-Click)",
      "stayFree": "Zůstat na Free"
    },
    "companion": {
      "badge": "Dual-Screen · Bez oken na PC",
      "title": "Teleprompter pro iPad nebo telefon",
      "desc": "Umístěte tablet pod webkameru. Odpovědi se přenášejí v reálném čase bez nutnosti otevírat okna na monitoru počítače.",
      "generating": "Generování QR kódu...",
      "sseSync": "Šifrovaná synchronizace přes kanál SSE",
      "copyLink": "Kopírovat odkaz",
      "copied": "Zkopírováno!",
      "popout": "Okno Pop-Out",
      "toastCopied": "Odkaz na teleprompter zkopírován do schránky!"
    },
    "scorecard": {
      "verifiedBadge": "Verified Senior Software Engineer",
      "candidateDefault": "Kandidát",
      "matrixTitle": "Radarová matice dovedností (5 dimenzí):",
      "accuracy": "Přesnost",
      "architecture": "Architektura",
      "speed": "Rychlost",
      "communication": "Komunikace",
      "stress": "Odolnost vůči stresu",
      "rounds": "kol",
      "staffConclusion": "Závěry Staff Engineera:",
      "qrScanHint": "Naskenujte v mobilu nebo přiložte k životopisu",
      "shareLinkedIn": "Sdílet na LinkedIn",
      "copiedLinkedIn": "Zkopírováno pro LinkedIn!",
      "publicLink": "Veřejný odkaz",
      "copiedPublic": "Odkaz zkopírován!",
      "tweet": "Sdílet na [X]",
      "toastLinkedIn": "Text pro LinkedIn zkopírován do schránky!",
      "toastLink": "Odkaz na 3D Scorecard zkopírován!"
    },
    "profile": {
      "title": "Kontext životopisu a projektů kandidáta",
      "subtitle": "AI přirozeně zakomponuje vaše skutečné technologie a projekty do odpovědí při pohovoru.",
      "ageLabel": "Věk (roky):",
      "yearsOld": "let",
      "presetsLabel": "⚡ Rychlé šablony pozic (1 klik):",
      "presetsSub": "Předvyplní pozici a stack",
      "roleLabel": "Cílová pozice:",
      "stackLabel": "Váš technologický stack (tagy):",
      "addTech": "+ Přidat technologii",
      "projectsTitle": "Vaše vlastní projekty a zkušenosti:",
      "addProject": "Přidat projekt",
      "newProjName": "Nový projekt",
      "newProjDesc": "Přehled technologií a cíl projektu",
      "newProjHighlight": "Klíčový technický úspěch nebo vyřešený složitý bug",
      "bioLabel": "Dodatečný kontext / Váš styl:",
      "bioPlaceholder": "Vložte úryvky životopisu nebo klíčové body...",
      "jobLabel": "Požadavky pozice (Job Description):",
      "jobPlaceholder": "Vložte popis pozice pro přizpůsobení odpovědí...",
      "cvLabel": "Text životopisu (CV Context):",
      "cvPlaceholder": "Vložte CV, aby AI mohla čerpat z vašich reálných zkušeností...",
      "reset": "Obnovit výchozí",
      "cancel": "Zrušit",
      "save": "Uložit profil",
      "toastSaved": "Profil kandidáta byl úspěšně uložen!",
      "toastReset": "Obnoven výchozí profil"
    },
    "panicShield": {
      "exitHint": "Stiskněte Esc nebo klikněte kamkoli pro návrat k teleprompteru",
      "escBadge": "Esc pro návrat"
    },
    "footer": {
      "tagline": "AI teleprompter a osobní kouč technických pohovorů",
      "desc": "AI teleprompter v reálném čase a osobní kouč pro technické pohovory a denní standupy. Pomáhá překonat jazykovou bariéru, zvládnout nervozitu a strukturovat odpovědi.",
      "ramBadge": "Zpracování zvuku výhradně v operační paměti (RAM-only)",
      "ecoTitle": "Ekosystém",
      "featLink": "Funkce platformy",
      "pricingLink": "Ceník a Pro Pass",
      "guideLink": "Průvodce nastavením zvuku OS",
      "mockLink": "Hlasový trenažér pohovoru s AI",
      "copilotLink": "Otevřít Copilot Studio",
      "legalTitle": "Bezpečnost a právo",
      "termsLink": "Podmínky použití",
      "privacyLink": "Zásady ochrany osobních údajů",
      "settingsLink": "Nastavení účtu",
      "rights": "Všechna práva vyhrazena."
    }
  },
  "nl": {
    "soundcheck": {
      "badge": "Acoustic Calibration Protocol",
      "title": "Audiokalibratie van de interviewer",
      "desc": "Ghostboard registreert de audio van het vergadertabblad (Google Meet, Zoom, YouTube) en mixt tegelijkertijd je microfoon.",
      "listening": "Luisteren naar audiosignaal...",
      "waiting": "Wachten op activering van audio-opname",
      "sttLabel": "Spraak-naar-tekst (Deepgram Nova-3):",
      "speechSuccess": "Stem van de interviewer perfect herkend!",
      "audioDetected": "Audiosignaal gedetecteerd! Wachten op spraak...",
      "btnTab": "VERGADERTABBLAD",
      "btnTabSub": "Meet / Zoom / YouTube",
      "btnMic": "MICROFOON",
      "btnMicSub": "Alleen microfoon",
      "btnYt": "YOUTUBE-TEST",
      "btnYtSub": "Testvideo openen",
      "btnStop": "STOP AUDIOTEST",
      "guideTitle": "Compatibiliteit met besturingssystemen (Windows, macOS, Linux):",
      "winDesc": "Selecteer het Chrome-tabblad van je gesprek of systeemgeluid.",
      "macDesc": "Selecteer het Chrome-tabblad met Google Meet / Zoom.",
      "linuxDesc": "Selecteer Chrome-tabblad — audio wordt rechtstreeks in de browser vastgelegd.",
      "playLocal": "Lokale spraaktest afspelen",
      "ready": "Klaar voor het interview",
      "close": "Sluiten",
      "testSpeechText": "Hallo! Dit is een automatische audiodiagnose. Als je deze tekst ziet, werkt het systeem optimaal.",
      "step1Title": "Stap 1: Selecteer audiobron",
      "step1Desc": "Waar het geluid van de interviewer of uw stem vandaan komt",
      "step2Title": "Stap 2: Stemtest of spreken",
      "step2Desc": "Klik op teststem afspelen of spreek in de microfoon",
      "step3Title": "Stap 3: Signaal- en transcriptieverificatie",
      "step3Desc": "De audiogolf moet bewegen en tekst live worden getranscribeerd",
      "tabAudioAlert": "Vink in het Chrome-venster 'Tabbladaudio delen' aan",
      "voicePlaying": "Teststem wordt afgespeeld...",
      "stopVoice": "Stem stoppen",
      "langSelectLabel": "Interface- en stemtaal:",
      "checkSource": "Audiobron verbonden",
      "checkVolume": "Audiosignaal gedetecteerd",
      "checkSTT": "Spraakherkenning geverifieerd",
      "transcriptionPlaceholder": "Live getranscribeerde tekst verschijnt hier in real-time..."
    },
    "trial": {
      "badge": "Gratis proefperiode · Limiet van 15 minuten",
      "title": "Gratis proeftijd verstreken",
      "desc": "Het gratis abonnement is beperkt tot 15 minuten om de quota te beschermen. Met Pro Pass zijn de interviewsessies onbeperkt.",
      "freeLabel": "Gratis abonnement:",
      "freeValue": "max. 15 min / sessie",
      "proLabel": "Pro Pass ($15/maand):",
      "proValue": "ONBEPERKT",
      "benefit1": "Ononderbroken interviews van elke duur (1–2+ uur)",
      "benefit2": "Prioritaire dedicated Gemini 2.5 Flash pipeline",
      "benefit3": "Screen & Code OCR [F9] + teleprompter voor tablet",
      "upgradeBtn": "Pro Pass aanvragen ($15/maand) →",
      "demoBtn": "Pro onbeperkt testen (1-Click Demo)",
      "stayFree": "Op Free blijven"
    },
    "companion": {
      "badge": "Dual-Screen · Geen vensters op de pc",
      "title": "Teleprompter voor iPad of smartphone",
      "desc": "Plaats je tablet of smartphone onder de webcam. Antwoorden worden direct gestreamd zonder open vensters op je computerscherm.",
      "generating": "QR-code genereren...",
      "sseSync": "Beveiligde synchronisatie via SSE-kanaal",
      "copyLink": "Link kopiëren",
      "copied": "Gekopieerd!",
      "popout": "Pop-out venster",
      "toastCopied": "Teleprompterlink naar klembord gekopieerd!"
    },
    "scorecard": {
      "verifiedBadge": "Verified Senior Software Engineer",
      "candidateDefault": "Kandidaat",
      "matrixTitle": "Vaardigheden radarmatrix (5 dimensies):",
      "accuracy": "Nauwkeurigheid",
      "architecture": "Architectuur",
      "speed": "Snelheid",
      "communication": "Communicatie",
      "stress": "Stressbestendigheid",
      "rounds": "rondes",
      "staffConclusion": "Staff Engineer Conclusies:",
      "qrScanHint": "Scan met mobiel of voeg toe aan cv",
      "shareLinkedIn": "Delen op LinkedIn",
      "copiedLinkedIn": "Gekopieerd voor LinkedIn!",
      "publicLink": "Openbare link",
      "copiedPublic": "Link gekopieerd!",
      "tweet": "Plaatsen op [X]",
      "toastLinkedIn": "Tekst voor LinkedIn naar klembord gekopieerd!",
      "toastLink": "3D Scorecard link gekopieerd!"
    },
    "profile": {
      "title": "Kandidatenprofiel en cv-context",
      "subtitle": "De AI verwerkt je echte technologieën en projecten natuurlijk in je interviewantwoorden.",
      "ageLabel": "Leeftijd (jaren):",
      "yearsOld": "jaar",
      "presetsLabel": "⚡ 1-klik rolprofielen:",
      "presetsSub": "Vult automatisch rol en stack in",
      "roleLabel": "Doelfunctie:",
      "stackLabel": "Jouw tech-stack (tags):",
      "addTech": "+ Technologie toevoegen",
      "projectsTitle": "Jouw projecten en praktijkervaring:",
      "addProject": "Project toevoegen",
      "newProjName": "Nieuw project",
      "newProjDesc": "Overzicht van technologieën en doelen",
      "newProjHighlight": "Belangrijkste technische mijlpaal of opgeloste bug",
      "bioLabel": "Extra context / Jouw stijl:",
      "bioPlaceholder": "Plak delen van je cv of relevante details...",
      "jobLabel": "Functieomschrijving (Job Description):",
      "jobPlaceholder": "Plak de vacaturetekst om de antwoorden af te stemmen...",
      "cvLabel": "Tekst van het cv (CV Context):",
      "cvPlaceholder": "Plak je cv zodat de AI put uit je werkelijke ervaring...",
      "reset": "Standaardwaarden herstellen",
      "cancel": "Annuleren",
      "save": "Profiel opslaan",
      "toastSaved": "Kandidatenprofiel succesvol opgeslagen!",
      "toastReset": "Hersteld naar standaardprofiel"
    },
    "panicShield": {
      "exitHint": "Druk op Esc of klik ergens om terug te keren naar de teleprompter",
      "escBadge": "Esc om te verlaten"
    },
    "footer": {
      "tagline": "AI-teleprompter en live performance coach",
      "desc": "Realtime AI-teleprompter en live performance coach voor technische interviews en daily standups. Ontworpen om taalbarrières weg te nemen en spreekangst te verminderen.",
      "ramBadge": "Audioverwerking uitsluitend in RAM-geheugen (RAM-only)",
      "ecoTitle": "Ecosysteem",
      "featLink": "Platformmogelijkheden",
      "pricingLink": "Prijzen & Pro Pass",
      "guideLink": "Handleiding audio-instellingen OS",
      "mockLink": "AI-gesprekstrainer met spraak",
      "copilotLink": "Copilot Studio openen",
      "legalTitle": "Beveiliging & Juridisch",
      "termsLink": "Gebruiksvoorwaarden",
      "privacyLink": "Privacybeleid",
      "settingsLink": "Accountinstellingen",
      "rights": "Alle rechten voorbehouden."
    }
  }
};

export function getModalsTranslations(locale: SupportedLocale): ModalsTranslations {
  return MODALS_I18N[locale] || MODALS_I18N.en;
}
