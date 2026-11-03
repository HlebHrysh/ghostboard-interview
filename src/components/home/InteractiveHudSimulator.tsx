'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  Zap,
  Code2,
  Copy,
  Check,
  Pause,
  Play,
  X,
  Send,
  Mic,
  MicOff,
  Volume2,
  AlertTriangle,
  Layers,
  Search,
  MessageSquare,
  Terminal,
  Eye,
  Monitor,
  ShieldCheck,
  RefreshCw,
  ChevronDown,
  Globe,
} from 'lucide-react';
import type { HomeTranslations } from '@/lib/homeI18n';
import { trackFunnelEvent } from '@/lib/croTelemetry';
import { useLocale } from '@/contexts/LocaleContext';
import { AudioWaveEqualizer } from '@/components/interview/AudioWaveEqualizer';
import { parseStructuredGhostboardOutput, MetaTagInfo } from '@/lib/aiPromptCore';

interface Props {
  t: HomeTranslations;
}

type DirectorModifier = 'normal' | 'shorter' | 'simpler' | 'code' | 're_angle';
type ViewMode = 'candidate' | 'recruiter';
type LanguageOption = 'auto' | 'bilingual' | 'uk' | 'en';

interface DialogueMessage {
  id: string;
  speaker: 'interlocutor' | 'candidate';
  text: string;
  timestamp: number;
}

const SPRING_PHYSICS = {
  type: 'spring' as const,
  stiffness: 350,
  damping: 28,
  mass: 0.6,
};

const QUICK_CHIPS = [
  'React + SQL',
  'Docker vs VM',
  'Event Loop у JS',
  'Проектування Rate Limiter',
  'REST vs gRPC',
] as const;

const MODIFIERS: Array<{ id: DirectorModifier; label: string; title: string }> = [
  { id: 'shorter', label: 'Коротше', title: 'Стиснути до 3 коротких тез' },
  { id: 'simpler', label: 'Простіше', title: 'Пояснити на пальцях без важкого жаргону' },
  { id: 'code', label: 'Код', title: 'Одразу чистий робочий код + O(n)' },
  { id: 're_angle', label: 'Інший підхід', title: 'Альтернативна архітектура та компроміси' },
];

const PYTEST_LINES: string[] = [
  '$ pytest -q tests/',
  '============ test session starts ============',
  'collected 48 items',
  '',
  'tests/test_ledger.py ........            [ 16%]',
  'tests/test_locks.py ..........            [ 37%]',
  'tests/test_api.py ................        [ 70%]',
  'tests/test_pipeline.py ..............     [100%]',
  '',
  '============ 48 passed in 2.14s ============',
];

interface ISpeechRecognitionEvent {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: {
      isFinal: boolean;
      [index: number]: {
        transcript: string;
      };
    };
  };
}

interface ISpeechRecognitionErrorEvent {
  error: string;
}

