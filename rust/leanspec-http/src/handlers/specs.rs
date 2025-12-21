//! Spec operation handlers

use axum::extract::{Path, Query, State};
use axum::http::StatusCode;
use axum::Json;
use std::collections::HashMap;

use leanspec_core::{
    DependencyGraph, FrontmatterValidator, LineCountValidator, SpecFilterOptions, SpecLoader,
    SpecStats, StructureValidator,
};

use crate::error::{ApiError, ApiResult};
use crate::project_registry::Project;
use crate::state::AppState;
use crate::types::{
    DependencyResponse, ListSpecsQuery, ListSpecsResponse, MetadataUpdate, SearchRequest,
    SearchResponse, SpecDetail, SpecSummary, StatsResponse, ValidationIssue, ValidationResponse,
};

/// Resolve a project by ID or fall back to the current/first project
async fn resolve_project(
    state: &AppState,
    project_id: Option<&str>,
) -> Result<Project, (StatusCode, Json<ApiError>)> {
    let registry = state.registry.read().await;
    let project = if let Some(id) = project_id {
        registry.get(id).cloned()
    } else {
        registry
            .current()
            .cloned()
            .or_else(|| registry.all().first().map(|p| (*p).clone()))
    };

    project.ok_or_else(|| {
        (
            StatusCode::BAD_REQUEST,
            Json(ApiError::no_project_selected()),
        )
    })
}

/// Helper to get the spec loader for a project
async fn get_spec_loader(
    state: &AppState,
    project_id: Option<&str>,
) -> Result<(SpecLoader, Project), (StatusCode, Json<ApiError>)> {
    let project = resolve_project(state, project_id).await?;
    let specs_dir = project.specs_dir.clone();

    Ok((SpecLoader::new(&specs_dir), project))
}

/// GET /api/specs - List all specs with optional filters
pub async fn list_specs(
    State(state): State<AppState>,
    Query(query): Query<ListSpecsQuery>,
) -> ApiResult<Json<ListSpecsResponse>> {
    let (loader, project) = get_spec_loader(&state, None).await?;

    let all_specs = loader.load_all().map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiError::internal_error(&e.to_string())),
        )
    })?;

    let parsed_status: Option<Vec<_>> = query
        .status
        .clone()
        .map(|s| s.split(',').filter_map(|s| s.parse().ok()).collect());
    if query.status.is_some() && parsed_status.as_ref().map_or(true, |v| v.is_empty()) {
        return Err((
            StatusCode::BAD_REQUEST,
            Json(ApiError::invalid_request("Invalid status filter")),
        ));
    }

    // Apply filters
    let filters = SpecFilterOptions {
        status: parsed_status,
        priority: query
            .priority
            .map(|s| s.split(',').filter_map(|s| s.parse().ok()).collect()),
        tags: query
            .tags
            .map(|s| s.split(',').map(|s| s.to_string()).collect()),
        assignee: query.assignee,
        search: None,
    };

    let project_id = project.id.clone();
    let filtered_specs: Vec<SpecSummary> = all_specs
        .iter()
        .filter(|s| filters.matches(s))
        .map(|s| SpecSummary::from(s).with_project_id(&project_id))
        .collect();

    let total = filtered_specs.len();

    Ok(Json(ListSpecsResponse {
        specs: filtered_specs,
        total,
        project_id: Some(project_id),
    }))
}

/// GET /api/projects/:projectId/specs - List specs for a specific project
pub async fn list_project_specs(
    State(state): State<AppState>,
    Path(project_id): Path<String>,
    Query(query): Query<ListSpecsQuery>,
) -> ApiResult<Json<ListSpecsResponse>> {
    let (loader, project) = get_spec_loader(&state, Some(&project_id)).await?;

    let all_specs = loader.load_all().map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiError::internal_error(&e.to_string())),
        )
    })?;

    let parsed_status: Option<Vec<_>> = query
        .status
        .clone()
        .map(|s| s.split(',').filter_map(|s| s.parse().ok()).collect());
    if query.status.is_some() && parsed_status.as_ref().map_or(true, |v| v.is_empty()) {
        return Err((
            StatusCode::BAD_REQUEST,
            Json(ApiError::invalid_request("Invalid status filter")),
        ));
    }

    // Apply filters
    let filters = SpecFilterOptions {
        status: parsed_status,
        priority: query
            .priority
            .map(|s| s.split(',').filter_map(|s| s.parse().ok()).collect()),
        tags: query
            .tags
            .map(|s| s.split(',').map(|s| s.to_string()).collect()),
        assignee: query.assignee,
        search: None,
    };

    let filtered_specs: Vec<SpecSummary> = all_specs
        .iter()
        .filter(|s| filters.matches(s))
        .map(|s| SpecSummary::from(s).with_project_id(&project.id))
        .collect();

    let total = filtered_specs.len();

    Ok(Json(ListSpecsResponse {
        specs: filtered_specs,
        total,
        project_id: Some(project.id),
    }))
}

