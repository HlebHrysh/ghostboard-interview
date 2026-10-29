pub mod events;

use std::sync::{Arc, Mutex};
use tauri::ipc::Channel;
use crate::ipc::events::HudEvent;

/// Global thread-safe dispatcher storing subscribed frontend IPC channels.
#[derive(Clone, Default)]
pub struct HudChannelState {
    /// `(window label, channel)` pairs so each window (Office / HUD) manages its own stream.
    channels: Arc<Mutex<Vec<(String, Channel<HudEvent>)>>>,
}

impl HudChannelState {
    pub fn new() -> Self {
        Self {
            channels: Arc::new(Mutex::new(Vec::new())),
        }
    }

    /// Registers a newly subscribed Channel<HudEvent> from the frontend.
    pub fn register(&self, channel: Channel<HudEvent>) {
        self.register_for("", channel);
    }

    /// Registers a channel owned by the window with the given label.
    pub fn register_for(&self, label: &str, channel: Channel<HudEvent>) {
        let mut list = self.channels.lock().unwrap_or_else(|poisoned| poisoned.into_inner());
        list.push((label.to_string(), channel));
    }

    /// Drops only the channels owned by `label`, leaving other windows' streams untouched.
    pub fn clear_for(&self, label: &str) {
        let mut list = self.channels.lock().unwrap_or_else(|poisoned| poisoned.into_inner());
        list.retain(|(l, _)| l != label);
    }

    /// Dispatches an event to all active channels; cleans up closed/broken channels.
    pub fn broadcast(&self, event: HudEvent) {
        let mut list = self.channels.lock().unwrap_or_else(|poisoned| poisoned.into_inner());
        list.retain(|(_, ch)| ch.send(event.clone()).is_ok());
    }

    /// Number of active channels connected.
    pub fn active_channel_count(&self) -> usize {
        let list = self.channels.lock().unwrap_or_else(|poisoned| poisoned.into_inner());
        list.len()
    }

    /// Clears all channels (e.g. on session teardown).
    pub fn clear(&self) {
        let mut list = self.channels.lock().unwrap_or_else(|poisoned| poisoned.into_inner());
        list.clear();
    }
}

/// Tauri command to register an event channel for streaming HUD events.
#[tauri::command]
pub async fn start_copilot_stream(
    on_event: Channel<HudEvent>,
    window: tauri::WebviewWindow,
    state: tauri::State<'_, HudChannelState>,
) -> Result<(), String> {
    state.register_for(window.label(), on_event);
    Ok(())
}

/// Tauri command to stop HUD streaming and clear registered channels.
#[tauri::command]
pub async fn stop_hud_stream(
    window: tauri::WebviewWindow,
    state: tauri::State<'_, HudChannelState>,
) -> Result<(), String> {
    state.clear_for(window.label());
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_hud_channel_state_management() {
        let state = HudChannelState::new();
        assert_eq!(state.active_channel_count(), 0);
        state.clear();
        assert_eq!(state.active_channel_count(), 0);
        state.clear_for("hud");
        assert_eq!(state.active_channel_count(), 0);
    }
}
