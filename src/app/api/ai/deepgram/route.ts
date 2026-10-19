import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { validateOrigin, checkRateLimit } from '@/lib/rateLimit';
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
  } catch (err: any) {
    console.warn(`[updateEnvFile] Could not persist to .env.local (${err?.message}). Running in-memory.`);
  }
  process.env[keyName] = value;
}

export async function GET(req: NextRequest) {
  // 1. Origin & Anti-Hotlinking protection
  if (!validateOrigin(req)) {
    return NextResponse.json({ error: 'Запит відхилено: недозволене джерело (Origin mismatch)' }, { status: 403 });
  }

  // 2. Anti-Drain Rate Limiting: max 10 key retrievals per minute per IP
  const rateLimit = await checkRateLimit(req, 10, 60000, 'deepgram_key');
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: `Забагато запитів до Deepgram сервісу. Спробуйте через ${rateLimit.retryAfterSec} сек.` },
      { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfterSec) } }
    );
  }

  // 3. Client session guard
  const token =
    req.cookies.get('ghostboard_session')?.value ||
    req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');

  if (!token) {
    return NextResponse.json({ error: 'Необхідна активна сесія Ghostboard', code: 'AUTH_REQUIRED' }, { status: 401 });
  }

  const user = await getSessionUser(token);
  if (!user) {
    return NextResponse.json({ error: 'Недійсна сесія користувача', code: 'INVALID_SESSION' }, { status: 401 });
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

  // 4. Try to generate an ephemeral short-lived key (TTL: 10 mins) via Deepgram Projects API
  try {
    const projectsRes = await fetch('https://api.deepgram.com/v1/projects', {
      method: 'GET',
      headers: { Authorization: `Token ${currentKey}` },
    });

    if (projectsRes.ok) {
      const projectsData = await projectsRes.json().catch(() => null);
      const projectId = projectsData?.projects?.[0]?.project_id;

      if (projectId) {
        // Attempt to create ephemeral scoped key
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
              time_to_live_in_seconds: 600,
            }),
          });

          if (ephemeralRes.ok) {
            const ephemData = await ephemeralRes.json();
            const ephemeralKey = ephemData?.key || ephemData?.api_key;
            if (ephemeralKey) {
              return NextResponse.json({
                configured: true,
                maskedKey: masked,
                apiKey: ephemeralKey,
                isEphemeral: true,
                ttlSeconds: 600,
                status: 'valid',
                message: 'Згенеровано одноразовий безпечний ключ сесії Deepgram (TTL: 10 хв)',
              });
            }
          }
        } catch {
          // If ephemeral creation fails due to member scope, proceed to fallback
        }
      }

      // Safe authenticated session response (ephemeral key preferred)
      const isDev = process.env.NODE_ENV !== 'production';
      if (!isDev) {
        return NextResponse.json({
          configured: true,
          maskedKey: masked,
          apiKey: null,
          isEphemeral: false,
          status: 'error',
          message: 'Не вдалося створити тимчасовий токен Deepgram. Перевірте дозволи ключа.',
        }, { status: 503 });
      }

      return NextResponse.json({
        configured: true,
        maskedKey: masked,
        apiKey: currentKey,
        isEphemeral: false,
        status: 'valid',
        message: 'Deepgram API ключ готовий до сесії (режим розробки)',
      });
    }

    const errText = await projectsRes.text();
    return NextResponse.json({
      configured: true,
      maskedKey: masked,
      apiKey: process.env.NODE_ENV !== 'production' ? currentKey : null,
      status: 'error',
      message: errText || 'Помилка валідації Deepgram ключа',
    });
  } catch (e: any) {
    return NextResponse.json({
      configured: true,
      maskedKey: masked,
      apiKey: process.env.NODE_ENV !== 'production' ? currentKey : null,
      status: 'valid',
      message: 'Ключ збережено',
    });
  }
}

export async function POST(req: NextRequest) {
  try {
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
      });

      if (testRes.ok) {
        isValid = true;
        testMessage = 'Ключ Deepgram успішно підтверджено!';
      } else {
        const errJson = await testRes.json().catch(() => null);
        testMessage = errJson?.err_msg || errJson?.message || 'Недійсний ключ Deepgram';
      }
    } catch (e: any) {
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
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to save Deepgram key' }, { status: 500 });
  }
}
