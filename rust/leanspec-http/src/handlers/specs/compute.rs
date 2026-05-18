//! Spec compute handlers: stats, dependencies, tokens, validation

#![allow(clippy::result_large_err)]

use std::collections::HashMap;
use std::fs;

use axum::extract::{Path, State};
use axum::http::StatusCode;
use axum::Json;

use leanspec_core::adapters::markdown::doc_to_spec_info;
use leanspec_core::adapters::ListFilter;
use leanspec_core::{
    global_frontmatter_validator, global_structure_validator, global_token_count_validator,
    global_token_counter, semantic, FieldValue, FrontmatterParser, SpecDoc, SpecSchema,
    ValidationResult,
};

use crate::error::{ApiError, ApiResult};
use crate::state::AppState;

use crate::types::{
    DependencyEdge, DependencyGraphResponse, DependencyNode, DetailedBreakdown, PriorityCountItem,
    SectionTokenCount, SpecTokenResponse, SpecValidationError, SpecValidationResponse,
    StatsResponse, StatusCountItem, TokenBreakdown,
};

use super::helpers::{
    adapter_error, get_adapter_and_project, require_markdown_adapter, resolve_markdown_spec_path,
    token_status_label, validation_status_label,
};

fn doc_content(doc: &SpecDoc) -> &str {
    doc.fields
        .get("content")
        .and_then(|v| v.as_str())
        .unwrap_or("")
}

fn doc_semantic_str<'a>(doc: &'a SpecDoc, schema: &SpecSchema, sem: &str) -> Option<&'a str> {
    let key = schema.key_for_semantic(sem)?;
    doc.fields.get(key).and_then(|v| v.as_str())
}

fn doc_semantic_strings(doc: &SpecDoc, schema: &SpecSchema, sem: &str) -> Vec<String> {
    let key = match schema.key_for_semantic(sem) {
        Some(k) => k,
        None => return Vec::new(),
    };
    match doc.fields.get(key) {
        Some(FieldValue::Strings(v)) => v.clone(),
        _ => Vec::new(),
    }
}

/// Reconstruct a markdown spec view from a [`SpecDoc`] plus the on-disk file
/// for the validators that still consume `&SpecInfo`. Reads the body off
/// disk so the validators see the same frontmatter the parser produces — a
/// short-term bridge until validators move to the schema-driven model.
fn doc_to_spec_info_from_disk(
    doc: &SpecDoc,
    file_path: std::path::PathBuf,
) -> Result<leanspec_core::adapters::markdown::SpecInfo, (StatusCode, Json<ApiError>)> {
    let content = fs::read_to_string(&file_path).map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiError::internal_error(&e.to_string())),
        )
    })?;

    let parser = FrontmatterParser::new();
    let (_, body) = parser.parse(&content).map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiError::internal_error(&e.to_string())),
        )
    })?;

    Ok(doc_to_spec_info(doc, file_path, Some(body)))
}

/// GET /api/projects/:projectId/specs/:spec/tokens - Get token counts for a spec
pub async fn get_project_spec_tokens(
    State(state): State<AppState>,
    Path((project_id, spec_id)): Path<(String, String)>,
) -> ApiResult<Json<SpecTokenResponse>> {
    let (adapter, project) = get_adapter_and_project(&state, &project_id).await?;

    // Token counting works on raw markdown including frontmatter. For markdown
    // projects we read the file; for other adapters we fall back to the body
    // content the adapter returned.
    let content = if adapter.capabilities().name == "markdown" {
        adapter.get(&spec_id).map_err(adapter_error)?;
        let file_path =
            resolve_markdown_spec_path(&project.specs_dir, &spec_id).ok_or_else(|| {
                (
                    StatusCode::NOT_FOUND,
                    Json(ApiError::spec_not_found(&spec_id)),
                )
            })?;
        fs::read_to_string(&file_path).map_err(|e| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiError::internal_error(&e.to_string())),
            )
        })?
    } else {
        let doc = adapter.get(&spec_id).map_err(adapter_error)?;
        doc_content(&doc).to_string()
    };

    let counter = global_token_counter();
    let result = counter.count_spec(&content);

    Ok(Json(SpecTokenResponse {
        token_count: result.total,
        token_status: token_status_label(result.status).to_string(),
        token_breakdown: TokenBreakdown {
            frontmatter: result.frontmatter,
            content: result.content,
            title: result.title,
            detailed: DetailedBreakdown {
                code_blocks: result.detailed.code_blocks,
                checklists: result.detailed.checklists,
                prose: result.detailed.prose,
                sections: result
                    .detailed
                    .sections
                    .into_iter()
                    .map(|s| SectionTokenCount {
                        heading: s.heading,
                        tokens: s.tokens,
                    })
                    .collect(),
            },
        },
    }))
}

