'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  Volume2,
  VolumeX,
  Play,
  ArrowRight,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Award,
  ArrowLeft,
  Sliders,
  Send,
  Mic,
  MicOff,
  Clock,
  Briefcase,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Radio,
  FileText,
  UserCheck,
  Shield,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import { UnifiedNavbar } from '@/components/ui/UnifiedNavbar';
import { UnifiedFooter } from '@/components/ui/UnifiedFooter';
import { GhostDetectiveLogo } from '@/components/ui/GhostDetectiveLogo';
import { useLocale } from '@/contexts/LocaleContext';
import { LangDropdown } from '@/components/ui/LangDropdown';
import { MOCK_I18N } from '@/lib/mockI18n';
import { SubpageStripesContainer } from '@/components/ui/SubpageStripesContainer';

interface EvaluationResult {
  score: number;
  verdict: string;
  strengths: string[];
  missingKeyConcepts: string[];
  staffEngineerAnswer: string;
}

const PRESET_ROLES = [
  { id: 'python', label: '🐍 Python Backend', value: 'Python Backend Developer (FastAPI / PostgreSQL / Redis)' },
  { id: 'fullstack', label: '⚛️ Fullstack TS/React', value: 'Fullstack Engineer (React / Next.js / Node.js / TypeScript)' },
  { id: 'go', label: '🔷 Go Systems', value: 'Go Systems Engineer (HighLoad / Concurrency / Microservices)' },
  { id: 'devops', label: '☁️ DevOps & Cloud', value: 'DevOps & Cloud Architect (Kubernetes / Terraform / AWS)' },
  { id: 'sysdesign', label: '🏗️ System Design', value: 'System Design & Distributed Systems Architect' },
];

const PRESET_LEVELS = [
  { id: 'junior', label: 'Junior', value: 'Junior' },
  { id: 'middle', label: 'Middle', value: 'Middle' },
  { id: 'mid-senior', label: 'Middle / Senior', value: 'Middle/Senior' },
  { id: 'staff', label: 'Senior / Staff Lead', value: 'Senior/Staff' },
];

const FOCUS_ROUNDS = [
  { id: 'arch', label: 'Core Architecture', desc: 'Concurrency, internals & trade-offs' },
  { id: 'db', label: 'Data & Scaling', desc: 'Indexing, caching, bottlenecks' },
  { id: 'design', label: 'System Design', desc: 'Distributed state & resilience' },
  { id: 'star', label: 'Behavioral / STAR', desc: 'Conflict, impact & tech leadership' },
];

