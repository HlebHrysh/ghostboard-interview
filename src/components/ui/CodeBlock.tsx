'use client';

import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';

interface CodeBlockProps {
  code: string;
  language?: string;
  filename?: string;
}

export const CodeBlock: React.FC<CodeBlockProps> = ({
  code,
  language = 'bash',
  filename,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate?.(10);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  // Safe lightweight regex syntax highlighting into React nodes
  const renderHighlightedLine = (line: string, lineIdx: number) => {
    if (line.trim().startsWith('#') || line.trim().startsWith('//')) {
      return (
        <span key={lineIdx} className="text-zinc-500 italic">
          {line}
        </span>
      );
    }

    const tokens = line.split(/(\s+|[()[\]{},;:="'])/);

    return (
      <span key={lineIdx}>
        {tokens.map((token, tokIdx) => {
          if (!token) return null;
          if (
            /^(curl|wget|npm|pnpm|yarn|docker|git|python|node|import|export|from|const|let|var|function|return|if|else|await|async|class|def)$/.test(
              token
            )
          ) {
            return (
              <span key={tokIdx} className="text-zinc-100 font-semibold">
                {token}
              </span>
            );
          }
          if (/^--?[a-zA-Z0-9-]+$/.test(token)) {
            return (
              <span key={tokIdx} className="text-zinc-300">
                {token}
              </span>
            );
          }
          if (/^["'].*["']$/.test(token)) {
            return (
              <span key={tokIdx} className="text-emerald-300/90">
                {token}
              </span>
            );
          }
          if (/^(https?:\/\/|\/api\/|localhost|127\.0\.0\.1)/.test(token)) {
            return (
              <span key={tokIdx} className="text-sky-300 underline decoration-sky-300/30">
                {token}
              </span>
            );
          }
          if (/^\d+(\.\d+)?$/.test(token)) {
            return (
              <span key={tokIdx} className="text-amber-300">
                {token}
              </span>
            );
          }
          return <span key={tokIdx}>{token}</span>;
        })}
      </span>
    );
  };

  const lines = code.trim().split('\n');

  return (
    <div className="my-4 rounded-xl border border-white/[0.08] bg-[#050507] overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
      <div className="flex items-center justify-between px-4 py-2 bg-white/[0.02] border-b border-white/[0.06] text-xs font-mono">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-white/20" />
          {filename ? (
            <span className="text-zinc-300">{filename}</span>
          ) : (
            <span className="uppercase tracking-wider text-[10px] text-zinc-500 font-bold">
              {language}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] text-zinc-400 hover:text-white bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.08] transition-all active:scale-95 cursor-pointer"
          title="Copy code"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 text-emerald-400" />
              <span className="text-emerald-400 font-medium">Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>

      <div className="p-4 overflow-x-auto text-xs font-mono leading-relaxed text-zinc-300 selection:bg-white/20">
        <pre>
          <code>
            {lines.map((line, idx) => (
              <div key={idx} className="table-row">
                <span className="table-cell pr-4 select-none text-zinc-600 text-right text-[11px] w-6">
                  {idx + 1}
                </span>
                <span className="table-cell whitespace-pre">
                  {renderHighlightedLine(line, idx)}
                </span>
              </div>
            ))}
          </code>
        </pre>
      </div>
    </div>
  );
};
