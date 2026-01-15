//! Spec operation handlers

use axum::extract::{Path, Query, State};
use axum::http::{HeaderMap, StatusCode};
use axum::Json;
use sha2::{Digest, Sha256};
use std::collections::HashMap;
use std::fs;
use std::path::Path as FsPath;

use leanspec_core::{
    DependencyGraph, MetadataUpdate as CoreMetadataUpdate, SpecArchiver, SpecFilterOptions,
    SpecLoader, SpecStats, SpecStatus, SpecWriter,
};

use crate::error::{ApiError, ApiResult};
use crate::project_registry::Project;
use crate::state::AppState;
use crate::sync_state::{machine_id_from_headers, PendingCommand, SyncCommand};
use crate::types::{
    ListSpecsQuery, ListSpecsResponse, MetadataUpdate, SearchRequest, SearchResponse, SpecDetail,
    SpecSummary, StatsResponse, SubSpec,
};
use crate::utils::resolve_project;

/// Helper to get the spec loader for a project (required project_id)
async fn get_spec_loader(
    state: &AppState,
    project_id: &str,
) -> Result<(SpecLoader, Project), (StatusCode, Json<ApiError>)> {
    let project = resolve_project(state, project_id).await?;
    let specs_dir = project.specs_dir.clone();

    Ok((SpecLoader::new(&specs_dir), project))
}

fn parse_status_filter(
    status: &Option<String>,
) -> Result<Option<Vec<SpecStatus>>, (StatusCode, Json<ApiError>)> {
    let parsed = status.as_ref().map(|s| {
        s.split(',')
            .filter_map(|s| s.parse().ok())
            .collect::<Vec<_>>()
    });

    if status.is_some() && parsed.as_ref().map_or(true, |v| v.is_empty()) {
        return Err((
            StatusCode::BAD_REQUEST,
            Json(ApiError::invalid_request("Invalid status filter")),
        ));
    }

    Ok(parsed)
}

fn strip_frontmatter(content: &str) -> String {
    let trimmed = content.trim_start();
    if !trimmed.starts_with("---") {
        return content.to_string();
    }

    let mut lines = trimmed.lines();
    // Skip opening ---
    lines.next();

    let mut in_frontmatter = true;
    let mut body = String::new();

    for line in lines {
        if in_frontmatter && line.trim() == "---" {
            in_frontmatter = false;
            continue;
        }

        if !in_frontmatter {
            body.push_str(line);
            body.push('\n');
        }
    }

    if in_frontmatter {
        return content.to_string();
    }

    body
}

fn hash_content(content: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(content.as_bytes());
    format!("{:x}", hasher.finalize())
}

fn spec_number_from_name(name: &str) -> Option<u32> {
    name.split('-').next()?.parse().ok()
}

fn summary_from_record(project_id: &str, record: &crate::sync_state::SpecRecord) -> SpecSummary {
    SpecSummary {
        project_id: Some(project_id.to_string()),
        id: record.spec_name.clone(),
        spec_number: spec_number_from_name(&record.spec_name),
        spec_name: record.spec_name.clone(),
        title: record.title.clone(),
        status: record.status.clone(),
        priority: record.priority.clone(),
        tags: record.tags.clone(),
        assignee: record.assignee.clone(),
        created_at: record.created_at,
        updated_at: record.updated_at,
        completed_at: record.completed_at,
        file_path: record
            .file_path
            .clone()
            .unwrap_or_else(|| record.spec_name.clone()),
        depends_on: record.depends_on.clone(),
        required_by: Vec::new(),
        content_hash: Some(record.content_hash.clone()),
        relationships: None,
    }
}

fn detail_from_record(project_id: &str, record: &crate::sync_state::SpecRecord) -> SpecDetail {
    SpecDetail {
        project_id: Some(project_id.to_string()),
        id: record.spec_name.clone(),
        spec_number: spec_number_from_name(&record.spec_name),
        spec_name: record.spec_name.clone(),
        title: record.title.clone(),
        status: record.status.clone(),
        priority: record.priority.clone(),
        tags: record.tags.clone(),
        assignee: record.assignee.clone(),
        content_md: record.content_md.clone(),
        created_at: record.created_at,
        updated_at: record.updated_at,
        completed_at: record.completed_at,
        file_path: record
            .file_path
            .clone()
            .unwrap_or_else(|| record.spec_name.clone()),
        depends_on: record.depends_on.clone(),
        required_by: Vec::new(),
        content_hash: Some(record.content_hash.clone()),
        relationships: None,
        sub_specs: None,
    }
}

