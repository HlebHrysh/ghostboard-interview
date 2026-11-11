import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getCleanGeminiKey } from '@/lib/geminiApi';
import { prisma, isDbCircuitBroken, tripDbCircuitBreaker } from '@/lib/serverDb';
import { isMemoryDbAllowed } from '@/lib/envGuard';

export const dynamic = 'force-dynamic';

export async function GET() {
  const geminiConfigured = Boolean(getCleanGeminiKey());
  const deepgramConfigured = Boolean(process.env.DEEPGRAM_API_KEY);
  const redisConfigured = Boolean(
    process.env.UPSTASH_REDIS_REST_URL ||
    process.env.REDIS_URL ||
    process.env.KV_REST_API_URL
  );
  const uptime = process.uptime();

  let storageReady = false;
  let storageMessage = 'ready';

  // Check database with fast 100ms timeout race to prevent blocking
  if (process.env.DATABASE_URL && !isDbCircuitBroken()) {
    try {
      const dbPromise = prisma.$queryRaw`SELECT 1`;
      const timeoutPromise = new Promise((_, reject) => {
        const timer = setTimeout(() => reject(new Error('DB probe timeout')), 100);
        if (typeof timer.unref === 'function') timer.unref();
      });
      await Promise.race([dbPromise, timeoutPromise]);
      storageReady = true;
    } catch (err: unknown) {
      tripDbCircuitBreaker();
      storageMessage = (err as Error)?.message || 'Database connection error';
    }
  }

  if (!storageReady) {
    try {
      const dataDir = path.join(process.cwd(), '.data');
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      const testProbe = path.join(dataDir, `.health_probe_${Date.now()}`);
      fs.writeFileSync(testProbe, 'ok', 'utf8');
      fs.unlinkSync(testProbe);
      storageReady = true;
      if (storageMessage === 'ready') {
        storageMessage = 'fallback_disk';
      }
    } catch (err: unknown) {
      storageMessage = (err as Error)?.message || 'Storage write failed';
    }
  }

  const isStorageOk = storageReady && (storageMessage === 'ready' || storageMessage === 'fallback_disk');
  const isHealthy = geminiConfigured && deepgramConfigured && isStorageOk;
  const isMissingKeys = !geminiConfigured || !deepgramConfigured;

  return NextResponse.json(
    {
      ok: isHealthy,
      status: isHealthy ? 'healthy' : 'degraded',
      aiConfigured: geminiConfigured,
      sttConfigured: deepgramConfigured,
      redisConfigured,
      timestamp: Date.now(),
      isoTimestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(uptime),
      services: {
        geminiAi: geminiConfigured ? 'ready' : 'missing_key',
        deepgramStt: deepgramConfigured ? 'ready' : 'missing_key',
        storage: isStorageOk ? 'ready' : `fallback_memory (${storageMessage})`,
        audioBridge: 'ready',
        syncStore: 'ready',
      },
      version: '2.0.0',
    },
    { status: isHealthy ? 200 : isMissingKeys ? 503 : (isMemoryDbAllowed() && storageReady ? 200 : 503) }
  );
}
