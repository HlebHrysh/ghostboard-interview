'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
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
        className="inline-flex items-center gap-1 px-2 py-1 border border-white/10 rounded-full bg-black/60 text-[10px] font-mono font-bold text-zinc-300 hover:text-white hover:border-white/25 transition-all cursor-pointer"
        title="Change language"
      >
        <span>{currentMeta.flag}</span>
        <span className="hidden sm:inline">{locale.toUpperCase()}</span>
        <ChevronDown className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-44 bg-[#0a0a0e]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl z-[100] overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="p-1">
            {SUPPORTED_LOCALES.map((loc) => {
              const meta = LOCALE_META[loc];
              return (
                <button
                  key={loc}
                  onClick={() => {
                    setLocale(loc);
                    setOpen(false);
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-mono transition-all cursor-pointer ${
                    locale === loc
                      ? 'bg-[#C8F135]/20 text-[#C8F135] font-bold'
                      : 'text-zinc-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <span className="text-sm">{meta.flag}</span>
                  <span>{meta.nativeName}</span>
                  {locale === loc && (
                    <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#C8F135]" />
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
