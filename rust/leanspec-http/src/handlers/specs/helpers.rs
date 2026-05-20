//! Shared helpers for spec handlers

#![allow(clippy::result_large_err)]

use axum::http::StatusCode;
use axum::Json;
use sha2::{Digest, Sha256};
use std::path::{Component, Path as FsPath, PathBuf};

use std::sync::Arc;

use leanspec_core::adapters::{Adapter, AdapterError};
use leanspec_core::{LeanSpecConfig, TokenStatus, ValidationResult};

use crate::adapter_resolution::resolve_adapter_cached;
use crate::error::ApiError;
use crate::project_registry::Project;
use crate::state::AppState;
use crate::utils::resolve_project;

use crate::types::SubSpec;

/// Resolve the active adapter for a project plus the project record itself.
///
/// Routes through the shared [`leanspec_core::adapters::AdapterCache`] so
/// network-backed schema enrichment (e.g. GitHub labels) is paid once per
/// cache window. The returned [`Arc<dyn Adapter>`] is safe to share across
/// requests; subsequent calls within the cache TTL hand back the same
/// instance.
pub(super) async fn get_adapter_and_project(
    state: &AppState,
    project_id: &str,
) -> Result<(Arc<dyn Adapter>, Project), (StatusCode, Json<ApiError>)> {
    let project = resolve_project(state, project_id).await?;
    let adapter = resolve_adapter_cached(&state.adapter_cache, &project.path, &project.specs_dir)
        .map_err(adapter_init_error)?;
    Ok((adapter, project))
}

fn adapter_init_error(err: AdapterError) -> (StatusCode, Json<ApiError>) {
    (
        StatusCode::INTERNAL_SERVER_ERROR,
        Json(ApiError::new("ADAPTER_INIT_FAILED", err.to_string())),
    )
}

/// Map any [`AdapterError`] to an HTTP error response.
pub(super) fn adapter_error(err: AdapterError) -> (StatusCode, Json<ApiError>) {
    match err {
        AdapterError::NotFound(id) => (StatusCode::NOT_FOUND, Json(ApiError::spec_not_found(&id))),
        AdapterError::NotSupported { .. } => (
            StatusCode::UNPROCESSABLE_ENTITY,
            Json(ApiError::new("ADAPTER_NOT_SUPPORTED", err.to_string())),
        ),
        AdapterError::InvalidField { .. } => (
            StatusCode::BAD_REQUEST,
            Json(ApiError::invalid_request(&err.to_string())),
        ),
        AdapterError::AuthError { .. } => (
            StatusCode::UNAUTHORIZED,
            Json(ApiError::unauthorized(&err.to_string())),
        ),
        AdapterError::ConfigError(_) | AdapterError::ParseError { .. } => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiError::internal_error(&err.to_string())),
        ),
        AdapterError::BackendError { .. } | AdapterError::RateLimit { .. } => (
            StatusCode::BAD_GATEWAY,
            Json(ApiError::internal_error(&err.to_string())),
        ),
        AdapterError::IoError(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiError::internal_error(&e.to_string())),
        ),
    }
}

/// Guard a handler so it only runs against the markdown adapter, with a
/// consistent 422 error otherwise.
pub(super) fn require_markdown_adapter(
    adapter: &dyn Adapter,
) -> Result<(), (StatusCode, Json<ApiError>)> {
    if adapter.capabilities().name == "markdown" {
        Ok(())
    } else {
        Err((
            StatusCode::UNPROCESSABLE_ENTITY,
            Json(ApiError::new(
                "ADAPTER_NOT_SUPPORTED",
                "This operation requires a markdown adapter",
            )),
        ))
    }
}

/// Reject spec ids that could escape the specs directory (path separators,
/// `..`, absolute paths). Returns `None` for any id that's safe to use.
pub(super) fn invalid_spec_id(spec_id: &str) -> bool {
    if spec_id.is_empty() {
        return true;
    }
    let path = FsPath::new(spec_id);
    if path.is_absolute() {
        return true;
    }
    path.components().any(|c| {
        matches!(
            c,
            Component::ParentDir | Component::RootDir | Component::Prefix(_)
        )
    }) || spec_id.contains('/')
        || spec_id.contains('\\')
}

