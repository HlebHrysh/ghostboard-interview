'use client';

export async function getDeepgramApiKey(): Promise<string> {
  const r = await fetch('/api/ai/deepgram', {
    headers: { 'x-ghostboard-client': 'studio-session' },
  });
  const data = await r.json();
  return (data?.apiKey || '').trim().replace(/^["']|["']$/g, '');
}

export { default } from './landing/page';
