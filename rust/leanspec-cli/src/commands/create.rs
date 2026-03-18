//! Create command implementation

use chrono::Utc;
use colored::Colorize;
use leanspec_core::io::TemplateLoader;
use leanspec_core::types::LeanSpecConfig;
use serde::Deserialize;
use std::collections::HashMap;
use std::error::Error;
use std::fs;
use std::path::{Path, PathBuf};

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

pub struct CreateParams {
    pub specs_dir: String,
    pub name: String,
    pub title: Option<String>,
    pub template: Option<String>,
    pub status: Option<String>,
    pub priority: String,
    pub tags: Option<String>,
    pub parent: Option<String>,
    pub depends_on: Vec<String>,
    pub content: Option<String>,
    pub file: Option<String>,
    pub assignee: Option<String>,
}

/// Strip a leading numeric prefix like "006-" from a spec name.
fn strip_numeric_prefix(name: &str) -> &str {
    if name.len() > 4 && name.as_bytes()[3] == b'-' && name[..3].bytes().all(|b| b.is_ascii_digit())
    {
        &name[4..]
    } else {
        name
    }
}

pub fn run(params: CreateParams) -> Result<(), Box<dyn Error>> {
    let specs_dir = &params.specs_dir;
    let name = &params.name;
    let title = params.title;
    let template = params.template;
    let explicit_status = params.status;
    let explicit_priority = if params.priority == "medium" {
        None // "medium" is the clap default, treat as not explicitly set
    } else {
        Some(params.priority.clone())
    };
    let priority = &params.priority;
    let tags = params.tags;
    let parent = params.parent;
    let depends_on = params.depends_on;
    let content_override = params.content;
    let file_override = params.file;
    let assignee = params.assignee;
    let has_content_source = content_override.is_some() || file_override.is_some();

    // 1. Find project root and load config
    let project_root = find_project_root(specs_dir)?;

    // 2. Resolve status
    let resolved_status = explicit_status
        .clone()
        .unwrap_or_else(|| {
            if is_draft_status_enabled(&project_root) {
                "draft".to_string()
            } else {
                "planned".to_string()
            }
        });

    // 3. Generate spec number
    let next_number = get_next_spec_number(specs_dir)?;
    let name = strip_numeric_prefix(name);
    let spec_name = format!("{:03}-{}", next_number, name);
    let spec_dir = Path::new(specs_dir).join(&spec_name);

    if spec_dir.exists() {
        return Err(format!("Spec directory already exists: {}", spec_dir.display()).into());
    }

    fs::create_dir_all(&spec_dir)?;

    // 4. Generate title and parse tags
    let title = title.unwrap_or_else(|| generate_title(name));
    let tags_vec: Vec<String> = parse_tags(tags);

    // 5. Build final content — two distinct paths:
    //    a) Content/file path: merge_frontmatter (preserves content frontmatter, CLI overrides)
    //    b) Template path: variable substitution (original behavior)
    let content = if has_content_source {
        // Read from file or use --content directly
        let raw_content = if let Some(file_path) = file_override.as_deref() {
            let path = Path::new(file_path);
            if !path.exists() {
                return Err(format!("File not found: {}", file_path).into());
            }
            if path.is_dir() {
                return Err(format!("Path is a directory, not a file: {}", file_path).into());
            }
            fs::read_to_string(path)?
        } else {
            content_override.unwrap()
        };

        let now = Utc::now();
        let created_date = now.format("%Y-%m-%d").to_string();

        let merge_input = MergeFrontmatterInput {
            content: &raw_content,
            title: &title,
            status: explicit_status.as_deref(),
            default_status: &resolved_status,
            priority: explicit_priority.as_deref(),
            default_priority: priority,
            tags: &tags_vec,
            assignee: assignee.as_deref(),
            parent: parent.as_deref(),
            depends_on: &depends_on,
            created_date: &created_date,
            now,
        };
        merge_frontmatter(&merge_input)?
    } else {
        // Template path: load template, substitute variables, apply relationships
        let config = load_config(&project_root)?;
        let template_loader = TemplateLoader::with_config(&project_root, config);
        let template_content = template_loader
            .load(template.as_deref())
            .map_err(|e| format!("Failed to load template: {}", e))?;

        let content = apply_variables(
            &template_content,
            &title,
            &resolved_status,
            priority,
            &tags_vec,
        )?;
        apply_relationships(content, parent.as_deref(), &depends_on)?
    };

    // 7. Write file
    let readme_path = spec_dir.join("README.md");
    fs::write(&readme_path, &content)?;

    // 8. Output success message
    print_success(&SuccessInfo {
        spec_name: &spec_name,
        title: &title,
        status: &resolved_status,
        priority,
        tags: &tags_vec,
        parent: parent.as_deref(),
        depends_on: &depends_on,
        readme_path: &readme_path,
    });

    Ok(())
}

