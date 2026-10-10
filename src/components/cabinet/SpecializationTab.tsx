"use client";

import React from "react";
import { Check, Plus, X, Sparkles, FileText, Sliders } from "lucide-react";
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
    { id: "junior", label: locale === "ua" ? "Junior (1-2 р.)" : "Junior (1-2 yrs)" },
    { id: "middle", label: locale === "ua" ? "Middle (2-4 р.)" : "Middle (2-4 yrs)" },
    { id: "senior", label: locale === "ua" ? "Senior (5+ р.)" : "Senior (5+ yrs)" },
    { id: "lead", label: locale === "ua" ? "Lead / Architect" : "Lead / Architect" },
  ];

  return (
    <div className="space-y-6">
      {/* ── 1. Target Role & Persona Card ── */}
      <div className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-zinc-950/70 p-6 sm:p-8 backdrop-blur-2xl shadow-[0_24px_48px_-12px_rgba(0,0,0,0.8)] space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-white tracking-tight">
                {locale === "ua" ? "Цільова посада та стек для ШІ" : "Target Role & Copilot Persona"}
              </h2>
            </div>
            <p className="mt-1 text-xs text-zinc-400">
              {locale === "ua"
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
                ? locale === "ua"
                  ? "Збереження..."
                  : "Saving..."
                : locale === "ua"
                ? "Зберегти профіль"
                : "Save Persona"}
            </span>
          </button>
        </div>

        {/* Target Job Title Input */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-zinc-300 block">
            {locale === "ua"
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
              locale === "ua"
                ? "Наприклад: Senior Backend Engineer (Python / FastAPI) у Revolut"
                : "e.g. Senior Backend Engineer (Python / FastAPI) at Revolut"
            }
            className="w-full rounded-xl border border-white/10 bg-zinc-900/60 px-4 py-2.5 text-sm text-white placeholder-zinc-500 transition-all focus:border-white/30 focus:outline-none focus:ring-0"
          />
        </div>

        {/* Experience Level Selector */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-zinc-300 block">
            {locale === "ua" ? "Рівень досвіду (Грейд):" : "Seniority Level:"}
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
                        level: lvl.id as any,
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
            {locale === "ua" ? "Швидкі готові шаблони ролей:" : "Quick Role Presets:"}
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
              {locale === "ua" ? "Активний стек технологій:" : "Active Tech Stack:"}
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
                locale === "ua"
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
              <span>{locale === "ua" ? "Додати" : "Add"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── 2. Adaptive Resume Context Injection ── */}
      <div className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-zinc-950/70 p-6 sm:p-8 backdrop-blur-2xl shadow-[0_24px_48px_-12px_rgba(0,0,0,0.8)] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-white tracking-tight">
                {locale === "ua" ? "Персональний контекст (CV / Резюме)" : "Adaptive Resume & Project Context"}
              </h2>
            </div>
            <p className="mt-1 text-xs text-zinc-400">
              {locale === "ua"
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
                ? locale === "ua"
                  ? "Збереження..."
                  : "Saving..."
                : locale === "ua"
                ? "Зберегти контекст"
                : "Save Context"}
            </span>
          </button>
        </div>

        <textarea
          value={resumeContext}
          onChange={(e) => onResumeContextChange(e.target.value)}
          placeholder={
            locale === "ua"
              ? "Наприклад: 5 років досвіду з Go, Kubernetes та Kafka. Працював над платіжним шлюзом з навантаженням 40k RPS. Оптимізував час запитів до Postgres..."
              : "e.g. 5 years building high-throughput microservices in Go, Kafka, and Postgres. Led payment gateway migration processing 40k RPS..."
          }
          className="w-full rounded-2xl border border-white/10 bg-zinc-900/60 p-4 text-xs text-white placeholder-zinc-500 transition-all focus:border-white/30 focus:outline-none resize-y min-h-[140px] leading-relaxed"
        />
      </div>
    </div>
  );
}
