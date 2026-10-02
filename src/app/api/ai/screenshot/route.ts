import { NextRequest, NextResponse } from 'next/server';
import { callGeminiWithFallback, FLASH_MODELS, getCleanGeminiKey } from '@/lib/geminiApi';
import { execSync } from 'child_process';
import fs from 'fs';
import { interviewSyncStore } from '@/lib/interviewSyncStore';
import { validateOrigin, checkRateLimit } from '@/lib/rateLimit';

// Global cache for latest screenshot analysis (shared across client sessions)
let latestScreenshotQA: any = null;
let latestScreenshotTimestamp = 0;

function captureHostScreen(): Buffer | null {
  const waylandDisplay = process.env.WAYLAND_DISPLAY || 'wayland-1';
  const xdgRuntimeDir = process.env.XDG_RUNTIME_DIR || '/run/user/1000';
  const display = process.env.DISPLAY || ':1';
  const tmpFile = '/tmp/ghostboard_screen_capture.png';

  // 1. Try Wayland with grim, scale 35% for fast capture and instant AI processing (~150-300 KB)
  try {
    execSync(`grim -s 0.35 ${tmpFile}`, {
      env: {
        ...process.env,
        WAYLAND_DISPLAY: waylandDisplay,
        XDG_RUNTIME_DIR: xdgRuntimeDir,
      },
      timeout: 6000,
    });
    if (fs.existsSync(tmpFile)) {
      const buf = fs.readFileSync(tmpFile);
      try { fs.unlinkSync(tmpFile); } catch {}
      if (buf && buf.length > 1000) return buf;
    }
  } catch (e: any) {
    console.warn('[HostScreen] grim capture failed, trying X11 import:', e.message);
  }

  // 2. Fallback X11 with import (ImageMagick) at 50% scale
  try {
    const buf = execSync("import -window root -resize 50% png:-", {
      env: { ...process.env, DISPLAY: display },
      maxBuffer: 25 * 1024 * 1024,
      timeout: 8000,
    });
    if (buf && buf.length > 1000) return buf;
  } catch (e: any) {
    console.warn('[HostScreen] import capture failed:', e.message);
  }

  return null;
}

