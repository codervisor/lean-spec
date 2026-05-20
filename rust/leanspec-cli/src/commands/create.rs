//! `create` command — adapter-aware spec creation.
//!
//! Builds a [`CreateRequest`] from CLI flags, validates field values against
//! the active adapter's schema, and delegates writing to the adapter. Markdown
//! retains its template + frontmatter-merging behaviour; other adapters take
//! the `name` argument as the issue title.

use chrono::Utc;
use colored::Colorize;
use leanspec_core::adapters::markdown::MarkdownAdapter;
use leanspec_core::adapters::{Adapter, AdapterRegistry};
use leanspec_core::model::{CreateRequest, FieldKind, FieldValue, ItemLink, SpecDoc, SpecSchema};
use leanspec_core::{LeanSpecConfig, TemplateLoader};
use serde_yaml::Value as YamlValue;
use std::collections::HashMap;
use std::error::Error;
use std::fs;
use std::path::{Path, PathBuf};

const MARKDOWN_PARENT_LINK: &str = "parent";
const MARKDOWN_DEPENDS_ON_LINK: &str = "depends_on";

pub struct CreateParams {
    pub specs_dir: String,
    pub name: String,
    pub title: Option<String>,
    pub template: Option<String>,
    pub status: Option<String>,
    /// `None` means "not supplied" → markdown templates default to `medium`,
    /// remote adapters leave priority unset.
    pub priority: Option<String>,
    pub tags: Option<String>,
    pub parent: Option<String>,
    pub depends_on: Vec<String>,
    pub content: Option<String>,
    pub file: Option<String>,
    pub assignee: Option<String>,
    pub description: Option<String>,
    /// Explicit slug for markdown adapters (e.g. `042-my-feature`).
    pub slug: Option<String>,
    /// Repeatable `key=value` pairs for adapter-specific fields.
    pub fields: Vec<String>,
    /// Optional schema id override. When set, forwarded to the adapter via
    /// `CreateRequest::schema_id`. The adapter decides whether to honour it.
    pub schema_id: Option<String>,
}

pub fn run(params: CreateParams) -> Result<(), Box<dyn Error>> {
    let adapter = resolve_adapter(&params.specs_dir)?;
    let caps_name = adapter.capabilities().name.clone();
    let schema = adapter.schema().clone();

    // `--slug` only applies to file-based adapters where directory names are
    // a thing. Surface the mismatch up front rather than silently dropping it.
    if params.slug.is_some() && caps_name != "markdown" {
        return Err(format!(
            "--slug is not applicable to the '{caps_name}' adapter (only applies to markdown projects)"
        )
        .into());
    }

    let extra_fields = parse_field_pairs(&params.fields)?;

    if caps_name == "markdown" {
        run_markdown(&params, adapter.as_ref(), &schema, extra_fields)
    } else {
        run_remote(&params, adapter.as_ref(), &schema, extra_fields)
    }
}

fn resolve_adapter(specs_dir: &str) -> Result<Box<dyn Adapter>, Box<dyn Error>> {
    let config = AdapterRegistry::project_config()?;
    if config.adapter == "markdown" {
        Ok(Box::new(MarkdownAdapter::new(specs_dir)))
    } else {
        Ok(AdapterRegistry::create(&config)?)
    }
}

// ── markdown path ────────────────────────────────────────────────────────────

