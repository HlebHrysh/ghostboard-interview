'use client';

export interface DeepgramTranscriptResult {
  text: string;
  isFinal: boolean;
  speechFinal: boolean;
  confidence?: number;
  words?: Array<{ word: string; start: number; end: number; confidence: number }>;
}

export type DeepgramTranscriptHandler =
  | ((result: DeepgramTranscriptResult) => void)
  | ((text: string, isFinal: boolean, confidence?: number, speechFinal?: boolean) => void);

export interface DeepgramLiveOptions {
  apiKey?: string;
  /** Dynamic key provider called before every initial connect & reconnect so expired JWTs are refreshed automatically */
  getApiKey?: () => Promise<string> | string;
  language?: string;
  sampleRate?: number;
  channels?: number;
  endpointingMs?: number;
  utteranceEndMs?: number;
  customKeyterms?: string | string[];
  customStackOrCv?: string | string[];
  keyterms?: string[] | string;
  onTranscript?: DeepgramTranscriptHandler;
  onUtteranceEnd?: () => void;
  onError?: (err: Error | unknown) => void;
  onOpen?: () => void;
  onClose?: () => void;
  onStateChange?: (state: 'connected' | 'reconnecting' | 'disconnected') => void;
  onStatusChange?: (status: 'connecting' | 'connected' | 'reconnecting' | 'closed' | 'error') => void;
}

export type DeepgramLiveClientOptions = DeepgramLiveOptions;

/**
 * High-impact technical keyterms for boosting Deepgram Nova-3 accuracy.
 * Kept strictly under 40 items (< 1.5 KB query string) to prevent HTTP 400 errors.
 */
export const TECH_KEYTERMS = [
  'Python', 'TypeScript', 'React', 'Next.js', 'Node.js', 'Rust', 'SQL',
  'PostgreSQL', 'Redis', 'Docker', 'Kubernetes', 'AWS', 'Kafka',
  'gRPC', 'GraphQL', 'REST', 'Microservices', 'LLM', 'JWT', 'CI/CD'
];

const KEYTERM_STOPWORDS = new Set([
  // Common English stopwords and filler
  'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from',
  'up', 'about', 'into', 'over', 'after', 'beneath', 'under', 'above', 'is', 'are', 'was', 'were',
  'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'shall', 'should',
  'can', 'could', 'may', 'might', 'must', 'i', 'me', 'my', 'myself', 'we', 'our', 'ours', 'you', 'your',
  'he', 'him', 'his', 'she', 'her', 'they', 'them', 'their', 'it', 'its', 'this', 'that', 'these', 'those',
  'which', 'who', 'whom', 'what', 'when', 'where', 'why', 'how', 'all', 'any', 'both', 'each', 'few',
  'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than',
  'too', 'very', 'just', 'also', 'well', 'like', 'as', 'if', 'then', 'else',
  // CV / resume filler words
  'experience', 'experienced', 'skills', 'skill', 'technologies', 'technology', 'stack', 'developer',
  'develop', 'developed', 'developing', 'development', 'engineer', 'engineering', 'senior', 'junior',
  'lead', 'principal', 'staff', 'architect', 'architecture', 'years', 'year', 'project', 'projects',
  'work', 'worked', 'working', 'built', 'build', 'building', 'design', 'designed', 'designing',
  'create', 'created', 'creating', 'implement', 'implemented', 'implementing', 'team', 'teams',
  'software', 'system', 'systems', 'solution', 'solutions', 'application', 'applications', 'service',
  'services', 'platform', 'platforms', 'tool', 'tools', 'code', 'data', 'knowledge', 'proficient',
  'proficiency', 'expert', 'expertise', 'good', 'strong', 'great', 'high', 'throughput', 'distributed',
  'production', 'practical', 'using', 'used', 'uses', 'manage', 'managed', 'responsible', 'specialist',
  'proven', 'track', 'record', 'hands', 'responsibilities', 'orchestration', 'orchestrator', 'analytics',
  'pipeline', 'pipelines', 'workflow', 'workflows', 'management', 'state', 'cluster', 'clusters',
  // Ukrainian & Russian stopwords
  'і', 'та', 'чи', 'або', 'не', 'ні', 'в', 'у', 'на', 'до', 'по', 'за', 'з', 'зі', 'із', 'для', 'про',
  'при', 'через', 'від', 'біля', 'як', 'що', 'це', 'той', 'цей', 'ця', 'вона', 'він', 'воно', 'вони',
  'ми', 'ви', 'я', 'ти', 'свій', 'своя', 'свої', 'мене', 'нас', 'вас', 'їх', 'його', 'її', 'йому',
  'їй', 'їм', 'ним', 'нею', 'ними', 'також', 'вже', 'ще', 'коли', 'де', 'куди', 'звідки', 'чому',
  'тому', 'тільки', 'лише', 'досвід', 'розробка', 'інженер', 'проект', 'проекти', 'робота', 'команда',
  'стек', 'знання', 'навички', 'роки', 'рік', 'створення', 'підтримка', 'архітектура', 'сервіси',
  'системи', 'технології', 'мови',
  'и', 'или', 'не', 'в', 'на', 'с', 'со', 'из', 'к', 'по', 'за', 'для', 'о', 'об', 'обо', 'про',
  'при', 'через', 'от', 'у', 'как', 'что', 'это', 'этот', 'эта', 'эти', 'они', 'мы', 'вы', 'он',
  'она', 'оно', 'я', 'ты', 'свой', 'своя', 'меня', 'нас', 'вас', 'их', 'его', 'ее', 'ему', 'ей',
  'им', 'ним', 'также', 'уже', 'еще', 'когда', 'где', 'куда', 'почему', 'только', 'опыт',
  'разработка', 'инженер', 'проект', 'проекты', 'работа', 'команда', 'стек', 'знания', 'навыки',
  'года', 'лет', 'создание', 'поддержка', 'архитектура', 'сервисы', 'системы', 'технологии'
]);

