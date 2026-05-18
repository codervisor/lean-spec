//! Spec-related API types for request/response serialization

use chrono::{DateTime, Utc};
use leanspec_core::io::hash_content;
use leanspec_core::{global_token_counter, semantic, FieldValue, SpecDoc, SpecSchema, TokenStatus};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use ts_rs::TS;

/// Markdown adapter field key for the body content.
const FIELD_CONTENT: &str = "content";
/// Markdown adapter link type for parent relationships.
const LINK_PARENT: &str = "parent";
/// Markdown adapter link type for dependency relationships.
const LINK_DEPENDS_ON: &str = "depends_on";

fn doc_field_str<'a>(doc: &'a SpecDoc, key: &str) -> Option<&'a str> {
    doc.fields.get(key)?.as_str()
}

fn doc_field_strings(doc: &SpecDoc, key: &str) -> Vec<String> {
    match doc.fields.get(key) {
        Some(FieldValue::Strings(v)) => v.clone(),
        _ => Vec::new(),
    }
}

fn semantic_str<'a>(doc: &'a SpecDoc, schema: &SpecSchema, semantic: &str) -> Option<&'a str> {
    let key = schema.key_for_semantic(semantic)?;
    doc_field_str(doc, key)
}

fn semantic_strings(doc: &SpecDoc, schema: &SpecSchema, semantic: &str) -> Vec<String> {
    schema
        .key_for_semantic(semantic)
        .map(|key| doc_field_strings(doc, key))
        .unwrap_or_default()
}

fn spec_number_from_id(id: &str) -> Option<u32> {
    id.split('-').next().and_then(|s| s.parse().ok())
}

fn link_targets(doc: &SpecDoc, link_type: &str) -> Vec<String> {
    doc.links
        .iter()
        .filter(|l| l.link_type == link_type)
        .map(|l| l.target_id.clone())
        .collect()
}

fn parent_link(doc: &SpecDoc) -> Option<String> {
    doc.links
        .iter()
        .find(|l| l.link_type == LINK_PARENT)
        .map(|l| l.target_id.clone())
}

/// Lightweight spec for list views
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../../../packages/ui/src/types/generated/")]
#[serde(rename_all = "camelCase")]
pub struct SpecSummary {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub project_id: Option<String>,
    pub id: String,
    pub spec_number: Option<u32>,
    pub spec_name: String,
    pub title: Option<String>,
    pub status: String,
    pub priority: Option<String>,
    pub tags: Vec<String>,
    pub assignee: Option<String>,
    pub created_at: Option<DateTime<Utc>>,
    pub updated_at: Option<DateTime<Utc>>,
    pub completed_at: Option<DateTime<Utc>>,
    pub file_path: String,
    pub depends_on: Vec<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub parent: Option<String>,
    #[serde(default)]
    pub children: Vec<String>,
    #[serde(default)]
    pub required_by: Vec<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub content_hash: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub token_count: Option<usize>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub token_status: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub validation_status: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub relationships: Option<SpecRelationships>,
}

impl SpecSummary {
    /// Build a summary from an adapter document without computing tokens or
    /// validation status — used by list handlers that enrich the result later.
    pub fn from_doc(doc: &SpecDoc, schema: &SpecSchema) -> Self {
        let content = doc_field_str(doc, FIELD_CONTENT).unwrap_or("");
        Self {
            project_id: None,
            id: doc.id.clone(),
            spec_number: spec_number_from_id(&doc.id),
            spec_name: doc.id.clone(),
            title: Some(doc.title.clone()),
            status: semantic_str(doc, schema, semantic::STATUS)
                .unwrap_or("")
                .to_string(),
            priority: semantic_str(doc, schema, semantic::PRIORITY).map(String::from),
            tags: semantic_strings(doc, schema, semantic::TAGS),
            assignee: semantic_str(doc, schema, semantic::ASSIGNEE).map(String::from),
            created_at: doc.created_at,
            updated_at: doc.updated_at,
            completed_at: None,
            file_path: doc.url.clone().unwrap_or_default(),
            depends_on: link_targets(doc, LINK_DEPENDS_ON),
            parent: parent_link(doc),
            children: Vec::new(),
            required_by: Vec::new(),
            content_hash: Some(hash_content(content)),
            token_count: None,
            token_status: None,
            validation_status: None,
            relationships: None,
        }
    }

