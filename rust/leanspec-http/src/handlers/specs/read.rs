//! Spec read handlers

#![allow(clippy::result_large_err)]

use std::collections::{HashMap, HashSet};
use std::fs;

use axum::extract::{Path, Query, State};
use axum::http::StatusCode;
use axum::Json;

use leanspec_core::adapters::ListFilter;
use leanspec_core::{semantic, SpecDoc, SpecSchema};

use crate::error::{ApiError, ApiResult};
use crate::state::AppState;

use crate::types::{
    HierarchyNode, ListSpecsQuery, ListSpecsResponse, SearchRequest, SearchResponse, SpecDetail,
    SpecRawResponse, SpecRelationships, SpecSummary,
};

use super::helpers::{
    adapter_error, detect_sub_specs, get_adapter_and_project, hash_raw_content,
    require_markdown_adapter, resolve_markdown_spec_path,
};

const LINK_PARENT: &str = "parent";
const LINK_DEPENDS_ON: &str = "depends_on";

fn parse_csv_filter(value: &Option<String>) -> Option<Vec<String>> {
    value.as_ref().map(|s| {
        s.split(',')
            .map(|part| part.trim().to_string())
            .filter(|s| !s.is_empty())
            .collect()
    })
}

fn build_list_filter(query: &ListSpecsQuery, schema: &SpecSchema) -> ListFilter {
    let mut fields: HashMap<String, Vec<String>> = HashMap::new();

    if let Some(values) = parse_csv_filter(&query.status) {
        if !values.is_empty() {
            if let Some(key) = schema.key_for_semantic(semantic::STATUS) {
                fields.insert(key.to_string(), values);
            }
        }
    }
    if let Some(values) = parse_csv_filter(&query.priority) {
        if !values.is_empty() {
            if let Some(key) = schema.key_for_semantic(semantic::PRIORITY) {
                fields.insert(key.to_string(), values);
            }
        }
    }
    if let Some(values) = parse_csv_filter(&query.tags) {
        if !values.is_empty() {
            if let Some(key) = schema.key_for_semantic(semantic::TAGS) {
                fields.insert(key.to_string(), values);
            }
        }
    }
    if let Some(assignee) = query.assignee.as_ref().filter(|s| !s.is_empty()) {
        if let Some(key) = schema.key_for_semantic(semantic::ASSIGNEE) {
            fields.insert(key.to_string(), vec![assignee.clone()]);
        }
    }

    // Status filter explicitly "archived" implies include_archived; otherwise
    // the user's archived specs are filtered out by the adapter list pass.
    let include_archived = fields
        .get(
            schema
                .key_for_semantic(semantic::STATUS)
                .unwrap_or("status"),
        )
        .map(|values| values.iter().any(|v| v == "archived"))
        .unwrap_or(false);

    ListFilter {
        fields,
        text: None,
        include_archived,
        raw: None,
    }
}

fn apply_pagination<T>(items: Vec<T>, offset: Option<usize>, limit: Option<usize>) -> Vec<T> {
    let start = offset.unwrap_or(0);
    let iter = items.into_iter().skip(start);
    match limit {
        Some(limit) => iter.take(limit).collect(),
        None => iter.collect(),
    }
}

fn resolve_pagination(
    query: &ListSpecsQuery,
) -> Result<(usize, Option<usize>), (StatusCode, Json<ApiError>)> {
    if let Some(cursor) = query.cursor.as_ref() {
        let offset = cursor.parse::<usize>().map_err(|_| {
            (
                StatusCode::BAD_REQUEST,
                Json(ApiError::invalid_request("Invalid cursor value")),
            )
        })?;
        let limit = Some(query.limit.unwrap_or(50));
        Ok((offset, limit))
    } else {
        Ok((query.offset.unwrap_or(0), query.limit))
    }
}

fn next_cursor(total: usize, offset: usize, limit: Option<usize>) -> Option<String> {
    let limit = limit?;
    let end = offset.saturating_add(limit);
    if end < total {
        Some(end.to_string())
    } else {
        None
    }
}

