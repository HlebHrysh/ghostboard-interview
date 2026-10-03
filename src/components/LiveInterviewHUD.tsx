'use client';

export interface CodeBreakdownItem {
  lines?: string;
  code?: string;
  explanation: string;
}

export interface InterviewQAItem {
  id: string;
  timecode: string;
  question: string;
  quickAnswer: string | null;
  startHook?: string | null;
  nativeTranslation?: string | null;
  hints: string[];
  tag?: string;
  isPinned?: boolean;
  codeSnippet?: string;
  deliveryTip?: string;
  summary?: string;
  lineByLine?: CodeBreakdownItem[];
  bugsAndFlaws?: string[];
  howToImprove?: string[];
  complexity?: string;
  timestamp?: number;
  confidenceScore?: number;
  docReference?: string;
}

export default function LiveInterviewHUD() {
  return null;
}
