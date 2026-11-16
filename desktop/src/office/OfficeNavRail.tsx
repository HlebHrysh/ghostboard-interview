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

const NAV_GROUPS: Array<{
  sectionLabel: string;
  items: Array<{
    id: OfficeTab;
    label: string;
    sub: string;
    icon: React.ComponentType<{ className?: string }>;
  }>;
}> = [
  {
    sectionLabel: 'КОПІЛОТ',
    items: [{ id: 'launch', label: 'Запуск', sub: 'Launchpad', icon: Rocket }],
  },
  {
    sectionLabel: 'НАЛАШТУВАННЯ',
    items: [
      { id: 'audio', label: 'Аудіо та Канали', sub: 'Audio Studio', icon: Headphones },
      { id: 'ai', label: 'ШІ та Промпт', sub: 'AI Brain', icon: Cpu },
      { id: 'context', label: 'Профіль та CV', sub: 'Candidate', icon: FileText },
      { id: 'stealth', label: 'Стелс та Хоткеї', sub: 'Stealth & OS', icon: Shield },
    ],
  },
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
  const avatarLetter = (user?.email?.trim()?.[0] || 'G').toUpperCase();

  return (
    <aside
      data-tauri-drag-region
      className="w-[236px] shrink-0 border-r border-white/[0.08] bg-[#0a0a0d] flex flex-col justify-between p-3.5 select-none shadow-[inset_-1px_0_0_rgba(255,255,255,0.03)]"
    >
      <div className="space-y-4">
        {/* Apple Settings / Linear Brand Header + STEALTH ARMED indicator */}
        <div className="px-1 pt-0.5 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="relative flex h-8 w-8 items-center justify-center rounded-[10px] border border-white/[0.15] bg-[#141418] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.18)] overflow-hidden">
                <img
                  src="./icon.svg"
                  alt="Ghostboard"
                  draggable={false}
                  className="h-4.5 w-4.5 object-contain"
                />
              </div>
              <div className="leading-none">
                <span className="block font-display text-[13.5px] font-bold tracking-tight text-white">
                  Ghostboard
                </span>
                <span className="mt-1 inline-flex items-center gap-1 text-[9.5px] font-mono uppercase tracking-[0.08em] text-zinc-500">
                  OFFICE · v2.0
                </span>
              </div>
            </div>
          </div>

          {/* STEALTH ARMED hardware indicator */}
          <div
            className={`flex items-center justify-between rounded-xl border px-2.5 py-1.5 text-[10px] font-mono uppercase tracking-[0.09em] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] ${
              stealthArmed
                ? 'border-emerald-500/25 bg-emerald-500/[0.08] text-emerald-300'
                : 'border-amber-500/25 bg-amber-500/[0.08] text-amber-300'
            }`}
          >
            <span className="flex items-center gap-1.5 font-medium">
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  stealthArmed
                    ? 'bg-emerald-400 shadow-[0_0_7px_rgba(52,211,153,0.85)]'
                    : 'bg-amber-400'
                }`}
              />
              {stealthArmed ? 'STEALTH ARMED' : 'STEALTH OFF'}
            </span>
            <span className="rounded border border-white/10 bg-black/30 px-1.5 py-0.5 text-[9px] opacity-85">
              {envInfo?.hyprland
                ? 'HYPR'
                : envInfo?.platform === 'browser'
                  ? 'WEB'
                  : (envInfo?.platform || OS_LABEL.linux).toUpperCase().slice(0, 5)}
            </span>
          </div>
        </div>

        {/* Grouped Navigation Tabs with Illuminated Obsidian Capsule */}
        <nav aria-label="Розділи Ghostboard Office" className="space-y-4">
          {NAV_GROUPS.map((group) => (
            <div key={group.sectionLabel} className="space-y-1">
              <div className="px-2.5 pb-0.5 font-mono text-[9.5px] font-medium uppercase tracking-[0.14em] text-zinc-600">
                {group.sectionLabel}
              </div>
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    data-tauri-drag-region="false"
                    onMouseDown={stopDrag}
                    onClick={() => onSelectTab(item.id)}
                    className={`relative z-10 w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs transition-colors text-left cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60 ${
                      isActive
                        ? 'text-white font-semibold'
                        : 'text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.035]'
                    }`}
                  >
                    {isActive && (
                      <motion.span
                        layoutId="office-nav-active"
                        transition={SPRING}
                        className="absolute inset-0 -z-10 rounded-xl border border-white/[0.14] bg-gradient-to-b from-[#1e1e26] to-[#14141a] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.18),0_8px_20px_rgba(0,0,0,0.45)]"
                      />
                    )}
                    <span
                      aria-hidden="true"
                      className={`h-4 w-[2.5px] shrink-0 rounded-full transition-all ${
                        isActive
                          ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.75)] opacity-100'
                          : 'bg-transparent opacity-0'
                      }`}
                    />
                    <Icon
                      className={`w-4 h-4 shrink-0 transition-colors ${
                        isActive ? 'text-emerald-300' : 'text-zinc-500'
                      }`}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="truncate leading-tight">{item.label}</div>
                      <div
                        className={`text-[10px] truncate mt-0.5 ${
                          isActive ? 'text-zinc-400' : 'text-zinc-500'
                        }`}
                      >
                        {item.sub}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          ))}
        </nav>
      </div>

      {/* Bottom Compact Account Card */}
      <div className="pt-3 border-t border-white/[0.07]">
        <div className="rounded-xl border border-white/[0.08] bg-[#111114] p-2.5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)] space-y-2">
          <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400">
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Ядро ШІ
            </span>
            <span className="text-zinc-200 font-medium">
              {isDemo ? 'Rust Local' : isCloud ? 'Cloud Sync' : 'Local Dev'}
            </span>
          </div>

          <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/[0.06]">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-white/12 bg-[#18181f] font-mono text-[11px] font-bold text-zinc-200">
                {avatarLetter}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-medium text-zinc-100 truncate">
                  {isDemo ? 'Автономний' : user?.email || 'Користувач'}
                </p>
                <span className="inline-block rounded border border-emerald-500/20 bg-emerald-500/10 px-1.5 py-px text-[9px] font-mono uppercase text-emerald-300">
                  {user?.plan || 'PRO'}
                </span>
              </div>
            </div>

            {isDemo && onOpenAuth ? (
              <button
                type="button"
                data-tauri-drag-region="false"
                onMouseDown={stopDrag}
                onClick={onOpenAuth}
                title="Увійти в акаунт"
                className="shrink-0 whitespace-nowrap inline-flex items-center gap-1 rounded-lg border border-white/10 bg-[#18181e] px-2 py-1 text-[10.5px] font-medium text-zinc-200 hover:border-white/25 hover:text-white transition-colors cursor-pointer"
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
