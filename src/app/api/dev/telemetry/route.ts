import { NextRequest, NextResponse } from 'next/server';
import { getEffectiveEntitlements, getDevForcedModel, requireDeveloper } from '@/lib/devGuard';
import {
  getSessionCacheStats,
  isDbCircuitBroken,
  rawPrisma,
} from '@/lib/serverDb';
import {
  CIRCUIT_BREAKER_TTL_MS,
  FLASH_MODELS,
  getCleanGeminiKey,
  getCleanGroqKey,
  getPreferredFastModel,
  isModelCircuitBroken,
  modelsRejectingThinking,
} from '@/lib/geminiApi';
import { getDesktopFleetStats, listDesktopNodes } from '@/lib/desktopFleetStore';
import { isRedisSyncConfigured, syncStore } from '@/lib/interviewSyncStore';
import type { DesktopHandshakeRecord } from '@/lib/desktopHandshakeStore';

export const dynamic = 'force-dynamic';

const DB_PROBE_TIMEOUT_MS = 500;
const REDIS_PROBE_TIMEOUT_MS = 500;

interface DevTelemetryMetrics {
  lastTtftMs: number | null;
  lastProbeModel: string | null;
  lastProbeAt: number | null;
  deepgramMintsCount: number;
  lastCacheFlushAt: number | null;
}

const devTelemetryStore: DevTelemetryMetrics = ((
  globalThis as unknown as {
    __ghostboardDevTelemetry?: DevTelemetryMetrics;
  }
).__ghostboardDevTelemetry ??= {
  lastTtftMs: null,
  lastProbeModel: null,
  lastProbeAt: null,
  deepgramMintsCount: 0,
  lastCacheFlushAt: null,
});

async function probeDatabase() {
  const configured = Boolean(process.env.DATABASE_URL);
  const circuitBroken = isDbCircuitBroken();

  if (!configured) {
    return {
      configured: false,
      mode: 'in_memory' as const,
      status: 'memory_fallback' as const,
      latencyMs: 0,
      circuitBroken,
    };
  }

  if (circuitBroken) {
    return {
      configured: true,
      mode: 'postgresql' as const,
      status: 'circuit_open' as const,
      latencyMs: null,
      circuitBroken: true,
    };
  }

  const start = performance.now();
  let timer: NodeJS.Timeout | null = null;
  try {
    await Promise.race([
      rawPrisma.$queryRaw`SELECT 1`,
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error('DB_PROBE_TIMEOUT')), DB_PROBE_TIMEOUT_MS);
      }),
    ]);
    return {
      configured: true,
      mode: 'postgresql' as const,
      status: 'healthy' as const,
      latencyMs: Math.round((performance.now() - start) * 10) / 10,
      circuitBroken: false,
    };
  } catch (err: unknown) {
    return {
      configured: true,
      mode: 'postgresql' as const,
      status: 'degraded' as const,
      latencyMs: Math.round((performance.now() - start) * 10) / 10,
      circuitBroken: isDbCircuitBroken(),
      error: err instanceof Error ? err.message : 'Probe failed',
    };
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function probeRedis() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  const syncConfigured = isRedisSyncConfigured();

  if (!url || !token || process.env.VITEST) {
    return {
      configured: Boolean(url && token),
      syncEnabled: syncConfigured,
      status: url && token ? 'test_bypassed' : 'local_fallback',
      latencyMs: null as number | null,
    };
  }

  const start = performance.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REDIS_PROBE_TIMEOUT_MS);
  try {
    const res = await fetch(`${url.replace(/\/$/, '')}/ping`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal,
    });
    return {
      configured: true,
      syncEnabled: syncConfigured,
      status: res.ok ? 'healthy' : `http_${res.status}`,
      latencyMs: Math.round((performance.now() - start) * 10) / 10,
    };
  } catch (err: unknown) {
    return {
      configured: true,
      syncEnabled: syncConfigured,
      status: 'unreachable',
      latencyMs: Math.round((performance.now() - start) * 10) / 10,
      error: err instanceof Error ? err.message : 'Redis ping failed',
    };
  } finally {
    clearTimeout(timer);
  }
}

