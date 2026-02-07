//! Update command implementation

use colored::Colorize;
use leanspec_core::{
    apply_checklist_toggles, apply_replacements, apply_section_updates, preserve_title_heading,
    rebuild_content, split_frontmatter, ChecklistToggle, CompletionVerifier, FrontmatterParser,
    MatchMode, Replacement, SectionMode, SectionUpdate, SpecLoader, SpecStatus,
};
use std::collections::HashMap;
use std::error::Error;

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
) -> Result<(), Box<dyn Error>> {
    if specs.is_empty() {
        return Err("At least one spec path is required".into());
    }

    let content_ops_present = content_override.is_some()
        || !replacements.is_empty()
        || !check.is_empty()
        || !uncheck.is_empty()
        || section.is_some();
    if status.is_none()
        && priority.is_none()
        && assignee.is_none()
        && add_tags.is_none()
        && remove_tags.is_none()
        && !content_ops_present
    {
        println!("{}", "No updates specified".yellow());
        return Ok(());
    }

    let loader = SpecLoader::new(specs_dir);
    let parser = FrontmatterParser::new();
    let mut updated_count = 0;
    let mut errors = Vec::new();

    for spec in specs {
        let spec_info = match loader.load(spec) {
            Ok(Some(info)) => info,
            Ok(None) => {
                errors.push(format!("Spec not found: {}", spec));
                continue;
            }
            Err(e) => {
                errors.push(format!("Error loading spec {}: {}", spec, e));
                continue;
            }
        };

        // Read current content
        let content = match std::fs::read_to_string(&spec_info.file_path) {
            Ok(c) => c,
            Err(e) => {
                errors.push(format!("Error reading {}: {}", spec_info.path, e));
                continue;
            }
        };

        // Build updates
        let mut updates: HashMap<String, serde_yaml::Value> = HashMap::new();
        let mut fields_updated = Vec::new();

        if let Some(s) = status.as_ref() {
            updates.insert("status".to_string(), serde_yaml::Value::String(s.clone()));
            fields_updated.push(format!("status → {}", s));
        }

        if let Some(p) = priority.as_ref() {
            updates.insert("priority".to_string(), serde_yaml::Value::String(p.clone()));
            fields_updated.push(format!("priority → {}", p));
        }

        if let Some(a) = assignee.as_ref() {
            updates.insert("assignee".to_string(), serde_yaml::Value::String(a.clone()));
            fields_updated.push(format!("assignee → {}", a));
        }

        // Handle tag modifications
        if add_tags.is_some() || remove_tags.is_some() {
            let mut current_tags = spec_info.frontmatter.tags.clone();

            if let Some(tags_to_add) = add_tags.as_ref() {
                for tag in tags_to_add.split(',').map(|s| s.trim()) {
                    if !current_tags.contains(&tag.to_string()) {
                        current_tags.push(tag.to_string());
                        fields_updated.push(format!("+tag: {}", tag));
                    }
                }
            }

            if let Some(tags_to_remove) = remove_tags.as_ref() {
                for tag in tags_to_remove.split(',').map(|s| s.trim()) {
                    if let Some(pos) = current_tags.iter().position(|t| t == tag) {
                        current_tags.remove(pos);
                        fields_updated.push(format!("-tag: {}", tag));
                    }
                }
            }

            let tags_sequence: Vec<serde_yaml::Value> = current_tags
                .iter()
                .map(|t| serde_yaml::Value::String(t.clone()))
                .collect();
            updates.insert(
                "tags".to_string(),
                serde_yaml::Value::Sequence(tags_sequence),
            );
        }

        if updates.is_empty() && !content_ops_present {
            errors.push(format!("No updates specified for {}", spec_info.path));
            continue;
        }

        let (_, body) = match parser.parse(&content) {
            Ok(result) => result,
            Err(e) => {
                errors.push(format!("Error parsing {}: {}", spec_info.path, e));
                continue;
            }
        };
        let (frontmatter, _) = split_frontmatter(&content);

        let mut updated_body = body.clone();
        let mut content_notes = Vec::new();
        let mut checklist_results = Vec::new();

        if let Some(body_override) = content_override.clone() {
            updated_body = preserve_title_heading(&body, &body_override);
            content_notes.push("content replacement".to_string());
        } else {
            let match_mode = if match_all {
                MatchMode::All
            } else if match_first {
                MatchMode::First
            } else {
                MatchMode::Unique
            };

            let replacements = parse_replacements(&replacements, match_mode)?;
            if !replacements.is_empty() {
                let (new_body, results) = apply_replacements(&updated_body, &replacements)?;
                updated_body = new_body;
                content_notes.push(format!("replacements: {}", results.len()));
            }

            let section_update = parse_section_update(
                section.as_deref(),
                section_content.as_deref(),
                append.as_deref(),
                prepend.as_deref(),
            )?;
            if let Some(update) = section_update {
                updated_body = apply_section_updates(&updated_body, &[update])?;
                content_notes.push("section update: 1".to_string());
            }

            let checklist_toggles = parse_checklist_toggles(&check, &uncheck);
            if !checklist_toggles.is_empty() {
                let (new_body, results) =
                    apply_checklist_toggles(&updated_body, &checklist_toggles)?;
                updated_body = new_body;
                checklist_results = results;
                content_notes.push(format!("checklist toggles: {}", checklist_results.len()));
            }
        }

        let mut new_content = rebuild_content(frontmatter, &updated_body);
        if !updates.is_empty() {
            new_content = match parser.update_frontmatter(&new_content, &updates) {
                Ok(c) => c,
                Err(e) => {
                    errors.push(format!("Error updating {}: {}", spec_info.path, e));
                    continue;
                }
            };
        }

        if let Some(new_status) = status.as_deref() {
            let current_status = spec_info.frontmatter.status;
            if current_status == SpecStatus::Draft
                && (new_status == "in-progress" || new_status == "complete")
                && !force
            {
                errors.push(format!(
                    "Cannot skip 'planned' stage from draft for {}. Use --force to override.",
                    spec_info.path
                ));
                continue;
            }
            if new_status == "complete" && !force {
                let verification = match CompletionVerifier::verify_content(&new_content) {
                    Ok(result) => result,
                    Err(e) => {
                        errors.push(format!("Error verifying {}: {}", spec_info.path, e));
                        continue;
                    }
                };

                if !verification.is_complete {
                    println!(
                        "\n{} Spec has {} outstanding checklist items:\n",
                        "⚠️".yellow(),
                        verification.outstanding.len()
                    );

                    let mut by_section: HashMap<String, Vec<_>> = HashMap::new();
                    for item in &verification.outstanding {
                        let section = item.section.clone().unwrap_or_else(|| "Other".to_string());
                        by_section.entry(section).or_default().push(item);
                    }

                    for (section, items) in &by_section {
                        println!("  {} (line {})", section.bold(), items[0].line);
                        for item in items {
                            println!("    {} [ ] {}", "•".dimmed(), item.text);
                        }
                        println!();
                    }

                    println!(
                        "  {}: {}",
                        "Progress".dimmed(),
                        verification.progress.to_string().dimmed()
                    );
                    println!();
                    println!("{}", "Suggestions:".cyan());
                    for suggestion in &verification.suggestions {
                        println!("  • {}", suggestion);
                    }
                    println!();
                    println!("Use {} to mark complete anyway.", "--force".yellow());

                    errors.push(format!(
                        "{} has outstanding checklist items",
                        spec_info.path
                    ));
                    continue;
                }

                let all_specs = loader.load_all()?;
                let umbrella_verification =
                    CompletionVerifier::verify_umbrella_completion(&spec_info.path, &all_specs);

                if !umbrella_verification.is_complete {
                    println!(
                        "\n{} Umbrella spec has {} incomplete child spec(s):\n",
                        "⚠️".yellow(),
                        umbrella_verification.incomplete_children.len()
                    );

                    for child in &umbrella_verification.incomplete_children {
                        println!(
                            "  {} {} ({})",
                            "•".dimmed(),
                            child.path,
                            child.status.yellow()
                        );
                    }

                    println!();
                    println!(
                        "  {}: {}",
                        "Progress".dimmed(),
                        umbrella_verification.progress.to_string().dimmed()
                    );
                    println!();
                    println!("{}", "Suggestions:".cyan());
                    for suggestion in &umbrella_verification.suggestions {
                        println!("  • {}", suggestion);
                    }
                    println!();
                    println!("Use {} to mark complete anyway.", "--force".yellow());

                    errors.push(format!("{} has incomplete child specs", spec_info.path));
                    continue;
                }
            }
        }

        if let Err(e) = std::fs::write(&spec_info.file_path, &new_content) {
            errors.push(format!("Error writing {}: {}", spec_info.path, e));
            continue;
        }

        println!("{} {}", "✓".green(), "Updated:".green());
        println!("  {}", spec_info.path);

        let mut summary_parts = fields_updated.clone();
        summary_parts.extend(content_notes);
        if !summary_parts.is_empty() {
            println!("  {}: {}", "Fields".bold(), summary_parts.join(", "));
        }

        if !checklist_results.is_empty() {
            println!("  {}:", "Checklist".bold());
            for item in checklist_results {
                println!(
                    "    {} line {}: {}",
                    "•".dimmed(),
                    item.line,
                    item.line_text.trim()
                );
            }
        }

        updated_count += 1;
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
        updated_count,
        errors.len()
    );

    if !errors.is_empty() {
        return Err(format!("Failed to update {} spec(s)", errors.len()).into());
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

    let mut replacements = Vec::new();
    for pair in values.chunks(2) {
        let old_string = pair[0].clone();
        let new_string = pair[1].clone();
        replacements.push(Replacement {
            old_string,
            new_string,
            match_mode,
        });
    }

    Ok(replacements)
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

    let (mode, content) = if let Some(content) = section_content {
        (SectionMode::Replace, content)
    } else if let Some(content) = append {
        (SectionMode::Append, content)
    } else if let Some(content) = prepend {
        (SectionMode::Prepend, content)
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
