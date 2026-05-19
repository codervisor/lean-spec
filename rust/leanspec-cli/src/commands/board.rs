//! `board` command — adapter-aware kanban-style view.
//!
//! Replaces the per-field grouping functions (`print_by_status`, etc.) from
//! the legacy `SpecLoader` implementation with a single generic grouping
//! routine driven by the adapter's schema. Column headers follow the
//! schema-declared enum option order; column header colors come from the
//! enum option's `color` field.

use colored::{ColoredString, Colorize};
use leanspec_core::adapters::markdown::MarkdownAdapter;
use leanspec_core::adapters::{Adapter, AdapterRegistry, ListFilter};
use leanspec_core::model::{semantic, FieldDef, FieldKind, FieldValue, SpecDoc, SpecSchema};
use std::collections::{HashMap, HashSet};
use std::error::Error;

const NO_VALUE: &str = "(none)";

pub struct BoardParams {
    /// Markdown-only override of the specs directory. Errors if the project
    /// adapter is not markdown.
    pub specs_dir: Option<String>,
    /// Field key (or semantic key) to group by. Defaults to the status
    /// semantic field when `None`.
    pub group_by: Option<String>,
    /// Group by parent link instead of a field (`--by-parent`).
    pub by_parent: bool,
    pub status: Option<String>,
    pub tags: Option<Vec<String>>,
    pub priority: Option<String>,
    pub assignee: Option<String>,
    pub compact: bool,
    pub output_format: String,
}

pub fn run(params: BoardParams) -> Result<(), Box<dyn Error>> {
    let adapter = resolve_adapter(params.specs_dir.as_deref())?;
    let schema = adapter.schema();
    let filter = build_list_filter(&params, schema);
    let docs = adapter.list(&filter)?;

    if params.by_parent {
        if params.output_format == "json" {
            print_parent_json(&docs)?;
        } else {
            print_parent_groups(&docs);
        }
        return Ok(());
    }

    let field_key = resolve_group_by(params.group_by.as_deref(), schema)?;
    let field = schema
        .field(&field_key)
        .ok_or_else(|| format!("unknown field '{}' in active schema", field_key))?;
    let groups = group_by_field(&docs, &field_key, schema);

    match params.output_format.as_str() {
        "json" => print_groups_json(&field_key, &groups, docs.len())?,
        _ => print_groups(
            &field_key,
            field,
            &groups,
            schema,
            docs.len(),
            params.compact,
        ),
    }

    Ok(())
}

fn resolve_adapter(specs_dir: Option<&str>) -> Result<Box<dyn Adapter>, Box<dyn Error>> {
    match specs_dir {
        Some(dir) => {
            let config = AdapterRegistry::project_config()?;
            if config.adapter != "markdown" {
                return Err(format!(
                    "--specs-dir is not applicable to the '{}' adapter \
                     (only applies to markdown projects)",
                    config.adapter
                )
                .into());
            }
            Ok(Box::new(MarkdownAdapter::new(dir)))
        }
        None => Ok(AdapterRegistry::from_project()?),
    }
}

/// Translate filter flags into `ListFilter::fields` using the schema's
/// semantic hints. Mirrors `list::build_list_filter` so that pre-filters
/// behave identically across both commands.
fn build_list_filter(params: &BoardParams, schema: &SpecSchema) -> ListFilter {
    let mut fields: HashMap<String, Vec<String>> = HashMap::new();

    if let Some(status) = &params.status {
        if let Some(key) = schema.key_for_semantic(semantic::STATUS) {
            fields.insert(key.to_string(), vec![status.clone()]);
        }
    }
    if let Some(priority) = &params.priority {
        if let Some(key) = schema.key_for_semantic(semantic::PRIORITY) {
            fields.insert(key.to_string(), vec![priority.clone()]);
        }
    }
    if let Some(tags) = &params.tags {
        if let Some(key) = schema.key_for_semantic(semantic::TAGS) {
            fields.insert(key.to_string(), tags.clone());
        }
    }
    if let Some(assignee) = &params.assignee {
        if let Some(key) = schema.key_for_semantic(semantic::ASSIGNEE) {
            fields.insert(key.to_string(), vec![assignee.clone()]);
        }
    }

    ListFilter {
        fields,
        text: None,
        include_archived: false,
        raw: None,
    }
}

