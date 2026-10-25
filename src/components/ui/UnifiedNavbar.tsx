'use client';

import { ThemeToggle } from "@/components/ui/ThemeToggle";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { GhostDetectiveLogo } from './GhostDetectiveLogo';
import { ArrowRight, Sparkles, Menu, X, User } from 'lucide-react';
import { useLocale } from '@/contexts/LocaleContext';
import { LangDropdown } from './LangDropdown';
import { ResendMegaMenu } from './nav/ResendMegaMenu';

interface UnifiedNavbarProps {
  showLinks?: boolean;
}

export const UnifiedNavbar: React.FC<UnifiedNavbarProps> = ({ showLinks = true }) => {
  const pathname = usePathname();
  const { locale, t } = useLocale();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ id: string; email: string; name?: string | null; plan: string } | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
    { href: '/mock-interview', label: t.nav.arena },
    { href: '/download', label: locale === 'ua' ? 'Завантажити' : 'Download' },
    { href: '/download#extension', label: 'LeetCode Extension' },
    { href: '/pricing', label: t.nav.pricing },
    { href: '/guide', label: t.nav.guide },
  ];

  return (
    <nav className="sticky top-0 left-0 right-0 z-50 px-3 sm:px-8 py-2.5 sm:py-3 bg-black/90 backdrop-blur-xl border-b border-white/[0.08] select-none">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-4">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2 sm:gap-2.5 group cursor-pointer flex-shrink-0">
          <GhostDetectiveLogo 
            size="sm" 
            className="translate-y-[0.5px]" 
          />
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="font-mono font-semibold text-xs sm:text-sm tracking-[0.2em] sm:tracking-[0.22em] text-chrome">
                GHOSTBOARD
              </span>
              <span className="hidden sm:inline-flex items-center gap-1.5 font-mono text-[9px] tracking-wider px-2 py-0.5 rounded-full border border-white/15 bg-white/[0.03] text-zinc-400 uppercase">
                <span className="status-dot !w-1 !h-1" />
                <span>COACH v2.5</span>
              </span>
            </div>
          </div>
        </Link>

        {/* Center Desktop Mega Menu Dropdowns */}
        {showLinks && (
          <div className="hidden lg:flex items-center">
            <ResendMegaMenu />
          </div>
        )}

        {/* Right CTA & Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Language Dropdown */}
          <LangDropdown />

          <ThemeToggle />

          {/* Account / Profile */}
          {currentUser ? (
            <Link
              href="/profile"
              className="hidden sm:inline-flex items-center gap-1.5 h-8 px-3 rounded-full border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] hover:border-white/20 text-xs font-medium text-zinc-300 hover:text-white backdrop-blur-md transition-all cursor-pointer active:scale-95 select-none"
              title={locale === 'ua' ? 'Профіль кандидата' : 'Candidate Profile'}
            >
              <User className="w-3.5 h-3.5 text-zinc-400" />
              <span className="max-w-[110px] truncate">
                {currentUser.name ? currentUser.name.split(' ')[0] : (locale === 'ua' ? 'Профіль' : 'Profile')}
              </span>
              {currentUser.plan && currentUser.plan !== 'free' && (
                <span className="text-[9px] font-mono font-semibold px-1.5 py-0.2 rounded-full bg-white/[0.08] border border-white/10 text-zinc-300 uppercase tracking-wider">
                  {currentUser.plan === 'lifetime' ? 'VIP' : 'PRO'}
                </span>
              )}
            </Link>
          ) : (
            <Link
              href="/auth/login"
              className="hidden sm:inline-flex items-center gap-1.5 h-8 px-3 rounded-full border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] hover:border-white/20 text-xs font-medium text-zinc-300 hover:text-white backdrop-blur-md transition-all cursor-pointer active:scale-95 select-none"
            >
              <User className="w-3.5 h-3.5 text-zinc-400" />
              <span>{t.nav.signIn}</span>
            </Link>
          )}

          {/* Launch Copilot CTA */}
          <Link
            href={currentUser ? "/interview" : "/auth/login?from=/interview"}
            className="inline-flex items-center gap-1.5 h-8 px-3 sm:px-3.5 rounded-full border border-white/15 bg-white/[0.08] hover:bg-white/[0.14] hover:border-white/30 text-white text-xs font-medium backdrop-blur-md shadow-[0_0_15px_rgba(255,255,255,0.05)] transition-all cursor-pointer active:scale-95 select-none flex-shrink-0"
          >
            <Sparkles className="w-3.5 h-3.5 text-zinc-300" />
            <span className="hidden xs:inline">{t.nav.copilotStudio}</span>
            <span className="xs:hidden">Copilot</span>
            <ArrowRight className="w-3 h-3 text-zinc-400" />
          </Link>

          {/* Mobile Hamburger Button */}
          {showLinks && (
            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              className="lg:hidden h-8 w-8 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-white/20 text-zinc-300 hover:text-white transition-all cursor-pointer active:scale-95 flex items-center justify-center flex-shrink-0 select-none"
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            >
              {mobileMenuOpen ? <X className="w-3.5 h-3.5 text-white" /> : <Menu className="w-3.5 h-3.5" />}
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
                      ? 'bg-white/[0.06] border-white/[0.12] text-white font-medium'
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
                href="/profile"
                onClick={() => setMobileMenuOpen(false)}
                className="p-3 rounded-2xl bg-zinc-900/60 border border-white/[0.06] text-zinc-300 text-xs flex items-center justify-center gap-1.5"
              >
                <User className="w-3.5 h-3.5 text-zinc-300" />
                <span>{locale === 'ua' ? 'Профіль' : 'Profile'}</span>
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
                className="text-white font-medium hover:underline"
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