    /// Build a summary from an adapter document with token counts computed
    /// from `fields["content"]`.
    pub fn from_doc_with_tokens(doc: &SpecDoc, schema: &SpecSchema) -> Self {
        let mut summary = Self::from_doc(doc, schema);
        let content = doc_field_str(doc, FIELD_CONTENT).unwrap_or("");
        let counter = global_token_counter();
        let token_result = counter.count_spec(content);
        summary.token_count = Some(token_result.total);
        summary.token_status = Some(token_status_str(token_result.status).to_string());
        summary
    }

    pub fn with_project_id(mut self, project_id: &str) -> Self {
        self.project_id = Some(project_id.to_string());
        self
    }

    pub fn with_relationships(mut self, required_by: Vec<String>) -> Self {
        self.required_by = required_by.clone();
        self.relationships = Some(SpecRelationships {
            depends_on: self.depends_on.clone(),
            required_by: Some(required_by),
        });
        self
    }
}

impl From<&SpecDoc> for SpecSummary {
    fn from(doc: &SpecDoc) -> Self {
        // Without a schema available, look up well-known field keys directly.
        // Callers that have the schema should prefer `from_doc_with_tokens`.
        let placeholder = placeholder_schema();
        Self::from_doc_with_tokens(doc, &placeholder)
    }
}

/// Full spec detail for view
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../../../packages/ui/src/types/generated/")]
#[serde(rename_all = "camelCase")]
pub struct SpecDetail {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub project_id: Option<String>,
    pub id: String,
    pub spec_number: Option<u32>,
    pub spec_name: String,
    pub title: Option<String>,
    pub status: String,
    pub priority: Option<String>,
    pub tags: Vec<String>,
    pub assignee: Option<String>,
    pub content_md: String,
    pub created_at: Option<DateTime<Utc>>,
    pub updated_at: Option<DateTime<Utc>>,
    pub completed_at: Option<DateTime<Utc>>,
    pub file_path: String,
    pub depends_on: Vec<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub parent: Option<String>,
    #[serde(default)]
    pub children: Vec<String>,
    #[serde(default)]
    pub required_by: Vec<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub content_hash: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub token_count: Option<usize>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub token_status: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub validation_status: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub relationships: Option<SpecRelationships>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub sub_specs: Option<Vec<SubSpec>>,
}

impl SpecDetail {
    pub fn from_doc(doc: &SpecDoc, schema: &SpecSchema) -> Self {
        let content = doc_field_str(doc, FIELD_CONTENT).unwrap_or("").to_string();
        let counter = global_token_counter();
        let token_result = counter.count_spec(&content);

        Self {
            project_id: None,
            id: doc.id.clone(),
            spec_number: spec_number_from_id(&doc.id),
            spec_name: doc.id.clone(),
            title: Some(doc.title.clone()),
            status: semantic_str(doc, schema, semantic::STATUS)
                .unwrap_or("")
                .to_string(),
            priority: semantic_str(doc, schema, semantic::PRIORITY).map(String::from),
            tags: semantic_strings(doc, schema, semantic::TAGS),
            assignee: semantic_str(doc, schema, semantic::ASSIGNEE).map(String::from),
            content_md: content.clone(),
            created_at: doc.created_at,
            updated_at: doc.updated_at,
            completed_at: None,
            file_path: doc.url.clone().unwrap_or_default(),
            depends_on: link_targets(doc, LINK_DEPENDS_ON),
            parent: parent_link(doc),
            children: Vec::new(),
            required_by: Vec::new(),
            content_hash: Some(hash_content(&content)),
            token_count: Some(token_result.total),
            token_status: Some(token_status_str(token_result.status).to_string()),
            validation_status: None,
            relationships: None,
            sub_specs: None,
        }
    }

    pub fn with_project_id(mut self, project_id: String) -> Self {
        self.project_id = Some(project_id);
        self
    }

    pub fn with_file_path(mut self, file_path: String) -> Self {
        self.file_path = file_path;
        self
    }
}

impl From<&SpecDoc> for SpecDetail {
    fn from(doc: &SpecDoc) -> Self {
        let placeholder = placeholder_schema();
        Self::from_doc(doc, &placeholder)
    }
}

