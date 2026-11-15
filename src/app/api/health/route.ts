import { NextResponse } from 'next/server';
import { getCleanGeminiKey } from '@/lib/geminiApi';
import { isDbCircuitBroken } from '@/lib/serverDb';
import { isMemoryDbAllowed } from '@/lib/envGuard';

export const dynamic = 'force-dynamic';

export async function GET() {
  const aiConfigured = Boolean(getCleanGeminiKey());
  const sttConfigured = Boolean(process.env.DEEPGRAM_API_KEY?.trim());
  const redisConfigured = Boolean(
    process.env.UPSTASH_REDIS_REST_URL ||
      process.env.REDIS_URL ||
      process.env.KV_REST_API_URL
  );
  const timestamp = Date.now();
  const dbConfigured = Boolean(process.env.DATABASE_URL) && !isDbCircuitBroken();
  const storageReady = dbConfigured || isMemoryDbAllowed();
  const isHealthy = aiConfigured && sttConfigured && storageReady;

  return NextResponse.json(
    {
      ok: isHealthy,
      status: isHealthy ? 'healthy' : 'degraded',
      aiConfigured,
      sttConfigured,
      redisConfigured,
      timestamp,
      isoTimestamp: new Date(timestamp).toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      services: {
        geminiAi: aiConfigured ? 'ready' : 'missing_key',
        deepgramStt: sttConfigured ? 'ready' : 'missing_key',
        storage: storageReady ? 'ready' : 'unavailable',
        audioBridge: 'ready',
        syncStore: redisConfigured ? 'redis' : isMemoryDbAllowed() ? 'memory' : 'unavailable',
      },
      version: '2.0.0',
    },
    { status: isHealthy ? 200 : 503 }
  );
}