fn apply_variables(
    template: &str,
    title: &str,
    status: &str,
    priority: &str,
    tags: &[String],
) -> Result<String, Box<dyn Error>> {
    let now = Utc::now();
    let created_date = now.format("%Y-%m-%d").to_string();
    let created_at = now.to_rfc3339();

    let mut content = template.to_string();

    // Replace template variables
    content = content.replace("{name}", title);
    content = content.replace("{title}", title);
    content = content.replace("{date}", &created_date);
    content = content.replace("{status}", status);
    content = content.replace("{priority}", priority);

    // Handle frontmatter replacements
    content = content.replace("status: planned", &format!("status: {}", status));
    content = content.replace("priority: medium", &format!("priority: {}", priority));

    // Replace tags in frontmatter
    if !tags.is_empty() {
        let tags_yaml = tags
            .iter()
            .map(|t| format!("  - {}", t))
            .collect::<Vec<_>>()
            .join("\n");
        content = content.replace("tags: []", &format!("tags:\n{}", tags_yaml));
    }

    // Add created_at timestamp to frontmatter
    let frontmatter_end = content.find("---\n\n").ok_or("Invalid template format")?;
    content.insert_str(frontmatter_end, &format!("created_at: '{}'\n", created_at));

    Ok(content)
}

fn apply_relationships(
    content: String,
    parent: Option<&str>,
    depends_on: &[String],
) -> Result<String, Box<dyn Error>> {
    if parent.is_none() && depends_on.is_empty() {
        return Ok(content);
    }

    let mut updates: HashMap<String, serde_yaml::Value> = HashMap::new();

    if let Some(parent_path) = parent {
        updates.insert(
            "parent".to_string(),
            serde_yaml::Value::String(parent_path.to_string()),
        );
    }

    if !depends_on.is_empty() {
        let seq = depends_on
            .iter()
            .map(|d| serde_yaml::Value::String(d.clone()))
            .collect();
        updates.insert("depends_on".to_string(), serde_yaml::Value::Sequence(seq));
    }

    let parser = leanspec_core::FrontmatterParser::new();
    parser
        .update_frontmatter(&content, &updates)
        .map_err(|e| format!("Failed to apply relationships to frontmatter: {}", e).into())
}

/// Ensure required frontmatter fields (`status`, `created`) are present.
/// The FrontmatterParser requires them, but user-provided content often omits them.
/// Missing fields are injected with sensible defaults so the parser succeeds.
fn ensure_required_frontmatter_fields(content: &str, status: &str, created_date: &str) -> String {
    // Only process if content has frontmatter delimiters
    if !content.starts_with("---\n") && !content.starts_with("---\r\n") {
        return content.to_string();
    }

    let end_marker = content[4..].find("\n---");
    if let Some(end_pos) = end_marker {
        let fm_block = &content[4..4 + end_pos];
        let mut to_inject = String::new();

        let has_status = fm_block.contains("\nstatus:") || fm_block.starts_with("status:");
        if !has_status {
            to_inject.push_str(&format!("\nstatus: {}", status));
        }

        let has_created = fm_block.contains("\ncreated:") || fm_block.starts_with("created:");
        if !has_created {
            to_inject.push_str(&format!("\ncreated: '{}'", created_date));
        }

        if !to_inject.is_empty() {
            let insert_pos = 4 + end_pos;
            let mut result = content[..insert_pos].to_string();
            result.push_str(&to_inject);
            result.push_str(&content[insert_pos..]);
            return result;
        }
    }

    content.to_string()
}