/// Build child→parent and parent→children maps from the document set's links.
fn build_relationship_index(docs: &[SpecDoc]) -> RelationshipIndex {
    let mut parent_by_child: HashMap<String, String> = HashMap::new();
    let mut children_by_parent: HashMap<String, Vec<String>> = HashMap::new();
    let mut required_by: HashMap<String, Vec<String>> = HashMap::new();

    for doc in docs {
        for link in &doc.links {
            match link.link_type.as_str() {
                LINK_PARENT => {
                    parent_by_child.insert(doc.id.clone(), link.target_id.clone());
                    children_by_parent
                        .entry(link.target_id.clone())
                        .or_default()
                        .push(doc.id.clone());
                }
                LINK_DEPENDS_ON => {
                    if link.target_id != doc.id {
                        required_by
                            .entry(link.target_id.clone())
                            .or_default()
                            .push(doc.id.clone());
                    }
                }
                _ => {}
            }
        }
    }

    for list in children_by_parent.values_mut() {
        list.sort();
        list.dedup();
    }
    for list in required_by.values_mut() {
        list.sort();
        list.dedup();
    }

    RelationshipIndex {
        parent_by_child,
        children_by_parent,
        required_by,
    }
}

struct RelationshipIndex {
    parent_by_child: HashMap<String, String>,
    children_by_parent: HashMap<String, Vec<String>>,
    required_by: HashMap<String, Vec<String>>,
}

fn sort_hierarchy_nodes(nodes: &mut [HierarchyNode]) {
    nodes.sort_by(|a, b| match (b.spec.spec_number, a.spec.spec_number) {
        (Some(bn), Some(an)) => bn.cmp(&an),
        (Some(_), None) => std::cmp::Ordering::Less,
        (None, Some(_)) => std::cmp::Ordering::Greater,
        (None, None) => b.spec.spec_name.cmp(&a.spec.spec_name),
    });

    for node in nodes.iter_mut() {
        sort_hierarchy_nodes(&mut node.child_nodes);
    }
}

fn build_hierarchy(summaries: &[SpecSummary], index: &RelationshipIndex) -> Vec<HierarchyNode> {
    let summaries_by_id: HashMap<String, SpecSummary> = summaries
        .iter()
        .map(|s| (s.spec_name.clone(), s.clone()))
        .collect();
    let allowed: HashSet<String> = summaries_by_id.keys().cloned().collect();

    fn walk(
        id: &str,
        allowed: &HashSet<String>,
        summaries_by_id: &HashMap<String, SpecSummary>,
        children_by_parent: &HashMap<String, Vec<String>>,
    ) -> Vec<HierarchyNode> {
        let mut out = Vec::new();
        let children = children_by_parent.get(id).cloned().unwrap_or_default();
        for child in children {
            let descendants = walk(&child, allowed, summaries_by_id, children_by_parent);
            if allowed.contains(&child) {
                if let Some(spec) = summaries_by_id.get(&child) {
                    out.push(HierarchyNode {
                        spec: spec.clone(),
                        child_nodes: descendants,
                    });
                }
            } else {
                out.extend(descendants);
            }
        }
        out
    }

    let mut roots: Vec<HierarchyNode> = Vec::new();
    for summary in summaries {
        let id = &summary.spec_name;
        let parent_in_set = index
            .parent_by_child
            .get(id)
            .map(|p| allowed.contains(p))
            .unwrap_or(false);
        if parent_in_set {
            continue;
        }
        let children = walk(id, &allowed, &summaries_by_id, &index.children_by_parent);
        roots.push(HierarchyNode {
            spec: summary.clone(),
            child_nodes: children,
        });
    }

    sort_hierarchy_nodes(&mut roots);
    roots
}

fn doc_url_or_default(doc: &SpecDoc) -> String {
    doc.url.clone().unwrap_or_default()
}

fn enrich_summary_from_doc(summary: &mut SpecSummary, doc: &SpecDoc, index: &RelationshipIndex) {
    summary.children = index
        .children_by_parent
        .get(&doc.id)
        .cloned()
        .unwrap_or_default();
    summary.required_by = index.required_by.get(&doc.id).cloned().unwrap_or_default();
    summary.relationships = Some(SpecRelationships {
        depends_on: summary.depends_on.clone(),
        required_by: Some(summary.required_by.clone()),
    });
}

