//! Integration tests for spec operations endpoints

mod common;

use axum::http::StatusCode;
use leanspec_http::create_router;
use serde_json::Value;
use tempfile::TempDir;

use common::*;

#[tokio::test]
async fn test_specs_without_project_selected() {
    let state = create_empty_state().await;
    let app = create_router(state);

    // Try to access specs without a valid project ID (should return 404)
    let (status, _body) = make_request(app, "GET", "/api/projects/invalid-id/specs").await;

    assert_eq!(status, StatusCode::NOT_FOUND);
}

#[tokio::test]
async fn test_list_specs_with_project() {
    let temp_dir = TempDir::new().unwrap();
    let state = create_test_state(&temp_dir).await;
    let app = create_router(state.clone());

    // Get project ID
    let project_id = {
        let reg = state.registry.read().await;
        let projects = reg.all();
        projects.first().unwrap().id.clone()
    };

    let (status, body) =
        make_request(app, "GET", &format!("/api/projects/{}/specs", project_id)).await;

    assert_eq!(status, StatusCode::OK);
    assert!(body.contains("specs"));
    assert!(body.contains("001-first-spec"));
    assert!(body.contains("002-second-spec"));
    assert!(body.contains("003-complete-spec"));
}

#[tokio::test]
async fn test_list_specs_filters_and_camelcase() {
    let temp_dir = TempDir::new().unwrap();
    let state = create_test_state(&temp_dir).await;
    let app = create_router(state.clone());

    // Get project ID
    let project_id = {
        let reg = state.registry.read().await;
        let projects = reg.all();
        projects.first().unwrap().id.clone()
    };

    let (status, body) = make_request(
        app.clone(),
        "GET",
        &format!("/api/projects/{}/specs?status=in-progress", project_id),
    )
    .await;

    assert_eq!(status, StatusCode::OK);
    let specs: Value = serde_json::from_str(&body).unwrap();
    assert_eq!(specs["total"], 1);
    let spec = &specs["specs"][0];
    assert_eq!(spec["status"], "in-progress");
    assert!(spec.get("specNumber").is_some());
    assert!(spec.get("specName").is_some());
    assert!(spec.get("filePath").is_some());
    assert!(spec.get("spec_name").is_none());
}

#[tokio::test]
async fn test_get_spec_detail() {
    let temp_dir = TempDir::new().unwrap();
    let state = create_test_state(&temp_dir).await;
    let app = create_router(state.clone());

    // Get project ID
    let project_id = {
        let reg = state.registry.read().await;
        let projects = reg.all();
        projects.first().unwrap().id.clone()
    };

    let (status, body) = make_request(
        app,
        "GET",
        &format!("/api/projects/{}/specs/001-first-spec", project_id),
    )
    .await;

    assert_eq!(status, StatusCode::OK);
    assert!(body.contains("First Spec"));
    assert!(body.contains("planned"));
    assert!(body.contains("contentMd"));
}

#[tokio::test]
async fn test_spec_required_by_computation() {
    let temp_dir = TempDir::new().unwrap();
    let state = create_test_state(&temp_dir).await;
    let app = create_router(state.clone());

    // Get project ID
    let project_id = {
        let reg = state.registry.read().await;
        let projects = reg.all();
        projects.first().unwrap().id.clone()
    };

    // Get spec 001 which is depended on by spec 002
    let (status, body) = make_request(
        app,
        "GET",
        &format!("/api/projects/{}/specs/001-first-spec", project_id),
    )
    .await;

    assert_eq!(status, StatusCode::OK);
    let spec: Value = serde_json::from_str(&body).unwrap();

    // Check that requiredBy is computed
    let required_by = spec.get("requiredBy").or_else(|| spec.get("required_by"));
    assert!(required_by.is_some());

    let required_by_array = required_by.and_then(|v| v.as_array());
    if let Some(arr) = required_by_array {
        // Should contain 002-second-spec since it depends on 001
        let has_spec_002 = arr.iter().any(|v| {
            v.as_str()
                .map(|s| s.contains("002-second-spec"))
                .unwrap_or(false)
        });
        assert!(
            has_spec_002,
            "Expected requiredBy to contain 002-second-spec"
        );
    }
}

