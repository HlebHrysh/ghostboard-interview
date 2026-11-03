"use client";

import React, { useState } from "react";
import {
  Sparkles,
  Zap,
  Download,
  Copy,
  Check,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  FileText,
  Target,
} from "lucide-react";
import { toast } from "sonner";
import { PostInterviewCheatSheetData } from "@/app/api/scorecard/cheat-sheet/route";

interface PostInterviewCheatSheetClientProps {
  slug: string;
  items: Array<{ question?: string; tag?: string; quickAnswer?: string }>;
  overallScore: number;
}

export function PostInterviewCheatSheetClient({
  slug,
  items,
  overallScore,
}: PostInterviewCheatSheetClientProps) {
  const [cheatSheet, setCheatSheet] = useState<PostInterviewCheatSheetData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleGenerate = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/scorecard/cheat-sheet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, items, overallScore }),
      });
      const data = await res.json();
      if (res.ok && data.success && data.cheatSheet) {
        setCheatSheet(data.cheatSheet);
        toast.success("AI Cheat-Sheet по сесії успішно згенеровано!");
      } else {
        toast.error(data.error || "Помилка генерації");
      }
    } catch {
      toast.error("Помилка зв'язку з сервером");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.success("Скопійовано!");
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleExportMarkdown = () => {
    if (!cheatSheet) return;
    let md = `# Post-Interview AI Cheat-Sheet (Session ${cheatSheet.slug})\n\n`;
    md += `*Загальний бал:* ${cheatSheet.overallScore}/100 | *Перевірено запитань:* ${cheatSheet.totalReviewed}\n\n`;
    md += `${cheatSheet.executiveSummary}\n\n---\n\n`;

    md += `## 🎯 Розбір запитань та робота над помилками\n\n`;
    cheatSheet.remediations.forEach((rem, idx) => {
      md += `### #${idx + 1}: ${rem.originalQuestion} [${rem.category}]\n`;
      md += `**⚡ Ідеальний Senior-хук:** ${rem.seniorHook}\n\n`;
      md += `**Повна відповідь:** ${rem.idealAnswer}\n\n`;
      md += `⚠️ **Пастка інтерв'юера на follow-up:** ${rem.interviewerFollowupTrap}\n\n`;
      md += `💡 **Висновок:** ${rem.takeaway}\n\n---\n\n`;
    });

    md += `## 📋 План підготовки до наступного раунду\n\n`;
    cheatSheet.actionPlan.forEach((plan, i) => {
      md += `${i + 1}. ${plan}\n`;
    });

    const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `debrief-cheat-sheet-${cheatSheet.slug.slice(0, 8)}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("Експортовано в Markdown!");
  };

  return (
    <div className="my-10 p-6 sm:p-8 rounded-3xl bg-zinc-950/80 border border-white/10 backdrop-blur-xl shadow-2xl space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.08]">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-amber-400/10 text-amber-300">
              <Zap className="w-4 h-4" />
            </div>
            <h2 className="text-base font-bold text-white font-mono uppercase tracking-tight">
              Post-Interview AI Cheat-Sheet & Робота над помилками
            </h2>
          </div>
          <p className="text-xs text-zinc-400">
            Отримайте персональну шпаргалку за цим інтерв'ю: виправлені відповіді, хуки та пастки інтерв'юера на follow-up.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {!cheatSheet ? (
            <button
              type="button"
              onClick={handleGenerate}
              disabled={isLoading}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-zinc-950 text-xs font-mono font-bold hover:bg-zinc-200 transition-all cursor-pointer shadow-[0_0_15px_rgba(255,255,255,0.2)] disabled:opacity-50"
            >
              <Sparkles className={`w-3.5 h-3.5 fill-black ${isLoading ? "animate-spin" : ""}`} />
              <span>{isLoading ? "Аналіз сесії..." : "Згенерувати AI Cheat-Sheet"}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleExportMarkdown}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/10 text-xs font-mono text-zinc-200 border border-white/10 transition-all cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Експорт Markdown</span>
            </button>
          )}
        </div>
      </div>

      {cheatSheet && (
        <div className="space-y-4 pt-1">
          <p className="text-xs text-zinc-300 font-mono bg-white/[0.02] p-3 rounded-2xl border border-white/5">
            {cheatSheet.executiveSummary}
          </p>

          <div className="space-y-3">
            {cheatSheet.remediations.map((rem, idx) => (
              <div
                key={idx}
                className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:border-white/15 transition-all space-y-2.5"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-md bg-amber-400/20 text-amber-300 font-mono text-xs flex items-center justify-center font-bold">
                      #{idx + 1}
                    </span>
                    <h3 className="font-semibold text-xs sm:text-sm text-zinc-100">
                      {rem.originalQuestion}
                    </h3>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 text-zinc-400 border border-white/5">
                    {rem.category}
                  </span>
                </div>

                <div className="pl-3 border-l-2 border-amber-400/80 space-y-1.5">
                  <div className="text-xs text-amber-200 font-medium">
                    <span className="font-mono text-[10px] uppercase text-amber-400 block mb-0.5">
                      ⚡ Рекомендований Senior-хук:
                    </span>
                    {rem.seniorHook}
                  </div>
                  <div className="text-xs text-zinc-300 leading-relaxed font-sans">
                    {rem.idealAnswer}
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-rose-950/20 border border-rose-500/20 text-rose-200 text-[11px] flex items-start gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-mono font-bold text-rose-400 uppercase mr-1">Пастка на follow-up:</span>
                    <span>{rem.interviewerFollowupTrap}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="p-4 rounded-2xl bg-cyan-950/20 border border-cyan-500/25 space-y-2">
            <span className="text-[11px] font-mono font-bold uppercase text-cyan-300 block">
              📋 План дій до наступного технічного раунду:
            </span>
            <ul className="space-y-1 text-xs text-zinc-200">
              {cheatSheet.actionPlan.map((step, sIdx) => (
                <li key={sIdx} className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{step}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