fn run_markdown(
    params: &CreateParams,
    adapter: &dyn Adapter,
    schema: &SpecSchema,
    extra_fields: HashMap<String, String>,
) -> Result<(), Box<dyn Error>> {
    let project_root = find_project_root(&params.specs_dir)?;
    let now = Utc::now();
    let created_date = now.format("%Y-%m-%d").to_string();

    let resolved_status = params.status.clone().unwrap_or_else(|| {
        if is_draft_status_enabled(&project_root) {
            "draft".to_string()
        } else {
            "planned".to_string()
        }
    });

    // Validate field-value flags up front against the adapter schema.
    validate_field_value("status", &resolved_status, schema)?;
    if let Some(p) = explicit_priority(params) {
        validate_field_value("priority", p, schema)?;
    }
    for (key, value) in &extra_fields {
        validate_field_value(key, value, schema)?;
    }

    let raw_name = strip_numeric_prefix(&params.name);
    let slug = params.slug.clone().unwrap_or_else(|| raw_name.to_string());
    let title = params
        .title
        .clone()
        .unwrap_or_else(|| generate_title(raw_name));
    let tags_vec = parse_tags(params.tags.as_deref());

    let has_content_source = params.content.is_some() || params.file.is_some();

    let (mut fm_map, body) = if has_content_source {
        let raw_content = if let Some(file_path) = params.file.as_deref() {
            let path = Path::new(file_path);
            if !path.exists() {
                return Err(format!("File not found: {}", file_path).into());
            }
            if path.is_dir() {
                return Err(format!("Path is a directory, not a file: {}", file_path).into());
            }
            fs::read_to_string(path)?
        } else {
            params.content.clone().unwrap()
        };

        // Honour any frontmatter the user-supplied content carries, then
        // overlay CLI flag values on top.
        let (existing, body) = split_yaml_frontmatter(&raw_content);
        let body = if body.is_empty() && existing.is_none() {
            raw_content.clone()
        } else {
            body
        };
        let body = ensure_h1_heading(&body, &title);
        (existing.unwrap_or_default(), body)
    } else {
        // Template path: load project template, substitute variables, inject
        // `--description`, then apply relationships.
        let config = load_lean_spec_config(&project_root)?;
        let template_loader = TemplateLoader::with_config(&project_root, config);
        let template_content = template_loader
            .load(params.template.as_deref())
            .map_err(|e| format!("Failed to load template: {e}"))?;

        let mut content = apply_template_variables(
            &template_content,
            &title,
            &resolved_status,
            template_priority(params),
            &tags_vec,
        )?;

        if let Some(desc) = &params.description {
            if let Some(pos) = content.find("\n\n## ") {
                content.insert_str(pos + 1, &format!("\n{desc}\n"));
            } else if let Some(pos) = content.find("\n\n") {
                content.insert_str(pos + 1, &format!("\n{desc}\n"));
            }
        }

        let (existing, body) = split_yaml_frontmatter(&content);
        (existing.unwrap_or_default(), body)
    };

    apply_cli_overrides(
        &mut fm_map,
        &resolved_status,
        params.status.as_deref(),
        explicit_priority(params),
        &tags_vec,
        params.assignee.as_deref(),
        params.parent.as_deref(),
        &params.depends_on,
        &created_date,
        now,
    );

    let (mut fields, mut links) = yaml_mapping_to_fields_and_links(&fm_map);
    for (k, v) in extra_fields {
        fields.insert(k, FieldValue::from(v));
    }
    fields.insert("content".into(), FieldValue::from(body));

    let req = CreateRequest {
        slug: Some(slug),
        title: title.clone(),
        schema_id: params.schema_id.clone(),
        fields,
        links: std::mem::take(&mut links),
    };

    let doc = adapter.create(&req)?;
    print_markdown_success(&doc, params, &title, &resolved_status, &tags_vec);
    Ok(())
}

// ── remote (non-markdown) path ───────────────────────────────────────────────