/// GET /api/projects/:projectId/specs - List specs for a project
pub async fn list_project_specs(
    State(state): State<AppState>,
    Path(project_id): Path<String>,
    Query(query): Query<ListSpecsQuery>,
) -> ApiResult<Json<ListSpecsResponse>> {
    let (page_offset, page_limit) = resolve_pagination(&query)?;

    let (adapter, project) = get_adapter_and_project(&state, &project_id).await?;
    let schema = adapter.schema();

    let filter = build_list_filter(&query, schema);
    let docs = adapter.list(&filter).map_err(adapter_error)?;

    let index = build_relationship_index(&docs);

    let mut filtered_specs: Vec<SpecSummary> = docs
        .iter()
        .map(|doc| {
            let mut summary = SpecSummary::from_doc(doc, schema).with_project_id(&project.id);
            // Markdown adapter populates url=None; for filesystem URL we leave
            // the file_path empty and rely on the adapter for raw access.
            summary.file_path = doc_url_or_default(doc);
            enrich_summary_from_doc(&mut summary, doc, &index);
            summary
        })
        .collect();

    filtered_specs.sort_by(|a, b| {
        b.spec_number
            .cmp(&a.spec_number)
            .then_with(|| b.spec_name.cmp(&a.spec_name))
    });

    let total = filtered_specs.len();
    let hierarchy_requested = query.hierarchy.unwrap_or(false);
    let paged_specs = if hierarchy_requested {
        filtered_specs.clone()
    } else {
        apply_pagination(filtered_specs.clone(), Some(page_offset), page_limit)
    };
    let next_cursor = if hierarchy_requested {
        None
    } else {
        next_cursor(total, page_offset, page_limit)
    };

    let hierarchy = if hierarchy_requested {
        Some(build_hierarchy(&filtered_specs, &index))
    } else {
        None
    };

    Ok(Json(ListSpecsResponse {
        specs: paged_specs,
        total,
        next_cursor,
        project_id: Some(project.id),
        hierarchy,
    }))
}

/// GET /api/projects/:projectId/specs/:spec - Get a spec within a project
pub async fn get_project_spec(
    State(state): State<AppState>,
    Path((project_id, spec_id)): Path<(String, String)>,
) -> ApiResult<Json<SpecDetail>> {
    let (adapter, project) = get_adapter_and_project(&state, &project_id).await?;
    let schema = adapter.schema();

    let doc = adapter.get(&spec_id).map_err(adapter_error)?;

    let mut detail = SpecDetail::from_doc(&doc, schema).with_project_id(project.id.clone());

    // Compute required_by/children from the full document set.
    let all_docs = adapter
        .list(&ListFilter {
            include_archived: true,
            ..Default::default()
        })
        .map_err(adapter_error)?;
    let index = build_relationship_index(&all_docs);

    let required_by = index.required_by.get(&doc.id).cloned().unwrap_or_default();
    detail.required_by = required_by.clone();
    detail.relationships = Some(SpecRelationships {
        depends_on: detail.depends_on.clone(),
        required_by: Some(required_by),
    });
    detail.children = index
        .children_by_parent
        .get(&doc.id)
        .cloned()
        .unwrap_or_default();

    // Markdown adapter exposes the on-disk path; populate it for the UI.
    if adapter.capabilities().name == "markdown" {
        if let Some(path) = resolve_markdown_spec_path(&project.specs_dir, &spec_id) {
            detail = detail.with_file_path(path.to_string_lossy().to_string());
            let sub_specs = detect_sub_specs(&detail.file_path);
            if !sub_specs.is_empty() {
                detail.sub_specs = Some(sub_specs);
            }
        }
    }

    Ok(Json(detail))
}

/// GET /api/projects/:projectId/specs/:spec/raw - Get raw spec content
pub async fn get_project_spec_raw(
    State(state): State<AppState>,
    Path((project_id, spec_id)): Path<(String, String)>,
) -> ApiResult<Json<SpecRawResponse>> {
    let (adapter, project) = get_adapter_and_project(&state, &project_id).await?;
    require_markdown_adapter(adapter.as_ref())?;

    // Surface a 404 if the spec doesn't exist at all.
    adapter.get(&spec_id).map_err(adapter_error)?;

    let file_path = resolve_markdown_spec_path(&project.specs_dir, &spec_id).ok_or_else(|| {
        (
            StatusCode::NOT_FOUND,
            Json(ApiError::spec_not_found(&spec_id)),
        )
    })?;

    let content = fs::read_to_string(&file_path).map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiError::internal_error(&e.to_string())),
        )
    })?;
    let content_hash = hash_raw_content(&content);

    Ok(Json(SpecRawResponse {
        content,
        content_hash,
        file_path: file_path.to_string_lossy().to_string(),
    }))
}

