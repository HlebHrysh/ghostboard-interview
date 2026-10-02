'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useLocale } from '@/contexts/LocaleContext';

interface UserData {
  id: string;
  email: string;
  name?: string | null;
  plan: 'free' | 'pro' | 'lifetime';
  role?: string | null;
}

interface UserProfileHUDProps {
  userPlan?: 'free' | 'pro' | 'lifetime';
  candidateRole?: string;
  onOpenHistory?: () => void;
  onOpenProfile?: () => void;
  onUpgradeClick?: () => void;
  sessionDuration?: number;
}

export const UserProfileHUD: React.FC<UserProfileHUDProps> = ({
  userPlan = 'free',
}) => {
  const { locale } = useLocale();
  const [userData, setUserData] = useState<UserData | null>(null);

  // Load user details for initial & plan badge
  useEffect(() => {
    let isMounted = true;

    fetch('/api/sessions/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!isMounted) return;
        if (data?.authenticated && data?.user) {
          setUserData(data.user);
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, []);

  const activePlan = userData?.plan || userPlan;
  const userInitial = userData?.name
    ? userData.name.charAt(0).toUpperCase()
    : userData?.email
    ? userData.email.charAt(0).toUpperCase()
    : 'U';

  return (
    <div className="relative inline-block">
      {/* ── HUD Trigger Pill Button (Navigates directly to /profile) ── */}
      <Link
        href="/profile"
        className="px-2.5 py-1.5 rounded-full bg-zinc-900/90 border border-zinc-800 hover:border-[#C8F135]/60 text-zinc-300 hover:text-white transition-all cursor-pointer backdrop-blur-xl flex items-center gap-2 shadow-sm group active:scale-95"
        title={locale === 'ua' ? 'Профіль кандидата' : 'Candidate Profile'}
        aria-label={locale === 'ua' ? 'Профіль кандидата' : 'Candidate Profile'}
      >
        {/* User Avatar Circle */}
        <div className="w-5 h-5 rounded-full bg-zinc-800 border border-zinc-700/80 group-hover:border-[#C8F135]/60 flex items-center justify-center text-[10px] font-bold text-zinc-200 shrink-0 font-mono">
          {userInitial}
        </div>

        {/* Current Plan Badge Pill */}
        {activePlan === 'lifetime' ? (
          <span className="text-[10px] font-sans px-1.5 py-0.2 rounded-full bg-amber-400/10 text-amber-300 border border-amber-400/30 font-semibold hidden xs:inline-block">
            VIP
          </span>
        ) : activePlan === 'pro' ? (
          <span className="text-[10px] font-sans px-1.5 py-0.2 rounded-full bg-[#C8F135]/15 text-[#C8F135] border border-[#C8F135]/30 font-semibold hidden xs:inline-block">
            PRO
          </span>
        ) : (
          <span className="text-[10px] font-sans px-1.5 py-0.2 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700/60 font-medium hidden xs:inline-block">
            FREE
          </span>
        )}
      </Link>
    </div>
  );
};

export default UserProfileHUD;
