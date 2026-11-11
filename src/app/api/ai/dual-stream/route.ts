import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSessionUser, DbUser, incrementUserTrialQuestions } from '@/lib/serverDb';
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
  mergeContinuationQuestion,
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
const MAX_USER_CACHE_SIZE = 500;

function pruneUserCache(now: number) {
  if (sessionUserCache.size > MAX_USER_CACHE_SIZE) {
    for (const [key, record] of sessionUserCache.entries()) {
      if (now - record.cachedAt >= USER_CACHE_TTL_MS) {
        sessionUserCache.delete(key);
      }
    }
    if (sessionUserCache.size > MAX_USER_CACHE_SIZE) {
      const excess = sessionUserCache.size - MAX_USER_CACHE_SIZE;
      let count = 0;
      for (const key of sessionUserCache.keys()) {
        sessionUserCache.delete(key);
        count++;
        if (count >= excess) break;
      }
    }
  }
}

async function resolveSessionUserFast(token: string | undefined): Promise<FastUser | null> {
  if (!token) return null;
  const now = Date.now();
  const cached = sessionUserCache.get(token);
  if (cached && now - cached.cachedAt < USER_CACHE_TTL_MS) {
    return cached.user;
  }
  const user = await getSessionUser(token);
  if (user) {
    pruneUserCache(now);
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
  'explain_line',
] as const;

interface RecentQuestionRecord {
  question: string;
  timestamp: number;
}
const recentQuestionCache = new Map<string, RecentQuestionRecord>();

const DualStreamPayloadSchema = z.object({
  question: z.string().trim().min(1, 'Question cannot be empty').max(3000),
  previousQuestion: z.string().optional(),
  continuationFragment: z.string().optional(),
  isContinuation: z.boolean().optional(),
  history: z
    .array(
      z.union([
        z.object({
          speaker: z.enum(['interviewer', 'candidate']),
          text: z.string(),
        }),
        z.object({
          question: z.string(),
          answer: z.string().optional(),
          shortHook: z.string().optional(),
        }),
      ])
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

export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get('origin');
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': origin || '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-ghostboard-client, x-ghostboard-demo',
      ...(origin ? { 'Access-Control-Allow-Credentials': 'true' } : {}),
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
    if (!user && isDemo) {
      user = {
        id: 'demo-guest-user',
        email: 'guest@ghostboard.local',
        plan: 'free',
        createdAt: new Date(),
      };
    }

    if (!user) {
      const origin = req.headers.get('origin');
      return NextResponse.json(
        { error: 'Unauthorized. Please sign in to access Dual-Stream Copilot.', code: 'AUTH_REQUIRED' },
        {
          status: 401,
          headers: {
            'Access-Control-Allow-Origin': origin || '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-ghostboard-client, x-ghostboard-demo',
            ...(origin ? { 'Access-Control-Allow-Credentials': 'true' } : {}),
          },
        }
      );
    }

    if ('isBanned' in user && user.isBanned) {
      return NextResponse.json(
        { error: 'Your account has been suspended.', code: 'ACCOUNT_SUSPENDED' },
        { status: 403 }
      );
    }

    const isPro = user.plan === 'pro' || user.plan === 'lifetime' || user.plan === 'emergency';
    const trialQuestionsUsed = Number(
      ('trialQuestionsUsed' in user ? (user as { trialQuestionsUsed?: number }).trialQuestionsUsed : 0) || 0
    );

    if (!isPro && user.id !== 'demo-guest-user' && trialQuestionsUsed >= 5) {
      return NextResponse.json(
        {
          error: 'Trial limit reached (5 questions). Please upgrade to an Emergency Pass or Pro Plan.',
          code: 'TRIAL_LIMIT_REACHED',
        },
        { status: 403 }
      );
    }

    const rateLimit = await checkRateLimit(
      req,
      isDemo ? 5 : 40,
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

    // Incremental Question Merge on Speaker Continuation (<2500ms or explicit)
    let finalQuestion = normalizedQuestion;
    let addedConstraint: string | undefined = undefined;

    const previousQ = parseResult.data.previousQuestion;
    const isContinuationExplicit = parseResult.data.isContinuation;

    if (previousQ) {
      const merged = mergeContinuationQuestion(previousQ, normalizedQuestion);
      finalQuestion = merged.mergedQuestion;
      addedConstraint = merged.addedConstraint;
    } else {
      const last = recentQuestionCache.get(user.id);
      if (
        last &&
        (requestStartTime - last.timestamp <= 2500 || isContinuationExplicit) &&
        last.question !== normalizedQuestion
      ) {
        const merged = mergeContinuationQuestion(last.question, normalizedQuestion);
        finalQuestion = merged.mergedQuestion;
        addedConstraint = merged.addedConstraint;
      }
    }
    recentQuestionCache.set(user.id, { question: finalQuestion, timestamp: requestStartTime });

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
      question: finalQuestion,
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
      // Include last 4 turns for low prompt latency & fast prefill (capped at 200 chars to avoid prefill bloat)
      history.slice(-4).forEach((h) => {
        if ('speaker' in h) {
          const text =
            h.speaker === 'candidate' && h.text.length > 200
              ? `${h.text.slice(0, 200)}...`
              : h.text;
          contents.push({
            role: h.speaker === 'interviewer' ? 'user' : 'model',
            parts: [{ text: `${h.speaker.toUpperCase()}: ${text}` }],
          });
        } else if ('question' in h) {
          contents.push({
            role: 'user',
            parts: [{ text: `INTERVIEWER: ${h.question}` }],
          });
          const rawAns = (h.shortHook || h.answer || '').trim();
          if (rawAns) {
            const shortAns = rawAns.length > 200 ? `${rawAns.slice(0, 200)}...` : rawAns;
            contents.push({
              role: 'model',
              parts: [{ text: `CANDIDATE: ${shortAns}` }],
            });
          }
        }
      });
    }

    const userQuestionText = addedConstraint
      ? `INTERVIEW QUESTION: ${finalQuestion}\n\n[CONTINUATION REFINEMENT: Keep the opening natural, and specifically address the newly added constraint: "${addedConstraint}"]`
      : `INTERVIEW QUESTION: ${finalQuestion}`;

    contents.push({
      role: 'user',
      parts: [{ text: userQuestionText }],
    });

    if (!isPro && user.id !== 'demo-guest-user') {
      incrementUserTrialQuestions(user.id).catch((err) => {
        console.warn('[dual-stream] Failed to increment trial questions:', err);
      });
    }

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

        const maxTokens =
          directorModifier === 'shorter' || directorModifier === 'explain_line' ? 350 : 850;

        const winner = await runHedgedStreamRace({
          contents,
          systemPrompt,
          normalizedQuestion: finalQuestion,
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

        let hasStreamError = false;
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
          hasStreamError = true;
          console.warn(`[DualStream] Stream pump error on ${winner.model}:`, streamErr);
          sendEvent('error', {
            id: `ds-err-${Date.now()}`,
            message: 'Помилка потокової генерації відповіді ШІ. Спробуйте ще раз.',
          });
        }

        if (hasStreamError || !fullGeneratedText.trim()) {
          if (!hasStreamError) {
            sendEvent('error', {
              id: `ds-empty-${Date.now()}`,
              message: 'ШІ повернув порожню відповідь.',
            });
          }
          controller.close();
          return;
        }

        // Parse structured output phases
        const totalDurationMs = Date.now() - requestStartTime;
        const ttftMs = firstTokenTimestamp ? firstTokenTimestamp - requestStartTime : totalDurationMs;

        const structured = parseStructuredGhostboardOutput(fullGeneratedText);

        const finalMetaRaw =
          structured.meta?.raw || `${domain} | ${level} | ${langTag}`;

        const finalPillars = structured.pillars;

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
            followUpTrap: structured.followUpTrap,
          },
        });

        controller.close();
      },
    });

    const resOrigin = req.headers.get('origin');
    return new Response(readableStream, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
        'Access-Control-Allow-Origin': resOrigin || '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-ghostboard-client, x-ghostboard-demo',
        ...(resOrigin ? { 'Access-Control-Allow-Credentials': 'true' } : {}),
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