struct MergeFrontmatterInput<'a> {
    content: &'a str,
    title: &'a str,
    /// Explicit status from CLI flag (None = not provided, use content's or default)
    status: Option<&'a str>,
    /// Fallback status when content has no frontmatter or no status field
    default_status: &'a str,
    /// Explicit priority from CLI flag (None = not provided, use content's or default)
    priority: Option<&'a str>,
    /// Fallback priority for no-frontmatter path
    default_priority: &'a str,
    tags: &'a [String],
    assignee: Option<&'a str>,
    parent: Option<&'a str>,
    depends_on: &'a [String],
    created_date: &'a str,
    now: chrono::DateTime<Utc>,
}

/// Merge frontmatter into content, mirroring MCP's merge_frontmatter behavior.
///
/// When content already has frontmatter, only explicitly-set CLI flags override.
/// When content has no frontmatter, a default frontmatter block is generated.
fn merge_frontmatter(input: &MergeFrontmatterInput<'_>) -> Result<String, Box<dyn Error>> {
    use leanspec_core::{FrontmatterParser, SpecFrontmatter, SpecPriority, SpecStatus};

    let parser = FrontmatterParser::new();

    // If content has frontmatter but is missing required fields, inject defaults
    // so the parser doesn't reject it. This is common when users/AI pass partial frontmatter.
    let content = ensure_required_frontmatter_fields(
        input.content,
        input.default_status,
        input.created_date,
    );
    let content = content.as_str();

    match parser.parse(content) {
        Ok((mut fm, body)) => {
            // Only override frontmatter fields that were explicitly set via CLI flags
            if let Some(s) = input.status {
                fm.status = s.parse().map_err(|_| format!("Invalid status: {}", s))?;
            }
            if let Some(p) = input.priority {
                fm.priority = Some(
                    p.parse()
                        .map_err(|_| format!("Invalid priority: {}", p))?,
                );
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
            if let Some(a) = input.assignee {
                fm.assignee = Some(a.to_string());
            }
            if let Some(p) = input.parent {
                fm.parent = Some(p.to_string());
            }
            if !input.depends_on.is_empty() {
                fm.depends_on = input.depends_on.to_vec();
            }

            // Ensure H1 title is present
            let trimmed_body = body.trim_start();
            let final_body = if trimmed_body.starts_with("# ") || trimmed_body.starts_with("#\n") {
                body
            } else {
                format!("# {}\n\n{}", input.title, trimmed_body)
            };

            Ok(parser.stringify(&fm, &final_body))
        }
        Err(leanspec_core::parsers::ParseError::NoFrontmatter) => {
            // Build frontmatter from scratch using defaults
            let status_parsed: SpecStatus = input
                .default_status
                .parse()
                .map_err(|_| format!("Invalid status: {}", input.default_status))?;
            let priority_parsed: Option<SpecPriority> = Some(
                input
                    .default_priority
                    .parse()
                    .map_err(|_| format!("Invalid priority: {}", input.default_priority))?,
            );

            let fm = SpecFrontmatter {
                status: status_parsed,
                created: input.created_date.to_string(),
                priority: priority_parsed,
                tags: input.tags.to_vec(),
                depends_on: input.depends_on.to_vec(),
                parent: input.parent.map(String::from),
                assignee: input.assignee.map(String::from),
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

            // Ensure H1 title is present
            let body = content.trim_start();
            let final_body = if body.starts_with("# ") || body.starts_with("#\n") {
                body.to_string()
            } else {
                format!("# {}\n\n{}", input.title, body)
            };

            Ok(parser.stringify(&fm, &final_body))
        }
        Err(e) => Err(format!("Failed to parse content frontmatter: {}", e).into()),
    }
}


fn get_next_spec_number(specs_dir: &str) -> Result<u32, Box<dyn Error>> {
    let specs_path = Path::new(specs_dir);

    if !specs_path.exists() {
        return Ok(1);
    }

    let mut max_number = 0u32;

    for entry in fs::read_dir(specs_path)? {
        let entry = entry?;
        if entry.file_type()?.is_dir() {
            let name = entry.file_name();
            let name_str = name.to_string_lossy();

            // Parse number from start of directory name
            if let Some(num_str) = name_str.split('-').next() {
                if let Ok(num) = num_str.parse::<u32>() {
                    max_number = max_number.max(num);
                }
            }
        }
    }

    Ok(max_number + 1)
}

fn find_project_root(specs_dir: &str) -> Result<PathBuf, Box<dyn Error>> {
    // Walk up from specs_dir to find .lean-spec/
    let specs_path = Path::new(specs_dir).canonicalize().unwrap_or_else(|_| {
        // If specs_dir doesn't exist yet, use current dir
        std::env::current_dir().unwrap_or_else(|_| PathBuf::from("."))
    });
    let mut current = Some(specs_path.as_path());

    while let Some(path) = current {
        if path.join(".lean-spec").exists() {
            return Ok(path.to_path_buf());
        }
        current = path.parent();
    }

    Err("Could not find .lean-spec directory. Run 'lean-spec init' first.".into())
}

fn load_config(project_root: &Path) -> Result<LeanSpecConfig, Box<dyn Error>> {
    // Try to load config.yaml first (new format)
    let yaml_path = project_root.join(".lean-spec/config.yaml");
    if yaml_path.exists() {
        let content = fs::read_to_string(&yaml_path)?;
        return Ok(serde_yaml::from_str(&content)?);
    }

    // Try config.json (legacy format) - parse as JSON and convert
    let json_path = project_root.join(".lean-spec/config.json");
    if json_path.exists() {
        let content = fs::read_to_string(&json_path)?;
        let json_value: serde_json::Value = serde_json::from_str(&content)?;

        // Extract default_template from legacy format
        let default_template = json_value
            .get("templates")
            .and_then(|t| t.get("default"))
            .and_then(|d| d.as_str())
            .or_else(|| json_value.get("template").and_then(|t| t.as_str()))
            .map(String::from);

        // Create LeanSpecConfig with extracted values
        return Ok(LeanSpecConfig {
            default_template,
            ..Default::default()
        });
    }

    // No config found, use defaults
    Ok(LeanSpecConfig::default())
}

fn is_draft_status_enabled(project_root: &Path) -> bool {
    // Try config.yaml first
    let yaml_path = project_root.join(".lean-spec/config.yaml");
    if yaml_path.exists() {
        if let Ok(content) = fs::read_to_string(&yaml_path) {
            if let Ok(config) = serde_yaml::from_str::<ProjectConfig>(&content) {
                return config
                    .draft_status
                    .and_then(|draft| draft.enabled)
                    .unwrap_or(false);
            }
        }
    }

    // Try config.json (legacy format)
    let json_path = project_root.join(".lean-spec/config.json");
    if let Ok(content) = fs::read_to_string(json_path) {
        return serde_json::from_str::<ProjectConfig>(&content)
            .ok()
            .and_then(|config| config.draft_status.and_then(|draft| draft.enabled))
            .unwrap_or(false);
    }

    false
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

fn parse_tags(tags: Option<String>) -> Vec<String> {
    tags.map(|t| t.split(',').map(|s| s.trim().to_string()).collect())
        .unwrap_or_default()
}

struct SuccessInfo<'a> {
    spec_name: &'a str,
    title: &'a str,
    status: &'a str,
    priority: &'a str,
    tags: &'a [String],
    parent: Option<&'a str>,
    depends_on: &'a [String],
    readme_path: &'a Path,
}

fn print_success(info: &SuccessInfo) {
    let SuccessInfo {
        spec_name,
        title,
        status,
        priority,
        tags,
        parent,
        depends_on,
        readme_path,
    } = info;
    println!("{} {}", "✓".green(), "Created spec:".green());
    println!("  {}: {}", "Path".bold(), spec_name);
    println!("  {}: {}", "Title".bold(), title);
    println!("  {}: {}", "Status".bold(), status);
    println!("  {}: {}", "Priority".bold(), priority);
    if !tags.is_empty() {
        println!("  {}: {}", "Tags".bold(), tags.join(", "));
    }
    if let Some(parent_path) = parent {
        println!("  {}: {}", "Parent".bold(), parent_path);
    }
    if !depends_on.is_empty() {
        println!("  {}: {}", "Depends on".bold(), depends_on.join(", "));
    }
    println!("  {}: {}", "File".dimmed(), readme_path.display());
}

#[cfg(test)]
mod tests {
    use super::*;

    fn test_now() -> chrono::DateTime<Utc> {
        chrono::DateTime::parse_from_rfc3339("2025-01-15T12:00:00Z")
            .unwrap()
            .with_timezone(&Utc)
    }

    fn make_input<'a>(
        content: &'a str,
        title: &'a str,
        status: Option<&'a str>,
        priority: Option<&'a str>,
        tags: &'a [String],
        assignee: Option<&'a str>,
    ) -> MergeFrontmatterInput<'a> {
        MergeFrontmatterInput {
            content,
            title,
            status,
            default_status: "planned",
            priority,
            default_priority: "medium",
            tags,
            assignee,
            parent: None,
            depends_on: &[],
            created_date: "2025-01-15",
            now: test_now(),
        }
    }

    #[test]
    fn test_merge_frontmatter_explicit_override() {
        let content = "---\nstatus: draft\npriority: low\ntags: []\n---\n\n# My Feature\n\nBody text.\n";
        let input = make_input(content, "My Feature", Some("planned"), Some("medium"), &[], None);
        let result = merge_frontmatter(&input);
        assert!(result.is_ok(), "should successfully merge: {:?}", result.err());
        let output = result.unwrap();
        assert!(output.contains("status: planned"), "explicit CLI status should override");
        assert!(output.contains("priority: medium"), "explicit CLI priority should override");
        assert!(output.contains("# My Feature"), "should preserve title heading");
        assert!(output.contains("Body text."), "should preserve body");
    }

    #[test]
    fn test_merge_frontmatter_preserves_content_values_when_not_explicit() {
        let content = "---\nstatus: in-progress\npriority: high\ntags: []\n---\n\n# My Feature\n\nBody text.\n";
        // status=None, priority=None => content values preserved
        let input = make_input(content, "My Feature", None, None, &[], None);
        let result = merge_frontmatter(&input);
        assert!(result.is_ok(), "should merge: {:?}", result.err());
        let output = result.unwrap();
        assert!(output.contains("status: in-progress"), "should preserve content status");
        assert!(output.contains("priority: high"), "should preserve content priority");
    }

    #[test]
    fn test_merge_frontmatter_content_without_frontmatter() {
        let content = "# Simple Content\n\nJust body, no frontmatter.";
        let input = make_input(content, "Simple Content", None, None, &[], None);
        let result = merge_frontmatter(&input);
        assert!(result.is_ok(), "should build frontmatter from scratch");
        let output = result.unwrap();
        assert!(output.starts_with("---\n"), "should start with frontmatter");
        assert!(output.contains("status: planned"), "should have default status");
        assert!(output.contains("# Simple Content"), "should preserve content");
    }

    #[test]
    fn test_merge_frontmatter_with_tags() {
        let content = "# Test\n\nBody.";
        let tags = vec!["feature".to_string(), "backend".to_string()];
        let input = make_input(content, "Test", None, None, &tags, None);
        let result = merge_frontmatter(&input);
        assert!(result.is_ok());
        let output = result.unwrap();
        assert!(output.contains("feature"), "should contain first tag");
        assert!(output.contains("backend"), "should contain second tag");
    }

    #[test]
    fn test_merge_frontmatter_with_assignee() {
        let content = "# Test\n\nBody.";
        let input = make_input(content, "Test", None, None, &[], Some("john.doe"));
        let result = merge_frontmatter(&input);
        assert!(result.is_ok());
        let output = result.unwrap();
        assert!(output.contains("assignee: john.doe"), "should have assignee");
    }

    #[test]
    fn test_merge_frontmatter_adds_title_when_missing() {
        let content = "Just body text, no heading.";
        let input = make_input(content, "My Title", None, None, &[], None);
        let result = merge_frontmatter(&input);
        assert!(result.is_ok());
        let output = result.unwrap();
        assert!(output.contains("# My Title"), "should prepend H1 title");
        assert!(output.contains("Just body text"), "should preserve body");
    }

    #[test]
    fn test_generate_title() {
        assert_eq!(generate_title("test-feature"), "Test Feature");
        assert_eq!(generate_title("api-v2"), "Api V2");
        assert_eq!(generate_title("simple"), "Simple");
    }

    #[test]
    fn test_parse_tags() {
        assert_eq!(
            parse_tags(Some("feature,backend".to_string())),
            vec!["feature", "backend"]
        );
        assert_eq!(
            parse_tags(Some("api, v2, test".to_string())),
            vec!["api", "v2", "test"]
        );
        assert_eq!(parse_tags(None), Vec::<String>::new());
    }

    #[test]
    fn test_get_next_spec_number_nonexistent_dir() {
        let result = get_next_spec_number("/nonexistent/path/specs");
        assert!(result.is_ok(), "should succeed for nonexistent dir");
        assert_eq!(result.unwrap(), 1, "should return 1 for new directory");
    }
}
