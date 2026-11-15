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
import {
  mergeSurgicalAnswerSlots,
  serializeMergedSlotsToTaggedStream,
  type PatchTargetSlot,
  type StructuredAnswerSlots,
} from '../../../src/lib/speculativeSlotEngine';
export {
  parseDualStreamDelimiters,
  mergeSurgicalAnswerSlots,
  serializeMergedSlotsToTaggedStream,
  type MetaTagInfo,
  type PatchTargetSlot,
  type StructuredAnswerSlots,
};

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
 * Holds unclosed trailing `<` / `<<` / `<<<...` delimiter prefixes in a short buffer
 * until `>>>` closes, guaranteeing `<<<META...>>>`, `<<<PHASE_...>>>`, and `<<<END>>>`
 * never flash on screen during token-by-token streaming.
 * Preserves valid math/code expressions (`< 1000`, `<< 2`, `vector<int>`, `<div>`).
 */
export function holdUnclosedTagBuffer(raw: string): string {
  if (!raw) return '';
  return raw
    // Complete trailing sentinels
    .replace(/(?:\r?\n|\s)*(?:<<<\s*END\s*>>>|\[DONE\])\s*$/gi, '')
    // Trailing 3+ '<' with any unclosed tag body (e.g. <<<META: Back, <<<PHASE_2:PIL, <<<END>)
    .replace(/(?:\r?\n|\s)*<{3,}\s*[A-Za-z0-9_:>|,\s\-—/]*>{0,2}$/i, '')
    // Trailing 1-2 '<' that are starting a known tag prefix (<M, <<META, <PH, <<PHASE, <E, <IG) or bare < / << at stream end
    .replace(
      /(?:\r?\n|\s)*<{1,2}\s*(?:M(?:E(?:T(?:A[^\n>]*)?)?)?|P(?:H(?:A(?:S(?:E[^\n>]*)?)?)?)?|E(?:N(?:D)?)?|I(?:G(?:N(?:O(?:R(?:E)?)?)?)?)?)?$/i,
      ''
    )
    // Trailing partial [DONE] sentinel
    .replace(/(?:\r?\n|\s)*\[(?:D(?:O(?:N(?:E\]?)?)?)?)?$/i, '')
    // Trailing dangling >>> brackets
    .replace(/(?:\r?\n|\s)*>{3,}\s*$/g, '');
}

/**
 * Strips progressive phase markers, sentinels, and partial trailing tags
 * so raw delimiter brackets never leak on screen during streaming.
 */
export function cleanStreamText(raw: string): string {
  if (!raw) return '';
  return holdUnclosedTagBuffer(raw)
    .replace(/<<<\s*META:[^>]*>>>/gi, '')
    .replace(/<<<\s*IGNORE\s*>>>/gi, '')
    .replace(/<<<\s*PHASE[-_]?1:[A-Za-z0-9_\-]*\s*>>>/gi, '')
    .replace(/<<<\s*PHASE[-_]?[2-9]:[A-Za-z0-9_\-]*\s*>>>/gi, '\n\n')
    .replace(/<<<\s*PHASE[-_]?[A-Za-z0-9_\-:]*\s*>>>/gi, '')
    .replace(/<<<\s*END\s*>>>/gi, '')
    .replace(/\[DONE\]/gi, '')
    .replace(/(?:\r?\n|\s)*(?:<{3,}|>{3,})\s*$/g, '')
    .replace(/^\s+/, '')
    .replace(/\n{3,}/g, '\n\n');
}

/**
 * Strips raw markdown `**` and dangling emphasis markers from plain string surfaces.
 */
export function stripRawMarkdownAsterisks(text: string): string {
  if (!text) return '';
  return text
    .replace(/\*\*([^*\n]+)\*\*/g, '$1')
    .replace(/\*\*/g, '')
    .replace(/(^|\s)\*(?=\S)/g, '$1');
}

/**
 * Splits text into spoken segments and parenthetical native translation hints `(підказка)`
 * for Bilingual Mode (`outputLanguage === 'bilingual'`).
 */
export function splitBilingualSegments(
  text: string,
  bilingualMode = false
): Array<{ text: string; isHint: boolean }> {
  if (!text) return [];
  // Match parentheticals containing Cyrillic characters, or any non-code parenthetical hint when bilingualMode is active
  const pattern = bilingualMode
    ? /(\([^()\n]{2,120}\))/g
    : /(\([^()\n]*[а-яіїєґА-ЯІЇЄҐёЁ][^()\n]*\))/g;

  const segments: Array<{ text: string; isHint: boolean }> = [];
  let lastIndex = 0;

  for (const match of text.matchAll(pattern)) {
    const idx = match.index ?? 0;
    if (idx > lastIndex) {
      segments.push({ text: text.slice(lastIndex, idx), isHint: false });
    }
    segments.push({ text: match[0], isHint: true });
    lastIndex = idx + match[0].length;
  }

  if (lastIndex < text.length) {
    segments.push({ text: text.slice(lastIndex), isHint: false });
  }

  return segments.length > 0 ? segments : [{ text, isHint: false }];
}

