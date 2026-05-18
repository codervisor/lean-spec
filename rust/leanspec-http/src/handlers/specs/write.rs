//! Spec write handlers: create, update, toggle, batch metadata
//!
//! The HTTP read path is adapter-driven (see [`super::read`] and spec #261).
//! Write handlers run on the same fetch-transform-push pattern: load a
//! [`SpecDoc`] from the adapter, apply schema-aware updates or pure string
//! transforms to its fields, then push the result back through
//! [`Adapter::update`]. Markdown-specific operations (raw spec / sub-spec
//! writes) are kept as direct file I/O behind `require_markdown_adapter` —
//! those concepts don't generalise to other adapters.

#![allow(clippy::result_large_err)]

use std::collections::HashMap;
use std::fs;
use std::path::Path as FsPath;
use std::sync::{LazyLock, RwLock};

use axum::extract::{Path, State};
use axum::http::StatusCode;
use axum::Json;

use leanspec_core::adapters::markdown::{
    doc_to_spec_info, umbrella_completion_for_docs, MarkdownAdapter,
};
use leanspec_core::adapters::ListFilter;
use leanspec_core::io::hash_content;
use leanspec_core::{
    apply_checklist_toggles, global_frontmatter_validator, global_structure_validator,
    global_token_count_validator, global_token_counter, rebuild_content, semantic,
    split_frontmatter, ChecklistToggle, ErrorSeverity, FieldKind, FieldValue, FrontmatterParser,
    SpecDoc, SpecSchema, TemplateLoader, TokenStatus, UpdateRequest, ValidationResult,
};

use crate::error::{ApiError, ApiResult};
use crate::state::AppState;

use crate::types::{
    BatchMetadataRequest, BatchMetadataResponse, ChecklistToggleRequest, ChecklistToggleResponse,
    ChecklistToggledResult, CreateSpecRequest, FrontmatterResponse, MetadataUpdate, SpecDetail,
    SpecMetadata, SpecRawResponse, SpecRawUpdateRequest, UpdateMetadataResponse,
};

use super::helpers::{
    adapter_error, get_adapter_and_project, hash_raw_content, invalid_spec_id, load_project_config,
    require_markdown_adapter, resolve_markdown_spec_path,
};

// In-process cache for expensive batch metadata computation.
static BATCH_METADATA_CACHE: LazyLock<RwLock<HashMap<String, (String, SpecMetadata)>>> =
    LazyLock::new(|| RwLock::new(HashMap::new()));

fn render_template(template: &str, name: &str, status: &str, priority: &str, date: &str) -> String {
    template
        .replace("{name}", name)
        .replace("{status}", status)
        .replace("{priority}", priority)
        .replace("{date}", date)
}

/// Check if draft status is enabled in project config.
fn is_draft_status_enabled(project_path: &FsPath) -> bool {
    #[derive(serde::Deserialize)]
    #[serde(rename_all = "camelCase")]
    struct DraftStatusConfig {
        enabled: Option<bool>,
    }
    #[derive(serde::Deserialize)]
    #[serde(rename_all = "camelCase")]
    struct ProjectConfig {
        draft_status: Option<DraftStatusConfig>,
    }

    let config_path = project_path.join(".lean-spec/config.json");
    let Ok(content) = fs::read_to_string(config_path) else {
        return false;
    };

    serde_json::from_str::<ProjectConfig>(&content)
        .ok()
        .and_then(|config| config.draft_status.and_then(|draft| draft.enabled))
        .unwrap_or(false)
}

fn doc_field_str<'a>(doc: &'a SpecDoc, key: &str) -> Option<&'a str> {
    doc.fields.get(key)?.as_str()
}

fn semantic_value<'a>(doc: &'a SpecDoc, schema: &SpecSchema, sem: &str) -> Option<&'a str> {
    doc_field_str(doc, schema.key_for_semantic(sem)?)
}

fn validate_enum_value(
    schema: &SpecSchema,
    field_key: &str,
    value: &str,
) -> Result<(), (StatusCode, Json<ApiError>)> {
    let Some(field) = schema.field(field_key) else {
        return Ok(());
    };
    let FieldKind::Enum {
        options,
        allow_custom,
        ..
    } = &field.kind
    else {
        return Ok(());
    };

    if *allow_custom || options.is_empty() {
        return Ok(());
    }

    if options.iter().any(|o| o.value == value) {
        Ok(())
    } else {
        let valid: Vec<String> = options.iter().map(|o| o.value.clone()).collect();
        Err((
            StatusCode::UNPROCESSABLE_ENTITY,
            Json(
                ApiError::invalid_request(&format!("Invalid value for {}: '{}'", field_key, value))
                    .with_details(serde_json::json!({ "validValues": valid })),
            ),
        ))
    }
}