fn run_remote(
    params: &CreateParams,
    adapter: &dyn Adapter,
    schema: &SpecSchema,
    extra_fields: HashMap<String, String>,
) -> Result<(), Box<dyn Error>> {
    let title = params.title.clone().unwrap_or_else(|| params.name.clone());

    let mut fields: HashMap<String, FieldValue> = HashMap::new();

    if let Some(status) = &params.status {
        validate_field_value("status", status, schema)?;
        fields.insert("status".into(), FieldValue::from(status.clone()));
    }
    if let Some(priority) = explicit_priority(params) {
        validate_field_value("priority", priority, schema)?;
        fields.insert("priority".into(), FieldValue::from(priority.to_string()));
    }
    let tags = parse_tags(params.tags.as_deref());
    if !tags.is_empty() {
        fields.insert("tags".into(), FieldValue::from(tags));
    }
    if let Some(assignee) = &params.assignee {
        fields.insert("assignee".into(), FieldValue::from(assignee.clone()));
    }
    for (key, value) in extra_fields {
        validate_field_value(&key, &value, schema)?;
        fields.insert(key, FieldValue::from(value));
    }

    // For non-markdown adapters, `--template` is silently ignored — templates
    // produce frontmatter, which is meaningless for issue-tracker bodies.
    let body = if let Some(file_path) = params.file.as_deref() {
        let path = Path::new(file_path);
        if !path.exists() {
            return Err(format!("File not found: {}", file_path).into());
        }
        if path.is_dir() {
            return Err(format!("Path is a directory, not a file: {}", file_path).into());
        }
        Some(fs::read_to_string(path)?)
    } else if let Some(c) = &params.content {
        Some(c.clone())
    } else {
        params.description.clone()
    };
    if let Some(body) = body {
        fields.insert("content".into(), FieldValue::from(body));
    }

    let mut links = Vec::new();
    if let Some(parent) = &params.parent {
        links.push(ItemLink {
            link_type: MARKDOWN_PARENT_LINK.into(),
            target_id: parent.clone(),
            target_title: None,
        });
    }
    for dep in &params.depends_on {
        links.push(ItemLink {
            link_type: MARKDOWN_DEPENDS_ON_LINK.into(),
            target_id: dep.clone(),
            target_title: None,
        });
    }

    let req = CreateRequest {
        slug: None,
        title: title.clone(),
        schema_id: params.schema_id.clone(),
        fields,
        links,
    };

    let doc = adapter.create(&req)?;
    print_remote_success(&doc);
    Ok(())
}

// ── shared helpers ───────────────────────────────────────────────────────────

fn explicit_priority(params: &CreateParams) -> Option<&str> {
    params.priority.as_deref()
}

/// Priority to render in templates / success output. `None` falls back to the
/// canonical default of `medium` — separate from `explicit_priority`, which
/// preserves the user's "didn't set" intent.
fn template_priority(params: &CreateParams) -> &str {
    params.priority.as_deref().unwrap_or("medium")
}

fn parse_field_pairs(pairs: &[String]) -> Result<HashMap<String, String>, Box<dyn Error>> {
    let mut out = HashMap::new();
    for pair in pairs {
        let (k, v) = pair
            .split_once('=')
            .ok_or_else(|| format!("--field expects key=value, got '{pair}'"))?;
        let k = k.trim();
        let v = v.trim();
        if k.is_empty() {
            return Err(format!("--field has empty key: '{pair}'").into());
        }
        out.insert(k.to_string(), v.to_string());
    }
    Ok(out)
}

fn validate_field_value(key: &str, value: &str, schema: &SpecSchema) -> Result<(), Box<dyn Error>> {
    let Some(field) = schema.field(key) else {
        // Unknown fields are tolerated — the adapter may accept arbitrary
        // keys (e.g. markdown writes them into custom frontmatter).
        return Ok(());
    };
    if let FieldKind::Enum {
        options,
        allow_custom,
        ..
    } = &field.kind
    {
        if !allow_custom && !options.iter().any(|o| o.value == value) {
            let valid: Vec<&str> = options.iter().map(|o| o.value.as_str()).collect();
            return Err(format!(
                "Invalid value for --{key}: '{value}'. Valid values: {}",
                valid.join(", ")
            )
            .into());
        }
    }
    Ok(())
}

fn parse_tags(tags: Option<&str>) -> Vec<String> {
    tags.map(|t| {
        t.split(',')
            .map(|s| s.trim().to_string())
            .filter(|s| !s.is_empty())
            .collect()
    })
    .unwrap_or_default()
}

fn strip_numeric_prefix(name: &str) -> &str {
    if name.len() > 4 && name.as_bytes()[3] == b'-' && name[..3].bytes().all(|b| b.is_ascii_digit())
    {
        &name[4..]
    } else {
        name
    }
}

fn generate_title(name: &str) -> String {
    name.split('-')
        .map(|w| {
            let mut chars = w.chars();
            match chars.next() {
                Some(c) => c.to_uppercase().collect::<String>() + chars.as_str(),
                None => String::new(),
            }
        })
        .collect::<Vec<_>>()
        .join(" ")
}

