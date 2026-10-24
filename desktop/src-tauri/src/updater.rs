use serde::{Deserialize, Serialize};
use tauri::Manager;
use tauri_plugin_updater::UpdaterExt;
use crate::ipc::events::HudEvent;
use crate::ipc::HudChannelState;

/// Result returned from checking for available updates.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Default)]
pub struct UpdateCheckResult {
    pub available: bool,
    pub version: Option<String>,
    pub body: Option<String>,
    pub date: Option<String>,
}

/// Native command to check for desktop application updates.
/// Gracefully returns available: false if in dev mode, pubkey is unset, or server is offline.
#[tauri::command]
pub async fn check_for_updates(app: tauri::AppHandle) -> Result<UpdateCheckResult, String> {
    let updater = match app.updater() {
        Ok(u) => u,
        Err(err) => {
            tracing::debug!(
                target: "ghostboard::updater",
                "Updater extension not initialized or unavailable in current mode: {}",
                err
            );
            return Ok(UpdateCheckResult {
                available: false,
                version: None,
                body: None,
                date: None,
            });
        }
    };

    match updater.check().await {
        Ok(Some(update)) => {
            tracing::info!(
                target: "ghostboard::updater",
                version = %update.version,
                "New Ghostboard update discovered"
            );
            Ok(UpdateCheckResult {
                available: true,
                version: Some(update.version.clone()),
                body: update.body.clone(),
                date: update.date.map(|d| d.to_string()),
            })
        }
        Ok(None) => {
            tracing::debug!(
                target: "ghostboard::updater",
                "Application is up to date, no newer version found"
            );
            Ok(UpdateCheckResult {
                available: false,
                version: None,
                body: None,
                date: None,
            })
        }
        Err(err) => {
            tracing::debug!(
                target: "ghostboard::updater",
                "Updater check failed or endpoint unreachable (dev mode / offline / unconfigured pubkey): {}",
                err
            );
            Ok(UpdateCheckResult {
                available: false,
                version: None,
                body: None,
                date: None,
            })
        }
    }
}

/// Native command to download and install the available update.
/// Emits progress and status events to the HUD channel.
#[tauri::command]
pub async fn install_update(app: tauri::AppHandle) -> Result<(), String> {
    let hud_state = app.try_state::<HudChannelState>();

    let updater = match app.updater() {
        Ok(u) => u,
        Err(err) => {
            let msg = format!("Updater plugin not initialized: {}", err);
            tracing::error!(target: "ghostboard::updater", "{}", msg);
            if let Some(hud) = hud_state.as_deref() {
                hud.broadcast(HudEvent::UpdateStatus {
                    status: "error".to_string(),
                    progress: None,
                    version: None,
                    message: Some(msg.clone()),
                });
            }
            return Err(msg);
        }
    };

    let update = match updater.check().await {
        Ok(Some(u)) => u,
        Ok(None) => {
            tracing::info!(target: "ghostboard::updater", "install_update called but no update is available");
            if let Some(hud) = hud_state.as_deref() {
                hud.broadcast(HudEvent::UpdateStatus {
                    status: "upToDate".to_string(),
                    progress: None,
                    version: None,
                    message: Some("No update is currently pending".to_string()),
                });
            }
            return Ok(());
        }
        Err(err) => {
            let msg = format!("Failed checking for update before install: {}", err);
            tracing::error!(target: "ghostboard::updater", "{}", msg);
            if let Some(hud) = hud_state.as_deref() {
                hud.broadcast(HudEvent::UpdateStatus {
                    status: "error".to_string(),
                    progress: None,
                    version: None,
                    message: Some(msg.clone()),
                });
            }
            return Err(msg);
        }
    };

    let target_version = update.version.clone();
    let hud_for_progress = hud_state.as_deref().cloned();
    let v_for_closure = target_version.clone();
    let mut downloaded_bytes = 0usize;

    if let Some(hud) = hud_state.as_deref() {
        hud.broadcast(HudEvent::UpdateStatus {
            status: "downloading".to_string(),
            progress: Some(0.0),
            version: Some(target_version.clone()),
            message: Some(format!("Початок завантаження v{}", target_version)),
        });
    }

    let download_result = update
        .download_and_install(
            move |chunk_len, content_len| {
                downloaded_bytes += chunk_len;
                let progress = content_len.map(|total| {
                    if total > 0 {
                        (downloaded_bytes as f32 / total as f32).min(1.0)
                    } else {
                        0.0
                    }
                });

                if let Some(ref hud) = hud_for_progress {
                    hud.broadcast(HudEvent::UpdateStatus {
                        status: "downloading".to_string(),
                        progress,
                        version: Some(v_for_closure.clone()),
                        message: Some(format!(
                            "Завантаження оновлення... ({} KB)",
                            downloaded_bytes / 1024
                        )),
                    });
                }
            },
            move || {
                tracing::info!(
                    target: "ghostboard::updater",
                    "Update download completed, extracting and verifying payload"
                );
            },
        )
        .await;

    match download_result {
        Ok(_) => {
            tracing::info!(
                target: "ghostboard::updater",
                version = %target_version,
                "Update installed successfully. Application restart required."
            );
            if let Some(hud) = hud_state.as_deref() {
                hud.broadcast(HudEvent::UpdateStatus {
                    status: "installed".to_string(),
                    progress: Some(1.0),
                    version: Some(target_version),
                    message: Some("Оновлення встановлено. Перезапустіть застосунок.".to_string()),
                });
            }
            Ok(())
        }
        Err(err) => {
            let msg = format!("Failed to download and install update: {}", err);
            tracing::error!(target: "ghostboard::updater", "{}", msg);
            if let Some(hud) = hud_state.as_deref() {
                hud.broadcast(HudEvent::UpdateStatus {
                    status: "error".to_string(),
                    progress: None,
                    version: Some(target_version),
                    message: Some(msg.clone()),
                });
            }
            Err(msg)
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_update_check_result_defaults_and_serde() {
        let default_res = UpdateCheckResult::default();
        assert!(!default_res.available);
        assert_eq!(default_res.version, None);

        let custom = UpdateCheckResult {
            available: true,
            version: Some("1.3.0".to_string()),
            body: Some("Performance improvements & bugfixes".to_string()),
            date: Some("2026-10-25T00:00:00Z".to_string()),
        };

        let json = serde_json::to_string(&custom).expect("serialize UpdateCheckResult");
        assert!(json.contains(r#""available":true"#));
        assert!(json.contains(r#""version":"1.3.0""#));

        let deserialized: UpdateCheckResult =
            serde_json::from_str(&json).expect("deserialize UpdateCheckResult");
        assert_eq!(custom, deserialized);
    }

    #[test]
    fn test_update_check_result_no_update_serde() {
        let no_up = UpdateCheckResult {
            available: false,
            version: None,
            body: None,
            date: None,
        };

        let json = serde_json::to_string(&no_up).expect("serialize no update");
        assert!(json.contains(r#""available":false"#));
        assert!(json.contains(r#""version":null"#));

        let deser: UpdateCheckResult = serde_json::from_str(&json).expect("deser");
        assert_eq!(no_up, deser);
    }
}
