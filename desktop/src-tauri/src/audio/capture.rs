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
        // on the default OUTPUT (render) device, or any enumerated active output device.
        if let Some(device) = host.default_output_device() {
            return Ok(device);
        }
        if let Ok(mut devices) = host.output_devices() {
            if let Some(device) = devices.next() {
                return Ok(device);
            }
        }
    }

    #[cfg(target_os = "macos")]
    {
        // On macOS, look for aggregate or virtual loopback devices (BlackHole, Loopback, Soundflower, Multi-Output)
        if let Ok(devices) = host.input_devices() {
            for dev in devices {
                if let Ok(name) = dev.name() {
                    let lower = name.to_lowercase();
                    if lower.contains("blackhole")
                        || lower.contains("loopback")
                        || lower.contains("soundflower")
                        || lower.contains("multi-output")
                    {
                        return Ok(dev);
                    }
                }
            }
        }
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
        // We filter out obsolete OSS /dev/dsp devices to eliminate 2-second ALSA hangs.
        if let Ok(devices) = host.input_devices() {
            for device in devices {
                if let Ok(name) = device.name() {
                    let lower = name.to_lowercase();
                    if lower.contains("oss") || lower.contains("/dev/dsp") {
                        continue;
                    }
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
                    if lower.contains("oss") || lower.contains("/dev/dsp") {
                        continue;
                    }
                    if lower == "pulse" || lower == "pipewire" || lower == "default" {
                        return Ok(device);
                    }
                }
            }
        }

        if let Some(device) = host.default_output_device() {
            return Ok(device);
        }
    }

    #[cfg(not(any(windows, target_os = "macos", target_os = "linux")))]
    {
        if let Some(device) = host.default_output_device() {
            return Ok(device);
        }
    }

    // Ultimate fallback: must be an output (render) device for loopback, never microphone
    host.default_output_device()
        .ok_or_else(|| "No loopback audio capture device found on host system".to_string())
}

/// Finds the default candidate microphone device.
pub fn find_microphone_device(host: &Host) -> Result<Device, String> {
    host.default_input_device()
        .or_else(|| host.default_output_device())
        .ok_or_else(|| "No default microphone input device found".to_string())
}

/// Looks up a concrete audio device by its exact cpal name (inputs first, then outputs for
/// WASAPI-style loopback on Windows/macOS).
pub fn find_device_by_name(host: &Host, name: &str) -> Option<Device> {
    let clean_name = name.strip_prefix("[Loopback] ").unwrap_or(name).trim();
    if let Ok(mut devices) = host.input_devices() {
        if let Some(d) = devices.find(|d| {
            d.name()
                .map(|n| n == clean_name || n == name)
                .unwrap_or(false)
        }) {
            return Some(d);
        }
    }
    if let Ok(mut devices) = host.output_devices() {
        if let Some(d) = devices.find(|d| {
            d.name()
                .map(|n| n == clean_name || n == name)
                .unwrap_or(false)
        }) {
            return Some(d);
        }
    }
    None
}

/// Resolves the user-preferred device (if set and still present), otherwise runs the
/// platform auto-detection `fallback`.
pub fn resolve_device(
    host: &Host,
    preferred: Option<&str>,
    fallback: fn(&Host) -> Result<Device, String>,
) -> Result<Device, String> {
    if let Some(name) = preferred.map(str::trim).filter(|n| !n.is_empty()) {
        if let Some(device) = find_device_by_name(host, name) {
            return Ok(device);
        }
        tracing::warn!(
            target: "ghostboard::audio",
            "Preferred audio device '{}' not found, falling back to auto-detection",
            name
        );
    }
    fallback(host)
}

