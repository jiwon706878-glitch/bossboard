use notify::{recommended_watcher, EventKind, RecommendedWatcher, RecursiveMode, Watcher};
use std::path::Path;
use std::sync::{mpsc, Arc, Mutex};
use tauri::{Emitter, State};

pub struct WatcherState {
    pub watcher: Arc<Mutex<Option<RecommendedWatcher>>>,
}

impl Default for WatcherState {
    fn default() -> Self {
        Self {
            watcher: Arc::new(Mutex::new(None)),
        }
    }
}

const IGNORED_PATTERNS: &[&str] = &[
    "node_modules",
    ".git",
    "target",
    "dist",
    "build",
    ".bb/cache",
    ".bb/backups",
    ".bb/trash",
    "__pycache__",
    ".venv",
    "venv",
    ".next",
    ".cache",
    ".DS_Store",
    "Thumbs.db",
];

fn should_ignore(path: &Path) -> bool {
    let s = path.to_string_lossy();
    for pattern in IGNORED_PATTERNS {
        let with_slash = format!("/{}/", pattern);
        let with_back = format!("\\{}\\", pattern);
        if s.contains(&with_slash) || s.contains(&with_back) {
            return true;
        }
        if s.ends_with(pattern) {
            return true;
        }
    }
    false
}

#[tauri::command]
pub async fn start_watching_workspace(
    app: tauri::AppHandle,
    state: State<'_, WatcherState>,
    workspace_root: String,
) -> Result<(), String> {
    {
        let mut watcher_guard = state.watcher.lock().map_err(|e| e.to_string())?;
        *watcher_guard = None;
    }

    let (tx, rx) = mpsc::channel();
    let mut watcher = recommended_watcher(tx).map_err(|e| e.to_string())?;
    watcher
        .watch(Path::new(&workspace_root), RecursiveMode::Recursive)
        .map_err(|e| e.to_string())?;

    let app_handle = app.clone();
    std::thread::spawn(move || {
        for res in rx {
            if let Ok(event) = res {
                let event_type = match event.kind {
                    EventKind::Create(_) => "create",
                    EventKind::Modify(_) => "modify",
                    EventKind::Remove(_) => "remove",
                    _ => continue,
                };
                let paths: Vec<String> = event
                    .paths
                    .iter()
                    .filter(|p| !p.is_symlink() && !should_ignore(p))
                    .map(|p| p.to_string_lossy().to_string())
                    .collect();
                if paths.is_empty() {
                    continue;
                }
                let _ = app_handle.emit(
                    "file-change",
                    serde_json::json!({
                        "type": event_type,
                        "paths": paths,
                    }),
                );
            }
        }
    });

    let mut watcher_guard = state.watcher.lock().map_err(|e| e.to_string())?;
    *watcher_guard = Some(watcher);

    Ok(())
}

#[tauri::command]
pub async fn stop_watching_workspace(state: State<'_, WatcherState>) -> Result<(), String> {
    let mut watcher_guard = state.watcher.lock().map_err(|e| e.to_string())?;
    *watcher_guard = None;
    Ok(())
}
