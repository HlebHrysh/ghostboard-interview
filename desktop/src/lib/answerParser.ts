/**
 * Teleprompter answer parsing: raw LLM stream -> render-ready structure.
 *
 * Guarantees (unit tested):
 *  - `<<<META>>>`, `<<<PHASE_n:...>>>`, `<<<END>>>` and half-received tags never reach the screen;
 *  - markdown emphasis is converted to structure (`strong` / `code` tokens) so raw `**` never shows;
 *  - plain answers without phase tags (screenshot analysis, legacy server) degrade gracefully;
 *  - `<<<IGNORE>>>` (not a question) is reported so the caller can drop the card.
 */

import { parseDualStreamDelimiters, type MetaTagInfo } from './streamClient';
export { parseDualStreamDelimiters, type MetaTagInfo };

export type InlineToken =
  | { type: 'text'; value: string }
  | { type: 'strong'; value: string }
  | { type: 'em'; value: string }
  | { type: 'code'; value: string };

export type Block =
  | { type: 'p'; tokens: InlineToken[] }
  | { type: 'li'; tokens: InlineToken[] }
  | { type: 'h'; tokens: InlineToken[] }
  | { type: 'code'; lang: string; code: string; open: boolean };

export interface ParsedAnswer {
  mode: 'phased' | 'plain';
  ignored: boolean;
  meta?: MetaTagInfo;
  hook: string;
  pillars: string[];
  deepDive: string;
  followUpTrap?: { question: string; answer: string };
  /** Cleaned full text, used for the `plain` mode and for clipboard copy. */
  plain: string;
  /** Highest phase header received so far (0 = none yet). */
  phase: 0 | 1 | 2 | 3 | 4;
}

const PHASE_TAG = /<<<\s*PHASE[-_]?[1-4]/i;

/** Removes the `[ANSWER CONTEXT ...]` and `[CONTINUATION REFINEMENT ...]` blocks appended to questions. */
export function stripQuestionContext(question: string): string {
  let q = question;
  const idx1 = q.indexOf('[ANSWER CONTEXT');
  if (idx1 >= 0) q = q.slice(0, idx1);
  const idx2 = q.indexOf('[CONTINUATION REFINEMENT');
  if (idx2 >= 0) q = q.slice(0, idx2);
  return q.trim();
}

/**
 * Strips progressive phase markers, sentinels, and partial trailing tags
 * so raw delimiter brackets never leak on screen during streaming.
 */
export function cleanStreamText(raw: string): string {
  if (!raw) return '';
  return raw
    .replace(/<<<\s*META:[^>]*>>>/gi, '')
    .replace(/<<<\s*IGNORE\s*>>>/gi, '')
    .replace(/<<<\s*PHASE[-_]?1:[A-Za-z0-9_\-]*\s*>>>/gi, '')
    .replace(/<<<\s*PHASE[-_]?[2-9]:[A-Za-z0-9_\-]*\s*>>>/gi, '\n\n')
    .replace(/<<<\s*PHASE[-_]?[A-Za-z0-9_\-:]*\s*>>>/gi, '')
    .replace(/<<<\s*END\s*>>>/gi, '')
    .replace(/\[DONE\]/gi, '')
    // Completely hide trailing partial tags (e.g. <<<PHASE_4, <<<PHASE_4:TR, <<<, <<, <)
    .replace(/(?:\r?\n|\s)*(?:<{3,}[A-Za-z0-9_:>|\s\-]*>{0,2}|<{1,2})$/i, '')
    .replace(/(?:\r?\n|\s)*\[(?:D(?:O(?:N(?:E\]?)?)?)?)?$/i, '')
    .replace(/(?:\r?\n|\s)*(?:<{3,}|>{3,})\s*$/g, '')
    .replace(/^\s+/, '')
    .replace(/\n{3,}/g, '\n\n');
}

export function parseAnswer(raw: string): ParsedAnswer {
  const text = raw ?? '';
  if (/^\s*<<<\s*IGNORE\s*>>>/i.test(text)) {
    return { mode: 'plain', ignored: true, hook: '', pillars: [], deepDive: '', plain: '', phase: 0 };
  }

  let phase: ParsedAnswer['phase'] = 0;
  if (/<<<\s*PHASE[-_]?4/i.test(text)) phase = 4;
  else if (/<<<\s*PHASE[-_]?3/i.test(text)) phase = 3;
  else if (/<<<\s*PHASE[-_]?2/i.test(text)) phase = 2;
  else if (/<<<\s*PHASE[-_]?1/i.test(text)) phase = 1;

  const plain = cleanStreamText(text).trim();

  // Parse Phase 4 Follow-Up Trap if present
  let followUpTrap: { question: string; answer: string } | undefined = undefined;
  const trapMatch = text.match(/<<<\s*PHASE[-_]?4\s*:?\s*TRAP\s*>>>([\s\S]*?)(?:<<<END>>>|\[DONE\]|$)/i);
  if (trapMatch) {
    const rawTrap = trapMatch[1].replace(/(?:\r?\n|\s)*(?:<<<END>>>|\[DONE\])\s*$/gi, '').trim();
    if (rawTrap) {
      const qMatch = rawTrap.match(/(?:^|\n)\s*(?:Q|Question)\s*:\s*([^\n]+)/i);
      const aMatch = rawTrap.match(/(?:^|\n)\s*(?:A|Answer)\s*:\s*([\s\S]+)/i);
      let question = qMatch ? qMatch[1].trim() : '';
      let answer = aMatch ? aMatch[1].trim() : '';

      if (!question && !answer && rawTrap.trim()) {
        const lines = rawTrap.split('\n').map((l) => l.trim()).filter(Boolean);
        if (lines.length > 0) question = lines[0];
        if (lines.length > 1) answer = lines.slice(1).join(' ');
      }

      if (question || answer) {
        followUpTrap = { question, answer };
      }
    }
  }

  if (!PHASE_TAG.test(text)) {
    // No phase structure (yet): treat the leading sentence(s) as the spoken hook only if a META tag
    // proved this is a structured stream; otherwise render everything as a plain body.
    const parsed = parseDualStreamDelimiters(text);
    return {
      mode: 'plain',
      ignored: false,
      meta: parsed.meta,
      hook: '',
      pillars: [],
      deepDive: '',
      followUpTrap,
      plain,
      phase,
    };
  }

  const parsed = parseDualStreamDelimiters(normalizePhaseTags(text));
  // Clean deepDive so Phase 4 tag and content never leaks into Phase 3
  const cleanDeepDive = parsed.deepDive
    .replace(/<<<\s*PHASE[-_]?4\s*:?[A-Za-z0-9_\- ]*>>>[\s\S]*/i, '')
    .trim();

  return {
    mode: 'phased',
    ignored: false,
    meta: parsed.meta,
    hook: parsed.hook,
    pillars: parsed.pillars,
    deepDive: cleanDeepDive,
    followUpTrap,
    plain,
    phase,
  };
}

