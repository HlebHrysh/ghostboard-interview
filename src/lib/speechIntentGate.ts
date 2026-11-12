/**
 * Speech Intent Gate (Pure Zero-Latency Intelligence Module)
 *
 * Classifies spoken transcript utterances into actionable interview questions
 * versus incomplete dangling thoughts, conversational filler, or webinar chatter.
 *
 * Guarantees:
 * - 0 external dependencies.
 * - < 0.1ms execution time.
 * - Trilingual support (English, Ukrainian, Russian).
 */

export type IntentDecision = 'TRIGGER_NOW' | 'WAIT_FOR_COMPLETION' | 'IGNORE_NOISE';

export interface IntentEvaluation {
  decision: IntentDecision;
  score: number;
  normalizedQuestion: string;
  reason: string;
  recommendedWaitMs: number;
}

const NOISE_OR_GREETING_RE =
  /^(?:(?:привіт|привіт усім|добрий день|доброго дня|вітаю|алло|раз два|як чути|як мене чути|чи добре чути|зараз розшарю|секунду|угу|ага|так-так|окей|добре|дякую|hello|hi there|can you hear me|let me share|one second|uh huh|yeah|okay|thanks|здравствуйте|привет|как слышно)[\s!.,?]*)+$/i;

const STORYTELLING_FIRST_PERSON_RE =
  /(?:^|[\s.,!?])(у нашій компанії|в нашій команді|ми в компанії|ми зараз робимо|наш продукт|наш клієнт|я працюю в|сьогодні ми поговоримо|план нашої співбесіди|давайте я розповім про нас|in our company|our team builds|we are currently working on|let me tell you about our|today we will cover|в нашей компании|мы в команде|сейчас я расскажу о нас)(?:$|[\s.,!?])/i;

const DANGLING_ENDING_RE =
  /(?:^|\s)(і|та|або|але|тому|тому що|бо|якщо|коли|щоб|який|яка|яке|які|про|для|на|в|у|з|із|це все-таки|основна|наприклад|тобто|буде|будет|will be|and|or|but|because|if|when|that|which|with|for|to|in|on|of|such as|и|или|но|потому что|если|когда|чтобы|который|которая)\s*[.,…-]*$/i;

