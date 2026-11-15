import React, { useId } from 'react';
import { motion } from 'framer-motion';
import { Check, Cpu, Globe2, Sparkles, Zap } from 'lucide-react';
import type {
  AiModelCascade,
  AnswerLength,
  AnswerSpeed,
  DesktopSettings,
  HintLanguage,
} from '../lib/desktopSettings';
import { SectionTitle, Segmented, SPRING } from '../ui/primitives';
import { STUDIO_VIDEO_CLIPS, VideoPreviewCapsule } from '../ui/VideoPreviewCapsule';

interface AiBrainTabProps {
  settings: DesktopSettings;
  updateSettings: (patch: Partial<DesktopSettings>) => void;
}

const CASCADES: Array<{
  id: AiModelCascade;
  title: string;
  badge: string;
  desc: string;
}> = [
  {
    id: 'hedged_race',
    title: 'Gemini 2.5 Flash + Groq Llama 3.3',
    badge: 'Hedged Race • <180ms',
    desc: 'Паралельна гонка моделей: перемагає та, хто швидше віддає перший токен Hook.',
  },
  {
    id: 'gemini_flash',
    title: 'Gemini 2.5 Flash',
    badge: 'Deep Accuracy',
    desc: 'Стабільні діаграми, архітектурні trade-offs та точне форматування коду.',
  },
  {
    id: 'groq_llama',
    title: 'Groq Llama 3.3 Turbo',
    badge: 'Ultra-Low TTFT',
    desc: 'Миттєвий потік коротких відповідей для бліц-раундів та скринінгу.',
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

  return (
    <div className="space-y-5 pb-4">
      <SectionTitle title="ШІ-Ядро, Моделі та Промпт" />

      {/* Cascade Model Picker */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#111114] p-4 space-y-3 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)]">
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
                className={`rounded-xl border p-3 text-left transition-all cursor-pointer space-y-1.5 ${
                  selected
                    ? 'border-white/35 bg-[#18181f] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.16)]'
                    : 'border-white/[0.08] bg-[#0c0c0f] hover:border-white/20'
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="rounded bg-white/[0.07] px-1.5 py-0.5 text-[9.5px] font-mono text-emerald-300">
                    {item.badge}
                  </span>
                  {selected && <Check className="h-3.5 w-3.5 text-white" />}
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
                      ? 'border-white/35 bg-[#18181f] font-semibold text-white'
                      : 'border-white/[0.08] bg-[#0c0c0f] text-zinc-400 hover:border-white/20 hover:text-zinc-200'
                  }`}
                >
                  <span className="truncate">{lang.label}</span>
                  <span className="ml-1.5 rounded bg-white/[0.06] px-1.5 py-0.5 font-mono text-[9.5px] text-zinc-300">
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
                { value: 'fast', label: '⚡ Блискавично' },
                { value: 'deep', label: '🧠 Глибокий розбір' },
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

      {/* Custom System Prompt + Video */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <div className="lg:col-span-3 rounded-2xl border border-white/[0.08] bg-[#111114] p-4 space-y-2.5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)]">
          <div className="flex items-center justify-between gap-2">
            <label htmlFor={promptId} className="text-xs font-semibold text-white">
              Кастомні інструкції (System Prompt Override)
            </label>
            <button
              type="button"
              onClick={() =>
                updateSettings({
                  customInstructions:
                    'Відповідай від 1-ї особи, починай з конкретного висновку (1 речення), додавай реальні edge-cases із production та оцінюй Big-O.',
                })
              }
              className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10.5px] text-zinc-300 hover:bg-white/[0.1] cursor-pointer"
            >
              Шаблон Senior
            </button>
          </div>
          <textarea
            id={promptId}
            rows={4}
            value={settings.customInstructions}
            onChange={(e) => updateSettings({ customInstructions: e.target.value })}
            placeholder="Наприклад: підкреслюй досвід з high-load PostgreSQL, уникай теорії з підручників, пиши код на TypeScript..."
            className="gb-input h-auto py-2.5 text-xs leading-relaxed resize-none"
          />
          <p className="text-[11px] text-zinc-500">
            Авто-синхронізується з Rust LLM Orchestrator у реальному часі.
          </p>
        </div>

        <div className="lg:col-span-2">
          <VideoPreviewCapsule clip={STUDIO_VIDEO_CLIPS.book} />
        </div>
      </div>
    </div>
  );
};
