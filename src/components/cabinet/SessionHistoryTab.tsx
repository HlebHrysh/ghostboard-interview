"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Clock,
  Award,
  Sparkles,
  FileText,
  Download,
  Trash2,
  ExternalLink,
  ChevronRight,
  X,
  Search,
  CheckCircle2,
  Activity,
  ArrowRight,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { InterviewQAItem } from "@/types/interview";

export interface SavedPastSession {
  id: string;
  title: string;
  timestamp?: number | string;
  createdAt?: string;
  durationSec: number;
  questionsCount?: number;
  items: InterviewQAItem[];
}

interface SessionHistoryTabProps {
  locale: string;
  onRefreshStats?: () => void;
}

export function SessionHistoryTab({ locale, onRefreshStats }: SessionHistoryTabProps) {
  const isUa = locale === "ua";
  const [sessions, setSessions] = useState<SavedPastSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTranscriptSession, setActiveTranscriptSession] = useState<SavedPastSession | null>(null);

  const loadSessions = async () => {
    setLoading(true);
    let loaded: SavedPastSession[] = [];

    // 1. LocalStorage
    try {
      const local = localStorage.getItem("ghostboard_saved_sessions");
      if (local) {
        loaded = JSON.parse(local);
      }
    } catch {}

    // 2. Remote API
    try {
      const res = await fetch("/api/sessions/history");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.history) && data.history.length > 0) {
          const apiSessions: SavedPastSession[] = data.history.map((h: {
            id: string;
            title?: string;
            timestamp?: number | string;
            createdAt?: string;
            durationSec?: number;
            questionsCount?: number;
            items?: InterviewQAItem[];
          }) => ({
            id: h.id,
            title: h.title || (isUa ? "Сесія співбесіди" : "Interview Session"),
            timestamp: h.timestamp || h.createdAt || Date.now(),
            durationSec: h.durationSec || 0,
            questionsCount: h.questionsCount || (h.items ? h.items.length : 0),
            items: Array.isArray(h.items) ? h.items : [],
          }));

          const map = new Map<string, SavedPastSession>();
          [...apiSessions, ...loaded].forEach((s) => map.set(s.id || String(s.timestamp), s));
          loaded = Array.from(map.values());
        }
      }
    } catch {}

    // Sort newest first
    loaded.sort((a, b) => {
      const timeA = new Date(a.timestamp || 0).getTime() || Number(a.timestamp) || 0;
      const timeB = new Date(b.timestamp || 0).getTime() || Number(b.timestamp) || 0;
      return timeB - timeA;
    });

    setSessions(loaded);
    setLoading(false);
  };

  useEffect(() => {
    loadSessions();
  }, [locale]);

  const handleDeleteSession = (sessionId: string) => {
    try {
      const updated = sessions.filter((s) => s.id !== sessionId);
      setSessions(updated);
      localStorage.setItem("ghostboard_saved_sessions", JSON.stringify(updated));
      toast.success(isUa ? "Сесію видалено з історії" : "Session removed from history");
      onRefreshStats?.();
    } catch {
      toast.error(isUa ? "Помилка видалення" : "Failed to delete");
    }
  };

  const handleExportMarkdown = (session: SavedPastSession) => {
    if (!session.items || session.items.length === 0) {
      toast.info(isUa ? "Немає запитань для експорту" : "No Q&As to export");
      return;
    }

    const dateStr = new Date(session.timestamp || Date.now()).toLocaleDateString(
      isUa ? "uk-UA" : "en-US"
    );

    let md = `# Ghostboard Interview Session: ${session.title}\n`;
    md += `*Дата:* ${dateStr} | *Тривалість:* ${Math.round(session.durationSec / 60)} хв | *Запитань:* ${session.items.length}\n\n`;
    md += `---\n\n`;

    session.items.forEach((item, index) => {
      md += `### #${index + 1}: ${item.question}\n`;
      if (item.tag) md += `**Категорія:** \`${item.tag}\`\n\n`;
      if (item.quickAnswer) md += `**Коротка суть (STAR):**\n${item.quickAnswer}\n\n`;
      if (item.codeSnippet) {
        md += `\`\`\`typescript\n${item.codeSnippet}\n\`\`\`\n\n`;
      }
      if (item.hints && item.hints.length > 0) {
        md += `**Ключові тези:**\n`;
        item.hints.forEach((bp: string) => {
          md += `- ${bp}\n`;
        });
        md += `\n`;
      }
      md += `---\n\n`;
    });

    const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `ghostboard-${session.id.slice(0, 8)}-${Date.now()}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success(isUa ? "Стенограму експортовано в Markdown" : "Transcript exported to Markdown");
  };

  const filteredSessions = sessions.filter((s) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      s.title?.toLowerCase().includes(q) ||
      s.items?.some((item) => item.question?.toLowerCase().includes(q) || item.quickAnswer?.toLowerCase().includes(q))
    );
  });

  const totalQuestionsAll = sessions.reduce((acc, s) => acc + (s.questionsCount || s.items?.length || 0), 0);
  const totalDurationMin = Math.round(sessions.reduce((acc, s) => acc + (s.durationSec || 0), 0) / 60);

  return (
    <div className="space-y-6">
      {/* ── Top Header & Stats Strip ── */}
      <div className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-zinc-950/70 p-6 sm:p-8 backdrop-blur-2xl shadow-[0_24px_48px_-12px_rgba(0,0,0,0.8)] space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-white/[0.08]">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-white tracking-tight flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-400" />
                <span>{isUa ? "Історія сесій та 3D-Скоркарди" : "Session History & 3D Scorecards"}</span>
              </h2>
            </div>
            <p className="mt-1 text-xs text-zinc-400">
              {isUa
                ? "Стенограми ваших технічних раундів, аналітика STAR-відповідей та прямі посилання на 3D-скоркарди"
                : "Your interview debrief transcripts, STAR telemetry & instant 3D scorecard badges"}
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={loadSessions}
              disabled={loading}
              className="p-2 rounded-xl bg-white/[0.04] border border-white/10 hover:border-white/20 text-zinc-300 hover:text-white transition-all cursor-pointer"
              title={isUa ? "Оновити історію" : "Refresh history"}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            </button>

            <Link
              href="/mock-interview"
              className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3.5 py-2 text-xs font-semibold text-zinc-950 hover:bg-zinc-200 transition-all cursor-pointer active:scale-95"
            >
              <Sparkles className="w-3.5 h-3.5 fill-black" />
              <span>{isUa ? "Новий спарринг в Арені" : "New Sparring Session"}</span>
            </Link>
          </div>
        </div>

        {/* 3 Quick Telemetry Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-between">
            <div>
              <span className="text-[11px] font-mono text-zinc-500 uppercase block">
                {isUa ? "Пройдено сесій" : "Total Sessions"}
              </span>
              <span className="text-xl font-bold font-mono text-white mt-0.5 block">
                {sessions.length}
              </span>
            </div>
            <div className="w-9 h-9 rounded-xl bg-white/[0.05] border border-white/10 flex items-center justify-center text-zinc-300">
              <FileText className="w-4 h-4" />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-between">
            <div>
              <span className="text-[11px] font-mono text-zinc-500 uppercase block">
                {isUa ? "Опрацьовано питань" : "Q&A Answered"}
              </span>
              <span className="text-xl font-bold font-mono text-emerald-400 mt-0.5 block">
                {totalQuestionsAll}
              </span>
            </div>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-between">
            <div>
              <span className="text-[11px] font-mono text-zinc-500 uppercase block">
                {isUa ? "Час тренувань" : "Total Practice Time"}
              </span>
              <span className="text-xl font-bold font-mono text-zinc-200 mt-0.5 block">
                {totalDurationMin} {isUa ? "хв" : "min"}
              </span>
            </div>
            <div className="w-9 h-9 rounded-xl bg-white/[0.05] border border-white/10 flex items-center justify-center text-zinc-300">
              <Clock className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* Search Bar */}
        {sessions.length > 0 && (
          <div className="relative">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                isUa
                  ? "Пошук за темою співбесіди чи запитанням..."
                  : "Filter sessions by question or topic..."
              }
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-900/60 border border-white/10 text-xs text-white placeholder-zinc-500 focus:border-white/30 focus:outline-none transition-all"
            />
          </div>
        )}
      </div>

      {/* ── Sessions List / Empty State ── */}
      {loading ? (
        <div className="p-12 text-center rounded-3xl border border-white/[0.08] bg-zinc-950/40 space-y-3">
          <div className="w-8 h-8 rounded-full border-2 border-white/10 border-t-white animate-spin mx-auto" />
          <p className="text-xs text-zinc-500 font-mono">
            {isUa ? "Завантаження архіву сесій..." : "Loading session archive..."}
          </p>
        </div>
      ) : filteredSessions.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-white/15 bg-zinc-950/40 p-10 sm:p-12 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-center mx-auto text-zinc-400 shadow-inner">
            <Award className="w-7 h-7 text-zinc-300" />
          </div>
          <div className="max-w-md mx-auto space-y-1.5">
            <h3 className="text-sm sm:text-base font-semibold text-white font-mono">
              {sessions.length === 0
                ? isUa
                  ? "У вас ще немає збережених сесій"
                  : "No recorded interview sessions yet"
                : isUa
                ? "Нічого не знайдено за запитом"
                : "No matching sessions found"}
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed font-sans">
              {sessions.length === 0
                ? isUa
                  ? "Пройдіть технічний спарринг в Арені або запустіть Copilot Studio. Після закінчення раунду повна стенограма та 3D-скоркард з'являться тут автоматично."
                  : "Conduct a live voice sparring round in the Arena or launch Copilot Studio. Once finished, your full transcript and verified 3D scorecard will appear here."
                : isUa
                ? "Спробуйте змінити пошуковий запит або очистіть рядок пошуку."
                : "Try clearing your search query to see all sessions."}
            </p>
          </div>

          {sessions.length === 0 && (
            <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/mock-interview"
                className="btn-resend-primary text-xs font-mono !py-2.5 !px-5 flex items-center gap-2"
              >
                <Activity className="w-3.5 h-3.5 fill-black" />
                <span>{isUa ? "Почати тренування в Арені" : "Start Arena Sparring"}</span>
              </Link>
              <Link
                href="/interview"
                className="btn-resend-glass text-xs font-mono !py-2.5 !px-5 flex items-center gap-2"
              >
                <Sparkles className="w-3.5 h-3.5 text-zinc-300" />
                <span>{isUa ? "Запустити Copilot Studio" : "Launch Copilot Studio"}</span>
              </Link>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredSessions.map((session) => {
            const dateObj = new Date(session.timestamp || Date.now());
            const dateFormatted = !isNaN(dateObj.getTime())
              ? dateObj.toLocaleString(isUa ? "uk-UA" : "en-US", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "Нещодавно";

            const durationMin = Math.max(1, Math.round((session.durationSec || 60) / 60));
            const questionsCount = session.questionsCount || session.items?.length || 0;

            return (
              <div
                key={session.id}
                className="group p-5 rounded-2xl bg-zinc-950/70 border border-white/[0.08] hover:border-white/20 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 backdrop-blur-xl shadow-lg"
              >
                {/* Session Info */}
                <div className="space-y-2 min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold text-white font-mono truncate max-w-sm sm:max-w-md">
                      {session.title}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/[0.06] text-zinc-300 border border-white/10 uppercase">
                      {durationMin} {isUa ? "хв" : "min"}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 uppercase font-semibold">
                      {questionsCount} {isUa ? "Q&A" : "questions"}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-[11px] text-zinc-500 font-mono">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-zinc-400" />
                      <span>{dateFormatted}</span>
                    </span>
                    <span>•</span>
                    <span className="text-zinc-400">ID: {session.id.slice(0, 8)}</span>
                  </div>
                </div>

                {/* 1-Click Action Buttons */}
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  {/* View Transcript Modal */}
                  <button
                    type="button"
                    onClick={() => setActiveTranscriptSession(session)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/10 border border-white/10 text-xs font-mono text-zinc-200 hover:text-white transition-all cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5 text-zinc-300" />
                    <span>{isUa ? "Стенограма Q&A" : "View Q&A"}</span>
                  </button>

                  {/* 3D Scorecard Button */}
                  <Link
                    href={`/scorecard/${encodeURIComponent(session.id)}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white text-white hover:text-black border border-white/20 text-xs font-mono font-semibold transition-all shadow-[0_0_15px_rgba(255,255,255,0.08)] cursor-pointer"
                  >
                    <Award className="w-3.5 h-3.5" />
                    <span>{isUa ? "3D-Скоркард" : "3D Scorecard"}</span>
                    <ArrowRight className="w-3 h-3 opacity-60" />
                  </Link>

                  {/* Export Markdown */}
                  <button
                    type="button"
                    onClick={() => handleExportMarkdown(session)}
                    className="p-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                    title={isUa ? "Експорт у Markdown" : "Export to Markdown"}
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>

                  {/* Delete */}
                  <button
                    type="button"
                    onClick={() => handleDeleteSession(session.id)}
                    className="p-2 rounded-xl bg-white/[0.03] hover:bg-red-500/20 border border-white/10 hover:border-red-500/30 text-zinc-500 hover:text-red-400 transition-colors cursor-pointer"
                    title={isUa ? "Видалити з історії" : "Delete session"}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Transcript Modal ── */}
      {activeTranscriptSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-3xl max-h-[85vh] flex flex-col rounded-3xl bg-[#0e0e14] border border-white/15 shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-white/10 bg-zinc-950/80">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-sm font-bold text-white font-mono truncate max-w-lg">
                    {activeTranscriptSession.title}
                  </h3>
                </div>
                <p className="text-xs text-zinc-400 font-mono">
                  {isUa ? "Повна стенограма запитань та STAR-відповідей" : "Complete Q&A transcript and STAR answers"}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleExportMarkdown(activeTranscriptSession)}
                  className="btn-resend-glass !py-1.5 !px-3 text-xs font-mono gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Markdown</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTranscriptSession(null)}
                  className="p-2 rounded-xl bg-white/[0.05] hover:bg-white/15 border border-white/10 text-zinc-400 hover:text-white transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Body: Q&A Items */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
              {activeTranscriptSession.items && activeTranscriptSession.items.length > 0 ? (
                activeTranscriptSession.items.map((qa, idx) => (
                  <div
                    key={qa.id || idx}
                    className="p-4 sm:p-5 rounded-2xl bg-zinc-900/60 border border-white/[0.08] space-y-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2.5">
                        <span className="flex-shrink-0 w-6 h-6 rounded-lg bg-white/10 border border-white/20 text-zinc-200 text-xs font-mono font-bold flex items-center justify-center mt-0.5">
                          #{idx + 1}
                        </span>
                        <h4 className="text-sm font-semibold text-white leading-snug">
                          {qa.question}
                        </h4>
                      </div>

                      {qa.tag && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-zinc-400 uppercase shrink-0">
                          {qa.tag}
                        </span>
                      )}
                    </div>

                    {qa.quickAnswer && (
                      <div className="p-3.5 rounded-xl bg-black/40 border border-white/5 text-xs text-zinc-300 leading-relaxed font-sans">
                        <span className="font-mono text-zinc-500 uppercase text-[10px] font-bold block mb-1">
                          {isUa ? "STAR-відповідь / Суть:" : "Core STAR Answer:"}
                        </span>
                        {qa.quickAnswer}
                      </div>
                    )}

                    {qa.codeSnippet && (
                      <div className="p-3 rounded-xl bg-black/80 border border-white/10 font-mono text-xs text-emerald-300 overflow-x-auto">
                        <pre>
                          <code>{qa.codeSnippet}</code>
                        </pre>
                      </div>
                    )}

                    {qa.hints && qa.hints.length > 0 && (
                      <ul className="space-y-1 text-xs text-zinc-400 font-sans pl-2">
                        {qa.hints.map((point: string, pIdx: number) => (
                          <li key={pIdx} className="flex items-start gap-2">
                            <span className="text-zinc-500 mt-1">•</span>
                            <span>{point}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-zinc-500 text-xs font-mono">
                  {isUa ? "У цій сесії не зафіксовано окремих запитань" : "No individual Q&As recorded in this session"}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-white/10 bg-zinc-950/80 flex items-center justify-between text-xs font-mono">
              <span className="text-zinc-500">
                {activeTranscriptSession.items?.length || 0} {isUa ? "запитань збережено" : "questions recorded"}
              </span>
              <Link
                href={`/scorecard/${encodeURIComponent(activeTranscriptSession.id)}`}
                className="btn-resend-primary !py-2 !px-4 text-xs font-mono flex items-center gap-1.5"
              >
                <span>{isUa ? "Відкрити 3D-Скоркард" : "Open 3D Scorecard"}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
