import React from 'react';
import { panicHide } from '../lib/tauriBridge';

interface Props {
  children: React.ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo?: React.ErrorInfo | null;
  message?: string;
  recoveryCount?: number;
}

/**
 * Resets isolated render faults inside Office or Stealth HUD without blanking the overlay.
 * Preserves WebKitGTK 60fps surface rules and exposes 1-click Panic + Soft Recover / Reload.
 */
export class HudErrorBoundary extends React.Component<Props, State> {
  state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    message: '',
    recoveryCount: 0,
  };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
      message: error?.message || String(error ?? 'Невідомий збій'),
    };
  }

  componentDidCatch(error: unknown, info: React.ErrorInfo): void {
    console.error('[HudErrorBoundary]', error, info.componentStack);
    this.setState({ errorInfo: info });
  }

  public handleSoftRecover = () => {
    this.setState((prev) => ({
      hasError: false,
      error: null,
      errorInfo: null,
      message: '',
      recoveryCount: (prev.recoveryCount ?? 0) + 1,
    }));
  };

  public handleReload = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      message: '',
    });
    if (typeof window !== 'undefined' && typeof window.location?.reload === 'function') {
      window.location.reload();
    }
  };

  public handlePanicHide = () => {
    void panicHide().catch(() => undefined);
  };

  render() {
    if (!this.state.hasError) return this.props.children;
    const recoveryCount = this.state.recoveryCount ?? 0;
    const exhausted = recoveryCount >= 3;
    const detail = this.state.error?.message || this.state.message;

    return (
      <div
        data-tauri-drag-region
        className="flex h-full w-full items-center justify-center p-4 bg-[#09090b]/95 text-zinc-100 select-none"
      >
        <div className="w-full max-w-md rounded-2xl border border-white/[0.08] bg-[#111114] p-5 space-y-3.5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.12),0_20px_48px_rgba(0,0,0,0.75)]">
          <div
            data-tauri-drag-region
            className="flex items-center justify-between gap-2 border-b border-white/[0.07] pb-2.5 cursor-grab"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="h-2 w-2 rounded-full bg-rose-400 shrink-0" />
              <span className="truncate text-xs font-semibold text-white">
                {this.props.fallbackTitle
                  ? `Ghostboard HUD · ${this.props.fallbackTitle} (UI Crash Guard)`
                  : 'Ghostboard HUD · UI Crash Guard'}
              </span>
            </div>
            <span className="font-mono text-[10px] text-zinc-500 uppercase tracking-wider shrink-0">
              DRAG REGION · {recoveryCount}/3
            </span>
          </div>

          <p className="text-xs leading-relaxed text-zinc-300">
            Інтерфейс спіймав виняток, але фонове аудіо та зв’язок із Rust не переривались.
          </p>

          {detail && (
            <pre className="max-h-24 overflow-auto rounded-xl border border-white/[0.06] bg-[#09090b] p-2.5 font-mono text-[11px] text-rose-300/90 select-text">
              {detail}
            </pre>
          )}

          <div
            data-tauri-drag-region="false"
            onMouseDown={(e) => e.stopPropagation()}
            className="flex flex-wrap items-center justify-end gap-2 pt-1"
          >
            <button
              type="button"
              onClick={this.handlePanicHide}
              className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs font-medium text-rose-300 transition-colors hover:bg-rose-500/20 cursor-pointer"
            >
              🛡️ Сховати вікно (Паніка F12)
            </button>
            {!exhausted && (
              <button
                type="button"
                onClick={this.handleSoftRecover}
                className="rounded-lg border border-white/15 bg-white/[0.06] px-3 py-1.5 text-xs font-medium text-zinc-100 transition-colors hover:bg-white/[0.12] cursor-pointer"
              >
                Відновити інтерфейс
              </button>
            )}
            <button
              type="button"
              onClick={this.handleReload}
              className="rounded-lg bg-white px-3.5 py-1.5 text-xs font-semibold text-zinc-950 transition-colors hover:bg-zinc-200 cursor-pointer"
            >
              Перезавантажити HUD
            </button>
          </div>
        </div>
      </div>
    );
  }
}

export default HudErrorBoundary;