/// GET /api/specs/:spec - Get a spec by ID or number
pub async fn get_spec(
    State(state): State<AppState>,
    Path(spec_id): Path<String>,
) -> ApiResult<Json<SpecDetail>> {
    let (loader, project) = get_spec_loader(&state, None).await?;

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

    // Get dependency graph to compute required_by
    let all_specs = loader.load_all().unwrap_or_default();
    let dep_graph = DependencyGraph::new(&all_specs);

    let mut detail = SpecDetail::from(&spec);

    // Compute required_by
    if let Some(complete) = dep_graph.get_complete_graph(&spec.path) {
        detail.required_by = complete
            .required_by
            .iter()
            .map(|s| s.path.clone())
            .collect();
        detail.relationships = Some(crate::types::SpecRelationships {
            depends_on: detail.depends_on.clone(),
            required_by: Some(detail.required_by.clone()),
        });
    }

    Ok(Json(detail.with_project_id(project.id)))
}

/// GET /api/projects/:projectId/specs/:spec - Get a spec within a project
pub async fn get_project_spec(
    State(state): State<AppState>,
    Path((project_id, spec_id)): Path<(String, String)>,
) -> ApiResult<Json<SpecDetail>> {
    let (loader, project) = get_spec_loader(&state, Some(&project_id)).await?;

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

    // Get dependency graph to compute required_by
    let all_specs = loader.load_all().unwrap_or_default();
    let dep_graph = DependencyGraph::new(&all_specs);

    let mut detail = SpecDetail::from(&spec).with_project_id(project.id.clone());

    // Compute required_by
    if let Some(complete) = dep_graph.get_complete_graph(&spec.path) {
        detail.required_by = complete
            .required_by
            .iter()
            .map(|s| s.path.clone())
            .collect();
        detail.relationships = Some(crate::types::SpecRelationships {
            depends_on: detail.depends_on.clone(),
            required_by: Some(detail.required_by.clone()),
        });
    }

    Ok(Json(detail))
}

/// POST /api/search - Search specs
pub async fn search_specs(
    State(state): State<AppState>,
    Json(req): Json<SearchRequest>,
) -> ApiResult<Json<SearchResponse>> {
    let (loader, project) = get_spec_loader(&state, req.project_id.as_deref()).await?;

    let all_specs = loader.load_all().map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiError::internal_error(&e.to_string())),
        )
    })?;

    let query_lower = req.query.to_lowercase();

    // Filter by search query
    let mut results: Vec<SpecSummary> = all_specs
        .iter()
        .filter(|s| {
            // Search in title, path, content, and tags
            s.title.to_lowercase().contains(&query_lower)
                || s.path.to_lowercase().contains(&query_lower)
                || s.content.to_lowercase().contains(&query_lower)
                || s.frontmatter
                    .tags
                    .iter()
                    .any(|t| t.to_lowercase().contains(&query_lower))
        })
        .filter(|s| {
            // Apply additional filters if provided
            if let Some(ref filters) = req.filters {
                if let Some(ref status) = filters.status {
                    if s.frontmatter.status.to_string() != *status {
                        return false;
                    }
                }
                if let Some(ref priority) = filters.priority {
                    match &s.frontmatter.priority {
                        Some(p) if p.to_string() == *priority => {}
                        _ => return false,
                    }
                }
                if let Some(ref tags) = filters.tags {
                    if !tags.iter().all(|t| s.frontmatter.tags.contains(t)) {
                        return false;
                    }
                }
            }
            true
        })
        .map(|s| SpecSummary::from(s).with_project_id(&project.id))
        .collect();

    // Sort by relevance (title matches first, then by spec number)
    results.sort_by(|a, b| {
        let a_title_match = a
            .title
            .as_ref()
            .map(|t| t.to_lowercase().contains(&query_lower))
            .unwrap_or(false);
        let b_title_match = b
            .title
            .as_ref()
            .map(|t| t.to_lowercase().contains(&query_lower))
            .unwrap_or(false);

        // Title matches come first
        match (a_title_match, b_title_match) {
            (true, false) => std::cmp::Ordering::Less,
            (false, true) => std::cmp::Ordering::Greater,
            _ => {
                // Then sort by spec number descending (newer first)
                b.spec_number.cmp(&a.spec_number)
            }
        }
    });

    let total = results.len();

    Ok(Json(SearchResponse {
        results,
        total,
        query: req.query,
        project_id: Some(project.id),
    }))
}

