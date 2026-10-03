import { NextRequest } from 'next/server';
import { interviewSyncStore } from '@/lib/interviewSyncStore';
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
    req.headers.get('x-ghostboard-client') ||
    req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');

  const user = token ? await getSessionUser(token) : null;
  if (!user) {
    return new Response('Unauthorized', { status: 401 });
  }

  const userId = user.id;
  interviewSyncStore.registerDevice(deviceType, true, userId);

  let lastSentUpdate = 0;
  let lastFrozenState = false;
  let lastPanicState = false;

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      // Send initial latest state
      const initial = interviewSyncStore.getState(userId);
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

      // Interval polling loop pushing SSE updates (300ms for high responsiveness)
      const interval = setInterval(() => {
        try {
          const state = interviewSyncStore.getState(userId);

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
          interviewSyncStore.registerDevice(deviceType, false, userId);
          try { controller.close(); } catch {}
        }
      }, 300);

      req.signal.addEventListener('abort', () => {
        clearInterval(interval);
        interviewSyncStore.registerDevice(deviceType, false, userId);
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
