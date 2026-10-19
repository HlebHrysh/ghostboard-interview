use rubato::{FastFixedIn, PolynomialDegree, Resampler};

pub const TARGET_SAMPLE_RATE: u32 = 16_000;
const DEFAULT_CHUNK_SIZE: usize = 1024;

/// Clamps a 32-bit float audio sample [-1.0, 1.0] to a signed 16-bit integer [-32768, 32767].
#[inline]
pub fn clamp_f32_to_i16(sample: f32) -> i16 {
    let clamped = sample.clamp(-1.0, 1.0);
    if clamped < 0.0 {
        let val = (clamped * 32768.0).round() as i32;
        val.clamp(-32768, 32767) as i16
    } else {
        let val = (clamped * 32767.0).round() as i32;
        val.clamp(-32768, 32767) as i16
    }
}

/// Converts a slice of Float32 samples to 16-bit linear PCM little-endian byte vector.
pub fn f32_to_pcm16_bytes(samples: &[f32]) -> Vec<u8> {
    let mut bytes = Vec::with_capacity(samples.len() * 2);
    for &sample in samples {
        let pcm = clamp_f32_to_i16(sample);
        bytes.extend_from_slice(&pcm.to_le_bytes());
    }
    bytes
}

/// Converts a slice of Float32 samples to i16 linear PCM vector.
pub fn f32_to_i16_samples(samples: &[f32]) -> Vec<i16> {
    samples.iter().map(|&s| clamp_f32_to_i16(s)).collect()
}

/// Downmixes multi-channel interleaved Float32 audio to mono Float32 audio.
/// x_mono[i] = (1/N) * sum(c=0..N-1, x[i * N + c])
pub fn downmix_to_mono(interleaved: &[f32], channels: u16) -> Vec<f32> {
    let ch = channels as usize;
    if ch <= 1 {
        return interleaved.to_vec();
    }
    let frames = interleaved.len() / ch;
    let mut mono = Vec::with_capacity(frames);
    let inv_ch = 1.0 / (ch as f32);
    for chunk in interleaved.chunks_exact(ch) {
        let sum: f32 = chunk.iter().sum();
        mono.push(sum * inv_ch);
    }
    mono
}

/// Computes root-mean-square (RMS) volume level mapped to 0.0 - 100.0 conversational scale.
/// Conversational speech in Float32 [-1.0, 1.0] has RMS ~0.01 - 0.10.
/// Multiplying by 1000.0 maps standard conversation to 10 - 100, clamped to 0.0 - 100.0.
pub fn compute_rms_level(samples: &[f32]) -> f32 {
    if samples.is_empty() {
        return 0.0;
    }
    let sum_sq: f32 = samples.iter().map(|&s| s * s).sum();
    let mean_sq = sum_sq / (samples.len() as f32);
    let rms = mean_sq.sqrt();
    (rms * 1000.0).clamp(0.0, 100.0)
}

/// Polyphase real-time audio resampler converting arbitrary input sample rates and channels
/// to 16kHz mono Float32 and 16-bit linear PCM.
pub struct AudioResampler {
    input_sample_rate: u32,
    target_sample_rate: u32,
    channels: u16,
    resampler: Option<FastFixedIn<f32>>,
    chunk_size: usize,
    input_fifo: Vec<f32>,
}

impl AudioResampler {
    /// Creates a new AudioResampler.
    /// If input_sample_rate == TARGET_SAMPLE_RATE (16,000 Hz), resampling is bypassed.
    pub fn new(
        input_sample_rate: u32,
        channels: u16,
    ) -> Result<Self, String> {
        Self::with_target_rate(input_sample_rate, TARGET_SAMPLE_RATE, channels, DEFAULT_CHUNK_SIZE)
    }

    pub fn with_target_rate(
        input_sample_rate: u32,
        target_sample_rate: u32,
        channels: u16,
        chunk_size: usize,
    ) -> Result<Self, String> {
        if input_sample_rate == 0 || target_sample_rate == 0 || channels == 0 {
            return Err("Invalid sample rate or channel count (must be > 0)".to_string());
        }

        let resampler = if input_sample_rate == target_sample_rate {
            None
        } else {
            let resample_ratio = target_sample_rate as f64 / input_sample_rate as f64;
            let r = FastFixedIn::<f32>::new(
                resample_ratio,
                1.0,
                PolynomialDegree::Cubic,
                chunk_size,
                1, // Resample mono after downmix
            )
            .map_err(|e| format!("Failed to create rubato resampler: {:?}", e))?;
            Some(r)
        };

        Ok(Self {
            input_sample_rate,
            target_sample_rate,
            channels,
            resampler,
            chunk_size,
            input_fifo: Vec::new(),
        })
    }

