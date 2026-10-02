'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { GhostDetectiveLogo } from './GhostDetectiveLogo';
import { ArrowRight, Sparkles, Menu, X, Sliders, Award, ChevronDown } from 'lucide-react';
import { useLocale } from '@/contexts/LocaleContext';
import { LangDropdown } from './LangDropdown';
import { LOCALE_META, SUPPORTED_LOCALES, type SupportedLocale } from '@/lib/i18n';

interface UnifiedNavbarProps {
  showLinks?: boolean;
}

export const UnifiedNavbar: React.FC<UnifiedNavbarProps> = ({ showLinks = true }) => {
  const pathname = usePathname();
  const { locale, setLocale, t } = useLocale();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ id: string; email: string; name?: string | null; plan: string } | null>(null);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    fetch('/api/sessions/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.authenticated && data?.user) {
          setCurrentUser(data.user);
        }
      })
      .catch(() => {});
  }, [pathname]);

  const navLinks = [
    { href: '/#features', label: t.nav.features },
    { href: '/mock-interview', label: t.nav.mockSimulator },
    { href: '/sandbox', label: t.nav.arena },
    { href: '/pricing', label: t.nav.pricing },
    { href: '/guide', label: t.nav.guide },
  ];

  return (
    <nav className="sticky top-0 left-0 right-0 z-50 px-3 sm:px-8 py-2.5 sm:py-3 bg-[#040406]/90 backdrop-blur-2xl border-b border-white/[0.08] select-none">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-4">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2 sm:gap-2.5 group cursor-pointer flex-shrink-0">
          <GhostDetectiveLogo size="sm" animated={true} />
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="font-mono font-black text-xs sm:text-sm tracking-[0.2em] sm:tracking-[0.22em] text-white group-hover:text-[#C8F135] transition-colors">
                GHOSTBOARD
              </span>
              <span className="hidden sm:inline-flex items-center gap-1 font-mono text-[9px] tracking-wider px-2 py-0.5 rounded-full border border-[#C8F135]/30 bg-[#C8F135]/10 text-[#C8F135] uppercase font-bold">
                <span className="w-1 h-1 rounded-full bg-[#C8F135] animate-ping" />
                <span>COACH v2.5</span>
              </span>
            </div>
          </div>
        </Link>

        {/* Center Desktop Links */}
        {showLinks && (
          <div className="hidden lg:flex items-center gap-6 xl:gap-7 font-mono text-xs tracking-wider text-zinc-400">
            {navLinks.map((link) => {
              const isActive = pathname === link.href || (link.href !== '/' && pathname.startsWith(link.href));
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`transition-colors py-1 relative hover:text-[#C8F135] ${
                    isActive ? 'text-white font-bold' : 'text-zinc-400'
                  }`}
                >
                  {link.label}
                  {isActive && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#C8F135] rounded-full shadow-[0_0_8px_#C8F135]" />
                  )}
                </Link>
              );
            })}
          </div>
        )}

        {/* Right CTA & Controls */}
        <div className="flex items-center gap-1.5 sm:gap-3">
          {/* Language Dropdown */}
          <LangDropdown />

          {/* Desktop Settings Icon */}
          <Link
            href="/settings"
            className="hidden sm:flex p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/5 transition-colors border border-transparent hover:border-white/10"
            title={t.nav.settings}
            aria-label={t.nav.settings}
          >
            <Sliders className="w-3.5 h-3.5" />
          </Link>

          {currentUser ? (
            <Link
              href="/profile"
              className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/10 hover:border-[#C8F135]/40 transition-all font-mono text-xs text-zinc-200"
              title={locale === 'ua' ? 'Профіль кандидата' : 'Candidate Profile'}
            >
              <div className="w-4 h-4 rounded-full bg-zinc-700 border border-white/20 flex items-center justify-center text-[9px] font-bold text-white">
                {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : currentUser.email.charAt(0).toUpperCase()}
              </div>
              <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold uppercase ${
                currentUser.plan === 'lifetime'
                  ? 'bg-amber-400/20 text-amber-300'
                  : currentUser.plan === 'pro'
                  ? 'bg-[#C8F135]/20 text-[#C8F135]'
                  : 'bg-white/10 text-zinc-300'
              }`}>
                {currentUser.plan === 'lifetime' ? 'VIP' : currentUser.plan === 'pro' ? 'PRO' : 'FREE'}
              </span>
            </Link>
          ) : (
            <Link
              href="/auth/login"
              className="hidden sm:inline-block font-mono text-xs text-zinc-400 hover:text-white transition-colors px-2 py-1"
            >
              {t.nav.signIn}
            </Link>
          )}

          {/* Launch Copilot CTA */}
          <Link
            href={currentUser ? "/interview" : "/auth/login?from=/interview"}
            className="btn-lime text-[11px] sm:text-xs font-mono py-1.5 sm:py-2 px-2.5 sm:px-4 shadow-[0_0_25px_rgba(200,241,53,0.3)] flex items-center gap-1 sm:gap-1.5 active:scale-95 transition-all flex-shrink-0"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">{t.nav.copilotStudio}</span>
            <span className="xs:hidden">Copilot</span>
            <ArrowRight className="w-3 h-3" />
          </Link>

          {/* Mobile Hamburger Button */}
          {showLinks && (
            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              className="lg:hidden p-2 rounded-xl bg-white/[0.05] border border-white/10 text-zinc-300 hover:text-white transition-colors cursor-pointer active:scale-95 flex items-center justify-center"
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            >
              {mobileMenuOpen ? <X className="w-4 h-4 text-[#C8F135]" /> : <Menu className="w-4 h-4" />}
            </button>
          )}
        </div>
      </div>

      {/* Mobile Drawer Dropdown */}
      {showLinks && mobileMenuOpen && (
        <div className="lg:hidden pt-4 pb-6 mt-3 border-t border-white/[0.08] animate-in fade-in slide-in-from-top-3 duration-200">
          <div className="flex flex-col gap-2 font-mono text-sm">
            {navLinks.map((link) => {
              const isActive = pathname === link.href || (link.href !== '/' && pathname.startsWith(link.href));
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`p-3 rounded-2xl border transition-all flex items-center justify-between ${
                    isActive
                      ? 'bg-[#C8F135]/15 border-[#C8F135]/40 text-[#C8F135] font-bold shadow-[0_0_20px_rgba(200,241,53,0.15)]'
                      : 'bg-[#08080c]/80 border-white/[0.06] text-zinc-300 hover:text-white hover:border-white/15'
                  }`}
                >
                  <span>{link.label}</span>
                  <ArrowRight className="w-3.5 h-3.5 opacity-50" />
                </Link>
              );
            })}

            <div className="grid grid-cols-2 gap-2 pt-2">
              <Link
                href="/interview?modal=soundcheck"
                onClick={() => setMobileMenuOpen(false)}
                className="p-3 rounded-2xl bg-zinc-900/60 border border-white/[0.06] text-zinc-300 text-xs flex items-center justify-center gap-1.5"
              >
                <span>🔊 Sound Check</span>
              </Link>
              <Link
                href="/settings"
                onClick={() => setMobileMenuOpen(false)}
                className="p-3 rounded-2xl bg-zinc-900/60 border border-white/[0.06] text-zinc-300 text-xs flex items-center justify-center gap-1.5"
              >
                <Sliders className="w-3.5 h-3.5 text-amber-400" />
                <span>{t.nav.settings}</span>
              </Link>
            </div>

            <div className="pt-2 flex items-center justify-between border-t border-white/[0.06] mt-2 px-1 text-xs">
              <Link
                href="/auth/login"
                onClick={() => setMobileMenuOpen(false)}
                className="text-zinc-400 hover:text-white"
              >
                {t.nav.signIn}
              </Link>
              <Link
                href="/auth/signup"
                onClick={() => setMobileMenuOpen(false)}
                className="text-[#C8F135] font-bold hover:underline"
              >
                {t.nav.signUp} →
              </Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};
