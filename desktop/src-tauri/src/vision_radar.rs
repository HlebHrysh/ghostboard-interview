use image::{DynamicImage, GenericImageView, ImageFormat};
use serde::{Deserialize, Serialize};
use std::io::Cursor;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::time::{Duration, SystemTime, UNIX_EPOCH};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct RadarDetectionPayload {
    pub detection_id: String,
    pub hamming_distance: u32,
    pub roi_x: u32,
    pub roi_y: u32,
    pub roi_width: u32,
    pub roi_height: u32,
    pub base64_png: String,
    pub detected_at_ms: u64,
}

/// Computes a fast 64-bit perceptual difference hash (dHash) by sampling a 9x8 grayscale grid.
pub fn compute_dhash_64(img: &DynamicImage) -> u64 {
    let (w, h) = img.dimensions();
    if w < 9 || h < 8 {
        return 0;
    }
    let mut gray = [[0u8; 9]; 8];
    for gy in 0..8 {
        let py = ((gy as u32) * h / 8).min(h - 1);
        for gx in 0..9 {
            let px = ((gx as u32) * w / 9).min(w - 1);
            let p = img.get_pixel(px, py);
            // Fast integer luma approximation: (R*77 + G*150 + B*29) >> 8
            gray[gy][gx] =
                (((p[0] as u32) * 77 + (p[1] as u32) * 150 + (p[2] as u32) * 29) >> 8) as u8;
        }
    }

    let mut hash: u64 = 0;
    let mut bit_idx = 0;
    for gy in 0..8 {
        for gx in 0..8 {
            if gray[gy][gx] > gray[gy][gx + 1] {
                hash |= 1u64 << bit_idx;
            }
            bit_idx += 1;
        }
    }
    hash
}

pub fn hamming_distance(a: u64, b: u64) -> u32 {
    (a ^ b).count_ones()
}

/// Computes the Region of Interest (ROI) bounding box where pixels changed between `prev` and `curr`,
/// and crops + downscales `curr` to at most 1280px wide for ultra-fast Vision API transmission.
pub fn extract_changed_roi_base64(
    prev: Option<&DynamicImage>,
    curr: &DynamicImage,
) -> Result<(u32, u32, u32, u32, String), String> {
    let (w, h) = curr.dimensions();
    if w == 0 || h == 0 {
        return Err("Empty image dimensions".to_string());
    }

    let mut min_gx = 16usize;
    let mut min_gy = 16usize;
    let mut max_gx = 0usize;
    let mut max_gy = 0usize;

    if let Some(prev_img) = prev {
        if prev_img.dimensions() == (w, h) {
            for gy in 0..16 {
                let py = ((gy as u32) * h / 16 + h / 32).min(h - 1);
                for gx in 0..16 {
                    let px = ((gx as u32) * w / 16 + w / 32).min(w - 1);
                    let p1 = prev_img.get_pixel(px, py);
                    let p2 = curr.get_pixel(px, py);
                    let diff = (p1[0] as i32 - p2[0] as i32).abs()
                        + (p1[1] as i32 - p2[1] as i32).abs()
                        + (p1[2] as i32 - p2[2] as i32).abs();
                    if diff > 36 {
                        if gx < min_gx {
                            min_gx = gx;
                        }
                        if gy < min_gy {
                            min_gy = gy;
                        }
                        if gx > max_gx {
                            max_gx = gx;
                        }
                        if gy > max_gy {
                            max_gy = gy;
                        }
                    }
                }
            }
        }
    }

    // Pad ROI by 1 tile around changed area, or fallback to full frame if bounds are small/invalid
    let (rx, ry, rw, rh) = if max_gx >= min_gx && max_gy >= min_gy {
        let x0 = (min_gx.saturating_sub(1) as u32) * w / 16;
        let y0 = (min_gy.saturating_sub(1) as u32) * h / 16;
        let x1 = (((max_gx + 2).min(16)) as u32) * w / 16;
        let y1 = (((max_gy + 2).min(16)) as u32) * h / 16;
        let cw = (x1.saturating_sub(x0)).max(w / 3).min(w - x0);
        let ch = (y1.saturating_sub(y0)).max(h / 3).min(h - y0);
        (x0, y0, cw, ch)
    } else {
        (0, 0, w, h)
    };

    let cropped = curr.crop_imm(rx, ry, rw, rh);
    let resized = if rw > 1280 {
        let target_h = (rh as f64 * (1280.0 / rw as f64)).round() as u32;
        cropped.resize(1280, target_h.max(1), image::imageops::FilterType::Triangle)
    } else {
        cropped
    };

    let mut buf = Cursor::new(Vec::with_capacity(64 * 1024));
    resized
        .write_to(&mut buf, ImageFormat::Png)
        .map_err(|e| format!("PNG encode error: {e}"))?;

    use base64::{engine::general_purpose::STANDARD, Engine as _};
    let b64 = format!("data:image/png;base64,{}", STANDARD.encode(buf.into_inner()));
    Ok((rx, ry, rw, rh, b64))
}

#[derive(Default)]
pub struct VisionRadarState {
    pub enabled: AtomicBool,
    pub latest_detection: Mutex<Option<RadarDetectionPayload>>,
}

impl VisionRadarState {
    pub fn new() -> Arc<Self> {
        Arc::new(Self {
            enabled: AtomicBool::new(true),
            latest_detection: Mutex::new(None),
        })
    }