/// POST /api/projects/:projectId/specs - Create a spec in a project
pub async fn create_project_spec(
    State(state): State<AppState>,
    Path(project_id): Path<String>,
    Json(request): Json<CreateSpecRequest>,
) -> ApiResult<Json<SpecDetail>> {
    let (adapter, project) = get_adapter_and_project(&state, &project_id).await?;
    require_markdown_adapter(adapter.as_ref())?;

    let spec_name = request.name.trim();
    if spec_name.is_empty() {
        return Err((
            StatusCode::BAD_REQUEST,
            Json(ApiError::invalid_request("Spec name is required")),
        ));
    }
    // Refuse names that could escape the project's specs directory.
    if invalid_spec_id(spec_name) {
        return Err((
            StatusCode::BAD_REQUEST,
            Json(ApiError::invalid_request(
                "Spec name must not contain path separators, '..', or absolute paths",
            )),
        ));
    }

    let spec_dir = project.specs_dir.join(spec_name);
    if spec_dir.exists() {
        return Err((
            StatusCode::CONFLICT,
            Json(ApiError::invalid_request("Spec already exists")),
        ));
    }

    let today = chrono::Utc::now().date_naive().to_string();
    let draft_enabled = is_draft_status_enabled(&project.path);
    let status = request.status.clone().unwrap_or_else(|| {
        if draft_enabled {
            "draft".to_string()
        } else {
            "planned".to_string()
        }
    });
    let priority = request
        .priority
        .clone()
        .unwrap_or_else(|| "medium".to_string());
    let title = request
        .title
        .clone()
        .unwrap_or_else(|| spec_name.to_string());

    let template_content = if let Some(content) = &request.content {
        content.clone()
    } else {
        let template_loader = if let Some(config) = load_project_config(&project.path) {
            TemplateLoader::with_config(&project.path, config)
        } else {
            TemplateLoader::new(&project.path)
        };
        let template = template_loader
            .load(request.template.as_deref())
            .map_err(|e| {
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(ApiError::internal_error(&e.to_string())),
                )
            })?;
        render_template(&template, &title, &status, &priority, &today)
    };

    let parser = FrontmatterParser::new();
    let (mut frontmatter, body) = parser.parse(&template_content).map_err(|e| {
        (
            StatusCode::BAD_REQUEST,
            Json(ApiError::invalid_request(&e.to_string())),
        )
    })?;

    if let Ok(parsed) = status.parse() {
        frontmatter.status = parsed;
    }
    if let Ok(parsed) = priority.parse() {
        frontmatter.priority = Some(parsed);
    }
    if let Some(tags) = request.tags.clone() {
        frontmatter.tags = tags;
    }
    if let Some(assignee) = request.assignee.clone() {
        frontmatter.assignee = Some(assignee);
    }
    if let Some(depends_on) = request.depends_on.clone() {
        frontmatter.depends_on = depends_on;
    }

    let yaml = serde_yaml::to_string(&frontmatter).map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiError::internal_error(&e.to_string())),
        )
    })?;
    let trimmed_body = body.trim_start_matches('\n');
    let full_content = format!("---\n{}---\n{}", yaml, trimmed_body);

    // Write the spec directly through the filesystem (markdown adapter
    // semantics) and then re-fetch it via the adapter for the response.
    fs::create_dir_all(&spec_dir).map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiError::internal_error(&e.to_string())),
        )
    })?;
    fs::write(spec_dir.join("README.md"), &full_content).map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiError::internal_error(&e.to_string())),
        )
    })?;

    let doc = adapter.get(spec_name).map_err(adapter_error)?;
    let mut detail =
        SpecDetail::from_doc(&doc, adapter.schema()).with_project_id(project.id.clone());
    if let Some(path) = resolve_markdown_spec_path(&project.specs_dir, spec_name) {
        detail = detail.with_file_path(path.to_string_lossy().to_string());
    }
    Ok(Json(detail))
}

