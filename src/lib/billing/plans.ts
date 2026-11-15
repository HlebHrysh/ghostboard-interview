import type { Plan } from '@/lib/plans';

export type BillingProvider = 'monobank' | 'lemonsqueezy' | 'stripe' | 'sandbox';
export type BillingCurrency = 'UAH' | 'USD' | 'EUR';
export type BillingInterval = 'monthly' | 'annual' | 'one_time';
export type BillingPlanId = 'pro_monthly' | 'pro_annual' | 'lifetime';
export type TargetPaidPlan = Extract<Plan, 'pro' | 'lifetime'>;

export interface FreeTierQuotaSpec {
  sessionMinutes: number;
  aiAnswers: number;
  dailySessionsLimit: number;
}

export const FREE_TIER_QUOTAS: FreeTierQuotaSpec = {
  sessionMinutes: 15,
  aiAnswers: 5,
  dailySessionsLimit: 3,
};

export interface BillingPlanDefinition {
  id: BillingPlanId;
  targetPlan: TargetPaidPlan;
  name: string;
  nameUa: string;
  description: string;
  descriptionUa: string;
  interval: BillingInterval;
  durationDays: number | null;
  discountPercent: number;
  amountsMinor: Record<BillingCurrency, number>;
  monthlyEquivalentMinor: Record<BillingCurrency, number>;
  stripePriceEnvKey: string;
  lemonVariantEnvKey: string;
}

export const BILLING_PLANS: Record<BillingPlanId, BillingPlanDefinition> = {
  pro_monthly: {
    id: 'pro_monthly',
    targetPlan: 'pro',
    name: 'Ghostboard Pro Monthly',
    nameUa: 'Ghostboard Pro (Щомісячно)',
    description: 'Unlimited real-time AI interview copilot, stealth teleprompter, and CV battle.',
    descriptionUa: 'Безлімітний AI-копілот у реальному часі, стелс-телесуфлер і CV Battle.',
    interval: 'monthly',
    durationDays: 30,
    discountPercent: 0,
    amountsMinor: {
      USD: 1500, // $15.00
      UAH: 59900, // ₴599.00
      EUR: 1400, // €14.00
    },
    monthlyEquivalentMinor: {
      USD: 1500,
      UAH: 59900,
      EUR: 1400,
    },
    stripePriceEnvKey: 'STRIPE_PRICE_PRO_MONTHLY',
    lemonVariantEnvKey: 'LEMONSQUEEZY_VARIANT_PRO_MONTHLY',
  },
  pro_annual: {
    id: 'pro_annual',
    targetPlan: 'pro',
    name: 'Ghostboard Pro Annual',
    nameUa: 'Ghostboard Pro (Річний -20%)',
    description: 'Full Pro access billed annually with 20% discount and priority routing.',
    descriptionUa: 'Повний доступ Pro зі знижкою 20% при оплаті за рік та пріоритетним маршрутом.',
    interval: 'annual',
    durationDays: 365,
    discountPercent: 20,
    amountsMinor: {
      USD: 14400, // $144.00/yr ($12.00/mo — 20% off $180)
      UAH: 574800, // ₴5,748.00/yr (₴479/mo — ~20% off ₴7,188)
      EUR: 13440, // €134.40/yr (€11.20/mo)
    },
    monthlyEquivalentMinor: {
      USD: 1200,
      UAH: 47900,
      EUR: 1120,
    },
    stripePriceEnvKey: 'STRIPE_PRICE_PRO_ANNUAL',
    lemonVariantEnvKey: 'LEMONSQUEEZY_VARIANT_PRO_ANNUAL',
  },
  lifetime: {
    id: 'lifetime',
    targetPlan: 'lifetime',
    name: 'Ghostboard Lifetime Pass',
    nameUa: 'Ghostboard Lifetime (Назавжди)',
    description: 'One-time payment for permanent Pro access, unlimited sessions, and priority AI.',
    descriptionUa: 'Разовий платіж за довічний Pro-доступ, безлімітні сесії та пріоритетний AI.',
    interval: 'one_time',
    durationDays: null,
    discountPercent: 0,
    amountsMinor: {
      USD: 7900, // $79.00
      UAH: 319000, // ₴3,190.00
      EUR: 7400, // €74.00
    },
    monthlyEquivalentMinor: {
      USD: 7900,
      UAH: 319000,
      EUR: 7400,
    },
    stripePriceEnvKey: 'STRIPE_PRICE_LIFETIME',
    lemonVariantEnvKey: 'LEMONSQUEEZY_VARIANT_LIFETIME',
  },
};

const PLAN_ID_ALIASES: Record<string, BillingPlanId> = {
  pro: 'pro_monthly',
  pro_monthly: 'pro_monthly',
  pro_ua_monthly: 'pro_monthly',
  pro_monthly_usd: 'pro_monthly',
  pro_annual: 'pro_annual',
  pro_yearly: 'pro_annual',
  pro_ua_annual: 'pro_annual',
  pro_annual_usd: 'pro_annual',
  lifetime: 'lifetime',
  lifetime_ua: 'lifetime',
  lifetime_global: 'lifetime',
  lifetime_usd: 'lifetime',
};

export function resolveBillingPlan(
  planId?: string | null,
  interval?: BillingInterval | string | null,
): BillingPlanDefinition {
  const raw = (planId || '').trim().toLowerCase();
  if (raw && PLAN_ID_ALIASES[raw]) {
    const resolved = PLAN_ID_ALIASES[raw];
    if (resolved === 'pro_monthly' && interval === 'annual') {
      return BILLING_PLANS.pro_annual;
    }
    return BILLING_PLANS[resolved];
  }

  if (interval === 'annual') {
    return BILLING_PLANS.pro_annual;
  }
  if (interval === 'one_time') {
    return BILLING_PLANS.lifetime;
  }
  return BILLING_PLANS.pro_monthly;
}

export function normalizeCurrency(currency?: string | null): BillingCurrency {
  const upper = (currency || '').trim().toUpperCase();
  if (upper === 'UAH' || upper === 'USD' || upper === 'EUR') {
    return upper;
  }
  return 'USD';
}

export function getIso4217CurrencyCode(currency: BillingCurrency): 980 | 840 | 978 {
  switch (currency) {
    case 'UAH':
      return 980;
    case 'EUR':
      return 978;
    case 'USD':
    default:
      return 840;
  }
}

export function formatMoney(minorUnits: number, currency: BillingCurrency): string {
  const major = minorUnits / 100;
  const formatted = Number.isInteger(major)
    ? major.toLocaleString('en-US')
    : major.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  switch (currency) {
    case 'UAH':
      return `₴${formatted}`;
    case 'EUR':
      return `€${formatted}`;
    case 'USD':
    default:
      return `$${formatted}`;
  }
}

/**
 * Rough FX normalization used solely for SaaS analytics rollups (MRR in USD cents).
 * Real charges and refunds always execute in the transaction's native minor currency.
 */
export function convertMinorToUsdCents(amountMinor: number, currency: BillingCurrency): number {
  if (currency === 'USD') return amountMinor;
  if (currency === 'UAH') return Math.round(amountMinor / 41.5);
  if (currency === 'EUR') return Math.round(amountMinor * 1.08);
  return amountMinor;
}

export function computePlanExpiration(plan: BillingPlanDefinition, fromDate = new Date()): string | null {
  if (plan.targetPlan === 'lifetime' || plan.durationDays === null) {
    return null;
  }
  return new Date(fromDate.getTime() + plan.durationDays * 86_400_000).toISOString();
}
