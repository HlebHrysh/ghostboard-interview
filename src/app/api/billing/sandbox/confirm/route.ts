import crypto from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { checkRateLimit, validateOrigin } from '@/lib/rateLimit';
import { createSession, getSessionUser } from '@/lib/serverDb';
import {
  buildSignedSandboxWebhook,
  getSandboxCheckoutSession,
  isSandboxAllowed,
  signSandboxPayload,
  simulateSandboxGatewayLatency,
} from '@/lib/billing/sandbox';
import { processVerifiedWebhookRequest } from '@/lib/billing/webhookProcessor';

export const dynamic = 'force-dynamic';

const sandboxConfirmSchema = z.object({
  invoiceId: z.string().min(6).max(128),
  challengeToken: z.string().min(16).max(256),
  outcome: z.enum(['paid', 'failed']).default('paid'),
});

export async function POST(req: NextRequest) {
  if (!validateOrigin(req)) {
    return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
  }

  if (!isSandboxAllowed()) {
    return NextResponse.json(
      { error: 'Sandbox gateway is disabled in production' },
      { status: 403 },
    );
  }

  const rl = await checkRateLimit(req, 15, 60_000, 'billing_sandbox_confirm');
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded for sandbox confirmation' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } },
    );
  }

  const json = await req.json().catch(() => null);
  const parsed = sandboxConfirmSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Missing or invalid sandbox confirmation payload' },
      { status: 400 },
    );
  }

  const record = await getSandboxCheckoutSession(parsed.data.invoiceId);
  if (!record) {
    return NextResponse.json(
      { error: 'Sandbox checkout session expired or not found' },
      { status: 404 },
    );
  }

  // Constant-time verification of challengeToken tied to the session
  const expectedToken = signSandboxPayload(
    JSON.stringify({
      invoiceId: record.invoiceId,
      userId: record.userId,
      amountMinor: record.amountMinor,
    }),
  );
  const a = Buffer.from(parsed.data.challengeToken.trim().toLowerCase(), 'utf8');
  const b = Buffer.from(expectedToken.toLowerCase(), 'utf8');
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return NextResponse.json(
      { error: 'Invalid sandbox 3DS challenge token' },
      { status: 401 },
    );
  }

  // Simulate realistic 3DS authorization latency in UI sessions
  await simulateSandboxGatewayLatency(160);

  const { rawBody, signature } = buildSignedSandboxWebhook(
    record,
    parsed.data.outcome,
  );

  const webhookResponse = await processVerifiedWebhookRequest({
    rawBody,
    headers: new Headers({
      'x-sandbox-signature': signature,
      'content-type': 'application/json',
    }),
    forceProvider: 'sandbox',
  });

  if (!webhookResponse.ok) {
    return webhookResponse;
  }

  const body = (await webhookResponse.json()) as {
    received: boolean;
    plan?: string;
    userId?: string;
    planExpiresAt?: string | null;
    paymentId?: string;
  };

  // Preserve authenticated user's existing cookie if already logged in;
  // provision a fresh session cookie only for unauthenticated guest checkouts.
  const existingToken = req.cookies.get('ghostboard_session')?.value;
  const existingSessionUser = existingToken
    ? await getSessionUser(existingToken)
    : null;

  const response = NextResponse.json({
    ok: true,
    ...body,
    redirectUrl: record.redirectUrl,
  });

  if (!existingSessionUser && body.userId) {
    try {
      const sess = await createSession(body.userId, 'web');
      response.cookies.set('ghostboard_session', sess.token, {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        maxAge: 30 * 24 * 60 * 60,
        secure: process.env.NODE_ENV === 'production',
      });
    } catch {
      // Non-fatal
    }
  }

  return response;
}