/// PATCH /api/projects/:projectId/specs/:spec/raw - Update raw spec content
pub async fn update_project_spec_raw(
    State(state): State<AppState>,
    Path((project_id, spec_id)): Path<(String, String)>,
    Json(request): Json<SpecRawUpdateRequest>,
) -> ApiResult<Json<SpecRawResponse>> {
    let (adapter, project) = get_adapter_and_project(&state, &project_id).await?;
    require_markdown_adapter(adapter.as_ref())?;

    adapter.get(&spec_id).map_err(adapter_error)?;

    let file_path = resolve_markdown_spec_path(&project.specs_dir, &spec_id).ok_or_else(|| {
        (
            StatusCode::NOT_FOUND,
            Json(ApiError::spec_not_found(&spec_id)),
        )
    })?;

    let current = fs::read_to_string(&file_path).map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiError::internal_error(&e.to_string())),
        )
    })?;
    let current_hash = hash_raw_content(&current);

    if let Some(expected) = &request.expected_content_hash {
        if expected != &current_hash {
            return Err((
                StatusCode::CONFLICT,
                Json(ApiError::invalid_request("Content hash mismatch").with_details(current_hash)),
            ));
        }
    }

    fs::write(&file_path, &request.content).map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiError::internal_error(&e.to_string())),
        )
    })?;

    invalidate_markdown_cache(&project.specs_dir, &file_path);

    let new_hash = hash_raw_content(&request.content);
    Ok(Json(SpecRawResponse {
        content: request.content,
        content_hash: new_hash,
        file_path: file_path.to_string_lossy().to_string(),
    }))
}

/// POST /api/projects/:projectId/specs/:spec/checklist-toggle - Toggle checklist items
///
/// Main-spec toggles run the fetch-transform-push pattern through the adapter
/// and work for any backend that exposes a `content` field: pull the body via
/// `adapter.get`, apply the pure `apply_checklist_toggles` transform, push back
/// via `adapter.update`. Body-only content hashes match the list/detail
/// endpoints.
///
/// Sub-spec toggles fall back to direct file I/O and require the markdown
/// adapter — sub-specs are extra files inside the spec directory and aren't
/// modelled by the adapter API.
pub async fn toggle_project_spec_checklist(
    State(state): State<AppState>,
    Path((project_id, spec_id)): Path<(String, String)>,
    Json(request): Json<ChecklistToggleRequest>,
) -> ApiResult<Json<ChecklistToggleResponse>> {
    let (adapter, project) = get_adapter_and_project(&state, &project_id).await?;

    let toggles: Vec<ChecklistToggle> = request
        .toggles
        .iter()
        .map(|t| ChecklistToggle {
            item_text: t.item_text.clone(),
            checked: t.checked,
        })
        .collect();

    if let Some(subspec_file) = request.subspec.as_deref() {
        // Sub-specs are markdown-only — they live as extra files inside
        // the spec directory and aren't represented in the adapter model.
        require_markdown_adapter(adapter.as_ref())?;
        return toggle_subspec_checklist(
            adapter.as_ref(),
            &project.specs_dir,
            &spec_id,
            subspec_file,
            request.expected_content_hash.as_deref(),
            &toggles,
        );
    }

    // Main-spec path: fetch-transform-push through the adapter.
    let doc = adapter.get(&spec_id).map_err(adapter_error)?;
    let body = doc
        .fields
        .get("content")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();
    let current_hash = hash_content(&body);

    if let Some(expected) = &request.expected_content_hash {
        if expected != &current_hash {
            return Err((
                StatusCode::CONFLICT,
                Json(ApiError::invalid_request("Content hash mismatch").with_details(current_hash)),
            ));
        }
    }

    let (updated_body, results) = apply_checklist_toggles(&body, &toggles)
        .map_err(|e| (StatusCode::BAD_REQUEST, Json(ApiError::invalid_request(&e))))?;

    let mut req_fields: HashMap<String, FieldValue> = HashMap::new();
    req_fields.insert("content".into(), FieldValue::String(updated_body.clone()));
    let update = UpdateRequest {
        fields: req_fields,
        ..Default::default()
    };
    adapter.update(&spec_id, &update).map_err(adapter_error)?;

    let new_hash = hash_content(&updated_body);

    Ok(Json(ChecklistToggleResponse {
        success: true,
        content_hash: new_hash,
        toggled: results
            .into_iter()
            .map(|r| ChecklistToggledResult {
                item_text: r.item_text,
                checked: r.checked,
                line: r.line,
            })
            .collect(),
    }))
}

