//! `update` command — adapter-aware metadata and body editing.
//!
//! Each iteration follows the fetch-transform-push pattern: pull the current
//! [`SpecDoc`] from the adapter, apply CLI-flag transforms to a fresh
//! [`UpdateRequest`], and let the adapter persist the result. The body
//! manipulation helpers (`apply_replacements`, `apply_section_updates`,
//! `apply_checklist_toggles`) operate purely on strings so they work for any
//! adapter whose schema exposes a `content` field.

use crate::commands::shared::resolve_adapter;
use colored::Colorize;
use leanspec_core::adapters::Adapter;
use leanspec_core::model::{semantic, FieldKind, FieldValue, SpecDoc, SpecSchema, UpdateRequest};
use leanspec_core::{
    apply_checklist_toggles, apply_replacements, apply_section_updates, hash_content,
    preserve_title_heading, ChecklistToggle, ChecklistToggleResult, CompletionVerifier, MatchMode,
    Replacement, SectionMode, SectionUpdate,
};
use std::collections::HashMap;
use std::error::Error;

const CONTENT_KEY: &str = "content";

#[allow(clippy::too_many_arguments)]
pub fn run(
    specs_dir: &str,
    specs: &[String],
    status: Option<String>,
    priority: Option<String>,
    assignee: Option<String>,
    add_tags: Option<String>,
    remove_tags: Option<String>,
    replacements: Vec<String>,
    match_all: bool,
    match_first: bool,
    check: Vec<String>,
    uncheck: Vec<String>,
    section: Option<String>,
    section_content: Option<String>,
    append: Option<String>,
    prepend: Option<String>,
    content_override: Option<String>,
    force: bool,
    expected_hash: Option<String>,
) -> Result<(), Box<dyn Error>> {
    if specs.is_empty() {
        return Err("At least one spec path is required".into());
    }

    let content_ops_present = content_override.is_some()
        || !replacements.is_empty()
        || !check.is_empty()
        || !uncheck.is_empty()
        || section.is_some();
    let metadata_ops_present = status.is_some()
        || priority.is_some()
        || assignee.is_some()
        || add_tags.is_some()
        || remove_tags.is_some();
    if !metadata_ops_present && !content_ops_present {
        println!("{}", "No updates specified".yellow());
        return Ok(());
    }

    let adapter = resolve_adapter(specs_dir)?;
    let schema = adapter.schema().clone();
    let caps_name = adapter.capabilities().name.clone();

    let match_mode = if match_all {
        MatchMode::All
    } else if match_first {
        MatchMode::First
    } else {
        MatchMode::Unique
    };
    let replacements = parse_replacements(&replacements, match_mode)?;
    let section_update = parse_section_update(
        section.as_deref(),
        section_content.as_deref(),
        append.as_deref(),
        prepend.as_deref(),
    )?;
    let checklist_toggles = parse_checklist_toggles(&check, &uncheck);

    let mut updated = 0;
    let mut errors: Vec<String> = Vec::new();

    for id in specs {
        let doc = match adapter.get(id) {
            Ok(d) => d,
            Err(e) => {
                errors.push(format!("{id}: {e}"));
                continue;
            }
        };

        match update_single(
            adapter.as_ref(),
            &schema,
            &caps_name,
            &doc,
            status.as_deref(),
            priority.as_deref(),
            assignee.as_deref(),
            add_tags.as_deref(),
            remove_tags.as_deref(),
            &replacements,
            section_update.as_ref(),
            &checklist_toggles,
            content_override.as_deref(),
            force,
            expected_hash.as_deref(),
        ) {
            Ok(summary) => {
                println!("{} {}", "✓".green(), "Updated:".green());
                println!("  {}", doc.id);
                if !summary.fields_updated.is_empty() {
                    println!(
                        "  {}: {}",
                        "Fields".bold(),
                        summary.fields_updated.join(", ")
                    );
                }
                if !summary.checklist_results.is_empty() {
                    println!("  {}:", "Checklist".bold());
                    for item in summary.checklist_results {
                        println!(
                            "    {} line {}: {}",
                            "•".dimmed(),
                            item.line,
                            item.line_text.trim()
                        );
                    }
                }
                updated += 1;
            }
            Err(e) => {
                errors.push(format!("{}: {e}", doc.id));
            }
        }
    }

    if !errors.is_empty() {
        println!();
        println!("{} Errors encountered:", "⚠️".yellow());
        for error in &errors {
            println!("  • {}", error);
        }
        println!();
    }

    println!(
        "{} Successfully updated {} spec(s), {} errors",
        "✓".green(),
        updated,
        errors.len()
    );

    if !errors.is_empty() {
        return Err(format!("Failed to update {} spec(s)", errors.len()).into());
    }

    Ok(())
}

