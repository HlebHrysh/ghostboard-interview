import { NextRequest, NextResponse } from 'next/server';
import {
  getSessionUser,
  getUserByEmail,
  createUser,
  createSession,
  updateUserPlan,
  resetUserTrialQuestions,
  logPayment,
  rawPrisma,
  isDbCircuitBroken,
} from '@/lib/serverDb';
import { isMemoryDbAllowed } from '@/lib/envGuard';
import { getCleanGeminiKey, FLASH_MODELS } from '@/lib/geminiApi';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function isQaAllowed(): boolean {
  return (
    process.env.NEXT_PUBLIC_QA_MODE === 'true' ||
    process.env.ENABLE_PROD_SIMULATOR === 'true'
  );
}

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

/**
 * GET /api/qa/control
 * Real-Time Health & Infrastructure Probe
 */
export async function GET(req: NextRequest) {
  if (!isQaAllowed()) {
    return NextResponse.json(
      { error: 'QA Sandbox is disabled in this environment', code: 'QA_DISABLED' },
      { status: 403 }
    );
  }

  // Execute User session probe, DB latency probe, and Redis probe concurrently
  const [currentUser, dbProbe, redisProbe] = await Promise.all([
    // 1. Current Authenticated User
    (async () => {
      let token = req.cookies.get('ghostboard_session')?.value;
      const authHeader = req.headers.get('authorization');
      if (!token && authHeader?.startsWith('Bearer ')) {
        token = authHeader.substring(7).trim();
      }
      if (!token) return null;
      try {
        const user = await getSessionUser(token);
        if (!user) return null;
        return {
          id: user.id,
          email: user.email,
          name: user.name ?? null,
          plan: user.plan,
          role: user.role ?? null,
          trialQuestionsUsed: user.trialQuestionsUsed || 0,
        };
      } catch {
        return null;
      }
    })(),

    // 2. Database Health & Latency Probe
    (async () => {
      let dbStatus: 'connected' | 'fallback_memory' | 'circuit_broken' | 'error' = 'error';
      let dbLatencyMs: number | null = null;
      const dbStart = performance.now();
      try {
        if (isDbCircuitBroken()) {
          dbStatus = 'circuit_broken';
          dbLatencyMs = Math.round(performance.now() - dbStart);
        } else if (process.env.DATABASE_URL) {
          await Promise.race([
            rawPrisma.$queryRaw`SELECT 1 as alive`,
            new Promise((_, reject) => setTimeout(() => reject(new Error('DB Timeout')), 800)),
          ]);
          dbLatencyMs = Math.round(performance.now() - dbStart);
          dbStatus = 'connected';
        } else {
          dbStatus = isMemoryDbAllowed() ? 'fallback_memory' : 'error';
        }
      } catch {
        dbLatencyMs = Math.round(performance.now() - dbStart);
        dbStatus = isMemoryDbAllowed() ? 'fallback_memory' : 'error';
      }
      return {
        status: dbStatus,
        latencyMs: dbLatencyMs,
        engine: (process.env.DATABASE_URL ? 'postgresql' : 'in_memory') as 'postgresql' | 'in_memory',
      };
    })(),

    // 3. Upstash Redis Probe
    (async () => {
      let redisStatus: 'connected' | 'fallback_memory' | 'not_configured' | 'error' = 'not_configured';
      let redisLatencyMs: number | null = null;
      const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
      const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

      if (redisUrl && redisToken) {
        const rStart = performance.now();
        try {
          const pingUrl = redisUrl.replace(/\/+$/, '') + '/ping';
          const rRes = await fetch(pingUrl, {
            headers: { Authorization: `Bearer ${redisToken}` },
            signal: AbortSignal.timeout(900),
          });
          redisLatencyMs = Math.round(performance.now() - rStart);
          redisStatus = rRes.ok ? 'connected' : 'error';
        } catch {
          redisLatencyMs = Math.round(performance.now() - rStart);
          redisStatus = 'fallback_memory';
        }
      } else {
        redisStatus = 'fallback_memory';
      }
      return {
        status: redisStatus,
        latencyMs: redisLatencyMs,
      };
    })(),
  ]);

  // 4. Gemini AI Probe
  const geminiKey = getCleanGeminiKey();
  const geminiConfigured = Boolean(geminiKey && geminiKey.length > 10);
  const geminiStatus = {
    configured: geminiConfigured,
    primaryModel: FLASH_MODELS[0] || 'gemini-2.5-flash',
    status: geminiConfigured ? 'healthy' : 'missing_key',
  };

  // 5. Deepgram STT Probe
  const deepgramKey = process.env.DEEPGRAM_API_KEY?.trim();
  const deepgramConfigured = Boolean(deepgramKey && deepgramKey.length > 8);

  // 6. Stripe Billing Mode
  const stripeSecret = process.env.STRIPE_SECRET_KEY?.trim();
  let stripeMode: 'live_keys' | 'test_keys' | 'simulator_active' = 'simulator_active';
  if (stripeSecret?.startsWith('sk_live_')) {
    stripeMode = 'live_keys';
  } else if (stripeSecret?.startsWith('sk_test_')) {
    stripeMode = 'test_keys';
  } else {
    stripeMode = 'simulator_active';
  }

  return NextResponse.json({
    qaMode: true,
    environment: process.env.NODE_ENV || 'development',
    timestamp: Date.now(),
    infrastructure: {
      database: dbProbe,
      redis: redisProbe,
      gemini: geminiStatus,
      deepgram: {
        configured: deepgramConfigured,
        status: deepgramConfigured ? 'ready' : 'missing_key',
      },
      stripe: {
        mode: stripeMode,
      },
    },
    currentUser,
  }, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-store, max-age=0',
    },
  });
}

