import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { validateOrigin, checkRateLimit, checkKeyRateLimit } from '@/lib/rateLimit';
import { requireAdmin } from '@/lib/adminGuard';
import { getSessionUser } from '@/lib/serverDb';

function getDeepgramKey(): string | null {
  const key = process.env.DEEPGRAM_API_KEY;
  if (!key) return null;
  return key.trim().replace(/^["']|["']$/g, '');
}

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
  } catch (err: unknown) {
    console.warn(`[updateEnvFile] Could not persist to .env.local (${(err as { message?: string })?.message}). Running in-memory.`);
  }
  process.env[keyName] = value;
}

const TOKEN_TTL_SECONDS = 60;
let cachedEphemeralKey: { key: string; expiresAt: number } | null = null;

export async function GET(req: NextRequest) {
  const isDev = process.env.NODE_ENV !== 'production';
  const isDesktop =
    req.headers.get('x-ghostboard-client') === 'desktop-app' ||
    req.headers.get('origin')?.startsWith('tauri://') ||
    req.headers.get('origin')?.includes('tauri.localhost');
  const isDemo =
    req.headers.get('x-ghostboard-demo') === 'true' ||
    req.nextUrl.searchParams.get('demo') === '1';
  const isStudioClient = req.headers.get('x-ghostboard-client') === 'studio-session';
  const isExternalClientIp = Boolean(
    req.headers.get('cf-connecting-ip') || req.headers.get('x-forwarded-for')
  );

  const isExplicitDevOrDemo = isDemo || isDesktop || isStudioClient;

  // 1. Origin & Anti-Hotlinking protection (relaxed for dev/desktop/demo)
  if (!isExplicitDevOrDemo && !isDev && !validateOrigin(req)) {
    return NextResponse.json({ error: 'Запит відхилено: недозволене джерело (Origin mismatch)' }, { status: 403 });
  }

  // 2. Anti-Drain Rate Limiting: relaxed in dev/demo/desktop to prevent 429 on reconnects
  if (!isExplicitDevOrDemo) {
    const rateLimit = await checkRateLimit(req, 10, 60000, 'deepgram_key');
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: `Забагато запитів до Deepgram сервісу. Спробуйте через ${rateLimit.retryAfterSec} сек.` },
        { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfterSec) } }
      );
    }
  }

  // 3. Client session guard (in dev, demo, or studio client, allow session without 401)
  const token =
    req.cookies.get('ghostboard_session')?.value ||
    req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');

  let user = token ? await getSessionUser(token) : null;
  if (!user && (isExplicitDevOrDemo || (isDev && !isExternalClientIp))) {
    user = {
      id: isDemo ? 'demo-guest-user' : 'dev-local-user',
      email: isDemo ? 'guest@ghostboard.local' : 'developer@ghostboard.local',
      plan: isDemo ? 'free' : 'pro',
      createdAt: new Date(),
    };
  }

  if (!user) {
    return NextResponse.json({ error: 'Необхідна активна сесія Ghostboard', code: 'AUTH_REQUIRED' }, { status: 401 });
  }

  // P0-4: Rate-limit token issuance per session/user (max 10 tokens per 1 hour per session)
  if (!isExplicitDevOrDemo) {
    const sessionKey = user.id || token || 'guest_session';
    const sessionRateLimit = await checkKeyRateLimit(sessionKey, 10, 3600 * 1000, 'deepgram_session_token');
    if (!sessionRateLimit.allowed) {
      return NextResponse.json(
        {
          error: `Досягнуто ліміт генерації токенів Deepgram для вашої сесії (максимум 10 на годину). Спробуйте через ${sessionRateLimit.retryAfterSec} сек.`,
          code: 'RATE_LIMITED',
          retryAfterSec: sessionRateLimit.retryAfterSec,
        },
        { status: 429, headers: { 'Retry-After': String(sessionRateLimit.retryAfterSec) } }
      );
    }
  }

  const currentKey = getDeepgramKey();
  if (!currentKey) {
    return NextResponse.json({
      configured: false,
      maskedKey: null,
      status: 'missing',
      message: 'DEEPGRAM_API_KEY не налаштовано',
    });
  }

  const masked = currentKey.length > 8
    ? `${currentKey.slice(0, 6)}...${currentKey.slice(-4)}`
    : '***';

  // In development, instantly issue configured key in ~1ms without external Deepgram roundtrip
  if (isDev || isDesktop) {
    return NextResponse.json({
      configured: true,
      maskedKey: masked,
      apiKey: currentKey,
      isEphemeral: false,
      status: 'valid',
      message: 'Deepgram API ключ готовий до сесії (режим розробки)',
    });
  }

  // Check in-memory cached ephemeral key (reuse if at least 10s of life remaining)
  const now = Date.now();
  if (cachedEphemeralKey && cachedEphemeralKey.expiresAt > now + 10_000) {
    return NextResponse.json({
      configured: true,
      maskedKey: masked,
      apiKey: cachedEphemeralKey.key,
      isEphemeral: true,
      ttlSeconds: Math.round((cachedEphemeralKey.expiresAt - now) / 1000),
      status: 'valid',
      message: 'Згенеровано одноразовий безпечний ключ сесії Deepgram (з кешу)',
    });
  }

  // 4. Try to generate an ephemeral short-lived key (TTL: TOKEN_TTL_SECONDS) via Deepgram Projects API
  try {
    const projectsRes = await fetch('https://api.deepgram.com/v1/projects', {
      method: 'GET',
      headers: { Authorization: `Token ${currentKey}` },
      signal: AbortSignal.timeout(8000),
    });

    if (projectsRes.ok) {
      const projectsData = await projectsRes.json().catch(() => null);
      const projectId = projectsData?.projects?.[0]?.project_id;

      if (projectId) {
        try {
          const ephemeralRes = await fetch(`https://api.deepgram.com/v1/projects/${projectId}/keys`, {
            method: 'POST',
            headers: {
              Authorization: `Token ${currentKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              comment: 'Ghostboard Live Session Ephemeral Key',
              scopes: ['usage:write'],
              time_to_live_in_seconds: TOKEN_TTL_SECONDS,
            }),
            signal: AbortSignal.timeout(8000),
          });

          if (ephemeralRes.ok) {
            const ephemData = await ephemeralRes.json();
            const ephemeralKey = ephemData?.key || ephemData?.api_key;
            if (ephemeralKey) {
              cachedEphemeralKey = {
                key: ephemeralKey,
                expiresAt: Date.now() + TOKEN_TTL_SECONDS * 1000,
              };
              return NextResponse.json({
                configured: true,
                maskedKey: masked,
                apiKey: ephemeralKey,
                isEphemeral: true,
                ttlSeconds: TOKEN_TTL_SECONDS,
                status: 'valid',
                message: `Згенеровано одноразовий безпечний ключ сесії Deepgram (TTL: ${TOKEN_TTL_SECONDS} сек)`,
              });
            }
          }
        } catch {
          // If ephemeral creation fails, fall through to fallback
        }
      }

      return NextResponse.json({
        configured: true,
        maskedKey: masked,
        apiKey: currentKey,
        isEphemeral: false,
        status: 'valid',
        message: 'Deepgram API ключ готовий до сесії',
      });
    }

    const errText = await projectsRes.text().catch(() => '');
    return NextResponse.json({
      configured: true,
      maskedKey: masked,
      apiKey: currentKey,
      status: 'valid',
      message: errText || 'Помилка валідації Deepgram ключа, використано базовий ключ',
    });
  } catch {
    return NextResponse.json({
      configured: true,
      maskedKey: masked,
      apiKey: currentKey,
      status: 'valid',
      message: 'Deepgram API ключ готовий',
    });
  }
}

export async function POST(req: NextRequest) {
  try {
    // P1-7: Disable saving runtime keys in production
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { error: 'Оновлення ключів через API заборонено у production середовищі' },
        { status: 403 }
      );
    }

    const authError = await requireAdmin(req);
    if (authError) return authError;

    if (!validateOrigin(req)) {
      return NextResponse.json({ error: 'Origin mismatch' }, { status: 403 });
    }
    const rateLimit = await checkRateLimit(req, 5, 60000, 'deepgram_update');
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: 'Забагато спроб оновлення ключа' }, { status: 429 });
    }

    const { key } = await req.json();
    if (!key || typeof key !== 'string') {
      return NextResponse.json({ error: 'Deepgram API key is required' }, { status: 400 });
    }

    let cleanKey = key.trim();
    if (cleanKey.includes('=')) {
      cleanKey = cleanKey.split('=').pop()?.trim() || cleanKey;
    }
    // Strip quotes and carriage returns
    cleanKey = cleanKey.replace(/^["']|["']$/g, '').replace(/[\r\n\t]/g, '').trim();

    // Security check: validate key format (alphanumeric, dashes, underscores, max length 128)
    const keyRegex = /^[a-zA-Z0-9_\-]{16,128}$/;
    if (!keyRegex.test(cleanKey)) {
      return NextResponse.json({
        error: 'Некоректний формат Deepgram API ключа. Дозволені лише літери, цифри, дефіс та підкреслення (16-128 символів).'
      }, { status: 400 });
    }

    // Verify key with Deepgram
    let isValid = false;
    let testMessage = '';

    try {
      const testRes = await fetch('https://api.deepgram.com/v1/projects', {
        method: 'GET',
        headers: {
          Authorization: `Token ${cleanKey}`,
        },
        signal: AbortSignal.timeout(8000),
      });

      if (testRes.ok) {
        isValid = true;
        testMessage = 'Ключ Deepgram успішно підтверджено!';
      } else {
        const errJson = await testRes.json().catch(() => null);
        testMessage = errJson?.err_msg || errJson?.message || 'Недійсний ключ Deepgram';
      }
    } catch (e: unknown) {
      isValid = true;
      testMessage = 'Ключ збережено (перевірку мережі пропущено)';
    }

    // Save to .env.local preserving other keys
    updateEnvFile('DEEPGRAM_API_KEY', cleanKey);

    return NextResponse.json({
      success: true,
      isValid,
      message: testMessage,
      maskedKey: `${cleanKey.slice(0, 6)}...${cleanKey.slice(-4)}`,
      apiKey: cleanKey,
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as { message?: string })?.message || 'Failed to save Deepgram key' }, { status: 500 });
  }
}