fn format_sub_spec_name(file_name: &str) -> String {
    let base = file_name.trim_end_matches(".md");
    base.split(['-', '_'])
        .filter(|part| !part.is_empty())
        .map(|part| {
            if part.len() <= 4 && part.chars().all(|c| c.is_ascii_uppercase()) {
                part.to_string()
            } else {
                let mut chars = part.chars();
                if let Some(first) = chars.next() {
                    format!("{}{}", first.to_uppercase(), chars.as_str().to_lowercase())
                } else {
                    String::new()
                }
            }
        })
        .collect::<Vec<_>>()
        .join(" ")
}

fn detect_sub_specs(readme_path: &str) -> Vec<SubSpec> {
    let Some(parent_dir) = FsPath::new(readme_path).parent() else {
        return Vec::new();
    };

    let mut sub_specs = Vec::new();

    let entries = match fs::read_dir(parent_dir) {
        Ok(entries) => entries,
        Err(_) => return sub_specs,
    };

    for entry in entries.flatten() {
        let path = entry.path();
        if path.is_dir() {
            continue;
        }

        let Some(file_name) = path.file_name().and_then(|n| n.to_str()) else {
            continue;
        };

        let lower_name = file_name.to_ascii_lowercase();
        if file_name == "README.md" || !lower_name.ends_with(".md") {
            continue;
        }

        let Ok(raw) = fs::read_to_string(&path) else {
            continue;
        };

        let content = strip_frontmatter(&raw);

        sub_specs.push(SubSpec {
            name: format_sub_spec_name(file_name),
            file: file_name.to_string(),
            content,
        });
    }

    sub_specs.sort_by(|a, b| a.file.to_lowercase().cmp(&b.file.to_lowercase()));
    sub_specs
}

