import crypto from 'node:crypto';
import {
  BILLING_PLANS,
  getIso4217CurrencyCode,
  type BillingCurrency,
  type BillingPlanDefinition,
} from './plans';
import { getCachedMonobankPubKey, setCachedMonobankPubKey } from './cache';

const MONOBANK_API_BASE = 'https://api.monobank.ua/api/merchant';

export interface MonobankCheckoutInput {
  userId: string;
  email: string;
  plan: BillingPlanDefinition;
  currency: BillingCurrency;
  redirectUrl: string;
  webhookUrl: string;
  reference: string;
}

export interface MonobankInvoiceResponse {
  invoiceId: string;
  pageUrl: string;
  reference: string;
  amountMinor: number;
  currency: BillingCurrency;
  tokenizationRequested: boolean;
}

export interface MonobankWebhookPayload {
  invoiceId: string;
  status:
    | 'created'
    | 'processing'
    | 'hold'
    | 'success'
    | 'failure'
    | 'reversed'
    | 'expired'
    | string;
  failureReason?: string;
  errCode?: string;
  amount: number;
  ccy?: number;
  finalAmount?: number;
  createdDate?: string;
  modifiedDate?: string;
  reference?: string;
  destination?: string;
  walletData?: {
    cardToken?: string;
    walletId?: string;
    status?: string;
  };
  paymentInfo?: {
    maskedPan?: string;
    paymentSystem?: string;
    paymentMethod?: string;
    fee?: number;
    country?: string;
  };
  cancelList?: Array<{
    status?: string;
    amount?: number;
    ccy?: number;
    createdDate?: string;
  }>;
}

function getMonobankToken(): string | null {
  return process.env.MONOBANK_TOKEN?.trim() || null;
}

export function isMonobankConfigured(): boolean {
  return Boolean(getMonobankToken());
}

