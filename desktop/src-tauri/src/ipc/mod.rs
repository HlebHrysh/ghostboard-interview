pub mod events;

use std::sync::{Arc, Mutex};
use tauri::ipc::Channel;
use crate::ipc::events::HudEvent;

/// Global thread-safe dispatcher storing subscribed frontend IPC channels.
#[derive(Clone, Default)]
pub struct HudChannelState {
    channels: Arc<Mutex<Vec<Channel<HudEvent>>>>,
}

impl HudChannelState {
    pub fn new() -> Self {
        Self {
            channels: Arc::new(Mutex::new(Vec::new())),
        }
    }

    /// Registers a newly subscribed Channel<HudEvent> from the frontend.
    pub fn register(&self, channel: Channel<HudEvent>) {
        let mut list = self.channels.lock().unwrap_or_else(|poisoned| poisoned.into_inner());
        list.push(channel);
    }

    /// Dispatches an event to all active channels; cleans up closed/broken channels.
    pub fn broadcast(&self, event: HudEvent) {
        let mut list = self.channels.lock().unwrap_or_else(|poisoned| poisoned.into_inner());
        list.retain(|ch| ch.send(event.clone()).is_ok());
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
    state: tauri::State<'_, HudChannelState>,
) -> Result<(), String> {
    state.register(on_event);
    Ok(())
}

/// Tauri command to stop HUD streaming and clear registered channels.
#[tauri::command]
pub async fn stop_hud_stream(
    state: tauri::State<'_, HudChannelState>,
) -> Result<(), String> {
    state.clear();
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
    }
}
