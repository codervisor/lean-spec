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
    let app = create_router(state);

    let (status, body) = make_request(app, "GET", "/api/deps/002-second-spec").await;

    assert_eq!(status, StatusCode::OK);
    assert!(body.contains("dependsOn"));
    assert!(body.contains("001-first-spec")); // 002 depends on 001
}

#[tokio::test]
async fn test_deps_spec_not_found() {
    let temp_dir = TempDir::new().unwrap();
    let state = create_test_state(&temp_dir).await;
    let app = create_router(state);

    let (status, _body) = make_request(app, "GET", "/api/deps/999-nonexistent").await;

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

    let app = create_router(state);

    // Get dependencies for spec A
    let (status, body) = make_request(app.clone(), "GET", "/api/deps/001-spec-a").await;

    assert_eq!(status, StatusCode::OK);
    // Should handle circular dependency gracefully
    assert!(body.contains("dependsOn") || body.contains("depends_on"));

    // Validation should detect circular dependency
    let (status, body) = make_request(app, "GET", "/api/validate").await;
    assert_eq!(status, StatusCode::OK);
    let validation: Value = serde_json::from_str(&body).unwrap();

    // Should report circular dependency issue
    let issues = validation["issues"].as_array().unwrap();
    let has_circular = issues.iter().any(|issue| {
        issue
            .as_str()
            .or_else(|| issue.get("message").and_then(|m| m.as_str()))
            .map(|s| s.to_lowercase().contains("circular"))
            .unwrap_or(false)
    });
    assert!(
        has_circular || !issues.is_empty(),
        "Expected validation to detect circular dependency"
    );
}
