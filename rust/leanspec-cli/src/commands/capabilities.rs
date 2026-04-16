//! `capabilities` command — introspect the active adapter.
//!
//! Agents should call this at session start to discover the active adapter's
//! metadata vocabulary: which fields exist, what values they accept, which
//! semantic roles they fill. The returned JSON is the source of truth for
//! building adapter-aware workflows — there's no hard-coded `draft`, `planned`,
//! `in-progress`, etc. baked into the CLI any more.

use colored::Colorize;
use leanspec_core::adapters::{AdapterConfig, AdapterRegistry, MetadataKind, SemanticHint};
use std::error::Error;

pub struct CapabilitiesParams {
    /// Specs directory override from `--specs-dir`. If the user didn't pass one
    /// we let the project's adapter configuration decide — that way the active
    /// adapter (markdown / github / ado / …) is whatever the project declared.
    pub specs_dir: Option<String>,
    pub output_format: String,
}

pub fn run(params: CapabilitiesParams) -> Result<(), Box<dyn Error>> {
    // Resolve the adapter. An explicit `--specs-dir` overrides project config
    // and forces a markdown adapter pointed at that directory; otherwise we
    // consult `AdapterRegistry::from_project()` which reads
    // `leanspec.adapter.yaml` / `.lean-spec/adapter.yaml` (with legacy
    // `provider:` fallbacks) and defaults to markdown at `specs/`.
    let adapter = match params.specs_dir.as_deref() {
        Some(dir) => {
            let config = AdapterConfig::Markdown {
                directory: dir.to_string(),
            };
            AdapterRegistry::create(&config)?
        }
        None => AdapterRegistry::from_project()?,
    };
    let caps = adapter.capabilities();

    if params.output_format == "json" {
        println!("{}", serde_json::to_string_pretty(caps)?);
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
    println!();
    println!("{}", "Metadata fields:".bold());
    for field in &caps.metadata_fields {
        let semantic = match field.semantic {
            Some(SemanticHint::Status) => "  (status)".yellow().to_string(),
            Some(SemanticHint::Priority) => "  (priority)".yellow().to_string(),
            Some(SemanticHint::Tags) => "  (tags)".yellow().to_string(),
            Some(SemanticHint::Assignee) => "  (assignee)".yellow().to_string(),
            Some(SemanticHint::DueDate) => "  (due_date)".yellow().to_string(),
            None => String::new(),
        };
        let kind = match &field.kind {
            MetadataKind::Text => "text".to_string(),
            MetadataKind::Enum { values } => format!("enum [{}]", values.join(", ")),
            MetadataKind::StringList => "string_list".to_string(),
            MetadataKind::Bool => "bool".to_string(),
            MetadataKind::Number => "number".to_string(),
            MetadataKind::Timestamp => "timestamp".to_string(),
        };
        let required = if field.required { " *required*" } else { "" };
        println!(
            "  {:<12} {} — {}{}{}",
            field.key.cyan(),
            field.label,
            kind,
            required,
            semantic
        );
    }
    println!();
    println!("{} {}", "Link types:".bold(), caps.link_types.join(", "));

    Ok(())
}

fn yesno(b: bool) -> colored::ColoredString {
    if b {
        "yes".green()
    } else {
        "no".red()
    }
}
