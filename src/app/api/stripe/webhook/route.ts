import { NextRequest, NextResponse } from 'next/server';
import { updateUserPlan, getUserByEmail, createUser, findOrCreateUser, createSession, logPayment } from '@/lib/serverDb';

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const sig = req.headers.get('stripe-signature');
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
    const stripeKey = process.env.STRIPE_SECRET_KEY?.trim();

    let event: any;

    // 1. Verify HMAC Signature if live Stripe credentials are provided
    if (webhookSecret && sig && stripeKey && stripeKey.startsWith('sk_')) {
      const Stripe = (await import('stripe')).default;
      const stripe = new Stripe(stripeKey);
      try {
        event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
      } catch (err: any) {
        console.error('[Stripe Webhook] Signature verification failed:', err.message);
        return NextResponse.json({ error: `Webhook signature verification failed: ${err.message}` }, { status: 400 });
      }
    } else {
      if (process.env.NODE_ENV === 'production') {
        console.error('[Stripe Webhook] Missing signature or webhook secret in production');
        return NextResponse.json({ error: 'Signature verification required in production' }, { status: 400 });
      }
      // 2. Safe JSON parser for Local Development & Test Simulator
      try {
        event = JSON.parse(rawBody);
      } catch {
        event = { type: 'unknown' };
      }
    }

    let upgradedUserId: string | null = null;
    let upgradedPlan: string | null = null;
    let newSessionToken: string | null = null;

    // 3. Handle Subscription Lifecycle Events
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data?.object || event.session;
        if (session) {
          const userId = session.client_reference_id || session.metadata?.userId;
          const userEmail = session.customer_email || session.customer_details?.email || session.metadata?.userEmail;
          const rawPlan = session.metadata?.targetPlan || session.metadata?.planId || 'pro';
          const targetPlan = rawPlan.includes('lifetime') ? 'lifetime' : 'pro';

          if (userId && !userId.startsWith('guest_')) {
            await updateUserPlan(userId, targetPlan);
            upgradedUserId = userId;
          } else if (userEmail) {
            const user = await getUserByEmail(userEmail);
            if (user) {
              await updateUserPlan(user.id, targetPlan);
              upgradedUserId = user.id;
            } else {
              const created = await createUser(userEmail, userEmail.split('@')[0], targetPlan);
              upgradedUserId = created.id;
              const sess = await createSession(created.id);
              newSessionToken = sess.token;
            }
          } else {
            // Guest instant upgrade
            const guestEmail = `customer_${Date.now().toString(36)}@ghostboard.pro`;
            const guestUser = await findOrCreateUser(guestEmail, 'Pro Candidate');
            await updateUserPlan(guestUser.id, targetPlan);
            upgradedUserId = guestUser.id;
            const sess = await createSession(guestUser.id);
            newSessionToken = sess.token;
          }

          upgradedPlan = targetPlan;
          console.log(`[Stripe Webhook] ✅ Upgraded user ${upgradedUserId} to plan: ${targetPlan}`);

          // Log payment for admin panel
          try {
            await logPayment({
              userId: upgradedUserId!,
              email: userEmail || `guest_${upgradedUserId}`,
              plan: targetPlan,
              amountCents: session.amount_total || (targetPlan === 'lifetime' ? 9900 : 1500),
              status: 'succeeded'
            });
          } catch (e) {
            console.error('Failed to log payment for admin panel', e);
          }
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data?.object;
        const customerEmail = subscription?.customer_email;
        if (customerEmail) {
          const user = await getUserByEmail(customerEmail);
          if (user) {
            await updateUserPlan(user.id, 'free');
            console.log(`[Stripe Webhook] 🔻 Downgraded user ${user.id} to free`);
          }
        }
        break;
      }

      case 'invoice.payment_succeeded': {
        console.log('[Stripe Webhook] 💰 Invoice payment succeeded');
        break;
      }

      case 'invoice.payment_failed': {
        console.warn('[Stripe Webhook] ⚠️ Invoice payment failed');
        break;
      }

      // Simulator direct trigger action — DEVELOPMENT / LOCAL ONLY
      // Blocked in production when real Stripe credentials are configured.
      case 'SIMULATE_UPGRADE': {
        // Security: refuse simulation if in production or real live Stripe secret is active
        if (process.env.NODE_ENV === 'production' || (stripeKey && stripeKey.startsWith('sk_live_'))) {
          console.warn('[Stripe Webhook] ⛔ SIMULATE_UPGRADE blocked in production');
          return NextResponse.json({ error: 'Simulation disabled in production' }, { status: 403 });
        }

        const targetPlan = event.plan === 'lifetime' ? 'lifetime' : 'pro';
        const userId = event.userId;
        const userEmail = event.email || 'guest_simulated';
        
        if (userId) {
          await updateUserPlan(userId, targetPlan).catch(() => {});
        }
        
        try {
          await logPayment({
            userId: userId || 'guest',
            email: userEmail,
            plan: targetPlan,
            amountCents: targetPlan === 'lifetime' ? 9900 : 1500,
            status: 'simulated'
          });
        } catch (e) {}
        
        upgradedPlan = targetPlan;
        break;
      }

      default:
        console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
        break;
    }

    const response = NextResponse.json({
      received: true,
      success: true,
      upgradedUserId,
      plan: upgradedPlan,
    });

    // If new session was provisioned for guest, persist cookie
    if (newSessionToken) {
      response.cookies.set('ghostboard_session', newSessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 30 * 24 * 60 * 60,
        path: '/',
      });
    }

    return response;
  } catch (err: any) {
    console.error('[Stripe Webhook] Error processing event:', err);
    return NextResponse.json({ error: err.message || 'Webhook processing failed' }, { status: 500 });
  }
}
