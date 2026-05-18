//! `view` command — adapter-aware spec rendering.
//!
//! Loads a single doc through the active adapter and renders it by walking the
//! adapter's schema: inline fields first as a metadata block, then section
//! fields as full-height bodies, then relationships from `doc.links`.

use chrono::{DateTime, Utc};
use colored::{ColoredString, Colorize};
use leanspec_core::adapters::markdown::MarkdownAdapter;
use leanspec_core::adapters::{Adapter, AdapterRegistry};
use leanspec_core::model::{
    CompletableItem, EnumOption, FieldDef, FieldDisplay, FieldKind, FieldValue, Reference, SpecDoc,
    SpecSchema,
};
use std::collections::HashMap;
use std::error::Error;

pub fn run(
    specs_dir: &str,
    spec: &str,
    raw: bool,
    output_format: &str,
) -> Result<(), Box<dyn Error>> {
    let adapter = resolve_adapter(specs_dir)?;
    let doc = adapter.get(spec)?;
    let schema = adapter.schema();

    match output_format {
        "json" => print_json(&doc, schema)?,
        _ => {
            if raw {
                print_raw(&doc, adapter.as_ref(), specs_dir)?;
            } else {
                render_spec(&doc, schema);
            }
        }
    }

    Ok(())
}

fn resolve_adapter(specs_dir: &str) -> Result<Box<dyn Adapter>, Box<dyn Error>> {
    let config = AdapterRegistry::project_config()?;
    if config.adapter == "markdown" {
        // Respect the explicit specs_dir override for markdown projects so
        // tests and ad-hoc invocations can target alternate directories.
        Ok(Box::new(MarkdownAdapter::new(specs_dir)))
    } else {
        Ok(AdapterRegistry::create(&config)?)
    }
}

/// `--raw` reads the underlying file for markdown adapters; for non-file
/// backends it prints the doc body fields (the closest approximation).
fn print_raw(doc: &SpecDoc, adapter: &dyn Adapter, specs_dir: &str) -> Result<(), Box<dyn Error>> {
    if adapter.capabilities().name == "markdown" {
        // Prefer the adapter-resolved file path from `doc.raw`, which handles
        // nested sub-specs (e.g. `specs/001-parent/002-child/README.md`).
        // Fall back to the legacy `{specs_dir}/{id}/README.md` layout for
        // top-level specs when an older adapter doesn't expose `file_path`.
        let path = doc
            .raw
            .as_ref()
            .and_then(|v| v.get("file_path"))
            .and_then(|v| v.as_str())
            .map(std::path::PathBuf::from)
            .unwrap_or_else(|| {
                std::path::Path::new(specs_dir)
                    .join(&doc.id)
                    .join("README.md")
            });
        let content = std::fs::read_to_string(&path)?;
        println!("{}", content);
    } else {
        // Best-effort raw view: dump section field values.
        for field in adapter.schema().fields.iter() {
            if field.display == FieldDisplay::Section {
                if let Some(value) = doc.fields.get(&field.key) {
                    if let Some(s) = value.as_str() {
                        println!("{}", s);
                    }
                }
            }
        }
    }
    Ok(())
}

fn print_json(doc: &SpecDoc, schema: &SpecSchema) -> Result<(), Box<dyn Error>> {
    let _ = schema;
    println!("{}", serde_json::to_string_pretty(doc)?);
    Ok(())
}

