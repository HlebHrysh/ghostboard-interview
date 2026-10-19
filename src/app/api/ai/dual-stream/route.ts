import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSessionUser } from '@/lib/serverDb';
import { FLASH_MODELS, getCleanGeminiKey } from '@/lib/geminiApi';
import { normalizeTechnicalSpeech } from '@/lib/techSpeechNormalizer';
import { checkRateLimit, validateOrigin } from '@/lib/rateLimit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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
  directorModifier: z
    .enum(['normal', 'shorter', 'more_technical', 'code_example', 'tradeoffs'])
    .optional()
    .default('normal'),
  candidateProfile: z
    .object({
      role: z.string().optional(),
      primaryStack: z.string().optional(),
      experienceLevel: z.string().optional(),
    })
    .optional(),
  outputLanguage: z.string().optional().default('en'),
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

/**
 * Builds the high-speed system prompt enforcing 3 progressive phases:
 * Phase 1: HOOK (Spoken first sentence, T+250ms ready)
 * Phase 2: PILLARS (3 high-impact architectural bullets, T+600ms ready)
 * Phase 3: DEEP_DIVE (Code snippet or trade-offs, T+1100ms ready)
 */
function buildSystemInstruction(
  modifier: string,
  profile?: { role?: string; primaryStack?: string; experienceLevel?: string },
  lang = 'en'
): string {
  let modifierInstruction = '';
  switch (modifier) {
    case 'shorter':
      modifierInstruction = 'CRITICAL OVERRIDE: Be extremely concise. Keep the hook to 1 punchy sentence, exactly 2 short bullet points, and skip long code.';
      break;
    case 'more_technical':
      modifierInstruction = 'CRITICAL OVERRIDE: Focus heavily on low-level internals, OS memory management, kernel primitives, concurrency mechanics, and asymptotic complexity.';
      break;
    case 'code_example':
      modifierInstruction = 'CRITICAL OVERRIDE: Provide a complete, idiomatic, high-performance code snippet in Phase 3.';
      break;
    case 'tradeoffs':
      modifierInstruction = 'CRITICAL OVERRIDE: Center Phase 2 & 3 around real-world production trade-offs: latency vs throughput, consistency vs availability, memory vs CPU overhead.';
      break;
    default:
      modifierInstruction = 'Balance oral spoken fluency, crisp architectural pillars, and concrete technical depth.';
  }

  const roleContext = profile?.role
    ? `Target Role: ${profile.role}. Stack: ${profile.primaryStack || 'Modern Full-Stack'}. Seniority: ${profile.experienceLevel || 'Senior'}. Speak with genuine senior authority.`
    : 'Speak from the perspective of an elite Staff/Principal Software Engineer.';

  return `You are an ultra-low latency real-time interview teleprompter AI copilot.
Your response will be read orally aloud by the candidate during a live technical interview.

${roleContext}
${modifierInstruction}
Language: Respond in ${lang === 'uk' ? 'Ukrainian' : lang === 'ru' ? 'Russian' : 'English'}.

OUTPUT FORMATTING RULES:
You must strictly format your output into 3 clearly marked progressive phases so the client engine can parse and render them incrementally:

<<<PHASE_1:HOOK>>>
[1-2 punchy, confident spoken sentences that directly answer the core question with zero filler words. Start immediately with the key concept. The candidate will speak this sentence out loud instantly with zero hesitation.]

<<<PHASE_2:PILLARS>>>
• [Pillar 1: Key architectural mechanism or primary concept with exact technical terms]
• [Pillar 2: Concurrency, data flow, or operational behavior]
• [Pillar 3: Performance, scaling, or production resiliency consideration]

<<<PHASE_3:DEEP_DIVE>>>
[Provide either an idiomatic code snippet inside a standard markdown codeblock (\`\`\`language ... \`\`\`), OR 2-3 production trade-offs and edge cases.]

<<<END>>>

DO NOT include introductory filler like "Sure!", "Great question", or conversational pleasantries.
Begin immediately with <<<PHASE_1:HOOK>>>.`;
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
    const parseResult = DualStreamPayloadSchema.safeParse(rawBody);

    if (!parseResult.success) {
      const err = parseResult.error.issues.map((i) => i.message).join(', ');
      return NextResponse.json({ error: err }, { status: 400 });
    }

    const { question, history, directorModifier, candidateProfile, outputLanguage } =
      parseResult.data;

    const normalizedQuestion = normalizeTechnicalSpeech(question.trim());
    const apiKey = getCleanGeminiKey();

    if (!apiKey) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY is not configured on the server.' },
        { status: 500 }
      );
    }

    const systemPrompt = buildSystemInstruction(
      directorModifier,
      candidateProfile,
      outputLanguage
    );

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
      // Include last 4 turns for low prompt latency
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

        const sendEvent = (event: string, data: any) => {
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
                  temperature: 0.25,
                  topP: 0.9,
                  maxOutputTokens: directorModifier === 'shorter' ? 400 : 900,
                },
              }),
            });

            if (!geminiRes.ok) {
              const errBody = await geminiRes.text();
              console.warn(`[DualStream] Model ${model} returned ${geminiRes.status}:`, errBody);
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
                        model: model,
                        timestamp: firstTokenTimestamp,
                      });
                    }

                    fullGeneratedText += textChunk;
                    sendEvent('chunk', {
                      text: textChunk,
                      model: model,
                    });
                  }
                } catch {
                  // Partial chunk in SSE buffer; ignore and continue
                }
              }
            }

            streamSuccess = true;
            break;
          } catch (err: any) {
            console.warn(`[DualStream] Error streaming model ${model}:`, err.message);
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

        let hook = '';
        let pillars: string[] = [];
        let deepDive = '';

        const hookMatch = fullGeneratedText.match(/<<<PHASE_1:HOOK>>>([\s\S]*?)(?:<<<PHASE_2:PILLARS>>>|<<<END>>>|$)/);
        if (hookMatch) {
          hook = hookMatch[1].trim();
        }

        const pillarsMatch = fullGeneratedText.match(/<<<PHASE_2:PILLARS>>>([\s\S]*?)(?:<<<PHASE_3:DEEP_DIVE>>>|<<<END>>>|$)/);
        if (pillarsMatch) {
          pillars = pillarsMatch[1]
            .split('\n')
            .map((line) => line.replace(/^[•\-\*]\s*/, '').trim())
            .filter((line) => line.length > 0);
        }

        const deepDiveMatch = fullGeneratedText.match(/<<<PHASE_3:DEEP_DIVE>>>([\s\S]*?)(?:<<<END>>>|$)/);
        if (deepDiveMatch) {
          deepDive = deepDiveMatch[1].trim();
        }

        // Final structured completion event
        sendEvent('complete', {
          id: `ds-${Date.now()}`,
          model: activeModelUsed,
          ttftMs,
          totalDurationMs,
          rawText: fullGeneratedText,
          structured: {
            hook: hook || fullGeneratedText.slice(0, 160),
            pillars: pillars.length > 0 ? pillars : ['Direct architectural implementation.', 'High concurrency execution.', 'Zero latency overhead.'],
            deepDive: deepDive,
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
  } catch (error: any) {
    console.error('[DualStream API Error]', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