/// GET /api/projects/:projectId/specs/:spec/validation - Validate a spec
///
/// Markdown-only. Returns HTTP 422 for other adapters.
pub async fn get_project_spec_validation(
    State(state): State<AppState>,
    Path((project_id, spec_id)): Path<(String, String)>,
) -> ApiResult<Json<SpecValidationResponse>> {
    let (adapter, project) = get_adapter_and_project(&state, &project_id).await?;
    require_markdown_adapter(adapter.as_ref())?;

    let doc = adapter.get(&spec_id).map_err(adapter_error)?;
    let file_path = resolve_markdown_spec_path(&project.specs_dir, &spec_id).ok_or_else(|| {
        (
            StatusCode::NOT_FOUND,
            Json(ApiError::spec_not_found(&spec_id)),
        )
    })?;

    let spec_info = doc_to_spec_info_from_disk(&doc, file_path)?;

    let fm_validator = global_frontmatter_validator();
    let struct_validator = global_structure_validator();
    let token_validator = global_token_count_validator();

    let mut result = ValidationResult::new(&spec_info.path);
    result.merge(fm_validator.validate(&spec_info));
    result.merge(struct_validator.validate(&spec_info));
    result.merge(token_validator.validate(&spec_info));

    let errors = result
        .errors
        .iter()
        .map(|error| SpecValidationError {
            severity: error.severity.to_string(),
            message: error.message.clone(),
            line: error.line,
            r#type: error.category.clone(),
            suggestion: error.suggestion.clone(),
        })
        .collect();

    Ok(Json(SpecValidationResponse {
        status: validation_status_label(&result).to_string(),
        errors,
    }))
}

/// GET /api/projects/:projectId/stats - Project statistics
pub async fn get_project_stats(
    State(state): State<AppState>,
    Path(project_id): Path<String>,
) -> ApiResult<Json<StatsResponse>> {
    let (adapter, project) = get_adapter_and_project(&state, &project_id).await?;
    let schema = adapter.schema();

    let docs = adapter
        .list(&ListFilter {
            include_archived: true,
            ..Default::default()
        })
        .map_err(adapter_error)?;

    let specs_by_status = build_status_counts(&docs, schema);
    let specs_by_priority = build_priority_counts(&docs, schema);
    let completion_rate = completion_rate(&specs_by_status);

    Ok(Json(StatsResponse {
        total_projects: 1,
        total_specs: docs.len(),
        specs_by_status,
        specs_by_priority,
        completion_rate,
        project_id: Some(project.id),
    }))
}