fn token_status_str(status: TokenStatus) -> &'static str {
    match status {
        TokenStatus::Optimal => "optimal",
        TokenStatus::Good => "good",
        TokenStatus::Warning => "warning",
        TokenStatus::Excessive => "critical",
    }
}

/// Build a minimal schema with well-known semantic keys mapped to their
/// conventional field keys. Used when callers don't have access to the
/// adapter's real schema.
fn placeholder_schema() -> SpecSchema {
    use leanspec_core::{FieldDef, FieldDisplay, FieldKind};

    fn enum_field(key: &str, label: &str, semantic_key: &str, multi: bool) -> FieldDef {
        FieldDef {
            key: key.into(),
            label: label.into(),
            kind: FieldKind::Enum {
                options: vec![],
                multi,
                allow_custom: true,
                dynamic: false,
            },
            display: FieldDisplay::Inline,
            required: false,
            semantic: Some(semantic_key.to_string()),
            ai_hint: None,
            placeholder: None,
        }
    }

    SpecSchema {
        id: "placeholder".into(),
        name: "Placeholder".into(),
        extends: None,
        fields: vec![
            enum_field("status", "Status", semantic::STATUS, false),
            enum_field("priority", "Priority", semantic::PRIORITY, false),
            enum_field("tags", "Tags", semantic::TAGS, true),
            enum_field("assignee", "Assignee", semantic::ASSIGNEE, false),
        ],
        link_types: vec![],
    }
}

/// Raw spec content response
#[derive(Debug, Clone, Serialize, TS)]
#[ts(export, export_to = "../../../../packages/ui/src/types/generated/")]
#[serde(rename_all = "camelCase")]
pub struct SpecRawResponse {
    pub content: String,
    pub content_hash: String,
    pub file_path: String,
}

/// Request to update raw spec content
#[derive(Debug, Clone, Deserialize, TS)]
#[ts(export, export_to = "../../../../packages/ui/src/types/generated/")]
#[serde(rename_all = "camelCase")]
pub struct SpecRawUpdateRequest {
    pub content: String,
    pub expected_content_hash: Option<String>,
}

/// Request to toggle checklist items in a spec
#[derive(Debug, Clone, Deserialize, TS)]
#[ts(export, export_to = "../../../../packages/ui/src/types/generated/")]
#[serde(rename_all = "camelCase")]
pub struct ChecklistToggleRequest {
    pub toggles: Vec<ChecklistToggleItem>,
    pub expected_content_hash: Option<String>,
    /// Optional sub-spec filename (e.g., "IMPLEMENTATION.md")
    pub subspec: Option<String>,
}

/// A single checklist toggle item
#[derive(Debug, Clone, Deserialize, TS)]
#[ts(export, export_to = "../../../../packages/ui/src/types/generated/")]
#[serde(rename_all = "camelCase")]
pub struct ChecklistToggleItem {
    pub item_text: String,
    pub checked: bool,
}

/// Response from checklist toggle
#[derive(Debug, Clone, Serialize, TS)]
#[ts(export, export_to = "../../../../packages/ui/src/types/generated/")]
#[serde(rename_all = "camelCase")]
pub struct ChecklistToggleResponse {
    pub success: bool,
    pub content_hash: String,
    pub toggled: Vec<ChecklistToggledResult>,
}

/// Result of a single checklist toggle
#[derive(Debug, Clone, Serialize, TS)]
#[ts(export, export_to = "../../../../packages/ui/src/types/generated/")]
#[serde(rename_all = "camelCase")]
pub struct ChecklistToggledResult {
    pub item_text: String,
    pub checked: bool,
    pub line: usize,
}

/// Create spec request
#[derive(Debug, Clone, Deserialize, TS)]
#[ts(export, export_to = "../../../../packages/ui/src/types/generated/")]
#[serde(rename_all = "camelCase")]
pub struct CreateSpecRequest {
    pub name: String,
    pub title: Option<String>,
    pub status: Option<String>,
    pub priority: Option<String>,
    pub tags: Option<Vec<String>>,
    pub assignee: Option<String>,
    pub depends_on: Option<Vec<String>>,
    pub template: Option<String>,
    pub content: Option<String>,
}

/// Spec relationships container
#[derive(Debug, Clone, Serialize, Deserialize, Default, TS)]
#[ts(export, export_to = "../../../../packages/ui/src/types/generated/")]
#[serde(rename_all = "camelCase")]
pub struct SpecRelationships {
    pub depends_on: Vec<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub required_by: Option<Vec<String>>,
}

