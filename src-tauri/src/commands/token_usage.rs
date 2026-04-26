use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use tauri::Manager;

/// Per-call token tally written every time an agent completes a turn.
/// Lives in the same SQLite as the metadata tables (under app_data_dir,
/// out of the user's workspace so OneDrive / iCloud don't lock it).
#[derive(Debug, Serialize, Deserialize)]
pub struct UsageEntry {
    pub agent_name: String,
    pub provider: String,
    pub tokens_in: u64,
    pub tokens_out: u64,
}

#[derive(Debug, Serialize)]
pub struct UsageTotals {
    pub total_tokens: u64,
    pub total_cost_estimate: f64,
}

#[derive(Debug, Serialize)]
pub struct UsageBreakdown {
    pub key: String,
    pub tokens_in: u64,
    pub tokens_out: u64,
    pub cost_estimate: f64,
}

#[derive(Debug, Serialize)]
pub struct UsageData {
    pub period: String,
    pub totals: UsageTotals,
    pub by_provider: Vec<UsageBreakdown>,
    pub by_agent: Vec<UsageBreakdown>,
}

fn db_file(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("app_data_dir: {e}"))?;
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir.join("token_usage.sqlite"))
}

fn open_db(app: &tauri::AppHandle) -> Result<Connection, String> {
    let path = db_file(app)?;
    let conn = Connection::open(&path).map_err(|e| e.to_string())?;
    conn.execute_batch(
        r#"
        PRAGMA journal_mode = WAL;
        PRAGMA synchronous = NORMAL;
        PRAGMA busy_timeout = 5000;
        CREATE TABLE IF NOT EXISTS token_usage (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            agent_name TEXT NOT NULL,
            provider TEXT NOT NULL,
            tokens_in INTEGER NOT NULL,
            tokens_out INTEGER NOT NULL,
            recorded_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_usage_recorded
            ON token_usage(recorded_at);
        CREATE INDEX IF NOT EXISTS idx_usage_agent
            ON token_usage(agent_name);
        CREATE INDEX IF NOT EXISTS idx_usage_provider
            ON token_usage(provider);
        "#,
    )
    .map_err(|e| e.to_string())?;
    Ok(conn)
}

/// Estimate $ cost from token counts. Per-1M-token rates roughly tracking
/// each provider's mid-tier model as of late 2025. Marketing-grade
/// estimate, not a billing receipt — the actual bill comes from the
/// provider directly under BYOK.
fn estimate_cost(provider: &str, tokens_in: u64, tokens_out: u64) -> f64 {
    let (rate_in, rate_out): (f64, f64) = match provider {
        "anthropic" => (3.0, 15.0),
        "openai" => (2.5, 10.0),
        "google" => (0.075, 0.30),
        "xai" => (5.0, 15.0),
        "local" => (0.0, 0.0),
        _ => (1.0, 5.0),
    };
    (tokens_in as f64 * rate_in + tokens_out as f64 * rate_out) / 1_000_000.0
}

#[tauri::command]
pub async fn record_token_usage(
    app: tauri::AppHandle,
    entry: UsageEntry,
) -> Result<(), String> {
    let conn = open_db(&app)?;
    conn.execute(
        "INSERT INTO token_usage (agent_name, provider, tokens_in, tokens_out, recorded_at)
         VALUES (?1, ?2, ?3, ?4, ?5)",
        params![
            entry.agent_name,
            entry.provider,
            entry.tokens_in as i64,
            entry.tokens_out as i64,
            chrono::Utc::now().to_rfc3339(),
        ],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

fn since_for_period(period: &str) -> chrono::DateTime<chrono::Utc> {
    let now = chrono::Utc::now();
    match period {
        "today" => now - chrono::Duration::hours(24),
        "this_week" => now - chrono::Duration::days(7),
        _ => now - chrono::Duration::days(30),
    }
}

#[tauri::command]
pub async fn get_token_usage(
    app: tauri::AppHandle,
    period: String,
) -> Result<UsageData, String> {
    let conn = open_db(&app)?;
    let since = since_for_period(&period).to_rfc3339();

    let mut by_provider: Vec<UsageBreakdown> = {
        let mut stmt = conn
            .prepare(
                "SELECT provider, SUM(tokens_in), SUM(tokens_out)
                 FROM token_usage
                 WHERE recorded_at >= ?1
                 GROUP BY provider
                 ORDER BY SUM(tokens_in + tokens_out) DESC",
            )
            .map_err(|e| e.to_string())?;
        let rows = stmt
            .query_map(params![since.clone()], |row| {
                let provider: String = row.get(0)?;
                let tin: i64 = row.get(1)?;
                let tout: i64 = row.get(2)?;
                Ok((provider, tin as u64, tout as u64))
            })
            .map_err(|e| e.to_string())?;
        let mut out = Vec::new();
        for r in rows {
            let (provider, tin, tout) = r.map_err(|e| e.to_string())?;
            let cost = estimate_cost(&provider, tin, tout);
            out.push(UsageBreakdown {
                key: provider,
                tokens_in: tin,
                tokens_out: tout,
                cost_estimate: cost,
            });
        }
        out
    };

    let mut by_agent: Vec<UsageBreakdown> = {
        let mut stmt = conn
            .prepare(
                "SELECT agent_name, provider, SUM(tokens_in), SUM(tokens_out)
                 FROM token_usage
                 WHERE recorded_at >= ?1
                 GROUP BY agent_name, provider
                 ORDER BY SUM(tokens_in + tokens_out) DESC",
            )
            .map_err(|e| e.to_string())?;
        let rows = stmt
            .query_map(params![since], |row| {
                let agent: String = row.get(0)?;
                let provider: String = row.get(1)?;
                let tin: i64 = row.get(2)?;
                let tout: i64 = row.get(3)?;
                Ok((agent, provider, tin as u64, tout as u64))
            })
            .map_err(|e| e.to_string())?;
        let mut out = Vec::new();
        for r in rows {
            let (agent, provider, tin, tout) = r.map_err(|e| e.to_string())?;
            let cost = estimate_cost(&provider, tin, tout);
            out.push(UsageBreakdown {
                key: format!("{agent}|{provider}"),
                tokens_in: tin,
                tokens_out: tout,
                cost_estimate: cost,
            });
        }
        out
    };

    let total_tokens = by_provider
        .iter()
        .map(|b| b.tokens_in + b.tokens_out)
        .sum();
    let total_cost = by_provider.iter().map(|b| b.cost_estimate).sum();

    by_provider.sort_by(|a, b| b.cost_estimate.partial_cmp(&a.cost_estimate).unwrap_or(std::cmp::Ordering::Equal));
    by_agent.sort_by(|a, b| b.cost_estimate.partial_cmp(&a.cost_estimate).unwrap_or(std::cmp::Ordering::Equal));

    Ok(UsageData {
        period,
        totals: UsageTotals {
            total_tokens,
            total_cost_estimate: total_cost,
        },
        by_provider,
        by_agent,
    })
}
