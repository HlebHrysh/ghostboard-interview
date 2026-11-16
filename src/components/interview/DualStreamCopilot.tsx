'use client';

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { GhostDetectiveLogo } from '@/components/ui/GhostDetectiveLogo';
import {
  Copy,
  Check,
  Mic,
  Headphones,
  Sparkles,
  Snowflake,
  ChevronLeft,
  ChevronRight,
  Code2,
  Lightbulb,
  MessagesSquare,
  ScrollText,
  Zap,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Layers,
  Lock,
  Crosshair,
  GitMerge,
  Maximize2,
  PanelLeftClose,
  SlidersHorizontal,
  Camera,
  User,
  History,
  QrCode,
  ArrowLeft,
  MessageCircle,
  RotateCcw,
  AlertTriangle,
} from 'lucide-react';

import { useCopilotAI } from '@/hooks/useCopilotAI';
import { evaluateSpeechIntent } from '@/lib/speechIntentGate';
import { useAudioCapture } from '@/hooks/useAudioCapture';
import { InterviewQAItem } from '@/types/interview';
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
import { StealthCommandDock } from '@/components/interview/StealthCommandDock';
import { StealthHistoryDrawer } from '@/components/interview/StealthHistoryDrawer';
import { getLuxTranslations } from '@/lib/luxI18n';
import { TrialLimitBanner } from '@/components/interview/TrialLimitModal';
import { CommandPalette, type PaletteCommand } from '@/components/interview/CommandPalette';
import { SoundCheckModal } from '@/components/interview/SoundCheckModal';
import { CompanionQRModal } from '@/components/interview/CompanionQRModal';
import { AudioSetupWizard } from '@/components/onboarding/AudioSetupWizard';
import { SubpageStripesContainer } from '@/components/ui/SubpageStripesContainer';
import {
  cleanStreamText,
  extractCode,
  parseBlocks,
  stripRawMarkdownAsterisks,
  splitBilingualSegments,
  tokenizeInline,
} from '../../../desktop/src/lib/answerParser';
import { highlightCode, TOKEN_CLASS } from '../../../desktop/src/lib/highlight';

// Technical terms highlighted inside the live dialogue feed
const TECH_TERMS_REGEX =
  /\b(PostgreSQL|MySQL|Redis|Kafka|RabbitMQ|Docker|Kubernetes|K8s|FastAPI|Django|React|Next\.js|Node\.js|TypeScript|Python|Golang|Rust|GraphQL|gRPC|REST|WebSockets?|SSE|Microservices|Prisma|CI\/CD|AWS|GCP|Azure|Nginx|Linux|ACID|CAP|OAuth|JWT|Tailwind)\b/gi;
const TECH_TERMS_TEST =
  /\b(PostgreSQL|MySQL|Redis|Kafka|RabbitMQ|Docker|Kubernetes|K8s|FastAPI|Django|React|Next\.js|Node\.js|TypeScript|Python|Golang|Rust|GraphQL|gRPC|REST|WebSockets?|SSE|Microservices|Prisma|CI\/CD|AWS|GCP|Azure|Nginx|Linux|ACID|CAP|OAuth|JWT|Tailwind)\b/i;

function highlightTech(text: string): React.ReactNode[] {
  const cleaned = stripRawMarkdownAsterisks(cleanStreamText(text));
  if (!cleaned) return [];
  if (!TECH_TERMS_TEST.test(cleaned)) {
    return [cleaned];
  }
  const parts: React.ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  const re = new RegExp(TECH_TERMS_REGEX.source, 'gi');
  while ((m = re.exec(cleaned))) {
    if (m.index > last) parts.push(cleaned.slice(last, m.index));
    parts.push(
      <span key={m.index} className="text-white font-semibold underline decoration-white/25 underline-offset-4">
        {m[0]}
      </span>
    );
    last = m.index + m[0].length;
  }
  if (last < cleaned.length) parts.push(cleaned.slice(last));
  return parts;
}

function renderBilingualPhrase(text: string, isBilingualMode = false): React.ReactNode {
  const cleaned = cleanStreamText(text);
  if (!cleaned) return null;
  const segments = splitBilingualSegments(cleaned, isBilingualMode);
  return segments.map((seg, idx) => {
    if (seg.isHint) {
      return (
        <span
          key={idx}
          className="text-zinc-400 text-xs italic mx-1 inline-block select-all font-normal"
          title="Підказка рідною мовою (не читати вголос)"
        >
          {stripRawMarkdownAsterisks(seg.text)}
        </span>
      );
    }
    const tokens = tokenizeInline(seg.text);
    return (
      <span key={idx}>
        {tokens.map((tok, tIdx) => {
          if (tok.type === 'code') {
            return (
              <code
                key={tIdx}
                className="rounded border border-white/10 bg-[#09090b] px-1.5 py-0.5 font-mono text-[0.9em] text-zinc-100"
              >
                {tok.value}
              </code>
            );
          }
          if (tok.type === 'strong') {
            return (
              <strong key={tIdx} className="font-semibold text-white">
                {tok.value}
              </strong>
            );
          }
          if (tok.type === 'em') {
            return (
              <em key={tIdx} className="italic text-zinc-300">
                {tok.value}
              </em>
            );
          }
          return <React.Fragment key={tIdx}>{highlightTech(tok.value)}</React.Fragment>;
        })}
      </span>
    );
  });
}

function formatPillarAnchor(text: string, isBilingualMode = false): React.ReactNode {
  const buffered = cleanStreamText(text);
  // Check for bold anchor pattern: **Anchor**: rest
  const boldMatch = buffered.match(/^\s*(?:[•\-\*]\s*)?\*\*([^*]+)\*\*:?\s*(.*)$/);
  if (boldMatch) {
    const [, anchor, rest] = boldMatch;
    return (
      <>
        <span className="text-white font-semibold bg-white/10 px-1.5 py-0.5 rounded mr-1.5">
          {highlightTech(anchor)}
        </span>
        <span className="text-zinc-200">{renderBilingualPhrase(rest, isBilingualMode)}</span>
      </>
    );
  }
  const colonIdx = buffered.indexOf(':');
  if (colonIdx > 0 && colonIdx <= 45) {
    const anchor = buffered.slice(0, colonIdx).replace(/^[•\-\*]\s*/, '').replace(/^\*\*/, '').replace(/\*\*$/, '');
    const rest = buffered.slice(colonIdx + 1);
    return (
      <>
        <span className="text-white font-semibold bg-white/10 px-1.5 py-0.5 rounded mr-1.5">
          {highlightTech(anchor)}
        </span>
        <span className="text-zinc-200">{renderBilingualPhrase(rest, isBilingualMode)}</span>
      </>
    );
  }
  const dashMatch = buffered.match(/^([^-—]{3,35})\s*[-—]\s*(.*)$/);
  if (dashMatch) {
    return (
      <>
        <span className="text-white font-semibold bg-white/10 px-1.5 py-0.5 rounded mr-1.5">
          {highlightTech(dashMatch[1])}
        </span>
        <span className="text-zinc-400 mx-1">—</span>
        <span className="text-zinc-200">{renderBilingualPhrase(dashMatch[2], isBilingualMode)}</span>
      </>
    );
  }
  const words = buffered.split(' ');
  if (words.length > 3) {
    const anchor = words.slice(0, 3).join(' ');
    const rest = ' ' + words.slice(3).join(' ');
    return (
      <>
        <span className="text-white font-semibold bg-white/10 px-1.5 py-0.5 rounded mr-1.5">
          {highlightTech(anchor)}
        </span>
        <span className="text-zinc-200">{renderBilingualPhrase(rest, isBilingualMode)}</span>
      </>
    );
  }
  return <span className="text-zinc-200">{renderBilingualPhrase(buffered, isBilingualMode)}</span>;
}

function renderInlineTokens(tokens: ReturnType<typeof tokenizeInline>, isBilingualMode = false): React.ReactNode {
  return tokens.map((tok, tIdx) => {
    if (tok.type === 'code') {
      return (
        <code
          key={tIdx}
          className="rounded border border-white/10 bg-[#09090b] px-1.5 py-0.5 font-mono text-[0.9em] text-zinc-100"
        >
          {tok.value}
        </code>
      );
    }
    if (tok.type === 'strong') {
      return (
        <strong key={tIdx} className="font-semibold text-white">
          {tok.value}
        </strong>
      );
    }
    if (tok.type === 'em') {
      return (
        <em key={tIdx} className="italic text-zinc-300">
          {tok.value}
        </em>
      );
    }
    if (isBilingualMode) {
      return <React.Fragment key={tIdx}>{renderBilingualPhrase(tok.value, true)}</React.Fragment>;
    }
    return <React.Fragment key={tIdx}>{highlightTech(tok.value)}</React.Fragment>;
  });
}

type FeedItem =
  | { kind: 'interviewer'; id: string; text: string; ts: number; qaId: string }
  | { kind: 'candidate'; id: string; text: string; ts: number };

export type DualStreamCopilotProps = Record<string, never>;

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

interface DialogueMessageBubbleProps {
  item: {
    id: string;
    speaker: 'interviewer' | 'candidate';
    text: string;
    timestamp: number;
    qaId?: string;
    statusText?: string;
  };
  matchingQA: InterviewQAItem | null;
  qaNumber: number | null;
  isActive: boolean;
  onSelectQA: (qaId: string) => void;
  onAskAI: (text: string, msgId: string) => void;
}

