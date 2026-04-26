use axum::{
    extract::State,
    http::{HeaderMap, StatusCode},
    middleware::{from_fn_with_state, Next},
    response::{IntoResponse, Response},
    routing::{get, post},
    Json, Router,
};
use serde::{Deserialize, Serialize};
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
            "admin.send_telegram".to_string(),
        ],
    })
}

#[derive(Debug, Deserialize)]
struct AdminTelegramRequest {
    message: String,
    #[serde(default)]
    priority: Option<String>,
    /// Caller's email — must be on the admin allow-list. The MCP token
    /// already gates access to the server but doesn't bind to a user, so
    /// we double-check here. Pass via the `x-bb-user-email` header (set
    /// by the in-app agent runner from the signed-in user's email).
    #[serde(default)]
    user_email: Option<String>,
}

#[derive(Debug, Serialize)]
struct AdminTelegramResponse {
    success: bool,
    error: Option<String>,
}

const ADMIN_EMAILS: &[&str] = &["jay@mybossboard.com", "jiwon706878@gmail.com"];

fn is_admin_email(email: &str) -> bool {
    let lower = email.to_lowercase();
    ADMIN_EMAILS.iter().any(|e| *e == lower)
}

/// Single MCP admin tool: send an arbitrary message to the configured
/// Telegram admin chat. Lets a Jay agent in BB ping itself for alerts
/// without going through the Vercel /api route. Full MCP tool registry
/// (search_library / list_feedback / etc.) is deferred to v3.1.
async fn admin_send_telegram_handler(
    headers: HeaderMap,
    Json(payload): Json<AdminTelegramRequest>,
) -> Response {
    // Email gate: prefer the X-Bb-User-Email header (set by the agent
    // runner) over the JSON body so the body can't override.
    let header_email = headers
        .get("x-bb-user-email")
        .and_then(|v| v.to_str().ok())
        .map(|s| s.to_string());
    let email = header_email.or(payload.user_email).unwrap_or_default();
    if !is_admin_email(&email) {
        return (
            StatusCode::FORBIDDEN,
            Json(AdminTelegramResponse {
                success: false,
                error: Some("admin email required".to_string()),
            }),
        )
            .into_response();
    }

    let bot_token = match std::env::var("TELEGRAM_BOT_TOKEN") {
        Ok(v) => v,
        Err(_) => {
            return (
                StatusCode::SERVICE_UNAVAILABLE,
                Json(AdminTelegramResponse {
                    success: false,
                    error: Some("TELEGRAM_BOT_TOKEN env not set".to_string()),
                }),
            )
                .into_response();
        }
    };
    let chat_id = match std::env::var("TELEGRAM_ADMIN_CHAT_ID") {
        Ok(v) => v,
        Err(_) => {
            return (
                StatusCode::SERVICE_UNAVAILABLE,
                Json(AdminTelegramResponse {
                    success: false,
                    error: Some("TELEGRAM_ADMIN_CHAT_ID env not set".to_string()),
                }),
            )
                .into_response();
        }
    };

    let prefix = match payload.priority.as_deref() {
        Some("critical") => "🚨",
        Some("warning") => "⚠️",
        _ => "ℹ️",
    };
    let body = format!("{prefix} {}", payload.message);

    let url = format!("https://api.telegram.org/bot{bot_token}/sendMessage");
    let client = reqwest::Client::new();
    let res = client
        .post(&url)
        .json(&serde_json::json!({
            "chat_id": chat_id,
            "text": body,
            "parse_mode": "Markdown",
        }))
        .send()
        .await;

    match res {
        Ok(r) if r.status().is_success() => (
            StatusCode::OK,
            Json(AdminTelegramResponse {
                success: true,
                error: None,
            }),
        )
            .into_response(),
        Ok(r) => (
            StatusCode::BAD_GATEWAY,
            Json(AdminTelegramResponse {
                success: false,
                error: Some(format!("telegram returned {}", r.status())),
            }),
        )
            .into_response(),
        Err(e) => (
            StatusCode::BAD_GATEWAY,
            Json(AdminTelegramResponse {
                success: false,
                error: Some(format!("telegram unreachable: {e}")),
            }),
        )
            .into_response(),
    }
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
            tracing::error!("MCP server: no available port in 39001..=39099");
            return;
        }
    };
    if let Ok(mut g) = state.port.lock() {
        *g = port;
    }
    tracing::info!("MCP server starting on 127.0.0.1:{port}");

    let protected = Router::new()
        .route("/", get(info_handler))
        .route(
            "/tools/admin_send_telegram",
            post(admin_send_telegram_handler),
        )
        .layer(from_fn_with_state(state.clone(), auth_middleware));

    let app = Router::new()
        .merge(protected)
        .route("/health", get(|| async { "ok" }))
        .with_state(state);

    let listener = match tokio::net::TcpListener::bind(("127.0.0.1", port)).await {
        Ok(l) => l,
        Err(e) => {
            tracing::error!("MCP server failed to bind on {port}: {e}");
            return;
        }
    };

    if let Err(e) = axum::serve(listener, app).await {
        tracing::error!("MCP server crashed: {e}");
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
