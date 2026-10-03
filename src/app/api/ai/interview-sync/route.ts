import { NextRequest, NextResponse } from 'next/server';
import { interviewSyncStore } from '@/lib/interviewSyncStore';
import { getSessionUser } from '@/lib/serverDb';
import { checkRateLimit } from '@/lib/rateLimit';
import fs from 'fs';

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
    req.headers.get('x-ghostboard-client') ||
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
  const state = interviewSyncStore.getState(userId);

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
    const { searchParams } = new URL(req.url);
    const token =
      searchParams.get('token') ||
      req.cookies.get('ghostboard_session')?.value ||
      req.headers.get('x-ghostboard-client') ||
      req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');

    let userId: string | undefined = undefined;
    if (token) {
      const user = await getSessionUser(token);
      if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      userId = user.id;
    } else {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limit writes: max 120 per minute
    const rateLimit = await checkRateLimit(req, 120, 60000, 'interview_sync');
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    const body = await req.json().catch(() => ({}));
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

    if (action === 'SYNC_ALL' && Array.isArray(qas)) {
      interviewSyncStore.syncAll(qas, isCapturing, sessionDuration, activeId, sttStatus, userId);
    } else if (action === 'ADD_OR_UPDATE_QA' && qa) {
      interviewSyncStore.addOrUpdateQA(qa, activeId, userId);
    } else if (action === 'SELECT_QA' && activeId) {
      interviewSyncStore.setActiveId(activeId, userId);
    } else if (action === 'SET_OUTPUT_LANGUAGE' && outputLanguage) {
      interviewSyncStore.setOutputLanguage(outputLanguage, userId);
    } else if (action === 'SET_SPEECH_LANGUAGE' && speechLanguage) {
      interviewSyncStore.setSpeechLanguage(speechLanguage, userId);
    } else if (action === 'SET_NATIVE_LANGUAGE' && nativeLanguage) {
      interviewSyncStore.setNativeLanguage(nativeLanguage, userId);
    } else if (action === 'SET_FREEZE' || action === 'FREEZE_TOGGLE') {
      interviewSyncStore.setFrozen(typeof isFrozen === 'boolean' ? isFrozen : true, userId);
    } else if (action === 'SET_PANIC' || action === 'PANIC_TOGGLE') {
      interviewSyncStore.setPanic(typeof isPanic === 'boolean' ? isPanic : true, userId);
    } else if (action === 'REGISTER_DEVICE' && device) {
      interviewSyncStore.registerDevice(device, typeof active === 'boolean' ? active : true, userId);
    } else if (action === 'SET_STT_STATUS' && sttStatus) {
      interviewSyncStore.setSttStatus(sttStatus, userId);
    } else if (action === 'LIVE_TRANSCRIPT' && typeof text === 'string') {
      interviewSyncStore.setLiveTranscript(text, userId);
    } else if (action === 'STATUS' && typeof isCapturing === 'boolean') {
      interviewSyncStore.setCapturingStatus(isCapturing, userId);
    } else if (action === 'LOG' && typeof text === 'string') {
      try {
        const logPath = '/tmp/ghostboard_stt.log';
        if (fs.existsSync(logPath)) {
          const stats = fs.statSync(logPath);
          if (stats.size > 2 * 1024 * 1024) {
            fs.writeFileSync(logPath, `[Log truncated at ${new Date().toISOString()}]\n`);
          }
        }
        const safeText = text.slice(0, 500).replace(/[\r\n]+/g, ' ');
        fs.appendFileSync(logPath, `${new Date().toISOString()} ${safeText}\n`);
      } catch {}
    } else if (action === 'CLEAR') {
      interviewSyncStore.clear(userId);
    }

    const state = interviewSyncStore.getState(userId);
    return NextResponse.json({
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
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
