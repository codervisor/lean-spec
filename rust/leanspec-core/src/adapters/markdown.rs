//! Markdown adapter — the reference [`Adapter`] implementation.
//!
//! Wraps the existing [`SpecLoader`], [`SpecWriter`], and [`SpecArchiver`] to
//! speak the [`Adapter`] trait, mapping each spec's YAML frontmatter onto the
//! platform-native [`SpecItem`] shape.
//!
//! The markdown vocabulary (`status` = draft/planned/in-progress/complete/
//! archived, `priority` = low/medium/high/critical, tags, depends_on, parent,
//! assignee, …) is declared via [`AdapterCapabilities`] rather than baked into
//! the core types — that separation is the whole point of the pivot described
//! in <https://github.com/codervisor/lean-spec/issues/168>.

use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::str::FromStr;

use super::{
    Adapter, AdapterCapabilities, AdapterError, CreateRequest, ItemLink, ListFilter,
    MetadataFieldSpec, MetadataKind, MetadataValue, SearchHit, SearchOptions, SemanticHint,
    SpecItem, UpdateRequest,
};
use crate::search::{search_specs_with_options, SearchOptions as LegacySearchOptions};
use crate::spec_ops::{MetadataUpdate, SpecArchiver, SpecLoader, SpecWriter};
use crate::types::{SpecFrontmatter, SpecInfo, SpecPriority, SpecStatus};

/// Metadata field keys declared by the markdown adapter. These are the literal
/// keys callers will see in [`SpecItem::metadata`].
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
    pub const UPDATED: &str = "updated";
    pub const COMPLETED: &str = "completed";
}

/// Link types declared by the markdown adapter.
pub mod link {
    pub const PARENT: &str = "parent";
    pub const CHILD: &str = "child";
    pub const DEPENDS_ON: &str = "depends_on";
}

/// The markdown status values, in lifecycle order.
pub const STATUS_VALUES: &[&str] = &["draft", "planned", "in-progress", "complete", "archived"];

/// The markdown priority values, low → critical.
pub const PRIORITY_VALUES: &[&str] = &["low", "medium", "high", "critical"];

/// [`Adapter`] over a local `specs/` directory of markdown files.
pub struct MarkdownAdapter {
    specs_dir: PathBuf,
    capabilities: AdapterCapabilities,
}

impl MarkdownAdapter {
    /// Construct a markdown adapter rooted at `specs_dir`.
    pub fn new<P: AsRef<Path>>(specs_dir: P) -> Self {
        let specs_dir = specs_dir.as_ref().to_path_buf();
        Self {
            specs_dir,
            capabilities: build_capabilities(),
        }
    }

    /// The directory the adapter writes into.
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
        let max_num = specs.iter().filter_map(|s| s.number()).max().unwrap_or(0);
        Ok(max_num + 1)
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
        metadata_fields: vec![
            MetadataFieldSpec {
                key: field::STATUS.into(),
                label: "Status".into(),
                kind: MetadataKind::Enum {
                    values: STATUS_VALUES.iter().map(|s| s.to_string()).collect(),
                },
                required: true,
                semantic: Some(SemanticHint::Status),
            },
            MetadataFieldSpec {
                key: field::PRIORITY.into(),
                label: "Priority".into(),
                kind: MetadataKind::Enum {
                    values: PRIORITY_VALUES.iter().map(|s| s.to_string()).collect(),
                },
                required: false,
                semantic: Some(SemanticHint::Priority),
            },
            MetadataFieldSpec {
                key: field::TAGS.into(),
                label: "Tags".into(),
                kind: MetadataKind::StringList,
                required: false,
                semantic: Some(SemanticHint::Tags),
            },
            MetadataFieldSpec {
                key: field::ASSIGNEE.into(),
                label: "Assignee".into(),
                kind: MetadataKind::Text,
                required: false,
                semantic: Some(SemanticHint::Assignee),
            },
            MetadataFieldSpec {
                key: field::REVIEWER.into(),
                label: "Reviewer".into(),
                kind: MetadataKind::Text,
                required: false,
                semantic: None,
            },
            MetadataFieldSpec {
                key: field::ISSUE.into(),
                label: "Linked issue".into(),
                kind: MetadataKind::Text,
                required: false,
                semantic: None,
            },
            MetadataFieldSpec {
                key: field::PR.into(),
                label: "Linked PR".into(),
                kind: MetadataKind::Text,
                required: false,
                semantic: None,
            },
            MetadataFieldSpec {
                key: field::EPIC.into(),
                label: "Epic".into(),
                kind: MetadataKind::Text,
                required: false,
                semantic: None,
            },
            MetadataFieldSpec {
                key: field::BREAKING.into(),
                label: "Breaking change".into(),
                kind: MetadataKind::Bool,
                required: false,
                semantic: None,
            },
            MetadataFieldSpec {
                key: field::DUE.into(),
                label: "Due date".into(),
                kind: MetadataKind::Text,
                required: false,
                semantic: Some(SemanticHint::DueDate),
            },
            MetadataFieldSpec {
                key: field::CREATED.into(),
                label: "Created".into(),
                kind: MetadataKind::Text,
                required: true,
                semantic: None,
            },
            MetadataFieldSpec {
                key: field::UPDATED.into(),
                label: "Updated".into(),
                kind: MetadataKind::Timestamp,
                required: false,
                semantic: None,
            },
            MetadataFieldSpec {
                key: field::COMPLETED.into(),
                label: "Completed".into(),
                kind: MetadataKind::Timestamp,
                required: false,
                semantic: None,
            },
        ],
        link_types: vec![
            link::PARENT.into(),
            link::CHILD.into(),
            link::DEPENDS_ON.into(),
        ],
    }
}