export async function createMonobankInvoice(
  input: MonobankCheckoutInput,
): Promise<MonobankInvoiceResponse> {
  const token = getMonobankToken();
  if (!token) {
    throw new Error('MONOBANK_TOKEN is not configured');
  }

  const amountMinor =
    input.plan.amountsMinor[input.currency] ??
    BILLING_PLANS[input.plan.id].amountsMinor.UAH;
  const ccy = getIso4217CurrencyCode(input.currency);
  const tokenizationRequested = input.plan.targetPlan === 'pro';
  const walletId = tokenizationRequested
    ? `gb_${crypto.createHash('sha256').update(input.userId).digest('hex').slice(0, 24)}`
    : undefined;

  const payload: Record<string, unknown> = {
    amount: amountMinor,
    ccy,
    merchantPaymInfo: {
      reference: input.reference,
      destination: input.plan.nameUa || input.plan.name,
      comment: `Ghostboard ${input.plan.targetPlan.toUpperCase()} (${input.plan.interval}) for ${input.email}`,
      customerEmails: [input.email],
      basketOrder: [
        {
          name: input.plan.name,
          qty: 1,
          sum: amountMinor,
          total: amountMinor,
          unit: 'шт.',
          code: input.plan.id,
        },
      ],
    },
    redirectUrl: input.redirectUrl,
    webHookUrl: input.webhookUrl,
    validity: 3600,
    paymentType: 'debit',
  };

  if (tokenizationRequested && walletId) {
    payload.saveCardData = {
      saveCard: true,
      walletId,
    };
  }

  const res = await fetch(`${MONOBANK_API_BASE}/invoice/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Token': token,
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(10_000),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(
      `Monobank invoice creation failed (${res.status}): ${errText.slice(0, 300)}`,
    );
  }

  const data = (await res.json()) as { invoiceId?: string; pageUrl?: string };
  if (!data.invoiceId || !data.pageUrl) {
    throw new Error('Monobank response missing invoiceId or pageUrl');
  }

  return {
    invoiceId: data.invoiceId,
    pageUrl: data.pageUrl,
    reference: input.reference,
    amountMinor,
    currency: input.currency,
    tokenizationRequested,
  };
}

let pubKeyInFlightPromise: Promise<string> | null = null;
const parsedKeyCache = new Map<string, crypto.KeyObject>();

export async function fetchMonobankPublicKey(
  forceRefresh = false,
): Promise<string> {
  const envKey = process.env.MONOBANK_PUBLIC_KEY?.trim();
  if (envKey && !forceRefresh) {
    return envKey;
  }

  if (!forceRefresh) {
    const cached = await getCachedMonobankPubKey();
    if (cached) return cached;
  }

  const token = getMonobankToken();
  if (!token) {
    if (envKey) return envKey;
    throw new Error(
      'Cannot fetch Monobank public key: MONOBANK_TOKEN and MONOBANK_PUBLIC_KEY are both missing',
    );
  }

  if (pubKeyInFlightPromise && !forceRefresh) {
    return pubKeyInFlightPromise;
  }

  const requestPromise = (async () => {
    const res = await fetch(`${MONOBANK_API_BASE}/pubkey`, {
      method: 'GET',
      headers: { 'X-Token': token },
      signal: AbortSignal.timeout(8_000),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(
        `Monobank /pubkey request failed (${res.status}): ${body.slice(0, 200)}`,
      );
    }

    const json = (await res.json()) as { key?: string };
    if (!json.key) {
      throw new Error('Monobank /pubkey response missing key field');
    }

    await setCachedMonobankPubKey(json.key);
    return json.key;
  })();

  pubKeyInFlightPromise = requestPromise;
  try {
    return await requestPromise;
  } finally {
    if (pubKeyInFlightPromise === requestPromise) {
      pubKeyInFlightPromise = null;
    }
  }
}

function parseMonobankPublicKey(rawKey: string): crypto.KeyObject {
  const cached = parsedKeyCache.get(rawKey);
  if (cached) return cached;

  const trimmed = rawKey.trim();
  let keyObj: crypto.KeyObject;
  if (trimmed.startsWith('-----BEGIN')) {
    keyObj = crypto.createPublicKey(trimmed);
  } else {
    const decodedBuf = Buffer.from(trimmed, 'base64');
    const asUtf8 = decodedBuf.toString('utf8').trim();
    if (asUtf8.startsWith('-----BEGIN')) {
      keyObj = crypto.createPublicKey(asUtf8);
    } else {
      keyObj = crypto.createPublicKey({
        key: decodedBuf,
        format: 'der',
        type: 'spki',
      });
    }
  }

  if (parsedKeyCache.size >= 8) {
    const oldest = parsedKeyCache.keys().next();
    if (!oldest.done) parsedKeyCache.delete(oldest.value);
  }
  parsedKeyCache.set(rawKey, keyObj);
  return keyObj;
}

function verifyWithPublicKeyString(
  rawBody: string,
  xSignHeader: string,
  publicKeyMaterial: string,
): boolean {
  const keyObj = parseMonobankPublicKey(publicKeyMaterial);
  const signatureBytes = Buffer.from(xSignHeader.trim(), 'base64');
  if (signatureBytes.length === 0) {
    return false;
  }
  return crypto.verify(
    'sha256',
    Buffer.from(rawBody, 'utf8'),
    keyObj,
    signatureBytes,
  );
}

/**
 * Verifies Monobank's `X-Sign` ECDSA SHA-256 webhook signature.
 * Refreshes the cached public key once on mismatch if MONOBANK_TOKEN is present
 * and no fixed MONOBANK_PUBLIC_KEY override is pinned.
 */
export async function verifyMonobankWebhookSignature(
  rawBody: string,
  xSignHeader: string | null,
): Promise<{ valid: boolean; reason?: string }> {
  if (!rawBody) {
    return { valid: false, reason: 'Empty webhook payload' };
  }
  if (!xSignHeader || !xSignHeader.trim()) {
    return { valid: false, reason: 'Missing X-Sign header' };
  }

  try {
    const pubKey = await fetchMonobankPublicKey(false);
    if (verifyWithPublicKeyString(rawBody, xSignHeader, pubKey)) {
      return { valid: true };
    }

    // Attempt a single key refresh in case Monobank rotated the acquiring key
    if (!process.env.MONOBANK_PUBLIC_KEY?.trim() && getMonobankToken()) {
      const refreshed = await fetchMonobankPublicKey(true);
      if (verifyWithPublicKeyString(rawBody, xSignHeader, refreshed)) {
        return { valid: true };
      }
    }

    return { valid: false, reason: 'ECDSA signature mismatch' };
  } catch (err) {
    return {
      valid: false,
      reason: err instanceof Error ? err.message : 'Monobank signature check failed',
    };
  }
}

export async function refundMonobankInvoice(params: {
  invoiceId: string;
  amountMinor?: number;
  extRef?: string;
}): Promise<{ status: string }> {
  const token = getMonobankToken();
  if (!token) {
    throw new Error('MONOBANK_TOKEN is not configured for refund');
  }

  const body: Record<string, unknown> = {
    invoiceId: params.invoiceId,
    extRef: params.extRef || `refund_${params.invoiceId}_${Date.now()}`,
  };
  if (typeof params.amountMinor === 'number' && params.amountMinor > 0) {
    body.amount = params.amountMinor;
  }

  const res = await fetch(`${MONOBANK_API_BASE}/invoice/cancel`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Token': token,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10_000),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Monobank refund failed (${res.status}): ${text.slice(0, 250)}`);
  }

  const data = (await res.json()) as { status?: string };
  return { status: data.status || 'reversed' };
}
