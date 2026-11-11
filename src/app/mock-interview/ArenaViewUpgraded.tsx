'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  ArrowRight,
  RotateCcw,
  Volume2,
  VolumeX,
  Mic,
  MicOff,
  Send,
  CheckCircle2,
  AlertCircle,
  Clock,
  Award,
  Cpu,
  ArrowLeft,
  Settings2,
  FastForward,
  ChevronDown,
  ChevronUp,
  Zap,
  Flame,
  Keyboard,
} from 'lucide-react';
import { toast } from 'sonner';
import { HologramScorecard3D, ScorecardData } from '@/components/arena/HologramScorecard3D';
import { GhostDetectiveLogo } from '@/components/ui/GhostDetectiveLogo';
import { useLocale } from '@/contexts/LocaleContext';
import { LangDropdown } from '@/components/ui/LangDropdown';
import { getArenaTranslations } from '@/lib/arenaI18n';
import { SubpageStripesContainer } from '@/components/ui/SubpageStripesContainer';
import { ARENA_VOICES, ArenaVoice } from '@/lib/arenaVoices';
import { VoiceSelectorModal } from '@/components/arena/VoiceSelectorModal';
import { InterviewerVoiceWave } from '@/components/arena/InterviewerVoiceWave';
import { SeniorRubricTrapView } from './SeniorRubricTrapView';
import { UpgradedEvaluationResult } from '../api/ai/arena/evaluationHelper';

interface ArenaQuestion {
  id: string;
  index: number;
  topic: string;
  difficulty: string;
  question: string;
  isArchitectureCase: boolean;
  contextHint?: string;
}

interface VacancyProfile {
  roleTitle: string;
  seniority: string;
  techStack: string[];
  domain: string;
  focusAreas: string[];
  interviewerTitle: string;
  summary: string;
}

const ALL_TRACKS = [
  {
    id: 'frontend',
    title: 'Frontend Core',
    icon: '⚡',
    badge: 'React 19 & Web Vitals',
    description: 'React 19, Server Components, Streaming SSR, Web Vitals (INP/LCP), State Management, TypeScript',
    tech: ['React 19', 'Next.js App Router', 'TypeScript', 'Web Vitals', 'Tailwind'],
  },
  {
    id: 'backend',
    title: 'Backend Engineering',
    icon: '🛡️',
    badge: 'High-Load & Databases',
    description: 'PostgreSQL transactions & locking, Redis caching, Node.js / Go, API Security, Rate Limiting',
    tech: ['Node.js / Go', 'PostgreSQL', 'Redis', 'Transactions', 'API Security'],
  },
  {
    id: 'system_design',
    title: 'System Design & Arch',
    icon: '🏗️',
    badge: 'Distributed Systems',
    description: 'High availability, horizontal scaling, DB sharding, Kafka message queues, event-driven systems',
    tech: ['Microservices', 'Kafka', 'Sharding', 'Load Balancing', 'High Availability'],
  },
  {
    id: 'fullstack',
    title: 'Fullstack Systems',
    icon: '🌐',
    badge: 'End-to-End Modern Web',
    description: 'Next.js App Router, Node.js / Python, Prisma / Postgres, REST & GraphQL, Auth & Security',
    tech: ['Next.js', 'Prisma', 'REST / GraphQL', 'Cloud Deployment', 'Fullstack'],
  },
  {
    id: 'devops',
    title: 'DevOps & Cloud Platform',
    icon: '☁️',
    badge: 'K8s & Infrastructure',
    description: 'Kubernetes orchestration, Docker, Terraform IaC, CI/CD pipelines, Prometheus/Grafana observability',
    tech: ['Kubernetes', 'Docker', 'Terraform', 'CI/CD', 'Observability'],
  },
  {
    id: 'mobile',
    title: 'Mobile Architecture',
    icon: '📱',
    badge: 'Cross-Platform & Native',
    description: 'React Native, Flutter, offline-first sync, memory profiling, native bridges, Store deployments',
    tech: ['React Native', 'Flutter', 'Offline Sync', 'Memory Profiling', 'Bridge Opt'],
  },
];