/// Lists all available input and loopback audio devices for UI selection.
pub fn list_audio_devices(host: &Host) -> Vec<AudioDeviceInfo> {
    let mut result = Vec::new();
    let default_in_name = host.default_input_device().and_then(|d| d.name().ok());
    let default_out_name = host.default_output_device().and_then(|d| d.name().ok());

    // 1. Input devices (Microphones, Line-in, Pulse/PipeWire monitors)
    if let Ok(devices) = host.input_devices() {
        for dev in devices {
            if let Ok(name) = dev.name() {
                let lower = name.to_lowercase();
                if lower.contains("oss") || lower.contains("/dev/dsp") {
                    continue;
                }
                let is_default = default_in_name.as_deref() == Some(&name);
                let is_monitor = lower.contains("monitor")
                    || lower.contains("blackhole")
                    || lower.contains("loopback")
                    || lower.contains("soundflower");

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

    // 2. Output devices (Speakers, Headphones - critical for WASAPI Loopback on Windows)
    if let Ok(devices) = host.output_devices() {
        for dev in devices {
            if let Ok(name) = dev.name() {
                let lower = name.to_lowercase();
                if lower.contains("oss") || lower.contains("/dev/dsp") {
                    continue;
                }
                if result.iter().any(|d| d.name == name) {
                    continue;
                }
                let is_default = default_out_name.as_deref() == Some(&name);
                let (sr, ch) = if let Ok(cfg) = dev.default_output_config() {
                    (cfg.sample_rate().0, cfg.channels())
                } else {
                    (48000, 2)
                };

                result.push(AudioDeviceInfo {
                    name: format!("[Loopback] {}", name),
                    is_default,
                    is_loopback_capable: true,
                    default_sample_rate: sr,
                    default_channels: ch,
                });
            }
        }
    }

    result
}

/// Backend representation of an active audio capture stream.
pub enum AudioStreamBackend {
    Cpal(Stream),
    Process {
        child: Arc<std::sync::Mutex<std::process::Child>>,
    },
}

/// Active running audio capture stream wrapping cpal::Stream or Linux parec/pw-record process.
pub struct AudioCaptureStream {
    _backend: AudioStreamBackend,
    device_name: String,
    sample_rate: u32,
    channels: u16,
    is_running: Arc<AtomicBool>,
    alive: Arc<AtomicBool>,
}

unsafe impl Send for AudioCaptureStream {}
unsafe impl Sync for AudioCaptureStream {}

impl Drop for AudioCaptureStream {
    fn drop(&mut self) {
        self.is_running.store(false, Ordering::SeqCst);
        self.alive.store(false, Ordering::SeqCst);
        if let AudioStreamBackend::Process { child } = &self._backend {
            if let Ok(mut c) = child.lock() {
                let _ = c.kill();
                let _ = c.wait();
            }
        }
    }
}

#[cfg(target_os = "linux")]
fn run_pactl_arg_with_timeout(arg: &str, timeout_ms: u64) -> Option<String> {
    use std::time::{Duration, Instant};
    let mut child = std::process::Command::new("pactl")
        .arg(arg)
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::null())
        .spawn()
        .ok()?;

    let start = Instant::now();
    loop {
        match child.try_wait() {
            Ok(Some(status)) => {
                if status.success() {
                    let mut stdout = child.stdout.take()?;
                    use std::io::Read;
                    let mut s = String::new();
                    let _ = stdout.read_to_string(&mut s);
                    let res = s.trim().to_string();
                    return if res.is_empty() { None } else { Some(res) };
                }
                return None;
            }
            Ok(None) => {
                if start.elapsed() > Duration::from_millis(timeout_ms) {
                    let _ = child.kill();
                    let _ = child.wait();
                    return None;
                }
                std::thread::sleep(Duration::from_millis(10));
            }
            Err(_) => return None,
        }
    }
}

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
        self.is_running.load(Ordering::SeqCst) && self.alive.load(Ordering::SeqCst)
    }

    pub fn is_alive(&self) -> bool {
        self.alive.load(Ordering::SeqCst)
    }

    /// Linux-native direct capture via PipeWire / PulseAudio (`parec` or `pw-record`).
    /// Captures pristine 16kHz s16le mono without ALSA dsnoop/slave locking errors.
    #[cfg(target_os = "linux")]
    pub fn start_linux_process(
        device_name: Option<&str>,
        is_monitor: bool,
        mut producer: AudioProducer,
    ) -> Result<Self, String> {
        let target_device = if let Some(d) = device_name.map(str::trim).filter(|s| !s.is_empty()) {
            if is_monitor && !d.ends_with(".monitor") && !d.contains("monitor") {
                format!("{}.monitor", d)
            } else {
                d.to_string()
            }
        } else if is_monitor {
            // Query default sink via pactl with timeout
            if let Some(s) = run_pactl_arg_with_timeout("get-default-sink", 500) {
                format!("{}.monitor", s)
            } else {
                "@DEFAULT_MONITOR@".to_string()
            }
        } else {
            // Query default source via pactl with timeout
            if let Some(s) = run_pactl_arg_with_timeout("get-default-source", 500) {
                s
            } else {
                "@DEFAULT_SOURCE@".to_string()
            }
        };

        let is_running = Arc::new(AtomicBool::new(true));
        let is_running_clone = is_running.clone();
        let alive = Arc::new(AtomicBool::new(true));
        let alive_clone = alive.clone();

        // 1. Try launching parec
        let mut child_opt = std::process::Command::new("parec")
            .args([
                "--format=s16le",
                "--rate=16000",
                "--channels=1",
                "-d",
                &target_device,
                "--latency-msec=40",
            ])
            .stdout(std::process::Stdio::piped())
            .stderr(std::process::Stdio::null())
            .spawn()
            .ok();

        // 2. If parec failed, fallback to pw-record
        if child_opt.is_none() {
            child_opt = std::process::Command::new("pw-record")
                .args([
                    "--target",
                    &target_device,
                    "--rate",
                    "16000",
                    "--channels",
                    "1",
                    "--format",
                    "s16",
                    "-",
                ])
                .stdout(std::process::Stdio::piped())
                .stderr(std::process::Stdio::null())
                .spawn()
                .ok();
        }

        let mut child = child_opt.ok_or_else(|| "Failed to spawn parec or pw-record on Linux".to_string())?;
        let mut stdout = child.stdout.take().ok_or_else(|| "Failed to pipe audio process stdout".to_string())?;

        // Background thread reading 16kHz 16-bit mono PCM chunks and pushing f32 to ringbuffer
        std::thread::spawn(move || {
            use std::io::Read;
            let mut buf = [0u8; 640]; // 20ms of audio (320 samples @ 16kHz, 2 bytes/sample)
            while is_running_clone.load(Ordering::Relaxed) {
                match stdout.read(&mut buf) {
                    Ok(0) => {
                        alive_clone.store(false, Ordering::SeqCst);
                        break;
                    }
                    Ok(n) => {
                        let samples = n / 2;
                        for i in 0..samples {
                            let sample_i16 = i16::from_le_bytes([buf[i * 2], buf[i * 2 + 1]]);
                            let sample_f32 = sample_i16 as f32 / 32768.0;
                            let _ = producer.push(sample_f32);
                        }
                    }
                    Err(e) => {
                        tracing::debug!(target: "ghostboard::audio", "Process capture read exited: {:?}", e);
                        alive_clone.store(false, Ordering::SeqCst);
                        break;
                    }
                }
            }
            alive_clone.store(false, Ordering::SeqCst);
        });

        tracing::info!(
            target: "ghostboard::audio",
            "Started native Linux PipeWire/PulseAudio capture for '{}'",
            target_device
        );

        Ok(Self {
            _backend: AudioStreamBackend::Process {
                child: Arc::new(std::sync::Mutex::new(child)),
            },
            device_name: format!("PipeWire: {}", target_device),
            sample_rate: 16000,
            channels: 1,
            is_running,
            alive,
        })
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
        let alive = Arc::new(AtomicBool::new(true));
        let alive_err = alive.clone();

        let err_fn = move |err| {
            alive_err.store(false, Ordering::SeqCst);
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
            _backend: AudioStreamBackend::Cpal(stream),
            device_name,
            sample_rate,
            channels,
            is_running,
            alive,
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

    #[test]
    fn test_audio_capture_stream_liveness_lifecycle() {
        let is_running = Arc::new(AtomicBool::new(true));
        let alive = Arc::new(AtomicBool::new(true));
        let is_stream_running = |r: &AtomicBool, a: &AtomicBool| r.load(Ordering::SeqCst) && a.load(Ordering::SeqCst);

        assert!(is_stream_running(&is_running, &alive));

        // When stream encounters an error or EOF in pipe
        alive.store(false, Ordering::SeqCst);
        assert!(!is_stream_running(&is_running, &alive));
    }
}
