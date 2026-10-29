import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  Shield,
  Mic,
  Cpu,
  Settings2,
  User,
  LogOut,
  Minus,
  X,
  ChevronDown,
  CheckCircle2,
  FileText,
  Play,
  Volume2,
} from 'lucide-react';
import type { CandidateProfile } from '../lib/profileStore';

interface LauncherScreenProps {
  user: { email?: string; plan?: string } | null;
  onStartInterview: () => void;
  isCapturing: boolean;
  isStealth: boolean;
  onToggleStealth: () => void;
  onOpenSourcePicker: () => void;
  onOpenProfileModal: () => void;
  candidateProfile?: CandidateProfile;
  onLogout: () => void;
  onMinimize: () => void;
  onClose: () => void;
}

export const LauncherScreen: React.FC<LauncherScreenProps> = ({
  user,
  onStartInterview,
  isCapturing,
  isStealth,
  onToggleStealth,
  onOpenSourcePicker,
  onOpenProfileModal,
  candidateProfile,
  onLogout,
  onMinimize,
  onClose,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    if (isMenuOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isMenuOpen]);

  const emailDisplay = user?.email || 'jjjhleb12@gmail.com';
  const planDisplay = (user?.plan || 'lifetime').toUpperCase();

  return (
    <div className="w-full h-full bg-[#0B0C10] border border-white/10 rounded-2xl flex flex-col justify-between p-5 select-none font-sans overflow-hidden text-zinc-100 shadow-2xl relative">
      {/* ─────────────────────────────────────────────────────────────
          1. TOP TITLEBAR (36px, data-tauri-drag-region)
      ───────────────────────────────────────────────────────────── */}
      <div
        data-tauri-drag-region
        className="h-9 flex items-center justify-between select-none drag-region cursor-move shrink-0"
      >
        {/* Left: Ghostboard Brand + Stealth Dot */}
        <div className="flex items-center gap-2.5 no-drag">
          <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-cyan-500 to-violet-500 p-[1px]">
            <div className="w-full h-full bg-[#0B0C10] rounded-[7px] flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold tracking-tight text-white">Ghostboard</span>
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/25">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] font-mono font-medium text-emerald-400 tracking-wide">
                Stealth Ready
              </span>
            </div>
          </div>
        </div>

        {/* Right: Unified Account Chip + Window Controls */}
        <div className="flex items-center gap-2 no-drag" ref={menuRef}>
          {/* Unified Account Chip */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsMenuOpen((prev) => !prev)}
              className="flex items-center gap-2 px-2.5 py-1 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 transition-colors cursor-pointer text-xs"
            >
              <span className="text-zinc-300 font-mono text-[11px] max-w-[140px] truncate">
                {emailDisplay}
              </span>
              <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-gradient-to-r from-cyan-500/20 to-violet-500/20 text-cyan-300 border border-cyan-500/30">
                {planDisplay}
              </span>
              <ChevronDown className="w-3 h-3 text-zinc-400" />
            </button>

            {/* Dropdown Menu */}
            <AnimatePresence>
              {isMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -4, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4, scale: 0.98 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-full mt-1.5 w-48 bg-[#12141a] border border-white/15 rounded-xl shadow-2xl py-1 z-50 overflow-hidden"
                >
                  <div className="px-3 py-2 border-b border-white/[0.08]">
                    <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">
                      Обліковий запис
                    </p>
                    <p className="text-xs text-zinc-200 truncate font-mono mt-0.5">{emailDisplay}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      onOpenProfileModal();
                    }}
                    className="w-full px-3 py-2 text-left text-xs text-zinc-300 hover:text-white hover:bg-white/[0.06] flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <User className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Профіль кандидата</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      onLogout();
                    }}
                    className="w-full px-3 py-2 text-left text-xs text-rose-300 hover:text-rose-200 hover:bg-rose-500/10 flex items-center gap-2 transition-colors cursor-pointer border-t border-white/[0.06]"
                  >
                    <LogOut className="w-3.5 h-3.5 text-rose-400" />
                    <span>Вийти з акаунта</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Window Controls */}
          <div className="flex items-center gap-1 border-l border-white/10 pl-2">
            <button
              type="button"
              onClick={onMinimize}
              title="Згорнути"
              className="p-1.5 rounded-lg hover:bg-white/[0.08] text-zinc-400 hover:text-zinc-100 transition-colors cursor-pointer"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={onClose}
              title="Закрити"
              className="p-1.5 rounded-lg hover:bg-rose-500/20 text-zinc-400 hover:text-rose-300 transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. CENTRAL READINESS STATUS (3 Compact Horizontal Rows)
      ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-2.5 my-auto">
        {/* Row 1: Audio System & PipeWire Loopback */}
        <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.08] flex items-center justify-between hover:border-white/15 transition-all">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shrink-0">
              <Mic className="w-4 h-4 text-cyan-400" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-zinc-200">Аудіосистема PipeWire</span>
                <span className="text-[10px] font-mono text-cyan-400 bg-cyan-500/10 px-1.5 py-0.2 rounded border border-cyan-500/20">
                  Nova-3
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                Стерео-потік • Авто-розділення співрозмовника та мікрофона
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-black/40 border border-white/5">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isCapturing ? 'bg-emerald-400 animate-pulse' : 'bg-emerald-500'
                }`}
              />
              <span className="text-[10px] font-mono text-zinc-300">
                {isCapturing ? 'Активний' : 'Готовий'}
              </span>
            </div>
            <button
              type="button"
              onClick={onOpenSourcePicker}
              title="Налаштування джерел аудіо"
              className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-zinc-300 hover:text-white transition-colors cursor-pointer"
            >
              <Settings2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Row 2: AI Context & Language Detection */}
        <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.08] flex items-center justify-between hover:border-white/15 transition-all">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center shrink-0">
              <Cpu className="w-4 h-4 text-violet-400" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-zinc-200">Авто-детекція контексту</span>
                <span className="text-[10px] font-mono text-violet-400 bg-violet-500/10 px-1.5 py-0.2 rounded border border-violet-500/20">
                  Zero-Config
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                Мультимовний (EN / UA) • Автоматичне визначення тематики
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-black/40 border border-white/5">
              <CheckCircle2 className="w-3.5 h-3.5 text-violet-400" />
              <span className="text-[10px] font-mono text-zinc-300 truncate max-w-[130px]">
                {candidateProfile?.role ? `${candidateProfile.role} • CV` : 'CV Синхронізовано'}
              </span>
            </div>
            <button
              type="button"
              onClick={onOpenProfileModal}
              title="Налаштування резюме та посади"
              className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-zinc-300 hover:text-white transition-colors cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Row 3: Invisibility & Screen-Share Protection */}
        <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.08] flex items-center justify-between hover:border-white/15 transition-all">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
              <Shield className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-zinc-200">Апаратне маскування</span>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20">
                  Wayland / X11
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                Ізоляція від Zoom, Google Meet, Teams, Discord та запису екрана
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onToggleStealth}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-mono font-medium transition-colors cursor-pointer border ${
                isStealth
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20'
                  : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:bg-zinc-700'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isStealth ? 'bg-emerald-400' : 'bg-zinc-500'
                }`}
              />
              <span>{isStealth ? 'Захист увімкнено' : 'Вимкнено'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          3. BOTTOM LAUNCH BUTTON (Full-width, Ctrl+Enter)
      ───────────────────────────────────────────────────────────── */}
      <div className="shrink-0 pt-2">
        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          onClick={onStartInterview}
          className="w-full py-3 px-5 rounded-xl bg-gradient-to-r from-cyan-500 via-indigo-600 to-violet-600 hover:from-cyan-400 hover:via-indigo-500 hover:to-violet-500 text-white font-semibold text-xs tracking-wide shadow-[0_0_24px_rgba(6,182,212,0.25)] flex items-center justify-center gap-2.5 transition-all cursor-pointer border border-white/20"
        >
          <Play className="w-4 h-4 fill-white" />
          <span>Почати інтерв&apos;ю (Авто-режим)</span>
          <kbd className="ml-2 px-2 py-0.5 rounded bg-black/30 border border-white/20 text-[10px] font-mono text-zinc-200">
            Ctrl+Enter
          </kbd>
        </motion.button>
      </div>
    </div>
  );
};
