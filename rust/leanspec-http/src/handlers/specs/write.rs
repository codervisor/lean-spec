//! Spec write handlers: create, update, toggle, batch metadata

#![allow(clippy::result_large_err)]

use axum::extract::{Path, State};
use axum::http::StatusCode;
use axum::Json;
use std::collections::HashMap;
use std::fs;
use std::path::Path as FsPath;
use std::sync::{LazyLock, RwLock};

use leanspec_core::io::hash_content;
use leanspec_core::spec_ops::{
    apply_checklist_toggles, rebuild_content, split_frontmatter, ChecklistToggle,
};
use leanspec_core::{
    global_frontmatter_validator, global_structure_validator, global_token_count_validator,
    global_token_counter, CompletionVerifier, FrontmatterParser,
    MetadataUpdate as CoreMetadataUpdate, SpecArchiver, SpecStatus, SpecWriter, TemplateLoader,
    TokenStatus, ValidationResult,
};

use crate::error::{ApiError, ApiResult};
use crate::state::AppState;

use crate::types::{
    BatchMetadataRequest, BatchMetadataResponse, ChecklistToggleRequest, ChecklistToggleResponse,
    ChecklistToggledResult, CreateSpecRequest, MetadataUpdate, SpecDetail, SpecMetadata,
    SpecRawResponse, SpecRawUpdateRequest,
};

use super::helpers::{get_spec_loader, hash_raw_content, load_project_config};

// In-process cache for expensive batch metadata computation.
// Keyed by project/spec and invalidated implicitly when content hash changes.
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
/// Uses a local struct since leanspec_core::LeanSpecConfig doesn't have draft_status.
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

fn rebuild_with_frontmatter(
    frontmatter: &leanspec_core::SpecFrontmatter,
    body: &str,
) -> Result<String, (StatusCode, Json<ApiError>)> {
    let yaml = serde_yaml::to_string(frontmatter).map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiError::internal_error(&e.to_string())),
        )
    })?;

    let trimmed_body = body.trim_start_matches('\n');
    Ok(format!("---\n{}---\n{}", yaml, trimmed_body))
}

/// POST /api/projects/:projectId/specs - Create a spec in a project
pub async fn create_project_spec(
    State(state): State<AppState>,
    Path(project_id): Path<String>,
    Json(request): Json<CreateSpecRequest>,
) -> ApiResult<Json<SpecDetail>> {
    let (loader, project) = get_spec_loader(&state, &project_id).await?;
    let spec_name = request.name.trim();
    if spec_name.is_empty() {
        return Err((
            StatusCode::BAD_REQUEST,
            Json(ApiError::invalid_request("Spec name is required")),
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

    let full_content = rebuild_with_frontmatter(&frontmatter, &body)?;
    let created = loader
        .create_spec(spec_name, &title, &full_content)
        .map_err(|e| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiError::internal_error(&e.to_string())),
            )
        })?;

    Ok(Json(SpecDetail::from(&created)))
}

/// PATCH /api/projects/:projectId/specs/:spec/raw - Update raw spec content
pub async fn update_project_spec_raw(
    State(state): State<AppState>,
    Path((project_id, spec_id)): Path<(String, String)>,
    Json(request): Json<SpecRawUpdateRequest>,
) -> ApiResult<Json<SpecRawResponse>> {
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

    let current = fs::read_to_string(&spec.file_path).map_err(|e| {
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

    // Write directly to the resolved file_path (spec.file_path) instead of
    // calling update_spec(&spec_id, ..) which doesn't do fuzzy path resolution.
    fs::write(&spec.file_path, &request.content).map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiError::internal_error(&e.to_string())),
        )
    })?;

    let new_hash = hash_raw_content(&request.content);
    Ok(Json(SpecRawResponse {
        content: request.content,
        content_hash: new_hash,
        file_path: spec.file_path.to_string_lossy().to_string(),
    }))
}

