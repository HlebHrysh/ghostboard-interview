import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  errorMessage: string;
  retryCount: number;
}

export class HudErrorBoundary extends Component<Props, State> {
  private autoHealTimer: ReturnType<typeof setTimeout> | null = null;

  public state: State = {
    hasError: false,
    errorMessage: '',
    retryCount: 0,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      errorMessage: error?.message || 'Unexpected UI render error',
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.warn('[Ghostboard HudErrorBoundary] Auto-recovering from render error:', error.message, errorInfo.componentStack);
    if (this.state.retryCount < 3) {
      this.autoHealTimer = setTimeout(() => {
        this.setState((prev) => ({
          hasError: false,
          errorMessage: '',
          retryCount: prev.retryCount + 1,
        }));
      }, 120);
    }
  }

  public componentWillUnmount(): void {
    if (this.autoHealTimer) clearTimeout(this.autoHealTimer);
  }

  private handleManualReset = (): void => {
    this.setState({ hasError: false, errorMessage: '', retryCount: 0 });
  };

  public render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="flex h-full w-full flex-col items-center justify-center bg-[#09090b]/95 p-4 text-zinc-100 select-none">
          <div className="max-w-md rounded-xl border border-white/10 bg-[#111114] p-4 shadow-2xl">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                ⚡ HUD Auto-Recovery
              </span>
              <button
                type="button"
                onClick={this.handleManualReset}
                className="rounded-lg bg-white px-3 py-1 text-xs font-semibold text-zinc-950 hover:bg-zinc-200 transition"
              >
                Відновити миттєво (0.1с)
              </button>
            </div>
            <p className="mt-2 text-xs text-zinc-400">
              Інтерфейс автоматично перезавантажив картку після збою рендеру. Аудіо-стрім продовжує працювати.
            </p>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
