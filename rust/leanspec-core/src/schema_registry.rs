//! Schema registry — loads built-in and project-defined [`SpecSchema`]
//! bundles, resolves `extends`-based inheritance, and exposes a uniform
//! lookup API.
//!
//! ## Layout
//!
//! Built-in schemas (`leanspec:base`, `leanspec:feature`, `leanspec:bug`,
//! `leanspec:adr`) are compiled in via [`include_str!`]. Custom schemas are
//! loaded from `<project_root>/.lean-spec/schemas/*.yaml`.
//!
//! ## ID protection
//!
//! Schemas with an id beginning with the reserved `leanspec:` prefix can only
//! be declared by the built-in bundles. Custom files that try to shadow a
//! built-in are skipped with a warning.
//!
//! ## Inheritance
//!
//! `extends: "<parent-id>"` pulls in the parent's fields and link types.
//! Child entries override parent entries with the same `key`. Circular
//! inheritance is detected and reported as an error.

use std::collections::{HashMap, HashSet};
use std::path::{Path, PathBuf};

use serde::{Deserialize, Serialize};

use crate::model::{FieldKind, SpecSchema};

/// Reserved id prefix for built-in schemas.
pub const BUILTIN_PREFIX: &str = "leanspec:";

const BUILTIN_BUNDLES: &[(&str, &str)] = &[
    ("leanspec:base", include_str!("../schemas/base.yaml")),
    ("leanspec:feature", include_str!("../schemas/feature.yaml")),
    ("leanspec:bug", include_str!("../schemas/bug.yaml")),
    ("leanspec:adr", include_str!("../schemas/adr.yaml")),
];

/// Errors raised while loading or resolving schemas.
#[derive(Debug, thiserror::Error)]
pub enum SchemaError {
    #[error("Schema '{0}' not found in registry")]
    NotFound(String),

    #[error("Failed to read schema file {path}: {source}")]
    Io {
        path: PathBuf,
        #[source]
        source: std::io::Error,
    },

    #[error("Failed to parse schema {path}: {source}")]
    Parse {
        path: PathBuf,
        #[source]
        source: serde_yaml::Error,
    },

    #[error("Circular schema inheritance detected: {chain}")]
    CircularInheritance { chain: String },

    #[error("Schema '{id}' extends unknown parent '{parent}'")]
    UnknownParent { id: String, parent: String },

    #[error("Schema validation failed for {path}: {errors:?}")]
    Validation {
        path: PathBuf,
        errors: Vec<ValidationIssue>,
    },
}

/// A single problem found while validating a schema YAML file.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ValidationIssue {
    pub message: String,
}

impl std::fmt::Display for ValidationIssue {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str(&self.message)
    }
}

/// Registry of all loaded schemas, keyed by their stable id.
///
/// Schemas are stored in their *raw* (un-resolved) form. Use
/// [`SchemaRegistry::get`] to retrieve a schema with its `extends` chain
/// flattened.
#[derive(Debug, Clone, Default)]
pub struct SchemaRegistry {
    schemas: HashMap<String, SpecSchema>,
    /// Warnings collected during load (e.g. shadowed built-ins).
    warnings: Vec<String>,
}

impl SchemaRegistry {
    /// Load the built-in schemas plus any custom YAML in
    /// `<project_root>/.lean-spec/schemas/`.
    pub fn load(project_root: &Path) -> Result<Self, SchemaError> {
        let mut registry = Self::with_builtins()?;
        let custom_dir = project_root.join(".lean-spec").join("schemas");
        if custom_dir.is_dir() {
            registry.load_dir(&custom_dir)?;
        }
        Ok(registry)
    }

    /// Build a registry containing only the built-in schemas. Useful for
    /// commands that should not depend on a project root.
    pub fn with_builtins() -> Result<Self, SchemaError> {
        let mut registry = Self::default();
        for (id, yaml) in BUILTIN_BUNDLES {
            let schema: SpecSchema =
                serde_yaml::from_str(yaml).map_err(|source| SchemaError::Parse {
                    path: PathBuf::from(*id),
                    source,
                })?;
            registry.schemas.insert(schema.id.clone(), schema);
        }
        Ok(registry)
    }

