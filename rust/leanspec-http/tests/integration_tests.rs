//! Integration tests for the HTTP server
//!
//! These tests start an actual server and make HTTP requests to verify the API.

use axum::http::StatusCode;
use leanspec_http::{create_router, AppState, ServerConfig};
use std::fs;
use tempfile::TempDir;

/// Create a test project with some specs
fn create_test_project(dir: &std::path::Path) {
    let specs_dir = dir.join("specs");
    fs::create_dir_all(&specs_dir).unwrap();

    // Create first spec
    let spec1_dir = specs_dir.join("001-first-spec");
    fs::create_dir_all(&spec1_dir).unwrap();
    fs::write(
        spec1_dir.join("README.md"),
        r#"---
status: planned
created: '2025-01-01'
priority: high
tags:
  - test
  - api
---

# First Spec

## Overview

This is a test spec.

## Plan

- [ ] Step 1
- [ ] Step 2
"#,
    )
    .unwrap();

    // Create second spec that depends on first
    let spec2_dir = specs_dir.join("002-second-spec");
    fs::create_dir_all(&spec2_dir).unwrap();
    fs::write(
        spec2_dir.join("README.md"),
        r#"---
status: in-progress
created: '2025-01-02'
priority: medium
tags:
  - feature
depends_on:
  - 001-first-spec
---

# Second Spec

## Overview

This spec depends on the first spec.

## Plan

- [x] Step 1
- [ ] Step 2
"#,
    )
    .unwrap();

    // Create complete spec
    let spec3_dir = specs_dir.join("003-complete-spec");
    fs::create_dir_all(&spec3_dir).unwrap();
    fs::write(
        spec3_dir.join("README.md"),
        r#"---
status: complete
created: '2025-01-03'
priority: low
tags:
  - docs
---

# Complete Spec

## Overview

This spec is complete.

## Plan

- [x] Done
"#,
    )
    .unwrap();
}

/// Create a test state with a project (async version)
async fn create_test_state(temp_dir: &TempDir) -> AppState {
    create_test_project(temp_dir.path());

    let config = ServerConfig::default();
    let registry = leanspec_http::ProjectRegistry::default();
    let state = AppState::with_registry(config, registry);

    // Add project via the registry
    {
        let mut reg = state.registry.write().await;
        let _ = reg.add(temp_dir.path());
    }

    state
}

/// Helper to make HTTP requests to the test server
async fn make_request(
    app: axum::Router,
    method: &str,
    uri: &str,
) -> (StatusCode, String) {
    use axum::body::Body;
    use axum::http::Request;
    use tower::ServiceExt;

    let request = Request::builder()
        .method(method)
        .uri(uri)
        .body(Body::empty())
        .unwrap();

    let response = app.oneshot(request).await.unwrap();
    let status = response.status();
    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    let body_str = String::from_utf8_lossy(&body).to_string();

    (status, body_str)
}

/// Helper to make POST requests with JSON body
async fn make_json_request(
    app: axum::Router,
    method: &str,
    uri: &str,
    body: &str,
) -> (StatusCode, String) {
    use axum::body::Body;
    use axum::http::Request;
    use tower::ServiceExt;

    let request = Request::builder()
        .method(method)
        .uri(uri)
        .header("content-type", "application/json")
        .body(Body::from(body.to_string()))
        .unwrap();

    let response = app.oneshot(request).await.unwrap();
    let status = response.status();
    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    let body_str = String::from_utf8_lossy(&body).to_string();

    (status, body_str)
}

#[tokio::test]
async fn test_health_endpoint() {
    let temp_dir = TempDir::new().unwrap();
    let state = create_test_state(&temp_dir).await;
    let app = create_router(state);

    let (status, body) = make_request(app, "GET", "/health").await;

    assert_eq!(status, StatusCode::OK);
    assert!(body.contains("ok"));
    assert!(body.contains("version"));
}

#[tokio::test]
async fn test_list_projects() {
    let temp_dir = TempDir::new().unwrap();
    let state = create_test_state(&temp_dir).await;
    let app = create_router(state);

    let (status, body) = make_request(app, "GET", "/api/projects").await;

    assert_eq!(status, StatusCode::OK);
    assert!(body.contains("projects"));
}

#[tokio::test]
async fn test_specs_without_project_selected() {
    let config = ServerConfig::default();
    let registry = leanspec_http::ProjectRegistry::default();
    let state = AppState::with_registry(config, registry);
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
async fn test_search_specs() {
    let temp_dir = TempDir::new().unwrap();
    let state = create_test_state(&temp_dir).await;
    let app = create_router(state);

    let (status, body) = make_json_request(
        app,
        "POST",
        "/api/search",
        r#"{"query": "test"}"#,
    ).await;

    assert_eq!(status, StatusCode::OK);
    assert!(body.contains("results"));
    assert!(body.contains("001-first-spec")); // Contains "test" tag
}

#[tokio::test]
async fn test_get_stats() {
    let temp_dir = TempDir::new().unwrap();
    let state = create_test_state(&temp_dir).await;
    let app = create_router(state);

    let (status, body) = make_request(app, "GET", "/api/stats").await;

    assert_eq!(status, StatusCode::OK);
    assert!(body.contains("total"));
    assert!(body.contains("byStatus"));
    assert!(body.contains("byPriority"));
}

#[tokio::test]
async fn test_get_dependencies() {
    let temp_dir = TempDir::new().unwrap();
    let state = create_test_state(&temp_dir).await;
    let app = create_router(state);

    let (status, body) = make_request(app, "GET", "/api/deps/002-second-spec").await;

    assert_eq!(status, StatusCode::OK);
    assert!(body.contains("dependsOn"));
    assert!(body.contains("001-first-spec")); // 002 depends on 001
}

#[tokio::test]
async fn test_validate_all() {
    let temp_dir = TempDir::new().unwrap();
    let state = create_test_state(&temp_dir).await;
    let app = create_router(state);

    let (status, body) = make_request(app, "GET", "/api/validate").await;

    assert_eq!(status, StatusCode::OK);
    assert!(body.contains("isValid"));
    assert!(body.contains("issues"));
}

#[tokio::test]
async fn test_validate_single_spec() {
    let temp_dir = TempDir::new().unwrap();
    let state = create_test_state(&temp_dir).await;
    let app = create_router(state);

    let (status, body) = make_request(app, "GET", "/api/validate/001-first-spec").await;

    assert_eq!(status, StatusCode::OK);
    assert!(body.contains("isValid"));
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
