import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminGuard';
import { getCleanGeminiKey, callGeminiWithFallback, FLASH_MODELS } from '@/lib/geminiApi';
import { interviewSyncStore } from '@/lib/interviewSyncStore';

export const dynamic = 'force-dynamic';

function maskKey(key?: string | null): string {
  if (!key || key.length < 8) return 'NOT_CONFIGURED';
  return `${key.slice(0, 6)}••••••••${key.slice(-4)}`;
}

export async function GET(req: NextRequest) {
  const authError = await requireAdmin(req);
  if (authError) return authError;

  const geminiKey = getCleanGeminiKey();
  const deepgramKey = process.env.DEEPGRAM_API_KEY?.trim();
  const stripeKey = process.env.STRIPE_SECRET_KEY?.trim();
  const stripeWh = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  const adminPass = process.env.ADMIN_PASSWORD;
  const cronSecret = process.env.CRON_SECRET;
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;

  const memUsage = process.memoryUsage();

  return NextResponse.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    runtime: {
      nodeVersion: process.version,
      platform: process.platform,
      env: process.env.NODE_ENV || 'development',
      heapUsedMb: Math.round(memUsage.heapUsed / 1024 / 1024),
      heapTotalMb: Math.round(memUsage.heapTotal / 1024 / 1024),
      rssMb: Math.round(memUsage.rss / 1024 / 1024),
    },
    services: {
      gemini: {
        configured: Boolean(geminiKey),
        maskedKey: maskKey(geminiKey),
        models: FLASH_MODELS,
      },
      deepgram: {
        configured: Boolean(deepgramKey),
        maskedKey: maskKey(deepgramKey),
      },
      stripe: {
        configured: Boolean(stripeKey && stripeKey.startsWith('sk_')),
        mode: stripeKey?.startsWith('sk_live_') ? 'live' : stripeKey?.startsWith('sk_test_') ? 'test' : 'simulator',
        maskedKey: maskKey(stripeKey),
        webhookConfigured: Boolean(stripeWh),
      },
      database: {
        type: process.env.DATABASE_URL ? 'PostgreSQL / Prisma' : 'In-Memory (Safe Local Storage)',
        configured: Boolean(process.env.DATABASE_URL),
      },
      rateLimiter: {
        type: redisUrl ? 'Upstash Redis (Distributed Cloud)' : 'In-Memory Sliding Window (Local)',
        configured: Boolean(redisUrl),
      },
      security: {
        adminPasswordConfigured: Boolean(adminPass),
        cronSecretConfigured: Boolean(cronSecret),
        corsStrict: true,
        cspActive: true,
        hstsActive: process.env.NODE_ENV === 'production',
      },
    },
  });
}

export async function POST(req: NextRequest) {
  const authError = await requireAdmin(req);
  if (authError) return authError;

  try {
    const body = await req.json().catch(() => ({}));
    const { action } = body;

    // 1. Live Gemini AI Diagnostic Test
    if (action === 'test_gemini') {
      const startTime = Date.now();
      const geminiKey = getCleanGeminiKey();
      if (!geminiKey) {
        return NextResponse.json({ success: false, error: 'GEMINI_API_KEY is not configured' }, { status: 400 });
      }

      const result = await callGeminiWithFallback({
        models: FLASH_MODELS,
        contents: [{ parts: [{ text: 'Respond with exactly one word: PONG' }] }],
        generationConfig: { maxOutputTokens: 10, temperature: 0.1 },
      });

      const latencyMs = Date.now() - startTime;
      if (result.ok) {
        return NextResponse.json({
          success: true,
          latencyMs,
          model: result.modelUsed,
          response: result.text?.trim(),
          message: `Gemini API responded in ${latencyMs}ms (${result.modelUsed})`,
        });
      }
      return NextResponse.json({ success: false, latencyMs, error: result.error }, { status: 502 });
    }

    // 2. Live Deepgram STT Token Diagnostic Test
    if (action === 'test_deepgram') {
      const startTime = Date.now();
      const deepgramKey = process.env.DEEPGRAM_API_KEY?.trim().replace(/^["']|["']$/g, '');
      if (!deepgramKey) {
        return NextResponse.json({ success: false, error: 'DEEPGRAM_API_KEY is not configured' }, { status: 400 });
      }

      const res = await fetch('https://api.deepgram.com/v1/projects', {
        headers: { Authorization: `Token ${deepgramKey}` },
      });
      const latencyMs = Date.now() - startTime;

      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        const projectCount = data?.projects?.length || 0;
        return NextResponse.json({
          success: true,
          latencyMs,
          message: `Deepgram API verified in ${latencyMs}ms (${projectCount} active project/s)`,
        });
      }
      const errText = await res.text();
      return NextResponse.json({ success: false, latencyMs, error: errText || `HTTP ${res.status}` }, { status: 502 });
    }

    // 3. Clear Live Sync Store
    if (action === 'clear_sync_store') {
      interviewSyncStore.clear();
      return NextResponse.json({ success: true, message: 'Live Interview Sync Store cleared successfully' });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Action failed' }, { status: 500 });
  }
}
