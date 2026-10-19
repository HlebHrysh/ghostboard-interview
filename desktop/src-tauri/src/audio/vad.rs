use serde::{Deserialize, Serialize};
use std::io::Cursor;
use tract_onnx::prelude::*;

pub const VAD_SAMPLE_RATE: usize = 16_000;
pub const VAD_FRAME_SIZE: usize = 512; // 32ms at 16kHz
pub const VAD_CONTEXT_SIZE: usize = 64;
pub const VAD_STATE_SIZE: usize = 128;

pub const SPEECH_THRESHOLD: f32 = 0.5;
pub const SILENCE_THRESHOLD: f32 = 0.35;
pub const PAUSE_FRAMES_THRESHOLD: usize = 11; // 11 frames * 32ms = 352ms (>350ms)

static EMBEDDED_MODEL_BYTES: &[u8] = include_bytes!("../../resources/silero_vad.onnx");

type TractPlan = SimplePlan<TypedFact, Box<dyn TypedOp>, Graph<TypedFact, Box<dyn TypedOp>>>;

/// Recurrent LSTM hidden and cell state, plus context window.
#[derive(Clone, Debug)]
pub struct VadRecurrentState {
    pub hidden: Vec<f32>,
    pub cell: Vec<f32>,
    pub context: Vec<f32>,
}

impl Default for VadRecurrentState {
    fn default() -> Self {
        Self {
            hidden: vec![0.0f32; VAD_STATE_SIZE],
            cell: vec![0.0f32; VAD_STATE_SIZE],
            context: vec![0.0f32; VAD_CONTEXT_SIZE],
        }
    }
}

