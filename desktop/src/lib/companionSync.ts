/**
 * companionSync.ts
 * Real-time companion state synchronization and mobile pairing client for Ghostboard Desktop.
 * Milestone 5: Mobile Companion Sync & Session History.
 */

import type { StructuredAnswerOutput } from './streamClient';
import type { SessionQAItem } from '../components/HistoryDrawer';

export type SyncActionType =
  | 'ADD_OR_UPDATE_QA'
  | 'STATUS'
  | 'FREEZE_TOGGLE'
  | 'PANIC_TOGGLE'
  | 'SET_FREEZE'
  | 'SET_PANIC'
  | 'LIVE_TRANSCRIPT'
  | 'CLEAR'
  | 'SYNC_ALL'
  | 'SELECT_QA';

export interface CompanionQAItem {
  id: string;
  question: string;
  startHook?: string;
  quickAnswer: string;
  nativeTranslation?: string;
  hints?: string[];
  codeSnippet?: string;
  deliveryTip?: string;
  timestamp?: number;
}

export interface InterviewSyncPayload {
  action: SyncActionType;
  qa?: CompanionQAItem;
  qas?: CompanionQAItem[];
  text?: string;
  isCapturing?: boolean;
  isFrozen?: boolean;
  isPanic?: boolean;
  activeId?: string;
  sttStatus?: string;
  device?: string;
  active?: boolean;
}

export interface PairingSessionResult {
  success: boolean;
  companionUrl: string;
  sessionId: string;
  token: string;
  expiresAt?: number;
  desktopDeepLink?: string;
  error?: string;
}

/**
 * Generate a unique session identifier
 */
export function generateSessionId(prefix = 'sess'): string {
  const ts = Date.now().toString(36);
  let rand = '';
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const bytes = new Uint8Array(6);
    crypto.getRandomValues(bytes);
    rand = Array.from(bytes, (b) => b.toString(36).padStart(2, '0')).join('').slice(0, 8);
  } else {
    rand = Math.random().toString(36).slice(2, 10);
  }
  return `${prefix}_${ts}_${rand}`;
}

/**
 * Generate a secure cryptographically randomized pairing token
 */
export function generatePairingToken(prefix = 'pair'): string {
  const ts = Date.now().toString(36);
  let rand = '';
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const bytes = new Uint8Array(8);
    crypto.getRandomValues(bytes);
    rand = Array.from(bytes, (b) => b.toString(36).padStart(2, '0')).join('').slice(0, 12);
  } else {
    rand = Math.random().toString(36).slice(2, 14);
  }
  return `${prefix}_${ts}_${rand}`;
}

/**
 * Format the full mobile companion URL pointing to ${serverBaseUrl}/companion/${sessionId}?token=${pairingToken}
 */
export function formatCompanionUrl(
  serverBaseUrl: string,
  sessionId: string,
  pairingToken?: string
): string {
  const cleanBase = (serverBaseUrl || 'http://localhost:3001').replace(/\/+$/, '');
  const cleanSessionId = encodeURIComponent(sessionId.trim());
  const token = encodeURIComponent((pairingToken || sessionId).trim());
  return `${cleanBase}/companion/${cleanSessionId}?token=${token}`;
}

/**
 * Validate and format sync payload for dispatching to /api/ai/interview-sync
 */
export function formatSyncPayload(
  action: SyncActionType,
  data: Partial<InterviewSyncPayload> = {}
): InterviewSyncPayload {
  const payload: InterviewSyncPayload = {
    action,
    ...data,
  };

  if (action === 'FREEZE_TOGGLE' && typeof payload.isFrozen !== 'boolean') {
    payload.isFrozen = true;
  }
  if (action === 'PANIC_TOGGLE' && typeof payload.isPanic !== 'boolean') {
    payload.isPanic = true;
  }

  return payload;
}

/**
 * Convert desktop structured answer to CompanionQAItem schema expected by mobile companion
 */
export function convertStructuredAnswerToCompanionQA(
  question: string,
  answer: StructuredAnswerOutput | null,
  id?: string
): CompanionQAItem {
  const qaId = id || `qa_${Date.now()}`;
  if (!answer) {
    return {
      id: qaId,
      question,
      startHook: '',
      quickAnswer: 'Формулюю відповідь...',
      hints: [],
      timestamp: Date.now(),
    };
  }

  return {
    id: qaId,
    question,
    startHook: answer.hook,
    quickAnswer: answer.hook || (answer.pillars?.[0] ?? 'Аналізую запитання...'),
    hints: answer.pillars || [],
    codeSnippet: answer.deepDive,
    timestamp: Date.now(),
  };
}