    pub fn input_sample_rate(&self) -> u32 {
        self.input_sample_rate
    }

    pub fn target_sample_rate(&self) -> u32 {
        self.target_sample_rate
    }

    pub fn channels(&self) -> u16 {
        self.channels
    }

    /// Calculates theoretical expected output samples for a given input sample count.
    pub fn calculate_expected_output_samples(&self, input_samples_interleaved: usize) -> usize {
        let mono_samples = input_samples_interleaved / (self.channels as usize);
        if self.input_sample_rate == self.target_sample_rate {
            mono_samples
        } else {
            ((mono_samples as f64) * (self.target_sample_rate as f64) / (self.input_sample_rate as f64)).round() as usize
        }
    }

    /// Processes interleaved Float32 audio samples and produces 16kHz mono Float32 samples.
    pub fn process_interleaved_f32(&mut self, interleaved: &[f32]) -> Result<Vec<f32>, String> {
        let mono = downmix_to_mono(interleaved, self.channels);

        if self.resampler.is_none() {
            // Bypass mode: sample rates already match
            return Ok(mono);
        }

        self.input_fifo.extend_from_slice(&mono);
        let mut output = Vec::new();
        let chunk_size = self.chunk_size;

        if let Some(ref mut resampler) = self.resampler {
            while self.input_fifo.len() >= chunk_size {
                let chunk: Vec<f32> = self.input_fifo.drain(0..chunk_size).collect();
                let wave_in = vec![chunk];
                let wave_out = resampler
                    .process(&wave_in, None)
                    .map_err(|e| format!("Rubato resample error: {:?}", e))?;
                if let Some(ch0) = wave_out.into_iter().next() {
                    output.extend(ch0);
                }
            }
        }

        Ok(output)
    }

    /// Processes interleaved Float32 audio samples and produces 16kHz mono 16-bit linear PCM bytes (little-endian).
    pub fn process_to_pcm16_le(&mut self, interleaved: &[f32]) -> Result<Vec<u8>, String> {
        let mono_16k = self.process_interleaved_f32(interleaved)?;
        Ok(f32_to_pcm16_bytes(&mono_16k))
    }