struct UpdateSummary {
    fields_updated: Vec<String>,
    checklist_results: Vec<ChecklistToggleResult>,
}

#[allow(clippy::too_many_arguments)]
fn update_single(
    adapter: &dyn Adapter,
    schema: &SpecSchema,
    adapter_name: &str,
    doc: &SpecDoc,
    status: Option<&str>,
    priority: Option<&str>,
    assignee: Option<&str>,
    add_tags: Option<&str>,
    remove_tags: Option<&str>,
    replacements: &[Replacement],
    section_update: Option<&SectionUpdate>,
    checklist_toggles: &[ChecklistToggle],
    content_override: Option<&str>,
    force: bool,
    expected_hash: Option<&str>,
) -> Result<UpdateSummary, Box<dyn Error>> {
    let mut fields: HashMap<String, FieldValue> = HashMap::new();
    let mut fields_updated: Vec<String> = Vec::new();

    // ── metadata: semantic-keyed lookups ────────────────────────────────────
    if let Some(value) = status {
        let key = schema
            .key_for_semantic(semantic::STATUS)
            .ok_or_else(|| unsupported_msg("status", adapter_name))?;
        validate_field_value(key, value, schema)?;
        fields.insert(key.to_string(), FieldValue::from(value.to_string()));
        fields_updated.push(format!("status → {}", value));
    }
    if let Some(value) = priority {
        let key = schema
            .key_for_semantic(semantic::PRIORITY)
            .ok_or_else(|| unsupported_msg("priority", adapter_name))?;
        validate_field_value(key, value, schema)?;
        fields.insert(key.to_string(), FieldValue::from(value.to_string()));
        fields_updated.push(format!("priority → {}", value));
    }
    if let Some(value) = assignee {
        let key = schema
            .key_for_semantic(semantic::ASSIGNEE)
            .ok_or_else(|| unsupported_msg("assignee", adapter_name))?;
        fields.insert(key.to_string(), FieldValue::from(value.to_string()));
        fields_updated.push(format!("assignee → {}", value));
    }

    // ── tag diff ────────────────────────────────────────────────────────────
    if add_tags.is_some() || remove_tags.is_some() {
        let tags_key = schema
            .key_for_semantic(semantic::TAGS)
            .ok_or_else(|| unsupported_msg("tags", adapter_name))?;
        let current = doc
            .fields
            .get(tags_key)
            .and_then(|v| v.as_strings())
            .map(|s| s.to_vec())
            .unwrap_or_default();
        let new_tags = compute_tag_diff(current, add_tags, remove_tags);
        for tag in parse_csv(add_tags) {
            fields_updated.push(format!("+tag: {tag}"));
        }
        for tag in parse_csv(remove_tags) {
            fields_updated.push(format!("-tag: {tag}"));
        }
        fields.insert(tags_key.to_string(), FieldValue::from(new_tags));
    }

    // ── body manipulation ───────────────────────────────────────────────────
    let body_present = doc.fields.get(CONTENT_KEY).and_then(|v| v.as_str());
    let content_ops_present = content_override.is_some()
        || !replacements.is_empty()
        || section_update.is_some()
        || !checklist_toggles.is_empty();

    let mut checklist_results: Vec<ChecklistToggleResult> = Vec::new();

    if content_ops_present {
        let original = body_present.ok_or_else(|| -> Box<dyn Error> {
            format!(
                "this adapter does not expose a `content` body for {}; cannot apply body edits",
                doc.id
            )
            .into()
        })?;

        if let Some(expected) = expected_hash {
            let current_hash = hash_content(original);
            if expected != current_hash {
                return Err(format!(
                    "content hash mismatch (expected {expected}, current {current_hash}). \
                     The spec has been modified since you last read it."
                )
                .into());
            }
        }

        let new_body = if let Some(override_body) = content_override {
            fields_updated.push("content replacement".to_string());
            preserve_title_heading(original, override_body)
        } else {
            let mut working = original.to_string();
            if !replacements.is_empty() {
                let (next, results) = apply_replacements(&working, replacements)?;
                working = next;
                fields_updated.push(format!("replacements: {}", results.len()));
            }
            if let Some(section) = section_update {
                working = apply_section_updates(&working, std::slice::from_ref(section))?;
                fields_updated.push("section update: 1".to_string());
            }
            if !checklist_toggles.is_empty() {
                let (next, results) = apply_checklist_toggles(&working, checklist_toggles)?;
                working = next;
                fields_updated.push(format!("checklist toggles: {}", results.len()));
                checklist_results = results;
            }
            working
        };

        fields.insert(CONTENT_KEY.to_string(), FieldValue::from(new_body));
    } else if let Some(expected) = expected_hash {
        if let Some(original) = body_present {
            let current_hash = hash_content(original);
            if expected != current_hash {
                return Err(format!(
                    "content hash mismatch (expected {expected}, current {current_hash})."
                )
                .into());
            }
        }
    }

    // ── markdown-only completion / transition guards ────────────────────────
    if let Some(new_status) = status {
        if adapter_name == "markdown" {
            enforce_markdown_status_rules(doc, schema, new_status, force, &fields)?;
        }
    }

    let req = UpdateRequest {
        title: None,
        fields,
        clear: Vec::new(),
        replace_links: None,
    };

    adapter.update(&doc.id, &req)?;

    Ok(UpdateSummary {
        fields_updated,
        checklist_results,
    })
}

