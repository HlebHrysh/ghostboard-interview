import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSessionUser } from '@/lib/serverDb';
import { FLASH_MODELS, getCleanGeminiKey } from '@/lib/geminiApi';
import { normalizeTechnicalSpeech } from '@/lib/techSpeechNormalizer';
import { checkRateLimit, validateOrigin } from '@/lib/rateLimit';
import {
  buildGhostboardSystemPrompt,
  parseStructuredGhostboardOutput,
  AiModifier,
} from '@/lib/aiPromptCore';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-ghostboard-client',
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

    let user = token ? await getSessionUser(token) : null;
    if (!user && process.env.NODE_ENV === 'development') {
      user = {
        id: 'dev-local-user',
        email: 'developer@ghostboard.local',
        plan: 'pro',
        createdAt: new Date(),
      };
    }

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized. Please sign in to access Dual-Stream Copilot.', code: 'AUTH_REQUIRED' },
        { status: 401 }
      );
    }

    const rateLimit = await checkRateLimit(req, 40, 60000, 'dual_stream_ai');
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: `Rate limit exceeded. Please wait ${rateLimit.retryAfterSec}s.` },
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

    if (!apiKey) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY is not configured on the server.' },
        { status: 500 }
      );
    }

    // Build the zero-fluff system prompt with domain auto-classification
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

    // Establish Server-Sent Events stream
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

        // Try models with low-latency fallback
        let streamSuccess = false;

        for (const model of FLASH_MODELS) {
          try {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`;

            const geminiRes = await fetch(url, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents,
                generationConfig: {
                  temperature: 0.2,
                  topP: 0.9,
                  maxOutputTokens: directorModifier === 'shorter' ? 350 : 850,
                  thinkingConfig: {
                    thinkingBudget: 0,
                  },
                },
              }),
            });

            if (!geminiRes.ok) {
              const errBody = await geminiRes.text();
              console.warn(`[DualStream] Model ${model} returned ${geminiRes.status}:`, errBody);

              // If thinkingConfig is unsupported on this specific model/API version, retry without thinkingConfig
              if (geminiRes.status === 400 && (errBody.includes('thinkingConfig') || errBody.includes('unknown field'))) {
                const retryRes = await fetch(url, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    contents,
                    generationConfig: {
                      temperature: 0.2,
                      topP: 0.9,
                      maxOutputTokens: directorModifier === 'shorter' ? 350 : 850,
                    },
                  }),
                });
                if (!retryRes.ok || !retryRes.body) continue;
                // Retry succeeded without thinkingConfig
                activeModelUsed = model;
                const reader = retryRes.body.getReader();
                const decoder = new TextDecoder();
                let buffer = '';

                while (true) {
                  const { value, done } = await reader.read();
                  if (done) break;

                  buffer += decoder.decode(value, { stream: true });
                  const lines = buffer.split('\n');
                  buffer = lines.pop() || '';

                  for (const line of lines) {
                    const trimmed = line.trim();
                    if (!trimmed || !trimmed.startsWith('data:')) continue;

                    const jsonStr = trimmed.replace(/^data:\s*/, '');
                    if (jsonStr === '[DONE]') continue;

                    try {
                      const parsed = JSON.parse(jsonStr);
                      const textChunk = parsed.candidates?.[0]?.content?.parts?.[0]?.text;

                      if (textChunk) {
                        if (!firstTokenTimestamp) {
                          firstTokenTimestamp = Date.now();
                          const ttftMs = firstTokenTimestamp - requestStartTime;
                          sendEvent('telemetry', {
                            type: 'TTFT',
                            ttftMs,
                            model,
                            timestamp: firstTokenTimestamp,
                          });
                        }

                        fullGeneratedText += textChunk;

                        // Check for meta tag on early tokens
                        if (!metaDispatched) {
                          const metaMatch = fullGeneratedText.match(/<<<META:\s*([^>]+)>>>/i);
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

                        sendEvent('chunk', {
                          text: textChunk,
                          model,
                        });
                      }
                    } catch {}
                  }
                }
                streamSuccess = true;
                break;
              }
              continue;
            }

            if (!geminiRes.body) {
              continue;
            }

            activeModelUsed = model;
            const reader = geminiRes.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
              const { value, done } = await reader.read();
              if (done) break;

              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split('\n');
              buffer = lines.pop() || '';

              for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed || !trimmed.startsWith('data:')) continue;

                const jsonStr = trimmed.replace(/^data:\s*/, '');
                if (jsonStr === '[DONE]') continue;

                try {
                  const parsed = JSON.parse(jsonStr);
                  const candidate = parsed.candidates?.[0];
                  const textChunk = candidate?.content?.parts?.[0]?.text;

                  if (textChunk) {
                    if (!firstTokenTimestamp) {
                      firstTokenTimestamp = Date.now();
                      const ttftMs = firstTokenTimestamp - requestStartTime;
                      sendEvent('telemetry', {
                        type: 'TTFT',
                        ttftMs,
                        model,
                        timestamp: firstTokenTimestamp,
                      });
                    }

                    fullGeneratedText += textChunk;

                    // Immediately dispatch meta event when meta-tag arrives
                    if (!metaDispatched) {
                      const metaMatch = fullGeneratedText.match(/<<<META:\s*([^>]+)>>>/i);
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

                    sendEvent('chunk', {
                      text: textChunk,
                      model,
                    });
                  }
                } catch {
                  // Partial chunk in SSE buffer; continue accumulating
                }
              }
            }

            streamSuccess = true;
            break;
          } catch (err: unknown) {
            console.warn(`[DualStream] Error streaming model ${model}:`, (err as { message?: string })?.message);
          }
        }

        if (!streamSuccess) {
          sendEvent('error', {
            message: 'All Gemini Flash models unavailable or quota exhausted. Please retry.',
          });
          controller.close();
          return;
        }

        // Parse structured output phases
        const totalDurationMs = Date.now() - requestStartTime;
        const ttftMs = firstTokenTimestamp ? firstTokenTimestamp - requestStartTime : totalDurationMs;

        const structured = parseStructuredGhostboardOutput(fullGeneratedText);

        const finalMetaRaw =
          structured.meta?.raw || `${domain} | ${level} | ${langTag}`;

        // Fallback pillars if LLM failed to produce 3 bullets
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
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
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
