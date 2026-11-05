'use client';

export interface DeepgramTranscriptResult {
  text: string;
  isFinal: boolean;
  speechFinal: boolean;
  confidence?: number;
  words?: Array<{ word: string; start: number; end: number; confidence: number }>;
}

export interface DeepgramLiveOptions {
  getApiKey: () => Promise<string>;
  apiKey?: string;
  language?: string;
  sampleRate?: number;
  onTranscript?: (result: DeepgramTranscriptResult) => void;
  onError?: (err: unknown) => void;
  onOpen?: () => void;
  onClose?: () => void;
  onStateChange?: (state: 'connected' | 'reconnecting' | 'disconnected') => void;
}

/**
 * High-impact technical keyterms for boosting Deepgram Nova-3 accuracy.
 * Kept strictly under 40 items (< 1.5 KB query string) to prevent HTTP 400 errors.
 */
export const TECH_KEYTERMS = [
  'Python', 'TypeScript', 'JavaScript', 'Golang', 'Java', 'Rust', 'SQL',
  'React', 'Next.js', 'FastAPI', 'Django', 'Node.js', 'NestJS',
  'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'SQLAlchemy', 'Prisma',
  'Docker', 'Kubernetes', 'AWS', 'Linux', 'Kafka', 'RabbitMQ', 'Celery',
  'WebSocket', 'gRPC', 'REST', 'GraphQL', 'pytest', 'CI/CD',
  'Microservices', 'PyTorch', 'Asyncio', 'EventLoop', 'JWT'
];

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

  public async setLanguage(newLang: string): Promise<void> {
    if (!this.options) return;
    console.log('[Deepgram] Switching live speech language to:', newLang);
    this.options.language = newLang;

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
    if (this.activeAudioContext && this.sourceNode && this.options) {
      await this.connectWebSocket(this.activeAudioContext, this.sourceNode, this.options, gen);
    }
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
    audioContext: AudioContext,
    sourceNode: AudioNode,
    options: DeepgramLiveOptions,
    existingGen?: number
  ): Promise<void> {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    const gen = existingGen ?? ++this.generation;

    // Dynamically retrieve fresh token for every connection attempt
    let rawKey = '';
    if (typeof options.getApiKey === 'function') {
      rawKey = await options.getApiKey();
    } else if (options.apiKey) {
      rawKey = options.apiKey;
    }

    const cleanApiKey = (rawKey || '').trim().replace(/^["']|["']$/g, '');
    const { language = 'auto' } = options;
    if (!cleanApiKey) {
      throw new Error('Deepgram API key is required');
    }

    if (audioContext.state === 'suspended') {
      await audioContext.resume().catch((e) => console.warn('AudioContext resume issue:', e));
    }

    try {
      await audioContext.audioWorklet.addModule('/pcm-worklet.js');
    } catch (e) {
      console.warn('[Deepgram] AudioWorklet module load notice:', e);
    }

    const sampleRate = audioContext.sampleRate || 48000;
    const targetLang = language === 'auto' ? 'multi' : language;

    const params = new URLSearchParams({
      model: 'nova-3',
      language: targetLang,
      smart_format: 'true',
      interim_results: 'true',
      punctuate: 'true',
      endpointing: '400',
      vad_events: 'true',
      encoding: 'linear16',
      sample_rate: String(sampleRate),
      channels: '1',
    });

    // Inject boosted technical keywords (< 40 items)
    TECH_KEYTERMS.forEach((term) => params.append('keyterm', term));

    const wsUrl = `wss://api.deepgram.com/v1/listen?${params.toString()}`;
    this.sendDiag(`[DG-CONNECT] gen=${gen} len=${wsUrl.length} keyLen=${cleanApiKey.length} lang=${targetLang} sampleRate=${sampleRate}`);
    console.log('[Deepgram] Connecting Live WebSocket (gen: %d). SampleRate: %d, lang: %s', gen, sampleRate, targetLang);

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
      this.lastMessageReceivedTime = Date.now();
      this.lastAudioSentTime = 0;
      this.sendDiag('[DG-OPEN] WebSocket connected successfully!');
      console.log('[Deepgram] Live WebSocket Connected successfully (gen: %d)!', gen);
      this.isReconnecting = false;
      this.reconnectAttempts = 0;
      options.onStateChange?.('connected');

      if (audioContext.state !== 'running') {
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

      // Connect AudioWorklet inside caller's active AudioContext
      try {
        if (this.processor) {
          try { this.processor.disconnect(); } catch {}
          this.processor = null;
        }

        this.processor = new AudioWorkletNode(audioContext, 'pcm-processor');
        this.processor.port.onmessage = (e: MessageEvent) => {
          if (gen !== this.generation || !this.isRunning || !this.socket || this.socket.readyState !== WebSocket.OPEN) return;

          // Backpressure Guard: Drop chunk if buffer exceeds 256KB to avoid browser tab OOM under stuck TCP
          if (this.socket.bufferedAmount > 256 * 1024) {
            console.warn('[Deepgram] Backpressure: socket.bufferedAmount > 256KB, dropping chunk');
            return;
          }

          try {
            const data = e.data instanceof ArrayBuffer ? e.data : (e.data?.buffer || e.data);
            if (data instanceof ArrayBuffer) {
              this.socket.send(data);
              this.lastAudioSentTime = Date.now();
            }
          } catch (err) {}
        };

        sourceNode.connect(this.processor);
      } catch (err) {
        console.warn('[Deepgram] Failed to attach audio processor:', err);
      }
    };

    this.socket.onmessage = (event: MessageEvent) => {
      if (gen !== this.generation) return;
      if (!this.isRunning) return;

      this.lastMessageReceivedTime = Date.now();

      try {
        const data = JSON.parse(event.data);
        if (data.type === 'Results' && data.channel?.alternatives?.[0]) {
          const alt = data.channel.alternatives[0];
          const transcript = alt.transcript?.trim() || '';
          if (transcript) {
            const isFinal = Boolean(data.is_final);
            const speechFinal = Boolean(data.speech_final);
            options.onTranscript?.({
              text: transcript,
              isFinal,
              speechFinal,
              confidence: alt.confidence,
              words: alt.words || [],
            });
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
        options.onStateChange?.('disconnected');
        options.onError?.(new Error(`Deepgram authentication failed (${event.code})`));
        return;
      }

      // If closed with 1006 before onopen, suspected expired token / invalid parameters
      if (event.code === 1006 && !hasOpened) {
        console.warn('[Deepgram] Socket closed 1006 before onopen: suspected expired token/params. Fresh token will be retrieved on reconnect.');
      }

      if (this.isRunning) {
        this.scheduleReconnect();
      } else {
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
