export interface CodeBreakdownItem {
  lines?: string;
  code?: string;
  explanation: string;
}

export interface InterviewQAItem {
  id: string;
  sourceMessageId?: string;
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
  ttftMs?: number;
  isStreaming?: boolean;
  pillars?: string[];
  deepDive?: string;
  completedPillarIndices?: number[];
  activePillarIndex?: number;
  followUpTrap?: { question: string; answer: string };
  isContinuationMerged?: boolean;
  lineExplanations?: Record<number, string>;
  meta?: {
    domain: string;
    level: string;
    language: string;
    raw?: string;
  };
}
