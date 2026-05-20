//! Shared helpers for resolving the active adapter for a project.
//!
//! Centralised so handlers (`/specs`, `/adapter`, `/schema`) and the file
//! watcher in `state.rs` all use the exact same lookup order and config
//! normalisation. Keeping this in one place stops watcher activation from
//! drifting away from request-time adapter resolution.

use std::path::{Path, PathBuf};
use std::sync::Arc;

use leanspec_core::adapters::{
    Adapter, AdapterCache, AdapterConfig, AdapterError, AdapterRegistry,
};

/// Candidate file paths (relative to the project root) for adapter config,
/// in priority order. The legacy `provider:` files are honoured so existing
/// projects keep working.
pub const ADAPTER_CONFIG_CANDIDATES: &[&str] = &[
    "leanspec.adapter.yaml",
    ".lean-spec/adapter.yaml",
    "leanspec.provider.yaml",
    ".lean-spec/provider.yaml",
];

/// Returns the first adapter config file that exists under `project_root`.
pub fn find_adapter_config(project_root: &Path) -> Option<PathBuf> {
    ADAPTER_CONFIG_CANDIDATES
        .iter()
        .map(|c| project_root.join(c))
        .find(|p| p.exists())
}

/// Load the adapter config for a project. Falls back to a markdown adapter
/// rooted at `specs_dir` when no config file is present.
///
/// When the loaded config is a markdown adapter with a relative
/// `settings.directory`, the directory is resolved against `project_root` so
/// the adapter reads from the right tree regardless of the server's CWD.
pub fn load_adapter_config(
    project_root: &Path,
    specs_dir: &Path,
) -> Result<AdapterConfig, AdapterError> {
    let mut config = if let Some(path) = find_adapter_config(project_root) {
        AdapterRegistry::load_config(&path)?
    } else {
        AdapterConfig {
            adapter: "markdown".into(),
            settings: serde_json::json!({ "directory": specs_dir.to_string_lossy().as_ref() }),
            schema_id: None,
        }
    };

    normalise_markdown_directory(&mut config, project_root, specs_dir);
    Ok(config)
}

/// Resolve and instantiate the active adapter for a project.
///
/// Builds a fresh adapter every call; for handlers that fire frequently use
/// [`resolve_adapter_cached`] so the network-backed schema-enrichment isn't
/// repeated on every request.
pub fn resolve_adapter(
    project_root: &Path,
    specs_dir: &Path,
) -> Result<Box<dyn Adapter>, AdapterError> {
    let config = load_adapter_config(project_root, specs_dir)?;
    AdapterRegistry::create(&config)
}

/// Resolve the adapter for a project through the shared [`AdapterCache`],
/// re-using a cached instance when one is still fresh.
pub fn resolve_adapter_cached(
    cache: &AdapterCache,
    project_root: &Path,
    specs_dir: &Path,
) -> Result<Arc<dyn Adapter>, AdapterError> {
    let config = load_adapter_config(project_root, specs_dir)?;
    cache.get_or_resolve(project_root, || AdapterRegistry::create(&config))
}

/// Force the cached adapter for `project_root` to re-resolve, even if its TTL
/// hasn't expired yet. Returns the freshly-built instance.
pub fn refresh_adapter(
    cache: &AdapterCache,
    project_root: &Path,
    specs_dir: &Path,
) -> Result<Arc<dyn Adapter>, AdapterError> {
    let config = load_adapter_config(project_root, specs_dir)?;
    cache.refresh(project_root, || AdapterRegistry::create(&config))
}

/// When the active adapter is markdown, rewrite a relative `settings.directory`
/// (e.g. `"specs"`) so it's anchored at the project root. Falls back to
/// `specs_dir` when the config omits the field entirely.
fn normalise_markdown_directory(config: &mut AdapterConfig, project_root: &Path, specs_dir: &Path) {
    if config.adapter != "markdown" {
        return;
    }

    let current = config
        .settings
        .get("directory")
        .and_then(|v| v.as_str())
        .map(PathBuf::from);

    let resolved = match current {
        Some(dir) if dir.is_absolute() => dir,
        Some(dir) => project_root.join(dir),
        None => specs_dir.to_path_buf(),
    };

    if let Some(obj) = config.settings.as_object_mut() {
        obj.insert(
            "directory".into(),
            serde_json::Value::String(resolved.to_string_lossy().into_owned()),
        );
    } else {
        config.settings = serde_json::json!({ "directory": resolved.to_string_lossy().as_ref() });
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use tempfile::TempDir;

    #[test]
    fn fallback_uses_specs_dir() {
        let tmp = TempDir::new().unwrap();
        let specs = tmp.path().join("specs");
        fs::create_dir_all(&specs).unwrap();

        let config = load_adapter_config(tmp.path(), &specs).unwrap();
        assert_eq!(config.adapter, "markdown");
        assert_eq!(
            config.settings.get("directory").and_then(|v| v.as_str()),
            Some(specs.to_string_lossy().as_ref())
        );
    }

    #[test]
    fn relative_directory_resolved_against_project_root() {
        let tmp = TempDir::new().unwrap();
        let project = tmp.path();
        let yaml = project.join("leanspec.adapter.yaml");
        fs::write(&yaml, "adapter: markdown\ndirectory: docs/specs\n").unwrap();

        let specs = project.join("specs");
        let config = load_adapter_config(project, &specs).unwrap();
        let resolved = config
            .settings
            .get("directory")
            .and_then(|v| v.as_str())
            .unwrap();
        assert_eq!(resolved, project.join("docs/specs").to_string_lossy());
    }

    #[test]
    fn absolute_directory_preserved() {
        let tmp = TempDir::new().unwrap();
        let project = tmp.path();
        let yaml = project.join("leanspec.adapter.yaml");
        let abs = project.join("absolute-specs");
        fs::write(
            &yaml,
            format!("adapter: markdown\ndirectory: {}\n", abs.display()),
        )
        .unwrap();

        let specs = project.join("specs");
        let config = load_adapter_config(project, &specs).unwrap();
        assert_eq!(
            config.settings.get("directory").and_then(|v| v.as_str()),
            Some(abs.to_string_lossy().as_ref())
        );
    }

    #[test]
    fn non_markdown_adapter_left_alone() {
        let tmp = TempDir::new().unwrap();
        let project = tmp.path();
        let yaml = project.join("leanspec.adapter.yaml");
        fs::write(
            &yaml,
            "adapter: github\nowner: acme\nrepo: backend\ntoken_env: TEST_TOKEN\n",
        )
        .unwrap();

        let specs = project.join("specs");
        let config = load_adapter_config(project, &specs).unwrap();
        assert_eq!(config.adapter, "github");
        // No `directory` key was added.
        assert!(config.settings.get("directory").is_none());
    }
}
