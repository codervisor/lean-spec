//! `list` command — the reference adapter-aware command migration.
//!
//! Reads the active adapter from project config (or `--specs-dir` for
//! markdown), translates filter flags through semantic hints in the schema,
//! and renders rows using schema-declared field values and colors. This is
//! the canonical pattern for subsequent command migrations.

use colored::{ColoredString, Colorize};
use leanspec_core::adapters::markdown::MarkdownAdapter;
use leanspec_core::adapters::{Adapter, AdapterRegistry, ListFilter};
use leanspec_core::model::{semantic, FieldKind, SpecDoc, SpecSchema};
use std::collections::HashMap;
use std::error::Error;

pub struct ListParams {
    /// Markdown-only override of the specs directory. Errors if the project
    /// adapter is not markdown.
    pub specs_dir: Option<String>,
    pub status: Option<String>,
    pub tags: Option<Vec<String>>,
    pub priority: Option<String>,
    pub assignee: Option<String>,
    pub compact: bool,
    pub hierarchy: bool,
    pub output_format: String,
}

pub fn run(params: ListParams) -> Result<(), Box<dyn Error>> {
    let adapter = resolve_adapter(params.specs_dir.as_deref())?;
    let schema = adapter.schema();
    let filter = build_list_filter(&params, schema);
    let docs = adapter.list(&filter)?;

    match params.output_format.as_str() {
        "json" => print_json(&docs, schema)?,
        _ => {
            if params.hierarchy {
                print_hierarchy(&docs, schema);
            } else if params.compact {
                print_compact(&docs, schema);
            } else {
                print_detailed(&docs, schema);
            }
        }
    }

    Ok(())
}

fn resolve_adapter(specs_dir: Option<&str>) -> Result<Box<dyn Adapter>, Box<dyn Error>> {
    match specs_dir {
        Some(dir) => {
            // Inspect the configured adapter without instantiating it —
            // GitHub-style adapters demand env vars at construction time, and
            // we want a precise "--specs-dir doesn't apply here" error before
            // we ever try to authenticate.
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
/// semantic hints. If a flag has no matching semantic field on the adapter,
/// it is silently dropped — a `--priority` flag against a backend with no
/// priority concept is a no-op, not an error.
fn build_list_filter(params: &ListParams, schema: &SpecSchema) -> ListFilter {
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

fn field_str<'a>(doc: &'a SpecDoc, schema: &SpecSchema, semantic_key: &str) -> Option<&'a str> {
    let key = schema.key_for_semantic(semantic_key)?;
    doc.fields.get(key)?.as_str()
}

fn field_strings<'a>(
    doc: &'a SpecDoc,
    schema: &SpecSchema,
    semantic_key: &str,
) -> Option<&'a [String]> {
    let key = schema.key_for_semantic(semantic_key)?;
    doc.fields.get(key)?.as_strings()
}

fn parent_id(doc: &SpecDoc) -> Option<&str> {
    doc.links
        .iter()
        .find(|l| l.link_type == "parent")
        .map(|l| l.target_id.as_str())
}

fn dependency_ids(doc: &SpecDoc) -> Vec<&str> {
    doc.links
        .iter()
        .filter(|l| l.link_type == "depends_on")
        .map(|l| l.target_id.as_str())
        .collect()
}

/// Map a status enum value to a terminal emoji.
///
/// The schema's `EnumOption::icon` field holds UI icon names (lucide-react
/// style), not terminal emojis, so this mapping is intentionally kept in CLI
/// space and covers both markdown statuses and the GitHub adapter's
/// open/closed.
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

/// Color the given status value using the schema-declared `color` on its
/// enum option. Falls back to white if no color is declared.
fn colorize_status(value: &str, schema: &SpecSchema) -> ColoredString {
    if let Some(hex) = enum_color(schema, semantic::STATUS, value) {
        if let Some((r, g, b)) = parse_hex(&hex) {
            return value.truecolor(r, g, b);
        }
    }
    value.normal()
}

