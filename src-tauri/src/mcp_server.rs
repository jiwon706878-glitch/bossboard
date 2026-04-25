use axum::{routing::get, Json, Router};
use serde::Serialize;

#[derive(Serialize)]
struct McpInfo {
    name: String,
    version: String,
    capabilities: Vec<String>,
}

async fn info_handler() -> Json<McpInfo> {
    Json(McpInfo {
        name: "BossBoard MCP".to_string(),
        version: "3.0.0".to_string(),
        capabilities: vec![
            "library.read".to_string(),
            "library.write".to_string(),
            "agents.list".to_string(),
            "board.post".to_string(),
        ],
    })
}

pub async fn run_mcp_server(port: u16) {
    let app = Router::new()
        .route("/", get(info_handler))
        .route("/health", get(|| async { "ok" }));

    let listener = match tokio::net::TcpListener::bind(format!("127.0.0.1:{}", port)).await {
        Ok(l) => l,
        Err(e) => {
            log::error!("MCP server failed to bind on {port}: {e}");
            return;
        }
    };

    if let Err(e) = axum::serve(listener, app).await {
        log::error!("MCP server crashed: {e}");
    }
}
