//! Shared helpers for spec handlers

#![allow(clippy::result_large_err)]

use axum::http::StatusCode;
use axum::Json;
use sha2::{Digest, Sha256};
use std::path::{Path as FsPath, PathBuf};

use leanspec_core::adapters::{Adapter, AdapterConfig, AdapterError, AdapterRegistry};
use leanspec_core::{LeanSpecConfig, TokenStatus, ValidationResult};

use crate::error::ApiError;
use crate::project_registry::Project;
use crate::state::AppState;
use crate::utils::resolve_project;

use crate::types::SubSpec;

/// Candidate file paths (relative to the project root) for adapter config,
/// in priority order. Legacy `provider:` files are honoured so existing
/// projects keep working.
const ADAPTER_CONFIG_CANDIDATES: &[&str] = &[
    "leanspec.adapter.yaml",
    ".lean-spec/adapter.yaml",
    "leanspec.provider.yaml",
    ".lean-spec/provider.yaml",
];

/// Resolve the active adapter for a project plus the project record itself.
///
/// Adapter config is read from the project root using the same lookup order
/// as the CLI. When no config file is present we fall back to the markdown
/// adapter pointed at the project's declared `specs_dir`.
pub(super) async fn get_adapter_and_project(
    state: &AppState,
    project_id: &str,
) -> Result<(Box<dyn Adapter>, Project), (StatusCode, Json<ApiError>)> {
    let project = resolve_project(state, project_id).await?;
    let adapter = resolve_adapter_for_project(&project.path, &project.specs_dir)?;
    Ok((adapter, project))
}

pub(super) fn resolve_adapter_for_project(
    project_root: &FsPath,
    specs_dir: &FsPath,
) -> Result<Box<dyn Adapter>, (StatusCode, Json<ApiError>)> {
    for candidate in ADAPTER_CONFIG_CANDIDATES {
        let path = project_root.join(candidate);
        if path.exists() {
            let config = AdapterRegistry::load_config(&path).map_err(adapter_init_error)?;
            return AdapterRegistry::create(&config).map_err(adapter_init_error);
        }
    }

    let config = AdapterConfig {
        adapter: "markdown".into(),
        settings: serde_json::json!({ "directory": specs_dir.to_string_lossy().as_ref() }),
    };
    AdapterRegistry::create(&config).map_err(adapter_init_error)
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

/// Try to resolve a spec id to a `README.md` path under the project's specs
/// directory. Used by markdown-specific handlers (raw read/write, sub-spec
/// access) that operate on files directly.
pub(super) fn resolve_markdown_spec_path(specs_dir: &FsPath, spec_id: &str) -> Option<PathBuf> {
    let direct = specs_dir.join(spec_id).join("README.md");
    if direct.exists() {
        return Some(direct);
    }

    let entries = std::fs::read_dir(specs_dir).ok()?;
    for entry in entries.flatten() {
        let path = entry.path();
        if !path.is_dir() {
            continue;
        }
        let Some(name) = path.file_name().and_then(|n| n.to_str()) else {
            continue;
        };
        if name.contains(spec_id) || spec_id.contains(name) {
            let readme = path.join("README.md");
            if readme.exists() {
                return Some(readme);
            }
        }
    }
    None
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
