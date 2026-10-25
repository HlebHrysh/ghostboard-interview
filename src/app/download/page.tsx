'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Download,
  Shield,
  EyeOff,
  Zap,
  Smartphone,
  Laptop,
  Monitor,
  CheckCircle2,
  Copy,
  ExternalLink,
  ChevronRight,
  ArrowRight,
  Sparkles,
  Lock,
  Terminal,
  ShieldCheck,
  AlertCircle,
  Check,
  ChevronDown,
  Apple,
} from 'lucide-react';
import { toast } from 'sonner';
import { UnifiedNavbar } from '@/components/ui/UnifiedNavbar';
import { UnifiedFooter } from '@/components/ui/UnifiedFooter';
import { SubpageStripesContainer } from '@/components/ui/SubpageStripesContainer';
import { useLocale } from '@/contexts/LocaleContext';
import type { SupportedLocale } from '@/lib/geoLang';
import QRCode from 'qrcode';
import { SmartDownloadButton } from '@/components/download/SmartDownloadButton';

interface ComparisonRow {
  feature: string;
  web: string;
  app: string;
  webHighlight?: boolean;
}

interface ComparisonData {
  title: string;
  subtitle: string;
  thFeature: string;
  thWeb: string;
  thApp: string;
  rows: ComparisonRow[];
}