const DialogueMessageBubble = React.memo<DialogueMessageBubbleProps>(({
  item,
  matchingQA,
  qaNumber,
  isActive,
  onSelectQA,
  onAskAI,
}) => {
  const isInterviewer = item.speaker === 'interviewer';

  return (
    <div
      className={`flex flex-col ${isInterviewer ? 'items-start' : 'items-end'} group`}
    >
      <div className="flex items-center gap-1.5 mb-1.5 px-1 flex-wrap">
        {isInterviewer ? (
          <span className="liquid-glass-pill inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold text-zinc-100">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.85)]" />
            <span>Інтерв&apos;юер</span>
          </span>
        ) : (
          <span className="liquid-glass-pill inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold text-zinc-200 ml-auto">
            <span>Ви</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          </span>
        )}
        {item.statusText && (
          <span className="liquid-glass-pill inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-zinc-200">
            <span className="w-1 h-1 rounded-full bg-violet-400" />
            <span>{item.statusText}</span>
          </span>
        )}
        <span className="text-xs text-zinc-400 font-mono tabular-nums">
          {new Date(item.timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          })}
        </span>
        {matchingQA && qaNumber !== null && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSelectQA(matchingQA.id);
            }}
            className="liquid-glass-pill inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold text-emerald-200 hover:text-white hover:border-emerald-400/45 transition cursor-pointer"
            title="Перейти до відповіді ШІ"
          >
            <Zap className="w-3 h-3 text-emerald-300" />
            <span>Відповідь #{qaNumber}</span>
          </button>
        )}
      </div>

      <div
        onClick={() => {
          if (matchingQA) {
            onSelectQA(matchingQA.id);
          } else {
            onAskAI(item.text, item.id);
          }
        }}
        className={`max-w-[92%] text-left p-3.5 sm:p-4 rounded-2xl text-sm leading-relaxed transition-all cursor-pointer ${
          isInterviewer
            ? isActive
              ? 'liquid-glass-card liquid-glass-card-active text-white'
              : 'liquid-glass-card hover:border-white/25 text-zinc-100'
            : 'liquid-glass-card hover:border-white/25 text-zinc-200 ml-auto'
        }`}
      >
        <p className="whitespace-pre-wrap">{highlightTech(item.text)}</p>
        {!matchingQA && (
          <div className="mt-2.5 pt-2.5 border-t border-white/[0.08] flex items-center justify-between gap-2">
            <span className="text-xs text-zinc-400">Натисніть для відповіді ШІ</span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onAskAI(item.text, item.id);
              }}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-semibold bg-white/[0.09] text-white border border-white/[0.12] hover:bg-white/[0.16] transition cursor-pointer"
            >
              <Zap className="w-3 h-3 text-emerald-300" />
              <span>Запитати ШІ</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
});
DialogueMessageBubble.displayName = 'DialogueMessageBubble';

