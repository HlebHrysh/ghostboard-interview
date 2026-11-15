import { NextRequest } from 'next/server';
import { processVerifiedWebhookRequest } from '@/lib/billing/webhookProcessor';

export const dynamic = 'force-dynamic';

/**
 * Unified bank-grade webhook receiver for Monobank (ECDSA X-Sign),
 * Lemon Squeezy (HMAC X-Signature), Stripe (HMAC Stripe-Signature),
 * and Free Sandbox (HMAC X-Sandbox-Signature).
 */
export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const explicitProvider = req.nextUrl.searchParams.get('provider');

  return processVerifiedWebhookRequest({
    rawBody,
    headers: req.headers,
    explicitProvider,
  });
}