/**
 * Format a single QA item into clean Markdown text for 1-click clipboard copying
 */
export function formatSingleQAClipboardText(
  item: SessionQAItem | { question: string; answer: StructuredAnswerOutput }
): string {
  let md = `### ${item.question}\n\n`;

  if (item.answer.hook) {
    md += `> **Spoken Hook:**\n> "${item.answer.hook}"\n\n`;
  }

  if (item.answer.pillars && item.answer.pillars.length > 0) {
    md += `**Ключові тези:**\n`;
    item.answer.pillars.forEach((p) => {
      md += `- ${p}\n`;
    });
    md += `\n`;
  }

  if (item.answer.deepDive) {
    md += `**Технічний аналіз та реалізація:**\n\n${item.answer.deepDive}\n`;
  }

  return md.trim();
}

/**
 * Format entire interview session history into complete Markdown debrief
 */
export function formatMarkdownExport(
  sessionTitle: string,
  items: SessionQAItem[]
): string {
  const dateStr = new Date().toLocaleDateString('uk-UA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  let md = `# Звіт Технічної Співбесіди — Ghostboard AI\n\n`;
  md += `**Дата:** ${dateStr}  \n`;
  md += `**Сесія:** ${sessionTitle}  \n`;
  md += `**Кількість запитань:** ${items.length}  \n\n`;
  md += `---\n\n`;

  md += `## 1. Запитання та Сформульовані Відповіді\n\n`;

  items.forEach((item, idx) => {
    md += `### ${idx + 1}. ${item.question}\n\n`;
    if (item.answer.hook) {
      md += `> **Головна теза (Spoken Hook):**  \n> "${item.answer.hook}"\n\n`;
    }

    if (item.answer.pillars && item.answer.pillars.length > 0) {
      md += `**Ключові архітектурні опори:**\n`;
      item.answer.pillars.forEach((p) => {
        md += `- ${p}\n`;
      });
      md += `\n`;
    }

    if (item.answer.deepDive) {
      md += `**Технічний аналіз та реалізація:**\n\n${item.answer.deepDive}\n\n`;
    }

    md += `---\n\n`;
  });

  md += `## 2. Проект Follow-up Листа Співрозмовнику (Thank You Email)\n\n`;
  md += `\`\`\`text\n`;
  md += `Тема: Дякую за технічну співбесіду / [Ваше Ім'я]\n\n`;
  md += `Вітаю!\n\nДякую за продуктивну та цікаву технічну розмову. Було надзвичайно приємно обговорити архітектурні рішення, зокрема щодо `;
  if (items.length > 0) {
    md += `${items[0].question.slice(0, 50)}... `;
  } else {
    md += `масштабування систем та надійності. `;
  }
  md += `\n\nЗ нетерпінням очікую на зворотний зв'язок та готовий до наступних етапів!\n\nЗ повагою,\n[Ваше Ім'я]\n`;
  md += `\`\`\`\n`;

  return md;
}

/**
 * 1-click clipboard copy utility with fallback for non-secure contexts
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (!text) return false;

  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (err) {
    console.warn('[companionSync] navigator.clipboard.writeText failed, trying execCommand fallback:', err);
  }

  // Fallback for older webviews or test environments
  try {
    if (typeof document !== 'undefined') {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.left = '-9999px';
      textarea.style.top = '-9999px';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      const successful = document.execCommand('copy');
      document.body.removeChild(textarea);
      return successful;
    }
  } catch (fallbackErr) {
    console.warn('[companionSync] execCommand fallback failed:', fallbackErr);
  }

  return false;
}

/**
 * Request companion pairing token and URL from /api/companion/pair
 */
export async function requestPairingSession(
  serverBaseUrl: string,
  authToken?: string | null
): Promise<PairingSessionResult> {
  const cleanBase = (serverBaseUrl || 'http://localhost:3001').replace(/\/+$/, '');
  const url = `${cleanBase}/api/companion/pair`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-ghostboard-client': 'desktop-app',
  };
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers,
    });

    if (res.ok) {
      const data = await res.json();
      if (data.token) {
        return {
          success: true,
          companionUrl: data.companionUrl || formatCompanionUrl(cleanBase, data.token, data.token),
          sessionId: data.token,
          token: data.token,
          expiresAt: data.expiresAt,
          desktopDeepLink: data.desktopDeepLink,
        };
      }
    }
  } catch (err: any) {
    console.warn('[companionSync] Failed to fetch pairing session from server, using local fallback:', err?.message || err);
  }

  // Graceful offline/local fallback
  const sessionId = generateSessionId();
  const token = generatePairingToken();
  const companionUrl = formatCompanionUrl(cleanBase, sessionId, token);

  return {
    success: true,
    companionUrl,
    sessionId,
    token,
  };
}

