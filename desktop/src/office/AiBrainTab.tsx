import React, { useCallback } from 'react';
import {
  Cpu,
  Sparkles,
  Zap,
  Globe,
  Sliders,
  AlignLeft,
  Code,
  Check,
} from 'lucide-react';
import { Card, SectionTitle, Segmented, Pill, StatusDot, stopDrag } from '../ui/primitives';
import { setAiPreferences } from '../lib/tauriBridge';
import type { DesktopSettings, AnswerSpeed, AnswerLength, HintLanguage } from '../lib/desktopSettings';

interface AiBrainTabProps {
  settings: DesktopSettings;
  updateSettings: (patch: Partial<DesktopSettings>) => void;
}

const LANGUAGE_OPTIONS: Array<{
  value: HintLanguage;
  label: string;
  badge?: string;
  desc: string;
}> = [
  { value: 'auto', label: 'Авто', desc: 'Відповідати тією ж мовою, якою прозвучало запитання' },
  { value: 'uk', label: 'Українська', desc: 'Відповідати завжди чистою українською мовою' },
  { value: 'en', label: 'English', desc: 'Strict English technical answers for international interviews' },
  {
    value: 'bilingual_uk',
    label: 'Білінгв (EN + UA)',
    badge: 'Consensus',
    desc: 'Англійська основна відповідь + швидка українська підказка',
  },
];

const SPEED_OPTIONS: Array<{
  value: AnswerSpeed;
  label: string;
  desc: string;
  badge?: string;
}> = [
  { value: 'fast', label: '⚡ Швидкий (<220ms)', desc: 'Миттєвий хук та 3 тези для безперервної розмови', badge: 'Ultra-low TTFT' },
  { value: 'deep', label: '🧠 Глибокий', desc: 'Архітектурний аналіз, детальні trade-offs та граничні випадки' },
];

const LENGTH_OPTIONS: Array<{
  value: AnswerLength;
  label: string;
  desc: string;
}> = [
  { value: 'short', label: '✂️ Лаконічно', desc: '1-2 речення для швидких перевірочних запитань' },
  { value: 'detailed', label: '📋 Розгорнуто', desc: '3-фазний суфлер: Hook + 3 Pillars + Deep Dive' },
  { value: 'code', label: '💻 З кодом', desc: 'Пріоритет на реалізацію алгоритмів та синтаксис' },
];

