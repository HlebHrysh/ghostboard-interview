"use client";

import React, { useState, useEffect } from "react";
import {
  Sparkles,
  Zap,
  Copy,
  Check,
  Download,
  Printer,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  HelpCircle,
  Code2,
  FileText,
  ShieldAlert,
  ArrowRight,
  RefreshCw,
  Layers,
  Flame,
  MessageSquare,
} from "lucide-react";
import { toast } from "sonner";
import { CandidateProfile } from "@/components/CandidateProfileModal";
import { BattleCheatSheetData, TrickyQuestionItem } from "@/app/api/profile/cheat-sheet/route";

interface BattleCheatSheetTabProps {
  candidateProfile: CandidateProfile | null;
  resumeContext: string;
  locale: string;
}

type SectionFilter = "all" | "questions" | "system_design" | "elevator_pitch" | "red_flags" | "reverse_questions";

export function BattleCheatSheetTab({
  candidateProfile,
  resumeContext,
  locale,
}: BattleCheatSheetTabProps) {
  const isUa = locale === "ua";

  const [cheatSheet, setCheatSheet] = useState<BattleCheatSheetData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeSection, setActiveSection] = useState<SectionFilter>("all");
  const [expandedQuestions, setExpandedQuestions] = useState<Record<string, boolean>>({});
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Load from local storage or cached API on mount
  useEffect(() => {
    try {
      const local = localStorage.getItem("ghostboard_battle_cheat_sheet");
      if (local) {
        setCheatSheet(JSON.parse(local));
      }
    } catch {}

    // Also check server cache
    fetch("/api/profile/cheat-sheet")
      .then((res) => res.json())
      .then((data) => {
        if (data.cheatSheet) {
          setCheatSheet(data.cheatSheet);
          try {
            localStorage.setItem("ghostboard_battle_cheat_sheet", JSON.stringify(data.cheatSheet));
          } catch {}
        }
      })
      .catch(() => {});
  }, []);

  const handleGenerate = async () => {
    setIsLoading(true);
    try {
      const payload = {
        role: candidateProfile?.role || "Senior Full-Stack Engineer",
        level: candidateProfile?.level || "senior",
        techStack: candidateProfile?.techStack || ["TypeScript", "React", "Node.js", "PostgreSQL"],
        resumeContext: resumeContext || candidateProfile?.cvContext || "",
        locale,
      };

      const res = await fetch("/api/profile/cheat-sheet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok && data.success && data.cheatSheet) {
        setCheatSheet(data.cheatSheet);
        try {
          localStorage.setItem("ghostboard_battle_cheat_sheet", JSON.stringify(data.cheatSheet));
        } catch {}
        toast.success(
          isUa
            ? `Шпаргалку згенеровано! Підготовлено ${data.cheatSheet.trickyQuestions.length} каверзних питань під ваш стек.`
            : `Battle Cheat-Sheet ready with ${data.cheatSheet.trickyQuestions.length} tailored questions.`
        );
      } else {
        toast.error(data.error || (isUa ? "Помилка генерації шпаргалки" : "Failed to generate cheat-sheet"));
      }
    } catch {
      toast.error(isUa ? "Помилка зв'язку з сервером" : "Network error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleQuestion = (id: string) => {
    setExpandedQuestions((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleCopyText = (text: string, keyName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(keyName);
    toast.success(isUa ? "Скопійовано в буфер обміну" : "Copied to clipboard");
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleExportMarkdown = () => {
    if (!cheatSheet) return;

    let md = `# ⚡ Ghostboard Battle Cheat-Sheet: ${cheatSheet.role} [${cheatSheet.level.toUpperCase()}]\n`;
    md += `*Стек:* ${cheatSheet.techStack.join(", ")} | *Готовність:* ${cheatSheet.readinessScore}% | *Дата:* ${new Date(cheatSheet.generatedAt).toLocaleDateString()}\n\n`;
    md += `---\n\n`;

    md += `## 🎙️ Самопрезентація (Elevator Pitch)\n\n`;
    md += `> **Хук (перші 5с):** ${cheatSheet.elevatorPitch.hook}\n\n`;
    md += `${cheatSheet.elevatorPitch.body}\n\n`;
    md += `**Ключові метрики:**\n`;
    cheatSheet.elevatorPitch.metricsHighlighted.forEach((m) => {
      md += `- 📈 ${m}\n`;
    });
    md += `\n*Висновок:* ${cheatSheet.elevatorPitch.conclusion}\n\n`;
    md += `---\n\n`;

    md += `## 🎯 Топ-10 каверзних питань по стеку\n\n`;
    cheatSheet.trickyQuestions.forEach((q, idx) => {
      md += `### #${idx + 1}: ${q.question} (${q.category})\n`;
      md += `*Навіщо запитують:* ${q.whyTheyAsk}\n\n`;
      md += `**⚡ Хук для відповіді:** ${q.leadHook}\n\n`;
      md += `**Ключові тези:**\n`;
      q.keyPillars.forEach((p) => {
        md += `- ${p}\n`;
      });
      if (q.codeSnippet) {
        md += `\n\`\`\`typescript\n${q.codeSnippet}\n\`\`\`\n`;
      }
      md += `\n⚠️ **Підводний камінь:** ${q.pitfall}\n\n`;
      md += `---\n\n`;
    });

    md += `## 🏛️ Системний дизайн та Архітектура\n\n`;
    cheatSheet.systemDesign.forEach((sd) => {
      md += `### ${sd.title}\n`;
      md += `**Патерн:** \`${sd.pattern}\`\n`;
      md += `**Trade-offs:** ${sd.tradeoffs}\n\n`;
      md += `*Кращі практики:*\n`;
      sd.bestPractices.forEach((bp) => {
        md += `- ${bp}\n`;
      });
      md += `\n`;
    });

    md += `---\n\n`;
    md += `## ⚠️ Червоні прапорці (Red Flags)\n\n`;
    cheatSheet.redFlags.forEach((rf) => {
      md += `- ❌ **Помилка:** ${rf.mistake}\n  ✅ **Як треба:** ${rf.fix}\n\n`;
    });

    md += `---\n\n`;
    md += `## ❓ Сильні питання інтерв'юеру в кінці раунду\n\n`;
    cheatSheet.reverseQuestions.forEach((rq, i) => {
      md += `${i + 1}. ${rq}\n`;
    });

    const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `battle-cheat-sheet-${cheatSheet.role.replace(/\s+/g, "-").toLowerCase()}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success(isUa ? "Шпаргалку експортовано в Markdown" : "Exported to Markdown");
  };

  const handlePrint = () => {
    window.print();
  };

  const activeStack = candidateProfile?.techStack || ["TypeScript", "React", "Node.js", "PostgreSQL"];
  const currentRole = candidateProfile?.role || "Software Engineer";

  return (
    <div className="space-y-6">
      {/* ── Top Header & Generation Strip ── */}
      <div className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-gradient-to-r from-zinc-950 via-[#101118] to-zinc-950 p-6 sm:p-8 backdrop-blur-2xl shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-amber-400/10 border border-amber-400/20 text-amber-300">
                <Flame className="w-4 h-4" />
              </div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight font-mono">
                {isUa ? "Шпаргалка перед боєм (Battle Cheat-Sheet)" : "Pre-Interview Battle Cheat-Sheet"}
              </h2>
              {cheatSheet && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 uppercase font-bold">
                  {cheatSheet.readinessScore}% {isUa ? "Готовий" : "Ready"}
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-400 max-w-xl leading-relaxed">
              {isUa
                ? "Персональна вижимка найкаверзніших питань за вашим стеком, готовий STAR-пітч та патерни системного дизайну для повторення за 5 хвилин до дзвінка."
                : "Hyper-tailored distillation of tricky technical traps, proven STAR elevator pitch & architecture blueprints to review 5 minutes before your interview."}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={handleGenerate}
              disabled={isLoading}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-semibold text-zinc-950 hover:bg-zinc-200 active:scale-[0.98] transition-all cursor-pointer shadow-[0_0_20px_rgba(255,255,255,0.2)] disabled:opacity-50"
            >
              <Sparkles className={`w-3.5 h-3.5 fill-black ${isLoading ? "animate-spin" : ""}`} />
              <span>
                {isLoading
                  ? isUa
                    ? "Генерація нейромережею..."
                    : "Synthesizing with AI..."
                  : cheatSheet
                  ? isUa
                    ? "Оновити шпаргалку"
                    : "Regenerate Sheet"
                  : isUa
                  ? "Згенерувати шпаргалку"
                  : "Generate Battle Sheet"}
              </span>
            </button>

            {cheatSheet && (
              <>
                <button
                  type="button"
                  onClick={handleExportMarkdown}
                  className="p-2.5 rounded-xl bg-white/[0.04] border border-white/10 hover:border-white/20 text-zinc-300 hover:text-white transition-all cursor-pointer"
                  title={isUa ? "Експорт у Markdown" : "Export to Markdown"}
                >
                  <Download className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handlePrint}
                  className="p-2.5 rounded-xl bg-white/[0.04] border border-white/10 hover:border-white/20 text-zinc-300 hover:text-white transition-all cursor-pointer"
                  title={isUa ? "Друк / Зберегти як PDF" : "Print / PDF"}
                >
                  <Printer className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Target Profile Metadata Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/[0.06] text-xs font-mono">
          <span className="text-zinc-500 uppercase text-[10px]">Базується на:</span>
          <span className="px-2.5 py-0.5 rounded-lg bg-white/[0.05] border border-white/10 text-white font-semibold">
            {currentRole}
          </span>
          <span className="px-2.5 py-0.5 rounded-lg bg-white/[0.05] border border-white/10 text-amber-300 uppercase">
            {candidateProfile?.level || "Senior"}
          </span>
          {activeStack.slice(0, 5).map((tech) => (
            <span
              key={tech}
              className="px-2 py-0.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-[11px]"
            >
              {tech}
            </span>
          ))}
          {activeStack.length > 5 && (
            <span className="text-zinc-500 text-[10px]">+{activeStack.length - 5}</span>
          )}
        </div>
      </div>

      {/* ── Empty State ── */}
      {!cheatSheet && !isLoading && (
        <div className="rounded-3xl border border-dashed border-white/15 bg-zinc-950/40 p-10 sm:p-14 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center mx-auto text-amber-300">
            <Zap className="w-7 h-7" />
          </div>
          <div className="max-w-md mx-auto space-y-1.5">
            <h3 className="text-base font-bold text-white font-mono">
              {isUa ? "Шпаргалка ще не скомпільована" : "Battle Cheat-Sheet Not Yet Generated"}
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed font-sans">
              {isUa
                ? "Натисніть кнопку вище, щоб синтезувати персональний тактичний довідник на базі вашого стеку технологій та резюме."
                : "Click the generate button above to compile your personalized interview debrief weapon based on your role, stack, and CV."}
            </p>
          </div>
          <button
            type="button"
            onClick={handleGenerate}
            className="btn-resend-primary text-xs font-mono !py-2.5 !px-5 inline-flex items-center gap-2 cursor-pointer shadow-[0_0_20px_rgba(255,255,255,0.25)]"
          >
            <Sparkles className="w-3.5 h-3.5 fill-black" />
            <span>{isUa ? "Створити Battle Cheat-Sheet" : "Generate Cheat-Sheet Now"}</span>
          </button>
        </div>
      )}

      {/* ── Content View ── */}
      {cheatSheet && (
        <div className="space-y-6">
          {/* Section Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-2xl bg-zinc-950/80 border border-white/[0.08] backdrop-blur-xl">
            {[
              { id: "all", label: isUa ? "Всі розділи" : "All Sections" },
              { id: "questions", label: isUa ? "🎯 Топ-10 каверзних питань" : "🎯 Tricky Questions" },
              { id: "elevator_pitch", label: isUa ? "🎙️ STAR-Самопрезентація" : "🎙️ Elevator Pitch" },
              { id: "system_design", label: isUa ? "🏛️ Системний дизайн" : "🏛️ System Design" },
              { id: "red_flags", label: isUa ? "⚠️ Red Flags" : "⚠️ Red Flags" },
              { id: "reverse_questions", label: isUa ? "❓ Питання інтерв'юеру" : "❓ Reverse Questions" },
            ].map((tab) => {
              const isActive = activeSection === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveSection(tab.id as SectionFilter)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-mono font-medium transition-all cursor-pointer ${
                    isActive
                      ? "bg-white text-zinc-950 font-bold shadow-[0_0_15px_rgba(255,255,255,0.12)]"
                      : "text-zinc-400 hover:text-white hover:bg-white/[0.04]"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* ── Section: Elevator Pitch ── */}
          {(activeSection === "all" || activeSection === "elevator_pitch") && (
            <div className="p-6 rounded-3xl bg-zinc-950/70 border border-white/[0.08] backdrop-blur-xl space-y-4 shadow-lg">
              <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-amber-400/10 text-amber-300">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider">
                    {isUa ? "1. STAR-Самопрезентація (Відповідь на «Розкажіть про себе»)" : "1. STAR Elevator Pitch (Tell Me About Yourself)"}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    handleCopyText(
                      `${cheatSheet.elevatorPitch.hook}\n\n${cheatSheet.elevatorPitch.body}\n\n${cheatSheet.elevatorPitch.conclusion}`,
                      "pitch"
                    )
                  }
                  className="inline-flex items-center gap-1.5 text-xs font-mono text-zinc-400 hover:text-white px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/5 cursor-pointer transition-all"
                >
                  {copiedKey === "pitch" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedKey === "pitch" ? "Скопійовано" : "Копіювати"}</span>
                </button>
              </div>

              {/* Lead Hook */}
              <div className="p-3.5 rounded-2xl bg-amber-400/10 border border-amber-400/20 text-white font-medium text-sm leading-relaxed">
                <span className="text-[10px] font-mono uppercase text-amber-300 font-bold block mb-1">
                  ⚡ Перші 5 секунд (Punch Hook):
                </span>
                {cheatSheet.elevatorPitch.hook}
              </div>

              {/* Body */}
              <div className="text-xs sm:text-sm text-zinc-300 leading-relaxed font-sans pl-2">
                {cheatSheet.elevatorPitch.body}
              </div>

              {/* Metrics Highlights */}
              <div className="space-y-1.5 pt-1">
                <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-500 font-bold block">
                  📈 Ключові вимірні досягнення для згадки:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {cheatSheet.elevatorPitch.metricsHighlighted.map((metric, i) => (
                    <div
                      key={i}
                      className="p-3 rounded-2xl bg-white/[0.03] border border-white/[0.06] text-xs text-zinc-200 leading-snug"
                    >
                      {metric}
                    </div>
                  ))}
                </div>
              </div>

              <div className="text-xs text-zinc-400 italic pt-1 pl-2">
                "{cheatSheet.elevatorPitch.conclusion}"
              </div>
            </div>
          )}

          {/* ── Section: Tricky Questions ── */}
          {(activeSection === "all" || activeSection === "questions") && (
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-1">
                <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider flex items-center gap-2">
                  <Flame className="w-4 h-4 text-amber-400" />
                  <span>
                    {isUa ? "2. Топ-10 каверзних технічних запитань" : "2. Top 10 Tricky Technical Traps"}
                  </span>
                </h3>
                <span className="text-xs font-mono text-zinc-500">
                  {cheatSheet.trickyQuestions.length} запитань
                </span>
              </div>

              {cheatSheet.trickyQuestions.map((q, idx) => {
                const isExpanded = expandedQuestions[q.id] !== false; // Default expanded
                return (
                  <div
                    key={q.id || idx}
                    className="p-5 rounded-3xl bg-zinc-950/70 border border-white/[0.08] hover:border-white/20 transition-all space-y-3 backdrop-blur-xl shadow-lg"
                  >
                    <div
                      onClick={() => handleToggleQuestion(q.id)}
                      className="flex items-start justify-between gap-3 cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5 flex-1 min-w-0">
                        <span className="w-6 h-6 rounded-lg bg-white/10 text-white font-mono text-xs flex items-center justify-center font-bold shrink-0">
                          #{idx + 1}
                        </span>
                        <h4 className="text-sm sm:text-base font-bold text-zinc-100 leading-snug">
                          {q.question}
                        </h4>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/25">
                          {q.category}
                        </span>
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-zinc-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-zinc-400" />
                        )}
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="space-y-3 pt-2 text-xs">
                        {/* Why they ask */}
                        <div className="text-[11px] font-mono text-zinc-400 bg-white/[0.02] p-2.5 rounded-xl border border-white/5">
                          <span className="text-zinc-500 uppercase font-bold mr-1.5">Прихована мета питання:</span>
                          <span>{q.whyTheyAsk}</span>
                        </div>

                        {/* Lead Hook */}
                        <div className="p-3 rounded-2xl bg-amber-400/10 border border-amber-400/25 text-amber-100 leading-relaxed">
                          <span className="text-[10px] font-mono uppercase text-amber-400 font-bold block mb-1">
                            ⚡ Хук для відповіді (перші 5 секунд):
                          </span>
                          <span className="font-medium text-sm">{q.leadHook}</span>
                        </div>

                        {/* Key Pillars */}
                        <div className="space-y-1.5 pl-1">
                          <span className="text-[10px] font-mono uppercase text-zinc-500 font-bold block">
                            Ключові тези для розкриття:
                          </span>
                          <ul className="space-y-1">
                            {q.keyPillars.map((pillar, pIdx) => (
                              <li key={pIdx} className="text-zinc-200 flex items-start gap-2">
                                <span className="text-cyan-400 font-mono font-bold">•</span>
                                <span className="leading-relaxed">{pillar}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* Code snippet if exists */}
                        {q.codeSnippet && (
                          <div className="p-3 rounded-2xl bg-black border border-white/10 font-mono text-xs text-zinc-300 overflow-x-auto">
                            <pre className="whitespace-pre-wrap">{q.codeSnippet}</pre>
                          </div>
                        )}

                        {/* Pitfall Warning */}
                        <div className="p-2.5 rounded-xl bg-red-950/20 border border-red-500/25 text-red-200 text-[11px] flex items-start gap-2">
                          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold font-mono uppercase text-red-400 mr-1.5">
                              Підводний камінь (як відповідають 80%):
                            </span>
                            <span>{q.pitfall}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* ── Section: System Design ── */}
          {(activeSection === "all" || activeSection === "system_design") && (
            <div className="p-6 rounded-3xl bg-zinc-950/70 border border-white/[0.08] backdrop-blur-xl space-y-4 shadow-lg">
              <div className="flex items-center gap-2 pb-3 border-b border-white/[0.08]">
                <div className="p-1.5 rounded-lg bg-cyan-400/10 text-cyan-300">
                  <Layers className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider">
                  {isUa ? "3. Системний дизайн та Архітектурні патерни" : "3. System Design & Architectural Blueprints"}
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {cheatSheet.systemDesign.map((sd, i) => (
                  <div
                    key={i}
                    className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-2.5 flex flex-col justify-between"
                  >
                    <div className="space-y-1.5">
                      <h4 className="text-xs font-bold text-white font-mono">{sd.title}</h4>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 block w-fit">
                        {sd.pattern}
                      </span>
                      <p className="text-[11px] text-zinc-400 leading-relaxed pt-1">
                        {sd.tradeoffs}
                      </p>
                    </div>

                    <div className="space-y-1 pt-2 border-t border-white/5">
                      <span className="text-[9px] font-mono text-zinc-500 uppercase block">Ключові патерни:</span>
                      {sd.bestPractices.map((bp, bIdx) => (
                        <div key={bIdx} className="text-[11px] text-zinc-300 flex items-start gap-1.5">
                          <span className="text-cyan-400">•</span>
                          <span>{bp}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Section: Red Flags ── */}
          {(activeSection === "all" || activeSection === "red_flags") && (
            <div className="p-6 rounded-3xl bg-zinc-950/70 border border-white/[0.08] backdrop-blur-xl space-y-4 shadow-lg">
              <div className="flex items-center gap-2 pb-3 border-b border-white/[0.08]">
                <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400">
                  <ShieldAlert className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider">
                  {isUa ? "4. Червоні прапорці (Red Flags — Чого категорично не казати)" : "4. Red Flags & Fatal Mistakes"}
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {cheatSheet.redFlags.map((rf, i) => (
                  <div
                    key={i}
                    className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-2 text-xs"
                  >
                    <div className="text-red-400 flex items-start gap-1.5 leading-snug">
                      <span className="font-bold">❌</span>
                      <span>{rf.mistake}</span>
                    </div>
                    <div className="text-emerald-300 flex items-start gap-1.5 leading-snug pl-5 pt-0.5 border-l border-emerald-500/20">
                      <span className="font-bold">✅</span>
                      <span>{rf.fix}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Section: Reverse Questions ── */}
          {(activeSection === "all" || activeSection === "reverse_questions") && (
            <div className="p-6 rounded-3xl bg-zinc-950/70 border border-white/[0.08] backdrop-blur-xl space-y-4 shadow-lg">
              <div className="flex items-center gap-2 pb-3 border-b border-white/[0.08]">
                <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
                  <HelpCircle className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider">
                  {isUa ? "5. Сильні запитання кандидату для інтерв'юера" : "5. High-Signal Reverse Questions"}
                </h3>
              </div>

              <div className="space-y-2">
                {cheatSheet.reverseQuestions.map((rq, i) => (
                  <div
                    key={i}
                    className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-start gap-2.5">
                      <span className="font-mono text-emerald-400 font-bold">#{i + 1}</span>
                      <p className="text-zinc-200 font-medium leading-relaxed">{rq}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopyText(rq, `rq_${i}`)}
                      className="p-1.5 rounded-lg bg-white/[0.05] hover:bg-white/10 text-zinc-400 hover:text-white shrink-0 cursor-pointer"
                      title="Копіювати запитання"
                    >
                      {copiedKey === `rq_${i}` ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
