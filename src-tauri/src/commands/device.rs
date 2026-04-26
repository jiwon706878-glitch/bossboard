use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use tauri::Manager;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DeviceInfo {
    pub device_id: String,
    pub device_name: Option<String>,
    pub os: String,
    pub os_version: Option<String>,
    pub app_version: String,
    pub hostname: Option<String>,
}

/// Returns the path to `device.json` inside the Tauri app-data dir.
/// Lives outside the user's workspace so it's not synced by OneDrive
/// / iCloud / Dropbox.
fn device_file(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("app_data_dir: {e}"))?;
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir.join("device.json"))
}

/// Get the persistent device id; create one on first call. The id is a
/// random v4 UUID stored in `<app_data>/device.json`. Reinstalling the
/// app or formatting the OS produces a new id (intended — that's how the
/// device-limit accounting catches reinstalls).
fn get_or_create_device_id(app: &tauri::AppHandle) -> Result<String, String> {
    let path = device_file(app)?;
    if path.exists() {
        let raw = std::fs::read_to_string(&path).unwrap_or_default();
        if let Ok(json) = serde_json::from_str::<serde_json::Value>(&raw) {
            if let Some(id) = json.get("device_id").and_then(|v| v.as_str()) {
                return Ok(id.to_string());
            }
        }
    }

    let new_id = uuid::Uuid::new_v4().to_string();
    let info = serde_json::json!({
        "device_id": new_id,
        "created_at": chrono::Utc::now().to_rfc3339(),
    });
    std::fs::write(&path, serde_json::to_string_pretty(&info).unwrap())
        .map_err(|e| e.to_string())?;
    Ok(new_id)
}

fn os_label() -> String {
    match std::env::consts::OS {
        "windows" => "windows",
        "macos" => "mac",
        "linux" => "linux",
        _ => "unknown",
    }
    .to_string()
}

fn os_version_string() -> Option<String> {
    // Best-effort: pull from common env vars / files. Avoiding sys-info
    // crate to keep the dependency tree small. Frontend can override
    // with navigator.userAgent.
    if cfg!(target_os = "windows") {
        std::env::var("OS").ok().or_else(|| Some("Windows".to_string()))
    } else if cfg!(target_os = "macos") {
        Some("macOS".to_string())
    } else if cfg!(target_os = "linux") {
        std::fs::read_to_string("/etc/os-release")
            .ok()
            .and_then(|s| {
                s.lines().find_map(|line| {
                    line.strip_prefix("PRETTY_NAME=")
                        .map(|v| v.trim_matches('"').to_string())
                })
            })
            .or_else(|| Some("Linux".to_string()))
    } else {
        None
    }
}

#[tauri::command]
pub fn get_device_info(app: tauri::AppHandle) -> Result<DeviceInfo, String> {
    let device_id = get_or_create_device_id(&app)?;
    let host = hostname::get()
        .ok()
        .and_then(|h| h.into_string().ok());

    Ok(DeviceInfo {
        device_id,
        device_name: host.clone(),
        os: os_label(),
        os_version: os_version_string(),
        app_version: env!("CARGO_PKG_VERSION").to_string(),
        hostname: host,
    })
}
