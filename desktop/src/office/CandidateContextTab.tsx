import React, { useId, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  AlertCircle,
  BookOpen,
  Briefcase,
  Building2,
  Check,
  FileUp,
  Layers,
  Loader2,
  Plus,
  RefreshCw,
  UserCheck,
  X,
} from 'lucide-react';
import { getAuthToken, getResolvedBaseUrl } from '../lib/apiClient';
import {
  EXPERIENCE_LEVELS,
  parseResumePdf,
  syncProfileToBackend,
  updateStoredProfile,
  type CandidateLevel,
  type CandidateProfile,
} from '../lib/profileStore';
import { setAiPreferences } from '../lib/tauriBridge';
import { CatalogHeaderBadge } from '../ui/CatalogHeaderBadge';
import { SPRING } from '../ui/primitives';

interface CandidateContextTabProps {
  profile: CandidateProfile;
  setProfile: (profile: CandidateProfile) => void;
}

const SUGGESTED_TAGS = [
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
];

export const CandidateContextTab: React.FC<CandidateContextTabProps> = ({
  profile,
  setProfile,
}) => {
  const roleId = useId();
  const companyId = useId();
  const stackInputId = useId();
  const bioId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [newTag, setNewTag] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [isParsingCv, setIsParsingCv] = useState(false);
  const [statusBanner, setStatusBanner] = useState<{ ok: boolean; text: string } | null>(null);

  const commitPatch = (patch: Partial<CandidateProfile>) => {
    const next = updateStoredProfile(patch);
    setProfile(next);
    const cvSnippet = next.cvContext?.trim() ? `\nCV Context: ${next.cvContext.slice(0, 1800)}` : '';
    const companySnippet = next.targetCompany?.trim() ? ` at ${next.targetCompany}` : '';
    void setAiPreferences({
      candidateProfile: `${next.experienceLevel} ${next.role}${companySnippet} (Stack: ${next.techStack.join(', ')}). ${next.customBio || ''}${cvSnippet}`,
    });
  };

  const addTag = (raw?: string) => {
    const clean = (raw ?? newTag).trim();
    if (!clean) return;
    const exists = profile.techStack.some((t) => t.toLowerCase() === clean.toLowerCase());
    if (!exists) {
      commitPatch({
        techStack: [...profile.techStack, clean],
        primaryStack: [...profile.techStack, clean].join(', '),
      });
    }
    if (!raw) setNewTag('');
  };

  const removeTag = (tag: string) => {
    const nextStack = profile.techStack.filter((t) => t !== tag);
    commitPatch({
      techStack: nextStack,
      primaryStack: nextStack.join(', '),
    });
  };

  const handleCvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setStatusBanner(null);

    if (file.type === 'text/plain' || /\.(txt|md)$/i.test(file.name)) {
      try {
        const text = (await file.text()).slice(0, 6000);
        commitPatch({
          cvContext: text,
          customBio: profile.customBio || text.slice(0, 600),
        });
        setStatusBanner({ ok: true, text: `Резюме «${file.name}» завантажено в контекст.` });
      } catch {
        setStatusBanner({ ok: false, text: 'Не вдалося прочитати текстовий файл.' });
      }
      return;
    }

    setIsParsingCv(true);
    try {
      const token = await getAuthToken();
      const parsed = await parseResumePdf(file, file.name, getResolvedBaseUrl(), token);
      if (parsed.success && parsed.profile) {
        const mergedStack = Array.from(
          new Set([...(parsed.profile.techStack ?? []), ...profile.techStack])
        );
        commitPatch({
          role: parsed.profile.role || profile.role,
          experienceLevel: parsed.profile.experienceLevel || profile.experienceLevel,
          techStack: mergedStack,
          primaryStack: mergedStack.join(', '),
          customBio: parsed.profile.customBio || parsed.profile.summary || profile.customBio,
          cvContext: parsed.profile.cvContext || parsed.profile.summary || profile.cvContext,
        });
        setStatusBanner({ ok: true, text: `CV «${file.name}» розібрано та додано до профілю.` });
      } else {
        setStatusBanner({
          ok: false,
          text: parsed.error || 'Не вдалося розібрати PDF. Скопіюйте текст резюме в поле нижче.',
        });
      }
    } catch {
      setStatusBanner({
        ok: false,
        text: 'Сервер парсингу PDF недоступний. Завантажте .txt/.md або вставте текст вручну.',
      });
    } finally {
      setIsParsingCv(false);
    }
  };

  const handleCloudSync = async () => {
    setIsSyncing(true);
    setStatusBanner(null);
    try {
      const token = await getAuthToken();
      const res = await syncProfileToBackend(profile, getResolvedBaseUrl(), token);
      setStatusBanner({
        ok: res.success,
        text: res.success
          ? 'Профіль збережено локально та синхронізовано з акаунтом.'
          : res.error || 'Збережено локально; хмарний бекенд недоступний.',
      });
    } catch {
      setStatusBanner({ ok: false, text: 'Збережено локально (офлайн).' });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="space-y-5 pb-4">
      {/* Catalog Section Header with Book Squircle Badge (Reading CV / Profile) */}
      <div className="flex items-center justify-between gap-3 pb-0.5">
        <div className="flex items-center gap-3.5 min-w-0 flex-1">
          <CatalogHeaderBadge
            src="./badges/book.webp"
            label="Профіль кандидата та CV"
            tone="amber"
            fallbackIcon={<BookOpen className="h-5 w-5 text-zinc-300" />}
          />
          <div className="min-w-0">
            <h1 className="font-display text-lg font-bold tracking-tight text-white truncate">
              Профіль кандидата та CV
            </h1>
            <p className="text-xs text-zinc-400 truncate">
              Роль, стек технологій та контекст резюме для точних персоналізованих відповідей
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 whitespace-nowrap">
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.txt,.md,application/pdf,text/plain"
            onChange={(e) => void handleCvUpload(e)}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isParsingCv}
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/[0.1] bg-[#111114] px-3 py-1.5 text-xs font-medium text-zinc-200 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)] hover:border-white/25 hover:text-white disabled:opacity-50 cursor-pointer"
          >
            {isParsingCv ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <FileUp className="h-3.5 w-3.5 text-emerald-400" />
            )}
            Завантажити CV
          </button>
          <button
            type="button"
            onClick={() => void handleCloudSync()}
            disabled={isSyncing}
            className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-b from-white to-zinc-200 px-3 py-1.5 text-xs font-semibold text-zinc-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] hover:to-white disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            Синхронізувати
          </button>
        </div>
      </div>

      {statusBanner && (
        <div
          className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs ${
            statusBanner.ok
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
              : 'border-amber-500/30 bg-amber-500/10 text-amber-300'
          }`}
        >
          {statusBanner.ok ? (
            <Check className="h-3.5 w-3.5 shrink-0" />
          ) : (
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          )}
          <span>{statusBanner.text}</span>
        </div>
      )}

      {/* Role & Target Company */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-white/[0.08] bg-[#111114] p-4 space-y-2 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)]">
          <label htmlFor={roleId} className="flex items-center gap-1.5 text-xs font-semibold text-white">
            <Briefcase className="h-3.5 w-3.5 text-zinc-400" />
            Цільова роль
          </label>
          <input
            id={roleId}
            type="text"
            value={profile.role}
            onChange={(e) => commitPatch({ role: e.target.value })}
            placeholder="Напр.: Senior Full-Stack Engineer"
            className="gb-input h-9 text-xs"
          />
        </div>

        <div className="rounded-2xl border border-white/[0.08] bg-[#111114] p-4 space-y-2 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)]">
          <label htmlFor={companyId} className="flex items-center gap-1.5 text-xs font-semibold text-white">
            <Building2 className="h-3.5 w-3.5 text-zinc-400" />
            Компанія (опціонально)
          </label>
          <input
            id={companyId}
            type="text"
            value={profile.targetCompany || ''}
            onChange={(e) => commitPatch({ targetCompany: e.target.value })}
            placeholder="Напр.: Stripe, Linear, Vercel..."
            className="gb-input h-9 text-xs"
          />
        </div>
      </div>

      {/* Seniority Grade Pills */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#111114] p-4 space-y-3 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)]">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-white">
          <UserCheck className="h-3.5 w-3.5 text-zinc-400" />
          Грейд відповідей
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {EXPERIENCE_LEVELS.map((lvl) => {
            const active = profile.experienceLevel === lvl.id;
            return (
              <motion.button
                key={lvl.id}
                type="button"
                whileHover={{ scale: 1.015 }}
                whileTap={{ scale: 0.98 }}
                transition={SPRING}
                onClick={() => commitPatch({ experienceLevel: lvl.id as CandidateLevel })}
                title={lvl.description}
                className={`rounded-xl border px-3 py-2 text-center transition-colors cursor-pointer ${
                  active
                    ? 'border-white/35 bg-white text-zinc-950 font-semibold'
                    : 'border-white/[0.08] bg-[#0c0c0f] text-zinc-300 hover:border-white/20 hover:text-white'
                }`}
              >
                <span className="text-xs">{lvl.label}</span>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Interactive Tech Stack Capsules */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#111114] p-4 space-y-3 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)]">
        <div className="flex items-center justify-between gap-2">
          <label htmlFor={stackInputId} className="flex items-center gap-1.5 text-xs font-semibold text-white">
            <Layers className="h-3.5 w-3.5 text-zinc-400" />
            Стек технологій ({profile.techStack.length})
          </label>
          <span className="text-[10.5px] font-mono text-zinc-500">STT vocabulary boost</span>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {profile.techStack.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 rounded-lg border border-white/15 bg-[#18181e] px-2.5 py-1 text-[11px] font-medium text-zinc-100"
            >
              {tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                aria-label={`Видалити ${tag}`}
                className="text-zinc-500 hover:text-rose-300 cursor-pointer"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>

        <div className="flex gap-2">
          <input
            id={stackInputId}
            type="text"
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                if (e.nativeEvent.isComposing || e.keyCode === 229) return;
                e.preventDefault();
                addTag();
              }
            }}
            placeholder="Додати технологію (напр.: Redis, Rust, Next.js 16)..."
            className="gb-input h-9 flex-1 text-xs"
          />
          <button
            type="button"
            onClick={() => addTag()}
            className="inline-flex items-center gap-1 rounded-xl border border-white/15 bg-white/[0.06] px-3 text-xs font-medium text-zinc-100 hover:bg-white/[0.12] cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            Додати
          </button>
        </div>

        <div className="flex flex-wrap gap-1.5 pt-1">
          {SUGGESTED_TAGS.filter((t) => !profile.techStack.includes(t))
            .slice(0, 8)
            .map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => addTag(tag)}
                className="rounded-md border border-white/[0.06] bg-[#09090b] px-2 py-0.5 text-[10.5px] text-zinc-400 hover:border-white/20 hover:text-zinc-200 cursor-pointer"
              >
                + {tag}
              </button>
            ))}
        </div>
      </div>

      {/* Bio / CV Experience Context */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#111114] p-4 space-y-2.5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)]">
        <div className="flex items-center justify-between gap-2">
          <label htmlFor={bioId} className="text-xs font-semibold text-white">
            Досвід та ключові проекти (CV Context)
          </label>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] tabular-nums text-zinc-500">
              {(profile.cvContext || profile.customBio || '').length} симв.
            </span>
            <span className="inline-flex items-center gap-1 text-[10.5px] font-mono text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Автозбереження
            </span>
          </div>
        </div>
        <textarea
          id={bioId}
          rows={5}
          value={profile.cvContext || profile.customBio}
          onChange={(e) => commitPatch({ cvContext: e.target.value, customBio: e.target.value })}
          placeholder="Вставте опис досвіду, досягнення або текст резюме — копайлот адаптуватиме відповіді під ваші реальні кейси..."
          className="gb-input gb-scroll h-auto py-2.5 bg-[#0a0a0d] font-mono text-xs leading-relaxed resize-none"
        />
      </div>
    </div>
  );
};
