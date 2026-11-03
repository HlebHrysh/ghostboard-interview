import { NextRequest } from 'next/server';
import { syncStore, isRedisSyncConfigured } from '@/lib/interviewSyncStore';
import { getSessionUser } from '@/lib/serverDb';
import { checkRateLimit } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  // Rate limit SSE connections: max 10 per minute per IP
  const rateLimit = await checkRateLimit(req, 10, 60000, 'companion_sse');
  if (!rateLimit.allowed) {
    return new Response('Too Many Requests', {
      status: 429,
      headers: { 'Retry-After': String(rateLimit.retryAfterSec) },
    });
  }

  // Auth guard: support token via query param (QR code / mobile / desktop), cookie, or headers
  const { searchParams } = new URL(req.url);
  const deviceType = (searchParams.get('device') || 'phone') as 'phone' | 'desktop' | 'web';
  const token =
    searchParams.get('token') ||
    req.cookies.get('ghostboard_session')?.value ||
    req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');

  const user = token ? await getSessionUser(token) : null;
  if (!user) {
    return new Response('Unauthorized', { status: 401 });
  }

  const userId = user.id;
  await syncStore.registerDevice(deviceType, true, userId);

  let lastSentUpdate = 0;
  let lastFrozenState = false;
  let lastPanicState = false;

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      // Send initial latest state
      const initial = await syncStore.getState(userId);
      lastFrozenState = !!initial.isFrozen;
      lastPanicState = !!initial.isPanic;

      if (initial.qas.length > 0) {
        const payload = initial.qas.find(q => q.id === initial.activeId) || initial.qas[0];
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: 'NEW_QA', payload, isFrozen: initial.isFrozen })}\n\n`)
        );
        lastSentUpdate = initial.lastUpdated;
      }

      // Initial status
      controller.enqueue(
        encoder.encode(
          `data: ${JSON.stringify({
            type: 'STATUS',
            payload: {
              isProcessing: false,
              isCapturing: initial.isCapturing,
              sttStatus: initial.sttStatus,
              isFrozen: initial.isFrozen,
              isPanic: initial.isPanic,
              outputLanguage: initial.outputLanguage,
              nativeLanguage: initial.nativeLanguage,
            },
          })}\n\n`
        )
      );

      // Interval polling loop pushing SSE updates (300ms locally; 1s over Redis to spare the REST quota)
      const pollIntervalMs = isRedisSyncConfigured() ? 1000 : 300;
      let tickInFlight = false;
      const interval = setInterval(async () => {
        if (tickInFlight) return;
        tickInFlight = true;
        try {
          const state = await syncStore.getState(userId);

          // Push freeze state change immediately
          if (state.isFrozen !== lastFrozenState) {
            lastFrozenState = !!state.isFrozen;
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: 'FREEZE_TOGGLE', payload: { isFrozen: lastFrozenState } })}\n\n`)
            );
          }

          // Push panic state change immediately
          if (state.isPanic !== lastPanicState) {
            lastPanicState = !!state.isPanic;
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: 'PANIC_TOGGLE', payload: { isPanic: lastPanicState } })}\n\n`)
            );
          }

          if (state.lastUpdated > lastSentUpdate) {
            lastSentUpdate = state.lastUpdated;
            const activeQA = state.qas.find((q) => q.id === state.activeId) || state.qas[0];
            if (activeQA) {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: 'NEW_QA', payload: activeQA, isFrozen: state.isFrozen })}\n\n`)
              );
            }
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  type: 'STATUS',
                  payload: {
                    isProcessing: false,
                    isCapturing: state.isCapturing,
                    sttStatus: state.sttStatus,
                    isFrozen: state.isFrozen,
                    isPanic: state.isPanic,
                    outputLanguage: state.outputLanguage,
                    nativeLanguage: state.nativeLanguage,
                  },
                })}\n\n`
              )
            );
          }
        } catch {
          clearInterval(interval);
          void syncStore.registerDevice(deviceType, false, userId).catch(() => {});
          try { controller.close(); } catch {}
        } finally {
          tickInFlight = false;
        }
      }, pollIntervalMs);

      req.signal.addEventListener('abort', () => {
        clearInterval(interval);
        void syncStore.registerDevice(deviceType, false, userId).catch(() => {});
        try { controller.close(); } catch {}
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
    },
  });
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-ghostboard-client',
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const token =
      searchParams.get('token') ||
      req.cookies.get('ghostboard_session')?.value ||
      req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');

    const user = token ? await getSessionUser(token) : null;
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const userId = user.id;
    const body = await req.json().catch(() => ({}));
    const { action, activeId, isFrozen, isPanic } = body;

    const currentState = await syncStore.getState(userId);
    let updatedActiveQA = null;

    if (action === 'FREEZE_TOGGLE' || action === 'SET_FREEZE') {
      const nextFrozen = typeof isFrozen === 'boolean' ? isFrozen : !currentState.isFrozen;
      await syncStore.setFrozen(nextFrozen, userId);
    } else if (action === 'PANIC_TOGGLE' || action === 'SET_PANIC') {
      const nextPanic = typeof isPanic === 'boolean' ? isPanic : !currentState.isPanic;
      await syncStore.setPanic(nextPanic, userId);
    } else if (action === 'SELECT_QA' && activeId) {
      await syncStore.setActiveId(activeId, userId);
    } else if (action === 'MAKE_CONCISE' || action === 'shorter') {
      const active = currentState.qas.find((q) => q.id === (activeId || currentState.activeId)) || currentState.qas[0];
      if (active) {
        const conciseQA = {
          ...active,
          startHook: active.startHook ? active.startHook.slice(0, 160) : active.quickAnswer.slice(0, 160),
          hints: (active.hints || []).slice(0, 2).map((h) => h.replace(/^[^:]+:\s*/, '• ')),
          deliveryTip: '⚡ Режим "Коротше": говори тільки хук і 2 тези, уникай води.',
        };
        await syncStore.addOrUpdateQA(conciseQA, conciseQA.id, userId);
        updatedActiveQA = conciseQA;
      }
    } else if (action === 'SIMPLIFY' || action === 'simpler') {
      const active = currentState.qas.find((q) => q.id === (activeId || currentState.activeId)) || currentState.qas[0];
      if (active) {
        const simpleQA = {
          ...active,
          quickAnswer: active.quickAnswer
            ? `Простими словами: ${active.quickAnswer.replace(/^(В основі|З точки зору|Суть:)\s*/i, '')}`
            : active.quickAnswer,
          deliveryTip: '💡 Пояснюй на побутовій аналогії, уникай важкого академічного жаргону.',
        };
        await syncStore.addOrUpdateQA(simpleQA, simpleQA.id, userId);
        updatedActiveQA = simpleQA;
      }
    } else if (action === 'SHOW_CODE' || action === 'code') {
      const active = currentState.qas.find((q) => q.id === (activeId || currentState.activeId)) || currentState.qas[0];
      if (active) {
        const codeQA = {
          ...active,
          deliveryTip: '💻 Акцент на код: зверни увагу на структуру алгоритму та асимптотику.',
        };
        await syncStore.addOrUpdateQA(codeQA, codeQA.id, userId);
        updatedActiveQA = codeQA;
      }
    } else if (action === 'RE_ANGLE' || action === 're_angle') {
      const active = currentState.qas.find((q) => q.id === (activeId || currentState.activeId)) || currentState.qas[0];
      if (active) {
        const reAngledQA = {
          ...active,
          deliveryTip: '🔄 Інший ракурс: підійди до питання через архітектурні trade-offs та альтернативи.',
        };
        await syncStore.addOrUpdateQA(reAngledQA, reAngledQA.id, userId);
        updatedActiveQA = reAngledQA;
      }
    }

    const state = await syncStore.getState(userId);
    return new Response(
      JSON.stringify({
        success: true,
        action,
        activeId: state.activeId,
        isFrozen: !!state.isFrozen,
        isPanic: !!state.isPanic,
        updatedActiveQA,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (err: unknown) {
    return new Response(JSON.stringify({ error: (err as { message?: string })?.message || 'Server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
