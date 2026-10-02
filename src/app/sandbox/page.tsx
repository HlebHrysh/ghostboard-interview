'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Sparkles,
  ArrowRight,
  RotateCcw,
  Volume2,
  VolumeX,
  Mic,
  MicOff,
  Send,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Clock,
  Award,
  Layers,
  Cpu,
  Flame,
  ChevronRight,
  ArrowLeft,
} from 'lucide-react';
import { toast } from 'sonner';
import { HologramScorecard3D, ScorecardData } from '@/components/arena/HologramScorecard3D';
import { GhostDetectiveLogo } from '@/components/ui/GhostDetectiveLogo';
import { useLocale } from '@/contexts/LocaleContext';
import { LangDropdown } from '@/components/ui/LangDropdown';
import { getArenaTranslations } from '@/lib/arenaI18n';

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

export default function ArenaSandboxPage() {
  const router = useRouter();
  const { locale } = useLocale();
  const a = getArenaTranslations(locale);
  const tracks = a.tracks;
  const levels = a.levels;

  // ── Stage: 'setup' | 'battle' | 'round_review' | 'finished' ────────────────
  const [stage, setStage] = useState<'setup' | 'battle' | 'round_review' | 'finished'>('setup');

  // Setup options
  const [selectedTrack, setSelectedTrack] = useState<string>('frontend');
  const [selectedLevel, setSelectedLevel] = useState<string>('Senior');
  const [candidateName, setCandidateName] = useState<string>('Senior Dev');

  // Battle session state
  const [questions, setQuestions] = useState<ArenaQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [candidateAnswer, setCandidateAnswer] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isEvaluating, setIsEvaluating] = useState<boolean>(false);

  // Timer per question (seconds)
  const [questionTimer, setQuestionTimer] = useState<number>(0);
  const [totalTimer, setTotalTimer] = useState<number>(0);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Audio / Speech
  const [isAudioMuted, setIsAudioMuted] = useState<boolean>(false);
  const [isListeningVoice, setIsListeningVoice] = useState<boolean>(false);
  const recognitionRef = useRef<any>(null);

  // Evaluations history
  const [roundEvaluations, setRoundEvaluations] = useState<RoundEvaluation[]>([]);
  const [currentRoundEvaluation, setCurrentRoundEvaluation] = useState<RoundEvaluation | null>(null);

  // Final scorecard result
  const [finalScorecard, setFinalScorecard] = useState<ScorecardData | null>(null);

  const sandboxAudioRef = useRef<HTMLAudioElement | null>(null);

  // ── Speech Synthesis: Read Question Aloud ──────────────────────────────────
  const speakQuestion = (text: string) => {
    if (isAudioMuted || typeof window === 'undefined') return;
    stopSpeaking();

    try {
      const audio = new Audio(`/api/audio/tts?lang=uk&text=${encodeURIComponent(text)}`);
      sandboxAudioRef.current = audio;
      audio.onended = () => {
        sandboxAudioRef.current = null;
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
        utterance.lang = 'uk-UA';
        const voices = window.speechSynthesis.getVoices();
        const ukVoice = voices.find(
          (v) =>
            v.lang.startsWith('uk') ||
            v.lang === 'uk-UA' ||
            v.name.toLowerCase().includes('ukrain') ||
            v.name.toLowerCase().includes('україн')
        );
        if (ukVoice) utterance.voice = ukVoice;
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        window.speechSynthesis.speak(utterance);
      } catch {}
    }
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
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      toast.info(a.voiceNotSupported);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'uk-UA';

      recognition.onstart = () => {
        setIsListeningVoice(true);
        toast.info(a.voiceListeningToast);
      };

      recognition.onresult = (event: any) => {
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

  // ── Action: Start Arena Session ───────────────────────────────────────────
  const handleStartArena = async () => {
    setIsLoading(true);
    setCandidateAnswer('');
    setRoundEvaluations([]);
    setCurrentIndex(0);
    setQuestionTimer(0);
    setTotalTimer(0);

    try {
      const res = await fetch('/api/ai/arena', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'START_ARENA',
          track: selectedTrack,
          level: selectedLevel,
          candidateName,
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
    } catch (err: any) {
      toast.error(a.serverConnectError);
    } finally {
      setIsLoading(false);
    }
  };

  // ── Action: Submit Current Answer for AI Evaluation ───────────────────────
  const handleSubmitAnswer = async () => {
    if (!candidateAnswer.trim()) {
      toast.warning(a.emptyAnswerWarning);
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

  // ── Action: Proceed to Next Round or Finalize ─────────────────────────────
  const handleProceedNext = async () => {
    if (currentIndex + 1 < questions.length) {
      const nextIdx = currentIndex + 1;
      setCurrentIndex(nextIdx);
      setCandidateAnswer('');
      setQuestionTimer(0);
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
    <div className="min-h-screen bg-black text-white font-sans flex flex-col justify-between p-4 sm:p-8 relative selection:bg-[#C8F135] selection:text-black">
      {/* Background cyber radial glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-950/20 via-zinc-950 to-black -z-10 pointer-events-none" />

      {/* Top Header */}
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
            <span className="w-2 h-2 rounded-full bg-[#C8F135] animate-pulse shadow-[0_0_10px_#C8F135]" />
            <span className="font-mono font-black text-sm tracking-widest text-[#C8F135]">
              {a.headerTitle}
            </span>
            <span className="hidden sm:inline text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/10 text-zinc-300 border border-white/10 uppercase">
              {a.headerBadge}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden md:flex items-center gap-1 font-mono text-xs text-zinc-400 mr-2">
            <Link
              href="/"
              className="px-2.5 py-1 rounded-lg hover:text-white hover:bg-white/5 transition-colors"
            >
              {a.navHome}
            </Link>
            <Link
              href="/mock-interview"
              className="px-2.5 py-1 rounded-lg hover:text-white hover:bg-white/5 transition-colors"
            >
              {a.navMock}
            </Link>
            <Link
              href="/interview"
              className="px-2.5 py-1 rounded-lg text-[#C8F135] hover:text-white transition-colors font-bold"
            >
              {a.navCopilot}
            </Link>
          </div>

          {stage === 'battle' && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-900 border border-white/10 font-mono text-xs text-zinc-300">
              <Clock className="w-3.5 h-3.5 text-[#C8F135]" />
              <span>
                {Math.floor(totalTimer / 60)}:{(totalTimer % 60).toString().padStart(2, '0')}
              </span>
            </div>
          )}

          <button
            type="button"
            onClick={() => setIsAudioMuted((p) => !p)}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white border border-white/10 transition-colors cursor-pointer"
            title={isAudioMuted ? a.unmuteInterviewer : a.muteInterviewer}
          >
            {isAudioMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-[#C8F135]" />}
          </button>

          <LangDropdown />
        </div>
      </header>

      {/* Main Dynamic Viewport */}
      <main className="max-w-4xl w-full mx-auto flex-1 flex flex-col justify-center my-auto">
        {/* ── STAGE 1: SETUP ──────────────────────────────────────────────── */}
        {stage === 'setup' && (
          <div className="flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-300">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#C8F135]/10 border border-[#C8F135]/30 text-[#C8F135] text-xs font-mono font-bold uppercase tracking-wider mb-3">
              <Flame className="w-3.5 h-3.5" />
              <span>{a.setupBadge}</span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight mb-3 font-sans">
              {a.setupTitle}
            </h1>
            <p className="text-sm text-zinc-400 max-w-xl mb-8 leading-relaxed">
              {a.setupSubtitle}
            </p>

            {/* Candidate Name Input */}
            <div className="w-full max-w-md mb-8 text-left">
              <label className="block text-xs font-mono text-zinc-400 mb-2 uppercase tracking-wider">
                {a.nameLabel}
              </label>
              <input
                type="text"
                value={candidateName}
                onChange={(e) => setCandidateName(e.target.value)}
                placeholder={a.namePlaceholder}
                className="w-full px-4 py-3 rounded-xl bg-zinc-950 border border-white/15 focus:border-[#C8F135] text-white font-mono text-sm focus:outline-none transition-colors"
              />
            </div>

            {/* Track Selector Cards */}
            <div className="w-full mb-8 text-left">
              <label className="block text-xs font-mono text-zinc-400 mb-3 uppercase tracking-wider text-center sm:text-left">
                {a.step1TrackLabel}
              </label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                {tracks.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => setSelectedTrack(t.id)}
                    className={`p-5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between relative overflow-hidden ${
                      selectedTrack === t.id
                        ? 'bg-zinc-900 border-[#C8F135] shadow-[0_0_30px_rgba(200,241,53,0.15)] scale-[1.02]'
                        : 'bg-zinc-950/80 border-white/10 hover:border-white/20'
                    }`}
                  >
                    <div>
                      <div className="text-3xl mb-3">{t.icon}</div>
                      <h3 className="font-bold text-white text-base font-sans">{t.title}</h3>
                      <div className="text-[11px] font-mono text-[#C8F135] mb-2">{t.badge}</div>
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

            {/* Seniority Level */}
            <div className="w-full mb-8 text-center sm:text-left">
              <label className="block text-xs font-mono text-zinc-400 mb-3 uppercase tracking-wider text-center sm:text-left">
                {a.step2LevelLabel}
              </label>
              <div className="flex flex-wrap justify-center sm:justify-start gap-2.5">
                {levels.map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setSelectedLevel(lvl)}
                    className={`px-5 py-2.5 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer ${
                      selectedLevel === lvl
                        ? 'bg-[#C8F135] text-black shadow-[0_0_20px_rgba(200,241,53,0.3)]'
                        : 'bg-zinc-900 border border-white/10 text-zinc-400 hover:text-white'
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>

            {/* Launch Button */}
            <button
              type="button"
              onClick={handleStartArena}
              disabled={isLoading}
              className="py-4 px-8 rounded-2xl bg-[#C8F135] hover:bg-white text-black font-black text-sm font-mono shadow-[0_0_35px_rgba(200,241,53,0.4)] transition-all flex items-center gap-3 active:scale-95 cursor-pointer disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4 fill-black" />
              <span>
                {isLoading ? a.generatingQuestions : a.startBtn}
              </span>
            </button>
          </div>
        )}

        {/* ── STAGE 2: BATTLE ROUND ───────────────────────────────────────── */}
        {stage === 'battle' && activeQuestion && (
          <div className="flex flex-col gap-6 animate-in fade-in duration-200">
            {/* Round indicator & Progress Bar */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs font-mono text-zinc-400">
                <div className="flex items-center gap-2">
                  <span className="text-[#C8F135] font-bold">
                    {a.roundHeader(currentIndex + 1, questions.length)}
                  </span>
                  <span>•</span>
                  <span>
                    {activeQuestion.isArchitectureCase ? a.archCaseBadge : a.techBlitzBadge}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-zinc-300">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  <span>{a.answerTimerLabel(questionTimer)}</span>
                </div>
              </div>

              {/* Multi-segment Progress Bar */}
              <div className="w-full h-2 rounded-full bg-zinc-900 overflow-hidden flex gap-1">
                {questions.map((q, idx) => (
                  <div
                    key={q.id}
                    className={`h-full flex-1 transition-all ${
                      idx < currentIndex
                        ? 'bg-emerald-500'
                        : idx === currentIndex
                        ? 'bg-[#C8F135] animate-pulse'
                        : 'bg-zinc-800'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Question Card */}
            <div className="p-6 sm:p-8 rounded-3xl bg-zinc-950 border-2 border-white/15 shadow-2xl relative overflow-hidden">
              <div className="flex items-center justify-between gap-3 mb-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-mono text-zinc-300">
                  <span>{a.topicLabel}</span>
                  <span className="text-white font-bold">{activeQuestion.topic}</span>
                </div>

                <button
                  type="button"
                  onClick={() => speakQuestion(activeQuestion.question)}
                  className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white transition-colors"
                  title={a.replayQuestionAudio}
                >
                  <Volume2 className="w-4 h-4 text-[#C8F135]" />
                </button>
              </div>

              <h2 className="text-xl sm:text-2xl font-bold text-white leading-relaxed mb-4 font-sans">
                «{activeQuestion.question}»
              </h2>

              {activeQuestion.contextHint && (
                <div className="p-3 rounded-xl bg-white/5 text-xs font-mono text-zinc-400 border border-white/5">
                  💡 <span className="font-semibold text-zinc-300">{a.hintLabel}</span> {activeQuestion.contextHint}
                </div>
              )}
            </div>

            {/* Candidate Answer Box */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between text-xs font-mono text-zinc-400">
                <span>{a.candidateAnswerLabel}</span>
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
                      <span>{a.micStop}</span>
                    </>
                  ) : (
                    <>
                      <Mic className="w-3.5 h-3.5 text-[#C8F135]" />
                      <span>{a.micDictate}</span>
                    </>
                  )}
                </button>
              </div>

              <textarea
                rows={4}
                value={candidateAnswer}
                onChange={(e) => setCandidateAnswer(e.target.value)}
                placeholder={a.answerPlaceholder}
                className="w-full p-4 rounded-2xl bg-zinc-950/90 border border-white/15 focus:border-[#C8F135] text-white font-sans text-sm focus:outline-none transition-colors leading-relaxed resize-none shadow-inner"
              />

              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] font-mono text-zinc-500">
                  {a.thinkingSpeedHint}
                </span>

                <button
                  type="button"
                  onClick={handleSubmitAnswer}
                  disabled={isEvaluating || !candidateAnswer.trim()}
                  className="py-3 px-6 rounded-xl bg-[#C8F135] hover:bg-white text-black font-black text-xs font-mono shadow-[0_0_25px_rgba(200,241,53,0.3)] transition-all flex items-center gap-2 cursor-pointer active:scale-95 disabled:opacity-40"
                >
                  <Send className="w-3.5 h-3.5 fill-black" />
                  <span>
                    {isEvaluating ? a.evaluatingAnswer : a.submitAnswerBtn}
                  </span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── STAGE 3: INTERMEDIATE ROUND REVIEW ───────────────────────────── */}
        {stage === 'round_review' && currentRoundEvaluation && (
          <div className="flex flex-col gap-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 sm:p-8 rounded-3xl bg-zinc-950 border-2 border-white/15 shadow-2xl relative">
              {/* Header result */}
              <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-6">
                <div>
                  <div className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider mb-1">
                    {a.roundResultTitle(currentIndex + 1, questions.length)}
                  </div>
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <span>{a.verdictLabel}</span>
                    <span className="text-[#C8F135]">{currentRoundEvaluation.verdict}</span>
                  </h3>
                </div>

                <div className="p-3 rounded-2xl bg-zinc-900 border border-[#C8F135]/40 text-center">
                  <span className="text-2xl font-black font-mono text-[#C8F135]">
                    {currentRoundEvaluation.score}
                  </span>
                  <span className="text-[10px] font-mono text-zinc-500 block uppercase">{a.outOf100}</span>
                </div>
              </div>

              {/* 5-Metrics Matrix for this round */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-6">
                <div className="p-2.5 rounded-xl bg-zinc-900/80 text-center border border-white/5">
                  <span className="text-[10px] font-mono text-zinc-400 block">{a.metricAccuracy}</span>
                  <span className="text-sm font-bold font-mono text-white">
                    {currentRoundEvaluation.scores.technicalAccuracy}%
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-zinc-900/80 text-center border border-white/5">
                  <span className="text-[10px] font-mono text-zinc-400 block">{a.metricArchitecture}</span>
                  <span className="text-sm font-bold font-mono text-white">
                    {currentRoundEvaluation.scores.architecturalVision}%
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-zinc-900/80 text-center border border-white/5">
                  <span className="text-[10px] font-mono text-zinc-400 block">{a.metricSpeed}</span>
                  <span className="text-sm font-bold font-mono text-white">
                    {currentRoundEvaluation.scores.thinkingSpeed}%
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-zinc-900/80 text-center border border-white/5">
                  <span className="text-[10px] font-mono text-zinc-400 block">{a.metricCommunication}</span>
                  <span className="text-sm font-bold font-mono text-white">
                    {currentRoundEvaluation.scores.communication}%
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-zinc-900/80 text-center border border-white/5">
                  <span className="text-[10px] font-mono text-zinc-400 block">{a.metricResilience}</span>
                  <span className="text-sm font-bold font-mono text-white">
                    {currentRoundEvaluation.scores.stressResilience}%
                  </span>
                </div>
              </div>

              {/* Staff Critique: Strengths & Missing Concepts */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-zinc-300">
                  <span className="font-mono text-emerald-400 font-bold block mb-2 uppercase text-[11px] flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" /> {a.keyStrengthsTitle}
                  </span>
                  <ul className="list-disc pl-4 space-y-1 text-zinc-300">
                    {currentRoundEvaluation.strengths.map((s, idx) => (
                      <li key={idx}>{s}</li>
                    ))}
                  </ul>
                </div>

                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-zinc-300">
                  <span className="font-mono text-amber-400 font-bold block mb-2 uppercase text-[11px] flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5" /> {a.gapsTitle}
                  </span>
                  <ul className="list-disc pl-4 space-y-1 text-zinc-300">
                    {currentRoundEvaluation.missingKeyConcepts.map((m, idx) => (
                      <li key={idx}>{m}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Staff Reference Answer */}
              {currentRoundEvaluation.staffEngineerAnswer && (
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-xs leading-relaxed mb-6">
                  <span className="font-mono text-[#C8F135] font-bold block mb-1 uppercase text-[10px]">
                    {a.staffAnswerTitle}
                  </span>
                  <p className="text-zinc-300">{currentRoundEvaluation.staffEngineerAnswer}</p>
                </div>
              )}

              {/* Proceed Button */}
              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={handleProceedNext}
                  disabled={isLoading}
                  className="py-3 px-6 rounded-xl bg-[#C8F135] hover:bg-white text-black font-black text-xs font-mono shadow-[0_0_25px_rgba(200,241,53,0.3)] transition-all flex items-center gap-2 cursor-pointer active:scale-95"
                >
                  <span>
                    {currentIndex + 1 < questions.length ? a.nextRoundBtn : a.viewScorecardBtn}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── STAGE 4: FINISHED 3D HOLOGRAM SCORECARD ──────────────────────── */}
        {stage === 'finished' && finalScorecard && (
          <div className="flex flex-col items-center animate-in fade-in zoom-in-95 duration-400">
            <div className="text-center mb-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-bold uppercase tracking-wider mb-2">
                <Award className="w-4 h-4 text-emerald-400" />
                <span>{a.assessmentPassedBadge}</span>
              </div>
              <h1 className="text-3xl font-black text-white tracking-tight">
                {a.finishedTitle}
              </h1>
              <p className="text-xs sm:text-sm text-zinc-400 mt-1 max-w-md mx-auto">
                {a.finishedSubtitle}
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
                <RotateCcw className="w-3.5 h-3.5 text-[#C8F135]" />
                <span>{a.tryAnotherTrackBtn}</span>
              </button>

              <Link
                href="/interview"
                className="py-3 px-5 rounded-2xl bg-[#C8F135] hover:bg-white text-black font-black text-xs font-mono shadow-[0_0_25px_rgba(200,241,53,0.3)] transition-all flex items-center gap-2 active:scale-95"
              >
                <Sparkles className="w-3.5 h-3.5 fill-black" />
                <span>{a.launchCopilotBtn}</span>
              </Link>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="text-center text-[11px] font-mono text-zinc-600 mt-12 pb-2">
        {a.footerText}
      </footer>
    </div>
  );
}