const QUESTION_OPENER_RE =
  /(?:^|[.!;]\s*)(як|чому|навіщо|що таке|що буде|у чому різниця|в чому різниця|яка різниця|як працює|як би ти|як би ви|розкажи|розкажіть|поясни|поясніть|назви|назвіть|опиши|опишіть|порівняй|спроектуй|напиши|how\b|why\b|what is\b|what are\b|what happens\b|what's the difference\b|explain\b|describe\b|tell me\b|walk me through\b|compare\b|design\b|implement\b|when would you\b|как|почему|зачем|что такое|что будет|в чем разница|расскажи|расскажите|объясни|объясните|опиши)(?:$|[\s.,!?;])/i;

const QUESTION_ANYWHERE_RE =
  /(?:^|[\s.,!?])(як ти вважаєш|як ви вважаєте|чи використовував|чи працював|чи знаєш|що думаєш про|what do you think|have you used|have you worked with|do you know|how do you handle|how does .* work|как ты думаешь|работал ли ты|использовал ли)(?:$|[\s.,!?])/i;

const TECH_TOPIC_RE =
  /(?:^|[\s.,!?])(react|next\.?js|node\.?js|typescript|javascript|python|rust|go|golang|java|c\+\+|sql|postgres|postgresql|mysql|mongodb|redis|kafka|rabbitmq|docker|kubernetes|k8s|aws|gcp|azure|ci\/cd|git|linux|rest|graphql|grpc|websocket|http|tcp|udp|dns|tls|jwt|oauth|cors|csrf|xss|ssr|csr|isr|dom|virtual dom|event loop|promise|async|thread|process|mutex|deadlock|garbage collect|memory leak|index|b-tree|acid|cap|sharding|replication|partition|load balanc|rate limit|cache|microservice|monolith|solid|oop|fp|big o|hash map|binary tree|індекс|потік|процес|пам'ят|кеш|транзакц|база даних|архітектур|алгоритм|складність)(?:$|[\s.,!?])/i;

export function evaluateSpeechIntent(
  rawTranscript: string,
  silenceMsOrContext: number | string = 350,
  contextOrSilenceMs: string | number = ''
): IntentEvaluation {
  const silenceMs =
    typeof silenceMsOrContext === 'number'
      ? silenceMsOrContext
      : typeof contextOrSilenceMs === 'number'
      ? contextOrSilenceMs
      : 350;
  const contextWindowText =
    typeof silenceMsOrContext === 'string'
      ? silenceMsOrContext
      : typeof contextOrSilenceMs === 'string'
      ? contextOrSilenceMs
      : '';

  const text = rawTranscript.replace(/\s+/g, ' ').trim();
  if (!text) {
    return { decision: 'IGNORE_NOISE', score: 0, normalizedQuestion: '', reason: 'empty', recommendedWaitMs: 0 };
  }

  const words = text.split(' ').filter(Boolean);
  const wordCount = words.length;

  // 1. Pure noise or greeting check
  if (NOISE_OR_GREETING_RE.test(text)) {
    return { decision: 'IGNORE_NOISE', score: -10, normalizedQuestion: '', reason: 'greeting_or_noise', recommendedWaitMs: 2000 };
  }

  const hasQuestionMark = text.includes('?');
  const hasQuestionOpener = QUESTION_OPENER_RE.test(text);
  const hasQuestionAnywhere = QUESTION_ANYWHERE_RE.test(text);
  const hasTechKeyword = TECH_TOPIC_RE.test(text);
  const isStorytelling = STORYTELLING_FIRST_PERSON_RE.test(text);
  const endsWithDanglingWord = DANGLING_ENDING_RE.test(text);

  let score = 0;
  if (hasQuestionMark) score += 55;
  if (hasQuestionOpener) score += 50;
  if (hasQuestionAnywhere) score += 45;
  if (hasTechKeyword) score += 25;
  if (wordCount >= 4 && wordCount <= 45) score += 10;

  // Penalties for unfinished clauses or pure company monologue
  if (endsWithDanglingWord && !hasQuestionMark) score -= 45;
  if (isStorytelling && !hasQuestionMark && !hasQuestionOpener && !hasQuestionAnywhere) score -= 50;
  if (wordCount < 2 && !hasTechKeyword) score -= 40;

  // Case A: Clear question or explicit technical prompt -> FIRE IMMEDIATELY!
  if (
    score >= 45 ||
    (hasQuestionMark && wordCount >= 2) ||
    (hasQuestionOpener && wordCount >= 3 && !endsWithDanglingWord) ||
    (hasTechKeyword && (hasQuestionOpener || hasQuestionAnywhere || hasQuestionMark))
  ) {
    const extracted = extractFocusedQuestion(text, contextWindowText);
    return {
      decision: 'TRIGGER_NOW',
      score,
      normalizedQuestion: extracted,
      reason: 'verified_question',
      recommendedWaitMs: 0,
    };
  }

  // Case B: Short standalone tech concept spoken after full pause (e.g. "Event Loop у JavaScript", "Індекси в Postgres")
  if (hasTechKeyword && wordCount >= 2 && wordCount <= 8 && !isStorytelling && !endsWithDanglingWord && silenceMs >= 650) {
    return {
      decision: 'TRIGGER_NOW',
      score: score + 25,
      normalizedQuestion: text,
      reason: 'standalone_tech_topic',
      recommendedWaitMs: 0,
    };
  }

  // Case C: Storytelling monologue or mid-sentence pause -> DO NOT CALL GEMINI YET! Wait & accumulate.
  return {
    decision: 'WAIT_FOR_COMPLETION',
    score,
    normalizedQuestion: text,
    reason: isStorytelling ? 'interviewer_storytelling' : endsWithDanglingWord ? 'dangling_clause' : 'no_question_intent_yet',
    recommendedWaitMs: endsWithDanglingWord ? 1200 : 1600,
  };
}

/**
 * If the interviewer spoke for 40 seconds telling a background story and ended with the actual question
 * in the last 1-2 sentences, extract the question plus concise context so Gemini answers the question, not the story.
 */
export function extractFocusedQuestion(latestChunk: string, rollingContext = ''): string {
  const combined = `${rollingContext} ${latestChunk}`.replace(/\s+/g, ' ').trim();
  const sentences = combined.split(/(?<=[.?!])\s+/).filter(Boolean);
  if (sentences.length <= 2) return latestChunk.trim();

  // Find the last sentence(s) that contain a question or imperative opener
  for (let i = sentences.length - 1; i >= Math.max(0, sentences.length - 3); i--) {
    const s = sentences[i];
    if (s.includes('?') || QUESTION_OPENER_RE.test(s) || QUESTION_ANYWHERE_RE.test(s)) {
      const prefixContext = sentences.slice(Math.max(0, i - 1), i).join(' ');
      return prefixContext ? `${prefixContext} ${sentences.slice(i).join(' ')}`.trim() : sentences.slice(i).join(' ').trim();
    }
  }
  return latestChunk.trim();
}

// ---------------------------------------------------------------------------
// Backward-compatible helpers for existing callers and test suites
// ---------------------------------------------------------------------------

export interface SpeechIntentClassification {
  isActionable: boolean;
  intent: 'question' | 'filler' | 'dangling' | 'statement';
  confidence: number;
}

const CONVERSATIONAL_FILLER = new Set([
  'uh', 'um', 'ah', 'er', 'hmm', 'yeah', 'yes', 'yep', 'nope', 'no', 'okay', 'ok',
  'right', 'cool', 'sure', 'fine', 'got it', 'i see', 'makes sense',
  'ну', 'е-е', 'ем', 'гм', 'ага', 'угу', 'так', 'ні', 'ясно', 'зрозуміло', 'добре',
  'гаразд', 'точно', 'звісно',
  'ну', 'эм', 'хм', 'ага', 'угу', 'да', 'нет', 'ясно', 'понятно', 'хорошо', 'ладно',
]);

const DANGLING_CONJUNCTIONS = new Set([
  'and', 'or', 'but', 'because', 'so', 'although', 'though', 'while', 'if', 'when',
  'then', 'that', 'which', 'where', 'like', 'such as',
  'і', 'й', 'та', 'але', 'чи', 'або', 'тому що', 'бо', 'якщо', 'коли', 'хоча', 'що',
  'який', 'де', 'як-от',
  'и', 'а', 'но', 'или', 'потому что', 'так как', 'если', 'когда', 'хотя', 'что',
  'который', 'где',
]);

const QUESTION_STARTERS = new Set([
  'how', 'what', 'why', 'when', 'where', 'which', 'who', 'can', 'could', 'would',
  'should', 'is', 'are', 'do', 'does', 'did', 'explain', 'describe', 'tell', 'walk',
  'як', 'що', 'чому', 'коли', 'де', 'який', 'хто', 'чи', 'поясніть', 'розкажіть', 'опишіть',
  'как', 'что', 'почему', 'зачем', 'когда', 'где', 'какой', 'кто', 'объясните', 'расскажите', 'опишите',
]);

function cleanSpeech(raw: string): string {
  return (raw || '').trim().toLowerCase().replace(/[.,!?;:()[\]{}"'`~–—]+/g, ' ').replace(/\s+/g, ' ').trim();
}

export function isFillerOrBanter(text: string): boolean {
  const raw = (text || '').trim();
  if (!raw) return true;
  if (NOISE_OR_GREETING_RE.test(raw)) return true;

  const cleaned = cleanSpeech(raw);
  if (!cleaned) return true;
  if (CONVERSATIONAL_FILLER.has(cleaned)) return true;

  const words = cleaned.split(' ');
  if (words.length <= 2 && words.every((w) => CONVERSATIONAL_FILLER.has(w))) {
    return true;
  }
  return false;
}

export function isDanglingThought(text: string): boolean {
  const cleaned = cleanSpeech(text);
  if (!cleaned) return false;

  const words = cleaned.split(' ');
  const lastWord = words[words.length - 1];
  const lastTwo = words.slice(-2).join(' ');

  if (DANGLING_CONJUNCTIONS.has(lastWord) || DANGLING_CONJUNCTIONS.has(lastTwo)) {
    return true;
  }
  return DANGLING_ENDING_RE.test(text);
}

export function isActionableIntent(text: string): boolean {
  const raw = (text || '').trim();
  if (raw.length < 3) return false;
  if (isFillerOrBanter(raw)) return false;
  if (isDanglingThought(raw)) return false;

  if (raw.includes('?')) return true;

  const cleaned = cleanSpeech(raw);
  const words = cleaned.split(' ');

  if (words.length > 0 && QUESTION_STARTERS.has(words[0])) {
    return true;
  }

  if (words.length >= 2) {
    const twoWordStarter = `${words[0]} ${words[1]}`;
    if (twoWordStarter === 'tell me' || twoWordStarter === 'walk through' || twoWordStarter === 'can you') {
      return true;
    }
  }

  return words.length >= 4;
}

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

