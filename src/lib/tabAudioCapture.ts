import { DeepgramLiveClient } from './deepgramLive';

export type SpeakerType = 'interviewer' | 'candidate';

export interface TabCaptureOptions {
  source?: 'mic' | 'tab';
  onVolumeChange?: (volume: number, candidateVolume?: number) => void;
  onAudioChunk?: (blob: Blob) => void;
  chunkIntervalMs?: number;
  includeMic?: boolean;
  deepgramApiKey?: string;
  speechLanguage?: string;
  onLiveTranscript?: (
    text: string,
    isFinal: boolean,
    speechFinal: boolean,
    speaker?: SpeakerType
  ) => void;
  onConnectionStateChange?: (state: 'connected' | 'reconnecting' | 'disconnected') => void;
}

export interface TabCaptureResult {
  stream: MediaStream;
  tabTitle: string;
  isMicIncluded: boolean;
  hasTabAudio: boolean;
}

export class TabAudioCapture {
  private stream: MediaStream | null = null;
  private micStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  
  // Analysers for dual visual metering
  private analyser: AnalyserNode | null = null;
  private interviewerAnalyser: AnalyserNode | null = null;
  private candidateAnalyser: AnalyserNode | null = null;

  // Dedicated routing gain nodes to prevent cross-talk
  private interviewerGainNode: GainNode | null = null;
  private candidateGainNode: GainNode | null = null;
  private masterMixNode: GainNode | null = null;

  private mediaRecorder: MediaRecorder | null = null;
  private mixedDestination: MediaStreamAudioDestinationNode | null = null;
  private tabSourceNode: MediaStreamAudioSourceNode | null = null;
  private micSourceNode: MediaStreamAudioSourceNode | null = null;

  // Dedicated STT instances
  private deepgramClient: DeepgramLiveClient | null = null;
  private candidateDeepgramClient: DeepgramLiveClient | null = null;
  private candidateSpeechRecognition: any = null;
  private webSpeechRecognition: any = null;

  private isCapturing = false;
  private isMicActive = false;
  private isDeepgramConfigured = false;
  private currentOptions: TabCaptureOptions | null = null;
  private chunkTimeout: any = null;
  private isLoopActive = false;

  public getStream(): MediaStream | null {
    return this.stream;
  }

  public async updateLanguage(newLang: 'uk' | 'ru' | 'en' | 'auto'): Promise<void> {
    if (this.currentOptions) {
      this.currentOptions.speechLanguage = newLang;
    }
    if (this.deepgramClient) {
      console.log('[TabCapture] Dynamically switching speech recognition language to:', newLang);
      await this.deepgramClient.setLanguage(newLang);
    }
    if (this.candidateDeepgramClient) {
      await this.candidateDeepgramClient.setLanguage(newLang);
    }
  }

  public reconnect(): void {
    if (this.deepgramClient) {
      console.log('[TabCapture] Manual reconnect called');
      this.deepgramClient.reconnect();
    }
  }

