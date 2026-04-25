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
                    .map(|p| p.to_string_lossy().to_string())
                    .collect();
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
