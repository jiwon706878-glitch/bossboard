use std::path::{Path, PathBuf};

/// Validates that `requested` resolves under `workspace_root`.
///
/// Returns the canonicalised path on success. Used as the gate for any
/// agent-controlled path that reaches the filesystem (planned for v3.1
/// MCP tool calls — fs commands today are driven by trusted frontend
/// code that constructs paths from `bb_workspace_path`).
///
/// Two layers:
///   1. canonicalize() resolves `..`, symlinks, junctions; we then check
///      the result starts with the canonicalised workspace root.
///   2. A static deny-list catches a few common system paths even if step
///      one somehow accepts them (defense in depth).
#[allow(dead_code)]
pub fn validate_path_within_workspace(
    requested: &Path,
    workspace_root: &Path,
) -> Result<PathBuf, String> {
    let canonical = requested
        .canonicalize()
        .map_err(|e| format!("Path canonicalize failed: {e}"))?;

    let workspace_canonical = workspace_root
        .canonicalize()
        .map_err(|e| format!("Workspace canonicalize failed: {e}"))?;

    if !canonical.starts_with(&workspace_canonical) {
        return Err(format!(
            "Path traversal blocked: {} is outside workspace {}",
            canonical.display(),
            workspace_canonical.display(),
        ));
    }

    let lower = canonical.to_string_lossy().to_lowercase();
    const BLOCKED_PREFIXES: &[&str] = &[
        "/etc",
        "/usr",
        "/system",
        "/library/system",
        "c:\\windows",
        "c:/windows",
        "c:\\program files",
        "c:/program files",
        "c:\\programdata",
        "c:/programdata",
    ];
    for blocked in BLOCKED_PREFIXES {
        if lower.starts_with(*blocked) {
            return Err(format!("System path blocked: {blocked}"));
        }
    }

    Ok(canonical)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    fn temp_workspace() -> PathBuf {
        let dir = std::env::temp_dir().join(format!("bb-path-safety-{}", std::process::id()));
        fs::create_dir_all(&dir).unwrap();
        dir
    }

    #[test]
    fn allows_file_inside_workspace() {
        let ws = temp_workspace();
        let inside = ws.join("note.md");
        fs::write(&inside, "x").unwrap();
        let resolved = validate_path_within_workspace(&inside, &ws).unwrap();
        assert!(resolved.starts_with(ws.canonicalize().unwrap()));
    }

    #[test]
    fn blocks_dotdot_traversal() {
        let ws = temp_workspace();
        let outside = ws.join("..").join("..").join("etc").join("passwd");
        // Even if outside doesn't exist, canonicalize() fails — that's also a block.
        let result = validate_path_within_workspace(&outside, &ws);
        assert!(result.is_err());
    }
}
