import React, { useId } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Brain, Check, Cpu, Globe2, Sparkles, Zap } from 'lucide-react';
import type {
  AiModelCascade,
  AnswerLength,
  AnswerSpeed,
  DesktopSettings,
  HintLanguage,
} from '../lib/desktopSettings';
import { CatalogHeaderBadge } from '../ui/CatalogHeaderBadge';
import { Segmented, SPRING } from '../ui/primitives';

interface AiBrainTabProps {
  settings: DesktopSettings;
  updateSettings: (patch: Partial<DesktopSettings>) => void;
}

const CASCADES: Array<{
  id: AiModelCascade;
  title: string;
  badge: string;
  desc: string;
  speedBars: number;
}> = [
  {
    id: 'hedged_race',
    title: 'Gemini 3.8 Flash + Groq Llama 3.3',
    badge: 'Race · <180ms',
    desc: 'Паралельна гонка моделей: перемагає та, хто швидше віддає перший токен Hook.',
    speedBars: 3,
  },
  {
    id: 'gemini_flash',
    title: 'Gemini 3.8 Flash',
    badge: 'Deep Accuracy',
    desc: 'Стабільні діаграми, архітектурні trade-offs та точне форматування коду.',
    speedBars: 2,
  },
  {
    id: 'groq_llama',
    title: 'Groq Llama 3.3 Turbo',
    badge: 'Ultra-Low TTFT',
    desc: 'Миттєвий потік коротких відповідей для бліц-раундів та скринінгу.',
    speedBars: 3,
  },
];

const LANGUAGES: Array<{ id: HintLanguage; label: string; tag: string }> = [
  { id: 'auto', label: 'Авто', tag: 'AUTO' },
  { id: 'uk', label: 'Українська', tag: 'UA' },
  { id: 'en', label: 'English', tag: 'EN' },
  { id: 'bilingual_uk', label: 'Білінгв', tag: 'EN + UA' },
  { id: 'ru', label: 'Русский', tag: 'RU' },
  { id: 'bilingual_ru', label: 'Билингв', tag: 'EN + RU' },
];

