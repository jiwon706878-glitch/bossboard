use axum::{
    extract::State,
    http::{HeaderMap, StatusCode},
    middleware::{from_fn_with_state, Next},
    response::Response,
    routing::get,
    Json, Router,
};
use serde::Serialize;
use std::net::TcpListener;
use std::sync::{Arc, Mutex};

#[derive(Clone)]
pub struct McpState {
    pub token: Arc<Mutex<String>>,
    pub port: Arc<Mutex<u16>>,
}

impl McpState {
    pub fn new() -> Self {
        Self {
            token: Arc::new(Mutex::new(generate_token())),
            port: Arc::new(Mutex::new(0)),
        }
    }
    pub fn token(&self) -> String {
        self.token.lock().map(|g| g.clone()).unwrap_or_default()
    }
    pub fn port(&self) -> u16 {
        self.port.lock().map(|g| *g).unwrap_or(0)
    }
}

fn generate_token() -> String {
    let bytes: [u8; 24] = std::array::from_fn(|_| rand::random::<u8>());
    let hex: String = bytes.iter().map(|b| format!("{:02x}", b)).collect();
    format!("bb_{}", hex)
}

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

async fn auth_middleware(
    State(state): State<McpState>,
    headers: HeaderMap,
    request: axum::extract::Request,
    next: Next,
) -> Result<Response, StatusCode> {
    let auth = headers
        .get("authorization")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("");
    let expected = format!("Bearer {}", state.token());
    if auth == expected {
        Ok(next.run(request).await)
    } else {
        Err(StatusCode::UNAUTHORIZED)
    }
}

fn find_available_port(start: u16, end: u16) -> Option<u16> {
    for port in start..=end {
        if TcpListener::bind(("127.0.0.1", port)).is_ok() {
            return Some(port);
        }
    }
    None
}

/// Run the local MCP server. Returns the bound port so callers can read it
/// from McpState. /health is unauthenticated; / and any future tool routes
/// require `Authorization: Bearer <token>`.
pub async fn run_mcp_server(state: McpState) {
    let port = match find_available_port(39001, 39099) {
        Some(p) => p,
        None => {
            log::error!("MCP server: no available port in 39001..=39099");
            return;
        }
    };
    if let Ok(mut g) = state.port.lock() {
        *g = port;
    }
    log::info!("MCP server starting on 127.0.0.1:{port}");

    let protected = Router::new()
        .route("/", get(info_handler))
        .layer(from_fn_with_state(state.clone(), auth_middleware));

    let app = Router::new()
        .merge(protected)
        .route("/health", get(|| async { "ok" }))
        .with_state(state);

    let listener = match tokio::net::TcpListener::bind(("127.0.0.1", port)).await {
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

#[tauri::command]
pub async fn get_mcp_info(
    state: tauri::State<'_, McpState>,
) -> Result<serde_json::Value, String> {
    Ok(serde_json::json!({
        "port": state.port(),
        "token": state.token(),
    }))
}
