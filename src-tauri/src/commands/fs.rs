use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

#[derive(Debug, Serialize, Deserialize)]
pub struct FileInfo {
    pub path: String,
    pub name: String,
    pub is_directory: bool,
    pub size: u64,
    pub modified: i64,
}

#[derive(Debug, thiserror::Error)]
pub enum FsError {
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
    #[error("Invalid path: {0}")]
    InvalidPath(String),
    #[error("Access denied: {0}")]
    AccessDenied(String),
}

impl serde::Serialize for FsError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}

#[tauri::command]
pub async fn read_file(path: String) -> Result<String, FsError> {
    let content = fs::read_to_string(&path)?;
    Ok(content)
}

#[tauri::command]
pub async fn write_file(path: String, content: String) -> Result<(), FsError> {
    write_atomic(&PathBuf::from(&path), content.as_bytes())
}

/// Write to a sibling `.tmp` file then rename. On the same volume `rename` is
/// atomic on Windows / macOS / Linux, so concurrent readers (Obsidian, the
/// file watcher) never see a half-written file.
fn write_atomic(target: &std::path::Path, bytes: &[u8]) -> Result<(), FsError> {
    if let Some(parent) = target.parent() {
        fs::create_dir_all(parent)?;
    }
    let pid = std::process::id();
    let nonce = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_nanos())
        .unwrap_or(0);
    let temp = target.with_extension(format!("bb-tmp-{pid}-{nonce}"));
    fs::write(&temp, bytes)?;
    if let Err(e) = fs::rename(&temp, target) {
        let _ = fs::remove_file(&temp);
        return Err(FsError::Io(e));
    }
    Ok(())
}

#[tauri::command]
pub async fn list_directory(path: String) -> Result<Vec<FileInfo>, FsError> {
    let entries = fs::read_dir(&path)?;
    let mut files = Vec::new();
    for entry in entries {
        let entry = entry?;
        let metadata = entry.metadata()?;
        let modified = metadata
            .modified()?
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs() as i64;
        files.push(FileInfo {
            path: entry.path().to_string_lossy().to_string(),
            name: entry.file_name().to_string_lossy().to_string(),
            is_directory: metadata.is_dir(),
            size: metadata.len(),
            modified,
        });
    }
    Ok(files)
}

#[tauri::command]
pub async fn create_directory(path: String) -> Result<(), FsError> {
    fs::create_dir_all(&path)?;
    Ok(())
}

#[tauri::command]
pub async fn delete_file(path: String) -> Result<(), FsError> {
    let p = PathBuf::from(&path);
    if p.is_dir() {
        fs::remove_dir_all(&p)?;
    } else {
        fs::remove_file(&p)?;
    }
    Ok(())
}

#[tauri::command]
pub async fn file_exists(path: String) -> bool {
    PathBuf::from(&path).exists()
}

#[tauri::command]
pub async fn write_binary_file(path: String, base64_data: String) -> Result<(), FsError> {
    use base64::Engine as _;
    let bytes = base64::engine::general_purpose::STANDARD
        .decode(&base64_data)
        .map_err(|e| FsError::InvalidPath(e.to_string()))?;
    write_atomic(&PathBuf::from(&path), &bytes)
}

#[tauri::command]
pub async fn check_workspace_health(path: String) -> Result<bool, FsError> {
    let p = PathBuf::from(&path);
    if !p.exists() {
        return Ok(false);
    }
    fs::read_dir(&p)?;
    Ok(true)
}