#[tokio::test]
async fn test_spec_not_found() {
    let temp_dir = TempDir::new().unwrap();
    let state = create_test_state(&temp_dir).await;
    let app = create_router(state.clone());

    // Get project ID
    let project_id = {
        let reg = state.registry.read().await;
        let projects = reg.all();
        projects.first().unwrap().id.clone()
    };

    let (status, _body) = make_request(
        app,
        "GET",
        &format!("/api/projects/{}/specs/999-nonexistent", project_id),
    )
    .await;

    assert_eq!(status, StatusCode::NOT_FOUND);
}

#[tokio::test]
async fn test_list_specs_with_multiple_filters() {
    let temp_dir = TempDir::new().unwrap();
    let state = create_test_state(&temp_dir).await;
    let app = create_router(state.clone());

    // Get project ID
    let project_id = {
        let reg = state.registry.read().await;
        let projects = reg.all();
        projects.first().unwrap().id.clone()
    };

    // Filter by status and priority
    let (status, body) = make_request(
        app,
        "GET",
        &format!(
            "/api/projects/{}/specs?status=planned&priority=high",
            project_id
        ),
    )
    .await;

    assert_eq!(status, StatusCode::OK);
    let specs: Value = serde_json::from_str(&body).unwrap();
    let specs_array = specs["specs"].as_array().unwrap();

    // Should only return specs matching both filters
    for spec in specs_array {
        assert_eq!(spec["status"], "planned");
        assert_eq!(spec["priority"], "high");
    }
}

#[tokio::test]
async fn test_list_specs_with_tags_filter() {
    let temp_dir = TempDir::new().unwrap();
    let state = create_test_state(&temp_dir).await;
    let app = create_router(state.clone());

    // Get project ID
    let project_id = {
        let reg = state.registry.read().await;
        let projects = reg.all();
        projects.first().unwrap().id.clone()
    };

    let (status, body) = make_request(
        app,
        "GET",
        &format!("/api/projects/{}/specs?tags=test", project_id),
    )
    .await;

    assert_eq!(status, StatusCode::OK);
    let specs: Value = serde_json::from_str(&body).unwrap();
    let specs_array = specs["specs"].as_array().unwrap();

    // All returned specs should have "test" tag
    for spec in specs_array {
        let tags = spec["tags"].as_array().unwrap();
        let has_test_tag = tags.iter().any(|t| t.as_str() == Some("test"));
        assert!(has_test_tag);
    }
}

#[tokio::test]
async fn test_update_spec_metadata_not_implemented() {
    let temp_dir = TempDir::new().unwrap();
    let state = create_test_state(&temp_dir).await;
    let app = create_router(state.clone());

    // Get project ID
    let project_id = {
        let reg = state.registry.read().await;
        let projects = reg.all();
        projects.first().unwrap().id.clone()
    };

    // The update endpoint exists, so test that it works (not NOT_IMPLEMENTED)
    let (status, _body) = make_json_request(
        app,
        "PATCH",
        &format!("/api/projects/{}/specs/001-first-spec/metadata", project_id),
        &serde_json::json!({ "status": "in-progress" }).to_string(),
    )
    .await;

    // Should return OK or BAD_REQUEST, not NOT_IMPLEMENTED
    assert!(
        status == StatusCode::OK || status == StatusCode::BAD_REQUEST,
        "Expected OK or BAD_REQUEST, got: {}",
        status
    );
}

#[tokio::test]
async fn test_invalid_query_parameters() {
    let temp_dir = TempDir::new().unwrap();
    let state = create_test_state(&temp_dir).await;
    let app = create_router(state.clone());

    // Get project ID
    let project_id = {
        let reg = state.registry.read().await;
        let projects = reg.all();
        projects.first().unwrap().id.clone()
    };

    // Invalid status value
    let (status, _body) = make_request(
        app.clone(),
        "GET",
        &format!("/api/projects/{}/specs?status=invalid-status", project_id),
    )
    .await;

    // Should still succeed but filter nothing (or handle gracefully)
    assert!(status == StatusCode::OK || status == StatusCode::BAD_REQUEST);
}
