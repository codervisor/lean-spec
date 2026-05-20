//! Adapter registry — factory that resolves [`AdapterConfig`] into concrete
//! [`Adapter`] implementations and loads configuration from disk.
//!
//! When additional adapters (GitHub, ADO, Jira, Linear) land, wire them up
//! in [`AdapterRegistry::create`]; the rest of the system keeps using
//! [`AdapterRegistry`] unchanged.

use std::path::Path;

#[cfg(feature = "ado")]
use super::ado::AdoAdapter;
#[cfg(feature = "github")]
use super::github::GitHubAdapter;
#[cfg(feature = "jira")]
use super::jira::JiraAdapter;
use super::markdown::MarkdownAdapter;
use super::{Adapter, AdapterConfig, AdapterError};

/// Factory for [`Adapter`] instances.
pub struct AdapterRegistry;

/// Print a one-line warning when an adapter's `resolve_inline` enrichment
/// fails. The CLI continues with the static schema; agents fall back to the
/// declared defaults rather than aborting on offline / auth errors.
#[cfg_attr(
    not(any(feature = "github", feature = "ado", feature = "jira")),
    allow(dead_code)
)]
fn warn_on_resolve(adapter: &str, result: Result<(), AdapterError>) {
    if let Err(err) = result {
        eprintln!("warning: could not enrich {adapter} schema ({err}). Using static defaults.");
    }
}

impl AdapterRegistry {
    /// Instantiate an adapter from the provided configuration.
    pub fn create(config: &AdapterConfig) -> Result<Box<dyn Adapter>, AdapterError> {
        match config.adapter.as_str() {
            "markdown" => {
                let dir = config
                    .settings
                    .get("directory")
                    .and_then(|v| v.as_str())
                    .unwrap_or("specs");
                Ok(Box::new(MarkdownAdapter::new(dir)))
            }
            #[cfg(feature = "github")]
            "github" => {
                let owner = config
                    .settings
                    .get("owner")
                    .and_then(|v| v.as_str())
                    .ok_or_else(|| {
                        AdapterError::ConfigError(
                            "github adapter requires 'owner' in settings".into(),
                        )
                    })?;
                let repo = config
                    .settings
                    .get("repo")
                    .and_then(|v| v.as_str())
                    .ok_or_else(|| {
                        AdapterError::ConfigError(
                            "github adapter requires 'repo' in settings".into(),
                        )
                    })?;
                let token_env = config
                    .settings
                    .get("token_env")
                    .and_then(|v| v.as_str())
                    .unwrap_or("GITHUB_TOKEN");
                let mut adapter = match config.settings.get("base_url").and_then(|v| v.as_str()) {
                    Some(base) => GitHubAdapter::with_base_url(owner, repo, token_env, base)?,
                    None => GitHubAdapter::new(owner, repo, token_env)?,
                };
                // Bake the project's actual labels into the adapter's schema
                // so `leanspec capabilities` shows them rather than empty
                // dynamic enum slots. Enrichment failures are warnings, not
                // fatal — the CLI still works offline; agents fall back to
                // the schema's static defaults.
                warn_on_resolve("github", adapter.resolve_inline());
                Ok(Box::new(adapter))
            }
            #[cfg(not(feature = "github"))]
            "github" => Err(AdapterError::ConfigError(
                "adapter 'github' requested but leanspec-core was built without \
                 the 'github' feature — rebuild with `--features github`"
                    .into(),
            )),
            #[cfg(feature = "ado")]
            "ado" => {
                let org = config
                    .settings
                    .get("organization")
                    .or_else(|| config.settings.get("org"))
                    .and_then(|v| v.as_str())
                    .ok_or_else(|| {
                        AdapterError::ConfigError(
                            "ado adapter requires 'organization' in settings".into(),
                        )
                    })?;
                let project = config
                    .settings
                    .get("project")
                    .and_then(|v| v.as_str())
                    .ok_or_else(|| {
                        AdapterError::ConfigError(
                            "ado adapter requires 'project' in settings".into(),
                        )
                    })?;
                let token_env = config
                    .settings
                    .get("token_env")
                    .and_then(|v| v.as_str())
                    .unwrap_or("ADO_TOKEN");
                let mut adapter = match config.settings.get("base_url").and_then(|v| v.as_str()) {
                    Some(base) => AdoAdapter::with_base_url(org, project, token_env, base)?,
                    None => AdoAdapter::new(org, project, token_env)?,
                };
                // Bake the project's actual state list into the adapter's
                // schema so `leanspec capabilities` shows them. Enrichment
                // failures are warnings, not fatal — downstream calls will
                // surface real errors when they hit the unreachable backend.
                warn_on_resolve("ado", adapter.resolve_inline());
                Ok(Box::new(adapter))
            }
            #[cfg(not(feature = "ado"))]
            "ado" => Err(AdapterError::ConfigError(
                "adapter 'ado' requested but leanspec-core was built without \
                 the 'ado' feature — rebuild with `--features ado`"
                    .into(),
            )),
            #[cfg(feature = "jira")]
            "jira" => {
                let host = config
                    .settings
                    .get("host")
                    .and_then(|v| v.as_str())
                    .ok_or_else(|| {
                        AdapterError::ConfigError("jira adapter requires 'host' in settings".into())
                    })?;
                let project = config
                    .settings
                    .get("project")
                    .and_then(|v| v.as_str())
                    .ok_or_else(|| {
                        AdapterError::ConfigError(
                            "jira adapter requires 'project' in settings".into(),
                        )
                    })?;
                let email = config
                    .settings
                    .get("email")
                    .and_then(|v| v.as_str())
                    .ok_or_else(|| {
                        AdapterError::ConfigError(
                            "jira adapter requires 'email' in settings".into(),
                        )
                    })?;
                let token_env = config
                    .settings
                    .get("token_env")
                    .and_then(|v| v.as_str())
                    .unwrap_or("JIRA_TOKEN");
                let api_version = config
                    .settings
                    .get("api_version")
                    .and_then(|v| v.as_u64())
                    .unwrap_or(3) as u8;
                let base_url = config
                    .settings
                    .get("base_url")
                    .and_then(|v| v.as_str())
                    .map(String::from);
                let mut adapter = JiraAdapter::with_settings(
                    host,
                    project,
                    email,
                    token_env,
                    api_version,
                    base_url,
                )?;
                // Pre-fetch the project's status / priority vocabulary so
                // `leanspec capabilities` reports the real names. Enrichment
                // failures are warnings, not fatal — the static schema's
                // defaults remain usable offline.
                warn_on_resolve("jira", adapter.resolve_inline());
                Ok(Box::new(adapter))
            }
            #[cfg(not(feature = "jira"))]
            "jira" => Err(AdapterError::ConfigError(
                "adapter 'jira' requested but leanspec-core was built without \
                 the 'jira' feature — rebuild with `--features jira`"
                    .into(),
            )),
            other => Err(AdapterError::ConfigError(format!(
                "unknown adapter '{other}' — only 'markdown' is built-in; \
                 register additional adapters via your plugin registry"
            ))),
        }
    }