/// Sub-spec checklist toggle — markdown-only direct file I/O.
fn toggle_subspec_checklist(
    adapter: &dyn leanspec_core::adapters::Adapter,
    specs_dir: &FsPath,
    spec_id: &str,
    subspec_file: &str,
    expected_hash: Option<&str>,
    toggles: &[ChecklistToggle],
) -> ApiResult<Json<ChecklistToggleResponse>> {
    if subspec_file.contains('/') || subspec_file.contains('\\') {
        return Err((
            StatusCode::BAD_REQUEST,
            Json(ApiError::invalid_request("Invalid sub-spec file")),
        ));
    }
    // Adapter.get confirms the parent spec exists.
    adapter.get(spec_id).map_err(adapter_error)?;

    let spec_readme = resolve_markdown_spec_path(specs_dir, spec_id).ok_or_else(|| {
        (
            StatusCode::NOT_FOUND,
            Json(ApiError::spec_not_found(spec_id)),
        )
    })?;
    let parent_dir = spec_readme.parent().ok_or_else(|| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiError::internal_error("Missing spec directory")),
        )
    })?;
    let file_path = parent_dir.join(subspec_file);
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
    let current_hash = hash_raw_content(&content);
    if let Some(expected) = expected_hash {
        if expected != current_hash {
            return Err((
                StatusCode::CONFLICT,
                Json(ApiError::invalid_request("Content hash mismatch").with_details(current_hash)),
            ));
        }
    }

    let (frontmatter, body) = split_frontmatter(&content);
    let (updated_body, results) = apply_checklist_toggles(&body, toggles)
        .map_err(|e| (StatusCode::BAD_REQUEST, Json(ApiError::invalid_request(&e))))?;
    let updated_content = rebuild_content(frontmatter, &updated_body);

    fs::write(&file_path, &updated_content).map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiError::internal_error(&e.to_string())),
        )
    })?;
    invalidate_markdown_cache(specs_dir, &file_path);
    let new_hash = hash_raw_content(&updated_content);

    Ok(Json(ChecklistToggleResponse {
        success: true,
        content_hash: new_hash,
        toggled: results
            .into_iter()
            .map(|r| ChecklistToggledResult {
                item_text: r.item_text,
                checked: r.checked,
                line: r.line,
            })
            .collect(),
    }))
}

/// PATCH /api/projects/:projectId/specs/:spec/subspecs/:file/raw - Update raw sub-spec content
pub async fn update_project_subspec_raw(
    State(state): State<AppState>,
    Path((project_id, spec_id, file)): Path<(String, String, String)>,
    Json(request): Json<SpecRawUpdateRequest>,
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

    let current = fs::read_to_string(&file_path).map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiError::internal_error(&e.to_string())),
        )
    })?;
    let current_hash = hash_raw_content(&current);

    if let Some(expected) = &request.expected_content_hash {
        if expected != &current_hash {
            return Err((
                StatusCode::CONFLICT,
                Json(ApiError::invalid_request("Content hash mismatch").with_details(current_hash)),
            ));
        }
    }

    fs::write(&file_path, &request.content).map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiError::internal_error(&e.to_string())),
        )
    })?;

    invalidate_markdown_cache(&project.specs_dir, &file_path);

    let new_hash = hash_raw_content(&request.content);
    Ok(Json(SpecRawResponse {
        content: request.content,
        content_hash: new_hash,
        file_path: file_path.to_string_lossy().to_string(),
    }))
}

