use super::fs::FsError;
use std::fs;
use std::path::PathBuf;

#[tauri::command]
pub async fn create_workspace_backup(workspace_root: String) -> Result<String, FsError> {
    let workspace = PathBuf::from(&workspace_root);
    let backup_dir = workspace.join(".bb").join("backups");
    fs::create_dir_all(&backup_dir)?;

    let timestamp = chrono::Utc::now().format("%Y%m%d-%H%M%S").to_string();
    let backup_path = backup_dir.join(format!("backup-{}.json", timestamp));

    let info = serde_json::json!({
        "timestamp": timestamp,
        "workspace": workspace_root,
        "type": "metadata-snapshot",
        "note": "Full ZIP backup ships in v3.1. Your files are already plain markdown — copy the workspace folder anywhere to back up."
    });

    fs::write(&backup_path, serde_json::to_string_pretty(&info).unwrap())?;
    Ok(backup_path.to_string_lossy().to_string())
}