/// Resolve the `--group-by` flag into a concrete schema field key.
///
/// Resolution order:
/// 1. `None` → the status semantic field
/// 2. A direct field key match
/// 3. A semantic key match (so `--group-by status` works on adapters whose
///    status field is named differently, e.g. GitHub's `state`)
/// 4. Fall back to the first declared enum field in the schema (only when
///    `None` was provided and there is no status field)
fn resolve_group_by(value: Option<&str>, schema: &SpecSchema) -> Result<String, Box<dyn Error>> {
    if let Some(key) = value {
        if schema.field(key).is_some() {
            return Ok(key.to_string());
        }
        if let Some(resolved) = schema.key_for_semantic(key) {
            return Ok(resolved.to_string());
        }
        return Err(format!(
            "no field '{}' in active schema (try one of: {})",
            key,
            schema
                .fields
                .iter()
                .map(|f| f.key.as_str())
                .collect::<Vec<_>>()
                .join(", ")
        )
        .into());
    }

    if let Some(key) = schema.key_for_semantic(semantic::STATUS) {
        return Ok(key.to_string());
    }

    schema
        .fields
        .iter()
        .find(|f| matches!(f.kind, FieldKind::Enum { .. }))
        .map(|f| f.key.clone())
        .ok_or_else(|| "active schema has no enum fields to group by".into())
}

/// Render a field value into the set of group buckets it contributes to.
/// Multi-value fields (`Strings`) produce one bucket per element; absent and
/// non-groupable values (Checklist/References) fall back to `(none)`.
fn field_group_keys(value: Option<&FieldValue>) -> Vec<String> {
    match value {
        Some(FieldValue::String(s)) => vec![s.clone()],
        Some(FieldValue::Strings(items)) => {
            if items.is_empty() {
                vec![NO_VALUE.into()]
            } else {
                items.clone()
            }
        }
        Some(FieldValue::Bool(b)) => vec![b.to_string()],
        Some(FieldValue::Number(n)) => vec![n.to_string()],
        Some(FieldValue::Timestamp(t)) => vec![t.format("%Y-%m-%d").to_string()],
        Some(FieldValue::Checklist(_)) | Some(FieldValue::References(_)) | None => {
            vec![NO_VALUE.into()]
        }
    }
}

/// Group documents by the named field. Multi-value fields produce an entry
/// per value (the same doc appears in each group). Group order follows the
/// schema's enum declaration order; values not declared in the schema (or
/// adapters with no enum options on the field) are appended in sorted order.
fn group_by_field<'a>(
    docs: &'a [SpecDoc],
    field_key: &str,
    schema: &SpecSchema,
) -> Vec<(String, Vec<&'a SpecDoc>)> {
    let ordered_values: Vec<String> = schema
        .field(field_key)
        .and_then(|f| match &f.kind {
            FieldKind::Enum { options, .. } => Some(options),
            _ => None,
        })
        .map(|opts| opts.iter().map(|o| o.value.clone()).collect())
        .unwrap_or_default();

    let mut groups: HashMap<String, Vec<&SpecDoc>> = HashMap::new();
    for doc in docs {
        let buckets = field_group_keys(doc.fields.get(field_key));
        for bucket in buckets {
            groups.entry(bucket).or_default().push(doc);
        }
    }

    let mut result: Vec<(String, Vec<&SpecDoc>)> = ordered_values
        .iter()
        .filter_map(|v| groups.remove(v).map(|items| (v.clone(), items)))
        .collect();

    let mut remaining: Vec<(String, Vec<&SpecDoc>)> = groups.into_iter().collect();
    remaining.sort_by(|a, b| {
        // Keep "(none)" last when sorting unknown values for stable output.
        if a.0 == NO_VALUE {
            std::cmp::Ordering::Greater
        } else if b.0 == NO_VALUE {
            std::cmp::Ordering::Less
        } else {
            a.0.cmp(&b.0)
        }
    });
    result.extend(remaining);
    result
}

