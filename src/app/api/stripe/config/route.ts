import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { validateOrigin } from '@/lib/rateLimit';
import { requireAdmin } from '@/lib/adminGuard';

function updateEnvFile(keyName: string, value: string) {
  try {
    const envPath = path.join(process.cwd(), '.env.local');
    let currentContent = '';
    if (fs.existsSync(envPath)) {
      currentContent = fs.readFileSync(envPath, 'utf8');
    }
    const lines = currentContent.split('\n').filter((l) => l.trim().length > 0);
    let updated = false;
    const newLines = lines.map((line) => {
      if (line.startsWith(`${keyName}=`) || line.startsWith(`${keyName} =`)) {
        updated = true;
        return `${keyName}=${value}`;
      }
      return line;
    });
    if (!updated) {
      newLines.push(`${keyName}=${value}`);
    }
    fs.writeFileSync(envPath, newLines.join('\n') + '\n', 'utf8');
  } catch (err: any) {
    console.warn(`[updateEnvFile] Could not persist to .env.local (${err?.message}). Running in-memory.`);
  }
  process.env[keyName] = value;
}

export async function GET(req: NextRequest) {
  // Auth guard: only admin can view Stripe configuration details
  const authError = await requireAdmin(req);
  if (authError) return authError;

  const secretKey = process.env.STRIPE_SECRET_KEY?.trim() || '';
  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim() || '';
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim() || '';

  const isConfigured = Boolean(secretKey && secretKey.startsWith('sk_'));
  const isLive = Boolean(secretKey.startsWith('sk_live_'));
  const isTest = Boolean(secretKey.startsWith('sk_test_'));

  const mask = (key: string) => {
    if (!key || key.length < 8) return null;
    return `${key.slice(0, 7)}...${key.slice(-4)}`;
  };

  return NextResponse.json({
    isConfigured,
    mode: isLive ? 'live' : isTest ? 'test' : 'sandbox',
    maskedSecretKey: mask(secretKey),
    maskedPublishableKey: mask(publishableKey),
    maskedWebhookSecret: mask(webhookSecret),
    readyForPayments: isConfigured,
  });
}

export async function POST(req: NextRequest) {
  try {
    const authError = await requireAdmin(req);
    if (authError) return authError;

    if (!validateOrigin(req)) {
      return NextResponse.json({ error: 'Origin mismatch' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { secretKey, publishableKey, webhookSecret } = body;

    if (secretKey && typeof secretKey === 'string') {
      const cleanSecret = secretKey.trim().replace(/^["']|["']$/g, '');
      if (!cleanSecret.startsWith('sk_')) {
        return NextResponse.json(
          { error: 'Некоректний Stripe Secret Key. Повинен починатися з sk_test_ або sk_live_' },
          { status: 400 }
        );
      }
      updateEnvFile('STRIPE_SECRET_KEY', cleanSecret);
    }

    if (publishableKey && typeof publishableKey === 'string') {
      const cleanPub = publishableKey.trim().replace(/^["']|["']$/g, '');
      updateEnvFile('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY', cleanPub);
    }

    if (webhookSecret && typeof webhookSecret === 'string') {
      const cleanWh = webhookSecret.trim().replace(/^["']|["']$/g, '');
      updateEnvFile('STRIPE_WEBHOOK_SECRET', cleanWh);
    }

    return NextResponse.json({
      success: true,
      message: 'Налаштування Stripe успішно оновлено в .env.local',
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Помилка збереження конфігурації' }, { status: 500 });
  }
}
