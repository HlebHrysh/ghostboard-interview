pub mod capture;
pub mod resampler;
pub mod ringbuffer;
pub mod vad;

use crate::audio::capture::{
    find_loopback_device, find_microphone_device, AudioCaptureStream, CaptureSource,
};
use crate::audio::resampler::AudioResampler;
use crate::audio::ringbuffer::{AudioBufferPool, AudioConsumer};
use crate::audio::vad::{SileroVad, VadFrameResult};
use serde::{Deserialize, Serialize};
use std::sync::Mutex;

pub const DEFAULT_AUDIO_BUFFER_CAPACITY: usize = 192_000; // ~4s at 48kHz stereo

/// Configuration for the AudioEngine.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AudioEngineConfig {
    pub source: CaptureSource,
    pub buffer_capacity: usize,
    pub custom_device_name: Option<String>,
}

impl Default for AudioEngineConfig {
    fn default() -> Self {
        Self {
            source: CaptureSource::Dual,
            buffer_capacity: DEFAULT_AUDIO_BUFFER_CAPACITY,
            custom_device_name: None,
        }
    }
}

/// Consolidated tick output from the AudioEngine processing loop.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AudioEngineTickResult {
    /// 16kHz mono linear 16-bit PCM bytes (ready for Deepgram STT WebSocket).
    pub pcm16_bytes: Vec<u8>,
    /// 16kHz mono Float32 audio samples.
    pub samples_16k: Vec<f32>,
    /// Frame-by-frame VAD evaluation results.
    pub vad_results: Vec<VadFrameResult>,
    /// Whether any frame in this tick contained active speech.
    pub speech_detected: bool,
    /// Whether a speech pause boundary was triggered (>350ms silence after speech).
    pub pause_boundary_triggered: bool,
    /// Latest speech probability [0.0, 1.0].
    pub latest_speech_probability: f32,
    /// 30ms RMS level for loopback / interlocutor audio [0.0, 100.0]
    #[serde(default)]
    pub interlocutor_rms: f32,

    /// Candidate mic 16kHz mono linear 16-bit PCM bytes
    #[serde(default)]
    pub candidate_pcm16_bytes: Vec<u8>,
    /// Candidate mic 16kHz mono Float32 samples
    #[serde(default)]
    pub candidate_samples_16k: Vec<f32>,
    /// 30ms RMS level for candidate microphone audio [0.0, 100.0]
    #[serde(default)]
    pub candidate_rms: f32,
    /// Whether candidate mic detected speech
    #[serde(default)]
    pub candidate_speech_detected: bool,
}

/// Central AudioEngine coordinating real-time loopback capture, lock-free ring-buffering,
/// polyphase 16kHz mono resampling, and neural Silero VAD pause detection.
pub struct AudioEngine {
    config: AudioEngineConfig,
    // Loopback (Interlocutor) stream components
    loopback_stream: Option<AudioCaptureStream>,
    loopback_consumer: Option<AudioConsumer>,
    loopback_resampler: Option<AudioResampler>,
    loopback_vad: Option<SileroVad>,
    // Microphone (Candidate) stream components
    mic_stream: Option<AudioCaptureStream>,
    mic_consumer: Option<AudioConsumer>,
    mic_resampler: Option<AudioResampler>,
    mic_vad: Option<SileroVad>,
    is_running: bool,
}

impl AudioEngine {
    /// Creates a new unstarted AudioEngine with default configuration.
    pub fn new(config: AudioEngineConfig) -> Self {
        Self {
            config,
            loopback_stream: None,
            loopback_consumer: None,
            loopback_resampler: None,
            loopback_vad: None,
            mic_stream: None,
            mic_consumer: None,
            mic_resampler: None,
            mic_vad: None,
            is_running: false,
        }
    }

    pub fn is_running(&self) -> bool {
        self.is_running
    }

    pub fn config(&self) -> &AudioEngineConfig {
        &self.config
    }

    pub fn set_source(&mut self, source: CaptureSource) {
        self.config.source = source;
    }