/// Project a [`SpecInfo`] (internal markdown type) into a [`SpecItem`]
/// (adapter-neutral type).
pub fn spec_info_to_item(info: &SpecInfo) -> SpecItem {
    let fm = &info.frontmatter;
    let mut metadata: HashMap<String, MetadataValue> = HashMap::new();

    metadata.insert(
        field::STATUS.into(),
        MetadataValue::from(fm.status.to_string()),
    );
    if let Some(p) = fm.priority {
        metadata.insert(field::PRIORITY.into(), MetadataValue::from(p.to_string()));
    }
    if !fm.tags.is_empty() {
        metadata.insert(field::TAGS.into(), MetadataValue::from(fm.tags.clone()));
    }
    if let Some(ref a) = fm.assignee {
        metadata.insert(field::ASSIGNEE.into(), MetadataValue::from(a.clone()));
    }
    if let Some(ref r) = fm.reviewer {
        metadata.insert(field::REVIEWER.into(), MetadataValue::from(r.clone()));
    }
    if let Some(ref i) = fm.issue {
        metadata.insert(field::ISSUE.into(), MetadataValue::from(i.clone()));
    }
    if let Some(ref p) = fm.pr {
        metadata.insert(field::PR.into(), MetadataValue::from(p.clone()));
    }
    if let Some(ref e) = fm.epic {
        metadata.insert(field::EPIC.into(), MetadataValue::from(e.clone()));
    }
    if let Some(b) = fm.breaking {
        metadata.insert(field::BREAKING.into(), MetadataValue::from(b));
    }
    if let Some(ref d) = fm.due {
        metadata.insert(field::DUE.into(), MetadataValue::from(d.clone()));
    }
    metadata.insert(
        field::CREATED.into(),
        MetadataValue::from(fm.created.clone()),
    );
    if let Some(u) = fm.updated_at {
        metadata.insert(field::UPDATED.into(), MetadataValue::from(u));
    }
    if let Some(c) = fm.completed_at {
        metadata.insert(field::COMPLETED.into(), MetadataValue::from(c));
    }

    let mut links: Vec<ItemLink> = Vec::new();
    if let Some(ref parent) = fm.parent {
        links.push(ItemLink {
            link_type: link::PARENT.into(),
            target_id: parent.clone(),
        });
    }
    for dep in &fm.depends_on {
        links.push(ItemLink {
            link_type: link::DEPENDS_ON.into(),
            target_id: dep.clone(),
        });
    }

    SpecItem {
        id: info.path.clone(),
        title: info.title.clone(),
        body: info.content.clone(),
        url: None,
        created_at: fm.created_at,
        updated_at: fm.updated_at,
        metadata,
        links,
        raw: None,
    }
}