/// Sub-spec metadata for spec detail payloads
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../../../packages/ui/src/types/generated/")]
#[serde(rename_all = "camelCase")]
pub struct SubSpec {
    pub name: String,
    pub file: String,
    pub content: String,
}

/// Response for list specs endpoint
#[derive(Debug, Clone, Serialize, TS)]
#[ts(export, export_to = "../../../../packages/ui/src/types/generated/")]
#[serde(rename_all = "camelCase")]
pub struct ListSpecsResponse {
    pub specs: Vec<SpecSummary>,
    pub total: usize,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub next_cursor: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub project_id: Option<String>,
    /// Pre-built hierarchy tree (only when hierarchy=true query param)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub hierarchy: Option<Vec<HierarchyNode>>,
}

/// Hierarchical node for tree view - pre-computed server-side for performance
#[derive(Debug, Clone, Serialize, TS)]
#[ts(export, export_to = "../../../../packages/ui/src/types/generated/")]
#[serde(rename_all = "camelCase")]
pub struct HierarchyNode {
    #[serde(flatten)]
    #[ts(flatten)]
    pub spec: SpecSummary,
    pub child_nodes: Vec<HierarchyNode>,
}

/// Query parameters for list specs
#[derive(Debug, Clone, Deserialize, Default, TS)]
#[ts(export, export_to = "../../../../packages/ui/src/types/generated/")]
#[serde(rename_all = "camelCase")]
pub struct ListSpecsQuery {
    pub status: Option<String>,
    pub priority: Option<String>,
    pub tags: Option<String>,
    pub assignee: Option<String>,
    pub limit: Option<usize>,
    pub offset: Option<usize>,
    pub cursor: Option<String>,
    /// When true, return pre-built hierarchy tree structure for performance
    #[serde(default)]
    pub hierarchy: Option<bool>,
}

/// Response for search endpoint
#[derive(Debug, Clone, Serialize, TS)]
#[ts(export, export_to = "../../../../packages/ui/src/types/generated/")]
#[serde(rename_all = "camelCase")]
pub struct SearchResponse {
    pub results: Vec<SpecSummary>,
    pub total: usize,
    pub query: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub project_id: Option<String>,
}

/// Request body for search
#[derive(Debug, Clone, Deserialize, TS)]
#[ts(export, export_to = "../../../../packages/ui/src/types/generated/")]
#[serde(rename_all = "camelCase")]
pub struct SearchRequest {
    pub query: String,
    #[serde(default)]
    pub filters: Option<SearchFilters>,
    #[serde(rename = "projectId", default)]
    pub project_id: Option<String>,
}

/// Search filters
#[derive(Debug, Clone, Deserialize, Default, TS)]
#[ts(export, export_to = "../../../../packages/ui/src/types/generated/")]
#[serde(rename_all = "camelCase")]
pub struct SearchFilters {
    pub status: Option<String>,
    pub priority: Option<String>,
    pub tags: Option<Vec<String>>,
}

/// Statistics response
#[derive(Debug, Clone, Serialize, TS)]
#[ts(export, export_to = "../../../../packages/ui/src/types/generated/")]
#[serde(rename_all = "camelCase")]
pub struct StatsResponse {
    pub total_projects: usize,
    pub total_specs: usize,
    pub specs_by_status: Vec<StatusCountItem>,
    pub specs_by_priority: Vec<PriorityCountItem>,
    pub completion_rate: f64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub project_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, TS)]
#[ts(export, export_to = "../../../../packages/ui/src/types/generated/")]
#[serde(rename_all = "camelCase")]
pub struct StatusCountItem {
    pub status: String,
    pub count: usize,
}

#[derive(Debug, Clone, Serialize, TS)]
#[ts(export, export_to = "../../../../packages/ui/src/types/generated/")]
#[serde(rename_all = "camelCase")]
pub struct PriorityCountItem {
    pub priority: String,
    pub count: usize,
}

/// Dependency graph response
#[derive(Debug, Clone, Serialize, TS)]
#[ts(export, export_to = "../../../../packages/ui/src/types/generated/")]
#[serde(rename_all = "camelCase")]
pub struct DependencyResponse {
    pub spec: SpecSummary,
    pub depends_on: Vec<SpecSummary>,
    pub required_by: Vec<SpecSummary>,
}

