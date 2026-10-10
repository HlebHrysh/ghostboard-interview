'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Globe, ChevronDown } from 'lucide-react';
import { useLocale } from '@/contexts/LocaleContext';
import { LOCALE_META, SUPPORTED_LOCALES, type SupportedLocale } from '@/lib/i18n';

export function LangDropdown() {
  const { locale, setLocale } = useLocale();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentMeta = LOCALE_META[locale as SupportedLocale] || LOCALE_META['en'];

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((p) => !p)}
        className="inline-flex items-center gap-1.5 h-8 px-2.5 sm:px-3 rounded-full border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] hover:border-white/20 text-xs font-medium text-zinc-300 hover:text-white backdrop-blur-md transition-all cursor-pointer active:scale-95 select-none"
        title={locale === 'ua' ? 'Мова інтерфейсу' : 'Language'}
      >
        <Globe className="w-3.5 h-3.5 text-zinc-400" />
        <span className="font-mono text-xs uppercase tracking-wider">{locale}</span>
        <ChevronDown className={`w-3 h-3 text-zinc-500 transition-transform duration-200 ${open ? 'rotate-180 text-zinc-200' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-48 bg-[#0a0a0e]/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] z-[100] overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="p-1.5 space-y-0.5">
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
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-white/10 text-white font-semibold'
                      : 'text-zinc-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <span className="text-sm">{meta.flag}</span>
                  <span>{meta.nativeName}</span>
                  {isSelected && (
                    <span className="ml-auto w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_6px_rgba(255,255,255,0.8)]" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