    /// Initializes and starts real-time audio capture, ring buffer, resampler, and Silero VAD.
    /// Supports simultaneous dual capture of both native system loopback and candidate microphone.
    pub fn start(&mut self) -> Result<(), String> {
        if self.is_running {
            return Ok(());
        }

        let host = cpal::default_host();
        let mut loopback_started = false;
        let mut mic_started = false;
        let mut last_error = None;

        let should_start_loopback = matches!(
            self.config.source,
            CaptureSource::SystemLoopback | CaptureSource::Dual
        );
        let should_start_mic = matches!(
            self.config.source,
            CaptureSource::Microphone | CaptureSource::Dual
        );

        // 1. Initialize System Loopback Stream (Remote Interlocutor)
        if should_start_loopback {
            match find_loopback_device(&host) {
                Ok(device) => {
                    let pool = AudioBufferPool::new(self.config.buffer_capacity);
                    let (producer, consumer) = pool.split();
                    match AudioCaptureStream::start(device, producer) {
                        Ok(capture_stream) => {
                            let sample_rate = capture_stream.sample_rate();
                            let channels = capture_stream.channels();
                            match AudioResampler::new(sample_rate, channels) {
                                Ok(resampler) => match SileroVad::new() {
                                    Ok(vad) => {
                                        self.loopback_stream = Some(capture_stream);
                                        self.loopback_consumer = Some(consumer);
                                        self.loopback_resampler = Some(resampler);
                                        self.loopback_vad = Some(vad);
                                        loopback_started = true;
                                    }
                                    Err(e) => last_error = Some(format!("Loopback VAD error: {}", e)),
                                },
                                Err(e) => last_error = Some(format!("Loopback resampler error: {}", e)),
                            }
                        }
                        Err(e) => last_error = Some(format!("Loopback stream start error: {}", e)),
                    }
                }
                Err(e) => last_error = Some(format!("Loopback device discovery error: {}", e)),
            }
        }

        // 2. Initialize Microphone Stream (Local Candidate)
        if should_start_mic {
            match find_microphone_device(&host) {
                Ok(device) => {
                    let pool = AudioBufferPool::new(self.config.buffer_capacity);
                    let (producer, consumer) = pool.split();
                    match AudioCaptureStream::start(device, producer) {
                        Ok(capture_stream) => {
                            let sample_rate = capture_stream.sample_rate();
                            let channels = capture_stream.channels();
                            match AudioResampler::new(sample_rate, channels) {
                                Ok(resampler) => match SileroVad::new() {
                                    Ok(vad) => {
                                        self.mic_stream = Some(capture_stream);
                                        self.mic_consumer = Some(consumer);
                                        self.mic_resampler = Some(resampler);
                                        self.mic_vad = Some(vad);
                                        mic_started = true;
                                    }
                                    Err(e) => last_error = Some(format!("Microphone VAD error: {}", e)),
                                },
                                Err(e) => last_error = Some(format!("Microphone resampler error: {}", e)),
                            }
                        }
                        Err(e) => last_error = Some(format!("Microphone stream start error: {}", e)),
                    }
                }
                Err(e) => last_error = Some(format!("Microphone device discovery error: {}", e)),
            }
        }

        if loopback_started || mic_started {
            self.is_running = true;
            Ok(())
        } else {
            Err(last_error.unwrap_or_else(|| "Failed to initialize any audio stream".to_string()))
        }
    }