export const AiBrainTab: React.FC<AiBrainTabProps> = ({
  settings,
  updateSettings,
}) => {
  const syncToRust = useCallback(
    (nextSettings: DesktopSettings) => {
      void setAiPreferences({
        outputLanguage: nextSettings.hintLanguage === 'auto' ? null : nextSettings.hintLanguage,
        helperLanguage: nextSettings.hintLanguage.startsWith('bilingual') ? 'uk' : null,
        modifier: nextSettings.answerSpeed === 'deep' ? 'deep_dive' : null,
        concise: nextSettings.answerLength === 'short',
      });
    },
    []
  );

  const handleLanguageChange = (lang: HintLanguage) => {
    updateSettings({ hintLanguage: lang });
    syncToRust({ ...settings, hintLanguage: lang });
  };

  const handleSpeedChange = (speed: AnswerSpeed) => {
    updateSettings({ answerSpeed: speed });
    syncToRust({ ...settings, answerSpeed: speed });
  };

  const handleLengthChange = (len: AnswerLength) => {
    updateSettings({ answerLength: len });
    syncToRust({ ...settings, answerLength: len });
  };

  const handleCustomInstructionsChange = (text: string) => {
    const val = text.slice(0, 1200);
    updateSettings({ customInstructions: val });
  };

  return (
    <div className="space-y-6 pb-6 select-none">
      <SectionTitle
        eyebrow="ШІ ТА ПІДКАЗКИ"
        title="ШІ-Ядро та Модель"
        hint="Налаштування поведінки генератора відповідей, мови інтерв'ю та глибини аргументації"
        right={
          <Pill tone="ok" className="h-6 px-2 text-[10px] font-mono">
            <StatusDot tone="ok" />
            <span>Direct Rust LLM Engine</span>
          </Pill>
        }
      />

      {/* ─────────────────────────────────────────────────────────────
          1. OUTPUT LANGUAGE SELECTOR
      ───────────────────────────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
          <Globe className="w-3.5 h-3.5 text-zinc-300" />
          <span>Мова генерації відповіді</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
          {LANGUAGE_OPTIONS.map((opt) => {
            const isSelected = settings.hintLanguage === opt.value;
            return (
              <div
                key={opt.value}
                data-tauri-drag-region="false"
                onMouseDown={stopDrag}
                onClick={() => handleLanguageChange(opt.value)}
                className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'border-white bg-white/[0.06] ring-1 ring-white/20 shadow-sm'
                    : 'border-white/[0.08] bg-[#111114] hover:border-white/20'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-white">{opt.label}</span>
                    {isSelected && (
                      <div className="w-4 h-4 rounded-full bg-white text-zinc-950 flex items-center justify-center">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                    )}
                  </div>
                  <p className="text-[11px] text-zinc-400 leading-snug">{opt.desc}</p>
                </div>
                {opt.badge && (
                  <div className="mt-2 text-[9px] font-mono text-cyan-400 uppercase">{opt.badge}</div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. SPEED & DEPTH MODIFIERS
      ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Speed / Depth */}
        <div className="p-4 rounded-xl border border-white/[0.08] bg-[#111114] space-y-3">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-zinc-400" />
            <span>Швидкість реакції / Глибина</span>
          </div>

          <div className="space-y-2">
            {SPEED_OPTIONS.map((opt) => {
              const active = settings.answerSpeed === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  data-tauri-drag-region="false"
                  onMouseDown={stopDrag}
                  onClick={() => handleSpeedChange(opt.value)}
                  className={`w-full p-2.5 rounded-lg border text-left transition-all flex items-center justify-between cursor-pointer ${
                    active
                      ? 'border-white bg-white/[0.06] text-white'
                      : 'border-white/[0.06] bg-black/20 text-zinc-400 hover:text-zinc-200 hover:border-white/15'
                  }`}
                >
                  <div>
                    <div className="text-xs font-semibold">{opt.label}</div>
                    <div className="text-[11px] text-zinc-500 mt-0.5">{opt.desc}</div>
                  </div>
                  {opt.badge && (
                    <Pill tone="ok" className="h-4 px-1 text-[9px] font-mono">{opt.badge}</Pill>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Answer Length */}
        <div className="p-4 rounded-xl border border-white/[0.08] bg-[#111114] space-y-3">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
            <AlignLeft className="w-3.5 h-3.5 text-zinc-400" />
            <span>Формат та деталізація відповіді</span>
          </div>

          <div className="space-y-2">
            {LENGTH_OPTIONS.map((opt) => {
              const active = settings.answerLength === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  data-tauri-drag-region="false"
                  onMouseDown={stopDrag}
                  onClick={() => handleLengthChange(opt.value)}
                  className={`w-full p-2.5 rounded-lg border text-left transition-all flex items-center justify-between cursor-pointer ${
                    active
                      ? 'border-white bg-white/[0.06] text-white'
                      : 'border-white/[0.06] bg-black/20 text-zinc-400 hover:text-zinc-200 hover:border-white/15'
                  }`}
                >
                  <div>
                    <div className="text-xs font-semibold">{opt.label}</div>
                    <div className="text-[11px] text-zinc-500 mt-0.5">{opt.desc}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          3. CUSTOM SYSTEM INSTRUCTIONS (PERSISTED & SYNCED)
      ───────────────────────────────────────────────────────────── */}
      <div className="p-4 rounded-xl border border-white/[0.08] bg-[#111114] space-y-2.5">
        <div className="flex items-center justify-between">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-zinc-400" />
            <span>Додаткові інструкції для ШІ (System Prompt Additions)</span>
          </label>
          <span className="text-[10px] font-mono text-zinc-500">
            {settings.customInstructions.length} / 1200 симв.
          </span>
        </div>

        <textarea
          data-tauri-drag-region="false"
          onMouseDown={stopDrag}
          rows={3}
          value={settings.customInstructions}
          onChange={(e) => handleCustomInstructionsChange(e.target.value)}
          placeholder='Наприклад: "Фокусуйся на clean architecture. Відповідай без вступів. Пропонуй мікросервісні патерни та Redis для кешування."'
          className="gb-input h-auto py-2 font-mono text-xs leading-relaxed resize-none"
        />
        <p className="text-[11px] text-zinc-500 leading-relaxed">
          Ці інструкції додаються безпосередньо до системного промпту кожного запиту ШІ.
        </p>
      </div>
    </div>
  );
};