/// PATCH /api/projects/:projectId/specs/:spec/metadata - Update spec metadata
pub async fn update_project_metadata(
    State(state): State<AppState>,
    Path((project_id, spec_id)): Path<(String, String)>,
    Json(updates): Json<MetadataUpdate>,
) -> ApiResult<Json<UpdateMetadataResponse>> {
    let (adapter, _project) = get_adapter_and_project(&state, &project_id).await?;
    let schema = adapter.schema();

    let current_doc = adapter.get(&spec_id).map_err(adapter_error)?;

    if let Some(expected_hash) = &updates.expected_content_hash {
        let content = current_doc
            .fields
            .get("content")
            .and_then(|v| v.as_str())
            .unwrap_or("");
        let current_hash = hash_content(content);
        if expected_hash != &current_hash {
            return Err((
                StatusCode::CONFLICT,
                Json(ApiError::invalid_request("Content hash mismatch").with_details(current_hash)),
            ));
        }
    }

    // Build the UpdateRequest from the inbound patch.
    let mut req_fields: HashMap<String, FieldValue> = HashMap::new();
    let mut replace_links: Option<Vec<leanspec_core::ItemLink>> = None;

    if let Some(status_str) = &updates.status {
        if let Some(key) = schema.key_for_semantic(semantic::STATUS) {
            validate_enum_value(schema, key, status_str)?;

            // Markdown-specific transition checks for backwards compatibility.
            if adapter.capabilities().name == "markdown" {
                let current_status_str =
                    semantic_value(&current_doc, schema, semantic::STATUS).unwrap_or("");
                if current_status_str == "draft"
                    && matches!(status_str.as_str(), "in-progress" | "complete")
                    && !updates.force.unwrap_or(false)
                {
                    return Err((
                        StatusCode::BAD_REQUEST,
                        Json(ApiError::invalid_request(
                            "Cannot skip 'planned' stage. Use force to override.",
                        )),
                    ));
                }

                if status_str == "complete" && !updates.force.unwrap_or(false) {
                    let all_docs = adapter
                        .list(&ListFilter {
                            include_archived: true,
                            ..Default::default()
                        })
                        .map_err(adapter_error)?;
                    let umbrella = umbrella_completion_for_docs(&spec_id, &all_docs);
                    if !umbrella.is_complete {
                        let names: Vec<_> = umbrella
                            .incomplete_children
                            .iter()
                            .map(|c| format!("{} ({})", c.path, c.status))
                            .collect();
                        return Err((
                            StatusCode::BAD_REQUEST,
                            Json(ApiError::invalid_request(&format!(
                                "Cannot mark umbrella spec complete: {} child spec(s) are not complete: {}",
                                umbrella.incomplete_children.len(),
                                names.join(", ")
                            ))),
                        ));
                    }
                }
            }

            req_fields.insert(key.to_string(), FieldValue::String(status_str.clone()));
        }
    }

    if let Some(priority_str) = &updates.priority {
        if let Some(key) = schema.key_for_semantic(semantic::PRIORITY) {
            validate_enum_value(schema, key, priority_str)?;
            req_fields.insert(key.to_string(), FieldValue::String(priority_str.clone()));
        }
    }

    if let Some(tags) = &updates.tags {
        if let Some(key) = schema.key_for_semantic(semantic::TAGS) {
            req_fields.insert(key.to_string(), FieldValue::Strings(tags.clone()));
        }
    }

    if let Some(assignee) = &updates.assignee {
        if let Some(key) = schema.key_for_semantic(semantic::ASSIGNEE) {
            req_fields.insert(key.to_string(), FieldValue::String(assignee.clone()));
        }
    }

    // Depends-on adjustments preserve existing entries and apply add/remove
    // deltas on top.
    if updates.add_depends_on.is_some() || updates.remove_depends_on.is_some() {
        let mut depends: Vec<String> = current_doc
            .links
            .iter()
            .filter(|l| l.link_type == "depends_on")
            .map(|l| l.target_id.clone())
            .collect();

        if let Some(additions) = &updates.add_depends_on {
            for dep in additions {
                if dep == &spec_id {
                    return Err((
                        StatusCode::BAD_REQUEST,
                        Json(ApiError::invalid_request("Spec cannot depend on itself")),
                    ));
                }
                if !depends.contains(dep) {
                    depends.push(dep.clone());
                }
            }
        }
        if let Some(removals) = &updates.remove_depends_on {
            depends.retain(|d| !removals.contains(d));
        }

        let mut new_links: Vec<leanspec_core::ItemLink> = current_doc
            .links
            .iter()
            .filter(|l| l.link_type != "depends_on")
            .cloned()
            .collect();
        for target in depends {
            new_links.push(leanspec_core::ItemLink {
                link_type: "depends_on".into(),
                target_id: target,
                target_title: None,
            });
        }
        replace_links = Some(new_links);
    }

    if let Some(parent) = updates.parent {
        // `Some(Some(name))` sets a parent, `Some(None)` clears it.
        let mut links: Vec<leanspec_core::ItemLink> = replace_links
            .clone()
            .unwrap_or_else(|| current_doc.links.clone())
            .into_iter()
            .filter(|l| l.link_type != "parent")
            .collect();
        if let Some(name) = parent {
            if name == spec_id {
                return Err((
                    StatusCode::BAD_REQUEST,
                    Json(ApiError::invalid_request("Spec cannot be its own parent")),
                ));
            }
            links.push(leanspec_core::ItemLink {
                link_type: "parent".into(),
                target_id: name,
                target_title: None,
            });
        }
        replace_links = Some(links);
    }

    let update = UpdateRequest {
        title: None,
        fields: req_fields,
        clear: Vec::new(),
        replace_links,
    };

    let updated = adapter.update(&spec_id, &update).map_err(adapter_error)?;

    Ok(Json(UpdateMetadataResponse {
        success: true,
        spec_id: spec_id.clone(),
        frontmatter: FrontmatterResponse::from_doc(&updated, schema),
    }))
}

