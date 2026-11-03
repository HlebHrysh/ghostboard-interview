import { NextRequest, NextResponse } from 'next/server';
import { syncStore } from '@/lib/interviewSyncStore';
import { getSessionUser } from '@/lib/serverDb';
import { checkRateLimit } from '@/lib/rateLimit';
import { logger } from '@/lib/logger';

const log = logger.child({ component: 'interview-sync' });

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-ghostboard-client',
    },
  });
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token =
    searchParams.get('token') ||
    req.cookies.get('ghostboard_session')?.value ||
    req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');

  let userId: string | undefined = undefined;
  if (token) {
    const user = await getSessionUser(token);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    userId = user.id;
  } else {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const since = Number(searchParams.get('since') || 0);
  const state = await syncStore.getState(userId);

  if (since > 0 && state.lastUpdated <= since) {
    return NextResponse.json({ hasUpdate: false, lastUpdated: state.lastUpdated });
  }

  return NextResponse.json({
    hasUpdate: true,
    lastUpdated: state.lastUpdated,
    qas: state.qas,
    activeId: state.activeId,
    outputLanguage: state.outputLanguage || 'uk',
    speechLanguage: state.speechLanguage || 'uk',
    nativeLanguage: state.nativeLanguage || 'uk',
    liveTranscript: state.liveTranscript,
    isCapturing: state.isCapturing,
    sttStatus: state.sttStatus || 'idle',
    isFrozen: !!state.isFrozen,
    isPanic: !!state.isPanic,
    connectedDevices: state.connectedDevices || { desktop: false, web: false, phone: false },
    sessionDuration: state.sessionDuration || 0,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));

    // 1. ULTRA-FAST FAST-PATH FOR 'LOG' (e.g. Deepgram connection diagnostics):
    // Never touch database, Redis, or session auth — respond in <1ms!
    if (body.action === 'LOG') {
      return NextResponse.json({ ok: true, success: true });
    }

    const { searchParams } = new URL(req.url);
    const token =
      searchParams.get('token') ||
      req.cookies.get('ghostboard_session')?.value ||
      req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');

    const isDev = process.env.NODE_ENV !== 'production';
    const isDesktop = req.headers.get('x-ghostboard-client') === 'desktop-app';

    let userId: string = 'default';
    if (token) {
      const user = await getSessionUser(token);
      if (user) {
        userId = user.id;
      } else if (!isDev && !isDesktop) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    } else if (!isDev && !isDesktop) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limit writes: max 240 per minute (relaxed in dev)
    if (!isDev) {
      const rateLimit = await checkRateLimit(req, 240, 60000, 'interview_sync');
      if (!rateLimit.allowed) {
        return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
      }
    }

    const {
      action,
      qa,
      qas,
      text,
      isCapturing,
      sttStatus,
      sessionDuration,
      activeId,
      outputLanguage,
      speechLanguage,
      nativeLanguage,
      isFrozen,
      isPanic,
      device,
      active,
    } = body;

    // Instant in-memory mutation (< 1ms)
    if (action === 'SYNC_ALL' && Array.isArray(qas)) {
      await syncStore.syncAll(qas, isCapturing, sessionDuration, activeId, sttStatus, userId);
    } else if (action === 'ADD_OR_UPDATE_QA' && qa) {
      await syncStore.addOrUpdateQA(qa, activeId, userId);
    } else if (action === 'SELECT_QA' && activeId) {
      await syncStore.setActiveId(activeId, userId);
    } else if (action === 'SET_OUTPUT_LANGUAGE' && outputLanguage) {
      await syncStore.setOutputLanguage(outputLanguage, userId);
    } else if (action === 'SET_SPEECH_LANGUAGE' && speechLanguage) {
      await syncStore.setSpeechLanguage(speechLanguage, userId);
    } else if (action === 'SET_NATIVE_LANGUAGE' && nativeLanguage) {
      await syncStore.setNativeLanguage(nativeLanguage, userId);
    } else if (action === 'SET_FREEZE' || action === 'FREEZE_TOGGLE') {
      await syncStore.setFrozen(typeof isFrozen === 'boolean' ? isFrozen : true, userId);
    } else if (action === 'SET_PANIC' || action === 'PANIC_TOGGLE') {
      await syncStore.setPanic(typeof isPanic === 'boolean' ? isPanic : true, userId);
    } else if (action === 'REGISTER_DEVICE' && device) {
      await syncStore.registerDevice(device, typeof active === 'boolean' ? active : true, userId);
    } else if (action === 'SET_STT_STATUS' && sttStatus) {
      await syncStore.setSttStatus(sttStatus, userId);
    } else if (action === 'LIVE_TRANSCRIPT' && typeof text === 'string') {
      await syncStore.setLiveTranscript(text, userId);
    } else if (action === 'STATUS' && typeof isCapturing === 'boolean') {
      await syncStore.setCapturingStatus(isCapturing, userId);
    } else if (action === 'MAKE_CONCISE' || action === 'shorter') {
      const state = await syncStore.getState(userId);
      const active = state.qas.find((q) => q.id === (activeId || state.activeId)) || state.qas[0];
      if (active) {
        const conciseQA = {
          ...active,
          startHook: active.startHook ? active.startHook.slice(0, 160) : active.quickAnswer?.slice(0, 160),
          hints: (active.hints || []).slice(0, 2).map((h) => h.replace(/^[^:]+:\s*/, '• ')),
          deliveryTip: '⚡ Режим "Коротше": говори тільки хук і 2 тези, уникай води.',
        };
        await syncStore.addOrUpdateQA(conciseQA, conciseQA.id, userId);
      }
    } else if (action === 'SIMPLIFY' || action === 'simpler') {
      const state = await syncStore.getState(userId);
      const active = state.qas.find((q) => q.id === (activeId || state.activeId)) || state.qas[0];
      if (active) {
        const simpleQA = {
          ...active,
          quickAnswer: active.quickAnswer
            ? `Простими словами: ${active.quickAnswer.replace(/^(В основі|З точки зору|Суть:)\s*/i, '')}`
            : active.quickAnswer,
          deliveryTip: '💡 Пояснюй на побутовій аналогії, уникай важкого академічного жаргону.',
        };
        await syncStore.addOrUpdateQA(simpleQA, simpleQA.id, userId);
      }
    } else if (action === 'SHOW_CODE' || action === 'code') {
      const state = await syncStore.getState(userId);
      const active = state.qas.find((q) => q.id === (activeId || state.activeId)) || state.qas[0];
      if (active) {
        const codeQA = {
          ...active,
          deliveryTip: '💻 Акцент на код: зверни увагу на структуру алгоритму та асимптотику.',
        };
        await syncStore.addOrUpdateQA(codeQA, codeQA.id, userId);
      }
    } else if (action === 'RE_ANGLE' || action === 're_angle') {
      const state = await syncStore.getState(userId);
      const active = state.qas.find((q) => q.id === (activeId || state.activeId)) || state.qas[0];
      if (active) {
        const reAngledQA = {
          ...active,
          deliveryTip: '🔄 Інший ракурс: підійди до питання через архітектурні trade-offs та альтернативи.',
        };
        await syncStore.addOrUpdateQA(reAngledQA, reAngledQA.id, userId);
      }
    } else if (action === 'CLEAR') {
      await syncStore.clear(userId);
    }

    const state = await syncStore.getState(userId);
    return NextResponse.json({
      ok: true,
      success: true,
      lastUpdated: state.lastUpdated,
      activeId: state.activeId,
      outputLanguage: state.outputLanguage,
      speechLanguage: state.speechLanguage,
      nativeLanguage: state.nativeLanguage,
      sttStatus: state.sttStatus,
      isFrozen: !!state.isFrozen,
      isPanic: !!state.isPanic,
      connectedDevices: state.connectedDevices,
    });
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: (err as { message?: string })?.message }, { status: 500 });
  }
}