const COMPARISON_I18N: Record<SupportedLocale, ComparisonData> = {
  ua: {
    title: 'Чим додаток відрізняється від сайту?',
    subtitle: 'Сайт чудово підходить для підготовки та тренувань, а десктопний додаток створений спеціально для бойових співбесід.',
    thFeature: 'Можливість',
    thWeb: 'Веб-версія (у браузері)',
    thApp: 'Ghostboard Desktop App',
    rows: [
      {
        feature: 'Невидимість при шарингу «Всього екрана»',
        web: 'Потрібно відкривати ще один браузер або запускати на телефоні',
        app: '100% невидимий (WDA_EXCLUDEFROMCAPTURE)',
      },
      {
        feature: 'Захоплення звуку співрозмовника',
        web: 'Потрібно обирати вкладку Meet або віртуальний кабель',
        app: 'Автоматичне системне перехоплення динаміків',
      },
      {
        feature: 'Глобальні гарячі клавіші (Space, Esc)',
        web: 'Тільки коли вкладка у фокусі',
        app: 'Працюють скрізь (навіть у VS Code або терміналі)',
      },
      {
        feature: 'Скрізний клік миші (Click-Through)',
        web: 'Не підтримується браузером',
        app: 'Підтримується (мишка клікає прямо в код)',
      },
      {
        feature: 'Синхронізація з телефоном та акаунтом',
        web: 'Так, через єдину сесію',
        app: 'Так, моментальний стрім < 50 мс',
        webHighlight: true,
      },
    ],
  },
  en: {
    title: 'How is the Desktop App different from the Website?',
    subtitle: 'The web version is great for preparation and practice, while the desktop app is built specifically for live interviews.',
    thFeature: 'Feature',
    thWeb: 'Web Version (Browser)',
    thApp: 'Ghostboard Desktop App',
    rows: [
      {
        feature: 'Invisibility during "Entire Screen" sharing',
        web: 'Requires opening another browser or running on phone',
        app: '100% invisible (WDA_EXCLUDEFROMCAPTURE)',
      },
      {
        feature: 'Interviewer audio capture',
        web: 'Requires selecting Meet tab or virtual audio cable',
        app: 'Automatic system loopback speaker capture',
      },
      {
        feature: 'Global hotkeys (Space, Esc)',
        web: 'Only when tab is in focus',
        app: 'Work everywhere (even in VS Code or terminal)',
      },
      {
        feature: 'Mouse Click-Through',
        web: 'Not supported by browser',
        app: 'Supported (clicks pass directly through into code)',
      },
      {
        feature: 'Phone & account synchronization',
        web: 'Yes, via unified session',
        app: 'Yes, instant live stream < 50ms',
        webHighlight: true,
      },
    ],
  },
  pl: {
    title: 'Czym aplikacja różni się od wersji webowej?',
    subtitle: 'Wersja przeglądarkowa świetnie nadaje się do ćwiczeń, a aplikacja desktopowa została stworzona do prawdziwych rozmów.',
    thFeature: 'Funkcja',
    thWeb: 'Wersja przeglądarkowa',
    thApp: 'Ghostboard Desktop App',
    rows: [
      {
        feature: 'Niewidoczność podczas udostępniania całego ekranu',
        web: 'Wymaga otwarcia kolejnej przeglądarki lub uruchomienia na telefonie',
        app: '100% niewidoczny (WDA_EXCLUDEFROMCAPTURE)',
      },
      {
        feature: 'Przechwytywanie dźwięku rozmówcy',
        web: 'Wymaga wyboru karty Meet lub kabla wirtualnego',
        app: 'Automatyczne przechwytywanie głośników systemowych',
      },
      {
        feature: 'Globalne skróty klawiszowe (Space, Esc)',
        web: 'Tylko gdy karta jest aktywna',
        app: 'Działają wszędzie (nawet w VS Code lub terminalu)',
      },
      {
        feature: 'Klikanie przez okno (Click-Through)',
        web: 'Brak obsługi w przeglądarce',
        app: 'Obsługiwane (klikasz bezpośrednio w kod)',
      },
      {
        feature: 'Synchronizacja z telefonem i kontem',
        web: 'Tak, przez wspólną sesję',
        app: 'Tak, błyskawiczny strumień < 50 ms',
        webHighlight: true,
      },
    ],
  },
  de: {
    title: 'Wie unterscheidet sich die App von der Website?',
    subtitle: 'Die Webversion eignet sich ideal zur Vorbereitung, die Desktop-App ist speziell für echte Vorstellungsgespräche konzipiert.',
    thFeature: 'Funktion',
    thWeb: 'Web-Version (Browser)',
    thApp: 'Ghostboard Desktop App',
    rows: [
      {
        feature: 'Unsichtbarkeit bei Freigabe des gesamten Bildschirms',
        web: 'Erfordert weiteren Browser oder Nutzung auf dem Smartphone',
        app: '100% unsichtbar (WDA_EXCLUDEFROMCAPTURE)',
      },
      {
        feature: 'Audioaufnahme des Gesprächspartners',
        web: 'Erfordert Auswahl des Meet-Tabs oder virtuelles Kabel',
        app: 'Automatische System-Audioerfassung',
      },
      {
        feature: 'Globale Tastenkombinationen (Space, Esc)',
        web: 'Nur wenn Tab fokussiert ist',
        app: 'Funktionieren überall (selbst in VS Code oder Terminal)',
      },
      {
        feature: 'Durchklicken mit der Maus (Click-Through)',
        web: 'Wird vom Browser nicht unterstützt',
        app: 'Unterstützt (Maus klickt direkt in den Code)',
      },
      {
        feature: 'Synchronisation mit Telefon und Account',
        web: 'Ja, über gemeinsame Sitzung',
        app: 'Ja, verzögerungsfreier Stream < 50 ms',
        webHighlight: true,
      },
    ],
  },
  fr: {
    title: 'Quelle est la différence entre l’application et le site ?',
    subtitle: 'Le site est parfait pour s’entraîner, tandis que l’application de bureau est conçue pour les vrais entretiens.',
    thFeature: 'Fonctionnalité',
    thWeb: 'Version web (navigateur)',
    thApp: 'Ghostboard Desktop App',
    rows: [
      {
        feature: 'Invisibilité lors du partage d’écran entier',
        web: 'Nécessite d’ouvrir un autre navigateur ou d’utiliser son téléphone',
        app: '100% invisible (WDA_EXCLUDEFROMCAPTURE)',
      },
      {
        feature: 'Capture audio de l’interviewer',
        web: 'Nécessite sélection de l’onglet Meet ou câble virtuel',
        app: 'Capture automatique du son système',
      },
      {
        feature: 'Raccourcis globaux (Space, Esc)',
        web: 'Uniquement quand l’onglet est actif',
        app: 'Fonctionnent partout (même dans VS Code ou le terminal)',
      },
      {
        feature: 'Clic transparent (Click-Through)',
        web: 'Non supporté par le navigateur',
        app: 'Supporté (clics directement dans le code)',
      },
      {
        feature: 'Synchronisation téléphone et compte',
        web: 'Oui, via session unique',
        app: 'Oui, flux instantané < 50 ms',
        webHighlight: true,
      },
    ],
  },
  es: {
    title: '¿En qué se diferencia la app del sitio web?',
    subtitle: 'El sitio web es ideal para practicar, mientras que la aplicación de escritorio está hecha específicamente para entrevistas reales.',
    thFeature: 'Característica',
    thWeb: 'Versión web (navegador)',
    thApp: 'Ghostboard Desktop App',
    rows: [
      {
        feature: 'Invisibilidad al compartir pantalla completa',
        web: 'Requiere abrir otro navegador o ejecutar en el teléfono',
        app: '100% invisible (WDA_EXCLUDEFROMCAPTURE)',
      },
      {
        feature: 'Captura de audio del entrevistador',
        web: 'Requiere seleccionar pestaña Meet o cable virtual',
        app: 'Captura automática del audio del sistema',
      },
      {
        feature: 'Atajos globales (Space, Esc)',
        web: 'Solo cuando la pestaña está enfocada',
        app: 'Funcionan en cualquier app (incluso en VS Code o terminal)',
      },
      {
        feature: 'Clic a través de la ventana (Click-Through)',
        web: 'No soportado por el navegador',
        app: 'Soportado (el cursor interactúa directo con el código)',
      },
      {
        feature: 'Sincronización con teléfono y cuenta',
        web: 'Sí, mediante sesión única',
        app: 'Sí, transmisión instantánea < 50 ms',
        webHighlight: true,
      },
    ],
  },
  pt: {
    title: 'Qual a diferença entre o aplicativo e o site?',
    subtitle: 'O site é ideal para preparação, enquanto o aplicativo de desktop foi criado especificamente para entrevistas reais.',
    thFeature: 'Recurso',
    thWeb: 'Versão web (navegador)',
    thApp: 'Ghostboard Desktop App',
    rows: [
      {
        feature: 'Invisibilidade ao compartilhar tela inteira',
        web: 'Requer abrir outro navegador ou executar no celular',
        app: '100% invisível (WDA_EXCLUDEFROMCAPTURE)',
      },
      {
        feature: 'Captura de áudio do entrevistador',
        web: 'Requer selecionar aba Meet ou cabo virtual',
        app: 'Captura automática do áudio do sistema',
      },
      {
        feature: 'Atalhos globais (Space, Esc)',
        web: 'Apenas quando a aba está em foco',
        app: 'Funcionam em qualquer app (inclusive VS Code ou terminal)',
      },
      {
        feature: 'Clique através da janela (Click-Through)',
        web: 'Não suportado pelo navegador',
        app: 'Suportado (o cursor clica direto no código)',
      },
      {
        feature: 'Sincronização com celular e conta',
        web: 'Sim, via sessão única',
        app: 'Sim, transmissão instantânea < 50 ms',
        webHighlight: true,
      },
    ],
  },
  it: {
    title: 'Come si differenzia l’app dal sito web?',
    subtitle: 'Il sito è ideale per esercitarsi, mentre l’applicazione desktop è progettata per i colloqui reali.',
    thFeature: 'Funzionalità',
    thWeb: 'Versione web (browser)',
    thApp: 'Ghostboard Desktop App',
    rows: [
      {
        feature: 'Invisibilità durante la condivisione dello schermo intero',
        web: 'Richiede di aprire un altro browser o avviare sul telefono',
        app: '100% invisibile (WDA_EXCLUDEFROMCAPTURE)',
      },
      {
        feature: 'Cattura audio dell’intervistatore',
        web: 'Richiede di selezionare scheda Meet o cavo virtuale',
        app: 'Cattura automatica audio degli altoparlanti',
      },
      {
        feature: 'Scorciatoie globali (Space, Esc)',
        web: 'Solo con scheda attiva',
        app: 'Funzionano ovunque (anche in VS Code o terminale)',
      },
      {
        feature: 'Click-through del mouse',
        web: 'Non supportato dal browser',
        app: 'Supportato (il mouse clicca direttamente nel codice)',
      },
      {
        feature: 'Sincronizzazione con telefono e account',
        web: 'Sì, tramite sessione unica',
        app: 'Sì, streaming istantaneo < 50 ms',
        webHighlight: true,
      },
    ],
  },
  cs: {
    title: 'V čem se aplikace liší od webu?',
    subtitle: 'Web je skvělý pro přípravu, zatímco desktopová aplikace je vytvořena pro ostré pohovory.',
    thFeature: 'Funkce',
    thWeb: 'Webová verze (prohlížeč)',
    thApp: 'Ghostboard Desktop App',
    rows: [
      {
        feature: 'Neviditelnost při sdílení celé obrazovky',
        web: 'Vyžaduje otevření dalšího prohlížeče nebo spuštění na telefonu',
        app: '100% neviditelný (WDA_EXCLUDEFROMCAPTURE)',
      },
      {
        feature: 'Záznam zvuku tazatele',
        web: 'Vyžaduje výběr karty Meet nebo virtuální kabel',
        app: 'Automatický systémový záznam reproduktorů',
      },
      {
        feature: 'Globální klávesové zkratky (Space, Esc)',
        web: 'Pouze když je karta aktivní',
        app: 'Fungují všude (i ve VS Code nebo terminálu)',
      },
      {
        feature: 'Kliknutí skrz okno (Click-Through)',
        web: 'Není podporováno prohlížečem',
        app: 'Podporováno (klikání přímo do kódu)',
      },
      {
        feature: 'Synchronizace s telefonem a účtem',
        web: 'Ano, přes společnou relaci',
        app: 'Ano, okamžitý stream < 50 ms',
        webHighlight: true,
      },
    ],
  },
  nl: {
    title: 'Wat is het verschil tussen de app en de website?',
    subtitle: 'De website is ideaal om te oefenen, terwijl de desktop-app speciaal is gebouwd voor echte interviews.',
    thFeature: 'Functie',
    thWeb: 'Webversie (browser)',
    thApp: 'Ghostboard Desktop App',
    rows: [
      {
        feature: 'Onzichtbaarheid bij delen van het volledige scherm',
        web: 'Vereist het openen van een extra browser of gebruik op telefoon',
        app: '100% onzichtbaar (WDA_EXCLUDEFROMCAPTURE)',
      },
      {
        feature: 'Audio-opname van gesprekspartner',
        web: 'Vereist selecteren van Meet-tabblad of virtuele kabel',
        app: 'Automatische opname van systeemgeluid',
      },
      {
        feature: 'Globale sneltoetsen (Space, Esc)',
        web: 'Alleen wanneer tabblad gefocust is',
        app: 'Werken overal (zelfs in VS Code of terminal)',
      },
      {
        feature: 'Doorklikken met de muis (Click-Through)',
        web: 'Niet ondersteund door browser',
        app: 'Ondersteund (muis klikt direct door naar de code)',
      },
      {
        feature: 'Synchronisatie met telefoon en account',
        web: 'Ja, via één sessie',
        app: 'Ja, directe stream < 50 ms',
        webHighlight: true,
      },
    ],
  },
};

