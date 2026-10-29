/**
 * Screen analysis ("Скріншот екрана"): captures the active display natively and asks the
 * vision endpoint to explain the visible task / code. The endpoint answers with one JSON
 * document (it is not a token stream), so the HUD reveals the resulting text word by word.
 */

import { detectBackendUrl } from './apiClient';
import { captureScreen, getAccessToken } from './tauriBridge';
import type { CandidateProfile } from './profileStore';

interface ScreenshotApiResponse {
  quickAnswer?: string;
  summary?: string;
  codeSnippet?: string;
  language?: string;
  bugsAndFlaws?: string[];
  howToImprove?: string[];
  deliveryTip?: string;
  complexity?: string;
  hints?: string[];
  topic?: string;
}

export interface ScreenshotAnswer {
  title: string;
  text: string;
}

/** Turns the vision JSON into readable markdown. Pure - unit testable. */
export function formatScreenshotAnswer(data: ScreenshotApiResponse): ScreenshotAnswer | null {
  const sections: string[] = [];
  if (data.quickAnswer) sections.push(data.quickAnswer.trim());
  if (data.summary && data.summary.trim() !== data.quickAnswer?.trim()) sections.push(data.summary.trim());
  if (data.complexity) sections.push(`**Складність:** ${data.complexity}`);
  if (data.codeSnippet) {
    const lang = data.language && data.language !== 'none' ? data.language.toLowerCase() : '';
    sections.push(`\`\`\`${lang}\n${data.codeSnippet.trim()}\n\`\`\``);
  }
  if (data.bugsAndFlaws?.length) sections.push(`**Нюанси:**\n${data.bugsAndFlaws.map((b) => `• ${b}`).join('\n')}`);
  if (data.howToImprove?.length) sections.push(`**Покращення:**\n${data.howToImprove.map((b) => `• ${b}`).join('\n')}`);
  if (data.hints?.length) sections.push(data.hints.map((h) => `• ${h}`).join('\n'));
  if (data.deliveryTip) sections.push(`**Як подати:** ${data.deliveryTip}`);
  if (sections.length === 0) return null;

  const title = data.topic
    ? `[Екран] ${data.topic}${data.language && data.language !== 'none' ? ` (${data.language})` : ''}`
    : '[Екран] Аналіз знімка екрана';
  return { title, text: sections.join('\n\n') };
}

/** Captures the screen and analyzes it. Throws an Error with a user-readable message. */
export async function analyzeScreen(profile: CandidateProfile | null, signal?: AbortSignal): Promise<ScreenshotAnswer> {
  const capture = await captureScreen();
  if (!capture?.base64Png) throw new Error('Не вдалося зробити знімок екрана');

  const [baseUrl, token] = await Promise.all([detectBackendUrl(), getAccessToken()]);
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-ghostboard-client': 'desktop-app',
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  let response: Response;
  try {
    response = await fetch(`${baseUrl.replace(/\/+$/, '')}/api/ai/screenshot`, {
      method: 'POST',
      headers,
      signal,
      body: JSON.stringify({
        imageBase64: capture.base64Png,
        mimeType: 'image/png',
        locale: 'uk',
        outputLanguage: 'uk',
        sessionMode: 'interview',
        candidateProfile: profile
          ? {
              role: profile.role,
              level: profile.experienceLevel,
              primaryStack: profile.primaryStack || profile.techStack.join(', '),
              techStack: profile.techStack,
              customBio: profile.customBio,
            }
          : undefined,
      }),
    });
  } catch (err) {
    if (signal?.aborted) throw err;
    throw new Error('Немає зв’язку з сервером для аналізу екрана');
  }

  if (!response.ok) {
    throw new Error(
      response.status === 401
        ? 'Потрібен вхід: сесія Ghostboard недійсна'
        : `Аналіз екрана недоступний (${response.status})`
    );
  }
  const data = (await response.json().catch(() => null)) as ScreenshotApiResponse | null;
  const formatted = data ? formatScreenshotAnswer(data) : null;
  if (!formatted) throw new Error('ШІ не знайшов на екрані задачі чи коду');
  return formatted;
}
