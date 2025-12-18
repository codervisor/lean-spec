//! API types for request/response serialization
//!
//! These types match the existing Next.js API responses for compatibility.

use chrono::{DateTime, Utc};
use leanspec_core::{SpecInfo, SpecPriority, SpecStatus, SpecStats};
use serde::{Deserialize, Serialize};

/// Lightweight spec for list views
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SpecSummary {
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
}

impl From<&SpecInfo> for SpecSummary {
    fn from(spec: &SpecInfo) -> Self {
        Self {
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
        }
    }
}

/// Full spec detail for view
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SpecDetail {
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
}

impl From<&SpecInfo> for SpecDetail {
    fn from(spec: &SpecInfo) -> Self {
        Self {
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
        }
    }
}

/// Response for list specs endpoint
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ListSpecsResponse {
    pub specs: Vec<SpecSummary>,
    pub total: usize,
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
}

/// Request body for search
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchRequest {
    pub query: String,
    #[serde(default)]
    pub filters: Option<SearchFilters>,
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
    pub total: usize,
    pub by_status: StatusCounts,
    pub by_priority: PriorityCounts,
    pub by_tag: Vec<TagCount>,
    pub completion_percentage: f64,
    pub active_count: usize,
    pub unassigned: usize,
}

#[derive(Debug, Clone, Serialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct StatusCounts {
    pub planned: usize,
    pub in_progress: usize,
    pub complete: usize,
    pub archived: usize,
}

#[derive(Debug, Clone, Serialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct PriorityCounts {
    pub low: usize,
    pub medium: usize,
    pub high: usize,
    pub critical: usize,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TagCount {
    pub tag: String,
    pub count: usize,
}

impl From<SpecStats> for StatsResponse {
    fn from(stats: SpecStats) -> Self {
        let by_status = StatusCounts {
            planned: *stats.by_status.get(&SpecStatus::Planned).unwrap_or(&0),
            in_progress: *stats.by_status.get(&SpecStatus::InProgress).unwrap_or(&0),
            complete: *stats.by_status.get(&SpecStatus::Complete).unwrap_or(&0),
            archived: *stats.by_status.get(&SpecStatus::Archived).unwrap_or(&0),
        };

        let by_priority = PriorityCounts {
            low: *stats.by_priority.get(&SpecPriority::Low).unwrap_or(&0),
            medium: *stats.by_priority.get(&SpecPriority::Medium).unwrap_or(&0),
            high: *stats.by_priority.get(&SpecPriority::High).unwrap_or(&0),
            critical: *stats.by_priority.get(&SpecPriority::Critical).unwrap_or(&0),
        };

        let by_tag: Vec<TagCount> = stats
            .top_tags(20)
            .into_iter()
            .map(|(tag, count)| TagCount {
                tag: tag.clone(),
                count: *count,
            })
            .collect();

        Self {
            total: stats.total,
            by_status,
            by_priority,
            by_tag,
            completion_percentage: stats.completion_percentage(),
            active_count: stats.active_count(),
            unassigned: stats.unassigned,
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

/// Validation result
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ValidationResponse {
    pub is_valid: bool,
    pub issues: Vec<ValidationIssue>,
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
            severity: format!("{:?}", issue.severity).to_lowercase(),
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

/// Health check response
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HealthResponse {
    pub status: String,
    pub version: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub current_project: Option<String>,
}
