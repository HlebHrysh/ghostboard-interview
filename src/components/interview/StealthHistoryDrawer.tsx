import React from 'react';
import { X, Trash2, Clock, Download } from 'lucide-react';
import { toast } from 'sonner';
import { InterviewQAItem } from '@/types/interview';
import { useLocale } from '@/contexts/LocaleContext';
import { getHistoryTranslations } from '@/lib/historyI18n';

interface StealthHistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  questions: InterviewQAItem[];
  activeId: string | null;
  onSelectQA: (id: string) => void;
  onClearHistory: () => void;
}

interface SavedPastSession {
  id: string;
  title: string;
  timestamp?: number;
  date?: string;
  durationSec: number;
  questionsCount?: number;
  items: InterviewQAItem[];
}

export const StealthHistoryDrawer: React.FC<StealthHistoryDrawerProps> = ({
  isOpen,
  onClose,
  questions,
  activeId,
  onSelectQA,
  onClearHistory,
}) => {
  const { locale } = useLocale();
  const t = getHistoryTranslations(locale);

  const [activeTab, setActiveTab] = React.useState<'current' | 'archive'>('current');
  const [pastSessions, setPastSessions] = React.useState<SavedPastSession[]>([]);
  const [isLoadingPast, setIsLoadingPast] = React.useState(false);
  const [expandedSessionId, setExpandedSessionId] = React.useState<string | null>(null);

  // Load past sessions from API and localStorage fallback
  React.useEffect(() => {
    if (!isOpen) return;

    const loadPast = async () => {
      setIsLoadingPast(true);
      let loaded: SavedPastSession[] = [];

      // 1. Try local storage first
      try {
        const local = localStorage.getItem('ghostboard_saved_sessions');
        if (local) {
          loaded = JSON.parse(local);
        }
      } catch {}

      // 2. Fetch from backend API
      try {
        const res = await fetch('/api/sessions/history');
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.history) && data.history.length > 0) {
            const apiSessions: SavedPastSession[] = data.history.map((h: { id: string; title?: string; timestamp?: number | string; durationSec?: number; questionsCount?: number; items?: unknown[] }) => ({
              id: h.id,
              title: h.title || t.tabCurrent,
              timestamp: Number(h.timestamp) || Date.now(),
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

      setPastSessions(loaded);
      setIsLoadingPast(false);
    };

    loadPast();
  }, [isOpen, locale]);

  const handleExportMarkdown = (itemsToExport: InterviewQAItem[] = questions, title = 'Current Session') => {
    if (itemsToExport.length === 0) return;
    const dateStr = new Date().toISOString().slice(0, 10);
    const dateLocaleTag = locale === 'ua' ? 'uk-UA' : locale === 'en' ? 'en-US' : `${locale}-${locale.toUpperCase()}`;
    const headers = t.exportHeaders;

    let md = `# Ghostboard Interview Session Debrief — ${title} (${dateStr})\n\n`;
    md += `**${headers.totalQuestions}:** ${itemsToExport.length}\n`;
    md += `**${headers.sessionDate}:** ${new Date().toLocaleString(dateLocaleTag)}\n\n`;
    md += `---\n\n`;

    itemsToExport.forEach((q, idx) => {
      md += `### ${headers.questionPrefix} #${itemsToExport.length - idx}: ${q.question}\n`;
      md += `*${headers.time}:* ${q.timecode || '00:00'} | *${headers.category}:* ${q.tag || '#QA'}\n\n`;
      if (q.startHook) {
        md += `> **${headers.hook}:** ${q.startHook}\n\n`;
      }
      md += `**${headers.quickAnswer}:**\n${q.quickAnswer}\n\n`;
      if (q.hints && q.hints.length > 0) {
        md += `**${headers.keyTheses}:**\n`;
        q.hints.forEach((h) => {
          md += `- ${h}\n`;
        });
        md += `\n`;
      }
      if (q.codeSnippet) {
        md += `**${headers.codeSnippet}:**\n\`\`\`\n${q.codeSnippet}\n\`\`\`\n\n`;
      }
      if (q.deliveryTip) {
        md += `💡 *${headers.deliveryTip}:* ${q.deliveryTip}\n\n`;
      }
      md += `---\n\n`;
    });

    // Generate Tailored Thank-You Follow-up Email Template
    const tagsDiscussed = Array.from(new Set(itemsToExport.map((q) => q.tag?.replace('#', '')).filter(Boolean)));
    const topicsPreview = tagsDiscussed.slice(0, 2).join(' and ') || 'system architecture and best practices';

    md += `## ✉️ ${headers.thankYouTitle}\n\n`;
    md += `*${headers.thankYouDesc}:*\n\n`;
    md += `\`\`\`text\n`;
    md += `Subject: Thank you for the conversation — [Your Name] / Engineering Interview\n\n`;
    md += `Hi [Interviewer Name],\n\n`;
    md += `Thank you for taking the time to speak with me today. I really enjoyed our technical discussion, especially exploring ${topicsPreview}.\n\n`;
    md += `Our conversation further reinforced my enthusiasm for the team's engineering challenges and vision. Please feel free to reach out if you need any additional code samples or context from my side.\n\n`;
    md += `Looking forward to the next steps!\n\n`;
    md += `Best regards,\n[Your Name]\n[LinkedIn / GitHub]\n`;
    md += `\`\`\`\n`;

    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ghostboard-interview-debrief-${dateStr}.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(t.exportSuccess);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Drawer Panel */}
      <div className="relative w-full max-w-lg h-full stealth-glass-panel border-l border-white/10 flex flex-col p-5 shadow-2xl z-10 animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div>
            <h2 className="text-base font-black text-white tracking-tight flex items-center gap-2">
              <span>{t.title}</span>
            </h2>
            <p className="text-[11px] text-zinc-400 font-mono">{t.subtitle}</p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-black/40 border border-white/10 my-3">
          <button
            type="button"
            onClick={() => setActiveTab('current')}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'current'
                ? 'bg-white text-black shadow-[0_0_15px_rgba(196,181,253,0.3)]'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <span>{t.tabCurrent}</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/20">
              {questions.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('archive')}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'archive'
                ? 'bg-white text-black shadow-[0_0_15px_rgba(196,181,253,0.3)]'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <span>{t.tabArchive}</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/20">
              {pastSessions.length}
            </span>
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'current' ? (
          /* CURRENT SESSION QUESTIONS */
          <div className="flex-1 overflow-y-auto py-2 space-y-2.5 custom-scrollbar">
            {questions.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-zinc-500">
                <Clock className="w-10 h-10 mb-2 opacity-30" />
                <p className="text-xs font-mono">{t.emptyCurrentTitle}</p>
                <p className="text-[11px] text-zinc-600 mt-1">
                  {t.emptyCurrentDesc}
                </p>
              </div>
            ) : (
              questions.map((q, idx) => {
                const isActive = q.id === activeId;
                return (
                  <div
                    key={q.id}
                    onClick={() => {
                      onSelectQA(q.id);
                      onClose();
                    }}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer text-left relative ${
                      isActive
                        ? 'bg-emerald-950/40 border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.15)]'
                        : 'bg-black/30 border-white/5 hover:border-white/20 hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="text-[10px] font-mono font-bold text-zinc-400">
                        #{questions.length - idx} • {q.timecode}
                      </span>
                      <span className="text-[9px] font-mono px-2 py-0.2 rounded bg-white/5 text-zinc-400 border border-white/10 uppercase">
                        {q.tag || '#QA'}
                      </span>
                    </div>

                    <p className="text-xs font-bold text-white line-clamp-2 leading-relaxed font-sans">
                      {q.question}
                    </p>

                    <p className="text-[11px] text-zinc-400 line-clamp-1 mt-1 font-sans">
                      {q.quickAnswer || q.startHook}
                    </p>
                  </div>
                );
              })
            )}
          </div>
        ) : (
          /* ARCHIVE OF PAST SESSIONS */
          <div className="flex-1 overflow-y-auto py-2 space-y-3 custom-scrollbar">
            {isLoadingPast ? (
              <div className="h-full flex items-center justify-center text-xs font-mono text-zinc-400">
                {t.loadingArchive}
              </div>
            ) : pastSessions.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-zinc-500">
                <Clock className="w-10 h-10 mb-2 opacity-30" />
                <p className="text-xs font-mono">{t.emptyArchiveTitle}</p>
                <p className="text-[11px] text-zinc-600 mt-1">
                  {t.emptyArchiveDesc}
                </p>
              </div>
            ) : (
              pastSessions.map((sess) => {
                const isExpanded = expandedSessionId === sess.id;
                const dateLocaleTag = locale === 'ua' ? 'uk-UA' : locale === 'en' ? 'en-US' : `${locale}-${locale.toUpperCase()}`;
                const formattedDate = sess.timestamp
                  ? new Date(sess.timestamp).toLocaleString(dateLocaleTag, {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : sess.date || t.recent;

                return (
                  <div
                    key={sess.id}
                    className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-2.5 transition-all"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-xs font-bold text-white font-sans">{sess.title}</div>
                        <div className="text-[10px] font-mono text-zinc-400 flex items-center gap-2 mt-0.5">
                          <span>📅 {formattedDate}</span>
                          <span>•</span>
                          <span>⏳ {Math.floor((sess.durationSec || 0) / 60)} {t.minutesShort}</span>
                          <span>•</span>
                          <span className="text-zinc-200 font-bold">
                            {t.questionsCount(sess.items?.length || sess.questionsCount || 0)}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setExpandedSessionId(isExpanded ? null : sess.id)}
                        className="text-[11px] font-mono text-zinc-400 hover:text-white px-2 py-1 rounded bg-white/5 border border-white/10 cursor-pointer"
                      >
                        {isExpanded ? t.collapse : t.details}
                      </button>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 pt-1 border-t border-white/5">
                      <button
                        type="button"
                        onClick={() => handleExportMarkdown(sess.items, sess.title)}
                        className="flex items-center gap-1 text-[11px] font-mono text-emerald-400 hover:text-emerald-300 py-1 px-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 cursor-pointer"
                      >
                        <Download className="w-3 h-3" />
                        <span>{t.exportMd}</span>
                      </button>
                    </div>

                    {/* Expanded list of questions inside past session */}
                    {isExpanded && sess.items && sess.items.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-white/10 space-y-2">
                        {sess.items.map((q, qIdx) => (
                          <div
                            key={qIdx}
                            className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 text-left text-xs"
                          >
                            <div className="font-bold text-zinc-200">
                              #{qIdx + 1}. {q.question}
                            </div>
                            <div className="text-[11px] text-zinc-400 mt-1 line-clamp-2">
                              {q.quickAnswer || q.startHook}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Footer */}
        {questions.length > 0 && (
          <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-2">
            <button
              onClick={() => handleExportMarkdown(questions, t.tabCurrent)}
              className="flex items-center gap-1.5 text-xs font-mono text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer py-1.5 px-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20"
              title={t.exportAllTooltip}
            >
              <Download className="w-3.5 h-3.5" />
              <span>{t.exportMd}</span>
            </button>

            <button
              onClick={() => {
                toast(t.clearConfirmTitle, {
                  description: t.clearConfirmDesc,
                  action: {
                    label: t.clearConfirmBtn,
                    onClick: () => {
                      onClearHistory();
                      onClose();
                      toast.success(t.clearedSuccess);
                    },
                  },
                  cancel: {
                    label: t.cancelBtn,
                    onClick: () => {},
                  },
                  duration: 6000,
                });
              }}
              className="flex items-center gap-1.5 text-xs font-mono text-zinc-400 hover:text-rose-400 transition-colors cursor-pointer py-1 px-2"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{t.clearHistory}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