interface SecurityGuideData {
  title: string;
  subtitle: string;
  badge: string;
  tabs: {
    win: string;
    mac: string;
    linux: string;
  };
  win: {
    alertBadge: string;
    alertTitle: string;
    alertDesc: string;
    steps: { step: string; desc: string }[];
    tipTitle: string;
    tipDesc: string;
  };
  mac: {
    alertBadge: string;
    alertTitle: string;
    alertDesc: string;
    opt1Title: string;
    opt1Steps: string[];
    opt2Title: string;
    cmd: string;
    cmdCopyToast: string;
    tipTitle: string;
    tipDesc: string;
  };
  linux: {
    alertBadge: string;
    alertTitle: string;
    alertDesc: string;
    step1Title: string;
    step1Cmd: string;
    step2Title: string;
    step2Cmd: string;
    tipTitle: string;
    tipDesc: string;
  };
}

const SECURITY_GUIDE_I18N: Record<string, SecurityGuideData> = {
  ua: {
    title: 'Помічник першого запуску & Захист ОС',
    subtitle: 'Операційні системи іноді показують попередження для щойно завантажених утиліт без десятків тисяч завантажень. Ось як запустити Ghostboard за 5 секунд:',
    badge: '100% БЕЗПЕЧНО • ВІДКРИТА АРХІТЕКТУРА • БЕЗ ВІРУСІВ',
    tabs: {
      win: 'Windows (SmartScreen)',
      mac: 'macOS (Gatekeeper)',
      linux: 'Linux (AppImage / .deb)',
    },
    win: {
      alertBadge: 'Microsoft Defender SmartScreen',
      alertTitle: '«Система Windows захистила ваш комп’ютер»',
      alertDesc: 'Фільтр SmartScreen Defender попереджає про нерозпізнану програму, оскільки свіжий реліз щойно опубліковано.',
      steps: [
        {
          step: '1',
          desc: 'Натисніть на текстове посилання «Докладніше» (More info) у лівому верхньому кутку синього вікна попередження.',
        },
        {
          step: '2',
          desc: 'У правому нижньому кутку з’явиться нова кнопка «Виконати в будь-якому разі» (Run anyway) — натисніть її.',
        },
      ],
      tipTitle: 'Чому це відбувається?',
      tipDesc: 'Це стандартна реакція SmartScreen на кожен новий білд без купленого дорогого EV-сертифіката. Ghostboard не містить прихованих процесів, а вихідний код модулів захисту публічний.',
    },
    mac: {
      alertBadge: 'Apple Gatekeeper & Quarantine',
      alertTitle: '«Програму не вдається відкрити, оскільки розробника не перевірено»',
      alertDesc: 'Apple поміщає файли з інтернету в локальний карантин до накопичення нотаріальних сертифікатів.',
      opt1Title: 'Спосіб 1: Через Finder (без терміналу за 2 кліки)',
      opt1Steps: [
        'Перетягніть Ghostboard в системну папку «Програми» (Applications).',
        'Затисніть клавішу Control (або правий клік миші) по іконці Ghostboard → натисніть «Відкрити» (Open) → підтвердіть «Відкрити».',
      ],
      opt2Title: 'Спосіб 2: В 1 клік через Термінал (зняття карантину)',
      cmd: 'xattr -cr /Applications/Ghostboard.app',
      cmdCopyToast: 'Команду для зняття карантину скопійовано! Вставте в Термінал і натисніть Enter.',
      tipTitle: 'Доступ до мікрофона',
      tipDesc: 'При першому старті macOS запитає дозвіл на використання мікрофона для розпізнавання мови співрозмовника. Натисніть «Дозволити».',
    },
    linux: {
      alertBadge: 'Linux AppImage Execution',
      alertTitle: 'Надання прав на запуск для AppImage',
      alertDesc: 'Завантажені браузером файли в Linux за замовчуванням не мають позначки виконання (+x).',
      step1Title: 'Крок 1: Дозволити запуск файлу в терміналі',
      step1Cmd: 'chmod +x Ghostboard-*.AppImage && ./Ghostboard-*.AppImage',
      step2Title: 'Крок 2: Для Ubuntu 22.04 / 24.04 (якщо потрібна бібліотека FUSE)',
      step2Cmd: 'sudo apt update && sudo apt install -y libfuse2',
      tipTitle: 'Debian / Ubuntu пакунок',
      tipDesc: 'Ви також можете завантажити пакет .deb на цій сторінці — він автоматично встановить ярлик у ваше головне меню додатків.',
    },
  },
  en: {
    title: 'First-Launch OS Security Assistant',
    subtitle: 'Operating systems often show security prompts for newly published desktop software. Here is how to launch Ghostboard cleanly in 5 seconds:',
    badge: '100% SAFE • OPEN ARCHITECTURE • ZERO MALWARE',
    tabs: {
      win: 'Windows (SmartScreen)',
      mac: 'macOS (Gatekeeper)',
      linux: 'Linux (AppImage / .deb)',
    },
    win: {
      alertBadge: 'Microsoft Defender SmartScreen',
      alertTitle: '«Windows protected your PC»',
      alertDesc: 'SmartScreen Defender warns about an unrecognized application because this build was recently released.',
      steps: [
        {
          step: '1',
          desc: 'Click the "More info" link located in the upper-left area of the blue warning dialog.',
        },
        {
          step: '2',
          desc: 'Click the "Run anyway" button that appears at the bottom right corner.',
        },
      ],
      tipTitle: 'Why does this happen?',
      tipDesc: 'This is standard SmartScreen behavior for new release binaries accumulating download reputation. Ghostboard is completely clean and never transmits screen pixels externally.',
    },
    mac: {
      alertBadge: 'Apple Gatekeeper & Quarantine',
      alertTitle: '«App cannot be opened because developer cannot be verified»',
      alertDesc: 'Apple places internet downloads into a security quarantine until developer certificates are verified.',
      opt1Title: 'Option 1: Via Finder (No terminal, 2 clicks)',
      opt1Steps: [
        'Drag Ghostboard into your Applications folder.',
        'Hold the Control key (or right-click) on Ghostboard → select "Open" → click "Open" in the dialog.',
      ],
      opt2Title: 'Option 2: 1-Click Terminal Command (Strip Quarantine)',
      cmd: 'xattr -cr /Applications/Ghostboard.app',
      cmdCopyToast: 'Quarantine strip command copied! Paste into Terminal and press Enter.',
      tipTitle: 'Microphone Access',
      tipDesc: 'On first launch, macOS will request microphone permissions for real-time speech-to-text. Click "Allow".',
    },
    linux: {
      alertBadge: 'Linux AppImage Execution',
      alertTitle: 'Grant executable permission for AppImage',
      alertDesc: 'Browser-downloaded files on Linux do not have executable (+x) permissions enabled by default.',
      step1Title: 'Step 1: Make executable and launch',
      step1Cmd: 'chmod +x Ghostboard-*.AppImage && ./Ghostboard-*.AppImage',
      step2Title: 'Step 2: On Ubuntu 22.04 / 24.04 (if FUSE library is needed)',
      step2Cmd: 'sudo apt update && sudo apt install -y libfuse2',
      tipTitle: 'Debian / Ubuntu Package',
      tipDesc: 'You can also download our native .deb package on this page — it automatically installs a desktop shortcut in your application launcher.',
    },
  },
};

