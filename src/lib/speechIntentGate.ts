/**
 * Speech Intent Gate (Pure Zero-Latency Intelligence Module)
 *
 * Classifies spoken transcript utterances into actionable interview questions
 * versus incomplete dangling thoughts, conversational filler, or webinar chatter.
 *
 * Guarantees:
 * - 0 external dependencies.
 * - < 1ms execution time.
 * - Trilingual support (English, Ukrainian, Russian).
 */

const CONVERSATIONAL_FILLER = new Set([
  // English
  'uh', 'um', 'ah', 'er', 'hmm', 'yeah', 'yes', 'yep', 'nope', 'no', 'okay', 'ok',
  'right', 'cool', 'sure', 'fine', 'got it', 'i see', 'makes sense',
  // Ukrainian
  'ну', 'е-е', 'ем', 'гм', 'ага', 'угу', 'так', 'ні', 'ясно', 'зрозуміло', 'добре',
  'гаразд', 'точно', 'звісно',
  // Russian
  'ну', 'эм', 'хм', 'ага', 'угу', 'да', 'нет', 'ясно', 'понятно', 'хорошо', 'ладно'
]);

const DANGLING_CONJUNCTIONS = new Set([
  // English
  'and', 'or', 'but', 'because', 'so', 'although', 'though', 'while', 'if', 'when',
  'then', 'that', 'which', 'where', 'like', 'such as',
  // Ukrainian
  'і', 'й', 'та', 'але', 'чи', 'або', 'тому що', 'бо', 'якщо', 'коли', 'хоча', 'що',
  'який', 'де', 'як-от',
  // Russian
  'и', 'а', 'но', 'или', 'потому что', 'так как', 'если', 'когда', 'хотя', 'что',
  'который', 'где'
]);

const QUESTION_STARTERS = new Set([
  // English
  'how', 'what', 'why', 'when', 'where', 'which', 'who', 'can', 'could', 'would',
  'should', 'is', 'are', 'do', 'does', 'did', 'explain', 'describe', 'tell', 'walk',
  // Ukrainian
  'як', 'що', 'чому', 'коли', 'де', 'який', 'хто', 'чи', 'поясніть', 'розкажіть', 'опишіть',
  // Russian
  'как', 'что', 'почему', 'зачем', 'когда', 'где', 'какой', 'кто', 'объясните', 'расскажите', 'опишите'
]);

export interface SpeechIntentClassification {
  isActionable: boolean;
  intent: 'question' | 'filler' | 'dangling' | 'statement';
  confidence: number;
}

/**
 * Normalizes speech text by stripping punctuation and trimming whitespace.
 */
function cleanSpeech(raw: string): string {
  return (raw || '').trim().toLowerCase().replace(/[.,!?;:()[\]{}"'`~–—]+/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Checks whether an utterance is purely conversational filler or short agreement banter.
 */
export function isFillerOrBanter(text: string): boolean {
  const cleaned = cleanSpeech(text);
  if (!cleaned) return true;
  if (CONVERSATIONAL_FILLER.has(cleaned)) return true;

  const words = cleaned.split(' ');
  if (words.length <= 2 && words.every((w) => CONVERSATIONAL_FILLER.has(w))) {
    return true;
  }
  return false;
}

/**
 * Checks whether an utterance is an incomplete dangling thought (ending in a conjunction).
 */
export function isDanglingThought(text: string): boolean {
  const cleaned = cleanSpeech(text);
  if (!cleaned) return false;

  const words = cleaned.split(' ');
  const lastWord = words[words.length - 1];
  const lastTwo = words.slice(-2).join(' ');

  if (DANGLING_CONJUNCTIONS.has(lastWord) || DANGLING_CONJUNCTIONS.has(lastTwo)) {
    return true;
  }
  return false;
}

/**
 * Checks whether an utterance has actionable interview intent (question or substantive prompt).
 */
export function isActionableIntent(text: string): boolean {
  const raw = (text || '').trim();
  if (raw.length < 3) return false;
  if (isFillerOrBanter(raw)) return false;
  if (isDanglingThought(raw)) return false;

  // Explicit question mark
  if (raw.includes('?')) return true;

  const cleaned = cleanSpeech(raw);
  const words = cleaned.split(' ');

  // Starts with question starter or imperative keyword
  if (words.length > 0 && QUESTION_STARTERS.has(words[0])) {
    return true;
  }

  // Two-word starter (e.g. "tell me", "walk through", "can you")
  if (words.length >= 2) {
    const twoWordStarter = `${words[0]} ${words[1]}`;
    if (twoWordStarter === 'tell me' || twoWordStarter === 'walk through' || twoWordStarter === 'can you') {
      return true;
    }
  }

  // Minimum substantive content word count
  return words.length >= 4;
}

/**
 * Full zero-latency intent classifier.
 */
export function classifySpeechIntent(text: string): SpeechIntentClassification {
  const raw = (text || '').trim();
  if (!raw || isFillerOrBanter(raw)) {
    return { isActionable: false, intent: 'filler', confidence: 0.95 };
  }

  if (isDanglingThought(raw)) {
    return { isActionable: false, intent: 'dangling', confidence: 0.9 };
  }

  const cleaned = cleanSpeech(raw);
  const words = cleaned.split(' ');
  const hasQuestionMark = raw.includes('?');
  const startsWithQuestion = words.length > 0 && QUESTION_STARTERS.has(words[0]);

  if (hasQuestionMark || startsWithQuestion) {
    return { isActionable: true, intent: 'question', confidence: 0.95 };
  }

  if (words.length >= 4) {
    return { isActionable: true, intent: 'statement', confidence: 0.85 };
  }

  return { isActionable: false, intent: 'filler', confidence: 0.7 };
}
