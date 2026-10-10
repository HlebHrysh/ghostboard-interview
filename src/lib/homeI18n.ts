import type { SupportedLocale } from './geoLang';

export interface HomeTranslations {
  badge: string;
  title: string;
  titleAccent: string;
  subtitle: string;
  ctaLaunch: string;
  ctaDownload: string;
  ctaSoundcheck: string;
  stealthLens: {
    badge: string;
    title: string;
    desc: string;
    tabInterviewer: string;
    tabCandidate: string;
    interviewerNotice: string;
    candidateNotice: string;
    sampleQuestion: string;
    sampleHook: string;
    sampleAnswer: string;
    samplePoints: string[];
    sampleCrib: string;
  };
  tickerDemo: {
    badge: string;
    title: string;
    desc: string;
    livePill: string;
    modeBadge: string;
    btnTry1: string;
    btnTry2: string;
    btnTry3: string;
    item1Q: string;
    item1A: string;
    item2Q: string;
    item2A: string;
    item3Q: string;
    item3A: string;
  };
  workflow: {
    badge: string;
    title: string;
    subtitle: string;
    step1Tag: string;
    step1Title: string;
    step1Desc: string;
    step2Tag: string;
    step2Title: string;
    step2Desc: string;
    step3Tag: string;
    step3Title: string;
    step3Desc: string;
  };
  devices: {
    badge: string;
    title: string;
    subtitle: string;
    desktopTitle: string;
    desktopDesc: string;
    desktopBadge: string;
    mobileTitle: string;
    mobileDesc: string;
    mobileBadge: string;
    webTitle: string;
    webDesc: string;
    webBadge: string;
  };
  faq: {
    badge: string;
    title: string;
    q1: string;
    a1: string;
    q2: string;
    a2: string;
    q3: string;
    a3: string;
  };
  ctaSection: {
    title: string;
    subtitle: string;
    button: string;
    guarantee: string;
  };
}

