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
  // Auth guard: only authenticated users can read live session state
  const token = req.cookies.get('ghostboard_session')?.value;
  const clientToken = req.headers.get('x-ghostboard-client');
  if (!token && !clientToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (token) {
    const user = await getSessionUser(token);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }


  const { searchParams } = new URL(req.url);
  const since = Number(searchParams.get('since') || 0);

  const state = interviewSyncStore.getState();

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
    liveTranscript: state.liveTranscript,
    isCapturing: state.isCapturing,
    sttStatus: state.sttStatus || 'idle',
    sessionDuration: state.sessionDuration || 0,
  });
}

export async function POST(req: NextRequest) {
  try {
    // Auth guard: only authenticated users can write to live session state
    const token = req.cookies.get('ghostboard_session')?.value;
    const clientToken = req.headers.get('x-ghostboard-client');
    if (!token && !clientToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (token) {
      const user = await getSessionUser(token);
      if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limit writes: max 120 per minute (high for real-time sync, but bounded)
    const rateLimit = await checkRateLimit(req, 120, 60000, 'interview_sync');
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    const body = await req.json().catch(() => ({}));
    const { action, qa, qas, text, isCapturing, sttStatus, sessionDuration, activeId, outputLanguage, speechLanguage } = body;


    if (action === 'SYNC_ALL' && Array.isArray(qas)) {
      interviewSyncStore.syncAll(qas, isCapturing, sessionDuration, activeId, sttStatus);
    } else if (action === 'ADD_OR_UPDATE_QA' && qa) {
      interviewSyncStore.addOrUpdateQA(qa, activeId);
    } else if (action === 'SELECT_QA' && activeId) {
      interviewSyncStore.setActiveId(activeId);
    } else if (action === 'SET_OUTPUT_LANGUAGE' && outputLanguage) {
      interviewSyncStore.setOutputLanguage(outputLanguage);
    } else if (action === 'SET_SPEECH_LANGUAGE' && speechLanguage) {
      interviewSyncStore.setSpeechLanguage(speechLanguage);
    } else if (action === 'SET_STT_STATUS' && sttStatus) {
      interviewSyncStore.setSttStatus(sttStatus);
    } else if (action === 'LIVE_TRANSCRIPT' && typeof text === 'string') {
      interviewSyncStore.setLiveTranscript(text);
    } else if (action === 'STATUS' && typeof isCapturing === 'boolean') {
      interviewSyncStore.setCapturingStatus(isCapturing);
    } else if (action === 'LOG' && typeof text === 'string') {
      try {
        const logPath = '/tmp/ghostboard_stt.log';
        if (fs.existsSync(logPath)) {
          const stats = fs.statSync(logPath);
          if (stats.size > 2 * 1024 * 1024) {
            // Truncate to avoid filling disk
            fs.writeFileSync(logPath, `[Log truncated at ${new Date().toISOString()}]\n`);
          }
        }
        const safeText = text.slice(0, 500).replace(/[\r\n]+/g, ' ');
        fs.appendFileSync(logPath, `${new Date().toISOString()} ${safeText}\n`);
      } catch {}
    } else if (action === 'CLEAR') {
      interviewSyncStore.clear();
    }

    const state = interviewSyncStore.getState();
    return NextResponse.json({
      success: true,
      lastUpdated: state.lastUpdated,
      activeId: state.activeId,
      outputLanguage: state.outputLanguage,
      speechLanguage: state.speechLanguage,
      sttStatus: state.sttStatus,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
