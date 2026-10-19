import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Terminal, CheckCircle2, ShieldCheck, HardDrive, Cpu, X } from 'lucide-react';

export interface PanicShieldProps {
  onDismiss: () => void;
  isCapturing: boolean;
}

export const PanicShield: React.FC<PanicShieldProps> = ({ onDismiss, isCapturing }) => {
  const [activeTab, setActiveTab] = useState<'pytest' | 'git' | 'htop'>('pytest');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F12' || e.key === 'Escape') {
        e.preventDefault();
        onDismiss();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onDismiss]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.1 }}
      className="fixed inset-0 z-50 bg-[#0c0d0e] text-zinc-300 font-mono text-xs select-text flex flex-col"
    >
      {/* Fake Terminal Window Title Bar */}
      <div className="h-9 bg-[#16181b] border-b border-zinc-800 px-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <button
              onClick={onDismiss}
              className="w-3 h-3 rounded-full bg-rose-500/80 hover:bg-rose-500 flex items-center justify-center text-[8px] text-black"
            >
              ×
            </button>
            <div className="w-3 h-3 rounded-full bg-amber-500/80" />
            <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
          </div>
          <span className="text-[11px] text-zinc-400 font-semibold ml-2 flex items-center gap-1.5">
            <Terminal className="w-3.5 h-3.5 text-zinc-400" />
            developer@workstation: ~/projects/core-engine
          </span>
        </div>

        <div className="flex items-center gap-3 text-[10px]">
          {/* Subtle stealth telemetry indicator */}
          <span className="text-zinc-500 flex items-center gap-1">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isCapturing ? 'bg-emerald-500' : 'bg-zinc-600'
              }`}
            />
            sys_mon: {isCapturing ? 'active' : 'idle'}
          </span>
          <span className="text-zinc-600">Press F12 or Esc to exit</span>
        </div>
      </div>

      {/* Terminal Tab Bar */}
      <div className="bg-[#121316] border-b border-zinc-800 px-2 flex items-center gap-1 text-[11px]">
        <button
          onClick={() => setActiveTab('pytest')}
          className={`px-3 py-1.5 border-b-2 font-medium transition-all ${
            activeTab === 'pytest'
              ? 'border-emerald-500 text-emerald-400 bg-white/[0.02]'
              : 'border-transparent text-zinc-500 hover:text-zinc-300'
          }`}
        >
          pytest tests/
        </button>
        <button
          onClick={() => setActiveTab('git')}
          className={`px-3 py-1.5 border-b-2 font-medium transition-all ${
            activeTab === 'git'
              ? 'border-emerald-500 text-emerald-400 bg-white/[0.02]'
              : 'border-transparent text-zinc-500 hover:text-zinc-300'
          }`}
        >
          git status
        </button>
      </div>

      {/* Terminal Content Body */}
      <div className="flex-1 p-4 overflow-y-auto font-mono text-[11px] leading-relaxed space-y-2 bg-[#0c0d0e]">
        {activeTab === 'pytest' && (
          <div className="space-y-1 text-zinc-300">
            <p className="text-zinc-500">
              $ poetry run pytest tests/ -v --cov=app --cov-report=term-missing
            </p>
            <p className="text-zinc-400">============================= test session starts ==============================</p>
            <p className="text-zinc-500">platform linux -- Python 3.12.3, pytest-8.2.1, pluggy-1.5.0</p>
            <p className="text-zinc-500">rootdir: /home/developer/projects/core-engine</p>
            <p className="text-zinc-500">plugins: asyncio-0.23.6, anyio-4.3.0, cov-5.0.0</p>
            <p className="text-zinc-500">collected 64 items</p>
            <div className="py-2 space-y-0.5">
              <p>tests/test_event_loop.py::test_async_task_group <span className="text-emerald-400 font-bold">PASSED</span> [  2%]</p>
              <p>tests/test_event_loop.py::test_coroutine_cancellation <span className="text-emerald-400 font-bold">PASSED</span> [  4%]</p>
              <p>tests/test_database.py::test_mvcc_snapshot_isolation <span className="text-emerald-400 font-bold">PASSED</span> [ 12%]</p>
              <p>tests/test_database.py::test_btree_index_scan <span className="text-emerald-400 font-bold">PASSED</span> [ 18%]</p>
              <p>tests/test_cache.py::test_redis_sentinel_failover <span className="text-emerald-400 font-bold">PASSED</span> [ 34%]</p>
              <p>tests/test_pipeline.py::test_kafka_message_deduplication <span className="text-emerald-400 font-bold">PASSED</span> [ 68%]</p>
              <p>tests/test_resilience.py::test_circuit_breaker_open_state <span className="text-emerald-400 font-bold">PASSED</span> [ 92%]</p>
              <p>tests/test_resilience.py::test_rate_limiter_token_bucket <span className="text-emerald-400 font-bold">PASSED</span> [100%]</p>
            </div>
            <p className="text-zinc-400">------------------------------ coverage: platform linux ------------------------------</p>
            <p className="text-zinc-400">TOTAL                                        1420    102    93%</p>
            <p className="text-emerald-400 font-bold pt-1">
              ======================== 64 passed in 2.14s =========================
            </p>
            <div className="flex items-center gap-1.5 pt-2 text-zinc-400">
              <span>developer@workstation:~/projects/core-engine$</span>
              <span className="w-2 h-4 bg-zinc-300 animate-pulse" />
            </div>
          </div>
        )}

        {activeTab === 'git' && (
          <div className="space-y-1 text-zinc-300">
            <p className="text-zinc-500">$ git status</p>
            <p>On branch main</p>
            <p>Your branch is up to date with 'origin/main'.</p>
            <p className="text-zinc-500 pt-1">Changes not staged for commit:</p>
            <p className="text-zinc-500 text-[10px]">  (use "git add &lt;file&gt;..." to update what will be committed)</p>
            <p className="text-rose-400 pl-4">modified:   app/services/cache_layer.py</p>
            <p className="text-rose-400 pl-4">modified:   app/infrastructure/db/session.py</p>
            <p className="pt-2 text-zinc-400">no changes added to commit (use "git commit -a")</p>
            <div className="flex items-center gap-1.5 pt-2 text-zinc-400">
              <span>developer@workstation:~/projects/core-engine$</span>
              <span className="w-2 h-4 bg-zinc-300 animate-pulse" />
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};
