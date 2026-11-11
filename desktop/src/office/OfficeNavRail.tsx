import React from 'react';
import {
  Rocket,
  Headphones,
  Cpu,
  FileText,
  Shield,
  LogOut,
  Zap,
} from 'lucide-react';
import { Pill, StatusDot, stopDrag } from '../ui/primitives';
import { useEnvironmentInfo, OS_LABEL } from '../lib/platform';
import type { UserProfileData } from '../lib/apiClient';
import { getResolvedBaseUrl } from '../lib/apiClient';

export type OfficeTab = 'launch' | 'audio' | 'ai' | 'context' | 'stealth';

interface OfficeNavRailProps {
  activeTab: OfficeTab;
  onSelectTab: (tab: OfficeTab) => void;
  user: UserProfileData | null;
  onLogout: () => void;
  onQuickQaLogin?: () => void;
  isQaLoggingIn?: boolean;
}

const NAV_ITEMS: Array<{
  id: OfficeTab;
  label: string;
  sub: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: 'launch', label: 'Запуск', sub: 'Launchpad', icon: Rocket },
  { id: 'audio', label: 'Аудіо та Канали', sub: 'Audio Studio', icon: Headphones },
  { id: 'ai', label: 'ШІ та Промпт', sub: 'AI Brain', icon: Cpu },
  { id: 'context', label: 'Профіль та CV', sub: 'Candidate', icon: FileText },
  { id: 'stealth', label: 'Стелс та Хоткеї', sub: 'Stealth & OS', icon: Shield },
];

export const OfficeNavRail: React.FC<OfficeNavRailProps> = ({
  activeTab,
  onSelectTab,
  user,
  onLogout,
  onQuickQaLogin,
  isQaLoggingIn = false,
}) => {
  const envInfo = useEnvironmentInfo();
  const currentBaseUrl = getResolvedBaseUrl();
  const isCloud = currentBaseUrl.includes('ghostboard.ai');
  const serverDisplay = isCloud ? 'Cloud' : 'Direct Rust AI';

  return (
    <aside className="w-[220px] shrink-0 border-r border-white/[0.08] bg-[#0c0d10] flex flex-col justify-between p-3 select-none">
      <div className="space-y-4">
        {/* Brand Header */}
        <div className="px-2 pt-1 pb-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-white flex items-center justify-center text-zinc-950 font-black text-xs shadow-sm">
                G
              </div>
              <span className="text-xs font-bold tracking-tight text-white uppercase">Ghostboard</span>
            </div>
            <Pill tone="ok" className="h-5 px-1.5 text-[9px] font-mono">
              <StatusDot tone="ok" ping />
              <span>ARMED</span>
            </Pill>
          </div>
        </div>

        {/* 5 Navigation Tabs */}
        <nav className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                data-tauri-drag-region="false"
                onMouseDown={stopDrag}
                onClick={() => onSelectTab(item.id)}
                className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium transition-all text-left ${
                  isActive
                    ? 'bg-white text-zinc-950 shadow-sm font-semibold'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-zinc-950' : 'text-zinc-400'}`} />
                <div className="min-w-0 flex-1 truncate">
                  <div className="truncate leading-tight">{item.label}</div>
                  <div className={`text-[10px] truncate ${isActive ? 'text-zinc-700' : 'text-zinc-500'}`}>
                    {item.sub}
                  </div>
                </div>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer: User Account Pill, Backend dot & Environment */}
      <div className="space-y-2 pt-3 border-t border-white/[0.08]">
        {/* Connection & OS Status */}
        <div className="px-2.5 py-1.5 rounded-lg bg-black/40 border border-white/[0.06] text-[10px] font-mono text-zinc-400 space-y-1">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <StatusDot tone="ok" />
              <span>Ядро:</span>
            </span>
            <span className="text-emerald-300 font-semibold truncate max-w-[100px]">{serverDisplay}</span>
          </div>
          {envInfo && (
            <div className="flex items-center justify-between text-zinc-500 pt-0.5 border-t border-white/[0.04]">
              <span>Платформа:</span>
              <span className="text-zinc-300 font-semibold uppercase">{envInfo.platform || OS_LABEL.linux}</span>
            </div>
          )}
        </div>

        {/* User Account Info */}
        <div className="p-2 rounded-lg bg-white/[0.03] border border-white/[0.06] flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1 truncate">
            <p className="text-[11px] font-medium text-zinc-200 truncate font-mono">
              {user?.email || 'Автономний режим'}
            </p>
            <div className="flex items-center gap-1 mt-0.5">
              <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-white/10 text-zinc-300 uppercase">
                {user?.plan || 'PRO'}
              </span>
            </div>
          </div>
          <button
            type="button"
            data-tauri-drag-region="false"
            onMouseDown={stopDrag}
            onClick={onLogout}
            title="Вийти з акаунта"
            className="p-1.5 rounded-md text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Quick QA Seed Button if in dev / guest mode */}
        {(!user || user.email === 'guest@ghostboard.local' || user.id === 'usr_demo') && onQuickQaLogin && (
          <button
            type="button"
            data-tauri-drag-region="false"
            onMouseDown={stopDrag}
            onClick={onQuickQaLogin}
            disabled={isQaLoggingIn}
            className="w-full py-1.5 px-2 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 text-[10px] font-mono font-medium flex items-center justify-center gap-1.5 transition cursor-pointer"
          >
            <Zap className={`w-3 h-3 text-cyan-400 ${isQaLoggingIn ? 'animate-spin' : ''}`} />
            <span>1-Click QA Seed</span>
          </button>
        )}
      </div>
    </aside>
  );
};