/// POST /api/projects/:projectId/specs/batch-metadata - Get tokens and validation for multiple specs
pub async fn batch_spec_metadata(
    State(state): State<AppState>,
    Path(project_id): Path<String>,
    Json(request): Json<BatchMetadataRequest>,
) -> ApiResult<Json<BatchMetadataResponse>> {
    let (adapter, project) = get_adapter_and_project(&state, &project_id).await?;

    let docs = adapter
        .list(&ListFilter {
            include_archived: true,
            ..Default::default()
        })
        .map_err(adapter_error)?;
    let doc_map: HashMap<String, &SpecDoc> = docs.iter().map(|d| (d.id.clone(), d)).collect();

    let counter = global_token_counter();
    let fm_validator = global_frontmatter_validator();
    let struct_validator = global_structure_validator();
    let token_validator = global_token_count_validator();

    let mut result: HashMap<String, SpecMetadata> = HashMap::new();

    for spec_name in &request.spec_names {
        let Some(doc) = doc_map.get(spec_name) else {
            continue;
        };
        let content = doc
            .fields
            .get("content")
            .and_then(|v| v.as_str())
            .unwrap_or("");
        let content_hash = hash_content(content);
        let cache_key = format!("{}::{}", project_id, spec_name);

        if let Ok(cache) = BATCH_METADATA_CACHE.read() {
            if let Some((cached_hash, cached_metadata)) = cache.get(&cache_key) {
                if cached_hash == &content_hash {
                    result.insert(spec_name.clone(), cached_metadata.clone());
                    continue;
                }
            }
        }

        let (total, status) = counter.count_spec_simple(content);
        let token_status_str = match status {
            TokenStatus::Optimal => "optimal",
            TokenStatus::Good => "good",
            TokenStatus::Warning => "warning",
            TokenStatus::Excessive => "critical",
        };

        let validation_status_str = if adapter.capabilities().name == "markdown" {
            // Markdown validators consume `SpecInfo` and look at the on-disk
            // path. Non-markdown adapters get "pass" by default until
            // schema-driven validation lands.
            match resolve_markdown_spec_path(&project.specs_dir, spec_name) {
                Some(file_path) => {
                    let info = doc_to_spec_info(doc, file_path, None);
                    let mut validation_result = ValidationResult::new(&info.path);
                    validation_result.merge(fm_validator.validate(&info));
                    validation_result.merge(struct_validator.validate(&info));
                    validation_result.merge(token_validator.validate(&info));

                    if validation_result.errors.is_empty() {
                        "pass"
                    } else if validation_result
                        .errors
                        .iter()
                        .any(|e| e.severity == ErrorSeverity::Error)
                    {
                        "fail"
                    } else {
                        "warn"
                    }
                }
                None => "pass",
            }
        } else {
            "pass"
        };

        let metadata = SpecMetadata {
            token_count: total,
            token_status: token_status_str.to_string(),
            validation_status: validation_status_str.to_string(),
        };

        result.insert(spec_name.clone(), metadata.clone());

        if let Ok(mut cache) = BATCH_METADATA_CACHE.write() {
            cache.insert(cache_key, (content_hash, metadata));
        }
    }

    Ok(Json(BatchMetadataResponse { specs: result }))
}

/// Invalidate the markdown adapter's static spec cache for a path. Safe to
/// call from non-markdown contexts (a no-op when the path is unknown).
fn invalidate_markdown_cache(specs_dir: &FsPath, path: &FsPath) {
    MarkdownAdapter::new(specs_dir).invalidate_path(path);
}