/// GET /api/projects/:projectId/specs - List specs for a project
pub async fn list_project_specs(
    State(state): State<AppState>,
    Path(project_id): Path<String>,
    Query(query): Query<ListSpecsQuery>,
    headers: HeaderMap,
) -> ApiResult<Json<ListSpecsResponse>> {
    if let Some(machine_id) = machine_id_from_headers(&headers) {
        let sync_state = state.sync_state.read().await;
        let machine = sync_state
            .persistent
            .machines
            .get(&machine_id)
            .ok_or_else(|| {
                (
                    StatusCode::NOT_FOUND,
                    Json(ApiError::invalid_request("Machine not found")),
                )
            })?;

        if machine.revoked {
            return Err((
                StatusCode::FORBIDDEN,
                Json(ApiError::unauthorized("Machine revoked")),
            ));
        }

        let project = machine.projects.get(&project_id).ok_or_else(|| {
            (
                StatusCode::NOT_FOUND,
                Json(ApiError::project_not_found(&project_id)),
            )
        })?;

        let status_filter = parse_status_filter(&query.status)?.map(|values| {
            values
                .into_iter()
                .map(|s| s.to_string())
                .collect::<Vec<_>>()
        });

        let priority_filter = query
            .priority
            .map(|s| s.split(',').map(|v| v.to_string()).collect::<Vec<_>>());

        let tags_filter = query
            .tags
            .map(|s| s.split(',').map(|v| v.to_string()).collect::<Vec<_>>());

        let mut required_by_map: HashMap<String, Vec<String>> = HashMap::new();
        for spec in project.specs.values() {
            for dep in &spec.depends_on {
                required_by_map
                    .entry(dep.clone())
                    .or_default()
                    .push(spec.spec_name.clone());
            }
        }

        let filtered_specs: Vec<SpecSummary> = project
            .specs
            .values()
            .filter(|spec| {
                if let Some(statuses) = &status_filter {
                    if !statuses.contains(&spec.status) {
                        return false;
                    }
                }

                if let Some(priorities) = &priority_filter {
                    match &spec.priority {
                        Some(priority) if priorities.contains(priority) => {}
                        None if priorities.is_empty() => {}
                        _ => return false,
                    }
                }

                if let Some(tags) = &tags_filter {
                    if !tags.iter().all(|tag| spec.tags.contains(tag)) {
                        return false;
                    }
                }

                true
            })
            .map(|spec| {
                let mut summary = summary_from_record(&project.id, spec);
                let required_by = required_by_map
                    .get(&spec.spec_name)
                    .cloned()
                    .unwrap_or_default();
                summary.required_by = required_by.clone();
                summary.relationships = Some(crate::types::SpecRelationships {
                    depends_on: summary.depends_on.clone(),
                    required_by: Some(required_by),
                });
                summary
            })
            .collect();

        let total = filtered_specs.len();

        return Ok(Json(ListSpecsResponse {
            specs: filtered_specs,
            total,
            project_id: Some(project.id.clone()),
        }));
    }

    let (loader, project) = get_spec_loader(&state, &project_id).await?;

    let all_specs = loader.load_all().map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiError::internal_error(&e.to_string())),
        )
    })?;

    let status_filter = parse_status_filter(&query.status)?;

    // Apply filters
    let filters = SpecFilterOptions {
        status: status_filter,
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

/// GET /api/projects/:projectId/specs/:spec - Get a spec within a project
pub async fn get_project_spec(
    State(state): State<AppState>,
    Path((project_id, spec_id)): Path<(String, String)>,
    headers: HeaderMap,
) -> ApiResult<Json<SpecDetail>> {
    if let Some(machine_id) = machine_id_from_headers(&headers) {
        let sync_state = state.sync_state.read().await;
        let machine = sync_state
            .persistent
            .machines
            .get(&machine_id)
            .ok_or_else(|| {
                (
                    StatusCode::NOT_FOUND,
                    Json(ApiError::invalid_request("Machine not found")),
                )
            })?;

        let project = machine.projects.get(&project_id).ok_or_else(|| {
            (
                StatusCode::NOT_FOUND,
                Json(ApiError::project_not_found(&project_id)),
            )
        })?;

        let record = project.specs.get(&spec_id).ok_or_else(|| {
            (
                StatusCode::NOT_FOUND,
                Json(ApiError::spec_not_found(&spec_id)),
            )
        })?;

        let mut detail = detail_from_record(&project.id, record);

        let required_by = project
            .specs
            .values()
            .filter(|spec| spec.depends_on.contains(&record.spec_name))
            .map(|spec| spec.spec_name.clone())
            .collect::<Vec<_>>();

        detail.required_by = required_by.clone();
        detail.relationships = Some(crate::types::SpecRelationships {
            depends_on: detail.depends_on.clone(),
            required_by: Some(required_by),
        });

        return Ok(Json(detail));
    }

    let (loader, project) = get_spec_loader(&state, &project_id).await?;

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
        let required_by: Vec<String> = complete
            .required_by
            .iter()
            .map(|s| s.path.clone())
            .collect();
        detail.required_by = required_by.clone();
        detail.relationships = Some(crate::types::SpecRelationships {
            depends_on: detail.depends_on.clone(),
            required_by: Some(required_by),
        });
    }

    let sub_specs = detect_sub_specs(&detail.file_path);
    if !sub_specs.is_empty() {
        detail.sub_specs = Some(sub_specs);
    }

    Ok(Json(detail))
}

