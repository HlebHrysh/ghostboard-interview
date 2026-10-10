'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Camera,
  Sparkles,
  Volume2,
  Briefcase,
  Settings,
  ChevronRight,
  Check,
  Pencil,
  UploadCloud,
  FileText,
  Plus,
  X,
  RefreshCw,
  FileUp,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { CandidateProfile } from '@/components/CandidateProfileModal';
import { useLocale } from '@/contexts/LocaleContext';
import { getHudTranslations } from '@/lib/hudI18n';
import { toast } from 'sonner';

const QUICK_TEST_QUESTIONS: Record<string, { label: string; q: string }> = {
  ua: {
    label: 'PostgreSQL MVCC & Bloat',
    q: 'Як у PostgreSQL працює MVCC при високому навантаженні на UPDATE, і чим небезпечний table bloat у зʼєднанні з autovacuum?',
  },
  en: {
    label: 'PostgreSQL MVCC & Bloat',
    q: 'How does PostgreSQL MVCC handle heavy UPDATE loads, and what makes table bloat dangerous when paired with autovacuum latency?',
  },
};

interface StealthWelcomeHeroProps {
  isCapturing: boolean;
  isAnalyzingScreenshot: boolean;
  isCopilotGenerating?: boolean;
  candidateProfile?: CandidateProfile | null;
  audioSource?: 'tab' | 'mic';
  onSelectAudioSource?: (source: 'tab' | 'mic') => void;
  onStartCapture: (source?: 'tab' | 'mic') => void;
  onTriggerScreenshot: () => void;
  onInjectTest: (q: string) => void;
  onOpenSoundCheck?: () => void;
  onOpenProfile?: () => void;
  onSelectPresetProfile?: (profile: CandidateProfile) => void;
}