/// Turn metadata/link payloads from a [`CreateRequest`] into a concrete
/// [`SpecFrontmatter`] for writing to disk.
fn metadata_to_frontmatter(
    metadata: &HashMap<String, MetadataValue>,
    links: &[ItemLink],
) -> Result<SpecFrontmatter, AdapterError> {
    let status_str = metadata
        .get(field::STATUS)
        .and_then(|v| v.as_str())
        .unwrap_or("draft");
    let status = SpecStatus::from_str(status_str).map_err(|e| AdapterError::InvalidMetadata {
        adapter: "markdown".into(),
        reason: e,
    })?;

    let created = metadata
        .get(field::CREATED)
        .and_then(|v| v.as_str())
        .map(|s| s.to_string())
        .unwrap_or_else(|| chrono::Utc::now().format("%Y-%m-%d").to_string());

    let priority = match metadata.get(field::PRIORITY).and_then(|v| v.as_str()) {
        Some(p) => Some(
            SpecPriority::from_str(p).map_err(|e| AdapterError::InvalidMetadata {
                adapter: "markdown".into(),
                reason: e,
            })?,
        ),
        None => None,
    };

    let tags = metadata
        .get(field::TAGS)
        .and_then(|v| v.as_string_list())
        .map(|s| s.to_vec())
        .unwrap_or_default();

    let assignee = metadata
        .get(field::ASSIGNEE)
        .and_then(|v| v.as_str())
        .map(String::from);
    let reviewer = metadata
        .get(field::REVIEWER)
        .and_then(|v| v.as_str())
        .map(String::from);
    let issue = metadata
        .get(field::ISSUE)
        .and_then(|v| v.as_str())
        .map(String::from);
    let pr = metadata
        .get(field::PR)
        .and_then(|v| v.as_str())
        .map(String::from);
    let epic = metadata
        .get(field::EPIC)
        .and_then(|v| v.as_str())
        .map(String::from);
    let breaking = metadata.get(field::BREAKING).and_then(|v| v.as_bool());
    let due = metadata
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
        custom: HashMap::new(),
    })
}

/// Translate an UpdateRequest into the internal MetadataUpdate used by SpecWriter.
fn update_request_to_metadata_update(req: &UpdateRequest) -> Result<MetadataUpdate, AdapterError> {
    let mut update = MetadataUpdate::new();

    if let Some(v) = req.metadata.get(field::STATUS).and_then(|v| v.as_str()) {
        let status = SpecStatus::from_str(v).map_err(|e| AdapterError::InvalidMetadata {
            adapter: "markdown".into(),
            reason: e,
        })?;
        update = update.with_status(status);
    }
    if let Some(v) = req.metadata.get(field::PRIORITY).and_then(|v| v.as_str()) {
        let priority = SpecPriority::from_str(v).map_err(|e| AdapterError::InvalidMetadata {
            adapter: "markdown".into(),
            reason: e,
        })?;
        update = update.with_priority(priority);
    }
    if let Some(list) = req
        .metadata
        .get(field::TAGS)
        .and_then(|v| v.as_string_list())
    {
        update = update.with_tags(list.to_vec());
    }
    if let Some(a) = req.metadata.get(field::ASSIGNEE).and_then(|v| v.as_str()) {
        update = update.with_assignee(a.to_string());
    }

    if let Some(ref links) = req.replace_links {
        let depends: Vec<String> = links
            .iter()
            .filter(|l| l.link_type == link::DEPENDS_ON)
            .map(|l| l.target_id.clone())
            .collect();
        update = update.with_depends_on(depends);

        let parent = links
            .iter()
            .find(|l| l.link_type == link::PARENT)
            .map(|l| l.target_id.clone());
        update = update.with_parent(parent);
    }

    Ok(update)
}

impl Adapter for MarkdownAdapter {
    fn capabilities(&self) -> &AdapterCapabilities {
        &self.capabilities
    }

    fn list(&self, filter: &ListFilter) -> Result<Vec<SpecItem>, AdapterError> {
        let loader = SpecLoader::new(&self.specs_dir);
        let specs = loader.load_all().map_err(|e| AdapterError::ParseError {
            path: self.specs_dir.display().to_string(),
            reason: e.to_string(),
        })?;

        let items = specs.iter().map(spec_info_to_item).collect::<Vec<_>>();
        Ok(apply_list_filter(items, filter))
    }

    fn get(&self, id: &str) -> Result<SpecItem, AdapterError> {
        let loader = SpecLoader::new(&self.specs_dir);
        let info = loader
            .load(id)
            .map_err(|e| AdapterError::ParseError {
                path: id.to_string(),
                reason: e.to_string(),
            })?
            .ok_or_else(|| AdapterError::NotFound(id.to_string()))?;
        Ok(spec_info_to_item(&info))
    }

