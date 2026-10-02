import type { SupportedLocale } from './geoLang';

export interface PrivacyI18n {
  title: string;
  updated: string;
  badge: string;
  intro: string;
  sec1Title: string;
  sec1Text: string;
  sec2Title: string;
  sec2Text: string;
  sec2Items: string[];
  sec3Title: string;
  sec3Text: string;
  sec4Title: string;
  sec4Text: string;
  sec5Title: string;
  sec5Text: string;
}

export interface TermsI18n {
  title: string;
  updated: string;
  badge: string;
  intro: string;
  sec1Title: string;
  sec1Text: string;
  sec2Title: string;
  sec2Text: string;
  sec3Title: string;
  sec3Text: string;
  sec4Title: string;
  sec4Text: string;
}

export interface LegalI18n {
  privacy: PrivacyI18n;
  terms: TermsI18n;
}

export const LEGAL_I18N: Record<SupportedLocale, LegalI18n> = {
  ua: {
    privacy: {
      title: "Політика конфіденційності",
      updated: "Ghostboard Studio Protocol · Оновлено: вересень 2026",
      badge: "ZERO-LOGS ENCRYPTION",
      intro: "Ghostboard Studio створено для того, щоб надати розробникам максимальну впевненість під час технічних інтерв'ю та робочих зустрічей, допомагаючи долати мовний бар'єр та тривожність. Наша головна цінність — конфіденційність, локальне зберігання та захист ваших персональних даних.",
      sec1Title: "1. Принцип Zero Server Audio Storage",
      sec1Text: "Ми ніколи не зберігаємо аудіозаписи ваших розмов на сервері. Аудіопотік транслюється у RAM пам'яті в реальному часі через зашифроване TLS-з'єднання до хмарної моделі Deepgram Nova-3 виключно для миттєвої генерації тексту (Speech-to-Text) та негайно видаляється.",
      sec2Title: "2. Локальне зберігання даних на клієнті",
      sec2Text: "Всі персоналізовані дані кандидата залишаються суворо у вашому браузері:",
      sec2Items: [
        "Профіль резюме (роль, технічний стек, список пет-проектів)",
        "Хронологія карток запитань та відповідей поточної сесії",
        "Мовні налаштування та кастомні гарячі клавіші",
      ],
      sec3Title: "3. Хмарні AI-сервіси корпоративного рівня",
      sec3Text: "Ghostboard використовує офіційні корпоративні API Google Gemini та Deepgram із вимкненим навчанням на користувацьких даних (Zero-Data Retention for Model Training). Ваші інтерв'ю та код ніколи не використовуються для донавчання загальнодоступних моделей.",
      sec4Title: "4. Оплата та платіжні дані",
      sec4Text: "Обробка підписок та платежів здійснюється через сертифікований платіжний шлюз Stripe (PCI DSS Level 1). Номери банківських карток ніколи не проходять через наші сервери та не зберігаються у базі даних Ghostboard.",
      sec5Title: "5. Відповідність GDPR",
      sec5Text: "Ви маєте повне право у будь-який момент очистити локальне сховище або видалити свій обліковий запис у налаштуваннях в один клік.",
    },
    terms: {
      title: "Умови використання",
      updated: "Ghostboard Studio Protocol · Оновлено: вересень 2026",
      badge: "LEGAL TERMS",
      intro: "Використовуючи платформу Ghostboard Studio, ви приймаєте наведені нижче умови надання послуг. Ghostboard є персональним AI-телесуфлером та коучем професійного розвитку.",
      sec1Title: "1. Призначення сервісу та коучинг",
      sec1Text: "Ghostboard надає інтерактивну AI-платформу телесуфлера та персонального коучингу в реальному часі для підготовки до технічних інтерв'ю, щоденних стендапів та подолання мовного бар'єру й тривожності. Застосунок є професійним навчальним та комунікаційним асистентом. Користувач несе повну відповідальність за дотримання політик конфіденційності конкретних компаній-роботодавців.",
      sec2Title: "2. Тарифи та підписки",
      sec2Text: "Free Trial включає 15 хвилин ознайомлювальних тренувальних сесій без прив'язки банківської картки. Pro Pass — підписка з безлімітними сесіями, OCR аналізом екрана та HUD-телесуфлером. Ви можете скасувати підписку у будь-який момент в один клік у розділі \"Налаштування\".",
      sec3Title: "3. Хмарна інфраструктура",
      sec3Text: "Усі необхідні API-ключі та квоти для розпізнавання мови й відповідей ШІ входять у вартість підписки та адмініструються нашою платформою. Користувачам не потрібно купувати сторонні токени.",
      sec4Title: "4. Обмеження відповідальності",
      sec4Text: "Ghostboard надається «як є» (as-is). ШІ прагне надавати максимально точні технічні формулювання, проте фінальні відповіді та успіх співбесіди залежать виключно від підготовки кандидата.",
    },
  },
  en: {
    privacy: {
      title: "Privacy Policy",
      updated: "Ghostboard Studio Protocol · Updated: September 2026",
      badge: "ZERO-LOGS ENCRYPTION",
      intro: "Ghostboard Studio is engineered to empower software engineers with speech clarity, anxiety reduction, and confidence during technical interviews and daily standups. Our foundational commitments are strict user privacy, client-side data sovereignty, and zero server storage of audio.",
      sec1Title: "1. Zero Server Audio Storage Principle",
      sec1Text: "We never store audio recordings of your conversations on any server. Audio streams in volatile memory (RAM) in real time over encrypted TLS to Deepgram Nova-3 solely for instant speech-to-text transcript generation and is immediately purged.",
      sec2Title: "2. Local Client-Side Data Storage",
      sec2Text: "All personalized candidate data remains strictly inside your browser's local sandbox:",
      sec2Items: [
        "Candidate resume context (target role, tech stack, pet project highlights)",
        "Chronological history of current session Q&A cards",
        "Interface, speech recognition language preferences, and hotkeys",
      ],
      sec3Title: "3. Enterprise-Grade AI Infrastructure",
      sec3Text: "Ghostboard integrates enterprise API endpoints from Google Gemini and Deepgram configured with zero-data retention. Your interview transcripts and proprietary code snippets are never used to train foundational AI models.",
      sec4Title: "4. Billing & Payment Security",
      sec4Text: "All subscription processing is handled by Stripe (PCI DSS Level 1 Certified). Credit card numbers never touch or persist on Ghostboard servers.",
      sec5Title: "5. GDPR Compliance & Data Sovereignty",
      sec5Text: "You retain full data sovereignty. You can purge all cached session history, local keys, and profile records in a single click inside Settings.",
    },
    terms: {
      title: "Terms of Service",
      updated: "Ghostboard Studio Protocol · Updated: September 2026",
      badge: "LEGAL TERMS",
      intro: "By accessing or using Ghostboard Studio, you agree to these Terms of Service. Ghostboard is a private AI teleprompter and performance coaching platform.",
      sec1Title: "1. Service Scope & Educational Purpose",
      sec1Text: "Ghostboard delivers an interactive real-time AI teleprompter and performance coaching platform designed for technical interview preparation, daily standups, and overcoming language barriers and speech anxiety. The service is an educational, communication assistance, and professional training tool. Users remain solely responsible for compliance with their relevant employer or interview confidentiality obligations.",
      sec2Title: "2. Subscription & Billing Terms",
      sec2Text: "Free Trial includes 15 minutes of live interactive session time with zero credit card required. Pro Pass provides unlimited session access, F9 screen & OCR problem solving, and floating teleprompter HUD. Subscriptions can be canceled at any time in one click in Settings.",
      sec3Title: "3. Cloud Infrastructure & Built-in Quotas",
      sec3Text: "All necessary AI token quotas and Deepgram audio credits are fully included in active subscriptions. Users do not need to configure third-party API accounts.",
      sec4Title: "4. Limitation of Liability",
      sec4Text: "Ghostboard is provided on an 'as-is' and 'as-available' basis. While our low-latency AI models strive for technical precision, the user bears final responsibility for their interview communication and technical evaluation outcomes.",
    },
  },
  pl: {
    privacy: {
      title: "Polityka prywatności",
      updated: "Ghostboard Studio Protocol · Zaktualizowano: wrzesień 2026",
      badge: "SZYFROWANIE ZERO-LOGS",
      intro: "Ghostboard Studio stworzono, aby zapewnić programistom pewność siebie podczas rozmów technicznych i standupów, pomagając pokonać barierę językową i stres. Naszym priorytetem jest prywatność, lokalne przetwarzanie i bezpieczeństwo danych.",
      sec1Title: "1. Zasada Zero Przechowywania Dźwięku na Serwerze",
      sec1Text: "Nigdy nie przechowujemy nagrań audio na naszych serwerach. Strumień audio przetwarzany jest w pamięci RAM w czasie rzeczywistym przez szyfrowane połączenie TLS do Deepgram Nova-3 wyłącznie w celu transkrypcji i jest natychmiast usuwany.",
      sec2Title: "2. Lokalne przechowywanie danych w przeglądarce",
      sec2Text: "Wszystkie spersonalizowane dane kandydata pozostają wyłącznie w Twojej przeglądarce:",
      sec2Items: [
        "Profil kandydata (rola, stos technologiczny, projekty poboczne)",
        "Historia pytań i odpowiedzi bieżącej sesji",
        "Ustawienia językowe oraz skróty klawiszowe",
      ],
      sec3Title: "3. Usługi AI klasy korporacyjnej",
      sec3Text: "Ghostboard korzysta z korporacyjnych interfejsów API Google Gemini i Deepgram z wyłączonym trenowaniem modeli na danych użytkowników. Twoje rozmowy i kod nigdy nie służą do trenowania modeli publicznych.",
      sec4Title: "4. Płatności i bezpieczeństwo transakcji",
      sec4Text: "Obsługa płatności odbywa się przez certyfikowaną bramkę Stripe (PCI DSS Level 1). Numery kart płatniczych nigdy nie trafiają na nasze serwery.",
      sec5Title: "5. Zgodność z RODO (GDPR)",
      sec5Text: "W każdej chwili możesz usunąć pamięć podręczną lub zresetować dane profilu jednym kliknięciem w Ustawieniach.",
    },
    terms: {
      title: "Warunki korzystania",
      updated: "Ghostboard Studio Protocol · Zaktualizowano: wrzesień 2026",
      badge: "WARUNKI PRAWNE",
      intro: "Korzystając z Ghostboard Studio, akceptujesz poniższe warunki świadczenia usług. Ghostboard jest osobistym teleprompterem AI i narzędziem coachingowym.",
      sec1Title: "1. Zakres usługi i cel edukacyjny",
      sec1Text: "Ghostboard zapewnia interaktywną platformę telepromptera AI i osobistego coachingu w czasie rzeczywistym do przygotowania do rozmów technicznych, codziennych standupów oraz przełamywania bariery językowej i stresu. Aplikacja jest profesjonalnym narzędziem edukacyjnym i wspomagającym komunikację. Użytkownik ponosi pełną odpowiedzialność za przestrzeganie zasad poufności pracodawcy.",
      sec2Title: "2. Taryfy i subskrypcje",
      sec2Text: "Free Trial oferuje 15 minut sesji demonstracyjnej bez konieczności podawania karty. Pro Pass zapewnia nieograniczone sesje, analizę OCR [F9] oraz teleprompter HUD. Subskrypcję można anulować w dowolnym momencie w Ustawieniach.",
      sec3Title: "3. Infrastruktura chmurowa",
      sec3Text: "Wszystkie niezbędne limity zapytań AI oraz rozpoznawania mowy są wliczone w cenę subskrypcji. Użytkownicy nie muszą posiadać własnych kluczy API.",
      sec4Title: "4. Ograniczenie odpowiedzialności",
      sec4Text: "Ghostboard jest dostarczany w stanie 'tak jak jest' (as-is). Końcowe odpowiedzi i wynik rozmowy rekrutacyjnej zależą wyłącznie od przygotowania kandydata.",
    },
  },
  de: {
    privacy: {
      title: "Datenschutzerklärung",
      updated: "Ghostboard Studio Protocol · Aktualisiert: September 2026",
      badge: "ZERO-LOGS VERSCHLÜSSELUNG",
      intro: "Ghostboard Studio wurde entwickelt, um Softwareentwicklern Sprachklarheit, Stressabbau und Souveränität in technischen Vorstellungsgesprächen und Standups zu vermitteln. Unsere Kernprinzipien sind Datenschutz, lokale Datensouveränität und null Audiospeicherung.",
      sec1Title: "1. Zero Server Audio Storage Prinzip",
      sec1Text: "Wir speichern niemals Audioaufnahmen Ihrer Gespräche auf Servern. Audiodaten werden im flüchtigen Arbeitsspeicher (RAM) in Echtzeit über TLS an Deepgram Nova-3 gestreamt und unmittelbar gelöscht.",
      sec2Title: "2. Lokale Datenspeicherung im Browser",
      sec2Text: "Alle persönlichen Kandidatendaten verbleiben strikt in der lokalen Sandbox Ihres Browsers:",
      sec2Items: [
        "Lebenslauf-Kontext (Zielrolle, Tech-Stack, Pet-Projekte)",
        "Chronologischer Verlauf der Frage-Antwort-Karten",
        "Spracheinstellungen und Tastaturkürzel",
      ],
      sec3Title: "3. Enterprise-KI-Infrastruktur",
      sec3Text: "Ghostboard nutzt offizielle Enterprise-APIs von Google Gemini und Deepgram ohne Datenspeicherung für Modelltraining. Ihr Code und Ihre Gespräche werden niemals zum Trainieren öffentlicher Modelle verwendet.",
      sec4Title: "4. Zahlungsabwicklung & Sicherheit",
      sec4Text: "Zahlungen werden sicher über den zertifizierten Zahlungsanbieter Stripe (PCI DSS Level 1) abgewickelt. Kreditkartendaten werden niemals auf unseren Servern gespeichert.",
      sec5Title: "5. DSGVO-Konformität",
      sec5Text: "Sie können Ihren lokalen Speicher und Profildaten jederzeit mit einem einzigen Klick in den Einstellungen löschen.",
    },
    terms: {
      title: "Nutzungsbedingungen",
      updated: "Ghostboard Studio Protocol · Aktualisiert: September 2026",
      badge: "RECHTLICHE BEDINGUNGEN",
      intro: "Durch den Zugriff auf Ghostboard Studio stimmen Sie diesen Nutzungsbedingungen zu. Ghostboard ist ein persönlicher KI-Teleprompter und Performance-Coach.",
      sec1Title: "1. Zweck des Dienstes & Bildungsfunktion",
      sec1Text: "Ghostboard bietet eine interaktive Echtzeit-KI-Teleprompter- und Coaching-Plattform zur Vorbereitung auf technische Vorstellungsgespräche, Daily Standups sowie zur Überwindung von Sprachbarrieren und Nervosität. Der Dienst ist ein professionelles Lern- und Kommunikationswerkzeug. Der Nutzer bleibt für die Einhaltung relevanter Vertraulichkeitsvereinbarungen verantwortlich.",
      sec2Title: "2. Tarife und Abonnements",
      sec2Text: "Die kostenlose Testversion beinhaltet 15 Minuten Live-Sitzungen ohne Kreditkarte. Der Pro Pass bietet unbegrenzten Zugang, OCR-Bildschirmanalyse [F9] und den Teleprompter. Jederzeit kündbar in den Einstellungen.",
      sec3Title: "3. Cloud-Infrastruktur & Quoten",
      sec3Text: "Alle benötigten KI-Token und Spracherkennungs-Kontingente sind im Abonnement enthalten. Keine eigenen API-Schlüssel erforderlich.",
      sec4Title: "4. Haftungsbeschränkung",
      sec4Text: "Ghostboard wird 'wie besehen' (as-is) bereitgestellt. Die endgültigen Antworten und der Erfolg des Interviews liegen in der Verantwortung des Nutzers.",
    },
  },
  fr: {
    privacy: {
      title: "Politique de confidentialité",
      updated: "Ghostboard Studio Protocol · Mis à jour : Septembre 2026",
      badge: "CHIFFREMENT ZERO-LOGS",
      intro: "Ghostboard Studio est conçu pour offrir aux développeurs clarté d'élocution, réduction du stress et assurance lors des entretiens techniques et des réunions quotidiennes. Nos principes fondateurs sont la confidentialité et le stockage strictement local.",
      sec1Title: "1. Principe de Zéro Stockage Audio sur Serveur",
      sec1Text: "Nous ne conservons aucun enregistrement audio sur nos serveurs. Le flux audio transite en mémoire vive (RAM) via TLS vers Deepgram Nova-3 uniquement pour la transcription instantanée et est immédiatement supprimé.",
      sec2Title: "2. Stockage local des données côté client",
      sec2Text: "Toutes les données du candidat restent strictement stockées dans votre navigateur :",
      sec2Items: [
        "Profil candidat (rôle visé, stack technique, projets personnels)",
        "Historique des questions et réponses de la session",
        "Préférences linguistiques et raccourcis clavier",
      ],
      sec3Title: "3. Services IA de niveau entreprise",
      sec3Text: "Ghostboard utilise les API Google Gemini et Deepgram avec clause de non-rétention des données d'entraînement. Vos échanges et extraits de code ne sont jamais réutilisés.",
      sec4Title: "4. Paiements sécurisés",
      sec4Text: "Le traitement des paiements est assuré par Stripe (certifié PCI DSS Niveau 1). Aucun numéro bancaire ne transite par nos serveurs.",
      sec5Title: "5. Conformité RGPD",
      sec5Text: "Vous pouvez purger l'intégralité de vos données locales et historiques à tout moment depuis les Paramètres en un clic.",
    },
    terms: {
      title: "Conditions d'utilisation",
      updated: "Ghostboard Studio Protocol · Mis à jour : Septembre 2026",
      badge: "CONDITIONS LÉGALES",
      intro: "En accédant à Ghostboard Studio, vous acceptez les présentes conditions de service. Ghostboard est un téléprompteur IA privé et un coach de performance.",
      sec1Title: "1. Objet du service et vocation éducative",
      sec1Text: "Ghostboard fournit une plateforme interactive de téléprompteur IA et de coaching en temps réel pour la préparation aux entretiens techniques, aux standups quotidiens et au dépassement de la barrière de la langue et du stress. Le service est un outil éducatif et d'aide à la communication professionnelle. L'utilisateur demeure responsable du respect des accords de confidentialité.",
      sec2Title: "2. Tarifs et abonnements",
      sec2Text: "L'essai gratuit comprend 15 minutes sans carte bancaire requise. Le Pro Pass débloque des sessions illimitées, la résolution de code OCR [F9] et le téléprompteur HUD. Résiliable à tout moment dans les Paramètres.",
      sec3Title: "3. Infrastructure cloud incluse",
      sec3Text: "Tous les crédits d'IA et de reconnaissance vocale sont intégrés dans l'abonnement. Aucun compte API tiers n'est nécessaire.",
      sec4Title: "4. Limitation de responsabilité",
      sec4Text: "Ghostboard est fourni 'en l'état'. Les réponses finales et l'évaluation technique dépendent exclusivement des compétences du candidat.",
    },
  },
  es: {
    privacy: {
      title: "Política de privacidad",
      updated: "Ghostboard Studio Protocol · Actualizado: Septiembre 2026",
      badge: "CIFRADO ZERO-LOGS",
      intro: "Ghostboard Studio está diseñado para brindar a los desarrolladores claridad, reducción de la ansiedad y confianza durante entrevistas técnicas y reuniones diarias. Nuestros principios clave son la privacidad absoluta y el almacenamiento local seguro.",
      sec1Title: "1. Principio de Cero Almacenamiento de Audio en Servidor",
      sec1Text: "Nunca almacenamos grabaciones de audio en ningún servidor. El flujo de audio viaja en memoria RAM a través de TLS seguro a Deepgram Nova-3 solo para transcripción inmediata y se descarta al instante.",
      sec2Title: "2. Almacenamiento local en el navegador",
      sec2Text: "Todos los datos de perfil y contexto del candidato se conservan únicamente en su navegador:",
      sec2Items: [
        "Perfil del candidato (puesto deseado, stack tecnológico, proyectos)",
        "Historial de tarjetas de preguntas y respuestas de la sesión",
        "Preferencias de idioma y atajos de teclado",
      ],
      sec3Title: "3. Infraestructura de IA de nivel empresarial",
      sec3Text: "Ghostboard se conecta a las API empresariales de Google Gemini y Deepgram con retención cero para entrenamiento. Tu código y tus respuestas nunca se usan para entrenar modelos públicos.",
      sec4Title: "4. Seguridad de facturación y pagos",
      sec4Text: "Las transacciones son gestionadas mediante Stripe (PCI DSS Nivel 1). Los datos de tarjetas bancarias nunca tocan nuestros servidores.",
      sec5Title: "5. Cumplimiento con RGPD",
      sec5Text: "Tienes el derecho de limpiar tus datos y registros locales en cualquier momento desde Ajustes con un solo clic.",
    },
    terms: {
      title: "Términos de servicio",
      updated: "Ghostboard Studio Protocol · Actualizado: Septiembre 2026",
      badge: "TÉRMINOS LEGALES",
      intro: "Al acceder a Ghostboard Studio, aceptas estas Condiciones del Servicio. Ghostboard es un teleprompter de IA confidencial y un coach de rendimiento profesional.",
      sec1Title: "1. Objeto del servicio y propósito educativo",
      sec1Text: "Ghostboard ofrece una plataforma interactiva de teleprompter con IA y coaching en tiempo real para preparar entrevistas técnicas, standups diarios y superar barreras del idioma y ansiedad comunicativa. La aplicación es una herramienta educativa y de asistencia profesional. El usuario es responsable de cumplir las normas de confidencialidad de su empresa.",
      sec2Title: "2. Planes y suscripciones",
      sec2Text: "Free Trial incluye 15 minutos sin tarjeta de crédito. Pro Pass ofrece sesiones ilimitadas, OCR de pantalla [F9] y teleprompter HUD. Puedes cancelar tu suscripción en cualquier momento desde Ajustes.",
      sec3Title: "3. Cuotas de nube incluidas",
      sec3Text: "Todos los créditos necesarios para reconocimiento de voz e inteligencia artificial están incluidos en la suscripción. No se requieren claves API propias.",
      sec4Title: "4. Limitación de responsabilidad",
      sec4Text: "Ghostboard se proporciona 'tal cual' (as-is). La respuesta final y el éxito de la entrevista dependen exclusivamente de la preparación del candidato.",
    },
  },
  pt: {
    privacy: {
      title: "Política de Privacidade",
      updated: "Ghostboard Studio Protocol · Atualizado: Setembro 2026",
      badge: "CRIPTOGRAFIA ZERO-LOGS",
      intro: "O Ghostboard Studio foi criado para oferecer clareza, redução do estresse e confiança aos desenvolvedores em entrevistas técnicas e reuniões diárias. Nossos pilares são privacidade rigorosa e armazenamento local de dados.",
      sec1Title: "1. Princípio de Zero Armazenamento de Áudio no Servidor",
      sec1Text: "Nunca armazenamos gravações de áudio das suas conversas em servidores. O áudio é transmitido na memória RAM em tempo real via TLS criptografado para o Deepgram Nova-3 para transcrição instantânea e é excluído logo em seguida.",
      sec2Title: "2. Armazenamento local de dados no navegador",
      sec2Text: "Todos os dados personalizados do candidato permanecem estritamente no seu navegador:",
      sec2Items: [
        "Perfil do candidato (cargo pretendido, stack tecnológica, projetos paralelos)",
        "Histórico de cartões de perguntas e respostas da sessão atual",
        "Preferências de idioma e atalhos de teclado",
      ],
      sec3Title: "3. Infraestrutura de IA de nível empresarial",
      sec3Text: "O Ghostboard integra APIs corporativas do Google Gemini e Deepgram sem retenção de dados para treinamento de modelos. Seu código e suas entrevistas nunca são usados para treinar IAs públicas.",
      sec4Title: "4. Pagamentos e faturamento seguro",
      sec4Text: "Todos os pagamentos são processados pela plataforma Stripe (Certificação PCI DSS Nível 1). Dados de cartões nunca passam pelos nossos servidores.",
      sec5Title: "5. Conformidade com LGPD / GDPR",
      sec5Text: "Você pode apagar todo o histórico de dados e perfis a qualquer momento nas Configurações com um único clique.",
    },
    terms: {
      title: "Termos de Serviço",
      updated: "Ghostboard Studio Protocol · Atualizado: Setembro 2026",
      badge: "TERMOS LEGAIS",
      intro: "Ao usar o Ghostboard Studio, você concorda com estes Termos de Serviço. O Ghostboard é um teleprompter com IA e coach de desempenho profissional.",
      sec1Title: "1. Escopo do serviço e finalidade educacional",
      sec1Text: "O Ghostboard oferece uma plataforma interativa de teleprompter com IA e coaching em tempo real para preparação de entrevistas técnicas, reuniões diárias e superação de barreiras linguísticas e ansiedade. O serviço é uma ferramenta educacional e de assistência profissional. O usuário é responsável pelo cumprimento de acordos de confidencialidade.",
      sec2Title: "2. Planos e assinaturas",
      sec2Text: "O Free Trial inclui 15 minutos sem necessidade de cartão de crédito. O Pro Pass concede sessões ilimitadas, leitura de tela com OCR [F9] e teleprompter HUD. Cancele quando quiser nas Configurações.",
      sec3Title: "3. Infraestrutura e quotas inclusas",
      sec3Text: "Todos os tokens de IA e créditos de transcrição necessários já estão inclusos no valor da assinatura. Nenhuma chave API externa é necessária.",
      sec4Title: "4. Limitação de responsabilidade",
      sec4Text: "O Ghostboard é fornecido 'no estado em que se encontra' (as-is). O desempenho final e as respostas na entrevista são de exclusiva responsabilidade do candidato.",
    },
  },
  it: {
    privacy: {
      title: "Informativa sulla Privacy",
      updated: "Ghostboard Studio Protocol · Aggiornato: Settembre 2026",
      badge: "CRITTOGRAFIA ZERO-LOGS",
      intro: "Ghostboard Studio è progettato per garantire agli sviluppatori chiarezza espositiva, riduzione dell'ansia e sicurezza nei colloqui tecnici e nei daily standup. I nostri impegni fondamentali sono privacy, sovranità dei dati e zero persistenza audio.",
      sec1Title: "1. Principio di Zero Archiviazione Audio su Server",
      sec1Text: "Non archiviamo mai registrazioni audio delle tue conversazioni sui server. Il flusso audio viene elaborato nella RAM in tempo reale tramite TLS sicuro verso Deepgram Nova-3 solo per la trascrizione immediata e viene subito cancellato.",
      sec2Title: "2. Archiviazione locale dei dati nel browser",
      sec2Text: "Tutti i dati del profilo del candidato rimangono esclusivamente nella sandbox locale del tuo browser:",
      sec2Items: [
        "Profilo del candidato (ruolo, stack tecnologico, progetti personali)",
        "Cronologia delle schede domande e risposte della sessione",
        "Preferenze di lingua e scorciatoie da tastiera",
      ],
      sec3Title: "3. Infrastruttura IA di livello aziendale",
      sec3Text: "Ghostboard si collega alle API enterprise di Google Gemini e Deepgram configurate senza memorizzazione per addestramento. I tuoi dati e il tuo codice non vengono mai utilizzati per addestrare modelli pubblici.",
      sec4Title: "4. Sicurezza dei pagamenti e fatturazione",
      sec4Text: "Tutte le transazioni sono elaborate tramite Stripe (Certificato PCI DSS Livello 1). I dati delle carte di credito non transitano mai sui nostri server.",
      sec5Title: "5. Conformità GDPR",
      sec5Text: "Hai il pieno diritto di cancellare i dati memorizzati localmente e la cronologia in qualsiasi momento dalle Impostazioni in un clic.",
    },
    terms: {
      title: "Termini di Servizio",
      updated: "Ghostboard Studio Protocol · Aggiornato: Settembre 2026",
      badge: "TERMINI LEGALI",
      intro: "Accedendo a Ghostboard Studio, accetti i presenti Termini di Servizio. Ghostboard è un teleprompter AI privato e un coach di performance professionale.",
      sec1Title: "1. Finalità del servizio e scopo formativo",
      sec1Text: "Ghostboard fornisce una piattaforma interattiva di teleprompter AI e coaching in tempo reale per la preparazione a colloqui tecnici, standup quotidiani e il superamento delle barriere linguistiche e dell'ansia. Il servizio è uno strumento educativo e di supporto professionale. L'utente è responsabile del rispetto degli accordi di riservatezza.",
      sec2Title: "2. Piani e abbonamenti",
      sec2Text: "Free Trial include 15 minuti senza carta di credito richiesta. Pro Pass garantisce sessioni illimitate, analisi OCR dello schermo [F9] e teleprompter HUD. Annullabile in qualsiasi momento nelle Impostazioni.",
      sec3Title: "3. Quote cloud incluse",
      sec3Text: "Tutti i crediti di calcolo IA e di trascrizione vocale sono inclusi nell'abbonamento attivo. Non occorrono chiavi API esterne.",
      sec4Title: "4. Limitazione di responsabilità",
      sec4Text: "Ghostboard viene fornito 'così com'è' (as-is). L'esito del colloquio e le risposte fornite rimangono sotto la completa responsabilità del candidato.",
    },
  },
  cs: {
    privacy: {
      title: "Zásady ochrany osobních údajů",
      updated: "Ghostboard Studio Protocol · Aktualizováno: září 2026",
      badge: "ŠIFROVÁNÍ ZERO-LOGS",
      intro: "Ghostboard Studio je navržen tak, aby programátorům dodal jistotu, snížil stres a pomohl překonat jazykovou bariéru při technických pohovorech a standupech. Našimi prioritami jsou ochrana soukromí a bezpečné lokální zpracování dat.",
      sec1Title: "1. Princip nulového ukládání zvuku na serveru",
      sec1Text: "Nikdy neukládáme zvukové záznamy vašich rozhovorů na serverech. Zvukový proud se zpracovává v paměti RAM v reálném čase přes šifrované TLS spojení do Deepgram Nova-3 výhradně pro přepis a je ihned smazán.",
      sec2Title: "2. Lokální ukládání dat v prohlížeči",
      sec2Text: "Veškerá data profilu kandidáta zůstávají uložena výhradně ve vašem prohlížeči:",
      sec2Items: [
        "Profil životopisu (cílová pozice, technologický stack, vedlejší projekty)",
        "Historie karet otázek a odpovědí z aktuální relace",
        "Jazyková nastavení a klávesové zkratky",
      ],
      sec3Title: "3. Podniková cloudová infrastruktura AI",
      sec3Text: "Ghostboard využívá podniková API Google Gemini a Deepgram s vypnutým trénováním na uživatelských datech. Váš kód ani rozhovory nejsou nikdy použity pro trénování veřejných modelů.",
      sec4Title: "4. Zabezpečení plateb a fakturace",
      sec4Text: "Platby a předplatná jsou spravovány prostřednictvím certifikované brány Stripe (PCI DSS Level 1). Čísla platebních karet nikdy neprocházejí našimi servery.",
      sec5Title: "5. Soulad s GDPR",
      sec5Text: "Máte plné právo kdykoliv smazat místní paměť a data profilu jedním kliknutím v Nastavení.",
    },
    terms: {
      title: "Podmínky služby",
      updated: "Ghostboard Studio Protocol · Aktualizováno: září 2026",
      badge: "PRÁVNÍ PODMÍNKY",
      intro: "Používáním Ghostboard Studio souhlasíte s těmito Podmínkami služby. Ghostboard je osobní AI teleprompter a kouč profesního růstu.",
      sec1Title: "1. Účel služby a vzdělávací funkce",
      sec1Text: "Ghostboard poskytuje interaktivní platformu AI teleprompteru a osobního koučinku v reálném čase pro přípravu na technické pohovory, denní standupy a překonání jazykové bariéry a nervozity. Služba je vzdělávacím a komunikačním asistentem. Uživatel nese odpovědnost za dodržování dohod o mlčenlivosti.",
      sec2Title: "2. Tarify a předplatná",
      sec2Text: "Free Trial zahrnuje 15 minut zkušebních relací bez platební karty. Pro Pass poskytuje neomezené relace, OCR analýzu obrazovky [F9] a teleprompter HUD. Zrušit lze kdykoliv v Nastavení.",
      sec3Title: "3. Zahrnutá cloudová infrastruktura",
      sec3Text: "Všechny potřebné kvóty pro AI a rozpoznávání řeči jsou zahrnuty v předplatném. Není nutné konfigurovat vlastní API klíče.",
      sec4Title: "4. Omezení odpovědnosti",
      sec4Text: "Ghostboard je poskytován 'tak jak je' (as-is). Konečné odpovědi a úspěch na pohovoru závisí výhradně na přípravě kandidáta.",
    },
  },
  nl: {
    privacy: {
      title: "Privacybeleid",
      updated: "Ghostboard Studio Protocol · Bijgewerkt: september 2026",
      badge: "ZERO-LOGS ENCRYPTIE",
      intro: "Ghostboard Studio is ontworpen om softwareontwikkelaars spreekhelderheid, vermindering van spreekangst en zelfvertrouwen te geven tijdens technische interviews en standups. Onze kernwaarden zijn privacy en strikt lokale gegevensopslag.",
      sec1Title: "1. Zero Server Audio Storage Principe",
      sec1Text: "We slaan nooit audio-opnamen van je gesprekken op onze servers op. De audiostream wordt in het RAM-geheugen in realtime via TLS naar Deepgram Nova-3 gestreamd voor directe transcriptie en daarna direct gewist.",
      sec2Title: "2. Lokale gegevensopslag in de browser",
      sec2Text: "Alle gepersonaliseerde kandidaatprofielgegevens blijven strikt in de lokale sandbox van je browser:",
      sec2Items: [
        "Kandidaatprofiel (gewenste functie, tech-stack, pet-projecten)",
        "Geschiedenis van vraag- en antwoordkaarten van de huidige sessie",
        "Taalvoorkeuren en sneltoetsen",
      ],
      sec3Title: "3. Enterprise AI-infrastructuur",
      sec3Text: "Ghostboard maakt gebruik van zakelijke API's van Google Gemini en Deepgram met uitgeschakelde data-retentie voor modeltraining. Je gesprekken en code worden nooit gebruikt om openbare modellen te trainen.",
      sec4Title: "4. Facturering en betalingsbeveiliging",
      sec4Text: "Betalingen worden verwerkt via de gecertificeerde betaalgateway Stripe (PCI DSS Level 1). Creditcardnummers komen nooit op onze servers terecht.",
      sec5Title: "5. AVG / GDPR-naleving",
      sec5Text: "Je hebt het volledige recht om op elk moment met één klik in de Instellingen je lokale gegevens en geschiedenis te wissen.",
    },
    terms: {
      title: "Algemene Voorwaarden",
      updated: "Ghostboard Studio Protocol · Bijgewerkt: september 2026",
      badge: "JURIDISCHE VOORWAARDEN",
      intro: "Door Ghostboard Studio te gebruiken, gaat u akkoord met deze Servicevoorwaarden. Ghostboard is een persoonlijke AI-teleprompter en live performance coach.",
      sec1Title: "1. Doel van de dienst & educatieve functie",
      sec1Text: "Ghostboard biedt een interactief realtime AI-teleprompter- en coachingplatform voor technische sollicitatievoorbereiding, daily standups en het overwinnen van taalbarrières en spreekangst. De dienst is een professioneel educatief hulpmiddel. De gebruiker blijft zelf verantwoordelijk voor de naleving van geheimhoudingsovereenkomsten.",
      sec2Title: "2. Tarieven en abonnementen",
      sec2Text: "De Free Trial omvat 15 minuten proeftijd zonder creditcard. De Pro Pass biedt onbeperkte sessies, OCR-schermanalyse [F9] en de HUD-teleprompter. Te allen tijde opzegbaar via Instellingen.",
      sec3Title: "3. Cloud-infrastructuur & ingebouwde quota",
      sec3Text: "Alle benodigde AI-tokens en spraakherkenningscredits zijn inbegrepen in het abonnement. Geen externe API-sleutels vereist.",
      sec4Title: "4. Beperking van aansprakelijkheid",
      sec4Text: "Ghostboard wordt geleverd 'zoals het is' (as-is). De uiteindelijke antwoorden en het succes van het gesprek zijn de verantwoordelijkheid van de kandidaat.",
    },
  },
};

export function getLegalTranslations(locale: SupportedLocale): LegalI18n {
  return LEGAL_I18N[locale] || LEGAL_I18N.en;
}
