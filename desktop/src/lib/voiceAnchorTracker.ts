/**
 * Real-Time Voice Anchor Karaoke Tracker (Desktop)
 *
 * Provides sub-millisecond (<1ms) pure local matching between the candidate's
 * spoken microphone transcript and the active AI answer's PHASE_2:PILLARS bullets.
 *
 * Guarantees:
 * - 0 external runtime dependencies.
 * - < 1ms execution time per audio transcript chunk.
 * - Trilingual stem-friendly matching (Ukrainian, English, Russian).
 * - Multi-condition completion: >= 50% anchor tokens OR 3 consecutive content words.
 */

export interface PillarAnchor {
  index: number;
  anchorText: string;
  tokens: string[];
}

export interface VoiceTrackerResult {
  completedIndices: number[];
  activeIndex: number;
}

/**
 * Common conversational and filler stopwords in English, Ukrainian, and Russian.
 */
const TRACKER_STOPWORDS = new Set([
  // English
  'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from',
  'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did',
  'i', 'we', 'you', 'he', 'she', 'they', 'it', 'my', 'our', 'your', 'his', 'her', 'their', 'its',
  'this', 'that', 'these', 'those', 'as', 'if', 'so', 'than', 'too', 'very', 'just', 'also', 'well',
  'can', 'could', 'will', 'would', 'should', 'all', 'any', 'both', 'each', 'more', 'most', 'some',
  // Ukrainian
  'і', 'й', 'та', 'чи', 'або', 'але', 'не', 'ні', 'в', 'у', 'на', 'до', 'по', 'за', 'з', 'зі', 'із',
  'для', 'про', 'при', 'через', 'від', 'як', 'що', 'це', 'той', 'цей', 'ця', 'вона', 'він', 'вони',
  'ми', 'ви', 'я', 'ти', 'свій', 'своя', 'свої', 'мене', 'нас', 'вас', 'їх', 'його', 'її', 'йому',
  'їй', 'їм', 'ним', 'нею', 'також', 'вже', 'ще', 'коли', 'де', 'куди', 'чому', 'тому', 'тільки', 'лише',
  // Russian
  'и', 'или', 'но', 'да', 'не', 'ни', 'в', 'на', 'с', 'со', 'из', 'к', 'по', 'за', 'для', 'о', 'об',
  'обо', 'от', 'как', 'что', 'это', 'этот', 'эта', 'эти', 'они', 'мы', 'вы', 'он', 'она', 'оно', 'я',
  'ты', 'меня', 'нас', 'вас', 'их', 'его', 'ее', 'ему', 'ей', 'им', 'ним', 'также', 'уже', 'еще',
  'когда', 'где', 'куда', 'почему', 'только', 'лишь'
]);

/**
 * Strips punctuation and returns a clean, lowercased token.
 */
