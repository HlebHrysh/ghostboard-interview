'use client';

export type FunnelEventName =
  | 'hero_cta_download_clicked'
  | 'simulator_question_triggered'
  | 'stealth_toggle_switched'
  | 'language_switched'
  | 'pricing_plan_selected'
  | 'faq_fear_expanded';

export interface FunnelEventPayload {
  locale?: string;
  os?: string;
  target?: string;
  plan?: string;
  questionId?: string;
  mode?: 'candidate' | 'recruiter';
  [key: string]: unknown;
}

export function trackFunnelEvent(eventName: FunnelEventName, payload?: FunnelEventPayload): void {
  if (typeof window === 'undefined') return;

  const resolvedPayload = {
    eventName,
    timestamp: Date.now(),
    url: window.location.pathname,
    ...payload,
  };

  // Dispatch custom browser event for analytics integrations (PostHog, Google Analytics, Datadog)
  try {
    const customEvent = new CustomEvent('ghostboard_funnel_event', { detail: resolvedPayload });
    window.dispatchEvent(customEvent);
  } catch {
    // Ignore environments where CustomEvent fails
  }

  // Helpful development logging without spam
  if (process.env.NODE_ENV === 'development') {
    // eslint-disable-next-line no-console
    console.debug(`[CRO Telemetry] ${eventName}:`, resolvedPayload);
  }
}
