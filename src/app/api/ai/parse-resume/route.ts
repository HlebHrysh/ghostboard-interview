/**
 * AI Resume Parser route — delegates to canonical /api/resume/parse implementation
 * to prevent duplicate maintenance and code drift.
 */
export { POST } from '@/app/api/resume/parse/route';