fn find_project_root(specs_dir: &str) -> Result<PathBuf, Box<dyn Error>> {
    let specs_path = Path::new(specs_dir)
        .canonicalize()
        .unwrap_or_else(|_| std::env::current_dir().unwrap_or_else(|_| PathBuf::from(".")));
    let mut current = Some(specs_path.as_path());
    while let Some(path) = current {
        if path.join(".lean-spec").exists() {
            return Ok(path.to_path_buf());
        }
        current = path.parent();
    }
    Err("Could not find .lean-spec directory. Run 'lean-spec init' first.".into())
}

fn load_lean_spec_config(project_root: &Path) -> Result<LeanSpecConfig, Box<dyn Error>> {
    let yaml_path = project_root.join(".lean-spec/config.yaml");
    if yaml_path.exists() {
        let content = fs::read_to_string(&yaml_path)?;
        return Ok(serde_yaml::from_str(&content)?);
    }
    let json_path = project_root.join(".lean-spec/config.json");
    if json_path.exists() {
        let content = fs::read_to_string(&json_path)?;
        let json_value: serde_json::Value = serde_json::from_str(&content)?;
        let default_template = json_value
            .get("templates")
            .and_then(|t| t.get("default"))
            .and_then(|d| d.as_str())
            .or_else(|| json_value.get("template").and_then(|t| t.as_str()))
            .map(String::from);
        return Ok(LeanSpecConfig {
            default_template,
            ..Default::default()
        });
    }
    Ok(LeanSpecConfig::default())
}

#[derive(serde::Deserialize, Default)]
#[serde(rename_all = "camelCase")]
struct DraftStatusConfig {
    enabled: Option<bool>,
}

#[derive(serde::Deserialize, Default)]
#[serde(rename_all = "camelCase")]
struct ProjectConfig {
    draft_status: Option<DraftStatusConfig>,
}

fn is_draft_status_enabled(project_root: &Path) -> bool {
    let yaml_path = project_root.join(".lean-spec/config.yaml");
    if yaml_path.exists() {
        if let Ok(content) = fs::read_to_string(&yaml_path) {
            if let Ok(config) = serde_yaml::from_str::<ProjectConfig>(&content) {
                return config.draft_status.and_then(|d| d.enabled).unwrap_or(false);
            }
        }
    }
    let json_path = project_root.join(".lean-spec/config.json");
    if let Ok(content) = fs::read_to_string(json_path) {
        return serde_json::from_str::<ProjectConfig>(&content)
            .ok()
            .and_then(|c| c.draft_status.and_then(|d| d.enabled))
            .unwrap_or(false);
    }
    false
}

// ── template helpers (markdown-only) ─────────────────────────────────────────

fn apply_template_variables(
    template: &str,
    title: &str,
    status: &str,
    priority: &str,
    tags: &[String],
) -> Result<String, Box<dyn Error>> {
    let now = Utc::now();
    let created_date = now.format("%Y-%m-%d").to_string();

    let mut content = template.to_string();
    content = content.replace("{name}", title);
    content = content.replace("{title}", title);
    content = content.replace("{date}", &created_date);
    content = content.replace("{status}", status);
    content = content.replace("{priority}", priority);

    content = content.replace("status: planned", &format!("status: {status}"));
    content = content.replace("priority: medium", &format!("priority: {priority}"));

    if !tags.is_empty() {
        let tags_yaml = tags
            .iter()
            .map(|t| format!("  - {t}"))
            .collect::<Vec<_>>()
            .join("\n");
        content = content.replace("tags: []", &format!("tags:\n{tags_yaml}"));
    }

    // `created_at`/`updated_at` are populated by the markdown adapter when it
    // writes the document; injecting them here would cause a duplicate-key
    // collision when the adapter rebuilds the frontmatter.

    Ok(content)
}

// ── YAML frontmatter helpers (no markdown-internal types) ────────────────────

/// Split a markdown document into its YAML frontmatter mapping and body.
/// Returns `(None, content)` for documents without frontmatter.
fn split_yaml_frontmatter(content: &str) -> (Option<serde_yaml::Mapping>, String) {
    let trimmed = content.trim_start_matches('\n');
    if !trimmed.starts_with("---\n") && !trimmed.starts_with("---\r\n") {
        return (None, content.to_string());
    }
    let after_open = &trimmed[4..];
    let Some(close_pos) = after_open.find("\n---") else {
        return (None, content.to_string());
    };
    let yaml_str = &after_open[..close_pos];
    let body_start = 4 + close_pos + 4;
    let body = &trimmed[body_start..];
    let body = body.trim_start_matches('\n').to_string();

    let mapping = serde_yaml::from_str::<YamlValue>(yaml_str)
        .ok()
        .and_then(|v| v.as_mapping().cloned());
    (mapping, body)
}

