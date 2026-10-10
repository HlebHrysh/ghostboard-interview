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
} from 'lucide-react';
import { toast } from 'sonner';
import { UnifiedNavbar } from '@/components/ui/UnifiedNavbar';
import { UnifiedFooter } from '@/components/ui/UnifiedFooter';
import { SubpageStripesContainer } from '@/components/ui/SubpageStripesContainer';
import { useLocale } from '@/contexts/LocaleContext';
import type { SupportedLocale } from '@/lib/geoLang';
import QRCode from 'qrcode';

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

export default function DownloadPage() {
  const { locale } = useLocale();
  const comp = COMPARISON_I18N[locale] || COMPARISON_I18N.ua;
  const [pairingToken, setPairingToken] = useState<string>('');
  const [companionUrl, setCompanionUrl] = useState<string>('');
  const [qrCodeDataUri, setQrCodeDataUri] = useState<string>('');
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'win' | 'mac' | 'linux'>('win');
  const [detectedOs, setDetectedOs] = useState<'win' | 'mac' | 'linux'>('win');
  const [showHashes, setShowHashes] = useState<boolean>(false);

  // OS Auto-Detection
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    if (typeof window !== 'undefined') {
      const ua = navigator.userAgent.toLowerCase();
      if (ua.includes('mac')) {
        setActiveTab('mac');
        setDetectedOs('mac');
      } else if (ua.includes('linux')) {
        setActiveTab('linux');
        setDetectedOs('linux');
      } else {
        setActiveTab('win');
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
          <section className="text-center space-y-6 max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 border border-white/20 text-zinc-300 text-xs font-mono font-semibold">
              <EyeOff className="w-3.5 h-3.5" />
              100% НЕВИДИМИЙ ДЛЯ ZOOM, GOOGLE MEET, TEAMS ТА DISCORD
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight text-white leading-tight">
              Ghostboard Desktop <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-zinc-200 via-white to-zinc-400">
                Стелс-суфлер нового покоління
              </span>
            </h1>

            <p className="text-base sm:text-lg text-zinc-400 leading-relaxed">
              Скачайте міні-додаток (~10 МБ), який працює прямо з коробки: автоматично виключається із захоплення екрана на рівні драйверів ОС, чує співрозмовника з динаміків без віртуальних кабелів і синхронізується з вашим акаунтом і смартфоном.
            </p>
          </section>

        {/* Download Buttons Matrix — Hardware Specs Modules */}
        <section className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Windows */}
            <div
              onClick={() => setActiveTab('win')}
              className={`bento-card p-6 sm:p-8 flex flex-col justify-between cursor-pointer transition-all duration-300 relative ${
                activeTab === 'win'
                  ? 'border-white/30 shadow-[0_0_40px_rgba(255,255,255,0.08)] ring-1 ring-white/20'
                  : 'hover:border-white/20'
              }`}
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-zinc-200">
                    <Laptop className="w-5 h-5" />
                  </div>
                  {detectedOs === 'win' ? (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/15 text-white border border-white/30 font-semibold uppercase">
                      Detected OS
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/5 text-zinc-400 border border-white/10 uppercase">
                      x86_64 / arm64
                    </span>
                  )}
                </div>

                <div>
                  <h3 className="text-xl font-bold text-white font-mono">Windows 10 / 11</h3>
                  <p className="text-xs text-zinc-400 mt-1">
                    Hardware exclusion via <code className="text-white font-mono">WDA_EXCLUDEFROMCAPTURE</code>
                  </p>
                </div>

                {/* Hardware Spec Module Table */}
                <div className="py-3 border-y border-white/[0.06] font-mono text-[11px] space-y-1.5 text-zinc-400">
                  <div className="flex justify-between">
                    <span className="text-zinc-500">BINARY</span>
                    <span className="text-zinc-300">Portable .exe</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">LOOPBACK</span>
                    <span className="text-zinc-300">Direct WASAPI</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">LATENCY</span>
                    <span className="text-zinc-200">~14ms local</span>
                  </div>
                </div>

                <ul className="space-y-1.5 text-xs text-zinc-300 font-sans">
                  <li className="flex items-center gap-2">
                    <span className="chrome-check"><CheckCircle2 className="w-3 h-3 text-white" /></span>
                    <span>100% invisible on Full Screen share</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="chrome-check"><CheckCircle2 className="w-3 h-3 text-white" /></span>
                    <span>No virtual audio cables required</span>
                  </li>
                </ul>
              </div>

              <div className="pt-6">
                <a
                  href="#download-win"
                  onClick={(e) => {
                    e.preventDefault();
                    toast.success('Завантаження інсталятора Ghostboard для Windows...');
                  }}
                  className={`${activeTab === 'win' ? 'btn-resend-primary' : 'btn-resend-glass'} w-full text-xs font-mono py-3 justify-center gap-2`}
                >
                  <Download className="w-4 h-4" />
                  <span>Download for Windows</span>
                </a>
                <p className="text-[11px] text-center text-zinc-500 mt-2 font-mono">Build 1.0.0 • 11.2 MB</p>
              </div>
            </div>

            {/* macOS */}
            <div
              onClick={() => setActiveTab('mac')}
              className={`bento-card p-6 sm:p-8 flex flex-col justify-between cursor-pointer transition-all duration-300 relative ${
                activeTab === 'mac'
                  ? 'border-white/30 shadow-[0_0_40px_rgba(255,255,255,0.08)] ring-1 ring-white/20'
                  : 'hover:border-white/20'
              }`}
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-zinc-200">
                    <Monitor className="w-5 h-5" />
                  </div>
                  {detectedOs === 'mac' ? (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/15 text-white border border-white/30 font-semibold uppercase">
                      Detected OS
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/5 text-zinc-400 border border-white/10 uppercase">
                      Universal
                    </span>
                  )}
                </div>

                <div>
                  <h3 className="text-xl font-bold text-white font-mono">macOS 12+</h3>
                  <p className="text-xs text-zinc-400 mt-1">
                    Protected with <code className="text-white font-mono">NSWindowSharingNone</code>
                  </p>
                </div>

                {/* Hardware Spec Module Table */}
                <div className="py-3 border-y border-white/[0.06] font-mono text-[11px] space-y-1.5 text-zinc-400">
                  <div className="flex justify-between">
                    <span className="text-zinc-500">BINARY</span>
                    <span className="text-zinc-300">Universal .dmg</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">SILICON</span>
                    <span className="text-zinc-300">M1/M2/M3/M4 &amp; Intel</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">NOTCH DOCK</span>
                    <span className="text-zinc-200">Eyeline anchor</span>
                  </div>
                </div>

                <ul className="space-y-1.5 text-xs text-zinc-300 font-sans">
                  <li className="flex items-center gap-2">
                    <span className="chrome-check"><CheckCircle2 className="w-3 h-3 text-white" /></span>
                    <span>Immune to ScreenCaptureKit</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="chrome-check"><CheckCircle2 className="w-3 h-3 text-white" /></span>
                    <span>Pins directly under screen notch</span>
                  </li>
                </ul>
              </div>

              <div className="pt-6">
                <a
                  href="#download-mac"
                  onClick={(e) => {
                    e.preventDefault();
                    toast.success('Завантаження Ghostboard Universal .dmg для macOS...');
                  }}
                  className={`${activeTab === 'mac' ? 'btn-resend-primary' : 'btn-resend-glass'} w-full text-xs font-mono py-3 justify-center gap-2`}
                >
                  <Download className="w-4 h-4" />
                  <span>Download for macOS</span>
                </a>
                <p className="text-[11px] text-center text-zinc-500 mt-2 font-mono">Universal Binary • 12.8 MB</p>
              </div>
            </div>

            {/* Linux */}
            <div
              onClick={() => setActiveTab('linux')}
              className={`bento-card p-6 sm:p-8 flex flex-col justify-between cursor-pointer transition-all duration-300 relative ${
                activeTab === 'linux'
                  ? 'border-white/30 shadow-[0_0_40px_rgba(255,255,255,0.08)] ring-1 ring-white/20'
                  : 'hover:border-white/20'
              }`}
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-zinc-200">
                    <Zap className="w-5 h-5" />
                  </div>
                  {detectedOs === 'linux' ? (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/15 text-white border border-white/30 font-semibold uppercase">
                      Detected OS
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/5 text-zinc-400 border border-white/10 uppercase">
                      x86_64
                    </span>
                  )}
                </div>

                <div>
                  <h3 className="text-xl font-bold text-white font-mono">Linux</h3>
                  <p className="text-xs text-zinc-400 mt-1">
                    PipeWire &amp; X11 override-redirect
                  </p>
                </div>

                {/* Hardware Spec Module Table */}
                <div className="py-3 border-y border-white/[0.06] font-mono text-[11px] space-y-1.5 text-zinc-400">
                  <div className="flex justify-between">
                    <span className="text-zinc-500">PACKAGE</span>
                    <span className="text-zinc-300">AppImage / tar.gz</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">DISTROS</span>
                    <span className="text-zinc-300">Ubuntu, Arch, Fedora</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">RAM USAGE</span>
                    <span className="text-zinc-200">&lt; 35 MB resident</span>
                  </div>
                </div>

                <ul className="space-y-1.5 text-xs text-zinc-300 font-sans">
                  <li className="flex items-center gap-2">
                    <span className="chrome-check"><CheckCircle2 className="w-3 h-3 text-white" /></span>
                    <span>Standalone single-file AppImage</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="chrome-check"><CheckCircle2 className="w-3 h-3 text-white" /></span>
                    <span>Minimal CPU footprint (&lt; 0.5%)</span>
                  </li>
                </ul>
              </div>

              <div className="pt-6">
                <a
                  href="#download-linux"
                  onClick={(e) => {
                    e.preventDefault();
                    toast.success('Завантаження Ghostboard AppImage для Linux...');
                  }}
                  className={`${activeTab === 'linux' ? 'btn-resend-primary' : 'btn-resend-glass'} w-full text-xs font-mono py-3 justify-center gap-2`}
                >
                  <Download className="w-4 h-4" />
                  <span>Download AppImage</span>
                </a>
                <p className="text-[11px] text-center text-zinc-500 mt-2 font-mono">Linux x64 • 9.8 MB</p>
              </div>
            </div>
          </div>

          {/* SHA-256 Verification Hash Accordion */}
          <div className="bento-card p-4 sm:p-5">
            <button
              type="button"
              onClick={() => setShowHashes(!showHashes)}
              className="w-full flex items-center justify-between text-xs font-mono text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-2 font-semibold">
                <Lock className="w-3.5 h-3.5 text-zinc-400" />
                <span>SHA-256 Checksums &amp; Verification Hashes</span>
              </span>
              <span className="text-zinc-500 text-[11px]">
                {showHashes ? 'Hide hashes ▲' : 'Verify release checksums ▼'}
              </span>
            </button>

            {showHashes && (
              <div className="mt-4 pt-4 border-t border-white/[0.08] space-y-3 font-mono text-xs text-zinc-400">
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-zinc-500">
                    <span>Windows (Ghostboard-Setup-1.0.0.exe)</span>
                    <span>SHA-256</span>
                  </div>
                  <div className="p-2 rounded-lg bg-transparent/60 border border-white/[0.08] text-[11px] text-zinc-300 break-all select-all">
                    e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-zinc-500">
                    <span>macOS Universal (Ghostboard-1.0.0-Universal.dmg)</span>
                    <span>SHA-256</span>
                  </div>
                  <div className="p-2 rounded-lg bg-transparent/60 border border-white/[0.08] text-[11px] text-zinc-300 break-all select-all">
                    ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-zinc-500">
                    <span>Linux AppImage (Ghostboard-1.0.0.AppImage)</span>
                    <span>SHA-256</span>
                  </div>
                  <div className="p-2 rounded-lg bg-transparent/60 border border-white/[0.08] text-[11px] text-zinc-300 break-all select-all">
                    ca978112ca1bbdcafac231b39a23dc4da786eff8147c4e72b9807785afee48bb
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* 1-Click Pairing & Phone Companion Hub */}
        <section className="bg-gradient-to-br from-zinc-950 to-black rounded-3xl border border-white/10 p-8 sm:p-10 space-y-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-6 border-b border-white/[0.08]">
            <div>
              <div className="inline-flex items-center gap-2 text-xs font-mono text-zinc-300 font-bold uppercase mb-1">
                <Sparkles className="w-3.5 h-3.5" />
                Єдина система акаунтів & Синхронізація
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
                Підключення в 1 клік (ПК + Телефон + Веб)
              </h2>
              <p className="text-sm text-zinc-400 mt-1 max-w-xl">
                Коли вам ставлять питання, відповідь зʼявляється одночасно на всіх ваших пристроях з мінімальною затримкою.
              </p>
            </div>

            <button
              onClick={handleLaunchApp}
              className="btn-resend-primary !py-3 !px-6 text-sm shrink-0 cursor-pointer shadow-[0_0_20px_rgba(255,255,255,0.15)]"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Запустити Ghostboard App</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            {/* Left: Token & Deep Link info */}
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2 font-mono">
                <Laptop className="w-5 h-5 text-zinc-300" />
                Швидкий пейрінг для компʼютера
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed font-sans">
                Якщо ви вже запустили завантажений десктопний додаток, натисніть кнопку вище або скопіюйте одноразовий токен сесії:
              </p>

              <div className="flex items-center gap-2 p-2 bg-transparent/60 border border-white/[0.08] rounded-xl">
                <input
                  type="text"
                  readOnly
                  value={pairingToken || 'usr_session_auth_ready'}
                  className="bg-transparent font-mono text-xs text-zinc-300 px-2 py-1 w-full outline-none"
                />
                <button
                  onClick={handleCopyToken}
                  className="btn-resend-glass !py-1.5 !px-3 text-xs shrink-0 cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{isCopied ? 'Скопійовано!' : 'Копіювати'}</span>
                </button>
              </div>

              <div className="p-4 rounded-xl bg-transparent/40 border border-white/[0.08] space-y-2 text-xs text-zinc-400">
                <span className="font-semibold text-zinc-300 block font-mono">Гарячі клавіші у додатку:</span>
                <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
                  <div className="flex items-center gap-1.5"><kbd className="kbd-obsidian">Space</kbd> <span>Заморозка</span></div>
                  <div className="flex items-center gap-1.5"><kbd className="kbd-obsidian">Esc</kbd> <span>Панік-щит</span></div>
                  <div className="flex items-center gap-1.5"><kbd className="kbd-obsidian">Ctrl</kbd><kbd className="kbd-obsidian">Alt</kbd><kbd className="kbd-obsidian">H</kbd> <span>Приховати</span></div>
                  <div className="flex items-center gap-1.5"><kbd className="kbd-obsidian">Ctrl</kbd><kbd className="kbd-obsidian">Alt</kbd><kbd className="kbd-obsidian">T</kbd> <span>Click-through</span></div>
                </div>
              </div>
            </div>

            {/* Right: Phone QR Code */}
            <div className="flex flex-col sm:flex-row items-center gap-6 p-6 rounded-2xl bg-transparent/50 border border-white/[0.08]">
              <div className="p-3 bg-white rounded-2xl shadow-xl shrink-0">
                {qrCodeDataUri ? (
                  <img src={qrCodeDataUri} alt="Phone QR Pairing" className="w-36 h-36" />
                ) : (
                  <div className="w-36 h-36 bg-zinc-100 flex items-center justify-center text-zinc-400 text-xs">
                    Генерація QR...
                  </div>
                )}
              </div>

              <div className="space-y-2 text-center sm:text-left">
                <div className="inline-flex items-center gap-1.5 text-xs font-mono text-zinc-300 font-bold">
                  <Smartphone className="w-4 h-4" />
                  ДРУГИЙ ЕКРАН З ТЕЛЕФОНУ
                </div>
                <h4 className="text-base font-bold text-white">Відскануйте камеру смартфону</h4>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Поставте телефон прямо під веб-камеру. Повний імунітет до скріншерінгу, чорний OLED-режим і зачитування без відведення очей.
                </p>
                <Link
                  href={companionUrl || '/companion/live'}
                  target="_blank"
                  className="inline-flex items-center gap-1 text-xs text-zinc-300 hover:text-white hover:underline font-mono pt-1"
                >
                  Відкрити екран телефону у новій вкладці <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Feature Comparison Table: Web vs App */}
        <section className="space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-2xl sm:text-3xl font-bold text-white">{comp.title}</h2>
            <p className="text-sm text-zinc-400">
              {comp.subtitle}
            </p>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-white/[0.08] bg-zinc-950/60">
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
        </section>
        </main>
      </SubpageStripesContainer>

      <UnifiedFooter />
    </div>
  );
}
