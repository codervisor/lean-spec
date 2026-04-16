//! Spec compute handlers: stats, dependencies, tokens, validation

#![allow(clippy::result_large_err)]

use axum::extract::{Path, State};
use axum::http::StatusCode;
use axum::Json;
use std::collections::HashMap;
use std::fs;

use leanspec_core::{
    global_frontmatter_validator, global_structure_validator, global_token_count_validator,
    global_token_counter, SpecStats, ValidationResult,
};

use crate::error::{ApiError, ApiResult};
use crate::state::AppState;

use crate::types::{
    DetailedBreakdown, SectionTokenCount, SpecTokenResponse, SpecValidationError,
    SpecValidationResponse, StatsResponse, TokenBreakdown,
};

use super::helpers::{get_spec_loader, token_status_label, validation_status_label};

/// GET /api/projects/:projectId/specs/:spec/tokens - Get token counts for a spec
pub async fn get_project_spec_tokens(
    State(state): State<AppState>,
    Path((project_id, spec_id)): Path<(String, String)>,
) -> ApiResult<Json<SpecTokenResponse>> {
    let (loader, _project) = get_spec_loader(&state, &project_id).await?;
    let spec = loader.load(&spec_id).map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiError::internal_error(&e.to_string())),
        )
    })?;

    let spec = spec.ok_or_else(|| {
        (
            StatusCode::NOT_FOUND,
            Json(ApiError::spec_not_found(&spec_id)),
        )
    })?;

    let content = fs::read_to_string(&spec.file_path).map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiError::internal_error(&e.to_string())),
        )
    })?;

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
pub async fn get_project_spec_validation(
    State(state): State<AppState>,
    Path((project_id, spec_id)): Path<(String, String)>,
) -> ApiResult<Json<SpecValidationResponse>> {
    let (loader, _project) = get_spec_loader(&state, &project_id).await?;
    let spec = loader.load(&spec_id).map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiError::internal_error(&e.to_string())),
        )
    })?;

    let spec = spec.ok_or_else(|| {
        (
            StatusCode::NOT_FOUND,
            Json(ApiError::spec_not_found(&spec_id)),
        )
    })?;

    let fm_validator = global_frontmatter_validator();
    let struct_validator = global_structure_validator();
    let token_validator = global_token_count_validator();

    let mut result = ValidationResult::new(&spec.path);
    result.merge(fm_validator.validate(&spec));
    result.merge(struct_validator.validate(&spec));
    result.merge(token_validator.validate(&spec));

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
    let (loader, project) = get_spec_loader(&state, &project_id).await?;

    let all_specs = loader.load_all().map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiError::internal_error(&e.to_string())),
        )
    })?;

    let stats = SpecStats::compute(&all_specs);

    Ok(Json(StatsResponse::from_project_stats(stats, &project.id)))
}

/// GET /api/projects/:projectId/dependencies - Dependency graph for a project
pub async fn get_project_dependencies(
    State(state): State<AppState>,
    Path(project_id): Path<String>,
) -> ApiResult<Json<crate::types::DependencyGraphResponse>> {
    let (loader, project) = get_spec_loader(&state, &project_id).await?;

    let all_specs = loader.load_all().map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiError::internal_error(&e.to_string())),
        )
    })?;

    let mut nodes = Vec::new();
    let mut edges = Vec::new();
    let spec_map: HashMap<String, _> = all_specs.iter().map(|s| (s.path.clone(), s)).collect();

    for spec in &all_specs {
        nodes.push(crate::types::DependencyNode {
            id: spec.path.clone(),
            name: if !spec.title.is_empty() && spec.title != spec.path {
                spec.title.clone()
            } else {
                spec.path.clone()
            },
            number: spec.number().unwrap_or(0),
            status: spec.frontmatter.status.to_string(),
            priority: spec
                .frontmatter
                .priority
                .map(|p| p.to_string())
                .unwrap_or_else(|| "medium".to_string()),
            tags: spec.frontmatter.tags.clone(),
        });

        for dep in &spec.frontmatter.depends_on {
            if spec_map.contains_key(dep) {
                edges.push(crate::types::DependencyEdge {
                    // Edge direction: dependency -> dependent
                    // If spec A depends_on B, draw B -> A
                    source: dep.clone(),
                    target: spec.path.clone(),
                    r#type: Some("dependsOn".to_string()),
                });
            }
        }
    }

    Ok(Json(crate::types::DependencyGraphResponse {
        project_id: Some(project.id),
        nodes,
        edges,
    }))
}
