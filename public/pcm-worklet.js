class PCMProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.bufferSize = 4096;
    this.buffer = new Float32Array(this.bufferSize);
    this.bufferOffset = 0;
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    if (!input || !input[0]) return true;
    
    const channelData = input[0];
    for (let i = 0; i < channelData.length; i++) {
      this.buffer[this.bufferOffset++] = channelData[i];
      if (this.bufferOffset >= this.bufferSize) {
        this.flush();
      }
    }
    return true;
  }

  flush() {
    if (this.bufferOffset === 0) return;
    const pcm16 = new Int16Array(this.bufferOffset);
    for (let i = 0; i < this.bufferOffset; i++) {
      const sample = Math.max(-1, Math.min(1, this.buffer[i]));
      pcm16[i] = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
    }
    this.port.postMessage(pcm16.buffer, [pcm16.buffer]);
    this.bufferOffset = 0;
  }
}
registerProcessor('pcm-processor', PCMProcessor);
