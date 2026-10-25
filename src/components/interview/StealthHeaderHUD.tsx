'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  RefreshCw,
  WifiOff,
  GraduationCap,
  ArrowLeft,
  Sliders,
  Eye,
  Tablet,
  Volume2,
  BookOpen,
  User,
  History,
} from 'lucide-react';
import { GhostDetectiveLogo } from '@/components/ui/GhostDetectiveLogo';
import { useLocale } from '@/contexts/LocaleContext';
import { getHudTranslations } from '@/lib/hudI18n';
import { LangDropdown } from '@/components/ui/LangDropdown';
import { UserProfileHUD } from './UserProfileHUD';

interface StealthHeaderHUDProps {
  isCapturing: boolean;
  sttStatus: 'connected' | 'reconnecting' | 'idle' | 'disconnected';
  sessionDuration: number;
  liveVolume: number;
  userPlan?: 'free' | 'pro' | 'lifetime';
  candidateRole?: string;
  onUpgradeClick?: () => void;
  onManualReconnect: () => void;
  onOpenProfile: () => void;
  onOpenHistory?: () => void;
  onOpenSoundCheck?: () => void;
  onOpenCompanionQR?: () => void;
  onToggleEyeLine?: () => void;
  isEyeLineActive?: boolean;
  hasQuestions?: boolean;
  questionCount?: number;
  formatTime: (secs: number) => string;
}