const SAMPLE_VACANCIES = [
  {
    title: '⚡ FinTech Go Senior',
    text: `Senior Go Backend Developer (Highload & Payments)
Requirements:
- 4+ years of production Go experience
- Deep knowledge of PostgreSQL (MVCC, transactions, isolation levels, indexing)
- Experience with Apache Kafka, message delivery semantics (exactly-once, at-least-once)
- Distributed locking and idempotency in payment processing
- Microservices architecture, gRPC, Docker, Kubernetes
- High throughput API design (handling 10k+ RPS with sub-15ms p99 latency)`,
  },
  {
    title: '⚡ Lead Next.js & AI Frontend',
    text: `Lead Frontend Engineer (Next.js 16, React 19 & AI)
Requirements:
- 5+ years building complex web applications
- Deep expertise in React 19, Server Components, Streaming SSR, and Next.js App Router
- Modern state management, Web Vitals optimization (INP, LCP, CLS)
- Real-time WebSockets / Server-Sent Events, Web Audio API / MediaStream
- Experience integrating LLM streaming APIs (Gemini, OpenAI, Anthropic)
- High performance UI with canvas / Three.js / WebGL micro-interactions`,
  },
];

export function ArenaViewUpgraded() {
  const { locale } = useLocale();
  const a = getArenaTranslations(locale);
  const levels = a.levels || ['Junior', 'Middle', 'Senior', 'Staff'];

  // ── Stage: 'setup' | 'battle' | 'round_review' | 'finished'
  const [stage, setStage] = useState<'setup' | 'battle' | 'round_review' | 'finished'>('setup');

  // Setup mode: 'presets' | 'vacancy'
  const [setupMode, setSetupMode] = useState<'presets' | 'vacancy'>('presets');
  const [selectedTrack, setSelectedTrack] = useState<string>('frontend');
  const [selectedLevel, setSelectedLevel] = useState<string>('Senior');
  const [candidateName, setCandidateName] = useState<string>('Senior Dev');
  const [vacancyText, setVacancyText] = useState<string>('');
  const [vacancyProfile, setVacancyProfile] = useState<VacancyProfile | null>(null);

  // Voice Selection State
  const [selectedVoice, setSelectedVoice] = useState<ArenaVoice>(ARENA_VOICES[0]);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState<boolean>(false);

  // Battle session state
  const [questions, setQuestions] = useState<ArenaQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [candidateAnswer, setCandidateAnswer] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isEvaluating, setIsEvaluating] = useState<boolean>(false);
  const [showHint, setShowHint] = useState<boolean>(false);

  // Timer per question (seconds)
  const [questionTimer, setQuestionTimer] = useState<number>(0);
  const [totalTimer, setTotalTimer] = useState<number>(0);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Audio / Speech
  const [isAudioMuted, setIsAudioMuted] = useState<boolean>(false);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [isListeningVoice, setIsListeningVoice] = useState<boolean>(false);
  const recognitionRef = useRef<{ stop: () => void; start?: () => void; [key: string]: unknown } | null>(null);
  const sandboxAudioRef = useRef<HTMLAudioElement | null>(null);

  // Evaluations history
  const [roundEvaluations, setRoundEvaluations] = useState<UpgradedEvaluationResult[]>([]);
  const [currentRoundEvaluation, setCurrentRoundEvaluation] = useState<UpgradedEvaluationResult | null>(null);

  // Final scorecard result
  const [finalScorecard, setFinalScorecard] = useState<ScorecardData | null>(null);

  // Load saved voice from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedVoiceId = localStorage.getItem('ghostboard_arena_voice_id');
      if (savedVoiceId) {
        const found = ARENA_VOICES.find((v) => v.id === savedVoiceId);
        if (found) setSelectedVoice(found);
      }
    }
  }, []);

  const handleSelectVoice = (voice: ArenaVoice) => {
    setSelectedVoice(voice);
    if (typeof window !== 'undefined') {
      localStorage.setItem('ghostboard_arena_voice_id', voice.id);
    }
  };

  const BCP47_MAP: Record<string, string> = {
    ua: 'uk-UA',
    uk: 'uk-UA',
    en: 'en-US',
    pl: 'pl-PL',
    de: 'de-DE',
    fr: 'fr-FR',
    es: 'es-ES',
    pt: 'pt-PT',
    it: 'it-IT',
    cs: 'cs-CZ',
    nl: 'nl-NL',
  };

  const stopSpeaking = () => {
    if (sandboxAudioRef.current) {
      sandboxAudioRef.current.pause();
      sandboxAudioRef.current.currentTime = 0;
      sandboxAudioRef.current = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  };

  const toggleMute = () => {
    setIsAudioMuted((prev) => {
      const next = !prev;
      if (next) {
        stopSpeaking();
      }
      return next;
    });
  };

  useEffect(() => {
    if (isAudioMuted) {
      stopSpeaking();
    }
  }, [isAudioMuted]);

  useEffect(() => {
    return () => {
      stopSpeaking();
    };
  }, []);

  // ── Speech Synthesis with Deepgram Aura / ElevenLabs ───────────────────────
  const speakQuestion = (text: string) => {
    if (isAudioMuted || typeof window === 'undefined') return;
    stopSpeaking();

    const ttsLang = locale === 'ua' ? 'uk' : locale;
    const voiceId = selectedVoice.id;
    const provider = selectedVoice.provider;

    try {
      setIsSpeaking(true);
      const url = new URL('/api/audio/tts', window.location.origin);
      url.searchParams.set('text', text);
      url.searchParams.set('voice', voiceId);
      url.searchParams.set('provider', provider);
      url.searchParams.set('lang', ttsLang);

      const customElevenKey = localStorage.getItem('ghostboard_elevenlabs_key');
      if (provider === 'elevenlabs' && customElevenKey) {
        url.searchParams.set('elevenlabsApiKey', customElevenKey);
      }

      const audio = new Audio(url.toString());
      sandboxAudioRef.current = audio;

      audio.onended = () => {
        sandboxAudioRef.current = null;
        setIsSpeaking(false);
      };

      audio.onerror = () => {
        sandboxAudioRef.current = null;
        fallbackSandboxSpeech(text);
      };

      audio.play().catch(() => {
        fallbackSandboxSpeech(text);
      });
    } catch {
      fallbackSandboxSpeech(text);
    }
  };

  const fallbackSandboxSpeech = (text: string) => {
    if ('speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        const langCode = BCP47_MAP[locale] || 'en-US';
        utterance.lang = langCode;
        utterance.rate = 1.0;
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);
        setIsSpeaking(true);
        window.speechSynthesis.speak(utterance);
      } catch {
        setIsSpeaking(false);
      }
    } else {
      setIsSpeaking(false);
    }
  };

  // ── Web Speech Recognition: Voice Answering ────────────────────────────────
  const toggleVoiceInput = () => {
    if (isListeningVoice) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListeningVoice(false);
      return;
    }

    if (typeof window === 'undefined') return;
    const SpeechRecognition =
      (window as unknown as { SpeechRecognition?: new () => { continuous: boolean; interimResults: boolean; lang: string; onstart: () => void; onresult: (event: { results: Array<Array<{ transcript: string }>> }) => void; onerror: () => void; onend: () => void; start: () => void; stop: () => void }; webkitSpeechRecognition?: new () => { continuous: boolean; interimResults: boolean; lang: string; onstart: () => void; onresult: (event: { results: Array<Array<{ transcript: string }>> }) => void; onerror: () => void; onend: () => void; start: () => void; stop: () => void } }).SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: new () => { continuous: boolean; interimResults: boolean; lang: string; onstart: () => void; onresult: (event: { results: Array<Array<{ transcript: string }>> }) => void; onerror: () => void; onend: () => void; start: () => void; stop: () => void } }).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      toast.info(a.voiceNotSupported || 'Розпізнавання голосу не підтримується браузером.');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = BCP47_MAP[locale] || 'en-US';

      recognition.onstart = () => {
        setIsListeningVoice(true);
        toast.info(a.voiceListeningToast || 'Слухаємо вашу відповідь...');
      };

      recognition.onresult = (event: { results: Array<Array<{ transcript: string }>> }) => {
        let transcript = '';
        for (let i = 0; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript + ' ';
        }
        setCandidateAnswer(transcript.trim());
      };

      recognition.onerror = () => {
        setIsListeningVoice(false);
      };

      recognition.onend = () => {
        setIsListeningVoice(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.warn('Voice input error:', err);
      setIsListeningVoice(false);
    }
  };

  // Timer loop during battle
  useEffect(() => {
    if (stage === 'battle') {
      timerIntervalRef.current = setInterval(() => {
        setQuestionTimer((t) => t + 1);
        setTotalTimer((t) => t + 1);
      }, 1000);
    } else {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [stage]);

  // ── Keyboard Ergonomics: Space (Voice Toggle) & Ctrl+Enter (Submit) ────────
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput =
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.isContentEditable;

      // Pressing Space (when not focused in text inputs) toggles microphone voice recording
      if (e.code === 'Space' && !isInput && stage === 'battle') {
        e.preventDefault(); // Prevent page scroll down!
        toggleVoiceInput();
      }

      // Ctrl+Enter or Cmd+Enter submits answer immediately without page scrolling
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && stage === 'battle') {
        e.preventDefault();
        if (!isEvaluating && candidateAnswer.trim()) {
          handleSubmitAnswer();
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [stage, isListeningVoice, candidateAnswer, isEvaluating]);

  // ── Action: Start Arena Session (Presets Mode) ────────────────────────────
  const handleStartPresetArena = async () => {
    setIsLoading(true);
    setCandidateAnswer('');
    setRoundEvaluations([]);
    setCurrentIndex(0);
    setQuestionTimer(0);
    setTotalTimer(0);
    setShowHint(false);

    try {
      const res = await fetch('/api/ai/arena', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'START_ARENA',
          track: selectedTrack,
          level: selectedLevel,
          candidateName,
          language: locale === 'ua' ? 'uk' : locale,
        }),
      });

      const data = await res.json();
      if (data?.questions && data.questions.length > 0) {
        setQuestions(data.questions);
        setStage('battle');
        speakQuestion(data.questions[0].question);
      } else {
        toast.error(data?.error || a.sessionCreateError);
      }
    } catch {
      toast.error(a.serverConnectError);
    } finally {
      setIsLoading(false);
    }
  };

  // ── Action: Generate Arena From Vacancy ───────────────────────────────────
  const handleGenerateFromVacancy = async () => {
    if (!vacancyText.trim()) {
      toast.warning('Будь ласка, вставте текст вакансії або вимоги.');
      return;
    }

    setIsLoading(true);
    setCandidateAnswer('');
    setRoundEvaluations([]);
    setCurrentIndex(0);
    setQuestionTimer(0);
    setTotalTimer(0);
    setShowHint(false);

    try {
      const res = await fetch('/api/ai/arena', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'GENERATE_FROM_VACANCY',
          vacancyText,
          candidateName,
          level: selectedLevel,
          language: locale === 'ua' ? 'uk' : locale,
        }),
      });

      const data = await res.json();
      if (data?.questions && data.questions.length > 0) {
        setQuestions(data.questions);
        if (data.vacancyProfile) {
          setVacancyProfile(data.vacancyProfile);
        }
        setStage('battle');
        speakQuestion(data.questions[0].question);
      } else {
        toast.error(data?.error || a.sessionCreateError);
      }
    } catch {
      toast.error('Помилка генерації арени за вакансією.');
    } finally {
      setIsLoading(false);
    }
  };

  // ── Action: Submit Candidate Answer for Round Evaluation ──────────────────
  const handleSubmitAnswer = async () => {
    if (!candidateAnswer.trim()) {
      toast.warning(a.emptyAnswerWarning || 'Будь ласка, введіть або промовте вашу відповідь.');
      return;
    }

    stopSpeaking();
    if (isListeningVoice && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListeningVoice(false);
    }

    setIsEvaluating(true);
    const activeQ = questions[currentIndex];

    try {
      const res = await fetch('/api/ai/arena', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'EVALUATE_ANSWER',
          question: activeQ.question,
          candidateAnswer,
          answerTimeSec: questionTimer,
          track: selectedTrack,
          level: selectedLevel,
          isArchitectureCase: activeQ.isArchitectureCase,
          vacancyProfile: setupMode === 'vacancy' ? vacancyProfile : null,
          language: locale === 'ua' ? 'uk' : locale,
        }),
      });

      const evalData: UpgradedEvaluationResult = await res.json();
      if (evalData?.scores) {
        setCurrentRoundEvaluation(evalData);
        setRoundEvaluations((prev) => [...prev, evalData]);
        setStage('round_review');
      } else {
        toast.error(a.evalReceiveError);
      }
    } catch {
      toast.error(a.evalGeneralError);
    } finally {
      setIsEvaluating(false);
    }
  };

  // ── Action: Skip question ─────────────────────────────────────────────────
  const handleSkipQuestion = async () => {
    stopSpeaking();
    if (isListeningVoice && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListeningVoice(false);
    }

    setIsEvaluating(true);
    const activeQ = questions[currentIndex];

    try {
      const res = await fetch('/api/ai/arena', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'EVALUATE_ANSWER',
          question: activeQ.question,
          candidateAnswer: 'Кандидат пропустив запитання (відповіді не надано).',
          answerTimeSec: questionTimer,
          track: selectedTrack,
          level: selectedLevel,
          isArchitectureCase: activeQ.isArchitectureCase,
          vacancyProfile: setupMode === 'vacancy' ? vacancyProfile : null,
          language: locale === 'ua' ? 'uk' : locale,
        }),
      });

      const evalData: UpgradedEvaluationResult = await res.json();
      if (evalData?.scores) {
        setCurrentRoundEvaluation(evalData);
        setRoundEvaluations((prev) => [...prev, evalData]);
        setStage('round_review');
      }
    } catch {
      toast.error('Помилка оцінки пропущеного питання.');
    } finally {
      setIsEvaluating(false);
    }
  };

  // ── Action: Proceed to Next Round or Finalize ─────────────────────────────
  const handleProceedNext = async () => {
    if (currentIndex + 1 < questions.length) {
      const nextIdx = currentIndex + 1;
      setCurrentIndex(nextIdx);
      setCandidateAnswer('');
      setQuestionTimer(0);
      setShowHint(false);
      setStage('battle');
      speakQuestion(questions[nextIdx].question);
    } else {
      // All rounds finished! Finalize and generate 3D Hologram Scorecard
      setIsLoading(true);
      try {
        const res = await fetch('/api/ai/arena', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'FINALIZE_ARENA',
            track: selectedTrack,
            level: selectedLevel,
            candidateName,
            roundEvaluations,
            durationSec: totalTimer,
            vacancyProfile: setupMode === 'vacancy' ? vacancyProfile : null,
            language: locale === 'ua' ? 'uk' : locale,
          }),
        });

        const data = await res.json();
        if (data?.scorecard) {
          setFinalScorecard(data.scorecard);
          setStage('finished');
        } else {
          toast.error(a.scorecardGenerateError);
        }
      } catch {
        toast.error(a.scorecardConnectionError);
      } finally {
        setIsLoading(false);
      }
    }
  };

  // Helper formatting for seconds to MM:SS
  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const activeQuestion = questions[currentIndex];

  return (
    <SubpageStripesContainer pattern="dots" className="min-h-screen bg-black text-white font-sans antialiased selection:bg-white/20 selection:text-white">
      {/* ── Top Header Bar ── */}
      <header className="border-b border-white/10 bg-black/60 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-zinc-400 hover:text-white transition-colors cursor-pointer group"
            >
              <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
              <GhostDetectiveLogo size="mini" />
            </Link>
            <div className="h-4 w-px bg-white/10 mx-1 hidden sm:block" />
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-black tracking-wider uppercase bg-white/10 px-2 py-0.5 rounded text-zinc-200">
                Ghostboard Arena
              </span>
              <span className="text-zinc-600 hidden sm:inline">•</span>
              <span className="text-xs text-zinc-400 font-mono hidden sm:inline">
                {a.subHeaderLabel || 'Senior Rubric & Trap Simulator'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <LangDropdown />

            {/* Voice Selector Trigger */}
            <button
              type="button"
              onClick={() => setIsVoiceModalOpen(true)}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 hover:text-white transition-colors cursor-pointer flex items-center gap-1.5"
              title="Налаштувати ШІ-голос інтервʼюера"
            >
              <Settings2 className="w-4 h-4" />
              <span className="text-xs font-mono hidden md:inline">{selectedVoice.name}</span>
            </button>

            {/* Audio Mute/Unmute */}
            <button
              type="button"
              onClick={toggleMute}
              className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                isAudioMuted
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                  : 'bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border-white/10'
              }`}
              title={isAudioMuted ? 'Увімкнути звук' : 'Вимкнути звук'}
            >
              {isAudioMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-4xl mx-auto px-4 py-8 sm:py-12">
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* ── STAGE 1: SETUP (Track & Vacancy Selection) ────────────────────── */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {stage === 'setup' && (
          <div className="flex flex-col gap-8 animate-in fade-in duration-300">
            {/* Hero Banner */}
            <div className="text-center space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-zinc-200 text-xs font-mono font-bold tracking-wider uppercase mb-1">
                <Flame className="w-3.5 h-3.5 fill-white text-white" />
                <span>{a.heroBadge || 'Senior Technical Evaluation'}</span>
              </div>
              <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white font-sans">
                {a.heroTitle || 'Ghostboard Arena: Бліц-Атестація'}
              </h1>
              <p className="text-zinc-400 text-xs sm:text-sm max-w-xl mx-auto leading-relaxed">
                {a.heroSubtitle || '6 запитань: 5 практичних інженерних бліців + 1 повноцінний System Design кейс. Миттєве оцінювання та порівняння з еталоном Staff-інженера.'}
              </p>
            </div>

            {/* Setup Mode Switcher */}
            <div className="flex justify-center">
              <div className="p-1 rounded-2xl bg-zinc-950 border border-white/15 flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setSetupMode('presets')}
                  className={`px-5 py-2.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
                    setupMode === 'presets'
                      ? 'bg-white text-black shadow-lg'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  ⚡ {a.modePresets || 'Готові технічні треки'}
                </button>
                <button
                  type="button"
                  onClick={() => setSetupMode('vacancy')}
                  className={`px-5 py-2.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
                    setupMode === 'vacancy'
                      ? 'bg-white text-black shadow-lg'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  🎯 {a.modeVacancy || 'Симуляція по вакансії'}
                </button>
              </div>
            </div>

            {/* Candidate Identity Strip */}
            <div className="p-5 rounded-2xl bg-zinc-950 border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="w-full sm:w-auto">
                <label className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider block mb-1">
                  {a.candidateNameLabel || 'Імʼя кандидата для скоркарду'}
                </label>
                <input
                  type="text"
                  value={candidateName}
                  onChange={(e) => setCandidateName(e.target.value)}
                  placeholder="Senior Dev"
                  className="bg-black border border-white/15 px-3 py-1.5 rounded-xl text-white font-mono text-sm focus:outline-none focus:border-white/40 w-full sm:w-64"
                />
              </div>

              <div className="w-full sm:w-auto">
                <label className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider block mb-1">
                  {a.levelLabel || 'Рівень оцінювання'}
                </label>
                <div className="flex gap-1.5">
                  {levels.map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setSelectedLevel(lvl)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
                        selectedLevel === lvl
                          ? 'bg-white text-black'
                          : 'bg-white/5 hover:bg-white/10 text-zinc-400 border border-white/10'
                      }`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Mode A: Presets Track Grid */}
            {setupMode === 'presets' && (
              <div className="space-y-4">
                <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-400">
                  {a.selectTrackHeading || 'Оберіть спеціалізацію для проходження арени:'}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {ALL_TRACKS.map((track) => (
                    <div
                      key={track.id}
                      onClick={() => setSelectedTrack(track.id)}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between select-none ${
                        selectedTrack === track.id
                          ? 'bg-white/10 border-white shadow-[0_0_25px_rgba(255,255,255,0.12)]'
                          : 'bg-zinc-950/80 border-white/10 hover:border-white/20'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-2xl">{track.icon}</span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/10 text-zinc-300 border border-white/10">
                            {track.badge}
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-white mb-1">{track.title}</h4>
                        <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">
                          {track.description}
                        </p>
                      </div>
                      <div className="mt-3 pt-3 border-t border-white/5 flex flex-wrap gap-1">
                        {track.tech.slice(0, 3).map((t, idx) => (
                          <span key={idx} className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-white/5 text-zinc-400">
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-center pt-4">
                  <button
                    type="button"
                    onClick={handleStartPresetArena}
                    disabled={isLoading}
                    className="py-3 px-8 rounded-2xl bg-white hover:bg-zinc-200 text-black font-black text-sm font-mono shadow-[0_0_30px_rgba(255,255,255,0.3)] transition-all flex items-center gap-2.5 cursor-pointer active:scale-95 disabled:opacity-50"
                  >
                    <span>{isLoading ? (a.startingArena || 'Формування 6 запитань...') : (a.startArenaButton || 'Увійти в Арену →')}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Mode B: Vacancy Paste */}
            {setupMode === 'vacancy' && (
              <div className="p-6 rounded-3xl bg-zinc-950 border border-white/10 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-300">
                    {a.vacancyHeading || 'Вставте текст вакансії або перелік вимог:'}
                  </h3>
                  <div className="flex gap-2">
                    {SAMPLE_VACANCIES.map((v, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setVacancyText(v.text)}
                        className="text-[10px] font-mono px-2 py-1 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 transition-colors"
                      >
                        {v.title}
                      </button>
                    ))}
                  </div>
                </div>

                <textarea
                  rows={8}
                  value={vacancyText}
                  onChange={(e) => setVacancyText(e.target.value)}
                  placeholder="Вставте опис вакансії (Senior Backend Engineer, React 19, Kafka, Highload)..."
                  className="w-full p-4 rounded-2xl bg-black border border-white/15 focus:border-white/40 text-white font-mono text-xs focus:outline-none transition-colors leading-relaxed resize-none"
                />

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleGenerateFromVacancy}
                    disabled={isLoading || !vacancyText.trim()}
                    className="py-3 px-8 rounded-2xl bg-white hover:bg-zinc-200 text-black font-black text-sm font-mono shadow-[0_0_30px_rgba(255,255,255,0.3)] transition-all flex items-center gap-2.5 cursor-pointer active:scale-95 disabled:opacity-50"
                  >
                    <span>{isLoading ? 'Аналіз вакансії через Gemini...' : 'Калібрувати арену за вакансією →'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* ── STAGE 2: ACTIVE BATTLE ROUND ─────────────────────────────────── */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {stage === 'battle' && activeQuestion && (
          <div className="flex flex-col gap-6 animate-in fade-in duration-200">
            {/* Top Bar: Progress & Timers */}
            <div className="flex items-center justify-between p-4 rounded-2xl bg-zinc-950 border border-white/10">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-lg bg-white/10 text-white">
                  Раунд {currentIndex + 1} з {questions.length}
                </span>
                {activeQuestion.isArchitectureCase && (
                  <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    🏛️ System Design Case
                  </span>
                )}
              </div>

              <div className="flex items-center gap-4 text-xs font-mono">
                <div className="flex items-center gap-1.5 text-zinc-400">
                  <Clock className="w-3.5 h-3.5 text-zinc-500" />
                  <span>Час відповіді:</span>
                  <span className="text-white font-bold">{formatTime(questionTimer)}</span>
                </div>
                <div className="text-zinc-600 hidden sm:inline">•</div>
                <div className="hidden sm:flex items-center gap-1 text-zinc-500">
                  <span>Всього:</span>
                  <span>{formatTime(totalTimer)}</span>
                </div>
              </div>
            </div>

            {/* Question Card & Voice Wave */}
            <div className="p-6 sm:p-8 rounded-3xl bg-zinc-950 border-2 border-white/15 relative overflow-hidden shadow-2xl">
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/10">
                <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
                  <Cpu className="w-4 h-4 text-zinc-300" />
                  <span>{selectedVoice.name} ({selectedVoice.role || selectedVoice.title})</span>
                </div>

                <div className="flex items-center gap-2">
                  {isSpeaking ? (
                    <button
                      type="button"
                      onClick={() => stopSpeaking()}
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-mono font-bold text-xs flex items-center gap-2 shadow-[0_0_20px_rgba(245,158,11,0.35)] transition-all cursor-pointer active:scale-95 animate-pulse"
                      title="Пропустити озвучку та перейти до відповіді"
                    >
                      <Zap className="w-3.5 h-3.5 fill-black" />
                      <span>Пропустити озвучку → Відповідати</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => speakQuestion(activeQuestion.question)}
                      disabled={isAudioMuted}
                      className="px-3 py-1.5 rounded-xl border text-xs font-mono font-medium flex items-center gap-2 transition-all cursor-pointer bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border-white/10"
                    >
                      <Volume2 className="w-3.5 h-3.5 text-zinc-300" />
                      <span>Озвучити знову</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Badges */}
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-mono px-3 py-1 rounded-full bg-white/5 border border-white/10 text-zinc-300">
                  Тема: <strong className="text-white">{activeQuestion.topic}</strong>
                </span>
                <span className="text-xs font-mono px-3 py-1 rounded-full bg-white/10 border border-white/10 text-zinc-200">
                  {activeQuestion.difficulty}
                </span>
              </div>

              {/* The Question */}
              <h2 className="text-xl sm:text-2xl font-bold text-white leading-relaxed mb-4 font-sans">
                «{activeQuestion.question}»
              </h2>

              {/* Context Hint */}
              {activeQuestion.contextHint && (
                <div className="mt-4">
                  {showHint ? (
                    <div className="p-3.5 rounded-xl bg-white/5 text-xs font-mono text-zinc-300 border border-white/10 leading-relaxed animate-in fade-in duration-200">
                      💡 <strong>Інженерний фокус:</strong> {activeQuestion.contextHint}
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowHint(true)}
                      className="text-xs font-mono text-zinc-400 hover:text-white transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <span>💡 Показати фокус відповіді</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Candidate Response Console with Keyboard Ergonomics */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between text-xs font-mono text-zinc-400">
                <div className="flex items-center gap-2">
                  <span>Ваша відповідь:</span>
                  <span className="text-zinc-600">•</span>
                  <span className="text-zinc-500 flex items-center gap-1">
                    <Keyboard className="w-3 h-3 text-zinc-400" />
                    <span className="text-zinc-300 font-bold">Space</span> — мікрофон, <span className="text-zinc-300 font-bold">Ctrl+Enter</span> — відправити
                  </span>
                </div>

                <button
                  type="button"
                  onClick={toggleVoiceInput}
                  className={`px-3 py-1.5 rounded-full border text-xs font-mono flex items-center gap-1.5 transition-all cursor-pointer ${
                    isListeningVoice
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse'
                      : 'bg-white/5 text-zinc-300 border-white/10 hover:border-white/20'
                  }`}
                >
                  {isListeningVoice ? (
                    <>
                      <MicOff className="w-3.5 h-3.5 text-rose-400" />
                      <span>Зупинити мікрофон</span>
                    </>
                  ) : (
                    <>
                      <Mic className="w-3.5 h-3.5 text-zinc-300" />
                      <span>Голосове введення (Space)</span>
                    </>
                  )}
                </button>
              </div>

              <textarea
                rows={5}
                value={candidateAnswer}
                onChange={(e) => setCandidateAnswer(e.target.value)}
                onKeyDown={(e) => {
                  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                    e.preventDefault();
                    if (!isEvaluating && candidateAnswer.trim()) {
                      handleSubmitAnswer();
                    }
                  }
                }}
                placeholder="Сформулюйте вашу відповідь, торкаючись архітектурних компромісів, надійності, складності та практичних кейсів..."
                className="w-full p-4 rounded-2xl bg-zinc-950/90 border border-white/15 focus:border-white/50 focus:ring-1 focus:ring-white/20 text-white font-sans text-sm focus:outline-none transition-colors leading-relaxed resize-none shadow-inner"
              />

              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={handleSkipQuestion}
                  disabled={isEvaluating}
                  className="text-xs font-mono text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <FastForward className="w-3.5 h-3.5" />
                  <span>Пропустити раунд</span>
                </button>

                <button
                  type="button"
                  onClick={handleSubmitAnswer}
                  disabled={isEvaluating || !candidateAnswer.trim()}
                  className="py-3 px-7 rounded-xl bg-white hover:bg-zinc-200 text-black font-black text-xs font-mono shadow-[0_0_25px_rgba(255,255,255,0.25)] transition-all flex items-center gap-2 cursor-pointer active:scale-95 disabled:opacity-40"
                >
                  <Send className="w-3.5 h-3.5 fill-black" />
                  <span>
                    {isEvaluating ? 'Оцінка відповіді через AI...' : 'Відповісти на арені (Ctrl+Enter)'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* ── STAGE 3: SENIOR RUBRIC & TRAP SIMULATOR ROUND REVIEW ──────────── */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {stage === 'round_review' && currentRoundEvaluation && (
          <SeniorRubricTrapView
            roundIndex={currentIndex}
            totalRounds={questions.length}
            question={questions[currentIndex]?.question || ''}
            candidateAnswer={candidateAnswer}
            evaluation={currentRoundEvaluation}
            locale={locale}
            onProceedNext={handleProceedNext}
            isProceeding={isLoading}
          />
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* ── STAGE 4: FINISHED 3D HOLOGRAM SCORECARD ──────────────────────── */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {stage === 'finished' && finalScorecard && (
          <div className="flex flex-col items-center animate-in fade-in zoom-in-95 duration-400">
            <div className="text-center mb-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-zinc-200 text-xs font-mono font-bold uppercase tracking-wider mb-2">
                <Award className="w-4 h-4 text-white" />
                <span>Атестацію завершено</span>
              </div>
              <h1 className="text-3xl font-black text-white tracking-tight">
                Ваш 3D Hologram Scorecard
              </h1>
              <p className="text-xs text-zinc-400 mt-1">
                Голографічний бейдж верифікації готовий до поширення в LinkedIn або додавання до CV
              </p>
            </div>

            <HologramScorecard3D scorecard={finalScorecard} />

            <div className="flex items-center gap-4 mt-8">
              <button
                type="button"
                onClick={() => {
                  setStage('setup');
                  setQuestions([]);
                  setCurrentIndex(0);
                  setRoundEvaluations([]);
                  setCandidateAnswer('');
                  setFinalScorecard(null);
                }}
                className="py-3 px-6 rounded-2xl bg-white/10 hover:bg-white/15 text-white font-mono text-xs border border-white/15 transition-all flex items-center gap-2 cursor-pointer active:scale-95"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Пройти ще раз</span>
              </button>
              <Link
                href="/interview"
                className="py-3 px-6 rounded-2xl bg-white hover:bg-zinc-200 text-black font-black font-mono text-xs shadow-lg transition-all flex items-center gap-2 active:scale-95"
              >
                <Sparkles className="w-4 h-4 fill-black" />
                <span>Увійти в Live Copilot</span>
              </Link>
            </div>
          </div>
        )}
      </main>

      {/* Voice Selector Modal */}
      <VoiceSelectorModal
        isOpen={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
        selectedVoice={selectedVoice}
        onSelectVoice={handleSelectVoice}
        locale={locale}
      />
    </SubpageStripesContainer>
  );
}
