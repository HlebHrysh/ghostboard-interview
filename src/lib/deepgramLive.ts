'use client';

export interface DeepgramTranscriptResult {
  text: string;
  isFinal: boolean;
  speechFinal: boolean;
  confidence?: number;
  words?: Array<{ word: string; start: number; end: number; confidence: number }>;
}

export interface DeepgramLiveOptions {
  apiKey: string;
  language?: string;
  sampleRate?: number;
  onTranscript?: (result: DeepgramTranscriptResult) => void;
  onError?: (err: unknown) => void;
  onOpen?: () => void;
  onClose?: () => void;
  onStateChange?: (state: 'connected' | 'reconnecting' | 'disconnected') => void;
}

export const TECH_KEYTERMS = [
  // Core Languages & Runtimes
  'Python', 'TypeScript', 'JavaScript', 'Golang', 'Java', 'Kotlin', 'Swift', 'C#', 'Dart', 'Rust', 'SQL',
  // Web & Frontend
  'React', 'Next.js', 'Vue', 'Nuxt', 'Angular', 'RxJS', 'Redux', 'Zustand', 'Tailwind', 'Vite',
  // Backend & Frameworks
  'FastAPI', 'Django', 'Node.js', 'NestJS', 'Express', 'Spring Boot', 'ASP.NET', 'Gin',
  // Concurrency & Low-level
  'Asyncio', 'Goroutine', 'Coroutines', 'EventLoop', 'async/await', 'GIL', 'libuv', 'JVM',
  // Databases & ORMs
  'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'SQLAlchemy', 'Prisma', 'Hibernate', 'Entity Framework', 'Alembic', 'B-Tree',
  // Cloud, Infra & Containers
  'Docker', 'Kubernetes', 'K8s', 'Helm', 'Terraform', 'AWS', 'GCP', 'Azure', 'Linux', 'Nginx', 'CI/CD',
  // Messaging & Streaming
  'Kafka', 'RabbitMQ', 'Celery', 'WebSocket', 'gRPC', 'REST', 'GraphQL',
  // Testing & QA
  'pytest', 'Jest', 'JUnit', 'Playwright', 'Cypress', 'Selenium',
  // Mobile
  'SwiftUI', 'Jetpack Compose', 'Flutter', 'React Native', 'Xcode',
  // Data, AI & Big Data
  'PyTorch', 'TensorFlow', 'Pandas', 'Spark', 'Airflow', 'Snowflake', 'BigQuery', 'dbt', 'LangChain', 'RAG', 'LLM',
  // Architecture & Security
  'Microservices', 'Clean Architecture', 'CQRS', 'DDD', 'OWASP', 'AppSec', 'JWT', 'OAuth'
];

export class DeepgramLiveClient {
  private socket: WebSocket | null = null;
  private processor: AudioWorkletNode | ScriptProcessorNode | null = null;
  private silentGain: GainNode | null = null;
  private keepAliveTimer: ReturnType<typeof setInterval> | null = null;

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
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private isRunning = false;
  private isReconnecting = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 6;
  private options: DeepgramLiveOptions | null = null;
  private internalAudioContext: AudioContext | null = null;
  private activeAudioContext: AudioContext | null = null;
  private sourceNode: AudioNode | null = null;

  public isConnected(): boolean {
    return this.socket !== null && this.socket.readyState === WebSocket.OPEN;
  }

  public async setLanguage(newLang: string): Promise<void> {
    if (!this.options) return;
    console.log('[Deepgram] Switching live speech language to:', newLang);
    this.options.language = newLang;
    if (this.activeAudioContext && this.sourceNode) {
      this.cleanupSocketOnly();
      this.isRunning = true;
      this.isReconnecting = false;
      this.reconnectAttempts = 0;
      await this.connectWebSocket(this.activeAudioContext, this.sourceNode, this.options);
    }
  }