export function normalizeVoiceToken(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/^[\s*•\-–—#\d\.\),;:!?"'()[\]{}]+|[\s*•\-–—#\d\.\),;:!?"'()[\]{}]+$/g, '')
    .trim();
}

/**
 * Checks whether a word is considered a meaningful content word (non-stopword).
 */
export function isContentWord(word: string): boolean {
  const normalized = normalizeVoiceToken(word);
  return normalized.length >= 2 && !TRACKER_STOPWORDS.has(normalized);
}

/**
 * Strips grammatical inflection endings down to base stems for Slavic and English.
 */
function stripInflection(word: string): string {
  let w = normalizeVoiceToken(word);
  if (w.length < 5) return w;

  // Ukrainian / Russian inflection suffixes (ordered longest to shortest)
  const slavicSuffixes = [
    'ування', 'овання', 'іння', 'ення', 'ований', 'уваний', 'ованих', 'уваних',
    'увати', 'ювати', 'ити', 'іти', 'ати', 'яти', 'ому', 'ого', 'ими', 'ами',
    'ями', 'ою', 'ею', 'ій', 'ей', 'ів', 'ях', 'ах', 'их', 'им', 'ом', 'ем',
    'ям', 'ам', 'ий', 'ій', 'ти', 'ка', 'ки', 'ку', 'ок',
    'е', 'є', 'а', 'я', 'и', 'і', 'у', 'ю', 'м'
  ];

  for (const suf of slavicSuffixes) {
    if (w.endsWith(suf) && w.length - suf.length >= 4) {
      w = w.slice(0, -suf.length);
      break;
    }
  }

  // English inflection suffixes
  const englishSuffixes = ['tion', 'ment', 'able', 'ing', 'ed', 'es', 'er', 'est', 'ly', 's'];
  for (const suf of englishSuffixes) {
    if (w.endsWith(suf) && w.length - suf.length >= 4) {
      w = w.slice(0, -suf.length);
      break;
    }
  }

  return w;
}

/**
 * Trilingual stem-friendly token matching for Ukrainian, English, and Russian.
 * Handles grammatical inflections (e.g., "blocking" <-> "block", "блокування" <-> "блокуванням", "блокувати").
 *
 * Rules:
 * 1. Exact match (case-insensitive).
 * 2. Prefix containment for tokens >= 4 chars (e.g. "partitions" starts with "partition").
 * 3. Normalized stem equivalence after inflection stripping.
 */
export function areTokensMatching(spokenToken: string, anchorToken: string): boolean {
  const s = normalizeVoiceToken(spokenToken);
  const a = normalizeVoiceToken(anchorToken);

  if (!s || !a) return false;
  if (s === a) return true;

  const minLen = Math.min(s.length, a.length);
  if (minLen < 4) {
    return false;
  }

  // Direct prefix containment (e.g. "partitions" starts with "partition")
  if (s.startsWith(a) || a.startsWith(s)) {
    return true;
  }

  // Stem comparison
  const stemS = stripInflection(s);
  const stemA = stripInflection(a);

  if (stemS === stemA) {
    return true;
  }

  if (stemS.startsWith(stemA) || stemA.startsWith(stemS)) {
    const minStemLen = Math.min(stemS.length, stemA.length);
    if (minStemLen >= 4 && Math.abs(stemS.length - stemA.length) <= 2) {
      return true;
    }
  }

  return false;
}

/**
 * Extracts anchor text and normalized tokens from an array of pillar bullets.
 *
 * Looks for leading `**Bold Anchor**` in each bullet, or falls back to
 * the first 4 meaningful words.
 */
export function extractPillarAnchors(pillars: string[]): PillarAnchor[] {
  if (!Array.isArray(pillars)) return [];

  return pillars.map((pillar, index) => {
    const raw = (pillar || '').trim();

    // 1. Look for **Bold Anchor** pattern at the beginning of the bullet
    const boldMatch = raw.match(/^\s*(?:[•\-–—*#\d\.\)\s]*)\*\*([^*]+)\*\*/);
    let anchorText = '';

    if (boldMatch && boldMatch[1]) {
      anchorText = boldMatch[1].replace(/[:–—\-]+$/, '').trim();
    } else {
      // Fallback: strip leading bullet characters and extract first 4 meaningful words
      const cleaned = raw.replace(/^[•\-–—*#\d\.\)\s]+/, '').trim();
      const words = cleaned.split(/\s+/).filter(isContentWord);
      anchorText = words.slice(0, 4).join(' ');
      if (!anchorText) {
        anchorText = cleaned.split(/\s+/).slice(0, 4).join(' ');
      }
    }

    // 2. Tokenize anchor text into normalized significant tokens
    const rawWords = anchorText.split(/[\s,;:!?"'()[\]{}]+/).filter(Boolean);
    let tokens = rawWords
      .map(normalizeVoiceToken)
      .filter((w) => w.length >= 2 && !TRACKER_STOPWORDS.has(w));

    // Fallback: if all words were stopwords (e.g. short words), keep normalized words
    if (tokens.length === 0) {
      tokens = rawWords.map(normalizeVoiceToken).filter((w) => w.length >= 1);
    }

    return {
      index,
      anchorText,
      tokens,
    };
  });
}

/**
 * Extracts all content words in sequence from a text string.
 */
function extractContentWordsInSequence(text: string): string[] {
  return text
    .split(/[\s,;:!?"'()[\]{}*•\-–—]+/)
    .map(normalizeVoiceToken)
    .filter((w) => w.length >= 2 && !TRACKER_STOPWORDS.has(w));
}

/**
 * Matches candidate microphone transcript against pillar anchors and content.
 *
 * Completion conditions for a pillar:
 * 1. At least 50% of the pillar's anchor significant tokens are detected in the transcript.
 * 2. OR 3 consecutive content words from that pillar are detected in order in the candidate's speech.
 *
 * Advances activeIndex to the lowest index of an unspoken pillar.
 */
export function matchSpokenTranscriptToPillars(
  candidateTranscript: string,
  pillars: string[],
  alreadyCompletedIndices: number[] = []
): VoiceTrackerResult {
  if (!Array.isArray(pillars) || pillars.length === 0) {
    return { completedIndices: [], activeIndex: 0 };
  }

  const completedSet = new Set<number>(alreadyCompletedIndices);
  const anchors = extractPillarAnchors(pillars);

  const cleanTranscript = (candidateTranscript || '').trim();
  if (cleanTranscript.length > 0) {
    const transcriptTokens = cleanTranscript
      .split(/[\s,;:!?"'()[\]{}*•\-–—]+/)
      .map(normalizeVoiceToken)
      .filter(Boolean);

    const transcriptContentWords = transcriptTokens.filter((w) => w.length >= 2 && !TRACKER_STOPWORDS.has(w));

    for (let i = 0; i < pillars.length; i++) {
      if (completedSet.has(i)) {
        continue;
      }

      const anchor = anchors[i];
      let isCompleted = false;

      // Condition A: At least 50% of anchor tokens detected in candidate transcript
      if (anchor && anchor.tokens.length > 0) {
        let matchedCount = 0;
        for (const aToken of anchor.tokens) {
          const found = transcriptTokens.some((tToken) => areTokensMatching(tToken, aToken));
          if (found) {
            matchedCount++;
          }
        }

        const threshold = Math.ceil(anchor.tokens.length * 0.5);
        if (matchedCount >= threshold) {
          isCompleted = true;
        }
      }

      // Condition B: 3 consecutive content words from this pillar appear in candidate speech
      if (!isCompleted && transcriptContentWords.length >= 3) {
        const pillarContentWords = extractContentWordsInSequence(pillars[i] || '');
        if (pillarContentWords.length >= 3) {
          for (let pIdx = 0; pIdx <= pillarContentWords.length - 3; pIdx++) {
            const p0 = pillarContentWords[pIdx];
            const p1 = pillarContentWords[pIdx + 1];
            const p2 = pillarContentWords[pIdx + 2];

            // Scan candidate content words for this exact 3-word sequence (with stem matching)
            for (let tIdx = 0; tIdx <= transcriptContentWords.length - 3; tIdx++) {
              if (
                areTokensMatching(transcriptContentWords[tIdx], p0) &&
                areTokensMatching(transcriptContentWords[tIdx + 1], p1) &&
                areTokensMatching(transcriptContentWords[tIdx + 2], p2)
              ) {
                isCompleted = true;
                break;
              }
            }

            if (isCompleted) break;
          }
        }
      }

      if (isCompleted) {
        completedSet.add(i);
      }
    }
  }

  const completedIndices = Array.from(completedSet).sort((a, b) => a - b);

  // Active index is the first pillar index that is not yet completed
  let activeIndex = pillars.length;
  for (let i = 0; i < pillars.length; i++) {
    if (!completedSet.has(i)) {
      activeIndex = i;
      break;
    }
  }

  return {
    completedIndices,
    activeIndex,
  };
}