/// Render the spec to stdout in schema-declared field order.
fn render_spec(doc: &SpecDoc, schema: &SpecSchema) {
    println!();
    println!("{}", "═".repeat(60).dimmed());
    println!("{}", doc.title.bold().cyan());
    println!("{}", "═".repeat(60).dimmed());
    println!();

    // Inline metadata block.
    for field in schema
        .fields
        .iter()
        .filter(|f| f.display == FieldDisplay::Inline)
    {
        if let Some(value) = doc.fields.get(&field.key) {
            let rendered = render_inline_value(value, field);
            println!("{}: {}", field.label.bold(), rendered);
        }
    }

    // Relationships block (after inline metadata, before sections).
    let links_by_type = group_links_by_type(doc);
    if !links_by_type.is_empty() {
        println!();
        println!("{}", "Relationships".bold());
        for link_type in &schema.link_types {
            if let Some(targets) = links_by_type.get(link_type.key.as_str()) {
                let labels: Vec<String> = targets
                    .iter()
                    .map(|t| {
                        t.target_title
                            .as_ref()
                            .map(|title| format!("{} ({})", t.target_id, title))
                            .unwrap_or_else(|| t.target_id.clone())
                    })
                    .collect();
                println!("  {}: {}", link_type.label.bold(), labels.join(", "));
            }
        }
        // Surface any link types not declared in the schema as well, so
        // ad-hoc relationships still appear.
        for (key, targets) in &links_by_type {
            if schema.link_types.iter().any(|lt| lt.key.as_str() == *key) {
                continue;
            }
            let labels: Vec<String> = targets.iter().map(|t| t.target_id.clone()).collect();
            println!("  {}: {}", key.bold(), labels.join(", "));
        }
    }

    // Section fields.
    for field in schema
        .fields
        .iter()
        .filter(|f| f.display == FieldDisplay::Section)
    {
        if let Some(value) = doc.fields.get(&field.key) {
            println!();
            println!("{}", "─".repeat(60).dimmed());
            println!("{}", format!("## {}", field.label).bold());
            println!();
            println!("{}", render_section_value(value, field));
        }
    }

    // Footer: id, url, timestamps.
    println!();
    println!("{}", "─".repeat(60).dimmed());
    println!("{}: {}", "ID".dimmed(), doc.id);
    if let Some(url) = &doc.url {
        println!("{}: {}", "URL".dimmed(), url);
    }
    if let Some(ts) = &doc.created_at {
        println!("{}: {}", "Created".dimmed(), format_timestamp(ts));
    }
    if let Some(ts) = &doc.updated_at {
        println!("{}: {}", "Updated".dimmed(), format_timestamp(ts));
    }
}

fn group_links_by_type(doc: &SpecDoc) -> HashMap<&str, Vec<&leanspec_core::model::ItemLink>> {
    let mut out: HashMap<&str, Vec<&leanspec_core::model::ItemLink>> = HashMap::new();
    for link in &doc.links {
        out.entry(link.link_type.as_str()).or_default().push(link);
    }
    out
}

fn render_inline_value(value: &FieldValue, field: &FieldDef) -> String {
    match (&field.kind, value) {
        (FieldKind::Enum { options, multi, .. }, FieldValue::String(s)) => {
            if *multi {
                s.clone()
            } else {
                colorize_enum(s, options).to_string()
            }
        }
        (FieldKind::Enum { options, .. }, FieldValue::Strings(values)) => values
            .iter()
            .map(|v| colorize_enum(v, options).to_string())
            .collect::<Vec<_>>()
            .join(", "),
        (_, FieldValue::Strings(values)) => values.join(", "),
        (FieldKind::Bool, FieldValue::Bool(b)) => {
            if *b {
                "✓".green().to_string()
            } else {
                "✗".red().to_string()
            }
        }
        (FieldKind::Timestamp, FieldValue::Timestamp(t)) => format_timestamp(t),
        (_, FieldValue::String(s)) => s.clone(),
        (_, FieldValue::Number(n)) => n.to_string(),
        (_, FieldValue::Bool(b)) => b.to_string(),
        (_, FieldValue::Timestamp(t)) => format_timestamp(t),
        (_, FieldValue::Checklist(items)) => render_checklist(items),
        (_, FieldValue::References(refs)) => render_references(refs),
    }
}

fn render_section_value(value: &FieldValue, _field: &FieldDef) -> String {
    match value {
        FieldValue::String(s) => s.clone(),
        FieldValue::Strings(values) => values.join("\n"),
        FieldValue::Number(n) => n.to_string(),
        FieldValue::Bool(b) => b.to_string(),
        FieldValue::Timestamp(t) => format_timestamp(t),
        FieldValue::Checklist(items) => render_checklist(items),
        FieldValue::References(refs) => render_references(refs),
    }
}

fn render_checklist(items: &[CompletableItem]) -> String {
    items
        .iter()
        .map(|item| {
            let mark = if item.checked { "[x]" } else { "[ ]" };
            format!("{} {}", mark, item.text)
        })
        .collect::<Vec<_>>()
        .join("\n")
}

