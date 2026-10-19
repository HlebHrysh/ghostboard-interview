'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Camera,
  Sparkles,
  Volume2,
  Briefcase,
  UploadCloud,
  X,
  RefreshCw,
  Zap,
  Settings,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { CandidateProfile, DEFAULT_CANDIDATE_PROFILE } from '@/components/CandidateProfileModal';
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

  const [targetRoleInput, setTargetRoleInput] = useState(candidateProfile?.role || '');
  const [customNuancesInput, setCustomNuancesInput] = useState(
    candidateProfile?.customNuances || (isUa ? 'Від першого лиця, з реальними кейсами, впевнено і по-простому' : 'First-person, real-world cases, confident and pragmatic')
  );
  const [isScanningCV, setIsScanningCV] = useState(false);
  const [isTextModalOpen, setIsTextModalOpen] = useState(false);
  const [pastedCvText, setPastedCvText] = useState('');
  const [isJobDescOpen, setIsJobDescOpen] = useState(false);
  const [jobDescInput, setJobDescInput] = useState(candidateProfile?.jobDescription || '');
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [newTagInput, setNewTagInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (candidateProfile?.role) {
      setTargetRoleInput(candidateProfile.role);
    }
    if (candidateProfile?.customNuances) {
      setCustomNuancesInput(candidateProfile.customNuances);
    }
    if (candidateProfile?.jobDescription) {
      setJobDescInput(candidateProfile.jobDescription);
    }
  }, [candidateProfile]);

  const updateProfile = (partial: Partial<CandidateProfile>) => {
    const updated: CandidateProfile = {
      ...(candidateProfile || DEFAULT_CANDIDATE_PROFILE),
      ...partial,
    };
    try {
      localStorage.setItem('ghostboard_candidate_profile', JSON.stringify(updated));
    } catch {}
    onSelectPresetProfile?.(updated);
  };

  const handleRoleChange = (newRole: string) => {
    setTargetRoleInput(newRole);
    updateProfile({ role: newRole });
  };

  const handleNuancesChange = (newNuances: string) => {
    setCustomNuancesInput(newNuances);
    updateProfile({ customNuances: newNuances });
  };

  const handleJobDescChange = (newDesc: string) => {
    setJobDescInput(newDesc);
    updateProfile({ jobDescription: newDesc });
  };

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
          keyProjects?: string[];
          speakingStyleBrief?: string;
          cvContext?: string;
        };
      };

      if (data.profile) {
        const p = data.profile;
        const newProfile: CandidateProfile = {
          age: candidateProfile?.age || 25,
          level: p.level || candidateProfile?.level || 'middle',
          role: p.role || candidateProfile?.role || 'Software Engineer',
          techStack: p.techStack || candidateProfile?.techStack || [],
          petProjects: p.keyProjects?.map((proj, idx) => ({
            id: `proj_${idx}`,
            name: proj,
            description: proj,
            keyHighlight: proj,
          })) || candidateProfile?.petProjects || [],
          customContext: p.summary || candidateProfile?.customContext || '',
          cvContext: p.cvContext || candidateProfile?.cvContext || '',
          speakingStyle: p.speakingStyleBrief || candidateProfile?.speakingStyle || '',
          speakingStyleBrief: p.speakingStyleBrief || candidateProfile?.speakingStyleBrief || '',
          customNuances: customNuancesInput || (isUa ? 'Від першого лиця, з реальними кейсами, впевнено і по-простому' : 'First-person, real-world cases, confident and pragmatic'),
          jobDescription: jobDescInput || candidateProfile?.jobDescription || '',
        };

        updateProfile(newProfile);
        setTargetRoleInput(newProfile.role);
        toast.success(
          isUa
            ? `AI прочитав резюме! Посада: ${newProfile.role}`
            : `AI analyzed resume! Role: ${newProfile.role}`
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
          keyProjects?: string[];
          speakingStyleBrief?: string;
          cvContext?: string;
        };
      };

      if (data.profile) {
        const p = data.profile;
        const newProfile: CandidateProfile = {
          age: candidateProfile?.age || 25,
          level: p.level || candidateProfile?.level || 'middle',
          role: p.role || candidateProfile?.role || 'Software Engineer',
          techStack: p.techStack || candidateProfile?.techStack || [],
          petProjects: p.keyProjects?.map((proj, idx) => ({
            id: `proj_${idx}`,
            name: proj,
            description: proj,
            keyHighlight: proj,
          })) || candidateProfile?.petProjects || [],
          customContext: p.summary || candidateProfile?.customContext || '',
          cvContext: p.cvContext || candidateProfile?.cvContext || '',
          speakingStyle: p.speakingStyleBrief || candidateProfile?.speakingStyle || '',
          speakingStyleBrief: p.speakingStyleBrief || candidateProfile?.speakingStyleBrief || '',
          customNuances: customNuancesInput || (isUa ? 'Від першого лиця, з реальними кейсами, впевнено і по-простому' : 'First-person, real-world cases, confident and pragmatic'),
          jobDescription: jobDescInput || candidateProfile?.jobDescription || '',
        };

        updateProfile(newProfile);
        setTargetRoleInput(newProfile.role);
        setIsTextModalOpen(false);
        setPastedCvText('');
        toast.success(
          isUa
            ? `AI адаптував профіль за текстом резюме!`
            : `AI adapted profile from resume text!`
        );
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error parsing resume text';
      toast.error(msg);
    } finally {
      setIsScanningCV(false);
    }
  };

  const handleRemoveTechTag = (tag: string) => {
    const updated = (candidateProfile?.techStack || []).filter((t) => t !== tag);
    updateProfile({ techStack: updated });
  };

  const handleAddTag = () => {
    const clean = newTagInput.trim();
    if (!clean) {
      setIsAddingTag(false);
      return;
    }
    const current = candidateProfile?.techStack || [];
    if (!current.includes(clean)) {
      updateProfile({ techStack: [...current, clean] });
    }
    setNewTagInput('');
    setIsAddingTag(false);
  };

  const handleClearCv = () => {
    updateProfile({
      cvContext: '',
      speakingStyle: '',
      speakingStyleBrief: '',
    });
    toast.info(isUa ? 'Контекст резюме очищено' : 'Resume context cleared');
  };

  const styleChips = isUa
    ? [
        { label: '🗣️ Від першого лиця', value: 'Від першого лиця, з реальними кейсами з досвіду' },
        { label: '⚡ Коротко і по суті', value: 'Коротко, без води, чіткі тези по 1-2 речення' },
        { label: '🏗️ Архітектура та трейдоффи', value: 'Упор на архітектуру, надійність в продакшені та трейдоффи' },
      ]
    : [
        { label: '🗣️ First-person story', value: 'First-person, real-world experience from production' },
        { label: '⚡ Concise & Punchy', value: 'Concise, zero fluff, tight punchlines' },
        { label: '🏗️ Architecture & Trade-offs', value: 'Focus on system architecture, bottlenecks, and trade-offs' },
      ];

  const sampleQ = QUICK_TEST_QUESTIONS[locale] || QUICK_TEST_QUESTIONS.en;
  const hasCvAttached = Boolean(candidateProfile?.cvContext);

  return (
    <div className="flex-1 flex flex-col items-center justify-center py-4 sm:py-6 text-center relative w-full select-none animate-in fade-in duration-200">
      
      {/* ── MINIMALIST HEADER ── */}
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/10 text-zinc-300 font-mono text-[11px] font-medium mb-3 backdrop-blur-xl">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
        <span className="tracking-widest uppercase text-zinc-300 font-bold">
          {isUa ? 'ШІ-КОПІЛОТ ДЛЯ СПІВБЕСІД' : 'AI INTERVIEW COPILOT'}
        </span>
        <span className="text-zinc-600">·</span>
        <span className="text-zinc-400">{isUa ? 'Готовий до запуску' : 'Ready to Engage'}</span>
      </div>

      <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight font-sans mb-1.5">
        {hud.readyTitle}
      </h1>
      <p className="text-xs sm:text-sm text-zinc-400 max-w-lg mx-auto leading-relaxed font-sans mb-6">
        {isUa
          ? 'Завантажте резюме або напишіть вакансію — ШІ говоритиме від вашого імені з реального досвіду'
          : 'Upload your resume or specify your role — AI will speak in your voice with real-world experience'}
      </p>

      {/* ── 2-CARD COMMAND MATRIX (Zero Clutter) ── */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 w-full mb-3.5">
        
        {/* CARD 1: Profile & Voice Setup (7 cols) */}
        <div className="md:col-span-7 rounded-2xl bg-[#0D0D10]/95 border border-white/[0.1] shadow-[0_16px_40px_rgba(0,0,0,0.65)] p-5 text-left space-y-4 backdrop-blur-2xl flex flex-col justify-between">
          <div className="space-y-3.5">
            
            {/* Header: Label + Full Settings link */}
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-300 font-semibold font-mono uppercase tracking-wider text-[11px] flex items-center gap-2">
                <Briefcase className="w-3.5 h-3.5 text-zinc-400" />
                <span>{isUa ? 'Ваш профіль та голос ШІ' : 'Profile & Voice Persona'}</span>
              </span>
              {onOpenProfile && (
                <button
                  type="button"
                  onClick={onOpenProfile}
                  className="text-[11px] text-zinc-400 hover:text-white transition-colors flex items-center gap-1 cursor-pointer font-sans"
                >
                  <Settings className="w-3 h-3 text-zinc-400" />
                  <span>{isUa ? 'Детальніше' : 'Details'}</span>
                </button>
              )}
            </div>

            {/* Resume Upload / Attached Card */}
            <input
              type="file"
              ref={fileInputRef}
              accept=".pdf,.doc,.docx,.txt,.md"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleProcessCvFile(file);
                e.target.value = '';
              }}
            />

            {isScanningCV ? (
              <div className="p-4 rounded-xl bg-white/[0.04] border border-white/20 flex flex-col items-center justify-center gap-2 text-center animate-pulse">
                <RefreshCw className="w-5 h-5 text-zinc-200 animate-spin" />
                <div className="text-xs font-bold text-white">
                  {isUa ? 'AI читає резюме та підбирає стиль...' : 'AI is analyzing CV & tuning voice...'}
                </div>
              </div>
            ) : hasCvAttached ? (
              <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/30 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0 shadow-[0_0_8px_#34d399]" />
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-emerald-200 truncate flex items-center gap-1.5">
                      <span>✓ {isUa ? 'Резюме підключено' : 'Resume Connected'}</span>
                    </div>
                    <div className="text-[11px] text-zinc-400 truncate mt-0.5">
                      {candidateProfile?.role || 'Engineer'} · {candidateProfile?.techStack?.length || 0} {isUa ? 'навичок' : 'skills'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11px] font-semibold transition-colors cursor-pointer"
                  >
                    {isUa ? 'Замінити' : 'Replace'}
                  </button>
                  <button
                    type="button"
                    onClick={handleClearCv}
                    className="p-1 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-white/5 transition-colors cursor-pointer"
                    title={isUa ? 'Очистити резюме' : 'Clear resume'}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-white/[0.02] border border-dashed border-white/15 hover:border-white/30 transition-all flex items-center justify-between gap-2">
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2.5 cursor-pointer flex-1"
                >
                  <div className="w-7 h-7 rounded-lg bg-white/[0.06] flex items-center justify-center text-zinc-300 shrink-0">
                    <UploadCloud className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <div className="text-xs font-bold text-white">
                      {isUa ? 'Завантажити резюме (PDF, DOCX)' : 'Upload Resume (PDF, DOCX)'}
                    </div>
                    <div className="text-[10px] text-zinc-400">
                      {isUa ? 'AI миттєво підтягне досвід та манеру відповіді' : 'AI extracts stack, experience & voice'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11px] font-semibold transition-colors cursor-pointer"
                  >
                    {isUa ? 'Файл' : 'File'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsTextModalOpen((p) => !p)}
                    className="px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-white/10 text-zinc-300 hover:text-white text-[11px] font-medium transition-colors cursor-pointer"
                  >
                    {isUa ? 'Текст' : 'Text'}
                  </button>
                </div>
              </div>
            )}

            {/* Paste Text Modal Accordion */}
            {isTextModalOpen && !hasCvAttached && (
              <div className="p-3 rounded-xl bg-black/70 border border-white/10 space-y-2 animate-in fade-in duration-150">
                <textarea
                  rows={3}
                  value={pastedCvText}
                  onChange={(e) => setPastedCvText(e.target.value)}
                  placeholder={isUa ? 'Вставте текст резюме або список проєктів...' : 'Paste resume text or project summary...'}
                  className="w-full bg-white/[0.03] border border-white/10 rounded-lg p-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-white/30 resize-none font-sans"
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
                    <span>{isUa ? 'Обробити ШІ' : 'Analyze AI'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Input 1: Target Role / Vacancy */}
            <div className="space-y-1">
              <label className="text-[10px] font-mono uppercase text-zinc-400 font-bold block">
                {isUa ? 'Посада, на яку співбесідуєтесь' : 'Target Role / Vacancy'}
              </label>
              <input
                type="text"
                value={targetRoleInput}
                onChange={(e) => handleRoleChange(e.target.value)}
                placeholder={isUa ? 'Напр. Senior Backend Developer (Python / Go)' : 'e.g. Senior Backend Developer (Python / Go)'}
                className="w-full bg-white/[0.04] border border-white/10 hover:border-white/20 focus:border-white/40 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none transition-colors font-sans"
              />
            </div>

            {/* Input 2: How AI should speak (Custom Nuances) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-mono uppercase text-zinc-400 font-bold">
                  {isUa ? 'Як ШІ має відповідати (побажання)' : 'How AI Should Speak (Voice & Style)'}
                </label>
                <span className="text-[10px] text-zinc-500 font-mono">
                  {isUa ? 'від першого лиця' : 'first-person'}
                </span>
              </div>
              <input
                type="text"
                value={customNuancesInput}
                onChange={(e) => handleNuancesChange(e.target.value)}
                placeholder={isUa ? 'Напр. від першого лиця, з реальними кейсами, впевнено...' : 'e.g. first-person, real-world cases, confident, concise...'}
                className="w-full bg-white/[0.04] border border-white/10 hover:border-white/20 focus:border-white/40 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none transition-colors font-sans"
              />

              {/* Quick style chips */}
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {styleChips.map((chip) => (
                  <button
                    key={chip.label}
                    type="button"
                    onClick={() => handleNuancesChange(chip.value)}
                    className="px-2 py-0.5 rounded-lg bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.08] text-[10px] text-zinc-300 hover:text-white transition-all cursor-pointer font-sans"
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Tech Stack Chips preview */}
            {candidateProfile?.techStack && candidateProfile.techStack.length > 0 && (
              <div className="space-y-1.5 pt-1 border-t border-white/[0.06]">
                <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400">
                  <span>{isUa ? `Стек технологій (${candidateProfile.techStack.length})` : `Tech Stack (${candidateProfile.techStack.length})`}</span>
                </div>
                <div className="flex flex-wrap gap-1 items-center">
                  {candidateProfile.techStack.slice(0, 10).map((tech) => (
                    <span
                      key={tech}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/10 text-[11px] font-mono text-zinc-200"
                    >
                      <span>{tech}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveTechTag(tech)}
                        className="text-zinc-500 hover:text-rose-400 p-0.5 rounded cursor-pointer"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </span>
                  ))}

                  {isAddingTag ? (
                    <div className="inline-flex items-center gap-1">
                      <input
                        type="text"
                        autoFocus
                        value={newTagInput}
                        onChange={(e) => setNewTagInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleAddTag();
                          if (e.key === 'Escape') setIsAddingTag(false);
                        }}
                        placeholder="Tag (Enter)"
                        className="bg-black border border-white/20 rounded px-1.5 py-0.5 text-[11px] text-white font-mono w-20 focus:outline-none"
                      />
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsAddingTag(true)}
                      className="px-2 py-0.5 rounded border border-dashed border-white/15 text-zinc-400 hover:text-white text-[10px] font-mono cursor-pointer"
                    >
                      +
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Optional Job Description Toggle */}
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setIsJobDescOpen((p) => !p)}
                className="text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors flex items-center gap-1 cursor-pointer font-sans"
              >
                {isJobDescOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                <span>{isJobDescOpen ? (isUa ? 'Приховати опис вакансії' : 'Hide job description') : (isUa ? '+ Додати вимоги вакансії' : '+ Add job description')}</span>
              </button>

              {isJobDescOpen && (
                <div className="mt-2 space-y-1 animate-in fade-in duration-150">
                  <textarea
                    rows={2}
                    value={jobDescInput}
                    onChange={(e) => handleJobDescChange(e.target.value)}
                    placeholder={isUa ? 'Вставте текст вимог вакансії...' : 'Paste target job description requirements...'}
                    className="w-full bg-white/[0.03] border border-white/10 rounded-lg p-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-white/30 resize-none font-sans"
                  />
                </div>
              )}
            </div>

          </div>
        </div>

        {/* CARD 2: Audio Source & Quick Launch (5 cols) */}
        <div className="md:col-span-5 rounded-2xl bg-[#0D0D10]/95 border border-white/[0.1] shadow-[0_16px_40px_rgba(0,0,0,0.65)] p-5 text-left space-y-4 backdrop-blur-2xl flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-zinc-300 font-semibold uppercase tracking-wider text-[11px] flex items-center gap-2">
                <Volume2 className="w-3.5 h-3.5 text-zinc-400" />
                <span>{isUa ? 'Джерело звуку' : 'Audio Source'}</span>
              </span>
              <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 font-mono">
                16kHz Web Audio
              </span>
            </div>

            {/* Clean Segmented Controls (No Text Clutter) */}
            <div className="grid grid-cols-1 gap-2">
              <button
                type="button"
                onClick={() => onSelectAudioSource?.('tab')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                  audioSource === 'tab'
                    ? 'bg-white/[0.08] border-white/30 text-white shadow-sm ring-1 ring-white/20'
                    : 'bg-white/[0.02] hover:bg-white/[0.05] border-white/[0.06] text-zinc-400'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-base">🌐</span>
                  <div>
                    <div className="text-xs font-bold font-sans text-white">
                      {isUa ? 'Вкладка дзвінка (Meet / Zoom)' : 'Meeting Tab (Meet / Zoom)'}
                    </div>
                  </div>
                </div>
                {audioSource === 'tab' ? (
                  <span className="w-4 h-4 rounded-full bg-white text-black flex items-center justify-center text-[10px] font-bold">✓</span>
                ) : (
                  <span className="w-4 h-4 rounded-full border border-white/20" />
                )}
              </button>

              <button
                type="button"
                onClick={() => onSelectAudioSource?.('mic')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                  audioSource === 'mic'
                    ? 'bg-white/[0.08] border-white/30 text-white shadow-sm ring-1 ring-white/20'
                    : 'bg-white/[0.02] hover:bg-white/[0.05] border-white/[0.06] text-zinc-400'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-base">🎙️</span>
                  <div>
                    <div className="text-xs font-bold font-sans text-white">
                      {isUa ? 'Тільки мікрофон' : 'Microphone Only'}
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
          </div>

          {/* Quick Utilities Row */}
          <div className="space-y-2 pt-2 border-t border-white/[0.06]">
            <div className="grid grid-cols-2 gap-2">
              {onOpenSoundCheck && (
                <button
                  type="button"
                  onClick={onOpenSoundCheck}
                  className="py-2 px-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-xs font-mono text-zinc-300 hover:text-white transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Volume2 className="w-3.5 h-3.5 text-zinc-400" />
                  <span>{isUa ? 'Тест звуку' : 'Sound Check'}</span>
                </button>
              )}

              <button
                type="button"
                onClick={onTriggerScreenshot}
                disabled={isAnalyzingScreenshot}
                className="py-2 px-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-xs font-mono text-zinc-300 hover:text-white transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Camera className="w-3.5 h-3.5 text-zinc-400" />
                <span>Screen (F9)</span>
              </button>
            </div>

            <button
              type="button"
              disabled={isCopilotGenerating}
              onClick={() => onInjectTest(sampleQ.q)}
              className="w-full py-2 px-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.06] text-xs font-mono text-zinc-400 hover:text-white transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>{isUa ? 'Спробувати тестове питання' : 'Try sample test question'}</span>
            </button>
          </div>
        </div>

      </div>

      {/* ── BOTTOM LAUNCHPAD: PRIMARY ENGAGE CTA ── */}
      <div className="w-full rounded-2xl bg-[#0D0D10]/95 border border-white/[0.12] shadow-[0_20px_50px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.1)] p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 backdrop-blur-2xl">
        <div className="flex items-center gap-3 text-left">
          <div className="w-10 h-10 rounded-xl bg-white/[0.06] border border-white/10 flex items-center justify-center text-zinc-200 shrink-0">
            <Zap className="w-5 h-5 text-zinc-100" />
          </div>
          <div>
            <div className="text-xs font-bold text-white font-mono flex items-center gap-2">
              <span>{isUa ? 'ГОТОВИЙ ДО СПІВБЕСІДИ' : 'READY TO ENGAGE'}</span>
              <span className="text-[10px] text-emerald-400 font-normal">● STT Ready</span>
            </div>
            <div className="text-[11px] text-zinc-400 mt-0.5 font-sans">
              {isUa
                ? 'Натисніть кнопку або Space, щоб почати слухати інтервʼюера'
                : 'Press the button or Space to begin listening to your interview'}
            </div>
          </div>
        </div>

        {/* Primary CTA Button */}
        <button
          type="button"
          onClick={() => onStartCapture(audioSource)}
          className="w-full sm:w-auto px-6 py-3 rounded-xl bg-white hover:bg-zinc-100 text-black font-extrabold text-sm font-mono tracking-wider uppercase transition-all shadow-[0_0_35px_rgba(255,255,255,0.25)] hover:shadow-[0_0_45px_rgba(255,255,255,0.4)] active:scale-95 cursor-pointer flex items-center justify-center gap-2.5"
        >
          <Play className="w-4 h-4 fill-black" />
          <span>{hud.startInterview}</span>
          <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/15 font-bold">
            Space
          </kbd>
        </button>
      </div>

      {/* ── STEALTH KEYBOARD LEGEND (Clean 1-line) ── */}
      <div className="flex flex-wrap items-center justify-center gap-4 text-[11px] font-mono text-zinc-500 pt-3">
        <div className="flex items-center gap-1.5">
          <kbd className="px-1.5 py-0.5 rounded bg-black/50 border border-white/10 text-zinc-400">Space</kbd>
          <span>{isUa ? 'Старт / Пауза' : 'Start / Freeze'}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <kbd className="px-1.5 py-0.5 rounded bg-black/50 border border-white/10 text-zinc-400">F9</kbd>
          <span>Screen OCR</span>
        </div>
        <div className="flex items-center gap-1.5">
          <kbd className="px-1.5 py-0.5 rounded bg-black/50 border border-white/10 text-zinc-400">Q</kbd>
          <span>{isUa ? 'Бліц-відповіді' : 'Blitz'}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <kbd className="px-1.5 py-0.5 rounded bg-black/50 border border-white/10 text-zinc-400">Esc</kbd>
          <span>Panic Shield</span>
        </div>
      </div>

    </div>
  );
};
