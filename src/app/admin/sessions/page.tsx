"use client";

import React, { useEffect, useState, useMemo } from "react";
import {
  Mic,
  Search,
  Download,
  Trash2,
  ExternalLink,
  Clock,
  HelpCircle,
  Eye,
  X,
  Loader2,
  AlertCircle,
  Sparkles,
  Calendar,
  Layers,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

interface SessionItem {
  id: string;
  userId: string;
  userEmail: string;
  title: string;
  timestamp: number;
  durationSec: number;
  questionsCount: number;
  items: any[];
  isPublic?: boolean;
  publicSlug?: string | null;
}

export default function AdminSessions() {
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [privacyFilter, setPrivacyFilter] = useState<"all" | "public" | "private">("all");

  // Inspection & Deletion modal
  const [inspectingSession, setInspectingSession] = useState<SessionItem | null>(null);
  const [sessionToDelete, setSessionToDelete] = useState<SessionItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchSessions = async () => {
    try {
      const res = await fetch("/api/admin/sessions");
      if (res.status === 401) {
        window.location.href = "/admin/login?from=/admin/sessions";
        return;
      }
      const data = await res.json();
      if (Array.isArray(data)) {
        setSessions(data);
      } else {
        setSessions([]);
      }
    } catch {
      setSessions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const handleDeleteSession = async () => {
    if (!sessionToDelete) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/admin/sessions?id=${sessionToDelete.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success("Сесію успішно видалено");
        setSessionToDelete(null);
        if (inspectingSession?.id === sessionToDelete.id) {
          setInspectingSession(null);
        }
        fetchSessions();
      } else {
        const d = await res.json();
        toast.error(d.error || "Не вдалося видалити сесію");
      }
    } catch (e: any) {
      toast.error(e.message || "Помилка видалення");
    } finally {
      setIsDeleting(false);
    }
  };

  const exportCSV = () => {
    if (sessions.length === 0) {
      toast.error("Немає записів для експорту");
      return;
    }
    const headers = ["ID", "UserEmail", "Title", "DurationSec", "QuestionsCount", "IsPublic", "PublicSlug", "Date"];
    const rows = sessions.map((s) => [
      s.id,
      s.userEmail,
      `"${(s.title || "").replace(/"/g, '""')}"`,
      s.durationSec,
      s.questionsCount,
      s.isPublic ? "true" : "false",
      s.publicSlug || "",
      new Date(s.timestamp).toISOString(),
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `ghostboard_sessions_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("CSV експорт сесій завантажено");
  };

  // Metrics
  const totalSessions = sessions.length;
  const totalQuestions = sessions.reduce((acc, s) => acc + (s.questionsCount || 0), 0);
  const totalHours = Math.round((sessions.reduce((acc, s) => acc + (s.durationSec || 0), 0) / 3600) * 10) / 10;

  // Filtered
  const filteredSessions = useMemo(() => {
    return sessions.filter((s) => {
      const q = search.toLowerCase();
      const matchesSearch =
        s.userEmail.toLowerCase().includes(q) ||
        (s.title && s.title.toLowerCase().includes(q));

      const matchesPrivacy =
        privacyFilter === "all" ||
        (privacyFilter === "public" && s.isPublic) ||
        (privacyFilter === "private" && !s.isPublic);

      return matchesSearch && matchesPrivacy;
    });
  }, [sessions, search, privacyFilter]);

  return (
    <div className="space-y-6">
      {/* ── Top Header ── */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black font-mono text-white tracking-wider uppercase flex items-center gap-3">
            <span>Interview Recordings</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-white/10 text-zinc-300 font-normal">
              {filteredSessions.length} of {totalSessions}
            </span>
          </h1>
          <p className="text-xs font-mono text-zinc-500 mt-1">
            Аудит тренувальних інтервʼю, відповіді на запитання та скоркарди
          </p>
        </div>

        <button
          onClick={exportCSV}
          className="flex items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs font-mono text-zinc-300 hover:text-white transition-all cursor-pointer"
        >
          <Download className="w-3.5 h-3.5 text-zinc-400" />
          <span>Export CSV</span>
        </button>
      </div>

      {/* ── Metric Highlights ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-3xl bg-[#08080c] border border-white/[0.08] flex items-center justify-between font-mono">
          <div>
            <div className="text-[10px] text-zinc-500 uppercase tracking-widest">Всього сесій</div>
            <div className="text-2xl font-black text-white mt-1">{totalSessions}</div>
          </div>
          <div className="p-2.5 rounded-xl bg-white/10 border border-white/20 text-white">
            <Mic className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-3xl bg-[#08080c] border border-white/[0.08] flex items-center justify-between font-mono">
          <div>
            <div className="text-[10px] text-zinc-500 uppercase tracking-widest">Питань опрацьовано</div>
            <div className="text-2xl font-black text-white mt-1">{totalQuestions}</div>
          </div>
          <div className="p-2.5 rounded-xl bg-white/10 border border-white/20 text-white">
            <HelpCircle className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-3xl bg-[#08080c] border border-white/[0.08] flex items-center justify-between font-mono">
          <div>
            <div className="text-[10px] text-zinc-500 uppercase tracking-widest">Напрацьований час</div>
            <div className="text-2xl font-black text-white mt-1">{totalHours} годин</div>
          </div>
          <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
            <Clock className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* ── Search & Filter Controls ── */}
      <div className="bg-[#08080c] border border-white/[0.08] p-4 rounded-3xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 font-mono text-xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Пошук за email кандидата або темою співбесіди..."
            className="w-full bg-black/40 border border-white/10 rounded-2xl py-2.5 pl-10 pr-4 text-xs font-mono text-white placeholder-zinc-600 focus:outline-none focus:border-white/50 transition-all"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          {[
            { key: "all", label: "Всі сесії" },
            { key: "public", label: "Публічні скоркарди" },
            { key: "private", label: "Приватні" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setPrivacyFilter(tab.key as any)}
              className={`px-3 py-1.5 rounded-xl uppercase font-bold text-[10px] tracking-wider transition-all cursor-pointer whitespace-nowrap ${
                privacyFilter === tab.key
                  ? "bg-white text-black shadow-[0_0_12px_rgba(255,255,255,0.3)]"
                  : "bg-white/[0.03] text-zinc-400 hover:text-white hover:bg-white/[0.07]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Sessions Table ── */}
      {loading ? (
        <div className="flex justify-center py-24">
          <Loader2 className="w-8 h-8 animate-spin text-white" />
        </div>
      ) : (
        <div className="bg-[#08080c] border border-white/[0.08] rounded-3xl overflow-hidden overflow-x-auto shadow-2xl">
          <table className="w-full text-left font-mono text-xs whitespace-nowrap">
            <thead className="bg-white/[0.03] border-b border-white/[0.08] text-zinc-400">
              <tr>
                <th className="p-4 font-bold uppercase text-[10px] tracking-wider">Date & Time</th>
                <th className="p-4 font-bold uppercase text-[10px] tracking-wider">Candidate Email</th>
                <th className="p-4 font-bold uppercase text-[10px] tracking-wider">Topic / Title</th>
                <th className="p-4 font-bold uppercase text-[10px] tracking-wider text-right">Duration</th>
                <th className="p-4 font-bold uppercase text-[10px] tracking-wider text-right">Q&A Items</th>
                <th className="p-4 font-bold uppercase text-[10px] tracking-wider text-center">Scorecard</th>
                <th className="p-4 font-bold uppercase text-[10px] tracking-wider text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {filteredSessions.map((s) => {
                const dateStr = new Date(s.timestamp).toLocaleString("uk-UA", {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                });
                const mins = Math.floor(s.durationSec / 60);
                const secs = s.durationSec % 60;

                return (
                  <tr key={s.id} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="p-4 text-zinc-400">{dateStr}</td>
                    <td className="p-4 text-white font-bold">{s.userEmail}</td>
                    <td className="p-4 text-zinc-300 max-w-xs truncate">{s.title || "Технічне інтервʼю"}</td>
                    <td className="p-4 text-right text-zinc-300 font-bold">
                      {mins > 0 ? `${mins}хв ${secs}с` : `${secs}с`}
                    </td>
                    <td className="p-4 text-right">
                      <span className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 font-bold text-zinc-200">
                        {s.questionsCount} пит.
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      {s.isPublic && s.publicSlug ? (
                        <Link
                          href={`/scorecard/${s.publicSlug}`}
                          target="_blank"
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 text-white border border-white/20 font-bold text-[10px] hover:bg-white/20"
                        >
                          <span>Public</span>
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      ) : (
                        <span className="text-[10px] text-zinc-600 font-bold uppercase">Private</span>
                      )}
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => setInspectingSession(s)}
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-white/20 hover:text-white text-zinc-400 transition-all cursor-pointer"
                          title="Інспектувати Q&A запитання"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setSessionToDelete(s)}
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-rose-500/20 hover:text-rose-400 text-zinc-400 transition-all cursor-pointer"
                          title="Видалити запис сесії"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredSessions.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-zinc-500 font-mono">
                    Записів сесій не знайдено.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Modal: Inspect Session Details & Q&A Items ── */}
      {inspectingSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-[#08080c] border border-white/[0.1] rounded-3xl p-6 sm:p-8 max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl font-mono space-y-6">
            <div className="flex items-start justify-between border-b border-white/[0.08] pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-white/10 text-zinc-200 border border-white/20 font-bold uppercase">
                    Session Log
                  </span>
                  <span className="text-[10px] text-zinc-500">{new Date(inspectingSession.timestamp).toLocaleString("uk-UA")}</span>
                </div>
                <h3 className="text-lg font-black text-white mt-1">
                  {inspectingSession.title || "Технічне інтерв'ю"}
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Кандидат: <span className="text-white font-bold">{inspectingSession.userEmail}</span> • {Math.round(inspectingSession.durationSec / 60)} хв
                </p>
              </div>
              <button
                onClick={() => setInspectingSession(null)}
                className="p-1.5 text-zinc-500 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Q&A Items Scrollable Content */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-white" />
                <span>Опрацьовані запитання ({inspectingSession.items?.length || 0})</span>
              </h4>

              {Array.isArray(inspectingSession.items) && inspectingSession.items.length > 0 ? (
                inspectingSession.items.map((qa: any, idx: number) => (
                  <div
                    key={qa.id || idx}
                    className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-2 text-xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-bold text-white leading-relaxed">
                        #{idx + 1}. {qa.question}
                      </span>
                      {qa.tag && (
                        <span className="text-[9px] px-2 py-0.5 rounded-full bg-white/5 text-zinc-400 border border-white/10 flex-shrink-0">
                          {qa.tag}
                        </span>
                      )}
                    </div>

                    {qa.quickAnswer && (
                      <p className="text-zinc-300 text-[11px] leading-relaxed bg-black/40 p-3 rounded-xl border border-white/5">
                        {qa.quickAnswer}
                      </p>
                    )}

                    {qa.hints && Array.isArray(qa.hints) && qa.hints.length > 0 && (
                      <div className="space-y-1 pt-1">
                        <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Тези / Hints:</span>
                        <ul className="list-disc list-inside text-[11px] text-zinc-400 space-y-0.5">
                          {qa.hints.map((h: string, hIdx: number) => (
                            <li key={hIdx}>{h}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {qa.codeSnippet && (
                      <div className="pt-1">
                        <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Код:</span>
                        <pre className="p-2.5 rounded-xl bg-black border border-white/10 text-[10px] text-zinc-200 overflow-x-auto mt-1">
                          {qa.codeSnippet}
                        </pre>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-zinc-500 text-xs">
                  У цьому записі немає збережених Q&A запитань.
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-white/[0.08] flex items-center justify-between">
              {inspectingSession.isPublic && inspectingSession.publicSlug ? (
                <Link
                  href={`/scorecard/${inspectingSession.publicSlug}`}
                  target="_blank"
                  className="text-xs text-zinc-300 hover:text-white hover:underline flex items-center gap-1 font-bold"
                >
                  <span>Відкрити публічний скоркард</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              ) : (
                <span className="text-xs text-zinc-600">Скоркард приватний</span>
              )}

              <button
                onClick={() => setInspectingSession(null)}
                className="btn-resend-glass text-xs !px-4 !py-2 font-mono"
              >
                Закрити
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Confirm Delete ── */}
      {sessionToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#08080c] border border-rose-500/20 rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl space-y-4 font-mono text-center">
            <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-400 mx-auto flex items-center justify-center">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-white uppercase">Видалити сесію?</h3>
            <p className="text-xs text-zinc-400">
              Ви збираєтесь видалити запис <span className="text-white font-bold">{sessionToDelete.title}</span> користувача {sessionToDelete.userEmail}.
            </p>
            <div className="pt-2 flex justify-center gap-3">
              <button
                onClick={() => setSessionToDelete(null)}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 text-xs"
              >
                Скасувати
              </button>
              <button
                onClick={handleDeleteSession}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer"
              >
                {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Видалити"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