export const AiBrainTab: React.FC<AiBrainTabProps> = ({ settings, updateSettings }) => {
  const promptId = useId();
  const promptChars = settings.customInstructions.length;

  return (
    <div className="space-y-5 pb-4">
      {/* Catalog Section Header with Book Squircle Badge (Reading / Prompt Rules) */}
      <div className="flex items-center justify-between gap-3 pb-0.5">
        <div className="flex items-center gap-3.5 min-w-0 flex-1">
          <CatalogHeaderBadge
            src="./badges/book.webp"
            label="ШІ-Ядро, Моделі та Інструкції"
            tone="amber"
            fallbackIcon={<BookOpen className="h-5 w-5 text-zinc-300" />}
          />
          <div className="min-w-0">
            <h1 className="font-display text-lg font-bold tracking-tight text-white truncate">
              ШІ-Ядро, Моделі та Промпт
            </h1>
            <p className="text-xs text-zinc-400 truncate">
              Правила читання відповідей, каскад моделей та системні інструкції копайлота
            </p>
          </div>
        </div>

        <span className="shrink-0 whitespace-nowrap inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-[#111114] px-2.5 py-1 text-[10px] font-mono uppercase tracking-[0.09em] text-zinc-300">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          Sub-180ms Engine
        </span>
      </div>

      {/* Cascade Model Picker */}
      <div className="gb-hairline-top relative rounded-2xl border border-white/[0.08] bg-[#111114] p-4 space-y-3 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)]">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-white">
            <Cpu className="h-3.5 w-3.5 text-zinc-300" />
            Каскад генерації відповідей
          </div>
          <span className="text-[10.5px] font-mono text-zinc-500">Rust Orchestrator</span>
        </div>

        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
          {CASCADES.map((item) => {
            const selected = settings.aiModelCascade === item.id;
            return (
              <motion.button
                key={item.id}
                type="button"
                whileHover={{ scale: 1.012 }}
                whileTap={{ scale: 0.985 }}
                transition={SPRING}
                onClick={() => updateSettings({ aiModelCascade: item.id })}
                className={`rounded-xl border p-3 text-left transition-all cursor-pointer space-y-2 ${
                  selected
                    ? 'border-emerald-400/45 bg-[#16181d] shadow-[inset_0_1px_0_0_rgba(167,243,208,0.18)]'
                    : 'border-white/[0.08] bg-[#0c0c0f] hover:border-white/20'
                }`}
              >
                <div className="flex items-center justify-between gap-1.5">
                  <span className="whitespace-nowrap rounded border border-emerald-500/20 bg-emerald-500/10 px-1.5 py-0.5 text-[9.5px] font-mono text-emerald-300">
                    {item.badge}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="inline-flex items-end gap-0.5 h-3" aria-hidden="true" title="Швидкість відгуку">
                      {[1, 2, 3].map((lvl) => (
                        <span
                          key={lvl}
                          className={`w-1 rounded-sm ${
                            lvl <= item.speedBars ? 'bg-emerald-400' : 'bg-zinc-700'
                          }`}
                          style={{ height: `${lvl * 3 + 2}px` }}
                        />
                      ))}
                    </span>
                    {selected && (
                      <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-400 text-zinc-950">
                        <Check className="h-2.5 w-2.5 stroke-[3]" />
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-xs font-semibold text-white leading-snug">
                  {item.title}
                </div>
                <p className="text-[11px] leading-relaxed text-zinc-400">{item.desc}</p>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Language + Speed + Depth */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/[0.08] bg-[#111114] p-4 space-y-3 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)]">
          <div className="flex items-center gap-2 text-xs font-semibold text-white">
            <Globe2 className="h-3.5 w-3.5 text-zinc-300" />
            Мова підказок
          </div>
          <div className="grid grid-cols-2 gap-2">
            {LANGUAGES.map((lang) => {
              const selected = settings.hintLanguage === lang.id;
              return (
                <button
                  key={lang.id}
                  type="button"
                  onClick={() => updateSettings({ hintLanguage: lang.id })}
                  className={`flex items-center justify-between rounded-xl border px-3 py-2 text-xs transition-colors cursor-pointer ${
                    selected
                      ? 'border-emerald-400/40 bg-[#17191f] font-semibold text-white shadow-[inset_0_1px_0_0_rgba(167,243,208,0.14)]'
                      : 'border-white/[0.08] bg-[#0c0c0f] text-zinc-400 hover:border-white/20 hover:text-zinc-200'
                  }`}
                >
                  <span className="truncate">{lang.label}</span>
                  <span
                    className={`ml-1.5 rounded px-1.5 py-0.5 font-mono text-[9.5px] ${
                      selected
                        ? 'bg-emerald-500/15 text-emerald-300'
                        : 'bg-white/[0.06] text-zinc-400'
                    }`}
                  >
                    {lang.tag}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-white/[0.08] bg-[#111114] p-4 space-y-4 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)]">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-white">
              <Zap className="h-3.5 w-3.5 text-emerald-400" />
              Швидкість vs Глибина
            </div>
            <Segmented<AnswerSpeed>
              name="answer-speed"
              value={settings.answerSpeed}
              onChange={(answerSpeed) => updateSettings({ answerSpeed })}
              options={[
                {
                  value: 'fast',
                  label: (
                    <span className="inline-flex items-center gap-1.5">
                      <Zap className="h-3 w-3 text-emerald-500" /> Блискавично
                    </span>
                  ),
                },
                {
                  value: 'deep',
                  label: (
                    <span className="inline-flex items-center gap-1.5">
                      <Brain className="h-3 w-3" /> Глибокий розбір
                    </span>
                  ),
                },
              ]}
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-white">
              <Sparkles className="h-3.5 w-3.5 text-zinc-300" />
              Формат та глибина відповіді
            </div>
            <Segmented<AnswerLength>
              name="answer-length"
              value={settings.answerLength}
              onChange={(answerLength) => updateSettings({ answerLength })}
              options={[
                { value: 'short', label: 'Тези' },
                { value: 'detailed', label: 'Детально' },
                { value: 'code', label: 'З кодом' },
              ]}
            />
          </div>
        </div>
      </div>

      {/* Full-Width Custom System Prompt */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#111114] p-4 space-y-2.5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)]">
        <div className="flex items-center justify-between gap-2">
          <label htmlFor={promptId} className="text-xs font-semibold text-white">
            Кастомні інструкції (System Prompt Override)
          </label>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] tabular-nums text-zinc-500">
              {promptChars} симв.
            </span>
            <button
              type="button"
              onClick={() =>
                updateSettings({
                  customInstructions:
                    'Відповідай від 1-ї особи, починай з конкретного висновку (1 речення), додавай реальні edge-cases із production та оцінюй Big-O.',
                })
              }
              className="rounded-md border border-white/10 bg-white/[0.05] px-2 py-0.5 text-[10.5px] font-medium text-zinc-200 hover:border-white/25 hover:bg-white/[0.1] cursor-pointer"
            >
              Шаблон Senior
            </button>
          </div>
        </div>
        <textarea
          id={promptId}
          rows={3}
          value={settings.customInstructions}
          onChange={(e) => updateSettings({ customInstructions: e.target.value })}
          placeholder="Наприклад: підкреслюй досвід з high-load PostgreSQL, уникай теорії з підручників, пиши код на TypeScript..."
          className="gb-input h-auto py-2.5 bg-[#0a0a0d] text-xs leading-relaxed resize-none"
        />
        <p className="text-[11px] text-zinc-500">
          Авто-синхронізується з Rust LLM Orchestrator у реальному часі.
        </p>
      </div>
    </div>
  );
};
