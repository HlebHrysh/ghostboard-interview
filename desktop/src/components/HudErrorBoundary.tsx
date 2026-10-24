import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw, EyeOff, ShieldAlert } from 'lucide-react';
import { panicHide } from '../lib/tauriBridge';

interface HudErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface HudErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class HudErrorBoundary extends Component<HudErrorBoundaryProps, HudErrorBoundaryState> {
  constructor(props: HudErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<HudErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    console.error('[HudErrorBoundary] Unhandled UI render crash caught:', error, errorInfo);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  handlePanicHide = () => {
    panicHide().catch((err) => {
      console.warn('[HudErrorBoundary] panicHide invocation failed:', err);
    });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const errorMessage = this.state.error?.message || 'Невідома помилка рендерингу інтерфейсу';

      return (
        <div
          data-tauri-drag-region
          className="w-full h-full min-h-screen bg-transparent flex items-center justify-center p-4 select-none"
        >
          {/* Stealth Dark Luxury HUD Error Card */}
          <div
            data-tauri-drag-region
            className="w-full max-w-md rounded-2xl bg-[#08090a]/95 backdrop-blur-2xl border border-rose-500/30 p-5 shadow-[0_20px_60px_rgba(0,0,0,0.85)] text-zinc-100 flex flex-col gap-3 relative cursor-move"
          >
            {/* Header pill with drag indicator */}
            <div className="flex items-center justify-between no-drag pb-2 border-b border-white/[0.08]">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400">
                  <ShieldAlert className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-xs font-bold text-white tracking-tight flex items-center gap-1.5">
                    Ghostboard HUD
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-rose-500/10 text-rose-400 border border-rose-500/20">
                      UI Crash Guard
                    </span>
                  </h2>
                  <p className="text-[10px] text-zinc-400 font-mono">Збій рендерингу оверлея</p>
                </div>
              </div>

              <div className="text-[9px] font-mono text-zinc-500 px-2 py-0.5 rounded bg-white/[0.03] border border-white/[0.05]">
                DRAG REGION
              </div>
            </div>

            {/* Error Message Monospace Box */}
            <div className="no-drag bg-black/50 border border-white/[0.08] rounded-xl p-3 flex flex-col gap-1.5">
              <div className="flex items-center gap-1 text-[10px] font-mono text-rose-400">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>Error details</span>
              </div>
              <p className="text-xs font-mono text-zinc-300 break-words max-h-24 overflow-y-auto pr-1">
                {errorMessage}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="no-drag flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={this.handlePanicHide}
                title="Миттєво приховати вікно оверлею"
                className="px-3 py-1.5 rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.08] text-zinc-300 hover:text-white text-xs font-mono flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <EyeOff className="w-3.5 h-3.5 text-zinc-400" />
                <span>Сховати вікно</span>
              </button>

              <button
                type="button"
                onClick={this.handleReload}
                title="Перезавантажити стан HUD"
                className="px-3 py-1.5 rounded-xl border border-cyan-500/30 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 text-xs font-mono font-medium flex items-center gap-1.5 transition-all shadow-[0_0_12px_rgba(6,182,212,0.2)] cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
                <span>Перезавантажити HUD</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
