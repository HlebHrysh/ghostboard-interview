'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import {
  Zap,
  Mic,
  MicOff,
  Activity,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Keyboard,
  ArrowRight,
  ShieldCheck,
  Radio,
  Volume2,
  Sparkles,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface HealthData {
  ok: boolean;
  status: string;
  aiConfigured: boolean;
  sttConfigured: boolean;
  redisConfigured: boolean;
  timestamp: number;
  uptimeSeconds?: number;
  services?: {
    geminiAi: string;
    deepgramStt: string;
    storage: string;
  };
}

interface PreFlightDiagnosticWidgetProps {
  locale: string;
}

export function PreFlightDiagnosticWidget({ locale }: PreFlightDiagnosticWidgetProps) {
  const isUa = locale === 'ua';

  const [isRunningCheck, setIsRunningCheck] = useState(false);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [healthData, setHealthData] = useState<HealthData | null>(null);
  const [healthError, setHealthError] = useState<string | null>(null);

  // Audio mic test state
  const [micStatus, setMicStatus] = useState<'idle' | 'requesting' | 'active' | 'denied' | 'error'>('idle');
  const [micDeviceName, setMicDeviceName] = useState<string>('');
  const [audioVolume, setAudioVolume] = useState<number>(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Hotkey Trainer state
  const [pressedKey, setPressedKey] = useState<string | null>(null);
  const [testedKeys, setTestedKeys] = useState<Record<string, boolean>>({
    '1': false,
    '2': false,
    Space: false,
  });

  // Cleanup audio tracks and context
  const cleanupAudio = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    setAudioVolume(0);
  }, []);

  useEffect(() => {
    return () => {
      cleanupAudio();
    };
  }, [cleanupAudio]);

  // Run Latency & Health check
  const runHealthCheck = async () => {
    setHealthError(null);
    const start = performance.now();
    try {
      const res = await fetch('/api/health', { cache: 'no-store' });
      const elapsed = Math.round(performance.now() - start);
      setLatencyMs(elapsed);
      const data = await res.json();
      setHealthData(data);
    } catch (err: unknown) {
      const elapsed = Math.round(performance.now() - start);
      setLatencyMs(elapsed);
      setHealthError((err as Error)?.message || 'Failed to reach /api/health');
    }
  };

  // Run Microphone Permission & Level test
  const runMicCheck = async () => {
    cleanupAudio();
    setMicStatus('requesting');
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setMicStatus('error');
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      mediaStreamRef.current = stream;
      const audioTrack = stream.getAudioTracks()[0];
      setMicDeviceName(audioTrack?.label || (isUa ? 'Вбудований мікрофон' : 'Default Microphone'));

      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      audioContextRef.current = ctx;

      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);

      const buffer = new Uint8Array(analyser.frequencyBinCount);

      const updateMeter = () => {
        analyser.getByteFrequencyData(buffer);
        let sum = 0;
        for (let i = 0; i < buffer.length; i++) {
          sum += buffer[i];
        }
        const avg = sum / buffer.length;
        // Normalize 0..100
        const norm = Math.min(100, Math.round((avg / 128) * 100));
        setAudioVolume(norm);
        animationFrameRef.current = requestAnimationFrame(updateMeter);
      };
      updateMeter();

      setMicStatus('active');
    } catch (err: unknown) {
      const errorName = (err as { name?: string })?.name;
      if (errorName === 'NotAllowedError' || errorName === 'PermissionDeniedError') {
        setMicStatus('denied');
      } else {
        setMicStatus('error');
      }
    }
  };

  // Run Full 10-Second Check
  const handleRunFullCheck = async () => {
    setIsRunningCheck(true);
    await Promise.all([runHealthCheck(), runMicCheck()]);
    setIsRunningCheck(false);
  };

  // Global hotkey trainer listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in form controls
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || (e.target as HTMLElement)?.isContentEditable) {
        return;
      }

      if (e.key === '1' || e.key === '2' || e.code === 'Space') {
        const keyName = e.code === 'Space' ? 'Space' : e.key;
        if (e.code === 'Space') {
          e.preventDefault(); // prevent scroll
        }
        setPressedKey(keyName);
        setTestedKeys((prev) => ({ ...prev, [keyName]: true }));

        setTimeout(() => {
          setPressedKey((cur) => (cur === keyName ? null : cur));
        }, 400);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const allKeysTested = testedKeys['1'] && testedKeys['2'] && testedKeys['Space'];
  const isHealthy = Boolean(healthData && (healthData.ok || healthData.status === 'healthy'));

  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/15 bg-gradient-to-br from-zinc-950 via-[#0d0f15] to-zinc-900/90 p-6 sm:p-8 shadow-2xl backdrop-blur-2xl">
      {/* Background ambient mesh glow */}
      <div className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-cyan-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-violet-500/10 blur-3xl" />

      {/* Header bar */}
      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/10">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-cyan-400 font-mono text-[11px] font-bold tracking-wider uppercase">
            <Zap className="w-3.5 h-3.5 fill-cyan-400" />
            <span>{isUa ? '⚡ Інтерактивна діагностика' : '⚡ Live Diagnostic Pre-Flight'}</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <span>{isUa ? 'Перевірка готовності за 10 секунд' : '10-Second Pre-Call Check'}</span>
          </h2>
          <p className="text-xs text-zinc-400 leading-relaxed max-w-xl">
            {isUa
              ? 'Протестуйте пінг до серверів ШІ, активність мікрофона браузера та реакцію гарячих клавіш перед дзвінком.'
              : 'Verify AI stream ping latency, browser microphone clarity, and muscle-memory hotkeys before joining.'}
          </p>
        </div>

        <button
          type="button"
          onClick={handleRunFullCheck}
          disabled={isRunningCheck}
          className="relative inline-flex items-center justify-center gap-2.5 px-6 py-3 rounded-2xl bg-white hover:bg-zinc-100 text-black font-mono font-bold text-xs shadow-[0_0_25px_rgba(255,255,255,0.25)] transition-all cursor-pointer active:scale-95 disabled:opacity-50 shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRunningCheck ? 'animate-spin' : ''}`} />
          <span>
            {isRunningCheck
              ? (isUa ? 'Виконується перевірка...' : 'Testing...')
              : (isUa ? 'Запустити тест за 1 клік' : 'Run 1-Click Test')}
          </span>
        </button>
      </div>

      {/* 3 Core Interactive Diagnostic Panels */}
      <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-4 pt-6">
        {/* Panel 1: Server Latency & AI Health */}
        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-white/20 transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-cyan-400" />
                {isUa ? 'Сервер & Затримка' : 'Server & Latency'}
              </span>
              {latencyMs !== null && (
                <span
                  className={`text-xs font-mono font-black px-2 py-0.5 rounded-full border ${
                    latencyMs < 90
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      : latencyMs < 250
                      ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                      : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                  }`}
                >
                  {latencyMs} ms
                </span>
              )}
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between text-zinc-300">
                <span className="text-zinc-400 font-mono text-[11px]">API Health:</span>
                <span className="font-mono font-semibold">
                  {healthData ? (
                    isHealthy ? (
                      <span className="text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Ready (200)
                      </span>
                    ) : (
                      <span className="text-amber-400 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> Degraded
                      </span>
                    )
                  ) : healthError ? (
                    <span className="text-rose-400">{healthError}</span>
                  ) : (
                    <span className="text-zinc-500">—</span>
                  )}
                </span>
              </div>

              <div className="flex items-center justify-between text-zinc-300">
                <span className="text-zinc-400 font-mono text-[11px]">Gemini 2.5/3 AI:</span>
                <span className="font-mono text-xs">
                  {healthData?.aiConfigured ? (
                    <span className="text-emerald-400">Підключено</span>
                  ) : healthData ? (
                    <span className="text-zinc-400">Ключ з середовища</span>
                  ) : (
                    <span className="text-zinc-500">—</span>
                  )}
                </span>
              </div>

              <div className="flex items-center justify-between text-zinc-300">
                <span className="text-zinc-400 font-mono text-[11px]">Deepgram Nova-3:</span>
                <span className="font-mono text-xs">
                  {healthData?.sttConfigured ? (
                    <span className="text-emerald-400">16kHz STT Ready</span>
                  ) : healthData ? (
                    <span className="text-zinc-400">Bridge Active</span>
                  ) : (
                    <span className="text-zinc-500">—</span>
                  )}
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={runHealthCheck}
            className="mt-4 w-full py-1.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white font-mono text-[11px] transition-colors border border-white/5 flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <span>{isUa ? 'Перевірити пінг знову' : 'Ping Again'}</span>
          </button>
        </div>

        {/* Panel 2: Live Microphone Activity Meter */}
        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-white/20 transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                <Mic className="w-3.5 h-3.5 text-rose-400" />
                {isUa ? 'Мікрофон браузера' : 'Microphone Stream'}
              </span>
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                  micStatus === 'active'
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 animate-pulse'
                    : micStatus === 'denied'
                    ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                    : micStatus === 'requesting'
                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                    : 'bg-white/5 text-zinc-400 border-white/10'
                }`}
              >
                {micStatus === 'active'
                  ? (isUa ? 'Активний' : 'Active')
                  : micStatus === 'denied'
                  ? (isUa ? 'Заблоковано' : 'Denied')
                  : micStatus === 'requesting'
                  ? (isUa ? 'Запит...' : 'Asking...')
                  : (isUa ? 'Очікує' : 'Standby')}
              </span>
            </div>

            {micStatus === 'active' ? (
              <div className="space-y-2.5">
                <div className="text-[11px] font-mono text-zinc-300 truncate" title={micDeviceName}>
                  🎤 {micDeviceName}
                </div>

                {/* Real-time Decibel / Volume Bar */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] font-mono text-zinc-400">
                    <span>{isUa ? 'Рівень вхідного сигналу:' : 'Input Volume:'}</span>
                    <span className="text-white font-bold">{audioVolume}%</span>
                  </div>
                  <div className="w-full h-3 rounded-full bg-zinc-900 border border-white/10 overflow-hidden p-0.5">
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-cyan-400 to-violet-500"
                      style={{ width: `${Math.max(4, audioVolume)}%` }}
                      transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                    />
                  </div>
                </div>

                <p className="text-[10px] text-zinc-400 leading-tight">
                  {audioVolume > 15
                    ? (isUa ? '✅ Голос чітко розпізнається! Аудіопотік стабільний.' : '✅ Voice clearly detected! Stream stable.')
                    : (isUa ? 'Говоріть у мікрофон, щоб побачити амплітуду.' : 'Speak into your mic to test levels.')}
                </p>
              </div>
            ) : micStatus === 'denied' ? (
              <div className="space-y-2 text-xs text-rose-300">
                <p>{isUa ? 'Доступ до мікрофона заблоковано в браузері.' : 'Microphone permission blocked in browser.'}</p>
                <p className="text-[10px] text-zinc-400">
                  {isUa
                    ? 'Натисніть на іконку замка в адресному рядку браузера та увімкніть мікрофон.'
                    : 'Click the lock icon in your URL bar and allow microphone permissions.'}
                </p>
              </div>
            ) : (
              <div className="space-y-2 text-xs text-zinc-400">
                <p>
                  {isUa
                    ? 'Перевірте роботу мікрофона, щоб гарантувати точне розпізнавання питань інтервʼюера.'
                    : 'Test your mic to guarantee accurate speech recognition during live calls.'}
                </p>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={micStatus === 'active' ? cleanupAudio : runMicCheck}
            className="mt-4 w-full py-1.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white font-mono text-[11px] transition-colors border border-white/5 flex items-center justify-center gap-1.5 cursor-pointer"
          >
            {micStatus === 'active' ? (
              <>
                <MicOff className="w-3 h-3 text-rose-400" />
                <span>{isUa ? 'Зупинити мікрофон' : 'Stop Mic'}</span>
              </>
            ) : (
              <>
                <Mic className="w-3 h-3 text-emerald-400" />
                <span>{isUa ? 'Увімкнути мікрофон' : 'Test Microphone'}</span>
              </>
            )}
          </button>
        </div>

        {/* Panel 3: Interactive Hotkey Trainer */}
        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-white/20 transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                <Keyboard className="w-3.5 h-3.5 text-violet-400" />
                {isUa ? 'Тренажер гарячих клавіш' : 'Hotkey Muscle Trainer'}
              </span>
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                  allKeysTested
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    : 'bg-white/5 text-zinc-400 border-white/10'
                }`}
              >
                {allKeysTested
                  ? (isUa ? '3 з 3 засвоєно' : '3/3 Practiced')
                  : (isUa ? 'Натисніть клавіші' : 'Press keys')}
              </span>
            </div>

            <p className="text-[11px] text-zinc-400 mb-3">
              {isUa
                ? 'Натисніть клавіші на клавіатурі прямо зараз, щоб випробувати перемикання HUD:'
                : 'Press these keys on your physical keyboard to practice HUD controls:'}
            </p>

            <div className="grid grid-cols-3 gap-2">
              {/* Key 1 */}
              <button
                type="button"
                onClick={() => {
                  setPressedKey('1');
                  setTestedKeys((p) => ({ ...p, '1': true }));
                  setTimeout(() => setPressedKey((c) => (c === '1' ? null : c)), 300);
                }}
                className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                  pressedKey === '1'
                    ? 'scale-95 bg-white text-black border-white shadow-[0_0_15px_rgba(255,255,255,0.4)]'
                    : testedKeys['1']
                    ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300'
                    : 'bg-white/5 border-white/10 text-zinc-300 hover:border-white/20'
                }`}
              >
                <div className="font-mono text-sm font-black">1</div>
                <div className="text-[9px] font-mono text-zinc-400 mt-0.5 leading-tight">
                  {isUa ? 'Стелс HUD' : 'Stealth'}
                </div>
              </button>

              {/* Key 2 */}
              <button
                type="button"
                onClick={() => {
                  setPressedKey('2');
                  setTestedKeys((p) => ({ ...p, '2': true }));
                  setTimeout(() => setPressedKey((c) => (c === '2' ? null : c)), 300);
                }}
                className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                  pressedKey === '2'
                    ? 'scale-95 bg-white text-black border-white shadow-[0_0_15px_rgba(255,255,255,0.4)]'
                    : testedKeys['2']
                    ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300'
                    : 'bg-white/5 border-white/10 text-zinc-300 hover:border-white/20'
                }`}
              >
                <div className="font-mono text-sm font-black">2</div>
                <div className="text-[9px] font-mono text-zinc-400 mt-0.5 leading-tight">
                  {isUa ? 'Пауза HUD' : 'Freeze'}
                </div>
              </button>

              {/* Space */}
              <button
                type="button"
                onClick={() => {
                  setPressedKey('Space');
                  setTestedKeys((p) => ({ ...p, Space: true }));
                  setTimeout(() => setPressedKey((c) => (c === 'Space' ? null : c)), 300);
                }}
                className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                  pressedKey === 'Space'
                    ? 'scale-95 bg-white text-black border-white shadow-[0_0_15px_rgba(255,255,255,0.4)]'
                    : testedKeys['Space']
                    ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300'
                    : 'bg-white/5 border-white/10 text-zinc-300 hover:border-white/20'
                }`}
              >
                <div className="font-mono text-sm font-black">Space</div>
                <div className="text-[9px] font-mono text-zinc-400 mt-0.5 leading-tight">
                  {isUa ? 'Голос' : 'Voice'}
                </div>
              </button>
            </div>
          </div>

          <div className="mt-3 text-[10px] font-mono text-zinc-500 text-center">
            {isUa ? 'Працює без перехоплення фокусу в інпутах' : 'Works globally during active interviews'}
          </div>
        </div>
      </div>

      {/* Footer Call to Action Strip */}
      <div className="relative z-10 mt-6 pt-4 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-zinc-400">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>
            {isUa
              ? 'Ghostboard Stealth Bridge гарантує нульову видимість для Zoom / Google Meet.'
              : 'Ghostboard Stealth Bridge guarantees zero screen share footprint on Zoom/Meet.'}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/mock-interview"
            className="inline-flex items-center gap-1.5 text-zinc-300 hover:text-white font-mono transition-colors"
          >
            <span>{isUa ? 'Тренувати арену' : 'Practice Arena'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
          <Link
            href="/interview"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-zinc-200 text-black font-mono font-bold transition-all shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5 fill-black" />
            <span>{isUa ? 'Увійти в Copilot' : 'Enter Copilot'}</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
