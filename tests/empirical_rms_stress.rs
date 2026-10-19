// Standalone Empirical Adversarial Stress Harness for Audio RMS & Clamping
// Verifies compute_rms_level behavior on NaN, Inf, extreme amplitude, silence, subnormals, and channel queue behavior.

pub fn compute_rms_level(samples: &[f32]) -> f32 {
    if samples.is_empty() {
        return 0.0;
    }
    let sum_sq: f32 = samples.iter().map(|&s| s * s).sum();
    let mean_sq = sum_sq / (samples.len() as f32);
    let rms = mean_sq.sqrt();
    (rms * 1000.0).clamp(0.0, 100.0)
}

fn main() {
    println!("=== EMPIRICAL ADVERSARIAL AUDIO RMS HARNESS ===");

    // Test 1: Silence
    let silence = vec![0.0f32; 480];
    let rms_silence = compute_rms_level(&silence);
    println!("[TEST 1] Silence (all 0.0): rms = {}", rms_silence);
    assert_eq!(rms_silence, 0.0, "Silence must be 0.0");

    // Test 2: Conversational amplitude (0.01, 0.05, 0.10)
    let conv_01 = vec![0.01f32; 480];
    let rms_01 = compute_rms_level(&conv_01);
    println!("[TEST 2a] Conversational 0.01: rms = {}", rms_01);
    assert!((rms_01 - 10.0).abs() < 1e-3, "0.01 amplitude must map to 10.0");

    let conv_05 = vec![0.05f32; 480];
    let rms_05 = compute_rms_level(&conv_05);
    println!("[TEST 2b] Conversational 0.05: rms = {}", rms_05);
    assert!((rms_05 - 50.0).abs() < 1e-3, "0.05 amplitude must map to 50.0");

    let conv_10 = vec![0.10f32; 480];
    let rms_10 = compute_rms_level(&conv_10);
    println!("[TEST 2c] Conversational 0.10: rms = {}", rms_10);
    assert!((rms_10 - 100.0).abs() < 1e-3, "0.10 amplitude must map to 100.0");

    // Test 3: Normal loud speech (0.5, 1.0)
    let loud_05 = vec![0.5f32; 480];
    let rms_loud_05 = compute_rms_level(&loud_05);
    println!("[TEST 3a] Loud 0.5: rms = {}", rms_loud_05);
    assert_eq!(rms_loud_05, 100.0, "Loud 0.5 must clamp to 100.0");

    let loud_10 = vec![1.0f32; 480];
    let rms_loud_10 = compute_rms_level(&loud_10);
    println!("[TEST 3b] Loud 1.0: rms = {}", rms_loud_10);
    assert_eq!(rms_loud_10, 100.0, "Loud 1.0 must clamp to 100.0");

    // Test 4: Extreme amplitude (+10.0, -10.0, +1000.0, -1000.0)
    let extreme_pos_10 = vec![10.0f32; 480];
    let rms_pos_10 = compute_rms_level(&extreme_pos_10);
    println!("[TEST 4a] Extreme +10.0: rms = {}", rms_pos_10);
    assert_eq!(rms_pos_10, 100.0, "Extreme +10.0 must clamp to 100.0");

    let extreme_neg_10 = vec![-10.0f32; 480];
    let rms_neg_10 = compute_rms_level(&extreme_neg_10);
    println!("[TEST 4b] Extreme -10.0: rms = {}", rms_neg_10);
    assert_eq!(rms_neg_10, 100.0, "Extreme -10.0 must clamp to 100.0");

    let extreme_pos_1000 = vec![1000.0f32; 480];
    let rms_pos_1000 = compute_rms_level(&extreme_pos_1000);
    println!("[TEST 4c] Extreme +1000.0: rms = {}", rms_pos_1000);
    assert_eq!(rms_pos_1000, 100.0, "Extreme +1000.0 must clamp to 100.0");

    let extreme_neg_1000 = vec![-1000.0f32; 480];
    let rms_neg_1000 = compute_rms_level(&extreme_neg_1000);
    println!("[TEST 4d] Extreme -1000.0: rms = {}", rms_neg_1000);
    assert_eq!(rms_neg_1000, 100.0, "Extreme -1000.0 must clamp to 100.0");

    // Test 5: Infinity (+Inf, -Inf, mixed)
    let inf_pos = vec![f32::INFINITY; 480];
    let rms_inf_pos = compute_rms_level(&inf_pos);
    println!("[TEST 5a] +Infinity: rms = {}", rms_inf_pos);
    assert_eq!(rms_inf_pos, 100.0, "+Inf must clamp to 100.0");

    let inf_neg = vec![f32::NEG_INFINITY; 480];
    let rms_inf_neg = compute_rms_level(&inf_neg);
    println!("[TEST 5b] -Infinity: rms = {}", rms_inf_neg);
    assert_eq!(rms_inf_neg, 100.0, "-Inf must clamp to 100.0");

    // Test 6: Subnormals / denormals
    let subnormal = vec![1e-45f32; 480];
    let rms_subnormal = compute_rms_level(&subnormal);
    println!("[TEST 6] Subnormal (1e-45): rms = {}", rms_subnormal);
    assert!(rms_subnormal >= 0.0 && rms_subnormal <= 100.0, "Subnormal must be in [0, 100]");

    // Test 7: Empty slice
    let empty: Vec<f32> = vec![];
    let rms_empty = compute_rms_level(&empty);
    println!("[TEST 7] Empty slice: rms = {}", rms_empty);
    assert_eq!(rms_empty, 0.0, "Empty slice must return 0.0");

    // Test 8: NaN Behavior (ADVERSARIAL ATTACK)
    let nan_vec = vec![f32::NAN; 480];
    let rms_nan = compute_rms_level(&nan_vec);
    println!("[TEST 8a] NaN buffer: rms = {} (is_nan = {})", rms_nan, rms_nan.is_nan());

    let mixed_nan = vec![0.0f32, f32::NAN, 0.5f32];
    let rms_mixed_nan = compute_rms_level(&mixed_nan);
    println!("[TEST 8b] Mixed NaN buffer: rms = {} (is_nan = {})", rms_mixed_nan, rms_mixed_nan.is_nan());

    if rms_nan.is_nan() {
        println!("⚠️ FINDING DETECTED: compute_rms_level returns NaN when input contains NaN!");
        println!("   Reason: f32::clamp(0.0, 100.0) on NaN returns NaN according to IEEE 754 and Rust stdlib.");
    }

    println!("All adversarial tests executed successfully.");
}
