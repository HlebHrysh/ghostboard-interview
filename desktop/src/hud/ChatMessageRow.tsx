import React, { memo } from 'react';
import { Sparkles, MessageSquare, ArrowUpRight } from 'lucide-react';
import type { ChatMessage, AnswerEntry } from '../lib/session';

export interface ChatMessageRowProps {
  message: ChatMessage;
  answer: AnswerEntry | null;
  isSelected: boolean;
  onSelect: (message: ChatMessage) => void;
  onAsk: (message: ChatMessage) => void;
}

export const ChatMessageRow = memo(function ChatMessageRow({
  message,
  answer,
  isSelected,
  onSelect,
  onAsk,
}: ChatMessageRowProps) {
  const isInterviewer = message.speaker === 'interviewer';
  const isCandidate = message.speaker === 'candidate';
  const isManual = message.speaker === 'manual';

  const timeStr = new Date(message.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  return (
    <div
      data-tauri-drag-region="false"
      onMouseDown={(e) => e.stopPropagation()}
      onClick={() => onSelect(message)}
      className={`group relative rounded-xl p-3 transition-all duration-150 cursor-pointer border select-text ${
        isSelected
          ? 'bg-white/[0.08] border-white/25 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)]'
          : 'bg-[#111114] border-white/[0.06] hover:border-white/15 hover:bg-white/[0.04]'
      }`}
    >
      {/* Header: Speaker & Timestamp & Answer Badge */}
      <div className="flex items-center justify-between gap-2 mb-1.5 pointer-events-none">
        <div className="flex items-center gap-1.5 min-w-0">
          <span
            className={`inline-flex items-center gap-1 text-[10px] font-mono font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded ${
              isInterviewer
                ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
                : isCandidate
                ? 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                : 'bg-violet-500/15 text-violet-300 border border-violet-500/30'
            }`}
          >
            {isInterviewer ? "Інтерв'юер" : isCandidate ? 'Ви' : 'Вручну'}
          </span>
          <span className="text-[10px] font-mono text-zinc-500">{timeStr}</span>
        </div>

        {/* Linked Answer Badge */}
        {answer && (
          <span
            className={`inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border transition-colors ${
              isSelected
                ? 'bg-emerald-400/20 text-emerald-300 border-emerald-400/40 shadow-[0_0_10px_rgba(52,211,153,0.2)]'
                : 'bg-white/[0.05] text-emerald-400 border-emerald-500/20'
            }`}
          >
            <Sparkles size={10} className="text-emerald-400" />
            <span>Відповідь #{answer.seq}</span>
          </span>
        )}
      </div>

      {/* Message Text */}
      <p className={`text-[13px] leading-relaxed break-words ${isCandidate ? 'text-zinc-400 italic' : 'text-zinc-100 font-medium'}`}>
        {message.text}
      </p>

      {/* Action to ask AI or refine if no answer yet */}
      {!answer && (
        <div className="mt-2 pt-1.5 border-t border-white/[0.04] flex justify-end opacity-75 group-hover:opacity-100 transition-opacity">
          <button
            type="button"
            data-tauri-drag-region="false"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onAsk(message);
            }}
            className="gb-nodrag inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 active:scale-95 px-2.5 py-1 rounded-md border border-emerald-500/30 transition-all cursor-pointer shadow-sm"
          >
            <Sparkles size={11} />
            <span>{isInterviewer ? 'Запитати ШІ' : 'Покращити відповідь'}</span>
            <ArrowUpRight size={10} />
          </button>
        </div>
      )}
    </div>
  );
});
