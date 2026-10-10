'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useCopilotAI } from '@/hooks/useCopilotAI';
import { useAudioCapture } from '@/hooks/useAudioCapture';
import { useInterviewHotkeys } from '@/hooks/useInterviewHotkeys';
import { useScreenshotAI } from '@/hooks/useScreenshotAI';
import { Mic, Radio, Sparkles, CornerDownLeft, Zap } from 'lucide-react';
import { useLocale } from '@/contexts/LocaleContext';
import { getHudTranslations } from '@/lib/hudI18n';

import CandidateProfileModal, {
  CandidateProfile,
  getStoredCandidateProfile,
  DEFAULT_CANDIDATE_PROFILE,
} from '@/components/CandidateProfileModal';

import { StealthHeaderHUD } from '@/components/interview/StealthHeaderHUD';
import { StealthCommandDock } from '@/components/interview/StealthCommandDock';
import { LiveTranscriptHUD } from '@/components/interview/LiveTranscriptHUD';
import { CandidateSpeechHUD } from '@/components/interview/CandidateSpeechHUD';
import { StealthAnswerCard } from '@/components/interview/StealthAnswerCard';
import { StealthWelcomeHero } from '@/components/interview/StealthWelcomeHero';
import { StealthHistoryDrawer } from '@/components/interview/StealthHistoryDrawer';
import { StealthQuickTestsDrawer } from '@/components/interview/StealthQuickTestsDrawer';
import { StealthPanicShield } from '@/components/interview/StealthPanicShield';
import { TrialLimitModal } from '@/components/interview/TrialLimitModal';
import { SoundCheckModal } from '@/components/interview/SoundCheckModal';
import { EyeLineTeleprompter } from '@/components/interview/EyeLineTeleprompter';
import { CompanionQRModal } from '@/components/interview/CompanionQRModal';
import { AudioSetupWizard } from '@/components/onboarding/AudioSetupWizard';
import { SubpageStripesContainer } from '@/components/ui/SubpageStripesContainer';

import type { SupportedLocale } from '@/lib/geoLang';