export const StealthHeaderHUD: React.FC<StealthHeaderHUDProps> = ({
  isCapturing,
  sttStatus,
  sessionDuration,
  liveVolume,
  userPlan = 'free',
  candidateRole,
  onUpgradeClick,
  onManualReconnect,
  onOpenProfile,
  onOpenHistory,
  onOpenSoundCheck,
  onOpenCompanionQR,
  onToggleEyeLine,
  isEyeLineActive = false,
  hasQuestions = false,
  questionCount = 0,
  formatTime,
}) => {
  const { locale } = useLocale();
  const hud = getHudTranslations(locale).header;
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 w-full px-3 sm:px-6 pt-14 pointer-events-none select-none">
      <div className="max-w-[700px] mx-auto flex items-center justify-between gap-2 pointer-events-auto">
        {/* Left: Brand, Time & Role Pill */}
        <div className="flex items-center gap-1.5">
          <div className="px-3 py-1 rounded-full bg-[#0D0D10]/90 border border-white/[0.08] shadow-[0_8px_20px_rgba(0,0,0,0.5)] flex items-center gap-2 backdrop-blur-xl">
            <Link href="/" className="flex items-center gap-2 group transition-opacity hover:opacity-80" aria-label="Return to home page">
              <GhostDetectiveLogo size="mini" />

              <span className="text-[11px] font-black font-mono tracking-widest text-white group-hover:text-zinc-300 transition-colors">
                GHOSTBOARD
              </span>
            </Link>

            {/* Session Timer */}
            <span className="text-[11px] font-mono text-zinc-400 border-l border-white/[0.08] pl-2 tabular-nums">
              {isCapturing
                ? userPlan === 'free'
                  ? `${formatTime(sessionDuration)} / 15:00`
                  : formatTime(sessionDuration)
                : '00:00'}
            </span>

            {/* Subscription Tier Pill */}
            {userPlan === 'pro' || userPlan === 'lifetime' ? (
              <button
                type="button"
                onClick={onUpgradeClick}
                className="text-[9px] font-mono px-2 py-0.2 rounded-full bg-white/[0.08] text-white border border-white/20 hover:bg-white/15 transition-all cursor-pointer hidden sm:inline-flex items-center gap-1 font-bold"
                title={hud.proTooltip}
              >
                <span>{userPlan === 'lifetime' ? 'LIFETIME' : 'PRO'}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onUpgradeClick}
                className="text-[9px] font-mono px-2 py-0.2 rounded-full bg-white/10 text-white border border-white/20 hover:bg-white/15 transition-all cursor-pointer hidden sm:inline-flex items-center gap-1 font-bold"
                title={hud.trialTooltip}
              >
                <span>FREE TRIAL</span>
              </button>
            )}

            {/* Candidate Role Pill */}
            {candidateRole && (
              <button
                type="button"
                onClick={onOpenProfile}
                className="text-[10px] font-mono px-2 py-0.2 rounded-full bg-white/[0.04] text-zinc-300 border border-white/[0.08] hover:border-white/20 hover:text-white transition-all cursor-pointer hidden md:inline-flex items-center gap-1 truncate max-w-[130px]"
                title="Change Target Stack"
              >
                <GraduationCap className="w-3 h-3 text-zinc-400 shrink-0" />
                <span className="truncate">{candidateRole}</span>
              </button>
            )}
          </div>
        </div>

        {/* Right: Sound Check, History, Language, User Profile & Settings Menu */}
        <div className="flex items-center gap-1.5 relative">
          {onOpenSoundCheck && (
            <button
              type="button"
              onClick={onOpenSoundCheck}
              className="px-2.5 py-1 rounded-full bg-[#0D0D10]/90 border border-white/[0.08] hover:border-white/20 text-zinc-300 hover:text-white transition-all cursor-pointer text-xs font-mono flex items-center gap-1.5 backdrop-blur-xl"
              title={hud.soundcheck}
            >
              <Volume2 className="w-3 h-3 text-zinc-400" />
              <span className="text-[10px] font-medium hidden sm:inline">{hud.soundcheck}</span>
            </button>
          )}

          {onOpenHistory && questionCount > 0 && (
            <button
              type="button"
              onClick={onOpenHistory}
              className="px-2.5 py-1 rounded-full bg-[#0D0D10]/90 border border-white/[0.08] hover:border-white/20 text-zinc-300 hover:text-white transition-all cursor-pointer text-xs font-mono flex items-center gap-1.5 backdrop-blur-xl"
              title="Історія запитань"
            >
              <History className="w-3 h-3 text-zinc-400" />
              <span className="text-[10px] font-mono text-zinc-200">{questionCount}</span>
            </button>
          )}

          {/* Quick Language Switcher Dropdown */}
          <LangDropdown />

          {/* User Profile & Subscription Activity HUD */}
          <UserProfileHUD
            userPlan={userPlan}
            candidateRole={candidateRole}
            onOpenHistory={onOpenHistory}
            onOpenProfile={onOpenProfile}
            onUpgradeClick={onUpgradeClick}
            sessionDuration={sessionDuration}
          />

          {/* Settings Menu Dropdown Toggle */}
          <div className="relative">
            <button
              onClick={() => setIsMenuOpen((prev) => !prev)}
              className={`p-1.5 rounded-full bg-[#0D0D10]/90 border transition-all cursor-pointer backdrop-blur-xl flex items-center justify-center ${
                isMenuOpen
                  ? 'border-white/30 text-white bg-white/10'
                  : 'border-white/[0.08] text-zinc-400 hover:text-white hover:border-white/20'
              }`}
              title={hud.menuTitle}
            >
              <Sliders className="w-3.5 h-3.5" />
            </button>

            {/* Minimalist Backdrop-blurred Popover Menu */}
            {isMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40 bg-black/30"
                  onClick={() => setIsMenuOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-60 rounded-xl bg-[#0D0D10]/95 backdrop-blur-2xl border border-white/[0.08] p-1.5 shadow-[0_16px_40px_rgba(0,0,0,0.8)] z-50 animate-in fade-in zoom-in-95 duration-150 text-xs font-mono">
                  <div className="px-2 py-1.5 text-[10px] text-zinc-500 uppercase tracking-wider font-semibold border-b border-white/[0.06] mb-1">
                    {locale === 'ua' ? 'Інструменти' : 'Interview Tools'}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      onOpenProfile();
                    }}
                    className="w-full px-2.5 py-1.5 rounded-lg text-left text-zinc-300 hover:text-white hover:bg-white/[0.06] flex items-center gap-2 cursor-pointer transition-colors"
                  >
                    <User className="w-3.5 h-3.5 text-violet-400" />
                    <span>{locale === 'ua' ? 'Профіль та стек' : 'Candidate Profile & Stack'}</span>
                  </button>

                  <Link
                    href="/profile"
                    onClick={() => setIsMenuOpen(false)}
                    className="w-full px-2.5 py-1.5 rounded-lg text-left text-zinc-300 hover:text-white hover:bg-white/[0.06] flex items-center gap-2 cursor-pointer transition-colors"
                  >
                    <GraduationCap className="w-3.5 h-3.5 text-zinc-400" />
                    <span>{locale === 'ua' ? 'Тариф та налаштування' : 'Profile & Plan'}</span>
                  </Link>

                  {onOpenCompanionQR && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsMenuOpen(false);
                        onOpenCompanionQR();
                      }}
                      className="w-full px-2.5 py-1.5 rounded-lg text-left text-zinc-300 hover:text-white hover:bg-white/[0.06] flex items-center gap-2 cursor-pointer transition-colors"
                    >
                      <Tablet className="w-3.5 h-3.5 text-zinc-400" />
                      <span>2nd Screen HUD (QR)</span>
                    </button>
                  )}

                  {onToggleEyeLine && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsMenuOpen(false);
                        onToggleEyeLine();
                      }}
                      className="w-full px-2.5 py-1.5 rounded-lg text-left text-zinc-300 hover:text-white hover:bg-white/[0.06] flex items-center gap-2 cursor-pointer transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5 text-zinc-400" />
                      <span>Teleprompter Overlay</span>
                    </button>
                  )}

                  <Link
                    href="/guide"
                    onClick={() => setIsMenuOpen(false)}
                    className="w-full px-2.5 py-1.5 rounded-lg text-left text-zinc-300 hover:text-white hover:bg-white/[0.06] flex items-center gap-2 cursor-pointer transition-colors"
                  >
                    <BookOpen className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Setup Guide</span>
                  </Link>

                  <div className="my-1 border-t border-white/[0.06]" />

                  <Link
                    href="/"
                    onClick={() => setIsMenuOpen(false)}
                    className="w-full px-2.5 py-1.5 rounded-lg text-left text-zinc-400 hover:text-white hover:bg-white/[0.06] flex items-center gap-2 cursor-pointer transition-colors"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Exit to Landing</span>
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