/// GET /api/projects/:projectId/specs/:spec/subspecs/:file/raw - Get raw sub-spec content
pub async fn get_project_subspec_raw(
    State(state): State<AppState>,
    Path((project_id, spec_id, file)): Path<(String, String, String)>,
) -> ApiResult<Json<SpecRawResponse>> {
    if file.contains('/') || file.contains('\\') {
        return Err((
            StatusCode::BAD_REQUEST,
            Json(ApiError::invalid_request("Invalid sub-spec file")),
        ));
    }

    let (adapter, project) = get_adapter_and_project(&state, &project_id).await?;
    require_markdown_adapter(adapter.as_ref())?;

    adapter.get(&spec_id).map_err(adapter_error)?;

    let spec_readme =
        resolve_markdown_spec_path(&project.specs_dir, &spec_id).ok_or_else(|| {
            (
                StatusCode::NOT_FOUND,
                Json(ApiError::spec_not_found(&spec_id)),
            )
        })?;

    let parent_dir = spec_readme.parent().ok_or_else(|| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiError::internal_error("Missing spec directory")),
        )
    })?;
    let file_path = parent_dir.join(&file);
    if !file_path.exists() {
        return Err((
            StatusCode::NOT_FOUND,
            Json(ApiError::invalid_request("Sub-spec not found")),
        ));
    }

    let content = fs::read_to_string(&file_path).map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiError::internal_error(&e.to_string())),
        )
    })?;
    let content_hash = hash_raw_content(&content);

    Ok(Json(SpecRawResponse {
        content,
        content_hash,
        file_path: file_path.to_string_lossy().to_string(),
    }))
}

/// POST /api/projects/:projectId/search - Search specs in a project
pub async fn search_project_specs(
    State(state): State<AppState>,
    Path(project_id): Path<String>,
    Json(req): Json<SearchRequest>,
) -> ApiResult<Json<SearchResponse>> {
    let (adapter, project) = get_adapter_and_project(&state, &project_id).await?;
    let schema = adapter.schema();

    // Build a filter that combines free-text with field constraints from the
    // structured request body. The adapter's list pass handles equality on
    // status/priority/tags so the UI doesn't have to re-implement filtering.
    let mut fields: HashMap<String, Vec<String>> = HashMap::new();
    if let Some(filters) = req.filters.as_ref() {
        if let Some(status) = filters.status.as_ref().filter(|s| !s.is_empty()) {
            if let Some(key) = schema.key_for_semantic(semantic::STATUS) {
                fields.insert(key.to_string(), vec![status.clone()]);
            }
        }
        if let Some(priority) = filters.priority.as_ref().filter(|s| !s.is_empty()) {
            if let Some(key) = schema.key_for_semantic(semantic::PRIORITY) {
                fields.insert(key.to_string(), vec![priority.clone()]);
            }
        }
        if let Some(tags) = filters.tags.as_ref().filter(|t| !t.is_empty()) {
            if let Some(key) = schema.key_for_semantic(semantic::TAGS) {
                fields.insert(key.to_string(), tags.clone());
            }
        }
    }

    let text = if req.query.trim().is_empty() {
        None
    } else {
        Some(req.query.clone())
    };

    let filter = ListFilter {
        fields,
        text,
        include_archived: false,
        raw: None,
    };

    let docs = adapter.list(&filter).map_err(adapter_error)?;

    let results: Vec<SpecSummary> = docs
        .iter()
        .map(|doc| {
            let mut summary =
                SpecSummary::from_doc_with_tokens(doc, schema).with_project_id(&project.id);
            summary.file_path = doc_url_or_default(doc);
            summary
        })
        .collect();

    let total = results.len();

    Ok(Json(SearchResponse {
        results,
        total,
        query: req.query,
        project_id: Some(project.id),
    }))
}