export const DualStreamCopilot: React.FC<DualStreamCopilotProps> = () => {
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
  const [aiLanguageMode, setAiLanguageMode] = useState<string>('auto');

  const handleAiLanguageChange = useCallback((mode: string) => {
    setAiLanguageMode(mode);
    outputLanguageRef.current = mode;
    try {
      localStorage.setItem('ghostboard_ai_language', mode);
      localStorage.setItem('ghostboard_output_language', mode);
    } catch {}
  }, []);

  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isSoundCheckOpen, setIsSoundCheckOpen] = useState(false);
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const [isCompanionQROpen, setIsCompanionQROpen] = useState(false);
  const [isEyeLineActive, setIsEyeLineActive] = useState(false);
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
    togglePillarCompletion,
    handleExplainLine,
    speculativeHitMap,
    patchingSlotMap,
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

  const [dialogueMessages, setDialogueMessages] = useState<Array<{
    id: string;
    speaker: 'interviewer' | 'candidate';
    text: string;
    timestamp: number;
    qaId?: string;
    statusText?: string;
  }>>([]);

  const handleLiveTranscript = useCallback((
    text: string,
    isFinal: boolean,
    speechFinal: boolean,
    speaker: 'interviewer' | 'candidate' = 'interviewer'
  ) => {
    // 1. Pass to AI copilot logic (which strictly discards candidate speech from generating answers)
    const result = handleIncomingTranscript(text, isFinal, speechFinal, speaker);

    // 2. Append final utterance to verbatim dialogue history
    if (isFinal || speechFinal) {
      const clean = text.trim();
      if (clean) {
        const statusText = result?.decision === 'WAIT_FOR_COMPLETION' ? 'Слухаю розповідь...' : undefined;
        setDialogueMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last && last.speaker === speaker && last.text.toLowerCase() === clean.toLowerCase()) {
            if (statusText && !last.statusText) {
              return [...prev.slice(0, -1), { ...last, statusText }];
            }
            return prev;
          }
          return [
            ...prev,
            {
              id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
              speaker,
              text: clean,
              timestamp: Date.now(),
              statusText,
            },
          ];
        });
      }
    }
  }, [handleIncomingTranscript]);

  useEffect(() => {
    const handleQaInject = (e: Event) => {
      const detail = (e as CustomEvent<{ text: string; isFinal?: boolean; speechFinal?: boolean; speaker?: 'interviewer' | 'candidate' }>).detail;
      if (detail?.text) {
        handleLiveTranscript(
          detail.text,
          detail.isFinal ?? true,
          detail.speechFinal ?? true,
          detail.speaker ?? 'interviewer'
        );
      }
    };
    window.addEventListener('ghostboard:qa_inject_transcript', handleQaInject);
    return () => window.removeEventListener('ghostboard:qa_inject_transcript', handleQaInject);
  }, [handleLiveTranscript]);

  const {
    isCapturing,
    isCapturingRef,
    liveVolume,
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
    onLiveTranscript: handleLiveTranscript,
    setShowTrialLimitModal,
    sessionDuration,
    setSessionDuration,
    candidateProfileRef,
    trackVolumeInState: isSoundCheckOpen || isAudioWizardOpen,
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

  const handleToggleFreeze = useCallback(() => {
    const next = !isFrozenRef.current;
    isFrozenRef.current = next;
    setIsFrozen(next);
    if (!next) {
      setPendingNewCount(0);
      pendingNewCountRef.current = 0;
      if (interviewQAs.length > 0) setActiveQAId(interviewQAs[0].id);
    }
  }, [interviewQAs, isFrozenRef, pendingNewCountRef, setActiveQAId, setPendingNewCount]);

  const handleToggleTriggerModeRef = useRef(handleToggleTriggerMode);
  const handleManualEnterTriggerRef = useRef(() => handleManualEnterTrigger(liveTranscript));

  useEffect(() => {
    handleToggleTriggerModeRef.current = handleToggleTriggerMode;
    handleManualEnterTriggerRef.current = () => handleManualEnterTrigger(liveTranscript);
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

  const manualInputRef = useRef<HTMLInputElement | null>(null);


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

      const savedAi = localStorage.getItem('ghostboard_ai_language') || localStorage.getItem('ghostboard_output_language');
      const supportedAiLangs = ['auto', 'bilingual_uk', 'bilingual_ru', 'uk', 'en', 'ru', 'pl', 'de', 'es', 'fr'];
      if (savedAi && supportedAiLangs.includes(savedAi)) {
        setAiLanguageMode(savedAi);
        outputLanguageRef.current = savedAi;
      } else {
        const fallback = locale === 'ua' ? 'bilingual_uk' : (locale as string) === 'ru' ? 'bilingual_ru' : 'auto';
        setAiLanguageMode(fallback);
        outputLanguageRef.current = fallback;
      }

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
  const activePatchSlot = activeQA ? patchingSlotMap[activeQA.id] : undefined;
  const isActiveSpeculativeHit = activeQA ? Boolean(speculativeHitMap[activeQA.id]) : false;
  const isBilingualOutput = Boolean(aiLanguageMode && aiLanguageMode.startsWith('bilingual'));

  const [isFullTeleprompter, setIsFullTeleprompter] = useState(false);
  const [isOptionsOpen, setIsOptionsOpen] = useState(false);
  const [hudOpacity, setHudOpacity] = useState(100);
  const optionsMenuRef = useRef<HTMLDivElement | null>(null);
  const vuMeterRef = useRef<HTMLDivElement | null>(null);
  const hearingVuRef = useRef<HTMLDivElement | null>(null);

  // Update VU meters directly via DOM refs + CSS custom properties (0 React tree re-renders)
  useEffect(() => {
    const applyLevels = (combined: number, interviewer: number, candidate: number) => {
      const v = isCapturing ? Math.max(6, Math.min(100, Math.round(combined || interviewer || 12))) : 6;
      if (vuMeterRef.current) {
        vuMeterRef.current.style.setProperty('--vu-level', String(v / 100));
        vuMeterRef.current.style.setProperty('--vu-1', `${Math.max(15, Math.min(100, v * 0.8))}%`);
        vuMeterRef.current.style.setProperty('--vu-2', `${Math.max(20, Math.min(100, v))}%`);
        vuMeterRef.current.style.setProperty('--vu-3', `${Math.max(15, Math.min(100, v * 0.9))}%`);
        vuMeterRef.current.style.setProperty('--vu-4', `${Math.max(12, Math.min(100, v * 0.65))}%`);
      }
      if (hearingVuRef.current) {
        const intV = isCapturing ? Math.max(4, Math.min(100, Math.round(interviewer))) : 0;
        const candV = isCapturing ? Math.max(4, Math.min(100, Math.round(candidate))) : 0;
        hearingVuRef.current.style.setProperty('--vu-int', `${intV}%`);
        hearingVuRef.current.style.setProperty('--vu-cand', `${candV}%`);
      }
    };

    applyLevels(0, 0, 0);
    if (!isCapturing || typeof window === 'undefined') return;

    let rafId: number | null = null;
    let pending = { volume: 0, interviewer: 0, candidate: 0 };

    const onAudioVolume = (e: Event) => {
      const detail = (e as CustomEvent<{ volume?: number; interviewer?: number; candidate?: number }>).detail;
      if (!detail) return;
      pending = {
        volume: detail.volume ?? 0,
        interviewer: detail.interviewer ?? 0,
        candidate: detail.candidate ?? 0,
      };
      if (rafId !== null) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        applyLevels(pending.volume, pending.interviewer, pending.candidate);
      });
    };

    window.addEventListener('ghostboard:audio_volume', onAudioVolume);
    return () => {
      window.removeEventListener('ghostboard:audio_volume', onAudioVolume);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, [isCapturing]);

  useEffect(() => {
    if (!isOptionsOpen) return;
    const handleOutside = (e: MouseEvent) => {
      if (optionsMenuRef.current && !optionsMenuRef.current.contains(e.target as Node)) {
        setIsOptionsOpen(false);
      }
    };
    window.addEventListener('mousedown', handleOutside);
    return () => window.removeEventListener('mousedown', handleOutside);
  }, [isOptionsOpen]);

  // Unified zero-mouse keyboard control (1-5, Space, Ctrl+K / '/', Ctrl+M, Tab)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isInput = Boolean(
        target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
      );

      // F9: Trigger screenshot analysis
      if (e.key === 'F9') {
        e.preventDefault();
        handleTriggerScreenshotRef.current();
        return;
      }

      // Ctrl+K / Cmd+K or '/': Focus manual question input bar immediately
      if (((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') || (e.key === '/' && !isInput)) {
        e.preventDefault();
        manualInputRef.current?.focus();
        return;
      }

      // Ctrl+M / Cmd+M: Toggle mic / audio capture (does not collide with bare M trigger mode)
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'm' && !isInput) {
        e.preventDefault();
        if (isCapturingRef.current) {
          stopCapture();
        } else {
          startCapture(audioSource);
        }
        return;
      }

      // Esc: unfreeze if frozen
      if (e.key === 'Escape' && !isInput) {
        if (isFrozenRef.current) {
          e.preventDefault();
          handleToggleFreeze();
          return;
        }
      }

      if (isPaletteOpen || isInput) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      // Space: Freeze / Unfreeze Teleprompter (+N queue)
      if (e.code === 'Space') {
        e.preventDefault();
        handleToggleFreeze();
        if (!isFrozenRef.current) {
          toast.success('▶️ Трансляцію відновлено.', { id: 'freeze-toast', duration: 1800 });
        } else {
          toast.info('⏸️ Екран зафіксовано. Нові відповіді накопичуються в черзі.', { id: 'freeze-toast', duration: 2500 });
        }
        return;
      }

      // Tab: toggle 100% Teleprompter Focus
      if (e.key === 'Tab') {
        e.preventDefault();
        setIsFullTeleprompter((v) => !v);
        return;
      }

      // ArrowRight: Jump to next queued QA while frozen
      if (e.key === 'ArrowRight' && isFrozenRef.current && pendingNewCountRef.current > 0) {
        e.preventDefault();
        const currentIdx = interviewQAs.findIndex((q) => q.id === activeQAIdRef.current);
        if (currentIdx > 0) {
          const nextQA = interviewQAs[currentIdx - 1];
          setActiveQAId(nextQA.id);
          setPendingNewCount((prev) => {
            const next = Math.max(0, typeof prev === 'number' ? prev - 1 : 0);
            pendingNewCountRef.current = next;
            return next;
          });
        }
        return;
      }

      // Enter outside buttons/links in manual-enter trigger mode
      if (
        e.key === 'Enter' &&
        !(target instanceof HTMLButtonElement) &&
        !(target instanceof HTMLAnchorElement) &&
        isCapturingRef.current &&
        triggerModeRef.current === 'enter'
      ) {
        e.preventDefault();
        handleManualEnterTriggerRef.current();
        return;
      }

      if (e.key.toLowerCase() === 'm') {
        e.preventDefault();
        handleToggleTriggerModeRef.current();
      } else if (e.key.toLowerCase() === 'q') {
        e.preventDefault();
        const next = !isConciseRef.current;
        isConciseRef.current = next;
        setIsConcise(next);
        toast.info(next ? hudToasts.conciseOn : hudToasts.detailedOn);
      } else if (e.key === '=' || e.key === '+') {
        setFontSize((s) => Math.min(32, s + 2));
      } else if (e.key === '-') {
        setFontSize((s) => Math.max(14, s - 2));
      } else if (e.key.toLowerCase() === 'b' || e.key === '5') {
        e.preventDefault();
        handleTriggerBridge();
      } else if (activeQA && ['1', '2', '3', '4'].includes(e.key)) {
        e.preventDefault();
        const modMap: Record<string, 'shorter' | 'simpler' | 'code' | 're_angle'> = {
          '1': 'shorter',
          '2': 'simpler',
          '3': 'code',
          '4': 're_angle',
        };
        const modKey = modMap[e.key];
        if (modKey) {
          if (modKey === 'code') setIsCodeExpanded(true);
          handleRefineQA(activeQA.id, modKey);
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [
    handleTriggerBridge,
    handleToggleFreeze,
    activeQA,
    handleRefineQA,
    isPaletteOpen,
    audioSource,
    isCapturingRef,
    isFrozenRef,
    triggerModeRef,
    pendingNewCountRef,
    activeQAIdRef,
    interviewQAs,
    setActiveQAId,
    setPendingNewCount,
    isConciseRef,
    hudToasts.conciseOn,
    hudToasts.detailedOn,
    handleTriggerScreenshotRef,
    startCapture,
    stopCapture,
  ]);

  const paletteCommands = useMemo<PaletteCommand[]>(() => {
    const hasQA = Boolean(activeQA);
    const busy = isCopilotGenerating;
    const refine = (key: 'shorter' | 'simpler' | 'code' | 're_angle' | 'under_the_hood') => () => {
      if (!activeQA) return;
      if (key === 'code' || key === 'under_the_hood') setIsCodeExpanded(true);
      handleRefineQA(activeQA.id, key);
    };
    return [
      { id: 'mod-shorter', group: 'Відповідь', label: '⚡ Коротше', hint: '1', disabled: !hasQA || busy, keywords: 'shorter blitz', run: refine('shorter') },
      { id: 'mod-simpler', group: 'Відповідь', label: '💡 Простіше', hint: '2', disabled: !hasQA || busy, keywords: 'simpler', run: refine('simpler') },
      { id: 'mod-code', group: 'Відповідь', label: '</> Код', hint: '3', disabled: !hasQA || busy, keywords: 'code', run: refine('code') },
      { id: 'mod-reangle', group: 'Відповідь', label: '🔄 Інший підхід', hint: '4', disabled: !hasQA || busy, keywords: 're_angle alternative', run: refine('re_angle') },
      { id: 'mod-bridge', group: 'Відповідь', label: '💬 Тягнути час', hint: '5', disabled: false, keywords: 'bridge phrase time', run: () => handleTriggerBridge() },
      { id: 'freeze', group: 'Керування', label: isFrozen ? 'Розморозити відповідь' : 'Заморозити відповідь', hint: 'Space', keywords: 'freeze pause', run: () => handleToggleFreeze() },
      { id: 'ask', group: 'Керування', label: 'Ввести питання вручну', hint: 'Ctrl+K', keywords: 'ask manual input', run: () => { manualInputRef.current?.focus(); manualInputRef.current?.select(); } },
      isCapturing
        ? { id: 'stop', group: 'Сесія', label: 'Зупинити запис', hint: 'Ctrl+M', keywords: 'stop capture', run: () => handleStop() }
        : { id: 'start', group: 'Сесія', label: 'Почати запис', hint: 'Ctrl+M', keywords: 'start capture listen', run: () => handleStartCaptureRequest() },
      { id: 'soundcheck', group: 'Сесія', label: 'Перевірка звуку', keywords: 'sound check audio mic', run: () => setIsSoundCheckOpen(true) },
      { id: 'history', group: 'Сесія', label: 'Історія питань', keywords: 'history', run: () => setIsHistoryOpen(true) },
      { id: 'profile', group: 'Сесія', label: 'Профіль кандидата та резюме', keywords: 'profile resume cv', run: () => setIsProfileOpen(true) },
      {
        id: 'clear',
        group: 'Сесія',
        label: 'Очистити чат',
        disabled: interviewQAs.length === 0 && dialogueMessages.length === 0,
        keywords: 'clear reset chat history',
        run: () => {
          setInterviewQAs([]);
          setDialogueMessages([]);
          setPendingNewCount(0);
          pendingNewCountRef.current = 0;
          toast.success('Чат очищено');
        },
      },
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeQA, isCopilotGenerating, isFrozen, isCapturing, interviewQAs.length, dialogueMessages.length, handleRefineQA, handleTriggerBridge]);

  // New answer arrived → reset teleprompter scrollTop directly (zero page jump)
  useEffect(() => {
    if (!activeQA) return;
    if (prompterRef.current) {
      prompterRef.current.scrollTop = 0;
    }
    if (typeof window !== 'undefined' && window.innerWidth < 1024) setMobileTab('prompter');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeQA?.id]);

  // Synchronize incoming AI QA questions with dialogue messages so all questions appear in the stream with bidirectional linking
  useEffect(() => {
    if (interviewQAs.length === 0) return;
    setDialogueMessages((prev) => {
      const updated = [...prev];
      let changed = false;
      [...interviewQAs].reverse().forEach((qa) => {
        const existingIdx = updated.findIndex(
          (m) =>
            (qa.sourceMessageId && m.id === qa.sourceMessageId) ||
            m.qaId === qa.id ||
            (m.speaker === 'interviewer' && m.text.trim().toLowerCase() === qa.question.trim().toLowerCase())
        );
        if (existingIdx !== -1) {
          if (!updated[existingIdx].qaId) {
            updated[existingIdx] = { ...updated[existingIdx], qaId: qa.id };
            changed = true;
          }
        } else {
          updated.push({
            id: qa.sourceMessageId || `qa_${qa.id}`,
            speaker: 'interviewer',
            text: qa.question,
            timestamp: qa.timestamp || Date.now(),
            qaId: qa.id,
          });
          changed = true;
        }
      });
      if (changed) {
        return updated.sort((a, b) => a.timestamp - b.timestamp);
      }
      return prev;
    });
  }, [interviewQAs]);

  const handleSelectQA = useCallback((qaId: string) => {
    setActiveQAId(qaId);
    if (prompterRef.current) {
      prompterRef.current.scrollTop = 0;
    }
  }, [setActiveQAId]);

  const handleAskAIFromMessage = useCallback((text: string, msgId: string) => {
    processAggregatedQuestion(text, true, msgId);
  }, [processAggregatedQuestion]);

  // Smart auto-scroll with direct scrollTop updates (zero page jump)
  const [isUserScrolledUp, setIsUserScrolledUp] = useState(false);

  const handleFeedScroll = useCallback(() => {
    if (!feedRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = feedRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 60;
    setIsUserScrolledUp(!isAtBottom);
  }, []);

  const scrollToBottom = useCallback(() => {
    if (!feedRef.current) return;
    feedRef.current.scrollTop = feedRef.current.scrollHeight;
    setIsUserScrolledUp(false);
  }, []);

  useEffect(() => {
    if (!isUserScrolledUp) {
      scrollToBottom();
    }
  }, [dialogueMessages.length, liveTranscript, candidateLiveTranscript, isUserScrolledUp, scrollToBottom]);

  // Memoized O(1) lookup table for matching dialogue messages to QA items
  const qaLookup = useMemo(() => {
    const bySourceMsgId = new Map<string, { qa: InterviewQAItem; number: number }>();
    const byQaId = new Map<string, { qa: InterviewQAItem; number: number }>();
    const total = interviewQAs.length;
    interviewQAs.forEach((qa, idx) => {
      const entry = { qa, number: total - idx };
      if (qa.sourceMessageId) {
        bySourceMsgId.set(qa.sourceMessageId, entry);
      }
      byQaId.set(qa.id, entry);
    });
    return { bySourceMsgId, byQaId, items: interviewQAs };
  }, [interviewQAs]);

  const sampleQuestion = 'Explain optimistic vs pessimistic locking in databases and when to use each.';
  const sampleStory = 'У нашій компанії ми розробляємо високонавантажений банкінг і зараз шукаємо senior інженера...';

  const handleSampleQuestionClick = useCallback(() => {
    setDialogueMessages((prev) => [
      ...prev,
      {
        id: `msg_sample_${Date.now()}`,
        speaker: 'interviewer',
        text: sampleQuestion,
        timestamp: Date.now(),
      },
    ]);
    processAggregatedQuestion(sampleQuestion, true);
  }, [processAggregatedQuestion, sampleQuestion]);

  const handleSampleStoryClick = useCallback(() => {
    handleLiveTranscript(sampleStory, true, true, 'interviewer');
    toast.info('⏳ Класифікатор зафіксував розповідь: контекст буферизовано, запит до ШІ очікує фінального запитання.', { duration: 4000 });
  }, [handleLiveTranscript, sampleStory]);

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

  const mainAnswer = activeQA ? activeQA.startHook || activeQA.quickAnswer || '' : '';

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
    <section className="liquid-glass-panel flex flex-col min-h-0 h-full rounded-2xl overflow-hidden">
      <header className="flex items-center justify-between px-4 py-3 border-b border-white/[0.12] bg-white/[0.03] backdrop-blur-xl">
        <div className="flex items-center gap-2.5">
          <MessagesSquare className="w-4 h-4 text-cyan-300" />
          <h2 className="text-xs font-mono font-bold uppercase tracking-[0.2em] text-zinc-200">Live Dialogue</h2>
          <span className="liquid-glass-pill inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono text-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.9)]" />
            <span>Intent Gate: Active</span>
          </span>
        </div>
        <div ref={hearingVuRef} className="flex items-center gap-3 text-xs font-mono text-zinc-400">
          <span className="flex items-center gap-1.5" title="Interviewer level">
            <Headphones className="w-3 h-3" />
            <span className="w-14 h-1 rounded-full bg-white/10 overflow-hidden">
              <span className="block h-full bg-white transition-[width] duration-75" style={{ width: 'var(--vu-int, 0%)' }} />
            </span>
          </span>
          <span className="flex items-center gap-1.5" title="Your mic level">
            <Mic className="w-3 h-3" />
            <span className="w-14 h-1 rounded-full bg-white/10 overflow-hidden">
              <span className="block h-full bg-zinc-400 transition-[width] duration-75" style={{ width: 'var(--vu-cand, 0%)' }} />
            </span>
          </span>
        </div>
      </header>

      {/* Focus Mode Condensed Live Ticker */}
      {isFocusMode && (
        <div className="px-4 py-2.5 bg-white/[0.08] border-b border-white/[0.12] flex items-center gap-2 text-xs">
          <span className="w-2 h-2 rounded-full bg-white animate-pulse shrink-0" />
          <span className="text-xs font-mono text-zinc-200 uppercase font-bold shrink-0">Фокус-ефір:</span>
          <p className="text-zinc-200 text-xs truncate italic">
            {liveTranscript || activeQA?.question || 'Очікування мовлення співрозмовника...'}
          </p>
        </div>
      )}

      <div
        ref={feedRef}
        onScroll={handleFeedScroll}
        className="flex-1 overflow-y-auto px-4 sm:px-5 py-5 space-y-4 scroll-smooth relative"
      >
        {!hasAnything && dialogueMessages.length === 0 && (
          <div className="h-full min-h-[290px] flex flex-col items-center justify-center text-center gap-5 px-4">
            <div>
              <p className="text-base font-semibold text-white">Готові за 3 кроки</p>
              <p className="text-sm text-zinc-400 mt-1 max-w-sm">
                Кожна репліка інтерв&apos;юера та готова відповідь з&apos;являться тут у реальному часі.
              </p>
            </div>

            <ol className="w-full max-w-sm space-y-2 text-left">
              {[
                {
                  n: 1,
                  title: 'Додайте резюме',
                  desc: candidateProfile?.cvContext ? `${candidateProfile.role || 'Профіль'} · резюме підключено` : 'ШІ говоритиме від вашого імені',
                  done: Boolean(candidateProfile?.cvContext),
                  action: () => setIsProfileOpen(true),
                },
                {
                  n: 2,
                  title: 'Перевірте звук',
                  desc: 'Переконайтесь, що чути співрозмовника',
                  done: false,
                  action: () => setIsSoundCheckOpen(true),
                },
                {
                  n: 3,
                  title: 'Почніть запис',
                  desc: 'Space — старт, далі все автоматично',
                  done: false,
                  action: () => handleStartCaptureRequest(),
                  primary: true,
                },
              ].map((step) => (
                <li key={step.n}>
                  <button
                    type="button"
                    onClick={step.action}
                    className={`flex w-full items-center gap-3 rounded-xl border px-3.5 py-2.5 text-left transition-all cursor-pointer focus-visible:outline-2 focus-visible:outline-white/60 ${
                      step.primary
                        ? 'border-white/30 bg-white text-zinc-950 hover:bg-zinc-100 shadow-[0_0_24px_rgba(255,255,255,0.16)]'
                        : 'liquid-glass-card hover:border-white/25 text-white'
                    }`}
                  >
                    <span
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md font-mono text-xs font-semibold ${
                        step.primary ? 'bg-black/10 text-zinc-950' : step.done ? 'bg-emerald-400 text-zinc-950' : 'bg-white/10 text-zinc-200'
                      }`}
                    >
                      {step.done ? <Check className="w-3.5 h-3.5 stroke-[2.5]" /> : step.n}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold">{step.title}</span>
                      <span className={`block truncate text-xs ${step.primary ? 'text-zinc-700' : 'text-zinc-400'}`}>{step.desc}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ol>

            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-zinc-400">
              <button type="button" onClick={handleSampleQuestionClick} className="inline-flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer">
                <Sparkles className="w-3.5 h-3.5" /> {hudT.sampleQuestionBtn}
              </button>
              <button
                type="button"
                onClick={handleSampleStoryClick}
                title="Перевірити як класифікатор буферизує довгу розповідь співрозмовника"
                className="hover:text-white transition-colors cursor-pointer"
              >
                Тест монологу (WAIT)
              </button>
              <span className="inline-flex items-center gap-1.5">
                <kbd className="rounded border border-white/10 bg-white/[0.04] px-1.5 py-0.5 font-mono">Ctrl/⌘ K</kbd> команди
              </span>
            </div>
          </div>
        )}

        <AnimatePresence initial={false}>
          {dialogueMessages.map((item) => {
            const isInterviewer = item.speaker === 'interviewer';
            const matchedEntry = isInterviewer
              ? (item.id ? qaLookup.bySourceMsgId.get(item.id) : null) ||
                (item.qaId ? qaLookup.byQaId.get(item.qaId) : null) ||
                (() => {
                  const idx = qaLookup.items.findIndex(
                    (qa) => qa.question.includes(item.text) || item.text.includes(qa.question)
                  );
                  return idx !== -1
                    ? { qa: qaLookup.items[idx], number: qaLookup.items.length - idx }
                    : null;
                })()
              : null;
            const matchingQA = matchedEntry?.qa ?? null;
            const qaNumber = matchedEntry?.number ?? null;
            const isActive = isInterviewer && matchingQA?.id === activeQA?.id;

            return (
              <DialogueMessageBubble
                key={item.id}
                item={item}
                matchingQA={matchingQA}
                qaNumber={qaNumber}
                isActive={isActive}
                onSelectQA={handleSelectQA}
                onAskAI={handleAskAIFromMessage}
              />
            );
          })}
        </AnimatePresence>

        {liveTranscript && (() => {
          const liveIntent = evaluateSpeechIntent(liveTranscript);
          return (
            <div className="flex flex-col items-start animate-in fade-in duration-150">
              <div className="flex items-center gap-1.5 mb-1 px-1">
                <span className="liquid-glass-pill inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold text-cyan-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                  Інтерв&apos;юер (наживо...)
                </span>
                {liveIntent.decision === 'WAIT_FOR_COMPLETION' && (
                  <span className="liquid-glass-pill inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-amber-200 animate-pulse">
                    <span className="w-1 h-1 rounded-full bg-amber-300" />
                    <span>Слухаю розповідь...</span>
                  </span>
                )}
                {liveIntent.decision === 'TRIGGER_NOW' && (
                  <span className="liquid-glass-pill inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-emerald-200 animate-pulse">
                    <Zap className="w-3 h-3 text-emerald-300" />
                    <span>Питання (0ms trigger)</span>
                  </span>
                )}
                {liveIntent.decision === 'IGNORE_NOISE' && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-white/[0.04] text-zinc-400 border border-white/[0.08]">
                    <span>Фільтр шуму</span>
                  </span>
                )}
              </div>
              <div className="liquid-glass-card max-w-[88%] px-4 py-3 rounded-2xl rounded-tl-sm border-dashed text-sm italic text-zinc-300">
                {highlightTech(liveTranscript)}
                <span className="inline-block w-1.5 h-4 bg-cyan-300 ml-1.5 align-middle animate-pulse" />
              </div>
            </div>
          );
        })()}

        {candidateLiveTranscript && (
          <div className="flex flex-col items-end animate-in fade-in duration-150">
            <div className="flex items-center gap-1.5 mb-1 px-1">
              <span className="liquid-glass-pill inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold text-emerald-200">
                Ви (наживо...)
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              </span>
            </div>
            <div className="liquid-glass-card max-w-[88%] px-4 py-3 rounded-2xl rounded-tr-sm border-dashed text-sm italic text-zinc-300 ml-auto">
              {candidateLiveTranscript}
              <span className="inline-block w-1.5 h-4 bg-emerald-300 ml-1.5 align-middle animate-pulse" />
            </div>
          </div>
        )}

        {isCapturing && !liveTranscript && !candidateLiveTranscript && dialogueMessages.length === 0 && (
          <div className="text-center text-xs font-mono text-zinc-400 py-10 flex flex-col items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_rgba(34,211,238,0.9)]" />
            {hudT.listeningPlaceholder}
            {!hasTabAudio && audioSource === 'tab' && (
              <button
                type="button"
                onClick={repickTabAudio}
                className="liquid-glass-pill mt-2 px-3 py-1.5 rounded-lg text-amber-200 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-amber-300" />
                <span>Enable &quot;Share tab audio&quot;</span>
              </button>
            )}
          </div>
        )}

        {/* Floating Return to Bottom CTA */}
        {isUserScrolledUp && (
          <button
            type="button"
            onClick={() => scrollToBottom()}
            className="liquid-glass-dock absolute bottom-4 left-1/2 -translate-x-1/2 px-3.5 py-1.5 rounded-full text-zinc-100 text-xs font-mono font-semibold flex items-center gap-1.5 hover:bg-white/[0.12] transition cursor-pointer z-20 animate-in fade-in"
          >
            <ChevronDown className="w-3.5 h-3.5 animate-bounce text-cyan-300" />
            <span>Нові репліки</span>
          </button>
        )}
      </div>

      <div className="px-4 py-3 border-t border-white/[0.12] bg-white/[0.03] backdrop-blur-xl">
        {triggerMode === 'enter' && liveTranscript && (
          <button
            type="button"
            onClick={() => handleManualEnterTriggerRef.current()}
            className="w-full mb-2.5 py-2 rounded-xl bg-white text-black text-xs font-mono font-bold hover:bg-zinc-200 transition cursor-pointer"
          >
            {hudT.answerNowBtn} ↵
          </button>
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (manualInputRef.current && manualInputRef.current.value.trim()) {
              processAggregatedQuestion(manualInputRef.current.value.trim(), true);
              manualInputRef.current.value = '';
            }
          }}
          className="flex items-center gap-2"
        >
          <input
            ref={manualInputRef}
            type="text"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                if (manualInputRef.current && manualInputRef.current.value.trim()) {
                  processAggregatedQuestion(manualInputRef.current.value.trim(), true);
                  manualInputRef.current.value = '';
                }
              }
            }}
            placeholder="Запитати ШІ вручну… (Ctrl+K або /)"
            className="flex-1 bg-white/[0.05] border border-white/[0.12] rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-400 focus:outline-none focus:border-cyan-400/45 focus:bg-white/[0.08] font-mono transition-all backdrop-blur-md"
          />
          <button
            type="button"
            onClick={() => {
              if (manualInputRef.current && manualInputRef.current.value.trim()) {
                processAggregatedQuestion(manualInputRef.current.value.trim(), true);
                manualInputRef.current.value = '';
              }
            }}
            className="liquid-glass-pill px-3 py-2 rounded-xl hover:bg-white/[0.14] text-zinc-100 text-xs font-mono font-semibold transition cursor-pointer shrink-0"
          >
            Enter ↵
          </button>
        </form>
      </div>
    </section>
  );

  const isAnswerActiveOrStreaming = Boolean(isCopilotGenerating || activeQA?.isStreaming || activeQA || isFocusMode);

  const prompterPane = (
    <section className="liquid-glass-panel flex flex-col min-h-0 h-full rounded-2xl overflow-hidden relative">
      <header className="flex items-center justify-between gap-2 px-4 py-2.5 border-b border-white/[0.10] bg-white/[0.025] backdrop-blur-xl">
        <div className="flex items-center gap-2.5 min-w-0">
          <ScrollText className="w-4 h-4 text-emerald-300 shrink-0" />
          <h2 className="font-display text-xs font-bold uppercase tracking-[0.16em] text-white">AI TELEPROMPTER</h2>
          {isCopilotGenerating && (
            <span className="liquid-glass-pill px-2 py-0.5 rounded-full inline-flex items-center gap-1.5 text-xs font-mono text-cyan-200">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_rgba(34,211,238,0.85)]" />
              <span>generating…</span>
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 text-zinc-400">
          {interviewQAs.length > 1 && (
            <>
              <button type="button" onClick={() => goToQA(1)} disabled={activeIndex >= interviewQAs.length - 1} className="p-1.5 rounded-lg hover:bg-white/10 disabled:opacity-30 cursor-pointer" title="Previous answer">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs font-mono tabular-nums text-zinc-300">
                {interviewQAs.length - activeIndex}/{interviewQAs.length}
              </span>
              <button type="button" onClick={() => goToQA(-1)} disabled={activeIndex <= 0} className="p-1.5 rounded-lg hover:bg-white/10 disabled:opacity-30 cursor-pointer" title="Next answer">
                <ChevronRight className="w-4 h-4" />
              </button>
              <span className="w-px h-4 bg-white/10 mx-1" />
            </>
          )}
          <button
            type="button"
            onClick={handleToggleFreeze}
            className={`px-2.5 py-1 rounded-lg cursor-pointer transition-all flex items-center gap-1.5 text-xs font-mono border ${
              isFrozen
                ? 'bg-cyan-500/20 text-cyan-100 border-cyan-300/35 shadow-[0_0_16px_rgba(34,211,238,0.2)]'
                : 'liquid-glass-pill hover:bg-white/[0.14] text-zinc-200'
            }`}
            title="Freeze / Unfreeze Teleprompter (Space)"
          >
            <Snowflake className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{isFrozen ? 'Frozen' : 'Freeze'}</span>
            {pendingNewCount > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded bg-cyan-300 text-zinc-950 font-bold text-xs tabular-nums">
                +{pendingNewCount}
              </span>
            )}
          </button>
          {isPiPSupported && (
            <button
              type="button"
              onClick={togglePiP}
              className={`px-2 py-1 rounded-lg cursor-pointer transition-all flex items-center gap-1 border ${
                isPiPOpen
                  ? 'bg-white/15 text-white border-white/30'
                  : 'liquid-glass-pill hover:bg-white/[0.14] text-zinc-200'
              }`}
              title="Always-on-Top Window (Document Picture-in-Picture)"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="text-xs font-mono hidden md:inline">PiP</span>
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
        <div className="px-4 py-2 bg-cyan-950/35 border-b border-cyan-400/20 flex items-center justify-between text-xs font-mono text-cyan-100">
          <span className="flex items-center gap-2 font-semibold uppercase tracking-wider">
            <Snowflake className="w-3.5 h-3.5 text-cyan-300 animate-pulse" />
            <span>{hudAnswer.frozenBanner}</span>
          </span>
          {pendingNewCount > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-cyan-300 text-zinc-950 font-bold text-xs tabular-nums">
              +{pendingNewCount} в черзі
            </span>
          )}
        </div>
      )}

      <div ref={prompterRef} className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 pb-12">
        {/* Emergency Bridge Banner */}
        {isBridgeActive && bridgePhrase && (
          <div className="liquid-glass-card mb-4 p-4 rounded-2xl border-cyan-400/30 text-zinc-100 flex items-start gap-3">
            <MessageCircle className="w-4 h-4 text-cyan-300 shrink-0 mt-1" />
            <div className="space-y-1.5 flex-1">
              <span className="text-xs font-mono uppercase tracking-widest text-cyan-300 font-bold block">
                Тягнути час · Bridge Phrase [5]
              </span>
              <p className="text-[calc(var(--hud-font,16px)*1.1)] leading-[1.58] font-medium text-white border-l-2 border-cyan-300 pl-3 font-sans">
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
              transition={{ type: 'spring', stiffness: 350, damping: 28, mass: 0.6 }}
              className="space-y-4"
              style={{ ['--hud-font' as string]: `${fontSize}px` }}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs font-mono text-zinc-300 leading-relaxed flex-1">
                  Q · {stripRawMarkdownAsterisks(cleanStreamText(activeQA.question))}
                </p>
                {activeQA.isContinuationMerged && (
                  <span className="liquid-glass-pill shrink-0 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold text-cyan-200">
                    <Zap className="w-3 h-3 text-cyan-300" />
                    <span>Уточнено</span>
                  </span>
                )}
              </div>

              {/* Context Badge from <<<META>>> and TTFT */}
              <div className="flex items-center gap-2 flex-wrap">
                {activeQA.meta && (
                  <div className="liquid-glass-pill inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono text-zinc-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
                    <span className="font-semibold text-white">{activeQA.meta.domain}</span>
                    <span className="text-zinc-500">•</span>
                    <span className="text-zinc-300">{activeQA.meta.level}</span>
                    <span className="text-zinc-500">•</span>
                    <span className="text-zinc-200 uppercase tracking-wider font-semibold">{activeQA.meta.language}</span>
                  </div>
                )}
                {isActiveSpeculativeHit ? (
                  <span className="liquid-glass-pill inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-semibold text-emerald-200 border-emerald-400/35 tabular-nums">
                    <Zap className="w-3 h-3 text-emerald-300" />
                    <span>0ms Speculative Hit</span>
                  </span>
                ) : activeQA.ttftMs !== undefined ? (
                  <span className="liquid-glass-pill inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-mono font-semibold text-emerald-200 tabular-nums">
                    <Zap className="w-3 h-3 text-emerald-300" />
                    <span>TTFT {activeQA.ttftMs}ms</span>
                  </span>
                ) : activeQA.isStreaming ? (
                  <span className="liquid-glass-pill inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-semibold text-cyan-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                    STREAMING...
                  </span>
                ) : null}
                {activePatchSlot && (
                  <span className="liquid-glass-pill inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-semibold text-violet-200">
                    <Sparkles className="w-3 h-3 text-violet-300" />
                    {activePatchSlot === 'deep_dive'
                      ? 'Patching Phase 3 · Hook & Pillars Frozen'
                      : activePatchSlot === 'hook_and_pillars'
                      ? 'Patching Phase 1–2 · Deep Dive Frozen'
                      : 'Refining Answer...'}
                  </span>
                )}
              </div>

              {activeQA.nativeTranslation && (
                <div className="liquid-glass-card rounded-2xl p-4 space-y-1">
                  <span className="text-xs font-mono uppercase tracking-wider text-zinc-400 font-semibold block">
                    {luxT.translation}
                  </span>
                  <p className="text-zinc-300 text-xs italic leading-relaxed">{cleanStreamText(activeQA.nativeTranslation)}</p>
                </div>
              )}

              {/* Phase 1: HOOK (dynamically scales via --hud-font) */}
              {mainAnswer && (
                <div className="liquid-glass-card liquid-glass-card-active rounded-2xl p-4 sm:p-5 relative group">
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono uppercase tracking-widest text-emerald-300/95 font-bold flex items-center gap-1.5">
                        <Zap className="w-3.5 h-3.5 text-emerald-300" /> PHASE 1 · Скажіть вголос
                      </span>
                      {activePatchSlot === 'deep_dive' && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-white/[0.06] border border-white/[0.12] text-xs font-mono text-zinc-300">
                          <Lock className="w-2.5 h-2.5" /> Frozen
                        </span>
                      )}
                      {activePatchSlot === 'hook_and_pillars' && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-white/[0.10] border border-white/[0.15] text-xs font-mono text-zinc-100">
                          Patching...
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopy(cleanStreamText(mainAnswer), 'main')}
                      className="p-1.5 rounded-lg text-zinc-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                      title="Копіювати"
                    >
                      {copiedId === 'main' ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <div className="border-l-2 border-emerald-400/80 pl-3.5 text-[calc(var(--hud-font,16px)*1.12)] leading-[1.58] font-medium text-white font-sans">
                    {renderBilingualPhrase(mainAnswer, isBilingualOutput)}
                    {activeQA.isStreaming && (!activeQA.hints || activeQA.hints.length === 0) && (
                      <span className="inline-block w-1.5 h-4 ml-1 rounded-sm bg-emerald-300 animate-pulse align-middle" />
                    )}
                  </div>
                </div>
              )}

              {/* Phase 2: PILLARS (scales via --hud-font, optical glass cards) */}
              {activeQA.hints && activeQA.hints.length > 0 && (
                <div className="liquid-glass-card rounded-2xl p-4 sm:p-5 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono uppercase tracking-widest text-cyan-300/95 font-bold flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-cyan-300" /> PHASE 2 · Ключові тези
                    </span>
                    {activePatchSlot === 'deep_dive' && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-white/[0.06] border border-white/[0.12] text-xs font-mono text-zinc-300">
                        <Lock className="w-2.5 h-2.5" /> Frozen
                      </span>
                    )}
                    {activePatchSlot === 'hook_and_pillars' && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-white/[0.10] border border-white/[0.15] text-xs font-mono text-zinc-100">
                        Patching...
                      </span>
                    )}
                  </div>
                  <ol className="space-y-2.5">
                    {activeQA.hints.map((hint, i) => {
                      const isCompleted = activeQA.completedPillarIndices?.includes(i);
                      const isActive = !isCompleted && activeQA.activePillarIndex === i;
                      return (
                        <li
                          key={i}
                          onClick={() => togglePillarCompletion(activeQA.id, i)}
                          className={`p-3.5 rounded-xl border flex items-start gap-3 transition-all cursor-pointer select-none ${
                            isCompleted
                              ? 'bg-white/[0.02] border-white/[0.06] text-zinc-400'
                              : isActive
                              ? 'bg-white/[0.08] border-cyan-400/40 text-white shadow-[0_0_24px_-8px_rgba(34,211,238,0.28)]'
                              : 'bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/25 border-white/[0.10] text-zinc-200'
                          }`}
                        >
                          <span
                            className={`shrink-0 mt-0.5 w-5 h-5 rounded-md text-xs font-mono font-bold flex items-center justify-center transition-colors ${
                              isCompleted
                                ? 'bg-emerald-400 text-zinc-950'
                                : isActive
                                ? 'bg-cyan-400/20 border border-cyan-300/45 text-cyan-100'
                                : 'bg-white/[0.08] border border-white/[0.12] text-zinc-300'
                            }`}
                          >
                            {isCompleted ? <Check className="w-3 h-3 stroke-[2.75]" /> : i + 1}
                          </span>
                          <div className={`text-[var(--hud-font,16px)] leading-[1.55] text-zinc-100 flex-1 ${isCompleted ? 'line-through opacity-70' : ''}`}>
                            {formatPillarAnchor(hint, isBilingualOutput)}
                            {activeQA.isStreaming && i === activeQA.hints.length - 1 && !activeQA.codeSnippet && (
                              <span className="inline-block w-1.5 h-4 ml-1 rounded-sm bg-cyan-300 animate-pulse align-middle" />
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                </div>
              )}

              {/* Phase 3: DEEP DIVE (Prose + Dedicated Syntax-Highlighted Fenced Code Blocks) */}
              {((activeQA.codeSnippet && activeQA.codeSnippet.trim()) || activePatchSlot === 'deep_dive') && (() => {
                const cleanedDeepDive = activeQA.codeSnippet ? cleanStreamText(activeQA.codeSnippet).trim() : '';
                const deepBlocks = cleanedDeepDive ? parseBlocks(cleanedDeepDive) : [];
                const extractedCode = cleanedDeepDive ? extractCode(cleanedDeepDive) : '';
                const copyPayload = extractedCode || cleanedDeepDive;

                return (
                  <div className="liquid-glass-card rounded-2xl p-4 sm:p-5 space-y-3">
                    <div className="flex items-center justify-between border-b border-white/[0.08] pb-2">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setIsCodeExpanded((prev) => !prev)}
                          className="flex items-center gap-2 text-xs font-mono font-semibold text-zinc-200 hover:text-white cursor-pointer"
                        >
                          <Code2 className="w-3.5 h-3.5 text-sky-300" />
                          <span>PHASE 3 · Код / Реалізація</span>
                          {isCodeExpanded ? <ChevronUp className="w-3.5 h-3.5 text-zinc-400" /> : <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />}
                        </button>
                        {activePatchSlot === 'deep_dive' && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-white/[0.08] border border-white/[0.08] text-xs font-mono text-zinc-200">
                            Patching slot...
                          </span>
                        )}
                        {activePatchSlot === 'hook_and_pillars' && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-white/[0.05] border border-white/[0.08] text-xs font-mono text-zinc-400">
                            <Lock className="w-2.5 h-2.5" /> Frozen
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {copyPayload && (
                          <button
                            type="button"
                            onClick={() => handleCopy(copyPayload, 'code')}
                            className="liquid-glass-pill text-xs font-mono text-zinc-200 hover:text-white px-2.5 py-1 rounded-lg flex items-center gap-1.5 cursor-pointer"
                          >
                            {copiedId === 'code' ? <Check className="w-3 h-3 text-emerald-300" /> : <Copy className="w-3 h-3" />}
                            <span>{copiedId === 'code' ? 'Скопійовано ✓' : 'Копіювати'}</span>
                          </button>
                        )}
                      </div>
                    </div>
                    {(isCodeExpanded || activePatchSlot === 'deep_dive') && (
                      <div className="space-y-3">
                        {deepBlocks.length > 0 ? (
                          deepBlocks.map((block, bIdx) => {
                            if (block.type === 'code') {
                              const codeLines = block.code.split('\n');
                              return (
                                <div
                                  key={bIdx}
                                  className="overflow-hidden rounded-lg border border-white/10 bg-[#09090b] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)]"
                                >
                                  <div className="flex items-center justify-between px-3 py-1.5 bg-white/[0.03] border-b border-white/10">
                                    <div className="flex items-center gap-1.5">
                                      <span className="w-2 h-2 rounded-full bg-rose-400/75" />
                                      <span className="w-2 h-2 rounded-full bg-amber-400/75" />
                                      <span className="w-2 h-2 rounded-full bg-emerald-400/75" />
                                      <span className="ml-2 text-[11px] font-mono uppercase tracking-wider text-zinc-400">
                                        {block.lang || 'code'} · клік на рядок = пояснення
                                      </span>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => handleCopy(block.code, `code-${bIdx}`)}
                                      className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/[0.05] px-2 py-0.5 text-[11px] font-medium text-zinc-200 hover:bg-white/[0.12] hover:text-white transition-colors cursor-pointer"
                                    >
                                      {copiedId === `code-${bIdx}` ? (
                                        <Check className="w-3 h-3 text-emerald-300" />
                                      ) : (
                                        <Copy className="w-3 h-3" />
                                      )}
                                      <span>{copiedId === `code-${bIdx}` ? 'Скопійовано ✓' : 'Копіювати'}</span>
                                    </button>
                                  </div>
                                  <pre className="bg-[#09090b] p-3 font-mono text-[13px] leading-relaxed overflow-x-auto max-h-[380px] custom-scrollbar text-zinc-100">
                                    <code>
                                      {codeLines.map((lineText, idx) => {
                                        const lineExplanation = activeQA.lineExplanations?.[idx];
                                        const tokens = highlightCode(lineText);
                                        return (
                                          <div key={idx} className="group">
                                            <div
                                              onClick={() => handleExplainLine(activeQA.id, idx, lineText)}
                                              className="flex items-start gap-3 py-0.5 px-1.5 rounded hover:bg-white/[0.06] cursor-pointer transition-colors"
                                              title="Клікніть для пояснення рядка (explain_line)"
                                            >
                                              <span className="shrink-0 select-none text-xs font-mono tabular-nums text-zinc-500 group-hover:text-cyan-300 w-6 text-right">
                                                {idx + 1}
                                              </span>
                                              <span className="flex-1 whitespace-pre font-mono">
                                                {tokens.length > 0
                                                  ? tokens.map((t, j) => (
                                                      <span key={j} className={TOKEN_CLASS[t.kind]}>
                                                        {t.value}
                                                      </span>
                                                    ))
                                                  : ' '}
                                              </span>
                                            </div>
                                            {lineExplanation && (
                                              <div className="liquid-glass-pill my-1.5 ml-9 mr-2 p-2.5 rounded-xl text-xs text-zinc-100 leading-relaxed font-sans">
                                                <span className="inline-flex items-center gap-1 font-mono text-xs text-cyan-300 font-bold mr-1.5 uppercase">
                                                  <Zap className="w-3 h-3" /> Пояснення:
                                                </span>
                                                {lineExplanation}
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </code>
                                  </pre>
                                </div>
                              );
                            }
                            if (block.type === 'li') {
                              return (
                                <div key={bIdx} className="flex items-start gap-2.5 text-[var(--hud-font,16px)] leading-[1.58] text-zinc-200 font-sans">
                                  <span className="mt-[0.55em] h-1.5 w-1.5 shrink-0 rounded-full bg-sky-400/80" />
                                  <p className="min-w-0 flex-1">{renderInlineTokens(block.tokens, isBilingualOutput)}</p>
                                </div>
                              );
                            }
                            if (block.type === 'h') {
                              return (
                                <h4 key={bIdx} className="pt-1 text-xs font-mono font-semibold uppercase tracking-wider text-zinc-100">
                                  {renderInlineTokens(block.tokens, isBilingualOutput)}
                                </h4>
                              );
                            }
                            return (
                              <p key={bIdx} className="text-[var(--hud-font,16px)] leading-[1.58] text-zinc-200 font-sans">
                                {renderInlineTokens(block.tokens, isBilingualOutput)}
                              </p>
                            );
                          })
                        ) : (
                          <div className="space-y-2 py-1 animate-pulse">
                            <div className="h-3.5 rounded bg-white/[0.08] w-3/4" />
                            <div className="h-3.5 rounded bg-white/[0.06] w-5/6" />
                            <div className="h-3.5 rounded bg-white/[0.05] w-2/3" />
                          </div>
                        )}
                        {activeQA.isStreaming && (
                          <span className="inline-block w-1.5 h-4 ml-1 rounded-sm bg-cyan-300 animate-pulse align-middle" />
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Emergency Fallback 1-Click Retry Action */}
              {(activeQA.codeSnippet?.includes('Повторити запит') ||
                activeQA.codeSnippet?.includes('Повторить запрос') ||
                activeQA.startHook?.includes('ШІ тимчасово') ||
                activeQA.startHook?.includes('AI connection timed out')) && (
                <div className="liquid-glass-card border-amber-400/35 rounded-2xl p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-xs text-amber-100">
                    <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                    <span>Мережевий запит до ШІ тимчасово затримався. Повторіть генерацію в 1 клік:</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => processAggregatedQuestion(activeQA.question, true)}
                    className="shrink-0 px-4 py-2 rounded-xl bg-white hover:bg-zinc-100 text-zinc-950 font-semibold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Повторити запит (1 клік)</span>
                  </button>
                </div>
              )}

              {/* Phase 4: Follow-Up Trap Shield (<<<PHASE_4:TRAP>>>) */}
              {activeQA.followUpTrap && (activeQA.followUpTrap.question || activeQA.followUpTrap.answer) && (
                <div className="liquid-glass-card rounded-2xl p-4 sm:p-5 space-y-2.5">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-violet-400 shadow-[0_0_8px_rgba(167,139,250,0.85)]" />
                    <span className="text-xs font-mono font-bold tracking-wider uppercase text-violet-200">
                      PHASE 4 · Пастка інтервʼюера (Follow-Up Shield)
                    </span>
                  </div>
                  {activeQA.followUpTrap.question && (
                    <div className="text-[var(--hud-font,16px)] leading-[1.55] font-medium text-white">
                      <strong className="text-zinc-400 font-mono text-xs font-semibold mr-1.5">Q:</strong>
                      {stripRawMarkdownAsterisks(cleanStreamText(activeQA.followUpTrap.question))}
                    </div>
                  )}
                  {activeQA.followUpTrap.answer && (
                    <div className="text-[var(--hud-font,16px)] leading-[1.55] text-zinc-200 bg-white/[0.04] p-3.5 rounded-xl border border-white/[0.10]">
                      <strong className="text-zinc-400 font-mono text-xs font-semibold mr-1.5">A:</strong>
                      {stripRawMarkdownAsterisks(cleanStreamText(activeQA.followUpTrap.answer))}
                    </div>
                  )}
                </div>
              )}

              {activeQA.deliveryTip && (
                <div className="liquid-glass-card flex items-start gap-2.5 p-4 rounded-2xl text-zinc-200 text-xs">
                  <Lightbulb className="w-4 h-4 mt-0.5 shrink-0 text-amber-300" />
                  <span className="leading-relaxed">
                    <strong className="text-white font-semibold">Delivery Tip: </strong>
                    {stripRawMarkdownAsterisks(cleanStreamText(activeQA.deliveryTip))}
                  </span>
                </div>
              )}
            </motion.article>
          ) : isCopilotGenerating ? (
            <div className="liquid-glass-card rounded-2xl p-4 space-y-3 animate-pulse">
              <div className="h-5 rounded bg-white/[0.09] w-11/12" />
              <div className="h-5 rounded bg-white/[0.09] w-9/12" />
              <div className="h-5 rounded bg-white/[0.06] w-10/12" />
            </div>
          ) : (
            <div className="h-full min-h-[260px] flex flex-col items-center justify-center text-center text-zinc-400 gap-2">
              <ScrollText className="w-8 h-8 text-cyan-300/70" />
              <p className="text-sm text-zinc-300">Очікую запитання — відповідь з&apos;явиться тут у 3 фазах</p>
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* In 100% Focus mode, provide compact manual question bar without needing the left column */}
      {isFullTeleprompter && (
        <div className="px-4 py-2.5 border-t border-white/[0.10] bg-white/[0.025] backdrop-blur-xl">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const inp = e.currentTarget.elements.namedItem('focusPrompt') as HTMLInputElement | null;
              if (inp && inp.value.trim()) {
                processAggregatedQuestion(inp.value.trim(), true);
                inp.value = '';
              }
            }}
            className="flex items-center gap-2 max-w-2xl mx-auto"
          >
            <input
              name="focusPrompt"
              type="text"
              placeholder="Запитати ШІ вручну у Фокус-режимі..."
              className="flex-1 bg-white/[0.05] border border-white/[0.12] rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-400 focus:outline-none focus:border-cyan-400/45 font-mono"
            />
            <button
              type="submit"
              className="liquid-glass-pill px-3 py-2 rounded-xl hover:bg-white/[0.14] text-zinc-100 text-xs font-mono font-semibold transition cursor-pointer shrink-0"
            >
              Enter ↵
            </button>
          </form>
        </div>
      )}

      {/* Floating Return to Current Live Answer Pill */}
      {interviewQAs.length > 0 && activeQA && activeQA.id !== interviewQAs[0].id && (
        <button
          type="button"
          onClick={() => {
            setActiveQAId(interviewQAs[0].id);
            if (prompterRef.current) {
              prompterRef.current.scrollTop = 0;
            }
          }}
          className="liquid-glass-dock absolute bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full border-emerald-400/35 text-white text-xs font-mono font-semibold flex items-center gap-2 hover:bg-white/[0.14] transition-all cursor-pointer z-30"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.95)]" />
          <span>Повернутися до поточної відповіді</span>
        </button>
      )}
    </section>
  );

  return (
    <SubpageStripesContainer
      pattern="horizon"
      glowIntensity={0.08}
      className="stealth-bg font-sans relative selection:bg-cyan-400/25 selection:text-white overflow-x-hidden"
    >
      {/* TOP DYNAMIC ISLAND CAPSULE — Apple Spatial Glass Bar */}
      <header className="fixed top-2 inset-x-0 z-40 px-2 sm:px-4 pointer-events-none select-none">
        <div className="pointer-events-auto max-w-[1520px] mx-auto px-3 sm:px-4 py-1.5 rounded-2xl bg-[#090b11]/82 backdrop-blur-2xl border border-white/12 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.12),0_16px_44px_rgba(0,0,0,0.75)] flex items-center justify-between gap-2">
          {/* LEFT: Logo Quick Exit + Stack/Profile Selector + Audio Equalizer */}
          <div className="flex items-center gap-2 min-w-0 shrink-0">
            <Link
              href="/"
              onClick={() => {
                if (isCapturing) handleStop();
              }}
              className="flex items-center gap-2 px-2 py-1 rounded-xl hover:bg-white/[0.08] transition-colors shrink-0"
              title="На головну Ghostboard"
            >
              <GhostDetectiveLogo size="mini" />
              <span className="hidden md:inline font-display text-xs font-bold tracking-tight text-white">
                Ghostboard
              </span>
            </Link>

            <span className="hidden sm:block h-4 w-px bg-white/12" />

            {/* Profile / Stack Quick Pill */}
            <button
              type="button"
              onClick={() => setIsProfileOpen(true)}
              title="Змінити стек / профіль кандидата"
              className="liquid-glass-pill hidden sm:inline-flex items-center gap-1.5 py-1 px-2.5 rounded-xl hover:bg-white/[0.12] text-xs font-mono text-zinc-100 max-w-[180px] cursor-pointer transition-colors"
            >
              <User className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
              <span className="truncate">{candidateProfile?.role || 'Full-Stack'}</span>
            </button>

            <div
              ref={vuMeterRef}
              className="flex items-end gap-0.5 h-4 px-1"
              title="Рівень аудіо"
            >
              <span className="w-1 bg-emerald-400 rounded-full transition-all duration-75" style={{ height: 'var(--vu-1, 20%)' }} />
              <span className="w-1 bg-cyan-400 rounded-full transition-all duration-75" style={{ height: 'var(--vu-2, 35%)' }} />
              <span className="w-1 bg-cyan-300 rounded-full transition-all duration-75" style={{ height: 'var(--vu-3, 25%)' }} />
              <span className="w-1 bg-white rounded-full transition-all duration-75" style={{ height: 'var(--vu-4, 15%)' }} />
            </div>

            <button
              type="button"
              onClick={() => {
                const next = audioSource === 'tab' ? 'mic' : 'tab';
                setAudioSource(next);
              }}
              title="Перемкнути режим каналів (Інтерв'юер / 2 Канали)"
              className="liquid-glass-pill min-h-7 py-1 px-2.5 rounded-xl hover:bg-white/[0.12] text-xs font-mono font-medium text-zinc-100 flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              {audioSource === 'tab' ? (
                <>
                  <GitMerge className="w-3.5 h-3.5 text-sky-300 shrink-0" />
                  <span className="hidden lg:inline">2 Канали</span>
                </>
              ) : (
                <>
                  <Crosshair className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
                  <span className="hidden lg:inline">Інтерв&apos;юер</span>
                </>
              )}
            </button>
          </div>

          {/* CENTER: Live Sound + Latency Capsule */}
          <div className="flex items-center justify-center min-w-0">
            <button
              type="button"
              onClick={handleToggleFreeze}
              title="Клікніть або натисніть Space для заморозки / розморозки суфлера"
              className={`min-h-7 py-1 px-3 rounded-full text-xs font-mono flex items-center gap-2 truncate cursor-pointer transition-all border ${
                isFrozen
                  ? 'bg-cyan-500/20 border-cyan-300/35 text-cyan-100 shadow-[0_0_20px_rgba(34,211,238,0.2)]'
                  : 'liquid-glass-pill hover:border-white/30 text-zinc-100'
              }`}
            >
              {isFrozen ? (
                <>
                  <Snowflake className="w-3.5 h-3.5 text-cyan-300 shrink-0" />
                  <span>Frozen (Space)</span>
                  {pendingNewCount > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full bg-cyan-300 text-zinc-950 font-bold text-xs tabular-nums">
                      +{pendingNewCount}
                    </span>
                  )}
                </>
              ) : (
                <span className="inline-flex items-center gap-2 tabular-nums">
                  <span className="relative flex h-2 w-2 shrink-0">
                    <span className={`absolute inline-flex h-full w-full rounded-full ${isCapturing ? 'bg-emerald-400 animate-ping opacity-75' : 'bg-zinc-500 opacity-0'}`} />
                    <span className={`relative inline-flex rounded-full h-2 w-2 ${isCapturing ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)]' : 'bg-emerald-400/75'}`} />
                  </span>
                  <span>{isCapturing ? 'Слухаю' : 'Готовий'}</span>
                  <span className="text-zinc-500">·</span>
                  <span className="inline-flex items-center gap-1 text-emerald-300 font-semibold">
                    <Zap className="w-3 h-3" />
                    {activeQA?.ttftMs ? `${activeQA.ttftMs}ms` : '180ms'}
                  </span>
                </span>
              )}
            </button>
          </div>

          {/* RIGHT: Mode + Focus (Tab) + Tidy Options Popover */}
          <div className="flex items-center gap-1.5 shrink-0" ref={optionsMenuRef}>
            <button
              type="button"
              onClick={() => handleToggleTriggerModeRef.current()}
              title="Режим тригера відповіді (Авто / Enter) [M]"
              className="liquid-glass-pill hidden xl:inline-flex min-h-7 py-1 px-2.5 rounded-xl hover:bg-white/[0.12] text-xs font-mono font-medium text-zinc-200 items-center gap-1.5 cursor-pointer transition-colors"
            >
              <span>{triggerMode === 'auto' ? 'Авто' : 'По Enter'}</span>
            </button>

            <button
              type="button"
              onClick={() => setIsFullTeleprompter((v) => !v)}
              title="Перемкнути 100% ширину суфлера (Tab)"
              className={`min-h-7 py-1 px-2.5 rounded-xl border text-xs font-mono font-medium transition-all cursor-pointer inline-flex items-center gap-1.5 ${
                isFullTeleprompter
                  ? 'bg-white text-zinc-950 border-white font-semibold shadow-[0_0_18px_rgba(255,255,255,0.22)]'
                  : 'liquid-glass-pill hover:bg-white/[0.12] text-zinc-100'
              }`}
            >
              {isFullTeleprompter ? (
                <PanelLeftClose className="w-3.5 h-3.5 text-zinc-900" />
              ) : (
                <Maximize2 className="w-3.5 h-3.5 text-zinc-300" />
              )}
              <span className="hidden sm:inline">Фокус (Tab)</span>
            </button>

            {/* Options Dropdown Popover */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsOptionsOpen((o) => !o)}
                aria-expanded={isOptionsOpen}
                className={`min-h-7 py-1 px-2.5 rounded-xl border text-xs font-mono font-medium transition-all cursor-pointer inline-flex items-center gap-1.5 ${
                  isOptionsOpen
                    ? 'bg-white/15 text-white border-white/30 backdrop-blur-xl'
                    : 'liquid-glass-pill hover:bg-white/[0.12] text-zinc-100'
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-zinc-300" />
                <span className="hidden sm:inline">Опції</span>
              </button>

              {isOptionsOpen && (
                <div className="liquid-glass-dock absolute right-0 top-11 w-80 sm:w-[340px] rounded-2xl p-4 space-y-3.5 z-50 border border-white/12 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.12),0_28px_70px_rgba(0,0,0,0.9)]">
                  {/* Stacked Header — Zero Collision with long Role names */}
                  <div className="border-b border-white/[0.10] pb-3 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-display text-sm font-semibold text-white">
                        Опції телепромптера
                      </span>
                      <span className="text-xs font-mono text-zinc-400">
                        {candidateProfile?.level?.toUpperCase() || 'SENIOR'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setIsProfileOpen(true);
                        setIsOptionsOpen(false);
                      }}
                      className="w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/15 border border-cyan-400/20 text-left transition-colors cursor-pointer"
                    >
                      <span className="text-xs font-mono text-cyan-300 truncate">
                        {candidateProfile?.role || 'Full-Stack Developer'}
                      </span>
                      <span className="text-[11px] font-mono text-zinc-300 shrink-0">Змінити →</span>
                    </button>
                  </div>

                  {/* Мова відповідей */}
                  <div className="space-y-1.5">
                    <span className="text-xs font-medium text-zinc-300 block">Мова відповідей</span>
                    <div className="grid grid-cols-2 gap-1.5">
                      {[
                        { id: 'auto', label: 'Авто' },
                        { id: 'bilingual_uk', label: 'Bilingual (EN+UA)' },
                        { id: 'uk', label: 'Українська' },
                        { id: 'en', label: 'English' },
                      ].map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => handleAiLanguageChange(opt.id)}
                          className={`py-1.5 px-2.5 rounded-xl border text-xs font-mono transition-all cursor-pointer ${
                            aiLanguageMode === opt.id
                              ? 'bg-white text-zinc-950 border-white font-semibold shadow-sm'
                              : 'bg-white/[0.04] border-white/[0.10] text-zinc-200 hover:bg-white/[0.09]'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Режим тригера + Прозорість */}
                  <div className="flex items-center justify-between gap-2 pt-1">
                    <span className="text-xs text-zinc-300">Авто-відповідь AI</span>
                    <button
                      type="button"
                      onClick={() => handleToggleTriggerModeRef.current()}
                      className="px-2.5 py-1 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-xs font-mono text-white cursor-pointer"
                    >
                      {triggerMode === 'auto' ? 'Авто (Silent)' : 'Вручну (Enter)'}
                    </button>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-zinc-300">Прозорість HUD</span>
                      <span className="font-mono tabular-nums text-zinc-200">{hudOpacity}%</span>
                    </div>
                    <input
                      type="range"
                      min={50}
                      max={100}
                      step={5}
                      value={hudOpacity}
                      onChange={(e) => setHudOpacity(Number(e.target.value))}
                      className="w-full accent-cyan-300 cursor-pointer"
                    />
                  </div>

                  {/* Розмір шрифту */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-zinc-300">Розмір тексту</span>
                      <span className="font-mono tabular-nums text-zinc-200">{fontSize}px</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setFontSize((s) => Math.max(14, s - 2))}
                        className="flex-1 py-1.5 rounded-xl border border-white/[0.12] bg-white/[0.05] text-xs font-mono text-zinc-100 hover:bg-white/[0.12] transition-colors cursor-pointer"
                      >
                        A-
                      </button>
                      <button
                        type="button"
                        onClick={() => setFontSize((s) => Math.min(30, s + 2))}
                        className="flex-1 py-1.5 rounded-xl border border-white/[0.12] bg-white/[0.05] text-xs font-mono text-zinc-100 hover:bg-white/[0.12] transition-colors cursor-pointer"
                      >
                        A+
                      </button>
                    </div>
                  </div>

                  {/* Secondary Actions */}
                  <div className="grid grid-cols-2 gap-1.5 pt-2 border-t border-white/[0.10]">
                    <button
                      type="button"
                      onClick={() => {
                        handleTriggerScreenshot();
                        setIsOptionsOpen(false);
                      }}
                      className="px-2.5 py-2 rounded-xl border border-white/[0.10] bg-white/[0.04] hover:bg-white/[0.10] text-xs text-zinc-100 inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Camera className="w-3.5 h-3.5 text-sky-300" />
                      <span>Скріншот</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsProfileOpen(true);
                        setIsOptionsOpen(false);
                      }}
                      className="px-2.5 py-2 rounded-xl border border-white/[0.10] bg-white/[0.04] hover:bg-white/[0.10] text-xs text-zinc-100 inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <User className="w-3.5 h-3.5 text-emerald-300" />
                      <span>Профіль</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsSoundCheckOpen(true);
                        setIsOptionsOpen(false);
                      }}
                      className="px-2.5 py-2 rounded-xl border border-white/[0.10] bg-white/[0.04] hover:bg-white/[0.10] text-xs text-zinc-100 inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Headphones className="w-3.5 h-3.5 text-cyan-300" />
                      <span>Звук</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsHistoryOpen(true);
                        setIsOptionsOpen(false);
                      }}
                      className="px-2.5 py-2 rounded-xl border border-white/[0.10] bg-white/[0.04] hover:bg-white/[0.10] text-xs text-zinc-100 inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <History className="w-3.5 h-3.5 text-violet-300" />
                      <span>Історія</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsCompanionQROpen(true);
                        setIsOptionsOpen(false);
                      }}
                      className="px-2.5 py-2 rounded-xl border border-white/[0.10] bg-white/[0.04] hover:bg-white/[0.10] text-xs text-zinc-100 inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <QrCode className="w-3.5 h-3.5 text-amber-300" />
                      <span>Companion</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (isCapturing) handleStop();
                        router.push('/');
                      }}
                      className="px-2.5 py-2 rounded-xl border border-white/[0.10] bg-white/[0.04] hover:bg-white/[0.10] text-xs text-zinc-200 inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Вихід</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Mobile tab switcher */}
      <div className="lg:hidden relative z-10 px-4 pt-16">
        <div className="liquid-glass-pill grid grid-cols-2 p-1 rounded-xl text-xs font-mono">
          {(['hearing', 'prompter'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setMobileTab(tab)}
              className={`py-2 rounded-lg transition cursor-pointer ${mobileTab === tab ? 'bg-white text-zinc-950 font-bold shadow' : 'text-zinc-300'}`}
            >
              {tab === 'hearing' ? 'Dialogue' : 'Teleprompter'}
            </button>
          ))}
        </div>
      </div>

      <main
        className="relative z-10 mx-auto w-full max-w-[1560px] px-3 sm:px-6 pt-4 lg:pt-16 pb-24 h-[calc(100vh-1rem)] min-h-[520px]"
        style={{ opacity: hudOpacity / 100 }}
      >
        <div className="hidden lg:flex h-full gap-4">
          {!isFullTeleprompter && (
            <div
              className={`${
                isAnswerActiveOrStreaming ? 'w-[26%]' : 'w-[38%]'
              } h-full min-w-[260px] transition-all duration-200 ease-out`}
            >
              {hearingPane}
            </div>
          )}
          <div
            className={`${
              isFullTeleprompter ? 'w-full' : isAnswerActiveOrStreaming ? 'w-[74%]' : 'w-[62%]'
            } h-full transition-all duration-200 ease-out`}
          >
            {prompterPane}
          </div>
        </div>
        <div className="lg:hidden h-full">{mobileTab === 'hearing' ? hearingPane : prompterPane}</div>
      </main>

      <StealthCommandDock
        isCapturing={isCapturing}
        isFrozen={isFrozen}
        pendingNewCount={pendingNewCount}
        triggerMode={triggerMode}
        audioSource={audioSource}
        sessionDuration={sessionDuration}
        hasActiveQA={!!activeQA}
        isRefining={isCopilotGenerating}
        onToggleFreeze={handleToggleFreeze}
        onTriggerBridge={handleTriggerBridge}
        onRefineQA={(key) => {
          if (key === 'code') setIsCodeExpanded(true);
          if (activeQA) handleRefineQA(activeQA.id, key);
        }}
        onToggleAudioSource={() => {
          const next = audioSource === 'tab' ? 'mic' : 'tab';
          setAudioSource(next);
          toast.info(next === 'tab' ? '2 Канали: Meeting tab + Microphone' : 'Інтервʼюер: Microphone only');
        }}
        onAnswerNow={() => handleManualEnterTriggerRef.current()}
        onStartCapture={handleStartCaptureRequest}
        onStopCapture={handleStop}
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

      <CommandPalette isOpen={isPaletteOpen} onClose={() => setIsPaletteOpen(false)} commands={paletteCommands} />

      <TrialLimitBanner
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