/// Apply CLI flag overrides onto an in-memory YAML frontmatter mapping.
/// Explicit CLI values win; missing fields fall back to defaults.
#[allow(clippy::too_many_arguments)]
fn apply_cli_overrides(
    fm: &mut serde_yaml::Mapping,
    default_status: &str,
    explicit_status: Option<&str>,
    explicit_priority: Option<&str>,
    tags: &[String],
    assignee: Option<&str>,
    parent: Option<&str>,
    depends_on: &[String],
    created_date: &str,
    now: chrono::DateTime<Utc>,
) {
    if let Some(status) = explicit_status {
        fm.insert(YamlValue::String("status".into()), str_value(status));
    } else if !fm.contains_key(YamlValue::String("status".into())) {
        fm.insert(
            YamlValue::String("status".into()),
            str_value(default_status),
        );
    }

    if let Some(priority) = explicit_priority {
        fm.insert(YamlValue::String("priority".into()), str_value(priority));
    }

    if !tags.is_empty() {
        let seq: Vec<YamlValue> = tags.iter().map(|s| str_value(s)).collect();
        fm.insert(YamlValue::String("tags".into()), YamlValue::Sequence(seq));
    }

    if let Some(a) = assignee {
        fm.insert(YamlValue::String("assignee".into()), str_value(a));
    }

    if let Some(p) = parent {
        fm.insert(YamlValue::String("parent".into()), str_value(p));
    }

    if !depends_on.is_empty() {
        let seq: Vec<YamlValue> = depends_on.iter().map(|s| str_value(s)).collect();
        fm.insert(
            YamlValue::String("depends_on".into()),
            YamlValue::Sequence(seq),
        );
    }

    // Ensure required field `created` is present.
    fm.entry(YamlValue::String("created".into()))
        .or_insert_with(|| str_value(created_date));
    // `created_at`/`updated_at` are populated by the markdown adapter when
    // the document is written, so we don't set them here.
    let _ = now;
}

fn str_value(s: &str) -> YamlValue {
    YamlValue::String(s.to_string())
}

/// Convert a YAML frontmatter mapping into `(fields, links)`. `parent` and
/// `depends_on` become typed [`ItemLink`]s; every other key becomes a
/// [`FieldValue`] entry.
fn yaml_mapping_to_fields_and_links(
    fm: &serde_yaml::Mapping,
) -> (HashMap<String, FieldValue>, Vec<ItemLink>) {
    let mut fields = HashMap::new();
    let mut links = Vec::new();

    for (k, v) in fm.iter() {
        let Some(key) = k.as_str() else { continue };
        match key {
            "parent" => {
                if let Some(s) = v.as_str() {
                    if !s.is_empty() {
                        links.push(ItemLink {
                            link_type: MARKDOWN_PARENT_LINK.into(),
                            target_id: s.to_string(),
                            target_title: None,
                        });
                    }
                }
            }
            "depends_on" => {
                if let Some(seq) = v.as_sequence() {
                    for item in seq {
                        if let Some(s) = item.as_str() {
                            if !s.is_empty() {
                                links.push(ItemLink {
                                    link_type: MARKDOWN_DEPENDS_ON_LINK.into(),
                                    target_id: s.to_string(),
                                    target_title: None,
                                });
                            }
                        }
                    }
                }
            }
            _ => {
                if let Some(value) = yaml_to_field_value(v) {
                    fields.insert(key.to_string(), value);
                }
            }
        }
    }

    (fields, links)
}

fn yaml_to_field_value(v: &YamlValue) -> Option<FieldValue> {
    match v {
        YamlValue::String(s) => Some(FieldValue::from(s.clone())),
        YamlValue::Bool(b) => Some(FieldValue::from(*b)),
        YamlValue::Number(n) => n.as_f64().map(FieldValue::from),
        YamlValue::Sequence(seq) => {
            let strings: Vec<String> = seq
                .iter()
                .filter_map(|x| x.as_str().map(String::from))
                .collect();
            if strings.len() == seq.len() {
                Some(FieldValue::from(strings))
            } else {
                None
            }
        }
        _ => None,
    }
}

