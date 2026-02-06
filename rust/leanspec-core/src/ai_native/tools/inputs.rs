//! Tool input structs — aligned 1:1 with MCP tool schemas.

use schemars::JsonSchema;
use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct ListInput {
    pub project_id: Option<String>,
    /// Filter by status: planned, in-progress, complete, archived
    pub status: Option<String>,
    /// Filter by tags (spec must have ALL specified tags)
    pub tags: Option<Vec<String>>,
    /// Filter by priority: low, medium, high, critical
    pub priority: Option<String>,
}

#[derive(Debug, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct ViewInput {
    pub project_id: Option<String>,
    /// Spec path or number (e.g., '170' or '170-cli-mcp')
    pub spec_path: String,
}

#[derive(Debug, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct CreateInput {
    pub project_id: Option<String>,
    /// Short spec name in kebab-case (e.g., 'my-feature'). Number is auto-generated.
    pub name: String,
    /// Human-readable title
    pub title: Option<String>,
    /// Initial status
    pub status: Option<String>,
    /// Priority level
    pub priority: Option<String>,
    /// Template name to load from .lean-spec/templates
    pub template: Option<String>,
    /// Body content (markdown sections, no frontmatter)
    pub content: Option<String>,
    /// Tags for categorization
    pub tags: Option<Vec<String>>,
    /// Parent umbrella spec path or number
    pub parent: Option<String>,
    /// Specs this new spec depends on (blocking dependencies)
    pub depends_on: Option<Vec<String>>,
}

#[derive(Debug, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct ReplacementInput {
    /// Exact text to find
    pub old_string: String,
    /// Replacement text
    pub new_string: String,
    /// unique=error if multiple matches, all=replace all, first=first only
    pub match_mode: Option<String>,
}

#[derive(Debug, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct SectionUpdateInput {
    /// Section heading to find
    pub section: String,
    /// New content for section
    pub content: String,
    /// replace, append, or prepend
    pub mode: Option<String>,
}

#[derive(Debug, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct ChecklistToggleInput {
    pub item_text: String,
    pub checked: bool,
}

#[derive(Debug, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct UpdateInput {
    pub project_id: Option<String>,
    /// Spec path or number
    pub spec_path: String,
    /// New status
    pub status: Option<String>,
    /// New priority
    pub priority: Option<String>,
    /// New assignee
    pub assignee: Option<String>,
    /// Tags to add
    pub add_tags: Option<Vec<String>>,
    /// Tags to remove
    pub remove_tags: Option<Vec<String>>,
    /// String replacements (preferred). Include context lines for unique matching.
    pub replacements: Option<Vec<ReplacementInput>>,
    /// Replace or append/prepend content in a section by heading.
    pub section_updates: Option<Vec<SectionUpdateInput>>,
    /// Check or uncheck checklist items (partial match).
    pub checklist_toggles: Option<Vec<ChecklistToggleInput>>,
    /// Full body replacement (frontmatter preserved); other content ops ignored
    pub content: Option<String>,
    /// Optimistic concurrency check for content updates
    pub expected_content_hash: Option<String>,
    /// Skip completion verification when setting status to complete
    pub force: Option<bool>,
}

#[derive(Debug, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct SearchInput {
    pub project_id: Option<String>,
    /// Search query
    pub query: String,
    /// Maximum results
    pub limit: Option<u64>,
}

#[derive(Debug, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct ValidateInput {
    pub project_id: Option<String>,
    /// Specific spec to validate (validates all if not provided)
    pub spec_path: Option<String>,
}

#[derive(Debug, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct TokensInput {
    pub project_id: Option<String>,
    /// Specific spec to count (counts all specs if not provided)
    pub spec_path: Option<String>,
    /// Path to any file (markdown, code, text) to count tokens
    pub file_path: Option<String>,
}

#[derive(Debug, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct BoardInput {
    pub project_id: Option<String>,
    /// Group by: status, priority, assignee, tag, parent
    pub group_by: Option<String>,
}

#[derive(Debug, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct StatsInput {
    pub project_id: Option<String>,
}

#[derive(Debug, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct RelationshipsInput {
    pub project_id: Option<String>,
    /// Spec path or number
    pub spec_path: String,
    /// Action to perform: view, add, remove
    pub action: Option<String>,
    /// Relationship type: parent, child, depends_on
    #[serde(rename = "type")]
    pub rel_type: Option<String>,
    /// Target spec path or number
    pub target: Option<String>,
}

#[derive(Debug, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct RunSubagentInput {
    pub project_id: Option<String>,
    pub spec_id: Option<String>,
    pub runner_id: Option<String>,
    pub task: String,
}

// ---------------------------------------------------------------------------
// Internal response types
// ---------------------------------------------------------------------------

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SpecRawResponse {
    pub content: String,
    pub content_hash: String,
}