fn print_groups(
    field_key: &str,
    field: &FieldDef,
    groups: &[(String, Vec<&SpecDoc>)],
    schema: &SpecSchema,
    total: usize,
    compact: bool,
) {
    println!();
    println!("{}", "═".repeat(60).dimmed());
    println!(
        "{}",
        format!(" PROJECT BOARD — by {} ", field.label)
            .bold()
            .cyan()
    );
    println!("{}", "═".repeat(60).dimmed());

    if groups.is_empty() {
        println!();
        println!("{}", "No specs found".yellow());
        return;
    }

    for (value, docs) in groups {
        println!();
        let header = colorize_value(field_key, value, schema);
        println!("{} ({})", header.bold(), docs.len());
        println!("{}", "─".repeat(40).dimmed());

        if compact {
            for doc in docs {
                println!("  {} - {}", doc.id.cyan(), doc.title.dimmed());
            }
        } else {
            for doc in docs {
                let status_value = field_str(doc, schema, semantic::STATUS).unwrap_or("");
                let status_icon = status_emoji(status_value);
                println!(
                    "  {} {} - {}",
                    status_icon,
                    doc.id.cyan(),
                    doc.title.dimmed()
                );

                if let Some(assignee) = field_str(doc, schema, semantic::ASSIGNEE) {
                    println!("      👤 {}", assignee.dimmed());
                }
            }
        }
    }

    println!();
    println!("{}", "═".repeat(60).dimmed());
    println!("Total: {} specs", total.to_string().green());
}

fn print_groups_json(
    field_key: &str,
    groups: &[(String, Vec<&SpecDoc>)],
    total: usize,
) -> Result<(), Box<dyn Error>> {
    #[derive(serde::Serialize)]
    struct Output<'a> {
        group_by: &'a str,
        total: usize,
        groups: Vec<Group<'a>>,
    }

    #[derive(serde::Serialize)]
    struct Group<'a> {
        name: &'a str,
        count: usize,
        specs: Vec<Spec<'a>>,
    }

    #[derive(serde::Serialize)]
    struct Spec<'a> {
        id: &'a str,
        title: &'a str,
    }

    let output = Output {
        group_by: field_key,
        total,
        groups: groups
            .iter()
            .map(|(name, docs)| Group {
                name,
                count: docs.len(),
                specs: docs
                    .iter()
                    .map(|d| Spec {
                        id: &d.id,
                        title: &d.title,
                    })
                    .collect(),
            })
            .collect(),
    };

    println!("{}", serde_json::to_string_pretty(&output)?);
    Ok(())
}

/// Group documents by their `parent` link. Specs without a parent land in the
/// "No parent" bucket; specs whose parent isn't in the loaded set are flagged.
fn group_by_parent(docs: &[SpecDoc]) -> Vec<(String, Vec<&SpecDoc>)> {
    let known: HashSet<&str> = docs.iter().map(|d| d.id.as_str()).collect();
    let mut groups: HashMap<String, Vec<&SpecDoc>> = HashMap::new();
    for doc in docs {
        let key = parent_id(doc)
            .map(|p| p.to_string())
            .unwrap_or_else(|| NO_VALUE.into());
        groups.entry(key).or_default().push(doc);
    }

    let mut pairs: Vec<(String, Vec<&SpecDoc>)> = groups.into_iter().collect();
    pairs.sort_by(|a, b| {
        if a.0 == NO_VALUE {
            std::cmp::Ordering::Greater
        } else if b.0 == NO_VALUE {
            std::cmp::Ordering::Less
        } else {
            a.0.cmp(&b.0)
        }
    });

    let title_by_id: HashMap<&str, &str> = docs
        .iter()
        .map(|d| (d.id.as_str(), d.title.as_str()))
        .collect();

    pairs
        .into_iter()
        .map(|(key, docs)| {
            let label = if key == NO_VALUE {
                "No parent".to_string()
            } else if let Some(title) = title_by_id.get(key.as_str()) {
                format!("{} - {}", key, title)
            } else if known.contains(key.as_str()) {
                key.clone()
            } else {
                format!("Missing parent: {}", key)
            };
            (label, docs)
        })
        .collect()
}

fn print_parent_groups(docs: &[SpecDoc]) {
    let groups = group_by_parent(docs);

    println!();
    println!("{}", "═".repeat(60).dimmed());
    println!("{}", " PROJECT BOARD — by parent ".bold().cyan());
    println!("{}", "═".repeat(60).dimmed());

    if groups.is_empty() {
        println!();
        println!("{}", "No specs found".yellow());
        return;
    }

    for (label, group_docs) in &groups {
        println!();
        println!("📂 {} ({})", label.bold(), group_docs.len());
        println!("{}", "─".repeat(40).dimmed());
        for doc in group_docs {
            println!("  {} - {}", doc.id.cyan(), doc.title.dimmed());
        }
    }

    println!();
    println!("{}", "═".repeat(60).dimmed());
    println!("Total: {} specs", docs.len().to_string().green());
}

fn print_parent_json(docs: &[SpecDoc]) -> Result<(), Box<dyn Error>> {
    let groups = group_by_parent(docs);
    print_groups_json("parent", &groups, docs.len())
}

