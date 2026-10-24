use crate::audio::ringbuffer::AudioProducer;
use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
use cpal::{Device, Host, SampleFormat, Stream, StreamConfig, SupportedStreamConfig};
use serde::{Deserialize, Serialize};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;

/// Capture source mode
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum CaptureSource {
    /// Remote interlocutor audio (System audio loopback / Tab audio)
    SystemLoopback,
    /// Candidate local microphone
    Microphone,
    /// Simultaneous capture of both System Loopback (interlocutor) and Microphone (candidate)
    Dual,
}

/// Metadata about an audio capture device
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AudioDeviceInfo {
    pub name: String,
    pub is_default: bool,
    pub is_loopback_capable: bool,
    pub default_sample_rate: u32,
    pub default_channels: u16,
}

/// Finds the optimal device for system audio loopback capture.
/// - Windows: WASAPI loopback capture on default render device.
/// - macOS: CoreAudio tap or screen audio tap.
/// - Linux: PulseAudio / PipeWire `.monitor` sink capture.
pub fn find_loopback_device(host: &Host) -> Result<Device, String> {
    #[cfg(windows)]
    {
        // On Windows, WASAPI loopback capture is initiated by building an input stream
        // on the default OUTPUT (render) device.
        if let Some(device) = host.default_output_device() {
            return Ok(device);
        }
    }

    #[cfg(target_os = "macos")]
    {
        // On macOS, prefer default output device if loopback is supported or fallback to input
        if let Some(device) = host.default_output_device() {
            return Ok(device);
        }
        if let Some(device) = host.default_input_device() {
            return Ok(device);
        }
    }

    #[cfg(target_os = "linux")]
    {
        // On Linux, PipeWire and PulseAudio provide `.monitor` sinks under input devices.
        if let Ok(devices) = host.input_devices() {
            for device in devices {
                if let Ok(name) = device.name() {
                    let lower = name.to_lowercase();
                    if lower.contains(".monitor") || lower.contains("monitor") {
                        return Ok(device);
                    }
                }
            }
        }

        // Check for pulse / pipewire explicit virtual devices
        if let Ok(devices) = host.input_devices() {
            for device in devices {
                if let Ok(name) = device.name() {
                    let lower = name.to_lowercase();
                    if lower == "pulse" || lower == "pipewire" || lower == "default" {
                        return Ok(device);
                    }
                }
            }
        }

        if let Some(device) = host.default_input_device() {
            return Ok(device);
        }
        if let Some(device) = host.default_output_device() {
            return Ok(device);
        }
    }

    #[cfg(not(any(windows, target_os = "macos", target_os = "linux")))]
    {
        if let Some(device) = host.default_input_device() {
            return Ok(device);
        }
    }

    // Ultimate fallback
    host.default_output_device()
        .or_else(|| host.default_input_device())
        .ok_or_else(|| "No loopback or audio capture device found on host system".to_string())
}

/// Finds the default candidate microphone device.
pub fn find_microphone_device(host: &Host) -> Result<Device, String> {
    host.default_input_device()
        .or_else(|| host.default_output_device())
        .ok_or_else(|| "No default microphone input device found".to_string())
}

/// Lists all available input and loopback audio devices for UI selection.
pub fn list_audio_devices(host: &Host) -> Vec<AudioDeviceInfo> {
    let mut result = Vec::new();
    let default_in_name = host.default_input_device().and_then(|d| d.name().ok());

    if let Ok(devices) = host.input_devices() {
        for dev in devices {
            if let Ok(name) = dev.name() {
                let is_default = default_in_name.as_deref() == Some(&name);
                let is_monitor = name.to_lowercase().contains("monitor");

                let (sr, ch) = if let Ok(cfg) = dev.default_input_config() {
                    (cfg.sample_rate().0, cfg.channels())
                } else {
                    (48000, 2)
                };

                result.push(AudioDeviceInfo {
                    name,
                    is_default,
                    is_loopback_capable: is_monitor,
                    default_sample_rate: sr,
                    default_channels: ch,
                });
            }
        }
    }

    result
}

/// Active running audio capture stream wrapping cpal::Stream.
pub struct AudioCaptureStream {
    _stream: Stream,
    device_name: String,
    sample_rate: u32,
    channels: u16,
    is_running: Arc<AtomicBool>,
}