    fn create(&self, req: &CreateRequest) -> Result<SpecItem, AdapterError> {
        let slug = req.slug.as_deref().unwrap_or(&req.title);
        let slug = slug_sanitize(slug);
        let number = self.next_spec_number()?;
        let dir_name = format!("{:03}-{}", number, slug);

        let frontmatter = metadata_to_frontmatter(&req.metadata, &req.links)?;
        let fm_yaml =
            serde_yaml::to_string(&frontmatter).map_err(|e| AdapterError::ParseError {
                path: dir_name.clone(),
                reason: e.to_string(),
            })?;

        let body = if req.body.trim().is_empty() {
            "## Overview\n\n## Design\n\n## Plan\n\n## Test\n".to_string()
        } else {
            req.body.clone()
        };

        let file_content = format!("---\n{}---\n\n# {}\n\n{}", fm_yaml, req.title, body);

        let loader = SpecLoader::new(&self.specs_dir);
        let info = loader
            .create_spec(&dir_name, &req.title, &file_content)
            .map_err(|e| AdapterError::IoError(std::io::Error::other(e.to_string())))?;
        Ok(spec_info_to_item(&info))
    }

    fn update(&self, id: &str, req: &UpdateRequest) -> Result<SpecItem, AdapterError> {
        let writer = SpecWriter::new(&self.specs_dir);
        let update = update_request_to_metadata_update(req)?;

        writer
            .update_metadata(id, update)
            .map_err(|e| AdapterError::IoError(std::io::Error::other(e.to_string())))?;

        if let Some(ref body) = req.body {
            let loader = SpecLoader::new(&self.specs_dir);
            let spec = loader
                .load(id)
                .map_err(|e| AdapterError::ParseError {
                    path: id.to_string(),
                    reason: e.to_string(),
                })?
                .ok_or_else(|| AdapterError::NotFound(id.to_string()))?;
            let fm_yaml =
                serde_yaml::to_string(&spec.frontmatter).map_err(|e| AdapterError::ParseError {
                    path: id.to_string(),
                    reason: e.to_string(),
                })?;
            let new_content = format!("---\n{}---\n\n{}", fm_yaml, body);
            loader
                .update_spec(&spec.path, &new_content)
                .map_err(|e| AdapterError::IoError(std::io::Error::other(e.to_string())))?;
        }

        self.get(id)
    }