fn render_references(refs: &[Reference]) -> String {
    refs.iter()
        .map(|r| match &r.title {
            Some(t) => format!("{} ({})", r.id, t),
            None => r.id.clone(),
        })
        .collect::<Vec<_>>()
        .join(", ")
}

fn colorize_enum(value: &str, options: &[EnumOption]) -> ColoredString {
    if let Some(opt) = options.iter().find(|o| o.value == value) {
        if let Some(hex) = &opt.color {
            if let Some((r, g, b)) = parse_hex(hex) {
                return value.truecolor(r, g, b);
            }
        }
    }
    value.normal()
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

fn format_timestamp(ts: &DateTime<Utc>) -> String {
    ts.format("%Y-%m-%d %H:%M UTC").to_string()
}

#[cfg(test)]
mod tests {
    use super::*;
    use leanspec_core::model::{EnumOption, FieldDef, FieldDisplay, FieldKind, LinkTypeDef};

    fn enum_field(key: &str, label: &str, options: Vec<EnumOption>) -> FieldDef {
        FieldDef {
            key: key.into(),
            label: label.into(),
            kind: FieldKind::Enum {
                options,
                multi: false,
                allow_custom: false,
                dynamic: false,
            },
            display: FieldDisplay::Inline,
            required: false,
            semantic: None,
            ai_hint: None,
            placeholder: None,
        }
    }

    #[test]
    fn render_inline_value_for_enum_returns_value_text() {
        let field = enum_field(
            "status",
            "Status",
            vec![EnumOption::simple("planned", "Planned").with_color("#3b82f6")],
        );
        let v = FieldValue::from("planned");
        let s = render_inline_value(&v, &field);
        assert!(s.contains("planned"));
    }

    #[test]
    fn render_inline_value_for_bool_uses_check_marks() {
        let field = FieldDef {
            key: "breaking".into(),
            label: "Breaking".into(),
            kind: FieldKind::Bool,
            display: FieldDisplay::Inline,
            required: false,
            semantic: None,
            ai_hint: None,
            placeholder: None,
        };
        let true_render = render_inline_value(&FieldValue::from(true), &field);
        assert!(true_render.contains('✓'));
        let false_render = render_inline_value(&FieldValue::from(false), &field);
        assert!(false_render.contains('✗'));
    }

    #[test]
    fn render_checklist_uses_brackets() {
        let items = vec![
            CompletableItem {
                id: None,
                ref_id: None,
                text: "Do thing".into(),
                checked: true,
            },
            CompletableItem::unchecked("Other thing"),
        ];
        let out = render_checklist(&items);
        assert!(out.contains("[x] Do thing"));
        assert!(out.contains("[ ] Other thing"));
    }

    #[test]
    fn group_links_by_type_partitions_links() {
        let doc = SpecDoc {
            id: "001".into(),
            title: "t".into(),
            schema_id: "x".into(),
            fields: HashMap::new(),
            links: vec![
                leanspec_core::model::ItemLink {
                    link_type: "parent".into(),
                    target_id: "000".into(),
                    target_title: None,
                },
                leanspec_core::model::ItemLink {
                    link_type: "depends_on".into(),
                    target_id: "002".into(),
                    target_title: None,
                },
                leanspec_core::model::ItemLink {
                    link_type: "depends_on".into(),
                    target_id: "003".into(),
                    target_title: None,
                },
            ],
            created_at: None,
            updated_at: None,
            url: None,
            raw: None,
        };
        let groups = group_links_by_type(&doc);
        assert_eq!(groups["parent"].len(), 1);
        assert_eq!(groups["depends_on"].len(), 2);
    }

    #[test]
    fn parse_hex_handles_prefix_and_invalid() {
        assert_eq!(parse_hex("#3b82f6"), Some((0x3b, 0x82, 0xf6)));
        assert_eq!(parse_hex("3b82f6"), Some((0x3b, 0x82, 0xf6)));
        assert_eq!(parse_hex("xyz"), None);
        assert_eq!(parse_hex("#123"), None);
    }

    #[test]
    fn link_type_def_unused_is_warning_free() {
        let _ = LinkTypeDef {
            key: "parent".into(),
            label: "Parent".into(),
            inverse_key: None,
            inverse_label: None,
        };
    }
}
