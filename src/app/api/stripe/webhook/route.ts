import { NextRequest } from 'next/server';
import { processVerifiedWebhookRequest } from '@/lib/billing/webhookProcessor';

export const dynamic = 'force-dynamic';

/**
 * Legacy Stripe webhook entrypoint — routes through the verified multi-provider
 * webhook processor with strict HMAC-SHA256 timingSafeEqual verification,
 * idempotency locks, DB fail-fast 503, and <1ms L1 cache invalidation.
 */
export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  return processVerifiedWebhookRequest({
    rawBody,
    headers: req.headers,
    forceProvider: 'stripe',
  });
}
