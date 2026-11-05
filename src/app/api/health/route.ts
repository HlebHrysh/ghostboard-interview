import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getCleanGeminiKey } from '@/lib/geminiApi';
import { prisma, isDbCircuitBroken } from '@/lib/serverDb';

export const dynamic = 'force-dynamic';

export async function GET() {
  const geminiConfigured = Boolean(getCleanGeminiKey());
  const deepgramConfigured = Boolean(process.env.DEEPGRAM_API_KEY);
  const uptime = process.uptime();

  let storageReady = false;
  let storageMessage = 'ready';

  // Check database or .data/ disk write access
  if (process.env.DATABASE_URL && !isDbCircuitBroken()) {
    try {
      await prisma.$queryRaw`SELECT 1`;
      storageReady = true;
    } catch (err: unknown) {
      storageMessage = (err as Error)?.message || 'Database connection error';
    }
  } else {
    try {
      const dataDir = path.join(process.cwd(), '.data');
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      const testProbe = path.join(dataDir, `.health_probe_${Date.now()}`);
      fs.writeFileSync(testProbe, 'ok', 'utf8');
      fs.unlinkSync(testProbe);
      storageReady = true;
    } catch (err: unknown) {
      storageMessage = (err as Error)?.message || 'Storage write failed';
    }
  }

  const isHealthy = geminiConfigured && deepgramConfigured && storageReady;

  return NextResponse.json(
    {
      status: isHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(uptime),
      services: {
        geminiAi: geminiConfigured ? 'ready' : 'missing_key',
        deepgramStt: deepgramConfigured ? 'ready' : 'missing_key',
        storage: storageReady ? 'ready' : storageMessage,
        audioBridge: 'ready',
        syncStore: 'ready',
      },
      version: '2.0.0',
    },
    { status: isHealthy ? 200 : 503 }
  );
}
