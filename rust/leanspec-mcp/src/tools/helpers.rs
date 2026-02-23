//! Helper functions for MCP tools

use chrono::Utc;
use leanspec_core::parsers::ParseError;
use leanspec_core::{
    FrontmatterParser, LeanSpecConfig, SpecFrontmatter, SpecPriority, SpecStatus, TemplateLoader,
};
use serde::Deserialize;
use std::cell::RefCell;
use std::path::{Path, PathBuf};
use std::sync::OnceLock;

thread_local! {
    /// Thread-local specs directory override for tests
    pub(crate) static TEST_SPECS_DIR: RefCell<Option<String>> = const { RefCell::new(None) };
}

/// Set the specs directory for the current thread (used by tests)
pub fn set_test_specs_dir(path: Option<String>) {
    TEST_SPECS_DIR.with(|cell| {
        *cell.borrow_mut() = path;
    });
}

/// Get the specs directory, checking thread-local override first
pub(crate) fn get_specs_dir() -> String {
    TEST_SPECS_DIR
        .with(|cell| cell.borrow().clone())
        .or_else(|| std::env::var("LEANSPEC_SPECS_DIR").ok())
        .unwrap_or_else(|| "specs".to_string())
}

pub(crate) fn get_next_spec_number(specs_dir: &str) -> Result<u32, String> {
    let specs_path = std::path::Path::new(specs_dir);

    if !specs_path.exists() {
        return Ok(1);
    }

    let mut max_number = 0u32;

    for entry in std::fs::read_dir(specs_path).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        if entry.file_type().map_err(|e| e.to_string())?.is_dir() {
            let name = entry.file_name();
            let name_str = name.to_string_lossy();

            if let Some(num_str) = name_str.split('-').next() {
                if let Ok(num) = num_str.parse::<u32>() {
                    max_number = max_number.max(num);
                }
            }
        }
    }

    Ok(max_number + 1)
}

pub(crate) fn resolve_project_root(specs_dir: &str) -> Result<PathBuf, String> {
    let specs_path = Path::new(specs_dir);
    let absolute = if specs_path.is_absolute() {
        specs_path.to_path_buf()
    } else {
        std::env::current_dir()
            .map_err(|e| e.to_string())?
            .join(specs_path)
    };

    Ok(absolute.parent().map(PathBuf::from).unwrap_or(absolute))
}

pub(crate) fn load_config(project_root: &Path) -> LeanSpecConfig {
    let config_path = project_root.join(".lean-spec").join("config.yaml");
    if config_path.exists() {
        LeanSpecConfig::load(&config_path).unwrap_or_default()
    } else {
        LeanSpecConfig::default()
    }
}

#[derive(Debug, Default, Deserialize)]
#[serde(rename_all = "camelCase")]
struct DraftStatusConfig {
    enabled: Option<bool>,
}

#[derive(Debug, Default, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ProjectConfig {
    draft_status: Option<DraftStatusConfig>,
}

pub(crate) fn is_draft_status_enabled(project_root: &Path) -> bool {
    let config_path = project_root.join(".lean-spec").join("config.json");
    let Ok(content) = std::fs::read_to_string(config_path) else {
        return false;
    };

    serde_json::from_str::<ProjectConfig>(&content)
        .ok()
        .and_then(|config| config.draft_status.and_then(|draft| draft.enabled))
        .unwrap_or(false)
}

pub(crate) fn resolve_template_variables(
    template: &str,
    title: &str,
    status: &str,
    priority: Option<&str>,
    created_date: &str,
) -> String {
    let resolved_priority = priority.unwrap_or("medium");
    let mut content = template.to_string();

    for (key, value) in [
        ("name", title),
        ("title", title),
        ("status", status),
        ("priority", resolved_priority),
        ("date", created_date),
        ("created", created_date),
    ] {
        content = content.replace(&format!("{{{{{}}}}}", key), value);
        content = content.replace(&format!("{{{}}}", key), value);
    }

    content
}

pub(crate) struct MergeFrontmatterInput<'a> {
    pub(crate) content: &'a str,
    pub(crate) status: &'a str,
    pub(crate) priority: Option<&'a str>,
    pub(crate) tags: &'a [String],
    pub(crate) created_date: &'a str,
    pub(crate) now: chrono::DateTime<Utc>,
    pub(crate) title: &'a str,
    pub(crate) parent: Option<&'a str>,
    pub(crate) depends_on: &'a [String],
}

pub(crate) fn merge_frontmatter(input: &MergeFrontmatterInput<'_>) -> Result<String, String> {
    let parser = FrontmatterParser::new();
    let status_parsed: SpecStatus = input
        .status
        .parse()
        .map_err(|_| format!("Invalid status: {}", input.status))?;

    let priority_parsed: Option<SpecPriority> = input
        .priority
        .map(|p| p.parse().map_err(|_| format!("Invalid priority: {}", p)))
        .transpose()?;

    match parser.parse(input.content) {
        Ok((mut fm, body)) => {
            fm.status = status_parsed;
            if let Some(p) = priority_parsed {
                fm.priority = Some(p);
            }
            if !input.tags.is_empty() {
                fm.tags = input.tags.to_vec();
            }
            if fm.created.trim().is_empty() {
                fm.created = input.created_date.to_string();
            }
            if fm.created_at.is_none() {
                fm.created_at = Some(input.now);
            }
            fm.updated_at = Some(input.now);
            if let Some(p) = input.parent {
                fm.parent = Some(p.to_string());
            }
            if !input.depends_on.is_empty() {
                fm.depends_on = input.depends_on.to_vec();
            }

            // Ensure H1 title is present in the body
            let trimmed_body = body.trim_start();
            let final_body = if trimmed_body.starts_with("# ") || trimmed_body.starts_with("#\n") {
                body
            } else {
                format!("# {}\n\n{}", input.title, trimmed_body)
            };

            Ok(parser.stringify(&fm, &final_body))
        }
        Err(ParseError::NoFrontmatter) => build_frontmatter_from_scratch(&BuildFrontmatterInput {
            content: input.content,
            status: status_parsed,
            priority: priority_parsed,
            tags: input.tags,
            created_date: input.created_date,
            title: input.title,
            now: input.now,
            parent: input.parent,
            depends_on: input.depends_on,
        }),
        Err(e) => Err(e.to_string()),
    }
}

