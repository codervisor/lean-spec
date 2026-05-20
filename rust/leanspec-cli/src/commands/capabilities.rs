//! `capabilities` command — introspect the active adapter's schema and flags.
//!
//! Agents should call this at session start to discover which fields exist,
//! what values they accept, and which semantic roles they fill. The returned
//! JSON is the source of truth for building adapter-aware workflows.

use colored::Colorize;
use leanspec_core::adapters::{AdapterConfig, AdapterRegistry};
use leanspec_core::model::FieldKind;
use std::error::Error;

pub struct CapabilitiesParams {
    /// Specs directory override from `--specs-dir`. If the user didn't pass one
    /// we let the project's adapter configuration decide.
    pub specs_dir: Option<String>,
    pub output_format: String,
    /// `--refresh`: hint that the caller wants a freshly-enriched schema.
    /// The CLI has no cross-invocation cache so this is informational — the
    /// command already builds an adapter from scratch every call. Kept on
    /// the surface so the flag stays available when long-running modes
    /// (e.g. `leanspec ui --capabilities-stream`) reuse this code.
    pub refresh: bool,
}

pub fn run(params: CapabilitiesParams) -> Result<(), Box<dyn Error>> {
    // Resolve the adapter. An explicit `--specs-dir` overrides project config
    // and forces a markdown adapter pointed at that directory; otherwise we
    // consult `AdapterRegistry::from_project()` which reads
    // `leanspec.adapter.yaml` / `.lean-spec/adapter.yaml` (with legacy
    // `provider:` fallbacks) and defaults to markdown at `specs/`.
    let _ = params.refresh; // see field docs — CLI is single-shot
    let adapter = match params.specs_dir.as_deref() {
        Some(dir) => {
            let config = AdapterConfig {
                adapter: "markdown".into(),
                settings: serde_json::json!({ "directory": dir }),
                schema_id: None,
            };
            AdapterRegistry::create(&config)?
        }
        None => AdapterRegistry::from_project()?,
    };

    let caps = adapter.capabilities();
    let schema = adapter.schema();

    if params.output_format == "json" {
        let out = serde_json::json!({
            "adapter": caps.name,
            "capabilities": caps,
            "schema": schema,
        });
        println!("{}", serde_json::to_string_pretty(&out)?);
        return Ok(());
    }

    println!("{} {}", "Adapter:".bold(), caps.name.cyan());
    println!(
        "  {} create={} update={} delete={} search={} webhooks={}",
        "Operations:".bold(),
        yesno(caps.supports_create),
        yesno(caps.supports_update),
        yesno(caps.supports_delete),
        yesno(caps.supports_search),
        yesno(caps.supports_webhooks),
    );
    println!(
        "  {} {}",
        "Default schema:".bold(),
        caps.default_schema.cyan()
    );
    println!();

    println!("{}", "Fields:".bold());
    for field in &schema.fields {
        let semantic_tag = field
            .semantic
            .as_deref()
            .map(|s| format!("  ({})", s).yellow().to_string())
            .unwrap_or_default();

        let kind = match &field.kind {
            FieldKind::Text => "text".to_string(),
            FieldKind::LongText => "long_text".to_string(),
            FieldKind::Number => "number".to_string(),
            FieldKind::Bool => "bool".to_string(),
            FieldKind::Timestamp => "timestamp".to_string(),
            FieldKind::Enum {
                options,
                multi,
                allow_custom,
                dynamic,
            } => {
                let values: Vec<&str> = options.iter().map(|o| o.value.as_str()).collect();
                let flags = [
                    if *multi { "multi" } else { "" },
                    if *allow_custom { "custom" } else { "" },
                    if *dynamic { "dynamic" } else { "" },
                ]
                .iter()
                .filter(|s| !s.is_empty())
                .cloned()
                .collect::<Vec<_>>()
                .join(",");
                if values.is_empty() {
                    format!("enum [{}]", flags)
                } else {
                    format!(
                        "enum [{}]{}",
                        values.join(", "),
                        if flags.is_empty() {
                            String::new()
                        } else {
                            format!(" ({})", flags)
                        }
                    )
                }
            }
            FieldKind::Checklist { traced } => {
                if *traced {
                    "checklist(traced)".to_string()
                } else {
                    "checklist".to_string()
                }
            }
            FieldKind::References { multi } => {
                if *multi {
                    "references(multi)".to_string()
                } else {
                    "reference".to_string()
                }
            }
        };

        let section_tag = match field.display {
            leanspec_core::model::FieldDisplay::Section => "  [section]".dimmed().to_string(),
            leanspec_core::model::FieldDisplay::Inline => String::new(),
        };
        let required = if field.required { " *required*" } else { "" };
        println!(
            "  {:<14} {} \u{2014} {}{}{}{}",
            field.key.cyan(),
            field.label,
            kind,
            required,
            semantic_tag,
            section_tag,
        );
    }

    if !schema.link_types.is_empty() {
        println!();
        println!("{}", "Link types:".bold());
        for lt in &schema.link_types {
            let inverse = lt
                .inverse_key
                .as_deref()
                .map(|k| format!(" \u{21c4} {}", k).dimmed().to_string())
                .unwrap_or_default();
            println!("  {:<14} {}{}", lt.key.cyan(), lt.label, inverse);
        }
    }

    Ok(())
}

fn yesno(b: bool) -> colored::ColoredString {
    if b {
        "yes".green()
    } else {
        "no".red()
    }
}
