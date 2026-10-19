import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
  Download,
  Search,
  X,
  Check,
  Calendar,
  Layers,
  Sparkles,
  Mail,
  Copy,
  ChevronRight,
  CheckCircle2,
} from 'lucide-react';
import type { StructuredAnswerOutput } from '../lib/streamClient';
import {
  copyToClipboard,
  formatSingleQAClipboardText,
  formatMarkdownExport,
} from '../lib/companionSync';

export interface SessionQAItem {
  id: string;
  question: string;
  answer: StructuredAnswerOutput;
  timestamp: number;
}

export interface HistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  sessionItems: SessionQAItem[];
  onSelectItem?: (item: SessionQAItem) => void;
  sessionTitle?: string;
}

const SPRING_PHYSICS = {
  type: 'spring' as const,
  stiffness: 350,
  damping: 28,
  mass: 0.6,
};

export const HistoryDrawer: React.FC<HistoryDrawerProps> = ({
  isOpen,
  onClose,
  sessionItems,
  onSelectItem,
  sessionTitle = 'Технічна Співбесіда',
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);
  const [copyMarkdownSuccess, setCopyMarkdownSuccess] = useState(false);
  const [copiedQAId, setCopiedQAId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [selectedQA, setSelectedQA] = useState<SessionQAItem | null>(null);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const filteredItems = sessionItems.filter(
    (item) =>
      item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.answer?.hook && item.answer.hook.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const generateMarkdownReport = (): string => {
    return formatMarkdownExport(sessionTitle, sessionItems);
  };

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage(null);
    }, 2500);
  };

  const handleCopyMarkdown = async () => {
    if (sessionItems.length === 0) return;
    const content = generateMarkdownReport();
    const ok = await copyToClipboard(content);
    if (ok) {
      setCopyMarkdownSuccess(true);
      showToast('Повний звіт у форматі Markdown скопійовано в буфер!');
      setTimeout(() => setCopyMarkdownSuccess(false), 2200);
    }
  };

  const handleCopySingleQA = async (e: React.MouseEvent, item: SessionQAItem) => {
    e.stopPropagation();
    const formatted = formatSingleQAClipboardText(item);
    const ok = await copyToClipboard(formatted);
    if (ok) {
      setCopiedQAId(item.id);
      showToast(`Відповідь на запитання скопійовано в буфер!`);
      setTimeout(() => setCopiedQAId(null), 2000);
    }
  };

  const handleExportMarkdown = async () => {
    setIsExporting(true);
    const content = generateMarkdownReport();
    const filename = `interview-debrief-${new Date().toISOString().slice(0, 10)}.md`;

    try {
      const api = window.ghostboard || window.desktopAPI;
      if (api?.exportMarkdown) {
        await api.exportMarkdown(content, filename);
      } else {
        // Browser download fallback
        const blob = new Blob([content], { type: 'text/markdown;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
      }

      setExportSuccess(true);
      showToast(`Звіт успішно збережено у файл ${filename}`);
      setTimeout(() => setExportSuccess(false), 2500);
    } catch (e) {
      console.warn('Failed to export markdown:', e);
    } finally {
      setIsExporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex justify-end"
      >
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={SPRING_PHYSICS}
          className="w-full max-w-xl h-full bg-[#08090a] border-l border-white/[0.08] shadow-2xl flex flex-col text-zinc-200 relative"
        >
          {/* Toast Notification Banner */}
          <AnimatePresence>
            {toastMessage && (
              <motion.div
                initial={{ opacity: 0, y: -20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.95 }}
                transition={SPRING_PHYSICS}
                className="absolute top-4 left-4 right-4 z-50 py-2.5 px-4 rounded-xl bg-cyan-950/90 border border-cyan-500/40 text-cyan-200 shadow-2xl backdrop-blur-xl flex items-center gap-2 text-xs font-mono"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="truncate">{toastMessage}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Drawer Header */}
          <div className="px-6 py-4 border-b border-white/[0.08] flex items-center justify-between bg-white/[0.01]">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-white">Історія Співбесіди</h2>
                <p className="text-[11px] text-zinc-400">
                  {sessionItems.length} збережених запитань та відповідей
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* 1-Click Copy Full Markdown Report */}
              <button
                onClick={handleCopyMarkdown}
                disabled={sessionItems.length === 0}
                title="Скопіювати весь звіт у буфер обміну [Markdown]"
                className="px-2.5 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-zinc-300 hover:text-white text-xs font-medium flex items-center gap-1.5 transition-all disabled:opacity-40 cursor-pointer"
              >
                {copyMarkdownSuccess ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-300 font-mono text-[11px] font-semibold">Скопійовано</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-zinc-400" />
                    <span className="font-mono text-[11px]">Копіювати MD</span>
                  </>
                )}
              </button>

              {/* Export Markdown to File */}
              <button
                onClick={handleExportMarkdown}
                disabled={sessionItems.length === 0 || isExporting}
                title="Експортувати у файл Markdown"
                className="px-2.5 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 hover:text-white text-xs font-medium flex items-center gap-1.5 transition-all disabled:opacity-40 cursor-pointer"
              >
                {exportSuccess ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="font-mono text-[11px]">Збережено</span>
                  </>
                ) : (
                  <>
                    <Download className="w-3.5 h-3.5" />
                    <span className="font-mono text-[11px]">Експорт</span>
                  </>
                )}
              </button>

              <button
                onClick={onClose}
                className="p-1.5 rounded-lg border border-transparent hover:border-white/10 hover:bg-white/5 text-zinc-400 hover:text-white transition-all cursor-pointer"
                title="Закрити історію [Esc / ⌘H]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="p-4 border-b border-white/[0.06] bg-black/20">
            <div className="relative flex items-center">
              <Search className="w-4 h-4 text-zinc-500 absolute left-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Шукати за запитанням або ключовими словами... [⌘H]"
                className="w-full pl-9 pr-3 py-2 text-xs bg-white/[0.03] border border-white/[0.08] rounded-xl text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-cyan-500/50"
              />
            </div>
          </div>

          {/* Items List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin scrollbar-thumb-white/10">
            {filteredItems.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 text-zinc-500">
                <FileText className="w-8 h-8 mb-2 opacity-30 text-zinc-400" />
                <p className="text-xs font-medium text-zinc-400">Немає запитань в історії</p>
                <p className="text-[10px] text-zinc-600 mt-1">
                  Запитання від співрозмовника з'являтимуться тут по мірі проходження інтерв'ю.
                </p>
              </div>
            ) : (
              filteredItems.map((item, idx) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.04, ...SPRING_PHYSICS }}
                  onClick={() => {
                    setSelectedQA(item);
                    onSelectItem?.(item);
                  }}
                  className="p-3.5 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.07] hover:border-cyan-500/30 transition-all cursor-pointer group relative"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-mono font-bold text-cyan-400 flex items-center gap-1.5">
                      <span className="w-4 h-4 rounded bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20 text-[9px]">
                        {idx + 1}
                      </span>
                      Запитання
                    </span>

                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-zinc-500 font-mono">
                        {new Date(item.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>

                      {/* 1-Click Clipboard Copy Individual QA Answer */}
                      <button
                        type="button"
                        onClick={(e) => handleCopySingleQA(e, item)}
                        title="Скопіювати відповідь у буфер обміну"
                        className="px-2 py-0.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.1] border border-white/[0.08] hover:border-cyan-500/30 text-zinc-400 hover:text-white transition-all cursor-pointer flex items-center gap-1 text-[10px] font-mono"
                      >
                        {copiedQAId === item.id ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span className="text-emerald-300 font-semibold">Скопійовано</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Копіювати</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  <h3 className="text-xs font-medium text-zinc-100 group-hover:text-cyan-200 transition-colors line-clamp-2">
                    {item.question}
                  </h3>

                  {item.answer?.hook && (
                    <p className="text-[11px] text-amber-200/80 mt-2 line-clamp-2 italic bg-amber-500/[0.04] p-2 rounded-lg border border-amber-500/10">
                      "{item.answer.hook}"
                    </p>
                  )}
                </motion.div>
              ))
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
