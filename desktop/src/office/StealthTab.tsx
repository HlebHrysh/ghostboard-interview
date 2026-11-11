import React, { useState } from 'react';
import {
  Shield,
  EyeOff,
  Sliders,
  Keyboard,
  AlertTriangle,
  Monitor,
  Check,
  Zap,
} from 'lucide-react';
import {
  Card,
  SectionTitle,
  Slider,
  Toggle,
  Pill,
  StatusDot,
  Shortcut,
  Button,
  stopDrag,
} from '../ui/primitives';
import {
  setScreenShareStealth,
  setWindowOpacity,
  panicHide,
} from '../lib/tauriBridge';
import {
  SHORTCUTS,
  useOsFamily,
  OS_LABEL,
  type ShortcutSpec,
} from '../lib/platform';
import {
  OPACITY_RANGE,
  FONT_RANGE,
  type DesktopSettings,
} from '../lib/desktopSettings';

interface StealthTabProps {
  settings: DesktopSettings;
  updateSettings: (patch: Partial<DesktopSettings>) => void;
}

export const StealthTab: React.FC<StealthTabProps> = ({
  settings,
  updateSettings,
}) => {
  const os = useOsFamily();
  const [panicFeedback, setPanicFeedback] = useState(false);

  const handleStealthToggle = async (val: boolean) => {
    updateSettings({ stealth: val });
    await setScreenShareStealth(val);
  };

  const handleOpacityChange = async (val: number) => {
    updateSettings({ hudOpacity: val });
    await setWindowOpacity(val);
  };

  const handleFontSizeChange = (val: number) => {
    updateSettings({ hudFontSize: val });
  };

  const handleTestPanic = async () => {
    setPanicFeedback(true);
    await panicHide();
    setTimeout(() => setPanicFeedback(false), 3000);
  };

  const HOTKEY_ROWS: Array<{
    title: string;
    desc: string;
    spec: ShortcutSpec;
  }> = [
    {
      title: 'Запуск Копайлота',
      desc: 'Відкриває або фокусує вікно суфлера',
      spec: SHORTCUTS.launch,
    },
    {
      title: 'Panic Hide (Сховати все)',
      desc: 'Миттєво ховає вікно в системний трей',
      spec: SHORTCUTS.panic,
    },
    {
      title: 'Клік-крізь (Click-Through)',
      desc: 'Дозволяє клікати крізь напівпрозоре вікно',
      spec: SHORTCUTS.clickThrough,
    },
    {
      title: 'Скріншот задачі (OCR)',
      desc: 'Захоплює область екрану для аналізу задачі ШІ',
      spec: SHORTCUTS.screenshot,
    },
    {
      title: 'Пауза розпізнавання',
      desc: 'Тимчасово призупиняє слухання аудіо',
      spec: SHORTCUTS.pause,
    },
    {
      title: 'Зміна режиму (Split / Notch)',
      desc: 'Перемикання між чатом та суфлером біля камери',
      spec: SHORTCUTS.layout,
    },
  ];

  return (
    <div className="space-y-6 pb-6 select-none">
      <SectionTitle
        eyebrow="БЕЗПЕКА ТА СТЕЛС"
        title="Стелс та Хоткеї"
        hint="Невидимість для запису екрану, прозорість HUD та глобальні гарячі клавіші"
        right={
          <Pill tone={settings.stealth ? 'ok' : 'warn'} className="h-6 px-2 text-[10px] font-mono">
            <StatusDot tone={settings.stealth ? 'ok' : 'warn'} ping={settings.stealth} />
            <span>{settings.stealth ? 'STEALTH ACTIVE' : 'STEALTH OFF'}</span>
          </Pill>
        }
      />

      {/* ─────────────────────────────────────────────────────────────
          1. SCREEN SHARE INVISIBILITY (Content Protection)
      ───────────────────────────────────────────────────────────── */}
      <div className="p-4 rounded-xl border border-white/[0.08] bg-[#111114] space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <EyeOff className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-semibold text-white">
                Захист від трансляції екрану (Screen Share Invisibility)
              </div>
              <div className="text-[11px] text-zinc-400">
                Вікно повністю невидиме при шарингу в Zoom, Google Meet, Microsoft Teams, Slack, Discord
              </div>
            </div>
          </div>

          <Toggle
            checked={settings.stealth}
            onChange={handleStealthToggle}
            label="Захист від шарингу екрану"
          />
        </div>

        <div className="p-3 rounded-lg bg-black/40 border border-white/[0.04] text-[11px] text-zinc-400 font-mono space-y-1">
          <div className="flex items-center gap-1.5 text-zinc-300">
            <Shield className="w-3.5 h-3.5 text-emerald-400" />
            <span>Рівень системи ({OS_LABEL[os]}):</span>
          </div>
          <p className="text-[10px] text-zinc-500 leading-relaxed">
            {os === 'windows' && 'Використовує SetWindowDisplayAffinity(WDA_EXCLUDEFROMCAPTURE). Повністю виключає вікно із захоплення DWM/BitBlt.'}
            {os === 'mac' && 'Використовує NSWindowSharingNone. Вікно виключається із захоплення CoreGraphics та ReplayKit.'}
            {os === 'linux' && 'На Wayland / Hyprland вікно налаштоване як окремий surface без захоплення композитором.'}
          </p>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. HUD VISUAL SCALING & OPACITY
      ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Opacity Slider */}
        <div className="p-4 rounded-xl border border-white/[0.08] bg-[#111114] space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-zinc-400" />
              <span>Прозорість HUD (Opacity)</span>
            </span>
          </div>

          <Slider
            label="Прозорість"
            value={settings.hudOpacity}
            min={OPACITY_RANGE.min}
            max={OPACITY_RANGE.max}
            step={0.05}
            onChange={handleOpacityChange}
            format={(v) => `${Math.round(v * 100)}%`}
          />
          <p className="text-[11px] text-zinc-500">
            Нижча прозорість дозволяє бачити вікно співбесіди під текстом суфлера.
          </p>
        </div>

        {/* Font Size Slider */}
        <div className="p-4 rounded-xl border border-white/[0.08] bg-[#111114] space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
              <Monitor className="w-3.5 h-3.5 text-zinc-400" />
              <span>Розмір шрифту суфлера</span>
            </span>
          </div>

          <Slider
            label="Розмір тексту"
            value={settings.hudFontSize}
            min={FONT_RANGE.min}
            max={FONT_RANGE.max}
            step={1}
            onChange={handleFontSizeChange}
            format={(v) => `${v}px`}
          />
          <p className="text-[11px] text-zinc-500">
            Великий шрифт дозволяє читати підказки бічним зором без відведення погляду.
          </p>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          3. OS-SPECIFIC HOTKEYS CHEATSHEET & PANIC TEST
      ───────────────────────────────────────────────────────────── */}
      <div className="p-4 rounded-xl border border-white/[0.08] bg-[#111114] space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Keyboard className="w-4 h-4 text-zinc-300" />
            <span className="text-xs font-semibold text-white">
              Глобальні гарячі клавіші ({OS_LABEL[os]})
            </span>
          </div>

          <Button
            variant="danger"
            size="sm"
            onClick={handleTestPanic}
            className="flex items-center gap-1.5 cursor-pointer font-mono"
            title="Перевірити миттєве згортання в трей"
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Тест Panic (F12)</span>
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
          {HOTKEY_ROWS.map((row) => (
            <div
              key={row.title}
              className="p-2.5 rounded-lg bg-black/30 border border-white/[0.04] flex items-center justify-between gap-3"
            >
              <div className="min-w-0">
                <div className="text-xs font-medium text-zinc-200">{row.title}</div>
                <div className="text-[10px] text-zinc-500 truncate">{row.desc}</div>
              </div>
              <Shortcut spec={row.spec} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
