use super::fs::FsError;
use std::fs;
use std::path::PathBuf;

fn trash_dir(workspace_root: &str) -> PathBuf {
    PathBuf::from(workspace_root).join(".bb").join("trash")
}

#[tauri::command]
pub async fn move_to_trash(
    path: String,
    workspace_root: String,
) -> Result<String, FsError> {
    let source = PathBuf::from(&path);
    let trash = trash_dir(&workspace_root);
    fs::create_dir_all(&trash)?;

    let timestamp = chrono::Utc::now().format("%Y%m%d-%H%M%S").to_string();
    let filename = source
        .file_name()
        .ok_or_else(|| FsError::InvalidPath("No filename".to_string()))?
        .to_string_lossy()
        .to_string();

    let trash_path = trash.join(format!("{}-{}", timestamp, filename));
    fs::rename(&source, &trash_path)?;
    Ok(trash_path.to_string_lossy().to_string())
}

#[derive(serde::Serialize)]
pub struct TrashEntry {
    pub path: String,
    pub original_name: String,
    pub trashed_at: String,
}

#[tauri::command]
pub async fn list_trash(workspace_root: String) -> Result<Vec<TrashEntry>, FsError> {
    let trash = trash_dir(&workspace_root);
    if !trash.exists() {
        return Ok(vec![]);
    }
    let mut out = Vec::new();
    for entry in fs::read_dir(&trash)? {
        let entry = entry?;
        let name = entry.file_name().to_string_lossy().to_string();
        // Names look like 20260425-110530-foo.md — split off the leading
        // YYYYMMDD-HHMMSS- prefix so users see their original filename.
        let (ts, original) = match name.split_once('-').and_then(|(d, rest)| {
            rest.split_once('-').map(|(t, name)| (format!("{d}-{t}"), name.to_string()))
        }) {
            Some((ts, original)) => (ts, original),
            None => (String::new(), name.clone()),
        };
        out.push(TrashEntry {
            path: entry.path().to_string_lossy().to_string(),
            original_name: original,
            trashed_at: ts,
        });
    }
    Ok(out)
}

#[tauri::command]
pub async fn restore_from_trash(
    trash_path: String,
    target_dir: String,
) -> Result<String, FsError> {
    let source = PathBuf::from(&trash_path);
    let filename = source
        .file_name()
        .ok_or_else(|| FsError::InvalidPath("No filename".to_string()))?
        .to_string_lossy()
        .to_string();
    let original = filename
        .splitn(3, '-')
        .nth(2)
        .unwrap_or(&filename)
        .to_string();

    let target_root = PathBuf::from(&target_dir);
    fs::create_dir_all(&target_root)?;
    let restored = target_root.join(original);
    fs::rename(&source, &restored)?;
    Ok(restored.to_string_lossy().to_string())
}

#[tauri::command]
pub async fn empty_trash(workspace_root: String) -> Result<u32, FsError> {
    let trash = trash_dir(&workspace_root);
    let mut count = 0;
    if trash.exists() {
        for entry in fs::read_dir(&trash)? {
            let entry = entry?;
            if entry.path().is_dir() {
                fs::remove_dir_all(entry.path())?;
            } else {
                fs::remove_file(entry.path())?;
            }
            count += 1;
        }
    }
    Ok(count)
}
