/**
 * Single source of truth for plan tiers and feature access.
 * Used by UI (FeatureGate) and should be mirrored by API routes.
 */
export type Plan = "free" | "emergency" | "pro" | "lifetime";

export type Feature =
  | "copilot_text"       // live AI answers (limited on free)
  | "voice_stt"          // real-time speech recognition
  | "screenshot_ai"      // screen analysis
  | "panic_shield"
  | "mock_interview"
  | "resume_parse"
  | "unlimited_questions";

export const FREE_TRIAL_QUESTIONS = 5;

const MATRIX: Record<Plan, Feature[]> = {
  free: ["copilot_text", "voice_stt", "resume_parse"],
  emergency: ["copilot_text", "voice_stt", "resume_parse", "screenshot_ai", "unlimited_questions"],
  pro: ["copilot_text", "voice_stt", "resume_parse", "screenshot_ai", "panic_shield", "mock_interview", "unlimited_questions"],
  lifetime: ["copilot_text", "voice_stt", "resume_parse", "screenshot_ai", "panic_shield", "mock_interview", "unlimited_questions"],
};

export function normalizePlan(p?: string | null): Plan {
  return p === "emergency" || p === "pro" || p === "lifetime" ? p : "free";
}
export function can(plan: string | null | undefined, feature: Feature): boolean {
  return MATRIX[normalizePlan(plan)].includes(feature);
}
