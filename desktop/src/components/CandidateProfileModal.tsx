import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  User,
  Briefcase,
  Code2,
  Sparkles,
  UploadCloud,
  FileText,
  Plus,
  Trash2,
  Check,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Layers,
  ChevronDown,
  ChevronUp,
  Cpu,
  Loader2,
  Save,
} from 'lucide-react';
import {
  CandidateProfile,
  CandidateLevel,
  PetProject,
  DEFAULT_CANDIDATE_PROFILE,
  EXPERIENCE_LEVELS,
  ROLE_PRESETS,
  POPULAR_TECH_SUGGESTIONS,
  getStoredProfile,
  saveStoredProfile,
  resetStoredProfile,
  syncProfileToBackend,
  parseResumePdf,
  validateCandidateProfile,
  normalizeCandidateLevel,
} from '../lib/profileStore';

export interface CandidateProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: (profile: CandidateProfile) => void;
  serverBaseUrl?: string;
  authToken?: string | null;
}

export function CandidateProfileModal({
  isOpen,
  onClose,
  onSave,
  serverBaseUrl,
  authToken,
}: CandidateProfileModalProps) {
  const [profile, setProfile] = useState<CandidateProfile>(DEFAULT_CANDIDATE_PROFILE);
  const [newTag, setNewTag] = useState('');
  const [activeTab, setActiveTab] = useState<'profile' | 'projects'>('profile');
  const [isDragging, setIsDragging] = useState(false);
  const [isParsingPdf, setIsParsingPdf] = useState(false);
  const [parsingStep, setParsingStep] = useState('');
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [showProjects, setShowProjects] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize from storage whenever modal opens
  useEffect(() => {
    if (isOpen) {
      const stored = getStoredProfile();
      setProfile(stored);
      setStatusMessage(null);
    }
  }, [isOpen]);

  // Handle hotkeys (Esc to close, Cmd/Ctrl+S to save)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, profile]);

  if (!isOpen) return null;

  const showStatus = (type: 'success' | 'error' | 'info', text: string) => {
    setStatusMessage({ type, text });
    setTimeout(() => {
      setStatusMessage((current) => (current?.text === text ? null : current));
    }, 4500);
  };

  const handleApplyPreset = (presetKey: string) => {
    const preset = ROLE_PRESETS[presetKey];
    if (!preset) return;

    setProfile((prev) => ({
      ...prev,
      role: preset.role,
      experienceLevel: preset.level,
      primaryStack: preset.primaryStack,
      techStack: [...preset.techStack],
      customBio: preset.customBio,
      petProjects: preset.petProjects ? [...preset.petProjects] : prev.petProjects,
    }));

    showStatus('info', `Застосовано пресет: ${preset.label}`);
  };

  const handleAddTag = () => {
    const clean = newTag.trim().replace(/^,+|,+$/g, '');
    if (!clean) return;

    if (!profile.techStack.includes(clean)) {
      const updated = [...profile.techStack, clean];
      setProfile((prev) => ({
        ...prev,
        techStack: updated,
        primaryStack: updated.join(', '),
      }));
    }
    setNewTag('');
  };

  const handleRemoveTag = (tag: string) => {
    const updated = profile.techStack.filter((t) => t !== tag);
    setProfile((prev) => ({
      ...prev,
      techStack: updated,
      primaryStack: updated.join(', '),
    }));
  };

  const handleAddPopularTag = (tech: string) => {
    if (!profile.techStack.includes(tech)) {
      const updated = [...profile.techStack, tech];
      setProfile((prev) => ({
        ...prev,
        techStack: updated,
        primaryStack: updated.join(', '),
      }));
    }
  };

  const handleAddProject = () => {
    const newProj: PetProject = {
      id: `proj_${Date.now()}`,
      name: 'Новий проект',
      description: 'Опис архітектури, використаного стеку та вирішених проблем',
      keyHighlight: 'Метрики: зниження latency на 40%, обробка 5k RPS',
    };
    setProfile((prev) => ({
      ...prev,
      petProjects: [newProj, ...(prev.petProjects || [])],
    }));
  };

  const handleUpdateProject = (id: string, field: keyof PetProject, val: string) => {
    setProfile((prev) => ({
      ...prev,
      petProjects: (prev.petProjects || []).map((p) => (p.id === id ? { ...p, [field]: val } : p)),
    }));
  };

  const handleDeleteProject = (id: string) => {
    setProfile((prev) => ({
      ...prev,
      petProjects: (prev.petProjects || []).filter((p) => p.id !== id),
    }));
  };

  const handleFileUpload = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      showStatus('error', 'Підтримуються лише файли формату PDF (.pdf)');
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      showStatus('error', 'Розмір файлу перевищує ліміт 15 МБ');
      return;
    }

    setIsParsingPdf(true);
    setParsingStep('Зчитування PDF документу та підготовка base64...');

    try {
      const timer1 = setTimeout(() => setParsingStep('Аналіз стеку технологій та кваліфікації...'), 800);
      const timer2 = setTimeout(() => setParsingStep('Вилучення ключових проектів та досвіду...'), 1800);

      const res = await parseResumePdf(file, file.name, serverBaseUrl, authToken);

      clearTimeout(timer1);
      clearTimeout(timer2);

      if (!res.success || !res.profile) {
        throw new Error(res.error || 'Не вдалося розпізнати PDF резюме');
      }

      const p = res.profile;
      setProfile((prev) => ({
        ...prev,
        role: p.role || prev.role,
        experienceLevel: p.experienceLevel || prev.experienceLevel,
        techStack: p.techStack && p.techStack.length > 0 ? p.techStack : prev.techStack,
        primaryStack: p.primaryStack || (p.techStack ? p.techStack.join(', ') : prev.primaryStack),
        customBio: p.customBio || p.cvContext || prev.customBio,
        petProjects: p.petProjects && p.petProjects.length > 0 ? p.petProjects : prev.petProjects,
      }));

      showStatus(
        'success',
        `Резюме успішно розпізнано! Знайдено ${p.techStack?.length || 0} технологій та рівень ${String(p.experienceLevel || 'SENIOR').toUpperCase()}`
      );
    } catch (err: any) {
      showStatus('error', err.message || 'Помилка під час обробки резюме.');
    } finally {
      setIsParsingPdf(false);
      setParsingStep('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleSave = async () => {
    const validation = validateCandidateProfile(profile);
    if (!validation.valid) {
      showStatus('error', validation.errors[0] || 'Будь ласка, заповніть обовʼязкові поля');
      return;
    }

    try {
      // 1. Save locally in localStorage
      saveStoredProfile(profile);

      // 2. Trigger parent callback
      onSave?.(profile);

      // 3. Asynchronously sync with backend if token/baseUrl is present
      syncProfileToBackend(profile, serverBaseUrl, authToken).catch((err) => {
        console.warn('[CandidateProfileModal] Background sync warning:', err);
      });

      showStatus('success', 'Профіль збережено та передано в AI Copilot!');
      setTimeout(() => {
        onClose();
      }, 350);
    } catch (err: any) {
      showStatus('error', 'Не вдалося зберегти профіль');
    }
  };

  const handleReset = () => {
    const def = resetStoredProfile();
    setProfile(def);
    showStatus('info', 'Відновлено початковий профіль');
  };

  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-2xl animate-in fade-in duration-200">
      {/* Outer Luxury Obsidian Window */}
      <div className="relative w-full max-w-4xl max-h-[92vh] bg-[#08090a] border border-white/[0.12] rounded-2xl shadow-[0_25px_70px_rgba(0,0,0,0.9),0_0_35px_rgba(255,255,255,0.03)] text-zinc-100 flex flex-col overflow-hidden ring-1 ring-white/[0.05]">
        
        {/* Ambient Top Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-24 bg-gradient-to-b from-violet-500/10 via-cyan-500/5 to-transparent blur-2xl pointer-events-none" />

        {/* Modal Header */}
        <div className="relative z-10 flex items-center justify-between px-6 py-4 border-b border-white/[0.08] bg-[#0c0e12]/90 backdrop-blur-xl flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/20 to-cyan-500/20 border border-white/10 flex items-center justify-center text-zinc-200 shadow-inner">
              <Briefcase className="w-5 h-5 text-violet-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-white tracking-tight">
                  Профіль кандидата & Резюме
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-violet-500/20 text-violet-300 border border-violet-500/30">
                  AI Context Injection
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Персоналізація відповідей AI під вашу реальну сеньйорність, стек та архітектурні проекти
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleReset}
              title="Скинути до стандартного профілю"
              className="p-1.5 rounded-lg border border-white/10 bg-white/[0.03] hover:bg-white/[0.08] text-zinc-400 hover:text-white transition-all text-xs flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Скинути</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg border border-white/10 bg-white/[0.03] hover:bg-white/[0.08] text-zinc-400 hover:text-white transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Status Notification Banner */}
        <AnimatePresence>
          {statusMessage && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className={`px-6 py-2.5 text-xs flex items-center gap-2 border-b transition-colors ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-950/60 border-emerald-500/30 text-emerald-300'
                  : statusMessage.type === 'error'
                  ? 'bg-rose-950/60 border-rose-500/30 text-rose-300'
                  : 'bg-violet-950/60 border-violet-500/30 text-violet-300'
              }`}
            >
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              ) : statusMessage.type === 'error' ? (
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
              ) : (
                <Sparkles className="w-4 h-4 flex-shrink-0" />
              )}
              <span>{statusMessage.text}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          
          {/* Section 1: Resume Upload / Drag & Drop */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5 uppercase tracking-wider">
                <UploadCloud className="w-3.5 h-3.5 text-cyan-400" />
                Імпорт резюме (PDF)
              </label>
              <span className="text-[11px] text-zinc-500">Автоматичне вилучення навичок та проектів</span>
            </div>

            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`relative border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all duration-200 ${
                isDragging
                  ? 'border-cyan-400 bg-cyan-500/10 scale-[1.005]'
                  : 'border-white/[0.12] bg-[#0c0e14]/60 hover:bg-[#10131a] hover:border-white/20'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,application/pdf"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileUpload(e.target.files[0]);
                  }
                }}
              />

              {isParsingPdf ? (
                <div className="flex flex-col items-center justify-center py-2 space-y-2">
                  <Loader2 className="w-7 h-7 text-cyan-400 animate-spin" />
                  <p className="text-sm font-medium text-cyan-300">{parsingStep}</p>
                  <p className="text-xs text-zinc-500">Multimodal Gemini Flash parser</p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-1 space-y-1.5">
                  <div className="w-10 h-10 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-300 mb-1">
                    <FileText className="w-5 h-5" />
                  </div>
                  <p className="text-sm font-medium text-zinc-200">
                    Перетягніть PDF резюме сюди або <span className="text-cyan-400 underline underline-offset-4">оберіть файл</span>
                  </p>
                  <p className="text-[11px] text-zinc-500">
                    Підтримуються стандартні PDF до 15 МБ. AI вилучить стек, роль, проекти та налаштує тон відповідей.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Section 2: Target Role & Quick Presets */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5 uppercase tracking-wider">
                <User className="w-3.5 h-3.5 text-violet-400" />
                Цільова роль (Target Role)
              </label>
              <span className="text-[11px] text-zinc-500">Швидкі пресети за напрямками:</span>
            </div>

            <input
              type="text"
              value={profile.role}
              onChange={(e) => setProfile((p) => ({ ...p, role: e.target.value }))}
              placeholder="e.g. Senior Backend Developer (Python / Go / PostgreSQL)"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#0c0e14] border border-white/[0.12] focus:border-violet-500 focus:ring-1 focus:ring-violet-500 text-sm text-zinc-100 placeholder-zinc-600 outline-none transition-all"
            />

            {/* Quick Role Presets Chips */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {Object.entries(ROLE_PRESETS).map(([key, preset]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleApplyPreset(key)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                    profile.role === preset.role
                      ? 'bg-violet-500/25 border-violet-500/60 text-violet-200 shadow-[0_0_12px_rgba(139,92,246,0.3)]'
                      : 'bg-white/[0.03] hover:bg-white/[0.07] border-white/10 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Section 3: Experience Level (Junior, Middle, Senior, Lead, Principal) */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5 uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Рівень досвіду (Seniority Level)
              </label>
              <span className="text-[11px] text-zinc-500">Визначає глибину архітектурних trade-offs</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {EXPERIENCE_LEVELS.map((lvl) => {
                const isSelected = profile.experienceLevel === lvl.id;
                return (
                  <button
                    key={lvl.id}
                    type="button"
                    onClick={() => setProfile((p) => ({ ...p, experienceLevel: lvl.id }))}
                    className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                      isSelected
                        ? `${lvl.colorClass} shadow-[0_0_15px_rgba(255,255,255,0.06)] ring-1 ring-white/20 font-bold scale-[1.02]`
                        : 'bg-white/[0.03] hover:bg-white/[0.06] border-white/10 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <span className="text-xs uppercase tracking-wider font-mono">{lvl.badge}</span>
                    <span className="text-[10px] text-zinc-400 mt-1 line-clamp-1">{lvl.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 4: Core Tech Stack (Tag Input + Suggestions) */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5 uppercase tracking-wider">
                <Code2 className="w-3.5 h-3.5 text-emerald-400" />
                Основний технологічний стек
              </label>
              <span className="text-[11px] text-zinc-500">{profile.techStack.length} навичок</span>
            </div>

            {/* Tag List Container */}
            <div className="p-3 rounded-xl bg-[#0c0e14] border border-white/[0.12] flex flex-wrap gap-1.5 min-h-[52px] items-center">
              {profile.techStack.map((tech) => (
                <span
                  key={tech}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-500/15 border border-emerald-500/30 text-emerald-200"
                >
                  {tech}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tech)}
                    className="hover:text-rose-400 transition-colors cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}

              <div className="inline-flex items-center gap-1 flex-1 min-w-[140px]">
                <input
                  type="text"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ',') {
                      e.preventDefault();
                      handleAddTag();
                    }
                  }}
                  placeholder="Додати навичку (Enter)..."
                  className="w-full bg-transparent text-xs text-zinc-200 placeholder-zinc-600 outline-none px-1 py-0.5"
                />
                {newTag.trim() && (
                  <button
                    type="button"
                    onClick={handleAddTag}
                    className="p-1 rounded bg-white/10 hover:bg-white/20 text-white text-xs cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            {/* Popular Suggestions */}
            <div className="flex flex-wrap items-center gap-1 pt-0.5">
              <span className="text-[11px] text-zinc-500 mr-1">Популярні:</span>
              {POPULAR_TECH_SUGGESTIONS.filter((s) => !profile.techStack.includes(s)).slice(0, 10).map((tech) => (
                <button
                  key={tech}
                  type="button"
                  onClick={() => handleAddPopularTag(tech)}
                  className="px-2 py-0.5 rounded text-[11px] bg-white/[0.03] hover:bg-emerald-500/15 hover:border-emerald-500/30 hover:text-emerald-300 border border-white/10 text-zinc-400 transition-all cursor-pointer"
                >
                  + {tech}
                </button>
              ))}
            </div>
          </div>

          {/* Section 5: Custom Bio & Background Context */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5 uppercase tracking-wider">
                <FileText className="w-3.5 h-3.5 text-blue-400" />
                Бекграунд та інструкції до стилю відповідей (Custom Bio)
              </label>
              <span className="text-[11px] text-zinc-500">Впливає на формулювання AI</span>
            </div>

            <textarea
              rows={4}
              value={profile.customBio}
              onChange={(e) => setProfile((p) => ({ ...p, customBio: e.target.value }))}
              placeholder="Короткий бекграунд, ключові досягнення, улюблені патерни (Clean Architecture, CQRS) та директиви стилю (наприклад: 'відповідати від першого лиця, з реальними кейсами, впевнено і по-простому')."
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#0c0e14] border border-white/[0.12] focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-xs text-zinc-100 placeholder-zinc-600 outline-none transition-all leading-relaxed"
            />
          </div>

          {/* Section 6: Pet Projects / Production Highlights (Expandable) */}
          <div className="border border-white/[0.08] rounded-xl overflow-hidden bg-[#0a0c10]">
            <button
              type="button"
              onClick={() => setShowProjects((p) => !p)}
              className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-white/[0.03] transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-violet-400" />
                <span className="text-xs font-semibold text-zinc-200">
                  Ключові проекти та архітектурні кейси ({profile.petProjects?.length || 0})
                </span>
              </div>
              <div className="flex items-center gap-1 text-zinc-500">
                <span className="text-[11px]">{showProjects ? 'Згорнути' : 'Розгорнути'}</span>
                {showProjects ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </div>
            </button>

            {showProjects && (
              <div className="p-4 border-t border-white/[0.08] space-y-4 bg-black/30">
                <div className="flex justify-between items-center">
                  <p className="text-[11px] text-zinc-400">
                    AI посилатиметься на ці проекти при запитаннях "Розкажіть про ваш досвід"
                  </p>
                  <button
                    type="button"
                    onClick={handleAddProject}
                    className="px-2.5 py-1 rounded-lg bg-violet-500/20 hover:bg-violet-500/30 border border-violet-500/40 text-violet-300 text-xs font-medium flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Додати проект
                  </button>
                </div>

                <div className="space-y-3">
                  {(profile.petProjects || []).map((proj, idx) => (
                    <div
                      key={proj.id || idx}
                      className="p-3 rounded-lg border border-white/10 bg-[#0c0e14] space-y-2 relative"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <input
                          type="text"
                          value={proj.name}
                          onChange={(e) => handleUpdateProject(proj.id, 'name', e.target.value)}
                          placeholder="Назва проекту / системи"
                          className="w-full bg-transparent text-xs font-semibold text-white border-b border-transparent focus:border-violet-500 outline-none pb-0.5"
                        />
                        <button
                          type="button"
                          onClick={() => handleDeleteProject(proj.id)}
                          className="text-zinc-500 hover:text-rose-400 p-1 cursor-pointer transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <textarea
                        rows={2}
                        value={proj.description}
                        onChange={(e) => handleUpdateProject(proj.id, 'description', e.target.value)}
                        placeholder="Опис архітектури та вирішених проблем..."
                        className="w-full bg-transparent text-[11px] text-zinc-300 placeholder-zinc-600 border border-white/5 rounded p-1.5 outline-none focus:border-white/20"
                      />

                      <input
                        type="text"
                        value={proj.keyHighlight}
                        onChange={(e) => handleUpdateProject(proj.id, 'keyHighlight', e.target.value)}
                        placeholder="Ключовий результат (наприклад: 'Знизив p99 latency з 800ms до 45ms')"
                        className="w-full bg-transparent text-[11px] text-amber-300/90 placeholder-zinc-600 border border-white/5 rounded px-2 py-1 outline-none focus:border-white/20"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

        </div>

        {/* Modal Footer */}
        <div className="relative z-10 flex items-center justify-between px-6 py-4 border-t border-white/[0.08] bg-[#0c0e12]/95 backdrop-blur-xl flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
            <span className="text-xs text-zinc-400 font-mono">
              Локальне збереження: <span className="text-zinc-200">активне</span>
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.08] text-xs font-medium text-zinc-300 hover:text-white transition-all cursor-pointer"
            >
              Скасувати
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white text-xs font-semibold shadow-[0_0_20px_rgba(139,92,246,0.4)] transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <Save className="w-3.5 h-3.5" />
              Зберегти профіль [⌘S]
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

export default CandidateProfileModal;
