/**
 * Tiny, dependency-free code highlighter for the teleprompter's Phase 3 block.
 * Language-agnostic on purpose (JS/TS/Go/Python/Java/Rust/SQL/shell share most surface syntax) and
 * linear-time: a single sticky-regex pass, so it is safe to re-run on every streamed chunk.
 */

export type CodeTokenKind = 'kw' | 'str' | 'com' | 'num' | 'fn' | 'type' | 'txt';

export interface CodeToken {
  kind: CodeTokenKind;
  value: string;
}

const KEYWORDS = new Set(
  (
    'const let var function return if else for while do switch case break continue new class extends implements interface type enum ' +
    'import export from default async await try catch finally throw typeof instanceof in of void null undefined true false this super static ' +
    'public private protected readonly abstract package func struct go defer chan map range select fallthrough def lambda pass raise with as ' +
    'yield None True False and or not is elif except global nonlocal fn let mut impl trait use mod pub match loop where unsafe crate self ' +
    'SELECT FROM WHERE JOIN LEFT RIGHT INNER OUTER ON GROUP BY ORDER HAVING INSERT INTO VALUES UPDATE SET DELETE CREATE TABLE INDEX LIMIT AS AND OR NOT NULL ' +
    'select from where join group order having insert into values update delete create table index limit local then end'
  ).split(' ')
);

// Order matters: comments and strings must win over operators/words that appear inside them.
const TOKEN_RE =
  /(\/\/[^\n]*|(?<![\w&$])#[^\n]*|(?<=^|\s)--\s[^\n]*|\/\*[\s\S]*?(?:\*\/|$))|("(?:\\.|[^"\\\n])*"?|'(?:\\.|[^'\\\n])*'?|`(?:\\.|[^`\\])*`?)|(\b\d[\d_]*(?:\.\d+)?\b)|([A-Za-z_$][\w$]*)/g;

export function highlightCode(code: string): CodeToken[] {
  const out: CodeToken[] = [];
  let last = 0;
  const push = (kind: CodeTokenKind, value: string) => {
    if (!value) return;
    const prev = out[out.length - 1];
    if (prev && prev.kind === kind) prev.value += value;
    else out.push({ kind, value });
  };

  for (const m of code.matchAll(TOKEN_RE)) {
    const idx = m.index ?? 0;
    if (idx > last) push('txt', code.slice(last, idx));
    if (m[1] !== undefined) {
      push('com', m[1]);
    } else if (m[2] !== undefined) push('str', m[2]);
    else if (m[3] !== undefined) push('num', m[3]);
    else if (m[4] !== undefined) {
      const word = m[4];
      const next = code[idx + word.length];
      if (KEYWORDS.has(word)) push('kw', word);
      else if (next === '(') push('fn', word);
      else if (/^[A-Z][A-Za-z0-9]*$/.test(word) && word.length > 1) push('type', word);
      else push('txt', word);
    }
    last = idx + m[0].length;
  }
  if (last < code.length) push('txt', code.slice(last));
  return out;
}

export const TOKEN_CLASS: Record<CodeTokenKind, string> = {
  kw: 'text-white font-semibold',
  str: 'text-emerald-300/90',
  com: 'text-zinc-500 italic',
  num: 'text-amber-300',
  fn: 'text-sky-300',
  type: 'text-zinc-100',
  txt: 'text-zinc-300',
};
