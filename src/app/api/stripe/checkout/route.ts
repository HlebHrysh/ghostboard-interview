import { NextRequest, NextResponse } from 'next/server';
import { POST as billingCheckoutPost } from '@/app/api/billing/checkout/route';

interface PlanConfig {
  name: string;
  description: string;
  amountCents: number;
  mode: 'payment' | 'subscription';
  targetPlan: 'pro' | 'lifetime';
  interval?: 'month' | 'year';
  displayPrice: string;
}

export function getPlanConfig(
  planId: string,
  billingCycle: 'monthly' | 'annual' = 'monthly',
): PlanConfig {
  const p = planId.toLowerCase();
  if (p.includes('lifetime')) {
    return {
      name: 'Ghostboard Lifetime Pass',
      description: 'Lifetime access: AI Teleprompter & Interview Coach',
      amountCents: 7900,
      mode: 'payment',
      targetPlan: 'lifetime',
      displayPrice: '$79',
    };
  }
  if (billingCycle === 'annual' || p.includes('annual')) {
    return {
      name: 'Ghostboard Pro Pass — Annual',
      description: 'Unlimited AI teleprompter & Deepgram Nova-3 ($12/mo billed annually)',
      amountCents: 14400,
      mode: 'subscription',
      targetPlan: 'pro',
      interval: 'year',
      displayPrice: '$144/yr',
    };
  }
  return {
    name: 'Ghostboard Pro Pass — Monthly',
    description: 'Unlimited AI teleprompter & real-time interview copilot',
    amountCents: 1500,
    mode: 'subscription',
    targetPlan: 'pro',
    interval: 'month',
    displayPrice: '$15/mo',
  };
}

/**
 * Legacy compatibility wrapper — delegates all checkouts to `/api/billing/checkout`.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  return billingCheckoutPost(req);
}
