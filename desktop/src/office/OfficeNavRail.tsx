import React from 'react';
import { motion } from 'framer-motion';
import {
  Cpu,
  FileText,
  Headphones,
  LogIn,
  LogOut,
  Rocket,
  Shield,
} from 'lucide-react';
import { SPRING, stopDrag } from '../ui/primitives';
import { getResolvedBaseUrl, type UserProfileData } from '../lib/apiClient';
import { OS_LABEL, useEnvironmentInfo } from '../lib/platform';

export type OfficeTab = 'launch' | 'audio' | 'ai' | 'context' | 'stealth';

interface OfficeNavRailProps {
  activeTab: OfficeTab;
  onSelectTab: (tab: OfficeTab) => void;
  user: UserProfileData | null;
  stealthArmed: boolean;
  onLogout: () => void;
  onOpenAuth?: () => void;
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
  stealthArmed,
  onLogout,
  onOpenAuth,
}) => {
  const envInfo = useEnvironmentInfo();
  const baseUrl = getResolvedBaseUrl();
  const isCloud = baseUrl.includes('ghostboard.ai') || baseUrl.includes('https://');
  const isDemo = !user || user.id === 'usr_demo' || user.email === 'demo@ghostboard.ai';

  return (
    <aside
      data-tauri-drag-region
      className="w-[232px] shrink-0 border-r border-white/[0.08] bg-[#09090b]/95 flex flex-col justify-between p-3.5 select-none shadow-[inset_-1px_0_0_rgba(255,255,255,0.03)]"
    >
      <div className="space-y-5">
        {/* Apple Settings / Linear Brand Header + STEALTH ARMED indicator */}
        <div className="px-1.5 pt-1 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/15 bg-[#141418] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.16)] overflow-hidden">
                <img
                  src="./ghost-transparent.png"
                  alt="Ghostboard"
                  draggable={false}
                  className="h-5 w-5 object-contain"
                />
              </div>
              <div className="leading-none">
                <span className="block font-display text-[13px] font-semibold tracking-tight text-white">
                  Ghostboard
                </span>
                <span className="block text-[10px] font-mono text-zinc-500 mt-0.5">
                  OFFICE v2
                </span>
              </div>
            </div>
          </div>

          {/* STEALTH ARMED indicator */}
          <div
            className={`flex items-center justify-between rounded-lg border px-2.5 py-1.5 text-[10px] font-mono uppercase tracking-[0.09em] ${
              stealthArmed
                ? 'border-emerald-500/25 bg-emerald-500/[0.08] text-emerald-300'
                : 'border-amber-500/25 bg-amber-500/[0.08] text-amber-300'
            }`}
          >
            <span className="flex items-center gap-1.5 font-medium">
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  stealthArmed ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                }`}
              />
              {stealthArmed ? 'STEALTH ARMED' : 'STEALTH OFF'}
            </span>
            <span className="text-[9.5px] opacity-75">
              {envInfo?.hyprland ? 'HYPR' : (envInfo?.platform || OS_LABEL.linux).toUpperCase().slice(0, 5)}
            </span>
          </div>
        </div>

        {/* 5 Primary Navigation Tabs with layoutId spring capsule */}
        <nav aria-label="Розділи Ghostboard Office" className="space-y-1">
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
                className={`relative z-10 w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs transition-colors text-left cursor-pointer ${
                  isActive
                    ? 'text-zinc-950 font-semibold'
                    : 'text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.04]'
                }`}
              >
                {isActive && (
                  <motion.span
                    layoutId="office-nav-active"
                    transition={SPRING}
                    className="absolute inset-0 -z-10 rounded-xl bg-white shadow-[inset_0_1px_0_rgba(255,255,255,0.6),0_8px_22px_rgba(0,0,0,0.45)]"
                  />
                )}
                <Icon
                  className={`w-4 h-4 shrink-0 transition-colors ${
                    isActive ? 'text-zinc-950' : 'text-zinc-500'
                  }`}
                />
                <div className="min-w-0 flex-1">
                  <div className="truncate leading-tight">{item.label}</div>
                  <div
                    className={`text-[10px] truncate mt-0.5 ${
                      isActive ? 'text-zinc-600' : 'text-zinc-500'
                    }`}
                  >
                    {item.sub}
                  </div>
                </div>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Compact Account Card */}
      <div className="space-y-2 pt-3 border-t border-white/[0.08]">
        <div className="rounded-xl border border-white/[0.08] bg-[#111114] p-2.5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)] space-y-2">
          <div className="flex items-center justify-between text-[10.5px] font-mono text-zinc-400">
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Ядро ШІ
            </span>
            <span className="text-zinc-200 font-medium">
              {isDemo ? 'Rust Local' : isCloud ? 'Cloud Sync' : 'Local Dev'}
            </span>
          </div>

          <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-white/[0.06]">
            <div className="min-w-0 flex-1">
              <p className="text-[11.5px] font-medium text-zinc-100 truncate">
                {isDemo ? 'Автономний режим' : user?.email || 'Користувач'}
              </p>
              <span className="inline-block mt-0.5 rounded bg-white/[0.08] px-1.5 py-0.5 text-[9.5px] font-mono uppercase text-zinc-300">
                {user?.plan || 'PRO'}
              </span>
            </div>

            {isDemo && onOpenAuth ? (
              <button
                type="button"
                data-tauri-drag-region="false"
                onMouseDown={stopDrag}
                onClick={onOpenAuth}
                title="Увійти в акаунт"
                className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/[0.05] px-2 py-1 text-[10.5px] font-medium text-zinc-200 hover:bg-white/[0.12] hover:text-white transition-colors cursor-pointer"
              >
                <LogIn className="w-3 h-3" />
                Увійти
              </button>
            ) : (
              <button
                type="button"
                data-tauri-drag-region="false"
                onMouseDown={stopDrag}
                onClick={onLogout}
                title="Вийти з акаунта"
                aria-label="Вийти з акаунта"
                className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
};