export async function GET(req: NextRequest) {
  // Auth guard: only authenticated sessions can poll screenshot cache
  const token = req.cookies.get('ghostboard_session')?.value;
  const clientToken = req.headers.get('x-ghostboard-client');
  if (!token && !clientToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const since = Number(searchParams.get('since') || 0);

  if (latestScreenshotQA && latestScreenshotTimestamp > since) {
    return NextResponse.json({
      hasUpdate: true,
      timestamp: latestScreenshotTimestamp,
      qa: latestScreenshotQA,
    });
  }

  return NextResponse.json({ hasUpdate: false });
}

export async function POST(req: NextRequest) {
  try {
    if (!validateOrigin(req)) {
      return NextResponse.json({ error: 'Origin mismatch' }, { status: 403 });
    }

    const rateLimit = await checkRateLimit(req, 10, 60000, 'screenshot_ai');
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: `Забагато запитів на аналіз скріншотів. Зачекайте ${rateLimit.retryAfterSec} сек.` },
        { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfterSec) } }
      );
    }

    const body = await req.json().catch(() => ({}));
    let { imageBase64, mimeType = 'image/png', locale = 'uk', outputLanguage, candidateProfile, captureHost = false, sessionMode = 'interview' } = body;

    const cleanKey = getCleanGeminiKey();
    if (!cleanKey) {
      return NextResponse.json({ error: 'GEMINI_API_KEY is not configured.' }, { status: 500 });
    }

    // Security & OOM prevention: enforce max 14MB base64 (~10MB raw image)
    if (imageBase64 && typeof imageBase64 === 'string') {
      if (imageBase64.length > 14 * 1024 * 1024) {
        return NextResponse.json(
          { error: 'Розмір зображення завеликий (максимум 10 МБ).' },
          { status: 413 }
        );
      }
    }

    // If captureHost requested or no image provided, grab the PC's actual screen via grim/import
    if (captureHost || !imageBase64) {
      const hostBuf = captureHostScreen();
      if (!hostBuf) {
        return NextResponse.json(
          { error: 'Не вдалося зробити знімок екрана на ПК через grim/import. Перевірте Wayland/X11 сесію.' },
          { status: 500 }
        );
      }
      imageBase64 = hostBuf.toString('base64');
      mimeType = 'image/png';
    }

    // Strip data URL prefix if present
    const cleanBase64 = imageBase64.replace(/^data:[^;]+;base64,/, '').trim();
    const cleanMime = (mimeType || 'image/png').split(';')[0].trim();

    const effectiveLang = outputLanguage || locale || 'uk';
    
    const LANG_DESCRIPTIONS: Record<string, string> = {
      uk: 'Ukrainian (Українською мовою). All explanations, code breakdown, bugs, improvements, hints, and deliveryTip must be strictly in Ukrainian. Keep industry-standard tech terms in English.',
      en: 'English (Clear, natural conversational Technical English at B2 level - straightforward to pronounce and speak, without over-complicated academic vocabulary). All explanations, code breakdown, bugs, improvements, hints, and deliveryTip must be strictly in English.',
      pl: 'Polish (Polski). All explanations, code breakdown, bugs, improvements, hints, and deliveryTip must be strictly in Polish. Keep industry-standard tech terms in English.',
      de: 'German (Deutsch). All explanations, code breakdown, bugs, improvements, hints, and deliveryTip must be strictly in German. Keep industry-standard tech terms in English.',
      fr: 'French (Français). All explanations, code breakdown, bugs, improvements, hints, and deliveryTip must be strictly in French. Keep industry-standard tech terms in English.',
      es: 'Spanish (Español). All explanations, code breakdown, bugs, improvements, hints, and deliveryTip must be strictly in Spanish. Keep industry-standard tech terms in English.',
      pt: 'Portuguese (Português). All explanations, code breakdown, bugs, improvements, hints, and deliveryTip must be strictly in Portuguese. Keep industry-standard tech terms in English.',
      it: 'Italian (Italiano). All explanations, code breakdown, bugs, improvements, hints, and deliveryTip must be strictly in Italian. Keep industry-standard tech terms in English.',
      cs: 'Czech (Čeština). All explanations, code breakdown, bugs, improvements, hints, and deliveryTip must be strictly in Czech. Keep industry-standard tech terms in English.',
      nl: 'Dutch (Nederlands). All explanations, code breakdown, bugs, improvements, hints, and deliveryTip must be strictly in Dutch. Keep industry-standard tech terms in English.',
    };

    const outputLangDesc = LANG_DESCRIPTIONS[effectiveLang] || LANG_DESCRIPTIONS['en'];
    const candidateRole = candidateProfile?.role || 'Python Backend Developer (FastAPI / Django)';
    const techStackStr = Array.isArray(candidateProfile?.techStack) && candidateProfile.techStack.length > 0
      ? candidateProfile.techStack.join(', ')
      : 'Python, FastAPI, Django, PostgreSQL, SQLAlchemy, Pydantic, Celery, Redis, Docker, Linux, Git';
    
    const jobDescriptionStr = candidateProfile?.jobDescription || '';
    const cvContextStr = candidateProfile?.cvContext || '';

    const personaDefinition = sessionMode === 'meeting'
      ? `You are a world-class Senior Staff Software Engineer pairing with a colleague during a live coding session, standup, or architecture review.`
      : `You are a world-class Senior Staff Software Engineer and Technical Interview Copilot.
The user is sitting in a live technical interview.`;

    const systemPrompt = `${personaDefinition} A screenshot of the PC screen has just been captured.
The screen may display:
- Code in an editor/IDE (VS Code, PyCharm, WebStorm, etc.)
- A coding challenge or LeetCode/HackerRank algorithm problem
- A terminal error traceback, logs, or debugging output
- A SQL query, database schema, or architectural diagram
- Or simply a non-technical window (empty desktop, browser tab without code)

CANDIDATE'S ROLE & STACK:
- Target Role: ${candidateRole}
- Stack: ${techStackStr}
${jobDescriptionStr ? `- JOB DESCRIPTION: ${jobDescriptionStr}` : ''}
${cvContextStr ? `- CV CONTEXT: ${cvContextStr}` : ''}

${jobDescriptionStr || cvContextStr ? 'CRITICAL MATCHING RULE: Align your code review and answers with the company requirements in the Job Description. Reference the candidate\'s CV Context to back up points where relevant.' : ''}

YOUR MISSION:
Analyze the image with technical accuracy and express it in a NATURAL, HUMAN, CONVERSATIONAL developer tone.
CRITICAL STYLE & TONE DIRECTIVE (ЖИВА МОВА, А НЕ АГРЕСИВНИЙ РОБОТ):
- DO NOT sound like an aggressive AI auditor or textbook!
- Sound like a sharp, chill senior developer looking at the screen and explaining it clearly to a peer.
- The tone should be natural, conversational tech speech in the TARGET LANGUAGE. Use standard English for industry terms.

OUTPUT LANGUAGE REQUIREMENT: ${outputLangDesc}

If code or an algorithm/technical problem is found:
1. "language": Exact language/framework (e.g. Python, FastAPI, TypeScript, PostgreSQL SQL, Go, etc.).
2. "topic": Clear 2-4 word topic (e.g. "FastAPI Celery Queue", "Binary Tree BFS", "PostgreSQL Index Scan").
3. "summary": Detailed, clear explanation of HOW THIS PROGRAM WORKS in natural human speech (what the program does, how data flows).
4. "quickAnswer": 1-2 natural, spoken sentences summarizing the core idea for the interview.
5. "lineByLine": Array of objects explaining key lines or critical blocks in plain developer terms:
   [
     {"lines": "1-5", "code": "def process_event(...):", "explanation": "What this line or block specifically does"}
   ]
6. "bugsAndFlaws": Array of realistic bugs, vulnerabilities, race conditions, unhandled exceptions, or performance issues.
7. "howToImprove": Array of practical improvements and optimizations.
8. "hints": 3 high-impact bullet points with **bold technical keywords** (Big-O, internal mechanics).
9. "codeSnippet": Clean, refactored version of the code that fixes issues.
10. "deliveryTip": How to talk about this code smoothly during the interview.

If NO code, algorithm, or technical problem is visible:
Set "codeFound": false and explain what is visible instead.

OUTPUT FORMAT:
Respond ONLY with a valid JSON object adhering strictly to this schema:
{
  "codeFound": true,
  "language": "string",
  "topic": "string",
  "summary": "string (детально як працює програма)",
  "quickAnswer": "string (1-2 речення: найголовніша суть)",
  "lineByLine": [
    {
      "lines": "рядок або діапазон",
      "code": "фрагмент коду",
      "explanation": "що робить цей рядок"
    }
  ],
  "bugsAndFlaws": [
    "string (опис знайденої помилки або потенційного ризику)"
  ],
  "howToImprove": [
    "string (як оптимізувати чи переписати краще)"
  ],
  "hints": [
    "string (теза 1 з Big-O та **термінами**)",
    "string (теза 2)",
    "string (теза 3)"
  ],
  "codeSnippet": "string (готовий виправлений код)",
  "complexity": "string (наприклад: Time: O(N), Space: O(1))",
  "deliveryTip": "string"
}

Language for output: ${outputLangDesc}.
Do not wrap JSON in backticks or markdown fences. Output pure JSON only.`;

    const preferredModels = [
      'gemini-3.5-flash-lite',
      'gemini-flash-latest',
      'gemini-3.8-flash',
    ];

    const result = await callGeminiWithFallback({
      models: preferredModels,
      contents: [
        {
          role: 'user',
          parts: [
            {
              inlineData: {
                mimeType: cleanMime,
                data: cleanBase64,
              },
            },
            {
              text: systemPrompt,
            },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.35,
      },
    });

    if (!result.ok || !result.text) {
      console.error('[Screenshot API] Gemini call failed:', result.error);
      return NextResponse.json(
        {
          error: result.error || 'Failed to analyze screenshot.',
          codeFound: false,
        },
        { status: 502 }
      );
    }

    try {
      const cleanJson = result.text.replace(/^```json\s*/i, '').replace(/\s*```$/, '').trim();
      const parsed = JSON.parse(cleanJson);

      // Save to global cache so laptop/teleprompter can fetch it
      latestScreenshotQA = {
        ...parsed,
        capturedAt: Date.now(),
      };
      latestScreenshotTimestamp = Date.now();

      // Push to unified interview sync store for multi-device live sync
      interviewSyncStore.addOrUpdateQA({
        id: `ss_${Date.now()}`,
        question: parsed.topic
          ? `📸 ${parsed.topic} ${parsed.language && parsed.language !== 'none' ? `(${parsed.language})` : ''}`
          : `📸 Аналіз коду з екрана ПК`,
        startHook: parsed.quickAnswer || parsed.summary,
        quickAnswer: parsed.quickAnswer || parsed.summary,
        hints: parsed.hints && parsed.hints.length > 0 ? parsed.hints : ['Знімок екрана ПК проаналізовано.'],
        codeSnippet: parsed.codeSnippet,
        deliveryTip: parsed.deliveryTip,
        tag: parsed.language && parsed.language !== 'none' ? `#${parsed.language.replace(/\s+/g, '')}` : '#CodeReview',
        summary: parsed.summary,
        lineByLine: parsed.lineByLine,
        bugsAndFlaws: parsed.bugsAndFlaws,
        howToImprove: parsed.howToImprove,
        complexity: parsed.complexity,
        codeFound: parsed.codeFound,
        language: parsed.language,
        timestamp: Date.now(),
      });

      return NextResponse.json({
        success: true,
        ...parsed,
      });
    } catch (parseErr) {
      console.error('[Screenshot API] Failed to parse JSON:', parseErr, result.text);
      return NextResponse.json(
        {
          codeFound: true,
          language: 'Code',
          topic: 'Аналіз скріншота',
          summary: result.text.slice(0, 500),
          quickAnswer: result.text.slice(0, 300),
          hints: ['Проаналізовано за допомогою Gemini Vision.'],
        },
        { status: 200 }
      );
    }
  } catch (err: any) {
    console.error('[Screenshot API] Fatal error:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
