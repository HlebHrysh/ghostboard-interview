'use client';

import React from 'react';
import { Terminal, EyeOff } from 'lucide-react';
import { useLocale } from '@/contexts/LocaleContext';
import { getModalsTranslations } from '@/lib/modalsI18n';

interface StealthPanicShieldProps {
  isActive: boolean;
  isCapturing: boolean;
  questionCount: number;
  onDeactivate: () => void;
}

export const StealthPanicShield: React.FC<StealthPanicShieldProps> = ({
  isActive,
  isCapturing,
  questionCount,
  onDeactivate,
}) => {
  const { locale } = useLocale();
  const p = getModalsTranslations(locale).panicShield;

  if (!isActive) return null;

  return (
    <div
      onClick={onDeactivate}
      className="fixed inset-0 z-50 bg-[#0c0d12] text-zinc-300 font-mono flex flex-col select-none cursor-pointer transition-opacity duration-150 animate-in fade-in"
      title={p.exitHint}
    >
      {/* Terminal Title Bar */}
      <div className="h-9 bg-[#161821] border-b border-white/10 px-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-rose-500/70" />
            <div className="w-3 h-3 rounded-full bg-amber-500/70" />
            <div className="w-3 h-3 rounded-full bg-emerald-500/70" />
          </div>
          <span className="text-xs text-zinc-400 font-semibold ml-2 flex items-center gap-1.5">
            <Terminal className="w-3.5 h-3.5 text-zinc-500" />
            <span>developer@workstation: ~/projects/backend</span>
          </span>
        </div>

        {/* Ultra-Discreet Background Activity Indicator */}
        <div className="flex items-center gap-2 text-[10px] text-zinc-600">
          <span className="flex items-center gap-1">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isCapturing ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-600'
              }`}
            />
            <span className="opacity-40">sys_mon</span>
          </span>
          <span className="opacity-40">•</span>
          <span className="opacity-40">q:{questionCount}</span>
          <span className="bg-white/5 px-1.5 py-0.5 rounded text-[9px] text-zinc-500 border border-white/5">
            {p.escBadge}
          </span>
        </div>
      </div>

      {/* Terminal Body with realistic mock developer output */}
      <div className="flex-1 p-5 overflow-hidden text-xs leading-relaxed space-y-2 text-zinc-400">
        <div className="text-zinc-500">Last login: {new Date().toDateString()} {new Date().toTimeString().split(' ')[0]} on ttys004</div>
        <div>
          <span className="text-emerald-400 font-bold">dev@workstation</span>
          <span className="text-zinc-500">:</span>
          <span className="text-sky-400 font-bold">~/projects/backend</span>
          <span className="text-zinc-500">$ </span>
          <span className="text-zinc-200">git status</span>
        </div>
        <div className="text-zinc-500 pl-4">
          On branch feature/database-optimization
          <br />
          Your branch is up to date with &apos;origin/feature/database-optimization&apos;.
          <br />
          nothing to commit, working tree clean
        </div>
        <div>
          <span className="text-emerald-400 font-bold">dev@workstation</span>
          <span className="text-zinc-500">:</span>
          <span className="text-sky-400 font-bold">~/projects/backend</span>
          <span className="text-zinc-500">$ </span>
          <span className="text-zinc-200">pytest tests/test_async_workers.py -v</span>
        </div>
        <div className="text-zinc-500 pl-4 space-y-0.5">
          <div><span className="text-emerald-400">PASSED</span> tests/test_async_workers.py::test_celery_task_deduplication</div>
          <div><span className="text-emerald-400">PASSED</span> tests/test_async_workers.py::test_redis_cache_invalidation</div>
          <div><span className="text-emerald-400">PASSED</span> tests/test_async_workers.py::test_btree_index_performance_benchmark</div>
          <div><span className="text-emerald-400">PASSED</span> tests/test_async_workers.py::test_fastapi_dependency_injection</div>
          <div className="text-emerald-400 font-bold pt-1">
            ========== 4 passed, 0 failed in 0.42s ==========
          </div>
        </div>
        <div className="pt-2">
          <span className="text-emerald-400 font-bold">dev@workstation</span>
          <span className="text-zinc-500">:</span>
          <span className="text-sky-400 font-bold">~/projects/backend</span>
          <span className="text-zinc-500">$ </span>
          <span className="inline-block w-2 h-4 bg-zinc-200 align-middle animate-pulse" />
        </div>
      </div>

      {/* Floating Bottom Reminder */}
      <div className="p-3 bg-[#111218] border-t border-white/5 flex items-center justify-between text-[11px] text-zinc-500">
        <div className="flex items-center gap-2">
          <EyeOff className="w-3.5 h-3.5 text-zinc-500" />
          <span>{p.exitHint}</span>
        </div>
        <button
          onClick={onDeactivate}
          className="px-3 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-white/10 text-xs font-bold transition-colors cursor-pointer"
        >
          {p.escBadge}
        </button>
      </div>
    </div>
  );
};
