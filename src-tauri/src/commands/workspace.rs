use super::fs::FsError;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

#[derive(Debug, Serialize, Deserialize)]
pub struct WorkspaceInfo {
    pub root_path: String,
    pub is_initialized: bool,
}

#[tauri::command]
pub async fn initialize_workspace(root_path: String) -> Result<WorkspaceInfo, FsError> {
    let root = PathBuf::from(&root_path);

    if let Some(parent) = root.parent() {
        fs::create_dir_all(parent)?;
    }
    fs::create_dir_all(&root)?;

    let dirs = ["Library", "agents", "shared", "private", ".bb"];

    for dir in &dirs {
        fs::create_dir_all(root.join(dir))?;
    }

    let marker = root.join(".bb/workspace.json");
    if !marker.exists() {
        let info = serde_json::json!({
            "version": "3.0.0",
            "created": chrono::Utc::now().to_rfc3339(),
        });
        fs::write(&marker, serde_json::to_string_pretty(&info).unwrap())?;
    }

    let getting_started = root.join("Library/Getting-Started.md");
    if !getting_started.exists() {
        fs::write(&getting_started, GETTING_STARTED_CONTENT)?;
    }

    let roadmap = root.join("Library/Roadmap.md");
    if !roadmap.exists() {
        fs::write(&roadmap, ROADMAP_CONTENT)?;
    }

    Ok(WorkspaceInfo {
        root_path: root.to_string_lossy().to_string(),
        is_initialized: true,
    })
}

#[tauri::command]
pub async fn is_workspace(root_path: String) -> bool {
    let marker = PathBuf::from(&root_path).join(".bb/workspace.json");
    marker.exists()
}

#[tauri::command]
pub async fn get_default_workspace_path() -> Result<String, FsError> {
    let home = dirs::home_dir()
        .ok_or_else(|| FsError::InvalidPath("could not resolve home directory".into()))?;
    let path = home.join("Documents").join("BossBoard");
    Ok(path.to_string_lossy().to_string())
}

const GETTING_STARTED_CONTENT: &str = r#"---
id: "getting-started"
title: "Getting Started with BossBoard"
tags: ["guide", "onboarding"]
created: "2026-04-24T00:00:00Z"
---

# Welcome to BossBoard

BossBoard is a local-first AI agent workspace. Your files stay on your machine.

## Quick Start

1. **Connect an AI provider** — Settings → AI Providers → Add your key
2. **Create your first agent** — Agents → New Agent → Pick a template
3. **Write a manual** — Edit /agents/{agent-name}/manual.md
4. **Start collaborating** — DM your agent, post to the board

## Folder Structure

- `/Library/` — Your wiki pages (this file is here)
- `/agents/{name}/` — Each agent's workspace
- `/shared/` — Files multiple agents can access
- `/private/` — User-only, agents blocked

## Learn More

- Check out `/Library/Roadmap.md` for coming features
- Visit mybossboard.com/docs for full documentation
"#;

const ROADMAP_CONTENT: &str = r#"---
id: "roadmap"
title: "BossBoard Roadmap"
tags: ["roadmap", "future"]
created: "2026-04-24T00:00:00Z"
---

# BossBoard Roadmap

## Current (v3.0)
- Local-first file storage
- BYOK AI providers
- Multi-agent collaboration
- GitHub + Google Drive MCP integration
- Desktop app (Windows + macOS)
- DM-based chat with agents (Personal Assistant + specialists)
- Translate any wiki page to 6 languages (BYOK; Gemini Flash is the cheapest)

## Coming Soon

### v3.1 (6 weeks)
- Telegram Bot integration (remote agent commands)
- External read-only web UI
- Global hotkeys

### v3.2 (12 weeks)
- Custom MCP Tools (user scripts)
- Cloud MCP Server (connect from Claude Code directly)
- Smart Search (semantic, BYOK)
- Multi-device beta

### v4.0 (6 months)
- Marketplace (agent manuals)
- Community board (cross-workspace)
- Mobile PWA (monitoring)

## Feedback

Contact: jay@mybossboard.com
"#;
