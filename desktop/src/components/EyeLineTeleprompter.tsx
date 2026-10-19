import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Zap,
  Clock,
  Terminal,
  Pause,
  Play,
  Copy,
  Check,
  Code2,
  ChevronDown,
  ChevronUp,
  Layers,
  Sparkles,
  Trash2,
  Camera,
  MessageSquare,
  Mic,
  Volume2,
  VolumeX,
  Radio,
  User,
  Briefcase,
  Lock,
  Unlock,
  ExternalLink,
  ShieldCheck,
  ArrowDown,
  History,
  Smartphone,
  QrCode,
} from 'lucide-react';
import type { StructuredAnswerOutput } from '../lib/streamClient';
import type { CandidateProfile } from '../lib/profileStore';
import { parseStreamingMarkdown } from './DualColumnChat';
import {
  setWindowOpacity,
  startPkceLogin,
  startDeviceCodeFlow,
  logout,
} from '../lib/tauriBridge';

export type AudioSourceOption = 'loopback' | 'mic' | 'combined' | 'mute';

export interface EyeLineTeleprompterProps {
  mode?: 'notch' | 'chat' | 'ticker';
  activeQuestion: string;
  activeAnswer: StructuredAnswerOutput | null;
  isStreaming: boolean;
  isFrozen: boolean;
  isSpeech?: boolean;
  interviewerVolume?: number;
  candidateVolume?: number;
  liveTranscript?: string;
  speaker?: string;
  opacity?: number;
  isClickThrough?: boolean;
  isAuthenticated?: boolean;
  user?: { email?: string; plan?: string } | null;
  plan?: string;
  deviceCode?: { user_code: string; verification_uri: string; expires_in_sec: number } | null;
  connectionLatencyMs?: number;
  backendMode?: 'local' | 'cloud';
  onOpacityChange?: (opacity: number) => void;
  onToggleFreeze?: () => void;
  onToggleMode?: (mode: 'notch' | 'chat' | 'ticker') => void;
  onToggleClickThrough?: (enable?: boolean) => void;
  onApplyModifier?: (modifier: 'shorter' | 'more_technical' | 'code_example' | 'bridge' | 'tradeoffs') => void;
  onToggleBackendMode?: (mode: 'local' | 'cloud') => void;
  onTriggerPanic?: () => void;
  onTriggerAnswer?: (prompt?: string) => void;
  onTriggerScreenshot?: () => void;
  isCapturingScreen?: boolean;
  candidateProfile?: CandidateProfile;
  onOpenProfileModal?: () => void;
  onClearSession?: () => void;
  onAudioSourceChange?: (source: AudioSourceOption) => void;
  onOpenCompanionModal?: () => void;
  onOpenHistory?: () => void;
}

const SPRING_PHYSICS = {
  type: 'spring' as const,
  stiffness: 350,
  damping: 28,
  mass: 0.6,
};