impl VadRecurrentState {
    pub fn reset(&mut self) {
        self.hidden.fill(0.0);
        self.cell.fill(0.0);
        self.context.fill(0.0);
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum VadSpeechState {
    Silence,
    Speaking,
}

/// Evaluation result for a single 512-sample (32ms) frame.
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub struct VadFrameResult {
    /// Neural network speech probability [0.0, 1.0].
    pub speech_probability: f32,
    /// Whether the frame is classified as speech.
    pub is_speech: bool,
    /// Current speech state (Silence or Speaking).
    pub state: VadSpeechState,
    /// Triggered once when transitioning from speech to >350ms silence.
    pub pause_boundary_triggered: bool,
    /// Number of consecutive silence frames counted so far.
    pub silence_frame_count: usize,
    /// Number of consecutive speech frames counted so far.
    pub speech_frame_count: usize,
}

/// Pure Rust Silero Voice Activity Detector using tract-onnx.
pub struct SileroVad {
    plan: TractPlan,
    recurrent_state: VadRecurrentState,
    sample_buffer: Vec<f32>,
    current_state: VadSpeechState,
    silence_frames: usize,
    speech_frames: usize,
    was_speaking: bool,
}

impl SileroVad {
    /// Creates a new Silero VAD detector initialized from the embedded ONNX model.
    pub fn new() -> Result<Self, String> {
        Self::from_bytes(EMBEDDED_MODEL_BYTES)
    }

    /// Creates a Silero VAD detector from arbitrary ONNX model bytes.
    pub fn from_bytes(bytes: &[u8]) -> Result<Self, String> {
        let model = tract_onnx::onnx()
            .model_for_read(&mut Cursor::new(bytes))
            .map_err(|e| format!("Failed to read Silero ONNX model: {:?}", e))?;

        let plan = model
            .into_optimized()
            .map_err(|e| format!("Failed to optimize Silero ONNX model: {:?}", e))?
            .into_runnable()
            .map_err(|e| format!("Failed to make Silero ONNX model runnable: {:?}", e))?;

        Ok(Self {
            plan,
            recurrent_state: VadRecurrentState::default(),
            sample_buffer: Vec::with_capacity(VAD_FRAME_SIZE * 2),
            current_state: VadSpeechState::Silence,
            silence_frames: 0,
            speech_frames: 0,
            was_speaking: false,
        })
    }

    /// Resets recurrent neural network state and pause detection counters.
    pub fn reset(&mut self) {
        self.recurrent_state.reset();
        self.sample_buffer.clear();
        self.current_state = VadSpeechState::Silence;
        self.silence_frames = 0;
        self.speech_frames = 0;
        self.was_speaking = false;
    }

    /// Processes a single 512-sample frame (32ms at 16kHz mono).
    pub fn process_frame(&mut self, frame: &[f32]) -> Result<VadFrameResult, String> {
        if frame.len() != VAD_FRAME_SIZE {
            return Err(format!(
                "Invalid frame length: expected {}, got {}",
                VAD_FRAME_SIZE,
                frame.len()
            ));
        }

        // 1. Prepare input: 64 context samples + 512 frame samples = 576 samples
        let mut input_data = Vec::with_capacity(VAD_CONTEXT_SIZE + VAD_FRAME_SIZE);
        input_data.extend_from_slice(&self.recurrent_state.context);
        input_data.extend_from_slice(frame);
        let input_tensor = tract_ndarray::Array2::from_shape_vec(
            (1, VAD_CONTEXT_SIZE + VAD_FRAME_SIZE),
            input_data,
        )
        .map_err(|e| format!("Failed to shape input tensor: {:?}", e))?
        .into_tensor();

        // 2. Prepare state tensor: shape [2, 1, 128] (hidden + cell)
        let mut rnn_data = Vec::with_capacity(2 * VAD_STATE_SIZE);
        rnn_data.extend_from_slice(&self.recurrent_state.hidden);
        rnn_data.extend_from_slice(&self.recurrent_state.cell);
        let state_tensor = tract_ndarray::Array3::from_shape_vec((2, 1, VAD_STATE_SIZE), rnn_data)
            .map_err(|e| format!("Failed to shape state tensor: {:?}", e))?
            .into_tensor();

        // 3. Run neural inference
        let outputs = self
            .plan
            .run(tvec![input_tensor.into(), state_tensor.into()])
            .map_err(|e| format!("Silero VAD inference error: {:?}", e))?;

        if outputs.len() < 2 {
            return Err(format!("Expected 2 outputs, got {}", outputs.len()));
        }

        // 4. Extract probability
        let prob_view = outputs[0]
            .to_array_view::<f32>()
            .map_err(|e| format!("Failed to read probability tensor: {:?}", e))?;
        let speech_probability = prob_view[[0, 0]];

        // 5. Update recurrent states & trailing 64-sample context
        let state_view = outputs[1]
            .to_array_view::<f32>()
            .map_err(|e| format!("Failed to read state tensor: {:?}", e))?;
        let flat_state: Vec<f32> = state_view.iter().copied().collect();
        if flat_state.len() >= 2 * VAD_STATE_SIZE {
            self.recurrent_state.hidden.copy_from_slice(&flat_state[..VAD_STATE_SIZE]);
            self.recurrent_state.cell.copy_from_slice(&flat_state[VAD_STATE_SIZE..2 * VAD_STATE_SIZE]);
        }
        self.recurrent_state
            .context
            .copy_from_slice(&frame[VAD_FRAME_SIZE - VAD_CONTEXT_SIZE..]);

        // 6. Update state machine and pause boundary detection
        let mut pause_boundary_triggered = false;
        let is_speech;

        if speech_probability >= SPEECH_THRESHOLD {
            is_speech = true;
            self.current_state = VadSpeechState::Speaking;
            self.speech_frames += 1;
            self.silence_frames = 0;
            self.was_speaking = true;
        } else if speech_probability < SILENCE_THRESHOLD {
            is_speech = false;
            self.current_state = VadSpeechState::Silence;
            self.silence_frames += 1;
            self.speech_frames = 0;

            // Trigger pause boundary once when silence reaches threshold after speaking
            if self.was_speaking && self.silence_frames == PAUSE_FRAMES_THRESHOLD {
                pause_boundary_triggered = true;
                self.was_speaking = false;
            }
        } else {
            // Hysteresis range [0.35, 0.5): retain previous state
            is_speech = self.current_state == VadSpeechState::Speaking;
            if is_speech {
                self.speech_frames += 1;
                self.silence_frames = 0;
            } else {
                self.silence_frames += 1;
                self.speech_frames = 0;
                if self.was_speaking && self.silence_frames == PAUSE_FRAMES_THRESHOLD {
                    pause_boundary_triggered = true;
                    self.was_speaking = false;
                }
            }
        }

        Ok(VadFrameResult {
            speech_probability,
            is_speech,
            state: self.current_state,
            pause_boundary_triggered,
            silence_frame_count: self.silence_frames,
            speech_frame_count: self.speech_frames,
        })
    }

    /// Feeds arbitrary audio slice (16kHz mono), chunks into 512-sample frames,
    /// and returns results for all completed frames.
    pub fn process_samples(&mut self, samples: &[f32]) -> Result<Vec<VadFrameResult>, String> {
        self.sample_buffer.extend_from_slice(samples);
        let mut results = Vec::new();

        while self.sample_buffer.len() >= VAD_FRAME_SIZE {
            let frame: Vec<f32> = self.sample_buffer.drain(0..VAD_FRAME_SIZE).collect();
            let res = self.process_frame(&frame)?;
            results.push(res);
        }

        Ok(results)
    }
}

/// Standalone state machine helper for testing pause boundary transitions independently of neural weights.
#[derive(Debug, Clone)]
pub struct VadStateMachine {
    pub current_state: VadSpeechState,
    pub silence_frames: usize,
    pub speech_frames: usize,
    pub was_speaking: bool,
    pub pause_threshold: usize,
}

impl Default for VadStateMachine {
    fn default() -> Self {
        Self {
            current_state: VadSpeechState::Silence,
            silence_frames: 0,
            speech_frames: 0,
            was_speaking: false,
            pause_threshold: PAUSE_FRAMES_THRESHOLD,
        }
    }
}

impl VadStateMachine {
    pub fn step(&mut self, speech_probability: f32) -> (bool, bool) {
        let is_speech;
        let mut pause_triggered = false;

        if speech_probability >= SPEECH_THRESHOLD {
            is_speech = true;
            self.current_state = VadSpeechState::Speaking;
            self.speech_frames += 1;
            self.silence_frames = 0;
            self.was_speaking = true;
        } else if speech_probability < SILENCE_THRESHOLD {
            is_speech = false;
            self.current_state = VadSpeechState::Silence;
            self.silence_frames += 1;
            self.speech_frames = 0;

            if self.was_speaking && self.silence_frames == self.pause_threshold {
                pause_triggered = true;
                self.was_speaking = false;
            }
        } else {
            is_speech = self.current_state == VadSpeechState::Speaking;
            if is_speech {
                self.speech_frames += 1;
                self.silence_frames = 0;
            } else {
                self.silence_frames += 1;
                self.speech_frames = 0;
                if self.was_speaking && self.silence_frames == self.pause_threshold {
                    pause_triggered = true;
                    self.was_speaking = false;
                }
            }
        }

        (is_speech, pause_triggered)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_silero_vad_initialization_and_silence_eval() {
        let mut vad = SileroVad::new().expect("Failed to initialize SileroVad");
        let silence_frame = vec![0.0f32; VAD_FRAME_SIZE];

        let result = vad.process_frame(&silence_frame).expect("Inference failed");
        assert!(
            result.speech_probability < SILENCE_THRESHOLD,
            "Silence frame should be below silence threshold, got {}",
            result.speech_probability
        );
        assert!(!result.is_speech);
        assert_eq!(result.state, VadSpeechState::Silence);
        assert!(!result.pause_boundary_triggered);
        assert_eq!(result.silence_frame_count, 1);
    }

    #[test]
    fn test_vad_state_machine_pause_boundary_triggers() {
        let mut sm = VadStateMachine::default();

        // 1. Initial silence: no pause boundary should trigger
        for _ in 0..20 {
            let (is_speech, pause) = sm.step(0.1);
            assert!(!is_speech);
            assert!(!pause, "Initial silence should not trigger pause boundary");
        }

        // 2. Speech begins: 5 consecutive speech frames
        for _ in 0..5 {
            let (is_speech, pause) = sm.step(0.85);
            assert!(is_speech);
            assert!(!pause);
        }
        assert!(sm.was_speaking);
        assert_eq!(sm.speech_frames, 5);
        assert_eq!(sm.silence_frames, 0);

        // 3. Speech ends, silence begins: exactly 10 frames of silence
        for i in 1..=10 {
            let (is_speech, pause) = sm.step(0.1);
            assert!(!is_speech);
            assert!(!pause, "Silence frame {} should not trigger pause yet (<11 frames)", i);
        }
        assert_eq!(sm.silence_frames, 10);

        // 4. 11th consecutive frame of silence (>350ms): pause boundary MUST trigger!
        let (is_speech, pause) = sm.step(0.1);
        assert!(!is_speech);
        assert!(pause, "11th frame (>350ms silence) must trigger pause boundary");
        assert!(!sm.was_speaking, "was_speaking should reset after triggering");

        // 5. Subsequent silence: must NOT re-trigger
        for _ in 0..10 {
            let (is_speech, pause) = sm.step(0.1);
            assert!(!is_speech);
            assert!(!pause, "Subsequent silence must not re-trigger pause");
        }
    }

    #[test]
    fn test_process_samples_chunking() {
        let mut vad = SileroVad::new().expect("Failed to initialize SileroVad");
        // Feed 1200 samples = 2 full 512-sample frames + 176 remaining
        let samples = vec![0.0f32; 1200];
        let results = vad.process_samples(&samples).expect("Failed to process samples");

        assert_eq!(results.len(), 2);
        assert_eq!(vad.sample_buffer.len(), 176);

        // Feed another 400 samples -> total buffered = 176 + 400 = 576 -> produces 1 more frame, 64 remaining
        let more_samples = vec![0.0f32; 400];
        let more_results = vad.process_samples(&more_samples).expect("Failed to process samples");
        assert_eq!(more_results.len(), 1);
        assert_eq!(vad.sample_buffer.len(), 64);
    }
}
