import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  DEV_FORCED_MODEL_COOKIE,
  DEV_PLAN_OVERRIDE_COOKIE,
  getDevForcedModel,
  getEffectiveEntitlements,
  requireDeveloper,
  setDevForcedModel,
  setDevPlanOverride,
  signDevCookieValue,
  VALID_FORCED_MODELS,
  type ForcedModel,
} from '@/lib/devGuard';
import {
  flushAllServerCaches,
  resetUserTrialQuestions,
} from '@/lib/serverDb';
import {
  callGeminiWithFallback,
  getCleanGroqKey,
  resetModelCircuitBreaker,
  resetModelHealth,
} from '@/lib/geminiApi';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

const devLog = logger.child({ component: 'dev-control' });

const devActionSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('override_plan'),
    plan: z.enum(['free', 'pro', 'lifetime', 'reset_to_dev_unlimited']),
  }),
  z.object({
    action: z.literal('flush_caches'),
  }),
  z.object({
    action: z.literal('reset_quotas'),
  }),
  z.object({
    action: z.literal('force_model'),
    model: z.enum(VALID_FORCED_MODELS),
  }),
  z.object({
    action: z.literal('probe_latency'),
    model: z.enum(VALID_FORCED_MODELS).optional(),
  }),
]);

interface DevTelemetryMetrics {
  lastTtftMs: number | null;
  lastProbeModel: string | null;
  lastProbeAt: number | null;
  deepgramMintsCount: number;
  lastCacheFlushAt: number | null;
}

function getTelemetryMetrics(): DevTelemetryMetrics {
  const g = globalThis as unknown as {
    __ghostboardDevTelemetry?: DevTelemetryMetrics;
  };
  return (g.__ghostboardDevTelemetry ??= {
    lastTtftMs: null,
    lastProbeModel: null,
    lastProbeAt: null,
    deepgramMintsCount: 0,
    lastCacheFlushAt: null,
  });
}

async function runLatencyProbe(model: ForcedModel) {
  const start = performance.now();

  if (model === 'groq') {
    const groqKey = getCleanGroqKey();
    if (!groqKey) {
      return {
        ok: false,
        modelUsed: 'llama-3.3-70b-versatile',
        latencyMs: Math.round((performance.now() - start) * 10) / 10,
        error: 'GROQ_API_KEY is not configured',
      };
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3500);
    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${groqKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [{ role: 'user', content: 'Reply with OK' }],
          max_tokens: 4,
          temperature: 0,
        }),
        signal: controller.signal,
      });
      const latencyMs = Math.round((performance.now() - start) * 10) / 10;
      if (!res.ok) {
        return {
          ok: false,
          modelUsed: 'llama-3.3-70b-versatile',
          latencyMs,
          error: `Groq HTTP ${res.status}`,
        };
      }
      return {
        ok: true,
        modelUsed: 'llama-3.3-70b-versatile',
        latencyMs,
      };
    } catch (err: unknown) {
      return {
        ok: false,
        modelUsed: 'llama-3.3-70b-versatile',
        latencyMs: Math.round((performance.now() - start) * 10) / 10,
        error: err instanceof Error ? err.message : 'Groq probe error',
      };
    } finally {
      clearTimeout(timer);
    }
  }

  const candidateModels =
    model === 'auto' ? undefined : [model];
  const result = await callGeminiWithFallback({
    models: candidateModels,
    prompt: 'Reply with OK',
    generationConfig: { maxOutputTokens: 4, temperature: 0 },
    timeoutMs: 3500,
    zeroThinkingBudget: true,
  });

  const latencyMs = Math.round((performance.now() - start) * 10) / 10;
  return {
    ok: result.ok,
    modelUsed: result.modelUsed ?? (model === 'auto' ? 'gemini-auto' : model),
    latencyMs,
    error: result.error,
  };
}