fn colorize_priority(value: &str, schema: &SpecSchema) -> ColoredString {
    if let Some(hex) = enum_color(schema, semantic::PRIORITY, value) {
        if let Some((r, g, b)) = parse_hex(&hex) {
            return value.truecolor(r, g, b);
        }
    }
    value.normal()
}

fn enum_color(schema: &SpecSchema, semantic_key: &str, value: &str) -> Option<String> {
    let field = schema.field_with_semantic(semantic_key)?;
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

fn print_json(docs: &[SpecDoc], schema: &SpecSchema) -> Result<(), Box<dyn Error>> {
    #[derive(serde::Serialize)]
    struct Output<'a> {
        id: &'a str,
        title: &'a str,
        status: Option<&'a str>,
        priority: Option<&'a str>,
        tags: Vec<&'a str>,
        assignee: Option<&'a str>,
        parent: Option<&'a str>,
    }

    let output: Vec<Output<'_>> = docs
        .iter()
        .map(|doc| Output {
            id: &doc.id,
            title: &doc.title,
            status: field_str(doc, schema, semantic::STATUS),
            priority: field_str(doc, schema, semantic::PRIORITY),
            tags: field_strings(doc, schema, semantic::TAGS)
                .map(|s| s.iter().map(String::as_str).collect())
                .unwrap_or_default(),
            assignee: field_str(doc, schema, semantic::ASSIGNEE),
            parent: parent_id(doc),
        })
        .collect();

    println!("{}", serde_json::to_string_pretty(&output)?);
    Ok(())
}

fn is_umbrella(doc: &SpecDoc, docs: &[SpecDoc]) -> bool {
    docs.iter().any(|d| parent_id(d) == Some(doc.id.as_str()))
}

fn print_compact(docs: &[SpecDoc], schema: &SpecSchema) {
    for doc in docs {
        let status_value = field_str(doc, schema, semantic::STATUS).unwrap_or("");
        let icon = status_emoji(status_value);
        let umbrella = if is_umbrella(doc, docs) { "🌂 " } else { "" };
        println!("{} {}{} - {}", icon, umbrella, doc.id.cyan(), doc.title);
    }

    println!("\n{} specs found", docs.len().to_string().green());
}

fn print_detailed(docs: &[SpecDoc], schema: &SpecSchema) {
    if docs.is_empty() {
        println!("{}", "No specs found".yellow());
        return;
    }

    for doc in docs {
        let status_value = field_str(doc, schema, semantic::STATUS).unwrap_or("");
        let icon = status_emoji(status_value);
        let umbrella = if is_umbrella(doc, docs) { "🌂 " } else { "" };

        println!();
        println!("{} {}{}", doc.id.cyan().bold(), umbrella, doc.title.bold());
        println!("   {} {}", icon, colorize_status(status_value, schema));

        if let Some(priority) = field_str(doc, schema, semantic::PRIORITY) {
            println!("   📊 {}", colorize_priority(priority, schema));
        }

        if let Some(tags) = field_strings(doc, schema, semantic::TAGS) {
            if !tags.is_empty() {
                println!("   🏷️  {}", tags.join(", ").dimmed());
            }
        }

        if let Some(assignee) = field_str(doc, schema, semantic::ASSIGNEE) {
            println!("   👤 {}", assignee);
        }

        if let Some(parent) = parent_id(doc) {
            println!("   🧭 parent: {}", parent.dimmed());
        }

        let deps = dependency_ids(doc);
        if !deps.is_empty() {
            println!("   🔗 depends on: {}", deps.join(", ").dimmed());
        }
    }

    println!();
    println!("{} specs found", docs.len().to_string().green().bold());
}

fn print_hierarchy(docs: &[SpecDoc], schema: &SpecSchema) {
    if docs.is_empty() {
        println!("{}", "No specs found".yellow());
        return;
    }

    let by_id: HashMap<&str, &SpecDoc> = docs.iter().map(|d| (d.id.as_str(), d)).collect();
    let mut children_by_parent: HashMap<&str, Vec<&SpecDoc>> = HashMap::new();
    for doc in docs {
        if let Some(parent) = parent_id(doc) {
            children_by_parent.entry(parent).or_default().push(doc);
        }
    }

    let mut roots: Vec<&SpecDoc> = docs
        .iter()
        .filter(|d| match parent_id(d) {
            None => true,
            Some(parent) => !by_id.contains_key(parent),
        })
        .collect();
    roots.sort_by(|a, b| a.id.cmp(&b.id));

    let mut visited = std::collections::HashSet::new();
    for root in roots {
        print_hierarchy_node(root, 0, &children_by_parent, &mut visited, schema);
    }

    println!("\n{} specs found", docs.len().to_string().green());
}

