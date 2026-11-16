export const SPRING_TRANSITION = {
  type: 'spring' as const,
  stiffness: 350,
  damping: 28,
  mass: 0.6,
};

export type SpoofPlan = 'reset_to_dev_unlimited' | 'free' | 'pro' | 'lifetime';
export type ForcedModel = 'auto' | 'gemini-3.8-flash' | 'gemini-3.6-flash' | 'groq';

export interface DevTelemetryPayload {
  timestamp: string;
  meta?: {
    telemetryLatencyMs: number;
  };
  developer: {
    id: string;
    email: string;
    name: string | null;
    role: string;
    dbPlan: string;
    effectivePlan: string;
    overridePlan: string | null;
    isOverrideActive: boolean;
    forcedModel: ForcedModel;
    trialQuestionsUsed: number;
    entitlements: {
      aiStreamsUnlimited: boolean;
      unlimitedDuration: boolean;
      ocrScreenshots: boolean;
      desktopSync: boolean;
      panicShield: boolean;
      mockInterview: boolean;
    };
  };
  ai: {
    forcedModel: ForcedModel;
    preferredFastModel: string | null;
    lastTtftMs: number | null;
    lastProbeModel: string | null;
    lastProbeAt: number | null;
    gemini: {
      configured: boolean;
      healthyCount: number;
      totalModels: number;
      models: Array<{
        model: string;
        circuitBroken: boolean;
        status: string;
        healthScore: number;
        cooldownTtlMs: number;
        rejectsThinking: boolean;
        isForced: boolean;
      }>;
    };
    groq: {
      configured: boolean;
      model: string;
      status: string;
    };
    deepgram: {
      configured: boolean;
      mode: string;
      tokenTtlSeconds: number;
      mintedThisRuntime: number;
    };
  };
  database: {
    configured: boolean;
    mode: string;
    status: string;
    latencyMs: number | null;
    circuitBroken: boolean;
  };
  redis: {
    configured: boolean;
    syncEnabled: boolean;
    status: string;
    latencyMs: number | null;
  };
  cache: {
    entries: number;
    hits: number;
    misses: number;
    hitRate: number;
    ttlMs: number;
    lastFlushAt: number | null;
  };
  desktopFleet: {
    stats: {
      totalNodes: number;
      onlineNodes: number;
      inSessionNodes: number;
      osBreakdown: { macos: number; windows: number; linux: number };
      avgLatencyMs: number;
      activeVersions: Record<string, number>;
    };
    nodes: Array<{
      nodeId: string;
      userId: string;
      userEmail: string;
      platform: string;
      appVersion: string;
      state: string;
      isCapturing: boolean;
      sttStatus: string;
      micStatus: string;
      audioLatencyMs: number;
      lastSeen: number;
    }>;
    handshakes: Array<{
      id: string;
      status: 'pending' | 'ready' | 'expired';
      userEmail: string | null;
      userRole: string | null;
      createdAt: number;
      expiresAt: number;
    }>;
  };
  companionSync: {
    qasCount: number;
    activeId: string | null;
    outputLanguage: string;
    speechLanguage: string;
    isCapturing: boolean;
    sttStatus: string;
    isFrozen: boolean;
    isPanic: boolean;
    connectedDevices: Record<string, boolean>;
    sessionDuration: number;
    lastUpdated: number;
    liveTranscriptPreview: string;
    recentQas: Array<{
      id: string;
      question: string;
      startHook: string;
      status: string;
      timestamp: number;
    }>;
  } | null;
}

export const SPOOF_PLAN_OPTIONS: Array<{ key: SpoofPlan; label: string }> = [
  { key: 'reset_to_dev_unlimited', label: 'Dev Unlimited' },
  { key: 'free', label: 'Test FREE Paywall' },
  { key: 'pro', label: 'Test PRO' },
  { key: 'lifetime', label: 'Test LIFETIME' },
];

export const FORCED_MODEL_OPTIONS: readonly ForcedModel[] = [
  'auto',
  'gemini-3.8-flash',
  'gemini-3.6-flash',
  'groq',
];

export const DEV_SCENARIO_PRESETS = [
  {
    id: 'system_design',
    label: 'Senior System Design',
    tag: 'ARCHITECTURE',
    text: 'Design a multi-region distributed rate limiter and webhook delivery pipeline handling 2 million requests per second with strict idempotency guarantees.',
    mode: 'concise' as const,
  },
  {
    id: 'leetcode_coding',
    label: 'LeetCode Coding Task',
    tag: 'ALGORITHM',
    text: 'Given an array of intervals [start, end], merge all overlapping intervals in O(n log n) time in TypeScript and walk through edge cases.',
    mode: 'concise' as const,
  },
  {
    id: 'bilingual_ua_en',
    label: 'Bilingual UA / EN Question',
    tag: 'UA + EN',
    text: 'Як працює Event Loop в Node.js та чим відрізняються microtasks від macrotasks у libuv thread pool?',
    mode: 'concise' as const,
  },
  {
    id: 'noise_filter',
    label: 'Webinar Noise (<<<IGNORE>>>)',
    tag: 'NOISE CHECK',
    text: 'Hey guys can everyone mute your microphones for two minutes while Sarah connects to HDMI and grabs some water?',
    mode: 'concise' as const,
  },
];

function extractPhaseSection(
  raw: string,
  startPattern: RegExp,
  stopPattern: RegExp
): string {
  const startMatch = raw.match(startPattern);
  if (!startMatch || startMatch.index === undefined) return '';
  const afterStart = raw.slice(startMatch.index + startMatch[0].length);
  const nextMatch = afterStart.match(stopPattern);
  return (
    nextMatch && nextMatch.index !== undefined
      ? afterStart.slice(0, nextMatch.index)
      : afterStart
  ).trim();
}

export function parseDualStreamPhases(raw: string) {
  return {
    meta: extractPhaseSection(
      raw,
      /<<<META(?::[^>]*)?>>>/,
      /<<<(?:META|PHASE_[123](?:_[A-Z0-9_]+)?|IGNORE)>>>/
    ),
    phase1: extractPhaseSection(
      raw,
      /<<<PHASE_1(?:_[A-Z0-9_]+)?>>>/,
      /<<<(?:PHASE_[23](?:_[A-Z0-9_]+)?|IGNORE)>>>/
    ),
    phase2: extractPhaseSection(
      raw,
      /<<<PHASE_2(?:_[A-Z0-9_]+)?>>>/,
      /<<<(?:PHASE_3(?:_[A-Z0-9_]+)?|IGNORE)>>>/
    ),
    phase3: extractPhaseSection(
      raw,
      /<<<PHASE_3(?:_[A-Z0-9_]+)?>>>/,
      /<<<IGNORE>>>/
    ),
    ignored: raw.includes('<<<IGNORE>>>'),
  };
}

export function dispatchCopilotInjectEvent(detail: {
  id: string;
  tag?: string;
  text: string;
  mode: 'concise' | 'deep';
}) {
  const timestamp = Date.now();
  window.dispatchEvent(
    new CustomEvent('ghostboard:dev-inject', {
      detail: { ...detail, timestamp },
    })
  );
  window.dispatchEvent(
    new CustomEvent('ghostboard:qa_inject_transcript', {
      detail: {
        text: detail.text,
        scenario: detail.id,
        mode: detail.mode,
        timestamp,
      },
    })
  );
}

export async function executeDevAction(
  payload: Record<string, unknown>,
  signal?: AbortSignal
): Promise<{ ok: boolean; data: Record<string, unknown> }> {
  const res = await fetch('/api/dev/action', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal,
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  return { ok: res.ok, data };
}
