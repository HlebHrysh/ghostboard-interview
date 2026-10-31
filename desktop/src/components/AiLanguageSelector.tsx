import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { HintLanguage } from '../lib/desktopSettings';

export interface AiLanguageOption {
  id: HintLanguage;
  label: string;
  flag: string;
  sublabel: string;
}

export const DESKTOP_AI_LANGUAGES: AiLanguageOption[] = [
  {
    id: 'auto',
    label: 'Авто',
    flag: '🌐',
    sublabel: 'Мова співрозмовника',
  },
  {
    id: 'bilingual_uk',
    label: 'Билингва (EN + UA)',
    flag: '🇬🇧🇺🇦',
    sublabel: 'Англійська мова + UA підказки',
  },
  {
    id: 'bilingual_ru',
    label: 'Билингва (EN + RU)',
    flag: '🇬🇧🇷🇺',
    sublabel: 'Английская речь + RU подсказки',
  },
  {
    id: 'uk',
    label: 'Українська',
    flag: '🇺🇦',
    sublabel: 'Чиста українська мова',
  },
  {
    id: 'en',
    label: 'English',
    flag: '🇬🇧',
    sublabel: 'Technical English (B2/C1)',
  },
  {
    id: 'ru',
    label: 'Русский',
    flag: '🇷🇺',
    sublabel: 'Чистый русский язык',
  },
  {
    id: 'pl',
    label: 'Polski',
    flag: '🇵🇱',
    sublabel: 'Język polski',
  },
  {
    id: 'de',
    label: 'Deutsch',
    flag: '🇩🇪',
    sublabel: 'Deutsche Sprache',
  },
  {
    id: 'es',
    label: 'Español',
    flag: '🇪🇸',
    sublabel: 'Idioma español',
  },
  {
    id: 'fr',
    label: 'Français',
    flag: '🇫🇷',
    sublabel: 'Langue française',
  },
];

export interface DesktopAiLanguageSelectorProps {
  currentMode?: HintLanguage;
  value?: HintLanguage;
  onChange: (mode: HintLanguage) => void;
  align?: 'left' | 'right';
  className?: string;
  compact?: boolean;
}

export function DesktopAiLanguageSelector({
  currentMode,
  value,
  onChange,
  align = 'right',
  className = '',
  compact = false,
}: DesktopAiLanguageSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedMode = value || currentMode || 'auto';
  const activeOpt =
    DESKTOP_AI_LANGUAGES.find((o) => o.id === selectedMode) ||
    DESKTOP_AI_LANGUAGES[0];

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('mousedown', handleOutsideClick);
    window.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      window.removeEventListener('keydown', handleEsc);
    };
  }, []);

  const handleSelect = (mode: HintLanguage) => {
    onChange(mode);
    setIsOpen(false);
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen((p) => !p)}
        className={`inline-flex items-center gap-1.5 rounded-full border text-[11px] font-mono font-medium backdrop-blur-md transition-all cursor-pointer select-none ${
          compact ? 'px-2 py-0.5' : 'px-2.5 py-1'
        } ${
          isOpen
            ? 'border-white/30 bg-white/10 text-white shadow-[0_0_12px_rgba(255,255,255,0.08)]'
            : 'border-white/[0.08] bg-[#0d0d12]/90 hover:bg-white/[0.08] hover:border-white/20 text-zinc-300 hover:text-white'
        }`}
        title={`Мова відповідей ШІ: ${activeOpt.label}`}
        aria-expanded={isOpen}
      >
        <span className="text-xs leading-none">{activeOpt.flag}</span>
        <span className="truncate max-w-[100px]">{activeOpt.label}</span>
        <ChevronDown
          className={`w-3 h-3 text-zinc-400 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-white' : ''
          }`}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className={`absolute top-full pt-2 z-[100] w-[250px] ${
              align === 'right' ? 'right-0' : 'left-0'
            }`}
          >
            <div className="rounded-2xl bg-[#0e0f14]/98 backdrop-blur-2xl border border-white/15 p-2 shadow-[0_20px_60px_rgba(0,0,0,0.85)] text-left">
              <div className="px-2.5 py-1 text-[10px] font-mono text-zinc-500 uppercase tracking-wider font-semibold border-b border-white/[0.06] mb-1 flex items-center justify-between">
                <span>Мова відповідей ШІ</span>
                <span className="text-zinc-600">10 режимів</span>
              </div>

              <div className="space-y-0.5 max-h-[300px] overflow-y-auto scrollbar-thin">
                {DESKTOP_AI_LANGUAGES.map((opt) => {
                  const isSelected = activeOpt.id === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => handleSelect(opt.id)}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-left text-xs transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-white/10 text-white border border-white/15 font-semibold'
                          : 'text-zinc-300 hover:text-white hover:bg-white/[0.06] border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-sm leading-none shrink-0">{opt.flag}</span>
                        <div className="min-w-0">
                          <div className="truncate text-xs">{opt.label}</div>
                          <div className="truncate text-[10px] font-mono text-zinc-500">
                            {opt.sublabel}
                          </div>
                        </div>
                      </div>
                      {isSelected && (
                        <Check className="w-3.5 h-3.5 text-white shrink-0 ml-2" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default DesktopAiLanguageSelector;