  public async startCapture(options?: TabCaptureOptions): Promise<TabCaptureResult> {
    this.currentOptions = options || null;
    const requestedSource = options?.source || 'mic';

    // 1. Create/resume AudioContext synchronously during user click to guarantee running state in Chrome
    if (typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!this.audioContext || this.audioContext.state === 'closed') {
        this.audioContext = new AudioCtx();
      }
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume().catch(() => {});
      }
    }

    try {
      // If user explicitly requests tab audio (e.g. from soundcheck or default start), prompt getDisplayMedia
      if (requestedSource === 'tab') {
        try {
          // Tier 1: Modern Chromium on Windows, macOS, Linux
          this.stream = await navigator.mediaDevices.getDisplayMedia({
            video: {
              displaySurface: 'browser',
              width: { ideal: 640, max: 1280 },
              height: { ideal: 360, max: 720 },
              frameRate: { ideal: 5, max: 10 },
            },
            audio: {
              suppressLocalAudioPlayback: false,
              echoCancellation: false,
              noiseSuppression: false,
              autoGainControl: false,
            },
            preferCurrentTab: false,
            selfBrowserSurface: 'exclude',
            systemAudio: 'include',
            surfaceSwitching: 'include',
          } as any);
        } catch (displayErr: any) {
          if (displayErr.name === 'NotAllowedError' || displayErr.name === 'AbortError') {
            console.warn('[TabCapture] User dismissed getDisplayMedia dialog. Falling back to default microphone.');
            if (typeof window !== 'undefined') {
              window.dispatchEvent(
                new CustomEvent('ghostboard:audio_toast', {
                  detail: { type: 'info', message: 'Вкладку не вибрано. Автоматично підключаємо ваш мікрофон.' },
                })
              );
            }
          } else {
            // Tier 2: Simpler constraints if browser rejected displaySurface or suppressLocalAudioPlayback
            try {
              this.stream = await navigator.mediaDevices.getDisplayMedia({
                video: true,
                audio: true,
              });
            } catch (retryErr: any) {
              console.warn('[TabCapture] Fallback getDisplayMedia cancelled or failed. Using mic instead.', retryErr);
              if (typeof window !== 'undefined') {
                window.dispatchEvent(
                  new CustomEvent('ghostboard:audio_toast', {
                    detail: { type: 'info', message: 'Перемкнулися на системний мікрофон.' },
                  })
                );
              }
            }
          }
        }
      }

      const audioTracks = this.stream ? this.stream.getAudioTracks() : [];
      const hasTabAudio = audioTracks.length > 0;

      if (requestedSource === 'tab') {
        if (!hasTabAudio) {
          console.warn('[TabCapture] Selected screen/window has no audio track.');
          if (typeof window !== 'undefined') {
            window.dispatchEvent(
              new CustomEvent('ghostboard:tab_audio_status', {
                detail: { hasTabAudio: false },
              })
            );
            window.dispatchEvent(
              new CustomEvent('ghostboard:audio_toast', {
                detail: {
                  type: 'warning',
                  message: 'Увага! У вікні вибору Chrome ви не поставили галочку «Поділитися аудіо вкладки». Для відповідей асистента потрібен звук співрозмовника.',
                },
              })
            );
          }
        } else if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('ghostboard:tab_audio_status', {
              detail: { hasTabAudio: true },
            })
          );
        }
      }

      // Capture default microphone directly if source is 'mic', or if includeMic requested, or if tab lacked audio
      if (requestedSource === 'mic' || options?.includeMic || !hasTabAudio) {
        try {
          const micAudio = await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: false,
              noiseSuppression: true,
              autoGainControl: false,
            },
          });
          this.micStream = micAudio;
          this.isMicActive = true;
          console.log('[TabCapture] Attached default microphone stream.');
        } catch (micErr) {
          console.warn('[TabCapture] Could not get default microphone audio:', micErr);
          if (!this.stream) {
            throw new Error('Не вдалося отримати доступ до мікрофона за замовчуванням. Перевірте дозволи браузера.');
          }
        }
      }

      // If no separate display stream, use micStream as the primary stream
      if (!this.stream && this.micStream) {
        this.stream = this.micStream;
      }

      if (!this.stream) {
        throw new Error('Не вдалося підключитися до аудіопристрою за замовчуванням.');
      }

      this.isCapturing = true;
      const tabTitle = this.stream.getVideoTracks()[0]?.label || 'Мікрофон за замовчуванням';

      // Set up Dual-Channel Web Audio pipeline for mixing, separate metering & isolated transcription
      if (typeof window !== 'undefined') {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (!this.audioContext || this.audioContext.state === 'closed') {
          this.audioContext = new AudioCtx();
        }
        if (this.audioContext.state === 'suspended') {
          await this.audioContext.resume().catch((err) => console.warn('AudioContext resume deferred:', err));
        }

        this.mixedDestination = this.audioContext.createMediaStreamDestination();
        
        // 1. General master analyser
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 64;

        // 2. Dedicated Interviewer analyser & gain node
        this.interviewerAnalyser = this.audioContext.createAnalyser();
        this.interviewerAnalyser.fftSize = 64;
        this.interviewerGainNode = this.audioContext.createGain();
        this.interviewerGainNode.gain.value = 1.0;
        this.interviewerGainNode.connect(this.interviewerAnalyser);

        // 3. Dedicated Candidate analyser & gain node
        this.candidateAnalyser = this.audioContext.createAnalyser();
        this.candidateAnalyser.fftSize = 64;
        this.candidateGainNode = this.audioContext.createGain();
        this.candidateGainNode.gain.value = 1.0;
        this.candidateGainNode.connect(this.candidateAnalyser);

        // Master mixing node that aggregates audio for MediaRecorder recording
        const masterMixNode = this.audioContext.createGain();
        masterMixNode.gain.value = 1.0;
        this.masterMixNode = masterMixNode;

        // Route tab audio (Interviewer) strictly to interviewerGainNode
        if (hasTabAudio && this.stream && this.stream !== this.micStream) {
          this.tabSourceNode = this.audioContext.createMediaStreamSource(this.stream);
          this.tabSourceNode.connect(this.interviewerGainNode);
          this.tabSourceNode.connect(masterMixNode);
        }

        // Route mic audio (Candidate) strictly to candidateGainNode
        if (this.micStream && this.isMicActive) {
          this.micSourceNode = this.audioContext.createMediaStreamSource(this.micStream);
          this.micSourceNode.connect(this.candidateGainNode);
          
          // In Acoustic / Room Mic Mode (when user chose mic or tab lacked audio track):
          // Connect mic to interviewerGainNode so the AI captures speech from laptop speakers!
          if (requestedSource === 'mic' || !hasTabAudio) {
            this.micSourceNode.connect(this.interviewerGainNode);
          }
          this.micSourceNode.connect(masterMixNode);
        }

        masterMixNode.connect(this.mixedDestination);
        masterMixNode.connect(this.analyser);

        // Real-time volume loop measuring both Interviewer and Candidate separately
        const tabDataArray = new Float32Array(64);
        const micDataArray = new Float32Array(64);
        let lastDispatched = 0;

        const checkVolume = (now: number) => {
          if (!this.isCapturing) return;

          let interviewerVol = 0;
          if (this.interviewerAnalyser && (hasTabAudio || requestedSource === 'mic' || !this.stream)) {
            this.interviewerAnalyser.getFloatTimeDomainData(tabDataArray);
            let sumSquares = 0;
            for (let i = 0; i < tabDataArray.length; i++) {
              sumSquares += tabDataArray[i] * tabDataArray[i];
            }
            const rms = Math.sqrt(sumSquares / tabDataArray.length);
            interviewerVol = Math.min(100, Math.round(rms * 10 * 100));
          }

          let candidateVol = 0;
          if (this.candidateAnalyser && this.micStream && this.isMicActive) {
            this.candidateAnalyser.getFloatTimeDomainData(micDataArray);
            let sumSquares = 0;
            for (let i = 0; i < micDataArray.length; i++) {
              sumSquares += micDataArray[i] * micDataArray[i];
            }
            const rms = Math.sqrt(sumSquares / micDataArray.length);
            candidateVol = Math.min(100, Math.round(rms * 10 * 100));
          }

          // Combined volume for global visual indicator
          const combinedVol = Math.max(interviewerVol, candidateVol);

          if (now - lastDispatched > 50) {
            lastDispatched = now;
            window.dispatchEvent(
              new CustomEvent('ghostboard:audio_volume', {
                detail: {
                  volume: combinedVol,
                  interviewer: interviewerVol,
                  candidate: candidateVol,
                },
              })
            );
            if (options?.onVolumeChange) {
              options.onVolumeChange(interviewerVol, candidateVol);
            }
          }
          requestAnimationFrame(checkVolume);
        };
        requestAnimationFrame(checkVolume);

        // ⚡ Deepgram Live Streaming: Ultra-low latency (~150-200ms) for INTERVIEWER SPEECH
        // STRICT RULE: Attaches ONLY to interviewerGainNode (Tab audio).
        // NEVER falls back to masterMixNode or microphone, guaranteeing the AI never hears candidate mic as interviewer!
        if (options?.deepgramApiKey && options?.onLiveTranscript && this.interviewerGainNode) {
          this.isDeepgramConfigured = true;
          try {
            this.deepgramClient = new DeepgramLiveClient();
            this.deepgramClient
              .startWithNode(this.audioContext, this.interviewerGainNode, {
                apiKey: options.deepgramApiKey,
                language: options.speechLanguage || 'uk',
                onTranscript: (res) => {
                  options.onLiveTranscript?.(res.text, res.isFinal, res.speechFinal, 'interviewer');
                },
                onStateChange: (state) => {
                  options.onConnectionStateChange?.(state);
                  if (typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('ghostboard:stt_state', { detail: state }));
                  }
                },
                onError: (err) => {
                  console.warn('[TabAudioCapture] Deepgram interviewer stream warning:', err);
                  // NEVER fall back to Web Speech API for interviewer, because Web Speech always uses the microphone!
                },
              })
              .catch((err) => {
                console.warn('[TabAudioCapture] Deepgram start error for interviewer:', err);
              });
          } catch (dgErr) {
            console.warn('[TabAudioCapture] Could not initialize Deepgram interviewer client:', dgErr);
          }
        }

        // 🎙️ Candidate Microphone Speech Transcription (Dedicated Isolated Stream)
        // Transcribes candidate mic separately via Deepgram Nova-3 (or Web Speech API strictly labeled 'candidate')
        if (this.micStream && this.isMicActive && options?.onLiveTranscript && this.candidateGainNode) {
          this.startCandidateSpeechRecognition(options);
        }
      }

      // Initialize MediaRecorder for streaming standalone audio chunks to AI
      if (options?.onAudioChunk && typeof MediaRecorder !== 'undefined') {
        const recordStream = this.mixedDestination
          ? this.mixedDestination.stream
          : new MediaStream(this.stream.getAudioTracks());

        let mimeType = 'audio/webm;codecs=opus';
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          if (MediaRecorder.isTypeSupported('audio/webm')) {
            mimeType = 'audio/webm';
          } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
            mimeType = 'audio/mp4';
          } else {
            mimeType = '';
          }
        }

        const interval = options.chunkIntervalMs || 15000;
        this.isLoopActive = true;
        let activeRecorder: MediaRecorder | null = null;
        let chunkStartTime = Date.now();
        let hasSpeechInChunk = false;
        let lastSpeechTime = 0;

        const flushCurrentChunk = () => {
          if (this.chunkTimeout) {
            clearTimeout(this.chunkTimeout);
            this.chunkTimeout = null;
          }
          if (activeRecorder && activeRecorder.state === 'recording') {
            try {
              activeRecorder.stop();
            } catch {}
          }
        };

        const prevOnVolume = options.onVolumeChange;
        options.onVolumeChange = (interviewerVol: number, candidateVol?: number) => {
          if (prevOnVolume) prevOnVolume(interviewerVol, candidateVol);
          const now = Date.now();
          // Flush only when interviewer finishes speaking!
          if (interviewerVol > 6) {
            hasSpeechInChunk = true;
            lastSpeechTime = now;
          } else if (hasSpeechInChunk) {
            const speechDuration = lastSpeechTime - chunkStartTime;
            const silenceDuration = now - lastSpeechTime;
            if (speechDuration >= 1000 && silenceDuration >= 750) {
              hasSpeechInChunk = false;
              flushCurrentChunk();
            }
          }
        };

        const startChunkSession = () => {
          if (!this.isCapturing || !this.isLoopActive) return;

          try {
            const recorder = mimeType
              ? new MediaRecorder(recordStream, { mimeType })
              : new MediaRecorder(recordStream);

            this.mediaRecorder = recorder;
            activeRecorder = recorder;
            chunkStartTime = Date.now();
            hasSpeechInChunk = false;
            lastSpeechTime = 0;

            const collectedBlobs: Blob[] = [];

            recorder.ondataavailable = (event: BlobEvent) => {
              if (event.data && event.data.size > 0) {
                collectedBlobs.push(event.data);
              }
            };

            recorder.onstop = () => {
              if (collectedBlobs.length > 0 && this.isCapturing) {
                const completeBlob = new Blob(collectedBlobs, { type: recorder.mimeType || 'audio/webm' });
                if (completeBlob.size > 1500) {
                  options.onAudioChunk?.(completeBlob);
                }
              }
              if (this.isCapturing && this.isLoopActive) {
                startChunkSession();
              }
            };

            recorder.start();

            this.chunkTimeout = setTimeout(() => {
              flushCurrentChunk();
            }, interval);
          } catch (recErr) {
            console.warn('Could not initialize MediaRecorder on audio stream:', recErr);
          }
        };

        startChunkSession();
      }

      // Handle user stopping share via browser native banner
      if (this.stream.getVideoTracks()[0]) {
        this.stream.getVideoTracks()[0].onended = () => {
          this.stopCapture();
        };
      }

      return {
        stream: this.stream,
        tabTitle,
        isMicIncluded: this.isMicActive,
        hasTabAudio,
      };
    } catch (err: any) {
      this.stopCapture();
      throw err;
    }
  }

  public async toggleMicInMix(): Promise<boolean> {
    if (!this.isCapturing || !this.audioContext || !this.mixedDestination) {
      return false;
    }

    if (this.micStream) {
      const nextActive = !this.isMicActive;
      this.micStream.getAudioTracks().forEach((track) => {
        track.enabled = nextActive;
      });
      this.isMicActive = nextActive;
      return this.isMicActive;
    } else {
      try {
        this.micStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
          },
        });
        this.micSourceNode = this.audioContext.createMediaStreamSource(this.micStream);
        this.micSourceNode.connect(this.mixedDestination);
        if (this.candidateGainNode) {
          this.micSourceNode.connect(this.candidateGainNode);
        }
        this.isMicActive = true;
        return true;
      } catch (err) {
        console.warn('Could not add microphone stream dynamically:', err);
        return false;
      }
    }
  }

  public stopCapture(): void {
    this.isCapturing = false;
    this.isLoopActive = false;

    if (this.deepgramClient) {
      try {
        this.deepgramClient.stop();
      } catch {}
      this.deepgramClient = null;
    }

    if (this.candidateDeepgramClient) {
      try {
        this.candidateDeepgramClient.stop();
      } catch {}
      this.candidateDeepgramClient = null;
    }

    if (this.chunkTimeout) {
      clearTimeout(this.chunkTimeout);
      this.chunkTimeout = null;
    }

    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      try {
        this.mediaRecorder.stop();
      } catch {}
      this.mediaRecorder = null;
    }

    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }

    if (this.micStream) {
      this.micStream.getTracks().forEach((track) => track.stop());
      this.micStream = null;
    }

    if (this.webSpeechRecognition) {
      try {
        this.webSpeechRecognition.stop();
      } catch {}
      this.webSpeechRecognition = null;
    }

    if (this.candidateSpeechRecognition) {
      try {
        this.candidateSpeechRecognition.stop();
      } catch {}
      this.candidateSpeechRecognition = null;
    }

    if (this.interviewerGainNode) {
      try { this.interviewerGainNode.disconnect(); } catch {}
      this.interviewerGainNode = null;
    }

    if (this.candidateGainNode) {
      try { this.candidateGainNode.disconnect(); } catch {}
      this.candidateGainNode = null;
    }

    if (this.audioContext && this.audioContext.state !== 'closed') {
      try {
        this.audioContext.close();
      } catch {}
      this.audioContext = null;
    }

    this.mixedDestination = null;
    this.tabSourceNode = null;
    this.micSourceNode = null;
    this.analyser = null;
    this.interviewerAnalyser = null;
    this.candidateAnalyser = null;
  }

  public async repickTabAudio(): Promise<boolean> {
    if (!this.audioContext || this.audioContext.state === 'closed') {
      return false;
    }
    try {
      const newDisplayStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: 'browser',
          width: { ideal: 640, max: 1280 },
          height: { ideal: 360, max: 720 },
          frameRate: { ideal: 5, max: 10 },
        },
        audio: {
          suppressLocalAudioPlayback: false,
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
        preferCurrentTab: false,
        selfBrowserSurface: 'exclude',
        systemAudio: 'include',
        surfaceSwitching: 'include',
      } as any);

      const tracks = newDisplayStream.getAudioTracks();
      if (tracks.length === 0) {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('ghostboard:audio_toast', {
              detail: {
                type: 'warning',
                message: 'В обраному вікні немає аудіодоріжки. Оберіть вкладку Chrome та поставте галочку «Поділитися аудіо вкладки».',
              },
            })
          );
        }
        return false;
      }

      // Stop old display tracks if any
      if (this.stream && this.stream !== this.micStream) {
        this.stream.getTracks().forEach((t) => t.stop());
      }
      this.stream = newDisplayStream;

      if (this.tabSourceNode) {
        try { this.tabSourceNode.disconnect(); } catch {}
      }

      this.tabSourceNode = this.audioContext.createMediaStreamSource(newDisplayStream);
      if (this.interviewerGainNode) {
        this.tabSourceNode.connect(this.interviewerGainNode);
      }
      if (this.masterMixNode) {
        this.tabSourceNode.connect(this.masterMixNode);
      }

      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('ghostboard:tab_audio_status', {
            detail: { hasTabAudio: true },
          })
        );
        window.dispatchEvent(
          new CustomEvent('ghostboard:audio_toast', {
            detail: {
              type: 'info',
              message: '✅ Аудіо вкладки співрозмовника успішно підключено!',
            },
          })
        );
      }
      return true;
    } catch (e) {
      console.warn('[TabAudioCapture] repickTabAudio error:', e);
      return false;
    }
  }

  private startCandidateSpeechRecognition(options?: TabCaptureOptions) {
    if (typeof window === 'undefined' || this.candidateDeepgramClient || this.candidateSpeechRecognition) return;

    // 1. Primary: Dedicated Deepgram Nova-3 WebSocket for Candidate mic (works 100% reliably on Linux)
    if (options?.deepgramApiKey && this.audioContext && this.candidateGainNode) {
      try {
        console.log('[TabAudioCapture] Launching dedicated Deepgram Live client for Candidate microphone...');
        this.candidateDeepgramClient = new DeepgramLiveClient();
        this.candidateDeepgramClient
          .startWithNode(this.audioContext, this.candidateGainNode, {
            apiKey: options.deepgramApiKey,
            language: options.speechLanguage || 'uk',
            onTranscript: (res) => {
              options.onLiveTranscript?.(res.text, res.isFinal, res.speechFinal, 'candidate');
            },
            onError: (err) => {
              console.warn('[TabAudioCapture] Candidate Deepgram client warning, falling back to Web Speech:', err);
              this.startCandidateWebSpeechFallback(options);
            },
          })
          .catch((err) => {
            console.warn('[TabAudioCapture] Candidate Deepgram client start error:', err);
            this.startCandidateWebSpeechFallback(options);
          });
        return;
      } catch (err) {
        console.warn('[TabAudioCapture] Could not instantiate candidate Deepgram client:', err);
      }
    }

    // 2. Secondary: Fallback to Web Speech API for candidate ONLY
    this.startCandidateWebSpeechFallback(options);
  }

  private startCandidateWebSpeechFallback(options?: TabCaptureOptions) {
    if (typeof window === 'undefined' || this.candidateSpeechRecognition) return;
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) return;

    try {
      const recognition = new SpeechRec();
      recognition.continuous = true;
      recognition.interimResults = true;
      const langMap: Record<string, string> = {
        uk: 'uk-UA',
        en: 'en-US',
        pl: 'pl-PL',
        de: 'de-DE',
        fr: 'fr-FR',
        es: 'es-ES',
        pt: 'pt-PT',
        it: 'it-IT',
        cs: 'cs-CZ',
        nl: 'nl-NL',
        ru: 'ru-RU',
        auto: 'uk-UA',
      };
      recognition.lang = langMap[options?.speechLanguage || 'uk'] || 'uk-UA';

      recognition.onresult = (event: any) => {
        let interim = '';
        let finalStr = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const item = event.results[i];
          if (item.isFinal) {
            finalStr += item[0].transcript + ' ';
          } else {
            interim += item[0].transcript;
          }
        }
        const text = (finalStr || interim).trim();
        if (text) {
          options?.onLiveTranscript?.(text, Boolean(finalStr), Boolean(finalStr), 'candidate');
        }
      };

      recognition.onerror = (e: any) => {
        if (e.error !== 'no-speech') {
          console.warn('[TabAudioCapture] Candidate Web Speech warning:', e);
        }
      };

      recognition.onend = () => {
        if (this.isCapturing && this.candidateSpeechRecognition) {
          try {
            recognition.start();
          } catch {}
        }
      };

      this.candidateSpeechRecognition = recognition;
      recognition.start();
      console.log('[TabAudioCapture] Candidate Web Speech fallback active (Isolated from AI)');
    } catch (e) {
      console.warn('[TabAudioCapture] Could not start candidate Web Speech fallback:', e);
    }
  }

  public isActive(): boolean {
    return this.isCapturing;
  }
}