const INTERVIEW_PAGE_I18N: Record<SupportedLocale, {
  lifetimeActivated: string;
  proActivated: string;
  sampleQuestion: string;
  sourceTab: string;
  sourceMic: string;
  sessionTitlePrefix: string;
  dateLocale: string;
}> = {
  ua: {
    lifetimeActivated: '💎 Lifetime Founder Pass активовано! Пожиттєвий доступ до всіх функцій без обмежень.',
    proActivated: '🎉 Тариф Pro успішно активовано! Ліміт 15 хвилин знято.',
    sampleQuestion: 'Розкажи про оптимістичні та песимістичні блокування в базах даних і коли що використовувати',
    sourceTab: '🌐 Джерело: Вкладка зустрічі (Meet / Zoom) + Ваш мікрофон',
    sourceMic: '🎙️ Джерело: Тільки системний мікрофон',
    sessionTitlePrefix: 'Співбесіда від',
    dateLocale: 'uk-UA',
  },
  en: {
    lifetimeActivated: '💎 Lifetime Founder Pass activated! Unlimited access forever without restrictions.',
    proActivated: '🎉 Pro Plan activated! 15-minute limit removed.',
    sampleQuestion: 'Explain optimistic vs pessimistic locking in databases and when to use each.',
    sourceTab: '🌐 Audio source: Meeting tab (Meet / Zoom) + Microphone',
    sourceMic: '🎙️ Audio source: System microphone only',
    sessionTitlePrefix: 'Interview session',
    dateLocale: 'en-US',
  },
  pl: {
    lifetimeActivated: '💎 Aktywowano Lifetime Founder Pass! Dożywotni nielimitowany dostęp do wszystkich funkcji.',
    proActivated: '🎉 Aktywowano plan Pro! Limit 15 minut został zniesiony.',
    sampleQuestion: 'Wyjaśnij optymistyczne i pesymistyczne blokowanie w bazach danych oraz kiedy z nich korzystać.',
    sourceTab: '🌐 Źródło dźwięku: Karta spotkania (Meet / Zoom) + Twój mikrofon',
    sourceMic: '🎙️ Źródło dźwięku: Tylko mikrofon systemowy',
    sessionTitlePrefix: 'Rozmowa kwalifikacyjna z dn.',
    dateLocale: 'pl-PL',
  },
  de: {
    lifetimeActivated: '💎 Lifetime Founder Pass aktiviert! Lebenslanger unbegrenzter Zugriff ohne Einschränkungen.',
    proActivated: '🎉 Pro-Tarif erfolgreich aktiviert! 15-Minuten-Limit aufgehoben.',
    sampleQuestion: 'Erkläre optimistisches vs. pessimistisches Sperren in Datenbanken und wann was zu verwenden ist.',
    sourceTab: '🌐 Audioquelle: Meeting-Tab (Meet / Zoom) + Ihr Mikrofon',
    sourceMic: '🎙️ Audioquelle: Nur Systemmikrofon',
    sessionTitlePrefix: 'Interview-Sitzung vom',
    dateLocale: 'de-DE',
  },
  fr: {
    lifetimeActivated: '💎 Lifetime Founder Pass activé ! Accès illimité à vie sans aucune restriction.',
    proActivated: '🎉 Forfait Pro activé avec succès ! Limite de 15 minutes supprimée.',
    sampleQuestion: 'Expliquez le verrouillage optimiste vs pessimiste dans les bases de données et leurs cas d’usage.',
    sourceTab: '🌐 Source audio : Onglet de réunion (Meet / Zoom) + Votre micro',
    sourceMic: '🎙️ Source audio : Microphone système uniquement',
    sessionTitlePrefix: 'Session d’entretien du',
    dateLocale: 'fr-FR',
  },
  es: {
    lifetimeActivated: '💎 ¡Lifetime Founder Pass activado! Acceso ilimitado para siempre.',
    proActivated: '🎉 ¡Plan Pro activado con éxito! Límite de 15 minutos eliminado.',
    sampleQuestion: 'Explica los bloqueos optimistas y pesimistas en bases de datos y cuándo usar cada uno.',
    sourceTab: '🌐 Fuente de audio: Pestaña de reunión (Meet / Zoom) + Tu micrófono',
    sourceMic: '🎙️ Fuente de audio: Solo micrófono del sistema',
    sessionTitlePrefix: 'Sesión de entrevista del',
    dateLocale: 'es-ES',
  },
  pt: {
    lifetimeActivated: '💎 Lifetime Founder Pass ativado! Acesso vitalício e ilimitado a todas as ferramentas.',
    proActivated: '🎉 Plano Pro ativado com sucesso! Limite de 15 minutos removido.',
    sampleQuestion: 'Explique bloqueio otimista vs pessimista em bancos de dados e quando usar cada um.',
    sourceTab: '🌐 Fonte de áudio: Aba da reunião (Meet / Zoom) + Seu microfone',
    sourceMic: '🎙️ Fonte de áudio: Apenas microfone do sistema',
    sessionTitlePrefix: 'Sessão de entrevista de',
    dateLocale: 'pt-BR',
  },
  it: {
    lifetimeActivated: '💎 Lifetime Founder Pass attivato! Accesso illimitato per sempre a tutte le funzionalità.',
    proActivated: '🎉 Piano Pro attivato con successo! Limite di 15 minuti rimosso.',
    sampleQuestion: 'Spiega i lock ottimistici e pessimistici nei database e quando utilizzare ciascuno.',
    sourceTab: '🌐 Sorgente audio: Scheda riunione (Meet / Zoom) + Tuo microfono',
    sourceMic: '🎙️ Sorgente audio: Solo microfono di sistema',
    sessionTitlePrefix: 'Sessione di colloquio del',
    dateLocale: 'it-IT',
  },
  cs: {
    lifetimeActivated: '💎 Lifetime Founder Pass aktivován! Doživotní neomezený přístup ke všem funkcím.',
    proActivated: '🎉 Tarif Pro úspěšně aktivován! Limit 15 minut byl zrušen.',
    sampleQuestion: 'Vysvětli optimistické a pesimistické zamykání v databázích a kdy které použít.',
    sourceTab: '🌐 Zdroj zvuku: Karta schůzky (Meet / Zoom) + Váš mikrofon',
    sourceMic: '🎙️ Zdroj zvuku: Pouze systémový mikrofon',
    sessionTitlePrefix: 'Relace pohovoru ze dne',
    dateLocale: 'cs-CZ',
  },
  nl: {
    lifetimeActivated: '💎 Lifetime Founder Pass geactiveerd! Levenslange onbeperkte toegang zonder restricties.',
    proActivated: '🎉 Pro-abonnement succesvol geactiveerd! Limiet van 15 minuten opgeheven.',
    sampleQuestion: 'Leg optimistische vs pessimistische vergrendeling in databases uit en wanneer je welke gebruikt.',
    sourceTab: '🌐 Audiobron: Vergadertabblad (Meet / Zoom) + Jouw microfoon',
    sourceMic: '🎙️ Audiobron: Alleen systeemmicrofoon',
    sessionTitlePrefix: 'Sollicitatiesessie van',
    dateLocale: 'nl-NL',
  },
};

