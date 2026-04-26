mod commands;
mod mcp_server;

use std::path::Path;

use tauri::Manager;
use tracing_appender::rolling::{RollingFileAppender, Rotation};
use tracing_subscriber::layer::SubscriberExt;
use tracing_subscriber::util::SubscriberInitExt;

use commands::backup::create_workspace_backup;
use commands::fs::{
    check_workspace_health, create_directory, delete_file, file_exists, list_directory, read_file,
    write_binary_file, write_file,
};
use commands::keychain::{keychain_delete, keychain_get, keychain_set};
use commands::metadata::{
    metadata_delete, metadata_list, metadata_restore_backup, metadata_search, metadata_upsert,
};
use commands::trash::{empty_trash, list_trash, move_to_trash, restore_from_trash};
use commands::watcher::{
    start_watching_workspace, stop_watching_workspace, WatcherState,
};
use commands::workspace::{get_default_workspace_path, initialize_workspace, is_workspace};
use mcp_server::{get_mcp_info, McpState};

fn setup_logging(app_data_dir: &Path) {
    let log_dir = app_data_dir.join("logs");
    let _ = std::fs::create_dir_all(&log_dir);

    let file_appender = RollingFileAppender::new(Rotation::DAILY, &log_dir, "bossboard.log");
    let (non_blocking, guard) = tracing_appender::non_blocking(file_appender);

    let _ = tracing_subscriber::registry()
        .with(
            tracing_subscriber::fmt::layer()
                .with_writer(non_blocking)
                .with_ansi(false),
        )
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| tracing_subscriber::EnvFilter::new("info")),
        )
        .try_init();

    // Hold the guard for the lifetime of the process so the writer keeps flushing.
    std::mem::forget(guard);

    std::panic::set_hook(Box::new(|info| {
        tracing::error!(target: "panic", "PANIC: {info}");
        if let Some(loc) = info.location() {
            tracing::error!(target: "panic", "  at {}:{}", loc.file(), loc.line());
        }
    }));

    tracing::info!("BossBoard logging initialized at {}", log_dir.display());
}

#[tauri::command]
async fn get_logs(app: tauri::AppHandle) -> Result<String, String> {
    let log_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?
        .join("logs");
    if !log_dir.exists() {
        return Ok("No logs yet.".to_string());
    }
    let mut entries: Vec<_> = std::fs::read_dir(&log_dir)
        .map_err(|e| e.to_string())?
        .filter_map(|e| e.ok())
        .collect();
    entries.sort_by_key(|e| e.file_name());
    let mut buf = String::new();
    for entry in entries.iter().rev().take(1) {
        let content = std::fs::read_to_string(entry.path()).unwrap_or_default();
        buf.push_str(&content);
    }
    Ok(buf)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let mcp_state = McpState::new();
    let mcp_state_clone = mcp_state.clone();

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_process::init())
        .manage(WatcherState::default())
        .manage(mcp_state)
        .setup(move |app| {
            if let Ok(dir) = app.path().app_data_dir() {
                setup_logging(&dir);
            }
            let mcp = mcp_state_clone.clone();
            tauri::async_runtime::spawn(async move {
                mcp_server::run_mcp_server(mcp).await;
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            read_file,
            write_file,
            list_directory,
            create_directory,
            delete_file,
            file_exists,
            write_binary_file,
            check_workspace_health,
            initialize_workspace,
            is_workspace,
            get_default_workspace_path,
            metadata_upsert,
            metadata_list,
            metadata_search,
            metadata_delete,
            metadata_restore_backup,
            start_watching_workspace,
            stop_watching_workspace,
            keychain_set,
            keychain_get,
            keychain_delete,
            create_workspace_backup,
            move_to_trash,
            list_trash,
            restore_from_trash,
            empty_trash,
            get_mcp_info,
            get_logs,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