/// POST /api/projects/:projectId/specs/:spec/checklist-toggle - Toggle checklist items
pub async fn toggle_project_spec_checklist(
    State(state): State<AppState>,
    Path((project_id, spec_id)): Path<(String, String)>,
    Json(request): Json<ChecklistToggleRequest>,
) -> ApiResult<Json<ChecklistToggleResponse>> {
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

    // Determine file path: main spec or sub-spec
    let file_path = if let Some(ref subspec_file) = request.subspec {
        if subspec_file.contains('/') || subspec_file.contains('\\') {
            return Err((
                StatusCode::BAD_REQUEST,
                Json(ApiError::invalid_request("Invalid sub-spec file")),
            ));
        }
        let parent_dir = spec.file_path.parent().ok_or_else(|| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiError::internal_error("Missing spec directory")),
            )
        })?;
        let sub_path = parent_dir.join(subspec_file);
        if !sub_path.exists() {
            return Err((
                StatusCode::NOT_FOUND,
                Json(ApiError::invalid_request("Sub-spec not found")),
            ));
        }
        sub_path
    } else {
        spec.file_path.clone()
    };

    let content = fs::read_to_string(&file_path).map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiError::internal_error(&e.to_string())),
        )
    })?;
    let current_hash = hash_raw_content(&content);

    // Verify content hash if provided
    if let Some(expected) = &request.expected_content_hash {
        if expected != &current_hash {
            return Err((
                StatusCode::CONFLICT,
                Json(ApiError::invalid_request("Content hash mismatch").with_details(current_hash)),
            ));
        }
    }

    // Split frontmatter from body for main spec files
    let (frontmatter, body) = split_frontmatter(&content);

    // Convert request toggles to core ChecklistToggle
    let toggles: Vec<ChecklistToggle> = request
        .toggles
        .iter()
        .map(|t| ChecklistToggle {
            item_text: t.item_text.clone(),
            checked: t.checked,
        })
        .collect();

    // Apply checklist toggles to the body
    let (updated_body, results) = apply_checklist_toggles(&body, &toggles)
        .map_err(|e| (StatusCode::BAD_REQUEST, Json(ApiError::invalid_request(&e))))?;

    // Rebuild the full content
    let updated_content = rebuild_content(frontmatter, &updated_body);

    // Write updated content back to the file
    fs::write(&file_path, &updated_content).map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiError::internal_error(&e.to_string())),
        )
    })?;

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

    let parent_dir = spec.file_path.parent().ok_or_else(|| {
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
) -> ApiResult<Json<crate::types::UpdateMetadataResponse>> {
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

    // If archiving, use the archiver to set status (no file move)
    if is_archiving {
        let archiver = SpecArchiver::new(&project.specs_dir);
        archiver.archive(&spec_id).map_err(|e| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiError::internal_error(&e.to_string())),
            )
        })?;

        // Reload the spec from the same location (status-only archiving)
        let updated_spec = loader.load(&spec_id).map_err(|e| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiError::internal_error(&e.to_string())),
            )
        })?;

        let frontmatter = updated_spec
            .ok_or_else(|| {
                (
                    StatusCode::NOT_FOUND,
                    Json(ApiError::spec_not_found(&spec_id)),
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
    let spec_info = spec.as_ref().unwrap();
    let mut depends_on = spec_info.frontmatter.depends_on.clone();

    if let Some(additions) = &updates.add_depends_on {
        for dep in additions {
            if dep == &spec_id {
                return Err((
                    StatusCode::BAD_REQUEST,
                    Json(ApiError::invalid_request("Spec cannot depend on itself")),
                ));
            }
            if !depends_on.contains(dep) {
                depends_on.push(dep.clone());
            }
        }
    }

    if let Some(removals) = &updates.remove_depends_on {
        depends_on.retain(|dep| !removals.contains(dep));
    }

    if let Some(status_str) = &updates.status {
        let status: SpecStatus = status_str.parse().map_err(|_| {
            (
                StatusCode::BAD_REQUEST,
                Json(ApiError::invalid_request(&format!(
                    "Invalid status: {}",
                    status_str
                ))),
            )
        })?;

        if spec_info.frontmatter.status == SpecStatus::Draft
            && matches!(status, SpecStatus::InProgress | SpecStatus::Complete)
            && !updates.force.unwrap_or(false)
        {
            return Err((
                StatusCode::BAD_REQUEST,
                Json(ApiError::invalid_request(
                    "Cannot skip 'planned' stage. Use force to override.",
                )),
            ));
        }

        // Check umbrella completion when marking as complete
        if status == SpecStatus::Complete && !updates.force.unwrap_or(false) {
            let all_specs = loader.load_all().map_err(|e| {
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(ApiError::internal_error(&e.to_string())),
                )
            })?;

            let umbrella_verification =
                CompletionVerifier::verify_umbrella_completion(&spec_id, &all_specs);

            if !umbrella_verification.is_complete {
                let incomplete_paths: Vec<_> = umbrella_verification
                    .incomplete_children
                    .iter()
                    .map(|c| format!("{} ({})", c.path, c.status))
                    .collect();

                return Err((
                    StatusCode::BAD_REQUEST,
                    Json(ApiError::invalid_request(&format!(
                        "Cannot mark umbrella spec complete: {} child spec(s) are not complete: {}",
                        umbrella_verification.incomplete_children.len(),
                        incomplete_paths.join(", ")
                    ))),
                ));
            }
        }

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

    if updates.add_depends_on.is_some() || updates.remove_depends_on.is_some() {
        core_updates = core_updates.with_depends_on(depends_on);
    }

    if let Some(parent) = updates.parent {
        if let Some(parent_name) = parent.as_deref() {
            if parent_name == spec_id {
                return Err((
                    StatusCode::BAD_REQUEST,
                    Json(ApiError::invalid_request("Spec cannot be its own parent")),
                ));
            }
        }
        core_updates = core_updates.with_parent(parent);
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

/// POST /api/projects/:projectId/specs/batch-metadata - Get tokens and validation for multiple specs
pub async fn batch_spec_metadata(
    State(state): State<AppState>,
    Path(project_id): Path<String>,
    Json(request): Json<BatchMetadataRequest>,
) -> ApiResult<Json<BatchMetadataResponse>> {
    let (loader, _project) = get_spec_loader(&state, &project_id).await?;

    let all_specs = loader.load_all().map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiError::internal_error(&e.to_string())),
        )
    })?;

    // Build a map of spec_name -> SpecInfo for quick lookup
    let spec_map: HashMap<String, _> = all_specs.iter().map(|s| (s.path.clone(), s)).collect();

    let counter = global_token_counter();
    let fm_validator = global_frontmatter_validator();
    let struct_validator = global_structure_validator();
    let token_validator = global_token_count_validator();

    let mut result: HashMap<String, SpecMetadata> = HashMap::new();

    for spec_name in &request.spec_names {
        if let Some(spec) = spec_map.get(spec_name) {
            let content_hash = hash_content(&spec.content);
            let cache_key = format!("{}::{}", project_id, spec_name);

            if let Ok(cache) = BATCH_METADATA_CACHE.read() {
                if let Some((cached_hash, cached_metadata)) = cache.get(&cache_key) {
                    if cached_hash == &content_hash {
                        result.insert(spec_name.clone(), cached_metadata.clone());
                        continue;
                    }
                }
            }

            // Compute token count (simple version - no detailed breakdown)
            let (total, status) = counter.count_spec_simple(&spec.content);
            let token_status_str = match status {
                TokenStatus::Optimal => "optimal",
                TokenStatus::Good => "good",
                TokenStatus::Warning => "warning",
                TokenStatus::Excessive => "critical",
            };

            // Compute validation status
            let mut validation_result = ValidationResult::new(&spec.path);
            validation_result.merge(fm_validator.validate(spec));
            validation_result.merge(struct_validator.validate(spec));
            validation_result.merge(token_validator.validate(spec));

            let validation_status_str = if validation_result.errors.is_empty() {
                "pass"
            } else if validation_result
                .errors
                .iter()
                .any(|e| e.severity == leanspec_core::ErrorSeverity::Error)
            {
                "fail"
            } else {
                "warn"
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
    }

    Ok(Json(BatchMetadataResponse { specs: result }))
}