/// POST /api/projects/:projectId/search - Search specs in a project
pub async fn search_project_specs(
    State(state): State<AppState>,
    Path(project_id): Path<String>,
    headers: HeaderMap,
    Json(req): Json<SearchRequest>,
) -> ApiResult<Json<SearchResponse>> {
    if let Some(machine_id) = machine_id_from_headers(&headers) {
        let sync_state = state.sync_state.read().await;
        let machine = sync_state
            .persistent
            .machines
            .get(&machine_id)
            .ok_or_else(|| {
                (
                    StatusCode::NOT_FOUND,
                    Json(ApiError::invalid_request("Machine not found")),
                )
            })?;

        let project = machine.projects.get(&project_id).ok_or_else(|| {
            (
                StatusCode::NOT_FOUND,
                Json(ApiError::project_not_found(&project_id)),
            )
        })?;

        let query_lower = req.query.to_lowercase();
        let mut results: Vec<SpecSummary> = project
            .specs
            .values()
            .filter(|spec| {
                spec.spec_name.to_lowercase().contains(&query_lower)
                    || spec
                        .title
                        .as_ref()
                        .map(|title| title.to_lowercase().contains(&query_lower))
                        .unwrap_or(false)
                    || spec.content_md.to_lowercase().contains(&query_lower)
                    || spec
                        .tags
                        .iter()
                        .any(|tag| tag.to_lowercase().contains(&query_lower))
            })
            .filter(|spec| {
                if let Some(ref filters) = req.filters {
                    if let Some(ref status) = filters.status {
                        if &spec.status != status {
                            return false;
                        }
                    }
                    if let Some(ref priority) = filters.priority {
                        match &spec.priority {
                            Some(p) if p == priority => {}
                            _ => return false,
                        }
                    }
                    if let Some(ref tags) = filters.tags {
                        if !tags.iter().all(|t| spec.tags.contains(t)) {
                            return false;
                        }
                    }
                }
                true
            })
            .map(|spec| summary_from_record(&project.id, spec))
            .collect();

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

            match (a_title_match, b_title_match) {
                (true, false) => std::cmp::Ordering::Less,
                (false, true) => std::cmp::Ordering::Greater,
                _ => b.spec_number.cmp(&a.spec_number),
            }
        });

        let total = results.len();
        return Ok(Json(SearchResponse {
            results,
            total,
            query: req.query,
            project_id: Some(project.id.clone()),
        }));
    }

    let (loader, project) = get_spec_loader(&state, &project_id).await?;

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