interface ISpeechRecognitionInstance {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  onstart: (() => void) | null;
  onresult: ((event: ISpeechRecognitionEvent) => void) | null;
  onerror: ((event: ISpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

declare global {
  interface Window {
    SpeechRecognition?: new () => ISpeechRecognitionInstance;
    webkitSpeechRecognition?: new () => ISpeechRecognitionInstance;
  }
}

/**
 * Format markdown **bold** text without raw asterisks
 */
function renderFormattedInlineText(text: string): React.ReactNode {
  if (!text) return null;
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  if (parts.length === 1) return text;
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

/**
 * Renders bilingual phrases (Ukrainian translation in subtle pill)
 */
function renderBilingualPhrase(text: string): React.ReactNode {
  if (!text) return null;
  const regex = /(\([^)]*[а-яА-ЯёЁіІїЇєЄґҐ][^)]*\))/g;
  const parts = text.split(regex);
  if (parts.length === 1) {
    return <span>{renderFormattedInlineText(text)}</span>;
  }
  return parts.map((part, idx) => {
    if (regex.test(part)) {
      regex.lastIndex = 0;
      return (
        <span
          key={idx}
          className="text-zinc-400 text-xs italic bg-white/[0.04] px-1.5 py-0.5 rounded border border-white/5 ml-1.5 inline-block font-normal"
        >
          {part}
        </span>
      );
    }
    return <span key={idx}>{renderFormattedInlineText(part)}</span>;
  });
}

/**
 * Renders pillars with bold anchor keywords at the beginning (Rule of 2 Seconds).
 */
function renderPillarWithAnchor(text: string): React.ReactNode {
  const colonIdx = text.indexOf(':');
  if (colonIdx > 0 && colonIdx <= 45) {
    const rawAnchor = text.slice(0, colonIdx).trim();
    const cleanAnchor = rawAnchor.replace(/^\*\*|\*\*$/g, '').trim();
    const rest = text.slice(colonIdx + 1);
    return (
      <>
        <span className="text-white font-semibold bg-white/10 px-1.5 py-0.5 rounded mr-1.5 text-xs border border-white/10">
          {cleanAnchor}
        </span>
        {renderBilingualPhrase(rest)}
      </>
    );
  }
  const dashMatch = text.match(/^([^-—]{3,35})\s*[-—]\s*(.*)$/);
  if (dashMatch) {
    const cleanAnchor = dashMatch[1].replace(/^\*\*|\*\*$/g, '').trim();
    return (
      <>
        <span className="text-white font-semibold bg-white/10 px-1.5 py-0.5 rounded mr-1.5 text-xs border border-white/10">
          {cleanAnchor}
        </span>
        <span className="text-zinc-400 mx-1">—</span>
        {renderBilingualPhrase(dashMatch[2])}
      </>
    );
  }
  return renderBilingualPhrase(text);
}

export function InteractiveHudSimulator({ t }: Props) {
  const { locale } = useLocale();

  // Mode and Views
  const [viewMode, setViewMode] = useState<ViewMode>('candidate');
  const [isFrozen, setIsFrozen] = useState(false);
  const [panic, setPanic] = useState(false);
  const [hovered, setHovered] = useState(false);

  // Settings & Language
  const [selectedLanguage, setSelectedLanguage] = useState<LanguageOption>('uk');
  const [activeModifier, setActiveModifier] = useState<DirectorModifier>('normal');

  // Input & Dialogue State
  const [isMounted, setIsMounted] = useState(false);
  const [manualInput, setManualInput] = useState('');
  const [searchDialogue, setSearchDialogue] = useState('');
  const [dialogueMessages, setDialogueMessages] = useState<DialogueMessage[]>([
    {
      id: 'init-msg',
      speaker: 'interlocutor',
      text: 'Як влаштовані B-Tree індекси в PostgreSQL і коли вони стають неефективними?',
      timestamp: 1710000000000,
    },
  ]);
  const [liveInterim, setLiveInterim] = useState('');
  const [activeQuestion, setActiveQuestion] = useState('Як влаштовані B-Tree індекси в PostgreSQL?');

  // Voice Recognition
  const [isListening, setIsListening] = useState(false);
  const [audioLevel, setAudioLevel] = useState(15);
  const recognitionRef = useRef<ISpeechRecognitionInstance | null>(null);

  // Real AI Streaming State
  const [isGenerating, setIsGenerating] = useState(false);
  const [ttftMs, setTtftMs] = useState<number | null>(180);
  const [liveTtftCounter, setLiveTtftCounter] = useState('0.18s');
  const [aiMeta, setAiMeta] = useState<MetaTagInfo | null>({
    domain: 'Backend',
    level: 'Senior',
    language: 'UK',
    raw: 'Databases • PostgreSQL • Senior',
  });
  const [hudError, setHudError] = useState<{ code: string; message: string } | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedHook, setCopiedHook] = useState(false);

  // Typewriter progressive display state
  const [displayedHook, setDisplayedHook] = useState(
    'Індекси в Postgres — це окремі збалансовані B-Tree структури, що вказують на TID сторінок Heap за O(log N).'
  );
  const [displayedPillars, setDisplayedPillars] = useState<string[]>([
    'B-Tree Механіка: Швидкий бінарний пошук діапазонів значень без повного сканування таблиці.',
    'HOT Updates: Heap-Only Tuples дозволяють уникнути оновлення індексу при зміні неіндексованих полів.',
    'Write Overhead: Кожен INSERT/UPDATE оновлює сторінки індексу та створює Table Bloat.',
  ]);
  const [displayedDeepDive, setDisplayedDeepDive] = useState(
    '```sql\nCREATE INDEX CONCURRENTLY idx_users_org ON users (org_id)\nWHERE deleted_at IS NULL;\n```'
  );

  // Targets from real streaming parser
  const targetAnswerRef = useRef<{
    hook: string;
    pillars: string[];
    deepDive: string;
  }>({
    hook: displayedHook,
    pillars: displayedPillars,
    deepDive: displayedDeepDive,
  });

  const abortControllerRef = useRef<AbortController | null>(null);
  const pacerTimerRef = useRef<number | null>(null);
  const ttftTimerRef = useRef<number | null>(null);
  const frozenRef = useRef(false);
  const dialogueEndRef = useRef<HTMLDivElement>(null);
  const answerScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    frozenRef.current = isFrozen;
  }, [isFrozen]);

  // Audio level animation effect
  useEffect(() => {
    if (!isListening && !isGenerating) {
      setAudioLevel(0);
      return;
    }
    const interval = setInterval(() => {
      setAudioLevel(isListening ? Math.floor(Math.random() * 65 + 30) : Math.floor(Math.random() * 25 + 10));
    }, 120);
    return () => clearInterval(interval);
  }, [isListening, isGenerating]);

  // Proximity auto-scroll dialogue to bottom
  useEffect(() => {
    dialogueEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [dialogueMessages, liveInterim]);

  /**
   * Smooth Token Pacer: High-frequency client loop (13ms tick)
   * Progressively reveals characters into Hook -> Pillars -> Deep Dive
   * Blinking cursor '▍' shows active typing position
   * Spacebar Freeze halts typing instantly
   */
  const startSmoothPacer = useCallback(() => {
    if (pacerTimerRef.current) clearInterval(pacerTimerRef.current);

    pacerTimerRef.current = window.setInterval(() => {
      if (frozenRef.current) return;

      const target = targetAnswerRef.current;
      const targetHook = target.hook;
      const targetPillars = target.pillars;
      const targetDeepDive = target.deepDive;

      // 1. Advance Hook
      let hookDone = false;
      setDisplayedHook((prev) => {
        if (prev.length < targetHook.length) {
          return targetHook.slice(0, prev.length + 2);
        }
        hookDone = true;
        return prev;
      });

      if (!hookDone) return;

      // 2. Advance Pillars
      let pillarsDone = false;
      setDisplayedPillars((prevPillars) => {
        const next = [...prevPillars];
        for (let i = 0; i < targetPillars.length; i++) {
          const cur = next[i] || '';
          const tgt = targetPillars[i] || '';
          if (cur.length < tgt.length) {
            next[i] = tgt.slice(0, cur.length + 2);
            return next;
          }
        }
        pillarsDone = true;
        return next;
      });

      if (!pillarsDone) return;

      // 3. Advance Deep Dive
      setDisplayedDeepDive((prev) => {
        if (prev.length < targetDeepDive.length) {
          return targetDeepDive.slice(0, prev.length + 3);
        }
        return prev;
      });
    }, 13);
  }, []);

  /**
   * REAL SSE Streaming: Calls /api/ai/dual-stream without fake canned fallbacks!
   */
  const triggerAiQuery = useCallback(
    async (queryText: string, modifier: DirectorModifier = activeModifier, lang: LanguageOption = selectedLanguage) => {
      const q = queryText.trim();
      if (!q) return;

      // Abort previous stream if active
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      setActiveQuestion(q);
      setIsGenerating(true);
      setHudError(null);
      setTtftMs(null);
      setIsFrozen(false);
      frozenRef.current = false;
      setPanic(false);

      // Clear previous output targets
      targetAnswerRef.current = { hook: '', pillars: [], deepDive: '' };
      setDisplayedHook('');
      setDisplayedPillars([]);
      setDisplayedDeepDive('');

      // Start live TTFT millisecond stopwatch
      const requestStartMs = performance.now();
      setLiveTtftCounter('0.02s');
      if (ttftTimerRef.current) clearInterval(ttftTimerRef.current);
      ttftTimerRef.current = window.setInterval(() => {
        if (frozenRef.current) return;
        const elapsed = ((performance.now() - requestStartMs) / 1000).toFixed(2) + 's';
        setLiveTtftCounter(elapsed);
      }, 16);

      // Start token pacer loop
      startSmoothPacer();

      trackFunnelEvent('simulator_question_triggered', {
        locale,
        questionId: q.slice(0, 32),
        mode: viewMode,
      });

      try {
        const response = await fetch('/api/ai/dual-stream?demo=1', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-ghostboard-demo': 'true',
          },
          body: JSON.stringify({
            question: q,
            directorModifier: modifier,
            outputLanguage: lang,
            helperLanguage: 'uk',
          }),
          signal: abortController.signal,
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error || `HTTP ${response.status}: Помилка з'єднання з ШІ-сервісом`);
        }

        if (!response.body) {
          throw new Error('Отримано порожнє тіло відповіді від сервера.');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let fullText = '';
        let firstTokenTime: number | null = null;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          let currentEvent = 'chunk';
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;

            if (trimmed.startsWith('event:')) {
              currentEvent = trimmed.replace(/^event:\s*/, '').trim();
              continue;
            }

            if (trimmed.startsWith('data:')) {
              const jsonStr = trimmed.replace(/^data:\s*/, '').trim();
              if (jsonStr === '[DONE]') continue;

              try {
                const parsed = JSON.parse(jsonStr);

                if (currentEvent === 'telemetry') {
                  const ms = parsed.ttftMs || Math.round(performance.now() - requestStartMs);
                  setTtftMs(ms);
                  setLiveTtftCounter(`${(ms / 1000).toFixed(2)}s`);
                  if (ttftTimerRef.current) clearInterval(ttftTimerRef.current);
                } else if (currentEvent === 'meta') {
                  setAiMeta({
                    domain: parsed.domain || 'Engineering',
                    level: parsed.level || 'Senior',
                    language: parsed.language || 'UA',
                    raw: parsed.raw || `${parsed.domain} • ${parsed.level}`,
                  });
                } else if (currentEvent === 'chunk' && parsed.text) {
                  fullText += parsed.text;

                  // Parse structured phases from accumulated text in real time
                  const structured = parseStructuredGhostboardOutput(fullText);

                  // Visible TTFT: moment first human-readable hook token is ready for render
                  if (!firstTokenTime && (structured.hook.length > 0 || (!fullText.startsWith('<<<') && fullText.trim().length > 0))) {
                    firstTokenTime = performance.now();
                    const ms = Math.round(firstTokenTime - requestStartMs);
                    setTtftMs(ms);
                    setLiveTtftCounter(`${(ms / 1000).toFixed(2)}s`);
                    if (ttftTimerRef.current) clearInterval(ttftTimerRef.current);
                  }
                  targetAnswerRef.current = {
                    hook: structured.hook,
                    pillars: structured.pillars,
                    deepDive: structured.deepDive,
                  };
                  if (structured.meta) {
                    setAiMeta(structured.meta);
                  }
                } else if (currentEvent === 'error') {
                  throw new Error(parsed.message || 'Помилка генерації відповіді ШІ.');
                }
              } catch (e: unknown) {
                // If explicit throw, propagate
                if ((e as Error)?.message?.includes('Помилка')) throw e;
              }
            }
          }
        }

        // Finalize parsed structured content
        const finalStructured = parseStructuredGhostboardOutput(fullText);
        targetAnswerRef.current = {
          hook: finalStructured.hook || fullText.slice(0, 160),
          pillars: finalStructured.pillars.length > 0 ? finalStructured.pillars : [fullText.slice(160, 320)],
          deepDive: finalStructured.deepDive,
        };
      } catch (err: unknown) {
        if ((err as Error)?.name === 'AbortError') return;
        const msg = (err as Error)?.message || 'Не вдалося отримати відповідь від ШІ. Спробуйте ще раз.';
        setHudError({ code: 'AI_STREAM_ERROR', message: msg });
      } finally {
        setIsGenerating(false);
        if (ttftTimerRef.current) clearInterval(ttftTimerRef.current);
      }
    },
    [activeModifier, locale, selectedLanguage, startSmoothPacer, viewMode]
  );

  // Submit manual text question
  const handleManualSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!manualInput.trim() || isGenerating) return;

    const q = manualInput.trim();
    setDialogueMessages((prev) => [
      ...prev,
      {
        id: `user-${Date.now()}`,
        speaker: 'candidate',
        text: q,
        timestamp: Date.now(),
      },
    ]);
    setManualInput('');
    triggerAiQuery(q, activeModifier, selectedLanguage);
  };

  // Click quick chip
  const handleChipClick = (chip: string) => {
    setDialogueMessages((prev) => [
      ...prev,
      {
        id: `chip-${Date.now()}`,
        speaker: 'interlocutor',
        text: chip,
        timestamp: Date.now(),
      },
    ]);
    triggerAiQuery(chip, activeModifier, selectedLanguage);
  };

  // Modifier click
  const handleModifierClick = (mod: DirectorModifier) => {
    setActiveModifier(mod);
    triggerAiQuery(activeQuestion, mod, selectedLanguage);
  };

  // Language switch
  const handleLanguageChange = (lang: LanguageOption) => {
    setSelectedLanguage(lang);
    triggerAiQuery(activeQuestion, activeModifier, lang);
  };

  // Web Speech API Voice Recognition Toggle
  const toggleSpeech = () => {
    if (typeof window === 'undefined') return;
    const SpeechRecognitionAPI =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognitionAPI) {
      setHudError({
        code: 'SPEECH_UNSUPPORTED',
        message: 'Розпізнавання голосу не підтримується цим браузером. Використовуйте Chrome, Edge або текстовий ввід.',
      });
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognitionAPI();
      recognitionRef.current = recognition;
      recognition.lang = selectedLanguage === 'en' ? 'en-US' : 'uk-UA';
      recognition.interimResults = true;
      recognition.continuous = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
        setHudError(null);
      };

      recognition.onresult = (event: ISpeechRecognitionEvent) => {
        let finalTrans = '';
        let interimTrans = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTrans += event.results[i][0].transcript;
          } else {
            interimTrans += event.results[i][0].transcript;
          }
        }
        const text = finalTrans || interimTrans;
        if (text) {
          setLiveInterim(text);
        }
      };

      recognition.onerror = (e: ISpeechRecognitionErrorEvent) => {
        setIsListening(false);
        if (e.error === 'not-allowed') {
          setHudError({
            code: 'MIC_DENIED',
            message: 'Доступ до мікрофона заблоковано в браузері. Дозвольте доступ для запитань голосом.',
          });
        }
      };

      recognition.onend = () => {
        setIsListening(false);
        setLiveInterim((latest) => {
          if (latest.trim().length > 3) {
            const spoken = latest.trim();
            setDialogueMessages((prev) => [
              ...prev,
              {
                id: `voice-${Date.now()}`,
                speaker: 'interlocutor',
                text: spoken,
                timestamp: Date.now(),
              },
            ]);
            triggerAiQuery(spoken, activeModifier, selectedLanguage);
          }
          return '';
        });
      };

      recognition.start();
    } catch {
      setIsListening(false);
    }
  };

  // Keyboard Shortcuts: Space = Freeze, Esc = Panic Hide
  useEffect(() => {
    if (!hovered) return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        if (e.key === 'Escape') target.blur();
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        setIsFrozen((f) => !f);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setPanic((p) => !p);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [hovered]);

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyHook = (hook: string) => {
    navigator.clipboard.writeText(hook);
    setCopiedHook(true);
    setTimeout(() => setCopiedHook(false), 2000);
  };

  const filteredDialogue = dialogueMessages.filter((m) =>
    m.text.toLowerCase().includes(searchDialogue.toLowerCase())
  );

  return (
    <section id="simulator" className="relative py-16 sm:py-24 px-4 sm:px-6 scroll-mt-24">
      <div className="max-w-6xl mx-auto">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-8">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-zinc-900 border border-white/10 text-xs font-mono text-zinc-300 mb-4 shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>GHOSTBOARD COPILOT • LIVE STREAM HUD</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-white">
            {t.simulator.title}
          </h2>
          <p className="mt-3 text-sm sm:text-base text-zinc-400 leading-relaxed">
            Справжній бойовий інтерфейс десктопного Ghostboard. Введіть будь-яке тех-запитання чи говоріть у мікрофон — ШІ відповідає наживо без затримок.
          </p>
        </div>

        {/* HUD Window Container matching desktop/src/components/HudWindow.tsx */}
        <div
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          className={`relative rounded-2xl overflow-hidden border transition-all duration-300 shadow-[0_20px_50px_rgba(0,0,0,0.95)] ring-1 ring-inset ring-white/[0.04] ${
            viewMode === 'recruiter'
              ? 'border-emerald-500/80 ring-2 ring-emerald-500/20'
              : 'border-white/[0.12] bg-[#09090b]/95'
          }`}
        >
          {/* Recruiter Stealth Mode Banner */}
          <AnimatePresence initial={false}>
            {viewMode === 'recruiter' && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={SPRING_PHYSICS}
                className="overflow-hidden bg-emerald-600 text-white"
              >
                <div className="px-4 py-2 flex items-center justify-between gap-3 text-xs font-medium">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-white animate-ping shrink-0" />
                    <span>Recruiter View — Захоплення екрана Zoom/Meet (WDA_EXCLUDEFROMCAPTURE)</span>
                  </div>
                  <div className="flex items-center gap-1.5 font-mono text-[11px] bg-emerald-700 px-2.5 py-0.5 rounded">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>ACTIVE STEALTH</span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* 1. TOP FLOATING NOTCH / TITLEBAR (Exact clone of HudWindow.tsx) */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 px-3.5 py-2.5 border-b border-zinc-800/80 bg-zinc-950/80 select-none">
            {/* Left: Indicator, Title, Audio Equalizer, Status, Meta Pill */}
            <div className="flex items-center gap-2 flex-wrap min-w-0">
              <span className={`w-2 h-2 rounded-full shrink-0 ${panic ? 'bg-zinc-600' : 'bg-emerald-400 animate-pulse'}`} />
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-200">
                Ghostboard Copilot
              </span>
              <span className="text-[11px] font-mono text-zinc-400 bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded-md font-medium hidden sm:inline">
                Gemini 2.5 Flash
              </span>

              {/* 5-bar live Audio Equalizer */}
              <AudioWaveEqualizer level={audioLevel} isActive={isListening || isGenerating} />

              {/* Live Status Badge */}
              {isListening ? (
                <span className="text-xs font-mono font-semibold text-rose-400 bg-rose-950/70 border border-rose-700/60 px-2 py-0.5 rounded-md flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping" />
                  Слухаю...
                </span>
              ) : isGenerating ? (
                <span className="text-xs font-mono font-semibold text-cyan-300 bg-cyan-950/70 border border-cyan-700/60 px-2 py-0.5 rounded-md flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                  {ttftMs ? `⚡ TTFT ${ttftMs}ms` : liveTtftCounter}
                </span>
              ) : ttftMs ? (
                <span className="text-xs font-mono font-semibold text-emerald-400 bg-emerald-950/70 border border-emerald-700/60 px-2 py-0.5 rounded-md">
                  ⚡ TTFT {ttftMs}ms
                </span>
              ) : null}

              {isFrozen && (
                <span className="text-xs font-mono font-semibold text-amber-300 bg-amber-950/70 border border-amber-700/60 px-2 py-0.5 rounded-md">
                  ⏸ FROZEN [Space]
                </span>
              )}

              {/* AI Meta Context Pill from <<<META>>> */}
              {aiMeta && !panic && (
                <motion.span
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="hidden md:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/25 text-cyan-300 font-mono text-[9px] font-semibold"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                  <span>{aiMeta.domain}</span>
                  <span className="text-zinc-600">•</span>
                  <span className="text-zinc-400">{aiMeta.level}</span>
                  <span className="text-zinc-600">•</span>
                  <span className="text-cyan-300 uppercase">{aiMeta.language}</span>
                </motion.span>
              )}
            </div>

            {/* Right: Language switch, Freeze, Stealth View, Panic */}
            <div className="flex items-center gap-1.5 shrink-0">
              {/* Language Selector */}
              <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-lg p-0.5 text-[11px] font-mono">
                {(['uk', 'en', 'bilingual'] as const).map((lng) => (
                  <button
                    key={lng}
                    onClick={() => handleLanguageChange(lng)}
                    className={`px-2 py-0.5 rounded transition cursor-pointer ${
                      selectedLanguage === lng
                        ? 'bg-zinc-800 text-white font-bold shadow-sm'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    {lng === 'uk' ? 'UA' : lng === 'en' ? 'EN' : 'Білінгв'}
                  </button>
                ))}
              </div>

              {/* Freeze Toggle */}
              <button
                onClick={() => setIsFrozen((f) => !f)}
                title={isFrozen ? 'Розморозити (Space)' : 'Заморозити (Space)'}
                className={`p-1.5 rounded-md border transition cursor-pointer ${
                  isFrozen
                    ? 'text-amber-400 bg-amber-950/60 border-amber-500/40'
                    : 'text-zinc-400 hover:text-white bg-zinc-900 border-zinc-800 hover:bg-zinc-800'
                }`}
              >
                {isFrozen ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
              </button>

              {/* View Mode Toggle */}
              <button
                onClick={() => {
                  const next = viewMode === 'candidate' ? 'recruiter' : 'candidate';
                  setViewMode(next);
                  trackFunnelEvent('stealth_toggle_switched', { locale, mode: next });
                }}
                title={viewMode === 'candidate' ? 'Перемкнути на Режим рекрутера' : 'Повернути вигляд кандидата'}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono font-medium border transition cursor-pointer ${
                  viewMode === 'recruiter'
                    ? 'bg-emerald-500 text-zinc-950 font-bold border-emerald-400 shadow-md'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-800'
                }`}
              >
                {viewMode === 'candidate' ? (
                  <>
                    <Eye className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Кандидат</span>
                  </>
                ) : (
                  <>
                    <Monitor className="w-3.5 h-3.5" />
                    <span>Рекрутер</span>
                  </>
                )}
              </button>

              {/* Panic Hide */}
              <button
                onClick={() => setPanic((p) => !p)}
                title="Panic Hide (Esc)"
                className="p-1.5 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-rose-400 hover:bg-zinc-800 transition cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* 2. MAIN TWO-COLUMN DISPLAY (Clone of DualColumnChat.tsx) */}
          <div className="relative min-h-[490px]">
            {panic ? (
              /* Simulated Terminal on Panic Hide (Esc) */
              <div className="p-4 bg-black font-mono text-xs text-zinc-300 min-h-[490px] flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 text-zinc-500 pb-2 mb-2 border-b border-zinc-900">
                    <Terminal className="w-3.5 h-3.5" />
                    <span>zsh — ~/work/backend/tests</span>
                  </div>
                  {PYTEST_LINES.map((line, idx) => (
                    <div
                      key={idx}
                      className={
                        line.includes('passed')
                          ? 'text-emerald-400 font-bold'
                          : line.startsWith('$')
                          ? 'text-zinc-100 font-bold'
                          : line.includes('.')
                          ? 'text-emerald-500'
                          : 'text-zinc-500'
                      }
                    >
                      {line || '\u00A0'}
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => setPanic(false)}
                  className="self-start mt-4 px-3 py-1.5 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white text-xs font-mono cursor-pointer"
                >
                  Повернути суфлер (Esc)
                </button>
              </div>
            ) : viewMode === 'recruiter' ? (
              /* Recruiter Invisibility View */
              <div className="flex flex-col items-center justify-center p-12 text-center min-h-[490px] bg-zinc-950/70 select-none">
                <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mb-4">
                  <ShieldCheck className="w-8 h-8 text-emerald-400" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">
                  Повна невидимість на демонстрації екрана
                </h3>
                <p className="text-xs text-zinc-400 max-w-md leading-relaxed mb-6">
                  Завдяки системному прапору <code className="text-emerald-300">WDA_EXCLUDEFROMCAPTURE</code> вікно Ghostboard не потрапляє у стрім Zoom, Google Meet чи Teams. Рекрутер бачить лише ваш робочий стіл або код.
                </p>
                <button
                  onClick={() => setViewMode('candidate')}
                  className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs transition cursor-pointer shadow-lg shadow-emerald-500/20"
                >
                  Повернутися до суфлера кандидата
                </button>
              </div>
            ) : (
              /* Dual Column Interactive HUD */
              <div className="grid grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-zinc-800/80 min-h-[490px]">
                {/* ── LEFT COLUMN: LIVE DIALOGUE ── */}
                <div className="col-span-12 lg:col-span-5 flex flex-col min-h-0 p-3.5 bg-zinc-950/40 relative overflow-hidden">
                  <div className="pointer-events-none absolute -top-24 -left-24 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl" />

                  {/* Header */}
                  <div className="flex items-center justify-between pb-2.5 border-b border-zinc-800/80 shrink-0">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-3.5 h-3.5 text-cyan-400" />
                      <span className="text-xs font-semibold tracking-wider uppercase text-zinc-300">
                        Живий діалог
                      </span>
                    </div>
                    <span className="text-[10px] text-zinc-500 font-mono">
                      {dialogueMessages.length} реплік
                    </span>
                  </div>

                  {/* Search within dialogue */}
                  <div className="py-2 border-b border-zinc-800/60">
                    <div className="relative flex items-center">
                      <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5" />
                      <input
                        type="text"
                        value={searchDialogue}
                        onChange={(e) => setSearchDialogue(e.target.value)}
                        placeholder="Пошук у репліках..."
                        className="w-full pl-8 pr-3 py-1 text-xs bg-white/[0.03] border border-white/[0.06] rounded-lg text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-cyan-500/50"
                      />
                    </div>
                  </div>

                  {/* Dialogue Messages Container */}
                  <div className="flex-1 overflow-y-auto py-2.5 space-y-2.5 pr-1 text-xs select-text max-h-[300px] lg:max-h-[340px] scrollbar-thin">
                    {filteredDialogue.map((msg) => {
                      const isInterlocutor = msg.speaker === 'interlocutor';
                      return (
                        <div
                          key={msg.id}
                          className={`p-3 rounded-xl border transition-all ${
                            isInterlocutor
                              ? 'bg-[#101014] border-white/10 text-zinc-100 shadow-md'
                              : 'bg-white/[0.04] border-white/[0.08] text-zinc-300 ml-4'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1.5 mb-1.5 text-xs font-mono">
                            {isInterlocutor ? (
                              <span className="text-cyan-300 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-500/40 font-bold flex items-center gap-1 text-[11px]">
                                <Volume2 className="w-3 h-3 text-cyan-400" /> Інтерв&apos;юер
                              </span>
                            ) : (
                              <span className="text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/50 font-bold flex items-center gap-1 text-[11px]">
                                <Mic className="w-3 h-3 text-emerald-400" /> Ви
                              </span>
                            )}
                            <span className="text-zinc-500 text-[10px]" suppressHydrationWarning>
                              {isMounted
                                ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                                : '12:00:00'}
                            </span>
                          </div>
                          <p className="leading-relaxed whitespace-pre-wrap text-xs sm:text-sm font-medium text-zinc-100">
                            {msg.text}
                          </p>
                        </div>
                      );
                    })}

                    {/* Live speech interim transcription */}
                    {liveInterim && (
                      <div className="p-3 rounded-xl bg-cyan-950/20 border border-dashed border-cyan-500/40 text-xs text-zinc-200 animate-pulse">
                        <div className="flex items-center gap-2 mb-1 text-[11px] font-mono text-cyan-400 font-bold">
                          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                          <span>Розпізнавання наживо...</span>
                        </div>
                        <p className="italic text-xs text-cyan-200">{liveInterim}▍</p>
                      </div>
                    )}
                    <div ref={dialogueEndRef} />
                  </div>

                  {/* 1-Click Quick Speed Chips inside Left Column */}
                  <div className="pt-2 border-t border-zinc-800/80 mt-auto">
                    <div className="text-[10px] font-mono text-zinc-500 mb-1.5 flex items-center gap-1">
                      <Zap className="w-3 h-3 text-cyan-400" />
                      <span>Перевірити швидкість в 1 клік:</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {QUICK_CHIPS.map((chip) => (
                        <button
                          key={chip}
                          type="button"
                          onClick={() => handleChipClick(chip)}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-white/[0.04] hover:bg-white/[0.09] border border-white/10 text-zinc-300 hover:text-white transition cursor-pointer whitespace-nowrap active:scale-95"
                        >
                          {chip}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* ── RIGHT COLUMN: AI TELEPROMPTER (Hook -> Pillars -> Deep Dive) ── */}
                <div
                  ref={answerScrollRef}
                  className="col-span-12 lg:col-span-7 flex flex-col min-h-0 p-4 bg-zinc-950/60 relative overflow-hidden"
                >
                  <div className="pointer-events-none absolute -top-24 -right-24 w-72 h-72 bg-gradient-to-tr from-cyan-500/10 via-transparent to-violet-500/10 rounded-full blur-3xl" />

                  {/* Right Header: Model, Status & Copy */}
                  <div className="flex items-center justify-between pb-2.5 border-b border-zinc-800/80 shrink-0">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
                      <span className="text-xs font-semibold tracking-wider uppercase text-zinc-300">
                        AI Teleprompter
                      </span>
                      {activeModifier !== 'normal' && (
                        <span className="text-[9px] uppercase font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                          {activeModifier}
                        </span>
                      )}
                      {isGenerating && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                          STREAMING
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-xs">
                      {displayedHook && (
                        <button
                          onClick={() => handleCopyHook(displayedHook)}
                          className="flex items-center gap-1 text-[11px] text-zinc-400 hover:text-white transition cursor-pointer"
                        >
                          {copiedHook ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedHook ? 'Скопійовано' : 'Копіювати хук'}</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Active Question Bar */}
                  {activeQuestion && (
                    <div className="py-2 text-[11px] font-mono text-zinc-400 border-l-2 border-zinc-700 pl-2.5 my-1 italic truncate">
                      «{activeQuestion}»
                    </div>
                  )}

                  {/* Content Area */}
                  <div className="flex-1 overflow-y-auto space-y-3.5 pr-1 select-text scrollbar-thin max-h-[380px]">
                    {hudError ? (
                      /* Real Error Card (No fake fallback!) */
                      <div className="p-3.5 rounded-xl bg-gradient-to-b from-rose-950/40 via-zinc-950/80 to-zinc-950 border border-rose-800/50 text-rose-200 space-y-2.5">
                        <div className="flex items-center gap-2 text-rose-400 font-semibold text-xs">
                          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400 animate-pulse" />
                          <span>Помилка генерації ({hudError.code})</span>
                        </div>
                        <p className="text-xs text-rose-300/90 leading-relaxed font-mono whitespace-pre-wrap bg-black/60 p-2.5 rounded-lg border border-rose-900/40">
                          {hudError.message}
                        </p>
                        <button
                          onClick={() => triggerAiQuery(activeQuestion, activeModifier, selectedLanguage)}
                          className="px-3 py-1.5 rounded-lg bg-rose-900/70 hover:bg-rose-800 border border-rose-700/60 text-xs font-medium text-white transition flex items-center gap-1.5 cursor-pointer"
                        >
                          <RefreshCw className="w-3 h-3" />
                          <span>Спробувати знову</span>
                        </button>
                      </div>
                    ) : !displayedHook && !isGenerating ? (
                      /* Empty State */
                      <div className="h-full flex flex-col items-center justify-center text-center p-8 text-zinc-500">
                        <Sparkles className="w-10 h-10 mb-3 opacity-30 text-amber-400" />
                        <p className="text-sm font-medium text-zinc-300">Готовий генерувати відповіді</p>
                        <p className="text-xs text-zinc-500 mt-1 max-w-xs">
                          Задайте запитання в полі нижче або виберіть один із чипів — ШІ почне по-токенну трансляцію за ~180мс.
                        </p>
                      </div>
                    ) : (
                      <>
                        {/* PHASE 1: SPOKEN HOOK */}
                        {displayedHook && (
                          <div className="pl-4 pr-3.5 py-3 border-l-4 border-l-amber-400/90 rounded-r-xl bg-white/[0.02] border-y border-r border-white/[0.05] shadow-[0_4px_20px_rgba(245,158,11,0.06)] relative">
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-[11px] font-mono uppercase tracking-wider text-amber-400 font-bold flex items-center gap-1.5">
                                <Zap className="w-3.5 h-3.5" /> Фаза 1: Голосовий старт (Hook)
                              </span>
                            </div>
                            <div className="text-base sm:text-[17px] font-medium text-white leading-relaxed tracking-tight font-sans">
                              {renderBilingualPhrase(displayedHook)}
                              {isGenerating && displayedPillars.length === 0 && (
                                <span className="inline-block w-1.5 h-4 ml-1 rounded-sm bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.9)] animate-pulse align-middle" />
                              )}
                            </div>
                          </div>
                        )}

                        {/* PHASE 2: CORE PILLARS (Clean Vertical List of 3 items with Anchors) */}
                        {displayedPillars.length > 0 && (
                          <div className="space-y-2">
                            <span className="text-[11px] font-mono uppercase tracking-wider text-cyan-400 font-bold flex items-center gap-1.5 px-1">
                              <Layers className="w-3.5 h-3.5" /> Фаза 2: Ключові тези (Pillars)
                            </span>
                            <div className="grid grid-cols-1 gap-2">
                              {displayedPillars.map((pillar, idx) => (
                                <div
                                  key={idx}
                                  className="p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.05] border border-white/[0.08] text-xs sm:text-sm leading-relaxed text-zinc-200 flex items-start gap-2.5 transition-all"
                                >
                                  <span className="w-5 h-5 rounded-md bg-cyan-500/10 text-cyan-300 font-mono text-xs font-bold flex items-center justify-center shrink-0 border border-cyan-500/30 mt-0.5">
                                    {idx + 1}
                                  </span>
                                  <div className="flex-1 text-zinc-100 font-medium">
                                    {renderPillarWithAnchor(pillar)}
                                    {isGenerating && idx === displayedPillars.length - 1 && !displayedDeepDive && (
                                      <span className="inline-block w-1.5 h-4 ml-1 rounded-sm bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.9)] animate-pulse align-middle" />
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* PHASE 3: DEEP DIVE & CODE */}
                        {displayedDeepDive && (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between px-1">
                              <span className="text-[11px] font-mono uppercase tracking-wider text-emerald-400 font-bold flex items-center gap-1.5">
                                <Code2 className="w-3.5 h-3.5" /> Фаза 3: Deep Dive & Код
                              </span>
                              <button
                                onClick={() => handleCopyCode(displayedDeepDive)}
                                className="text-[11px] font-mono text-zinc-400 hover:text-white flex items-center gap-1 transition cursor-pointer"
                              >
                                {copiedCode ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                                <span>{copiedCode ? 'Скопійовано' : 'Копіювати код'}</span>
                              </button>
                            </div>
                            <div className="rounded-xl overflow-hidden border border-white/[0.1] bg-[#050607]">
                              <pre className="p-3 font-mono text-xs overflow-x-auto text-emerald-400 leading-relaxed whitespace-pre-wrap">
                                <code>{displayedDeepDive}</code>
                                {isGenerating && (
                                  <span className="inline-block w-1.5 h-4 ml-1 rounded-sm bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.9)] animate-pulse align-middle" />
                                )}
                              </pre>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 3. BOTTOM CONTROLS & MANUAL PROMPT BAR (Clone of HudWindow.tsx footer) */}
          <div className="p-3 border-t border-zinc-800/80 bg-zinc-950/80 flex flex-col gap-2.5 select-none">
            {/* Quick Modifiers Row */}
            <div className="flex items-center justify-between gap-2 overflow-x-auto">
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => triggerAiQuery('Як працюють індекси в Postgres і коли вони неефективні?', 'normal')}
                  disabled={isGenerating}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-950/70 border border-emerald-700/70 text-emerald-300 hover:bg-emerald-900/90 hover:text-white transition flex items-center gap-1.5 disabled:opacity-40 shadow-sm cursor-pointer"
                  title="Тестовий запит до реального ШІ"
                >
                  <Zap className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Тест ШІ</span>
                </button>

                {MODIFIERS.map((mod) => (
                  <button
                    key={mod.id}
                    type="button"
                    onClick={() => handleModifierClick(mod.id)}
                    disabled={isGenerating}
                    title={mod.title}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition cursor-pointer disabled:opacity-40 shadow-sm ${
                      activeModifier === mod.id
                        ? 'bg-zinc-800 text-white border-zinc-600'
                        : 'bg-white/5 hover:bg-white/10 border-white/10 text-zinc-300 hover:text-white'
                    }`}
                  >
                    {mod.label}
                  </button>
                ))}
              </div>

              <div className="hidden sm:flex items-center gap-2 text-[11px] font-mono text-zinc-500 shrink-0">
                <span>Пробіл — Freeze</span>
                <span>•</span>
                <span>Esc — Panic Hide</span>
              </div>
            </div>

            {/* Manual Prompt Input with Mic inside HUD */}
            <form onSubmit={handleManualSubmit} className="flex items-center gap-2">
              <div className="relative flex-1 flex items-center">
                <input
                  type="text"
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                  placeholder="Запитати ШІ або перевірити своє питання... (Enter)"
                  className="w-full bg-zinc-900/90 border border-zinc-800 rounded-xl pl-3.5 pr-10 py-2 text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-600 transition"
                />
                <button
                  type="button"
                  onClick={toggleSpeech}
                  title={isListening ? 'Зупинити запис' : 'Запитати голосом'}
                  className={`absolute right-2 p-1.5 rounded-lg transition cursor-pointer ${
                    isListening
                      ? 'bg-rose-500 text-white animate-pulse'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                  }`}
                >
                  {isListening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                </button>
              </div>

              <button
                type="submit"
                disabled={!manualInput.trim() || isGenerating}
                className="px-4 py-2 rounded-xl bg-white hover:bg-zinc-200 disabled:bg-zinc-800 disabled:text-zinc-600 text-zinc-950 font-semibold text-xs transition cursor-pointer flex items-center gap-1.5 shrink-0"
              >
                <span>Запитати</span>
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </div>

        {/* Post-Stream Conversion Banner */}
        <AnimatePresence>
          {!isGenerating && displayedHook && (
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8 }}
              transition={SPRING_PHYSICS}
              className="mt-4 p-4 rounded-xl bg-[#09090b]/90 border border-white/[0.12] backdrop-blur-xl shadow-xl flex flex-col sm:flex-row items-center justify-between gap-3 text-zinc-300"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0">
                  <Zap className="w-4 h-4 text-emerald-400 animate-pulse" />
                </div>
                <div className="text-xs leading-snug">
                  <span className="font-semibold text-white">
                    Перший токен за {ttftMs ? `${(ttftMs / 1000).toFixed(2)}с` : liveTtftCounter} • Відповідь надруковано наживо.
                  </span>
                  <span className="block text-[11px] text-zinc-400">
                    У десктопній версії Ghostboard це працює автоматично через захоплення аудіо поверх Zoom/Meet.
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
                <a
                  href="/download"
                  className="flex-1 sm:flex-initial text-center px-4 py-2 rounded-xl bg-white hover:bg-zinc-200 text-zinc-950 font-bold text-xs transition shadow-md cursor-pointer"
                >
                  Завантажити Ghostboard Desktop
                </a>
                <button
                  type="button"
                  onClick={() => setViewMode(viewMode === 'recruiter' ? 'candidate' : 'recruiter')}
                  className="flex-1 sm:flex-initial px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium text-xs transition cursor-pointer"
                >
                  {viewMode === 'recruiter' ? 'Вигляд кандидата' : 'Перевірити Режим рекрутера'}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
export default InteractiveHudSimulator;