    /// The built-in default: markdown adapter rooted at `specs/`.
    pub fn default_adapter() -> Box<dyn Adapter> {
        Box::new(MarkdownAdapter::new("specs"))
    }

    /// Load adapter configuration from a YAML file.
    ///
    /// A missing file falls back to [`AdapterConfig::default`]. A
    /// present-but-malformed file surfaces a [`AdapterError::ConfigError`].
    pub fn load_config(path: &Path) -> Result<AdapterConfig, AdapterError> {
        if !path.exists() {
            return Ok(AdapterConfig::default());
        }

        let content = std::fs::read_to_string(path)?;

        let value: serde_yaml::Value = serde_yaml::from_str(&content).map_err(|err| {
            AdapterError::ConfigError(format!(
                "Failed to parse YAML in {}: {}",
                path.display(),
                err
            ))
        })?;

        let mapping = match value.as_mapping() {
            Some(m) => m,
            None => {
                return Err(AdapterError::ConfigError(format!(
                    "expected a YAML mapping in {}, got a non-mapping value",
                    path.display()
                )))
            }
        };

        // Support both `adapter:` (new) and `provider:` (legacy) top-level key.
        let adapter_value = mapping
            .get(serde_yaml::Value::String("adapter".into()))
            .or_else(|| mapping.get(serde_yaml::Value::String("provider".into())));

        let adapter_name = match adapter_value.and_then(|v| v.as_str()) {
            Some(s) => s.to_string(),
            None => return Ok(AdapterConfig::default()),
        };

        // Pull schema_id out of the top level (if present) so it is not
        // forwarded to the adapter's `settings` blob.
        let schema_id = mapping
            .get(serde_yaml::Value::String("schema_id".into()))
            .and_then(|v| v.as_str())
            .map(|s| s.to_string());

        // Collect all remaining YAML keys as the settings object.
        let mut settings = serde_json::Map::new();
        for (k, v) in mapping.iter() {
            if let Some(key_str) = k.as_str() {
                if !matches!(key_str, "adapter" | "provider" | "schema_id") {
                    if let Ok(json_val) = serde_json::to_value(v) {
                        settings.insert(key_str.to_string(), json_val);
                    }
                }
            }
        }

        Ok(AdapterConfig {
            adapter: adapter_name,
            settings: serde_json::Value::Object(settings),
            schema_id,
        })
    }