/// GET /api/projects/:projectId/stats - Project statistics
pub async fn get_project_stats(
    State(state): State<AppState>,
    Path(project_id): Path<String>,
    headers: HeaderMap,
) -> ApiResult<Json<StatsResponse>> {
    if let Some(machine_id) = machine_id_from_headers(&headers) {
        let sync_state = state.sync_state.read().await;
        let machine = sync_state
            .persistent
            .machines
            .get(&machine_id)
            .ok_or_else(|| {
                (
                    StatusCode::NOT_FOUND,
                    Json(ApiError::invalid_request("Machine not found")),
                )
            })?;

        let project = machine.projects.get(&project_id).ok_or_else(|| {
            (
                StatusCode::NOT_FOUND,
                Json(ApiError::project_not_found(&project_id)),
            )
        })?;

        let mut by_status: HashMap<String, usize> = HashMap::new();
        let mut by_priority: HashMap<String, usize> = HashMap::new();
        let mut completed = 0usize;

        for spec in project.specs.values() {
            *by_status.entry(spec.status.clone()).or_insert(0) += 1;
            if let Some(priority) = &spec.priority {
                *by_priority.entry(priority.clone()).or_insert(0) += 1;
            }
            if spec.status == "complete" {
                completed += 1;
            }
        }

        let total_specs = project.specs.len();
        let completion_rate = if total_specs == 0 {
            0.0
        } else {
            (completed as f64 / total_specs as f64) * 100.0
        };

        return Ok(Json(StatsResponse {
            total_projects: 1,
            total_specs,
            specs_by_status: by_status
                .into_iter()
                .map(|(status, count)| crate::types::StatusCountItem { status, count })
                .collect(),
            specs_by_priority: by_priority
                .into_iter()
                .map(|(priority, count)| crate::types::PriorityCountItem { priority, count })
                .collect(),
            completion_rate,
            project_id: Some(project.id.clone()),
        }));
    }

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
    headers: HeaderMap,
) -> ApiResult<Json<crate::types::DependencyGraphResponse>> {
    if let Some(machine_id) = machine_id_from_headers(&headers) {
        let sync_state = state.sync_state.read().await;
        let machine = sync_state
            .persistent
            .machines
            .get(&machine_id)
            .ok_or_else(|| {
                (
                    StatusCode::NOT_FOUND,
                    Json(ApiError::invalid_request("Machine not found")),
                )
            })?;

        let project = machine.projects.get(&project_id).ok_or_else(|| {
            (
                StatusCode::NOT_FOUND,
                Json(ApiError::project_not_found(&project_id)),
            )
        })?;

        let mut nodes = Vec::new();
        let mut edges = Vec::new();
        let spec_map: HashMap<String, _> = project
            .specs
            .values()
            .map(|spec| (spec.spec_name.clone(), spec))
            .collect();

        for spec in project.specs.values() {
            nodes.push(crate::types::DependencyNode {
                id: spec.spec_name.clone(),
                name: spec
                    .title
                    .clone()
                    .filter(|t| !t.is_empty())
                    .unwrap_or_else(|| spec.spec_name.clone()),
                number: spec_number_from_name(&spec.spec_name).unwrap_or(0),
                status: spec.status.clone(),
                priority: spec
                    .priority
                    .clone()
                    .unwrap_or_else(|| "medium".to_string()),
                tags: spec.tags.clone(),
            });

            for dep in &spec.depends_on {
                if spec_map.contains_key(dep) {
                    edges.push(crate::types::DependencyEdge {
                        source: dep.clone(),
                        target: spec.spec_name.clone(),
                        r#type: Some("dependsOn".to_string()),
                    });
                }
            }
        }

        return Ok(Json(crate::types::DependencyGraphResponse {
            project_id: Some(project.id.clone()),
            nodes,
            edges,
        }));
    }

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

/// PATCH /api/projects/:projectId/specs/:spec/metadata - Update spec metadata
pub async fn update_project_metadata(
    State(state): State<AppState>,
    Path((project_id, spec_id)): Path<(String, String)>,
    headers: HeaderMap,
    Json(updates): Json<MetadataUpdate>,
) -> ApiResult<Json<crate::types::UpdateMetadataResponse>> {
    if let Some(machine_id) = machine_id_from_headers(&headers) {
        let mut sync_state = state.sync_state.write().await;
        let is_online = sync_state.is_machine_online(&machine_id);
        let sender = sync_state.connections.get(&machine_id).cloned();

        let (command, frontmatter) = {
            let machine = sync_state
                .persistent
                .machines
                .get_mut(&machine_id)
                .ok_or_else(|| {
                    (
                        StatusCode::NOT_FOUND,
                        Json(ApiError::invalid_request("Machine not found")),
                    )
                })?;

            let project = machine.projects.get_mut(&project_id).ok_or_else(|| {
                (
                    StatusCode::NOT_FOUND,
                    Json(ApiError::project_not_found(&project_id)),
                )
            })?;

            let spec = project.specs.get(&spec_id).ok_or_else(|| {
                (
                    StatusCode::NOT_FOUND,
                    Json(ApiError::spec_not_found(&spec_id)),
                )
            })?;

            if !is_online {
                return Err((
                    StatusCode::SERVICE_UNAVAILABLE,
                    Json(ApiError::invalid_request("Machine unavailable")),
                ));
            }

            if let Some(expected_hash) = &updates.expected_content_hash {
                if expected_hash != &spec.content_hash {
                    return Err((
                        StatusCode::CONFLICT,
                        Json(
                            ApiError::invalid_request("Content hash mismatch")
                                .with_details(spec.content_hash.clone()),
                        ),
                    ));
                }
            }

            let command = PendingCommand {
                id: uuid::Uuid::new_v4().to_string(),
                command: SyncCommand::ApplyMetadata {
                    project_id: project_id.clone(),
                    spec_name: spec_id.clone(),
                    status: updates.status.clone(),
                    priority: updates.priority.clone(),
                    tags: updates.tags.clone(),
                    expected_content_hash: updates.expected_content_hash.clone(),
                },
                created_at: chrono::Utc::now(),
            };

            machine.pending_commands.push(command.clone());

            let frontmatter = crate::types::FrontmatterResponse {
                status: spec.status.clone(),
                created: spec
                    .created_at
                    .map(|ts| ts.date_naive().to_string())
                    .unwrap_or_default(),
                priority: spec.priority.clone(),
                tags: spec.tags.clone(),
                depends_on: spec.depends_on.clone(),
                assignee: spec.assignee.clone(),
                created_at: spec.created_at,
                updated_at: spec.updated_at,
                completed_at: spec.completed_at,
            };

            (command, frontmatter)
        };

        if let Some(sender) = sender {
            let _ = sender.send(axum::extract::ws::Message::Text(
                serde_json::to_string(&command).unwrap_or_default().into(),
            ));
        }

        sync_state
            .persistent
            .audit_log
            .push(crate::sync_state::AuditLogEntry {
                id: uuid::Uuid::new_v4().to_string(),
                machine_id: machine_id.clone(),
                project_id: Some(project_id.clone()),
                spec_name: Some(spec_id.clone()),
                action: "apply_metadata".to_string(),
                status: "queued".to_string(),
                message: None,
                created_at: chrono::Utc::now(),
            });
        sync_state.save();

        return Ok(Json(crate::types::UpdateMetadataResponse {
            success: true,
            spec_id: spec_id.clone(),
            frontmatter,
        }));
    }

    let (loader, project) = get_spec_loader(&state, &project_id).await?;

    // Verify spec exists
    let spec = loader.load(&spec_id).map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiError::internal_error(&e.to_string())),
        )
    })?;

    if spec.is_none() {
        return Err((
            StatusCode::NOT_FOUND,
            Json(ApiError::spec_not_found(&spec_id)),
        ));
    }

    if let Some(expected_hash) = &updates.expected_content_hash {
        let current_hash = hash_content(&spec.as_ref().unwrap().content);
        if expected_hash != &current_hash {
            return Err((
                StatusCode::CONFLICT,
                Json(ApiError::invalid_request("Content hash mismatch").with_details(current_hash)),
            ));
        }
    }

    // Check if status is being updated to "archived"
    let is_archiving = updates
        .status
        .as_ref()
        .map(|s| s == "archived")
        .unwrap_or(false);

    // If archiving, use the archiver to move the spec to archived/ folder
    if is_archiving {
        let archiver = SpecArchiver::new(&project.specs_dir);
        archiver.archive(&spec_id).map_err(|e| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiError::internal_error(&e.to_string())),
            )
        })?;

        // Reload the spec from its new location
        let archived_path = format!("archived/{}", spec_id);
        let updated_spec = loader.load(&archived_path).map_err(|e| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiError::internal_error(&e.to_string())),
            )
        })?;

        let frontmatter = updated_spec
            .ok_or_else(|| {
                (
                    StatusCode::NOT_FOUND,
                    Json(ApiError::spec_not_found(&archived_path)),
                )
            })?
            .frontmatter;

        return Ok(Json(crate::types::UpdateMetadataResponse {
            success: true,
            spec_id: spec_id.clone(),
            frontmatter: crate::types::FrontmatterResponse::from(&frontmatter),
        }));
    }

    // Convert HTTP metadata update to core metadata update
    let mut core_updates = CoreMetadataUpdate::new();

    if let Some(status_str) = &updates.status {
        let status = status_str.parse().map_err(|_| {
            (
                StatusCode::BAD_REQUEST,
                Json(ApiError::invalid_request(&format!(
                    "Invalid status: {}",
                    status_str
                ))),
            )
        })?;
        core_updates = core_updates.with_status(status);
    }

    if let Some(priority_str) = &updates.priority {
        let priority = priority_str.parse().map_err(|_| {
            (
                StatusCode::BAD_REQUEST,
                Json(ApiError::invalid_request(&format!(
                    "Invalid priority: {}",
                    priority_str
                ))),
            )
        })?;
        core_updates = core_updates.with_priority(priority);
    }

    if let Some(tags) = updates.tags {
        core_updates = core_updates.with_tags(tags);
    }

    if let Some(assignee) = updates.assignee {
        core_updates = core_updates.with_assignee(assignee);
    }

    // Update metadata using spec writer
    let writer = SpecWriter::new(&project.specs_dir);
    let frontmatter = writer
        .update_metadata(&spec_id, core_updates)
        .map_err(|e| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiError::internal_error(&e.to_string())),
            )
        })?;

    Ok(Json(crate::types::UpdateMetadataResponse {
        success: true,
        spec_id: spec_id.clone(),
        frontmatter: crate::types::FrontmatterResponse::from(&frontmatter),
    }))
}