/** Maps tolerant tag spellings (`PHASE-1:Hook`, `<<< PHASE_2 : PILLARS >>>`) to the canonical form. */
export function normalizePhaseTags(text: string): string {
  return text
    .replace(/<<<\s*PHASE[-_]?1\s*:?\s*[A-Za-z0-9_\- ]*>>>/gi, '<<<PHASE_1:HOOK>>>')
    .replace(/<<<\s*PHASE[-_]?2\s*:?\s*[A-Za-z0-9_\- ]*>>>/gi, '<<<PHASE_2:PILLARS>>>')
    .replace(/<<<\s*PHASE[-_]?3\s*:?\s*[A-Za-z0-9_\- ]*>>>/gi, '<<<PHASE_3:DEEP_DIVE>>>')
    .replace(/<<<\s*PHASE[-_]?4\s*:?\s*[A-Za-z0-9_\- ]*>>>/gi, '<<<PHASE_4:TRAP>>>');
}

const INLINE_RE = /\*\*([^*\n][^\n]*?)\*\*|`([^`\n]+)`|(?<![*\w])\*([^*\s][^*\n]*?)\*(?![*\w])/g;

/** Tokenizes inline markdown. Unclosed markers (mid-stream) are dropped rather than shown. */
export function tokenizeInline(src: string): InlineToken[] {
  const out: InlineToken[] = [];
  if (!src) return out;
  let last = 0;
  const pushText = (value: string) => {
    // Dangling emphasis markers from a stream that has not closed them yet must never be visible.
    const cleaned = value.replace(/\*\*/g, '').replace(/(^|\s)\*(?=\S)/g, '$1').replace(/`/g, '');
    if (cleaned) out.push({ type: 'text', value: cleaned });
  };
  for (const m of src.matchAll(INLINE_RE)) {
    const idx = m.index ?? 0;
    if (idx > last) pushText(src.slice(last, idx));
    if (m[1] !== undefined) out.push({ type: 'strong', value: m[1] });
    else if (m[2] !== undefined) out.push({ type: 'code', value: m[2] });
    else if (m[3] !== undefined) out.push({ type: 'em', value: m[3] });
    last = idx + m[0].length;
  }
  if (last < src.length) pushText(src.slice(last));
  return out;
}

/** Splits a deep-dive / plain body into code fences, bullets, headings and paragraphs. */
export function parseBlocks(src: string): Block[] {
  const blocks: Block[] = [];
  if (!src) return blocks;
  const lines = src.replace(/\r\n?/g, '\n').split('\n');
  let i = 0;
  let para: string[] = [];
  const flushPara = () => {
    if (para.length) {
      blocks.push({ type: 'p', tokens: tokenizeInline(para.join(' ').trim()) });
      para = [];
    }
  };
  while (i < lines.length) {
    const line = lines[i];
    const fence = line.match(/^\s*```\s*([\w+#.-]*)\s*$/);
    if (fence) {
      flushPara();
      const code: string[] = [];
      i++;
      let closed = false;
      while (i < lines.length) {
        if (/^\s*```\s*$/.test(lines[i])) {
          closed = true;
          i++;
          break;
        }
        code.push(lines[i]);
        i++;
      }
      blocks.push({ type: 'code', lang: fence[1] || '', code: code.join('\n'), open: !closed });
      continue;
    }
    if (!line.trim()) {
      flushPara();
    } else if (/^\s*#{1,4}\s+/.test(line)) {
      flushPara();
      blocks.push({ type: 'h', tokens: tokenizeInline(line.replace(/^\s*#{1,4}\s+/, '')) });
    } else if (/^\s*(?:[-•]|\*(?=\s)|\d+[.)])\s+/.test(line)) {
      flushPara();
      blocks.push({ type: 'li', tokens: tokenizeInline(line.replace(/^\s*(?:[-•*]|\d+[.)])\s+/, '')) });
    } else {
      para.push(line.trim());
    }
    i++;
  }
  flushPara();
  return blocks.filter((b) => (b.type === 'code' ? b.code.length > 0 || b.open : b.tokens.length > 0));
}

/** Concatenated code of every fenced block (for the 1-click Copy button). */
export function extractCode(deepDive: string): string {
  return parseBlocks(deepDive)
    .filter((b): b is Extract<Block, { type: 'code' }> => b.type === 'code')
    .map((b) => b.code)
    .join('\n\n')
    .trim();
}

/** Flattens inline tokens to plain text. */
export function tokensToText(tokens: InlineToken[]): string {
  return tokens.map((t) => t.value).join('');
}
