//! Integration tests for dependency endpoints

mod common;

use axum::http::StatusCode;
use leanspec_http::create_router;
use serde_json::Value;
use tempfile::TempDir;

use common::*;

#[tokio::test]
async fn test_get_dependencies() {
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
        &format!("/api/projects/{}/dependencies", project_id),
    )
    .await;

    assert_eq!(status, StatusCode::OK);
    // Verify the response contains dependency information
    let deps: Value = serde_json::from_str(&body).unwrap();
    assert!(deps.is_object() || deps.is_array());
}

#[tokio::test]
async fn test_deps_spec_not_found() {
    let temp_dir = TempDir::new().unwrap();
    let state = create_test_state(&temp_dir).await;
    let app = create_router(state.clone());

    // Get project ID
    let project_id = {
        let reg = state.registry.read().await;
        let projects = reg.all();
        projects.first().unwrap().id.clone()
    };

    // Try to get a non-existent spec
    let (status, _body) = make_request(
        app,
        "GET",
        &format!("/api/projects/{}/specs/999-nonexistent", project_id),
    )
    .await;

    assert_eq!(status, StatusCode::NOT_FOUND);
}

#[tokio::test]
async fn test_circular_dependency_handling() {
    let temp_dir = TempDir::new().unwrap();
    create_circular_dependency_project(temp_dir.path());

    let config = leanspec_http::ServerConfig::default();
    let registry = leanspec_http::ProjectRegistry::default();
    let state = leanspec_http::AppState::with_registry(config, registry);
    {
        let mut reg = state.registry.write().await;
        let _ = reg.add(temp_dir.path());
    }

    let app = create_router(state.clone());

    // Get project ID
    let project_id = {
        let reg = state.registry.read().await;
        let projects = reg.all();
        projects.first().unwrap().id.clone()
    };

    // Get dependencies - should succeed even with circular dependencies
    let (status, body) = make_request(
        app.clone(),
        "GET",
        &format!("/api/projects/{}/dependencies", project_id),
    )
    .await;

    assert_eq!(status, StatusCode::OK);
    // Should handle circular dependency gracefully
    let deps: Value = serde_json::from_str(&body).unwrap();
    assert!(deps.is_object() || deps.is_array());

    // Project validation - just verify it succeeds (path and specs_dir exist)
    let (status, body) = make_json_request(
        app,
        "POST",
        &format!("/api/projects/{}/validate", project_id),
        "{}",
    )
    .await;
    assert_eq!(status, StatusCode::OK);
    let validation: Value = serde_json::from_str(&body).unwrap();

    // Verify response has the expected structure
    assert!(validation["projectId"].is_string());
    assert!(validation["validation"]["isValid"].is_boolean());
}
