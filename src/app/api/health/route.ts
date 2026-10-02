import { NextResponse } from 'next/server';
import { getCleanGeminiKey } from '@/lib/geminiApi';

export async function GET() {
  const geminiConfigured = Boolean(getCleanGeminiKey());
  const deepgramConfigured = Boolean(process.env.DEEPGRAM_API_KEY);
  const uptime = process.uptime();

  const isHealthy = geminiConfigured && deepgramConfigured;

  return NextResponse.json({
    status: isHealthy ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(uptime),
    services: {
      geminiAi: geminiConfigured ? 'ready' : 'missing_key',
      deepgramStt: deepgramConfigured ? 'ready' : 'missing_key',
      audioBridge: 'ready',
      syncStore: 'ready',
    },
    version: '2.0.0',
  }, { status: isHealthy ? 200 : 200 });
}
