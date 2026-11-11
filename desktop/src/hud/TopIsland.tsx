import React, { memo } from 'react';
import {
  ArrowLeft,
  Columns,
  Minimize2,
  Camera,
  MousePointer,
  Shield,
  X,
  Sparkles,
  Loader2,
  Pause,
  Play,
  Languages,
  Zap,
} from 'lucide-react';
import { VuBars } from '../ui/VuMeter';
import { LISTEN_MODE_META, LISTEN_MODE_ORDER, startListening } from '../lib/audioSession';
import type { DesktopSettings, HintLanguage } from '../lib/desktopSettings';
import type { AnswerEntry } from '../lib/session';

export interface TopIslandProps {
  settings: DesktopSettings;
  updateSettings: (patch: Partial<DesktopSettings>) => void;
  layoutMode: 'chat' | 'top_bar';
  onToggleLayout: () => void;
  isStreaming: boolean;
  activeAnswer: AnswerEntry | null;
  isPaused: boolean;
  onTogglePause: () => void;
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

const HINT_LANG_BADGE: Record<HintLanguage, string> = {
  auto: 'AUTO',
  uk: 'UA',
  en: 'EN',
  bilingual_uk: 'BI·UA',
  bilingual_ru: 'BI·RU',
  ru: 'RU',
  pl: 'PL',
  de: 'DE',
  es: 'ES',
  fr: 'FR',
};

const NEXT_LANG: Record<string, HintLanguage> = {
  auto: 'uk',
  uk: 'en',
  en: 'bilingual_uk',
  bilingual_uk: 'auto',
};

export const TopIsland = memo(function TopIsland({
  settings,
  updateSettings,
  layoutMode,
  onToggleLayout,
  isStreaming,
  activeAnswer,
  isPaused,
  onTogglePause,
  isClickThrough,
  onToggleClickThrough,
  onScreenshot,
  isScreenBusy,
  onPanic,
  onReturnToOffice,
  onClose,
  isBridgeActive = false,
  onTriggerBridge,
  isAudioActive = true,
  onToggleAudio,
}: TopIslandProps) {
  // Cycle audio listen mode
  const handleCycleAudioMode = async () => {
    const currentIndex = LISTEN_MODE_ORDER.indexOf(settings.listenMode);
    const nextIndex = (currentIndex + 1) % LISTEN_MODE_ORDER.length;
    const nextMode = LISTEN_MODE_ORDER[nextIndex];
    updateSettings({ listenMode: nextMode });
    await startListening(settings, nextMode);
  };

  // Cycle language
  const handleCycleLanguage = () => {
    const cur = settings.hintLanguage;
    const next = NEXT_LANG[cur] || 'auto';
    updateSettings({ hintLanguage: next });
  };

  const currentAudioMeta = LISTEN_MODE_META[settings.listenMode] || LISTEN_MODE_META.interviewer;
  const langLabel = HINT_LANG_LABELS[settings.hintLanguage] || 'Авто';
  const langBadge = HINT_LANG_BADGE[settings.hintLanguage] || 'AUTO';

  return (
    <header
      data-tauri-drag-region="true"
      className="h-[38px] w-full px-2 flex items-center justify-between border-b border-white/[0.08] bg-[#09090b]/95 select-none relative z-40 cursor-grab active:cursor-grabbing shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] overflow-hidden"
    >
      {/* LEFT: Return to Office + Audio Isolation Mode + VU Equalizer (guaranteed non-shrinking) */}
      <div className="flex items-center gap-1.5 shrink-0 z-10 gb-nodrag">
        <button
          type="button"
          data-tauri-drag-region="false"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={onReturnToOffice}
          title="Повернутися в Офіс [Esc]"
          className="gb-nodrag inline-flex items-center gap-1 text-[11px] font-semibold text-zinc-300 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] active:scale-95 px-2 py-1 rounded-md border border-white/[0.08] transition-all shrink-0"
        >
          <ArrowLeft size={12} />
          <span className="hidden sm:inline">Офіс</span>
        </button>

        {/* Audio Mode Badge (Clickable to switch or resume on the fly) */}
        <button
          type="button"
          data-tauri-drag-region="false"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={onToggleAudio ?? handleCycleAudioMode}
          title={isAudioActive ? `Режим аудіо: ${currentAudioMeta.badge}. Клікніть щоб змінити [Ctrl+M].` : "Аудіо зупинено [Ctrl+M]. Клікніть щоб відновити."}
          className={`gb-nodrag inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full border transition-all shrink-0 active:scale-95 ${
            isAudioActive
              ? 'border-white/[0.1] bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300'
              : 'border-rose-500/40 bg-rose-500/15 text-rose-300'
          }`}
        >
          <span className="truncate max-w-[90px] sm:max-w-[125px]">
            {isAudioActive ? currentAudioMeta.badge : '🔇 Пауза аудіо'}
          </span>
        </button>

        {/* Isolated 60fps CSS-variable VU equalizer bars */}
        <div className="flex items-center pl-0.5 pr-1 py-0.5 pointer-events-none shrink-0" title="Рівень аудіо">
          <VuBars channel="interviewer" bars={4} />
        </div>
      </div>

      {/* CENTER: Live State Pill (flex-1 centered, never overlaps buttons, truncates or hides cleanly) */}
      <div className="hidden sm:flex flex-1 items-center justify-center min-w-0 px-2 pointer-events-none z-0">
        <div className="pointer-events-auto truncate max-w-full">
          {isPaused ? (
            <button
              type="button"
              data-tauri-drag-region="false"
              onMouseDown={(e) => e.stopPropagation()}
              onClick={onTogglePause}
              title="Розморозити телепромптер [Space]"
              className="gb-nodrag inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-cyan-400/15 border border-cyan-400/35 text-cyan-300 text-[11px] font-mono font-medium hover:bg-cyan-400/25 active:scale-95 transition-all truncate shadow-[0_0_12px_rgba(34,211,238,0.2)]"
            >
              <Pause size={10} className="fill-cyan-300 shrink-0" />
              <span className="truncate">Заморожено [Space]</span>
            </button>
          ) : isStreaming ? (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-400/15 border border-emerald-400/40 text-emerald-300 text-[11px] font-mono font-bold shadow-[0_0_12px_rgba(52,211,153,0.25)] truncate">
              <Sparkles size={11} className="text-emerald-400 animate-spin shrink-0" />
              <span className="truncate">ШІ відповідає • {activeAnswer?.ttftMs ? `${activeAnswer.ttftMs}ms` : '<220ms'}</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-zinc-400 text-[11px] font-mono truncate">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              <span className="truncate">Слухаю діалог...</span>
            </div>
          )}
        </div>
      </div>

      {/* RIGHT: Language pill, Bridge, Layout switch, Screenshot, Click-through, Panic, Close (guaranteed non-shrinking & fully clickable) */}
      <div className="flex items-center gap-1 shrink-0 z-10 gb-nodrag">
        {/* Language selector pill */}
        <button
          type="button"
          data-tauri-drag-region="false"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={handleCycleLanguage}
          title={`Мова відповідей: ${langLabel}. Клікніть щоб перемкнути.`}
          className="gb-nodrag h-7 inline-flex items-center gap-1 text-[11px] font-mono font-semibold text-zinc-300 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] active:scale-95 px-2 rounded-md border border-white/[0.08] transition-all shrink-0"
        >
          <Languages size={11} className="text-zinc-400 shrink-0" />
          <span>{langBadge}</span>
        </button>

        {/* Emergency Bridge button */}
        {onTriggerBridge && (
          <button
            type="button"
            data-tauri-drag-region="false"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={onTriggerBridge}
            title="Фраза для виграшу часу [B]"
            className={`gb-nodrag h-7 inline-flex items-center gap-1 text-[11px] font-semibold px-2 rounded-md border transition-all shrink-0 active:scale-95 ${
              isBridgeActive
                ? 'bg-amber-500/25 text-amber-300 border-amber-500/40 shadow-[0_0_10px_rgba(245,158,11,0.25)]'
                : 'text-amber-400/90 hover:text-amber-300 bg-amber-400/10 hover:bg-amber-400/20 border-amber-400/25'
            }`}
          >
            <Zap size={11} className="text-amber-400 fill-amber-400" />
            <span className="hidden sm:inline">Брідж</span>
            <kbd className="hidden md:inline text-[9px] font-mono text-amber-400/80 bg-white/[0.04] px-1 rounded">B</kbd>
          </button>
        )}

        {/* Layout switcher (Split <-> Eyeline) */}
        <button
          type="button"
          data-tauri-drag-region="false"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={onToggleLayout}
          title={layoutMode === 'chat' ? 'Суфлер під веб-камеру [Ctrl+L]' : 'Двоколонковий чат [Ctrl+L]'}
          className="gb-nodrag h-7 w-7 flex items-center justify-center rounded-md text-zinc-400 hover:text-white hover:bg-white/[0.08] active:scale-95 transition-all shrink-0"
        >
          {layoutMode === 'chat' ? <Minimize2 size={13} /> : <Columns size={13} />}
        </button>

        {/* Screenshot OCR */}
        <button
          type="button"
          data-tauri-drag-region="false"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={onScreenshot}
          disabled={isScreenBusy}
          title="Скріншот екрана та OCR [Ctrl+Shift+S]"
          className="gb-nodrag h-7 w-7 flex items-center justify-center rounded-md text-zinc-400 hover:text-white hover:bg-white/[0.08] active:scale-95 disabled:opacity-50 transition-all shrink-0"
        >
          {isScreenBusy ? <Loader2 size={13} className="animate-spin text-amber-400" /> : <Camera size={13} />}
        </button>

        {/* Click-through toggle */}
        <button
          type="button"
          data-tauri-drag-region="false"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={onToggleClickThrough}
          title={`Клік-крізь режим: ${isClickThrough ? 'УВІМКНЕНО' : 'ВИМКНЕНО'} [Ctrl+Shift+X]`}
          className={`gb-nodrag h-7 w-7 flex items-center justify-center rounded-md active:scale-95 transition-all shrink-0 ${
            isClickThrough ? 'text-emerald-400 bg-emerald-500/20 shadow-[0_0_10px_rgba(52,211,153,0.3)]' : 'text-zinc-400 hover:text-white hover:bg-white/[0.08]'
          }`}
        >
          <MousePointer size={13} />
        </button>

        {/* Panic button (F12) */}
        <button
          type="button"
          data-tauri-drag-region="false"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={onPanic}
          title="Паніка: Миттєво сховати HUD [F12 / Ctrl+Shift+H]"
          className="gb-nodrag h-7 w-7 flex items-center justify-center rounded-md text-rose-400 hover:text-rose-300 hover:bg-rose-500/20 active:scale-95 transition-all shrink-0"
        >
          <Shield size={13} />
        </button>

        {/* Close HUD */}
        <button
          type="button"
          data-tauri-drag-region="false"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={onClose}
          title="Закрити HUD [Esc]"
          className="gb-nodrag h-7 w-7 flex items-center justify-center rounded-md text-zinc-400 hover:text-white hover:bg-white/[0.08] active:scale-95 transition-all shrink-0"
        >
          <X size={13} />
        </button>
      </div>
    </header>
  );
});