    /// Flushes any remaining samples in the FIFO by padding with zeros to chunk_size.
    pub fn flush(&mut self) -> Result<Vec<f32>, String> {
        if self.input_fifo.is_empty() || self.resampler.is_none() {
            let remaining = std::mem::take(&mut self.input_fifo);
            return Ok(remaining);
        }

        let unpadded_len = self.input_fifo.len();
        let needed = self.chunk_size - unpadded_len;
        self.input_fifo.extend(std::iter::repeat(0.0f32).take(needed));

        let chunk: Vec<f32> = self.input_fifo.drain(..).collect();
        let wave_in = vec![chunk];
        let mut output = Vec::new();
        if let Some(ref mut resampler) = self.resampler {
            let wave_out = resampler
                .process(&wave_in, None)
                .map_err(|e| format!("Rubato resample error on flush: {:?}", e))?;
            if let Some(ch0) = wave_out.into_iter().next() {
                let expected_out = ((unpadded_len as f64) * (self.target_sample_rate as f64)
                    / (self.input_sample_rate as f64))
                    .round() as usize;
                let actual = std::cmp::min(expected_out, ch0.len());
                output.extend_from_slice(&ch0[..actual]);
            }
        }
        Ok(output)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_pcm_clamping_boundaries() {
        assert_eq!(clamp_f32_to_i16(0.0), 0);
        assert_eq!(clamp_f32_to_i16(1.0), 32767);
        assert_eq!(clamp_f32_to_i16(-1.0), -32768);
        assert_eq!(clamp_f32_to_i16(2.5), 32767);
        assert_eq!(clamp_f32_to_i16(-5.0), -32768);
        assert_eq!(clamp_f32_to_i16(0.5), 16384);
        assert_eq!(clamp_f32_to_i16(-0.5), -16384);
    }

    #[test]
    fn test_pcm16_little_endian_serialization() {
        let samples = vec![0.0f32, 1.0f32, -1.0f32];
        let bytes = f32_to_pcm16_bytes(&samples);
        assert_eq!(bytes.len(), 6);

        // 0 -> [0x00, 0x00]
        assert_eq!(bytes[0], 0x00);
        assert_eq!(bytes[1], 0x00);

        // 32767 (0x7FFF) -> [0xFF, 0x7F] in LE
        assert_eq!(bytes[2], 0xFF);
        assert_eq!(bytes[3], 0x7F);

        // -32768 (0x8000) -> [0x00, 0x80] in LE
        assert_eq!(bytes[4], 0x00);
        assert_eq!(bytes[5], 0x80);
    }

    #[test]
    fn test_downmix_to_mono() {
        // Stereo: L=1.0, R=0.0 -> Mono = 0.5
        let stereo = vec![1.0f32, 0.0, -0.5, 0.5, 0.2, 0.8];
        let mono = downmix_to_mono(&stereo, 2);
        assert_eq!(mono.len(), 3);
        assert!((mono[0] - 0.5).abs() < 1e-6);
        assert!((mono[1] - 0.0).abs() < 1e-6);
        assert!((mono[2] - 0.5).abs() < 1e-6);

        // Mono passthrough
        let single = vec![0.3f32, -0.4, 0.8];
        let mono_single = downmix_to_mono(&single, 1);
        assert_eq!(mono_single, single);
    }

    #[test]
    fn test_resampling_ratio_calculations() {
        let resampler_48k = AudioResampler::new(48000, 2).unwrap();
        // 48000 stereo samples = 24000 frames -> at 16k output should be 8000 samples (1/3)
        assert_eq!(resampler_48k.calculate_expected_output_samples(48000), 8000);

        let resampler_44k = AudioResampler::new(44100, 2).unwrap();
        // 44100 stereo samples = 22050 frames -> at 16k output should be ~8000 samples (22050 * 16000 / 44100 = 8000)
        assert_eq!(resampler_44k.calculate_expected_output_samples(44100), 8000);

        let resampler_16k = AudioResampler::new(16000, 1).unwrap();
        assert_eq!(resampler_16k.calculate_expected_output_samples(16000), 16000);
    }

    #[test]
    fn test_resampler_48k_to_16k_processing() {
        let mut resampler = AudioResampler::with_target_rate(48000, 16000, 2, 512).unwrap();
        // 48000 Hz stereo: feed 5 seconds of audio (5 * 48000 * 2 = 480,000 samples)
        // Sine wave at 440 Hz
        let total_frames = 48000 * 2;
        let mut input = Vec::with_capacity(total_frames * 2);
        for i in 0..total_frames {
            let t = i as f32 / 48000.0;
            let sample = (2.0 * std::f32::consts::PI * 440.0 * t).sin() * 0.8;
            input.push(sample); // Left
            input.push(sample); // Right
        }

        let pcm_bytes = resampler.process_to_pcm16_le(&input).unwrap();
        // 2 seconds at 16000 Hz = 32000 mono samples = 64000 bytes
        // With chunk buffering, output should be very close to 64000 bytes
        let samples_count = pcm_bytes.len() / 2;
        let diff = (samples_count as i64 - 32000).abs();
        assert!(diff < 600, "Output sample count {} not close to 32000", samples_count);
    }

    #[test]
    fn test_compute_rms_level() {
        // Empty samples
        assert_eq!(compute_rms_level(&[]), 0.0);

        // Silence (all zeros)
        let silence = vec![0.0f32; 480];
        assert_eq!(compute_rms_level(&silence), 0.0);

        // Conversational level: constant 0.05 amplitude -> RMS = 0.05 -> level = 50.0
        let speech = vec![0.05f32; 480];
        let lvl = compute_rms_level(&speech);
        assert!((lvl - 50.0).abs() < 1e-3, "Expected 50.0, got {}", lvl);

        // Extremely loud / clipped level: 2.0 amplitude -> clamped to 100.0
        let loud = vec![2.0f32; 480];
        assert_eq!(compute_rms_level(&loud), 100.0);
    }
}