export async function GET(req: NextRequest) {
  const startedAt = performance.now();
  const guard = await requireDeveloper(req);
  if (!guard.ok) return guard.response;

  const { user } = guard;
  const entitlements = getEffectiveEntitlements(user);
  const forcedModel = getDevForcedModel(user.id);

  const geminiKey = getCleanGeminiKey();
  const groqKey = getCleanGroqKey();
  const deepgramKey = process.env.DEEPGRAM_API_KEY?.trim() || null;
  const preferredFastModel = getPreferredFastModel();

  const geminiModels = FLASH_MODELS.map((model) => {
    const circuitBroken = isModelCircuitBroken(model);
    const isPrimaryFast = model === preferredFastModel;
    const isForced = forcedModel === model;
    return {
      model,
      circuitBroken,
      status: circuitBroken
        ? 'cooldown'
        : isPrimaryFast
        ? 'primary_fast'
        : 'healthy',
      healthScore: circuitBroken ? 0 : isPrimaryFast ? 100 : 88,
      cooldownTtlMs: circuitBroken ? CIRCUIT_BREAKER_TTL_MS : 0,
      rejectsThinking: modelsRejectingThinking.has(model),
      isForced,
    };
  });

  const probeCompanionSync = async () => {
    let timer: NodeJS.Timeout | null = null;
    try {
      return await Promise.race([
        syncStore.getState(user.id),
        new Promise<null>((resolve) => {
          timer = setTimeout(() => resolve(null), REDIS_PROBE_TIMEOUT_MS);
        }),
      ]);
    } catch {
      return null;
    } finally {
      if (timer) clearTimeout(timer);
    }
  };

  const [database, redis, companionState] = await Promise.all([
    probeDatabase(),
    probeRedis(),
    probeCompanionSync(),
  ]);

  const cacheStats = getSessionCacheStats();
  const fleetStats = getDesktopFleetStats();
  const fleetNodes = listDesktopNodes().slice(0, 12).map((n) => ({
    nodeId: n.nodeId,
    userId: n.userId,
    userEmail: n.userEmail,
    platform: n.platform,
    appVersion: n.appVersion,
    state: n.state,
    isCapturing: n.isCapturing,
    sttStatus: n.sttStatus,
    micStatus: n.micStatus,
    audioLatencyMs: n.audioLatencyMs,
    lastSeen: n.lastSeen,
  }));

  const handshakeMap = (
    globalThis as unknown as {
      __desktopHandshakes?: Map<string, DesktopHandshakeRecord>;
    }
  ).__desktopHandshakes;

  const now = Date.now();
  const handshakes = handshakeMap
    ? Array.from(handshakeMap.values())
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, 10)
        .map((h) => ({
          id: h.id,
          status: h.expiresAt < now && h.status === 'pending' ? 'expired' : h.status,
          userEmail: h.user?.email ?? null,
          userRole: h.user?.role ?? null,
          createdAt: h.createdAt,
          expiresAt: h.expiresAt,
        }))
    : [];

  return NextResponse.json(
    {
      timestamp: new Date().toISOString(),
      meta: {
        telemetryLatencyMs: Math.round((performance.now() - startedAt) * 10) / 10,
      },
      developer: {
        id: user.id,
        email: user.email,
        name: user.name ?? null,
        role: user.role ?? 'user',
        dbPlan: user.plan,
        effectivePlan: entitlements.effectivePlan,
        overridePlan: entitlements.overridePlan,
        isOverrideActive: entitlements.isOverrideActive,
        forcedModel,
        trialQuestionsUsed: user.trialQuestionsUsed ?? 0,
        entitlements: {
          aiStreamsUnlimited: entitlements.aiStreamsUnlimited,
          unlimitedDuration: entitlements.unlimitedDuration,
          ocrScreenshots: entitlements.ocrScreenshots,
          desktopSync: entitlements.desktopSync,
          panicShield: entitlements.panicShield,
          mockInterview: entitlements.mockInterview,
        },
      },
      ai: {
        forcedModel,
        preferredFastModel,
        lastTtftMs: devTelemetryStore.lastTtftMs,
        lastProbeModel: devTelemetryStore.lastProbeModel,
        lastProbeAt: devTelemetryStore.lastProbeAt,
        gemini: {
          configured: Boolean(geminiKey),
          healthyCount: geminiModels.filter((m) => !m.circuitBroken).length,
          totalModels: geminiModels.length,
          models: geminiModels,
        },
        groq: {
          configured: Boolean(groqKey),
          model: 'llama-3.3-70b-versatile',
          status: !groqKey ? 'unconfigured' : forcedModel === 'groq' ? 'forced_primary' : 'ready_fallback',
        },
        deepgram: {
          configured: Boolean(deepgramKey),
          mode: deepgramKey ? 'ephemeral_project_keys' : 'unconfigured',
          tokenTtlSeconds: 60,
          mintedThisRuntime: devTelemetryStore.deepgramMintsCount,
        },
      },
      database,
      redis,
      cache: {
        ...cacheStats,
        lastFlushAt: devTelemetryStore.lastCacheFlushAt,
      },
      desktopFleet: {
        stats: fleetStats,
        nodes: fleetNodes,
        handshakes,
      },
      companionSync: companionState
        ? {
            qasCount: companionState.qas.length,
            activeId: companionState.activeId ?? null,
            outputLanguage: companionState.outputLanguage,
            speechLanguage: companionState.speechLanguage,
            isCapturing: companionState.isCapturing,
            sttStatus: companionState.sttStatus ?? 'idle',
            isFrozen: Boolean(companionState.isFrozen),
            isPanic: Boolean(companionState.isPanic),
            connectedDevices: companionState.connectedDevices ?? {},
            sessionDuration: companionState.sessionDuration,
            lastUpdated: companionState.lastUpdated,
            liveTranscriptPreview: companionState.liveTranscript.slice(0, 180),
            recentQas: companionState.qas.slice(0, 5).map((q) => ({
              id: q.id,
              question: q.question,
              startHook: q.startHook,
              meta: q.meta ?? null,
              status: q.status ?? 'complete',
              timestamp: q.timestamp ?? q.createdAt ?? 0,
            })),
          }
        : null,
    },
    {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    }
  );
}
