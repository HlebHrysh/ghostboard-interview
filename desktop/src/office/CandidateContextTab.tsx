import React, { useState } from 'react';
import {
  FileText,
  UserCheck,
  Plus,
  X,
  RefreshCw,
  Check,
  AlertCircle,
  Briefcase,
  Layers,
} from 'lucide-react';
import { Card, SectionTitle, Button, Pill, StatusDot, stopDrag } from '../ui/primitives';
import {
  EXPERIENCE_LEVELS,
  syncProfileToBackend,
  updateStoredProfile,
  type CandidateProfile,
  type CandidateLevel,
} from '../lib/profileStore';
import { setAiPreferences } from '../lib/tauriBridge';

interface CandidateContextTabProps {
  profile: CandidateProfile;
  setProfile: (profile: CandidateProfile) => void;
}

const COMMON_TAG_SUGGESTIONS = [
  'TypeScript',
  'React',
  'Next.js',
  'Node.js',
  'Go',
  'PostgreSQL',
  'Docker',
  'Kubernetes',
  'AWS',
  'Redis',
  'Python',
  'Rust',
  'GraphQL',
  'Kafka',
  'Microservices',
];

export const CandidateContextTab: React.FC<CandidateContextTabProps> = ({
  profile,
  setProfile,
}) => {
  const [newTagInput, setNewTagInput] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<{ ok: boolean; message: string } | null>(null);

  const handleUpdate = (patch: Partial<CandidateProfile>) => {
    const next = updateStoredProfile(patch);
    setProfile(next);
    // Sync candidate role and stack to Rust orchestrator
    void setAiPreferences({
      candidateProfile: `${next.experienceLevel} ${next.role} (Stack: ${next.techStack.join(', ')})`,
    });
  };

  const handleAddTag = (tagToAdd?: string) => {
    const val = (tagToAdd || newTagInput).trim();
    if (!val) return;
    if (!profile.techStack.includes(val)) {
      handleUpdate({ techStack: [...profile.techStack, val] });
    }
    setNewTagInput('');
  };

  const handleRemoveTag = (tag: string) => {
    handleUpdate({ techStack: profile.techStack.filter((t) => t !== tag) });
  };

  const handleSyncToBackend = async () => {
    setIsSyncing(true);
    setSyncStatus(null);
    try {
      const res = await syncProfileToBackend(profile);
      if (res.success) {
        setSyncStatus({ ok: true, message: 'Профіль успішно синхронізовано з хмарою' });
        setTimeout(() => setSyncStatus(null), 3500);
      } else {
        setSyncStatus({ ok: false, message: res.error || 'Помилка синхронізації' });
      }
    } catch {
      setSyncStatus({ ok: false, message: 'Немає зв’язку з сервером' });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="space-y-6 pb-6 select-none">
      <SectionTitle
        eyebrow="ПРОФІЛЬ КАНДИДАТА"
        title="Контекст та Резюме"
        hint="ШІ адаптує відповіді під ваш реальний стек, роль та сеньйоріті, щоб аргументи звучали природно"
        right={
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSyncToBackend}
            disabled={isSyncing}
            className="flex items-center gap-1.5 cursor-pointer font-mono"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>Синхронізувати</span>
          </Button>
        }
      />

      {syncStatus && (
        <div
          className={`p-3 rounded-xl border text-xs font-mono flex items-center gap-2 ${
            syncStatus.ok
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          }`}
        >
          {syncStatus.ok ? (
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          )}
          <span>{syncStatus.message}</span>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          1. TARGET ROLE & SENIORITY LEVEL
      ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Role Input */}
        <div className="p-4 rounded-xl border border-white/[0.08] bg-[#111114] space-y-2.5">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
            <Briefcase className="w-3.5 h-3.5 text-zinc-400" />
            <span>Цільова позиція (Role)</span>
          </label>
          <input
            type="text"
            data-tauri-drag-region="false"
            onMouseDown={stopDrag}
            value={profile.role}
            onChange={(e) => handleUpdate({ role: e.target.value })}
            placeholder="Наприклад: Senior Full-Stack Engineer"
            className="gb-input font-medium text-xs"
          />
          <p className="text-[11px] text-zinc-500">
            Визначає професійний кут зору для прикладів і технічних термінів.
          </p>
        </div>

        {/* Primary Stack Summary */}
        <div className="p-4 rounded-xl border border-white/[0.08] bg-[#111114] space-y-2.5">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-zinc-400" />
            <span>Основний фокус стеку</span>
          </label>
          <input
            type="text"
            data-tauri-drag-region="false"
            onMouseDown={stopDrag}
            value={profile.primaryStack}
            onChange={(e) => handleUpdate({ primaryStack: e.target.value })}
            placeholder="TypeScript, React, Node.js, PostgreSQL"
            className="gb-input font-medium text-xs"
          />
          <p className="text-[11px] text-zinc-500">
            Короткий рядок стеку, який додається як головний фокус у кожен запит.
          </p>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. SENIORITY LEVEL CARDS
      ───────────────────────────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
          Рівень кваліфікації (Seniority)
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
          {EXPERIENCE_LEVELS.map((lvl) => {
            const isSelected = profile.experienceLevel === lvl.id;
            return (
              <button
                key={lvl.id}
                type="button"
                data-tauri-drag-region="false"
                onMouseDown={stopDrag}
                onClick={() => handleUpdate({ experienceLevel: lvl.id })}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'border-white bg-white/[0.08] ring-1 ring-white/20'
                    : 'border-white/[0.06] bg-[#111114] hover:border-white/15'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-white">{lvl.label}</span>
                    {isSelected && (
                      <div className="w-3.5 h-3.5 rounded-full bg-white text-zinc-950 flex items-center justify-center">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </div>
                    )}
                  </div>
                  <div className="text-[10px] text-zinc-400 leading-snug line-clamp-2">
                    {lvl.description}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          3. TECH STACK TAGS (Add / Remove / Presets)
      ───────────────────────────────────────────────────────────── */}
      <div className="p-4 rounded-xl border border-white/[0.08] bg-[#111114] space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-300">
            Технологічний стек (Tech Stack Tags)
          </label>
          <span className="text-[10px] font-mono text-zinc-500">
            {profile.techStack?.length || 0} технологій
          </span>
        </div>

        {/* Active Tags */}
        <div className="flex flex-wrap gap-1.5 min-h-[36px] p-2 rounded-lg bg-black/30 border border-white/[0.06]">
          {(profile.techStack || []).map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/10 text-zinc-200 text-xs font-mono border border-white/10"
            >
              <span>{tag}</span>
              <button
                type="button"
                data-tauri-drag-region="false"
                onMouseDown={stopDrag}
                onClick={() => handleRemoveTag(tag)}
                className="text-zinc-400 hover:text-white p-0.5 cursor-pointer"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </span>
          ))}
          {(!profile.techStack || profile.techStack.length === 0) && (
            <span className="text-xs text-zinc-500 py-1 font-mono">
              Немає доданих технологій. Додайте нижче.
            </span>
          )}
        </div>

        {/* Input to add custom tag */}
        <div className="flex gap-2">
          <input
            type="text"
            data-tauri-drag-region="false"
            onMouseDown={stopDrag}
            value={newTagInput}
            onChange={(e) => setNewTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddTag();
              }
            }}
            placeholder="+ Додати нову технологію (натисніть Enter)..."
            className="gb-input flex-1 font-mono text-xs"
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleAddTag()}
            className="px-3 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Додати</span>
          </Button>
        </div>

        {/* Quick Suggestion Pills */}
        <div className="pt-2 border-t border-white/[0.04]">
          <div className="text-[10px] uppercase font-mono text-zinc-500 mb-1.5">
            Швидкі рекомендації:
          </div>
          <div className="flex flex-wrap gap-1">
            {COMMON_TAG_SUGGESTIONS.filter((t) => !profile.techStack?.includes(t)).slice(0, 10).map((tag) => (
              <button
                key={tag}
                type="button"
                data-tauri-drag-region="false"
                onMouseDown={stopDrag}
                onClick={() => handleAddTag(tag)}
                className="px-2 py-0.5 rounded text-[11px] font-mono bg-white/[0.04] text-zinc-400 hover:text-white hover:bg-white/[0.08] transition cursor-pointer"
              >
                + {tag}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          4. CV CONTEXT / BIO TEXTAREA
      ───────────────────────────────────────────────────────────── */}
      <div className="p-4 rounded-xl border border-white/[0.08] bg-[#111114] space-y-2.5">
        <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
          <FileText className="w-3.5 h-3.5 text-zinc-400" />
          <span>Коротке резюме або біографія кандидата</span>
        </label>
        <textarea
          data-tauri-drag-region="false"
          onMouseDown={stopDrag}
          rows={4}
          value={profile.customBio}
          onChange={(e) => handleUpdate({ customBio: e.target.value })}
          placeholder="Вставте опис вашого досвіду, ключові проєкти або резюме. ШІ врахує це при відповідях на питання про ваш минулий досвід."
          className="gb-input h-auto py-2 font-mono text-xs leading-relaxed resize-none"
        />
      </div>
    </div>
  );
};
