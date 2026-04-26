use std::collections::HashMap;
use std::path::PathBuf;

// Per-locale translation overrides live under
// `<workspace>/.bb/translations/{locale}.json`. Workspace path is
// passed in from the frontend (consistent with other commands like
// metadata_upsert) so we don't need a Tauri AppState struct.

fn translations_dir(workspace_root: &str) -> PathBuf {
    PathBuf::from(workspace_root)
        .join(".bb")
        .join("translations")
}

fn locale_file(workspace_root: &str, locale: &str) -> PathBuf {
    translations_dir(workspace_root).join(format!("{locale}.json"))
}

/// Load the user's translation overrides for `locale`. Returns an empty
/// map when the file doesn't exist — a non-translated locale should
/// behave like English with zero overrides.
#[tauri::command]
pub async fn load_user_translations(
    workspace_root: String,
    locale: String,
) -> Result<HashMap<String, String>, String> {
    let path = locale_file(&workspace_root, &locale);
    if !path.exists() {
        return Ok(HashMap::new());
    }
    let raw = std::fs::read_to_string(&path).map_err(|e| e.to_string())?;
    let parsed: HashMap<String, String> = serde_json::from_str(&raw).unwrap_or_default();
    Ok(parsed)
}

/// Save (or clear) a single key/value override for `locale`. Empty value
/// removes the key so users can revert to the English default by clearing
/// the field.
#[tauri::command]
pub async fn save_user_translation(
    workspace_root: String,
    locale: String,
    key: String,
    translation: String,
) -> Result<(), String> {
    let dir = translations_dir(&workspace_root);
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;

    let path = locale_file(&workspace_root, &locale);
    let mut map: HashMap<String, String> = if path.exists() {
        let raw = std::fs::read_to_string(&path).map_err(|e| e.to_string())?;
        serde_json::from_str(&raw).unwrap_or_default()
    } else {
        HashMap::new()
    };

    if translation.trim().is_empty() {
        map.remove(&key);
    } else {
        map.insert(key, translation);
    }

    let raw = serde_json::to_string_pretty(&map).map_err(|e| e.to_string())?;
    std::fs::write(&path, raw).map_err(|e| e.to_string())?;
    Ok(())
}

/// Same as load_user_translations — exposed under a separate name so the
/// "Submit to community" path reads exactly the same data.
#[tauri::command]
pub async fn export_user_translations(
    workspace_root: String,
    locale: String,
) -> Result<HashMap<String, String>, String> {
    load_user_translations(workspace_root, locale).await
}
