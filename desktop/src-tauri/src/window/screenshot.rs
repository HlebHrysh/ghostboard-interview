use base64::Engine;
use serde::{Deserialize, Serialize};
use std::time::Duration;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct ScreenCaptureResult {
    pub base64_png: String,
    pub width: u32,
    pub height: u32,
}

/// Encodes an RGBA image buffer (raw bytes with width and height) into a valid PNG buffer.
pub fn encode_rgba_to_png(rgba_raw: &[u8], width: u32, height: u32) -> Result<Vec<u8>, String> {
    let rgba = image::RgbaImage::from_raw(width, height, rgba_raw.to_vec())
        .ok_or_else(|| "Failed to construct RGBA image from buffer".to_string())?;

    let mut png_bytes = Vec::new();
    rgba.write_to(
        &mut std::io::Cursor::new(&mut png_bytes),
        image::ImageFormat::Png,
    )
    .map_err(|e| format!("Failed to encode PNG: {}", e))?;

    Ok(png_bytes)
}

/// Fallback frame generator producing a valid PNG frame when OS screen capture
/// is unavailable (e.g. headless CI, Wayland security sandboxes without portal permissions).
pub fn create_fallback_capture(width: u32, height: u32) -> Result<ScreenCaptureResult, String> {
    let effective_width = if width == 0 { 1920 } else { width };
    let effective_height = if height == 0 { 1080 } else { height };

    // Fill with dark luxury foundation: #12141a
    let mut raw_bytes = vec![0u8; (effective_width * effective_height * 4) as usize];
    for chunk in raw_bytes.chunks_exact_mut(4) {
        chunk[0] = 18;
        chunk[1] = 20;
        chunk[2] = 26;
        chunk[3] = 255;
    }

    let png_bytes = encode_rgba_to_png(&raw_bytes, effective_width, effective_height)?;
    let base64_png = base64::engine::general_purpose::STANDARD.encode(&png_bytes);

    Ok(ScreenCaptureResult {
        base64_png,
        width: effective_width,
        height: effective_height,
    })
}

fn raw_screen_capture() -> Option<ScreenCaptureResult> {
    let screens = screenshots::Screen::all().ok()?;
    if screens.is_empty() {
        return None;
    }
    let primary = screens
        .iter()
        .find(|s| s.display_info.is_primary)
        .unwrap_or(&screens[0]);

    let img = primary.capture().ok()?;
    let width = img.width();
    let height = img.height();
    let raw_bytes = img.as_raw();

    let png_bytes = encode_rgba_to_png(raw_bytes, width, height).ok()?;
    let base64_png = base64::engine::general_purpose::STANDARD.encode(&png_bytes);
    Some(ScreenCaptureResult {
        base64_png,
        width,
        height,
    })
}

/// Captures the primary or active display using the native `screenshots` crate.
/// If hardware capture fails (e.g. headless CI, missing display server, Wayland permission denied,
/// or compositor deadlock), safely times out after 1500ms and returns a clean fallback without crashing.
pub fn capture_screen_native() -> ScreenCaptureResult {
    let (tx, rx) = std::sync::mpsc::channel();
    let _ = std::thread::spawn(move || {
        let result = std::panic::catch_unwind(raw_screen_capture);
        let _ = tx.send(result);
    });

    match rx.recv_timeout(Duration::from_millis(1500)) {
        Ok(Ok(Some(res))) => res,
        Ok(Ok(None)) => {
            eprintln!("[ScreenCapture] Display capture returned empty or failed. Using fallback.");
            create_fallback_capture(1920, 1080).unwrap_or_else(|_| create_minimal_fallback())
        }
        Ok(Err(_panic)) => {
            eprintln!("[ScreenCapture] Display capture driver panicked. Using fallback.");
            create_fallback_capture(1920, 1080).unwrap_or_else(|_| create_minimal_fallback())
        }
        Err(std::sync::mpsc::RecvTimeoutError::Timeout) => {
            eprintln!("[ScreenCapture] Display capture timed out (unpermitted Wayland / headless). Using fallback.");
            create_fallback_capture(1920, 1080).unwrap_or_else(|_| create_minimal_fallback())
        }
        Err(std::sync::mpsc::RecvTimeoutError::Disconnected) => {
            eprintln!("[ScreenCapture] Capture thread disconnected. Using fallback.");
            create_fallback_capture(1920, 1080).unwrap_or_else(|_| create_minimal_fallback())
        }
    }
}

fn create_minimal_fallback() -> ScreenCaptureResult {
    // 1x1 transparent PNG fallback in standard base64
    const MINIMAL_PNG: &str =
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
    ScreenCaptureResult {
        base64_png: MINIMAL_PNG.to_string(),
        width: 1,
        height: 1,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_create_fallback_capture_dimensions() {
        let res = create_fallback_capture(800, 600).expect("Fallback capture failed");
        assert_eq!(res.width, 800);
        assert_eq!(res.height, 600);
        assert!(!res.base64_png.is_empty());

        let decoded = base64::engine::general_purpose::STANDARD
            .decode(&res.base64_png)
            .expect("Valid base64 PNG");
        // Check PNG magic header: \x89PNG\r\n\x1a\n
        assert_eq!(&decoded[0..8], b"\x89PNG\r\n\x1a\n");
    }

    #[test]
    fn test_create_fallback_zero_dimensions_defaults() {
        let res = create_fallback_capture(0, 0).expect("Zero dimensions handled");
        assert_eq!(res.width, 1920);
        assert_eq!(res.height, 1080);
    }

    #[test]
    fn test_capture_screen_native_never_panics() {
        // In headless CI or live desktop, capture_screen_native must return a valid ScreenCaptureResult
        let res = capture_screen_native();
        assert!(res.width > 0);
        assert!(res.height > 0);
        assert!(!res.base64_png.is_empty());

        let decoded = base64::engine::general_purpose::STANDARD
            .decode(&res.base64_png)
            .expect("Base64 string decodable");
        assert_eq!(&decoded[0..8], b"\x89PNG\r\n\x1a\n");
    }

    #[test]
    fn test_screen_capture_result_serde_roundtrip() {
        let original = ScreenCaptureResult {
            base64_png: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==".to_string(),
            width: 1920,
            height: 1080,
        };
        let json = serde_json::to_string(&original).expect("JSON serialization");
        let deserialized: ScreenCaptureResult = serde_json::from_str(&json).expect("JSON deserialization");
        assert_eq!(original, deserialized);
    }

    #[test]
    fn test_encode_rgba_to_png_magic_bytes() {
        let dummy_rgba = vec![255u8; 10 * 10 * 4];
        let png = encode_rgba_to_png(&dummy_rgba, 10, 10).expect("Encoding succeeds");
        assert_eq!(&png[0..8], b"\x89PNG\r\n\x1a\n");
    }
}