fn field_str<'a>(doc: &'a SpecDoc, schema: &SpecSchema, semantic_key: &str) -> Option<&'a str> {
    let key = schema.key_for_semantic(semantic_key)?;
    doc.fields.get(key)?.as_str()
}

fn parent_id(doc: &SpecDoc) -> Option<&str> {
    doc.links
        .iter()
        .find(|l| l.link_type == "parent")
        .map(|l| l.target_id.as_str())
}

/// Map a status enum value to a terminal emoji. Kept aligned with
/// `commands::list::status_emoji` — the schema's `EnumOption::icon` is a
/// lucide-react UI hint, not a terminal glyph.
fn status_emoji(value: &str) -> &'static str {
    match value {
        "draft" => "📝",
        "planned" => "📅",
        "in-progress" => "⏳",
        "complete" => "✅",
        "archived" => "📦",
        "open" => "🟢",
        "closed" => "🔴",
        _ => "•",
    }
}

/// Color the given value using the schema-declared color on the matching
/// enum option. Falls back to the plain string when no color is declared or
/// the field isn't an enum.
fn colorize_value(field_key: &str, value: &str, schema: &SpecSchema) -> ColoredString {
    if let Some(hex) = enum_color(schema, field_key, value) {
        if let Some((r, g, b)) = parse_hex(&hex) {
            return value.truecolor(r, g, b);
        }
    }
    value.normal()
}

fn enum_color(schema: &SpecSchema, field_key: &str, value: &str) -> Option<String> {
    let field = schema.field(field_key)?;
    match &field.kind {
        FieldKind::Enum { options, .. } => options
            .iter()
            .find(|o| o.value == value)
            .and_then(|o| o.color.clone()),
        _ => None,
    }
}

fn parse_hex(hex: &str) -> Option<(u8, u8, u8)> {
    let h = hex.trim_start_matches('#');
    if h.len() != 6 {
        return None;
    }
    let r = u8::from_str_radix(&h[0..2], 16).ok()?;
    let g = u8::from_str_radix(&h[2..4], 16).ok()?;
    let b = u8::from_str_radix(&h[4..6], 16).ok()?;
    Some((r, g, b))
}

#[cfg(test)]
mod tests {
    use super::*;
    use leanspec_core::model::{
        EnumOption, FieldDef, FieldDisplay, FieldKind, FieldValue, ItemLink, LinkTypeDef,
    };

    fn test_schema() -> SpecSchema {
        SpecSchema {
            id: "test:schema".into(),
            name: "Test".into(),
            extends: None,
            fields: vec![
                FieldDef {
                    key: "status".into(),
                    label: "Status".into(),
                    kind: FieldKind::Enum {
                        options: vec![
                            EnumOption::simple("planned", "Planned").with_color("#3b82f6"),
                            EnumOption::simple("in-progress", "In Progress").with_color("#f59e0b"),
                            EnumOption::simple("complete", "Complete").with_color("#10b981"),
                        ],
                        multi: false,
                        allow_custom: false,
                        dynamic: false,
                    },
                    display: FieldDisplay::Inline,
                    required: true,
                    semantic: Some(semantic::STATUS.to_string()),
                    ai_hint: None,
                    placeholder: None,
                },
                FieldDef {
                    key: "tags".into(),
                    label: "Tags".into(),
                    kind: FieldKind::Enum {
                        options: vec![],
                        multi: true,
                        allow_custom: true,
                        dynamic: false,
                    },
                    display: FieldDisplay::Inline,
                    required: false,
                    semantic: Some(semantic::TAGS.to_string()),
                    ai_hint: None,
                    placeholder: None,
                },
            ],
            link_types: vec![LinkTypeDef {
                key: "parent".into(),
                label: "Parent".into(),
                inverse_key: Some("child".into()),
                inverse_label: Some("Child".into()),
            }],
        }
    }

    fn doc(id: &str, status: Option<&str>, tags: Option<Vec<&str>>) -> SpecDoc {
        let mut fields = HashMap::new();
        if let Some(s) = status {
            fields.insert("status".into(), FieldValue::String(s.into()));
        }
        if let Some(t) = tags {
            fields.insert(
                "tags".into(),
                FieldValue::Strings(t.into_iter().map(String::from).collect()),
            );
        }
        SpecDoc {
            id: id.into(),
            title: format!("Title {}", id),
            schema_id: "test:schema".into(),
            fields,
            links: vec![],
            created_at: None,
            updated_at: None,
            url: None,
            raw: None,
        }
    }

