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

    let (status, body) = make_request(app, "GET", "/api/specs").await;

    assert_eq!(status, StatusCode::BAD_REQUEST);
    assert!(body.contains("NO_PROJECT"));
}

#[tokio::test]
async fn test_list_specs_with_project() {
    let temp_dir = TempDir::new().unwrap();
    let state = create_test_state(&temp_dir).await;
    let app = create_router(state);

    let (status, body) = make_request(app, "GET", "/api/specs").await;

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
    let app = create_router(state);

    let (status, body) = make_request(app.clone(), "GET", "/api/specs?status=in-progress").await;

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
    let app = create_router(state);

    let (status, body) = make_request(app, "GET", "/api/specs/001-first-spec").await;

    assert_eq!(status, StatusCode::OK);
    assert!(body.contains("First Spec"));
    assert!(body.contains("planned"));
    assert!(body.contains("contentMd"));
}

#[tokio::test]
async fn test_spec_required_by_computation() {
    let temp_dir = TempDir::new().unwrap();
    let state = create_test_state(&temp_dir).await;
    let app = create_router(state);

    // Get spec 001 which is depended on by spec 002
    let (status, body) = make_request(app, "GET", "/api/specs/001-first-spec").await;

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
    let app = create_router(state);

    let (status, body) = make_request(app, "GET", "/api/specs/999-nonexistent").await;

    assert_eq!(status, StatusCode::NOT_FOUND);
    assert!(body.contains("SPEC_NOT_FOUND"));
}

#[tokio::test]
async fn test_list_specs_with_multiple_filters() {
    let temp_dir = TempDir::new().unwrap();
    let state = create_test_state(&temp_dir).await;
    let app = create_router(state);

    // Filter by status and priority
    let (status, body) = make_request(app, "GET", "/api/specs?status=planned&priority=high").await;

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
    let app = create_router(state);

    let (status, body) = make_request(app, "GET", "/api/specs?tags=test").await;

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
    let app = create_router(state);

    let (status, body) = make_json_request(
        app,
        "PATCH",
        "/api/specs/001-first-spec/metadata",
        &serde_json::json!({ "status": "in-progress" }).to_string(),
    )
    .await;

    assert_eq!(status, StatusCode::NOT_IMPLEMENTED);
    assert!(body.contains("NOT_IMPLEMENTED"));
}

#[tokio::test]
async fn test_invalid_query_parameters() {
    let temp_dir = TempDir::new().unwrap();
    let state = create_test_state(&temp_dir).await;
    let app = create_router(state);

    // Invalid status value
    let (status, _body) =
        make_request(app.clone(), "GET", "/api/specs?status=invalid-status").await;

    // Should still succeed but filter nothing (or handle gracefully)
    assert!(status == StatusCode::OK || status == StatusCode::BAD_REQUEST);
}
