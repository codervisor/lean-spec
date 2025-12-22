//! API types for request/response serialization
//!
//! These types match the existing Next.js API responses for compatibility.

use chrono::{DateTime, Utc};
use leanspec_core::{SpecInfo, SpecPriority, SpecStats, SpecStatus};
use serde::{Deserialize, Serialize};

/// Lightweight spec for list views
#[derive(Debug, Clone, Serialize, Deserialize)]
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
    #[serde(default)]
    pub required_by: Vec<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub relationships: Option<SpecRelationships>,
}

impl From<&SpecInfo> for SpecSummary {
    fn from(spec: &SpecInfo) -> Self {
        Self {
            project_id: None,
            id: spec.path.clone(),
            spec_number: spec.number(),
            spec_name: spec.path.clone(),
            title: Some(spec.title.clone()),
            status: spec.frontmatter.status.to_string(),
            priority: spec.frontmatter.priority.map(|p| p.to_string()),
            tags: spec.frontmatter.tags.clone(),
            assignee: spec.frontmatter.assignee.clone(),
            created_at: spec.frontmatter.created_at,
            updated_at: spec.frontmatter.updated_at,
            completed_at: spec.frontmatter.completed_at,
            file_path: spec.file_path.to_string_lossy().to_string(),
            depends_on: spec.frontmatter.depends_on.clone(),
            required_by: Vec::new(), // Will be computed when needed
            relationships: None,
        }
    }
}

impl SpecSummary {
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

/// Full spec detail for view
#[derive(Debug, Clone, Serialize, Deserialize)]
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
    #[serde(default)]
    pub required_by: Vec<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub relationships: Option<SpecRelationships>,
}

impl From<&SpecInfo> for SpecDetail {
    fn from(spec: &SpecInfo) -> Self {
        Self {
            project_id: None,
            id: spec.path.clone(),
            spec_number: spec.number(),
            spec_name: spec.path.clone(),
            title: Some(spec.title.clone()),
            status: spec.frontmatter.status.to_string(),
            priority: spec.frontmatter.priority.map(|p| p.to_string()),
            tags: spec.frontmatter.tags.clone(),
            assignee: spec.frontmatter.assignee.clone(),
            content_md: spec.content.clone(),
            created_at: spec.frontmatter.created_at,
            updated_at: spec.frontmatter.updated_at,
            completed_at: spec.frontmatter.completed_at,
            file_path: spec.file_path.to_string_lossy().to_string(),
            depends_on: spec.frontmatter.depends_on.clone(),
            required_by: Vec::new(), // Will be computed when needed
            relationships: None,
        }
    }
}

impl SpecDetail {
    pub fn with_project_id(mut self, project_id: String) -> Self {
        self.project_id = Some(project_id);
        self
    }
}

/// Spec relationships container
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct SpecRelationships {
    pub depends_on: Vec<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub required_by: Option<Vec<String>>,
}

/// Response for list specs endpoint
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ListSpecsResponse {
    pub specs: Vec<SpecSummary>,
    pub total: usize,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub project_id: Option<String>,
}

/// Query parameters for list specs
#[derive(Debug, Clone, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct ListSpecsQuery {
    pub status: Option<String>,
    pub priority: Option<String>,
    pub tags: Option<String>,
    pub assignee: Option<String>,
}

/// Response for search endpoint
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchResponse {
    pub results: Vec<SpecSummary>,
    pub total: usize,
    pub query: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub project_id: Option<String>,
}

/// Request body for search
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchRequest {
    pub query: String,
    #[serde(default)]
    pub filters: Option<SearchFilters>,
    #[serde(rename = "projectId", default)]
    pub project_id: Option<String>,
}

/// Search filters
#[derive(Debug, Clone, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct SearchFilters {
    pub status: Option<String>,
    pub priority: Option<String>,
    pub tags: Option<Vec<String>>,
}