fn ensure_h1_heading(body: &str, title: &str) -> String {
    let trimmed = body.trim_start();
    if trimmed.starts_with("# ") || trimmed.starts_with("#\n") {
        body.to_string()
    } else {
        format!("# {}\n\n{}", title, trimmed)
    }
}

// ── output ───────────────────────────────────────────────────────────────────

fn print_markdown_success(
    doc: &SpecDoc,
    params: &CreateParams,
    title: &str,
    status: &str,
    tags: &[String],
) {
    println!("{} {}", "✓".green(), "Created spec:".green());
    println!("  {}: {}", "Path".bold(), doc.id);
    println!("  {}: {}", "Title".bold(), title);
    println!("  {}: {}", "Status".bold(), status);
    println!("  {}: {}", "Priority".bold(), template_priority(params));
    if !tags.is_empty() {
        println!("  {}: {}", "Tags".bold(), tags.join(", "));
    }
    if let Some(parent) = &params.parent {
        println!("  {}: {}", "Parent".bold(), parent);
    }
    if !params.depends_on.is_empty() {
        println!(
            "  {}: {}",
            "Depends on".bold(),
            params.depends_on.join(", ")
        );
    }
}

fn print_remote_success(doc: &SpecDoc) {
    println!("{} {}", "✓".green(), "Created issue:".green());
    println!("  {}: {}", "ID".bold(), doc.id);
    println!("  {}: {}", "Title".bold(), doc.title);
    if let Some(url) = &doc.url {
        println!("  {}: {}", "URL".bold(), url);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn split_yaml_frontmatter_returns_mapping_and_body() {
        let content = "---\nstatus: planned\npriority: high\n---\n\n# Title\n\nBody.";
        let (fm, body) = split_yaml_frontmatter(content);
        let fm = fm.expect("frontmatter should parse");
        assert_eq!(
            fm.get(YamlValue::String("status".into()))
                .and_then(|v| v.as_str()),
            Some("planned")
        );
        assert!(body.starts_with("# Title"));
    }

    #[test]
    fn split_yaml_frontmatter_returns_none_for_plain_text() {
        let (fm, body) = split_yaml_frontmatter("just a body");
        assert!(fm.is_none());
        assert_eq!(body, "just a body");
    }

    #[test]
    fn apply_cli_overrides_sets_explicit_status_and_priority() {
        let mut fm = serde_yaml::Mapping::new();
        apply_cli_overrides(
            &mut fm,
            "planned",
            Some("in-progress"),
            Some("high"),
            &["a".to_string(), "b".to_string()],
            None,
            None,
            &[],
            "2025-01-01",
            chrono::Utc::now(),
        );
        assert_eq!(
            fm.get(YamlValue::String("status".into()))
                .and_then(|v| v.as_str()),
            Some("in-progress")
        );
        assert_eq!(
            fm.get(YamlValue::String("priority".into()))
                .and_then(|v| v.as_str()),
            Some("high")
        );
        let tags = fm
            .get(YamlValue::String("tags".into()))
            .and_then(|v| v.as_sequence())
            .unwrap();
        assert_eq!(tags.len(), 2);
    }

    #[test]
    fn apply_cli_overrides_preserves_content_values() {
        let mut fm = serde_yaml::Mapping::new();
        fm.insert(
            YamlValue::String("status".into()),
            YamlValue::String("complete".into()),
        );
        apply_cli_overrides(
            &mut fm,
            "planned",
            None,
            None,
            &[],
            None,
            None,
            &[],
            "2025-01-01",
            chrono::Utc::now(),
        );
        assert_eq!(
            fm.get(YamlValue::String("status".into()))
                .and_then(|v| v.as_str()),
            Some("complete")
        );
    }

    #[test]
    fn yaml_mapping_to_fields_and_links_extracts_links() {
        let mut fm = serde_yaml::Mapping::new();
        fm.insert(
            YamlValue::String("status".into()),
            YamlValue::String("planned".into()),
        );
        fm.insert(
            YamlValue::String("parent".into()),
            YamlValue::String("001-root".into()),
        );
        fm.insert(
            YamlValue::String("depends_on".into()),
            YamlValue::Sequence(vec![
                YamlValue::String("001-foo".into()),
                YamlValue::String("002-bar".into()),
            ]),
        );

        let (fields, links) = yaml_mapping_to_fields_and_links(&fm);
        assert_eq!(
            fields.get("status").and_then(|v| v.as_str()),
            Some("planned")
        );
        assert!(!fields.contains_key("parent"));
        assert!(!fields.contains_key("depends_on"));
        assert_eq!(links.len(), 3);
        assert!(links.iter().any(|l| l.link_type == "parent"));
        assert_eq!(
            links.iter().filter(|l| l.link_type == "depends_on").count(),
            2
        );
    }

    #[test]
    fn yaml_to_field_value_handles_primitives() {
        assert_eq!(
            yaml_to_field_value(&YamlValue::String("hello".into()))
                .and_then(|v| v.as_str().map(String::from)),
            Some("hello".into())
        );
        assert_eq!(
            yaml_to_field_value(&YamlValue::Bool(true)).and_then(|v| v.as_bool()),
            Some(true)
        );
    }

    #[test]
    fn parse_field_pairs_parses_key_value() {
        let pairs = vec!["severity=high".to_string(), "epic=Q3".to_string()];
        let parsed = parse_field_pairs(&pairs).unwrap();
        assert_eq!(parsed.get("severity"), Some(&"high".to_string()));
        assert_eq!(parsed.get("epic"), Some(&"Q3".to_string()));
    }

    #[test]
    fn parse_field_pairs_rejects_missing_equals() {
        let pairs = vec!["broken".to_string()];
        assert!(parse_field_pairs(&pairs).is_err());
    }

    #[test]
    fn parse_field_pairs_rejects_empty_key() {
        let pairs = vec!["=value".to_string()];
        assert!(parse_field_pairs(&pairs).is_err());
    }

    #[test]
    fn validate_field_value_rejects_invalid_enum() {
        let schema = SpecSchema {
            id: "test".into(),
            name: "test".into(),
            extends: None,
            fields: vec![leanspec_core::model::FieldDef {
                key: "status".into(),
                label: "Status".into(),
                kind: FieldKind::Enum {
                    options: vec![leanspec_core::model::EnumOption::simple("open", "Open")],
                    multi: false,
                    allow_custom: false,
                    dynamic: false,
                },
                display: leanspec_core::model::FieldDisplay::Inline,
                required: true,
                semantic: Some("status".into()),
                ai_hint: None,
                placeholder: None,
            }],
            link_types: vec![],
        };
        assert!(validate_field_value("status", "open", &schema).is_ok());
        assert!(validate_field_value("status", "bogus", &schema).is_err());
    }

    #[test]
    fn validate_field_value_allows_unknown_keys() {
        let schema = SpecSchema {
            id: "test".into(),
            name: "test".into(),
            extends: None,
            fields: vec![],
            link_types: vec![],
        };
        assert!(validate_field_value("custom", "x", &schema).is_ok());
    }

    #[test]
    fn parse_tags_splits_and_trims() {
        assert_eq!(
            parse_tags(Some("feature, backend")),
            vec!["feature", "backend"]
        );
        assert_eq!(parse_tags(None), Vec::<String>::new());
    }

    #[test]
    fn strip_numeric_prefix_strips_three_digit() {
        assert_eq!(strip_numeric_prefix("001-feature"), "feature");
        assert_eq!(strip_numeric_prefix("feature"), "feature");
    }

    #[test]
    fn generate_title_capitalizes_words() {
        assert_eq!(generate_title("api-v2"), "Api V2");
        assert_eq!(generate_title("test-feature"), "Test Feature");
    }

    #[test]
    fn ensure_h1_heading_adds_when_missing() {
        let body = "Just text.";
        let out = ensure_h1_heading(body, "Title");
        assert!(out.starts_with("# Title"));
    }

    #[test]
    fn ensure_h1_heading_preserves_existing() {
        let body = "# Existing\n\nBody.";
        let out = ensure_h1_heading(body, "Other");
        assert!(out.starts_with("# Existing"));
        assert!(!out.contains("# Other"));
    }
}
