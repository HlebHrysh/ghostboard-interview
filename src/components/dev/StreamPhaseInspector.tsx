'use client';

import React, { useMemo, useState } from 'react';
import { Loader2, Play } from 'lucide-react';
import { toast } from 'sonner';
import {
  DEV_SCENARIO_PRESETS,
  dispatchCopilotInjectEvent,
  parseDualStreamPhases,
} from './devShared';

/**
 * Isolated, memoized token stream inspector so 60fps streaming updates
 * never re-render parent telemetry charts, KPI grids, or tables.
 */
export const StreamPhaseInspector = React.memo(function StreamPhaseInspector() {
  const [promptInput, setPromptInput] = useState(DEV_SCENARIO_PRESETS[0].text);
  const [streamMode, setStreamMode] = useState<'concise' | 'deep'>('concise');
  const [streamLang, setStreamLang] = useState<'auto' | 'uk' | 'en'>('auto');
  const [isStreaming, setIsStreaming] = useState(false);
  const [rawStream, setRawStream] = useState('');
  const [streamTtftMs, setStreamTtftMs] = useState<number | null>(null);
  const [streamTotalMs, setStreamTotalMs] = useState<number | null>(null);

  const phases = useMemo(() => parseDualStreamPhases(rawStream), [rawStream]);

  const handleRunStreamInspector = async () => {
    if (!promptInput.trim() || isStreaming) return;
    setIsStreaming(true);
    setRawStream('');
    setStreamTtftMs(null);
    setStreamTotalMs(null);

    const start = performance.now();
    let firstTokenMs: number | null = null;

    dispatchCopilotInjectEvent({
      id: 'workbench',
      text: promptInput,
      mode: streamMode,
    });

    try {
      const res = await fetch('/api/ai/dual-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: promptInput,
          mode: streamMode,
          language: streamLang,
        }),
      });

      if (!res.ok || !res.body) {
        const errText = await res.text();
        setRawStream(`HTTP ${res.status}: ${errText}`);
        toast.error(`Dual-stream returned ${res.status}`);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        if (firstTokenMs === null && chunk.trim().length > 0) {
          firstTokenMs = Math.round(performance.now() - start);
          setStreamTtftMs(firstTokenMs);
        }
        acc += chunk;
        setRawStream(acc);
      }
      setStreamTotalMs(Math.round(performance.now() - start));
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Stream failed');
    } finally {
      setIsStreaming(false);
    }
  };

  return (
    <section
      aria-label="Raw prompt and phase stream inspector"
      className="p-5 rounded-2xl bg-[#0c0e13] border border-white/[0.08] space-y-4"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">
            Raw Prompt &amp; Phase Stream Inspector
          </h2>
          <p className="text-[11px] text-zinc-500">
            Inspect live SSE / streaming delimiters:{' '}
            <code className="text-cyan-300">&lt;&lt;&lt;META&gt;&gt;&gt;</code>,{' '}
            <code className="text-cyan-300">&lt;&lt;&lt;PHASE_1&gt;&gt;&gt;</code>,{' '}
            <code className="text-cyan-300">&lt;&lt;&lt;PHASE_2&gt;&gt;&gt;</code>,{' '}
            <code className="text-cyan-300">&lt;&lt;&lt;PHASE_3&gt;&gt;&gt;</code>, and noise filter{' '}
            <code className="text-amber-300">&lt;&lt;&lt;IGNORE&gt;&gt;&gt;</code>.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[11px]">
          {streamTtftMs !== null && (
            <span className="px-2.5 py-1 rounded-lg bg-cyan-500/15 text-cyan-300 border border-cyan-400/30 font-bold">
              TTFT: {streamTtftMs} ms
            </span>
          )}
          {streamTotalMs !== null && (
            <span className="px-2.5 py-1 rounded-lg bg-white/[0.05] text-zinc-300 border border-white/10">
              Total: {streamTotalMs} ms
            </span>
          )}
          {phases.ignored && (
            <span className="px-2.5 py-1 rounded-lg bg-amber-500/15 text-amber-300 border border-amber-400/30 font-bold">
              NOISE FILTERED (&lt;&lt;&lt;IGNORE&gt;&gt;&gt;)
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {DEV_SCENARIO_PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setPromptInput(p.text)}
            className="px-2.5 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-[11px] text-zinc-300 hover:text-white cursor-pointer"
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
        <div className="lg:col-span-3 space-y-1.5">
          <label
            htmlFor="workbench-prompt-input"
            className="block text-[10px] uppercase text-zinc-400"
          >
            Simulated Interviewer / Webinar Transcript Input
          </label>
          <textarea
            id="workbench-prompt-input"
            rows={3}
            value={promptInput}
            onChange={(e) => setPromptInput(e.target.value)}
            className="w-full rounded-xl bg-black/60 border border-white/10 p-3 text-xs text-white focus:outline-none focus:border-cyan-400/50"
          />
        </div>
        <div className="flex flex-col justify-between gap-2">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label
                htmlFor="workbench-mode"
                className="block text-[10px] uppercase text-zinc-400 mb-1"
              >
                Mode
              </label>
              <select
                id="workbench-mode"
                value={streamMode}
                onChange={(e) =>
                  setStreamMode(e.target.value as 'concise' | 'deep')
                }
                className="w-full rounded-xl bg-black/60 border border-white/10 px-2.5 py-2 text-xs text-white"
              >
                <option value="concise">concise</option>
                <option value="deep">deep</option>
              </select>
            </div>
            <div>
              <label
                htmlFor="workbench-lang"
                className="block text-[10px] uppercase text-zinc-400 mb-1"
              >
                Language
              </label>
              <select
                id="workbench-lang"
                value={streamLang}
                onChange={(e) =>
                  setStreamLang(e.target.value as 'auto' | 'uk' | 'en')
                }
                className="w-full rounded-xl bg-black/60 border border-white/10 px-2.5 py-2 text-xs text-white"
              >
                <option value="auto">auto</option>
                <option value="uk">uk</option>
                <option value="en">en</option>
              </select>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void handleRunStreamInspector()}
            disabled={isStreaming}
            className="w-full px-4 py-2.5 rounded-xl bg-white text-black font-bold text-xs flex items-center justify-center gap-2 hover:bg-zinc-200 transition-colors cursor-pointer disabled:opacity-60"
          >
            {isStreaming ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Play className="w-4 h-4" />
            )}
            <span>Stream &amp; Parse Phases</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          {
            title: '<<<META>>>',
            body: phases.meta || 'No META block captured yet',
          },
          {
            title: '<<<PHASE_1>>> (Hook)',
            body: phases.phase1 || 'No PHASE_1 block captured yet',
          },
          {
            title: '<<<PHASE_2>>> (Core)',
            body: phases.phase2 || 'No PHASE_2 block captured yet',
          },
          {
            title: '<<<PHASE_3>>> (Code/Deep)',
            body: phases.phase3 || 'No PHASE_3 block captured yet',
          },
        ].map((block) => (
          <div
            key={block.title}
            className="p-3 rounded-xl bg-black/50 border border-white/[0.08] space-y-1.5"
          >
            <div className="text-[10px] font-bold text-cyan-300">
              {block.title}
            </div>
            <pre className="text-[11px] text-zinc-300 whitespace-pre-wrap break-words max-h-40 overflow-y-auto">
              {block.body}
            </pre>
          </div>
        ))}
      </div>

      {rawStream && (
        <div className="p-3 rounded-xl bg-black/70 border border-white/[0.08] space-y-1">
          <div className="text-[10px] uppercase text-zinc-400 font-bold">
            Raw Wire Stream
          </div>
          <pre className="text-[11px] text-zinc-300 whitespace-pre-wrap break-words max-h-48 overflow-y-auto">
            {rawStream}
          </pre>
        </div>
      )}
    </section>
  );
});