    /// Load every `*.yaml` / `*.yml` file in `dir` as an additional schema.
    ///
    /// Files claiming an id with the reserved `leanspec:` prefix are skipped
    /// with a warning recorded on the registry.
    pub fn load_dir(&mut self, dir: &Path) -> Result<(), SchemaError> {
        let entries = std::fs::read_dir(dir).map_err(|source| SchemaError::Io {
            path: dir.to_path_buf(),
            source,
        })?;

        let mut files: Vec<PathBuf> = entries
            .filter_map(|e| e.ok())
            .map(|e| e.path())
            .filter(|p| {
                p.is_file()
                    && p.extension()
                        .and_then(|e| e.to_str())
                        .map(|ext| {
                            ext.eq_ignore_ascii_case("yaml") || ext.eq_ignore_ascii_case("yml")
                        })
                        .unwrap_or(false)
            })
            .collect();
        files.sort();

        for path in files {
            let contents = std::fs::read_to_string(&path).map_err(|source| SchemaError::Io {
                path: path.clone(),
                source,
            })?;
            let schema: SpecSchema =
                serde_yaml::from_str(&contents).map_err(|source| SchemaError::Parse {
                    path: path.clone(),
                    source,
                })?;

            if schema.id.starts_with(BUILTIN_PREFIX) {
                self.warnings.push(format!(
                    "Skipping {}: id '{}' uses reserved 'leanspec:' prefix",
                    path.display(),
                    schema.id
                ));
                continue;
            }

            self.schemas.insert(schema.id.clone(), schema);
        }
        Ok(())
    }

    /// Return the resolved schema (inheritance flattened) for `id`.
    pub fn get(&self, id: &str) -> Result<SpecSchema, SchemaError> {
        let mut seen = Vec::new();
        self.resolve(id, &mut seen)
    }

    /// Return the raw schema (without resolving `extends`).
    pub fn get_raw(&self, id: &str) -> Result<&SpecSchema, SchemaError> {
        self.schemas
            .get(id)
            .ok_or_else(|| SchemaError::NotFound(id.to_string()))
    }

    /// List every loaded schema in id-sorted order, resolved.
    pub fn list(&self) -> Vec<SpecSchema> {
        let mut ids: Vec<&String> = self.schemas.keys().collect();
        ids.sort();
        ids.into_iter().filter_map(|id| self.get(id).ok()).collect()
    }

    /// List raw schemas (without resolving inheritance) — used by `schema list`
    /// to show the declared `extends` parent.
    pub fn list_raw(&self) -> Vec<&SpecSchema> {
        let mut schemas: Vec<&SpecSchema> = self.schemas.values().collect();
        schemas.sort_by(|a, b| a.id.cmp(&b.id));
        schemas
    }

    /// Whether `id` exists in the registry.
    pub fn contains(&self, id: &str) -> bool {
        self.schemas.contains_key(id)
    }

    /// Warnings emitted during load (e.g. shadowed built-ins).
    pub fn warnings(&self) -> &[String] {
        &self.warnings
    }

    /// Whether `id` belongs to the reserved built-in namespace.
    pub fn is_builtin(id: &str) -> bool {
        id.starts_with(BUILTIN_PREFIX)
    }

    fn resolve(&self, id: &str, seen: &mut Vec<String>) -> Result<SpecSchema, SchemaError> {
        if seen.iter().any(|s| s == id) {
            seen.push(id.to_string());
            return Err(SchemaError::CircularInheritance {
                chain: seen.join(" → "),
            });
        }
        seen.push(id.to_string());

        let raw = self
            .schemas
            .get(id)
            .ok_or_else(|| SchemaError::NotFound(id.to_string()))?
            .clone();

        match raw.extends.clone() {
            None => Ok(SpecSchema {
                extends: None,
                ..raw
            }),
            Some(parent_id) => {
                if !self.schemas.contains_key(&parent_id) {
                    return Err(SchemaError::UnknownParent {
                        id: id.to_string(),
                        parent: parent_id,
                    });
                }
                let parent = self.resolve(&parent_id, seen)?;
                Ok(merge_schemas(parent, raw))
            }
        }
    }
}