function formatSessionTimer(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function renderInlineFormatting(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
      return (
        <strong key={i} className="font-semibold text-white">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
}

export const EyeLineTeleprompter: React.FC<EyeLineTeleprompterProps> = ({
  mode = 'notch',
  activeQuestion,
  activeAnswer,
  isStreaming,
  isFrozen,
  isSpeech = false,
  interviewerVolume = 0,
  candidateVolume = 0,
  liveTranscript = '',
  speaker = 'Співрозмовник',
  opacity = 0.95,
  isClickThrough = false,
  isAuthenticated = false,
  user = null,
  plan = 'pro',
  deviceCode = null,
  connectionLatencyMs = 42,
  backendMode = 'cloud',
  onOpacityChange,
  onToggleFreeze,
  onToggleMode,
  onToggleClickThrough,
  onApplyModifier,
  onToggleBackendMode,
  onTriggerPanic,
  onTriggerAnswer,
  onTriggerScreenshot,
  isCapturingScreen = false,
  candidateProfile,
  onOpenProfileModal,
  onClearSession,
  onAudioSourceChange,
  onOpenCompanionModal,
  onOpenHistory,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [copiedHook, setCopiedHook] = useState(false);
  const [copiedCodeIdx, setCopiedCodeIdx] = useState<number | null>(null);
  const [sessionSeconds, setSessionSeconds] = useState(0);
  const [localOpacity, setLocalOpacity] = useState(opacity);
  const [audioSource, setAudioSource] = useState<AudioSourceOption>('loopback');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [activeDeviceCode, setActiveDeviceCode] = useState<any>(deviceCode);
  const [copiedDeviceCode, setCopiedDeviceCode] = useState(false);

  // Auto-scroll state management
  const [isUserScrolled, setIsUserScrolled] = useState(false);
  const drawerScrollRef = useRef<HTMLDivElement | null>(null);
  const tickerScrollRef = useRef<HTMLDivElement | null>(null);

  // Sync session timer
  useEffect(() => {
    const timer = setInterval(() => {
      setSessionSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Sync external opacity
  useEffect(() => {
    setLocalOpacity(opacity);
  }, [opacity]);

  // Sync external device code
  useEffect(() => {
    if (deviceCode) setActiveDeviceCode(deviceCode);
  }, [deviceCode]);

  // Smooth 60fps auto-scroll for STT ticker tape on new transcript tokens
  useEffect(() => {
    if (tickerScrollRef.current) {
      requestAnimationFrame(() => {
        if (tickerScrollRef.current) {
          tickerScrollRef.current.scrollLeft = tickerScrollRef.current.scrollWidth;
        }
      });
    }
  }, [liveTranscript]);

  // Intelligent Auto-scroll for Drawer with user wheel detection
  useEffect(() => {
    if (isStreaming && !isUserScrolled && drawerScrollRef.current) {
      requestAnimationFrame(() => {
        if (drawerScrollRef.current) {
          drawerScrollRef.current.scrollTop = drawerScrollRef.current.scrollHeight;
        }
      });
    }
  }, [activeAnswer?.rawText, isStreaming, isUserScrolled]);

  const handleDrawerScroll = () => {
    if (!drawerScrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = drawerScrollRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 24;
    if (isAtBottom) {
      setIsUserScrolled(false);
    } else {
      setIsUserScrolled(true);
    }
  };

  const handleSnapToLive = () => {
    setIsUserScrolled(false);
    if (drawerScrollRef.current) {
      drawerScrollRef.current.scrollTo({
        top: drawerScrollRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  };

  const handleCopyHook = () => {
    if (activeAnswer?.hook && typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(activeAnswer.hook);
      setCopiedHook(true);
      setTimeout(() => setCopiedHook(false), 2000);
    }
  };

  const handleCopyCode = (code: string, idx: number) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(code);
      setCopiedCodeIdx(idx);
      setTimeout(() => setCopiedCodeIdx(null), 2000);
    }
  };

  const handleOpacitySlider = (val: number) => {
    const clamped = Math.max(0.15, Math.min(0.95, val));
    setLocalOpacity(clamped);
    onOpacityChange?.(clamped);
    setWindowOpacity(clamped).catch(() => {});
  };

  const cycleAudioSource = () => {
    const order: AudioSourceOption[] = ['loopback', 'mic', 'combined', 'mute'];
    const nextIdx = (order.indexOf(audioSource) + 1) % order.length;
    const nextSrc = order[nextIdx];
    setAudioSource(nextSrc);
    onAudioSourceChange?.(nextSrc);
  };

  const handleStartLogin = async () => {
    await startPkceLogin();
  };

  const handleRequestDeviceCode = async () => {
    const res = await startDeviceCodeFlow();
    if (res) setActiveDeviceCode(res);
  };

  const handleCopyDeviceCode = () => {
    if (activeDeviceCode?.user_code && typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(activeDeviceCode.user_code);
      setCopiedDeviceCode(true);
      setTimeout(() => setCopiedDeviceCode(false), 2000);
    }
  };

  const deepDiveSections = useMemo(() => {
    if (!activeAnswer?.deepDive) return [];
    return parseStreamingMarkdown(activeAnswer.deepDive, isStreaming);
  }, [activeAnswer?.deepDive, isStreaming]);

  const rmsLevel = Math.max(interviewerVolume, candidateVolume);

  return (
    <div
      className="w-full max-w-[720px] sm:max-w-[760px] mx-auto flex flex-col items-center select-none"
      style={{ opacity: localOpacity }}
    >
      {/* ─────────────────────────────────────────────────────────────
          1. TOP CONTROL PILL (Aligned Under Webcam, max-w-[720px] / max-w-[760px])
      ───────────────────────────────────────────────────────────── */}
      <motion.div
        layout
        transition={SPRING_PHYSICS}
        data-tauri-drag-region
        className="w-full max-w-[720px] sm:max-w-[760px] rounded-full backdrop-blur-md bg-zinc-900/80 border border-white/10 px-3.5 py-1.5 shadow-[0_12px_36px_rgba(0,0,0,0.85)] flex items-center justify-between text-xs select-none drag-region cursor-move relative z-30"
      >
        {/* Left Section: Latency, Timer, Audio Source & VU Meter */}
        <div className="flex items-center gap-2.5 no-drag">
          {/* Connection Latency Indicator (<80ms green, 80-200ms amber, >200ms red) */}
          <div
            className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.06] text-[10px] font-mono cursor-default"
            title={`WebSocket & LLM Latency: ${connectionLatencyMs}ms`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                connectionLatencyMs < 80
                  ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]'
                  : connectionLatencyMs < 200
                  ? 'bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.8)]'
                  : 'bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.8)] animate-pulse'
              }`}
            />
            <span
              className={
                connectionLatencyMs < 80
                  ? 'text-emerald-300'
                  : connectionLatencyMs < 200
                  ? 'text-amber-300'
                  : 'text-rose-300 font-bold'
              }
            >
              {connectionLatencyMs}ms
            </span>
          </div>

          {/* Session Timer */}
          <div className="flex items-center gap-1 text-zinc-400 font-mono text-[10px]">
            <Clock className="w-3 h-3 text-zinc-500" />
            <span>{formatSessionTimer(sessionSeconds)}</span>
          </div>

          {/* Audio Source Quick Switcher with Live RMS Signal Meter */}
          <button
            onClick={cycleAudioSource}
            title={`Audio Source: ${audioSource.toUpperCase()} (Click to toggle)`}
            className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] text-[10px] font-mono text-zinc-300 transition-all cursor-pointer"
          >
            {audioSource === 'loopback' && <Volume2 className="w-3 h-3 text-cyan-400" />}
            {audioSource === 'mic' && <Mic className="w-3 h-3 text-emerald-400" />}
            {audioSource === 'combined' && <Radio className="w-3 h-3 text-violet-400" />}
            {audioSource === 'mute' && <VolumeX className="w-3 h-3 text-rose-400" />}
            <span className="capitalize">{audioSource === 'loopback' ? 'Loopback' : audioSource}</span>

            {/* 4-Stage Reactive RMS LED Bar */}
            <div className="flex items-center gap-0.5 ml-1">
              {[0, 25, 50, 75].map((threshold, i) => (
                <span
                  key={i}
                  className={`w-1 h-2 rounded-[1px] transition-colors duration-75 ${
                    audioSource === 'mute'
                      ? 'bg-zinc-700'
                      : rmsLevel > threshold
                      ? i === 3
                        ? 'bg-rose-400 shadow-[0_0_4px_rgba(251,113,133,0.8)]'
                        : i === 2
                        ? 'bg-amber-400'
                        : 'bg-emerald-400'
                      : 'bg-white/10'
                  }`}
                />
              ))}
            </div>
          </button>
        </div>

        {/* Center Section: Hotkey Controls & Trigger Actions */}
        <div className="flex items-center gap-1.5 no-drag">
          {/* Answer ⌘↵ */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => onTriggerAnswer?.()}
            title="Ручна генерація відповіді [⌘↵ / Ctrl+Enter]"
            className="px-2 py-0.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 text-[10px] font-mono flex items-center gap-1 transition-all cursor-pointer"
          >
            <Sparkles className="w-3 h-3 text-cyan-400" />
            <span>Answer</span>
            <kbd className="px-1 rounded bg-black/40 text-cyan-400 text-[9px]">⌘↵</kbd>
          </motion.button>

          {/* Screenshot ⌘⇧S */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => onTriggerScreenshot?.()}
            title="Захоплення екрану для LeetCode/діаграм [⌘⇧S / Ctrl+Shift+S]"
            className={`px-2 py-0.5 rounded-lg border text-[10px] font-mono flex items-center gap-1 transition-all cursor-pointer ${
              isCapturingScreen
                ? 'bg-indigo-500/30 border-indigo-400 text-indigo-200 animate-pulse shadow-[0_0_12px_rgba(99,102,241,0.5)]'
                : 'bg-white/5 hover:bg-white/10 border-white/10 text-zinc-300'
            }`}
          >
            <Camera className={`w-3 h-3 ${isCapturingScreen ? 'text-indigo-300 animate-spin' : 'text-zinc-400'}`} />
            <span>{isCapturingScreen ? 'OCR...' : 'Snap'}</span>
            <kbd className="px-1 rounded bg-black/40 text-zinc-400 text-[9px]">⌘⇧S</kbd>
          </motion.button>

          {/* History ⌘H (Direct Notch Access) */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => onOpenHistory?.()}
            title="Історія співбесіди [⌘H / Ctrl+H]"
            className="px-2 py-0.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 text-[10px] font-mono flex items-center gap-1 transition-all cursor-pointer"
          >
            <History className="w-3 h-3 text-cyan-400" />
            <span>History</span>
            <kbd className="px-1 rounded bg-black/40 text-zinc-400 text-[9px]">⌘H</kbd>
          </motion.button>

          {/* Companion QR */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => onOpenCompanionModal?.()}
            title="Мобільний компаньйон (QR-код для телефону) [Phone Companion]"
            className="px-2 py-0.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/25 text-cyan-300 text-[10px] font-mono flex items-center gap-1 transition-all cursor-pointer"
          >
            <Smartphone className="w-3 h-3 text-cyan-400" />
            <span>QR</span>
          </motion.button>

          {/* Chat Expand ⌘⇧␣ */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => onToggleMode?.(mode === 'chat' ? 'notch' : 'chat')}
            title="Розгорнути в повнорозмірний чат [⌘⇧␣ / Ctrl+Shift+Space]"
            className="px-2 py-0.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 text-[10px] font-mono flex items-center gap-1 transition-all cursor-pointer"
          >
            <MessageSquare className="w-3 h-3 text-zinc-400" />
            <kbd className="px-1 rounded bg-black/40 text-zinc-400 text-[9px]">⌘⇧␣</kbd>
          </motion.button>

          {/* Clear ⌘⇧⌫ */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => onClearSession?.()}
            title="Очистити буфер мови та картки [⌘⇧⌫ / Ctrl+Shift+Backspace]"
            className="p-1 rounded-lg bg-white/5 hover:bg-rose-500/20 border border-white/10 hover:border-rose-500/30 text-zinc-400 hover:text-rose-300 text-[10px] transition-all cursor-pointer"
          >
            <Trash2 className="w-3 h-3" />
            <span className="sr-only">⌘⇧⌫</span>
          </motion.button>
        </div>

        {/* Right Section: Opacity, Click-Through, Auth Profile & Actions */}
        <div className="flex items-center gap-2 no-drag">
          {/* Opacity Slider (15% to 95%) */}
          <div className="flex items-center gap-1" title="Прозорість HUD (15% - 95%)">
            <input
              type="range"
              min={0.15}
              max={0.95}
              step={0.05}
              value={localOpacity}
              onChange={(e) => handleOpacitySlider(parseFloat(e.target.value))}
              className="w-12 h-1 bg-white/20 rounded-lg accent-cyan-400 cursor-pointer"
            />
            <span className="text-[9px] font-mono text-zinc-400 w-6 text-right">
              {Math.round(localOpacity * 100)}%
            </span>
          </div>

          <div className="w-[1px] h-3 bg-white/10 mx-0.5" />

          {/* Click-Through Toggle with Designated Hover Recovery Zone */}
          <button
            onClick={() => onToggleClickThrough?.(!isClickThrough)}
            title={
              isClickThrough
                ? 'Режим пропуску кліків УВІМКНЕНО [⌘⇧X / Ctrl+Shift+X]. Натисніть або наведіть, щоб повернути фокус.'
                : 'Увімкнути режим пропуску кліків [⌘⇧X / Ctrl+Shift+X]'
            }
            className={`p-1 rounded-md border text-[10px] pointer-events-auto transition-all cursor-pointer ${
              isClickThrough
                ? 'bg-amber-500/20 border-amber-500/40 text-amber-300 shadow-[0_0_8px_rgba(245,158,11,0.5)] animate-pulse'
                : 'bg-white/5 border-white/10 text-zinc-400 hover:text-white'
            }`}
          >
            {isClickThrough ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
          </button>

          {/* Candidate Profile Avatar & Seniority Level Badge */}
          <button
            onClick={onOpenProfileModal}
            title={`Профіль кандидата: ${candidateProfile?.role || 'Developer'} (${(candidateProfile?.experienceLevel || 'senior').toUpperCase()}). Натисніть для налаштування резюме та контексту.`}
            className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.1] text-[10px] font-mono cursor-pointer transition-all group"
          >
            <Briefcase className="w-3 h-3 text-violet-400 group-hover:text-violet-300 transition-colors" />
            <span
              className={`px-1 py-0.2 rounded text-[9px] font-bold ${
                (candidateProfile?.experienceLevel || 'senior').toLowerCase() === 'lead' || (candidateProfile?.experienceLevel || 'senior').toLowerCase() === 'principal'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  : (candidateProfile?.experienceLevel || 'senior').toLowerCase() === 'senior'
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                  : (candidateProfile?.experienceLevel || 'senior').toLowerCase() === 'middle'
                  ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
              }`}
            >
              {(candidateProfile?.experienceLevel || 'senior').toUpperCase()}
            </span>
          </button>

          {/* User Profile Avatar & Plan Badge */}
          <button
            onClick={() => setIsAuthModalOpen((p) => !p)}
            title={isAuthenticated ? `Акаунт: ${user?.email || 'Авторизовано'} (${plan.toUpperCase()})` : 'Увійти в акаунт'}
            className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.1] text-[10px] font-mono cursor-pointer transition-all"
          >
            <User className="w-3 h-3 text-cyan-400" />
            <span
              className={`px-1 py-0.2 rounded text-[9px] font-bold ${
                plan.toLowerCase() === 'pro'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
              }`}
            >
              {plan.toUpperCase()}
            </span>
          </button>

          {/* Backend URL Toggle (Local 3001 vs Cloud) */}
          <button
            onClick={() => onToggleBackendMode?.(backendMode === 'cloud' ? 'local' : 'cloud')}
            title={`Backend URL: ${backendMode === 'cloud' ? 'https://ghostboard.ai (Cloud)' : 'http://localhost:3001 (Local Dev Proxy)'}. Натисніть для перемикання.`}
            className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.1] text-[10px] font-mono cursor-pointer transition-all"
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                backendMode === 'cloud'
                  ? 'bg-cyan-400 shadow-[0_0_6px_rgba(34,211,238,0.8)]'
                  : 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]'
              }`}
            />
            <span className="text-[9px] text-zinc-300">
              {backendMode === 'cloud' ? 'Cloud' : 'Local:3001'}
            </span>
          </button>

          {/* Panic Hide (0ms Window Collapse) */}
          <button
            onClick={onTriggerPanic}
            title="Panic Button [⌘⇧H / Ctrl+Shift+H / F12]: миттєве приховування вікна"
            className="p-1 rounded-md border border-white/10 bg-white/5 text-zinc-400 hover:text-amber-300 transition-all cursor-pointer"
          >
            <Terminal className="w-3 h-3" />
          </button>

          {/* Expand/Collapse Teleprompter Drawer */}
          <button
            onClick={() => setIsExpanded((prev) => !prev)}
            title={isExpanded ? 'Згорнути телесуфлер' : 'Розгорнути телесуфлер'}
            className="p-1 rounded-md border border-white/10 bg-white/5 text-zinc-400 hover:text-cyan-300 transition-all cursor-pointer"
          >
            {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>
      </motion.div>

      {/* ─────────────────────────────────────────────────────────────
          2. STT LIVE TICKER TAPE (Smooth Gradient Edge Fadeout)
      ───────────────────────────────────────────────────────────── */}
      <motion.div
        layout
        transition={SPRING_PHYSICS}
        className="w-full max-w-[720px] sm:max-w-[760px] mt-1 h-8 px-3 rounded-xl bg-[#090b0e]/95 backdrop-blur-md border border-white/[0.1] shadow-lg flex items-center overflow-hidden relative select-none"
        style={{
          maskImage:
            'linear-gradient(to right, transparent 0, black 16px, black calc(100% - 16px), transparent 100%)',
          WebkitMaskImage:
            'linear-gradient(to right, transparent 0, black 16px, black calc(100% - 16px), transparent 100%)',
        }}
      >
        <span className="px-1.5 py-0.2 rounded bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-[9px] font-mono font-bold uppercase tracking-wider shrink-0 mr-2">
          {speaker}
        </span>

        <div
          ref={tickerScrollRef}
          className="flex-1 overflow-x-auto whitespace-nowrap scrollbar-none scroll-smooth text-[11px] text-zinc-100 font-medium"
        >
          {liveTranscript ? (
            <span className="font-medium tracking-wide">
              {liveTranscript}
              <span className="inline-block w-1.5 h-3 bg-cyan-400 ml-1 animate-pulse align-middle" />
            </span>
          ) : (
            <span className="text-zinc-500 italic text-[11px]">
              Співрозмовник говорить у відеодзвінку...
            </span>
          )}
        </div>
      </motion.div>

      {/* ─────────────────────────────────────────────────────────────
          3. EXPANDABLE GLASSMORPHIC TELEPROMPTER DRAWER
      ───────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0, scale: 0.98 }}
            animate={{ height: 'auto', opacity: 1, scale: 1 }}
            exit={{ height: 0, opacity: 0, scale: 0.98 }}
            transition={SPRING_PHYSICS}
            className="w-full max-w-[720px] sm:max-w-[760px] mt-1.5 rounded-2xl bg-[#0d0f14]/90 backdrop-blur-xl border border-white/[0.14] shadow-[0_20px_50px_rgba(0,0,0,0.95)] p-3.5 flex flex-col gap-2.5 select-text relative"
          >
            {/* Header: Question & Modifiers */}
            <div className="flex items-center justify-between pb-2 border-b border-white/[0.08]">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <span className="px-1.5 py-0.5 rounded bg-violet-500/20 border border-violet-500/30 text-violet-300 font-mono text-[9px] font-bold uppercase tracking-wider shrink-0">
                  Питання
                </span>
                <h2 className="text-xs font-semibold text-zinc-100 truncate">
                  {activeQuestion || 'Очікування запитання співрозмовника...'}
                </h2>
              </div>

              {/* 1-Click AI Modifiers */}
              <div className="flex items-center gap-1 shrink-0 ml-2">
                <button
                  onClick={() => onApplyModifier?.('bridge')}
                  title="Bridge Phrase [B] (виграти 10 секунд)"
                  className="px-1.5 py-0.5 rounded bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-[9px] font-mono transition-all cursor-pointer"
                >
                  Bridge [B]
                </button>
                <button
                  onClick={() => onApplyModifier?.('shorter')}
                  title="Blitz Mode [Q] (коротко 2-3 тези)"
                  className="px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 text-[9px] font-mono transition-all cursor-pointer"
                >
                  Blitz [Q]
                </button>
                <button
                  onClick={() => onApplyModifier?.('more_technical')}
                  title="Deep Dive [D] (архітектура та деталі)"
                  className="px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 text-[9px] font-mono transition-all cursor-pointer"
                >
                  Dive [D]
                </button>
                <button
                  onClick={() => onApplyModifier?.('code_example')}
                  title="Code Example [C]"
                  className="px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 text-[9px] font-mono transition-all cursor-pointer"
                >
                  Code [C]
                </button>
                <button
                  onClick={() => onApplyModifier?.('tradeoffs')}
                  title="Tradeoffs [T] (компроміси та архітектура)"
                  className="px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 text-[9px] font-mono transition-all cursor-pointer"
                >
                  Tradeoffs [T]
                </button>
              </div>
            </div>

            {/* ── PERSISTENT EXECUTIVE SUMMARY: TOP 3 PILLARS (Pinned Header) ── */}
            {activeAnswer?.pillars && activeAnswer.pillars.length > 0 && (
              <div className="p-2.5 rounded-xl bg-cyan-950/20 border border-cyan-500/25 shadow-sm space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-300 font-bold flex items-center gap-1">
                    <Layers className="w-3 h-3 text-cyan-400" /> Фаза 2: Ключові тези (3 Pillars)
                  </span>
                  <span className="text-[9px] font-mono text-cyan-400/80">3 PILLARS PINNED</span>
                </div>
                <div className="grid grid-cols-1 gap-1">
                  {activeAnswer.pillars.slice(0, 3).map((pillar, idx) => (
                    <div
                      key={idx}
                      className="px-2 py-1 rounded bg-[#090c12]/80 border border-white/[0.06] text-[11px] leading-tight text-zinc-200 flex items-start gap-1.5"
                    >
                      <span className="w-3.5 h-3.5 rounded-full bg-cyan-500/20 text-cyan-300 font-mono text-[9px] font-bold flex items-center justify-center shrink-0 border border-cyan-500/30 mt-0.5">
                        {idx + 1}
                      </span>
                      <div className="flex-1">{renderInlineFormatting(pillar)}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── SCROLLABLE READING BODY (With Max 65ch & Intelligent Auto-Scroll) ── */}
            <div
              ref={drawerScrollRef}
              onScroll={handleDrawerScroll}
              className="max-h-[300px] overflow-y-auto scrollbar-thin scrollbar-thumb-white/20 flex flex-col gap-2.5 pr-1 max-w-[65ch] mx-auto w-full"
            >
              {/* Phase 1: Spoken Hook */}
              <div className="rounded-xl bg-[#14120a] border border-amber-500/40 p-2.5 shadow-[0_0_15px_rgba(245,158,11,0.08)] relative group">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[9px] font-mono uppercase tracking-wider text-amber-400 font-bold flex items-center gap-1">
                    <Zap className="w-2.5 h-2.5" /> Фаза 1: Голосовий старт (дивіться у камеру)
                  </span>
                  <button
                    onClick={handleCopyHook}
                    className="text-[9px] text-zinc-400 hover:text-white flex items-center gap-1 px-1 py-0.5 rounded hover:bg-white/10 transition-all cursor-pointer"
                    title="Копіювати [⌘C]"
                  >
                    {copiedHook ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>⌘C</span>
                  </button>
                </div>

                <p className="text-xs font-medium text-amber-100/95 leading-relaxed tracking-tight">
                  {activeAnswer?.hook ? (
                    `"${activeAnswer.hook}"`
                  ) : (
                    <span className="text-zinc-500 italic text-[11px]">
                      Аналізую запитання та готую влучну голосову відповідь...
                    </span>
                  )}
                  {isStreaming && !activeAnswer?.pillars?.length && (
                    <span className="inline-block w-1.5 h-3 bg-amber-400 ml-1 animate-pulse align-middle" />
                  )}
                </p>
              </div>

              {/* Phase 3: Syntax-Highlighted Streaming Code & Markdown */}
              {deepDiveSections.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[9px] font-mono uppercase tracking-wider text-emerald-400 font-bold flex items-center gap-1 px-0.5">
                    <Code2 className="w-3 h-3" /> Фаза 3: Архітектурний Deep Dive
                  </span>

                  {deepDiveSections.map((section, idx) => {
                    if (section.type === 'code') {
                      return (
                        <div
                          key={idx}
                          className="rounded-xl overflow-hidden border border-white/20 bg-[#050608] shadow-md relative group font-mono"
                        >
                          <div className="px-2.5 py-1 bg-white/[0.05] border-b border-white/10 flex items-center justify-between text-[9px] text-zinc-300">
                            <span className="uppercase font-semibold text-cyan-400">
                              {section.language || 'code'}
                            </span>
                            <button
                              onClick={() => handleCopyCode(section.content, idx)}
                              className="flex items-center gap-1 hover:text-white transition-all cursor-pointer"
                            >
                              {copiedCodeIdx === idx ? (
                                <Check className="w-2.5 h-2.5 text-emerald-400" />
                              ) : (
                                <Copy className="w-2.5 h-2.5" />
                              )}
                              <span>Копіювати</span>
                            </button>
                          </div>
                          <pre className="p-2.5 text-[10.5px] leading-relaxed text-zinc-200 overflow-x-auto">
                            <code>{section.content}</code>
                            {section.isStreaming && (
                              <span className="inline-block w-1.5 h-3 bg-cyan-400 ml-1 animate-pulse align-middle" />
                            )}
                          </pre>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={idx}
                        className="text-[11px] text-zinc-200 leading-relaxed p-2 rounded-lg bg-[#12151c]/70 border border-white/10 shadow-sm"
                      >
                        {renderInlineFormatting(section.content)}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Floating Snap to Live Button */}
            <AnimatePresence>
              {isUserScrolled && isStreaming && (
                <motion.button
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  onClick={handleSnapToLive}
                  className="absolute bottom-4 right-4 z-20 px-2.5 py-1 rounded-full bg-cyan-500 hover:bg-cyan-400 text-black font-mono text-[10px] font-bold shadow-[0_0_15px_rgba(6,182,212,0.6)] flex items-center gap-1.5 cursor-pointer transition-all"
                >
                  <ArrowDown className="w-3 h-3 animate-bounce" />
                  <span>Живий потік (Live)</span>
                </motion.button>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─────────────────────────────────────────────────────────────
          4. AUTH & DEVICE CODE MODAL (PKCE + RFC 8628 Fallback)
      ───────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {isAuthModalOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={SPRING_PHYSICS}
            className="absolute top-12 right-0 w-80 p-4 rounded-2xl bg-[#090b0e]/95 backdrop-blur-2xl border border-white/20 shadow-2xl z-50 text-xs text-zinc-100 flex flex-col gap-3"
          >
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <div className="flex items-center gap-1.5 font-bold text-white">
                <ShieldCheck className="w-4 h-4 text-cyan-400" />
                <span>Авторизація Copilot</span>
              </div>
              <button
                onClick={() => setIsAuthModalOpen(false)}
                className="text-zinc-400 hover:text-white p-1 rounded cursor-pointer"
              >
                ✕
              </button>
            </div>

            {isAuthenticated ? (
              <div className="space-y-2.5">
                <div className="p-2.5 rounded-xl bg-white/[0.04] border border-white/10">
                  <div className="text-[10px] text-zinc-400">Поточний акаунт</div>
                  <div className="font-semibold text-zinc-100 truncate">{user?.email || 'Авторизований інженер'}</div>
                  <div className="mt-1 flex items-center gap-1 text-[10px] text-emerald-400 font-mono">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span>Тариф: {plan.toUpperCase()} ACTIVE</span>
                  </div>
                </div>
                <button
                  onClick={() => {
                    logout();
                    setIsAuthModalOpen(false);
                  }}
                  className="w-full py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-medium transition-all cursor-pointer"
                >
                  Вийти з акаунту
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="text-[11px] text-zinc-300 leading-snug">
                  Увійдіть через браузер для доступу до PRO-моделей та необмеженого суфлера.
                </div>

                {/* Primary Button: Browser OAuth PKCE */}
                <button
                  onClick={handleStartLogin}
                  className="w-full py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-semibold flex items-center justify-center gap-1.5 transition-all shadow-md cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Увійти через Браузер</span>
                </button>

                {/* Fallback Section: RFC 8628 Device Code */}
                <div className="pt-2 border-t border-white/10">
                  <div className="text-[10px] text-zinc-400 mb-1.5 flex items-center justify-between">
                    <span>Резервний Device Code (RFC 8628):</span>
                    {!activeDeviceCode && (
                      <button
                        onClick={handleRequestDeviceCode}
                        className="text-cyan-400 hover:underline cursor-pointer"
                      >
                        Отримати код
                      </button>
                    )}
                  </div>

                  {activeDeviceCode ? (
                    <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/10 text-center space-y-1.5">
                      <div className="text-[9px] text-zinc-400 font-mono">Введіть код на сторінці активації:</div>
                      <div className="text-lg font-mono font-bold tracking-wider text-amber-300">
                        {activeDeviceCode.user_code}
                      </div>
                      <button
                        onClick={handleCopyDeviceCode}
                        className="px-2.5 py-1 rounded bg-white/10 hover:bg-white/20 text-[10px] font-mono text-zinc-200 inline-flex items-center gap-1 transition-all cursor-pointer"
                      >
                        {copiedDeviceCode ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedDeviceCode ? 'Скопійовано' : 'Скопіювати код'}</span>
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
