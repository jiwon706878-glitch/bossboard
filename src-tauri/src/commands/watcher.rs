use notify::{recommended_watcher, EventKind, RecursiveMode, Watcher};
use std::path::Path;
use std::sync::mpsc;
use tauri::Emitter;

#[tauri::command]
pub async fn start_watching_workspace(
    app: tauri::AppHandle,
    workspace_root: String,
) -> Result<(), String> {
    let (tx, rx) = mpsc::channel();
    let mut watcher = recommended_watcher(tx).map_err(|e| e.to_string())?;
    watcher
        .watch(Path::new(&workspace_root), RecursiveMode::Recursive)
        .map_err(|e| e.to_string())?;

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
                let _ = app.emit(
                    "file-change",
                    serde_json::json!({
                        "type": event_type,
                        "paths": paths,
                    }),
                );
            }
        }
    });

    // v3.0 MVP: a single workspace per app run, so leak the watcher to keep it alive.
    // Week 4 will move this into managed app state with proper teardown.
    Box::leak(Box::new(watcher));

    Ok(())
}