/**
 * Dispatch real-time synchronization updates to /api/ai/interview-sync
 */
export async function sendCompanionSync(
  serverBaseUrl: string,
  payload: InterviewSyncPayload,
  authToken?: string | null
): Promise<boolean> {
  const cleanBase = (serverBaseUrl || 'http://localhost:3001').replace(/\/+$/, '');
  const url = `${cleanBase}/api/ai/interview-sync`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-ghostboard-client': 'desktop-app',
  };
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    return res.ok;
  } catch (err) {
    // Non-blocking catch to ensure desktop operation is never halted by companion network drops
    console.warn('[companionSync] Sync POST failed (offline/non-fatal):', err);
    return false;
  }
}

/**
 * CompanionSyncManager: handles debounced streaming sync and instant state broadcast
 */
export class CompanionSyncManager {
  private serverBaseUrl: string;
  private authToken: string | null = null;
  private streamDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  private lastStreamedPayload: InterviewSyncPayload | null = null;

  constructor(serverBaseUrl = 'http://localhost:3001', authToken: string | null = null) {
    this.serverBaseUrl = serverBaseUrl;
    this.authToken = authToken;
  }

  public setBaseUrl(url: string) {
    this.serverBaseUrl = url;
  }

  public setAuthToken(token: string | null) {
    this.authToken = token;
  }

  /**
   * Sync active QA item immediately or debounced for streaming tokens
   */
  public syncQA(
    question: string,
    answer: StructuredAnswerOutput | null,
    isFinal = false,
    id?: string
  ): void {
    const qaItem = convertStructuredAnswerToCompanionQA(question, answer, id);
    const payload = formatSyncPayload('ADD_OR_UPDATE_QA', {
      qa: qaItem,
      activeId: qaItem.id,
    });

    if (isFinal) {
      if (this.streamDebounceTimer) {
        clearTimeout(this.streamDebounceTimer);
        this.streamDebounceTimer = null;
      }
      sendCompanionSync(this.serverBaseUrl, payload, this.authToken).catch(() => {});
    } else {
      // Throttle intermediate streaming updates to max 1 every 800ms to respect rate limit
      this.lastStreamedPayload = payload;
      if (!this.streamDebounceTimer) {
        this.streamDebounceTimer = setTimeout(() => {
          this.streamDebounceTimer = null;
          if (this.lastStreamedPayload) {
            sendCompanionSync(this.serverBaseUrl, this.lastStreamedPayload, this.authToken).catch(() => {});
            this.lastStreamedPayload = null;
          }
        }, 800);
      }
    }
  }

  /**
   * Sync capture and freeze status
   */
  public syncStatus(isCapturing: boolean, isFrozen = false, isPanic = false): void {
    const payload = formatSyncPayload('STATUS', {
      isCapturing,
      isFrozen,
      isPanic,
    });
    sendCompanionSync(this.serverBaseUrl, payload, this.authToken).catch(() => {});
  }

  /**
   * Sync freeze toggle
   */
  public syncFreeze(isFrozen: boolean): void {
    const payload = formatSyncPayload('FREEZE_TOGGLE', { isFrozen });
    sendCompanionSync(this.serverBaseUrl, payload, this.authToken).catch(() => {});
  }

  /**
   * Sync panic toggle
   */
  public syncPanic(isPanic: boolean): void {
    const payload = formatSyncPayload('PANIC_TOGGLE', { isPanic });
    sendCompanionSync(this.serverBaseUrl, payload, this.authToken).catch(() => {});
  }

  /**
   * Sync live transcript
   */
  public syncLiveTranscript(text: string): void {
    const payload = formatSyncPayload('LIVE_TRANSCRIPT', { text });
    sendCompanionSync(this.serverBaseUrl, payload, this.authToken).catch(() => {});
  }

  /**
   * Clear companion session
   */
  public syncClear(): void {
    const payload = formatSyncPayload('CLEAR');
    sendCompanionSync(this.serverBaseUrl, payload, this.authToken).catch(() => {});
  }
}
