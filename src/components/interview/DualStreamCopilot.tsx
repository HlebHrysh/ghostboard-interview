'use client';

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  Copy,
  Check,
  Mic,
  Headphones,
  Sparkles,
  Snowflake,
  ChevronLeft,
  ChevronRight,
  Minus,
  Plus,
  Code2,
  Lightbulb,
  MessagesSquare,
  ScrollText,
  Radio,
  Zap,
  ExternalLink,
  Maximize2,
  ChevronDown,
  ChevronUp,
  Layers,
} from 'lucide-react';

import { useCopilotAI } from '@/hooks/useCopilotAI';
import { useAudioCapture } from '@/hooks/useAudioCapture';
import { InterviewQAItem } from '@/types/interview';
import { useInterviewHotkeys } from '@/hooks/useInterviewHotkeys';
import { useScreenshotAI } from '@/hooks/useScreenshotAI';
import { useLocale } from '@/contexts/LocaleContext';
import { getHudTranslations } from '@/lib/hudI18n';
import { useDocumentPiP } from '@/hooks/useDocumentPiP';
import { DocumentPiPPrompter } from '@/components/interview/DocumentPiPPrompter';

import CandidateProfileModal, {
  CandidateProfile,
  getStoredCandidateProfile,
  DEFAULT_CANDIDATE_PROFILE,
} from '@/components/CandidateProfileModal';
import { StealthHeaderHUD } from '@/components/interview/StealthHeaderHUD';
import { EyelineNotch } from '@/components/interview/EyelineNotch';
import { StealthDisguise } from '@/components/interview/StealthDisguise';
import { StealthCommandDock } from '@/components/interview/StealthCommandDock';
import { StealthHistoryDrawer } from '@/components/interview/StealthHistoryDrawer';
import { getLuxTranslations } from '@/lib/luxI18n';
import { GlowBadge } from '@/components/ui/lux/primitives';
import { TrialLimitModal } from '@/components/interview/TrialLimitModal';
import { SoundCheckModal } from '@/components/interview/SoundCheckModal';
import { EyeLineTeleprompter } from '@/components/interview/EyeLineTeleprompter';
import { CompanionQRModal } from '@/components/interview/CompanionQRModal';
import { AudioSetupWizard } from '@/components/onboarding/AudioSetupWizard';
import { SubpageStripesContainer } from '@/components/ui/SubpageStripesContainer';

// Technical terms highlighted inside the live dialogue feed
const TECH_TERMS_REGEX =
  /\b(PostgreSQL|MySQL|Redis|Kafka|RabbitMQ|Docker|Kubernetes|K8s|FastAPI|Django|React|Next\.js|Node\.js|TypeScript|Python|Golang|Rust|GraphQL|gRPC|REST|WebSockets?|SSE|Microservices|Prisma|CI\/CD|AWS|GCP|Azure|Nginx|Linux|ACID|CAP|OAuth|JWT|Tailwind)\b/gi;

