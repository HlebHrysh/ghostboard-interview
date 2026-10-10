'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Volume2,
  Square,
  CheckCircle2,
  Info,
  ArrowRight,
  Play,
  MonitorPlay,
  Sparkles,
  X,
  Zap,
  Globe,
  Radio,
  Mic,
  AlertTriangle,
  ChevronDown,
  Check,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { FluidAudioWaveform } from './FluidAudioWaveform';
import { ScrambleText } from '../ui/ScrambleText';
import { useLocale } from '@/contexts/LocaleContext';
import { getModalsTranslations } from '@/lib/modalsI18n';
import { LOCALE_META, SUPPORTED_LOCALES, type SupportedLocale } from '@/lib/i18n';

interface SoundCheckModalProps {
  isOpen: boolean;
  onClose: () => void;
  isCapturing: boolean;
  liveVolume: number;
  liveTranscript: string;
  candidateLiveTranscript?: string;
  onStartCapture: (source?: 'mic' | 'tab') => void;
  onStopCapture: () => void;
  audioSource?: 'mic' | 'tab';
}

const BCP47_LANG_MAP: Record<SupportedLocale, string> = {
  ua: 'uk-UA',
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

const TTS_LANG_MAP: Record<SupportedLocale, string> = {
  ua: 'uk',
  en: 'en',
  pl: 'pl',
  de: 'de',
  fr: 'fr',
  es: 'es',
  pt: 'pt',
  it: 'it',
  cs: 'cs',
  nl: 'nl',
};

export const SoundCheckModal: React.FC<SoundCheckModalProps> = ({
  isOpen,
  onClose,
  isCapturing,
  liveVolume,
  liveTranscript,
  candidateLiveTranscript,
  onStartCapture,
  onStopCapture,
  audioSource = 'tab',
}) => {
  const { locale, setLocale } = useLocale();
  const m = getModalsTranslations(locale).soundcheck;

  const [hasDetectedAudio, setHasDetectedAudio] = useState(false);
  const [hasDetectedSpeech, setHasDetectedSpeech] = useState(false);
  const [isPlayingVoice, setIsPlayingVoice] = useState(false);
  const [activeVoiceLang, setActiveVoiceLang] = useState<SupportedLocale>(locale);
  const [isLangDropdownOpen, setIsLangDropdownOpen] = useState(false);
  const [currentSelectedSource, setCurrentSelectedSource] = useState<'tab' | 'mic'>(audioSource);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Synchronize active voice language with locale if not manually overridden
  useEffect(() => {
    setActiveVoiceLang(locale);
  }, [locale]);

  // Click outside to close language dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsLangDropdownOpen(false);
      }
    };
    if (isLangDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isLangDropdownOpen]);

  // Detect volume and speech live
  useEffect(() => {
    if (isCapturing && liveVolume > 4) {
      setHasDetectedAudio(true);
    }
    if (isCapturing && liveTranscript.trim().length > 3) {
      setHasDetectedSpeech(true);
    }
  }, [liveVolume, liveTranscript, isCapturing]);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      if (!isCapturing) {
        setHasDetectedAudio(false);
        setHasDetectedSpeech(false);
      }
      setIsPlayingVoice(false);
    } else {
      handleStopVoice();
    }
  }, [isOpen, isCapturing]);

  // Cleanup audio playback on unmount
  useEffect(() => {
    return () => {
      handleStopVoice();
    };
  }, []);

  const handleStopVoice = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsPlayingVoice(false);
  };

  const handlePlayVoice = (targetLang?: SupportedLocale) => {
    const langToUse = targetLang || activeVoiceLang || locale;
    const testText = getModalsTranslations(langToUse).soundcheck.testSpeechText;

    handleStopVoice();
    setIsPlayingVoice(true);
    setActiveVoiceLang(langToUse);

    try {
      const ttsLang = TTS_LANG_MAP[langToUse] || 'uk';
      const audioUrl = `/api/audio/tts?lang=${ttsLang}&text=${encodeURIComponent(testText)}`;
      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      audio.onended = () => {
        setIsPlayingVoice(false);
        audioRef.current = null;
      };

      audio.onerror = () => {
        fallbackVoiceUtterance(testText, langToUse);
      };

      audio.play().catch(() => {
        fallbackVoiceUtterance(testText, langToUse);
      });
    } catch {
      fallbackVoiceUtterance(testText, langToUse);
    }
  };

  const fallbackVoiceUtterance = (text: string, langToUse: SupportedLocale) => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = BCP47_LANG_MAP[langToUse] || 'en-US';
      utterance.rate = 0.95;
      utterance.onend = () => {
        setIsPlayingVoice(false);
      };
      utterance.onerror = () => {
        setIsPlayingVoice(false);
      };
      window.speechSynthesis.speak(utterance);
    } else {
      setIsPlayingVoice(false);
    }
  };

  const handleStartCaptureWithSource = (src: 'tab' | 'mic') => {
    setCurrentSelectedSource(src);
    onStartCapture(src);
  };

  const handleAutomatedYoutubeTest = () => {
    setCurrentSelectedSource('tab');
    window.open('https://www.youtube.com/watch?v=J0n1R8Q-9X0', '_blank', 'width=800,height=600');
    onStartCapture('tab');
  };

  const handleLanguageChange = (lang: SupportedLocale) => {
    setLocale(lang);
    setActiveVoiceLang(lang);
    setIsLangDropdownOpen(false);
  };

  if (!isOpen) return null;

  const currentMeta = LOCALE_META[locale] || LOCALE_META.en;
  const activeVoiceMeta = LOCALE_META[activeVoiceLang] || currentMeta;
  const currentTestText = getModalsTranslations(activeVoiceLang).soundcheck.testSpeechText;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
        {/* Cinematic Backdrop with Glow */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/85 backdrop-blur-xl"
          onClick={onClose}
        >
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-white/[0.03] rounded-full blur-[140px] pointer-events-none" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-white/[0.02] rounded-full blur-[140px] pointer-events-none" />
        </motion.div>

        {/* Modal Container */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          transition={{ type: 'spring', damping: 26, stiffness: 340 }}
          className="relative w-full max-w-3xl max-h-[92vh] overflow-y-auto bg-[#08080c] border border-white/15 rounded-3xl p-5 sm:p-7 shadow-[0_32px_120px_rgba(0,0,0,0.95)] z-10 text-white scrollbar-thin scrollbar-thumb-white/10"
        >
          {/* Top Bar: Badge, Language Switcher, Close Button */}
          <div className="flex items-center justify-between gap-3 pb-4 border-b border-white/10 mb-5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-white text-[11px] font-mono font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{m.badge}</span>
            </div>

            <div className="flex items-center gap-2">
              {/* Language Selector Dropdown inside Modal */}
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsLangDropdownOpen((prev) => !prev)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/15 text-xs font-mono font-bold text-zinc-200 hover:text-white transition-all cursor-pointer shadow-sm"
                  title={m.langSelectLabel}
                >
                  <Globe className="w-3.5 h-3.5 text-white" />
                  <span>{currentMeta.flag}</span>
                  <span className="uppercase">{locale}</span>
                  <ChevronDown className={`w-3.5 h-3.5 text-zinc-400 transition-transform ${isLangDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {isLangDropdownOpen && (
                  <div className="absolute right-0 top-full mt-2 w-48 bg-zinc-950/95 backdrop-blur-2xl border border-white/20 rounded-2xl shadow-2xl z-[120] overflow-hidden p-1.5 animate-in fade-in zoom-in-95 duration-150">
                    <div className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider px-2 py-1 border-b border-white/10 mb-1">
                      {m.langSelectLabel}
                    </div>
                    <div className="max-h-60 overflow-y-auto space-y-0.5">
                      {SUPPORTED_LOCALES.map((loc) => {
                        const meta = LOCALE_META[loc];
                        const isSelected = locale === loc;
                        return (
                          <button
                            key={loc}
                            type="button"
                            onClick={() => handleLanguageChange(loc)}
                            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-mono transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-white/15 text-white font-bold'
                                : 'text-zinc-300 hover:text-white hover:bg-white/10'
                            }`}
                          >
                            <span className="flex items-center gap-2">
                              <span>{meta.flag}</span>
                              <span>{meta.nativeName}</span>
                            </span>
                            {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Close Button */}
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-full bg-white/5 hover:bg-white/15 text-zinc-400 hover:text-white border border-white/10 transition-colors cursor-pointer"
                title={m.close}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Modal Title and Description */}
          <div className="mb-5">
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
              <Volume2 className="w-6 h-6 text-white" />
              {m.title}
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 mt-1">
              {m.desc}
            </p>
          </div>

          {/* STEP 1: Select Audio Source */}
          <div className="mb-5 p-4 rounded-2xl bg-zinc-900/60 border border-white/10">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md bg-white text-black font-mono text-xs font-black">
                  01
                </span>
                <h3 className="text-sm font-bold text-white font-sans">
                  {m.step1Title}
                </h3>
              </div>
              <span className="text-[11px] text-zinc-400 hidden sm:inline">
                {m.step1Desc}
              </span>
            </div>

            {/* Source Selection Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {/* Tab Audio Button */}
              <button
                type="button"
                onClick={() => handleStartCaptureWithSource('tab')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2 active:scale-98 ${
                  isCapturing && currentSelectedSource === 'tab'
                    ? 'bg-white/10 border-white/30 shadow-[0_0_20px_rgba(255,255,255,0.2)]'
                    : 'bg-black/40 border-white/10 hover:border-white/25 hover:bg-white/5'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2">
                    <Radio className={`w-4 h-4 ${isCapturing && currentSelectedSource === 'tab' ? 'text-white' : 'text-zinc-300'}`} />
                    <span className="font-mono text-xs font-bold text-white">{m.btnTab}</span>
                  </div>
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-white/10 text-white border border-white/20">
                    REC
                  </span>
                </div>
                <div className="text-[10px] text-zinc-400">
                  {m.btnTabSub}
                </div>
              </button>

              {/* Microphone Button */}
              <button
                type="button"
                onClick={() => handleStartCaptureWithSource('mic')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2 active:scale-98 ${
                  isCapturing && currentSelectedSource === 'mic'
                    ? 'bg-cyan-500/15 border-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.25)]'
                    : 'bg-black/40 border-white/10 hover:border-white/25 hover:bg-white/5'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2">
                    <Mic className={`w-4 h-4 ${isCapturing && currentSelectedSource === 'mic' ? 'text-cyan-400' : 'text-zinc-300'}`} />
                    <span className="font-mono text-xs font-bold text-white">{m.btnMic}</span>
                  </div>
                </div>
                <div className="text-[10px] text-zinc-400">
                  {m.btnMicSub}
                </div>
              </button>

              {/* YouTube Demo Test */}
              <button
                type="button"
                onClick={handleAutomatedYoutubeTest}
                className="p-3 rounded-xl border border-white/10 bg-black/40 hover:bg-white/5 hover:border-amber-400/40 text-left transition-all cursor-pointer flex flex-col justify-between gap-2 active:scale-98"
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2">
                    <MonitorPlay className="w-4 h-4 text-amber-400" />
                    <span className="font-mono text-xs font-bold text-white">{m.btnYt}</span>
                  </div>
                </div>
                <div className="text-[10px] text-zinc-400">
                  {m.btnYtSub}
                </div>
              </button>
            </div>

            {/* Dynamic Status / Alert Bar */}
            <div className="mt-3 pt-3 border-t border-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs text-amber-300">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                <span className="text-[11px] leading-tight">{m.tabAudioAlert}</span>
              </div>

              {isCapturing && (
                <button
                  type="button"
                  onClick={onStopCapture}
                  className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-mono text-[11px] font-bold flex items-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer shrink-0"
                >
                  <Square className="w-3 h-3 fill-white" />
                  <span>{m.btnStop}</span>
                </button>
              )}
            </div>
          </div>

          {/* STEP 2: Voice Audio Test (All 10 Languages) */}
          <div className="mb-5 p-4 rounded-2xl bg-zinc-900/60 border border-white/10">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md bg-white text-black font-mono text-xs font-black">
                  02
                </span>
                <h3 className="text-sm font-bold text-white font-sans">
                  {m.step2Title}
                </h3>
              </div>
              <span className="text-[11px] text-zinc-400 hidden sm:inline">
                {m.step2Desc}
              </span>
            </div>

            {/* Test Phrase Preview Card */}
            <div className="p-3 rounded-xl bg-black/60 border border-white/10 mb-3 relative overflow-hidden">
              <div className="flex items-center justify-between mb-1.5 text-[10px] font-mono text-zinc-400">
                <span className="uppercase tracking-wider flex items-center gap-1">
                  <span>{activeVoiceMeta.flag}</span>
                  <span>{activeVoiceMeta.nativeName} ({activeVoiceLang.toUpperCase()})</span>
                </span>
                {isPlayingVoice && (
                  <span className="text-white flex items-center gap-1 font-bold animate-pulse">
                    <span className="w-1.5 h-1.5 rounded-full bg-white" />
                    {m.voicePlaying}
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-200 italic font-sans leading-relaxed">
                «{currentTestText}»
              </p>
            </div>

            {/* Voice Controls & Language Chips */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              {/* Play / Stop Voice Button */}
              {isPlayingVoice ? (
                <button
                  type="button"
                  onClick={handleStopVoice}
                  className="py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-mono text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(245,158,11,0.3)] active:scale-95 cursor-pointer shrink-0"
                >
                  <Square className="w-3.5 h-3.5 fill-black" />
                  <span>{m.stopVoice}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handlePlayVoice(activeVoiceLang)}
                  className="py-2.5 px-4 rounded-xl bg-white hover:bg-white text-black font-mono text-xs font-black flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(255,255,255,0.3)] active:scale-95 cursor-pointer shrink-0"
                >
                  <Play className="w-3.5 h-3.5 fill-black" />
                  <span>{m.playLocal} ({activeVoiceMeta.flag} {activeVoiceLang.toUpperCase()})</span>
                </button>
              )}

              {/* 10-Language Quick-Test Selector Chips */}
              <div className="flex items-center gap-1 overflow-x-auto py-1 scrollbar-none">
                {SUPPORTED_LOCALES.map((loc) => {
                  const meta = LOCALE_META[loc];
                  const isCurrent = activeVoiceLang === loc;
                  return (
                    <button
                      key={loc}
                      type="button"
                      onClick={() => {
                        setActiveVoiceLang(loc);
                        handlePlayVoice(loc);
                      }}
                      className={`px-2 py-1 rounded-lg text-[10px] font-mono font-bold flex items-center gap-1 transition-all cursor-pointer shrink-0 ${
                        isCurrent
                          ? 'bg-white text-black shadow-sm ring-1 ring-white/50'
                          : 'bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/5'
                      }`}
                      title={`Play test in ${meta.nativeName}`}
                    >
                      <span>{meta.flag}</span>
                      <span className="uppercase">{loc}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* STEP 3: Signal & Transcript Verification */}
          <div className="mb-5 p-4 rounded-2xl bg-zinc-900/60 border border-white/10">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md bg-white text-black font-mono text-xs font-black">
                  03
                </span>
                <h3 className="text-sm font-bold text-white font-sans">
                  {m.step3Title}
                </h3>
              </div>
              <span className="text-[11px] text-zinc-400 hidden sm:inline">
                {m.step3Desc}
              </span>
            </div>

            {/* Diagnostic 3-Checklist */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3">
              {/* Check 1: Source */}
              <div className={`p-2.5 rounded-xl border flex items-center gap-2 text-xs font-mono transition-all ${
                isCapturing
                  ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-400'
                  : 'bg-black/30 border-white/5 text-zinc-500'
              }`}>
                <CheckCircle2 className={`w-4 h-4 shrink-0 ${isCapturing ? 'text-emerald-400' : 'text-zinc-600'}`} />
                <span className="truncate">{m.checkSource}</span>
              </div>

              {/* Check 2: Audio Signal */}
              <div className={`p-2.5 rounded-xl border flex items-center gap-2 text-xs font-mono transition-all ${
                hasDetectedAudio
                  ? 'bg-white/10 border-white/30 text-white'
                  : 'bg-black/30 border-white/5 text-zinc-500'
              }`}>
                <CheckCircle2 className={`w-4 h-4 shrink-0 ${hasDetectedAudio ? 'text-white' : 'text-zinc-600'}`} />
                <span className="truncate">{m.checkVolume} ({liveVolume}%)</span>
              </div>

              {/* Check 3: STT Verified */}
              <div className={`p-2.5 rounded-xl border flex items-center gap-2 text-xs font-mono transition-all ${
                hasDetectedSpeech
                  ? 'bg-cyan-950/30 border-cyan-400/40 text-cyan-300'
                  : 'bg-black/30 border-white/5 text-zinc-500'
              }`}>
                <CheckCircle2 className={`w-4 h-4 shrink-0 ${hasDetectedSpeech ? 'text-cyan-300' : 'text-zinc-600'}`} />
                <span className="truncate">{m.checkSTT}</span>
              </div>
            </div>

            {/* Fluid Waveform Display */}
            <div className="p-3 rounded-xl bg-black/70 border border-white/10 mb-3">
              <div className="flex items-center justify-between text-xs font-mono text-zinc-400 mb-2">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${
                    isCapturing
                      ? liveVolume > 4
                        ? 'bg-white animate-ping'
                        : 'bg-emerald-400 animate-pulse'
                      : 'bg-zinc-700'
                  }`} />
                  <span className="font-semibold text-zinc-200">
                    {isCapturing ? m.listening : m.waiting}
                  </span>
                </div>
                <span className="font-mono font-bold text-zinc-400">{liveVolume}% RMS</span>
              </div>

              <div className="w-full h-14 bg-zinc-950/90 rounded-lg border border-white/5 flex items-center justify-center overflow-hidden">
                <FluidAudioWaveform isCapturing={isCapturing} width={580} height={46} />
              </div>

              {/* Minimalist Audio-Wave Level Bar with Cubic-Bezier leveling and pure-white/titanium glow */}
              <div className="mt-2.5 h-1.5 w-full bg-white/[0.04] rounded-full overflow-hidden border border-white/[0.06]">
                <div
                  className="h-full bg-gradient-to-r from-zinc-400 via-white to-zinc-200 shadow-[0_0_12px_rgba(255,255,255,0.7)] transition-all"
                  style={{
                    width: `${Math.min(100, Math.max(0, liveVolume))}%`,
                    transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)',
                    transitionDuration: '150ms',
                  }}
                />
              </div>
            </div>

            {/* Live Transcript Box */}
            <div className={`p-3 rounded-xl border transition-all ${
              liveTranscript
                ? 'bg-white/10 border-white/20 text-white'
                : 'bg-black/40 border-white/5 text-zinc-500'
            }`}>
              <div className="text-[10px] font-mono uppercase tracking-wider mb-1 flex items-center justify-between">
                <span>{m.sttLabel}</span>
                {hasDetectedSpeech && (
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    {m.speechSuccess}
                  </span>
                )}
              </div>
              <div className="text-xs font-mono min-h-[22px] flex items-center">
                {liveTranscript ? (
                  <span>«<ScrambleText text={liveTranscript} speed={10} scrambleDuration={180} />»</span>
                ) : (
                  <span className="italic">{m.transcriptionPlaceholder}</span>
                )}
              </div>

              {candidateLiveTranscript && (
                <div className="mt-2 pt-2 border-t border-white/10 flex items-center justify-between text-[11px] font-mono text-cyan-300">
                  <span className="flex items-center gap-1 text-cyan-400 font-bold shrink-0">
                    <Mic className="w-3 h-3 text-cyan-400 animate-pulse" />
                    <span>Мікрофон (Ви):</span>
                  </span>
                  <span className="truncate italic">«{candidateLiveTranscript}»</span>
                </div>
              )}
            </div>
          </div>

          {/* Cross-OS Quick Compatibility Guide */}
          <div className="p-3.5 rounded-2xl bg-zinc-900/40 border border-white/5 text-[11px] text-zinc-400 mb-5">
            <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-zinc-300 mb-2">
              <Info className="w-3.5 h-3.5 text-sky-400 shrink-0" />
              <span>{m.guideTitle}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 border-t border-white/5 text-[10px]">
              <div>
                <span className="font-semibold text-zinc-300">🪟 Windows:</span> {m.winDesc}
              </div>
              <div>
                <span className="font-semibold text-zinc-300">🍎 macOS:</span> {m.macDesc}
              </div>
              <div>
                <span className="font-semibold text-zinc-300">🐧 Linux:</span> {m.linuxDesc}
              </div>
            </div>
          </div>

          {/* Modal Footer Controls */}
          <div className="flex items-center justify-between gap-3 pt-3 border-t border-white/10">
            <div className="text-xs font-mono text-zinc-400 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-white" />
              <span>{currentMeta.flag} {currentMeta.nativeName}</span>
            </div>

            <button
              type="button"
              onClick={onClose}
              className={`py-2.5 px-6 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer flex items-center gap-2 border active:scale-95 ${
                hasDetectedSpeech
                  ? 'bg-white text-black border-white/30 hover:bg-white shadow-[0_0_20px_rgba(255,255,255,0.3)]'
                  : 'bg-white/10 hover:bg-white/20 text-white border-white/10'
              }`}
            >
              <span>{hasDetectedSpeech ? m.ready : m.close}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
