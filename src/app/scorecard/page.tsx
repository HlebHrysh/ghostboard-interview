'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ScorecardIndexFallbackPage() {
  const router = useRouter();

  useEffect(() => {
    try {
      const lastSessionId = localStorage.getItem('ghostboard_last_history_id');
      if (lastSessionId) {
        router.replace(`/scorecard/${encodeURIComponent(lastSessionId)}`);
        return;
      }
    } catch {}

    // Immediate zero-delay redirect to Mock Interview Arena
    router.replace('/mock-interview');
  }, [router]);

  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-2 border-white/10 border-t-white animate-spin" />
    </div>
  );
}