export const HOME_I18N: Record<SupportedLocale, HomeTranslations> = {
  ua: {
    badge: "GHOSTBOARD · SUB-1.2S AI TELEPROMPTER",
    title: "Невидимий телесуфлер для",
    titleAccent: "технічних співбесід.",
    subtitle: "Розпізнавання мови 16kHz у реальному часі та структуровані Senior-відповіді просто перед вашими очима. Апаратно виключений із демонстрації екрана Zoom, Google Meet та Microsoft Teams.",
    ctaLaunch: "Запустити Копілот →",
    ctaDownload: "Завантажити Desktop HUD",
    ctaSoundcheck: "Перевірка звуку (Soundcheck)",
    stealthLens: {
      badge: "● АПАРАТНЕ ВИКЛЮЧЕННЯ З ВІДЕОБУФЕРА",
      title: "Що бачить інтерв'юер vs Що бачите ви",
      desc: "Завдяки SetWindowDisplayAffinity (Windows) та NSWindowSharingNone (macOS), вікно Ghostboard фізично відсутнє у відеопотоці шарингу екрана. Шаріть екран у Zoom, Teams чи Meet без найменшого сліду.",
      tabInterviewer: "Потік Zoom (Інтерв'юер)",
      tabCandidate: "Ваш монітор (Ghostboard HUD)",
      interviewerNotice: "✓ Демонстрація екрана 100% чиста: тільки ваш IDE або термінал. Жодних оверлеїв.",
      candidateNotice: "⚡ Стелс-суфлер активний: точні тези, перший гачок та переклад просто біля камери.",
      sampleQuestion: "Як масштабувати WebSocket-з'єднання між кількома серверами без втрати сесій?",
      sampleHook: "Для горизонтального масштабування stateful WebSocket ми відділяємо TCP-сокет від стану через Redis Pub/Sub кластер та NLB зі sticky sessions...",
      sampleAnswer: "Клієнти підключаються через NLB з підтримкою sticky sessions (IP hash), а повідомлення між нодами маршрутизуються через Redis pub/sub або Apache Kafka.",
      samplePoints: [
        "L4 Network Load Balancer (AWS NLB) з TLS termination та TCP keep-alive",
        "Redis Pub/Sub або Kafka кластер для міжсерверного броадкасту",
        "Heartbeat ping-pong кожні 30с для закриття зомбі-сесій"
      ],
      sampleCrib: "Суть: Stateless app nodes + Redis Pub/Sub backbone. Не зберігати стан у пам'яті одного процесу."
    },
    tickerDemo: {
      badge: "● АРХІТЕКТУРА 34PX · 100% ПРИРОДНИЙ ЗОРОВИЙ КОНТАКТ",
      title: "Біжуча стрічка 34px та Симулятор природного погляду",
      desc: "Тонка смужка висотою 34px прямо під об'єктивом веб-камери. Дивіться прямо в об'єктив, читаючи готові відповіді без жодного блукання погляду.",
      livePill: "● LIVE",
      modeBadge: "STEALTH TICKER",
      btnTry1: "PostgreSQL MVCC & Bloat",
      btnTry2: "Distributed Locks (Redlock)",
      btnTry3: "Kafka Partitions & Rebalance",
      item1Q: "Q: Як PostgreSQL бореться з table bloat при високих UPDATE?",
      item1A: "Hook: «При UPDATE рядок копіюється як dead tuple» • Autovacuum tuning (scale_factor=0.05) + pg_repack без блокувань читання.",
      item2Q: "Q: Чому звичайний Redis SETNX небезпечний для розподіленого локу?",
      item2A: "Hook: «Без TTL є ризик дедлоку, а без унікального UUID — зняття чужого локу» • Redlock алгоритм або Redisson з автоподовженням.",
      item3Q: "Q: Як запобігти Stop-the-World rebalance у Apache Kafka?",
      item3A: "Hook: «Eager rebalance скидає всі партиції глобально» • CooperativeStickyAssignor + тюнінг max.poll.interval.ms.",
    },
    workflow: {
      badge: "АРХІТЕКТУРА 3 КРОКІВ",
      title: "Від звуку інтерв'юера до бездоганної відповіді",
      subtitle: "Низькорівнева синхронізація без затримок та пауз у розмові",
      step1Tag: "01 / LISTEN",
      step1Title: "16kHz PCM захоплення звуку",
      step1Desc: "Deepgram Nova-3 аналізує потік мови співрозмовника за 350мс. 116+ фонетичних IT-правил виправляють професійний сленг.",
      step2Tag: "02 / FORMULATE",
      step2Title: "Dual-LLM Gemini 2.5 Flash",
      step2Desc: "Генерація структурованої відповіді за 1.2с: сильний перший гачок, ключова архітектура, крайові випадки та шпаргалка рідною мовою.",
      step3Tag: "03 / STEALTH PROMPT",
      step3Title: "Невидима доставка перед очима",
      step3Desc: "Біжучий тикер або повноцінний HUD під камерою. Нуль тремтіння погляду, нуль шансів бути поміченим на записі.",
    },
    devices: {
      badge: "СИНХРОНІЗАЦІЯ ПРИСТРОЇВ",
      title: "Працює там, де зручно вам",
      subtitle: "Один акаунт — синхронні відповіді на ноутбуці, телефоні та в браузері",
      desktopTitle: "Ghostboard Desktop (HUD & Ticker)",
      desktopDesc: "Повноцінний клієнт для Windows, macOS та Linux. Апаратний захист від захоплення екрана, глобальні гарячі клавіші та клік-наскрізь.",
      desktopBadge: "WDA_EXCLUDEFROMCAPTURE",
      mobileTitle: "Mobile Eyeline Companion",
      mobileDesc: "Телефон на підставці прямо під веб-камерою. AMOLED True-Black режим з фокусом погляду прямо в очі інтерв'юеру.",
      mobileBadge: "AMOLED ZERO-GLARE",
      webTitle: "Web Workspace & Playground",
      webDesc: "Швидкий запуск без інсталяції, тренажер інтерв'ю, аналіз резюме та детальна статистика пройдених сесій.",
      webBadge: "ZERO INSTALLATION",
    },
    faq: {
      badge: "FAQ",
      title: "Часті запитання",
      q1: "Чи справді додаток не видно на демонстрації екрана?",
      a1: "Так. У додатку Ghostboard Desktop для Windows та macOS задіяна нативна ОС-функція setContentProtection (Win32 WDA_EXCLUDEFROMCAPTURE та macOS NSWindowSharingNone). Відеозахоплення Zoom, Meet, Teams та Discord бачить лише робочий стіл за суфлером.",
      q2: "Чи потрібно мені оплачувати власні API-ключі OpenAI або Gemini?",
      a2: "Ні. Всі нейромережі (Gemini 2.5 Flash, Deepgram Nova-3) включені у вартість підписки і вже налаштовані на наших захищених серверах.",
      q3: "Що робити, якщо інтерв'ю ведеться англійською, а я хвилююся?",
      a3: "Ghostboard показує подвійний потік: англійську технічну формулювання для виголошення вголос та переклад-шпаргалку вашою рідною мовою для впевненого розуміння суті.",
    },
    ctaSection: {
      title: "Отримайте свій наступний оффер без стресу",
      subtitle: "Спробуйте безкоштовний 15-хвилинний ознайомлювальний режим прямо зараз.",
      button: "Розпочати безкоштовно →",
      guarantee: "Не вимагає кредитної картки для тестової сесії",
    }
  },

  en: {
    badge: "GHOSTBOARD · SUB-1.2S AI TELEPROMPTER",
    title: "The stealth teleprompter for",
    titleAccent: "technical interviews.",
    subtitle: "Real-time 16kHz speech transcription and structured Senior engineering answers right in your eyeline. Hardware-excluded from Zoom, Google Meet, and Microsoft Teams screen share.",
    ctaLaunch: "Launch Copilot →",
    ctaDownload: "Download Desktop HUD",
    ctaSoundcheck: "Audio Soundcheck",
    stealthLens: {
      badge: "● HARDWARE-LEVEL BUFFER EXCLUSION",
      title: "What the Interviewer Sees vs What You See",
      desc: "Powered by SetWindowDisplayAffinity (Windows) and NSWindowSharingNone (macOS), the Ghostboard HUD is physically excluded from screen capture buffers. Share your screen in Zoom, Teams, or Meet with zero trace.",
      tabInterviewer: "Screen Share in Zoom (Interviewer)",
      tabCandidate: "Your Monitor (Ghostboard HUD)",
      interviewerNotice: "✓ Screen share is 100% clean: only your IDE or terminal is captured. Zero third-party windows.",
      candidateNotice: "⚡ Stealth teleprompter active: key bullets, first-sentence hook, and native crib-sheet right next to your webcam.",
      sampleQuestion: "How do you scale WebSocket connections across multiple server instances without dropping state?",
      sampleHook: "To scale stateful WebSockets horizontally, we decouple client connection sockets from state storage using an event-driven Redis Pub/Sub cluster with NLB sticky sessions...",
      sampleAnswer: "Clients connect through an NLB with sticky sessions (IP hash), while cross-node message routing is handled by a distributed message broker like Redis Pub/Sub or Kafka.",
      samplePoints: [
        "L4 Network Load Balancer (AWS NLB) with TLS termination & TCP keep-alive",
        "Redis Pub/Sub or Kafka partitioned broker for cross-node inter-process broadcasts",
        "Heartbeat ping-pong every 30s to prune zombie connection pools"
      ],
      sampleCrib: "Core: Edge NLB + Redis Pub/Sub backbone. Never store state in local process memory."
    },
    tickerDemo: {
      badge: "● 34PX EYELINE ARCHITECTURE · 100% NATURAL EYE CONTACT",
      title: "The 34px Eyeline Ribbon & Direct Eye Contact Simulator",
      desc: "A razor-thin 34px ribbon docked right under your physical webcam lens. Look straight into the camera while reading answers with 100% natural conversational eye contact.",
      livePill: "● LIVE",
      modeBadge: "STEALTH TICKER",
      btnTry1: "PostgreSQL MVCC & Bloat",
      btnTry2: "Distributed Locks (Redlock)",
      btnTry3: "Kafka Partitions & Rebalance",
      item1Q: "Q: How does PostgreSQL handle table bloat during heavy UPDATE bursts?",
      item1A: "Hook: «UPDATE always creates a new dead tuple version» • Autovacuum scale_factor tuning (0.05) + lock-free pg_repack in production.",
      item2Q: "Q: Why is naive Redis SETNX flawed for distributed locking?",
      item2A: "Hook: «Missing TTL risks permanent deadlock, missing UUID risks releasing another process's lock» • Use Redlock algorithm or Redisson watchdog.",
      item3Q: "Q: How do you prevent Stop-the-World consumer rebalance in Apache Kafka?",
      item3A: "Hook: «Eager rebalancing drops all partitions globally» • Upgrade to CooperativeStickyAssignor and tune max.poll.interval.ms.",
    },
    workflow: {
      badge: "3-STEP ARCHITECTURE",
      title: "From Interviewer Speech to Flawless Delivery",
      subtitle: "Low-latency pipeline designed for natural conversational tempo",
      step1Tag: "01 / LISTEN",
      step1Title: "16kHz PCM Real-Time Audio Capture",
      step1Desc: "Deepgram Nova-3 parses interviewer speech in 350ms. 116+ phonetic IT rules normalize jargon and misheard acronyms.",
      step2Tag: "02 / FORMULATE",
      step2Title: "Dual-LLM Gemini 2.5 Flash Pipeline",
      step2Desc: "Generates structured Senior answers in 1.2s: strong conversation hook, architectural pillars, Big-O analysis, and native translation crib-sheet.",
      step3Tag: "03 / STEALTH PROMPT",
      step3Title: "Invisible Eyeline Delivery",
      step3Desc: "Razor-thin running ticker or full HUD docked right under the camera. Zero eye darting, zero footprint on call recordings.",
    },
    devices: {
      badge: "MULTI-DEVICE SYNC",
      title: "Wherever You Need Your Advantage",
      subtitle: "One unified account — live answers mirrored across desktop app, phone companion, and web browser",
      desktopTitle: "Ghostboard Desktop (HUD & Ticker)",
      desktopDesc: "Native client for Windows, macOS, and Linux. Hardware screen-capture exclusion, global keyboard shortcuts, and click-through mode.",
      desktopBadge: "WDA_EXCLUDEFROMCAPTURE",
      mobileTitle: "Mobile Eyeline Companion",
      mobileDesc: "Prop your smartphone directly below your webcam. AMOLED True-Black mode aligns your eyeline right into the interviewer's eyes.",
      mobileBadge: "AMOLED ZERO-GLARE",
      webTitle: "Web Workspace & Arena",
      webDesc: "Instant browser copilot, interactive coding arena, resume context injector, and detailed interview scorecard history.",
      webBadge: "ZERO INSTALLATION",
    },
    faq: {
      badge: "FAQ",
      title: "Frequently Asked Questions",
      q1: "Is the app truly invisible when sharing my screen?",
      a1: "Yes. Ghostboard Desktop utilizes native OS-level content protection APIs (Win32 WDA_EXCLUDEFROMCAPTURE on Windows, NSWindowSharingNone on macOS). Screen share buffers in Zoom, Meet, Teams, and Discord capture only the wallpaper and windows behind the HUD.",
      q2: "Do I need to supply my own OpenAI or Gemini API keys?",
      a2: "No. All Gemini 2.5 Flash and Deepgram Nova-3 inference costs are bundled directly into your account and run through our low-latency backend.",
      q3: "What if the interview is conducted in English and I feel anxious?",
      a3: "Ghostboard provides a bilingual dual-stream: precise English technical phrasing to speak out loud, alongside a concise native language crib-sheet so you immediately grasp the core concept.",
    },
    ctaSection: {
      title: "Ace your next technical interview with confidence",
      subtitle: "Start your free 15-minute trial session in seconds. Zero configuration needed.",
      button: "Start Free Trial →",
      guarantee: "No credit card required for trial session",
    }
  },

  pl: {
    badge: "GHOSTBOARD · SUB-1.2S AI TELEPROMPTER",
    title: "Niewidoczny teleprompter na",
    titleAccent: "rozmowy techniczne.",
    subtitle: "Rozpoznawanie mowy 16kHz w czasie rzeczywistym i strukturyzowane odpowiedzi Seniora tuż przed Twoimi oczami. Sprzętowo wykluczony z udostępniania ekranu Zoom, Meet i Teams.",
    ctaLaunch: "Uruchom Copilot →",
    ctaDownload: "Pobierz Desktop HUD",
    ctaSoundcheck: "Test dźwięku (Soundcheck)",
    stealthLens: {
      badge: "AUTORSKI KONCEPT NIEWIDZIALNEGO TUSZU",
      title: "Co widzi rekruter vs Co widzisz Ty",
      desc: "Dzięki SetWindowDisplayAffinity (Windows) i NSWindowSharingNone (macOS), okno jest fizycznie wykluczone z nagrywania ekranu.",
      tabInterviewer: "Ekran w Zoom (Rekruter)",
      tabCandidate: "Twój monitor (Ghostboard)",
      interviewerNotice: "✓ Czysty ekran: tylko Twoje IDE lub terminal. Brak obcych okien.",
      candidateNotice: "⚡ Aktywny sufler: kluczowe tezy, złożoność Big-O i tłumaczenie tuż pod kamerą.",
      sampleQuestion: "Jak skalować połączenia WebSocket między wieloma serwerami bez utraty stanu?",
      sampleHook: "W celu skalowania WebSocketów stan sesji przenosimy do Redis Pub/Sub lub klastra RabbitMQ...",
      sampleAnswer: "Klienci łączą się przez NLB z obsługą sticky sessions, a wymiana wiadomości między węzłami odbywa się przez Redis Pub/Sub.",
      samplePoints: [
        "Redis Pub/Sub do broadcastu między instancjami",
        "Nginx / AWS ALB z nagłówkami Upgrade",
        "Heartbeat ping-pong co 30s"
      ],
      sampleCrib: "Klucz: NLB + Redis Pub/Sub. Nigdy nie przechowuj stanu w pamięci jednego procesu."
    },
    tickerDemo: {
      badge: "ULTRA-DYSKRETNY PASEK TEKSTU",
      title: "Interaktywny pasek czasu rzeczywistego",
      desc: "Pasek o wysokości zaledwie 34px tuż pod obiektywem kamery. Płynny tekst gwarantuje naturalny kontakt wzrokowy.",
      livePill: "● LIVE",
      modeBadge: "STEALTH TICKER",
      btnTry1: "PostgreSQL MVCC & Bloat",
      btnTry2: "LRU Cache O(1)",
      btnTry3: "Distributed Locks",
      item1Q: "Q: Jak PostgreSQL radzi sobie z table bloat przy częstych operacjach UPDATE?",
      item1A: "Hook: «UPDATE tworzy wersję dead tuple» • Autovacuum scale_factor=0.05 + pg_repack bez blokad odczytu.",
      item2Q: "Q: Zaimplementuj LRU Cache o złożoności O(1) dla get i put.",
      item2A: "Hook: «Połączenie HashMap + Doubly Linked List» • Tablica haszująca daje O(1) wyszukiwanie, lista dwukierunkowa O(1) przesuwanie elementów.",
      item3Q: "Q: Dlaczego proste SETNX w Redis jest ryzykowne w blokadach rozproszonych?",
      item3A: "Hook: «Brak TTL grozi deadlockiem, brak UUID zwolnieniem cudzej blokady» • Zastosuj algorytm Redlock.",
    },
    workflow: {
      badge: "ARCHITEKTURA 3 KROKÓW",
      title: "Od głosu rekrutera do bezbłędnej odpowiedzi",
      subtitle: "Ultra-szybki pipeline stworzony do naturalnej rozmowy",
      step1Tag: "01 / LISTEN",
      step1Title: "Przechwytywanie audio 16kHz PCM",
      step1Desc: "Deepgram Nova-3 analizuje mowę w 350ms. 116+ reguł IT eliminuje przejęzyczenia.",
      step2Tag: "02 / FORMULATE",
      step2Title: "Dual-LLM Gemini 2.5 Flash",
      step2Desc: "Generuje odpowiedź Seniora w 1.2s: mocny wstęp, punkty architektoniczne i ściągawkę w języku ojczystym.",
      step3Tag: "03 / STEALTH PROMPT",
      step3Title: "Niewidoczna prezentacja przed oczami",
      step3Desc: "Biegający pasek lub HUD pod kamerą. Brak uciekania wzrokiem, zero śladu na nagraniu.",
    },
    devices: {
      badge: "SYNCHRONIZACJA URZĄDZEŃ",
      title: "Działa tam, gdzie potrzebujesz",
      subtitle: "Jedno konto — odpowiedzi na laptopie, smartfonie i w przeglądarce",
      desktopTitle: "Ghostboard Desktop (HUD & Ticker)",
      desktopDesc: "Aplikacja dla Windows, macOS i Linux. Sprzętowa ochrona przed nagrywaniem ekranu i skróty globalne.",
      desktopBadge: "WDA_EXCLUDEFROMCAPTURE",
      mobileTitle: "Mobile Eyeline Companion",
      mobileDesc: "Smartfon tuż pod kamerą. Tryb AMOLED True-Black kieruje Twój wzrok prosto w oczy rozmówcy.",
      mobileBadge: "AMOLED ZERO-GLARE",
      webTitle: "Web Workspace",
      webDesc: "Dostęp przez przeglądarkę bez instalacji, symulator rozmów i statystyki.",
      webBadge: "ZERO INSTALLATION",
    },
    faq: {
      badge: "FAQ",
      title: "Często zadawane pytania",
      q1: "Czy aplikacja jest naprawdę niewidoczna podczas udostępniania ekranu?",
      a1: "Tak. Wersja Desktop korzysta z natywnych funkcji systemowych ochrony zawartości ekranu (WDA_EXCLUDEFROMCAPTURE / NSWindowSharingNone). Zoom, Teams i Meet jej nie widzą.",
      q2: "Czy muszę posiadać własne klucze API?",
      a2: "Nie. Wszystkie modele AI są wliczone w pakiet i uruchamiane na naszej infrastrukturze.",
      q3: "Co jeśli rozmowa jest po angielsku, a ja czuję stres?",
      a3: "Ghostboard wyświetla podwójny strumień: precyzyjne angielskie sformułowania oraz zwięzłą ściągawkę po polsku.",
    },
    ctaSection: {
      title: "Zdobądź swój kolejny techniczny offer bez stresu",
      subtitle: "Wypróbuj 15-minutową darmową sesję testową już teraz.",
      button: "Rozpocznij za darmo →",
      guarantee: "Karta płatnicza nie jest wymagana do testu",
    }
  },

  de: {
    badge: "GHOSTBOARD · SUB-1.2S KI-TELEPROMPTER",
    title: "Der unsichtbare Teleprompter für",
    titleAccent: "technische Interviews.",
    subtitle: "Echtzeit-16kHz-Spracherkennung und strukturierte Senior-Antworten direkt in Ihrer Blickachse. Hardwareseitig von der Bildschirmfreigabe in Zoom, Google Meet und Teams ausgeschlossen.",
    ctaLaunch: "Copilot starten →",
    ctaDownload: "Desktop HUD herunterladen",
    ctaSoundcheck: "Audio-Soundcheck",
    stealthLens: {
      badge: "AUTORENKONZEPT UNSICHTBARE TINTE",
      title: "Was der Interviewer sieht vs Was Sie sehen",
      desc: "Dank SetWindowDisplayAffinity (Windows) und NSWindowSharingNone (macOS) wird das Fenster physisch aus der Bildschirmübertragung ausgeschlossen.",
      tabInterviewer: "Bildschirm in Zoom (Interviewer)",
      tabCandidate: "Ihr Bildschirm (Ghostboard)",
      interviewerNotice: "✓ Saubere Bildschirmfreigabe: Nur Ihre IDE oder Ihr Terminal ist sichtbar.",
      candidateNotice: "⚡ Unsichtbarer Prompter aktiv: Kernpunkte, Big-O-Komplexität und Spickzettel direkt unter der Webcam.",
      sampleQuestion: "Wie skaliert man WebSocket-Verbindungen über mehrere Server ohne Statusverlust?",
      sampleHook: "Um zustandsbehaftete WebSockets zu skalieren, entkoppeln wir den Verbindungsstatus über Redis Pub/Sub...",
      sampleAnswer: "Clients verbinden sich über einen NLB mit Sticky Sessions. Nachrichten zwischen Serverknoten werden über Redis Pub/Sub oder Kafka verteilt.",
      samplePoints: [
        "Redis Pub/Sub für schlanken Broadcast zwischen Instanzen",
        "Nginx / AWS ALB mit HTTP/1.1 Upgrade",
        "Heartbeat Ping-Pong alle 30s"
      ],
      sampleCrib: "Kernaussage: NLB + Redis Pub/Sub. Niemals Zustand im lokalen Speicher eines Prozesses halten."
    },
    tickerDemo: {
      badge: "ULTRA-UNSICHTBARE TICKER-LEISTE",
      title: "Interaktiver Echtzeit-Lauftext",
      desc: "Eine nur 34px dünne Leiste direkt unter der Webcam. Der Text fließt flüssig für natürlichen Blickkontakt.",
      livePill: "● LIVE",
      modeBadge: "STEALTH TICKER",
      btnTry1: "PostgreSQL MVCC & Bloat",
      btnTry2: "LRU Cache O(1)",
      btnTry3: "Distributed Locks",
      item1Q: "Q: Wie verhindert PostgreSQL Table Bloat bei vielen UPDATEs?",
      item1A: "Hook: «UPDATE erzeugt Dead Tuples» • Autovacuum scale_factor=0.05 + pg_repack ohne Lesesperren.",
      item2Q: "Q: Implementieren Sie einen LRU Cache mit O(1) für Get und Put.",
      item2A: "Hook: «Kombination aus HashMap und Doubly Linked List» • Hash-Tabelle liefert O(1) Suche, Liste liefert O(1) Verschiebung.",
      item3Q: "Q: Warum ist einfaches Redis SETNX für verteilte Locks riskant?",
      item3A: "Hook: «Ohne TTL droht Deadlock, ohne UUID wird fremder Lock gelöst» • Redlock-Algorithmus nutzen.",
    },
    workflow: {
      badge: "3-STUFIGE ARCHITEKTUR",
      title: "Vom gesprochenen Wort zur souveränen Antwort",
      subtitle: "Extrem latenzarmer Ablauf für ein natürliches Gesprächstempo",
      step1Tag: "01 / LISTEN",
      step1Title: "16kHz PCM Audio-Erfassung",
      step1Desc: "Deepgram Nova-3 verarbeitet Sprache in 350ms. 116+ IT-Phonetikregeln korrigieren Fachjargon.",
      step2Tag: "02 / FORMULATE",
      step2Title: "Dual-LLM Gemini 2.5 Flash Pipeline",
      step2Desc: "Generiert strukturierte Senior-Antworten in 1,2s mit starkem Hook, Architekturdetails und deutscher Zusammenfassung.",
      step3Tag: "03 / STEALTH PROMPT",
      step3Title: "Unsichtbare Blickachsen-Präsentation",
      step3Desc: "Laufleiste oder HUD direkt unter der Linse. Kein Abschweifen des Blicks, unbemerkt in Videoaufnahmen.",
    },
    devices: {
      badge: "GERÄTESYNCHRONISATION",
      title: "Auf jedem Ihrer Geräte einsatzbereit",
      subtitle: "Ein Account — synchrone Antworten auf Laptop, Smartphone und im Browser",
      desktopTitle: "Ghostboard Desktop (HUD & Ticker)",
      desktopDesc: "Native App für Windows, macOS und Linux. Hardware-Schutz vor Capture, globale Shortcuts und Click-Through.",
      desktopBadge: "WDA_EXCLUDEFROMCAPTURE",
      mobileTitle: "Mobile Eyeline Companion",
      mobileDesc: "Smartphone direkt unter der Webcam. AMOLED True-Black Modus für direkten Blickkontakt.",
      mobileBadge: "AMOLED ZERO-GLARE",
      webTitle: "Web Workspace",
      webDesc: "Sofortstart ohne Installation im Browser mit Scorecard-Historie.",
      webBadge: "ZERO INSTALLATION",
    },
    faq: {
      badge: "FAQ",
      title: "Häufig gestellte Fragen",
      q1: "Ist die App bei Bildschirmfreigaben wirklich unsichtbar?",
      a1: "Ja. Ghostboard Desktop nutzt hardwarenahe OS-APIs (WDA_EXCLUDEFROMCAPTURE unter Windows, NSWindowSharingNone unter macOS). Zoom, Teams und Meet erfassen das Fenster nicht.",
      q2: "Muss ich eigene OpenAI- oder Gemini-Keys mitbringen?",
      a2: "Nein. Alle Modelle sind im Abo enthalten und über unsere Hochleistungsserver angebunden.",
      q3: "Was ist, wenn das Interview auf Englisch geführt wird?",
      a3: "Ghostboard liefert einen dualen Stream: englische Formulierungen zum Sprechen und deutsche Stichpunkte zum schnellen Begreifen.",
    },
    ctaSection: {
      title: "Sichern Sie sich Ihr nächstes Angebot ohne Stress",
      subtitle: "Starten Sie jetzt Ihren kostenlosen 15-Minuten-Testlauf.",
      button: "Kostenlos starten →",
      guarantee: "Keine Kreditkarte für Testsession nötig",
    }
  },

  fr: {
    badge: "GHOSTBOARD · TÉLÉPROMPTEUR IA SUB-1.2S",
    title: "Le téléprompteur invisible pour",
    titleAccent: "vos entretiens techniques.",
    subtitle: "Transcription vocale 16kHz en direct et réponses de niveau Senior sous vos yeux. Matériellement exclu du partage d'écran Zoom, Google Meet et Microsoft Teams.",
    ctaLaunch: "Lancer le Copilote →",
    ctaDownload: "Télécharger le Desktop HUD",
    ctaSoundcheck: "Test audio (Soundcheck)",
    stealthLens: {
      badge: "CONCEPT SIGNATURE ENCRE INVISIBLE",
      title: "Ce que voit le recruteur vs Ce que vous voyez",
      desc: "Grâce à SetWindowDisplayAffinity (Windows) et NSWindowSharingNone (macOS), la fenêtre est physiquement exclue du flux vidéo partagé.",
      tabInterviewer: "Écran dans Zoom (Recruteur)",
      tabCandidate: "Votre écran (Ghostboard)",
      interviewerNotice: "✓ Partage d'écran immaculé : seul votre IDE ou terminal apparaît.",
      candidateNotice: "⚡ Téléprompteur furtif actif : points clés, complexité Big-O et aide en français sous la caméra.",
      sampleQuestion: "Comment faire évoluer les connexions WebSocket sur plusieurs serveurs sans perdre l'état ?",
      sampleHook: "Pour scaler des WebSockets avec état, nous découplons la session via Redis Pub/Sub...",
      sampleAnswer: "Les clients se connectent via un NLB avec sticky sessions, tandis que les messages entre instances transitent par Redis Pub/Sub.",
      samplePoints: [
        "Redis Pub/Sub pour le broadcast inter-nœuds",
        "Proxy inverse AWS ALB / Nginx avec en-têtes Upgrade",
        "Heartbeat ping-pong toutes les 30s"
      ],
      sampleCrib: "Essentiel : NLB + bus Redis Pub/Sub. Ne jamais stocker l'état dans la mémoire locale d'un processus."
    },
    tickerDemo: {
      badge: "BANDEAU DÉFILANT ULTRA-INVISIBLE",
      title: "Bandeau interactif en temps réel",
      desc: "Un ruban de 34px sous l'objectif de votre webcam. Le texte défile avec fluidité pour maintenir un regard naturel.",
      livePill: "● LIVE",
      modeBadge: "STEALTH TICKER",
      btnTry1: "PostgreSQL MVCC & Bloat",
      btnTry2: "LRU Cache O(1)",
      btnTry3: "Distributed Locks",
      item1Q: "Q: Comment PostgreSQL gère-t-il le table bloat lors de mises à jour fréquentes ?",
      item1A: "Hook: «UPDATE crée un tuple mort (dead tuple)» • Réglage autovacuum scale_factor=0.05 + pg_repack sans verrouillage en lecture.",
      item2Q: "Q: Comment implémenter un cache LRU en O(1) pour get et put ?",
      item2A: "Hook: «Association HashMap + Doubly Linked List» • La table de hachage offre O(1) en recherche, la liste chaînée O(1) en réordonnancement.",
      item3Q: "Q: Pourquoi un simple SETNX sur Redis est-il insuffisant pour un verrou distribué ?",
      item3A: "Hook: «Sans TTL risque d'interblocage, sans UUID risque de libérer le verrou d'un tiers» • Utiliser l'algorithme Redlock.",
    },
    workflow: {
      badge: "ARCHITECTURE EN 3 ÉTAPES",
      title: "De la voix du recruteur à la réponse parfaite",
      subtitle: "Pipeline ultra-rapide conçu pour converser avec naturel",
      step1Tag: "01 / LISTEN",
      step1Title: "Capture audio 16kHz PCM en temps réel",
      step1Desc: "Deepgram Nova-3 analyse la parole en 350ms. 116+ règles phonétiques IT corrigent le jargon.",
      step2Tag: "02 / FORMULATE",
      step2Title: "Pipeline Dual-LLM Gemini 2.5 Flash",
      step2Desc: "Génère une réponse Senior en 1,2s : phrase d'accroche, piliers d'architecture et résumé en français.",
      step3Tag: "03 / STEALTH PROMPT",
      step3Title: "Affichage furtif dans l'axe du regard",
      step3Desc: "Bandeau défilant ou HUD sous l'objectif. Aucun mouvement suspect des yeux, invisible sur les enregistrements.",
    },
    devices: {
      badge: "SYNCHRONISATION MULTI-APPAREILS",
      title: "Disponible sur tous vos terminaux",
      subtitle: "Un seul compte — réponses dupliquées sur ordinateur, smartphone et navigateur",
      desktopTitle: "Ghostboard Desktop (HUD & Ticker)",
      desktopDesc: "Client pour Windows, macOS et Linux. Protection matérielle contre la capture, raccourcis globaux.",
      desktopBadge: "WDA_EXCLUDEFROMCAPTURE",
      mobileTitle: "Mobile Eyeline Companion",
      mobileDesc: "Smartphone posé sous la caméra. Mode AMOLED True-Black pour aligner votre regard droit dans les yeux du recruteur.",
      mobileBadge: "AMOLED ZERO-GLARE",
      webTitle: "Web Workspace",
      webDesc: "Accès instantané sans installation avec historique des sessions.",
      webBadge: "ZERO INSTALLATION",
    },
    faq: {
      badge: "FAQ",
      title: "Questions fréquentes",
      q1: "L'application est-elle réellement invisible en partage d'écran ?",
      a1: "Oui. Ghostboard Desktop exploite les API de protection natives de l'OS (WDA_EXCLUDEFROMCAPTURE sur Windows, NSWindowSharingNone sur macOS). Zoom, Teams et Meet ne la voient pas.",
      q2: "Dois-je renseigner mes propres clés OpenAI ou Gemini ?",
      a2: "Non. Tous les modèles d'IA sont inclus dans l'abonnement et hébergés sur notre infrastructure.",
      q3: "Que faire si l'entretien se déroule en anglais ?",
      a3: "Ghostboard fournit un double flux : la formulation technique en anglais à lire à voix haute et un résumé en français pour comprendre instantanément l'enjeu.",
    },
    ctaSection: {
      title: "Décrochez votre prochaine offre sans stress",
      subtitle: "Démarrez votre session d'essai gratuite de 15 minutes dès maintenant.",
      button: "Essai gratuit immédiat →",
      guarantee: "Aucune carte bancaire requise pour le test",
    }
  },

  es: {
    badge: "GHOSTBOARD · TELEPROMPTER IA SUB-1.2S",
    title: "El teleprompter invisible para",
    titleAccent: "entrevistas técnicas.",
    subtitle: "Transcripción de voz 16kHz en tiempo real y respuestas Senior estructuradas justo delante de tus ojos. Excluido a nivel de hardware al compartir pantalla en Zoom, Google Meet y Teams.",
    ctaLaunch: "Iniciar Copiloto →",
    ctaDownload: "Descargar Desktop HUD",
    ctaSoundcheck: "Prueba de sonido (Soundcheck)",
    stealthLens: {
      badge: "CONCEPTO AUTORAL TINTA INVISIBLE",
      title: "Lo que ve el entrevistador vs Lo que ves tú",
      desc: "Gracias a SetWindowDisplayAffinity (Windows) y NSWindowSharingNone (macOS), la ventana queda excluida del búfer de captura de pantalla.",
      tabInterviewer: "Pantalla en Zoom (Entrevistador)",
      tabCandidate: "Tu pantalla (Ghostboard)",
      interviewerNotice: "✓ Compartición limpia: solo se captura tu IDE o terminal.",
      candidateNotice: "⚡ Teleprompter activo: ideas clave, complejidad Big-O y chuleta en español bajo la cámara.",
      sampleQuestion: "¿Cómo escalar conexiones WebSocket entre varios servidores sin perder el estado?",
      sampleHook: "Para escalar WebSockets con estado desacoplamos la sesión mediante Redis Pub/Sub...",
      sampleAnswer: "Los clientes conectan mediante un NLB con sticky sessions, y los mensajes entre nodos se distribuyen mediante Redis Pub/Sub o Kafka.",
      samplePoints: [
        "Redis Pub/Sub para broadcast entre nodos",
        "Proxy inverso Nginx / AWS ALB con cabeceras Upgrade",
        "Heartbeat ping-pong cada 30s"
      ],
      sampleCrib: "Pilar: NLB + bus Redis Pub/Sub. No almacenar estado en memoria local."
    },
    tickerDemo: {
      badge: "CINTA DE TEXTO ULTRA-INVISIBLE",
      title: "Ticker interactivo en tiempo real",
      desc: "Una barra de 34px justo bajo la lente de la cámara web. El texto fluye con suavidad para un contacto visual natural.",
      livePill: "● LIVE",
      modeBadge: "STEALTH TICKER",
      btnTry1: "PostgreSQL MVCC & Bloat",
      btnTry2: "LRU Cache O(1)",
      btnTry3: "Distributed Locks",
      item1Q: "Q: ¿Cómo gestiona PostgreSQL el table bloat en entornos con muchos UPDATE?",
      item1A: "Hook: «UPDATE crea una versión dead tuple» • Ajuste autovacuum scale_factor=0.05 + pg_repack sin bloqueos de lectura.",
      item2Q: "Q: Implementa una LRU Cache con complejidad O(1) para get y put.",
      item2A: "Hook: «Combinación HashMap + Doubly Linked List» • La tabla hash da O(1) en búsqueda y la lista doble O(1) en recolocación.",
      item3Q: "Q: ¿Por qué un simple SETNX en Redis es arriesgado para un cerrojo distribuido?",
      item3A: "Hook: «Sin TTL hay riesgo de deadlock, sin UUID se puede liberar el lock de otro» • Usar algoritmo Redlock.",
    },
    workflow: {
      badge: "ARQUITECTURA EN 3 PASOS",
      title: "De la voz del entrevistador a la respuesta brillante",
      subtitle: "Flujo de baja latencia diseñado para una conversación fluida",
      step1Tag: "01 / LISTEN",
      step1Title: "Captura de audio 16kHz PCM",
      step1Desc: "Deepgram Nova-3 procesa la voz en 350ms. 116+ reglas fonéticas corrigen tecnicismos.",
      step2Tag: "02 / FORMULATE",
      step2Title: "Dual-LLM Gemini 2.5 Flash",
      step2Desc: "Genera respuestas Senior en 1,2s con gancho inicial, arquitectura y chuleta en español.",
      step3Tag: "03 / STEALTH PROMPT",
      step3Title: "Entrega invisible en tu línea de visión",
      step3Desc: "Cinta de texto o HUD bajo la cámara. Sin desviar la mirada y sin huella en las grabaciones.",
    },
    devices: {
      badge: "SINCRONIZACIÓN MULTIDISPOSITIVO",
      title: "Disponible donde tú elijas",
      subtitle: "Una sola cuenta — respuestas reflejadas en ordenador, móvil y navegador",
      desktopTitle: "Ghostboard Desktop (HUD & Ticker)",
      desktopDesc: "Cliente nativo para Windows, macOS y Linux. Protección de pantalla por hardware y atajos globales.",
      desktopBadge: "WDA_EXCLUDEFROMCAPTURE",
      mobileTitle: "Mobile Eyeline Companion",
      mobileDesc: "Smartphone bajo la cámara web. Modo AMOLED True-Black para mirar fijamente a los ojos del entrevistador.",
      mobileBadge: "AMOLED ZERO-GLARE",
      webTitle: "Web Workspace",
      webDesc: "Sin instalación en navegador, arena técnica y registro de sesiones.",
      webBadge: "ZERO INSTALLATION",
    },
    faq: {
      badge: "FAQ",
      title: "Preguntas frecuentes",
      q1: "¿Es la app realmente invisible al compartir pantalla?",
      a1: "Sí. Ghostboard Desktop usa APIs nativas de protección (WDA_EXCLUDEFROMCAPTURE en Windows, NSWindowSharingNone en macOS). Zoom, Teams y Meet no capturan la ventana.",
      q2: "¿Debo configurar mis propias claves de OpenAI o Gemini?",
      a2: "No. Todos los modelos están incluidos en la suscripción y operan desde nuestra infraestructura.",
      q3: "¿Qué pasa si la entrevista es en inglés?",
      a3: "Ghostboard muestra un flujo doble: la respuesta técnica en inglés para pronunciarla y un resumen en español para entenderla al instante.",
    },
    ctaSection: {
      title: "Consigue tu próxima oferta técnica con total seguridad",
      subtitle: "Inicia tu prueba gratuita de 15 minutos ahora mismo.",
      button: "Comenzar gratis →",
      guarantee: "No se requiere tarjeta de crédito para la prueba",
    }
  },

  pt: {
    badge: "GHOSTBOARD · TELEPROMPTER IA SUB-1.2S",
    title: "O teleprompter invisível para",
    titleAccent: "entrevistas técnicas.",
    subtitle: "Reconhecimento de voz 16kHz em tempo real e respostas Senior estruturadas direto na sua linha de visão. Protegido por hardware contra captura de tela no Zoom, Meet e Teams.",
    ctaLaunch: "Iniciar Copiloto →",
    ctaDownload: "Baixar Desktop HUD",
    ctaSoundcheck: "Teste de áudio (Soundcheck)",
    stealthLens: {
      badge: "CONCEITO AUTORAL TINTA INVISÍVEL",
      title: "O que o entrevistador vê vs O que você vê",
      desc: "Com SetWindowDisplayAffinity (Windows) e NSWindowSharingNone (macOS), a janela é fisicamente excluída da gravação.",
      tabInterviewer: "Tela no Zoom (Entrevistador)",
      tabCandidate: "Seu Monitor (Ghostboard)",
      interviewerNotice: "✓ Compartilhamento limpo: apenas sua IDE ou terminal é transmitido.",
      candidateNotice: "⚡ Teleprompter invisível ativo: pontos-chave, complexidade Big-O e cola em português sob a webcam.",
      sampleQuestion: "Como escalar conexões WebSocket entre múltiplos servidores sem perder o estado?",
      sampleHook: "Para escalar WebSockets com estado desacoplamos a sessão via Redis Pub/Sub...",
      sampleAnswer: "Clientes conectam via NLB com sticky sessions, e mensagens entre nós são roteadas por Redis Pub/Sub ou Kafka.",
      samplePoints: [
        "Redis Pub/Sub para broadcast entre nós",
        "Proxy reverso Nginx / AWS ALB com headers Upgrade",
        "Heartbeat ping-pong a cada 30s"
      ],
      sampleCrib: "Ponto-chave: NLB + Redis Pub/Sub. Nunca armazene estado na memória do processo local."
    },
    tickerDemo: {
      badge: "FAIXA DE TEXTO ULTRA-INVISÍVEL",
      title: "Ticker interativo em tempo real",
      desc: "Faixa de 34px posicionada logo abaixo da lente da câmera. Texto contínuo que mantém seu olhar firme e natural.",
      livePill: "● LIVE",
      modeBadge: "STEALTH TICKER",
      btnTry1: "PostgreSQL MVCC & Bloat",
      btnTry2: "LRU Cache O(1)",
      btnTry3: "Distributed Locks",
      item1Q: "Q: Como o PostgreSQL lida com table bloat em cenários de muitos UPDATEs?",
      item1A: "Hook: «UPDATE cria uma versão dead tuple» • Autovacuum scale_factor=0.05 + pg_repack sem bloqueio de leitura.",
      item2Q: "Q: Implemente uma LRU Cache com O(1) para get e put.",
      item2A: "Hook: «Combinação HashMap + Doubly Linked List» • Tabela hash para busca O(1) e lista encadeada para movimentação O(1).",
      item3Q: "Q: Por que o SETNX simples no Redis é arriscado para lock distribuído?",
      item3A: "Hook: «Sem TTL há risco de deadlock, sem UUID libera lock alheio» • Usar algoritmo Redlock.",
    },
    workflow: {
      badge: "ARQUITETURA EM 3 PASSOS",
      title: "Da voz do entrevistador à resposta impecável",
      subtitle: "Pipeline de baixíssima latência para conversas naturais",
      step1Tag: "01 / LISTEN",
      step1Title: "Captura de áudio 16kHz PCM",
      step1Desc: "Deepgram Nova-3 transcreve a fala em 350ms. Mais de 116 regras fonéticas de TI.",
      step2Tag: "02 / FORMULATE",
      step2Title: "Dual-LLM Gemini 2.5 Flash",
      step2Desc: "Respostas Senior em 1,2s com gancho de abertura, arquitetura e cola em português.",
      step3Tag: "03 / STEALTH PROMPT",
      step3Title: "Entrega invisível na linha do olhar",
      step3Desc: "Faixa contínua ou HUD sob a câmera. Sem desviar o olhar e sem rastros em gravações.",
    },
    devices: {
      badge: "SINCRONIZAÇÃO MULTIDISPOSITIVO",
      title: "Funciona em qualquer aparelho",
      subtitle: "Uma só conta — respostas no computador, smartphone e navegador",
      desktopTitle: "Ghostboard Desktop (HUD & Ticker)",
      desktopDesc: "App nativo para Windows, macOS e Linux. Exclusão de gravação de tela e atalhos globais.",
      desktopBadge: "WDA_EXCLUDEFROMCAPTURE",
      mobileTitle: "Mobile Eyeline Companion",
      mobileDesc: "Smartphone posicionado sob a câmera. Modo AMOLED True-Black para contato visual direto.",
      mobileBadge: "AMOLED ZERO-GLARE",
      webTitle: "Web Workspace",
      webDesc: "Acesso direto pelo navegador sem instalação com histórico de avaliações.",
      webBadge: "ZERO INSTALLATION",
    },
    faq: {
      badge: "FAQ",
      title: "Perguntas frequentes",
      q1: "O aplicativo é mesmo invisível no compartilhamento de tela?",
      a1: "Sim. O Ghostboard Desktop utiliza APIs nativas de proteção (WDA_EXCLUDEFROMCAPTURE no Windows, NSWindowSharingNone no macOS). Zoom, Teams e Meet não capturam a janela.",
      q2: "Preciso fornecer chaves próprias da OpenAI ou Gemini?",
      a2: "Não. Todos os modelos de IA estão inclusos e são executados em nossos servidores dedicados.",
      q3: "E se a entrevista for em inglês?",
      a3: "O Ghostboard exibe um fluxo duplo: a frase técnica em inglês para falar e um resumo em português para entender o raciocínio na hora.",
    },
    ctaSection: {
      title: "Conquiste sua próxima oferta técnica com segurança",
      subtitle: "Experimente a sessão de teste grátis de 15 minutos agora.",
      button: "Começar grátis →",
      guarantee: "Não exige cartão de crédito para testar",
    }
  },

  it: {
    badge: "GHOSTBOARD · TELEPROMPTER IA SUB-1.2S",
    title: "Il teleprompter invisibile per",
    titleAccent: "i tuoi colloqui tecnici.",
    subtitle: "Riconoscimento vocale 16kHz in tempo reale e risposte di livello Senior sotto i tuoi occhi. Escluso via hardware dalla condivisione schermo su Zoom, Meet e Teams.",
    ctaLaunch: "Avvia Copilot →",
    ctaDownload: "Scarica Desktop HUD",
    ctaSoundcheck: "Test audio (Soundcheck)",
    stealthLens: {
      badge: "CONCETTO ORIGINALE INCHIOSTRO INVISIBILE",
      title: "Cosa vede l'esaminatore vs Cosa vedi tu",
      desc: "Grazie a SetWindowDisplayAffinity (Windows) e NSWindowSharingNone (macOS), la finestra è fisicamente esclusa dalla registrazione dello schermo.",
      tabInterviewer: "Schermo su Zoom (Esaminatore)",
      tabCandidate: "Tuo schermo (Ghostboard)",
      interviewerNotice: "✓ Condivisione schermo pulita: solo il tuo IDE o terminale viene trasmesso.",
      candidateNotice: "⚡ Teleprompter attivo: punti chiave, complessità Big-O e sintesi in italiano sotto la webcam.",
      sampleQuestion: "Come scalare connessioni WebSocket su più server senza perdere lo stato?",
      sampleHook: "Per scalare WebSocket stateful separiamo lo stato della sessione tramite Redis Pub/Sub...",
      sampleAnswer: "I client si collegano via NLB con sticky sessions, mentre lo scambio di messaggi tra nodi avviene tramite Redis Pub/Sub o Kafka.",
      samplePoints: [
        "Redis Pub/Sub per broadcast tra nodi",
        "Reverse proxy Nginx / AWS ALB con header Upgrade",
        "Heartbeat ping-pong ogni 30s"
      ],
      sampleCrib: "Punto chiave: NLB + Redis Pub/Sub. Non memorizzare lo stato nel processo locale."
    },
    tickerDemo: {
      badge: "NASTRO DI TESTO ULTRA-INVISIBILE",
      title: "Ticker interattivo in tempo reale",
      desc: "Una barra alta solo 34px posizionata sotto l'obiettivo della webcam. Testo scorrevole per mantenere uno sguardo naturale.",
      livePill: "● LIVE",
      modeBadge: "STEALTH TICKER",
      btnTry1: "PostgreSQL MVCC & Bloat",
      btnTry2: "LRU Cache O(1)",
      btnTry3: "Distributed Locks",
      item1Q: "Q: Come gestisce PostgreSQL il table bloat con UPDATE frequenti?",
      item1A: "Hook: «UPDATE crea una versione dead tuple» • Autovacuum scale_factor=0.05 + pg_repack senza blocchi di lettura.",
      item2Q: "Q: Implementa una LRU Cache con complessità O(1) per get e put.",
      item2A: "Hook: «Combinazione HashMap + Doubly Linked List» • Hash table per ricerca O(1) e lista doppiamente concatenata per riposizionamento O(1).",
      item3Q: "Q: Perché un semplice SETNX su Redis è rischioso nei lock distribuiti?",
      item3A: "Hook: «Senza TTL c'è rischio di deadlock, senza UUID si libera il lock altrui» • Usa l'algoritmo Redlock.",
    },
    workflow: {
      badge: "ARCHITETTURA IN 3 PASSAGGI",
      title: "Dalla voce dell'esaminatore alla risposta impeccabile",
      subtitle: "Flusso a bassissima latenza pensato per un dialogo naturale",
      step1Tag: "01 / LISTEN",
      step1Title: "Cattura audio 16kHz PCM in tempo reale",
      step1Desc: "Deepgram Nova-3 analizza la voce in 350ms. 116+ regole fonetiche correggono il gergo IT.",
      step2Tag: "02 / FORMULATE",
      step2Title: "Dual-LLM Gemini 2.5 Flash",
      step2Desc: "Genera risposte Senior in 1,2s con incipit d'impatto, architettura e sintesi in italiano.",
      step3Tag: "03 / STEALTH PROMPT",
      step3Title: "Visualizzazione invisibile nella linea dello sguardo",
      step3Desc: "Nastro scorrevole o HUD sotto la fotocamera. Nessun movimento strano degli occhi.",
    },
    devices: {
      badge: "SINCRONIZZAZIONE MULTI-DISPOSITIVO",
      title: "Funziona su tutti i tuoi dispositivi",
      subtitle: "Un unico account — risposte simultanee su computer, telefono e browser",
      desktopTitle: "Ghostboard Desktop (HUD & Ticker)",
      desktopDesc: "App nativa per Windows, macOS e Linux. Protezione schermo a livello hardware e scorciatoie globali.",
      desktopBadge: "WDA_EXCLUDEFROMCAPTURE",
      mobileTitle: "Mobile Eyeline Companion",
      mobileDesc: "Smartphone posizionato sotto la webcam. Modalità AMOLED True-Black per guardare dritto negli occhi dell'esaminatore.",
      mobileBadge: "AMOLED ZERO-GLARE",
      webTitle: "Web Workspace",
      webDesc: "Accesso diretto da browser senza installazione con storico dettagliato.",
      webBadge: "ZERO INSTALLATION",
    },
    faq: {
      badge: "FAQ",
      title: "Domande frequenti",
      q1: "L'applicazione è davvero invisibile durante la condivisione dello schermo?",
      a1: "Sì. Ghostboard Desktop sfrutta le API native del sistema operativo (WDA_EXCLUDEFROMCAPTURE su Windows, NSWindowSharingNone su macOS). Zoom, Teams e Meet non la registrano.",
      q2: "Devo inserire le mie chiavi API di OpenAI o Gemini?",
      a2: "No. Tutti i modelli IA sono inclusi nell'abbonamento e operano sui nostri server ad alta velocità.",
      q3: "Cosa succede se il colloquio è in lingua inglese?",
      a3: "Ghostboard fornisce un doppio flusso: la formulazione tecnica in inglese da pronunciare e un promemoria in italiano per comprendere al volo il concetto.",
    },
    ctaSection: {
      title: "Ottieni la tua prossima offerta tecnica senza stress",
      subtitle: "Prova subito la sessione di prova gratuita di 15 minuti.",
      button: "Inizia gratis →",
      guarantee: "Nessuna carta di credito richiesta per la prova",
    }
  },

  cs: {
    badge: "GHOSTBOARD · AI TELEPROMPTER SUB-1.2S",
    title: "Neviditelný teleprompter pro",
    titleAccent: "technické pohovory.",
    subtitle: "Rozpoznávání řeči 16kHz v reálném čase a strukturované odpovědi na úrovni Senior přímo před vašima očima. Hardwarově vyloučeno ze sdílení obrazovky v aplikacích Zoom, Meet a Teams.",
    ctaLaunch: "Spustit Copilot →",
    ctaDownload: "Stáhnout Desktop HUD",
    ctaSoundcheck: "Test zvuku (Soundcheck)",
    stealthLens: {
      badge: "AUTORSKÝ KONCEPT NEVIDITELNÝ INKOUST",
      title: "Co vidí tazatel vs Co vidíte vy",
      desc: "Díky funkcím SetWindowDisplayAffinity (Windows) a NSWindowSharingNone (macOS) je okno fyzicky vyjmuto z nahrávání obrazovky.",
      tabInterviewer: "Obrazovka v Zoomu (Tazatel)",
      tabCandidate: "Váš monitor (Ghostboard)",
      interviewerNotice: "✓ Čisté sdílení obrazovky: Viditelné je pouze vaše IDE nebo terminál.",
      candidateNotice: "⚡ Neviditelný teleprompter aktivní: Klíčové body, Big-O složitost a nápověda v češtině přímo pod kamerou.",
      sampleQuestion: "Jak škálovat WebSocket spojení přes více serverů bez ztráty stavu?",
      sampleHook: "Pro škálování stavových WebSocketů oddělujeme stav relace pomocí Redis Pub/Sub...",
      sampleAnswer: "Klienti se připojují přes NLB se sticky sessions, zatímco komunikace mezi uzly probíhá přes Redis Pub/Sub nebo Kafku.",
      samplePoints: [
        "Redis Pub/Sub pro broadcast mezi instancemi",
        "Nginx / AWS ALB s hlavičkami Upgrade",
        "Heartbeat ping-pong každých 30s"
      ],
      sampleCrib: "Podstata: NLB + Redis Pub/Sub. Nikdy neukládat stav do lokální paměti jednoho procesu."
    },
    tickerDemo: {
      badge: "ULTRA-NEVIDITELNÝ BĚŽÍCÍ TEXT",
      title: "Interaktivní běžící pruh v reálném čase",
      desc: "Pouhých 34px vysoký pruh umístěný přímo pod kamerou. Plynulý text zajišťuje přirozený oční kontakt.",
      livePill: "● LIVE",
      modeBadge: "STEALTH TICKER",
      btnTry1: "PostgreSQL MVCC & Bloat",
      btnTry2: "LRU Cache O(1)",
      btnTry3: "Distributed Locks",
      item1Q: "Q: Jak PostgreSQL řeší table bloat při častých UPDATE operacích?",
      item1A: "Hook: «UPDATE vytváří verzi dead tuple» • Autovacuum scale_factor=0.05 + pg_repack bez blokování čtení.",
      item2Q: "Q: Implementujte LRU Cache se složitostí O(1) pro get a put.",
      item2A: "Hook: «Kombinace HashMap + Doubly Linked List» • Hash table zajišťuje O(1) vyhledávání, obousměrný seznam O(1) přesun.",
      item3Q: "Q: Proč je prostý Redis SETNX rizikový pro distribuovaný zámek?",
      item3A: "Hook: «Bez TTL hrozí deadlock, bez UUID uvolnění cizího zámku» • Použijte Redlock algoritmus.",
    },
    workflow: {
      badge: "TŘÍKROKOVÁ ARCHITEKTURA",
      title: "Od hlasu tazatele po bezchybnou odpověď",
      subtitle: "Bleskový tok navržený pro přirozené tempo rozhovoru",
      step1Tag: "01 / LISTEN",
      step1Title: "16kHz PCM zachytávání zvuku",
      step1Desc: "Deepgram Nova-3 zpracuje řeč za 350ms. 116+ IT pravidel opravuje odborný slang.",
      step2Tag: "02 / FORMULATE",
      step2Title: "Dual-LLM Gemini 2.5 Flash",
      step2Desc: "Generuje odpověď Seniora za 1,2s s úvodní tezí, architekturou a českou nápovědou.",
      step3Tag: "03 / STEALTH PROMPT",
      step3Title: "Neviditelné zobrazení v ose pohledu",
      step3Desc: "Běžící pruh nebo HUD pod kamerou. Žádné těkání očima, nulová stopa na nahrávce.",
    },
    devices: {
      badge: "SYNCHRONIZACE ZAŘÍZENÍ",
      title: "Funguje na všech vašich zařízeních",
      subtitle: "Jeden účet — synchronní odpovědi na počítači, mobilu i v prohlížeči",
      desktopTitle: "Ghostboard Desktop (HUD & Ticker)",
      desktopDesc: "Aplikace pro Windows, macOS a Linux. Hardwarová ochrana proti zachycení obrazovky a globální zkratky.",
      desktopBadge: "WDA_EXCLUDEFROMCAPTURE",
      mobileTitle: "Mobile Eyeline Companion",
      mobileDesc: "Smartphone umístěný pod webkamerou. AMOLED True-Black režim pro přímý pohled do očí tazatele.",
      mobileBadge: "AMOLED ZERO-GLARE",
      webTitle: "Web Workspace",
      webDesc: "Přímý přístup bez instalace v prohlížeči s historií pohovorů.",
      webBadge: "ZERO INSTALLATION",
    },
    faq: {
      badge: "FAQ",
      title: "Často kladené otázky",
      q1: "Je aplikace při sdílení obrazovky skutečně neviditelná?",
      a1: "Ano. Ghostboard Desktop využívá nativní systémová API ochrany obsahu (WDA_EXCLUDEFROMCAPTURE ve Windows, NSWindowSharingNone v macOS). Zoom, Teams ani Meet ji nezachytí.",
      q2: "Musím zadávat vlastní OpenAI nebo Gemini API klíče?",
      a2: "Ne. Všechny modely AI jsou zahrnuty v předplatném a provozovány na našich serverech.",
      q3: "Co když pohovor probíhá v angličtině?",
      a3: "Ghostboard zobrazuje dvojí proud: přesné anglické formulace k vyslovení a českou nápovědu pro okamžité pochopení konceptu.",
    },
    ctaSection: {
      title: "Získejte svou další technickou nabídku bez stresu",
      subtitle: "Vyzkoušejte 15minutovou zkušební relaci zdarma právě teď.",
      button: "Začít zdarma →",
      guarantee: "K vyzkoušení není vyžadována platební karta",
    }
  },

  nl: {
    badge: "GHOSTBOARD · SUB-1.2S AI TELEPROMPTER",
    title: "De onzichtbare teleprompter voor",
    titleAccent: "technische interviews.",
    subtitle: "Real-time 16kHz spraakherkenning en gestructureerde Senior antwoorden direct in uw gezichtsveld. Hardwarematig uitgesloten van schermdeling in Zoom, Google Meet en Microsoft Teams.",
    ctaLaunch: "Start Copilot →",
    ctaDownload: "Download Desktop HUD",
    ctaSoundcheck: "Audio soundcheck",
    stealthLens: {
      badge: "AUTEURSCONCEPT ONZICHTBARE INKT",
      title: "Wat de interviewer ziet vs Wat u ziet",
      desc: "Dankzij SetWindowDisplayAffinity (Windows) en NSWindowSharingNone (macOS) wordt het venster fysiek uitgesloten van schermopnames.",
      tabInterviewer: "Scherm in Zoom (Interviewer)",
      tabCandidate: "Uw scherm (Ghostboard)",
      interviewerNotice: "✓ Schermdeling is schoon: alleen uw IDE of terminal wordt weergegeven.",
      candidateNotice: "⚡ Teleprompter actief: kernpunten, Big-O complexiteit en Nederlandse samenvatting onder de webcam.",
      sampleQuestion: "Hoe schaal je WebSocket-verbindingen over meerdere servers zonder sessiestatus te verliezen?",
      sampleHook: "Om stateful WebSockets te schalen, ontkoppelen we de sessiestatus via Redis Pub/Sub...",
      sampleAnswer: "Clients verbinden via een NLB met sticky sessions, en berichten tussen nodes worden gedistribueerd via Redis Pub/Sub of Kafka.",
      samplePoints: [
        "Redis Pub/Sub voor broadcast tussen servernodes",
        "Nginx / AWS ALB reverse proxy met Upgrade headers",
        "Heartbeat ping-pong elke 30s"
      ],
      sampleCrib: "Kern: NLB + Redis Pub/Sub backbone. Nooit status opslaan in het lokale procesgeheugen."
    },
    tickerDemo: {
      badge: "ULTRA-ONZICHTBARE LICHTKRANT",
      title: "Interactieve real-time ticker",
      desc: "Een slechts 34px dunne balk direct onder uw webcam. Vloeiende tekststromen zorgen voor natuurlijk oogcontact.",
      livePill: "● LIVE",
      modeBadge: "STEALTH TICKER",
      btnTry1: "PostgreSQL MVCC & Bloat",
      btnTry2: "LRU Cache O(1)",
      btnTry3: "Distributed Locks",
      item1Q: "Q: Hoe gaat PostgreSQL om met table bloat bij frequente UPDATEs?",
      item1A: "Hook: «UPDATE maakt een dead tuple aan» • Autovacuum scale_factor=0.05 + pg_repack zonder leesblokkades.",
      item2Q: "Q: Implementeer een LRU Cache met O(1) voor get en put.",
      item2A: "Hook: «Combinatie van HashMap + Doubly Linked List» • Hash table voor O(1) zoeken, dubbel gelinkte lijst voor O(1) verplaatsen.",
      item3Q: "Q: Waarom is een simpele SETNX in Redis riskant voor distributed locking?",
      item3A: "Hook: «Zonder TTL kans op deadlock, zonder UUID kans op vrijgeven van andermans lock» • Gebruik Redlock algoritme.",
    },
    workflow: {
      badge: "3-STAPS ARCHITECTUUR",
      title: "Van gesproken vraag tot feilloos antwoord",
      subtitle: "Zeer lage latentie ontworpen voor een natuurlijk gespreksritme",
      step1Tag: "01 / LISTEN",
      step1Title: "16kHz PCM audio-opname in real-time",
      step1Desc: "Deepgram Nova-3 transcribeert spraak in 350ms. 116+ IT-fonetische regels corrigeren vakjargon.",
      step2Tag: "02 / FORMULATE",
      step2Title: "Dual-LLM Gemini 2.5 Flash",
      step2Desc: "Genereert gestructureerde Senior antwoorden in 1,2s met sterke opening, architectuur en Nederlandse toelichting.",
      step3Tag: "03 / STEALTH PROMPT",
      step3Title: "Onzichtbare levering in uw kijkrichting",
      step3Desc: "Lopende ticker of HUD onder de lens. Geen wegdraaiende blik, onzichtbaar op opnames.",
    },
    devices: {
      badge: "APPARAATSYNCHRONISATIE",
      title: "Beschikbaar op al uw apparaten",
      subtitle: "Eén account — gesynchroniseerde antwoorden op computer, mobiel en in de browser",
      desktopTitle: "Ghostboard Desktop (HUD & Ticker)",
      desktopDesc: "Applicatie voor Windows, macOS en Linux. Schermbeveiliging op hardwareniveau en globale sneltoetsen.",
      desktopBadge: "WDA_EXCLUDEFROMCAPTURE",
      mobileTitle: "Mobile Eyeline Companion",
      mobileDesc: "Smartphone direct onder de webcam. AMOLED True-Black modus voor rechtstreeks oogcontact.",
      mobileBadge: "AMOLED ZERO-GLARE",
      webTitle: "Web Workspace",
      webDesc: "Direct toegang in de browser zonder installatie met scorecard-historie.",
      webBadge: "ZERO INSTALLATION",
    },
    faq: {
      badge: "FAQ",
      title: "Veelgestelde vragen",
      q1: "Is de app echt onzichtbaar tijdens het delen van mijn scherm?",
      a1: "Ja. Ghostboard Desktop maakt gebruik van systeemeigen beveiligings-APIs (WDA_EXCLUDEFROMCAPTURE op Windows, NSWindowSharingNone op macOS). Zoom, Teams en Meet zien het venster niet.",
      q2: "Moet ik mijn eigen OpenAI of Gemini API-sleutels invoeren?",
      a2: "Nee. Alle AI-modellen zijn inbegrepen in het abonnement en draaien op onze servers.",
      q3: "Wat als het interview in het Engels is?",
      a3: "Ghostboard toont een dubbele stroom: Engelse technische zinnen om hardop te zeggen en een Nederlandse samenvatting om het concept direct te vatten.",
    },
    ctaSection: {
      title: "Haal uw volgende technische aanbod binnen zonder stress",
      subtitle: "Start nu direct uw gratis proefsessie van 15 minuten.",
      button: "Gratis uitproberen →",
      guarantee: "Geen creditcard vereist voor de proefsessie",
    }
  }
};

export function getHomeTranslations(locale: SupportedLocale): HomeTranslations {
  return HOME_I18N[locale] || HOME_I18N.en;
}