fn print_hierarchy_node<'a>(
    doc: &'a SpecDoc,
    depth: usize,
    children_by_parent: &HashMap<&str, Vec<&'a SpecDoc>>,
    visited: &mut std::collections::HashSet<String>,
    schema: &SpecSchema,
) {
    if !visited.insert(doc.id.clone()) {
        return;
    }

    let status_value = field_str(doc, schema, semantic::STATUS).unwrap_or("");
    let icon = status_emoji(status_value);
    let indent = "  ".repeat(depth);
    println!("{}{} {} - {}", indent, icon, doc.id.cyan(), doc.title);

    if let Some(children) = children_by_parent.get(doc.id.as_str()) {
        let mut sorted = children.clone();
        sorted.sort_by(|a, b| a.id.cmp(&b.id));
        for child in sorted {
            print_hierarchy_node(child, depth + 1, children_by_parent, visited, schema);
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use leanspec_core::model::{
        EnumOption, FieldDef, FieldDisplay, FieldKind, ItemLink, LinkTypeDef,
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

    #[test]
    fn build_filter_translates_status_via_semantic() {
        let schema = test_schema();
        let params = ListParams {
            specs_dir: None,
            status: Some("planned".into()),
            tags: None,
            priority: None,
            assignee: None,
            compact: false,
            hierarchy: false,
            output_format: "text".into(),
        };
        let filter = build_list_filter(&params, &schema);
        assert_eq!(filter.fields.get("status"), Some(&vec!["planned".into()]));
    }

    #[test]
    fn build_filter_drops_flags_without_matching_semantic() {
        let schema = test_schema(); // no priority field
        let params = ListParams {
            specs_dir: None,
            status: None,
            tags: None,
            priority: Some("high".into()),
            assignee: None,
            compact: false,
            hierarchy: false,
            output_format: "text".into(),
        };
        let filter = build_list_filter(&params, &schema);
        assert!(filter.fields.is_empty());
    }

    #[test]
    fn build_filter_translates_tags() {
        let schema = test_schema();
        let params = ListParams {
            specs_dir: None,
            status: None,
            tags: Some(vec!["rust".into(), "cli".into()]),
            priority: None,
            assignee: None,
            compact: false,
            hierarchy: false,
            output_format: "text".into(),
        };
        let filter = build_list_filter(&params, &schema);
        assert_eq!(
            filter.fields.get("tags"),
            Some(&vec!["rust".into(), "cli".into()])
        );
    }

    #[test]
    fn parent_id_pulls_from_links() {
        let mut doc = SpecDoc {
            id: "001-foo".into(),
            title: "Foo".into(),
            schema_id: "x".into(),
            fields: HashMap::new(),
            links: vec![ItemLink {
                link_type: "parent".into(),
                target_id: "000-root".into(),
                target_title: None,
            }],
            created_at: None,
            updated_at: None,
            url: None,
            raw: None,
        };
        assert_eq!(parent_id(&doc), Some("000-root"));
        doc.links.clear();
        assert_eq!(parent_id(&doc), None);
    }

    #[test]
    fn colorize_status_returns_value_on_unknown_color() {
        let schema = test_schema();
        let s = colorize_status("draft", &schema);
        // no panic, no color applied
        assert!(s.to_string().contains("draft"));
    }

    #[test]
    fn parse_hex_round_trip() {
        assert_eq!(parse_hex("#3b82f6"), Some((0x3b, 0x82, 0xf6)));
        assert_eq!(parse_hex("3b82f6"), Some((0x3b, 0x82, 0xf6)));
        assert_eq!(parse_hex("xyz"), None);
        assert_eq!(parse_hex("#123"), None);
    }
}
