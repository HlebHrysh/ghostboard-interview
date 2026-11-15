import React, { memo, useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  Camera,
  Columns2,
  Crosshair,
  GitMerge,
  Languages,
  Loader2,
  Maximize2,
  Mic,
  MicOff,
  Minus,
  MousePointer,
  PanelLeftClose,
  Pause,
  Plus,
  RefreshCw,
  Settings,
  Shield,
  Sparkles,
  X,
  Zap,
} from 'lucide-react';
import type { SttStatus } from '../hooks/useCopilotSession';
import { LISTEN_MODE_META, LISTEN_MODE_ORDER, startListening } from '../lib/audioSession';
import {
  FONT_RANGE,
  OPACITY_RANGE,
  type DesktopSettings,
  type HintLanguage,
} from '../lib/desktopSettings';
import type { AnswerEntry } from '../lib/session';
import { VuBars } from '../ui/VuMeter';

export interface TopIslandProps {
  settings: DesktopSettings;
  updateSettings: (patch: Partial<DesktopSettings>) => void;
  layoutMode: 'chat' | 'top_bar';
  onToggleLayout: () => void;
  focusMode?: boolean;
  onToggleFocusMode?: () => void;
  isStreaming: boolean;
  activeAnswer: AnswerEntry | null;
  isPaused: boolean;
  onTogglePause: () => void;
  queuedCount?: number;
  stt?: SttStatus;
  onRestartAudio?: () => void;
  isClickThrough: boolean;
  onToggleClickThrough: () => void;
  onScreenshot: () => void;
  isScreenBusy: boolean;
  onPanic: () => void;
  onReturnToOffice: () => void;
  onClose: () => void;
  isBridgeActive?: boolean;
  onTriggerBridge?: () => void;
  isAudioActive?: boolean;
  onToggleAudio?: () => void;
}

const HINT_LANG_LABELS: Record<HintLanguage, string> = {
  auto: 'Авто',
  uk: 'Українська',
  en: 'English',
  bilingual_uk: 'Білінгв (EN + UA)',
  bilingual_ru: 'Білінгв (EN + RU)',
  ru: 'Русский',
  pl: 'Polski',
  de: 'Deutsch',
  es: 'Español',
  fr: 'Français',
};

const HINT_LANG_CYCLE: HintLanguage[] = ['auto', 'uk', 'en', 'bilingual_uk', 'ru'];