/// GET /api/stats - Get project statistics
pub async fn get_stats(State(state): State<AppState>) -> ApiResult<Json<StatsResponse>> {
    let (loader, project) = get_spec_loader(&state, None).await?;

    let all_specs = loader.load_all().map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiError::internal_error(&e.to_string())),
        )
    })?;

    let stats = SpecStats::compute(&all_specs);

    Ok(Json(StatsResponse::from_project_stats(
        stats,
        &project.id,
        all_specs.len(),
    )))
}

/// GET /api/projects/:projectId/stats - Project-scoped stats
pub async fn get_project_stats(
    State(state): State<AppState>,
    Path(project_id): Path<String>,
) -> ApiResult<Json<StatsResponse>> {
    let (loader, project) = get_spec_loader(&state, Some(&project_id)).await?;

    let all_specs = loader.load_all().map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiError::internal_error(&e.to_string())),
        )
    })?;

    let stats = SpecStats::compute(&all_specs);

    Ok(Json(StatsResponse::from_project_stats(
        stats,
        &project.id,
        all_specs.len(),
    )))
}

/// GET /api/deps/:spec - Get dependency graph for a spec
pub async fn get_dependencies(
    State(state): State<AppState>,
    Path(spec_id): Path<String>,
) -> ApiResult<Json<DependencyResponse>> {
    let (loader, _project) = get_spec_loader(&state, None).await?;

    let all_specs = loader.load_all().map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiError::internal_error(&e.to_string())),
        )
    })?;

    // Find the spec
    let spec = all_specs.iter().find(|s| {
        s.path == spec_id
            || s.path.starts_with(&format!("{}-", spec_id))
            || s.number().map(|n| n.to_string()) == Some(spec_id.clone())
    });

    let spec = spec.ok_or_else(|| {
        (
            StatusCode::NOT_FOUND,
            Json(ApiError::spec_not_found(&spec_id)),
        )
    })?;

    // Build dependency graph
    let dep_graph = DependencyGraph::new(&all_specs);

    let complete = dep_graph.get_complete_graph(&spec.path).ok_or_else(|| {
        (
            StatusCode::NOT_FOUND,
            Json(ApiError::spec_not_found(&spec_id)),
        )
    })?;

    Ok(Json(DependencyResponse {
        spec: SpecSummary::from(spec),
        depends_on: complete.depends_on.iter().map(SpecSummary::from).collect(),
        required_by: complete.required_by.iter().map(SpecSummary::from).collect(),
    }))
}

/// GET /api/projects/:projectId/dependencies - Dependency graph for a project
pub async fn get_project_dependencies(
    State(state): State<AppState>,
    Path(project_id): Path<String>,
) -> ApiResult<Json<crate::types::DependencyGraphResponse>> {
    let (loader, project) = get_spec_loader(&state, Some(&project_id)).await?;

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
            name: spec.path.clone(),
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
                    source: spec.path.clone(),
                    target: dep.clone(),
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

/// GET /api/validate - Validate all specs
pub async fn validate_all(State(state): State<AppState>) -> ApiResult<Json<ValidationResponse>> {
    let (loader, _project) = get_spec_loader(&state, None).await?;

    let all_specs = loader.load_all().map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiError::internal_error(&e.to_string())),
        )
    })?;

    let mut issues = Vec::new();

    let frontmatter_validator = FrontmatterValidator::new();
    let line_validator = LineCountValidator::new();
    let structure_validator = StructureValidator::new();

    for spec in &all_specs {
        // Frontmatter validation
        let result = frontmatter_validator.validate(spec);
        for issue in result.issues {
            issues.push(ValidationIssue {
                severity: issue.severity.to_string(),
                message: issue.message,
                spec: Some(spec.path.clone()),
            });
        }

        // Line count validation
        let result = line_validator.validate(spec);
        for issue in result.issues {
            issues.push(ValidationIssue {
                severity: issue.severity.to_string(),
                message: issue.message,
                spec: Some(spec.path.clone()),
            });
        }

        // Structure validation
        let result = structure_validator.validate(spec);
        for issue in result.issues {
            issues.push(ValidationIssue {
                severity: issue.severity.to_string(),
                message: issue.message,
                spec: Some(spec.path.clone()),
            });
        }
    }

    // Check for circular dependencies
    let dep_graph = DependencyGraph::new(&all_specs);
    let cycles = dep_graph.find_all_cycles();
    for cycle in cycles {
        issues.push(ValidationIssue {
            severity: "error".to_string(),
            message: format!("Circular dependency detected: {}", cycle.join(" → ")),
            // Cycles are guaranteed to be non-empty when returned from find_all_cycles
            spec: cycle.first().cloned(),
        });
    }

    let is_valid = issues.iter().all(|i| i.severity != "error");

    Ok(Json(ValidationResponse { is_valid, issues }))
}