function cleanKeytermCandidate(raw: string): string {
  return raw
    .trim()
    .replace(/^[\s*•\-–—#\d\.\),;:!?"'()[\]{}]+|[\s*•\-–—#\d\.\),;:!?"'()[\]{}]+$/g, '')
    .trim();
}

function normalizeExtractedTerm(raw: string): string {
  const cleaned = cleanKeytermCandidate(raw);
  const words = cleaned.split(/\s+/).filter(Boolean);
  if (words.length === 2) {
    const w0Lower = words[0].toLowerCase();
    const w1Lower = words[1].toLowerCase();
    if (KEYTERM_STOPWORDS.has(w1Lower)) {
      return words[0];
    }
    if (KEYTERM_STOPWORDS.has(w0Lower)) {
      return words[1];
    }
  }
  return cleaned;
}

function isValidKeytermCandidate(term: string): boolean {
  if (!term || term.length < 2 || term.length > 35) return false;
  const words = term.split(/\s+/).filter(Boolean);
  if (words.length < 1 || words.length > 2) return false;

  const nonStopwords = words.filter((w) => !KEYTERM_STOPWORDS.has(w.toLowerCase()));
  if (nonStopwords.length === 0) return false;

  // Reject purely numeric or symbol tokens
  if (/^[\d\s.,/\\#!@$%^&*()+=[\]{}|;:'"<>?~`-]+$/.test(term)) return false;

  return true;
}

/**
 * Extracts candidate technical terms, framework names, and proper nouns from freeform text.
 */
function extractTechTermsFromProse(text: string): string[] {
  const extracted: string[] = [];
  const clean = text.replace(/[*_`#]/g, ' ');

  // 1. Tech tokens with internal dots/symbols/slashes (.js, C++, C#, .NET, CI/CD)
  const techPunct = /\b(?:[A-Za-z0-9]+(?:\.[A-Za-z0-9]+)+|\.NET|C\+\+|C#|[A-Za-z]+\/[A-Za-z]+)\b/g;
  let match: RegExpExecArray | null;
  while ((match = techPunct.exec(clean)) !== null) {
    const term = cleanKeytermCandidate(match[0]);
    if (isValidKeytermCandidate(term)) extracted.push(term);
  }

  // 2. PascalCase / CamelCase / MixedCase tokens (e.g. ClickHouse, ScyllaDB, Temporal, Zustand)
  const camelOrPascal = /\b[A-Z][a-z0-9]+(?:[A-Z][A-Za-z0-9]*)+\b|\b[a-z0-9]+(?:[A-Z][A-Za-z0-9]*)+\b/g;
  while ((match = camelOrPascal.exec(clean)) !== null) {
    const term = cleanKeytermCandidate(match[0]);
    if (isValidKeytermCandidate(term)) extracted.push(term);
  }

  // 3. All-caps acronyms (2-6 chars): e.g. AWS, GCP, SQL, JWT, LLM, REST, OLAP
  const acronyms = /\b[A-Z]{2,6}\b/g;
  while ((match = acronyms.exec(clean)) !== null) {
    const term = cleanKeytermCandidate(match[0]);
    if (isValidKeytermCandidate(term)) extracted.push(term);
  }

  // 4. Proper capitalized words / two-word tech phrases (e.g. Temporal, Kafka, Docker, Spring Boot)
  const capitalizedPhrases = /\b[A-Z][a-zA-Z0-9]*(?:\s+[A-Z][a-zA-Z0-9]*)?\b/g;
  while ((match = capitalizedPhrases.exec(clean)) !== null) {
    const term = cleanKeytermCandidate(match[0]);
    if (isValidKeytermCandidate(term)) extracted.push(term);
  }

  return extracted;
}

/**
 * Dynamic CV-Aware Deepgram Keyterm Builder.
 * Extracts up to 10 unique technical terms / framework names / proper nouns
 * from the candidate's profile stack or CV string.
 *
 * Merges them ahead of core TECH_KEYTERMS, deduplicating case-insensitively,
 * and strictly capping at 24 terms maximum (< 100 tokens total) to prevent
 * Deepgram Nova-3 "HTTP 400 Keyterm limit exceeded" errors.
 */
export function buildDynamicKeyterms(customStackOrCv?: string | string[]): string[] {
  const candidateCustomTerms: string[] = [];

  if (Array.isArray(customStackOrCv)) {
    for (const item of customStackOrCv) {
      if (!item || typeof item !== 'string') continue;
      const chunks = item.split(/[\n\r,;|•·]+/).map(cleanKeytermCandidate).filter(Boolean);
      for (const chunk of chunks) {
        const norm = normalizeExtractedTerm(chunk);
        if (isValidKeytermCandidate(norm)) {
          candidateCustomTerms.push(norm);
        } else if (chunk.split(/\s+/).length > 2) {
          candidateCustomTerms.push(...extractTechTermsFromProse(chunk));
        }
      }
    }
  } else if (typeof customStackOrCv === 'string' && customStackOrCv.trim().length > 0) {
    const chunks = customStackOrCv.split(/[\n\r,;|•·]+/).map(cleanKeytermCandidate).filter(Boolean);
    for (const chunk of chunks) {
      const norm = normalizeExtractedTerm(chunk);
      if (isValidKeytermCandidate(norm)) {
        candidateCustomTerms.push(norm);
      } else if (chunk.split(/\s+/).length > 2) {
        candidateCustomTerms.push(...extractTechTermsFromProse(chunk));
      }
    }
  }

  // Deduplicate custom terms (up to 10 unique terms)
  const uniqueCustom: string[] = [];
  const seenLower = new Set<string>();

  for (const term of candidateCustomTerms) {
    const lower = term.toLowerCase();
    if (!seenLower.has(lower) && uniqueCustom.length < 10) {
      seenLower.add(lower);
      uniqueCustom.push(term);
    }
  }

  // Merge ahead of TECH_KEYTERMS and cap strictly at 24 terms (< 100 tokens)
  const result: string[] = [];
  const mergedSeen = new Set<string>();
  let totalTokenCount = 0;

  for (const term of uniqueCustom) {
    const lower = term.toLowerCase();
    if (!mergedSeen.has(lower) && result.length < 24) {
      const tokensInTerm = Math.max(1, term.split(/[\s_\-./\\]+/).filter(Boolean).length);
      if (totalTokenCount + tokensInTerm <= 95) {
        mergedSeen.add(lower);
        result.push(term);
        totalTokenCount += tokensInTerm;
      }
    }
  }

  for (const coreTerm of TECH_KEYTERMS) {
    const lower = coreTerm.toLowerCase();
    if (!mergedSeen.has(lower) && result.length < 24) {
      const tokensInTerm = Math.max(1, coreTerm.split(/[\s_\-./\\]+/).filter(Boolean).length);
      if (totalTokenCount + tokensInTerm <= 95) {
        mergedSeen.add(lower);
        result.push(coreTerm);
        totalTokenCount += tokensInTerm;
      }
    }
  }

  return result;
}

/**
 * Builds a canonical Deepgram streaming WebSocket URL matching Desktop standard:
 * sample_rate=16000, endpointing=350, utterance_end_ms=1000, and dynamic keyterm/keywords injection.
 */
export function buildDeepgramWebSocketUrl(
  baseModel: string = 'nova-3',
  language: string = 'multi',
  sampleRate: number = 16000,
  customStackOrCv?: string | string[]
): string {
  const model = baseModel || 'nova-3';
  let targetLang = language;
  if (language === 'auto' || language === 'multi' || !language) {
    targetLang = model.startsWith('nova-2') ? 'uk' : 'multi';
  } else if (language === 'ua') {
    targetLang = 'uk';
  }

  const params = new URLSearchParams({
    model,
    language: targetLang,
    encoding: 'linear16',
    sample_rate: String(sampleRate),
    channels: '1',
    interim_results: 'true',
    punctuate: 'true',
    smart_format: 'true',
    endpointing: '350',
    vad_events: 'true',
    utterance_end_ms: '1000',
  });

  const keyParam = model.startsWith('nova-3') ? 'keyterm' : 'keywords';
  const keyterms = buildDynamicKeyterms(customStackOrCv);
  keyterms.forEach((term) => params.append(keyParam, term));

  return `wss://api.deepgram.com/v1/listen?${params.toString()}`;
}

/**
 * Derives the fallback Deepgram URL if nova-3 is rejected (matching Desktop get_fallback_url).
 * Nova-3 -> Nova-2 (with language fallback) -> Nova-2 without keywords -> Minimal Nova-3.
 */
export function getDeepgramFallbackUrl(currentUrl: string): string {
  if (currentUrl.includes('model=nova-3')) {
    const lang = currentUrl.includes('language=en')
      ? 'en'
      : currentUrl.includes('language=ru')
      ? 'ru'
      : 'uk';
    return buildDeepgramWebSocketUrl('nova-2', lang, 16000);
  } else if (
    currentUrl.includes('model=nova-2') &&
    (currentUrl.includes('keywords=') || currentUrl.includes('keyterm='))
  ) {
    const lang = currentUrl.includes('language=en')
      ? 'en'
      : currentUrl.includes('language=ru')
      ? 'ru'
      : 'uk';
    const params = new URLSearchParams({
      model: 'nova-2',
      language: lang,
      encoding: 'linear16',
      sample_rate: '16000',
      channels: '1',
      interim_results: 'true',
      punctuate: 'true',
      smart_format: 'true',
      endpointing: '350',
      vad_events: 'true',
      utterance_end_ms: '1000',
    });
    return `wss://api.deepgram.com/v1/listen?${params.toString()}`;
  } else if (currentUrl.includes('model=nova-2')) {
    return 'wss://api.deepgram.com/v1/listen?model=nova-3&language=multi&encoding=linear16&sample_rate=16000&channels=1&interim_results=true&punctuate=true&smart_format=true&endpointing=350&vad_events=true&utterance_end_ms=1000';
  }
  return currentUrl;
}

export class DeepgramLiveClient {
  private socket: WebSocket | null = null;
  private processor: AudioWorkletNode | null = null;
  private keepAliveTimer: ReturnType<typeof setInterval> | null = null;
  private watchdogTimer: ReturnType<typeof setInterval> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private isRunning = false;
  private isReconnecting = false;
  private reconnectAttempts = 0;
  private generation = 0;
  private lastAudioSentTime = 0;
  private lastMessageReceivedTime = 0;
  private options: DeepgramLiveOptions | null = null;
  private internalAudioContext: AudioContext | null = null;
  private activeAudioContext: AudioContext | null = null;
  private sourceNode: AudioNode | null = null;
  private boundOnlineHandler: (() => void) | null = null;
  private currentWsUrl: string | null = null;

  // 1. Bounded ring buffer holding up to 4 seconds (~60 chunks) of 16kHz PCM audio captured while WS is connecting/reconnecting
  private pendingAudioQueue: ArrayBuffer[] = [];
  public static readonly MAX_BUFFERED_CHUNKS = 60;

  constructor(options?: DeepgramLiveOptions) {
    if (options) {
      this.options = options;
    }
  }

  public get ws(): WebSocket | null {
    return this.socket;
  }

  public get shouldReconnect(): boolean {
    return this.isRunning || this.isReconnecting;
  }

  public getPendingQueueLength(): number {
    return this.pendingAudioQueue.length;
  }

  public getPendingAudioQueue(): ArrayBuffer[] {
    return [...this.pendingAudioQueue];
  }

  private sendDiag(msg: string) {
    try {
      if (typeof window !== 'undefined') {
        fetch('/api/ai/interview-sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'LOG', text: msg }),
        }).catch(() => {});
      }
    } catch {}
  }

  public isConnected(): boolean {
    return this.socket !== null && this.socket.readyState === WebSocket.OPEN;
  }

  public getGeneration(): number {
    return this.generation;
  }

  public getReconnectAttempts(): number {
    return this.reconnectAttempts;
  }

  private async resolveFreshApiKey(): Promise<string> {
    if (this.options?.getApiKey) {
      try {
        const fresh = await this.options.getApiKey();
        if (fresh && fresh.trim()) return fresh.trim();
      } catch {
        // Fallback to cached apiKey or /api/ai/deepgram fetch
      }
    }
    if (this.options?.apiKey && this.options.apiKey.trim()) {
      return this.options.apiKey.trim();
    }
    try {
      if (typeof fetch !== 'undefined') {
        const res = await fetch('/api/ai/deepgram', { method: 'GET', cache: 'no-store' });
        if (res.ok) {
          const data = (await res.json()) as { apiKey?: string; key?: string; token?: string };
          const fetched = data.apiKey || data.key || data.token || '';
          if (fetched) return fetched.trim();
        }
      }
    } catch {
      // Ignore network error; handled by caller
    }
    return '';
  }

  /**
   * Send audio chunks (PCM 16kHz linear16).
   * When ws.readyState === WebSocket.OPEN, flush any buffered chunks first, then send pcmChunk.
   * When ws is connecting/reconnecting, push into pendingAudioQueue (dropping oldest if > MAX_BUFFERED_CHUNKS)
   * so ZERO syllables are lost during a micro-reconnect!
   */
  public sendAudio(data: ArrayBuffer | Int16Array): void {
    const buffer =
      data instanceof Int16Array
        ? (data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer)
        : data;
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      while (this.pendingAudioQueue.length > 0) {
        const queued = this.pendingAudioQueue.shift();
        if (queued) {
          try {
            this.socket.send(queued);
            this.lastAudioSentTime = Date.now();
          } catch {
            break;
          }
        }
      }
      try {
        this.socket.send(buffer);
        this.lastAudioSentTime = Date.now();
      } catch {
        // Socket closing, buffer for next reconnect
        this.enqueuePendingAudio(buffer);
      }
    } else if (this.shouldReconnect || (this.socket && this.socket.readyState === WebSocket.CONNECTING) || !this.socket) {
      this.enqueuePendingAudio(buffer);
    }
  }

  private enqueuePendingAudio(buffer: ArrayBuffer): void {
    if (this.pendingAudioQueue.length >= DeepgramLiveClient.MAX_BUFFERED_CHUNKS) {
      this.pendingAudioQueue.shift();
    }
    this.pendingAudioQueue.push(buffer);
  }

  public async setLanguage(newLang: string): Promise<void> {
    if (!this.options) return;
    console.log('[Deepgram] Switching live speech language to:', newLang);
    this.options.language = newLang;
    this.currentWsUrl = null;

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    const gen = ++this.generation;

    if (this.activeAudioContext && this.sourceNode) {
      this.cleanupSocketOnly();
      this.isRunning = true;
      this.isReconnecting = false;
      this.reconnectAttempts = 0;
      await this.connectWebSocket(this.activeAudioContext, this.sourceNode, this.options, gen);
    }
  }

  public async reconnect(): Promise<void> {
    console.log('[Deepgram] Manual reconnect requested');
    this.sendDiag('[DG-MANUAL-RECONNECT]');

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    const gen = ++this.generation;

    this.cleanupSocketOnly();
    this.isRunning = true;
    this.isReconnecting = false;
    this.reconnectAttempts = 0;
    if (this.options) {
      await this.connectWebSocket(this.activeAudioContext || undefined, this.sourceNode || undefined, this.options, gen);
    }
  }

  /**
   * Connect to Deepgram without requiring active AudioNodes (e.g. for direct manual sendAudio streaming).
   */
  public async connect(options?: DeepgramLiveOptions): Promise<void> {
    if (options) this.options = options;
    if (!this.options) throw new Error('No options provided to DeepgramLiveClient');
    this.stop();
    this.isRunning = true;
    this.isReconnecting = false;
    this.reconnectAttempts = 0;
    this.setupOnlineListener();
    return this.connectWebSocket(undefined, undefined, this.options);
  }

  /**
   * Connect to Deepgram and stream directly from an AudioNode inside an existing AudioContext.
   */
  public async startWithNode(
    audioContext: AudioContext,
    sourceNode: AudioNode,
    options: DeepgramLiveOptions
  ): Promise<void> {
    this.stop();
    this.options = options;
    this.isRunning = true;
    this.isReconnecting = false;
    this.reconnectAttempts = 0;
    this.activeAudioContext = audioContext;
    this.sourceNode = sourceNode;

    this.setupOnlineListener();

    return this.connectWebSocket(audioContext, sourceNode, options);
  }

  private setupOnlineListener(): void {
    if (typeof window === 'undefined') return;
    if (!this.boundOnlineHandler) {
      this.boundOnlineHandler = () => {
        if (this.isRunning && (!this.socket || this.socket.readyState !== WebSocket.OPEN)) {
          console.log('[Deepgram] Network restored (online event) - triggering immediate reconnect');
          this.reconnectAttempts = 0;
          this.reconnect().catch((err) => console.warn('[Deepgram] Online reconnect failed:', err));
        }
      };
      window.addEventListener('online', this.boundOnlineHandler);
    }
  }

  private removeOnlineListener(): void {
    if (typeof window !== 'undefined' && this.boundOnlineHandler) {
      window.removeEventListener('online', this.boundOnlineHandler);
      this.boundOnlineHandler = null;
    }
  }

  private async connectWebSocket(
    audioContext?: AudioContext,
    sourceNode?: AudioNode,
    optionsInput?: DeepgramLiveOptions,
    existingGen?: number
  ): Promise<void> {
    const options = optionsInput || this.options;
    if (!options) throw new Error('DeepgramLiveOptions required');
    this.options = options;

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    const gen = existingGen ?? ++this.generation;

    options.onStatusChange?.(this.isReconnecting ? 'reconnecting' : 'connecting');

    // Dynamically retrieve fresh token for every connection attempt
    const cleanApiKey = (await this.resolveFreshApiKey()).replace(/^["']|["']$/g, '');
    const { language = 'auto' } = options;
    if (!cleanApiKey) {
      options.onStatusChange?.('error');
      options.onError?.(new Error('Deepgram API key is required'));
      throw new Error('Deepgram API key is required');
    }

    if (audioContext) {
      if (audioContext.state === 'suspended') {
        await audioContext.resume().catch((e) => console.warn('AudioContext resume issue:', e));
      }

      try {
        await audioContext.audioWorklet.addModule('/pcm-worklet.js');
      } catch (e) {
        console.warn('[Deepgram] AudioWorklet module load notice:', e);
      }
    }

    const sampleRate = options.sampleRate || 16000;
    const targetLang = language === 'auto' ? 'multi' : language;

    if (!this.currentWsUrl) {
      const customTerms = options.customKeyterms ?? options.customStackOrCv ?? options.keyterms;
      this.currentWsUrl = buildDeepgramWebSocketUrl('nova-3', targetLang, sampleRate, customTerms);
    }
    const wsUrl = this.currentWsUrl;

    this.sendDiag(`[DG-CONNECT] gen=${gen} len=${wsUrl.length} keyLen=${cleanApiKey.length} lang=${targetLang} sampleRate=${sampleRate}`);
    console.log('[Deepgram] Connecting Live WebSocket (gen: %d). SampleRate: %d, lang: %s, url: %s', gen, sampleRate, targetLang, wsUrl);

    let hasOpened = false;
    this.socket = new WebSocket(wsUrl, ['token', cleanApiKey]);
    this.socket.binaryType = 'arraybuffer';

    this.socket.onopen = () => {
      if (gen !== this.generation) return;
      if (!this.isRunning) {
        this.socket?.close();
        return;
      }

      hasOpened = true;
      this.currentWsUrl = null; // Reset fallback cascade on success
      this.lastMessageReceivedTime = Date.now();
      this.lastAudioSentTime = 0;
      this.sendDiag('[DG-OPEN] WebSocket connected successfully!');
      console.log('[Deepgram] Live WebSocket Connected successfully (gen: %d)!', gen);
      this.isReconnecting = false;
      this.reconnectAttempts = 0;
      options.onStatusChange?.('connected');
      options.onStateChange?.('connected');

      // Flush any pre-connect buffered audio frames immediately upon socket open
      while (this.pendingAudioQueue.length > 0) {
        const queued = this.pendingAudioQueue.shift();
        if (queued && this.socket) {
          try {
            this.socket.send(queued);
            this.lastAudioSentTime = Date.now();
          } catch {
            break;
          }
        }
      }

      if (audioContext && audioContext.state !== 'running') {
        audioContext.resume().catch((e) => console.warn('[Deepgram] AudioContext resume on open issue:', e));
      }
      options.onOpen?.();

      // Smart KeepAlive: Send {"type":"KeepAlive"} ONLY if no audio has been sent for > 5 seconds
      if (this.keepAliveTimer) clearInterval(this.keepAliveTimer);
      this.keepAliveTimer = setInterval(() => {
        if (gen !== this.generation) return;
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
          if (Date.now() - this.lastAudioSentTime >= 5000) {
            try {
              this.socket.send(JSON.stringify({ type: 'KeepAlive' }));
              this.lastAudioSentTime = Date.now();
            } catch {}
          }
        }
      }, 1000);

      // Dead Socket Watchdog: If sending audio actively, but 0 incoming messages from Deepgram for > 10 seconds, force reconnect
      if (this.watchdogTimer) clearInterval(this.watchdogTimer);
      this.watchdogTimer = setInterval(() => {
        if (gen !== this.generation) return;
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
          const now = Date.now();
          const isAudioActivelySending = this.lastAudioSentTime > 0 && (now - this.lastAudioSentTime < 4000);
          if (isAudioActivelySending && (now - this.lastMessageReceivedTime > 10_000)) {
            console.warn('[Deepgram] Watchdog: No incoming messages for >10s while sending audio. Half-open socket detected, forcing reconnect.');
            this.reconnect().catch((err) => console.warn('[Deepgram] Watchdog reconnect failed:', err));
          }
        }
      }, 2000);

      // Connect AudioWorklet inside caller's active AudioContext if nodes provided
      if (audioContext && sourceNode) {
        try {
          if (this.processor) {
            try { this.processor.disconnect(); } catch {}
            this.processor = null;
          }

          this.processor = new AudioWorkletNode(audioContext, 'pcm-processor');
          this.processor.port.onmessage = (e: MessageEvent) => {
            if (gen !== this.generation || !this.isRunning) return;

            // Backpressure Guard: Drop chunk if buffer exceeds 256KB to avoid browser tab OOM under stuck TCP
            if (this.socket && this.socket.readyState === WebSocket.OPEN && this.socket.bufferedAmount > 256 * 1024) {
              console.warn('[Deepgram] Backpressure: socket.bufferedAmount > 256KB, dropping chunk');
              return;
            }

            try {
              const data = e.data instanceof ArrayBuffer ? e.data : (e.data?.buffer || e.data);
              if (data instanceof ArrayBuffer || data instanceof Int16Array) {
                this.sendAudio(data);
              }
            } catch (err) {}
          };

          sourceNode.connect(this.processor);
        } catch (err) {
          console.warn('[Deepgram] Failed to attach audio processor:', err);
        }
      }
    };

    this.socket.onmessage = (event: MessageEvent) => {
      if (gen !== this.generation) return;
      if (!this.isRunning) return;

      this.lastMessageReceivedTime = Date.now();

      try {
        const data = JSON.parse(event.data);
        if (data.type === 'UtteranceEnd') {
          options.onUtteranceEnd?.();
        } else if (data.type === 'Results' && data.channel?.alternatives?.[0]) {
          const alt = data.channel.alternatives[0];
          const transcript = alt.transcript?.trim() || '';
          if (transcript) {
            const isFinal = Boolean(data.is_final);
            const speechFinal = Boolean(data.speech_final);
            if (options.onTranscript) {
              const handler = options.onTranscript as (...args: unknown[]) => void;
              if (handler.length > 1) {
                handler(transcript, isFinal, alt.confidence, speechFinal);
              } else {
                handler({
                  text: transcript,
                  isFinal,
                  speechFinal,
                  confidence: alt.confidence,
                  words: alt.words || [],
                });
              }
            }
          }
        }
      } catch (err) {
        // Ignore malformed frames
      }
    };

    this.socket.onerror = (err) => {
      if (gen !== this.generation) return;
      this.sendDiag('[DG-ERROR] WebSocket onerror event');
      console.warn('[Deepgram] Live WebSocket error:', err);
      this.isReconnecting = false;
      options.onStatusChange?.('error');
      options.onError?.(err);
    };

    this.socket.onclose = (event) => {
      if (gen !== this.generation) return;
      this.sendDiag(`[DG-CLOSE] gen=${gen} code=${event.code} reason="${event.reason}" wasClean=${event.wasClean} attempts=${this.reconnectAttempts}`);
      console.log('[Deepgram] Live WebSocket closed (gen: %d). Code:', gen, event.code, 'Reason:', event.reason);
      this.cleanupSocketOnly();
      options.onClose?.();

      this.isReconnecting = false;

      // Handle unrecoverable auth failures
      if (event.code === 4001 || event.code === 4002 || event.code === 4003 || event.code === 1008) {
        console.error('[Deepgram] Authentication or authorization error. Not reconnecting.');
        this.isRunning = false;
        options.onStatusChange?.('closed');
        options.onStateChange?.('disconnected');
        options.onError?.(new Error(`Deepgram authentication failed (${event.code})`));
        return;
      }

      // If closed before onopen, advance through 3-tier fallback URL (nova-3 -> nova-2 -> stripped keywords)
      if (!hasOpened && this.currentWsUrl) {
        const nextUrl = getDeepgramFallbackUrl(this.currentWsUrl);
        if (nextUrl !== this.currentWsUrl) {
          console.warn('[Deepgram] WebSocket rejected initial parameters, falling back URL to:', nextUrl);
          this.currentWsUrl = nextUrl;
        }
      }

      // If closed with 1006 before onopen, suspected expired token / invalid parameters
      if (event.code === 1006 && !hasOpened) {
        console.warn('[Deepgram] Socket closed 1006 before onopen: suspected expired token/params. Fresh token will be retrieved on reconnect.');
      }

      if (this.isRunning) {
        this.scheduleReconnect();
      } else {
        options.onStatusChange?.('closed');
        options.onStateChange?.('disconnected');
      }
    };
  }

  private scheduleReconnect(): void {
    if (!this.isRunning || this.isReconnecting) return;

    this.isReconnecting = true;
    this.reconnectAttempts++;

    // Infinite exponential backoff with jitter (max base: 30s)
    const base = Math.min(30_000, 500 * Math.pow(2, Math.min(this.reconnectAttempts, 6)));
    const delay = base / 2 + Math.random() * (base / 2);
    console.log(`[Deepgram] Auto-reconnecting in ${Math.round(delay)}ms (attempt ${this.reconnectAttempts})...`);
    this.options?.onStatusChange?.('reconnecting');
    this.options?.onStateChange?.('reconnecting');

    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = null;
      if (!this.isRunning) {
        this.isReconnecting = false;
        return;
      }
      try {
        if (this.activeAudioContext && this.sourceNode && this.options) {
          await this.connectWebSocket(this.activeAudioContext, this.sourceNode, this.options);
        } else if (this.options) {
          await this.connectWebSocket(undefined, undefined, this.options);
        } else {
          this.isReconnecting = false;
        }
      } catch (err) {
        console.warn('[Deepgram] Reconnection attempt failed:', err);
        this.isReconnecting = false;
        this.scheduleReconnect();
      }
    }, delay);
  }

  /**
   * Start using a MediaStream (e.g. mic stream)
   */
  public async startWithStream(
    stream: MediaStream,
    options: DeepgramLiveOptions,
    existingAudioContext?: AudioContext
  ): Promise<void> {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    const ctx = existingAudioContext || new AudioCtx();
    if (!existingAudioContext) {
      this.internalAudioContext = ctx;
    }
    if (ctx.state === 'suspended') {
      await ctx.resume().catch(() => {});
    }
    const source = ctx.createMediaStreamSource(stream);
    return this.startWithNode(ctx, source, options);
  }

  public async start(stream: MediaStream, options: DeepgramLiveOptions): Promise<void> {
    return this.startWithStream(stream, options);
  }

  public stop(): void {
    this.isRunning = false;
    this.isReconnecting = false;
    this.reconnectAttempts = 0;
    this.pendingAudioQueue = [];

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.keepAliveTimer) {
      clearInterval(this.keepAliveTimer);
      this.keepAliveTimer = null;
    }

    if (this.watchdogTimer) {
      clearInterval(this.watchdogTimer);
      this.watchdogTimer = null;
    }

    this.removeOnlineListener();

    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      try {
        this.socket.send(JSON.stringify({ type: 'CloseStream' }));
        this.socket.close();
      } catch {}
    }
    this.socket = null;
    this.cleanup();
    this.options?.onStatusChange?.('closed');
    this.options?.onStateChange?.('disconnected');
  }

  private cleanupSocketOnly(): void {
    if (this.keepAliveTimer) {
      clearInterval(this.keepAliveTimer);
      this.keepAliveTimer = null;
    }
    if (this.watchdogTimer) {
      clearInterval(this.watchdogTimer);
      this.watchdogTimer = null;
    }
    if (this.processor) {
      try {
        this.processor.disconnect();
      } catch {}
      this.processor = null;
    }
    if (this.socket) {
      try {
        this.socket.onopen = null;
        this.socket.onmessage = null;
        this.socket.onerror = null;
        this.socket.onclose = null;
        this.socket.close();
      } catch {}
      this.socket = null;
    }
  }

  private cleanup(): void {
    this.cleanupSocketOnly();

    if (this.sourceNode) {
      try {
        this.sourceNode.disconnect();
      } catch {}
      this.sourceNode = null;
    }

    if (this.internalAudioContext && this.internalAudioContext.state !== 'closed') {
      try {
        this.internalAudioContext.close();
      } catch {}
      this.internalAudioContext = null;
    }
  }
}
