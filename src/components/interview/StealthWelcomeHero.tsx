'use client';

import React, { useMemo } from 'react';
import { Play, Camera, Sparkles, Volume2, Briefcase, Settings, ChevronRight, Check } from 'lucide-react';
import { CandidateProfile, ROLE_PRESETS } from '@/components/CandidateProfileModal';
import { GhostDetectiveLogo } from '@/components/ui/GhostDetectiveLogo';
import { useLocale } from '@/contexts/LocaleContext';
import { getHudTranslations } from '@/lib/hudI18n';
import { toast } from 'sonner';

// ── Clean Role Presets without toy emojis (Linear Noir style) ─────────────────
const ROLES_LIST = [
  { key: 'fullstack', label: 'Full-Stack' },
  { key: 'frontend', label: 'React / Frontend' },
  { key: 'python_backend', label: 'Python / Backend' },
  { key: 'nodejs_backend', label: 'Node.js / TS' },
  { key: 'golang_backend', label: 'Go / HighLoad' },
  { key: 'java_backend', label: 'Java / Spring' },
  { key: 'devops', label: 'DevOps / Cloud' },
  { key: 'architecture', label: 'System Design / Architect' },
];

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

  const currentRole = candidateProfile?.role || 'Full-Stack Developer';
  const sampleQ = QUICK_TEST_QUESTIONS[locale] || QUICK_TEST_QUESTIONS.en;

  return (
    <div className="flex-1 flex flex-col items-center justify-center py-6 sm:py-10 text-center relative max-w-[680px] mx-auto px-4 w-full select-none animate-in fade-in duration-300">
      {/* ── TOP BADGE & PRE-FLIGHT STATUS ── */}
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-zinc-300 font-mono text-[11px] font-medium mb-5 backdrop-blur-xl">
        <span className="w-1.5 h-1.5 rounded-full bg-[#C8F135] shadow-[0_0_8px_#C8F135]" />
        <span className="tracking-widest uppercase text-zinc-400">Pre-Flight Cockpit</span>
        <span className="text-zinc-600">·</span>
        <span className="text-zinc-400">16kHz Web Audio</span>
      </div>

      {/* ── SLEEK TITLE ── */}
      <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight font-sans mb-2">
        {hud.readyTitle}
      </h1>
      <p className="text-xs sm:text-sm text-zinc-400 max-w-md leading-relaxed font-sans mb-8">
        {hud.readySubtitle}
      </p>

      {/* ── MAIN COCKPIT CARD (680px Linear Noir) ── */}
      <div className="w-full rounded-2xl bg-[#0D0D10] border border-white/[0.08] shadow-[0_12px_40px_rgba(0,0,0,0.6)] p-5 sm:p-7 text-left space-y-5 backdrop-blur-2xl">
        {/* 1. Target Role Header & Switcher */}
        <div>
          <div className="flex items-center justify-between text-xs font-mono mb-2.5">
            <span className="text-zinc-400 uppercase tracking-wider font-semibold flex items-center gap-1.5">
              <Briefcase className="w-3.5 h-3.5 text-zinc-400" />
              <span>{isUa ? 'Спеціалізація та стек' : 'Candidate Stack & Role'}</span>
            </span>
            {onOpenProfile && (
              <button
                type="button"
                onClick={onOpenProfile}
                className="text-[11px] font-mono text-zinc-400 hover:text-white transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Settings className="w-3 h-3 text-zinc-400" />
                <span>{isUa ? 'Налаштувати CV' : 'Edit CV Profile'}</span>
                <ChevronRight className="w-3 h-3 text-zinc-500" />
              </button>
            )}
          </div>

          {/* Minimalist Role Segmented Pills */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
            {ROLES_LIST.map((item) => {
              const roleStr = (candidateProfile?.role || '').toLowerCase();
              const isSelected =
                (item.key === 'fullstack' && roleStr.includes('full-stack')) ||
                (item.key === 'frontend' && roleStr.includes('frontend')) ||
                (item.key === 'python_backend' && roleStr.includes('python')) ||
                (item.key === 'nodejs_backend' && (roleStr.includes('node') || roleStr.includes('nest'))) ||
                (item.key === 'golang_backend' && (roleStr.includes('go') || roleStr.includes('golang'))) ||
                (item.key === 'java_backend' && (roleStr.includes('java') || roleStr.includes('spring'))) ||
                (item.key === 'devops' && (roleStr.includes('devops') || roleStr.includes('cloud'))) ||
                (item.key === 'architecture' && (roleStr.includes('architect') || roleStr.includes('system design')));

              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => {
                    const preset = ROLE_PRESETS[item.key] || ROLE_PRESETS.fullstack;
                    if (preset) {
                      const newProfile: CandidateProfile = {
                        age: candidateProfile?.age || 18,
                        role: preset.role || 'Full-Stack Developer',
                        techStack: preset.techStack ? [...preset.techStack] : [],
                        petProjects: preset.petProjects ? [...preset.petProjects] : [],
                        customContext: preset.customContext || '',
                        jobDescription: candidateProfile?.jobDescription,
                        cvContext: candidateProfile?.cvContext,
                      };
                      try {
                        localStorage.setItem('ghostboard_candidate_profile', JSON.stringify(newProfile));
                      } catch {}
                      onSelectPresetProfile?.(newProfile);
                    }
                  }}
                  className={`px-2.5 py-1.5 rounded-lg text-[11px] font-mono transition-all text-left truncate cursor-pointer border ${
                    isSelected
                      ? 'bg-white/10 border-white/25 text-white font-bold shadow-sm'
                      : 'bg-white/[0.02] hover:bg-white/[0.05] border-white/[0.05] text-zinc-400 hover:text-zinc-200'
                  }`}
                  title={item.label}
                >
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Audio Capture Source Selection */}
        <div className="pt-4 border-t border-white/[0.06]">
          <div className="flex items-center justify-between text-xs font-mono mb-2">
            <span className="text-zinc-400 uppercase tracking-wider font-semibold">
              {isUa ? 'Джерело звуку співрозмовника' : 'Interviewer Audio Source'}
            </span>
            <span className="text-[10px] text-zinc-500 font-mono">
              {audioSource === 'tab' ? 'Recommended for Meet/Zoom' : 'Acoustic mic pick'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => onSelectAudioSource?.('tab')}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                audioSource === 'tab'
                  ? 'bg-white/10 border-white/30 text-white shadow-sm'
                  : 'bg-white/[0.02] hover:bg-white/[0.05] border-white/[0.06] text-zinc-400'
              }`}
            >
              <div>
                <div className="text-xs font-mono font-bold flex items-center gap-1.5 text-white">
                  <span>🌐</span>
                  <span>{hud.tabOption}</span>
                </div>
                <div className="text-[10px] font-sans text-zinc-400 mt-0.5">
                  {isUa ? 'Вкладка дзвінка + Ваш мікрофон' : 'Direct digital meeting stream'}
                </div>
              </div>
              {audioSource === 'tab' && <Check className="w-4 h-4 text-[#C8F135]" />}
            </button>

            <button
              type="button"
              onClick={() => onSelectAudioSource?.('mic')}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                audioSource === 'mic'
                  ? 'bg-white/10 border-white/30 text-white shadow-sm'
                  : 'bg-white/[0.02] hover:bg-white/[0.05] border-white/[0.06] text-zinc-400'
              }`}
            >
              <div>
                <div className="text-xs font-mono font-bold flex items-center gap-1.5 text-white">
                  <span>🎙️</span>
                  <span>{hud.micOption}</span>
                </div>
                <div className="text-[10px] font-sans text-zinc-400 mt-0.5">
                  {isUa ? 'Тільки фізичний мікрофон ПК' : 'Acoustic room speaker capture'}
                </div>
              </div>
              {audioSource === 'mic' && <Check className="w-4 h-4 text-[#C8F135]" />}
            </button>
          </div>
        </div>

        {/* 3. Primary Action: Engage Button */}
        <div className="pt-4 border-t border-white/[0.06] flex flex-col items-center gap-3">
          <button
            onClick={() => onStartCapture(audioSource)}
            className="w-full py-4 rounded-xl bg-[#C8F135] hover:bg-white text-black font-extrabold text-sm font-mono tracking-wider uppercase transition-all shadow-[0_0_30px_rgba(200,241,53,0.3)] hover:shadow-[0_0_40px_rgba(255,255,255,0.4)] active:scale-[0.99] cursor-pointer flex items-center justify-center gap-2.5"
          >
            <Play className="w-4 h-4 fill-black" />
            <span>{hud.startInterview}</span>
            <span className="text-[10px] opacity-75 font-mono px-2 py-0.5 rounded bg-black/15 border border-black/20 font-bold ml-1">
              Space
            </span>
          </button>

          {/* Secondary Utilities Row */}
          <div className="flex flex-wrap items-center justify-center gap-2 pt-1 w-full text-zinc-400">
            {onOpenSoundCheck && (
              <button
                type="button"
                onClick={onOpenSoundCheck}
                className="px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] hover:border-white/20 text-xs font-mono transition-colors flex items-center gap-1.5 cursor-pointer text-zinc-300"
              >
                <Volume2 className="w-3.5 h-3.5 text-zinc-400" />
                <span>Sound Check</span>
              </button>
            )}

            <button
              type="button"
              onClick={onTriggerScreenshot}
              disabled={isAnalyzingScreenshot}
              className="px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] hover:border-white/20 text-xs font-mono transition-colors flex items-center gap-1.5 cursor-pointer text-zinc-300 disabled:opacity-50"
            >
              <Camera className="w-3.5 h-3.5 text-zinc-400" />
              <span>Screen OCR</span>
              <kbd className="text-[10px] text-zinc-500 font-mono px-1 py-0.2 rounded bg-black/40 border border-white/10">
                F9
              </kbd>
            </button>

            <button
              type="button"
              disabled={isCopilotGenerating}
              onClick={() => onInjectTest(sampleQ.q)}
              className="px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] hover:border-white/20 text-xs font-mono transition-colors flex items-center gap-1.5 cursor-pointer text-zinc-300 disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#C8F135]" />
              <span>Test Sample</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