    fn delete(&self, id: &str) -> Result<(), AdapterError> {
        let archiver = SpecArchiver::new(&self.specs_dir);
        archiver
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

fn apply_list_filter(items: Vec<SpecItem>, filter: &ListFilter) -> Vec<SpecItem> {
    items
        .into_iter()
        .filter(|item| {
            for (key, allowed) in &filter.metadata {
                let actual = item.metadata.get(key);
                let ok = match actual {
                    Some(MetadataValue::String(s)) => allowed.iter().any(|a| a == s),
                    Some(MetadataValue::StringList(list)) => {
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
                if !item.title.to_lowercase().contains(&needle)
                    && !item.body.to_lowercase().contains(&needle)
                    && !item.id.to_lowercase().contains(&needle)
                {
                    return false;
                }
            }
            if !filter.include_archived {
                if let Some(MetadataValue::String(s)) = item.metadata.get(field::STATUS) {
                    if s == "archived" {
                        return false;
                    }
                }
            }
            true
        })
        .collect()
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
    fn capabilities_declare_markdown_schema() {
        let tmp = TempDir::new().unwrap();
        let adapter = MarkdownAdapter::new(tmp.path());
        let caps = adapter.capabilities();
        assert_eq!(caps.name, "markdown");
        assert!(caps.supports_create);
        assert_eq!(
            caps.key_for_semantic(SemanticHint::Status),
            Some(field::STATUS)
        );
        assert_eq!(
            caps.key_for_semantic(SemanticHint::Priority),
            Some(field::PRIORITY)
        );
    }

    #[test]
    fn list_projects_metadata_and_filters_archived() {
        let tmp = TempDir::new().unwrap();
        let specs = tmp.path().join("specs");
        std::fs::create_dir_all(&specs).unwrap();
        write_spec(&specs, "001-first", "planned", Some("high"));
        write_spec(&specs, "002-gone", "archived", None);

        let adapter = MarkdownAdapter::new(&specs);
        let items = adapter.list(&ListFilter::default()).unwrap();
        assert_eq!(items.len(), 1);
        let item = &items[0];
        assert_eq!(item.id, "001-first");
        assert_eq!(
            item.metadata.get(field::STATUS).and_then(|v| v.as_str()),
            Some("planned")
        );
        assert_eq!(
            item.metadata.get(field::PRIORITY).and_then(|v| v.as_str()),
            Some("high")
        );

        let with_archived = adapter
            .list(&ListFilter {
                include_archived: true,
                ..Default::default()
            })
            .unwrap();
        assert_eq!(with_archived.len(), 2);
    }

    #[test]
    fn get_returns_matching_item() {
        let tmp = TempDir::new().unwrap();
        let specs = tmp.path().join("specs");
        std::fs::create_dir_all(&specs).unwrap();
        write_spec(&specs, "007-target", "in-progress", None);

        let adapter = MarkdownAdapter::new(&specs);
        let item = adapter.get("007-target").unwrap();
        assert_eq!(item.id, "007-target");
        assert_eq!(item.title, "Test 007-target");
        assert_eq!(
            item.metadata.get(field::STATUS).and_then(|v| v.as_str()),
            Some("in-progress")
        );
    }

    #[test]
    fn get_not_found() {
        let tmp = TempDir::new().unwrap();
        let specs = tmp.path().join("specs");
        std::fs::create_dir_all(&specs).unwrap();
        let adapter = MarkdownAdapter::new(&specs);
        let err = adapter.get("nope").unwrap_err();
        assert!(matches!(err, AdapterError::NotFound(_)));
    }

    #[test]
    fn create_round_trips_metadata_and_links() {
        let tmp = TempDir::new().unwrap();
        let specs = tmp.path().join("specs");
        std::fs::create_dir_all(&specs).unwrap();
        let adapter = MarkdownAdapter::new(&specs);

        let mut md = HashMap::new();
        md.insert(field::STATUS.into(), MetadataValue::from("planned"));
        md.insert(field::PRIORITY.into(), MetadataValue::from("high"));
        md.insert(
            field::TAGS.into(),
            MetadataValue::from(vec!["a".to_string(), "b".to_string()]),
        );
        let req = CreateRequest {
            slug: Some("cool-feature".into()),
            title: "Cool Feature".into(),
            body: "## Overview\n\nDetails.".into(),
            metadata: md,
            links: vec![ItemLink {
                link_type: link::DEPENDS_ON.into(),
                target_id: "001-foundation".into(),
            }],
        };

        let created = adapter.create(&req).unwrap();
        assert!(created.id.contains("cool-feature"));
        assert_eq!(
            created.metadata.get(field::STATUS).and_then(|v| v.as_str()),
            Some("planned")
        );
        assert!(created
            .links
            .iter()
            .any(|l| l.link_type == link::DEPENDS_ON && l.target_id == "001-foundation"));
    }

    #[test]
    fn update_changes_status_and_tags() {
        let tmp = TempDir::new().unwrap();
        let specs = tmp.path().join("specs");
        std::fs::create_dir_all(&specs).unwrap();
        write_spec(&specs, "001-test", "planned", None);

        let adapter = MarkdownAdapter::new(&specs);
        let mut md = HashMap::new();
        md.insert(field::STATUS.into(), MetadataValue::from("in-progress"));
        md.insert(
            field::TAGS.into(),
            MetadataValue::from(vec!["alpha".to_string()]),
        );
        let updated = adapter
            .update(
                "001-test",
                &UpdateRequest {
                    metadata: md,
                    ..Default::default()
                },
            )
            .unwrap();
        assert_eq!(
            updated.metadata.get(field::STATUS).and_then(|v| v.as_str()),
            Some("in-progress")
        );
        assert_eq!(
            updated
                .metadata
                .get(field::TAGS)
                .and_then(|v| v.as_string_list()),
            Some(&["alpha".to_string()][..])
        );
    }

    #[test]
    fn delete_archives() {
        let tmp = TempDir::new().unwrap();
        let specs = tmp.path().join("specs");
        std::fs::create_dir_all(&specs).unwrap();
        write_spec(&specs, "001-test", "planned", None);

        let adapter = MarkdownAdapter::new(&specs);
        adapter.delete("001-test").unwrap();
        let item = adapter.get("001-test").unwrap();
        assert_eq!(
            item.metadata.get(field::STATUS).and_then(|v| v.as_str()),
            Some("archived")
        );
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