function highlightTech(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  const re = new RegExp(TECH_TERMS_REGEX.source, 'gi');
  while ((m = re.exec(text))) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    parts.push(
      <span key={m.index} className="text-white font-semibold underline decoration-white/25 underline-offset-4">
        {m[0]}
      </span>
    );
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

function formatPillarAnchor(text: string): React.ReactNode {
  const colonIdx = text.indexOf(':');
  if (colonIdx > 0 && colonIdx <= 45) {
    const anchor = text.slice(0, colonIdx);
    const rest = text.slice(colonIdx);
    return (
      <>
        <strong className="font-bold text-white tracking-tight mr-1">{highlightTech(anchor)}</strong>
        <span className="text-zinc-200">{highlightTech(rest)}</span>
      </>
    );
  }
  const dashMatch = text.match(/^([^-—]{3,35})\s*[-—]\s*(.*)$/);
  if (dashMatch) {
    return (
      <>
        <strong className="font-bold text-white tracking-tight">{highlightTech(dashMatch[1])}</strong>
        <span className="text-zinc-400 mx-1">—</span>
        <span className="text-zinc-200">{highlightTech(dashMatch[2])}</span>
      </>
    );
  }
  const words = text.split(' ');
  if (words.length > 3) {
    const anchor = words.slice(0, 3).join(' ');
    const rest = ' ' + words.slice(3).join(' ');
    return (
      <>
        <strong className="font-bold text-white tracking-tight">{highlightTech(anchor)}</strong>
        <span className="text-zinc-200">{highlightTech(rest)}</span>
      </>
    );
  }
  return <span className="text-zinc-200">{highlightTech(text)}</span>;
}

type FeedItem =
  | { kind: 'interviewer'; id: string; text: string; ts: number; qaId: string }
  | { kind: 'candidate'; id: string; text: string; ts: number };

export interface DualStreamCopilotProps {
  onPanicExit?: () => void;
}

const REFINE_KEYS = ['under_the_hood', 'code', 'shorter', 're_angle'] as const;

const BRIDGE_PHRASES: Record<string, string[]> = {
  uk: [
    "Це ключовий архітектурний компроміс. У нашому продакшн-стеку ми зазвичай підходили до цього з двох ракурсів...",
    "Дуже практичне запитання. Тут важливо розділити рівень протоколу та рівень внутрішньої пам'яті...",
    "У моєму досвіді рішення завжди залежить від профілю навантаження — чи оптимізуємо затримку (latency), чи пропускну здатність...",
  ],
  en: [
    "That's a fundamental architectural trade-off. In our production environment, we approached this from two core perspectives...",
    "Great practical question. The key here is separating the protocol layer from the runtime memory mechanics...",
    "In my experience, the optimal approach strictly depends on whether we prioritize tail latency or high throughput...",
  ],
  ru: [
    "Это ключевой архитектурный компромисс. В нашем продакшн-стеке мы обычно подходили к этому с двух ракурсов...",
    "Очень практичный вопрос. Здесь важно разделить уровень протокола и уровень работы с памятью...",
  ],
};

export const DualStreamCopilot: React.FC<DualStreamCopilotProps> = ({ onPanicExit }) => {
  const router = useRouter();
  const { locale } = useLocale();
  const hudT = getHudTranslations(locale).transcript;
  const hudAnswer = getHudTranslations(locale).answer;
  const hudToasts = getHudTranslations(locale).toasts;
  const luxT = getLuxTranslations(locale);

  // ── Document Picture-in-Picture Always-On-Top Window ──
  const { isSupported: isPiPSupported, isOpen: isPiPOpen, pipContainer, togglePiP, closePiP } = useDocumentPiP({
    title: 'Ghostboard Teleprompter · Always-on-Top',
  });

  // ── Emergency Bridge Mode Phrase State ──
  const [isBridgeActive, setIsBridgeActive] = useState(false);
  const [bridgePhrase, setBridgePhrase] = useState('');
  const bridgeTimerRef = useRef<NodeJS.Timeout | null>(null);

  // ── Shared session state (same model as the Classic HUD) ──
  const [sessionDuration, setSessionDuration] = useState(0);
  const speechLanguageRef = useRef<string>('auto');
  const outputLanguageRef = useRef<string>('auto');

  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isSoundCheckOpen, setIsSoundCheckOpen] = useState(false);
  const [isCompanionQROpen, setIsCompanionQROpen] = useState(false);
  const [isEyeLineActive, setIsEyeLineActive] = useState(false);
  const [isPanicShieldActive, setIsPanicShieldActive] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isAudioWizardOpen, setIsAudioWizardOpen] = useState(false);

  const [isFrozen, setIsFrozen] = useState(false);
  const isFrozenRef = useRef(false);
  const [isConcise, setIsConcise] = useState(false);
  const isConciseRef = useRef(false);
  const [triggerMode, setTriggerMode] = useState<'auto' | 'enter'>('auto');
  const triggerModeRef = useRef<'auto' | 'enter'>('auto');

  const [userPlan, setUserPlan] = useState<'free' | 'pro' | 'lifetime'>('free');
  const userPlanRef = useRef<'free' | 'pro' | 'lifetime'>('free');
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [showTrialLimitModal, setShowTrialLimitModal] = useState(false);

  const [sessionMode, setSessionMode] = useState<'interview' | 'meeting'>('interview');
  const sessionModeRef = useRef<'interview' | 'meeting'>('interview');

  const [candidateProfile, setCandidateProfile] = useState<CandidateProfile>(DEFAULT_CANDIDATE_PROFILE);
  const candidateProfileRef = useRef<CandidateProfile>(DEFAULT_CANDIDATE_PROFILE);
  const hudBroadcastRef = useRef<BroadcastChannel | null>(null);

  // ── Dual-stream specific UI state ──
  const [fontSize, setFontSize] = useState(20);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [isCodeExpanded, setIsCodeExpanded] = useState(true);
  const [mobileTab, setMobileTab] = useState<'hearing' | 'prompter'>('hearing');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [readLockProgress, setReadLockProgress] = useState(0);
  const prompterRef = useRef<HTMLDivElement | null>(null);
  const feedRef = useRef<HTMLDivElement | null>(null);

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
    pendingNewCountRef,
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
      if (localStorage.getItem('ghostboard_audio_setup_done') !== 'true') {
        setIsAudioWizardOpen(true);
      } else {
        startCapture(source);
      }
    } catch {
      startCapture(source);
    }
  };

  const { isAnalyzingScreenshot, handleTriggerScreenshot, handleTriggerScreenshotRef } = useScreenshotAI({
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
    if (next === 'enter') toast.info(hudToasts.enterMode);
    else toast.success(hudToasts.autoMode);
  };

  const handleToggleConcise = () => {
    const next = !isConciseRef.current;
    isConciseRef.current = next;
    setIsConcise(next);
    toast.info(next ? hudToasts.conciseOn : hudToasts.detailedOn);
  };

  const handleToggleFreeze = () => {
    const next = !isFrozenRef.current;
    isFrozenRef.current = next;
    setIsFrozen(next);
    if (!next) {
      setPendingNewCount(0);
      pendingNewCountRef.current = 0;
      if (interviewQAs.length > 0) setActiveQAId(interviewQAs[0].id);
    }
  };

  const handleToggleTriggerModeRef = useRef(handleToggleTriggerMode);
  const handleToggleConciseRef = useRef(handleToggleConcise);
  const handleManualEnterTriggerRef = useRef(() => handleManualEnterTrigger(liveTranscript));

  useEffect(() => {
    handleToggleTriggerModeRef.current = handleToggleTriggerMode;
    handleToggleConciseRef.current = handleToggleConcise;
    handleManualEnterTriggerRef.current = () => handleManualEnterTrigger(liveTranscript);
  });

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

  const handleTriggerBridge = useCallback(() => {
    const lang = outputLanguageRef.current === 'en' ? 'en' : 'uk';
    const list = BRIDGE_PHRASES[lang] || BRIDGE_PHRASES.uk;
    const phrase = list[Math.floor(Math.random() * list.length)];
    setBridgePhrase(phrase);
    setIsBridgeActive(true);
    toast.info('⚡ Bridge phrase: говоріть цю фразу впевнено!', { duration: 4000 });

    if (bridgeTimerRef.current) clearTimeout(bridgeTimerRef.current);
    bridgeTimerRef.current = setTimeout(() => {
      setIsBridgeActive(false);
    }, 9000);
  }, []);

  // Extra hotkeys: font zoom & emergency bridge
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === '=' || e.key === '+') setFontSize((s) => Math.min(32, s + 2));
      else if (e.key === '-') setFontSize((s) => Math.max(14, s - 2));
      else if (e.key.toLowerCase() === 'b') handleTriggerBridge();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleTriggerBridge]);

  // Cross-device SSE synchronization with Desktop HUD & Companion
  useEffect(() => {
    let sse: EventSource | null = null;
    try {
      sse = new EventSource('/api/companion/stream?device=web');
      sse.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'NEW_QA' && data.payload) {
            const p = data.payload;
            const newQA: InterviewQAItem = {
              id: p.id || `qa-${Date.now()}`,
              timecode: p.timecode || new Date(p.timestamp || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              question: p.question || '',
              quickAnswer: p.quickAnswer || p.shortAnswer || p.answer || '',
              hints: Array.isArray(p.hints) && p.hints.length > 0 ? p.hints : (Array.isArray(p.bullets) ? p.bullets : []),
              codeSnippet: p.codeSnippet || p.code || undefined,
              tag: p.tag || 'DESKTOP-SYNC',
              timestamp: p.timestamp || Date.now(),
            };

            setInterviewQAs((prev) => {
              if (prev.some((q) => q.id === newQA.id)) {
                return prev.map((q) => (q.id === newQA.id ? { ...q, ...newQA } : q));
              }
              return [newQA, ...prev];
            });

            if (!isFrozenRef.current) {
              setActiveQAId(newQA.id);
              activeQAIdRef.current = newQA.id;
            } else {
              setPendingNewCount((c) => c + 1);
            }
          }
        } catch {}
      };
    } catch {}

    return () => {
      if (sse) sse.close();
    };
  }, [setInterviewQAs, setActiveQAId, setPendingNewCount, isFrozenRef, activeQAIdRef]);

  // Read-lock countdown for freshly delivered answer
  useEffect(() => {
    if (!activeQAId) {
      setReadLockProgress(0);
      return;
    }
    setReadLockProgress(1);
    const start = Date.now();
    const interval = setInterval(() => {
      const progress = Math.max(0, 1 - (Date.now() - start) / 15000);
      setReadLockProgress(progress);
      if (progress <= 0) clearInterval(interval);
    }, 150);
    return () => clearInterval(interval);
  }, [activeQAId]);

  // Init: profile, language prefs, auth, trigger mode
  useEffect(() => {
    const stored = getStoredCandidateProfile();
    setCandidateProfile(stored);
    candidateProfileRef.current = stored;

    try {
      const params = new URLSearchParams(window.location.search);
      const modal = params.get('modal');
      if (modal === 'soundcheck') setIsSoundCheckOpen(true);
      else if (modal === 'profile') setIsProfileOpen(true);
      else if (modal === 'companion') setIsCompanionQROpen(true);

      const savedLang = localStorage.getItem('ghostboard_speech_language');
      const allSpeechLangs = ['uk', 'en', 'pl', 'de', 'fr', 'es', 'pt', 'it', 'cs', 'nl', 'ru', 'auto'];
      if (savedLang && allSpeechLangs.includes(savedLang)) speechLanguageRef.current = savedLang;

      const savedOut = localStorage.getItem('ghostboard_output_language');
      const allLangs = ['uk', 'en', 'pl', 'de', 'fr', 'es', 'pt', 'it', 'cs', 'nl', 'auto'];
      outputLanguageRef.current =
        savedOut && allLangs.includes(savedOut) ? savedOut : locale === 'ua' ? 'uk' : locale;

      const savedMode = localStorage.getItem('ghostboard_trigger_mode');
      if (savedMode === 'auto' || savedMode === 'enter') {
        setTriggerMode(savedMode);
        triggerModeRef.current = savedMode;
      }
    } catch {}

    try {
      const params = new URLSearchParams(window.location.search);
      const up = params.get('upgrade');
      if (up === 'pro_activated' || up === 'success') {
        const target: 'pro' | 'lifetime' = params.get('plan') === 'lifetime' ? 'lifetime' : 'pro';
        setUserPlan(target);
        userPlanRef.current = target;
        try { localStorage.setItem('ghostboard_plan', target); } catch {}
        toast.success(target === 'lifetime' ? '💎 Lifetime Founder Pass activated!' : '🎉 Pro Plan activated!');
        window.history.replaceState({}, '', '/interview');
      }
    } catch {}

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
      .catch(() => router.replace('/auth/login?from=/interview'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale]);

  const activeIndex = Math.max(0, interviewQAs.findIndex((q) => q.id === activeQAId));
  const activeQA = interviewQAs[activeIndex] || null;

  // New answer arrived → reset teleprompter to top, nudge mobile users to the prompter
  useEffect(() => {
    if (!activeQA) return;
    prompterRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    if (typeof window !== 'undefined' && window.innerWidth < 1024) setMobileTab('prompter');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeQA?.id]);

  // Chronological dialogue feed (QA list is newest-first)
  const feed: FeedItem[] = useMemo(() => {
    const items: FeedItem[] = [];
    [...interviewQAs].reverse().forEach((qa, i) => {
      items.push({ kind: 'interviewer', id: `q-${qa.id}`, qaId: qa.id, text: qa.question, ts: qa.timestamp ?? i });
    });
    candidateSpeechHistory.forEach((c) => {
      items.push({ kind: 'candidate', id: `c-${c.id}`, text: c.text, ts: c.timestamp });
    });
    return items.sort((a, b) => a.ts - b.ts);
  }, [interviewQAs, candidateSpeechHistory]);

  useEffect(() => {
    feedRef.current?.scrollTo({ top: feedRef.current.scrollHeight, behavior: 'smooth' });
  }, [feed.length, liveTranscript, candidateLiveTranscript]);

  const handleCopy = useCallback(
    (text: string, id: string) => {
      navigator.clipboard.writeText(text);
      setCopiedId(id);
      toast.success(hudToasts.copied);
      setTimeout(() => setCopiedId((p) => (p === id ? null : p)), 1500);
    },
    [hudToasts.copied]
  );

  const goToQA = (delta: number) => {
    const next = interviewQAs[activeIndex + delta];
    if (!next) return;
    setActiveQAId(next.id);
  };

  const handleStop = () => {
    stopCapture();
    if (interviewQAs.length > 0) {
      const title = `Interview ${new Date().toLocaleDateString()} (${candidateProfileRef.current.role || 'Senior Engineer'})`;
      try {
        const existing = JSON.parse(localStorage.getItem('ghostboard_saved_sessions') || '[]');
        existing.unshift({
          id: 'sess_' + Date.now(),
          title,
          timestamp: Date.now(),
          durationSec: sessionDuration,
          questionsCount: interviewQAs.length,
          items: [...interviewQAs],
        });
        localStorage.setItem('ghostboard_saved_sessions', JSON.stringify(existing.slice(0, 30)));
      } catch {}
      fetch('/api/sessions/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, durationSec: sessionDuration, items: interviewQAs }),
      })
        .then((r) => r.json())
        .then((data) => {
          const id = data.session?.id || data.id;
          if (id) try { localStorage.setItem('ghostboard_last_history_id', id); } catch {}
        })
        .catch(console.error);
      toast.success(hudToasts.audioStopped);
    } else {
      toast.info(hudToasts.audioStopped);
    }
  };

  const sampleQuestion = 'Explain optimistic vs pessimistic locking in databases and when to use each.';
  const mainAnswer = activeQA ? activeQA.startHook || activeQA.quickAnswer || '' : '';
  const volBar = (v: number) => Math.max(4, Math.min(100, Math.round(v)));

  if (isAuthChecking) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-2 border-white/10 border-t-white animate-spin" />
      </div>
    );
  }

  const hasAnything = isCapturing || interviewQAs.length > 0;

  // ───────────────────────── Panes ─────────────────────────
  const hearingPane = (
    <section className="flex flex-col min-h-0 h-full rounded-3xl border border-white/[0.07] bg-gradient-to-b from-white/[0.04] to-white/[0.01] backdrop-blur-xl overflow-hidden">
      <header className="flex items-center justify-between px-5 py-3.5 border-b border-white/[0.06]">
        <div className="flex items-center gap-2.5">
          <MessagesSquare className="w-4 h-4 text-zinc-400" />
          <h2 className="text-[11px] font-mono font-bold uppercase tracking-[0.2em] text-zinc-300">Live Dialogue</h2>
        </div>
        <div className="flex items-center gap-3 text-[10px] font-mono text-zinc-500">
          <span className="flex items-center gap-1.5" title="Interviewer level">
            <Headphones className="w-3 h-3" />
            <span className="w-14 h-1 rounded-full bg-white/10 overflow-hidden">
              <span className="block h-full bg-white transition-all duration-100" style={{ width: `${isCapturing ? volBar(interviewerVolume) : 0}%` }} />
            </span>
          </span>
          <span className="flex items-center gap-1.5" title="Your mic level">
            <Mic className="w-3 h-3" />
            <span className="w-14 h-1 rounded-full bg-white/10 overflow-hidden">
              <span className="block h-full bg-zinc-400 transition-all duration-100" style={{ width: `${isCapturing ? volBar(candidateVolume) : 0}%` }} />
            </span>
          </span>
        </div>
      </header>

      {/* Focus Mode Condensed Live Ticker */}
      {isFocusMode && (
        <div className="px-4 py-2.5 bg-cyan-950/25 border-b border-cyan-500/20 flex items-center gap-2 text-xs">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shrink-0" />
          <span className="text-[10px] font-mono text-cyan-300 uppercase font-bold shrink-0">Фокус-ефір:</span>
          <p className="text-zinc-200 text-xs truncate italic">
            {liveTranscript || activeQA?.question || 'Очікування мовлення співрозмовника...'}
          </p>
        </div>
      )}

      <div ref={feedRef} className="flex-1 overflow-y-auto px-4 sm:px-5 py-5 space-y-4 scroll-smooth">
        {!hasAnything && feed.length === 0 && (
          <div className="h-full min-h-[260px] flex flex-col items-center justify-center text-center gap-4 px-4">
            <div className="w-14 h-14 rounded-2xl bg-white/[0.05] border border-white/10 flex items-center justify-center">
              <Radio className="w-6 h-6 text-zinc-300" />
            </div>
            <div>
              <p className="text-base font-semibold text-white">Dual-stream is ready</p>
              <p className="text-sm text-zinc-500 mt-1 max-w-sm">
                Start listening — interviewer speech appears here, the answer lands in the teleprompter.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              <button
                type="button"
                onClick={() => handleStartCaptureRequest()}
                className="px-4 py-2 rounded-xl bg-white text-black text-xs font-mono font-bold hover:bg-zinc-200 transition cursor-pointer"
              >
                Start listening
              </button>
              <button
                type="button"
                onClick={() => processAggregatedQuestion(sampleQuestion, true)}
                className="px-4 py-2 rounded-xl bg-white/[0.05] border border-white/10 text-zinc-300 text-xs font-mono hover:bg-white/10 transition cursor-pointer flex items-center gap-1.5"
              >
                <Sparkles className="w-3 h-3" /> {hudT.sampleQuestionBtn}
              </button>
            </div>
          </div>
        )}

        <AnimatePresence initial={false}>
          {feed.map((item) => {
            const isInterviewer = item.kind === 'interviewer';
            const isActive = item.kind === 'interviewer' && item.qaId === activeQA?.id;
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className={`flex ${isInterviewer ? 'justify-start' : 'justify-end'}`}
              >
                <button
                  type="button"
                  disabled={!isInterviewer}
                  onClick={() => item.kind === 'interviewer' && setActiveQAId(item.qaId)}
                  className={`max-w-[88%] text-left px-4 py-3 rounded-2xl border text-sm leading-relaxed transition-colors ${
                    isInterviewer
                      ? `bg-[#101014] ${isActive ? 'border-white/40' : 'border-white/[0.08] hover:border-white/20'} text-zinc-100 rounded-bl-md cursor-pointer`
                      : 'bg-white/[0.06] border-white/[0.06] text-zinc-300 rounded-br-md cursor-default'
                  }`}
                >
                  <span className="block text-[9px] font-mono uppercase tracking-widest text-zinc-500 mb-1">
                    {isInterviewer ? 'Interviewer' : 'You'}
                  </span>
                  {highlightTech(item.text)}
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {liveTranscript && (
          <div className="flex justify-start">
            <div className="max-w-[88%] px-4 py-3 rounded-2xl rounded-bl-md border border-dashed border-white/25 bg-white/[0.03] text-sm text-zinc-200">
              <span className="flex items-center gap-1.5 text-[9px] font-mono uppercase tracking-widest text-zinc-400 mb-1">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" /> Interviewer · live
              </span>
              {highlightTech(liveTranscript)}
              <span className="inline-block w-1.5 h-4 bg-white ml-1 align-middle animate-pulse" />
            </div>
          </div>
        )}
        {candidateLiveTranscript && (
          <div className="flex justify-end">
            <div className="max-w-[88%] px-4 py-3 rounded-2xl rounded-br-md border border-dashed border-white/15 bg-white/[0.03] text-sm text-zinc-400">
              <span className="flex items-center gap-1.5 text-[9px] font-mono uppercase tracking-widest text-zinc-500 mb-1">
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-pulse" /> You · live
              </span>
              {candidateLiveTranscript}
            </div>
          </div>
        )}
        {isCapturing && !liveTranscript && !candidateLiveTranscript && feed.length === 0 && (
          <div className="text-center text-xs font-mono text-zinc-500 py-10 flex flex-col items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
            {hudT.listeningPlaceholder}
            {!hasTabAudio && audioSource === 'tab' && (
              <button
                type="button"
                onClick={repickTabAudio}
                className="mt-2 px-3 py-1.5 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-200 text-[11px] font-bold cursor-pointer"
              >
                ⚠ Enable &quot;Share tab audio&quot;
              </button>
            )}
          </div>
        )}
      </div>

      {triggerMode === 'enter' && liveTranscript && (
        <div className="px-4 py-3 border-t border-white/[0.06]">
          <button
            type="button"
            onClick={() => handleManualEnterTriggerRef.current()}
            className="w-full py-2 rounded-xl bg-white text-black text-xs font-mono font-bold hover:bg-zinc-200 transition cursor-pointer"
          >
            {hudT.answerNowBtn} ↵
          </button>
        </div>
      )}
    </section>
  );

  const prompterPane = (
    <section className="flex flex-col min-h-0 h-full rounded-3xl border border-white/[0.09] bg-[#0A0A0D] shadow-[0_24px_60px_rgba(0,0,0,0.6)] overflow-hidden relative">
      <header className="flex items-center justify-between gap-2 px-5 py-3.5 border-b border-white/[0.06]">
        <div className="flex items-center gap-2.5 min-w-0">
          <ScrollText className="w-4 h-4 text-zinc-400 shrink-0" />
          <h2 className="text-[11px] font-mono font-bold uppercase tracking-[0.2em] text-zinc-300">Teleprompter</h2>
          {isCopilotGenerating && (
            <span className="flex items-center gap-1.5 text-[10px] font-mono text-zinc-400">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" /> generating…
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 text-zinc-400">
          {interviewQAs.length > 1 && (
            <>
              <button type="button" onClick={() => goToQA(1)} disabled={activeIndex >= interviewQAs.length - 1} className="p-1.5 rounded-lg hover:bg-white/10 disabled:opacity-30 cursor-pointer" title="Previous answer">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-[10px] font-mono tabular-nums">
                {interviewQAs.length - activeIndex}/{interviewQAs.length}
              </span>
              <button type="button" onClick={() => goToQA(-1)} disabled={activeIndex <= 0} className="p-1.5 rounded-lg hover:bg-white/10 disabled:opacity-30 cursor-pointer" title="Next answer">
                <ChevronRight className="w-4 h-4" />
              </button>
              <span className="w-px h-4 bg-white/10 mx-1" />
            </>
          )}
          {/* Focus Mode Quick Switcher */}
          <button
            type="button"
            onClick={() => setIsFocusMode((prev) => !prev)}
            className={`px-2 py-1 rounded-lg cursor-pointer transition flex items-center gap-1.5 text-xs font-mono font-medium ${
              isFocusMode
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-[0_0_12px_rgba(6,182,212,0.25)] font-bold'
                : 'bg-white/[0.04] hover:bg-white/[0.08] text-zinc-400 hover:text-white border border-white/[0.08]'
            }`}
            title="Focus Mode (78% Prompter Width)"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Focus</span>
          </button>

          {/* Typography Controls (A- / A+) */}
          <div className="flex items-center gap-0.5 bg-white/[0.03] border border-white/[0.08] rounded-lg p-0.5">
            <button
              type="button"
              onClick={() => setFontSize((s) => Math.max(14, s - 2))}
              className="px-1.5 py-0.5 rounded hover:bg-white/10 text-xs font-mono font-bold text-zinc-400 hover:text-white cursor-pointer"
              title="Зменшити шрифт (A-)"
            >
              A-
            </button>
            <span className="text-[10px] font-mono w-4 text-center text-zinc-400 tabular-nums">{fontSize}</span>
            <button
              type="button"
              onClick={() => setFontSize((s) => Math.min(30, s + 2))}
              className="px-1.5 py-0.5 rounded hover:bg-white/10 text-xs font-mono font-bold text-zinc-400 hover:text-white cursor-pointer"
              title="Збільшити шрифт (A+)"
            >
              A+
            </button>
          </div>

          <button type="button" onClick={handleToggleFreeze} className={`ml-0.5 p-1.5 rounded-lg cursor-pointer transition ${isFrozen ? 'bg-cyan-500/20 text-cyan-300' : 'hover:bg-white/10'}`} title="Freeze (Space)">
            <Snowflake className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleTriggerBridge}
            className={`p-1.5 rounded-lg cursor-pointer transition flex items-center gap-1 ${
              isBridgeActive ? 'bg-amber-500/25 text-amber-300 border border-amber-500/35' : 'hover:bg-amber-500/15 text-amber-400'
            }`}
            title="Emergency Bridge Phrase [B] (Виграти час)"
          >
            <Zap className="w-3.5 h-3.5" />
            <span className="text-[10px] font-mono hidden md:inline">Bridge [B]</span>
          </button>
          {isPiPSupported && (
            <button
              type="button"
              onClick={togglePiP}
              className={`p-1.5 rounded-lg cursor-pointer transition flex items-center gap-1 ${
                isPiPOpen ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'hover:bg-white/10 text-zinc-300'
              }`}
              title="Always-on-Top Window (Document Picture-in-Picture) - поверх Zoom/Teams"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="text-[10px] font-mono hidden md:inline">PiP</span>
            </button>
          )}
        </div>
      </header>

      {readLockProgress > 0 && activeQA && (
        <div className="h-0.5 bg-white/[0.04]">
          <div className="h-full bg-white/80 transition-all duration-150 ease-linear" style={{ width: `${Math.round(readLockProgress * 100)}%` }} />
        </div>
      )}

      {isFrozen && (
        <div className="px-5 py-2 bg-cyan-950/40 border-b border-cyan-500/20 flex items-center justify-between text-[11px] font-mono text-cyan-200">
          <span className="flex items-center gap-2 font-bold uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" /> {hudAnswer.frozenBanner}
          </span>
          {pendingNewCount > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-cyan-500 text-black font-extrabold text-[10px]">
              +{pendingNewCount} {hudAnswer.newInQueue}
            </span>
          )}
        </div>
      )}

      <div ref={prompterRef} className="flex-1 overflow-y-auto px-6 sm:px-8 py-6 scroll-smooth">
        {/* Emergency Bridge Banner */}
        {isBridgeActive && bridgePhrase && (
          <div className="mb-5 p-4 rounded-2xl bg-amber-500/15 border border-amber-500/35 text-amber-100 flex items-start gap-3 shadow-xl animate-in fade-in duration-150">
            <Zap className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="text-[10px] font-mono uppercase tracking-widest text-amber-300 font-bold block">
                ⚡ Speak Now · Фраза для виграшу часу (Bridge):
              </span>
              <p className="text-sm sm:text-base font-semibold text-white leading-relaxed font-sans">
                {bridgePhrase}
              </p>
            </div>
          </div>
        )}

        <AnimatePresence mode="wait">
          {activeQA ? (
            <motion.article
              key={activeQA.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="space-y-6"
              style={{ fontSize }}
            >
              <p className="text-[11px] font-mono text-zinc-500 leading-relaxed" style={{ fontSize: 12 }}>
                Q · {activeQA.question}
              </p>

              {activeQA.nativeTranslation && (
                <div className="space-y-1.5">
                  <GlowBadge tone="indigo">{luxT.translation}</GlowBadge>
                  <p className="font-semibold leading-[1.4] tracking-tight text-indigo-100">{activeQA.nativeTranslation}</p>
                </div>
              )}

              {/* Phase 1: HOOK / Opening Phrase (Rule of 2 Seconds) */}
              {mainAnswer && (
                <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-amber-500/[0.08] via-amber-500/[0.03] to-transparent border border-amber-500/30 shadow-[0_4px_24px_rgba(245,158,11,0.06)] relative group">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-mono uppercase tracking-widest text-amber-400 font-bold flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-amber-400" /> Фаза 1 · Голосовий старт (Hook)
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy(mainAnswer, 'main')}
                      className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                      title="Копіювати"
                    >
                      {copiedId === 'main' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <p className="text-lg sm:text-xl font-semibold text-white leading-relaxed tracking-tight font-sans">
                    &ldquo;{highlightTech(mainAnswer)}&rdquo;
                  </p>
                </div>
              )}

              {/* Phase 2: PILLARS / Key Points (Spacious bullets with bold anchor keywords) */}
              {activeQA.hints && activeQA.hints.length > 0 && (
                <div className="space-y-2.5">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-cyan-400 font-bold flex items-center gap-1.5 px-0.5">
                    <Layers className="w-3.5 h-3.5 text-cyan-400" /> Фаза 2 · Ключові тези (Pillars)
                  </span>
                  <ol className="space-y-2.5">
                    {activeQA.hints.map((hint, i) => (
                      <li
                        key={i}
                        className="p-3 sm:p-3.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.05] border border-white/[0.08] flex items-start gap-3 transition-colors"
                      >
                        <span className="shrink-0 mt-0.5 w-5 h-5 rounded-md bg-cyan-500/15 border border-cyan-500/30 text-[10px] font-mono font-bold text-cyan-300 flex items-center justify-center">
                          {i + 1}
                        </span>
                        <div className="leading-[1.55] text-sm sm:text-base flex-1">
                          {formatPillarAnchor(hint)}
                        </div>
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              {/* Phase 3: DEEP DIVE & Collapsible Code Example */}
              {activeQA.codeSnippet && activeQA.codeSnippet.trim() && (
                <div className="rounded-2xl border border-white/[0.08] bg-[#050608] overflow-hidden">
                  <div className="px-4 py-2 bg-white/[0.03] border-b border-white/[0.06] flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setIsCodeExpanded((prev) => !prev)}
                      className="flex items-center gap-2 text-xs font-mono font-semibold text-emerald-400 hover:text-emerald-300 cursor-pointer"
                    >
                      <Code2 className="w-3.5 h-3.5" />
                      <span>Фаза 3 · Код / Реалізація</span>
                      <span className="text-[10px] text-zinc-500 font-normal">
                        ({activeQA.codeSnippet.trim().split('\n').length} рядків)
                      </span>
                      {isCodeExpanded ? <ChevronUp className="w-3.5 h-3.5 text-zinc-400" /> : <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />}
                    </button>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleCopy(activeQA.codeSnippet!, 'code')}
                        className="text-[10px] font-mono text-zinc-400 hover:text-white flex items-center gap-1 cursor-pointer"
                      >
                        {copiedId === 'code' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedId === 'code' ? 'Copied' : hudAnswer.copy}</span>
                      </button>
                    </div>
                  </div>
                  {isCodeExpanded && (
                    <pre className="p-4 text-zinc-200 font-mono overflow-x-auto leading-relaxed max-h-[320px] scrollbar-thin text-xs sm:text-sm">
                      <code>{activeQA.codeSnippet.trim()}</code>
                    </pre>
                  )}
                </div>
              )}

              {activeQA.deliveryTip && (
                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-violet-500/[0.06] border border-violet-500/20 text-violet-200 text-xs">
                  <Lightbulb className="w-4 h-4 mt-0.5 shrink-0 text-violet-400" />
                  <span className="leading-relaxed">
                    <strong className="text-white font-semibold">Delivery Tip: </strong>
                    {activeQA.deliveryTip}
                  </span>
                </div>
              )}

              <div className="pt-4 border-t border-white/[0.06] flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-600 mr-1" style={{ fontSize: 10 }}>{hudAnswer.refineHeader}</span>
                {REFINE_KEYS.map((key) => {
                  const labels = {
                    under_the_hood: hudAnswer.refineUnderHood,
                    code: hudAnswer.refineCode,
                    shorter: hudAnswer.refineShorter,
                    re_angle: hudAnswer.refineReAngle,
                  } as const;
                  return (
                    <button
                      key={key}
                      type="button"
                      disabled={isCopilotGenerating}
                      onClick={() => handleRefineQA(activeQA.id, key)}
                      className="px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-zinc-300 hover:bg-white/10 hover:text-white transition disabled:opacity-40 cursor-pointer font-mono"
                      style={{ fontSize: 11 }}
                    >
                      {labels[key]}
                    </button>
                  );
                })}
              </div>
            </motion.article>
          ) : isCopilotGenerating ? (
            <div className="space-y-3 animate-pulse">
              <div className="h-5 rounded bg-white/[0.07] w-11/12" />
              <div className="h-5 rounded bg-white/[0.07] w-9/12" />
              <div className="h-5 rounded bg-white/[0.05] w-10/12" />
            </div>
          ) : (
            <div className="h-full min-h-[260px] flex flex-col items-center justify-center text-center text-zinc-600 gap-2">
              <ScrollText className="w-8 h-8" />
              <p className="text-sm">The answer will appear here</p>
            </div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );

  return (
    <SubpageStripesContainer pattern="horizon" glowIntensity={0.05} className="font-sans relative selection:bg-white/20 selection:text-white">
      <StealthDisguise
        isActive={isPanicShieldActive}
        onDeactivate={() => {
          setIsPanicShieldActive(false);
          onPanicExit?.();
        }}
      />
      <EyelineNotch
        isCapturing={isCapturing}
        sttStatus={sttStatus}
        isFrozen={isFrozen}
        isGenerating={isCopilotGenerating}
        level={liveVolume}
        activeQA={activeQA ?? null}
        onToggleFreeze={handleToggleFreeze}
        onManualReconnect={handleManualReconnect}
        onPanic={() => setIsPanicShieldActive((p) => !p)}
        onScreenshot={handleTriggerScreenshot}
      />
      {isEyeLineActive && (
        <EyeLineTeleprompter activeQA={activeQA} onClose={() => setIsEyeLineActive(false)} isCapturing={isCapturing} />
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
        questionCount={interviewQAs.length}
        formatTime={(s) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`}
      />

      {/* Mobile tab switcher */}
      <div className="lg:hidden relative z-10 px-4 pt-3">
        <div className="grid grid-cols-2 p-1 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs font-mono">
          {(['hearing', 'prompter'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setMobileTab(tab)}
              className={`py-2 rounded-lg transition cursor-pointer ${mobileTab === tab ? 'bg-white text-black font-bold' : 'text-zinc-400'}`}
            >
              {tab === 'hearing' ? 'Dialogue' : 'Teleprompter'}
            </button>
          ))}
        </div>
      </div>

      <main className="relative z-10 mx-auto w-full max-w-[1500px] px-3 sm:px-6 pt-3 pb-28 h-[calc(100vh-7rem)] min-h-[520px]">
        <div className={`hidden lg:grid h-full gap-4 transition-all duration-300 ease-out ${
          isFocusMode
            ? 'grid-cols-[minmax(0,2.6fr)_minmax(0,9.4fr)]'
            : 'grid-cols-[minmax(0,5fr)_minmax(0,7fr)]'
        }`}>
          {hearingPane}
          {prompterPane}
        </div>
        <div className="lg:hidden h-full">{mobileTab === 'hearing' ? hearingPane : prompterPane}</div>
      </main>

      <StealthCommandDock
        isCapturing={isCapturing}
        triggerMode={triggerMode}
        audioSource={audioSource}
        sessionDuration={sessionDuration}
        hasActiveQA={!!activeQA}
        isRefining={isCopilotGenerating}
        onRefineQA={(key) => activeQA && handleRefineQA(activeQA.id, key)}
        onToggleAudioSource={() => {
          const next = audioSource === 'tab' ? 'mic' : 'tab';
          setAudioSource(next);
          toast.info(next === 'tab' ? '🌐 Meeting tab + Microphone' : '🎙️ System microphone only');
        }}
        onAnswerNow={() => handleManualEnterTriggerRef.current()}
        onStartCapture={handleStartCaptureRequest}
        onStopCapture={handleStop}
        onTogglePanic={() => setIsPanicShieldActive((p) => !p)}
      />

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
          try { localStorage.setItem('ghostboard_audio_setup_done', 'true'); } catch {}
          startCapture(audioSource);
        }}
        isCapturing={isCapturing}
        liveVolume={liveVolume}
        liveTranscript={liveTranscript}
        onStartCapture={(source) => startCapture(source)}
        onStopCapture={stopCapture}
      />

      <CompanionQRModal isOpen={isCompanionQROpen} onClose={() => setIsCompanionQROpen(false)} />

      {pipContainer && (
        <DocumentPiPPrompter
          container={pipContainer}
          activeQA={activeQA}
          onClose={closePiP}
          onTriggerBridge={handleTriggerBridge}
          isBridgeActive={isBridgeActive}
          bridgePhrase={bridgePhrase}
        />
      )}
    </SubpageStripesContainer>
  );
};

export default DualStreamCopilot;
