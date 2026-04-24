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
    if let Some(parent) = PathBuf::from(&path).parent() {
        fs::create_dir_all(parent)?;
    }
    fs::write(&path, content)?;
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