    /// Reads newly available audio from the ring buffers, resamples both to 16kHz mono linear PCM,
    /// computes 30ms RMS levels, and processes VAD frames.
    pub fn poll_and_process(&mut self) -> Result<AudioEngineTickResult, String> {
        let mut pcm16_bytes = Vec::new();
        let mut samples_16k = Vec::new();
        let mut vad_results = Vec::new();
        let mut speech_detected = false;
        let mut pause_boundary_triggered = false;
        let mut latest_speech_probability = 0.0;
        let mut interlocutor_rms = 0.0;

        let mut candidate_pcm16_bytes = Vec::new();
        let mut candidate_samples_16k = Vec::new();
        let mut candidate_rms = 0.0;
        let mut candidate_speech_detected = false;

        // 1. Process Loopback (Interlocutor) stream
        if let (Some(consumer), Some(resampler), Some(vad)) = (
            self.loopback_consumer.as_mut(),
            self.loopback_resampler.as_mut(),
            self.loopback_vad.as_mut(),
        ) {
            let raw_samples = consumer.pop_all();
            if !raw_samples.is_empty() {
                if let Ok(resampled) = resampler.process_interleaved_f32(&raw_samples) {
                    interlocutor_rms = resampler::compute_rms_level(&resampled);
                    pcm16_bytes = resampler::f32_to_pcm16_bytes(&resampled);
                    if let Ok(results) = vad.process_samples(&resampled) {
                        for res in &results {
                            latest_speech_probability = res.speech_probability;
                            if res.is_speech {
                                speech_detected = true;
                            }
                            if res.pause_boundary_triggered {
                                pause_boundary_triggered = true;
                            }
                        }
                        vad_results = results;
                    }
                    samples_16k = resampled;
                }
            }
        }

        // 2. Process Microphone (Candidate) stream
        if let (Some(consumer), Some(resampler), Some(vad)) = (
            self.mic_consumer.as_mut(),
            self.mic_resampler.as_mut(),
            self.mic_vad.as_mut(),
        ) {
            let raw_samples = consumer.pop_all();
            if !raw_samples.is_empty() {
                if let Ok(resampled) = resampler.process_interleaved_f32(&raw_samples) {
                    candidate_rms = resampler::compute_rms_level(&resampled);
                    candidate_pcm16_bytes = resampler::f32_to_pcm16_bytes(&resampled);
                    if let Ok(results) = vad.process_samples(&resampled) {
                        for res in &results {
                            if res.is_speech {
                                candidate_speech_detected = true;
                            }
                        }
                    }
                    candidate_samples_16k = resampled;
                }
            }
        }

        Ok(AudioEngineTickResult {
            pcm16_bytes,
            samples_16k,
            vad_results,
            speech_detected,
            pause_boundary_triggered,
            latest_speech_probability,
            interlocutor_rms,
            candidate_pcm16_bytes,
            candidate_samples_16k,
            candidate_rms,
            candidate_speech_detected,
        })
    }

    /// Stops audio capture and frees audio resources.
    pub fn stop(&mut self) {
        if let Some(stream) = self.loopback_stream.take() {
            stream.pause();
        }
        if let Some(stream) = self.mic_stream.take() {
            stream.pause();
        }
        self.loopback_consumer = None;
        self.loopback_resampler = None;
        self.loopback_vad = None;
        self.mic_consumer = None;
        self.mic_resampler = None;
        self.mic_vad = None;
        self.is_running = false;
    }

    /// Pauses audio capture streams without tearing down processing components.
    pub fn pause(&self) {
        if let Some(ref stream) = self.loopback_stream {
            stream.pause();
        }
        if let Some(ref stream) = self.mic_stream {
            stream.pause();
        }
    }

    /// Resumes audio capture streams.
    pub fn resume(&self) {
        if let Some(ref stream) = self.loopback_stream {
            stream.resume();
        }
        if let Some(ref stream) = self.mic_stream {
            stream.resume();
        }
    }

    /// Resets VAD state and counters on all streams.
    pub fn reset_vad(&mut self) {
        if let Some(ref mut vad) = self.loopback_vad {
            vad.reset();
        }
        if let Some(ref mut vad) = self.mic_vad {
            vad.reset();
        }
    }
}

// Global thread-safe singleton state holder for Tauri commands
#[derive(Clone)]
pub struct GlobalAudioState {
    pub engine: std::sync::Arc<Mutex<AudioEngine>>,
}