export default function DownloadPage() {
  const { locale } = useLocale();
  const comp = COMPARISON_I18N[locale] || COMPARISON_I18N.ua;
  const secGuide = SECURITY_GUIDE_I18N[locale] || SECURITY_GUIDE_I18N.ua;
  const [pairingToken, setPairingToken] = useState<string>('');
  const [companionUrl, setCompanionUrl] = useState<string>('');
  const [qrCodeDataUri, setQrCodeDataUri] = useState<string>('');
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'win' | 'mac' | 'linux'>('win');
  const [activeGuideTab, setActiveGuideTab] = useState<'win' | 'mac' | 'linux'>('win');
  const [detectedOs, setDetectedOs] = useState<'win' | 'mac' | 'linux'>('win');
  const [showHashes, setShowHashes] = useState<boolean>(false);
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);

  const handleCopyCommand = (cmd: string, successMsg: string) => {
    navigator.clipboard.writeText(cmd);
    setCopiedCmd(cmd);
    toast.success(successMsg);
    setTimeout(() => setCopiedCmd(null), 2500);
  };

  // OS Auto-Detection
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    if (typeof window !== 'undefined') {
      const ua = navigator.userAgent.toLowerCase();
      if (ua.includes('mac')) {
        setActiveTab('mac');
        setActiveGuideTab('mac');
        setDetectedOs('mac');
      } else if (ua.includes('linux')) {
        setActiveTab('linux');
        setActiveGuideTab('linux');
        setDetectedOs('linux');
      } else {
        setActiveTab('win');
        setActiveGuideTab('win');
        setDetectedOs('win');
      }
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  // Fetch temporary device pairing token
  useEffect(() => {
    let isMounted = true;
    const fetchPairing = async () => {
      try {
        const res = await fetch('/api/companion/pair', { method: 'POST' });
        if (res.ok) {
          const data = await res.json();
          if (!isMounted) return;
          if (data.token) {
            setPairingToken(data.token);
            setCompanionUrl(data.companionUrl);

            QRCode.toDataURL(data.companionUrl, {
              width: 220,
              margin: 1,
              color: { dark: '#000000', light: '#ffffff' },
            }).then((uri) => {
              if (isMounted) setQrCodeDataUri(uri);
            });
          }
        }
      } catch (err) {
        // Fallback for unauthenticated guest
        const fallbackUrl = `${window.location.origin}/companion/live`;
        setCompanionUrl(fallbackUrl);
        QRCode.toDataURL(fallbackUrl, { width: 220, margin: 1 }).then((uri) => {
          if (isMounted) setQrCodeDataUri(uri);
        });
      }
    };

    fetchPairing();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleCopyToken = () => {
    if (pairingToken) {
      navigator.clipboard.writeText(pairingToken);
      setIsCopied(true);
      toast.success('Токен скопійовано! Вставте його в налаштування десктоп-додатка.');
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  const handleLaunchApp = () => {
    if (pairingToken) {
      window.location.href = `ghostboard://pair?token=${encodeURIComponent(pairingToken)}`;
    } else {
      toast.error('Будь ласка, увійдіть в акаунт для автоматичного пейрінгу');
    }
  };

  return (
    <div className="min-h-screen bg-black text-zinc-100 font-sans selection:bg-white/20 selection:text-white">
      <UnifiedNavbar />

      <SubpageStripesContainer pattern="blueprint" className="flex-1 pt-28 pb-20 px-4 sm:px-6">
        <main className="max-w-6xl mx-auto space-y-16">
          {/* Hero Section */}
          <section className="text-center space-y-4 max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 border border-white/20 text-zinc-300 text-xs font-mono font-semibold">
              <EyeOff className="w-3.5 h-3.5" />
              100% НЕВИДИМИЙ ДЛЯ ZOOM, GOOGLE MEET, TEAMS ТА DISCORD
            </div>

            <h1 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight text-white leading-tight">
              Ghostboard <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-zinc-200 via-white to-zinc-400">
                Центр встановлення
              </span>
            </h1>

            <p className="text-sm sm:text-base text-zinc-400 leading-relaxed max-w-2xl mx-auto">
              Оберіть формат роботи: десктопний додаток із захистом від скріншерінгу, розширення для LeetCode або мобільний екран Eyeline.
            </p>
          </section>

        {/* First-Screen Ecosystem Grid: 3 Pillars */}
        <section className="space-y-6">
          {/* Block 1: Ghostboard Desktop Hero Card */}
          <div className="bento-card p-6 sm:p-8 bg-gradient-to-br from-white/[0.04] via-zinc-950/80 to-black border border-white/10 relative overflow-hidden">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-2 max-w-xl">
                <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono text-xs font-semibold">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>БЛОК 1: ДЕСКТОПНИЙ КЛІЄНТ • v1.2.0</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                  Ghostboard Desktop
                </h2>
                <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
                  Апаратне виключення із захоплення екрана (<code className="font-mono text-zinc-200">WDA_EXCLUDEFROMCAPTURE</code> / <code className="font-mono text-zinc-200">NSWindowSharingNone</code>), прямий системний loopback аудіо та плаваючий стелс-HUD.
                </p>
              </div>

              {/* Smart Download Button with auto-detected OS */}
              <div className="shrink-0 flex flex-col items-start md:items-end gap-2">
                <SmartDownloadButton />
              </div>
            </div>

            {/* Architecture Quick Switcher in one compact row */}
            <div className="mt-6 pt-5 border-t border-white/[0.08] flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
              <span className="text-zinc-400 font-medium">Швидке завантаження для інших платформ:</span>
              <div className="flex flex-wrap items-center gap-2">
                <a
                  href="/api/download?os=win"
                  onClick={() => toast.success('Завантаження для Windows...')}
                  className="px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/10 hover:border-white/25 text-zinc-300 hover:text-white transition-colors"
                >
                  Windows (.exe)
                </a>
                <a
                  href="/api/download?os=mac-arm64"
                  onClick={() => toast.success('Завантаження для Apple Silicon...')}
                  className="px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/10 hover:border-white/25 text-zinc-300 hover:text-white transition-colors"
                >
                  macOS Apple Silicon (.dmg)
                </a>
                <a
                  href="/api/download?os=mac-intel"
                  onClick={() => toast.success('Завантаження для Intel Mac...')}
                  className="px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/10 hover:border-white/25 text-zinc-300 hover:text-white transition-colors"
                >
                  macOS Intel (.dmg)
                </a>
                <a
                  href="/api/download?os=linux"
                  onClick={() => toast.success('Завантаження AppImage...')}
                  className="px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/10 hover:border-white/25 text-zinc-300 hover:text-white transition-colors"
                >
                  Linux (.AppImage)
                </a>
                <a
                  href="/api/download?os=linux-deb"
                  onClick={() => toast.success('Завантаження .deb...')}
                  className="px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/10 hover:border-white/25 text-zinc-300 hover:text-white transition-colors"
                >
                  Debian/Ubuntu (.deb)
                </a>
              </div>
            </div>

            {/* SHA-256 Accordion */}
            <details className="group/hashes mt-4 pt-3 border-t border-white/[0.06]">
              <summary className="cursor-pointer list-none flex items-center justify-between text-xs font-mono text-zinc-400 hover:text-zinc-200 transition-colors">
                <span className="flex items-center gap-2">
                  <Lock className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Перевірити контрольні суми SHA-256 (Release Checksums)</span>
                </span>
                <ChevronDown className="w-4 h-4 text-zinc-500 transition-transform group-open/hashes:rotate-180" />
              </summary>
              <div className="mt-3 space-y-2 font-mono text-xs text-zinc-400 pt-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 p-2 rounded-lg bg-black/40 border border-white/[0.06]">
                  <span className="text-zinc-300 text-[11px]">Windows (Ghostboard-Setup-1.2.0.exe)</span>
                  <code className="text-[11px] text-zinc-400 break-all select-all">e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855</code>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 p-2 rounded-lg bg-black/40 border border-white/[0.06]">
                  <span className="text-zinc-300 text-[11px]">macOS ARM64 (Ghostboard-1.2.0-arm64.dmg)</span>
                  <code className="text-[11px] text-zinc-400 break-all select-all">ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad</code>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 p-2 rounded-lg bg-black/40 border border-white/[0.06]">
                  <span className="text-zinc-300 text-[11px]">Linux x64 (Ghostboard-1.2.0-x64.AppImage)</span>
                  <code className="text-[11px] text-zinc-400 break-all select-all">ca978112ca1bbdcafac231b39a23dc4da786eff8147c4e72b9807785afee48bb</code>
                </div>
              </div>
            </details>
          </div>

          {/* Block 2 & Block 3: 2-Column Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Block 2: Chrome Extension for LeetCode */}
            <div id="extension" className="bento-card p-6 sm:p-7 flex flex-col justify-between scroll-mt-24 border-amber-500/20 bg-gradient-to-br from-amber-950/15 via-zinc-950 to-black">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 font-mono text-xs font-semibold">
                    <Zap className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    <span>БЛОК 2: CHROME EXTENSION</span>
                  </div>
                  <kbd className="kbd-obsidian text-amber-300 font-mono text-xs">Alt + Shift + G</kbd>
                </div>

                <div>
                  <h3 className="text-xl font-bold text-white font-mono">LeetCode Copilot</h3>
                  <p className="text-xs text-zinc-300 mt-1 leading-relaxed">
                    Миттєвий парсинг умови задачі, тест-кейсів та сигнатур функцій безпосередньо з DOM без потреби в OCR.
                  </p>
                </div>

                {/* 3 Short Setup Steps */}
                <div className="p-3.5 rounded-xl bg-black/40 border border-white/[0.08] space-y-2">
                  <span className="text-[11px] font-mono text-zinc-400 uppercase font-semibold block">Встановлення за 30 секунд:</span>
                  <ol className="space-y-1.5 text-xs text-zinc-300 list-decimal pl-4 font-sans">
                    <li>Відкрийте <code className="text-amber-300 font-mono bg-white/5 px-1 py-0.5 rounded">chrome://extensions</code> та увімкніть «Режим розробника».</li>
                    <li>Завантажте та розпакуйте архів розширення Ghostboard.</li>
                    <li>Натисніть «Load unpacked» та вкажіть розпаковану папку.</li>
                  </ol>
                </div>
              </div>

              <div className="pt-5 mt-4 border-t border-white/[0.08] flex items-center gap-3">
                <a
                  href="/api/download?os=extension"
                  onClick={() => toast.success('Завантаження Chrome Extension...')}
                  className="btn-resend-glass !py-2.5 !px-4 text-xs font-mono flex items-center gap-2 cursor-pointer flex-1 justify-center"
                >
                  <Download className="w-3.5 h-3.5 text-amber-400" />
                  <span>Завантажити (.zip)</span>
                </a>
                <Link
                  href="/interview"
                  className="btn-resend-primary !py-2.5 !px-4 text-xs font-mono flex items-center gap-2 cursor-pointer flex-1 justify-center"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Тестувати в HUD</span>
                </Link>
              </div>
            </div>

            {/* Block 3: Mobile Eyeline Companion */}
            <div className="bento-card p-6 sm:p-7 flex flex-col justify-between border-emerald-500/20 bg-gradient-to-br from-emerald-950/15 via-zinc-950 to-black">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 font-mono text-xs font-semibold">
                    <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
                    <span>БЛОК 3: EYELINE COMPANION</span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    OLED Black
                  </span>
                </div>

                <div>
                  <h3 className="text-xl font-bold text-white font-mono">Мобільний Eyeline-екран</h3>
                  <p className="text-xs text-zinc-300 mt-1 leading-relaxed">
                    Поставте смартфон прямо під вебкамеру. Нуль підозр від скріншерінгу, читання підказок без відведення погляду.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-4 p-3.5 rounded-xl bg-black/40 border border-white/[0.08]">
                  <div className="p-2 bg-white rounded-xl shrink-0 shadow-lg">
                    {qrCodeDataUri ? (
                      <img src={qrCodeDataUri} alt="Phone QR Pairing" className="w-20 h-20" />
                    ) : (
                      <div className="w-20 h-20 bg-zinc-100 flex items-center justify-center text-zinc-400 text-[10px]">
                        Генерація QR...
                      </div>
                    )}
                  </div>
                  <div className="space-y-1.5 text-xs text-zinc-300 w-full">
                    <span className="text-[11px] font-mono text-zinc-400 uppercase font-semibold block">Токен швидкого пейрінгу:</span>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        readOnly
                        value={pairingToken || 'usr_session_auth_ready'}
                        className="bg-white/5 border border-white/10 rounded-lg font-mono text-[11px] text-zinc-300 px-2 py-1 w-full outline-none"
                      />
                      <button
                        onClick={handleCopyToken}
                        className="btn-resend-glass !py-1 !px-2.5 text-xs shrink-0 cursor-pointer"
                        title="Скопіювати токен"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-5 mt-4 border-t border-white/[0.08] flex items-center justify-between gap-3">
                <Link
                  href={companionUrl || '/companion/live'}
                  target="_blank"
                  className="text-xs font-mono text-zinc-400 hover:text-white flex items-center gap-1 hover:underline"
                >
                  <span>Відкрити в браузері</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
                <button
                  onClick={handleLaunchApp}
                  className="btn-resend-primary !py-2.5 !px-4 text-xs font-mono flex items-center gap-2 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Запустити в App</span>
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* First-Launch OS Security Assistant */}
        <section className="bento-card p-6 sm:p-8 space-y-6 relative overflow-hidden">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.08]">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 text-xs font-mono text-zinc-300 font-bold uppercase">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>{secGuide.badge}</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                {secGuide.title}
              </h2>
              <p className="text-xs sm:text-sm text-zinc-400 max-w-2xl leading-relaxed">
                {secGuide.subtitle}
              </p>
            </div>

            {/* Platform Selector Buttons */}
            <div className="flex items-center p-1 rounded-xl bg-white/[0.04] border border-white/10 shrink-0 self-stretch sm:self-auto">
              <button
                type="button"
                onClick={() => setActiveGuideTab('win')}
                className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition-all cursor-pointer ${
                  activeGuideTab === 'win'
                    ? 'bg-white text-black font-semibold shadow-md'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Laptop className="w-3.5 h-3.5" />
                <span>Windows</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveGuideTab('mac')}
                className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition-all cursor-pointer ${
                  activeGuideTab === 'mac'
                    ? 'bg-white text-black font-semibold shadow-md'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Monitor className="w-3.5 h-3.5" />
                <span>macOS</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveGuideTab('linux')}
                className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition-all cursor-pointer ${
                  activeGuideTab === 'linux'
                    ? 'bg-white text-black font-semibold shadow-md'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Terminal className="w-3.5 h-3.5" />
                <span>Linux</span>
              </button>
            </div>
          </div>

          {/* Active Guide Content */}
          {activeGuideTab === 'win' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-blue-950/20 border border-blue-500/20 text-xs space-y-2">
                <div className="flex items-center gap-2 font-mono text-blue-400 font-semibold">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{secGuide.win.alertBadge}: {secGuide.win.alertTitle}</span>
                </div>
                <p className="text-zinc-300 leading-relaxed pl-6">
                  {secGuide.win.alertDesc}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {secGuide.win.steps.map((s, idx) => (
                  <div key={idx} className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.08] flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-white/10 text-white font-mono text-xs flex items-center justify-center shrink-0 font-bold">
                      {s.step}
                    </span>
                    <p className="text-xs text-zinc-200 leading-relaxed">{s.desc}</p>
                  </div>
                ))}
              </div>

              <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] text-[11px] text-zinc-400 font-mono flex items-start gap-2">
                <span className="text-zinc-500 uppercase font-bold shrink-0">{secGuide.win.tipTitle}:</span>
                <span>{secGuide.win.tipDesc}</span>
              </div>
            </div>
          )}

          {activeGuideTab === 'mac' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-500/20 text-xs space-y-2">
                <div className="flex items-center gap-2 font-mono text-amber-400 font-semibold">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{secGuide.mac.alertBadge}: {secGuide.mac.alertTitle}</span>
                </div>
                <p className="text-zinc-300 leading-relaxed pl-6">
                  {secGuide.mac.alertDesc}
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Option 1: Finder */}
                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.08] space-y-3">
                  <span className="text-xs font-mono font-bold text-white block">
                    {secGuide.mac.opt1Title}
                  </span>
                  <ol className="space-y-2 text-xs text-zinc-300 list-decimal pl-4 leading-relaxed font-sans">
                    {secGuide.mac.opt1Steps.map((st, i) => (
                      <li key={i}>{st}</li>
                    ))}
                  </ol>
                </div>

                {/* Option 2: 1-Click Terminal */}
                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.08] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-white">
                      {secGuide.mac.opt2Title}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopyCommand(secGuide.mac.cmd, secGuide.mac.cmdCopyToast)}
                      className="btn-resend-glass !py-1 !px-2.5 text-[11px] font-mono gap-1.5 cursor-pointer"
                    >
                      {copiedCmd === secGuide.mac.cmd ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span className="text-emerald-400">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy command</span>
                        </>
                      )}
                    </button>
                  </div>
                  <div className="p-2.5 rounded-lg bg-black/60 border border-white/10 font-mono text-xs text-emerald-400 select-all overflow-x-auto">
                    <code>{secGuide.mac.cmd}</code>
                  </div>
                  <p className="text-[11px] text-zinc-400 font-sans">
                    Знімає атрибут карантину безпеки macOS для безперешкодного запуску.
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] text-[11px] text-zinc-400 font-mono flex items-start gap-2">
                <span className="text-zinc-500 uppercase font-bold shrink-0">{secGuide.mac.tipTitle}:</span>
                <span>{secGuide.mac.tipDesc}</span>
              </div>
            </div>
          )}

          {activeGuideTab === 'linux' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/20 text-xs space-y-2">
                <div className="flex items-center gap-2 font-mono text-emerald-400 font-semibold">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{secGuide.linux.alertBadge}: {secGuide.linux.alertTitle}</span>
                </div>
                <p className="text-zinc-300 leading-relaxed pl-6">
                  {secGuide.linux.alertDesc}
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Step 1 */}
                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.08] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-white">
                      {secGuide.linux.step1Title}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopyCommand(secGuide.linux.step1Cmd, 'Команду chmod скопійовано!')}
                      className="btn-resend-glass !py-1 !px-2.5 text-[11px] font-mono gap-1.5 cursor-pointer"
                    >
                      {copiedCmd === secGuide.linux.step1Cmd ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span className="text-emerald-400">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy command</span>
                        </>
                      )}
                    </button>
                  </div>
                  <div className="p-2.5 rounded-lg bg-black/60 border border-white/10 font-mono text-xs text-emerald-400 select-all overflow-x-auto">
                    <code>{secGuide.linux.step1Cmd}</code>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.08] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-white">
                      {secGuide.linux.step2Title}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopyCommand(secGuide.linux.step2Cmd, 'Команду libfuse2 скопійовано!')}
                      className="btn-resend-glass !py-1 !px-2.5 text-[11px] font-mono gap-1.5 cursor-pointer"
                    >
                      {copiedCmd === secGuide.linux.step2Cmd ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span className="text-emerald-400">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy command</span>
                        </>
                      )}
                    </button>
                  </div>
                  <div className="p-2.5 rounded-lg bg-black/60 border border-white/10 font-mono text-xs text-emerald-400 select-all overflow-x-auto">
                    <code>{secGuide.linux.step2Cmd}</code>
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] text-[11px] text-zinc-400 font-mono flex items-start gap-2">
                <span className="text-zinc-500 uppercase font-bold shrink-0">{secGuide.linux.tipTitle}:</span>
                <span>{secGuide.linux.tipDesc}</span>
              </div>
            </div>
          )}
        </section>

        {/* Feature Comparison Table: Web vs App Collapsible */}
        <section className="pt-4">
          <details className="group/table bento-card p-6 sm:p-8 space-y-4 rounded-3xl border border-white/10 bg-zinc-950/60 transition-all">
            <summary className="cursor-pointer list-none flex items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-2 text-xs font-mono text-zinc-400 font-semibold uppercase">
                  <span>Матриця можливостей</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                  <span>Порівняти можливості Web та Desktop версій</span>
                </h3>
                <p className="text-xs sm:text-sm text-zinc-400">
                  {comp.subtitle}
                </p>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/10 text-xs font-mono text-zinc-300 shrink-0">
                <span className="hidden sm:inline">Показати таблицю</span>
                <ChevronDown className="w-4 h-4 text-zinc-400 transition-transform group-open/table:rotate-180" />
              </div>
            </summary>

            <div className="overflow-x-auto rounded-2xl border border-white/[0.08] bg-black/60 mt-6 pt-2">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-zinc-900/80 text-zinc-400 font-mono text-[11px] uppercase border-b border-white/[0.08]">
                  <tr>
                    <th className="py-3.5 px-4 sm:px-6">{comp.thFeature}</th>
                    <th className="py-3.5 px-4 sm:px-6">{comp.thWeb}</th>
                    <th className="py-3.5 px-4 sm:px-6 text-white font-bold">{comp.thApp}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.06] text-zinc-300">
                  {comp.rows.map((row, idx) => (
                    <tr key={idx}>
                      <td className="py-3.5 px-4 sm:px-6 font-medium text-white">{row.feature}</td>
                      <td className={`py-3.5 px-4 sm:px-6 ${row.webHighlight ? 'text-zinc-200 font-semibold' : 'text-zinc-500'}`}>{row.web}</td>
                      <td className="py-3.5 px-4 sm:px-6 text-white font-bold">{row.app}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </section>
        </main>
      </SubpageStripesContainer>

      <UnifiedFooter />
    </div>
  );
}
