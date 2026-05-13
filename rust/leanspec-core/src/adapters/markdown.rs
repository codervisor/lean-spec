//! Markdown adapter — the reference [`Adapter`] implementation.
//!
//! Wraps the existing [`SpecLoader`], [`SpecWriter`], and [`SpecArchiver`]
//! to speak the [`Adapter`] trait, mapping each spec's YAML frontmatter and
//! body content onto the [`SpecDoc`] shape with a declared [`SpecSchema`].

use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::str::FromStr;

use super::{Adapter, AdapterCapabilities, AdapterError, ListFilter, SearchHit, SearchOptions};
use crate::model::{
    CreateRequest, EnumOption, FieldDef, FieldDisplay, FieldKind, FieldValue, ItemLink, LinkTypeDef,
    SpecDoc, SpecSchema, UpdateRequest, semantic,
};
use crate::search::{search_specs_with_options, SearchOptions as LegacySearchOptions};
use crate::spec_ops::{MetadataUpdate, SpecArchiver, SpecLoader, SpecWriter};
use crate::types::{SpecFrontmatter, SpecInfo, SpecPriority, SpecStatus};

/// Metadata field keys declared by the markdown adapter schema.
pub mod field {
    pub const STATUS: &str = "status";
    pub const PRIORITY: &str = "priority";
    pub const TAGS: &str = "tags";
    pub const ASSIGNEE: &str = "assignee";
    pub const REVIEWER: &str = "reviewer";
    pub const ISSUE: &str = "issue";
    pub const PR: &str = "pr";
    pub const EPIC: &str = "epic";
    pub const BREAKING: &str = "breaking";
    pub const DUE: &str = "due";
    pub const CREATED: &str = "created";
    pub const CONTENT: &str = "content";
}

/// Link type keys declared by the markdown adapter schema.
pub mod link {
    pub const PARENT: &str = "parent";
    pub const CHILD: &str = "child";
    pub const DEPENDS_ON: &str = "depends_on";
}

/// Stable schema id for the markdown adapter.
pub const SCHEMA_ID: &str = "leanspec:markdown";

fn status_options() -> Vec<EnumOption> {
    vec![
        EnumOption {
            value: "draft".into(),
            label: "Draft".into(),
            color: Some("#6b7280".into()),
            icon: Some("file-text".into()),
            description: Some("Being written".into()),
        },
        EnumOption {
            value: "planned".into(),
            label: "Planned".into(),
            color: Some("#3b82f6".into()),
            icon: Some("calendar".into()),
            description: Some("Approved, not started".into()),
        },
        EnumOption {
            value: "in-progress".into(),
            label: "In Progress".into(),
            color: Some("#f59e0b".into()),
            icon: Some("loader".into()),
            description: Some("Actively being built".into()),
        },
        EnumOption {
            value: "complete".into(),
            label: "Complete".into(),
            color: Some("#10b981".into()),
            icon: Some("check-circle".into()),
            description: Some("Done and verified".into()),
        },
        EnumOption {
            value: "archived".into(),
            label: "Archived".into(),
            color: Some("#9ca3af".into()),
            icon: Some("archive".into()),
            description: Some("No longer active".into()),
        },
    ]
}

fn priority_options() -> Vec<EnumOption> {
    vec![
        EnumOption {
            value: "low".into(),
            label: "Low".into(),
            color: Some("#6b7280".into()),
            icon: None,
            description: None,
        },
        EnumOption {
            value: "medium".into(),
            label: "Medium".into(),
            color: Some("#3b82f6".into()),
            icon: None,
            description: None,
        },
        EnumOption {
            value: "high".into(),
            label: "High".into(),
            color: Some("#f59e0b".into()),
            icon: None,
            description: None,
        },
        EnumOption {
            value: "critical".into(),
            label: "Critical".into(),
            color: Some("#ef4444".into()),
            icon: None,
            description: None,
        },
    ]
}