export async function POST(req: NextRequest) {
  const guard = await requireDeveloper(req);
  if (!guard.ok) return guard.response;

  const { user } = guard;

  try {
    const rawBody = await req.json().catch(() => null);
    const parsed = devActionSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid developer action payload', issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const payload = parsed.data;
    const isProd = process.env.NODE_ENV === 'production';

    switch (payload.action) {
      case 'override_plan': {
        const nextOverride =
          payload.plan === 'reset_to_dev_unlimited' ? null : payload.plan;
        setDevPlanOverride(user.id, nextOverride);
        const entitlements = getEffectiveEntitlements(user);

        devLog.info('Developer plan override updated', {
          userId: user.id,
          overridePlan: nextOverride,
          effectivePlan: entitlements.effectivePlan,
        });

        const res = NextResponse.json(
          {
            success: true,
            action: 'override_plan',
            overridePlan: entitlements.overridePlan,
            effectivePlan: entitlements.effectivePlan,
            entitlements: {
              aiStreamsUnlimited: entitlements.aiStreamsUnlimited,
              unlimitedDuration: entitlements.unlimitedDuration,
              ocrScreenshots: entitlements.ocrScreenshots,
              desktopSync: entitlements.desktopSync,
              panicShield: entitlements.panicShield,
              mockInterview: entitlements.mockInterview,
            },
          },
          { headers: { 'Cache-Control': 'no-store' } }
        );

        if (nextOverride) {
          res.cookies.set(
            DEV_PLAN_OVERRIDE_COOKIE,
            signDevCookieValue(user.id, 'plan', nextOverride),
            {
              httpOnly: true,
              sameSite: 'lax',
              secure: isProd,
              path: '/',
              maxAge: 60 * 60 * 12,
            }
          );
        } else {
          res.cookies.set(DEV_PLAN_OVERRIDE_COOKIE, '', {
            httpOnly: true,
            sameSite: 'lax',
            secure: isProd,
            path: '/',
            maxAge: 0,
          });
        }

        return res;
      }

      case 'flush_caches': {
        const start = performance.now();
        const { clearedSessionEntries } = flushAllServerCaches();
        resetModelHealth();
        resetModelCircuitBreaker();
        const metrics = getTelemetryMetrics();
        metrics.lastCacheFlushAt = Date.now();
        const durationMs = Math.round((performance.now() - start) * 100) / 100;

        devLog.info('Developer flushed L1 caches and AI cooldowns', {
          userId: user.id,
          clearedSessionEntries,
          durationMs,
        });

        return NextResponse.json(
          {
            success: true,
            action: 'flush_caches',
            clearedSessionEntries,
            circuitBreakersReset: true,
            durationMs,
          },
          { headers: { 'Cache-Control': 'no-store' } }
        );
      }

      case 'reset_quotas': {
        await resetUserTrialQuestions(user.id);
        devLog.info('Developer quotas reset to 0', { userId: user.id });

        return NextResponse.json(
          {
            success: true,
            action: 'reset_quotas',
            trialQuestionsUsed: 0,
          },
          { headers: { 'Cache-Control': 'no-store' } }
        );
      }

      case 'force_model': {
        setDevForcedModel(user.id, payload.model);
        devLog.info('Developer forced AI model updated', {
          userId: user.id,
          forcedModel: payload.model,
        });

        const res = NextResponse.json(
          {
            success: true,
            action: 'force_model',
            forcedModel: payload.model,
          },
          { headers: { 'Cache-Control': 'no-store' } }
        );

        if (payload.model === 'auto') {
          res.cookies.set(DEV_FORCED_MODEL_COOKIE, '', {
            httpOnly: true,
            sameSite: 'lax',
            secure: isProd,
            path: '/',
            maxAge: 0,
          });
        } else {
          res.cookies.set(
            DEV_FORCED_MODEL_COOKIE,
            signDevCookieValue(user.id, 'model', payload.model),
            {
              httpOnly: true,
              sameSite: 'lax',
              secure: isProd,
              path: '/',
              maxAge: 60 * 60 * 12,
            }
          );
        }

        return res;
      }

      case 'probe_latency': {
        const targetModel = payload.model ?? getDevForcedModel(user.id);
        const probe = await runLatencyProbe(targetModel);
        const metrics = getTelemetryMetrics();
        if (probe.ok) {
          metrics.lastTtftMs = probe.latencyMs;
          metrics.lastProbeModel = probe.modelUsed;
          metrics.lastProbeAt = Date.now();
        }
        return NextResponse.json(
          {
            success: probe.ok,
            action: 'probe_latency',
            ...probe,
          },
          { headers: { 'Cache-Control': 'no-store' } }
        );
      }
    }
  } catch (err: unknown) {
    devLog.error('Developer action error', {
      userId: user.id,
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      { error: 'Developer action failed' },
      { status: 500 }
    );
  }
}
