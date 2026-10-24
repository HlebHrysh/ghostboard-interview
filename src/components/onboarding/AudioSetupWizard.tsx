'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Mic, 
  MonitorPlay, 
  Smartphone, 
  ArrowRight, 
  CheckCircle2, 
  Volume2,
  X,
  Play,
  Square
} from 'lucide-react';
import { useLocale } from '@/contexts/LocaleContext';
import { getOnboardingTranslations } from '@/lib/onboardingI18n';
import type { SupportedLocale } from '@/lib/geoLang';

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

interface AudioSetupWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  isCapturing: boolean;
  liveVolume: number;
  liveTranscript: string;
  onStartCapture: (source: 'mic' | 'tab') => void;
  onStopCapture: () => void;
}

export const AudioSetupWizard: React.FC<AudioSetupWizardProps> = ({
  isOpen,
  onClose,
  onComplete,
  isCapturing,
  liveVolume,
  liveTranscript,
  onStartCapture,
  onStopCapture,
}) => {
  const { locale } = useLocale();
  const m = getOnboardingTranslations(locale);
  
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [environment, setEnvironment] = useState<'browser' | 'app' | 'phone' | null>(null);
  
  const [isPlayingTest, setIsPlayingTest] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [hasDetectedAudio, setHasDetectedAudio] = useState(false);
  
  useEffect(() => {
    if (isCapturing && liveVolume > 5) {
      setHasDetectedAudio(true);
    }
  }, [liveVolume, isCapturing]);

  // Clean up audio on unmount or close
  useEffect(() => {
    if (!isOpen) {
      handleStopTest();
      setStep(1);
      setEnvironment(null);
      setHasDetectedAudio(false);
    }
    return () => handleStopTest();
  }, [isOpen]);

  const handleStopTest = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setIsPlayingTest(false);
  };

  const handlePlayTest = () => {
    handleStopTest();
    setIsPlayingTest(true);
    
    // Play a generic test phrase in the current locale via TTS
    const textToSay = locale === 'ua' ? 'Як працює збирач сміття?' : 'Can you explain how this works?';
    const ttsLang = (TTS_LANG_MAP as Record<string, string>)[locale] || 'en';
    const audioUrl = `/api/audio/tts?lang=${ttsLang}&text=${encodeURIComponent(textToSay)}`;
    
    const audio = new Audio(audioUrl);
    audioRef.current = audio;
    
    audio.onended = () => setIsPlayingTest(false);
    audio.onerror = () => setIsPlayingTest(false);
    
    audio.play().catch(() => setIsPlayingTest(false));
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/90 backdrop-blur-md"
        />

        {/* Modal */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          className="relative w-full max-w-2xl bg-zinc-950 border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="p-6 border-b border-white/10 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Volume2 className="w-5 h-5 text-zinc-300" />
                {m.title}
              </h2>
              <p className="text-sm text-zinc-400 mt-1">{m.subtitle}</p>
            </div>
            <button 
              onClick={onClose}
              className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content Area */}
          <div className="p-6 min-h-[300px]">
            <AnimatePresence mode="wait">
              {step === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-4"
                >
                  <h3 className="text-lg font-semibold text-white mb-4">{m.step1Title}</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <button
                      onClick={() => { setEnvironment('browser'); setStep(2); }}
                      className="p-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-left transition-colors flex flex-col items-center gap-3 text-center"
                    >
                      <MonitorPlay className="w-8 h-8 text-cyan-400" />
                      <span className="text-sm font-semibold text-white">{m.step1Browser}</span>
                    </button>
                    <button
                      onClick={() => { setEnvironment('app'); setStep(2); }}
                      className="p-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-left transition-colors flex flex-col items-center gap-3 text-center"
                    >
                      <MonitorPlay className="w-8 h-8 text-amber-400" />
                      <span className="text-sm font-semibold text-white">{m.step1App}</span>
                    </button>
                    <button
                      onClick={() => { setEnvironment('phone'); setStep(2); }}
                      className="p-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-left transition-colors flex flex-col items-center gap-3 text-center"
                    >
                      <Smartphone className="w-8 h-8 text-emerald-400" />
                      <span className="text-sm font-semibold text-white">{m.step1Phone}</span>
                    </button>
                  </div>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <h3 className="text-lg font-semibold text-white">{m.step2Title}</h3>
                  <div className="p-4 rounded-xl bg-white/[0.04] border border-white/15 text-zinc-200 text-sm">
                    {environment === 'browser' ? m.step2InstructionBrowser : m.step2InstructionApp}
                  </div>
                  
                  <div className="flex justify-between items-center pt-4">
                    <button onClick={() => setStep(1)} className="text-zinc-400 text-sm hover:text-white">
                      Back
                    </button>
                    <button 
                      onClick={() => setStep(3)}
                      className="px-6 py-2 rounded-lg bg-white text-black font-bold text-sm hover:bg-zinc-200"
                    >
                      Continue
                    </button>
                  </div>
                </motion.div>
              )}

              {step === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <h3 className="text-lg font-semibold text-white">{m.step3Title}</h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    {/* Control Panel */}
                    <div className="p-4 rounded-xl border border-white/10 bg-white/5 space-y-4">
                      {!isCapturing ? (
                        <button
                          onClick={() => onStartCapture(environment === 'browser' ? 'tab' : 'mic')}
                          className="w-full py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white font-bold flex justify-center items-center gap-2"
                        >
                          <Mic className="w-4 h-4" /> Start Capturing
                        </button>
                      ) : (
                        <button
                          onClick={onStopCapture}
                          className="w-full py-2.5 rounded-lg bg-rose-500 hover:bg-rose-400 text-white font-bold flex justify-center items-center gap-2"
                        >
                          <Square className="w-4 h-4" /> Stop Capturing
                        </button>
                      )}

                      <button
                        onClick={handlePlayTest}
                        disabled={isPlayingTest}
                        className="w-full py-2.5 rounded-lg bg-white hover:bg-white text-black font-bold flex justify-center items-center gap-2 disabled:opacity-50"
                      >
                        <Play className="w-4 h-4" /> {isPlayingTest ? m.testingBtn : m.testBtn}
                      </button>
                    </div>

                    {/* Status Panel */}
                    <div className="p-4 rounded-xl border border-white/10 bg-black/40 flex flex-col justify-center items-center gap-3">
                      <div className="text-sm font-mono text-zinc-400">Signal Level</div>
                      <div className="text-3xl font-black font-mono text-white">
                        {liveVolume}%
                      </div>
                      
                      {hasDetectedAudio && (
                        <div className="text-emerald-400 text-sm font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-4 h-4" /> {m.successTitle}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-4">
                    <button onClick={onComplete} className="text-zinc-500 text-sm hover:text-white">
                      {m.skipBtn}
                    </button>
                    <button 
                      onClick={() => {
                        onComplete();
                        onClose();
                      }}
                      className="px-6 py-2 rounded-lg bg-white text-black font-bold text-sm hover:bg-zinc-200 flex items-center gap-2"
                    >
                      {m.startBtn} <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
