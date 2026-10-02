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
} from 'lucide-react';
import { toast } from 'sonner';
import { UnifiedNavbar } from '@/components/ui/UnifiedNavbar';
import { UnifiedFooter } from '@/components/ui/UnifiedFooter';
import { GhostDetectiveLogo } from '@/components/ui/GhostDetectiveLogo';
import { SpotlightCard } from '@/components/ui/SpotlightCard';
import { useLocale } from '@/contexts/LocaleContext';
import { LangDropdown } from '@/components/ui/LangDropdown';
import { MOCK_I18N } from '@/lib/mockI18n';

interface EvaluationResult {
  score: number;
  verdict: string;
  strengths: string[];
  missingKeyConcepts: string[];
  staffEngineerAnswer: string;
}

export default function MockInterviewPage() {
  const { locale } = useLocale();
  const activeLang = locale === 'ua' ? 'uk' : locale;
  const mt = MOCK_I18N[locale] || MOCK_I18N['en'];

  const [role, setRole] = useState('Python Backend Developer (FastAPI / PostgreSQL)');
  const [level, setLevel] = useState('Middle/Senior');
  const [autoVoice, setAutoVoice] = useState(true);

  const [currentQuestion, setCurrentQuestion] = useState<string>('');
  const [contextHint, setContextHint] = useState<string>('');
  const [expectedPoints, setExpectedPoints] = useState<string[]>([]);
  const [questionHistory, setQuestionHistory] = useState<string[]>([]);

  const [candidateAnswer, setCandidateAnswer] = useState<string>('');
  const [isGeneratingQuestion, setIsGeneratingQuestion] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [evaluation, setEvaluation] = useState<EvaluationResult | null>(null);

  const currentAudioRef = useRef<HTMLAudioElement | null>(null);

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

  // High-fidelity speech synthesis across all 10 locales
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

  const handleGenerateQuestion = async () => {
    stopSpeaking();
    setIsGeneratingQuestion(true);
    setEvaluation(null);
    setCandidateAnswer('');

    try {
      const res = await fetch('/api/ai/mock-interviewer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'GENERATE_QUESTION',
          role,
          level,
          language: activeLang,
          questionHistory,
        }),
      });

      const data = await res.json();
      if (data?.question) {
        setCurrentQuestion(data.question);
        setContextHint(data.contextHint || '');
        setExpectedPoints(data.keyExpectedPoints || []);
        setQuestionHistory((prev) => [...prev, data.question]);

        if (autoVoice) {
          setTimeout(() => speakText(data.question), 200);
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

  const handleEvaluate = async () => {
    if (!candidateAnswer || candidateAnswer.trim().length < 10) {
      toast.error(mt.errAnswerTooShort);
      return;
    }

    stopSpeaking();
    setIsEvaluating(true);

    try {
      const res = await fetch('/api/ai/mock-interviewer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'EVALUATE_ANSWER',
          role,
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

  useEffect(() => {
    return () => {
      stopSpeaking();
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#040406] text-zinc-100 flex flex-col font-sans selection:bg-[#C8F135] selection:text-black">
      <UnifiedNavbar />

      {/* Control Strip */}
      <div className="border-b border-white/[0.08] px-4 sm:px-8 py-3 flex items-center justify-between sticky top-[57px] bg-[#040406]/90 backdrop-blur-xl z-30">
        <div className="flex items-center gap-3">
          <GhostDetectiveLogo size="sm" animated={true} />
          <div>
            <h1 className="text-xs font-bold font-mono tracking-wider text-white flex items-center gap-2">
              <span>{mt.title}</span>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#C8F135]/10 text-[#C8F135] border border-[#C8F135]/30">{mt.simulator}</span>
            </h1>
            <span className="text-[10px] text-zinc-500 font-mono hidden sm:inline">
              {mt.subtitle}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Voice Switcher */}
          <button
            type="button"
            onClick={() => setAutoVoice(!autoVoice)}
            className={`px-3 py-1.5 rounded-full border text-xs font-mono flex items-center gap-1.5 transition-all cursor-pointer ${
              autoVoice
                ? 'bg-[#C8F135]/15 border-[#C8F135]/40 text-[#C8F135]'
                : 'bg-white/5 border-white/10 text-zinc-500'
            }`}
            title={mt.voiceTitle}
          >
            {autoVoice ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{autoVoice ? mt.voiceOn : mt.voiceOff}</span>
          </button>

          {/* 10-Language Dropdown */}
          <LangDropdown />
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 pb-24 flex flex-col gap-6">
        {/* Role & Level Pill bar */}
        <div className="p-4 rounded-2xl bg-[#111113] border border-white/5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs font-mono text-zinc-500 uppercase tracking-wider">{mt.roleLabel}</span>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="bg-black/40 border border-white/10 rounded-xl px-3 py-1.5 text-xs font-mono text-zinc-200 focus:outline-none focus:border-[#C8F135]/50"
            >
              <option value="Python Backend Developer (FastAPI / PostgreSQL)">
                Python Backend (FastAPI / PostgreSQL)
              </option>
              <option value="Senior Fullstack Engineer (React / Node.js)">
                Fullstack (React / Next.js / TypeScript)
              </option>
              <option value="DevOps & Cloud Architect (Kubernetes / AWS)">
                DevOps & Cloud (K8s / Terraform)
              </option>
              <option value="Go Systems Engineer (Concurrency / Microservices)">
                Go Engineer (HighLoad / Concurrency)
              </option>
              <option value="System Design & Architecture Lead">
                System Design (Distributed Systems)
              </option>
            </select>

            <select
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              className="bg-black/40 border border-white/10 rounded-xl px-3 py-1.5 text-xs font-mono text-zinc-200 focus:outline-none focus:border-[#C8F135]/50"
            >
              <option value="Junior">Junior</option>
              <option value="Middle">Middle</option>
              <option value="Middle/Senior">Middle/Senior</option>
              <option value="Senior/Staff">Senior / Staff Lead</option>
            </select>
          </div>

          <button
            onClick={handleGenerateQuestion}
            disabled={isGeneratingQuestion}
            className="py-2.5 px-5 rounded-xl bg-[#C8F135] hover:bg-white text-black font-mono text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 shadow-[0_0_20px_rgba(200,241,53,0.3)] disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5 fill-black" />
            <span>{isGeneratingQuestion ? mt.generatingBtn : mt.generateBtn}</span>
          </button>
        </div>

        {/* Question Card */}
        {currentQuestion ? (
          <div className="p-6 sm:p-8 rounded-3xl bg-[#111113] border border-white/10 space-y-4 shadow-xl relative overflow-hidden">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#C8F135] animate-pulse" />
                <span className="text-[10px] font-mono uppercase tracking-widest text-[#C8F135] font-bold">
                  {mt.interviewerQuestion}
                </span>
              </div>

              <button
                type="button"
                onClick={() => (isSpeaking ? stopSpeaking() : speakText(currentQuestion))}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white transition-all cursor-pointer flex items-center gap-1.5 text-xs font-mono"
                title={mt.speakBtn}
              >
                <Volume2 className="w-4 h-4 text-[#C8F135]" />
                <span className="text-[11px]">{isSpeaking ? mt.stopBtn : mt.speakBtn}</span>
              </button>
            </div>

            <h2 className="text-xl sm:text-2xl font-bold font-sans text-white leading-relaxed">
              «{currentQuestion}»
            </h2>

            {contextHint && (
              <p className="text-xs font-mono text-zinc-400 bg-black/40 p-3 rounded-xl border border-white/5">
                💡 <strong className="text-zinc-300">{mt.contextHintPrefix}</strong> {contextHint}
              </p>
            )}

            {expectedPoints.length > 0 && (
              <div className="pt-2">
                <span className="text-[11px] font-mono text-zinc-500 uppercase block mb-1.5">
                  {mt.expectedPointsPrefix}
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {expectedPoints.map((pt, i) => (
                    <span
                      key={i}
                      className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/5 text-[11px] font-mono text-zinc-300"
                    >
                      ✓ {pt}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="p-12 text-center rounded-3xl bg-[#111113] border border-white/5 space-y-4">
            <div className="text-4xl">🎙️</div>
            <h3 className="text-lg font-bold text-white">{mt.emptyTitle}</h3>
            <p className="text-xs text-zinc-400 max-w-md mx-auto leading-relaxed">
              {mt.emptyDesc}
            </p>
            <button
              onClick={handleGenerateQuestion}
              className="py-3 px-6 rounded-2xl bg-[#C8F135] text-black font-mono text-xs font-bold uppercase tracking-wider hover:bg-white transition-all cursor-pointer"
            >
              {mt.emptyBtn}
            </button>
          </div>
        )}

        {/* Answer Input Area */}
        {currentQuestion && (
          <div className="p-6 rounded-3xl bg-[#111113] border border-white/10 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-zinc-400 font-bold uppercase tracking-wider">
                {mt.yourAnswer}
              </span>
              <span className="text-[11px] font-mono text-zinc-500">
                {candidateAnswer.length} {mt.chars}
              </span>
            </div>

            <textarea
              value={candidateAnswer}
              onChange={(e) => setCandidateAnswer(e.target.value)}
              placeholder={mt.placeholder}
              rows={5}
              className="w-full p-4 rounded-2xl bg-black/50 border border-white/10 text-sm font-sans text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-[#C8F135]/50 leading-relaxed resize-none"
            />

            <div className="flex items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={handleGenerateQuestion}
                className="py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-mono text-zinc-300 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{mt.anotherQuestion}</span>
              </button>

              <button
                type="button"
                onClick={handleEvaluate}
                disabled={isEvaluating}
                className="py-3 px-6 rounded-xl bg-[#C8F135] hover:bg-white text-black font-mono text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 shadow-[0_0_20px_rgba(200,241,53,0.2)] disabled:opacity-50"
              >
                <Award className="w-4 h-4 fill-black" />
                <span>{isEvaluating ? mt.evaluatingBtn : mt.evaluateBtn}</span>
              </button>
            </div>
          </div>
        )}

        {/* Evaluation Debrief */}
        {evaluation && (
          <div className="p-6 sm:p-8 rounded-3xl bg-[#14151a] border border-[#C8F135]/40 space-y-6 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center font-mono font-black text-lg ${
                    evaluation.score >= 8
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                      : evaluation.score >= 5
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                  }`}
                >
                  {evaluation.score}/10
                </div>
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-widest text-[#C8F135] font-bold">
                    {mt.verdictPrefix} {evaluation.verdict}
                  </div>
                  <h3 className="text-lg font-bold font-sans text-white">
                    {evaluation.score >= 8
                      ? mt.scoreHigh
                      : evaluation.score >= 5
                      ? mt.scoreMid
                      : mt.scoreLow}
                  </h3>
                </div>
              </div>
            </div>

            {/* Strengths & Missing */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-500/20 space-y-2">
                <span className="text-xs font-mono text-emerald-300 font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  {mt.strengthsTitle}
                </span>
                <ul className="space-y-1.5 text-xs text-zinc-300 font-sans">
                  {evaluation.strengths.map((s, i) => (
                    <li key={i}>• {s}</li>
                  ))}
                </ul>
              </div>

              <div className="p-4 rounded-2xl bg-amber-950/20 border border-amber-500/20 space-y-2">
                <span className="text-xs font-mono text-amber-300 font-bold flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                  {mt.missingTitle}
                </span>
                <ul className="space-y-1.5 text-xs text-zinc-300 font-sans">
                  {evaluation.missingKeyConcepts.map((m, i) => (
                    <li key={i}>• {m}</li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Master Answer */}
            <div className="p-5 rounded-2xl bg-black/60 border border-white/10 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-[#C8F135] font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#C8F135]" />
                  {mt.masterAnswerTitle}
                </span>
                <button
                  onClick={() => speakText(evaluation.staffEngineerAnswer)}
                  className="p-1 rounded-lg text-zinc-400 hover:text-white"
                  title={mt.masterAnswerTooltip}
                >
                  <Volume2 className="w-3.5 h-3.5 text-[#C8F135]" />
                </button>
              </div>
              <p className="text-sm font-sans text-zinc-200 leading-relaxed italic">
                «{evaluation.staffEngineerAnswer}»
              </p>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={handleGenerateQuestion}
                className="py-3 px-6 rounded-xl bg-[#C8F135] hover:bg-white text-black font-mono text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2"
              >
                <span>{mt.nextQuestionBtn}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </main>

      <UnifiedFooter />
    </div>
  );
}