fn build_schema() -> SpecSchema {
    SpecSchema {
        id: SCHEMA_ID.into(),
        name: "Markdown".into(),
        extends: None,
        fields: vec![
            FieldDef {
                key: field::STATUS.into(),
                label: "Status".into(),
                kind: FieldKind::Enum {
                    options: status_options(),
                    multi: false,
                    allow_custom: false,
                    dynamic: false,
                },
                display: FieldDisplay::Inline,
                required: true,
                semantic: Some(semantic::STATUS.to_string()),
                ai_hint: Some("Current workflow state of this spec".into()),
                placeholder: None,
            },
            FieldDef {
                key: field::PRIORITY.into(),
                label: "Priority".into(),
                kind: FieldKind::Enum {
                    options: priority_options(),
                    multi: false,
                    allow_custom: false,
                    dynamic: false,
                },
                display: FieldDisplay::Inline,
                required: false,
                semantic: Some(semantic::PRIORITY.to_string()),
                ai_hint: None,
                placeholder: None,
            },
            FieldDef {
                key: field::TAGS.into(),
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
            FieldDef {
                key: field::ASSIGNEE.into(),
                label: "Assignee".into(),
                kind: FieldKind::Enum {
                    options: vec![],
                    multi: false,
                    allow_custom: true,
                    dynamic: true,
                },
                display: FieldDisplay::Inline,
                required: false,
                semantic: Some(semantic::ASSIGNEE.to_string()),
                ai_hint: None,
                placeholder: Some("@username".into()),
            },
            FieldDef {
                key: field::REVIEWER.into(),
                label: "Reviewer".into(),
                kind: FieldKind::Enum {
                    options: vec![],
                    multi: false,
                    allow_custom: true,
                    dynamic: true,
                },
                display: FieldDisplay::Inline,
                required: false,
                semantic: Some(semantic::REVIEWER.to_string()),
                ai_hint: None,
                placeholder: Some("@username".into()),
            },
            FieldDef {
                key: field::ISSUE.into(),
                label: "Linked Issue".into(),
                kind: FieldKind::Text,
                display: FieldDisplay::Inline,
                required: false,
                semantic: None,
                ai_hint: None,
                placeholder: Some("#123".into()),
            },
            FieldDef {
                key: field::PR.into(),
                label: "Linked PR".into(),
                kind: FieldKind::Text,
                display: FieldDisplay::Inline,
                required: false,
                semantic: None,
                ai_hint: None,
                placeholder: Some("#456".into()),
            },
            FieldDef {
                key: field::EPIC.into(),
                label: "Epic".into(),
                kind: FieldKind::Text,
                display: FieldDisplay::Inline,
                required: false,
                semantic: None,
                ai_hint: None,
                placeholder: None,
            },
            FieldDef {
                key: field::BREAKING.into(),
                label: "Breaking Change".into(),
                kind: FieldKind::Bool,
                display: FieldDisplay::Inline,
                required: false,
                semantic: None,
                ai_hint: None,
                placeholder: None,
            },
            FieldDef {
                key: field::DUE.into(),
                label: "Due Date".into(),
                kind: FieldKind::Text,
                display: FieldDisplay::Inline,
                required: false,
                semantic: Some(semantic::DUE_DATE.to_string()),
                ai_hint: None,
                placeholder: Some("YYYY-MM-DD".into()),
            },
            FieldDef {
                key: field::CREATED.into(),
                label: "Created".into(),
                kind: FieldKind::Text,
                display: FieldDisplay::Inline,
                required: true,
                semantic: None,
                ai_hint: None,
                placeholder: None,
            },
            FieldDef {
                key: field::CONTENT.into(),
                label: "Content".into(),
                kind: FieldKind::LongText,
                display: FieldDisplay::Section,
                required: false,
                semantic: None,
                ai_hint: Some("Full spec body in markdown format".into()),
                placeholder: None,
            },
        ],
        link_types: vec![
            LinkTypeDef {
                key: link::PARENT.into(),
                label: "Parent".into(),
                inverse_key: Some(link::CHILD.into()),
                inverse_label: Some("Child".into()),
            },
            LinkTypeDef {
                key: link::CHILD.into(),
                label: "Child".into(),
                inverse_key: Some(link::PARENT.into()),
                inverse_label: Some("Parent".into()),
            },
            LinkTypeDef {
                key: link::DEPENDS_ON.into(),
                label: "Depends on".into(),
                inverse_key: Some("blocked_by".into()),
                inverse_label: Some("Blocked by".into()),
            },
        ],
    }
}

fn build_capabilities() -> AdapterCapabilities {
    AdapterCapabilities {
        name: "markdown".into(),
        supports_create: true,
        supports_update: true,
        supports_delete: true,
        supports_search: true,
        supports_webhooks: false,
        default_schema: SCHEMA_ID.into(),
    }
}

/// [`Adapter`] over a local `specs/` directory of markdown files.
pub struct MarkdownAdapter {
    specs_dir: PathBuf,
    capabilities: AdapterCapabilities,
    schema: SpecSchema,
}

impl MarkdownAdapter {
    pub fn new<P: AsRef<Path>>(specs_dir: P) -> Self {
        Self {
            specs_dir: specs_dir.as_ref().to_path_buf(),
            capabilities: build_capabilities(),
            schema: build_schema(),
        }
    }

    pub fn specs_dir(&self) -> &Path {
        &self.specs_dir
    }

    fn next_spec_number(&self) -> Result<u32, AdapterError> {
        let loader = SpecLoader::new(&self.specs_dir);
        let specs = loader
            .load_all_metadata()
            .map_err(|e| AdapterError::ParseError {
                path: self.specs_dir.display().to_string(),
                reason: e.to_string(),
            })?;
        let max = specs.iter().filter_map(|s| s.number()).max().unwrap_or(0);
        Ok(max + 1)
    }
}

/// Project a [`SpecInfo`] (markdown-internal type) into a [`SpecDoc`].
pub fn spec_info_to_doc(info: &SpecInfo) -> SpecDoc {
    let fm = &info.frontmatter;
    let mut fields: HashMap<String, FieldValue> = HashMap::new();

    fields.insert(field::STATUS.into(), FieldValue::String(fm.status.to_string()));
    if let Some(p) = fm.priority {
        fields.insert(field::PRIORITY.into(), FieldValue::String(p.to_string()));
    }
    if !fm.tags.is_empty() {
        fields.insert(field::TAGS.into(), FieldValue::Strings(fm.tags.clone()));
    }
    if let Some(ref a) = fm.assignee {
        fields.insert(field::ASSIGNEE.into(), FieldValue::String(a.clone()));
    }
    if let Some(ref r) = fm.reviewer {
        fields.insert(field::REVIEWER.into(), FieldValue::String(r.clone()));
    }
    if let Some(ref i) = fm.issue {
        fields.insert(field::ISSUE.into(), FieldValue::String(i.clone()));
    }
    if let Some(ref p) = fm.pr {
        fields.insert(field::PR.into(), FieldValue::String(p.clone()));
    }
    if let Some(ref e) = fm.epic {
        fields.insert(field::EPIC.into(), FieldValue::String(e.clone()));
    }
    if let Some(b) = fm.breaking {
        fields.insert(field::BREAKING.into(), FieldValue::Bool(b));
    }
    if let Some(ref d) = fm.due {
        fields.insert(field::DUE.into(), FieldValue::String(d.clone()));
    }
    fields.insert(field::CREATED.into(), FieldValue::String(fm.created.clone()));
    if !info.content.is_empty() {
        fields.insert(field::CONTENT.into(), FieldValue::String(info.content.clone()));
    }

    let mut links: Vec<ItemLink> = Vec::new();
    if let Some(ref parent) = fm.parent {
        links.push(ItemLink {
            link_type: link::PARENT.into(),
            target_id: parent.clone(),
            target_title: None,
        });
    }
    for dep in &fm.depends_on {
        links.push(ItemLink {
            link_type: link::DEPENDS_ON.into(),
            target_id: dep.clone(),
            target_title: None,
        });
    }

    SpecDoc {
        id: info.path.clone(),
        title: info.title.clone(),
        schema_id: SCHEMA_ID.into(),
        fields,
        links,
        created_at: fm.created_at,
        updated_at: fm.updated_at,
        url: None,
        raw: None,
    }
}

fn fields_to_frontmatter(
    fields: &HashMap<String, FieldValue>,
    links: &[ItemLink],
) -> Result<SpecFrontmatter, AdapterError> {
    let status_str = fields
        .get(field::STATUS)
        .and_then(|v| v.as_str())
        .unwrap_or("draft");
    let status = SpecStatus::from_str(status_str).map_err(|e| AdapterError::InvalidField {
        adapter: "markdown".into(),
        reason: e,
    })?;

    let created = fields
        .get(field::CREATED)
        .and_then(|v| v.as_str())
        .map(|s| s.to_string())
        .unwrap_or_else(|| chrono::Utc::now().format("%Y-%m-%d").to_string());

    let priority = match fields.get(field::PRIORITY).and_then(|v| v.as_str()) {
        Some(p) => Some(
            SpecPriority::from_str(p).map_err(|e| AdapterError::InvalidField {
                adapter: "markdown".into(),
                reason: e,
            })?,
        ),
        None => None,
    };

    let tags = fields
        .get(field::TAGS)
        .and_then(|v| v.as_strings())
        .map(|s| s.to_vec())
        .unwrap_or_default();

    let assignee = fields
        .get(field::ASSIGNEE)
        .and_then(|v| v.as_str())
        .map(String::from);
    let reviewer = fields
        .get(field::REVIEWER)
        .and_then(|v| v.as_str())
        .map(String::from);
    let issue = fields
        .get(field::ISSUE)
        .and_then(|v| v.as_str())
        .map(String::from);
    let pr = fields
        .get(field::PR)
        .and_then(|v| v.as_str())
        .map(String::from);
    let epic = fields
        .get(field::EPIC)
        .and_then(|v| v.as_str())
        .map(String::from);
    let breaking = fields.get(field::BREAKING).and_then(|v| v.as_bool());
    let due = fields
        .get(field::DUE)
        .and_then(|v| v.as_str())
        .map(String::from);

    let parent = links
        .iter()
        .find(|l| l.link_type == link::PARENT)
        .map(|l| l.target_id.clone());
    let depends_on: Vec<String> = links
        .iter()
        .filter(|l| l.link_type == link::DEPENDS_ON)
        .map(|l| l.target_id.clone())
        .collect();

    Ok(SpecFrontmatter {
        status,
        created,
        priority,
        tags,
        depends_on,
        parent,
        assignee,
        reviewer,
        issue,
        pr,
        epic,
        breaking,
        due,
        updated: None,
        completed: None,
        created_at: None,
        updated_at: None,
        completed_at: None,
        transitions: Vec::new(),
        custom: std::collections::HashMap::new(),
    })
}

fn fields_to_metadata_update(
    fields: &HashMap<String, FieldValue>,
) -> Result<MetadataUpdate, AdapterError> {
    let mut update = MetadataUpdate::new();

    if let Some(FieldValue::String(v)) = fields.get(field::STATUS) {
        let status = SpecStatus::from_str(v).map_err(|e| AdapterError::InvalidField {
            adapter: "markdown".into(),
            reason: e,
        })?;
        update = update.with_status(status);
    }
    if let Some(FieldValue::String(v)) = fields.get(field::PRIORITY) {
        let priority = SpecPriority::from_str(v).map_err(|e| AdapterError::InvalidField {
            adapter: "markdown".into(),
            reason: e,
        })?;
        update = update.with_priority(priority);
    }
    if let Some(FieldValue::Strings(tags)) = fields.get(field::TAGS) {
        update = update.with_tags(tags.clone());
    }
    if let Some(FieldValue::String(a)) = fields.get(field::ASSIGNEE) {
        update = update.with_assignee(a.clone());
    }

    Ok(update)
}

fn reject_unknown_fields(
    fields: &HashMap<String, FieldValue>,
    schema: &SpecSchema,
) -> Result<(), AdapterError> {
    for key in fields.keys() {
        if schema.field(key).is_none() {
            return Err(AdapterError::InvalidField {
                adapter: "markdown".into(),
                reason: format!("unknown field '{}' — check the schema for supported fields", key),
            });
        }
    }
    Ok(())
}

impl Adapter for MarkdownAdapter {
    fn capabilities(&self) -> &AdapterCapabilities {
        &self.capabilities
    }

    fn schema(&self) -> &SpecSchema {
        &self.schema
    }

    fn list(&self, filter: &ListFilter) -> Result<Vec<SpecDoc>, AdapterError> {
        let loader = SpecLoader::new(&self.specs_dir);
        let specs = loader.load_all().map_err(|e| AdapterError::ParseError {
            path: self.specs_dir.display().to_string(),
            reason: e.to_string(),
        })?;
        let docs = specs.iter().map(spec_info_to_doc).collect::<Vec<_>>();
        Ok(apply_list_filter(docs, filter))
    }

    fn get(&self, id: &str) -> Result<SpecDoc, AdapterError> {
        let loader = SpecLoader::new(&self.specs_dir);
        let info = loader
            .load(id)
            .map_err(|e| AdapterError::ParseError {
                path: id.to_string(),
                reason: e.to_string(),
            })?
            .ok_or_else(|| AdapterError::NotFound(id.to_string()))?;
        Ok(spec_info_to_doc(&info))
    }

    fn create(&self, req: &CreateRequest) -> Result<SpecDoc, AdapterError> {
        if let Some(ref id) = req.schema_id {
            if id != SCHEMA_ID {
                return Err(AdapterError::ConfigError(format!(
                    "markdown adapter only supports schema '{}', got '{}'",
                    SCHEMA_ID,
                    id,
                )));
            }
        }

        let slug = req.slug.as_deref().unwrap_or(&req.title);
        let slug = slug_sanitize(slug);
        let number = self.next_spec_number()?;
        let dir_name = format!("{:03}-{}", number, slug);

        let frontmatter = fields_to_frontmatter(&req.fields, &req.links)?;
        let fm_yaml =
            serde_yaml::to_string(&frontmatter).map_err(|e| AdapterError::ParseError {
                path: dir_name.clone(),
                reason: e.to_string(),
            })?;

        let body = req
            .fields
            .get(field::CONTENT)
            .and_then(|v| v.as_str())
            .unwrap_or("## Overview\n\n## Design\n\n## Plan\n\n## Test\n");

        let file_content = format!("---\n{}---\n\n# {}\n\n{}", fm_yaml, req.title, body);

        let loader = SpecLoader::new(&self.specs_dir);
        let info = loader
            .create_spec(&dir_name, &req.title, &file_content)
            .map_err(|e| AdapterError::IoError(std::io::Error::other(e.to_string())))?;
        Ok(spec_info_to_doc(&info))
    }

    fn update(&self, id: &str, req: &UpdateRequest) -> Result<SpecDoc, AdapterError> {
        reject_unknown_fields(&req.fields, &self.schema)?;

        let writer = SpecWriter::new(&self.specs_dir);
        let mut meta_update = fields_to_metadata_update(&req.fields)?;

        // First pass: status/priority/tags/assignee + link rewrites go through
        // SpecWriter so we pick up status-transition tracking and atomic writes.
        if let Some(ref links) = req.replace_links {
            let depends: Vec<String> = links
                .iter()
                .filter(|l| l.link_type == link::DEPENDS_ON)
                .map(|l| l.target_id.clone())
                .collect();
            meta_update = meta_update.with_depends_on(depends);

            let parent = links
                .iter()
                .find(|l| l.link_type == link::PARENT)
                .map(|l| l.target_id.clone());
            meta_update = meta_update.with_parent(parent);
        }

        writer
            .update_metadata(id, meta_update)
            .map_err(|e| AdapterError::IoError(std::io::Error::other(e.to_string())))?;

        // Second pass: title, content body, and extended frontmatter fields
        // (reviewer, issue, pr, epic, breaking, due) rewrite the file directly.
        let loader = SpecLoader::new(&self.specs_dir);
        let spec = loader
            .load(id)
            .map_err(|e| AdapterError::ParseError {
                path: id.to_string(),
                reason: e.to_string(),
            })?
            .ok_or_else(|| AdapterError::NotFound(id.to_string()))?;

        let mut frontmatter = spec.frontmatter.clone();
        let mut mutated = false;

        macro_rules! apply_str_field {
            ($key:expr, $fm_field:expr) => {
                if let Some(v) = req.fields.get($key).and_then(|v| v.as_str()) {
                    $fm_field = optional_string(v);
                    mutated = true;
                }
            };
        }

        apply_str_field!(field::REVIEWER, frontmatter.reviewer);
        apply_str_field!(field::ISSUE, frontmatter.issue);
        apply_str_field!(field::PR, frontmatter.pr);
        apply_str_field!(field::EPIC, frontmatter.epic);
        apply_str_field!(field::DUE, frontmatter.due);

        if let Some(b) = req.fields.get(field::BREAKING).and_then(|v| v.as_bool()) {
            frontmatter.breaking = Some(b);
            mutated = true;
        }

        // Handle explicit field clears.
        for key in &req.clear {
            match key.as_str() {
                field::REVIEWER => {
                    frontmatter.reviewer = None;
                    mutated = true;
                }
                field::ISSUE => {
                    frontmatter.issue = None;
                    mutated = true;
                }
                field::PR => {
                    frontmatter.pr = None;
                    mutated = true;
                }
                field::EPIC => {
                    frontmatter.epic = None;
                    mutated = true;
                }
                field::BREAKING => {
                    frontmatter.breaking = None;
                    mutated = true;
                }
                field::DUE => {
                    frontmatter.due = None;
                    mutated = true;
                }
                _ => {}
            }
        }

        let title_changed = req.title.is_some();
        let content_changed = req.fields.contains_key(field::CONTENT);

        if mutated || title_changed || content_changed {
            let effective_title = req.title.clone().unwrap_or_else(|| spec.title.clone());
            let effective_body = match req.fields.get(field::CONTENT).and_then(|v| v.as_str()) {
                Some(b) => strip_leading_title(b, &effective_title),
                None => spec.content.trim_start_matches('\n').to_string(),
            };

            let fm_yaml =
                serde_yaml::to_string(&frontmatter).map_err(|e| AdapterError::ParseError {
                    path: id.to_string(),
                    reason: e.to_string(),
                })?;
            let new_content = format!(
                "---\n{}---\n\n# {}\n\n{}",
                fm_yaml,
                effective_title,
                effective_body.trim_start_matches('\n'),
            );
            loader
                .update_spec(&spec.path, &new_content)
                .map_err(|e| AdapterError::IoError(std::io::Error::other(e.to_string())))?;
        }

        self.get(id)
    }

    fn delete(&self, id: &str) -> Result<(), AdapterError> {
        SpecArchiver::new(&self.specs_dir)
            .archive(id)
            .map_err(|e| AdapterError::IoError(std::io::Error::other(e.to_string())))
    }

    fn search(&self, query: &str, opts: &SearchOptions) -> Result<Vec<SearchHit>, AdapterError> {
        let loader = SpecLoader::new(&self.specs_dir);
        let specs = loader.load_all().map_err(|e| AdapterError::ParseError {
            path: self.specs_dir.display().to_string(),
            reason: e.to_string(),
        })?;
        let mut legacy_opts = LegacySearchOptions::new();
        if let Some(limit) = opts.limit {
            legacy_opts = legacy_opts.with_limit(limit);
        }
        let hits = search_specs_with_options(&specs, query, legacy_opts);
        Ok(hits
            .into_iter()
            .map(|r| SearchHit {
                id: r.path,
                score: r.score as f32,
                snippet: None,
            })
            .collect())
    }
}

fn apply_list_filter(docs: Vec<SpecDoc>, filter: &ListFilter) -> Vec<SpecDoc> {
    docs.into_iter()
        .filter(|doc| {
            for (key, allowed) in &filter.fields {
                let ok = match doc.fields.get(key) {
                    Some(FieldValue::String(s)) => allowed.iter().any(|a| a == s),
                    Some(FieldValue::Strings(list)) => {
                        list.iter().any(|s| allowed.iter().any(|a| a == s))
                    }
                    _ => false,
                };
                if !ok {
                    return false;
                }
            }
            if let Some(ref text) = filter.text {
                let needle = text.to_lowercase();
                let content = doc
                    .fields
                    .get(field::CONTENT)
                    .and_then(|v| v.as_str())
                    .unwrap_or("");
                if !doc.title.to_lowercase().contains(&needle)
                    && !doc.id.to_lowercase().contains(&needle)
                    && !content.to_lowercase().contains(&needle)
                {
                    return false;
                }
            }
            if !filter.include_archived {
                if let Some(FieldValue::String(s)) = doc.fields.get(field::STATUS) {
                    if s == "archived" {
                        return false;
                    }
                }
            }
            true
        })
        .collect()
}

fn optional_string(s: &str) -> Option<String> {
    if s.trim().is_empty() {
        None
    } else {
        Some(s.to_string())
    }
}

fn strip_leading_title(body: &str, _fallback_title: &str) -> String {
    let trimmed = body.trim_start_matches('\n');
    if let Some(rest) = trimmed.strip_prefix("# ") {
        let remainder = rest.split_once('\n').map(|x| x.1).unwrap_or("");
        remainder.trim_start_matches('\n').to_string()
    } else {
        trimmed.to_string()
    }
}

fn slug_sanitize(s: &str) -> String {
    s.to_lowercase()
        .chars()
        .map(|c| {
            if c.is_ascii_alphanumeric() || c == '-' {
                c
            } else {
                '-'
            }
        })
        .collect::<String>()
        .trim_matches('-')
        .to_string()
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    fn write_spec(dir: &Path, name: &str, status: &str, priority: Option<&str>) {
        let spec_dir = dir.join(name);
        std::fs::create_dir_all(&spec_dir).unwrap();
        let priority_line = priority
            .map(|p| format!("priority: {}\n", p))
            .unwrap_or_default();
        let content = format!(
            "---\nstatus: {status}\ncreated: '2025-01-01'\n{priority_line}---\n\n# Test {name}\n\nBody.\n"
        );
        std::fs::write(spec_dir.join("README.md"), content).unwrap();
    }

    #[test]
    fn schema_declares_all_fields() {
        let tmp = TempDir::new().unwrap();
        let adapter = MarkdownAdapter::new(tmp.path());
        let schema = adapter.schema();
        assert_eq!(schema.id, SCHEMA_ID);
        assert_eq!(schema.key_for_semantic(semantic::STATUS), Some(field::STATUS));
        assert_eq!(schema.key_for_semantic(semantic::PRIORITY), Some(field::PRIORITY));
        assert_eq!(schema.key_for_semantic(semantic::ASSIGNEE), Some(field::ASSIGNEE));
        assert_eq!(schema.key_for_semantic(semantic::DUE_DATE), Some(field::DUE));
    }

    #[test]
    fn list_filters_archived_by_default() {
        let tmp = TempDir::new().unwrap();
        let specs = tmp.path().join("specs");
        std::fs::create_dir_all(&specs).unwrap();
        write_spec(&specs, "001-first", "planned", Some("high"));
        write_spec(&specs, "002-gone", "archived", None);

        let adapter = MarkdownAdapter::new(&specs);
        let docs = adapter.list(&ListFilter::default()).unwrap();
        assert_eq!(docs.len(), 1);
        assert_eq!(docs[0].id, "001-first");
        assert_eq!(docs[0].field_str(field::STATUS), Some("planned"));
        assert_eq!(docs[0].field_str(field::PRIORITY), Some("high"));

        let with_archived = adapter
            .list(&ListFilter {
                include_archived: true,
                ..Default::default()
            })
            .unwrap();
        assert_eq!(with_archived.len(), 2);
    }

    #[test]
    fn get_returns_matching_doc() {
        let tmp = TempDir::new().unwrap();
        let specs = tmp.path().join("specs");
        std::fs::create_dir_all(&specs).unwrap();
        write_spec(&specs, "007-target", "in-progress", None);

        let adapter = MarkdownAdapter::new(&specs);
        let doc = adapter.get("007-target").unwrap();
        assert_eq!(doc.id, "007-target");
        assert_eq!(doc.title, "Test 007-target");
        assert_eq!(doc.field_str(field::STATUS), Some("in-progress"));
    }

    #[test]
    fn get_not_found() {
        let tmp = TempDir::new().unwrap();
        let specs = tmp.path().join("specs");
        std::fs::create_dir_all(&specs).unwrap();
        let adapter = MarkdownAdapter::new(&specs);
        assert!(matches!(adapter.get("nope").unwrap_err(), AdapterError::NotFound(_)));
    }

    #[test]
    fn create_round_trips_fields_and_links() {
        let tmp = TempDir::new().unwrap();
        let specs = tmp.path().join("specs");
        std::fs::create_dir_all(&specs).unwrap();
        let adapter = MarkdownAdapter::new(&specs);

        let mut fields = HashMap::new();
        fields.insert(field::STATUS.into(), FieldValue::from("planned"));
        fields.insert(field::PRIORITY.into(), FieldValue::from("high"));
        fields.insert(
            field::TAGS.into(),
            FieldValue::from(vec!["a".to_string(), "b".to_string()]),
        );

        let doc = adapter
            .create(&CreateRequest {
                slug: Some("cool-feature".into()),
                title: "Cool Feature".into(),
                schema_id: None,
                fields,
                links: vec![ItemLink {
                    link_type: link::DEPENDS_ON.into(),
                    target_id: "001-foundation".into(),
                    target_title: None,
                }],
            })
            .unwrap();

        assert!(doc.id.contains("cool-feature"));
        assert_eq!(doc.field_str(field::STATUS), Some("planned"));
        assert!(doc.links.iter().any(|l| {
            l.link_type == link::DEPENDS_ON && l.target_id == "001-foundation"
        }));
    }

    #[test]
    fn create_rejects_wrong_schema_id() {
        let tmp = TempDir::new().unwrap();
        let specs = tmp.path().join("specs");
        std::fs::create_dir_all(&specs).unwrap();
        let adapter = MarkdownAdapter::new(&specs);

        let err = adapter
            .create(&CreateRequest {
                slug: None,
                title: "Test".into(),
                schema_id: Some("leanspec:github".into()),
                fields: HashMap::new(),
                links: vec![],
            })
            .unwrap_err();
        assert!(matches!(err, AdapterError::ConfigError(_)));
    }

    #[test]
    fn update_changes_status_and_tags() {
        let tmp = TempDir::new().unwrap();
        let specs = tmp.path().join("specs");
        std::fs::create_dir_all(&specs).unwrap();
        write_spec(&specs, "001-test", "planned", None);

        let adapter = MarkdownAdapter::new(&specs);
        let mut fields = HashMap::new();
        fields.insert(field::STATUS.into(), FieldValue::from("in-progress"));
        fields.insert(
            field::TAGS.into(),
            FieldValue::from(vec!["alpha".to_string()]),
        );
        let doc = adapter
            .update(
                "001-test",
                &UpdateRequest {
                    fields,
                    ..Default::default()
                },
            )
            .unwrap();
        assert_eq!(doc.field_str(field::STATUS), Some("in-progress"));
        assert_eq!(
            doc.field(field::TAGS).and_then(|v| v.as_strings()),
            Some(&["alpha".to_string()][..]),
        );
    }

    #[test]
    fn update_rejects_unknown_field() {
        let tmp = TempDir::new().unwrap();
        let specs = tmp.path().join("specs");
        std::fs::create_dir_all(&specs).unwrap();
        write_spec(&specs, "001-test", "planned", None);

        let adapter = MarkdownAdapter::new(&specs);
        let mut fields = HashMap::new();
        fields.insert("totally-fake-key".into(), FieldValue::from("yes"));
        let err = adapter
            .update(
                "001-test",
                &UpdateRequest {
                    fields,
                    ..Default::default()
                },
            )
            .unwrap_err();
        assert!(matches!(err, AdapterError::InvalidField { .. }));
    }

    #[test]
    fn update_writes_extended_frontmatter_fields() {
        let tmp = TempDir::new().unwrap();
        let specs = tmp.path().join("specs");
        std::fs::create_dir_all(&specs).unwrap();
        write_spec(&specs, "001-test", "planned", None);

        let adapter = MarkdownAdapter::new(&specs);
        let mut fields = HashMap::new();
        fields.insert(field::REVIEWER.into(), FieldValue::from("alice"));
        fields.insert(field::ISSUE.into(), FieldValue::from("#42"));
        fields.insert(field::BREAKING.into(), FieldValue::Bool(true));
        fields.insert(field::DUE.into(), FieldValue::from("2026-06-01"));

        let doc = adapter
            .update(
                "001-test",
                &UpdateRequest {
                    fields,
                    ..Default::default()
                },
            )
            .unwrap();
        assert_eq!(doc.field_str(field::REVIEWER), Some("alice"));
        assert_eq!(doc.field_str(field::ISSUE), Some("#42"));
        assert_eq!(doc.field(field::BREAKING).and_then(|v| v.as_bool()), Some(true));
        assert_eq!(doc.field_str(field::DUE), Some("2026-06-01"));
    }

    #[test]
    fn update_content_preserves_title() {
        let tmp = TempDir::new().unwrap();
        let specs = tmp.path().join("specs");
        std::fs::create_dir_all(&specs).unwrap();
        write_spec(&specs, "001-test", "planned", None);

        let adapter = MarkdownAdapter::new(&specs);
        let mut fields = HashMap::new();
        fields.insert(
            field::CONTENT.into(),
            FieldValue::from("## Overview\n\nNew content."),
        );
        let doc = adapter
            .update(
                "001-test",
                &UpdateRequest {
                    fields,
                    ..Default::default()
                },
            )
            .unwrap();
        assert_eq!(doc.title, "Test 001-test");
        assert!(doc.field_str(field::CONTENT).unwrap_or("").contains("## Overview"));
    }

    #[test]
    fn update_renames_via_title() {
        let tmp = TempDir::new().unwrap();
        let specs = tmp.path().join("specs");
        std::fs::create_dir_all(&specs).unwrap();
        write_spec(&specs, "001-test", "planned", None);

        let adapter = MarkdownAdapter::new(&specs);
        let doc = adapter
            .update(
                "001-test",
                &UpdateRequest {
                    title: Some("Renamed Title".into()),
                    ..Default::default()
                },
            )
            .unwrap();
        assert_eq!(doc.title, "Renamed Title");
    }

    #[test]
    fn clear_removes_field() {
        let tmp = TempDir::new().unwrap();
        let specs = tmp.path().join("specs");
        std::fs::create_dir_all(&specs).unwrap();
        write_spec(&specs, "001-test", "planned", None);

        let adapter = MarkdownAdapter::new(&specs);

        // First set a field.
        let mut fields = HashMap::new();
        fields.insert(field::ISSUE.into(), FieldValue::from("#99"));
        adapter
            .update(
                "001-test",
                &UpdateRequest {
                    fields,
                    ..Default::default()
                },
            )
            .unwrap();

        // Then clear it.
        let doc = adapter
            .update(
                "001-test",
                &UpdateRequest {
                    clear: vec![field::ISSUE.into()],
                    ..Default::default()
                },
            )
            .unwrap();
        assert!(doc.field(field::ISSUE).is_none());
    }

    #[test]
    fn delete_archives() {
        let tmp = TempDir::new().unwrap();
        let specs = tmp.path().join("specs");
        std::fs::create_dir_all(&specs).unwrap();
        write_spec(&specs, "001-test", "planned", None);

        let adapter = MarkdownAdapter::new(&specs);
        adapter.delete("001-test").unwrap();
        let doc = adapter.get("001-test").unwrap();
        assert_eq!(doc.field_str(field::STATUS), Some("archived"));
    }

    #[test]
    fn search_finds_by_keyword() {
        let tmp = TempDir::new().unwrap();
        let specs = tmp.path().join("specs");
        std::fs::create_dir_all(&specs).unwrap();
        write_spec(&specs, "001-auth", "planned", None);
        write_spec(&specs, "002-cli", "planned", None);

        let adapter = MarkdownAdapter::new(&specs);
        let hits = adapter
            .search("auth", &SearchOptions::default().with_limit(10))
            .unwrap();
        assert!(hits.iter().any(|h| h.id == "001-auth"));
    }
}