/// Try to resolve a spec id to a `README.md` path under the project's specs
/// directory. Used by markdown-specific handlers (raw read/write, sub-spec
/// access) that operate on files directly.
///
/// Refuses any spec id that contains path separators, `..`, or is absolute
/// — those can never name a real spec dir and would let callers escape the
/// project's specs root.
pub(super) fn resolve_markdown_spec_path(specs_dir: &FsPath, spec_id: &str) -> Option<PathBuf> {
    if invalid_spec_id(spec_id) {
        return None;
    }

    let direct = specs_dir.join(spec_id).join("README.md");
    if direct.exists() {
        return Some(direct);
    }

    // Fuzzy match by directory-name prefix. Mirrors the markdown loader's
    // historical behaviour ("001" matches "001-first-spec") but is narrower
    // than the old `contains` heuristic: we only accept ids that look like a
    // numeric prefix of the directory name to avoid resolving "01" or "1"
    // onto an unrelated spec.
    let entries = std::fs::read_dir(specs_dir).ok()?;
    for entry in entries.flatten() {
        let path = entry.path();
        if !path.is_dir() {
            continue;
        }
        let Some(name) = path.file_name().and_then(|n| n.to_str()) else {
            continue;
        };
        if name == spec_id || directory_matches_id(name, spec_id) {
            let readme = path.join("README.md");
            if readme.exists() {
                return Some(readme);
            }
        }
    }
    None
}

/// Returns true when a spec id is a legitimate fuzzy match for the directory
/// name — either the directory's numeric prefix (e.g. `001` ↔ `001-foo`) or
/// the slug portion (`foo` ↔ `001-foo`).
fn directory_matches_id(dir_name: &str, spec_id: &str) -> bool {
    let Some((prefix, suffix)) = dir_name.split_once('-') else {
        return false;
    };
    if prefix.is_empty() || !prefix.chars().all(|c| c.is_ascii_digit()) {
        return false;
    }
    // Exact prefix match: "001" matches "001-foo" but "01" does not.
    prefix == spec_id || suffix == spec_id
}

pub(super) fn hash_raw_content(content: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(content.as_bytes());
    format!("{:x}", hasher.finalize())
}

pub(super) fn token_status_label(status: TokenStatus) -> &'static str {
    match status {
        TokenStatus::Optimal => "optimal",
        TokenStatus::Good => "good",
        TokenStatus::Warning => "warning",
        TokenStatus::Excessive => "critical",
    }
}

pub(super) fn validation_status_label(result: &ValidationResult) -> &'static str {
    if result.has_errors() {
        "fail"
    } else if result.has_warnings() {
        "warn"
    } else {
        "pass"
    }
}

pub(super) fn strip_frontmatter(content: &str) -> String {
    let trimmed = content.trim_start();
    if !trimmed.starts_with("---") {
        return content.to_string();
    }

    let mut lines = trimmed.lines();
    lines.next();

    let mut in_frontmatter = true;
    let mut body = String::new();

    for line in lines {
        if in_frontmatter && line.trim() == "---" {
            in_frontmatter = false;
            continue;
        }

        if !in_frontmatter {
            body.push_str(line);
            body.push('\n');
        }
    }

    if in_frontmatter {
        return content.to_string();
    }

    body
}

pub(super) fn format_sub_spec_name(file_name: &str) -> String {
    let base = file_name.trim_end_matches(".md");
    base.split(['-', '_'])
        .filter(|part| !part.is_empty())
        .map(|part| {
            if part.len() <= 4 && part.chars().all(|c| c.is_ascii_uppercase()) {
                part.to_string()
            } else {
                let mut chars = part.chars();
                if let Some(first) = chars.next() {
                    format!("{}{}", first.to_uppercase(), chars.as_str().to_lowercase())
                } else {
                    String::new()
                }
            }
        })
        .collect::<Vec<_>>()
        .join(" ")
}