    pub fn is_enabled(&self) -> bool {
        self.enabled.load(Ordering::SeqCst)
    }

    pub fn set_enabled(&self, enabled: bool) -> bool {
        self.enabled.store(enabled, Ordering::SeqCst);
        if !enabled {
            if let Ok(mut g) = self.latest_detection.lock() {
                *g = None;
            }
        }
        enabled
    }

    pub fn get_latest(&self) -> Option<RadarDetectionPayload> {
        self.latest_detection.lock().ok().and_then(|g| g.clone())
    }

    pub fn set_latest(&self, payload: RadarDetectionPayload) {
        if let Ok(mut g) = self.latest_detection.lock() {
            *g = Some(payload);
        }
    }

    pub fn take_latest(&self) -> Option<RadarDetectionPayload> {
        self.latest_detection.lock().ok().and_then(|mut g| g.take())
    }
}

pub fn now_epoch_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or(Duration::from_secs(0))
        .as_millis() as u64
}

/// Captures the primary display as a `DynamicImage` in RAM without returning synthetic placeholders.
/// Returns `None` in headless environments or when capture fails.
pub fn capture_primary_frame() -> Option<DynamicImage> {
    #[cfg(target_os = "linux")]
    {
        let is_wayland = std::env::var_os("WAYLAND_DISPLAY").is_some()
            || std::env::var_os("HYPRLAND_INSTANCE_SIGNATURE").is_some();
        if is_wayland {
            if let Ok(output) = std::process::Command::new("grim").arg("-").output() {
                if output.status.success() && !output.stdout.is_empty() {
                    if let Ok(img) = image::load_from_memory(&output.stdout) {
                        return Some(img);
                    }
                }
            }
            return None;
        }
    }

    std::panic::catch_unwind(|| {
        let monitors = xcap::Monitor::all().ok()?;
        let primary = monitors
            .iter()
            .find(|m| m.is_primary().unwrap_or(false))
            .or_else(|| monitors.first())?;
        let img = primary.capture_image().ok()?;
        let width = img.width();
        let height = img.height();
        let raw_bytes = img.into_raw();
        let rgba = image::RgbaImage::from_raw(width, height, raw_bytes)?;
        Some(DynamicImage::ImageRgba8(rgba))
    })
    .ok()
    .flatten()
}

#[cfg(test)]
mod tests {
    use super::*;
    use image::{Rgba, RgbaImage};

    #[test]
    fn test_dhash_and_roi_extraction() {
        let img1 = DynamicImage::ImageRgba8(RgbaImage::from_fn(320, 240, |x, _y| {
            if x < 160 {
                Rgba([200, 200, 200, 255])
            } else {
                Rgba([20, 20, 20, 255])
            }
        }));
        let img2 = DynamicImage::ImageRgba8(RgbaImage::from_fn(320, 240, |x, y| {
            if x > 100 && x < 260 && y > 60 {
                Rgba([250, 50, 50, 255])
            } else {
                Rgba([20, 20, 20, 255])
            }
        }));

        let h1 = compute_dhash_64(&img1);
        let h2 = compute_dhash_64(&img2);
        assert!(hamming_distance(h1, h2) >= 5);

        let (rx, ry, rw, rh, b64) = extract_changed_roi_base64(Some(&img1), &img2).unwrap();
        assert!(rw > 0 && rh > 0);
        assert!(rx < 320 && ry < 240);
        assert!(b64.starts_with("data:image/png;base64,"));
    }

    #[test]
    fn test_dhash_stability_for_minor_noise() {
        let img1 = DynamicImage::ImageRgba8(RgbaImage::from_fn(320, 240, |x, y| {
            let v = ((x + y) % 255) as u8;
            Rgba([v, v, v, 255])
        }));
        let mut img2_raw = img1.to_rgba8();
        // Simulate minor cursor blink (few pixels changed)
        for x in 10..12 {
            for y in 10..24 {
                img2_raw.put_pixel(x, y, Rgba([255, 255, 255, 255]));
            }
        }
        let img2 = DynamicImage::ImageRgba8(img2_raw);
        let dist = hamming_distance(compute_dhash_64(&img1), compute_dhash_64(&img2));
        assert!(dist <= 3, "Minor cursor change should stay <= 3 bits, got {dist}");
    }

    #[test]
    fn test_vision_radar_state_consume_and_toggle() {
        let state = VisionRadarState::new();
        assert!(state.is_enabled());
        assert!(state.get_latest().is_none());

        let payload = RadarDetectionPayload {
            detection_id: "radar-1".to_string(),
            hamming_distance: 14,
            roi_x: 10,
            roi_y: 20,
            roi_width: 800,
            roi_height: 600,
            base64_png: "data:image/png;base64,AAAA".to_string(),
            detected_at_ms: 1700000000000,
        };
        state.set_latest(payload.clone());
        assert_eq!(state.get_latest(), Some(payload.clone()));
        assert_eq!(state.take_latest(), Some(payload));
        assert!(state.get_latest().is_none());

        state.set_latest(RadarDetectionPayload {
            detection_id: "radar-2".to_string(),
            hamming_distance: 9,
            roi_x: 0,
            roi_y: 0,
            roi_width: 640,
            roi_height: 480,
            base64_png: "data:image/png;base64,BBBB".to_string(),
            detected_at_ms: 1700000002500,
        });
        assert!(!state.set_enabled(false));
        assert!(!state.is_enabled());
        assert!(state.get_latest().is_none());
    }
}