export function parseAnswer(raw: string): ParsedAnswer {
  const text = holdUnclosedTagBuffer(raw ?? '');
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
    const rawTrap = holdUnclosedTagBuffer(trapMatch[1])
      .replace(/(?:\r?\n|\s)*(?:<<<END>>>|\[DONE\])\s*$/gi, '')
      .trim();
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
        followUpTrap = {
          question: stripRawMarkdownAsterisks(question),
          answer: stripRawMarkdownAsterisks(answer),
        };
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
  const cleanDeepDive = holdUnclosedTagBuffer(parsed.deepDive)
    .replace(/<<<\s*PHASE[-_]?4\s*:?[A-Za-z0-9_\- ]*>>>[\s\S]*/i, '')
    .trim();

  return {
    mode: 'phased',
    ignored: false,
    meta: parsed.meta,
    hook: holdUnclosedTagBuffer(parsed.hook),
    pillars: parsed.pillars.map((p) => holdUnclosedTagBuffer(p)).filter(Boolean),
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

/** Converts a ParsedAnswer snapshot into StructuredAnswerSlots for surgical slot patching. */
export function parsedAnswerToSlots(parsed: ParsedAnswer): StructuredAnswerSlots {
  const hook = parsed.hook || (parsed.mode === 'plain' ? parsed.plain : '');
  return {
    meta: parsed.meta?.raw,
    hook,
    pillars: parsed.pillars || [],
    deepDive: parsed.deepDive || '',
    followUpTrap: parsed.followUpTrap,
  };
}

/**
 * Surgically merges a newly streamed tagged/partial chunk buffer into an existing raw answer string
 * without wiping untouched slots (e.g. preserving Hook & Pillars when patching Deep Dive).
 */
export function mergeRawAnswerWithSlotPatch(
  existingRaw: string,
  incomingRaw: string,
  slotMode: PatchTargetSlot
): string {
  if (slotMode === 'full') return incomingRaw;
  const existingSlots = parsedAnswerToSlots(parseAnswer(existingRaw));
  const incomingSlots = parsedAnswerToSlots(parseAnswer(incomingRaw));
  const merged = mergeSurgicalAnswerSlots(existingSlots, incomingSlots, slotMode);
  return serializeMergedSlotsToTaggedStream(merged);
}

export interface MarkdownSection {
  type: 'text' | 'code';
  content: string;
  language?: string;
  isStreaming?: boolean;
}

/**
 * Streaming-resilient markdown parser.
 * Handles unclosed code fences during active token generation without layout shift (CLS = 0)
 * and preserves explanations before and after code blocks.
 */
export function parseStreamingMarkdown(raw: string, isStreaming: boolean): MarkdownSection[] {
  if (!raw || !raw.trim()) return [];
  const sections: MarkdownSection[] = [];

  const openFenceRegex = /(?:^|(?<=\r?\n))[ \t]*(`{3,})([a-zA-Z0-9_-]*)[ \t]*(?:\r?\n|$)/g;
  let currentIndex = 0;

  while (currentIndex < raw.length) {
    openFenceRegex.lastIndex = currentIndex;
    const openMatch = openFenceRegex.exec(raw);

    if (!openMatch) {
      const remainingText = raw.slice(currentIndex).trim();
      if (remainingText) {
        sections.push({ type: 'text', content: remainingText });
      }
      break;
    }

    const beforeText = raw.slice(currentIndex, openMatch.index).trim();
    if (beforeText) {
      sections.push({ type: 'text', content: beforeText });
    }

    const fenceBackticks = openMatch[1];
    const fenceLen = fenceBackticks.length;
    const language = openMatch[2] || 'typescript';
    const matchedFull = openMatch[0];

    const hasNewline = /\r?\n$/.test(matchedFull);
    if (!hasNewline && openMatch.index + matchedFull.length >= raw.length) {
      if (isStreaming) {
        sections.push({
          type: 'code',
          language,
          content: '',
          isStreaming: true,
        });
      } else {
        const trailing = raw.slice(openMatch.index).trim();
        if (trailing) {
          sections.push({ type: 'text', content: trailing });
        }
      }
      break;
    }

    const contentStart = openMatch.index + matchedFull.length;
    const closeFenceRegex = new RegExp(
      `(?:^|(?<=\\r?\\n))[ \\t]*\`{${fenceLen},}[ \\t]*(?:\\r?\\n|$)`,
      'g'
    );
    closeFenceRegex.lastIndex = contentStart;
    const closeMatch = closeFenceRegex.exec(raw);

    if (closeMatch) {
      const codeContent = raw.slice(contentStart, closeMatch.index);
      sections.push({
        type: 'code',
        language,
        content: codeContent.trimEnd(),
        isStreaming: false,
      });
      currentIndex = closeMatch.index + closeMatch[0].length;
    } else {
      const codeContent = raw.slice(contentStart);
      sections.push({
        type: 'code',
        language,
        content: codeContent.trimEnd(),
        isStreaming: isStreaming,
      });
      break;
    }
  }

  return sections;
}