/// Project-level dependency graph
#[derive(Debug, Clone, Serialize, TS)]
#[ts(export, export_to = "../../../../packages/ui/src/types/generated/")]
#[serde(rename_all = "camelCase")]
pub struct DependencyGraphResponse {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub project_id: Option<String>,
    pub nodes: Vec<DependencyNode>,
    pub edges: Vec<DependencyEdge>,
}

#[derive(Debug, Clone, Serialize, TS)]
#[ts(export, export_to = "../../../../packages/ui/src/types/generated/")]
#[serde(rename_all = "camelCase")]
pub struct DependencyNode {
    pub id: String,
    pub name: String,
    pub number: u32,
    pub status: String,
    pub priority: String,
    pub tags: Vec<String>,
}

#[derive(Debug, Clone, Serialize, TS)]
#[ts(export, export_to = "../../../../packages/ui/src/types/generated/")]
#[serde(rename_all = "camelCase")]
pub struct DependencyEdge {
    pub source: String,
    pub target: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub r#type: Option<String>,
}

/// Validation result
#[derive(Debug, Clone, Serialize, TS)]
#[ts(export, export_to = "../../../../packages/ui/src/types/generated/")]
#[serde(rename_all = "camelCase")]
pub struct ValidationResponse {
    pub is_valid: bool,
    pub errors: Vec<ValidationError>,
}

/// Spec token response
#[derive(Debug, Clone, Serialize, TS)]
#[ts(export, export_to = "../../../../packages/ui/src/types/generated/")]
#[serde(rename_all = "camelCase")]
pub struct SpecTokenResponse {
    pub token_count: usize,
    pub token_status: String,
    pub token_breakdown: TokenBreakdown,
}

/// Section token count for h2 sections
#[derive(Debug, Clone, Serialize, TS)]
#[ts(export, export_to = "../../../../packages/ui/src/types/generated/")]
#[serde(rename_all = "camelCase")]
pub struct SectionTokenCount {
    pub heading: String,
    pub tokens: usize,
}

/// Detailed content breakdown
#[derive(Debug, Clone, Serialize, Default, TS)]
#[ts(export, export_to = "../../../../packages/ui/src/types/generated/")]
#[serde(rename_all = "camelCase")]
pub struct DetailedBreakdown {
    /// Tokens in code blocks
    pub code_blocks: usize,
    /// Tokens in checklists (- [ ] items)
    pub checklists: usize,
    /// Tokens in plain prose/text
    pub prose: usize,
    /// Tokens per h2 section
    pub sections: Vec<SectionTokenCount>,
}

/// Token breakdown for a spec
#[derive(Debug, Clone, Serialize, TS)]
#[ts(export, export_to = "../../../../packages/ui/src/types/generated/")]
#[serde(rename_all = "camelCase")]
pub struct TokenBreakdown {
    pub frontmatter: usize,
    pub content: usize,
    pub title: usize,
    /// Detailed breakdown by content type
    pub detailed: DetailedBreakdown,
}

/// Spec validation response
#[derive(Debug, Clone, Serialize, TS)]
#[ts(export, export_to = "../../../../packages/ui/src/types/generated/")]
#[serde(rename_all = "camelCase")]
pub struct SpecValidationResponse {
    pub status: String,
    pub errors: Vec<SpecValidationError>,
}

/// Spec validation error
#[derive(Debug, Clone, Serialize, TS)]
#[ts(export, export_to = "../../../../packages/ui/src/types/generated/")]
#[serde(rename_all = "camelCase")]
pub struct SpecValidationError {
    pub severity: String,
    pub message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub line: Option<usize>,
    #[serde(rename = "type")]
    pub r#type: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub suggestion: Option<String>,
}

/// Batch metadata request
#[derive(Debug, Clone, Deserialize, TS)]
#[ts(export, export_to = "../../../../packages/ui/src/types/generated/")]
#[serde(rename_all = "camelCase")]
pub struct BatchMetadataRequest {
    pub spec_names: Vec<String>,
}

/// Batch metadata response - tokens and validation for multiple specs
#[derive(Debug, Clone, Serialize, TS)]
#[ts(export, export_to = "../../../../packages/ui/src/types/generated/")]
#[serde(rename_all = "camelCase")]
pub struct BatchMetadataResponse {
    pub specs: HashMap<String, SpecMetadata>,
}