unsafe impl Send for AudioCaptureStream {}
unsafe impl Sync for AudioCaptureStream {}

impl AudioCaptureStream {
    pub fn device_name(&self) -> &str {
        &self.device_name
    }

    pub fn sample_rate(&self) -> u32 {
        self.sample_rate
    }

    pub fn channels(&self) -> u16 {
        self.channels
    }

    pub fn is_running(&self) -> bool {
        self.is_running.load(Ordering::SeqCst)
    }

    /// Spawns a real-time audio capture stream and begins pushing samples into the ring buffer producer.
    pub fn start(
        device: Device,
        mut producer: AudioProducer,
    ) -> Result<Self, String> {
        let device_name = device
            .name()
            .unwrap_or_else(|_| "Unknown Audio Device".to_string());

        let default_config: SupportedStreamConfig = device
            .default_input_config()
            .or_else(|_| device.default_output_config())
            .map_err(|e| format!("Failed to get stream config for device {}: {:?}", device_name, e))?;

        let sample_rate = default_config.sample_rate().0;
        let channels = default_config.channels();
        let sample_format = default_config.sample_format();
        let config: StreamConfig = default_config.into();

        let is_running = Arc::new(AtomicBool::new(true));
        let is_running_clone = is_running.clone();

        let err_fn = move |err| {
            tracing::error!(target: "ghostboard::audio", "Audio capture stream error: {:?}", err);
        };

        let stream = match sample_format {
            SampleFormat::F32 => device.build_input_stream(
                &config,
                move |data: &[f32], _: &cpal::InputCallbackInfo| {
                    if is_running_clone.load(Ordering::Relaxed) {
                        producer.push_slice(data);
                    }
                },
                err_fn,
                None,
            ),
            SampleFormat::I16 => device.build_input_stream(
                &config,
                move |data: &[i16], _: &cpal::InputCallbackInfo| {
                    if is_running_clone.load(Ordering::Relaxed) {
                        for &sample in data {
                            let f = sample as f32 / 32768.0;
                            let _ = producer.push(f);
                        }
                    }
                },
                err_fn,
                None,
            ),
            SampleFormat::U16 => device.build_input_stream(
                &config,
                move |data: &[u16], _: &cpal::InputCallbackInfo| {
                    if is_running_clone.load(Ordering::Relaxed) {
                        for &sample in data {
                            let f = (sample as f32 - 32768.0) / 32768.0;
                            let _ = producer.push(f);
                        }
                    }
                },
                err_fn,
                None,
            ),
            _ => return Err(format!("Unsupported audio sample format: {:?}", sample_format)),
        }
        .map_err(|e| format!("Failed to build cpal audio input stream: {:?}", e))?;

        stream
            .play()
            .map_err(|e| format!("Failed to start cpal audio playback/capture: {:?}", e))?;

        Ok(Self {
            _stream: stream,
            device_name,
            sample_rate,
            channels,
            is_running,
        })
    }

    /// Temporarily pauses reading audio without destroying the OS stream.
    pub fn pause(&self) {
        self.is_running.store(false, Ordering::SeqCst);
    }

    /// Resumes reading audio.
    pub fn resume(&self) {
        self.is_running.store(true, Ordering::SeqCst);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_device_discovery_and_listing() {
        let host = cpal::default_host();
        let devices = list_audio_devices(&host);
        println!("Discovered {} audio devices", devices.len());
        for dev in &devices {
            println!("  Device: {} (default: {}, loopback: {})", dev.name, dev.is_default, dev.is_loopback_capable);
        }
    }

    #[test]
    fn test_find_loopback_device_succeeds() {
        let host = cpal::default_host();
        let loopback_res = find_loopback_device(&host);
        assert!(
            loopback_res.is_ok(),
            "Expected to find a loopback or fallback device on host: {:?}",
            loopback_res.err()
        );
        let dev = loopback_res.unwrap();
        println!("Selected loopback device: {:?}", dev.name());
    }

    #[test]
    fn test_find_microphone_device_or_fallback() {
        let host = cpal::default_host();
        let mic_res = find_microphone_device(&host);
        println!("Microphone discovery result: {:?}", mic_res.as_ref().map(|d| d.name()));
    }
}
