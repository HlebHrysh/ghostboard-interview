"use client";

import React, { useState, useRef } from "react";
import {
  Check,
  Plus,
  X,
  Sparkles,
  FileText,
  Upload,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  ShieldCheck,
  FileUp,
} from "lucide-react";
import { toast } from "sonner";
import { CandidateProfile } from "@/components/CandidateProfileModal";

interface SpecializationTabProps {
  candidateProfile: CandidateProfile | null;
  selectedRoleKey: string;
  newProfileTag: string;
  isSavingProfile: boolean;
  resumeContext: string;
  isSavingContext: boolean;
  locale: string;
  onProfileChange: (profile: CandidateProfile) => void;
  onSelectPreset: (key: string) => void;
  onNewTagChange: (val: string) => void;
  onAddTag: () => void;
  onRemoveTag: (tag: string) => void;
  onSaveProfile: () => void;
  onResumeContextChange: (val: string) => void;
  onSaveResumeContext: () => void;
}

export function SpecializationTab({
  candidateProfile,
  selectedRoleKey,
  newProfileTag,
  isSavingProfile,
  resumeContext,
  isSavingContext,
  locale,
  onProfileChange,
  onSelectPreset,
  onNewTagChange,
  onAddTag,
  onRemoveTag,
  onSaveProfile,
  onResumeContextChange,
  onSaveResumeContext,
}: SpecializationTabProps) {
  const isUa = locale === "ua";
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isUploadingPdf, setIsUploadingPdf] = useState(false);
  const [uploadScanStep, setUploadScanStep] = useState<string>("");
  const [isDragging, setIsDragging] = useState(false);

  const rolePresets = [
    { key: "fullstack", label: "Full-Stack" },
    { key: "frontend", label: "React / Frontend" },
    { key: "python_backend", label: "Python Backend" },
    { key: "nodejs_backend", label: "Node.js / TS" },
    { key: "golang_backend", label: "Go / HighLoad" },
    { key: "java_backend", label: "Java / Spring" },
    { key: "devops", label: "DevOps / Cloud" },
    { key: "dotnet_backend", label: ".NET / C#" },
    { key: "ios_mobile", label: "iOS (Swift)" },
    { key: "data_engineer", label: "Data Engineer" },
  ];

  const levels = [
    { id: "junior", label: isUa ? "Junior (1-2 р.)" : "Junior (1-2 yrs)" },
    { id: "middle", label: isUa ? "Middle (2-4 р.)" : "Middle (2-4 yrs)" },
    { id: "senior", label: isUa ? "Senior (5+ р.)" : "Senior (5+ yrs)" },
    { id: "lead", label: isUa ? "Lead / Architect" : "Lead / Architect" },
  ];

  // Calculate Profile Completeness Percentage
  const hasRole = Boolean(candidateProfile?.role?.trim());
  const hasLevel = Boolean(candidateProfile?.level);
  const stackCount = candidateProfile?.techStack?.length || 0;
  const hasStack = stackCount >= 3;
  const hasCv = Boolean(resumeContext?.trim() || candidateProfile?.cvContext?.trim());

  let completeness = 0;
  if (hasRole) completeness += 25;
  if (hasLevel) completeness += 15;
  if (hasStack) completeness += 25;
  else if (stackCount > 0) completeness += 10;
  if (hasCv) completeness += 35;

  // PDF Upload & Extraction Handler
  const processPdfFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      toast.error(isUa ? "Підтримуються лише файли PDF (до 15 МБ)" : "Only PDF files are supported (up to 15MB)");
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      toast.error(isUa ? "Розмір файлу перевищує 15 МБ" : "File exceeds 15MB limit");
      return;
    }

    setIsUploadingPdf(true);
    setUploadScanStep(isUa ? "Зчитування бінарного потоку PDF..." : "Reading document binary stream...");

    const t1 = setTimeout(() => {
      setUploadScanStep(isUa ? "Видобування досвіду та контексту..." : "Extracting experience & candidate background...");
    }, 600);
    const t2 = setTimeout(() => {
      setUploadScanStep(isUa ? "Аналіз стеку технологій та проектів..." : "Detecting tech stack & competencies...");
    }, 1400);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/resume/parse", {
        method: "POST",
        body: formData,
      });

      clearTimeout(t1);
      clearTimeout(t2);

      const data = await res.json();
      if (res.ok && data.success) {
        const mergedStack = Array.from(
          new Set([...(candidateProfile?.techStack || []), ...(data.techStack || [])])
        );

        const updatedProfile: CandidateProfile = {
          age: candidateProfile?.age || 25,
          level: (data.level as "junior" | "middle" | "senior" | "lead") || candidateProfile?.level || "middle",
          role: data.role || candidateProfile?.role || "Software Engineer",
          techStack: mergedStack.length > 0 ? mergedStack : (candidateProfile?.techStack || []),
          petProjects: data.petProjects?.length ? data.petProjects : (candidateProfile?.petProjects || []),
          customContext: data.customContext || candidateProfile?.customContext || "",
          cvContext: data.cvContext || candidateProfile?.cvContext || "",
          jobDescription: candidateProfile?.jobDescription || "",
        };

        onProfileChange(updatedProfile);

        const newContext = data.cvContext || data.fullText || data.customContext || "";
        if (newContext) {
          onResumeContextChange(newContext);
          // Auto-save to context API
          fetch("/api/profile/context", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ resumeContext: newContext }),
          }).catch(() => {});
        }

        // Auto-save to localStorage
        try {
          localStorage.setItem("ghostboard_candidate_profile", JSON.stringify(updatedProfile));
        } catch {}

        toast.success(
          isUa
            ? `Резюме успішно розпізнано! Роль: ${data.role || "Розробник"}, знайдено навичок: ${data.techStack?.length || 0}`
            : `CV parsed! Role: ${data.role || "Engineer"}, skills: ${data.techStack?.length || 0}`
        );
      } else {
        toast.error(data.error || (isUa ? "Не вдалося розпізнати PDF" : "Failed to parse PDF"));
      }
    } catch {
      toast.error(isUa ? "Помилка завантаження файлу" : "Error uploading file");
    } finally {
      clearTimeout(t1);
      clearTimeout(t2);
      setIsUploadingPdf(false);
      setUploadScanStep("");
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processPdfFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="space-y-6">
      {/* ── 0. Profile Completeness Progress Status Banner ── */}
      <div className="p-5 sm:p-6 rounded-3xl border border-white/10 bg-gradient-to-r from-zinc-950 via-[#101018] to-zinc-950 backdrop-blur-2xl space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider">
                {isUa ? "Готовність профілю до інтерв'ю" : "Profile Readiness Score"}
              </h3>
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold uppercase ${
                  completeness >= 85
                    ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                    : completeness >= 50
                    ? "bg-amber-400/15 text-amber-300 border border-amber-400/30"
                    : "bg-red-500/15 text-red-300 border border-red-500/30"
                }`}
              >
                {completeness}% {completeness >= 85 ? (isUa ? "Готовий до бою" : "Combat Ready") : (isUa ? "Потрібні дані" : "Action Needed")}
              </span>
            </div>
            <p className="text-xs text-zinc-400">
              {isUa
                ? "Чим повніше заповнений профіль і завантажено CV, тим точніше Copilot відповідає на технічні питання за вашим стеком."
                : "The more complete your persona and CV context, the more authentically Copilot answers on your behalf."}
            </p>
          </div>

          <button
            type="button"
            onClick={onSaveProfile}
            disabled={isSavingProfile}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-white px-4 py-2 text-xs font-semibold text-zinc-950 hover:bg-zinc-200 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50 shrink-0 self-start sm:self-auto shadow-[0_0_15px_rgba(255,255,255,0.12)]"
          >
            <Check className="h-3.5 w-3.5" />
            <span>
              {isSavingProfile
                ? isUa
                  ? "Збереження..."
                  : "Saving..."
                : isUa
                ? "Зберегти всі зміни"
                : "Save Persona"}
            </span>
          </button>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="h-2 w-full rounded-full bg-white/[0.06] overflow-hidden border border-white/10">
            <div
              className={`h-full transition-all duration-500 rounded-full ${
                completeness >= 85
                  ? "bg-gradient-to-r from-emerald-500 to-teal-400 shadow-[0_0_12px_rgba(16,185,129,0.5)]"
                  : completeness >= 50
                  ? "bg-gradient-to-r from-amber-500 to-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.5)]"
                  : "bg-gradient-to-r from-red-500 to-amber-500"
              }`}
              style={{ width: `${Math.max(completeness, 8)}%` }}
            />
          </div>

          {/* Checklist Pills */}
          <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] font-mono">
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border ${
                hasRole
                  ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/20"
                  : "bg-white/[0.02] text-zinc-500 border-white/[0.06]"
              }`}
            >
              {hasRole ? "✓" : "○"} {isUa ? "Цільова роль" : "Role"}
            </span>
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border ${
                hasLevel
                  ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/20"
                  : "bg-white/[0.02] text-zinc-500 border-white/[0.06]"
              }`}
            >
              {hasLevel ? "✓" : "○"} {isUa ? "Грейд" : "Seniority"}
            </span>
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border ${
                hasStack
                  ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/20"
                  : "bg-white/[0.02] text-zinc-500 border-white/[0.06]"
              }`}
            >
              {hasStack ? "✓" : "○"} {isUa ? "Стек (3+ теги)" : "Tech Stack (3+)"}
            </span>
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border ${
                hasCv
                  ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/20"
                  : "bg-amber-400/10 text-amber-300 border-amber-400/30 animate-pulse font-bold"
              }`}
            >
              {hasCv ? "✓" : "⚠️"} {isUa ? "PDF Резюме / Контекст" : "CV Context"}
            </span>
          </div>
        </div>
      </div>

      {/* ── 1. Interactive CV Notice Banner (If CV is not yet uploaded) ── */}
      {!hasCv && (
        <div className="relative overflow-hidden p-5 sm:p-6 rounded-3xl border border-amber-500/40 bg-gradient-to-br from-amber-950/30 via-[#14120a] to-black shadow-[0_0_30px_rgba(245,158,11,0.08)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 rounded-2xl bg-amber-500/20 border border-amber-500/30 text-amber-300 shrink-0 mt-0.5">
              <FileUp className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-white font-mono">
                {isUa
                  ? "Завантажте CV, щоб Copilot відповідав за вашим реальним досвідом"
                  : "Upload your CV so Copilot speaks from your authentic experience"}
              </h4>
              <p className="text-xs text-zinc-300 leading-relaxed font-sans max-w-xl">
                {isUa
                  ? "ШІ автоматично проаналізує ваш PDF, витягне стек технологій, минулі проєкти та компанії, щоб формулювати відповіді у стилі вашої кар'єри."
                  : "Our neural scanner extracts your tech stack, past achievements, and role history so answers sound authentically yours."}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploadingPdf}
            className="btn-resend-primary text-xs font-mono !py-2.5 !px-5 shrink-0 flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_20px_rgba(255,255,255,0.2)]"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>{isUa ? "Завантажити PDF резюме" : "Upload PDF Resume"}</span>
          </button>
        </div>
      )}

      {/* ── 2. PDF Drag-and-Drop / Ingestion Zone ── */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`relative overflow-hidden rounded-3xl border transition-all p-6 text-center space-y-3 ${
          isDragging
            ? "border-emerald-400 bg-emerald-500/10 shadow-[0_0_30px_rgba(16,185,129,0.15)]"
            : "border-dashed border-white/15 bg-zinc-950/60 hover:border-white/30 hover:bg-zinc-950/80"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
              processPdfFile(e.target.files[0]);
            }
          }}
        />

        {isUploadingPdf ? (
          <div className="py-4 space-y-3">
            <div className="w-10 h-10 rounded-full border-2 border-emerald-400/20 border-t-emerald-400 animate-spin mx-auto" />
            <div className="space-y-1">
              <span className="text-xs font-mono font-bold text-white block">
                {isUa ? "Обробка резюме нейромережею..." : "Scanning CV with Gemini Vision..."}
              </span>
              <span className="text-xs text-emerald-400 font-mono animate-pulse">
                {uploadScanStep || "..."}
              </span>
            </div>
          </div>
        ) : (
          <div className="py-2 flex flex-col items-center gap-2">
            <div className="w-10 h-10 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-zinc-300">
              <FileText className="w-5 h-5" />
            </div>
            <div className="space-y-0.5">
              <p className="text-xs font-medium text-white">
                {isUa
                  ? "Перетягніть PDF-файл резюме сюди або натисніть для вибору"
                  : "Drag & drop your PDF resume here, or browse files"}
              </p>
              <p className="text-[11px] text-zinc-500 font-mono">
                PDF до 15 МБ • 100% приватність (дані обробляються в RAM)
              </p>
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="mt-1 px-4 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/10 border border-white/10 text-xs font-mono text-zinc-200 hover:text-white transition-all cursor-pointer"
            >
              {isUa ? "Обрати PDF файл" : "Choose PDF File"}
            </button>
          </div>
        )}
      </div>

      {/* ── 3. Target Role & Persona Card ── */}
      <div className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-zinc-950/70 p-6 sm:p-8 backdrop-blur-2xl shadow-[0_24px_48px_-12px_rgba(0,0,0,0.8)] space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-white tracking-tight">
                {isUa ? "Цільова посада та стек для ШІ" : "Target Role & Copilot Persona"}
              </h2>
            </div>
            <p className="mt-1 text-xs text-zinc-400">
              {isUa
                ? "Копілот адаптує глибину системного дизайну, термінологію та стиль коду під ваш профіль"
                : "Copilot calibrates system architecture depth, phrasing, and code snippets to your target role"}
            </p>
          </div>

          <button
            type="button"
            onClick={onSaveProfile}
            disabled={isSavingProfile}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-white px-4 py-2 text-xs font-semibold text-zinc-950 hover:bg-zinc-200 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50 self-start sm:self-auto"
          >
            <Check className="h-3.5 w-3.5" />
            <span>
              {isSavingProfile
                ? isUa
                  ? "Збереження..."
                  : "Saving..."
                : isUa
                ? "Зберегти профіль"
                : "Save Persona"}
            </span>
          </button>
        </div>

        {/* Target Job Title Input */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-zinc-300 block">
            {isUa
              ? "Цільова посада / Вакансія (довільний текст):"
              : "Target Job Title / Vacancy (freeform):"}
          </label>
          <input
            type="text"
            value={candidateProfile?.role || ""}
            onChange={(e) => {
              if (candidateProfile) {
                onProfileChange({ ...candidateProfile, role: e.target.value });
              }
            }}
            placeholder={
              isUa
                ? "Наприклад: Senior Backend Engineer (Python / FastAPI) у Revolut"
                : "e.g. Senior Backend Engineer (Python / FastAPI) at Revolut"
            }
            className="w-full rounded-xl border border-white/10 bg-zinc-900/60 px-4 py-2.5 text-sm text-white placeholder-zinc-500 transition-all focus:border-white/30 focus:outline-none focus:ring-0"
          />
        </div>

        {/* Experience Level Selector */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-zinc-300 block">
            {isUa ? "Рівень досвіду (Грейд):" : "Seniority Level:"}
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {levels.map((lvl) => {
              const isSelected = (candidateProfile?.level || "middle") === lvl.id;
              return (
                <button
                  key={lvl.id}
                  type="button"
                  onClick={() => {
                    if (candidateProfile) {
                      onProfileChange({
                        ...candidateProfile,
                        level: lvl.id as "junior" | "middle" | "senior" | "lead",
                        age: lvl.id === "junior" ? 21 : lvl.id === "middle" ? 24 : lvl.id === "senior" ? 28 : 33,
                      });
                    }
                  }}
                  className={`py-2 px-3 rounded-xl text-xs font-medium transition-all text-center cursor-pointer border ${
                    isSelected
                      ? "bg-white text-zinc-950 border-white font-semibold shadow-[0_0_20px_rgba(255,255,255,0.12)]"
                      : "bg-zinc-900/40 border-white/[0.08] text-zinc-400 hover:text-white hover:bg-zinc-900/80"
                  }`}
                >
                  {lvl.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Role Presets */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-zinc-300 block">
            {isUa ? "Швидкі готові шаблони ролей:" : "Quick Role Presets:"}
          </label>
          <div className="flex flex-wrap gap-1.5">
            {rolePresets.map((item) => {
              const isSelected = selectedRoleKey === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => onSelectPreset(item.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs transition-all cursor-pointer border ${
                    isSelected
                      ? "bg-white/20 border-white/40 text-white font-semibold"
                      : "bg-white/[0.03] border-white/[0.06] text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.06]"
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tech Stack Tags Box */}
        <div className="rounded-2xl border border-white/[0.06] bg-zinc-900/40 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-300">
              {isUa ? "Активний стек технологій:" : "Active Tech Stack:"}
            </span>
            <span className="text-zinc-400 font-mono text-[11px] bg-white/10 px-2 py-0.5 rounded border border-white/10">
              {candidateProfile?.techStack?.length || 0}
            </span>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {candidateProfile?.techStack?.map((tech) => (
              <span
                key={tech}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs bg-white/[0.06] text-zinc-200 border border-white/10"
              >
                <span>{tech}</span>
                <button
                  type="button"
                  onClick={() => onRemoveTag(tech)}
                  className="text-zinc-400 hover:text-red-400 p-0.5 transition-colors cursor-pointer"
                  title="Remove tag"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>

          {/* Add Tag Row */}
          <div className="flex items-center gap-2 pt-1">
            <input
              type="text"
              value={newProfileTag}
              onChange={(e) => onNewTagChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  onAddTag();
                }
              }}
              placeholder={
                isUa
                  ? "Додати технологію (напр. Redis, Docker, Kafka)..."
                  : "Add technology (e.g. Redis, Docker, Kafka)..."
              }
              className="flex-1 rounded-xl border border-white/10 bg-zinc-900/60 px-3.5 py-2 text-xs text-white placeholder-zinc-500 transition-all focus:border-white/30 focus:outline-none"
            />
            <button
              type="button"
              onClick={onAddTag}
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.05] px-3.5 py-2 text-xs font-medium text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>{isUa ? "Додати" : "Add"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── 4. Adaptive Resume & Project Context Injection ── */}
      <div className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-zinc-950/70 p-6 sm:p-8 backdrop-blur-2xl shadow-[0_24px_48px_-12px_rgba(0,0,0,0.8)] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-white tracking-tight">
                {isUa ? "Персональний контекст (CV / Резюме)" : "Adaptive Resume & Project Context"}
              </h2>
            </div>
            <p className="mt-1 text-xs text-zinc-400">
              {isUa
                ? "Вставте текст вашого резюме. Копілот автоматично інтегрує ваші реальні проєкти у кожну відповідь"
                : "Paste your resume or project stories. Copilot weaves your authentic experience into every live answer"}
            </p>
          </div>

          <button
            type="button"
            onClick={onSaveResumeContext}
            disabled={isSavingContext}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-white px-4 py-2 text-xs font-semibold text-zinc-950 hover:bg-zinc-200 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50 self-start sm:self-auto"
          >
            <Check className="h-3.5 w-3.5" />
            <span>
              {isSavingContext
                ? isUa
                  ? "Збереження..."
                  : "Saving..."
                : isUa
                ? "Зберегти контекст"
                : "Save Context"}
            </span>
          </button>
        </div>

        <textarea
          value={resumeContext}
          onChange={(e) => onResumeContextChange(e.target.value)}
          placeholder={
            isUa
              ? "Наприклад: 5 років досвіду з Go, Kubernetes та Kafka. Працював над платіжним шлюзом з навантаженням 40k RPS. Оптимізував час запитів до Postgres..."
              : "e.g. 5 years building high-throughput microservices in Go, Kafka, and Postgres. Led payment gateway migration processing 40k RPS..."
          }
          className="w-full rounded-2xl border border-white/10 bg-zinc-900/60 p-4 text-xs text-white placeholder-zinc-500 transition-all focus:border-white/30 focus:outline-none resize-y min-h-[140px] leading-relaxed"
        />
      </div>
    </div>
  );
}