export default function MockInterviewPage() {
  const { locale } = useLocale();
  const activeLang = locale === 'ua' ? 'uk' : locale;
  const mt = MOCK_I18N[locale] || MOCK_I18N['en'];
  const isUa = locale === 'ua';

  // Config State
  const [role, setRole] = useState('Python Backend Developer (FastAPI / PostgreSQL / Redis)');
  const [isCustomRole, setIsCustomRole] = useState(false);
  const [customRoleInput, setCustomRoleInput] = useState('');
  const [level, setLevel] = useState('Middle/Senior');
  const [focusTopic, setFocusTopic] = useState('Core Architecture');
  const [autoVoice, setAutoVoice] = useState(true);

  // Round / Session Progress
  const [roundNumber, setRoundNumber] = useState(1);
  const [currentQuestion, setCurrentQuestion] = useState<string>('');
  const [questionDifficulty, setQuestionDifficulty] = useState<string>('Hard');
  const [questionTopic, setQuestionTopic] = useState<string>('');
  const [contextHint, setContextHint] = useState<string>('');
  const [expectedPoints, setExpectedPoints] = useState<string[]>([]);
  const [showHint, setShowHint] = useState(false);
  const [questionHistory, setQuestionHistory] = useState<string[]>([]);

  // Answer & Evaluation
  const [candidateAnswer, setCandidateAnswer] = useState<string>('');
  const [isGeneratingQuestion, setIsGeneratingQuestion] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [evaluation, setEvaluation] = useState<EvaluationResult | null>(null);

  // Voice Recording (Candidate Mic Speech-to-Text)
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Answer Stopwatch Timer
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isTimerActive, setIsTimerActive] = useState(false);

  const currentAudioRef = useRef<HTMLAudioElement | null>(null);

  // Stopwatch effect
  useEffect(() => {
    let interval: any = null;
    if (isTimerActive) {
      interval = setInterval(() => {
        setElapsedSeconds((s) => s + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerActive]);

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const stopSpeaking = () => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.currentTime = 0;
      currentAudioRef.current = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  };

  const fallbackBrowserSpeech = (text: string) => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      const speechLangTagMap: Record<string, string> = {
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
      const langTag = speechLangTagMap[activeLang] || 'en-US';
      utterance.lang = langTag;

      const voices = window.speechSynthesis.getVoices();
      const targetPrefix = langTag.split('-')[0];
      const matchVoice = voices.find((v) => v.lang.startsWith(targetPrefix));
      if (matchVoice) utterance.voice = matchVoice;

      utterance.rate = 1.0;
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
    } else {
      setIsSpeaking(false);
    }
  };

  // High-fidelity speech synthesis
  const speakText = (text: string) => {
    stopSpeaking();
    if (!text || typeof window === 'undefined') return;

    setIsSpeaking(true);

    try {
      const audioUrl = `/api/audio/tts?lang=${encodeURIComponent(activeLang)}&text=${encodeURIComponent(text)}`;
      const audio = new Audio(audioUrl);
      currentAudioRef.current = audio;

      audio.onended = () => {
        setIsSpeaking(false);
        currentAudioRef.current = null;
      };

      audio.onerror = () => {
        currentAudioRef.current = null;
        fallbackBrowserSpeech(text);
      };

      audio.play().catch(() => {
        fallbackBrowserSpeech(text);
      });
    } catch {
      fallbackBrowserSpeech(text);
    }
  };

  // Speech Recognition (Candidate Voice Input)
  const startRecording = () => {
    if (typeof window === 'undefined') return;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error(
        isUa
          ? 'Ваш браузер не підтримує Web Speech API. Використовуйте Chrome, Edge або введіть текст вручну.'
          : 'Browser does not support Web Speech API. Use Chrome, Edge or type text manually.'
      );
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;

      const speechLangMap: Record<string, string> = {
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
      recognition.lang = speechLangMap[activeLang] || 'uk-UA';

      recognition.onstart = () => {
        setIsRecording(true);
        setIsTimerActive(true);
        toast.info(isUa ? '🎙️ Мікрофон активний. Говоріть...' : '🎙️ Microphone active. Speak now...');
      };

      recognition.onresult = (event: any) => {
        let fullTranscript = '';
        for (let i = 0; i < event.results.length; i++) {
          fullTranscript += event.results[i][0].transcript + ' ';
        }
        setCandidateAnswer(fullTranscript.trim());
      };

      recognition.onerror = (e: any) => {
        if (e.error !== 'no-speech') {
          console.warn('Speech recognition error:', e.error);
        }
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error('Failed to start voice recognition:', err);
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
      recognitionRef.current = null;
    }
    setIsRecording(false);
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  // Generate Question
  const handleGenerateQuestion = async (nextRound = false) => {
    stopSpeaking();
    stopRecording();
    setIsGeneratingQuestion(true);
    setEvaluation(null);
    setCandidateAnswer('');
    setShowHint(false);
    setElapsedSeconds(0);
    setIsTimerActive(false);

    if (nextRound) {
      setRoundNumber((r) => r + 1);
    }

    const effectiveRole = isCustomRole && customRoleInput.trim() ? customRoleInput.trim() : role;

    try {
      const res = await fetch('/api/ai/mock-interviewer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'GENERATE_QUESTION',
          role: `${effectiveRole} (Focus: ${focusTopic})`,
          level,
          language: activeLang,
          questionHistory,
        }),
      });

      const data = await res.json();
      if (data?.question) {
        setCurrentQuestion(data.question);
        setQuestionDifficulty(data.difficulty || 'Hard');
        setQuestionTopic(data.topic || focusTopic);
        setContextHint(data.contextHint || '');
        setExpectedPoints(data.keyExpectedPoints || []);
        setQuestionHistory((prev) => [...prev, data.question]);
        setIsTimerActive(true);

        if (autoVoice) {
          setTimeout(() => speakText(data.question), 250);
        }
      } else {
        toast.error(data.error || mt.errGenQuestion);
      }
    } catch {
      toast.error(mt.errServerUnavailable);
    } finally {
      setIsGeneratingQuestion(false);
    }
  };

  // Evaluate Answer
  const handleEvaluate = async () => {
    if (!candidateAnswer || candidateAnswer.trim().length < 10) {
      toast.error(mt.errAnswerTooShort);
      return;
    }

    stopSpeaking();
    stopRecording();
    setIsTimerActive(false);
    setIsEvaluating(true);

    const effectiveRole = isCustomRole && customRoleInput.trim() ? customRoleInput.trim() : role;

    try {
      const res = await fetch('/api/ai/mock-interviewer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'EVALUATE_ANSWER',
          role: effectiveRole,
          level,
          language: activeLang,
          currentQuestion,
          candidateAnswer,
        }),
      });

      const data = await res.json();
      if (data?.score !== undefined) {
        setEvaluation(data);
        toast.success(`${mt.toastEvaluated} ${data.score}/10!`);
      } else {
        toast.error(data.error || mt.errFailedEval);
      }
    } catch {
      toast.error(mt.errFailedEval);
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleResetSession = () => {
    stopSpeaking();
    stopRecording();
    setCurrentQuestion('');
    setEvaluation(null);
    setCandidateAnswer('');
    setQuestionHistory([]);
    setRoundNumber(1);
    setElapsedSeconds(0);
    setIsTimerActive(false);
  };

  useEffect(() => {
    return () => {
      stopSpeaking();
      stopRecording();
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#000000] text-zinc-100 flex flex-col font-sans selection:bg-white selection:text-black">
      <UnifiedNavbar />

      <SubpageStripesContainer pattern="horizon" className="flex-1 flex flex-col pt-2 sm:pt-4">
        {/* Sticky Control Header Bar */}
        <div className="border-b border-white/[0.08] px-4 sm:px-8 py-3 bg-black/85 backdrop-blur-2xl z-20 sticky top-14 transition-all">
          <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <GhostDetectiveLogo size="sm" animated={true} />
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xs font-bold font-mono tracking-wider text-white">
                    {mt.title}
                  </h1>
                  <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-white/[0.08] text-zinc-300 border border-white/15 uppercase font-semibold">
                    {mt.simulator}
                  </span>
                  {currentQuestion && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                      {isUa ? `Раунд ${roundNumber}` : `Round ${roundNumber}`}
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-zinc-400 font-mono hidden sm:block">
                  {mt.subtitle}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              {/* Voice TTS Switcher */}
              <button
                type="button"
                onClick={() => {
                  if (autoVoice && isSpeaking) stopSpeaking();
                  setAutoVoice(!autoVoice);
                }}
                className={`px-3 py-1.5 rounded-full border text-xs font-mono flex items-center gap-1.5 transition-all cursor-pointer ${
                  autoVoice
                    ? 'bg-white/15 border-white/30 text-white shadow-[0_0_12px_rgba(255,255,255,0.1)]'
                    : 'bg-white/[0.03] border-white/10 text-zinc-500 hover:text-zinc-300'
                }`}
                title={mt.voiceTitle}
              >
                {autoVoice ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">{autoVoice ? mt.voiceOn : mt.voiceOff}</span>
              </button>

              {/* Language Dropdown */}
              <LangDropdown />
            </div>
          </div>
        </div>

        {/* Main Cockpit Content */}
        <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 pb-24 flex flex-col gap-6">
          {/* ─────────────────────────────────────────────────────────────
              VIEW 1: PRE-FLIGHT SETUP (When no question is currently active)
             ───────────────────────────────────────────────────────────── */}
          {!currentQuestion ? (
            <div className="space-y-6 animate-in fade-in duration-300">
              {/* Main Pre-Flight Setup Card */}
              <div className="p-6 sm:p-8 rounded-3xl bg-[#0b0b0e]/90 border border-white/[0.12] shadow-[0_16px_50px_rgba(0,0,0,0.8)] backdrop-blur-2xl space-y-6">
                {/* Header Pitch */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/[0.08]">
                  <div className="space-y-1">
                    <div className="inline-flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-zinc-400 font-bold mb-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
                      <span>{isUa ? 'FAANG Режим допиту наживо' : 'Live FAANG Sparring Engine'}</span>
                    </div>
                    <h2 className="text-xl sm:text-2xl font-bold font-sans text-white tracking-tight">
                      {mt.emptyTitle}
                    </h2>
                    <p className="text-xs sm:text-sm text-zinc-400 font-sans max-w-2xl leading-relaxed">
                      {mt.emptyDesc}
                    </p>
                  </div>

                  <div className="shrink-0 flex items-center gap-2">
                    <span className="text-[11px] font-mono px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/10 text-zinc-300">
                      ⚡ 100% Voice + Text
                    </span>
                  </div>
                </div>

                {/* 1. Target Role & Stack Preset Selector */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-300 font-semibold font-mono uppercase tracking-wider flex items-center gap-2">
                      <Briefcase className="w-3.5 h-3.5 text-zinc-400" />
                      <span>{isUa ? '1. Оберіть спеціалізацію' : '1. Select Target Vacancy'}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsCustomRole(!isCustomRole)}
                      className="text-xs text-zinc-400 hover:text-white transition-colors underline cursor-pointer font-sans"
                    >
                      {isCustomRole
                        ? (isUa ? 'Обрати зі списку' : 'Choose preset')
                        : (isUa ? 'Вказати власну вакансію' : 'Enter custom role')}
                    </button>
                  </div>

                  {isCustomRole ? (
                    <div className="p-3.5 rounded-2xl bg-black/60 border border-white/20 flex items-center gap-3">
                      <input
                        type="text"
                        autoFocus
                        value={customRoleInput}
                        onChange={(e) => setCustomRoleInput(e.target.value)}
                        placeholder={
                          isUa
                            ? 'Наприклад: Senior Rust Systems Engineer або Lead iOS Developer'
                            : 'e.g. Senior Rust Systems Engineer or Lead iOS Developer'
                        }
                        className="flex-1 bg-transparent text-sm text-white placeholder-zinc-500 focus:outline-none font-sans"
                      />
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                      {PRESET_ROLES.map((r) => {
                        const isSelected = role === r.value;
                        return (
                          <button
                            key={r.id}
                            type="button"
                            onClick={() => setRole(r.value)}
                            className={`p-3 rounded-xl border text-left text-xs font-mono transition-all cursor-pointer flex items-center justify-between ${
                              isSelected
                                ? 'bg-white/15 border-white/40 text-white shadow-sm font-semibold'
                                : 'bg-white/[0.02] hover:bg-white/[0.06] border-white/[0.08] text-zinc-300'
                            }`}
                          >
                            <span>{r.label}</span>
                            {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_6px_#ffffff]" />}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* 2. Seniority Level Selector */}
                <div className="space-y-3 pt-2">
                  <span className="text-zinc-300 font-semibold font-mono text-xs uppercase tracking-wider flex items-center gap-2">
                    <UserCheck className="w-3.5 h-3.5 text-zinc-400" />
                    <span>{isUa ? '2. Рівень складності (Грейд)' : '2. Seniority Level'}</span>
                  </span>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {PRESET_LEVELS.map((lvl) => {
                      const isSelected = level === lvl.value;
                      return (
                        <button
                          key={lvl.id}
                          type="button"
                          onClick={() => setLevel(lvl.value)}
                          className={`py-2.5 px-3 rounded-xl border text-center text-xs font-mono transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-white text-black border-white font-bold shadow-md'
                              : 'bg-white/[0.02] hover:bg-white/[0.06] border-white/[0.08] text-zinc-300'
                          }`}
                        >
                          {lvl.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 3. Focus Round Selector */}
                <div className="space-y-3 pt-2">
                  <span className="text-zinc-300 font-semibold font-mono text-xs uppercase tracking-wider flex items-center gap-2">
                    <Zap className="w-3.5 h-3.5 text-zinc-400" />
                    <span>{isUa ? '3. Фокус раунду співбесіди' : '3. Interview Focus Round'}</span>
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
                    {FOCUS_ROUNDS.map((f) => {
                      const isSelected = focusTopic === f.label;
                      return (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => setFocusTopic(f.label)}
                          className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-white/10 border-white/30 text-white'
                              : 'bg-white/[0.02] hover:bg-white/[0.05] border-white/[0.06] text-zinc-400'
                          }`}
                        >
                          <div className="text-xs font-mono font-bold text-white mb-0.5">{f.label}</div>
                          <div className="text-[10px] text-zinc-400 leading-snug">{f.desc}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 4. Primary CTA: Launch Sparring */}
                <div className="pt-4 border-t border-white/[0.08] flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="text-xs text-zinc-400 font-sans flex items-center gap-2">
                    <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                    <span>
                      {isUa
                        ? 'ШІ підготує персоналізоване питання з критеріями FAANG.'
                        : 'AI will generate a targeted question evaluated against FAANG standards.'}
                    </span>
                  </div>

                  <button
                    onClick={() => handleGenerateQuestion(false)}
                    disabled={isGeneratingQuestion}
                    className="w-full sm:w-auto py-3.5 px-8 rounded-xl bg-white hover:bg-zinc-100 text-black font-mono text-xs font-extrabold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2.5 shadow-[0_0_30px_rgba(255,255,255,0.25)] hover:shadow-[0_0_40px_rgba(255,255,255,0.35)] active:scale-[0.99] disabled:opacity-50"
                  >
                    <Sparkles className="w-4 h-4 fill-black" />
                    <span>{isGeneratingQuestion ? mt.generatingBtn : (isUa ? 'Розпочати спарринг →' : 'Start Sparring →')}</span>
                  </button>
                </div>
              </div>

              {/* 3-Step Explanatory Guide from I18N */}
              <div className="space-y-3">
                <h3 className="text-xs font-mono uppercase tracking-widest text-zinc-500 font-semibold px-1">
                  {mt.howItWorksTitle}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.08] space-y-1.5">
                    <div className="font-mono text-xs font-bold text-zinc-200 flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-[10px]">1</span>
                      <span>{mt.step1Title}</span>
                    </div>
                    <p className="text-xs text-zinc-400 font-sans leading-relaxed">
                      {mt.step1Desc}
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.08] space-y-1.5">
                    <div className="font-mono text-xs font-bold text-zinc-200 flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-[10px]">2</span>
                      <span>{mt.step2Title}</span>
                    </div>
                    <p className="text-xs text-zinc-400 font-sans leading-relaxed">
                      {mt.step2Desc}
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.08] space-y-1.5">
                    <div className="font-mono text-xs font-bold text-zinc-200 flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-[10px]">3</span>
                      <span>{mt.step3Title}</span>
                    </div>
                    <p className="text-xs text-zinc-400 font-sans leading-relaxed">
                      {mt.step3Desc}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* ─────────────────────────────────────────────────────────────
               VIEW 2: ACTIVE SPARRING COCKPIT (Question is generated)
               ───────────────────────────────────────────────────────────── */
            <div className="space-y-6 animate-in fade-in duration-300">
              {/* Question Card (Interviewer Speech Desk) */}
              <div className="p-6 sm:p-8 rounded-3xl bg-[#0b0b0e]/95 border border-white/[0.12] shadow-[0_16px_50px_rgba(0,0,0,0.8)] backdrop-blur-2xl space-y-5 relative overflow-hidden">
                {/* Meta Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-white/[0.08]">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/[0.06] border border-white/15 text-[10px] font-mono font-bold uppercase text-zinc-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]" />
                      <span>{mt.interviewerQuestion} #{roundNumber}</span>
                    </span>

                    <span className="px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/10 text-[10px] font-mono text-zinc-400">
                      {questionDifficulty} · {questionTopic || role}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Speak / Pause Audio Button */}
                    <button
                      type="button"
                      onClick={() => (isSpeaking ? stopSpeaking() : speakText(currentQuestion))}
                      className="px-3 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/15 text-zinc-200 hover:text-white transition-all cursor-pointer flex items-center gap-2 text-xs font-mono"
                      title={mt.speakBtn}
                    >
                      {isSpeaking ? (
                        <>
                          <span className="flex items-center gap-0.5 text-emerald-400">
                            <span className="w-1 h-3 bg-emerald-400 animate-pulse" />
                            <span className="w-1 h-4 bg-emerald-400 animate-pulse delay-75" />
                            <span className="w-1 h-2 bg-emerald-400 animate-pulse delay-150" />
                          </span>
                          <span>{mt.stopBtn}</span>
                        </>
                      ) : (
                        <>
                          <Volume2 className="w-3.5 h-3.5 text-zinc-300" />
                          <span>{mt.speakBtn}</span>
                        </>
                      )}
                    </button>

                    {/* Reset / Change Config */}
                    <button
                      type="button"
                      onClick={handleResetSession}
                      className="px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-zinc-400 hover:text-white text-xs font-mono transition-colors cursor-pointer"
                      title={isUa ? 'Змінити спеціалізацію' : 'Change role settings'}
                    >
                      {isUa ? 'Налаштування' : 'Config'}
                    </button>
                  </div>
                </div>

                {/* Question Statement */}
                <h2 className="text-lg sm:text-2xl font-bold font-sans text-white leading-relaxed tracking-tight">
                  «{currentQuestion}»
                </h2>

                {/* Expandable Hint / Criteria Accordion */}
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between">
                    {contextHint && (
                      <button
                        type="button"
                        onClick={() => setShowHint(!showHint)}
                        className="text-xs font-mono text-zinc-400 hover:text-white transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <HelpCircle className="w-3.5 h-3.5" />
                        <span>{showHint ? (isUa ? 'Приховати критерії' : 'Hide criteria') : (isUa ? '💡 Що оцінює інтервʼюер? (Підказка)' : '💡 What is the interviewer evaluating?')}</span>
                        {showHint ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </button>
                    )}

                    <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
                      <Clock className="w-3.5 h-3.5 text-zinc-400" />
                      <span>{isUa ? 'Час на відповідь:' : 'Time:'} <strong className="text-white">{formatTimer(elapsedSeconds)}</strong></span>
                    </div>
                  </div>

                  {showHint && (
                    <div className="p-4 rounded-2xl bg-black/50 border border-white/10 space-y-2 animate-in fade-in duration-150">
                      {contextHint && (
                        <p className="text-xs font-mono text-zinc-300 leading-relaxed">
                          <strong className="text-zinc-100">{mt.contextHintPrefix}</strong> {contextHint}
                        </p>
                      )}
                      {expectedPoints.length > 0 && (
                        <div className="pt-1.5">
                          <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 block mb-1">
                            {mt.expectedPointsPrefix}
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {expectedPoints.map((pt, i) => (
                              <span key={i} className="px-2 py-0.5 rounded bg-white/[0.04] border border-white/10 text-[11px] font-mono text-zinc-300">
                                ✓ {pt}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Answer Desk Card (Voice Dictation + Text Editor) */}
              <div className="p-6 sm:p-8 rounded-3xl bg-[#0b0b0e]/95 border border-white/[0.12] shadow-[0_16px_50px_rgba(0,0,0,0.8)] backdrop-blur-2xl space-y-4">
                {/* Header & Controls */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <span className="text-xs font-mono text-white font-bold uppercase tracking-wider flex items-center gap-2">
                      <FileText className="w-3.5 h-3.5 text-zinc-300" />
                      <span>{mt.yourAnswer}</span>
                    </span>
                    <p className="text-[11px] text-zinc-400 font-sans">
                      {isUa
                        ? 'Говоріть у мікрофон або пишіть текстом. AI оцінить глибину та структуру.'
                        : 'Dictate via microphone or type text. AI will score depth and STAR structure.'}
                    </p>
                  </div>

                  {/* Mic Voice Dictation Action Button */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={toggleRecording}
                      className={`px-4 py-2 rounded-xl text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 ${
                        isRecording
                          ? 'bg-rose-500 text-white shadow-[0_0_20px_rgba(244,63,94,0.5)] animate-pulse'
                          : 'bg-white/10 hover:bg-white/20 border border-white/20 text-white shadow-sm'
                      }`}
                    >
                      {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                      <span>{isRecording ? (isUa ? '🔴 Запис (Зупинити)' : '🔴 Stop Recording') : (isUa ? '🎙️ Говорити відповідь' : '🎙️ Speak Answer')}</span>
                    </button>
                  </div>
                </div>

                {/* Active Dictation Notification Pill */}
                {isRecording && (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs font-mono text-rose-300 flex items-center justify-between animate-pulse">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-rose-500" />
                      <span>{isUa ? 'Йде розпізнавання мови... Говоріть чітко та впевнено' : 'Voice recognition active... Speak clearly'}</span>
                    </div>
                    <span>{formatTimer(elapsedSeconds)}</span>
                  </div>
                )}

                {/* Textarea Editor */}
                <textarea
                  value={candidateAnswer}
                  onChange={(e) => setCandidateAnswer(e.target.value)}
                  placeholder={mt.placeholder}
                  rows={6}
                  className="w-full p-4 rounded-2xl bg-black/60 border border-white/15 text-sm font-sans text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-white/40 focus:ring-1 focus:ring-white/20 leading-relaxed resize-none"
                />

                {/* Bottom Status & Action Bar */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                  <div className="text-[11px] font-mono text-zinc-500 flex items-center gap-3">
                    <span>{candidateAnswer.length} {mt.chars}</span>
                    <span>·</span>
                    <span>{candidateAnswer.trim() ? candidateAnswer.trim().split(/\s+/).length : 0} {isUa ? 'слів' : 'words'}</span>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={() => handleGenerateQuestion(false)}
                      disabled={isGeneratingQuestion}
                      className="flex-1 sm:flex-initial py-3 px-4 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-xs font-mono text-zinc-300 transition-colors cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-zinc-400" />
                      <span>{mt.anotherQuestion}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleEvaluate}
                      disabled={isEvaluating || !candidateAnswer.trim()}
                      className="flex-1 sm:flex-initial py-3 px-6 rounded-xl bg-white hover:bg-zinc-100 text-black font-mono text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(255,255,255,0.2)] disabled:opacity-50"
                    >
                      <Award className="w-4 h-4 fill-black" />
                      <span>{isEvaluating ? mt.evaluatingBtn : mt.evaluateBtn}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* ─────────────────────────────────────────────────────────────
                  VIEW 3: DETAILED FAANG EVALUATION DEBRIEF (Scorecard)
                 ───────────────────────────────────────────────────────────── */}
              {evaluation && (
                <div className="p-6 sm:p-8 rounded-3xl bg-[#0b0b0e]/98 border border-white/20 space-y-6 shadow-[0_20px_60px_rgba(0,0,0,0.9)] backdrop-blur-2xl animate-in fade-in slide-in-from-bottom-3 duration-300">
                  {/* Score Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/10">
                    <div className="flex items-center gap-4">
                      <div
                        className={`w-16 h-16 rounded-2xl flex items-center justify-center font-mono font-black text-2xl shrink-0 shadow-lg ${
                          evaluation.score >= 8
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                            : evaluation.score >= 5
                            ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                            : 'bg-zinc-900 text-zinc-300 border border-white/15'
                        }`}
                      >
                        {evaluation.score}<span className="text-xs text-zinc-500 font-normal">/10</span>
                      </div>

                      <div>
                        <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-400 font-bold">
                          {mt.verdictPrefix} <strong className="text-white">{evaluation.verdict}</strong>
                        </div>
                        <h3 className="text-lg sm:text-xl font-bold font-sans text-white mt-0.5">
                          {evaluation.score >= 8
                            ? mt.scoreHigh
                            : evaluation.score >= 5
                            ? mt.scoreMid
                            : mt.scoreLow}
                        </h3>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono px-3 py-1.5 rounded-full bg-white/[0.06] border border-white/15 text-zinc-300">
                        {isUa ? `Раунд ${roundNumber} завершено` : `Round ${roundNumber} Complete`}
                      </span>
                    </div>
                  </div>

                  {/* Strengths & Missing Concepts Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Strengths */}
                    <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/10 space-y-3">
                      <span className="text-xs font-mono text-emerald-400 font-bold uppercase tracking-wider flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span>{mt.strengthsTitle}</span>
                      </span>
                      <ul className="space-y-2 text-xs text-zinc-300 font-sans leading-relaxed">
                        {evaluation.strengths.map((s, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-emerald-400 shrink-0">✓</span>
                            <span>{s}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Missing Key Concepts */}
                    <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/10 space-y-3">
                      <span className="text-xs font-mono text-amber-400 font-bold uppercase tracking-wider flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-amber-400" />
                        <span>{mt.missingTitle}</span>
                      </span>
                      <ul className="space-y-2 text-xs text-zinc-300 font-sans leading-relaxed">
                        {evaluation.missingKeyConcepts.map((m, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-amber-400 shrink-0">⚠️</span>
                            <span>{m}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Staff Engineer Master Model Answer */}
                  <div className="p-6 rounded-2xl bg-black/60 border border-white/15 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono text-zinc-200 font-bold uppercase tracking-wider flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-white" />
                        <span>{mt.masterAnswerTitle}</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => speakText(evaluation.staffEngineerAnswer)}
                        className="px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-mono text-zinc-200 hover:text-white transition-colors cursor-pointer flex items-center gap-1.5"
                        title={mt.masterAnswerTooltip}
                      >
                        <Volume2 className="w-3.5 h-3.5 text-zinc-300" />
                        <span>{isUa ? 'Озвучити еталон' : 'Listen'}</span>
                      </button>
                    </div>
                    <p className="text-xs sm:text-sm font-sans text-zinc-200 leading-relaxed italic bg-white/[0.02] p-4 rounded-xl border border-white/5">
                      «{evaluation.staffEngineerAnswer}»
                    </p>
                  </div>

                  {/* Next Round Actions */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEvaluation(null);
                        setCandidateAnswer('');
                        setIsTimerActive(true);
                      }}
                      className="w-full sm:w-auto py-3 px-5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-xs font-mono text-zinc-300 transition-colors cursor-pointer"
                    >
                      {isUa ? 'Спробувати відповісти на це ж питання знову' : 'Retry this question'}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleGenerateQuestion(true)}
                      className="w-full sm:w-auto py-3.5 px-8 rounded-xl bg-white hover:bg-zinc-100 text-black font-mono text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(255,255,255,0.2)]"
                    >
                      <span>{isUa ? `Наступне запитання (Раунд ${roundNumber + 1}) →` : `Next Question (Round ${roundNumber + 1}) →`}</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </SubpageStripesContainer>

      <UnifiedFooter />
    </div>
  );
}