pub(super) fn detect_sub_specs(readme_path: &str) -> Vec<SubSpec> {
    let Some(parent_dir) = FsPath::new(readme_path).parent() else {
        return Vec::new();
    };

    let mut sub_specs = Vec::new();

    let entries = match std::fs::read_dir(parent_dir) {
        Ok(entries) => entries,
        Err(_) => return sub_specs,
    };

    for entry in entries.flatten() {
        let path = entry.path();
        if path.is_dir() {
            continue;
        }

        let Some(file_name) = path.file_name().and_then(|n| n.to_str()) else {
            continue;
        };

        let lower_name = file_name.to_ascii_lowercase();
        if file_name == "README.md" || !lower_name.ends_with(".md") {
            continue;
        }

        let Ok(raw) = std::fs::read_to_string(&path) else {
            continue;
        };

        let content = strip_frontmatter(&raw);

        sub_specs.push(SubSpec {
            name: format_sub_spec_name(file_name),
            file: file_name.to_string(),
            content,
        });
    }

    sub_specs.sort_by_key(|s| s.file.to_lowercase());
    sub_specs
}

pub(super) fn load_project_config(project_path: &FsPath) -> Option<LeanSpecConfig> {
    let config_json = project_path.join(".lean-spec/config.json");
    if config_json.exists() {
        if let Ok(content) = std::fs::read_to_string(&config_json) {
            if let Ok(config) = serde_json::from_str::<LeanSpecConfig>(&content) {
                return Some(config);
            }
        }
    }

    let config_yaml = project_path.join(".lean-spec/config.yaml");
    if config_yaml.exists() {
        if let Ok(content) = std::fs::read_to_string(&config_yaml) {
            if let Ok(config) = serde_yaml::from_str::<LeanSpecConfig>(&content) {
                return Some(config);
            }
        }
    }

    None
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use tempfile::TempDir;

    #[test]
    fn invalid_spec_id_rejects_traversal() {
        assert!(invalid_spec_id(""));
        assert!(invalid_spec_id(".."));
        assert!(invalid_spec_id("../etc"));
        assert!(invalid_spec_id("001/../other"));
        assert!(invalid_spec_id("/abs/path"));
        assert!(invalid_spec_id("foo/bar"));
        assert!(invalid_spec_id("foo\\bar"));
    }

    #[test]
    fn invalid_spec_id_accepts_normal_ids() {
        assert!(!invalid_spec_id("001-first-spec"));
        assert!(!invalid_spec_id("001"));
        assert!(!invalid_spec_id("my-spec"));
    }

    #[test]
    fn resolve_markdown_spec_path_blocks_traversal() {
        let tmp = TempDir::new().unwrap();
        let specs = tmp.path().join("specs");
        fs::create_dir_all(&specs).unwrap();
        let outside = tmp.path().join("outside");
        fs::create_dir_all(&outside).unwrap();
        fs::write(outside.join("README.md"), "secret").unwrap();

        assert!(resolve_markdown_spec_path(&specs, "../outside").is_none());
        assert!(resolve_markdown_spec_path(&specs, "/etc/passwd").is_none());
        assert!(resolve_markdown_spec_path(&specs, "").is_none());
    }

    #[test]
    fn resolve_markdown_spec_path_finds_direct_and_fuzzy() {
        let tmp = TempDir::new().unwrap();
        let specs = tmp.path().join("specs");
        let spec_dir = specs.join("001-first-spec");
        fs::create_dir_all(&spec_dir).unwrap();
        fs::write(spec_dir.join("README.md"), "body").unwrap();

        // Exact match.
        assert!(resolve_markdown_spec_path(&specs, "001-first-spec").is_some());
        // Numeric prefix fuzzy.
        assert!(resolve_markdown_spec_path(&specs, "001").is_some());
        // Slug fuzzy.
        assert!(resolve_markdown_spec_path(&specs, "first-spec").is_some());
        // Bogus numeric prefix doesn't match.
        assert!(resolve_markdown_spec_path(&specs, "01").is_none());
        assert!(resolve_markdown_spec_path(&specs, "9").is_none());
    }

    #[test]
    fn directory_matches_id_handles_prefix_and_slug() {
        assert!(directory_matches_id("001-foo", "001"));
        assert!(directory_matches_id("001-foo", "foo"));
        assert!(!directory_matches_id("001-foo", "00"));
        assert!(!directory_matches_id("001-foo", "1"));
        assert!(!directory_matches_id("no-prefix", "no"));
        assert!(!directory_matches_id("", "001"));
    }
}