impl Default for GlobalAudioState {
    fn default() -> Self {
        Self {
            engine: std::sync::Arc::new(Mutex::new(AudioEngine::new(AudioEngineConfig::default()))),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_audio_engine_offline_pipeline() {
        let pool = AudioBufferPool::new(16384);
        let (mut producer, consumer) = pool.split();

        let mut resampler = AudioResampler::new(48000, 2).unwrap();
        let mut vad = SileroVad::new().unwrap();

        // Simulate 48kHz stereo input (sine wave)
        let frames = 4800; // 0.1s of audio
        let mut mock_stereo = Vec::with_capacity(frames * 2);
        for i in 0..frames {
            let t = i as f32 / 48000.0;
            let val = (2.0 * std::f32::consts::PI * 440.0 * t).sin() * 0.8;
            mock_stereo.push(val);
            mock_stereo.push(val);
        }

        let written = producer.push_slice(&mock_stereo);
        assert_eq!(written, mock_stereo.len());

        let mut consumer_mut = consumer;
        let drained = consumer_mut.pop_all();
        assert_eq!(drained.len(), mock_stereo.len());

        let mut samples_16k = resampler.process_interleaved_f32(&drained).unwrap();
        let flushed = resampler.flush().unwrap();
        samples_16k.extend(flushed);

        // 4800 stereo frames at 48k -> 1600 mono frames at 16k
        let diff = (samples_16k.len() as i64 - 1600).abs();
        assert!(diff < 50, "Expected ~1600 samples, got {}", samples_16k.len());

        let pcm_bytes = resampler::f32_to_pcm16_bytes(&samples_16k);
        assert_eq!(pcm_bytes.len(), samples_16k.len() * 2);

        let vad_results = vad.process_samples(&samples_16k).unwrap();
        // 1600 samples / 512 = 3 full frames
        assert_eq!(vad_results.len(), 3);
    }

    #[test]
    fn test_audio_engine_offline_dual_pipeline() {
        let pool_loop = AudioBufferPool::new(16384);
        let (mut prod_loop, cons_loop) = pool_loop.split();

        let pool_mic = AudioBufferPool::new(16384);
        let (mut prod_mic, cons_mic) = pool_mic.split();

        let mut resampler_loop = AudioResampler::new(48000, 2).unwrap();
        let mut vad_loop = SileroVad::new().unwrap();

        let mut resampler_mic = AudioResampler::new(48000, 1).unwrap();
        let mut vad_mic = SileroVad::new().unwrap();

        // 1. Push loopback stereo sine audio
        let frames = 4800;
        let mut mock_loop = Vec::with_capacity(frames * 2);
        for i in 0..frames {
            let t = i as f32 / 48000.0;
            let val = (2.0 * std::f32::consts::PI * 440.0 * t).sin() * 0.1;
            mock_loop.push(val);
            mock_loop.push(val);
        }
        prod_loop.push_slice(&mock_loop);

        // 2. Push mic mono speech audio
        let mut mock_mic = Vec::with_capacity(frames);
        for i in 0..frames {
            let t = i as f32 / 48000.0;
            let val = (2.0 * std::f32::consts::PI * 220.0 * t).sin() * 0.05;
            mock_mic.push(val);
        }
        prod_mic.push_slice(&mock_mic);

        // 3. Process loopback
        let mut cons_loop_mut = cons_loop;
        let drained_loop = cons_loop_mut.pop_all();
        let samples_loop = resampler_loop.process_interleaved_f32(&drained_loop).unwrap();
        let rms_loop = resampler::compute_rms_level(&samples_loop);
        let pcm_loop = resampler::f32_to_pcm16_bytes(&samples_loop);
        let vad_res_loop = vad_loop.process_samples(&samples_loop).unwrap();

        // 4. Process mic
        let mut cons_mic_mut = cons_mic;
        let drained_mic = cons_mic_mut.pop_all();
        let samples_mic = resampler_mic.process_interleaved_f32(&drained_mic).unwrap();
        let rms_mic = resampler::compute_rms_level(&samples_mic);
        let pcm_mic = resampler::f32_to_pcm16_bytes(&samples_mic);
        let vad_res_mic = vad_mic.process_samples(&samples_mic).unwrap();

        assert!(rms_loop > 0.0, "Loopback RMS should be > 0.0");
        assert!(rms_mic > 0.0, "Mic RMS should be > 0.0");
        assert_eq!(pcm_loop.len(), samples_loop.len() * 2);
        assert_eq!(pcm_mic.len(), samples_mic.len() * 2);
        assert!(!vad_res_loop.is_empty());
        assert!(!vad_res_mic.is_empty());

        let tick = AudioEngineTickResult {
            pcm16_bytes: pcm_loop,
            samples_16k: samples_loop,
            vad_results: vad_res_loop,
            speech_detected: true,
            pause_boundary_triggered: false,
            latest_speech_probability: 0.9,
            interlocutor_rms: rms_loop,
            candidate_pcm16_bytes: pcm_mic,
            candidate_samples_16k: samples_mic,
            candidate_rms: rms_mic,
            candidate_speech_detected: false,
        };

        assert!(tick.interlocutor_rms > 0.0);
        assert!(tick.candidate_rms > 0.0);
        assert!(!tick.candidate_pcm16_bytes.is_empty());
    }
}