/// Metadata for a single spec (tokens + validation)
#[derive(Debug, Clone, Serialize, TS)]
#[ts(export, export_to = "../../../../packages/ui/src/types/generated/")]
#[serde(rename_all = "camelCase")]
pub struct SpecMetadata {
    pub token_count: usize,
    pub token_status: String,
    pub validation_status: String,
}

/// Project validation summary
#[derive(Debug, Clone, Serialize, TS)]
#[ts(export, export_to = "../../../../packages/ui/src/types/generated/")]
#[serde(rename_all = "camelCase")]
pub struct ProjectValidationResponse {
    pub project_id: String,
    pub path: String,
    pub validation: ProjectValidationSummary,
}

#[derive(Debug, Clone, Serialize, TS)]
#[ts(export, export_to = "../../../../packages/ui/src/types/generated/")]
#[serde(rename_all = "camelCase")]
pub struct ProjectValidationSummary {
    pub is_valid: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub specs_dir: Option<String>,
}

#[derive(Debug, Clone, Serialize, TS)]
#[ts(export, export_to = "../../../../packages/ui/src/types/generated/")]
#[serde(rename_all = "camelCase")]
pub struct ValidationError {
    pub severity: String,
    pub message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub spec: Option<String>,
}

impl From<&leanspec_core::ValidationError> for ValidationError {
    fn from(error: &leanspec_core::ValidationError) -> Self {
        Self {
            severity: error.severity.to_string(),
            message: error.message.clone(),
            spec: None,
        }
    }
}

/// Metadata update request
#[derive(Debug, Clone, Deserialize, TS)]
#[ts(export, export_to = "../../../../packages/ui/src/types/generated/")]
#[serde(rename_all = "camelCase")]
pub struct MetadataUpdate {
    pub status: Option<String>,
    pub priority: Option<String>,
    pub tags: Option<Vec<String>>,
    pub assignee: Option<String>,
    #[serde(default)]
    pub add_depends_on: Option<Vec<String>>,
    #[serde(default)]
    pub remove_depends_on: Option<Vec<String>>,
    pub parent: Option<Option<String>>,
    pub expected_content_hash: Option<String>,
    /// Skip completion verification when setting status to complete
    #[serde(default)]
    pub force: Option<bool>,
}

/// Metadata update response
#[derive(Debug, Clone, Serialize, TS)]
#[ts(export, export_to = "../../../../packages/ui/src/types/generated/")]
#[serde(rename_all = "camelCase")]
pub struct UpdateMetadataResponse {
    pub success: bool,
    pub spec_id: String,
    pub frontmatter: FrontmatterResponse,
}

/// Frontmatter response for API
#[derive(Debug, Clone, Serialize, TS)]
#[ts(export, export_to = "../../../../packages/ui/src/types/generated/")]
#[serde(rename_all = "camelCase")]
pub struct FrontmatterResponse {
    pub status: String,
    pub created: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub priority: Option<String>,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub tags: Vec<String>,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub depends_on: Vec<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub parent: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub assignee: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub created_at: Option<DateTime<Utc>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub updated_at: Option<DateTime<Utc>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub completed_at: Option<DateTime<Utc>>,
}

impl FrontmatterResponse {
    /// Build a frontmatter response from an adapter document, using the
    /// adapter's schema to find semantic field keys.
    pub fn from_doc(doc: &SpecDoc, schema: &SpecSchema) -> Self {
        Self {
            status: semantic_str(doc, schema, semantic::STATUS)
                .unwrap_or("")
                .to_string(),
            created: doc
                .created_at
                .map(|t| t.format("%Y-%m-%d").to_string())
                .or_else(|| doc_field_str(doc, "created").map(String::from))
                .unwrap_or_default(),
            priority: semantic_str(doc, schema, semantic::PRIORITY).map(String::from),
            tags: semantic_strings(doc, schema, semantic::TAGS),
            depends_on: link_targets(doc, LINK_DEPENDS_ON),
            parent: parent_link(doc),
            assignee: semantic_str(doc, schema, semantic::ASSIGNEE).map(String::from),
            created_at: doc.created_at,
            updated_at: doc.updated_at,
            completed_at: None,
        }
    }
}
