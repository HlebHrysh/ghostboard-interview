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

  // Auth guard: require valid session cookie
  const token = req.cookies.get('ghostboard_session')?.value;
  const user = token ? await getSessionUser(token) : null;
  if (!user) {
    return new Response('Unauthorized', { status: 401 });
  }

  let lastSentUpdate = 0;


  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      // Send initial latest state
      const initial = interviewSyncStore.getState();
      if (initial.qas.length > 0) {
        const payload = initial.qas.find(q => q.id === initial.activeId) || initial.qas[0];
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: 'NEW_QA', payload })}\n\n`)
        );
        lastSentUpdate = initial.lastUpdated;
      }

      // Interval polling loop pushing SSE updates
      const interval = setInterval(() => {
        try {
          const state = interviewSyncStore.getState();
          if (state.lastUpdated > lastSentUpdate) {
            lastSentUpdate = state.lastUpdated;
            const activeQA = state.qas.find((q) => q.id === state.activeId) || state.qas[0];
            if (activeQA) {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: 'NEW_QA', payload: activeQA })}\n\n`)
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
                  },
                })}\n\n`
              )
            );
          }
        } catch {
          clearInterval(interval);
          try { controller.close(); } catch {}
        }
      }, 800);

      req.signal.addEventListener('abort', () => {
        clearInterval(interval);
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