/**
 * POST /api/qa/control
 * One-Click Production State Mutations
 */
export async function POST(req: NextRequest) {
  if (!isQaAllowed()) {
    return NextResponse.json(
      { error: 'QA Sandbox is disabled in this environment', code: 'QA_DISABLED' },
      { status: 403 }
    );
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { action } = body;

    let token = req.cookies.get('ghostboard_session')?.value;
    const authHeader = req.headers.get('authorization');
    if (!token && authHeader?.startsWith('Bearer ')) {
      token = authHeader.substring(7).trim();
    }

    let activeUser = token ? await getSessionUser(token) : null;

    switch (action) {
      case 'seed_test_user': {
        const testEmail = 'qa@ghostboard.ai';
        let user = await getUserByEmail(testEmail);
        if (!user) {
          user = await createUser(testEmail, 'QA Lead Engineer', 'pro');
        }
        const session = await createSession(user.id);

        const response = NextResponse.json({
          success: true,
          action: 'seed_test_user',
          user: {
            id: user.id,
            email: user.email,
            name: user.name ?? 'QA Lead Engineer',
            plan: user.plan,
            role: user.role ?? 'QA Lead',
            trialQuestionsUsed: user.trialQuestionsUsed || 0,
          },
          token: session.token,
          message: 'Real QA user seeded with active production session.',
        });

        // Set authentic cookie for browser sessions
        response.cookies.set('ghostboard_session', session.token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
          maxAge: 30 * 24 * 60 * 60,
        });

        return response;
      }

      case 'set_plan': {
        const targetPlan = body.plan;
        if (!['free', 'pro', 'lifetime', 'emergency'].includes(targetPlan)) {
          return NextResponse.json(
            { error: 'Invalid plan. Allowed: free, pro, lifetime, emergency' },
            { status: 400 }
          );
        }

        // If not logged in, seed QA user first so testing can proceed seamlessly
        let sessionTokenToSet: string | null = null;
        if (!activeUser) {
          const testEmail = 'qa@ghostboard.ai';
          let user = await getUserByEmail(testEmail);
          if (!user) {
            user = await createUser(testEmail, 'QA Lead Engineer', targetPlan);
          } else {
            await updateUserPlan(user.id, targetPlan);
            user = await getUserByEmail(testEmail);
          }
          const sess = await createSession(user!.id);
          activeUser = user;
          sessionTokenToSet = sess.token;
        } else {
          await updateUserPlan(activeUser.id, targetPlan);
          activeUser = await getSessionUser(token!);
        }

        const response = NextResponse.json({
          success: true,
          action: 'set_plan',
          plan: targetPlan,
          user: activeUser,
          message: `User plan successfully updated to ${targetPlan} in database.`,
        });

        if (sessionTokenToSet) {
          response.cookies.set('ghostboard_session', sessionTokenToSet, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: 30 * 24 * 60 * 60,
          });
        }

        return response;
      }

      case 'simulate_webhook_payment': {
        let user = activeUser;
        let sessionTokenToSet: string | null = null;

        if (!user) {
          const testEmail = 'qa@ghostboard.ai';
          let dbUser = await getUserByEmail(testEmail);
          if (!dbUser) {
            dbUser = await createUser(testEmail, 'QA Lead Engineer', 'free');
          }
          const sess = await createSession(dbUser.id);
          user = dbUser;
          sessionTokenToSet = sess.token;
        }

        const targetPlan = body.plan === 'lifetime' ? 'lifetime' : 'pro';
        const amountCents = targetPlan === 'lifetime' ? 9900 : 1500;

        // Execute real DB upgrade
        await updateUserPlan(user.id, targetPlan);

        // Execute real payment logging
        const payment = await logPayment({
          userId: user.id,
          email: user.email,
          plan: targetPlan,
          amountCents,
          status: 'succeeded',
        });

        const updatedUser = await getUserByEmail(user.email);

        const response = NextResponse.json({
          success: true,
          action: 'simulate_webhook_payment',
          upgradedPlan: targetPlan,
          user: updatedUser,
          payment,
          message: `Simulated Stripe webhook executed: user upgraded to ${targetPlan} & payment logged in DB.`,
        });

        if (sessionTokenToSet) {
          response.cookies.set('ghostboard_session', sessionTokenToSet, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: 30 * 24 * 60 * 60,
          });
        }

        return response;
      }

      case 'reset_usage': {
        if (!activeUser) {
          return NextResponse.json(
            { error: 'Unauthorized. Sign in or seed QA user first to reset usage.' },
            { status: 401 }
          );
        }

        await resetUserTrialQuestions(activeUser.id);
        const refreshedUser = await getSessionUser(token!);

        return NextResponse.json({
          success: true,
          action: 'reset_usage',
          user: refreshedUser,
          trialQuestionsUsed: 0,
          message: 'Trial questions usage counter reset to 0 in database.',
        });
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: "${action}". Valid: set_plan, simulate_webhook_payment, seed_test_user, reset_usage` },
          { status: 400 }
        );
    }
  } catch (err: unknown) {
    console.error('[/api/qa/control] Error:', err);
    return NextResponse.json(
      { error: (err as { message?: string })?.message || 'QA mutation failed' },
      { status: 500 }
    );
  }
}