/// Statistics response
#[derive(Debug, Clone, Serialize)]
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

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct StatusCountItem {
    pub status: String,
    pub count: usize,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PriorityCountItem {
    pub priority: String,
    pub count: usize,
}

impl StatsResponse {
    pub fn from_project_stats(stats: SpecStats, project_id: &str) -> Self {
        let specs_by_status = vec![
            StatusCountItem {
                status: "planned".to_string(),
                count: *stats.by_status.get(&SpecStatus::Planned).unwrap_or(&0),
            },
            StatusCountItem {
                status: "in-progress".to_string(),
                count: *stats.by_status.get(&SpecStatus::InProgress).unwrap_or(&0),
            },
            StatusCountItem {
                status: "complete".to_string(),
                count: *stats.by_status.get(&SpecStatus::Complete).unwrap_or(&0),
            },
            StatusCountItem {
                status: "archived".to_string(),
                count: *stats.by_status.get(&SpecStatus::Archived).unwrap_or(&0),
            },
        ];

        let specs_by_priority = vec![
            PriorityCountItem {
                priority: "low".to_string(),
                count: *stats.by_priority.get(&SpecPriority::Low).unwrap_or(&0),
            },
            PriorityCountItem {
                priority: "medium".to_string(),
                count: *stats.by_priority.get(&SpecPriority::Medium).unwrap_or(&0),
            },
            PriorityCountItem {
                priority: "high".to_string(),
                count: *stats.by_priority.get(&SpecPriority::High).unwrap_or(&0),
            },
            PriorityCountItem {
                priority: "critical".to_string(),
                count: *stats.by_priority.get(&SpecPriority::Critical).unwrap_or(&0),
            },
        ];

        Self {
            total_projects: 1,
            total_specs: stats.total,
            specs_by_status,
            specs_by_priority,
            completion_rate: stats.completion_percentage(),
            project_id: Some(project_id.to_string()),
        }
    }
}

/// Dependency graph response
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DependencyResponse {
    pub spec: SpecSummary,
    pub depends_on: Vec<SpecSummary>,
    pub required_by: Vec<SpecSummary>,
}

/// Project-level dependency graph
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DependencyGraphResponse {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub project_id: Option<String>,
    pub nodes: Vec<DependencyNode>,
    pub edges: Vec<DependencyEdge>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DependencyNode {
    pub id: String,
    pub name: String,
    pub number: u32,
    pub status: String,
    pub priority: String,
    pub tags: Vec<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DependencyEdge {
    pub source: String,
    pub target: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub r#type: Option<String>,
}

/// Validation result
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ValidationResponse {
    pub is_valid: bool,
    pub issues: Vec<ValidationIssue>,
}

/// Project validation summary
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectValidationResponse {
    pub project_id: String,
    pub path: String,
    pub validation: ProjectValidationSummary,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectValidationSummary {
    pub is_valid: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub specs_dir: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ValidationIssue {
    pub severity: String,
    pub message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub spec: Option<String>,
}

impl From<&leanspec_core::ValidationIssue> for ValidationIssue {
    fn from(issue: &leanspec_core::ValidationIssue) -> Self {
        Self {
            severity: issue.severity.to_string(),
            message: issue.message.clone(),
            spec: None,
        }
    }
}

/// Metadata update request
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MetadataUpdate {
    pub status: Option<String>,
    pub priority: Option<String>,
    pub tags: Option<Vec<String>>,
    pub assignee: Option<String>,
}

/// Metadata update response
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateMetadataResponse {
    pub success: bool,
    pub spec_id: String,
    pub frontmatter: FrontmatterResponse,
}

/// Frontmatter response for API
#[derive(Debug, Clone, Serialize)]
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
    pub assignee: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub created_at: Option<DateTime<Utc>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub updated_at: Option<DateTime<Utc>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub completed_at: Option<DateTime<Utc>>,
}

impl From<&leanspec_core::SpecFrontmatter> for FrontmatterResponse {
    fn from(fm: &leanspec_core::SpecFrontmatter) -> Self {
        Self {
            status: fm.status.to_string(),
            created: fm.created.clone(),
            priority: fm.priority.map(|p| p.to_string()),
            tags: fm.tags.clone(),
            depends_on: fm.depends_on.clone(),
            assignee: fm.assignee.clone(),
            created_at: fm.created_at,
            updated_at: fm.updated_at,
            completed_at: fm.completed_at,
        }
    }
}

/// Health check response
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HealthResponse {
    pub status: String,
    pub version: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub current_project: Option<String>,
}
