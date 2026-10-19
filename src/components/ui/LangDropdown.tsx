'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Globe, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocale } from '@/contexts/LocaleContext';
import { LOCALE_META, SUPPORTED_LOCALES, type SupportedLocale } from '@/lib/i18n';

interface LangDropdownProps {
  align?: 'right' | 'left';
}

export function LangDropdown({ align = 'right' }: LangDropdownProps) {
  const { locale, setLocale } = useLocale();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const isUa = locale === 'ua';

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const currentMeta = LOCALE_META[locale as SupportedLocale] || LOCALE_META['en'];

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((p) => !p)}
        className={`inline-flex items-center gap-1.5 h-8 px-2.5 sm:px-3 rounded-full border text-xs font-medium backdrop-blur-md transition-all cursor-pointer active:scale-95 select-none ${
          open
            ? 'border-white/30 bg-white/10 text-white shadow-[0_0_15px_rgba(255,255,255,0.08)]'
            : 'border-white/10 bg-white/[0.04] hover:bg-white/[0.08] hover:border-white/20 text-zinc-300 hover:text-white'
        }`}
        title={isUa ? 'Мова інтерфейсу' : 'Language'}
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <Globe className="w-3.5 h-3.5 text-zinc-400" />
        <span className="font-mono text-xs uppercase tracking-wider">{locale}</span>
        <ChevronDown
          className={`w-3 h-3 text-zinc-500 transition-transform duration-200 ${
            open ? 'rotate-180 text-zinc-200' : ''
          }`}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
            className={`absolute top-full pt-3 z-[100] pointer-events-auto ${
              align === 'right' ? 'right-0' : 'left-0'
            }`}
          >
            {/* High-Contrast Frosted Glass Card in MegaMenu style */}
            <div className="relative rounded-[24px] sm:rounded-[28px] bg-[#0d0d12]/98 backdrop-blur-3xl border border-white/15 shadow-[0_30px_80px_rgba(0,0,0,0.9),0_0_0_1px_rgba(255,255,255,0.08)] p-4 sm:p-6 text-left overflow-hidden w-[340px] sm:w-[560px] max-w-[calc(100vw-1.5rem)]">
              {/* Pointing caret arrow */}
              <div
                className={`absolute -top-[6px] w-3.5 h-3.5 rotate-45 bg-[#0d0d12] border-l border-t border-white/15 z-20 pointer-events-none ${
                  align === 'right' ? 'right-7' : 'left-7'
                }`}
              />

              {/* Top ambient illumination line */}
              <div className="absolute top-0 left-1/4 right-1/4 h-[1px] bg-gradient-to-r from-transparent via-white/40 to-transparent pointer-events-none" />

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-5 items-stretch">
                {/* Left: 2-column Grid of 10 Languages */}
                <div className="sm:col-span-7">
                  <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider mb-2 px-1 flex items-center justify-between">
                    <span>{isUa ? 'Виберіть мову' : 'Select Language'}</span>
                    <span className="text-zinc-600 font-sans">10 options</span>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5">
                    {SUPPORTED_LOCALES.map((loc) => {
                      const meta = LOCALE_META[loc];
                      const isSelected = locale === loc;
                      return (
                        <button
                          key={loc}
                          onClick={() => {
                            setLocale(loc);
                            setOpen(false);
                          }}
                          className={`group flex items-center gap-2 p-1.5 sm:p-2 rounded-xl text-left transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-white/[0.12] border border-white/20 text-white shadow-[0_0_15px_rgba(255,255,255,0.05)]'
                              : 'hover:bg-white/[0.06] border border-transparent text-zinc-300 hover:text-white'
                          }`}
                        >
                          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-white/[0.06] border border-white/10 group-hover:border-white/20 flex items-center justify-center shrink-0 text-base shadow-sm transition-colors">
                            {meta.flag}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-semibold leading-tight flex items-center justify-between">
                              <span className="truncate">{meta.nativeName}</span>
                              {isSelected && (
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)] shrink-0 ml-1" />
                              )}
                            </div>
                            <div className="text-[10px] text-zinc-400 truncate font-mono mt-0.5">
                              {meta.name}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Right: Focused Language & AI Status Card (Photo 2 style) */}
                <div className="hidden sm:flex sm:col-span-5 flex-col justify-between p-4 rounded-2xl bg-[#14151e] border border-white/10 shadow-inner">
                  <div className="space-y-3">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-[10px] font-mono font-bold text-emerald-300 uppercase tracking-wider">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span>{isUa ? '10 МОВ НАЖИВО' : '10 LIVE LOCALES'}</span>
                    </div>

                    <div>
                      <h4 className="font-semibold text-sm text-white leading-tight flex items-center gap-2">
                        <span className="text-lg">{currentMeta.flag}</span>
                        <span>{currentMeta.nativeName}</span>
                      </h4>
                      <div className="text-[11px] text-zinc-400 font-mono mt-0.5">
                        {currentMeta.name} · {locale.toUpperCase()}
                      </div>
                    </div>

                    <p className="text-xs text-zinc-300 leading-relaxed font-normal">
                      {isUa
                        ? 'Повна адаптація: інтерфейс, пряма транскрипція 16kHz аудіо та інтелектуальні підказки Copilot переходять на вибрану мову.'
                        : 'Complete localization: UI, 16kHz speech recognition, and live Copilot teleprompter prompts adapt instantly.'}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-white/[0.08] mt-4 space-y-1.5">
                    <div className="flex items-center justify-between text-[10px] font-mono">
                      <span className="text-zinc-400">STT ENGINE</span>
                      <span className="text-zinc-200">Deepgram Nova-3</span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] font-mono">
                      <span className="text-zinc-400">LATENCY</span>
                      <span className="text-emerald-400 font-semibold">&lt; 350ms</span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] font-mono">
                      <span className="text-zinc-400">MODEL</span>
                      <span className="text-zinc-200">Gemini 2.5 Flash</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