struct BuildFrontmatterInput<'a> {
    content: &'a str,
    status: SpecStatus,
    priority: Option<SpecPriority>,
    tags: &'a [String],
    created_date: &'a str,
    title: &'a str,
    now: chrono::DateTime<Utc>,
    parent: Option<&'a str>,
    depends_on: &'a [String],
}

fn build_frontmatter_from_scratch(input: &BuildFrontmatterInput<'_>) -> Result<String, String> {
    let frontmatter = SpecFrontmatter {
        status: input.status,
        created: input.created_date.to_string(),
        priority: input.priority,
        tags: input.tags.to_vec(),
        depends_on: input.depends_on.to_vec(),
        parent: input.parent.map(String::from),
        assignee: None,
        reviewer: None,
        issue: None,
        pr: None,
        epic: None,
        breaking: None,
        due: None,
        updated: None,
        completed: None,
        created_at: Some(input.now),
        updated_at: Some(input.now),
        completed_at: None,
        transitions: Vec::new(),
        custom: std::collections::HashMap::new(),
    };

    let parser = FrontmatterParser::new();

    // Ensure H1 title is present in the body
    let body = input.content.trim_start();
    let final_body = if body.starts_with("# ") || body.starts_with("#\n") {
        body.to_string()
    } else {
        format!("# {}\n\n{}", input.title, body)
    };

    Ok(parser.stringify(&frontmatter, &final_body))
}

pub(crate) fn to_title_case(name: &str) -> String {
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

pub(crate) fn create_content_description() -> String {
    // Skip caching when thread-local is set (tests), rebuild description each time
    if TEST_SPECS_DIR.with(|cell| cell.borrow().is_some()) {
        return build_template_body_description().unwrap_or_else(|e| {
            eprintln!(
                "Warning: failed to load spec template for create tool description: {}",
                e
            );
            CREATE_CONTENT_FALLBACK.to_string()
        });
    }

    static DESCRIPTION: OnceLock<String> = OnceLock::new();

    DESCRIPTION
        .get_or_init(|| {
            build_template_body_description().unwrap_or_else(|e| {
                eprintln!(
                    "Warning: failed to load spec template for create tool description: {}",
                    e
                );
                CREATE_CONTENT_FALLBACK.to_string()
            })
        })
        .clone()
}

fn build_template_body_description() -> Result<String, String> {
    let specs_dir = get_specs_dir();
    let project_root = resolve_project_root(&specs_dir)?;
    let config = load_config(&project_root);
    let loader = TemplateLoader::with_config(&project_root, config);
    let template = loader
        .load(None)
        .map_err(|e| format!("Failed to load template: {}", e))?;

    let template_body = extract_template_body(&template);

    Ok(format!(
        "{}{}{}",
        CONTENT_DESCRIPTION_PREFIX, template_body, CONTENT_DESCRIPTION_SUFFIX
    ))
}

fn extract_template_body(template: &str) -> String {
    let parser = FrontmatterParser::new();
    let body = match parser.parse(template) {
        Ok((_, body)) => body,
        Err(_) => template.to_string(),
    };

    let mut lines = body.lines().peekable();
    let skip_empty = |iter: &mut std::iter::Peekable<std::str::Lines<'_>>| {
        while matches!(iter.peek(), Some(line) if line.trim().is_empty()) {
            iter.next();
        }
    };

    skip_empty(&mut lines);

    if matches!(lines.peek(), Some(line) if line.trim_start().starts_with('#')) {
        lines.next();
        skip_empty(&mut lines);
    }

    if matches!(
        lines.peek(),
        Some(line) if line.trim_start().starts_with("> **Status**")
    ) {
        lines.next();
        skip_empty(&mut lines);
    }

    let mut collected = String::with_capacity(body.len());
    for (idx, line) in lines.enumerate() {
        if idx > 0 {
            collected.push('\n');
        }
        collected.push_str(line);
    }

    collected.trim().to_string()
}

const CREATE_CONTENT_FALLBACK: &str =
    "Body content only (markdown sections). Frontmatter and title are auto-generated.";

const CONTENT_DESCRIPTION_PREFIX: &str = "Body content only (markdown sections). DO NOT include frontmatter or title - these are auto-generated from other parameters (name, title, status, priority, tags).\n\nTEMPLATE STRUCTURE (body sections only):\n\n";

const CONTENT_DESCRIPTION_SUFFIX: &str =
    "\n\nKeep specs <2000 tokens optimal, <3500 max. Consider sub-specs (IMPLEMENTATION.md) if >400 lines.";
