mod commands;
mod mcp_server;

use commands::fs::{
    create_directory, delete_file, file_exists, list_directory, read_file, write_binary_file,
    write_file,
};
use commands::metadata::{metadata_delete, metadata_list, metadata_search, metadata_upsert};
use commands::watcher::start_watching_workspace;
use commands::workspace::{get_default_workspace_path, initialize_workspace, is_workspace};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_process::init())
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            tauri::async_runtime::spawn(async {
                mcp_server::run_mcp_server(39001).await;
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
            initialize_workspace,
            is_workspace,
            get_default_workspace_path,
            metadata_upsert,
            metadata_list,
            metadata_search,
            metadata_delete,
            start_watching_workspace,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