  public async reconnect(): Promise<void> {
    console.log('[Deepgram] Manual reconnect requested');
    this.sendDiag('[DG-MANUAL-RECONNECT]');
    this.cleanupSocketOnly();
    this.isRunning = true;
    this.isReconnecting = false;
    this.reconnectAttempts = 0;
    if (this.activeAudioContext && this.sourceNode && this.options) {
      await this.connectWebSocket(this.activeAudioContext, this.sourceNode, this.options);
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

    return this.connectWebSocket(audioContext, sourceNode, options);
  }

  private async connectWebSocket(
    audioContext: AudioContext,
    sourceNode: AudioNode,
    options: DeepgramLiveOptions
  ): Promise<void> {
    const rawKey = options.apiKey || '';
    const cleanApiKey = rawKey.trim().replace(/^["']|["']$/g, '');
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
      console.warn('Failed to load AudioWorklet, falling back to ScriptProcessor if needed:', e);
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

    // Inject boosted technical keywords for accurate recognition in Nova-3 (UK / RU / EN)
    TECH_KEYTERMS.forEach((term) => params.append('keyterm', term));

    const wsUrl = `wss://api.deepgram.com/v1/listen?${params.toString()}`;
    this.sendDiag(`[DG-CONNECT] len=${wsUrl.length} keyLen=${cleanApiKey.length} lang=${targetLang} sampleRate=${sampleRate}`);
    console.log('[Deepgram] Connecting Live WebSocket. SampleRate:', sampleRate, 'model: nova-3, lang:', targetLang);

    // Deepgram browser authentication via WebSocket subprotocol
    this.socket = new WebSocket(wsUrl, ['token', cleanApiKey]);
    this.socket.binaryType = 'arraybuffer';

    this.socket.onopen = () => {
      if (!this.isRunning) {
        this.socket?.close();
        return;
      }
      this.sendDiag('[DG-OPEN] WebSocket connected successfully!');
      console.log('[Deepgram] Live WebSocket Connected successfully!');
      this.isReconnecting = false;
      this.reconnectAttempts = 0;
      options.onStateChange?.('connected');

      if (audioContext.state !== 'running') {
        audioContext.resume().catch((e) => console.warn('[Deepgram] AudioContext resume on open issue:', e));
      }
      options.onOpen?.();

      // KeepAlive pulse every 3 seconds to prevent Deepgram NET-0001 timeout
      if (this.keepAliveTimer) clearInterval(this.keepAliveTimer);
      this.keepAliveTimer = setInterval(() => {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
          this.socket.send(JSON.stringify({ type: 'KeepAlive' }));
        }
      }, 3000);

        // Connect AudioWorklet inside caller's active AudioContext
        try {
          if (this.processor) {
            try { this.processor.disconnect(); } catch {}
            this.processor = null;
          }

          try {
            // Attempt to use modern AudioWorklet API
            this.processor = new AudioWorkletNode(audioContext, 'pcm-processor');
            this.processor.port.onmessage = (e: MessageEvent) => {
              if (!this.isRunning || !this.socket || this.socket.readyState !== WebSocket.OPEN) return;
              try {
                this.socket.send(e.data);
              } catch (err) {}
            };
          } catch (e) {
            // Fallback to ScriptProcessor if AudioWorklet fails
            console.warn('[Deepgram] AudioWorklet failed, falling back to ScriptProcessor:', e);
            this.processor = audioContext.createScriptProcessor(4096, 1, 1);
            this.processor.onaudioprocess = (e: AudioProcessingEvent) => {
              if (!this.isRunning || !this.socket || this.socket.readyState !== WebSocket.OPEN) return;
              const inputBuffer = e.inputBuffer.getChannelData(0);
              const pcm16 = new Int16Array(inputBuffer.length);
              for (let i = 0; i < inputBuffer.length; i++) {
                const sample = Math.max(-1, Math.min(1, inputBuffer[i]));
                pcm16[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
              }
              try { this.socket.send(pcm16.buffer); } catch (err) {}
            };
          }

          sourceNode.connect(this.processor);

          // AudioWorklet runs standalone without destination connection.
          // Only legacy ScriptProcessorNode requires a silent destination node to keep firing events.
          if (typeof AudioWorkletNode === 'undefined' || !(this.processor instanceof AudioWorkletNode)) {
            if (!this.silentGain) {
              this.silentGain = audioContext.createGain();
              this.silentGain.gain.value = 0;
              this.silentGain.connect(audioContext.destination);
            }
            try {
              this.processor?.connect(this.silentGain);
            } catch {}
          }
        } catch (err) {
          console.warn('[Deepgram] Failed to attach audio processor:', err);
        }
    };

    this.socket.onmessage = (event: MessageEvent) => {
      if (!this.isRunning) return;
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
      this.sendDiag('[DG-ERROR] WebSocket onerror event');
      console.warn('[Deepgram] Live WebSocket error:', err);
      this.isReconnecting = false;
      options.onError?.(err);
    };

    this.socket.onclose = (event) => {
      this.sendDiag(`[DG-CLOSE] code=${event.code} reason="${event.reason}" wasClean=${event.wasClean} attempts=${this.reconnectAttempts}`);
      console.log('[Deepgram] Live WebSocket closed. Code:', event.code, 'Reason:', event.reason);
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

      if (this.isRunning) {
        this.scheduleReconnect();
      } else {
        options.onStateChange?.('disconnected');
      }
    };
  }

  private scheduleReconnect(): void {
    if (!this.isRunning || this.isReconnecting) return;

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.warn(`[Deepgram] Reached maximum reconnect attempts (${this.maxReconnectAttempts}).`);
      this.sendDiag(`[DG-MAX-ATTEMPTS-REACHED] stopped after ${this.maxReconnectAttempts}`);
      this.isRunning = false;
      this.isReconnecting = false;
      this.options?.onStateChange?.('disconnected');
      this.options?.onError?.(new Error('Max Deepgram reconnect attempts reached'));
      return;
    }

    this.isReconnecting = true;
    this.reconnectAttempts++;
    const delay = Math.min(500 * Math.pow(1.3, this.reconnectAttempts - 1), 3000);
    console.log(`[Deepgram] Auto-reconnecting in ${Math.round(delay)}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
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

    if (this.silentGain) {
      try {
        this.silentGain.disconnect();
      } catch {}
      this.silentGain = null;
    }

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
