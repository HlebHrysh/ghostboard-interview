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

interface ArenaQuestion {
  id: string;
  index: number;
  topic: string;
  difficulty: string;
  question: string;
  isArchitectureCase: boolean;
  contextHint?: string;
}

interface RoundEvaluation {
  score: number;
  verdict: string;
  scores: {
    technicalAccuracy: number;
    architecturalVision: number;
    communication: number;
    stressResilience: number;
    thinkingSpeed: number;
  };
  strengths: string[];
  missingKeyConcepts: string[];
  staffEngineerAnswer: string;
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
- High throughput API design (handling 10k+ RPS with sub-15ms p99 latency)`
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
- High performance UI with canvas / Three.js / WebGL micro-interactions`
  },
  {
    title: '⚡ Staff Cloud Architect',
    text: `Staff Infrastructure & System Architect
Requirements:
- 7+ years designing enterprise distributed systems
- Multi-region database replication, sharding strategies, zero-downtime migrations
- Event-driven architecture at scale (Kafka, Debezium CDC, Outbox pattern)
- Disaster recovery, failover mechanisms, circuit breakers, chaos engineering
- Cost optimization in AWS / GCP cloud environments`
  }
];

export function ArenaView() {
  const { locale } = useLocale();
  const a = getArenaTranslations(locale);
  const levels = a.levels || ['Junior', 'Middle', 'Senior', 'Staff'];

  // ── Stage: 'setup' | 'battle' | 'round_review' | 'finished' ────────────────
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
  const [roundEvaluations, setRoundEvaluations] = useState<RoundEvaluation[]>([]);
  const [currentRoundEvaluation, setCurrentRoundEvaluation] = useState<RoundEvaluation | null>(null);
  const [showStaffBenchmarkAnswer, setShowStaffBenchmarkAnswer] = useState<boolean>(false);

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
    const SpeechRecognition = (window as unknown as { SpeechRecognition?: new () => { continuous: boolean; interimResults: boolean; lang: string; onstart: () => void; onresult: (event: { results: Array<Array<{ transcript: string }>> }) => void; onerror: () => void; onend: () => void; start: () => void; stop: () => void }; webkitSpeechRecognition?: new () => { continuous: boolean; interimResults: boolean; lang: string; onstart: () => void; onresult: (event: { results: Array<Array<{ transcript: string }>> }) => void; onerror: () => void; onend: () => void; start: () => void; stop: () => void } }).SpeechRecognition ||
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
    } catch (err: unknown) {
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
          vacancyText: vacancyText.trim(),
          candidateName,
          level: selectedLevel,
          language: locale === 'ua' ? 'uk' : locale,
        }),
      });

      const data = await res.json();
      if (data?.questions && data.questions.length > 0) {
        setVacancyProfile(data.vacancyProfile || null);
        setQuestions(data.questions);
        setStage('battle');
        toast.success(`Арену створено під роль: ${data.vacancyProfile?.roleTitle || 'Custom Role'}`);
        speakQuestion(data.questions[0].question);
      } else {
        toast.error(data?.error || 'Не вдалося створити арену за вакансією.');
      }
    } catch (err) {
      toast.error('Помилка підключення до сервера при генерації вакансії.');
    } finally {
      setIsLoading(false);
    }
  };

  // ── Action: Submit Current Answer for AI Evaluation ───────────────────────
  const handleSubmitAnswer = async () => {
    if (!candidateAnswer.trim()) {
      toast.warning(a.emptyAnswerWarning || 'Введіть вашу відповідь перед відправкою.');
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
          candidateAnswer: candidateAnswer.trim(),
          answerTimeSec: questionTimer,
          track: selectedTrack,
          level: selectedLevel,
          isArchitectureCase: activeQ.isArchitectureCase,
          vacancyProfile: setupMode === 'vacancy' ? vacancyProfile : null,
          language: locale === 'ua' ? 'uk' : locale,
        }),
      });

      const evalData: RoundEvaluation = await res.json();
      if (evalData?.scores) {
        setCurrentRoundEvaluation(evalData);
        setRoundEvaluations((prev) => [...prev, evalData]);
        setStage('round_review');
      } else {
        toast.error(a.evalReceiveError);
      }
    } catch (err) {
      toast.error(a.evalGeneralError);
    } finally {
      setIsEvaluating(false);
    }
  };

  // ── Action: Skip question (Forfeit) ───────────────────────────────────────
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

      const evalData: RoundEvaluation = await res.json();
      if (evalData?.scores) {
        setCurrentRoundEvaluation(evalData);
        setRoundEvaluations((prev) => [...prev, evalData]);
        setStage('round_review');
      }
    } catch (err) {
      toast.error('Помилка оцінки пропущеного питання.');
    } finally {
      setIsEvaluating(false);
    }
  };

  // ── Action: Proceed to Next Round or Finalize ─────────────────────────────
  const handleProceedNext = async () => {
    setShowStaffBenchmarkAnswer(false);
    if (currentIndex + 1 < questions.length) {
      const nextIdx = currentIndex + 1;
      setCurrentIndex(nextIdx);
      setCandidateAnswer('');
      setQuestionTimer(0);
      setShowHint(false);
      setStage('battle');
      speakQuestion(questions[nextIdx].question);
    } else {
      // All 6 rounds finished! Finalize and generate 3D Hologram Scorecard
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
          toast.success(a.scorecardFinalizedSuccess);
        } else {
          toast.error(a.scorecardFinalizeError);
        }
      } catch (err) {
        toast.error(a.reportCreateError);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const activeQuestion = questions[currentIndex];

  return (
    <SubpageStripesContainer pattern="telemetry" className="min-h-screen flex flex-col justify-between p-4 sm:p-8">
      {/* ── Top Header ────────────────────────────────────────────────────── */}
      <header className="max-w-5xl w-full mx-auto flex items-center justify-between py-4 border-b border-white/10 mb-8">
        <div className="flex items-center gap-3">
          <Link
            href="/interview"
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white border border-white/10 transition-colors cursor-pointer"
            title={a.headerBackTitle}
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex items-center gap-2.5">
            <GhostDetectiveLogo size="mini" />
            <span className="w-2 h-2 rounded-full bg-white animate-pulse shadow-[0_0_10px_rgba(255,255,255,0.6)]" />
            <span className="font-mono font-black text-sm tracking-widest text-zinc-100">
              GHOSTBOARD ARENA
            </span>
            <span className="hidden sm:inline text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/10 text-zinc-300 border border-white/10 uppercase">
              Neural Arena 2.0
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Interviewer Persona & Voice Button */}
          <button
            type="button"
            onClick={() => setIsVoiceModalOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-900/90 hover:bg-zinc-800 border border-white/10 text-zinc-300 hover:text-white font-mono text-xs transition-all cursor-pointer shadow-sm"
            title="Налаштувати голос інтервʼюера"
          >
            <span>{selectedVoice.avatar}</span>
            <span className="hidden sm:inline font-bold">{selectedVoice.name}</span>
            <Settings2 className="w-3.5 h-3.5 text-zinc-400" />
          </button>

          {/* Session Timer in Battle */}
          {stage === 'battle' && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-900 border border-white/10 font-mono text-xs text-zinc-300">
              <Clock className="w-3.5 h-3.5 text-zinc-400" />
              <span>
                {Math.floor(totalTimer / 60)}:{(totalTimer % 60).toString().padStart(2, '0')}
              </span>
            </div>
          )}

          {/* Mute Button */}
          <button
            type="button"
            onClick={toggleMute}
            className={`p-2 rounded-xl transition-all border cursor-pointer ${
              isAudioMuted
                ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                : isSpeaking
                ? 'bg-white/15 border-white/40 text-white shadow-[0_0_15px_rgba(255,255,255,0.2)]'
                : 'bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white border-white/10'
            }`}
            title={isAudioMuted ? 'Увімкнути голос інтервʼюера' : isSpeaking ? 'Заглушити' : 'Вимкнути звук'}
          >
            {isAudioMuted ? (
              <VolumeX className="w-4 h-4 text-rose-400" />
            ) : (
              <Volume2 className={`w-4 h-4 ${isSpeaking ? 'text-white animate-pulse' : 'text-zinc-300'}`} />
            )}
          </button>

          <LangDropdown />
        </div>
      </header>

      {/* ── Main Dynamic Viewport ─────────────────────────────────────────── */}
      <main className="max-w-4xl w-full mx-auto flex-1 flex flex-col justify-center my-auto">
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* ── STAGE 1: SETUP ──────────────────────────────────────────────── */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {stage === 'setup' && (
          <div className="flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-300">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/20 text-zinc-200 text-xs font-mono font-bold uppercase tracking-wider mb-3">
              <Flame className="w-3.5 h-3.5 text-white" />
              <span>3D Hologram Simulator & Neural TTS</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight mb-3 font-sans">
              Технічна Арена Співбесід
            </h1>
            <p className="text-sm sm:text-base text-zinc-400 max-w-2xl mb-8 leading-relaxed">
              Пройдіть випробування з безкомпромісним FAANG Staff Engineer або згенеруйте симуляцію під конкретну вакансію зі студійною нейромережевою озвучкою.
            </p>

            {/* Mode Switcher Tabs */}
            <div className="flex items-center p-1.5 rounded-2xl bg-zinc-950 border border-white/15 mb-8 w-full max-w-md shadow-inner">
              <button
                type="button"
                onClick={() => setSetupMode('presets')}
                className={`flex-1 py-2.5 px-4 rounded-xl font-mono text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  setupMode === 'presets'
                    ? 'bg-white text-black shadow-md'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Cpu className="w-3.5 h-3.5" />
                <span>Готові напрями</span>
              </button>

              <button
                type="button"
                onClick={() => setSetupMode('vacancy')}
                className={`flex-1 py-2.5 px-4 rounded-xl font-mono text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  setupMode === 'vacancy'
                    ? 'bg-white text-black shadow-md'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Вставити вакансію</span>
              </button>
            </div>

            {/* Candidate & Seniority Bar */}
            <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8 text-left max-w-2xl">
              <div>
                <label className="block text-xs font-mono text-zinc-400 mb-2 uppercase tracking-wider">
                  Імʼя кандидата
                </label>
                <input
                  type="text"
                  value={candidateName}
                  onChange={(e) => setCandidateName(e.target.value)}
                  placeholder="Олександр / Senior Dev"
                  className="w-full px-4 py-3 rounded-xl bg-zinc-950 border border-white/15 focus:border-white/50 focus:ring-1 focus:ring-white/20 text-white font-mono text-sm focus:outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-zinc-400 mb-2 uppercase tracking-wider">
                  Цільовий грейд
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {levels.map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setSelectedLevel(lvl)}
                      className={`py-3 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer text-center ${
                        selectedLevel === lvl
                          ? 'bg-white text-black shadow-sm'
                          : 'bg-zinc-950 border border-white/10 text-zinc-400 hover:text-white'
                      }`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* ── Mode 1: Presets ─────────────────────────────────────────── */}
            {setupMode === 'presets' && (
              <div className="w-full mb-8 text-left animate-in fade-in duration-200">
                <label className="block text-xs font-mono text-zinc-400 mb-3 uppercase tracking-wider text-center sm:text-left">
                  Оберіть інженерний стек арени:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
                  {ALL_TRACKS.map((t) => (
                    <div
                      key={t.id}
                      onClick={() => setSelectedTrack(t.id)}
                      className={`p-5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between relative overflow-hidden ${
                        selectedTrack === t.id
                          ? 'bg-zinc-900 border-white shadow-[0_0_30px_rgba(255,255,255,0.12)] scale-[1.02]'
                          : 'bg-zinc-950/80 border-white/10 hover:border-white/20'
                      }`}
                    >
                      <div>
                        <div className="text-3xl mb-3">{t.icon}</div>
                        <h3 className="font-bold text-white text-base font-sans">{t.title}</h3>
                        <div className="text-[11px] font-mono text-zinc-300 mb-2">{t.badge}</div>
                        <p className="text-xs text-zinc-400 leading-relaxed">{t.description}</p>
                      </div>

                      <div className="flex flex-wrap gap-1.5 mt-4 pt-3 border-t border-white/5">
                        {t.tech.map((badge) => (
                          <span key={badge} className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 text-zinc-300">
                            {badge}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Mode 2: Vacancy Generator ───────────────────────────────── */}
            {setupMode === 'vacancy' && (
              <div className="w-full mb-8 text-left animate-in fade-in duration-200 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-mono text-zinc-400 uppercase tracking-wider">
                    Вставте текст вакансії або опис вимог:
                  </label>
                  <span className="text-[11px] font-mono text-zinc-500">
                    Djinni • DOU • LinkedIn • Spec
                  </span>
                </div>

                <textarea
                  rows={6}
                  value={vacancyText}
                  onChange={(e) => setVacancyText(e.target.value)}
                  placeholder="Вставте опис вакансії сюди... Наприклад: 'Шукаємо Senior Go розробника в FinTech highload проєкт. Вимоги: досвід з Kafka, PostgreSQL transactions, distributed locks...'"
                  className="w-full p-4 rounded-2xl bg-zinc-950 border border-white/15 focus:border-white/50 focus:ring-1 focus:ring-white/20 text-white font-mono text-xs focus:outline-none transition-colors leading-relaxed shadow-inner"
                />

                {/* Sample quick buttons */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-mono text-zinc-500 mr-1">Приклади в 1 клік:</span>
                  {SAMPLE_VACANCIES.map((s, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setVacancyText(s.text)}
                      className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/10 text-xs font-mono transition-all cursor-pointer"
                    >
                      {s.title}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Interviewer Persona Banner */}
            <div className="w-full max-w-2xl p-4 rounded-2xl bg-zinc-950 border border-white/10 mb-8 flex items-center justify-between text-left">
              <div className="flex items-center gap-3">
                <span className="text-3xl p-2 rounded-xl bg-white/5 border border-white/5">
                  {selectedVoice.avatar}
                </span>
                <div>
                  <div className="text-xs font-mono text-zinc-400 uppercase">
                    Ваш екзаменатор на арені
                  </div>
                  <div className="text-sm font-bold text-white flex items-center gap-2">
                    <span>{selectedVoice.name}</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/10 text-zinc-300">
                      {selectedVoice.tag}
                    </span>
                  </div>
                  <div className="text-xs text-zinc-400">
                    {selectedVoice.title} • {selectedVoice.accent}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsVoiceModalOpen(true)}
                className="py-2 px-3.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-mono text-xs flex items-center gap-1.5 transition-all cursor-pointer border border-white/10"
              >
                <Settings2 className="w-3.5 h-3.5" />
                <span>Змінити голос</span>
              </button>
            </div>

            {/* Launch Button */}
            <button
              type="button"
              onClick={setupMode === 'presets' ? handleStartPresetArena : handleGenerateFromVacancy}
              disabled={isLoading}
              className="py-4 px-10 rounded-2xl bg-white hover:bg-zinc-200 text-black font-black text-sm font-mono shadow-[0_0_40px_rgba(255,255,255,0.3)] transition-all flex items-center gap-3 active:scale-95 cursor-pointer disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4 fill-black" />
              <span>
                {isLoading
                  ? 'Генерація питань через Gemini AI...'
                  : setupMode === 'presets'
                  ? 'Увійти на арену'
                  : 'Створити арену за вакансією →'}
              </span>
            </button>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* ── STAGE 2: BATTLE ROUND ───────────────────────────────────────── */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {stage === 'battle' && activeQuestion && (
          <div className="flex flex-col gap-6 animate-in fade-in duration-200">
            {/* Round indicator & Progress Bar */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs font-mono text-zinc-400">
                <div className="flex items-center gap-2">
                  <span className="text-zinc-200 font-bold">
                    Раунд {currentIndex + 1} з {questions.length}
                  </span>
                  <span>•</span>
                  <span>
                    {activeQuestion.isArchitectureCase ? '🏗️ Архітектурний кейс' : '⚡ Технічний бліц'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-zinc-300">
                  <Clock className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Час на відповідь: {questionTimer}с</span>
                </div>
              </div>

              {/* Multi-segment Progress Bar */}
              <div className="w-full h-2 rounded-full bg-zinc-900 overflow-hidden flex gap-1">
                {questions.map((q, idx) => (
                  <div
                    key={q.id}
                    className={`h-full flex-1 transition-all ${
                      idx < currentIndex
                        ? 'bg-zinc-300'
                        : idx === currentIndex
                        ? 'bg-white animate-pulse'
                        : 'bg-zinc-800'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* AI Interviewer HUD Card */}
            <div className="p-6 sm:p-8 rounded-3xl bg-zinc-950 border border-white/15 shadow-2xl relative overflow-hidden">
              {/* Interviewer Persona Info & Voice Waves */}
              <div className="flex flex-wrap items-center justify-between gap-3 mb-6 pb-4 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <span className="text-3xl p-2 rounded-2xl bg-white/5 border border-white/10 block">
                      {selectedVoice.avatar}
                    </span>
                    {isSpeaking && (
                      <span className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full bg-emerald-400 border-2 border-zinc-950 animate-pulse" />
                    )}
                  </div>
                  <div>
                    <div className="text-xs font-mono text-zinc-400 uppercase flex items-center gap-2">
                      <span>{vacancyProfile?.interviewerTitle || selectedVoice.title}</span>
                      <span className="text-zinc-600">•</span>
                      <span className="text-zinc-300 font-bold">{selectedVoice.name}</span>
                    </div>
                    <div className="text-sm font-bold text-white flex items-center gap-2">
                      <span>{isSpeaking ? 'Озвучує запитання...' : 'Очікує вашої інженерної відповіді'}</span>
                    </div>
                  </div>
                </div>

                {/* Real-time Voice Wave Animation & Replay */}
                <div className="flex items-center gap-3">
                  <InterviewerVoiceWave isSpeaking={isSpeaking} />

                  {isSpeaking ? (
                    <button
                      type="button"
                      onClick={() => stopSpeaking()}
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-mono font-bold text-xs flex items-center gap-2 shadow-[0_0_20px_rgba(245,158,11,0.35)] transition-all cursor-pointer active:scale-95 animate-pulse"
                      title="Пропустити озвучку та перейти до відповіді"
                    >
                      <Zap className="w-3.5 h-3.5 fill-black" />
                      <span>Пропустити озвучку → Відповідати одразу</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => speakQuestion(activeQuestion.question)}
                      disabled={isAudioMuted}
                      className={`px-3 py-1.5 rounded-xl border text-xs font-mono font-medium flex items-center gap-2 transition-all cursor-pointer active:scale-95 ${
                        isAudioMuted
                          ? 'bg-zinc-900 border-white/5 text-zinc-500 cursor-not-allowed opacity-60'
                          : 'bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border-white/10 hover:border-white/20'
                      }`}
                      title={isAudioMuted ? 'Звук вимкнено' : 'Повторити озвучку'}
                    >
                      <Volume2 className="w-3.5 h-3.5 text-zinc-300" />
                      <span>Озвучити знову</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Topic & Difficulty Badges */}
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
                      💡 <strong>Інженерна підказка:</strong> {activeQuestion.contextHint}
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

            {/* Candidate Response Console */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between text-xs font-mono text-zinc-400">
                <div className="flex items-center gap-2">
                  <span>Ваша відповідь:</span>
                  <span className="text-zinc-600">•</span>
                  <span className="text-zinc-500">Ctrl + Enter для відправки</span>
                </div>

                <button
                  type="button"
                  onClick={toggleVoiceInput}
                  className={`px-3 py-1 rounded-full border text-xs font-mono flex items-center gap-1.5 transition-all cursor-pointer ${
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
                      <span>Голосове введення</span>
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
                    handleSubmitAnswer();
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
        {/* ── STAGE 3: INTERMEDIATE ROUND REVIEW ───────────────────────────── */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {stage === 'round_review' && currentRoundEvaluation && (
          <div className="flex flex-col gap-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 sm:p-8 rounded-3xl bg-zinc-950 border-2 border-white/15 shadow-2xl relative">
              {/* Header result */}
              <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-6">
                <div>
                  <div className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider mb-1">
                    Вердикт за раунд {currentIndex + 1} з {questions.length}
                  </div>
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <span>Вердикт:</span>
                    <span className="text-zinc-200">{currentRoundEvaluation.verdict}</span>
                  </h3>
                </div>

                <div className="p-3 rounded-2xl bg-zinc-900 border border-white/20 text-center min-w-[70px]">
                  <span className="text-2xl font-black font-mono text-white">
                    {currentRoundEvaluation.score}
                  </span>
                  <span className="text-[10px] font-mono text-zinc-500 block uppercase">/ 100</span>
                </div>
              </div>

              {/* 5-Metrics Matrix for this round */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-6">
                <div className="p-2.5 rounded-xl bg-zinc-900/80 text-center border border-white/5">
                  <span className="text-[10px] font-mono text-zinc-400 block">Точність</span>
                  <span className="text-sm font-bold font-mono text-white">
                    {currentRoundEvaluation.scores.technicalAccuracy}%
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-zinc-900/80 text-center border border-white/5">
                  <span className="text-[10px] font-mono text-zinc-400 block">Архітектура</span>
                  <span className="text-sm font-bold font-mono text-white">
                    {currentRoundEvaluation.scores.architecturalVision}%
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-zinc-900/80 text-center border border-white/5">
                  <span className="text-[10px] font-mono text-zinc-400 block">Швидкість</span>
                  <span className="text-sm font-bold font-mono text-white">
                    {currentRoundEvaluation.scores.thinkingSpeed}%
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-zinc-900/80 text-center border border-white/5">
                  <span className="text-[10px] font-mono text-zinc-400 block">Комунікація</span>
                  <span className="text-sm font-bold font-mono text-white">
                    {currentRoundEvaluation.scores.communication}%
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-zinc-900/80 text-center border border-white/5">
                  <span className="text-[10px] font-mono text-zinc-400 block">Стійкість</span>
                  <span className="text-sm font-bold font-mono text-white">
                    {currentRoundEvaluation.scores.stressResilience}%
                  </span>
                </div>
              </div>

              {/* Staff Critique: Strengths & Missing Concepts */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-xs text-zinc-300">
                  <span className="font-mono text-zinc-200 font-bold block mb-2 uppercase text-[11px] flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-white" /> Сильні сторони відповіді
                  </span>
                  <ul className="list-disc pl-4 space-y-1 text-zinc-300">
                    {currentRoundEvaluation.strengths.map((s, idx) => (
                      <li key={idx}>{s}</li>
                    ))}
                  </ul>
                </div>

                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-xs text-zinc-300">
                  <span className="font-mono text-zinc-400 font-bold block mb-2 uppercase text-[11px] flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 text-zinc-400" /> Що було пропущено
                  </span>
                  <ul className="list-disc pl-4 space-y-1 text-zinc-300">
                    {currentRoundEvaluation.missingKeyConcepts.map((m, idx) => (
                      <li key={idx}>{m}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Staff Reference Answer (Collapsible Accordion) */}
              {currentRoundEvaluation.staffEngineerAnswer && (
                <div className="mb-6 rounded-2xl bg-white/[0.03] border border-white/10 overflow-hidden transition-all">
                  <button
                    type="button"
                    onClick={() => setShowStaffBenchmarkAnswer((prev) => !prev)}
                    className="w-full p-4 flex items-center justify-between text-left hover:bg-white/[0.05] transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm">💡</span>
                      <span className="font-mono text-xs font-semibold text-zinc-300 group-hover:text-white transition-colors">
                        Показати еталонну відповідь Staff-інженера
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-zinc-300 text-xs font-mono">
                      <span>{showStaffBenchmarkAnswer ? 'Згорнути' : 'Розгорнути'}</span>
                      <ChevronDown
                        className={`w-4 h-4 transition-transform duration-200 ${
                          showStaffBenchmarkAnswer ? 'rotate-180' : ''
                        }`}
                      />
                    </div>
                  </button>
                  {showStaffBenchmarkAnswer && (
                    <div className="px-4 pb-4 pt-1 border-t border-white/5 text-xs leading-relaxed text-zinc-300">
                      <p className="whitespace-pre-wrap">{currentRoundEvaluation.staffEngineerAnswer}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Proceed Button */}
              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={handleProceedNext}
                  disabled={isLoading}
                  className="py-3 px-6 rounded-xl bg-white hover:bg-zinc-200 text-black font-black text-xs font-mono shadow-[0_0_25px_rgba(255,255,255,0.25)] transition-all flex items-center gap-2 cursor-pointer active:scale-95"
                >
                  <span>
                    {currentIndex + 1 < questions.length
                      ? 'Наступний раунд →'
                      : 'Згенерувати 3D Скоркард →'}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
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
                Фінальний Результат Арени
              </h1>
              <p className="text-xs sm:text-sm text-zinc-400 mt-1 max-w-md mx-auto">
                Ваш 3D голографічний скоркард із детальною розбивкою навичок
              </p>
            </div>

            {/* The 3D Holographic Card */}
            <HologramScorecard3D data={finalScorecard} showShareActions={true} />

            {/* Action Bar */}
            <div className="flex flex-wrap items-center justify-center gap-3 mt-8">
              <button
                type="button"
                onClick={() => setStage('setup')}
                className="py-3 px-5 rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-white/10 font-mono text-xs flex items-center gap-2 transition-all cursor-pointer active:scale-95"
              >
                <RotateCcw className="w-3.5 h-3.5 text-zinc-400" />
                <span>Пройти ще одну арену</span>
              </button>

              <Link
                href="/interview"
                className="py-3 px-5 rounded-2xl bg-white hover:bg-zinc-200 text-black font-black text-xs font-mono shadow-[0_0_25px_rgba(255,255,255,0.25)] transition-all flex items-center gap-2 active:scale-95"
              >
                <Sparkles className="w-3.5 h-3.5 fill-black" />
                <span>Перейти в Copilot →</span>
              </Link>
            </div>
          </div>
        )}
      </main>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <footer className="text-center text-[11px] font-mono text-zinc-600 mt-12 pb-2">
        {a.footerText || 'Ghostboard Arena • Advanced Neural Assessment Simulator'}
      </footer>

      {/* ── Voice & Persona Selector Modal ─────────────────────────────────── */}
      <VoiceSelectorModal
        isOpen={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
        selectedVoiceId={selectedVoice.id}
        onSelectVoice={handleSelectVoice}
      />
    </SubpageStripesContainer>
  );
}