export default function InterviewPage() {
  const router = useRouter();
  const { locale } = useLocale();
  const intvI18n = INTERVIEW_PAGE_I18N[locale] || INTERVIEW_PAGE_I18N.en;
  const hudT = getHudTranslations(locale).transcript;
  const hudToasts = getHudTranslations(locale).toasts;
  const [sessionDuration, setSessionDuration] = useState<number>(0);
  const [speechLanguage, setSpeechLanguage] = useState<string>('auto');
  const speechLanguageRef = useRef<string>('auto');
  const [outputLanguage, setOutputLanguage] = useState<string>('auto');
  const outputLanguageRef = useRef<string>('auto');
  
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isQuickTestsOpen, setIsQuickTestsOpen] = useState(false);
  const [isSoundCheckOpen, setIsSoundCheckOpen] = useState(false);
  const [isCompanionQROpen, setIsCompanionQROpen] = useState(false);
  const [isEyeLineActive, setIsEyeLineActive] = useState(false);
  const [isPanicShieldActive, setIsPanicShieldActive] = useState<boolean>(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isAudioWizardOpen, setIsAudioWizardOpen] = useState(false);
  
  const [isFrozen, setIsFrozen] = useState<boolean>(false);
  const isFrozenRef = useRef<boolean>(false);
  const [isConcise, setIsConcise] = useState<boolean>(false);
  const isConciseRef = useRef<boolean>(false);
  
  const [triggerMode, setTriggerMode] = useState<'auto' | 'enter'>('auto');
  const triggerModeRef = useRef<'auto' | 'enter'>('auto');
  
  const [userPlan, setUserPlan] = useState<'free' | 'pro' | 'lifetime'>('free');
  const userPlanRef = useRef<'free' | 'pro' | 'lifetime'>('free');
  const [isAuthChecking, setIsAuthChecking] = useState<boolean>(true);
  const [showTrialLimitModal, setShowTrialLimitModal] = useState<boolean>(false);


  const [sessionMode, setSessionMode] = useState<'interview' | 'meeting'>('interview');
  const sessionModeRef = useRef<'interview' | 'meeting'>('interview');

  const [candidateProfile, setCandidateProfile] = useState<CandidateProfile>(DEFAULT_CANDIDATE_PROFILE);
  const candidateProfileRef = useRef<CandidateProfile>(DEFAULT_CANDIDATE_PROFILE);
  
  const hudBroadcastRef = useRef<BroadcastChannel | null>(null);

  const [readLockProgress, setReadLockProgress] = useState(0);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      const channel = new BroadcastChannel('ghostboard_hud_channel');
      hudBroadcastRef.current = channel;
      return () => channel.close();
    }
  }, []);

  useEffect(() => {
    const handlePaywall = () => setShowTrialLimitModal(true);
    window.addEventListener('ghostboard:show_paywall', handlePaywall);
    return () => window.removeEventListener('ghostboard:show_paywall', handlePaywall);
  }, []);

  const {
    interviewQAs,
    setInterviewQAs,
    activeQAId,
    setActiveQAId,
    activeQAIdRef,
    isCopilotGenerating,
    isCopilotGeneratingRef,
    pendingFragmentsRef,
    processAggregatedQuestion,
    handleManualEnterTrigger,
    handleRefineQA,
    handleIncomingTranscript,
    pendingNewCount,
    setPendingNewCount,
    pendingNewCountRef
  } = useCopilotAI({
    speechLanguageRef,
    outputLanguageRef,
    candidateProfileRef,
    isConciseRef,
    triggerModeRef,
    hudBroadcastRef,
    isFrozenRef,
    sessionModeRef,
    sessionDuration,
  });

  const {
    isCapturing,
    isCapturingRef,
    liveVolume,
    interviewerVolume,
    candidateVolume,
    sttStatus,
    hasTabAudio,
    liveTranscript,
    candidateLiveTranscript,
    candidateSpeechHistory,
    clearCandidateHistory,
    repickTabAudio,
    startCapture,
    stopCapture,
    handleManualReconnect,
    tabCaptureRef,
    audioSource,
    setAudioSource,
  } = useAudioCapture({
    speechLanguageRef,
    triggerModeRef,
    userPlanRef,
    onLiveTranscript: handleIncomingTranscript,
    setShowTrialLimitModal,
    sessionDuration,
    setSessionDuration,
  });

  const handleStartCaptureRequest = (source?: 'mic' | 'tab') => {
    try {
      const isSetupDone = localStorage.getItem('ghostboard_audio_setup_done') === 'true';
      if (!isSetupDone) {
        setIsAudioWizardOpen(true);
      } else {
        startCapture(source);
      }
    } catch {
      startCapture(source);
    }
  };

  const {
    isAnalyzingScreenshot,
    handleTriggerScreenshot,
    handleTriggerScreenshotRef
  } = useScreenshotAI({
    speechLanguageRef,
    outputLanguageRef,
    candidateProfileRef,
    tabCaptureRef,
    setInterviewQAs,
    setActiveQAId,
    isFrozenRef,
    activeQAIdRef,
    setPendingNewCount,
    hudBroadcastRef,
    sessionModeRef,
    sessionDuration,
  });

  const handleToggleTriggerMode = () => {
    const next = triggerModeRef.current === 'auto' ? 'enter' : 'auto';
    triggerModeRef.current = next;
    setTriggerMode(next);
    try { localStorage.setItem('ghostboard_trigger_mode', next); } catch {}
    if (next === 'enter') {
      toast.info(hudToasts.enterMode);
    } else {
      toast.success(hudToasts.autoMode);
    }
  };
  const handleToggleConcise = () => {
    const next = !isConciseRef.current;
    isConciseRef.current = next;
    setIsConcise(next);
    toast.info(next ? hudToasts.conciseOn : hudToasts.detailedOn);
  };

  const handleToggleTriggerModeRef = useRef(handleToggleTriggerMode);
  const handleToggleConciseRef = useRef(handleToggleConcise);
  const handleManualEnterTriggerRef = useRef(() => handleManualEnterTrigger(liveTranscript));

  useEffect(() => {
    handleToggleTriggerModeRef.current = handleToggleTriggerMode;
    handleToggleConciseRef.current = handleToggleConcise;
    handleManualEnterTriggerRef.current = () => handleManualEnterTrigger(liveTranscript);
  }, [handleToggleTriggerMode, handleToggleConcise, liveTranscript, handleManualEnterTrigger]);

  useInterviewHotkeys({
    isCapturingRef,
    isCopilotGeneratingRef,
    triggerModeRef,
    isFrozenRef,
    pendingNewCountRef,
    activeQAIdRef,
    interviewQAs,
    setIsFrozen,
    setPendingNewCount,
    setActiveQAId,
    handleToggleTriggerModeRef,
    handleManualEnterTriggerRef,
    handleTriggerScreenshotRef,
    handleToggleConciseRef,
  });

  useEffect(() => {
    if (!activeQAId) {
      setReadLockProgress(0);
      return;
    }
    setReadLockProgress(1);
    const start = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - start;
      const progress = Math.max(0, 1 - elapsed / 15000);
      setReadLockProgress(progress);
      if (progress <= 0) clearInterval(interval);
    }, 150);
    return () => clearInterval(interval);
  }, [activeQAId]);

  useEffect(() => {
    const stored = getStoredCandidateProfile();
    setCandidateProfile(stored);
    candidateProfileRef.current = stored;

    if (!stored.role && stored.techStack.length === 0) {
      setTimeout(() => {
        setIsProfileOpen(true);
        toast.info(hudToasts.roleWelcome);
      }, 500);
    }

    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const modalParam = urlParams.get('modal');
      if (modalParam === 'soundcheck') {
        setIsSoundCheckOpen(true);
      } else if (modalParam === 'profile') {
        setIsProfileOpen(true);
      } else if (modalParam === 'companion') {
        setIsCompanionQROpen(true);
      }
    }

    try {
      const savedLang = localStorage.getItem('ghostboard_speech_language');
      const allSpeechLangs = ['uk', 'en', 'pl', 'de', 'fr', 'es', 'pt', 'it', 'cs', 'nl', 'ru', 'auto'];
      if (savedLang && allSpeechLangs.includes(savedLang)) {
        setSpeechLanguage(savedLang);
        speechLanguageRef.current = savedLang;
      }
      const savedOutputLang = localStorage.getItem('ghostboard_output_language');
      // Determine output lang: explicit pref > locale from context > 'auto'
      const allLangs = ['uk', 'en', 'pl', 'de', 'fr', 'es', 'pt', 'it', 'cs', 'nl', 'auto'];
      if (savedOutputLang && allLangs.includes(savedOutputLang)) {
        setOutputLanguage(savedOutputLang);
        outputLanguageRef.current = savedOutputLang;
      } else {
        // Auto-set from site locale (so German UI → German AI answers)
        const fromLocale = locale === 'ua' ? 'uk' : locale;
        setOutputLanguage(fromLocale);
        outputLanguageRef.current = fromLocale;
      }
      // Verify session and plan from server API (strict auth guard)
      fetch('/api/sessions/me')
        .then((res) => {
          if (!res.ok) throw new Error('Unauthenticated');
          return res.json();
        })
        .then((data) => {
          if (data.authenticated && data.user) {
            const plan = data.user.plan || 'free';
            setUserPlan(plan);
            userPlanRef.current = plan;
            try { localStorage.setItem('ghostboard_plan', plan); } catch {}
            setIsAuthChecking(false);
          } else {
            router.replace('/auth/login?from=/interview');
          }
        })
        .catch(() => {
          router.replace('/auth/login?from=/interview');
        });
      const savedMode = localStorage.getItem('ghostboard_trigger_mode') as 'auto' | 'enter' | null;
      if (savedMode === 'auto' || savedMode === 'enter') {
        setTriggerMode(savedMode);
        triggerModeRef.current = savedMode;
      }
    } catch {}

    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('upgrade') === 'pro_activated' || urlParams.get('upgrade') === 'success') {
        const queryPlan = urlParams.get('plan') || 'pro';
        const targetPlan: 'pro' | 'lifetime' = queryPlan === 'lifetime' ? 'lifetime' : 'pro';
        setUserPlan(targetPlan);
        userPlanRef.current = targetPlan;
        try {
          localStorage.setItem('ghostboard_plan', targetPlan);
        } catch {}
        if (targetPlan === 'lifetime') {
          toast.success(intvI18n.lifetimeActivated);
        } else {
          toast.success(intvI18n.proActivated);
        }
        window.history.replaceState({}, '', '/interview');
      }
    }
  }, [locale]);

  const activeQA = interviewQAs.find((q) => q.id === activeQAId) || interviewQAs[0] || null;

  if (isAuthChecking) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center font-mono text-zinc-400 gap-4 selection:bg-white/20 selection:text-white">
        <div className="relative flex items-center justify-center">
          <div className="w-12 h-12 rounded-full border-2 border-white/10 border-t-white animate-spin" />
        </div>
        <div className="flex flex-col items-center gap-1">
          <span className="text-xs tracking-widest text-white uppercase font-bold">GHOSTBOARD CLEARANCE</span>
          <span className="text-[11px] text-zinc-500 tracking-wider">
            {locale === 'ua' ? 'Перевірка авторизації...' : 'Verifying clearance...'}
          </span>
        </div>
      </div>
    );
  }

  return (
    <SubpageStripesContainer pattern="horizon" glowIntensity={0.05} className="font-sans relative selection:bg-white/20 selection:text-white">
      {isPanicShieldActive && (
        <StealthPanicShield
          isActive={isPanicShieldActive}
          isCapturing={isCapturing}
          questionCount={interviewQAs.length}
          onDeactivate={() => setIsPanicShieldActive(false)}
        />
      )}

      {isEyeLineActive && (
        <EyeLineTeleprompter
          activeQA={activeQA}
          onClose={() => setIsEyeLineActive(false)}
          isCapturing={isCapturing}
        />
      )}

      <StealthHeaderHUD
        isCapturing={isCapturing}
        sttStatus={sttStatus}
        sessionDuration={sessionDuration}
        liveVolume={liveVolume}
        userPlan={userPlan}
        candidateRole={candidateProfile?.role}
        onUpgradeClick={() => router.push('/pricing')}
        onManualReconnect={handleManualReconnect}
        onOpenProfile={() => setIsProfileOpen(true)}
        onOpenHistory={() => setIsHistoryOpen(true)}
        onOpenSoundCheck={() => setIsSoundCheckOpen(true)}
        onOpenCompanionQR={() => setIsCompanionQROpen(true)}
        onToggleEyeLine={() => setIsEyeLineActive((p) => !p)}
        isEyeLineActive={isEyeLineActive}
        hasQuestions={interviewQAs.length > 0}
        formatTime={(secs) => `${Math.floor(secs / 60).toString().padStart(2, '0')}:${(secs % 60).toString().padStart(2, '0')}`}
      />

      <div className={`relative z-10 pt-6 sm:pt-8 pb-32 px-4 ${!isCapturing && interviewQAs.length === 0 ? 'max-w-[840px]' : 'max-w-[700px]'} mx-auto min-h-screen flex flex-col justify-start transition-all duration-300`}>
        {!isCapturing && interviewQAs.length === 0 && (
          <StealthWelcomeHero
            isCapturing={isCapturing}
            isAnalyzingScreenshot={isAnalyzingScreenshot}
            isCopilotGenerating={isCopilotGenerating}
            candidateProfile={candidateProfile}
            audioSource={audioSource}
            onSelectAudioSource={setAudioSource}
            onStartCapture={handleStartCaptureRequest}
            onTriggerScreenshot={handleTriggerScreenshot}
            onInjectTest={(q) => processAggregatedQuestion(q, true)}
            onOpenSoundCheck={() => setIsSoundCheckOpen(true)}
            onOpenProfile={() => setIsProfileOpen(true)}
            onSelectPresetProfile={(p) => {
              setCandidateProfile(p);
              candidateProfileRef.current = p;
            }}
          />
        )}

        {isCapturing && interviewQAs.length === 0 && (
          <div className="w-full max-w-[680px] mx-auto flex flex-col items-center text-center animate-in fade-in duration-200 py-6 sm:py-10 select-none">
            {/* Live Audio Status Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-zinc-300 text-xs font-mono mb-4">
              <span className="w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_6px_#ffffff]" />
              <span className="uppercase tracking-wider font-semibold">{hudT.runningCardSub}</span>
            </div>

            {/* Quiet In-Flight Listening Card (Linear Noir) */}
            <div className="w-full p-6 sm:p-7 rounded-2xl bg-[#0D0D10] border border-white/[0.08] shadow-[0_16px_40px_rgba(0,0,0,0.7)] backdrop-blur-2xl text-left space-y-4">
              <div className="flex items-center justify-between text-xs font-mono text-zinc-400 pb-3 border-b border-white/[0.06]">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                  <span className="font-semibold text-zinc-300 uppercase tracking-wider text-[11px]">
                    {hudT.runningCardHeader}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-white/[0.04] border border-white/[0.06] text-zinc-400 text-[10px]">
                    {triggerMode === 'enter' ? 'Manual [↵]' : 'Auto Stream'}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-white/[0.04] border border-white/[0.06] text-zinc-400 text-[10px]">
                    {audioSource === 'tab' ? 'Tab Audio' : 'Microphone'}
                  </span>
                </div>
              </div>

              {/* Running Transcript Text with Clean Cursor */}
              <div className="min-h-[70px] flex items-center justify-center">
                {liveTranscript ? (
                  <p className="text-lg sm:text-xl font-bold text-white tracking-tight leading-relaxed font-sans text-left w-full">
                    <span className="text-zinc-500 font-mono text-[10px] block mb-1 uppercase tracking-widest font-semibold">
                      {hudT.recognizedLabel}
                    </span>
                    <span className="text-[#EDEDED]">
                      «{liveTranscript}»
                    </span>
                    <span className="inline-block w-1.5 h-4 bg-white ml-1.5 animate-pulse align-middle" />
                  </p>
                ) : (
                  <div className="flex flex-col items-center text-center gap-2 text-zinc-400 py-3">
                    <p className="text-sm font-mono text-zinc-300 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                      <span>{hudT.listeningPlaceholder}</span>
                    </p>
                    <p className="text-xs font-sans text-zinc-500 max-w-md leading-relaxed">
                      {hudT.listeningHint}
                    </p>
                  </div>
                )}
              </div>

              {/* Tab Audio Warning */}
              {!hasTabAudio && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-xs font-mono flex items-center justify-between gap-3">
                  <span className="text-amber-300 font-medium">
                    ⚠️ {locale === 'ua' ? 'Поставте галочку «Поділитися аудіо вкладки»' : 'Enable "Share tab audio" in Chrome window'}
                  </span>
                  <button
                    type="button"
                    onClick={repickTabAudio}
                    className="px-2.5 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 text-[11px] font-bold cursor-pointer shrink-0 transition-colors"
                  >
                    {locale === 'ua' ? 'Обрати' : 'Select'}
                  </button>
                </div>
              )}

              {/* Instant Action Bar */}
              <div className="pt-3.5 border-t border-white/[0.06] flex flex-wrap items-center justify-between gap-2">
                <span className="text-[11px] font-mono text-zinc-500">
                  {triggerMode === 'enter' ? hudT.enterPrompt : hudT.autoPrompt}
                </span>

                <div className="flex items-center gap-2">
                  {liveTranscript && (
                    <button
                      type="button"
                      onClick={() => handleManualEnterTriggerRef.current()}
                      className="py-1.5 px-3 rounded-lg bg-white/10 hover:bg-white/20 text-white font-mono text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                    >
                      <span>{hudT.answerNowBtn}</span>
                      <CornerDownLeft className="w-3.5 h-3.5 text-white" />
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() =>
                      processAggregatedQuestion(
                        intvI18n.sampleQuestion,
                        true
                      )
                    }
                    className="py-1.5 px-3 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 hover:text-white font-mono text-xs transition-all flex items-center gap-1.5 border border-white/[0.08] cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3 text-white" />
                    <span>{hudT.sampleQuestionBtn}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {(isCapturing || interviewQAs.length > 0) && activeQA && (
          <div className="w-full flex justify-center pb-[10vh]">
            <StealthAnswerCard
              activeQA={activeQA}
              readLockProgress={readLockProgress}
              copiedId={copiedId}
              isFrozen={isFrozen}
              isCopilotGenerating={isCopilotGenerating}
              pendingNewCount={pendingNewCount}
              userPlan={userPlan}
              onUpgradeClick={() => router.push('/pricing')}
              onCopy={(text, id) => {
                navigator.clipboard.writeText(text);
                setCopiedId(id);
                toast.success(hudToasts.copied);
              }}
              onRefineQA={handleRefineQA}
              onToggleFreeze={() => {
                const nextFrozen = !isFrozen;
                setIsFrozen(nextFrozen);
                isFrozenRef.current = nextFrozen;
                if (!nextFrozen) {
                  setPendingNewCount(0);
                  pendingNewCountRef.current = 0;
                  if (interviewQAs.length > 0) setActiveQAId(interviewQAs[0].id);
                }
              }}
              onJumpToNewest={() => {
                setIsFrozen(false);
                isFrozenRef.current = false;
                setPendingNewCount(0);
                pendingNewCountRef.current = 0;
                if (interviewQAs.length > 0) setActiveQAId(interviewQAs[0].id);
              }}
            />
          </div>
        )}
      </div>

      {/* Dedicated Candidate Speech HUD (Isolated from AI generation) */}
      <CandidateSpeechHUD
        isCapturing={isCapturing}
        candidateLiveTranscript={candidateLiveTranscript}
        candidateVolume={candidateVolume}
        speechHistory={candidateSpeechHistory}
        onClearHistory={clearCandidateHistory}
      />

      {/* Main Interviewer Speech & AI Answers HUD */}
      <LiveTranscriptHUD
        isCapturing={isCapturing}
        liveTranscript={liveTranscript}
        isCopilotGenerating={isCopilotGenerating}
        isFrozen={isFrozen}
        triggerMode={triggerMode}
        onToggleTriggerMode={handleToggleTriggerMode}
        onAnswerNow={() => handleManualEnterTriggerRef.current()}
        bufferedWordCount={pendingFragmentsRef.current.join(' ').split(/\s+/).filter(Boolean).length}
        hasQuestions={interviewQAs.length > 0}
        hasTabAudio={hasTabAudio}
        onRepickTabAudio={repickTabAudio}
      />

      {(isCapturing || interviewQAs.length > 0) && (
        <StealthCommandDock
          isCapturing={isCapturing}
          isAnalyzingScreenshot={isAnalyzingScreenshot}
          questionCount={interviewQAs.length}
          isFrozen={isFrozen}
          pendingNewCount={pendingNewCount}
          isConcise={isConcise}
          triggerMode={triggerMode}
          sessionMode={sessionMode}
          audioSource={audioSource}
          sessionDuration={sessionDuration}
          onToggleAudioSource={() => {
            const next = audioSource === 'tab' ? 'mic' : 'tab';
            setAudioSource(next);
            toast.info(next === 'tab' ? intvI18n.sourceTab : intvI18n.sourceMic);
          }}
          onToggleTriggerMode={handleToggleTriggerMode}
          onToggleSessionMode={() => {
            const next = sessionMode === 'interview' ? 'meeting' : 'interview';
            setSessionMode(next);
            sessionModeRef.current = next;
            toast.success(next === 'meeting' ? hudToasts.meetingMode : hudToasts.interviewMode);
          }}
          onAnswerNow={() => handleManualEnterTriggerRef.current()}
          onStartCapture={handleStartCaptureRequest}
          onStopCapture={() => {
            stopCapture();
            if (interviewQAs.length > 0) {
              const sessionTitle = `${intvI18n.sessionTitlePrefix} ${new Date().toLocaleDateString(intvI18n.dateLocale)} (${candidateProfileRef.current.role || 'Senior Engineer'})`;
              const localEntry = {
                id: 'sess_' + Date.now(),
                title: sessionTitle,
                timestamp: Date.now(),
                durationSec: sessionDuration,
                questionsCount: interviewQAs.length,
                items: [...interviewQAs],
              };
              try {
                const existing = JSON.parse(localStorage.getItem('ghostboard_saved_sessions') || '[]');
                existing.unshift(localEntry);
                localStorage.setItem('ghostboard_saved_sessions', JSON.stringify(existing.slice(0, 30)));
              } catch {}

              fetch('/api/sessions/history', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  title: sessionTitle,
                  durationSec: sessionDuration,
                  items: interviewQAs
                })
              }).then(res => res.json()).then(data => {
                const histId = data.session?.id || data.id;
                if (histId) {
                  try { localStorage.setItem('ghostboard_last_history_id', histId); } catch {}
                }
              }).catch(console.error);

              toast.success(hudToasts.audioStopped);
            } else {
              toast.info(hudToasts.audioStopped);
            }
          }}
          onTriggerScreenshot={handleTriggerScreenshot}
          onToggleHistory={() => setIsHistoryOpen(true)}
          onToggleFreeze={() => {
            const nextFrozen = !isFrozen;
            setIsFrozen(nextFrozen);
            isFrozenRef.current = nextFrozen;
            if (!nextFrozen) {
              setPendingNewCount(0);
              pendingNewCountRef.current = 0;
              if (interviewQAs.length > 0) setActiveQAId(interviewQAs[0].id);
            }
          }}
          onToggleConcise={handleToggleConcise}
          onTogglePanic={() => setIsPanicShieldActive((p) => !p)}
          onOpenSoundCheck={() => setIsSoundCheckOpen(true)}
        />
      )}

      {isHistoryOpen && (
        <StealthHistoryDrawer
          isOpen={isHistoryOpen}
          onClose={() => setIsHistoryOpen(false)}
          questions={interviewQAs}
          activeId={activeQAId}
          onSelectQA={(id) => setActiveQAId(id)}
          onClearHistory={() => setInterviewQAs([])}
        />
      )}

      {isQuickTestsOpen && (
        <StealthQuickTestsDrawer
          isOpen={isQuickTestsOpen}
          onClose={() => setIsQuickTestsOpen(false)}
          onInjectTest={(q) => processAggregatedQuestion(q, true)}
        />
      )}

      {isProfileOpen && (
        <CandidateProfileModal
          isOpen={isProfileOpen}
          onClose={() => setIsProfileOpen(false)}
          onSave={(p) => {
            setCandidateProfile(p);
            candidateProfileRef.current = p;
          }}
          locale={locale}
        />
      )}

      <SoundCheckModal
        isOpen={isSoundCheckOpen}
        onClose={() => setIsSoundCheckOpen(false)}
        isCapturing={isCapturing}
        liveVolume={liveVolume}
        liveTranscript={liveTranscript}
        onStartCapture={startCapture}
        onStopCapture={stopCapture}
        audioSource={audioSource}
        candidateLiveTranscript={candidateLiveTranscript}
      />

      <TrialLimitModal
        isOpen={showTrialLimitModal}
        onClose={() => setShowTrialLimitModal(false)}
        onUpgradeToPro={() => router.push('/pricing')}
        onActivateDemoPro={() => {
          setUserPlan('pro');
          userPlanRef.current = 'pro';
          try { localStorage.setItem('ghostboard_plan', 'pro'); } catch {}
          setShowTrialLimitModal(false);
          toast.success(hudToasts.demoProActive);
        }}
      />

      <AudioSetupWizard
        isOpen={isAudioWizardOpen}
        onClose={() => setIsAudioWizardOpen(false)}
        onComplete={() => {
          setIsAudioWizardOpen(false);
          try {
            localStorage.setItem('ghostboard_audio_setup_done', 'true');
          } catch {}
          startCapture(audioSource);
        }}
        isCapturing={isCapturing}
        liveVolume={liveVolume}
        liveTranscript={liveTranscript}
        onStartCapture={(source) => startCapture(source)}
        onStopCapture={stopCapture}
      />

      <CompanionQRModal
        isOpen={isCompanionQROpen}
        onClose={() => setIsCompanionQROpen(false)}
      />
    </SubpageStripesContainer>
  );
}
