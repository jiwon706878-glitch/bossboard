use super::fs::FsError;
use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;

#[derive(Debug, Serialize, Deserialize)]
pub struct FileMetadata {
    pub id: String,
    pub path: String,
    pub title: String,
    pub tags: Vec<String>,
    pub agent_access: Vec<String>,
    pub hash: String,
    pub size: i64,
    pub modified: i64,
    pub content_preview: String,
}

fn db_path(workspace_root: &str) -> PathBuf {
    PathBuf::from(workspace_root).join(".bb/metadata.sqlite")
}

fn ensure_schema(conn: &Connection) -> rusqlite::Result<()> {
    conn.execute_batch(
        r#"
        CREATE TABLE IF NOT EXISTS file_metadata (
            id TEXT PRIMARY KEY,
            path TEXT NOT NULL UNIQUE,
            title TEXT NOT NULL,
            tags TEXT,
            agent_access TEXT,
            hash TEXT,
            size INTEGER,
            modified INTEGER,
            content_preview TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_path ON file_metadata(path);
        CREATE INDEX IF NOT EXISTS idx_title ON file_metadata(title);
        CREATE INDEX IF NOT EXISTS idx_modified ON file_metadata(modified);
        CREATE VIRTUAL TABLE IF NOT EXISTS file_search USING fts5(
            id, title, tags, content_preview
        );
    "#,
    )?;
    Ok(())
}

fn row_to_metadata(row: &rusqlite::Row) -> rusqlite::Result<FileMetadata> {
    let tags: String = row.get(3).unwrap_or_default();
    let agent_access: String = row.get(4).unwrap_or_default();
    Ok(FileMetadata {
        id: row.get(0)?,
        path: row.get(1)?,
        title: row.get(2)?,
        tags: if tags.is_empty() {
            vec![]
        } else {
            tags.split(',').map(String::from).collect()
        },
        agent_access: if agent_access.is_empty() {
            vec![]
        } else {
            agent_access.split(',').map(String::from).collect()
        },
        hash: row.get(5).unwrap_or_default(),
        size: row.get(6).unwrap_or(0),
        modified: row.get(7).unwrap_or(0),
        content_preview: row.get(8).unwrap_or_default(),
    })
}

#[tauri::command]
pub async fn metadata_upsert(
    workspace_root: String,
    meta: FileMetadata,
) -> Result<(), FsError> {
    let path = db_path(&workspace_root);
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent)?;
    }
    let conn =
        Connection::open(&path).map_err(|e| FsError::InvalidPath(e.to_string()))?;
    ensure_schema(&conn).map_err(|e| FsError::InvalidPath(e.to_string()))?;

    let tags = meta.tags.join(",");
    let agent_access = meta.agent_access.join(",");

    conn.execute(
        r#"INSERT OR REPLACE INTO file_metadata
           (id, path, title, tags, agent_access, hash, size, modified, content_preview)
           VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)"#,
        params![
            meta.id,
            meta.path,
            meta.title,
            tags,
            agent_access,
            meta.hash,
            meta.size,
            meta.modified,
            meta.content_preview
        ],
    )
    .map_err(|e| FsError::InvalidPath(e.to_string()))?;

    conn.execute(
        "INSERT OR REPLACE INTO file_search (id, title, tags, content_preview) VALUES (?1, ?2, ?3, ?4)",
        params![meta.id, meta.title, tags, meta.content_preview],
    )
    .map_err(|e| FsError::InvalidPath(e.to_string()))?;

    Ok(())
}

#[tauri::command]
pub async fn metadata_list(
    workspace_root: String,
    folder: Option<String>,
) -> Result<Vec<FileMetadata>, FsError> {
    let path = db_path(&workspace_root);
    if !path.exists() {
        return Ok(vec![]);
    }
    let conn =
        Connection::open(&path).map_err(|e| FsError::InvalidPath(e.to_string()))?;
    ensure_schema(&conn).map_err(|e| FsError::InvalidPath(e.to_string()))?;

    let results = match folder {
        Some(f) => {
            let mut stmt = conn
                .prepare(
                    "SELECT * FROM file_metadata WHERE path LIKE ?1 ORDER BY modified DESC",
                )
                .map_err(|e| FsError::InvalidPath(e.to_string()))?;
            let like = format!("{}%", f);
            let rows = stmt
                .query_map(params![like], row_to_metadata)
                .map_err(|e| FsError::InvalidPath(e.to_string()))?;
            rows.filter_map(|r| r.ok()).collect()
        }
        None => {
            let mut stmt = conn
                .prepare("SELECT * FROM file_metadata ORDER BY modified DESC")
                .map_err(|e| FsError::InvalidPath(e.to_string()))?;
            let rows = stmt
                .query_map([], row_to_metadata)
                .map_err(|e| FsError::InvalidPath(e.to_string()))?;
            rows.filter_map(|r| r.ok()).collect()
        }
    };

    Ok(results)
}

#[tauri::command]
pub async fn metadata_search(
    workspace_root: String,
    query: String,
) -> Result<Vec<FileMetadata>, FsError> {
    let path = db_path(&workspace_root);
    if !path.exists() {
        return Ok(vec![]);
    }
    let conn =
        Connection::open(&path).map_err(|e| FsError::InvalidPath(e.to_string()))?;
    ensure_schema(&conn).map_err(|e| FsError::InvalidPath(e.to_string()))?;

    let sql = r#"
        SELECT m.* FROM file_metadata m
        JOIN file_search s ON m.id = s.id
        WHERE file_search MATCH ?1
        ORDER BY rank
        LIMIT 50
    "#;

    let mut stmt = conn
        .prepare(sql)
        .map_err(|e| FsError::InvalidPath(e.to_string()))?;
    let rows = stmt
        .query_map(params![query], row_to_metadata)
        .map_err(|e| FsError::InvalidPath(e.to_string()))?;

    let results: Vec<FileMetadata> = rows.filter_map(|r| r.ok()).collect();
    Ok(results)
}

#[tauri::command]
pub async fn metadata_delete(workspace_root: String, id: String) -> Result<(), FsError> {
    let path = db_path(&workspace_root);
    let conn =
        Connection::open(&path).map_err(|e| FsError::InvalidPath(e.to_string()))?;
    conn.execute("DELETE FROM file_metadata WHERE id = ?1", params![id])
        .map_err(|e| FsError::InvalidPath(e.to_string()))?;
    conn.execute("DELETE FROM file_search WHERE id = ?1", params![id])
        .map_err(|e| FsError::InvalidPath(e.to_string()))?;
    Ok(())
}