/// Merge `child` on top of `parent`. Child fields with the same `key` replace
/// the parent's; new keys are appended. Link types follow the same rule.
fn merge_schemas(parent: SpecSchema, child: SpecSchema) -> SpecSchema {
    let mut fields = parent.fields;
    for child_field in child.fields {
        if let Some(pos) = fields.iter().position(|f| f.key == child_field.key) {
            fields[pos] = child_field;
        } else {
            fields.push(child_field);
        }
    }

    let mut link_types = parent.link_types;
    for child_lt in child.link_types {
        if let Some(pos) = link_types.iter().position(|lt| lt.key == child_lt.key) {
            link_types[pos] = child_lt;
        } else {
            link_types.push(child_lt);
        }
    }

    SpecSchema {
        id: child.id,
        name: child.name,
        extends: None,
        fields,
        link_types,
    }
}

/// Validate a schema YAML file. Returns a list of human-readable issues —
/// empty means the file is structurally valid against `registry`.
///
/// `registry` is used to resolve `extends` targets and detect cycles. It
/// should already contain the built-ins (and ideally other custom schemas)
/// so cross-references can be checked.
pub fn validate_schema_file(
    path: &Path,
    registry: &SchemaRegistry,
) -> Result<Vec<ValidationIssue>, SchemaError> {
    let contents = std::fs::read_to_string(path).map_err(|source| SchemaError::Io {
        path: path.to_path_buf(),
        source,
    })?;

    // First, surface raw YAML parse errors immediately — they short-circuit
    // every other check.
    let schema: SpecSchema = match serde_yaml::from_str(&contents) {
        Ok(s) => s,
        Err(source) => {
            return Err(SchemaError::Parse {
                path: path.to_path_buf(),
                source,
            });
        }
    };

    let mut issues = Vec::new();

    if schema.id.trim().is_empty() {
        issues.push(ValidationIssue {
            message: "missing required field 'id'".into(),
        });
    }
    if schema.name.trim().is_empty() {
        issues.push(ValidationIssue {
            message: "missing required field 'name'".into(),
        });
    }
    if SchemaRegistry::is_builtin(&schema.id) {
        issues.push(ValidationIssue {
            message: format!(
                "id '{}' uses reserved 'leanspec:' prefix — pick a project-specific id",
                schema.id
            ),
        });
    }

    let ident_re = regex::Regex::new(r"^[a-z][a-z0-9_]*$").expect("static regex");
    let mut seen_keys = HashSet::new();
    for field in &schema.fields {
        if !ident_re.is_match(&field.key) {
            issues.push(ValidationIssue {
                message: format!("field '{}': key must match [a-z][a-z0-9_]*", field.key),
            });
        }
        if !seen_keys.insert(field.key.clone()) {
            issues.push(ValidationIssue {
                message: format!("field '{}': duplicate key", field.key),
            });
        }

        if let FieldKind::Enum {
            options,
            allow_custom,
            dynamic,
            ..
        } = &field.kind
        {
            if options.is_empty() && !allow_custom && !dynamic {
                issues.push(ValidationIssue {
                    message: format!(
                        "field '{}': enum options list is empty — add at least one option, or set allow_custom/dynamic",
                        field.key
                    ),
                });
            }
        }
    }

    // Validate inheritance against the supplied registry. We build a probe
    // registry that includes this candidate so cycles involving the
    // candidate itself are detected.
    if let Some(parent_id) = schema.extends.as_deref() {
        if !registry.contains(parent_id) && parent_id != schema.id {
            issues.push(ValidationIssue {
                message: format!("extends '{}' which does not exist", parent_id),
            });
        } else {
            let mut probe = registry.clone();
            probe.schemas.insert(schema.id.clone(), schema.clone());
            match probe.get(&schema.id) {
                Ok(_) => {}
                Err(SchemaError::CircularInheritance { chain }) => {
                    issues.push(ValidationIssue {
                        message: format!("circular inheritance: {chain}"),
                    });
                }
                Err(SchemaError::UnknownParent { parent, .. }) => {
                    issues.push(ValidationIssue {
                        message: format!("extends '{}' which does not exist", parent),
                    });
                }
                Err(err) => {
                    issues.push(ValidationIssue {
                        message: err.to_string(),
                    });
                }
            }
        }
    }

    // Link type keys must also be identifiers.
    let mut seen_lt = HashSet::new();
    for lt in &schema.link_types {
        if !ident_re.is_match(&lt.key) {
            issues.push(ValidationIssue {
                message: format!("link type '{}': key must match [a-z][a-z0-9_]*", lt.key),
            });
        }
        if !seen_lt.insert(lt.key.clone()) {
            issues.push(ValidationIssue {
                message: format!("link type '{}': duplicate key", lt.key),
            });
        }
        // Catch unhelpful inverse pairs (a → a).
        if let Some(inv) = lt.inverse_key.as_deref() {
            if inv == lt.key {
                issues.push(ValidationIssue {
                    message: format!("link type '{}': inverse_key cannot equal key", lt.key),
                });
            }
        }
    }

    Ok(issues)
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    fn write(dir: &Path, name: &str, body: &str) {
        std::fs::write(dir.join(name), body).unwrap();
    }

    #[test]
    fn loads_builtins() {
        let reg = SchemaRegistry::with_builtins().unwrap();
        assert!(reg.contains("leanspec:base"));
        assert!(reg.contains("leanspec:feature"));
        assert!(reg.contains("leanspec:bug"));
        assert!(reg.contains("leanspec:adr"));
    }

    #[test]
    fn resolves_extends_chain() {
        let reg = SchemaRegistry::with_builtins().unwrap();
        let base = reg.get("leanspec:base").unwrap();
        let feature = reg.get("leanspec:feature").unwrap();

        // Every base field key should also appear in feature (inheritance).
        for f in &base.fields {
            assert!(
                feature.fields.iter().any(|cf| cf.key == f.key),
                "feature should inherit base field {}",
                f.key
            );
        }
        // And feature should add its own fields.
        assert!(feature.fields.iter().any(|f| f.key == "acceptance"));
        // extends is flattened away after resolution.
        assert!(feature.extends.is_none());
    }

    #[test]
    fn child_field_overrides_parent() {
        let tmp = TempDir::new().unwrap();
        let schemas_dir = tmp.path().join(".lean-spec").join("schemas");
        std::fs::create_dir_all(&schemas_dir).unwrap();
        write(
            &schemas_dir,
            "override.yaml",
            r#"
id: "acme:override"
name: "Override"
extends: "leanspec:base"
fields:
  - key: status
    label: Stage
    kind:
      kind: enum
      options:
        - { value: open, label: Open }
        - { value: shipped, label: Shipped }
      multi: false
      allow_custom: false
      dynamic: false
    display: inline
    required: true
"#,
        );
        let reg = SchemaRegistry::load(tmp.path()).unwrap();
        let resolved = reg.get("acme:override").unwrap();
        let status = resolved.fields.iter().find(|f| f.key == "status").unwrap();
        assert_eq!(status.label, "Stage");
    }

    #[test]
    fn detects_circular_inheritance() {
        let tmp = TempDir::new().unwrap();
        let schemas_dir = tmp.path().join(".lean-spec").join("schemas");
        std::fs::create_dir_all(&schemas_dir).unwrap();
        write(
            &schemas_dir,
            "a.yaml",
            r#"
id: "acme:a"
name: "A"
extends: "acme:b"
fields: []
"#,
        );
        write(
            &schemas_dir,
            "b.yaml",
            r#"
id: "acme:b"
name: "B"
extends: "acme:a"
fields: []
"#,
        );
        let reg = SchemaRegistry::load(tmp.path()).unwrap();
        match reg.get("acme:a") {
            Err(SchemaError::CircularInheritance { .. }) => {}
            other => panic!("expected CircularInheritance, got {other:?}"),
        }
    }

    #[test]
    fn unknown_parent_is_error() {
        let tmp = TempDir::new().unwrap();
        let schemas_dir = tmp.path().join(".lean-spec").join("schemas");
        std::fs::create_dir_all(&schemas_dir).unwrap();
        write(
            &schemas_dir,
            "orphan.yaml",
            r#"
id: "acme:orphan"
name: "Orphan"
extends: "acme:does-not-exist"
fields: []
"#,
        );
        let reg = SchemaRegistry::load(tmp.path()).unwrap();
        match reg.get("acme:orphan") {
            Err(SchemaError::UnknownParent { parent, .. }) => {
                assert_eq!(parent, "acme:does-not-exist");
            }
            other => panic!("expected UnknownParent, got {other:?}"),
        }
    }

    #[test]
    fn skips_custom_files_using_leanspec_prefix() {
        let tmp = TempDir::new().unwrap();
        let schemas_dir = tmp.path().join(".lean-spec").join("schemas");
        std::fs::create_dir_all(&schemas_dir).unwrap();
        write(
            &schemas_dir,
            "shadow.yaml",
            r#"
id: "leanspec:feature"
name: "Hijack"
fields:
  - key: hijacked
    label: Hijacked
    kind:
      kind: text
    display: inline
    required: false
"#,
        );
        let reg = SchemaRegistry::load(tmp.path()).unwrap();
        // Built-in survives unchanged.
        let feature = reg.get("leanspec:feature").unwrap();
        assert!(feature.fields.iter().any(|f| f.key == "acceptance"));
        assert!(feature.fields.iter().all(|f| f.key != "hijacked"));
        // Warning recorded.
        assert!(reg
            .warnings()
            .iter()
            .any(|w| w.contains("reserved 'leanspec:' prefix")));
    }

    #[test]
    fn validate_catches_missing_id() {
        let tmp = TempDir::new().unwrap();
        let path = tmp.path().join("bad.yaml");
        std::fs::write(
            &path,
            r#"
id: ""
name: "Bad"
fields: []
"#,
        )
        .unwrap();
        let reg = SchemaRegistry::with_builtins().unwrap();
        let issues = validate_schema_file(&path, &reg).unwrap();
        assert!(issues
            .iter()
            .any(|i| i.message.contains("missing required field 'id'")));
    }

    #[test]
    fn validate_catches_empty_enum() {
        let tmp = TempDir::new().unwrap();
        let path = tmp.path().join("bad.yaml");
        std::fs::write(
            &path,
            r#"
id: "acme:bad"
name: "Bad"
fields:
  - key: sprint
    label: Sprint
    kind:
      kind: enum
      options: []
      multi: false
      allow_custom: false
      dynamic: false
    display: inline
    required: false
"#,
        )
        .unwrap();
        let reg = SchemaRegistry::with_builtins().unwrap();
        let issues = validate_schema_file(&path, &reg).unwrap();
        assert!(issues
            .iter()
            .any(|i| i.message.contains("enum options list is empty")));
    }

    #[test]
    fn validate_catches_bad_field_key() {
        let tmp = TempDir::new().unwrap();
        let path = tmp.path().join("bad.yaml");
        std::fs::write(
            &path,
            r#"
id: "acme:bad"
name: "Bad"
fields:
  - key: "BadKey"
    label: Bad
    kind:
      kind: text
    display: inline
    required: false
"#,
        )
        .unwrap();
        let reg = SchemaRegistry::with_builtins().unwrap();
        let issues = validate_schema_file(&path, &reg).unwrap();
        assert!(issues.iter().any(|i| i.message.contains("key must match")));
    }

    #[test]
    fn validate_catches_unknown_parent() {
        let tmp = TempDir::new().unwrap();
        let path = tmp.path().join("bad.yaml");
        std::fs::write(
            &path,
            r#"
id: "acme:orphan"
name: "Orphan"
extends: "leanspec:does-not-exist"
fields: []
"#,
        )
        .unwrap();
        let reg = SchemaRegistry::with_builtins().unwrap();
        let issues = validate_schema_file(&path, &reg).unwrap();
        assert!(issues.iter().any(|i| i.message.contains("does not exist")));
    }

    #[test]
    fn validate_passes_on_valid_schema() {
        let tmp = TempDir::new().unwrap();
        let path = tmp.path().join("good.yaml");
        std::fs::write(
            &path,
            r#"
id: "acme:sprint-story"
name: "Sprint Story"
extends: "leanspec:feature"
fields:
  - key: sprint
    label: Sprint
    kind:
      kind: enum
      options:
        - { value: q1, label: Q1 }
        - { value: q2, label: Q2 }
      multi: false
      allow_custom: false
      dynamic: false
    display: inline
    required: false
"#,
        )
        .unwrap();
        let reg = SchemaRegistry::with_builtins().unwrap();
        let issues = validate_schema_file(&path, &reg).unwrap();
        assert!(issues.is_empty(), "unexpected issues: {issues:?}");
    }
}
