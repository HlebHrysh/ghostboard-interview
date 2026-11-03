import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSessionUser, DbUser } from '@/lib/serverDb';
import {
  FLASH_MODELS,
  getCleanGeminiKey,
  getCleanGroqKey,
  modelsRejectingThinking,
  getPrioritizedModels,
  recordModelSuccess,
  recordModelFailure,
  runHedgedStreamRace,
  iterateHedgedStreamChunks,
} from '@/lib/geminiApi';
import { normalizeTechnicalSpeech } from '@/lib/techSpeechNormalizer';
import { checkRateLimit, validateOrigin } from '@/lib/rateLimit';
import {
  buildGhostboardSystemPrompt,
  parseStructuredGhostboardOutput,
  AiModifier,
} from '@/lib/aiPromptCore';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type FastUser = DbUser | { id: string; email: string; plan: string; createdAt: Date };

interface CachedUserRecord {
  user: FastUser;
  cachedAt: number;
}
const sessionUserCache = new Map<string, CachedUserRecord>();
const USER_CACHE_TTL_MS = 10 * 60 * 1000; // 10-minute in-memory cache for 0ms pre-flight

async function resolveSessionUserFast(token: string | undefined): Promise<FastUser | null> {
  if (!token) return null;
  const cached = sessionUserCache.get(token);
  const now = Date.now();
  if (cached && now - cached.cachedAt < USER_CACHE_TTL_MS) {
    return cached.user;
  }
  const user = await getSessionUser(token);
  if (user) {
    sessionUserCache.set(token, { user, cachedAt: now });
  }
  return user;
}

const ALLOWED_MODIFIERS = [
  'normal',
  'shorter',
  'simpler',
  'code',
  're_angle',
  'more_technical',
  'code_example',
  'tradeoffs',
] as const;

const DualStreamPayloadSchema = z.object({
  question: z.string().trim().min(1, 'Question cannot be empty').max(3000),
  history: z
    .array(
      z.object({
        speaker: z.enum(['interviewer', 'candidate']),
        text: z.string(),
      })
    )
    .optional()
    .default([]),
  directorModifier: z.enum(ALLOWED_MODIFIERS).optional().default('normal'),
  modifier: z.enum(ALLOWED_MODIFIERS).optional(),
  mode: z.enum(ALLOWED_MODIFIERS).optional(),
  candidateProfile: z
    .object({
      role: z.string().optional(),
      primaryStack: z.string().optional(),
      experienceLevel: z.string().optional(),
      cvContext: z.string().optional(),
      resumeContext: z.string().optional(),
      techStack: z.array(z.string()).optional(),
      petProjects: z.array(z.any()).optional(),
      customBio: z.string().optional(),
    })
    .optional(),
  outputLanguage: z.string().optional().default('en'),
  helperLanguage: z.string().optional().default('uk'),
});

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-ghostboard-client, x-ghostboard-demo',
    },
  });
}

