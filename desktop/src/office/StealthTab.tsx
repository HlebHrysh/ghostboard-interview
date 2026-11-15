import React, { useState } from 'react';
import {
  EyeOff,
  Keyboard,
  Minus,
  Monitor,
  MousePointerClick,
  Plus,
  Shield,
  Sliders,
} from 'lucide-react';
import { FONT_RANGE, OPACITY_RANGE, type DesktopSettings } from '../lib/desktopSettings';
import {
  OS_LABEL,
  SHORTCUTS,
  useEnvironmentInfo,
  useOsFamily,
  type ShortcutSpec,
} from '../lib/platform';
import {
  panicHide,
  setScreenShareStealth,
  setWindowOpacity,
  toggleClickThrough,
} from '../lib/tauriBridge';
import { SectionTitle, Shortcut, Slider, Toggle } from '../ui/primitives';
import { STUDIO_VIDEO_CLIPS, VideoPreviewCapsule } from '../ui/VideoPreviewCapsule';

interface StealthTabProps {
  settings: DesktopSettings;
  updateSettings: (patch: Partial<DesktopSettings>) => void;
}

export const StealthTab: React.FC<StealthTabProps> = ({ settings, updateSettings }) => {
  const os = useOsFamily();
  const env = useEnvironmentInfo();
  const [panicFeedback, setPanicFeedback] = useState(false);

  const handleStealthToggle = async (val: boolean) => {
    updateSettings({ stealth: val });
    await setScreenShareStealth(val);
  };

  const handleClickThroughToggle = async (val: boolean) => {
    updateSettings({ clickThrough: val });
    await toggleClickThrough(val);
  };

  const handleOpacityChange = async (val: number) => {
    updateSettings({ hudOpacity: val });
    await setWindowOpacity(val);
  };

  const stepFontSize = (delta: number) => {
    const next = Math.min(FONT_RANGE.max, Math.max(FONT_RANGE.min, settings.hudFontSize + delta));
    updateSettings({ hudFontSize: next });
  };

  const handleTestPanic = async () => {
    setPanicFeedback(true);
    await panicHide();
    setTimeout(() => setPanicFeedback(false), 2600);
  };

  const HOTKEY_ROWS: Array<{
    title: string;
    desc: string;
    spec: ShortcutSpec;
  }> = [
    {
      title: 'Запуск Копайлота',
      desc: 'Миттєво відкриває Stealth HUD',
      spec: SHORTCUTS.launch,
    },
    {
      title: 'Panic Hide (F12 / Ctrl+Shift+H)',
      desc: 'Ховає вікно в трей за 1 мс',
      spec: SHORTCUTS.panic,
    },
    {
      title: 'Click-Through режим',
      desc: 'Мишка клікає крізь HUD',
      spec: SHORTCUTS.clickThrough,
    },
    {
      title: 'Скріншот задачі (OCR)',
      desc: 'Аналізує код або діаграму на екрані',
      spec: SHORTCUTS.screenshot,
    },
    {
      title: 'Пауза / Старт аудіо',
      desc: 'Миттєво вимикає/вмикає мікрофон',
      spec: SHORTCUTS.pause,
    },
    {
      title: 'Split / Eyeline Notch',
      desc: 'Перемикання формату вікна',
      spec: SHORTCUTS.layout,
    },
  ];

  return (
    <div className="space-y-5 pb-4 select-none">
      <SectionTitle
        title="Стелс, Вікно та Гарячі Клавіші"
        right={
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10.5px] font-mono ${
              settings.stealth
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                : 'border-amber-500/30 bg-amber-500/10 text-amber-300'
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                settings.stealth ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
              }`}
            />
            {settings.stealth ? 'STEALTH ACTIVE' : 'STEALTH OFF'}
          </span>
        }
      />

      {/* Hardware Protection Toggles + Stealth Live Capsule */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <div className="lg:col-span-3 space-y-3">
          {/* Screen Share Stealth */}
          <div className="rounded-2xl border border-white/[0.08] bg-[#111114] p-4 flex items-center justify-between gap-4 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)]">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-emerald-500/25 bg-emerald-500/10 text-emerald-400">
                <EyeOff className="h-4 w-4" />
              </div>
              <div>
                <div className="text-xs font-semibold text-white">
                  Screen Share Stealth
                </div>
                <p className="mt-0.5 text-[11px] leading-relaxed text-zinc-400">
                  Апаратна невидимість вікна в Zoom, Meet, Teams, OBS та при записі екрана.
                </p>
              </div>
            </div>
            <Toggle
              checked={settings.stealth}
              onChange={(val) => void handleStealthToggle(val)}
              label="Screen Share Stealth"
            />
          </div>

          {/* Click-Through Mode */}
          <div className="rounded-2xl border border-white/[0.08] bg-[#111114] p-4 flex items-center justify-between gap-4 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)]">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/15 bg-white/[0.05] text-zinc-200">
                <MousePointerClick className="h-4 w-4" />
              </div>
              <div>
                <div className="text-xs font-semibold text-white">
                  Click-Through режим
                </div>
                <p className="mt-0.5 text-[11px] leading-relaxed text-zinc-400">
                  Усі кліки мишкою проходять крізь прозоре вікно копайлота у ваше IDE чи браузер.
                </p>
              </div>
            </div>
            <Toggle
              checked={settings.clickThrough}
              onChange={(val) => void handleClickThroughToggle(val)}
              label="Click-Through режим"
            />
          </div>

          {/* Environment Windowing Info */}
          <div className="rounded-xl border border-white/[0.07] bg-[#0c0c0f] px-3.5 py-2 text-[11px] text-zinc-400 flex items-center justify-between">
            <span>Середовище: {OS_LABEL[os]}</span>
            <span className="font-mono text-zinc-300">
              {env?.hyprland ? 'Hyprland Rules Active' : env?.wayland ? 'Wayland Layer' : 'Native Overlay'}
            </span>
          </div>
        </div>

        <div className="lg:col-span-2">
          <VideoPreviewCapsule clip={STUDIO_VIDEO_CLIPS.stealth} compact />
        </div>
      </div>

      {/* Opacity Slider (30-100%) + Font Scale (A- / A+) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-white/[0.08] bg-[#111114] p-4 space-y-3 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)]">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-white">
            <Sliders className="h-3.5 w-3.5 text-zinc-400" />
            Прозорість HUD (30%–100%)
          </div>
          <Slider
            label="Прозорість вікна"
            value={settings.hudOpacity}
            min={OPACITY_RANGE.min}
            max={OPACITY_RANGE.max}
            step={0.05}
            onChange={(v) => void handleOpacityChange(v)}
            format={(v) => `${Math.round(v * 100)}%`}
          />
          <p className="text-[11px] text-zinc-400">
            Прозорість вікна копайлота застосовується миттєво під час співбесіди.
          </p>
        </div>

        <div className="rounded-2xl border border-white/[0.08] bg-[#111114] p-4 space-y-3 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)]">
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 text-xs font-semibold text-white">
              <Monitor className="h-3.5 w-3.5 text-zinc-400" />
              Масштаб шрифту
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => stepFontSize(-1)}
                disabled={settings.hudFontSize <= FONT_RANGE.min}
                aria-label="Зменшити шрифт (A-)"
                className="inline-flex h-6 items-center gap-0.5 rounded-md border border-white/10 bg-[#09090b] px-2 text-[11px] font-mono text-zinc-200 hover:border-white/25 disabled:opacity-40 cursor-pointer"
              >
                <Minus className="h-2.5 w-2.5" />A
              </button>
              <button
                type="button"
                onClick={() => stepFontSize(1)}
                disabled={settings.hudFontSize >= FONT_RANGE.max}
                aria-label="Збільшити шрифт (A+)"
                className="inline-flex h-6 items-center gap-0.5 rounded-md border border-white/10 bg-[#09090b] px-2 text-[11px] font-mono text-zinc-200 hover:border-white/25 disabled:opacity-40 cursor-pointer"
              >
                A<Plus className="h-2.5 w-2.5" />
              </button>
            </div>
          </div>

          <Slider
            label="Розмір тексту HUD"
            value={settings.hudFontSize}
            min={FONT_RANGE.min}
            max={FONT_RANGE.max}
            step={1}
            onChange={(hudFontSize) => updateSettings({ hudFontSize })}
            format={(v) => `${v}px`}
          />
        </div>
      </div>

      {/* OS Hotkeys Cheatsheet */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#111114] p-4 space-y-3 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)]">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-white">
            <Keyboard className="h-4 w-4 text-zinc-300" />
            Гарячі клавіші ({OS_LABEL[os]})
          </div>

          <button
            type="button"
            onClick={() => void handleTestPanic()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-1 text-[11px] font-medium text-rose-300 hover:bg-rose-500/20 cursor-pointer"
          >
            <Shield className="h-3.5 w-3.5" />
            {panicFeedback ? 'Згорнуто!' : 'Тест Panic (F12)'}
          </button>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {HOTKEY_ROWS.map((row) => (
            <div
              key={row.title}
              className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-[#09090b] p-2.5"
            >
              <div className="min-w-0">
                <div className="text-xs font-medium text-zinc-100">{row.title}</div>
                <div className="truncate text-[10.5px] text-zinc-500">{row.desc}</div>
              </div>
              <Shortcut spec={row.spec} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
