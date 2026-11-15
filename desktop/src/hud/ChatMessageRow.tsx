import React, { memo } from 'react';
import { ArrowUpRight, Sparkles } from 'lucide-react';
import type { AnswerEntry, ChatMessage } from '../lib/session';

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

  const timeStr = new Date(message.ts).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  return (
    <div
      data-tauri-drag-region="false"
      onMouseDown={(e) => e.stopPropagation()}
      onClick={() => onSelect(message)}
      className={`group relative rounded-xl border p-3 transition-colors duration-150 cursor-pointer select-text ${
        isSelected
          ? 'border-emerald-500/45 bg-[#15181b] shadow-[inset_0_1px_0_0_rgba(167,243,208,0.18)]'
          : 'border-white/[0.07] bg-[#111114] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] hover:border-white/20 hover:bg-[#15151a]'
      }`}
    >
      {/* Header: Speaker badge, timestamp & linked answer number */}
      <div className="mb-1.5 flex items-center justify-between gap-2 pointer-events-none">
        <div className="flex items-center gap-1.5 min-w-0">
          <span
            className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-mono font-semibold uppercase tracking-wider ${
              isInterviewer
                ? 'border-white/15 bg-white/[0.06] text-zinc-100'
                : isCandidate
                  ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300'
                  : 'border-white/10 bg-white/[0.04] text-zinc-300'
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full shrink-0 ${
                isInterviewer ? 'bg-emerald-400' : isCandidate ? 'bg-zinc-400' : 'bg-zinc-300'
              }`}
            />
            {isInterviewer ? "Інтерв'юер" : isCandidate ? 'Ви' : 'Вручну'}
          </span>
          <span className="text-[10px] font-mono tabular-nums text-zinc-500">{timeStr}</span>
        </div>

        {answer && (
          <span
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-mono font-medium tabular-nums ${
              isSelected
                ? 'border-emerald-500/35 bg-emerald-500/15 text-emerald-200'
                : 'border-white/10 bg-[#09090b] text-zinc-300'
            }`}
          >
            <Sparkles size={9} className={isSelected ? 'text-emerald-300' : 'text-zinc-400'} />
            <span>#{answer.seq}</span>
          </span>
        )}
      </div>

      {/* Transcript utterance */}
      <p
        className={`text-[12.5px] leading-relaxed break-words antialiased ${
          isCandidate ? 'text-zinc-400 italic' : 'text-zinc-100 font-medium'
        }`}
      >
        {message.text}
      </p>

      {/* Direct Ask action if no answer yet */}
      {!answer && (
        <div className="mt-2 flex justify-end border-t border-white/[0.05] pt-1.5">
          <button
            type="button"
            data-tauri-drag-region="false"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onAsk(message);
            }}
            className="gb-nodrag inline-flex items-center gap-1 rounded-md border border-white/12 bg-white/[0.07] px-2 py-0.5 text-[10.5px] font-medium text-zinc-100 transition-colors hover:bg-white/[0.14] cursor-pointer"
          >
            <Sparkles size={10} />
            <span>{isInterviewer ? 'Запитати ШІ' : 'Покращити'}</span>
            <ArrowUpRight size={10} />
          </button>
        </div>
      )}
    </div>
  );
});