fn build_status_counts(docs: &[SpecDoc], schema: &SpecSchema) -> Vec<StatusCountItem> {
    // Keep the canonical markdown status ordering at minimum, then append any
    // adapter-specific values seen in the data.
    let mut counts: HashMap<String, usize> = HashMap::new();
    for doc in docs {
        let status = doc_semantic_str(doc, schema, semantic::STATUS).unwrap_or("");
        if status.is_empty() {
            continue;
        }
        *counts.entry(status.to_string()).or_insert(0) += 1;
    }

    let canonical = ["draft", "planned", "in-progress", "complete", "archived"];
    let mut items: Vec<StatusCountItem> = canonical
        .iter()
        .map(|s| StatusCountItem {
            status: (*s).to_string(),
            count: counts.remove(*s).unwrap_or(0),
        })
        .collect();
    let mut extras: Vec<(String, usize)> = counts.into_iter().collect();
    extras.sort_by(|a, b| a.0.cmp(&b.0));
    for (status, count) in extras {
        items.push(StatusCountItem { status, count });
    }
    items
}

fn build_priority_counts(docs: &[SpecDoc], schema: &SpecSchema) -> Vec<PriorityCountItem> {
    let mut counts: HashMap<String, usize> = HashMap::new();
    for doc in docs {
        if let Some(priority) = doc_semantic_str(doc, schema, semantic::PRIORITY) {
            if !priority.is_empty() {
                *counts.entry(priority.to_string()).or_insert(0) += 1;
            }
        }
    }

    let canonical = ["low", "medium", "high", "critical"];
    let mut items: Vec<PriorityCountItem> = canonical
        .iter()
        .map(|p| PriorityCountItem {
            priority: (*p).to_string(),
            count: counts.remove(*p).unwrap_or(0),
        })
        .collect();
    let mut extras: Vec<(String, usize)> = counts.into_iter().collect();
    extras.sort_by(|a, b| a.0.cmp(&b.0));
    for (priority, count) in extras {
        items.push(PriorityCountItem { priority, count });
    }
    items
}

fn completion_rate(counts: &[StatusCountItem]) -> f64 {
    let total: usize = counts.iter().map(|c| c.count).sum();
    if total == 0 {
        return 0.0;
    }
    let complete = counts
        .iter()
        .find(|c| c.status == "complete")
        .map(|c| c.count)
        .unwrap_or(0);
    (complete as f64 / total as f64) * 100.0
}

/// GET /api/projects/:projectId/dependencies - Dependency graph for a project
///
/// Markdown-only. Returns HTTP 422 for other adapters.
pub async fn get_project_dependencies(
    State(state): State<AppState>,
    Path(project_id): Path<String>,
) -> ApiResult<Json<DependencyGraphResponse>> {
    let (adapter, project) = get_adapter_and_project(&state, &project_id).await?;
    require_markdown_adapter(adapter.as_ref())?;

    let schema = adapter.schema();
    let docs = adapter
        .list(&ListFilter {
            include_archived: true,
            ..Default::default()
        })
        .map_err(adapter_error)?;

    let known_ids: std::collections::HashSet<String> = docs.iter().map(|d| d.id.clone()).collect();
    let mut nodes = Vec::with_capacity(docs.len());
    let mut edges = Vec::new();

    for doc in &docs {
        nodes.push(DependencyNode {
            id: doc.id.clone(),
            name: if !doc.title.is_empty() && doc.title != doc.id {
                doc.title.clone()
            } else {
                doc.id.clone()
            },
            number: doc
                .id
                .split('-')
                .next()
                .and_then(|s| s.parse().ok())
                .unwrap_or(0),
            status: doc_semantic_str(doc, schema, semantic::STATUS)
                .unwrap_or("")
                .to_string(),
            priority: doc_semantic_str(doc, schema, semantic::PRIORITY)
                .unwrap_or("medium")
                .to_string(),
            tags: doc_semantic_strings(doc, schema, semantic::TAGS),
        });

        for link in &doc.links {
            if link.link_type == "depends_on" && known_ids.contains(&link.target_id) {
                edges.push(DependencyEdge {
                    // Edge direction: dependency -> dependent
                    source: link.target_id.clone(),
                    target: doc.id.clone(),
                    r#type: Some("dependsOn".to_string()),
                });
            }
        }
    }

    Ok(Json(DependencyGraphResponse {
        project_id: Some(project.id),
        nodes,
        edges,
    }))
}