export const StealthWelcomeHero: React.FC<StealthWelcomeHeroProps> = ({
  isCapturing,
  isAnalyzingScreenshot,
  isCopilotGenerating = false,
  candidateProfile = null,
  audioSource = 'tab',
  onSelectAudioSource,
  onStartCapture,
  onTriggerScreenshot,
  onInjectTest,
  onOpenSoundCheck,
  onOpenProfile,
  onSelectPresetProfile,
}) => {
  const { locale } = useLocale();
  const hud = getHudTranslations(locale).welcome;
  const isUa = locale === 'ua';

  const [isEditingCustomRole, setIsEditingCustomRole] = useState(false);
  const [inlineRoleInput, setInlineRoleInput] = useState(candidateProfile?.role || '');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isScanningCV, setIsScanningCV] = useState(false);
  const [isTextModalOpen, setIsTextModalOpen] = useState(false);
  const [pastedCvText, setPastedCvText] = useState('');
  const [isAddingCustomTag, setIsAddingCustomTag] = useState(false);
  const [newTagInput, setNewTagInput] = useState('');

  const handleProcessCvFile = async (file: File) => {
    if (file.size > 15 * 1024 * 1024) {
      toast.error(isUa ? 'Розмір файлу занадто великий (макс 15 МБ)' : 'File size too large (max 15MB)');
      return;
    }

    setIsScanningCV(true);
    try {
      let fileBase64 = '';
      let rawText = '';
      const isTextFile = file.name.endsWith('.txt') || file.name.endsWith('.md') || file.type.startsWith('text/');

      if (isTextFile) {
        rawText = await file.text();
      } else {
        fileBase64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      }

      const res = await fetch('/api/ai/parse-resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileBase64,
          mimeType: file.type || 'application/pdf',
          rawText,
          fileName: file.name,
        }),
      });

      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error || 'Failed to parse resume');
      }

      const data = (await res.json()) as {
        profile?: {
          role?: string;
          level?: 'junior' | 'middle' | 'senior' | 'lead';
          techStack?: string[];
          summary?: string;
          cvContext?: string;
        };
      };

      if (data.profile) {
        const newProfile: CandidateProfile = {
          age: candidateProfile?.age || 24,
          level: data.profile.level || candidateProfile?.level || 'middle',
          role: data.profile.role || candidateProfile?.role || 'Software Engineer',
          techStack: data.profile.techStack || candidateProfile?.techStack || [],
          petProjects: candidateProfile?.petProjects || [],
          customContext: data.profile.summary || candidateProfile?.customContext || '',
          jobDescription: candidateProfile?.jobDescription,
          cvContext: data.profile.cvContext || candidateProfile?.cvContext || '',
        };

        try {
          localStorage.setItem('ghostboard_candidate_profile', JSON.stringify(newProfile));
        } catch {}

        onSelectPresetProfile?.(newProfile);
        toast.success(
          isUa
            ? `AI проаналізував ${file.name}! Стек сформовано.`
            : `AI analyzed ${file.name}! Ready tech stack generated.`
        );
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error parsing resume';
      toast.error(msg);
    } finally {
      setIsScanningCV(false);
    }
  };

  const handleProcessPastedText = async () => {
    if (!pastedCvText.trim()) return;
    setIsScanningCV(true);
    try {
      const res = await fetch('/api/ai/parse-resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rawText: pastedCvText.trim(),
          fileName: 'pasted_cv.txt',
        }),
      });

      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error || 'Failed to parse resume');
      }

      const data = (await res.json()) as {
        profile?: {
          role?: string;
          level?: 'junior' | 'middle' | 'senior' | 'lead';
          techStack?: string[];
          summary?: string;
          cvContext?: string;
        };
      };

      if (data.profile) {
        const newProfile: CandidateProfile = {
          age: candidateProfile?.age || 24,
          level: data.profile.level || candidateProfile?.level || 'middle',
          role: data.profile.role || candidateProfile?.role || 'Software Engineer',
          techStack: data.profile.techStack || candidateProfile?.techStack || [],
          petProjects: candidateProfile?.petProjects || [],
          customContext: data.profile.summary || candidateProfile?.customContext || '',
          jobDescription: candidateProfile?.jobDescription,
          cvContext: data.profile.cvContext || candidateProfile?.cvContext || '',
        };

        try {
          localStorage.setItem('ghostboard_candidate_profile', JSON.stringify(newProfile));
        } catch {}

        onSelectPresetProfile?.(newProfile);
        setIsTextModalOpen(false);
        setPastedCvText('');
        toast.success(
          isUa
            ? 'AI проаналізував текст резюме! Стек сформовано.'
            : 'AI analyzed resume text! Ready tech stack generated.'
        );
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error parsing resume';
      toast.error(msg);
    } finally {
      setIsScanningCV(false);
    }
  };

  const handleRemoveTechTag = (tagToRemove: string) => {
    const currentStack = candidateProfile?.techStack || [];
    const updatedStack = currentStack.filter((t) => t !== tagToRemove);
    const newProfile: CandidateProfile = {
      age: candidateProfile?.age || 24,
      level: candidateProfile?.level || 'middle',
      role: candidateProfile?.role || 'Software Engineer',
      techStack: updatedStack,
      petProjects: candidateProfile?.petProjects || [],
      customContext: candidateProfile?.customContext || '',
      jobDescription: candidateProfile?.jobDescription,
      cvContext: candidateProfile?.cvContext || '',
    };
    try {
      localStorage.setItem('ghostboard_candidate_profile', JSON.stringify(newProfile));
    } catch {}
    onSelectPresetProfile?.(newProfile);
  };

  const handleAddCustomTag = () => {
    const clean = newTagInput.trim();
    if (!clean) {
      setIsAddingCustomTag(false);
      return;
    }
    const currentStack = candidateProfile?.techStack || [];
    if (!currentStack.includes(clean)) {
      const updatedStack = [...currentStack, clean];
      const newProfile: CandidateProfile = {
        age: candidateProfile?.age || 24,
        level: candidateProfile?.level || 'middle',
        role: candidateProfile?.role || 'Software Engineer',
        techStack: updatedStack,
        petProjects: candidateProfile?.petProjects || [],
        customContext: candidateProfile?.customContext || '',
        jobDescription: candidateProfile?.jobDescription,
        cvContext: candidateProfile?.cvContext || '',
      };
      try {
        localStorage.setItem('ghostboard_candidate_profile', JSON.stringify(newProfile));
      } catch {}
      onSelectPresetProfile?.(newProfile);
    }
    setNewTagInput('');
    setIsAddingCustomTag(false);
  };

  useEffect(() => {
    if (candidateProfile?.role) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setInlineRoleInput(candidateProfile.role);
    }
  }, [candidateProfile?.role]);

  const handleSaveInlineRole = () => {
    const clean = inlineRoleInput.trim();
    if (!clean) {
      setIsEditingCustomRole(false);
      return;
    }
    const newProfile: CandidateProfile = {
      age: candidateProfile?.age || 24,
      level: candidateProfile?.level || 'middle',
      role: clean,
      techStack: candidateProfile?.techStack ? [...candidateProfile.techStack] : [],
      petProjects: candidateProfile?.petProjects ? [...candidateProfile.petProjects] : [],
      customContext: candidateProfile?.customContext || '',
      jobDescription: candidateProfile?.jobDescription,
      cvContext: candidateProfile?.cvContext,
    };
    try {
      localStorage.setItem('ghostboard_candidate_profile', JSON.stringify(newProfile));
    } catch {}
    onSelectPresetProfile?.(newProfile);
    setIsEditingCustomRole(false);
    toast.success(isUa ? `Вакансію оновлено: ${clean}` : `Target role updated: ${clean}`);
  };

  const sampleQ = QUICK_TEST_QUESTIONS[locale] || QUICK_TEST_QUESTIONS.en;

  return (
    <div className="flex-1 flex flex-col items-center justify-center py-4 sm:py-6 text-center relative w-full select-none animate-in fade-in duration-300">
      
      {/* ── 3D HEADPHONES MASCOT IN AMBIENT PORTAL ── */}
      <div className="relative mx-auto mb-4 group">
        {/* Radial Ambient Backlight Aura */}
        <div className="absolute -inset-5 rounded-full bg-gradient-to-r from-violet-600/25 via-indigo-500/20 to-cyan-500/20 blur-2xl group-hover:blur-3xl transition-all duration-700 opacity-80 pointer-events-none" />

        <div className="relative w-28 h-28 sm:w-36 sm:h-36 rounded-[2rem] overflow-hidden border border-white/15 shadow-[0_16px_50px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(255,255,255,0.25)] bg-[#070709] flex items-center justify-center backdrop-blur-2xl">
          <video
            src="/videos/headphones.mp4"
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
            className="w-full h-full object-cover scale-105"
          />
          <div className="absolute bottom-2 inset-x-0 flex justify-center pointer-events-none">
            <span className="text-[9px] font-mono tracking-widest text-zinc-300 uppercase bg-black/70 px-2 py-0.5 rounded-full border border-white/15 backdrop-blur-md shadow-sm">
              AI READY
            </span>
          </div>
        </div>
      </div>

      {/* ── TOP BADGE & PRE-FLIGHT STATUS ── */}
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/10 text-zinc-300 font-mono text-[11px] font-medium mb-2.5 backdrop-blur-xl">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
        <span className="tracking-widest uppercase text-zinc-300">PRE-FLIGHT COCKPIT</span>
        <span className="text-zinc-600">·</span>
        <span className="text-zinc-400">16kHz Web Audio</span>
        <span className="text-zinc-600">·</span>
        <span className="text-zinc-400">Gemini 2.5 Flash</span>
      </div>

      {/* ── SLEEK TITLE ── */}
      <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight font-sans mb-1.5">
        {hud.readyTitle}
      </h1>
      <p className="text-xs sm:text-sm text-zinc-400 max-w-xl mx-auto leading-relaxed font-sans mb-6">
        {hud.readySubtitle}
      </p>

      {/* ── BENTO GRID COCKPIT (840px Linear Noir) ── */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 w-full mb-3.5">
        
        {/* BENTO CARD 1: Target Role, CV & Tech Stack (7 cols) */}
        <div className="md:col-span-7 rounded-2xl bg-[#0D0D10]/95 border border-white/[0.1] shadow-[0_16px_40px_rgba(0,0,0,0.65)] p-5 text-left space-y-4 backdrop-blur-2xl flex flex-col justify-between">
          <div className="space-y-3.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-300 font-semibold font-mono uppercase tracking-wider text-[11px] flex items-center gap-2">
                <Briefcase className="w-3.5 h-3.5 text-zinc-400" />
                <span>{isUa ? 'Цільова посада & стек' : 'Target Vacancy & Tech Stack'}</span>
              </span>
              {onOpenProfile && (
                <button
                  type="button"
                  onClick={onOpenProfile}
                  className="text-[11px] text-zinc-400 hover:text-white transition-colors flex items-center gap-1 cursor-pointer font-sans"
                >
                  <Settings className="w-3 h-3 text-zinc-400" />
                  <span>{isUa ? 'Детальний профіль' : 'Full Profile'}</span>
                  <ChevronRight className="w-3 h-3 text-zinc-500" />
                </button>
              )}
            </div>

            {/* Active Vacancy Spotlight Card / Quick Edit */}
            <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.08] hover:border-white/15 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              {isEditingCustomRole ? (
                <div className="flex-1 flex items-center gap-2">
                  <input
                    type="text"
                    autoFocus
                    value={inlineRoleInput}
                    onChange={(e) => setInlineRoleInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveInlineRole();
                      if (e.key === 'Escape') setIsEditingCustomRole(false);
                    }}
                    placeholder={isUa ? "Введіть назву вакансії (напр. Senior Python Dev у Revolut)" : "Target job title (e.g. Senior Python Dev at Revolut)"}
                    className="flex-1 bg-black/60 border border-white/20 rounded-lg px-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none font-sans"
                  />
                  <button
                    type="button"
                    onClick={handleSaveInlineRole}
                    className="px-3 py-1.5 rounded-lg bg-white text-zinc-950 text-xs font-semibold cursor-pointer shrink-0 hover:bg-zinc-200 transition-colors"
                  >
                    {isUa ? 'Зберегти' : 'Save'}
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0 shadow-[0_0_8px_#34d399]" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-white tracking-tight truncate">
                        {candidateProfile?.role || 'Full-Stack Developer'}
                      </span>
                      <span className="text-[9px] font-mono uppercase bg-emerald-500/10 text-emerald-300 border border-emerald-500/25 px-2 py-0.5 rounded font-bold">
                        {candidateProfile?.level || 'middle'}
                      </span>
                    </div>
                    <div className="text-[11px] text-zinc-400 truncate mt-0.5 font-sans">
                      {isUa ? 'Режим відповіді: Technical Deep Dive' : 'Mode: Technical Deep Dive'} · Gemini Flash
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsEditingCustomRole(true)}
                    className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer shrink-0"
                    title={isUa ? 'Змінити назву посади' : 'Edit target job title'}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* AI Resume & Tech Stack Extractor */}
            <input
              type="file"
              ref={fileInputRef}
              accept=".pdf,.doc,.docx,.txt,.md,image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleProcessCvFile(file);
                e.target.value = '';
              }}
            />

            {/* If scanning */}
            {isScanningCV ? (
              <div className="p-4 rounded-xl bg-white/[0.04] border border-white/20 flex flex-col items-center justify-center gap-2 text-center animate-pulse">
                <RefreshCw className="w-5 h-5 text-zinc-300 animate-spin" />
                <div className="text-xs font-bold text-white">
                  {isUa ? 'AI сканує резюме та формує стек...' : 'AI is reading CV & generating tech stack...'}
                </div>
                <div className="text-[11px] text-zinc-400 font-mono">
                  {isUa ? 'Витягуємо технології, вакансію та рівень' : 'Extracting role, seniority & framework tags'}
                </div>
              </div>
            ) : (
              <div className="space-y-2.5">
                {candidateProfile?.techStack && candidateProfile.techStack.length > 0 ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-zinc-300 flex items-center gap-1.5 font-mono">
                        <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                        <span>{isUa ? `Стек для інтервʼю (${candidateProfile.techStack.length})` : `Interview Tech Stack (${candidateProfile.techStack.length})`}</span>
                      </span>

                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="text-[10px] text-indigo-300 hover:text-indigo-200 flex items-center gap-1 transition-colors cursor-pointer font-sans"
                      >
                        <FileUp className="w-3 h-3 text-indigo-400" />
                        <span>{isUa ? 'Завантажити інше CV' : 'Re-upload CV'}</span>
                      </button>
                    </div>

                    {/* Chips */}
                    <div className="flex flex-wrap gap-1.5 items-center">
                      {candidateProfile.techStack.map((tech) => (
                        <span
                          key={tech}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/10 text-xs font-mono text-zinc-200 group hover:border-white/30 transition-all"
                        >
                          <span>{tech}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveTechTag(tech)}
                            className="text-zinc-500 hover:text-rose-400 p-0.5 rounded cursor-pointer transition-colors"
                            title={isUa ? `Видалити ${tech}` : `Remove ${tech}`}
                          >
                            <X className="w-2.5 h-2.5" />
                          </button>
                        </span>
                      ))}

                      {/* Add Tag */}
                      {isAddingCustomTag ? (
                        <div className="inline-flex items-center gap-1">
                          <input
                            type="text"
                            autoFocus
                            value={newTagInput}
                            onChange={(e) => setNewTagInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleAddCustomTag();
                              if (e.key === 'Escape') setIsAddingCustomTag(false);
                            }}
                            placeholder={isUa ? "Технологія (Enter)" : "Tech (Enter)"}
                            className="bg-black border border-white/20 rounded-lg px-2 py-0.5 text-xs text-white placeholder-zinc-500 focus:outline-none font-mono w-28"
                          />
                          <button
                            type="button"
                            onClick={handleAddCustomTag}
                            className="px-2 py-0.5 rounded bg-white text-black text-xs font-semibold cursor-pointer"
                          >
                            ✓
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setIsAddingCustomTag(true)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-dashed border-white/15 text-zinc-400 hover:text-white hover:border-white/30 text-xs font-mono transition-all cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                          <span>{isUa ? 'Додати' : 'Add'}</span>
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  /* Drag & Drop Upload Zone */
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="p-3.5 rounded-xl bg-white/[0.02] hover:bg-white/[0.04] border border-dashed border-white/15 hover:border-white/30 transition-all flex items-center justify-between gap-3 cursor-pointer group"
                  >
                    <div className="flex items-center gap-3 text-left">
                      <div className="w-8 h-8 rounded-lg bg-white/[0.06] border border-white/15 flex items-center justify-center text-zinc-300 group-hover:scale-105 transition-transform shrink-0">
                        <UploadCloud className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white group-hover:text-zinc-200 transition-colors">
                          {isUa ? 'Завантажити резюме (PDF, DOCX, TXT)' : 'Upload Resume / CV (PDF, DOCX)'}
                        </div>
                        <div className="text-[11px] text-zinc-400 mt-0.5">
                          {isUa ? 'AI автоматично визначить стек та контекст' : 'AI will instantly extract stack & context'}
                        </div>
                      </div>
                    </div>

                    <span className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11px] font-semibold transition-colors shrink-0">
                      {isUa ? 'Обрати файл' : 'Choose File'}
                    </span>
                  </div>
                )}

                {/* Paste Text Accordion Toggle */}
                <div className="flex items-center justify-between text-[11px] px-1 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsTextModalOpen((p) => !p)}
                    className="text-zinc-500 hover:text-zinc-300 transition-colors flex items-center gap-1 cursor-pointer font-sans"
                  >
                    <FileText className="w-3 h-3" />
                    <span>{isTextModalOpen ? (isUa ? 'Приховати поле тексту' : 'Hide text input') : (isUa ? 'Вставити текст резюме вручну' : 'Or paste CV text directly')}</span>
                  </button>
                  {candidateProfile?.cvContext ? (
                    <span className="text-emerald-400/90 font-mono text-[10px] flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                      <span>{isUa ? 'CV контекст підключено' : 'CV context attached'}</span>
                    </span>
                  ) : null}
                </div>

                {isTextModalOpen && (
                  <div className="p-3 rounded-xl bg-black/60 border border-white/10 space-y-2 animate-in fade-in duration-150">
                    <textarea
                      rows={3}
                      value={pastedCvText}
                      onChange={(e) => setPastedCvText(e.target.value)}
                      placeholder={isUa ? "Вставте текст резюме, список навичок або посилання на досвід..." : "Paste resume text, skills list, or experience summary..."}
                      className="w-full bg-white/[0.03] border border-white/10 rounded-lg p-2 text-xs text-white placeholder-zinc-500 focus:outline-none font-sans focus:border-white/30 resize-none"
                    />
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setIsTextModalOpen(false)}
                        className="px-2.5 py-1 text-xs text-zinc-400 hover:text-white cursor-pointer"
                      >
                        {isUa ? 'Скасувати' : 'Cancel'}
                      </button>
                      <button
                        type="button"
                        onClick={handleProcessPastedText}
                        disabled={!pastedCvText.trim() || isScanningCV}
                        className="px-3 py-1 rounded-lg bg-white text-black font-semibold text-xs flex items-center gap-1.5 hover:bg-zinc-200 transition-colors disabled:opacity-50 cursor-pointer"
                      >
                        <Sparkles className="w-3 h-3" />
                        <span>{isUa ? 'Сформувати стек' : 'Extract Stack'}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* BENTO CARD 2: Audio Capture Source & System Diagnostics (5 cols) */}
        <div className="md:col-span-5 rounded-2xl bg-[#0D0D10]/95 border border-white/[0.1] shadow-[0_16px_40px_rgba(0,0,0,0.65)] p-5 text-left space-y-4 backdrop-blur-2xl flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-zinc-300 font-semibold uppercase tracking-wider text-[11px] flex items-center gap-2">
                <Volume2 className="w-3.5 h-3.5 text-zinc-400" />
                <span>{isUa ? 'Джерело звуку' : 'Interviewer Audio'}</span>
              </span>
              <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 font-mono">
                Optimal
              </span>
            </div>

            {/* Direct Digital Meeting Tab Stream */}
            <button
              type="button"
              onClick={() => onSelectAudioSource?.('tab')}
              className={`w-full p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between group ${
                audioSource === 'tab'
                  ? 'bg-white/[0.08] border-white/30 text-white shadow-sm ring-1 ring-white/20'
                  : 'bg-white/[0.02] hover:bg-white/[0.05] border-white/[0.06] text-zinc-400'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className="text-lg">🌐</span>
                <div>
                  <div className="text-xs font-mono font-bold flex items-center gap-1.5 text-white">
                    <span>{hud.tabOption}</span>
                  </div>
                  <div className="text-[10px] font-sans text-zinc-400 mt-0.5">
                    {isUa ? 'Вкладка дзвінка + Ваш мікрофон' : 'Direct digital meeting stream'}
                  </div>
                </div>
              </div>
              {audioSource === 'tab' ? (
                <span className="w-4 h-4 rounded-full bg-white text-black flex items-center justify-center text-[10px] font-bold">✓</span>
              ) : (
                <span className="w-4 h-4 rounded-full border border-white/20" />
              )}
            </button>

            {/* Acoustic Mic Pick */}
            <button
              type="button"
              onClick={() => onSelectAudioSource?.('mic')}
              className={`w-full p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between group ${
                audioSource === 'mic'
                  ? 'bg-white/[0.08] border-white/30 text-white shadow-sm ring-1 ring-white/20'
                  : 'bg-white/[0.02] hover:bg-white/[0.05] border-white/[0.06] text-zinc-400'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className="text-lg">🎙️</span>
                <div>
                  <div className="text-xs font-mono font-bold flex items-center gap-1.5 text-white">
                    <span>{hud.micOption}</span>
                  </div>
                  <div className="text-[10px] font-sans text-zinc-400 mt-0.5">
                    {isUa ? 'Тільки фізичний мікрофон ПК' : 'Acoustic room speaker capture'}
                  </div>
                </div>
              </div>
              {audioSource === 'mic' ? (
                <span className="w-4 h-4 rounded-full bg-white text-black flex items-center justify-center text-[10px] font-bold">✓</span>
              ) : (
                <span className="w-4 h-4 rounded-full border border-white/20" />
              )}
            </button>
          </div>

          {/* Sound Check Trigger & Diagnostics */}
          <div className="space-y-2 pt-2 border-t border-white/[0.06]">
            {onOpenSoundCheck && (
              <button
                type="button"
                onClick={onOpenSoundCheck}
                className="w-full py-2.5 px-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-xs font-mono text-zinc-200 hover:text-white transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
              >
                <Volume2 className="w-3.5 h-3.5 text-zinc-400" />
                <span>{isUa ? 'Перевірити звук мікрофона' : 'Sound Check & Levels'}</span>
              </button>
            )}

            <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500 px-1">
              <span className="flex items-center gap-1">
                <Zap className="w-3 h-3 text-amber-400" />
                <span>Latency: &lt; 1.2s</span>
              </span>
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                <span>Stealth HUD: Active</span>
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* ── BOTTOM LAUNCHPAD: UNIFIED HERO CTA (NO DUPLICATE DOCK) ── */}
      <div className="w-full rounded-2xl bg-[#0D0D10]/95 border border-white/[0.12] shadow-[0_20px_50px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.1)] p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 backdrop-blur-2xl">
        <div className="flex items-center gap-3 text-left">
          <div className="w-10 h-10 rounded-xl bg-white/[0.06] border border-white/10 flex items-center justify-center text-zinc-200 shrink-0">
            <Zap className="w-5 h-5 text-zinc-100" />
          </div>
          <div>
            <div className="text-xs font-bold text-white font-mono flex items-center gap-2">
              <span>READY TO ENGAGE</span>
              <span className="text-[10px] text-emerald-400 font-normal">● 0ms Web Audio Pipeline</span>
            </div>
            <div className="text-[11px] text-zinc-400 mt-0.5 font-sans">
              {isUa ? (
                <>
                  Натисніть <kbd className="px-1.5 py-0.5 rounded bg-black/60 border border-white/20 font-mono text-white text-[10px]">Space</kbd> або кнопку щоб запустити прослуховування дзвінка
                </>
              ) : (
                <>
                  Press <kbd className="px-1.5 py-0.5 rounded bg-black/60 border border-white/20 font-mono text-white text-[10px]">Space</kbd> or click to begin listening to your interview call
                </>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons Row */}
        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          {/* Secondary 1: Screen OCR */}
          <button
            type="button"
            onClick={onTriggerScreenshot}
            disabled={isAnalyzingScreenshot}
            className="px-3.5 py-3 rounded-xl bg-white/[0.05] hover:bg-white/10 border border-white/10 text-xs font-mono text-zinc-300 hover:text-white transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0"
            title={isUa ? 'OCR скриншоту коду (F9)' : 'Screen OCR Code Analysis (F9)'}
          >
            <Camera className="w-3.5 h-3.5 text-zinc-400" />
            <span className="hidden sm:inline">Screen OCR</span>
            <kbd className="text-[10px] text-zinc-400 font-mono px-1 py-0.2 rounded bg-black/40 border border-white/10">
              F9
            </kbd>
          </button>

          {/* Secondary 2: Sample Test */}
          <button
            type="button"
            disabled={isCopilotGenerating}
            onClick={() => onInjectTest(sampleQ.q)}
            className="px-3.5 py-3 rounded-xl bg-white/[0.05] hover:bg-white/10 border border-white/10 text-xs font-mono text-zinc-300 hover:text-white transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0"
            title={isUa ? 'Тестове запитання ШІ' : 'Sample Test AI Question'}
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-300" />
            <span className="hidden sm:inline">{isUa ? 'Тест' : 'Test'}</span>
          </button>

          {/* Primary Engage Button */}
          <button
            type="button"
            onClick={() => onStartCapture(audioSource)}
            className="flex-1 sm:flex-initial px-6 py-3 rounded-xl bg-white hover:bg-zinc-100 text-black font-extrabold text-sm font-mono tracking-wider uppercase transition-all shadow-[0_0_35px_rgba(255,255,255,0.25)] hover:shadow-[0_0_45px_rgba(255,255,255,0.4)] active:scale-95 cursor-pointer flex items-center justify-center gap-2.5"
          >
            <Play className="w-4 h-4 fill-black" />
            <span>{hud.startInterview}</span>
            <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/15 font-bold">
              Space
            </kbd>
          </button>
        </div>
      </div>

      {/* ── STEALTH KEYBOARD MATRIX LEGEND ── */}
      <div className="flex flex-wrap items-center justify-center gap-4 text-[11px] font-mono text-zinc-500 pt-3">
        <div className="flex items-center gap-1.5">
          <kbd className="px-1.5 py-0.5 rounded bg-black/50 border border-white/10 text-zinc-400">Space</kbd>
          <span>{isUa ? 'Запуск / Заморозити екран' : 'Start / Freeze Card'}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <kbd className="px-1.5 py-0.5 rounded bg-black/50 border border-white/10 text-zinc-400">F9</kbd>
          <span>{isUa ? 'Аналіз скриншоту коду' : 'Screen OCR (LeetCode)'}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <kbd className="px-1.5 py-0.5 rounded bg-black/50 border border-white/10 text-zinc-400">Q</kbd>
          <span>{isUa ? 'Короткі бліц-відповіді' : 'Concise Blitz Answers'}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <kbd className="px-1.5 py-0.5 rounded bg-black/50 border border-white/10 text-zinc-400">Esc</kbd>
          <span>{isUa ? 'Panic Shield (маскування)' : 'Panic Shield (Emergency)'}</span>
        </div>
      </div>

    </div>
  );
};