/// GET /api/validate/:spec - Validate a single spec
pub async fn validate_spec(
    State(state): State<AppState>,
    Path(spec_id): Path<String>,
) -> ApiResult<Json<ValidationResponse>> {
    let (loader, _project) = get_spec_loader(&state, None).await?;

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

    let mut issues = Vec::new();

    let frontmatter_validator = FrontmatterValidator::new();
    let line_validator = LineCountValidator::new();
    let structure_validator = StructureValidator::new();

    // Frontmatter validation
    let result = frontmatter_validator.validate(&spec);
    for issue in result.issues {
        issues.push(ValidationIssue::from(&issue));
    }

    // Line count validation
    let result = line_validator.validate(&spec);
    for issue in result.issues {
        issues.push(ValidationIssue::from(&issue));
    }

    // Structure validation
    let result = structure_validator.validate(&spec);
    for issue in result.issues {
        issues.push(ValidationIssue::from(&issue));
    }

    // Check for circular dependencies involving this spec
    let all_specs = loader.load_all().unwrap_or_default();
    let dep_graph = DependencyGraph::new(&all_specs);
    if dep_graph.has_circular_dependency(&spec.path) {
        issues.push(ValidationIssue {
            severity: "error".to_string(),
            message: "Spec is part of a circular dependency".to_string(),
            spec: None,
        });
    }

    let is_valid = issues.iter().all(|i| i.severity != "error");

    Ok(Json(ValidationResponse { is_valid, issues }))
}

/// POST /api/projects/:projectId/validate - Project validation summary
pub async fn validate_project(
    State(state): State<AppState>,
    Path(project_id): Path<String>,
) -> ApiResult<Json<crate::types::ProjectValidationResponse>> {
    {
        let registry = state.registry.read().await;
        if registry.all().len() <= 1 {
            return Err((
                StatusCode::BAD_REQUEST,
                Json(ApiError::invalid_request(
                    "Project validation requires multi-project mode",
                )),
            ));
        }
    }

    let (loader, project) = get_spec_loader(&state, Some(&project_id)).await?;

    let all_specs = loader.load_all().map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiError::internal_error(&e.to_string())),
        )
    })?;

    let frontmatter_validator = FrontmatterValidator::new();
    let line_validator = LineCountValidator::new();
    let structure_validator = StructureValidator::new();

    let mut issues = Vec::new();
    for spec in &all_specs {
        issues.extend(frontmatter_validator.validate(spec).issues);
        issues.extend(line_validator.validate(spec).issues);
        issues.extend(structure_validator.validate(spec).issues);
    }

    let validation = crate::types::ProjectValidationSummary {
        is_valid: issues.is_empty(),
        error: None,
        specs_dir: Some(project.specs_dir.to_string_lossy().to_string()),
    };

    Ok(Json(crate::types::ProjectValidationResponse {
        project_id: project.id,
        path: project.path.to_string_lossy().to_string(),
        validation,
    }))
}

/// PATCH /api/specs/:spec/metadata - Update spec metadata
/// Note: This endpoint is not yet implemented
pub async fn update_metadata(
    State(_state): State<AppState>,
    Path(_spec_id): Path<String>,
    Json(_updates): Json<MetadataUpdate>,
) -> (StatusCode, Json<ApiError>) {
    // TODO: Implement metadata update using leanspec_core
    // This requires adding file writing capabilities
    (
        StatusCode::NOT_IMPLEMENTED,
        Json(ApiError::new(
            "NOT_IMPLEMENTED",
            "Metadata update is not yet implemented",
        )),
    )
}
