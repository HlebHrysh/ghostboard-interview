class PCMProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.targetRate = 16000;
    this.sourceRate = typeof sampleRate !== 'undefined' ? sampleRate : 48000;
    this.ratio = this.sourceRate / this.targetRate;
    // 2048 16kHz samples = 128ms audio chunk for low-latency WebSocket streaming
    this.bufferSize = 2048;
    this.buffer = new Int16Array(this.bufferSize);
    this.bufferOffset = 0;
    this.sampleAccumulator = 0;
    this.weightAccumulator = 0;
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    if (!input || !input[0]) return true;

    const channelData = input[0];
    const inputLen = channelData.length;
    if (inputLen === 0) return true;

    // Fast path: if context is already ~16kHz, no resampling needed
    if (this.ratio <= 1.05 && this.ratio >= 0.95) {
      for (let i = 0; i < inputLen; i++) {
        const s = Math.max(-1, Math.min(1, channelData[i]));
        this.buffer[this.bufferOffset++] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        if (this.bufferOffset >= this.bufferSize) {
          this.flush();
        }
      }
      return true;
    }

    // Boxcar downsampling (area-averaging filter):
    // Accumulate each input sample until we reach ratio weights
    for (let i = 0; i < inputLen; i++) {
      const sample = channelData[i];
      let weight = 1.0;

      while (weight > 0) {
        const needed = this.ratio - this.weightAccumulator;
        if (weight >= needed) {
          this.sampleAccumulator += sample * needed;
          const averaged = this.sampleAccumulator / this.ratio;
          const clamped = Math.max(-1, Math.min(1, averaged));
          this.buffer[this.bufferOffset++] = clamped < 0 ? clamped * 0x8000 : clamped * 0x7FFF;
          if (this.bufferOffset >= this.bufferSize) {
            this.flush();
          }
          this.sampleAccumulator = 0;
          this.weightAccumulator = 0;
          weight -= needed;
        } else {
          this.sampleAccumulator += sample * weight;
          this.weightAccumulator += weight;
          weight = 0;
        }
      }
    }

    return true;
  }

  flush() {
    if (this.bufferOffset === 0) return;
    const out = new Int16Array(this.bufferOffset);
    out.set(this.buffer.subarray(0, this.bufferOffset));
    this.port.postMessage(out.buffer, [out.buffer]);
    this.bufferOffset = 0;
  }
}
registerProcessor('pcm-processor', PCMProcessor);