    /// Resolve an adapter from the project's default configuration locations,
    /// falling back to [`default_adapter`](Self::default_adapter) if none is
    /// present.
    pub fn from_project() -> Result<Box<dyn Adapter>, AdapterError> {
        let config = Self::project_config()?;
        Self::create(&config)
    }

    /// Load the project's adapter configuration without instantiating the
    /// adapter. Useful for callers that need to inspect the configured
    /// backend name before deciding which constructor to use (e.g. CLI
    /// flags that only apply to specific adapters).
    pub fn project_config() -> Result<AdapterConfig, AdapterError> {
        let config_paths = [
            "leanspec.adapter.yaml",
            ".lean-spec/adapter.yaml",
            // Legacy locations, still honoured so existing projects keep working.
            "leanspec.provider.yaml",
            ".lean-spec/provider.yaml",
        ];

        for path in &config_paths {
            let path = Path::new(path);
            if path.exists() {
                return Self::load_config(path);
            }
        }

        Ok(AdapterConfig::default())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    #[test]
    fn create_markdown_adapter() {
        let cfg = AdapterConfig {
            adapter: "markdown".into(),
            settings: serde_json::json!({ "directory": "specs" }),
            schema_id: None,
        };
        let adapter = AdapterRegistry::create(&cfg).unwrap();
        assert_eq!(adapter.capabilities().name, "markdown");
    }

    #[test]
    fn create_unknown_adapter_is_error() {
        let cfg = AdapterConfig {
            adapter: "nonexistent".into(),
            settings: serde_json::Value::Null,
            schema_id: None,
        };
        assert!(matches!(
            AdapterRegistry::create(&cfg).unwrap_err(),
            AdapterError::ConfigError(_)
        ));
    }

    #[test]
    fn default_is_markdown() {
        let adapter = AdapterRegistry::default_adapter();
        assert_eq!(adapter.capabilities().name, "markdown");
    }

    #[test]
    fn github_requires_owner_and_repo() {
        let cfg = AdapterConfig {
            adapter: "github".into(),
            settings: serde_json::json!({}),
            schema_id: None,
        };
        let err = AdapterRegistry::create(&cfg).unwrap_err();
        assert!(matches!(err, AdapterError::ConfigError(_)));
    }

    #[cfg(feature = "github")]
    #[test]
    fn create_github_adapter_resolves_labels() {
        let mut server = mockito::Server::new();
        server
            .mock("GET", "/repos/acme/backend/labels")
            .match_query(mockito::Matcher::UrlEncoded(
                "per_page".into(),
                "100".into(),
            ))
            .with_status(200)
            .with_body(r#"[{"name":"bug","color":"ff0000"}]"#)
            .create();

        std::env::set_var("LEANSPEC_TEST_GH_TOKEN", "fake-token");
        let cfg = AdapterConfig {
            adapter: "github".into(),
            settings: serde_json::json!({
                "owner": "acme",
                "repo": "backend",
                "token_env": "LEANSPEC_TEST_GH_TOKEN",
                "base_url": server.url(),
            }),
            schema_id: None,
        };
        let adapter = AdapterRegistry::create(&cfg).unwrap();
        assert_eq!(adapter.capabilities().name, "github");
        // resolve_inline must have run — the schema should carry the live
        // repo's `bug` label in the `tags` enum.
        let tags = adapter.schema().field("tags").unwrap();
        match &tags.kind {
            crate::model::FieldKind::Enum { options, .. } => {
                assert!(options.iter().any(|o| o.value == "bug"));
            }
            _ => panic!("expected enum tags field"),
        }
        std::env::remove_var("LEANSPEC_TEST_GH_TOKEN");
    }

    #[test]
    fn jira_requires_host_project_and_email() {
        let cfg = AdapterConfig {
            adapter: "jira".into(),
            settings: serde_json::json!({}),
            schema_id: None,
        };
        let err = AdapterRegistry::create(&cfg).unwrap_err();
        assert!(matches!(err, AdapterError::ConfigError(_)));
    }

    #[cfg(feature = "jira")]
    #[test]
    fn create_jira_adapter_resolves_options() {
        let mut server = mockito::Server::new();
        server
            .mock("GET", "/rest/api/3/project/PROJ/statuses")
            .with_status(200)
            .with_body(r#"[{"name":"Story","statuses":[{"name":"To Do"},{"name":"Done"}]}]"#)
            .create();
        server
            .mock("GET", "/rest/api/3/priority")
            .with_status(200)
            .with_body(r#"[{"id":"1","name":"High"}]"#)
            .create();

        std::env::set_var("LEANSPEC_TEST_JIRA_TOKEN", "fake-token");
        let cfg = AdapterConfig {
            adapter: "jira".into(),
            settings: serde_json::json!({
                "host": "demo.atlassian.net",
                "project": "PROJ",
                "email": "alice@example.com",
                "token_env": "LEANSPEC_TEST_JIRA_TOKEN",
                "base_url": server.url(),
            }),
            schema_id: None,
        };
        let adapter = AdapterRegistry::create(&cfg).unwrap();
        assert_eq!(adapter.capabilities().name, "jira");
        let status = adapter.schema().field("status").unwrap();
        match &status.kind {
            crate::model::FieldKind::Enum { options, .. } => {
                let values: Vec<&str> = options.iter().map(|o| o.value.as_str()).collect();
                assert!(values.contains(&"To Do"));
                assert!(values.contains(&"Done"));
            }
            _ => panic!("expected enum status"),
        }
        std::env::remove_var("LEANSPEC_TEST_JIRA_TOKEN");
    }

    #[cfg(not(feature = "jira"))]
    #[test]
    fn jira_without_feature_is_config_error() {
        let cfg = AdapterConfig {
            adapter: "jira".into(),
            settings: serde_json::json!({
                "host": "x", "project": "y", "email": "z"
            }),
            schema_id: None,
        };
        let err = AdapterRegistry::create(&cfg).unwrap_err();
        match err {
            AdapterError::ConfigError(msg) => {
                assert!(msg.contains("jira") && msg.contains("feature"));
            }
            other => panic!("expected ConfigError, got {other:?}"),
        }
    }

    #[cfg(not(feature = "github"))]
    #[test]
    fn github_without_feature_is_config_error() {
        let cfg = AdapterConfig {
            adapter: "github".into(),
            settings: serde_json::json!({ "owner": "x", "repo": "y" }),
            schema_id: None,
        };
        let err = AdapterRegistry::create(&cfg).unwrap_err();
        match err {
            AdapterError::ConfigError(msg) => {
                assert!(msg.contains("github") && msg.contains("feature"));
            }
            other => panic!("expected ConfigError, got {other:?}"),
        }
    }

    #[cfg(feature = "ado")]
    #[test]
    fn ado_requires_org_and_project() {
        let cfg = AdapterConfig {
            adapter: "ado".into(),
            settings: serde_json::json!({}),
            schema_id: None,
        };
        let err = AdapterRegistry::create(&cfg).unwrap_err();
        assert!(matches!(err, AdapterError::ConfigError(_)));
    }

    #[cfg(feature = "ado")]
    #[test]
    fn create_ado_adapter_resolves_states() {
        let mut server = mockito::Server::new();

        // User Story carries the state list; the other WIT types 404 (their
        // process didn't define them).
        server
            .mock(
                "GET",
                "/acme/MyProject/_apis/wit/workitemtypes/User%20Story/states",
            )
            .match_query(mockito::Matcher::AnyOf(vec![mockito::Matcher::Any]))
            .with_status(200)
            .with_body(
                r#"{"value":[
                    {"name":"Active","color":"007acc","category":"InProgress"},
                    {"name":"Closed","color":"339933","category":"Completed"}
                ]}"#,
            )
            .create();
        // Default-match-all for any other type so missing ones simply 404.
        server
            .mock("GET", mockito::Matcher::Any)
            .with_status(404)
            .with_body(r#"{"message":"not found"}"#)
            .expect_at_least(0)
            .create();

        std::env::set_var("LEANSPEC_TEST_ADO_TOKEN", "fake-token");
        let cfg = AdapterConfig {
            adapter: "ado".into(),
            settings: serde_json::json!({
                "organization": "acme",
                "project": "MyProject",
                "token_env": "LEANSPEC_TEST_ADO_TOKEN",
                "base_url": server.url(),
            }),
            schema_id: None,
        };
        let adapter = AdapterRegistry::create(&cfg).unwrap();
        assert_eq!(adapter.capabilities().name, "ado");
        let status = adapter.schema().field("status").unwrap();
        match &status.kind {
            crate::model::FieldKind::Enum { options, .. } => {
                assert!(options.iter().any(|o| o.value == "Active"));
                assert!(options.iter().any(|o| o.value == "Closed"));
            }
            _ => panic!("expected enum status field"),
        }
        std::env::remove_var("LEANSPEC_TEST_ADO_TOKEN");
    }

    #[cfg(not(feature = "ado"))]
    #[test]
    fn ado_without_feature_is_config_error() {
        let cfg = AdapterConfig {
            adapter: "ado".into(),
            settings: serde_json::json!({ "organization": "acme", "project": "p" }),
            schema_id: None,
        };
        let err = AdapterRegistry::create(&cfg).unwrap_err();
        match err {
            AdapterError::ConfigError(msg) => {
                assert!(msg.contains("ado") && msg.contains("feature"));
            }
            other => panic!("expected ConfigError, got {other:?}"),
        }
    }

    #[test]
    fn missing_config_returns_default() {
        let cfg = AdapterRegistry::load_config(Path::new("/definitely/not/here.yaml")).unwrap();
        assert_eq!(cfg.adapter, "markdown");
    }

    #[test]
    fn load_adapter_yaml() {
        let tmp = TempDir::new().unwrap();
        let p = tmp.path().join("adapter.yaml");
        std::fs::write(&p, "adapter: markdown\ndirectory: foo\n").unwrap();
        let cfg = AdapterRegistry::load_config(&p).unwrap();
        assert_eq!(cfg.adapter, "markdown");
        assert_eq!(
            cfg.settings.get("directory").and_then(|v| v.as_str()),
            Some("foo")
        );
    }

    #[test]
    fn load_legacy_provider_yaml() {
        let tmp = TempDir::new().unwrap();
        let p = tmp.path().join("provider.yaml");
        std::fs::write(&p, "provider: markdown\ndirectory: bar\n").unwrap();
        let cfg = AdapterRegistry::load_config(&p).unwrap();
        assert_eq!(cfg.adapter, "markdown");
        assert_eq!(
            cfg.settings.get("directory").and_then(|v| v.as_str()),
            Some("bar")
        );
    }

    #[test]
    fn non_adapter_config_returns_default() {
        let tmp = TempDir::new().unwrap();
        let p = tmp.path().join("config.yaml");
        std::fs::write(&p, "specs_dir: foo\nmax_tokens: 4000\n").unwrap();
        let cfg = AdapterRegistry::load_config(&p).unwrap();
        assert_eq!(cfg.adapter, "markdown");
    }

    #[test]
    fn malformed_yaml_returns_config_error() {
        let tmp = TempDir::new().unwrap();
        let p = tmp.path().join("adapter.yaml");
        std::fs::write(&p, "{ unclosed: [").unwrap();
        assert!(matches!(
            AdapterRegistry::load_config(&p).unwrap_err(),
            AdapterError::ConfigError(_),
        ));
    }

    #[test]
    fn non_mapping_yaml_root_returns_config_error() {
        let tmp = TempDir::new().unwrap();
        let p = tmp.path().join("adapter.yaml");
        std::fs::write(&p, "- foo\n- bar\n").unwrap();
        assert!(matches!(
            AdapterRegistry::load_config(&p).unwrap_err(),
            AdapterError::ConfigError(_),
        ));
    }
}