    #[test]
    fn resolve_group_by_defaults_to_status_semantic() {
        let schema = test_schema();
        let key = resolve_group_by(None, &schema).unwrap();
        assert_eq!(key, "status");
    }

    #[test]
    fn resolve_group_by_accepts_field_key() {
        let schema = test_schema();
        let key = resolve_group_by(Some("tags"), &schema).unwrap();
        assert_eq!(key, "tags");
    }

    #[test]
    fn resolve_group_by_accepts_semantic_key() {
        let schema = test_schema();
        // `status` is both a field key and a semantic key; ensure semantic
        // lookup also works when a hypothetical adapter renames the field.
        let key = resolve_group_by(Some(semantic::STATUS), &schema).unwrap();
        assert_eq!(key, "status");
    }

    #[test]
    fn resolve_group_by_unknown_errors() {
        let schema = test_schema();
        let err = resolve_group_by(Some("nonsense"), &schema).unwrap_err();
        let msg = err.to_string();
        assert!(msg.contains("nonsense"));
    }

    #[test]
    fn group_by_field_follows_schema_order() {
        let schema = test_schema();
        let docs = vec![
            doc("003", Some("complete"), None),
            doc("001", Some("planned"), None),
            doc("002", Some("in-progress"), None),
        ];
        let groups = group_by_field(&docs, "status", &schema);
        let keys: Vec<&str> = groups.iter().map(|(k, _)| k.as_str()).collect();
        assert_eq!(keys, vec!["planned", "in-progress", "complete"]);
    }

    #[test]
    fn group_by_field_multi_value_repeats_doc() {
        let schema = test_schema();
        let docs = vec![
            doc("001", None, Some(vec!["a", "b"])),
            doc("002", None, Some(vec!["b"])),
        ];
        let groups = group_by_field(&docs, "tags", &schema);
        let a = groups.iter().find(|(k, _)| k == "a").unwrap();
        let b = groups.iter().find(|(k, _)| k == "b").unwrap();
        assert_eq!(a.1.len(), 1);
        assert_eq!(b.1.len(), 2);
    }

    #[test]
    fn group_by_field_missing_value_buckets_as_none() {
        let schema = test_schema();
        let docs = vec![doc("001", None, None)];
        let groups = group_by_field(&docs, "status", &schema);
        let (key, items) = groups.last().unwrap();
        assert_eq!(key, NO_VALUE);
        assert_eq!(items.len(), 1);
    }

    #[test]
    fn field_group_keys_handles_primitive_scalars() {
        // Bool, Number and Timestamp values become readable bucket keys
        // instead of collapsing into the "(none)" bucket.
        assert_eq!(
            field_group_keys(Some(&FieldValue::Bool(true))),
            vec!["true".to_string()]
        );
        assert_eq!(
            field_group_keys(Some(&FieldValue::Bool(false))),
            vec!["false".to_string()]
        );
        assert_eq!(
            field_group_keys(Some(&FieldValue::Number(42.0))),
            vec!["42".to_string()]
        );
        assert_eq!(field_group_keys(None), vec![NO_VALUE.to_string()]);
    }

    #[test]
    fn group_by_parent_buckets_orphans() {
        let docs = vec![
            SpecDoc {
                id: "001".into(),
                title: "Root".into(),
                schema_id: "test:schema".into(),
                fields: HashMap::new(),
                links: vec![],
                created_at: None,
                updated_at: None,
                url: None,
                raw: None,
            },
            SpecDoc {
                id: "002".into(),
                title: "Child".into(),
                schema_id: "test:schema".into(),
                fields: HashMap::new(),
                links: vec![ItemLink {
                    link_type: "parent".into(),
                    target_id: "001".into(),
                    target_title: None,
                }],
                created_at: None,
                updated_at: None,
                url: None,
                raw: None,
            },
        ];
        let groups = group_by_parent(&docs);
        // Parent label first, "No parent" bucket last.
        assert!(groups[0].0.contains("001"));
        assert_eq!(groups.last().unwrap().0, "No parent");
    }

    #[test]
    fn parse_hex_round_trip() {
        assert_eq!(parse_hex("#3b82f6"), Some((0x3b, 0x82, 0xf6)));
        assert_eq!(parse_hex("3b82f6"), Some((0x3b, 0x82, 0xf6)));
        assert_eq!(parse_hex("xyz"), None);
    }
}