export const TopIsland = memo(function TopIsland({
  settings,
  updateSettings,
  layoutMode,
  onToggleLayout,
  focusMode = false,
  onToggleFocusMode,
  isStreaming,
  activeAnswer,
  isPaused,
  onTogglePause,
  queuedCount = 0,
  stt,
  onRestartAudio,
  isClickThrough,
  onToggleClickThrough,
  onScreenshot,
  isScreenBusy,
  onPanic,
  onReturnToOffice,
  onClose,
  isAudioActive = true,
  onToggleAudio,
}: TopIslandProps) {
  const [optionsOpen, setOptionsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!optionsOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setOptionsOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOptionsOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [optionsOpen]);

  const stopDragMouse = (e: React.MouseEvent) => e.stopPropagation();

  const cycleListenMode = () => {
    const idx = LISTEN_MODE_ORDER.indexOf(settings.listenMode);
    const nextMode = LISTEN_MODE_ORDER[(idx + 1) % LISTEN_MODE_ORDER.length];
    const nextSettings = { ...settings, listenMode: nextMode };
    updateSettings({ listenMode: nextMode });
    if (isAudioActive) {
      void startListening(nextSettings, nextMode);
    }
  };

  const cycleLanguage = () => {
    const idx = HINT_LANG_CYCLE.indexOf(settings.hintLanguage);
    const next = HINT_LANG_CYCLE[(idx + 1) % HINT_LANG_CYCLE.length];
    updateSettings({ hintLanguage: next });
  };

  const stepFont = (delta: number) => {
    const next = Math.min(FONT_RANGE.max, Math.max(FONT_RANGE.min, (settings.hudFontSize || 16) + delta));
    updateSettings({ hudFontSize: next });
  };

  const listenMeta = LISTEN_MODE_META[settings.listenMode];
  const ttftMs = activeAnswer?.ttftMs;
  const sttProblem = stt?.status === 'reconnecting' || stt?.status === 'failed';

  return (
    <header
      data-tauri-drag-region="true"
      className="h-[38px] min-h-[38px] w-full px-2.5 flex items-center justify-between gap-2 rounded-t-xl border border-white/[0.08] bg-[#09090b]/95 select-none relative z-40 cursor-grab active:cursor-grabbing shadow-[inset_0_1px_0_0_rgba(255,255,255,0.12)]"
    >
      {/* NODE 1 (Left): Return to Office + 1-click Audio Channel Switch + Live VU */}
      <div
        data-tauri-drag-region="false"
        onMouseDown={stopDragMouse}
        className="flex items-center gap-1.5 shrink-0"
      >
        <button
          type="button"
          onClick={onReturnToOffice}
          title="Повернутися до Ghostboard Office"
          className="inline-flex h-6.5 items-center gap-1 rounded-md border border-white/[0.08] bg-[#141418] px-2 text-[11px] font-medium text-zinc-200 transition-colors hover:border-white/25 hover:text-white cursor-pointer"
        >
          <ArrowLeft size={12} />
          <span className="hidden sm:inline">Офіс</span>
        </button>

        <button
          type="button"
          onClick={cycleListenMode}
          title={`Канал: ${listenMeta.badge}. Клік для перемикання`}
          className="inline-flex h-6.5 items-center gap-1.5 rounded-md border border-white/[0.08] bg-[#111114] px-2 text-[11px] font-medium text-zinc-200 transition-colors hover:border-white/25 cursor-pointer"
        >
          {settings.listenMode === 'interviewer' ? (
            <Crosshair size={11} className="text-emerald-400" />
          ) : settings.listenMode === 'dual' ? (
            <GitMerge size={11} className="text-sky-400" />
          ) : (
            <Mic size={11} className="text-amber-400" />
          )}
          <span className="hidden md:inline truncate max-w-[82px]">
            {listenMeta.short}
          </span>
          <VuBars
            channel={settings.listenMode === 'mic' ? 'candidate' : 'interviewer'}
            bars={5}
            tone={isAudioActive ? 'ok' : 'bad'}
          />
        </button>
      </div>

      {/* NODE 2 (Center): Stealth / Latency / Freeze / STT Reconnect Pill */}
      <div
        data-tauri-drag-region="false"
        onMouseDown={stopDragMouse}
        className="flex items-center justify-center min-w-0"
      >
        {sttProblem ? (
          <button
            type="button"
            onClick={() => onRestartAudio?.()}
            className={`inline-flex h-6 items-center gap-1.5 rounded-full border px-2.5 text-[10.5px] font-mono cursor-pointer ${
              stt.status === 'failed'
                ? 'border-rose-500/40 bg-rose-500/15 text-rose-200'
                : 'border-amber-500/40 bg-amber-500/15 text-amber-200'
            }`}
          >
            <RefreshCw size={10} className={stt.status === 'reconnecting' ? 'animate-spin' : ''} />
            <span>{stt.status === 'failed' ? 'Збій STT · Перезапуск' : 'Перепідключення STT...'}</span>
          </button>
        ) : isPaused ? (
          <button
            type="button"
            onClick={onTogglePause}
            title="Натисніть або Space щоб розморозити"
            className="inline-flex h-6 items-center gap-1.5 rounded-full border border-sky-400/35 bg-sky-500/15 px-2.5 text-[10.5px] font-mono font-medium text-sky-200 cursor-pointer"
          >
            <Pause size={10} />
            <span>Frozen {queuedCount > 0 ? `(+${queuedCount} нових)` : ''}</span>
          </button>
        ) : (
          <div className="inline-flex h-6 items-center gap-1.5 rounded-full border border-white/[0.08] bg-[#111114] px-2.5 text-[10.5px] font-mono text-zinc-200">
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                isStreaming
                  ? 'bg-emerald-400 animate-pulse'
                  : isAudioActive
                    ? 'bg-emerald-400'
                    : 'bg-zinc-500'
              }`}
            />
            <span className="truncate">
              {isStreaming
                ? 'Генерую...'
                : isAudioActive
                  ? 'Слухаю'
                  : 'Аудіо пауза'}
            </span>
            <span className="text-zinc-500">|</span>
            <span className="inline-flex items-center gap-0.5 text-emerald-300 tabular-nums">
              <Zap size={10} />
              {typeof ttftMs === 'number' && ttftMs > 0 ? `${ttftMs}ms` : '180ms'}
            </span>
          </div>
        )}
      </div>

      {/* NODE 3 & 4 (Right & Far Right): Mode Switcher + Options Popover + Panic */}
      <div
        data-tauri-drag-region="false"
        onMouseDown={stopDragMouse}
        className="flex items-center gap-1.5 shrink-0"
      >
        {/* Split / Eyeline / Focus switcher */}
        <button
          type="button"
          onClick={onToggleLayout}
          title={layoutMode === 'chat' ? 'Перемкнути на Eyeline Notch' : 'Розгорнути Split Chat'}
          className="inline-flex h-6.5 items-center gap-1 rounded-md border border-white/[0.08] bg-[#141418] px-2 text-[11px] font-medium text-zinc-200 transition-colors hover:border-white/25 hover:text-white cursor-pointer"
        >
          {layoutMode === 'chat' ? <Sparkles size={11} className="text-emerald-400" /> : <Columns2 size={11} />}
          <span className="hidden sm:inline">{layoutMode === 'chat' ? 'Eyeline' : 'Split'}</span>
        </button>

        {layoutMode === 'chat' && onToggleFocusMode && (
          <button
            type="button"
            onClick={onToggleFocusMode}
            title="Режим Фокусу — 100% на відповідь (Tab)"
            className={`inline-flex h-6.5 items-center gap-1 rounded-md border px-2 text-[11px] font-medium transition-colors cursor-pointer ${
              focusMode
                ? 'border-white/35 bg-white text-zinc-950'
                : 'border-white/[0.08] bg-[#141418] text-zinc-200 hover:border-white/25 hover:text-white'
            }`}
          >
            {focusMode ? <Maximize2 size={11} /> : <PanelLeftClose size={11} />}
            <span className="hidden md:inline">Фокус</span>
          </button>
        )}

        {/* Compact Settings Popover */}
        <div ref={popoverRef} className="relative">
          <button
            type="button"
            onClick={() => setOptionsOpen((prev) => !prev)}
            title="Опції HUD (Мова, Прозорість, Шрифт, Скріншот, Клік-крізь)"
            aria-expanded={optionsOpen}
            className={`inline-flex h-6.5 items-center gap-1 rounded-md border px-2 text-[11px] font-medium transition-colors cursor-pointer ${
              optionsOpen || isClickThrough
                ? 'border-white/30 bg-[#1c1c22] text-white'
                : 'border-white/[0.08] bg-[#141418] text-zinc-200 hover:border-white/25 hover:text-white'
            }`}
          >
            <Settings size={11} />
            <span className="hidden lg:inline">Опції</span>
          </button>

          {optionsOpen && (
            <div className="absolute right-0 top-[34px] z-50 w-[256px] rounded-xl border border-white/12 bg-[#111114] p-3 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.12),0_20px_50px_rgba(0,0,0,0.88)] space-y-3">
              <div className="flex items-center justify-between border-b border-white/[0.08] pb-2">
                <span className="text-[11.5px] font-semibold text-white">Швидкі опції HUD</span>
                {onToggleAudio && (
                  <button
                    type="button"
                    onClick={onToggleAudio}
                    className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-mono cursor-pointer ${
                      isAudioActive
                        ? 'bg-emerald-500/15 text-emerald-300'
                        : 'bg-rose-500/15 text-rose-300'
                    }`}
                  >
                    {isAudioActive ? <Mic size={10} /> : <MicOff size={10} />}
                    {isAudioActive ? 'Mic ON' : 'Mic OFF'}
                  </button>
                )}
              </div>

              {/* Language */}
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] text-zinc-300">Мова відповіді</span>
                <button
                  type="button"
                  onClick={cycleLanguage}
                  className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-[#09090b] px-2 py-1 text-[11px] font-medium text-white hover:border-white/25 cursor-pointer"
                >
                  <Languages size={11} className="text-emerald-400" />
                  <span>{HINT_LANG_LABELS[settings.hintLanguage]}</span>
                </button>
              </div>

              {/* Opacity */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-zinc-300">Прозорість</span>
                  <span className="font-mono text-zinc-200">
                    {Math.round((settings.hudOpacity ?? 0.95) * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min={OPACITY_RANGE.min}
                  max={OPACITY_RANGE.max}
                  step={0.05}
                  value={settings.hudOpacity ?? 0.95}
                  onChange={(e) => updateSettings({ hudOpacity: parseFloat(e.target.value) })}
                  className="gb-range"
                />
              </div>

              {/* Font Scale A- / A+ */}
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] text-zinc-300">
                  Шрифт ({settings.hudFontSize}px)
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => stepFont(-1)}
                    disabled={settings.hudFontSize <= FONT_RANGE.min}
                    className="inline-flex h-6 items-center gap-0.5 rounded border border-white/10 bg-[#09090b] px-2 text-[10.5px] font-mono text-zinc-200 hover:border-white/25 disabled:opacity-40 cursor-pointer"
                  >
                    <Minus size={9} />A
                  </button>
                  <button
                    type="button"
                    onClick={() => stepFont(1)}
                    disabled={settings.hudFontSize >= FONT_RANGE.max}
                    className="inline-flex h-6 items-center gap-0.5 rounded border border-white/10 bg-[#09090b] px-2 text-[10.5px] font-mono text-zinc-200 hover:border-white/25 disabled:opacity-40 cursor-pointer"
                  >
                    A<Plus size={9} />
                  </button>
                </div>
              </div>

              {/* OCR & Click-through */}
              <div className="grid grid-cols-2 gap-1.5 border-t border-white/[0.08] pt-2">
                <button
                  type="button"
                  onClick={() => {
                    onScreenshot();
                    setOptionsOpen(false);
                  }}
                  disabled={isScreenBusy}
                  className="inline-flex items-center justify-center gap-1 rounded-lg border border-white/10 bg-[#09090b] px-2 py-1.5 text-[11px] font-medium text-zinc-200 hover:border-white/25 hover:text-white disabled:opacity-50 cursor-pointer"
                >
                  {isScreenBusy ? <Loader2 size={11} className="animate-spin" /> : <Camera size={11} />}
                  <span>OCR Екрану</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onToggleClickThrough();
                    setOptionsOpen(false);
                  }}
                  className={`inline-flex items-center justify-center gap-1 rounded-lg border px-2 py-1.5 text-[11px] font-medium cursor-pointer ${
                    isClickThrough
                      ? 'border-emerald-400/45 bg-emerald-500/15 text-emerald-200'
                      : 'border-white/10 bg-[#09090b] text-zinc-200 hover:border-white/25 hover:text-white'
                  }`}
                >
                  <MousePointer size={11} />
                  <span>Клік-крізь</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Far Right: Instant Panic (F12) + Close */}
        <button
          type="button"
          onClick={onPanic}
          title="Миттєво сховати вікно (F12 / Ctrl+Shift+H)"
          className="inline-flex h-6.5 items-center gap-1 rounded-md border border-rose-500/35 bg-rose-500/15 px-2 text-[11px] font-medium text-rose-200 transition-colors hover:bg-rose-500/25 cursor-pointer"
        >
          <Shield size={11} />
          <span className="hidden sm:inline">Паніка</span>
        </button>

        <button
          type="button"
          onClick={onClose}
          title="Закрити Stealth HUD"
          aria-label="Закрити HUD"
          className="inline-flex h-6.5 w-6.5 items-center justify-center rounded-md border border-white/[0.08] bg-[#141418] text-zinc-400 transition-colors hover:border-white/25 hover:text-white cursor-pointer"
        >
          <X size={12} />
        </button>
      </div>
    </header>
  );
});