fn compute_tag_diff(current: Vec<String>, add: Option<&str>, remove: Option<&str>) -> Vec<String> {
    let mut out = current;
    for tag in parse_csv(add) {
        if !out.contains(&tag) {
            out.push(tag);
        }
    }
    if let Some(remove) = remove {
        let to_remove: Vec<String> = parse_csv(Some(remove));
        out.retain(|t| !to_remove.iter().any(|r| r == t));
    }
    out
}

fn parse_csv(input: Option<&str>) -> Vec<String> {
    input
        .map(|s| {
            s.split(',')
                .map(|t| t.trim().to_string())
                .filter(|t| !t.is_empty())
                .collect()
        })
        .unwrap_or_default()
}

fn validate_field_value(key: &str, value: &str, schema: &SpecSchema) -> Result<(), Box<dyn Error>> {
    let Some(field) = schema.field(key) else {
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

fn unsupported_msg(name: &str, adapter_name: &str) -> Box<dyn Error> {
    format!("the '{adapter_name}' adapter has no {name} field; cannot apply --{name}").into()
}

fn enforce_markdown_status_rules(
    doc: &SpecDoc,
    schema: &SpecSchema,
    new_status: &str,
    force: bool,
    pending_fields: &HashMap<String, FieldValue>,
) -> Result<(), Box<dyn Error>> {
    // Look up the status field via the schema's semantic hint rather than the
    // literal `"status"` key — keeps this guard aligned with the semantic-key
    // path used to write the new value above.
    let status_key = schema
        .key_for_semantic(semantic::STATUS)
        .unwrap_or("status");
    let current_status = doc.fields.get(status_key).and_then(|v| v.as_str());

    if current_status == Some("draft")
        && (new_status == "in-progress" || new_status == "complete")
        && !force
    {
        return Err("Cannot skip 'planned' stage from draft. Use --force to override.".into());
    }

    if new_status == "complete" && !force {
        // Use the to-be-written body when running content + status together so
        // the verifier sees the new state, not the pre-update one.
        let body = pending_fields
            .get(CONTENT_KEY)
            .and_then(|v| v.as_str())
            .or_else(|| doc.fields.get(CONTENT_KEY).and_then(|v| v.as_str()))
            .unwrap_or("");
        let full_content = format!("---\nstatus: {new_status}\n---\n\n{body}");
        let verification = CompletionVerifier::verify_content(&full_content)
            .map_err(|e| -> Box<dyn Error> { e.into() })?;
        if !verification.is_complete {
            return Err(format!(
                "spec has {} outstanding checklist item(s). Use --force to mark complete anyway.",
                verification.outstanding.len()
            )
            .into());
        }
    }

    Ok(())
}

fn parse_replacements(
    values: &[String],
    match_mode: MatchMode,
) -> Result<Vec<Replacement>, Box<dyn Error>> {
    if values.is_empty() {
        return Ok(Vec::new());
    }
    if values.len() % 2 != 0 {
        return Err("--replace requires OLD and NEW pairs".into());
    }
    Ok(values
        .chunks(2)
        .map(|pair| Replacement {
            old_string: pair[0].clone(),
            new_string: pair[1].clone(),
            match_mode,
        })
        .collect())
}

fn parse_section_update(
    section: Option<&str>,
    section_content: Option<&str>,
    append: Option<&str>,
    prepend: Option<&str>,
) -> Result<Option<SectionUpdate>, Box<dyn Error>> {
    let Some(section) = section else {
        return Ok(None);
    };
    let (mode, content) = if let Some(c) = section_content {
        (SectionMode::Replace, c)
    } else if let Some(c) = append {
        (SectionMode::Append, c)
    } else if let Some(c) = prepend {
        (SectionMode::Prepend, c)
    } else {
        return Err("--section requires --section-content, --append, or --prepend".into());
    };
    Ok(Some(SectionUpdate {
        section: section.to_string(),
        content: content.to_string(),
        mode,
    }))
}

fn parse_checklist_toggles(check: &[String], uncheck: &[String]) -> Vec<ChecklistToggle> {
    let mut toggles = Vec::new();
    for item in check {
        toggles.push(ChecklistToggle {
            item_text: item.clone(),
            checked: true,
        });
    }
    for item in uncheck {
        toggles.push(ChecklistToggle {
            item_text: item.clone(),
            checked: false,
        });
    }
    toggles
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn compute_tag_diff_adds_and_removes() {
        let current = vec!["api".to_string(), "v2".to_string()];
        let out = compute_tag_diff(current, Some("frontend,api"), Some("v2"));
        assert!(out.contains(&"api".to_string()));
        assert!(out.contains(&"frontend".to_string()));
        assert!(!out.contains(&"v2".to_string()));
    }

    #[test]
    fn compute_tag_diff_dedupes_adds() {
        let current = vec!["api".to_string()];
        let out = compute_tag_diff(current, Some("api,frontend"), None);
        let api_count = out.iter().filter(|t| *t == "api").count();
        assert_eq!(api_count, 1);
    }

    #[test]
    fn parse_replacements_pairs_correctly() {
        let values = vec!["a".into(), "b".into(), "c".into(), "d".into()];
        let r = parse_replacements(&values, MatchMode::Unique).unwrap();
        assert_eq!(r.len(), 2);
        assert_eq!(r[0].old_string, "a");
        assert_eq!(r[1].new_string, "d");
    }

    #[test]
    fn parse_replacements_rejects_odd() {
        let values = vec!["a".into(), "b".into(), "c".into()];
        assert!(parse_replacements(&values, MatchMode::Unique).is_err());
    }

    #[test]
    fn parse_section_update_requires_mode() {
        let r = parse_section_update(Some("Overview"), None, None, None);
        assert!(r.is_err());
    }

    #[test]
    fn parse_section_update_picks_append() {
        let r = parse_section_update(Some("Overview"), None, Some("more"), None)
            .unwrap()
            .unwrap();
        assert!(matches!(r.mode, SectionMode::Append));
    }
}
