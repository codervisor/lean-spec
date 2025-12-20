//! Integration tests for validation endpoints

mod common;

use axum::http::StatusCode;
use leanspec_http::create_router;
use serde_json::Value;
use tempfile::TempDir;

use common::*;

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
async fn test_validate_detects_invalid_frontmatter() {
    let temp_dir = TempDir::new().unwrap();
    create_invalid_project(temp_dir.path());

    let state = create_test_state(&temp_dir).await;
    let app = create_router(state);
    let (status, body) = make_request(app, "GET", "/api/validate").await;

    assert_eq!(status, StatusCode::OK);
    let validation: Value = serde_json::from_str(&body).unwrap();
    assert_eq!(validation["isValid"], false);
    assert!(!validation["issues"].as_array().unwrap().is_empty());
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
async fn test_validate_nonexistent_spec() {
    let temp_dir = TempDir::new().unwrap();
    let state = create_test_state(&temp_dir).await;
    let app = create_router(state);

    let (status, _body) = make_request(app, "GET", "/api/validate/999-nonexistent").await;

    assert_eq!(status, StatusCode::NOT_FOUND);
}
