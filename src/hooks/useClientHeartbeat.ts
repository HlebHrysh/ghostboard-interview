"use client";

import { useEffect, useRef, useCallback } from 'react';

interface UseClientHeartbeatOptions {
  intervalMs?: number;
  enabled?: boolean;
  clientType?: 'web' | 'desktop';
}

export function useClientHeartbeat({
  intervalMs = 30000, // 30 seconds default
  enabled = true,
  clientType = 'web',
}: UseClientHeartbeatOptions = {}) {
  const lastPingRef = useRef<number>(0);

  const sendHeartbeat = useCallback(async () => {
    // Only send if document is visible and not throttled
    if (typeof document !== 'undefined' && document.hidden) return;

    const now = Date.now();
    if (now - lastPingRef.current < 10000) return; // Prevent spamming < 10s
    lastPingRef.current = now;

    try {
      await fetch('/api/client/heartbeat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientType }),
        keepalive: true,
      });
    } catch {
      // Silently ignore network fluctuations
    }
  }, [clientType]);

  useEffect(() => {
    if (!enabled) return;

    // Initial ping on mount
    sendHeartbeat();

    const interval = setInterval(sendHeartbeat, intervalMs);

    // Also ping when tab regains focus
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        sendHeartbeat();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled, intervalMs, sendHeartbeat]);

  return { pingNow: sendHeartbeat };
}