export async function POST(req: NextRequest) {
  const requestStartTime = Date.now();

  try {
    if (!validateOrigin(req)) {
      return NextResponse.json({ error: 'Origin mismatch' }, { status: 403 });
    }

    const token =
      req.cookies.get('ghostboard_session')?.value ||
      req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');

    const isDesktopClient =
      req.headers.get('x-ghostboard-client') === 'desktop-app' ||
      req.headers.get('origin')?.startsWith('tauri://') ||
      req.headers.get('origin')?.includes('tauri.localhost');

    const isDemo =
      req.headers.get('x-ghostboard-demo') === 'true' ||
      req.nextUrl.searchParams.get('demo') === '1';

    let user = token ? await resolveSessionUserFast(token) : null;
    if (!user && (process.env.NODE_ENV === 'development' || isDemo)) {
      user = {
        id: isDemo ? 'demo-guest-user' : 'dev-local-user',
        email: isDemo ? 'guest@ghostboard.local' : 'developer@ghostboard.local',
        plan: isDemo ? 'free' : 'pro',
        createdAt: new Date(),
      };
    }

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized. Please sign in to access Dual-Stream Copilot.', code: 'AUTH_REQUIRED' },
        {
          status: 401,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-ghostboard-client, x-ghostboard-demo',
          },
        }
      );
    }

    const rateLimit = await checkRateLimit(
      req,
      isDemo ? 15 : 40,
      60000,
      isDemo ? 'dual_stream_demo' : 'dual_stream_ai'
    );
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: isDemo
            ? `Demo rate limit reached. Please wait ${rateLimit.retryAfterSec}s or sign up for full access.`
            : `Rate limit exceeded. Please wait ${rateLimit.retryAfterSec}s.`,
        },
        { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfterSec) } }
      );
    }

    const rawBody = await req.json().catch(() => ({}));

    // Normalize modifier aliases before validation
    const effectiveModifier =
      rawBody.directorModifier || rawBody.modifier || rawBody.mode || 'normal';
    rawBody.directorModifier = effectiveModifier;

    const parseResult = DualStreamPayloadSchema.safeParse(rawBody);

    if (!parseResult.success) {
      const err = parseResult.error.issues.map((i) => i.message).join(', ');
      return NextResponse.json({ error: err }, { status: 400 });
    }

    const {
      question,
      history,
      directorModifier,
      candidateProfile,
      outputLanguage,
      helperLanguage,
    } = parseResult.data;

    const normalizedQuestion = normalizeTechnicalSpeech(question.trim());
    const apiKey = getCleanGeminiKey();
    const groqKey = getCleanGroqKey();

    if (!apiKey && !groqKey) {
      return NextResponse.json(
        { error: 'AI API Key (GEMINI_API_KEY or GROQ_API_KEY) is not configured on the server.' },
        { status: 500 }
      );
    }

    // Build the zero-fluff system prompt with domain auto-classification (<450 tokens)
    const { systemPrompt, domain, level, langTag } = buildGhostboardSystemPrompt({
      question: normalizedQuestion,
      modifier: directorModifier as AiModifier,
      profile: candidateProfile,
      outputLanguage,
      helperLanguage,
    });

    // Prepare contents array with conversation context
    const contents: Array<{ role: string; parts: Array<{ text: string }> }> = [
      {
        role: 'user',
        parts: [{ text: systemPrompt }],
      },
      {
        role: 'model',
        parts: [{ text: 'Understood. Awaiting interview query.' }],
      },
    ];

    if (history && history.length > 0) {
      // Include last 4 turns for low prompt latency & fast prefill
      history.slice(-4).forEach((h) => {
        contents.push({
          role: h.speaker === 'interviewer' ? 'user' : 'model',
          parts: [{ text: `${h.speaker.toUpperCase()}: ${h.text}` }],
        });
      });
    }

    contents.push({
      role: 'user',
      parts: [{ text: `INTERVIEW QUESTION: ${normalizedQuestion}` }],
    });

    const encoder = new TextEncoder();

    // Establish true Server-Sent Events stream without buffering
    const readableStream = new ReadableStream({
      async start(controller) {
        let firstTokenTimestamp: number | null = null;
        let activeModelUsed = '';
        let fullGeneratedText = '';
        let metaDispatched = false;

        const sendEvent = (event: string, data: unknown) => {
          controller.enqueue(
            encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
          );
        };

        const maxTokens = directorModifier === 'shorter' ? 350 : 850;

        const winner = await runHedgedStreamRace({
          contents,
          systemPrompt,
          normalizedQuestion,
          history,
          maxTokens,
          temperature: 0.3,
          signal: req.signal,
        });

        if (!winner) {
          sendEvent('error', {
            message: 'All AI models unavailable or quota exhausted. Please retry.',
          });
          controller.close();
          return;
        }

        activeModelUsed = winner.model;
        firstTokenTimestamp = Date.now();
        const initialTtftMs = firstTokenTimestamp - requestStartTime;
        sendEvent('telemetry', {
          type: 'TTFT',
          ttftMs: initialTtftMs,
          model: activeModelUsed,
          timestamp: firstTokenTimestamp,
        });

        const checkMeta = (text: string) => {
          if (!metaDispatched) {
            const metaMatch = text.match(/<<<META:\s*([^>]+)>>>/i);
            if (metaMatch) {
              metaDispatched = true;
              const parts = metaMatch[1].split('|').map((p) => p.trim());
              sendEvent('meta', {
                domain: parts[0] || domain,
                level: parts[1] || level,
                language: parts[2] || langTag,
                raw: metaMatch[1].trim(),
              });
            }
          }
        };

        try {
          for await (const chunk of iterateHedgedStreamChunks(winner, req.signal)) {
            fullGeneratedText += chunk;
            checkMeta(fullGeneratedText);
            sendEvent('chunk', {
              text: chunk,
              model: activeModelUsed,
            });
          }
        } catch (streamErr) {
          console.warn(`[DualStream] Stream pump error on ${winner.model}:`, streamErr);
        }

        // Parse structured output phases
        const totalDurationMs = Date.now() - requestStartTime;
        const ttftMs = firstTokenTimestamp ? firstTokenTimestamp - requestStartTime : totalDurationMs;

        const structured = parseStructuredGhostboardOutput(fullGeneratedText);

        const finalMetaRaw =
          structured.meta?.raw || `${domain} | ${level} | ${langTag}`;

        // Fallback pillars if LLM produced fewer than 2 bullets
        const finalPillars =
          structured.pillars.length >= 2
            ? structured.pillars
            : [
                '**Архітектура**: Пряма реалізація без зайвих шарів абстракцій.',
                '**Паралелізм**: Неблокуюче асинхронне виконання задач.',
                '**Надійність**: Ізоляція збоїв та передбачуваний стан системи.',
              ];

        // Final structured completion event
        sendEvent('complete', {
          id: `ds-${Date.now()}`,
          model: activeModelUsed,
          ttftMs,
          totalDurationMs,
          rawText: fullGeneratedText,
          structured: {
            meta: finalMetaRaw,
            domain: structured.meta?.domain || domain,
            level: structured.meta?.level || level,
            language: structured.meta?.language || langTag,
            hook: structured.hook || fullGeneratedText.slice(0, 160),
            pillars: finalPillars,
            deepDive: structured.deepDive,
          },
        });

        controller.close();
      },
    });

    return new Response(readableStream, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-ghostboard-client, x-ghostboard-demo',
      },
    });
  } catch (error: unknown) {
    console.error('[DualStream API Error]', error);
    return NextResponse.json(
      { error: (error as { message?: string })?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
